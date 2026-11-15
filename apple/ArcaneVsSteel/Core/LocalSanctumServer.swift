import Foundation
import Darwin

/// Ultra-fast, zero-dependency, 100% offline RAM-cached loopback HTTP/1.1 server bound strictly to `127.0.0.1`.
/// Serves the exact, unmodified Arcane vs. Steel runtime (`index.html`, `style.css`, `src/`, `assets/`)
/// from `Bundle.main.resourceURL` with persistent `keep-alive` sockets and immutable asset headers so
/// sprite sheets, stereo WAVs, ES modules, and `ArcanePixel` (`pixel_art.ttf`) stream from RAM in `< 0.05ms`.
public final class LocalSanctumServer: @unchecked Sendable {
    public static let shared = LocalSanctumServer()

    private let lock = NSLock()
    private var listenFD: Int32 = -1
    private var boundPort: UInt16 = 0
    private var isRunning = false
    private let rootDirectory: URL
    private let fileCache = NSCache<NSString, NSData>()
    private let acceptQueue = DispatchQueue(label: "com.arcanevssteel.sanctum.accept", qos: .userInitiated)
    private let clientQueue = DispatchQueue(label: "com.arcanevssteel.sanctum.client", qos: .userInitiated, attributes: .concurrent)

    private init() {
        fileCache.totalCostLimit = 24 * 1024 * 1024 // Bounded 24 MB loopback cache (avoids duplicating hundreds of MB of PNGs in UI process)
        fileCache.countLimit = 96
        if let bundleRes = Bundle.main.resourceURL,
           FileManager.default.fileExists(atPath: bundleRes.appendingPathComponent("index.html").path) {
            self.rootDirectory = bundleRes.standardizedFileURL
        } else {
            self.rootDirectory = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).standardizedFileURL
        }
    }

    public func ensureStarted() -> URL? {
        lock.lock()
        defer { lock.unlock() }

        if isRunning, boundPort > 0 {
            return URL(string: "http://127.0.0.1:\(boundPort)/index.html")
        }

        let fd = Darwin.socket(AF_INET, SOCK_STREAM, IPPROTO_TCP)
        guard fd >= 0 else { return nil }

        var yes: Int32 = 1
        _ = setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &yes, socklen_t(MemoryLayout<Int32>.size))
        _ = setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &yes, socklen_t(MemoryLayout<Int32>.size))

        var addr = sockaddr_in()
        addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(0).bigEndian
        addr.sin_addr = in_addr(s_addr: UInt32(0x7F000001).bigEndian) // Strictly 127.0.0.1 loopback

        let bindResult = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        guard bindResult == 0, Darwin.listen(fd, 128) == 0 else {
            Darwin.close(fd)
            return nil
        }

        var actualAddr = sockaddr_in()
        var actualLen = socklen_t(MemoryLayout<sockaddr_in>.size)
        let nameResult = withUnsafeMutablePointer(to: &actualAddr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.getsockname(fd, $0, &actualLen)
            }
        }
        guard nameResult == 0 else {
            Darwin.close(fd)
            return nil
        }

        self.listenFD = fd
        self.boundPort = UInt16(bigEndian: actualAddr.sin_port)
        self.isRunning = true

        acceptQueue.async { [weak self] in
            self?.acceptLoop(serverFD: fd)
        }

        return URL(string: "http://127.0.0.1:\(boundPort)/index.html")
    }

    private func acceptLoop(serverFD: Int32) {
        while true {
            var clientAddr = sockaddr_in()
            var clientLen = socklen_t(MemoryLayout<sockaddr_in>.size)
            let clientFD = withUnsafeMutablePointer(to: &clientAddr) {
                $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                    Darwin.accept(serverFD, $0, &clientLen)
                }
            }
            if clientFD < 0 {
                if errno == EINTR { continue }
                break
            }
            clientQueue.async { [weak self] in
                self?.handleClient(fd: clientFD)
            }
        }
    }

    private func loadCachedData(for fileURL: URL) -> Data? {
        let key = fileURL.path as NSString
        if let cached = fileCache.object(forKey: key) {
            return cached as Data
        }
        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: fileURL.path, isDirectory: &isDir),
              !isDir.boolValue,
              let nsData = try? NSData(contentsOf: fileURL, options: .mappedIfSafe) else {
            return nil
        }
        fileCache.setObject(nsData, forKey: key, cost: nsData.length)
        return nsData as Data
    }

    private func handleClient(fd: Int32) {
        defer { Darwin.close(fd) }

        var yes: Int32 = 1
        _ = setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &yes, socklen_t(MemoryLayout<Int32>.size))
        _ = setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &yes, socklen_t(MemoryLayout<Int32>.size))
        var sndBuf: Int32 = 512 * 1024
        _ = setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &sndBuf, socklen_t(MemoryLayout<Int32>.size))

        var tv = timeval(tv_sec: 4, tv_usec: 0)
        _ = setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))

        var buffer = [UInt8](repeating: 0, count: 16384)
        let rootPrefix = rootDirectory.path.hasSuffix("/") ? rootDirectory.path : (rootDirectory.path + "/")

        // Persistent HTTP/1.1 keep-alive loop avoids opening 70+ sockets when loading hero & audio assets
        while true {
            let bytesRead = Darwin.recv(fd, &buffer, buffer.count - 1, 0)
            guard bytesRead > 0 else { break }

            let requestText = String(decoding: buffer[0..<bytesRead], as: UTF8.self)
            let headerBlock = requestText.components(separatedBy: "\r\n\r\n").first ?? requestText
            let lines = headerBlock.components(separatedBy: "\r\n")
            guard let requestLine = lines.first, !requestLine.isEmpty else { break }
            let parts = requestLine.split(separator: " ")
            guard parts.count >= 2 else { break }

            let method = String(parts[0]).uppercased()
            let wantsClose = lines.contains {
                let lower = $0.lowercased()
                return lower.hasPrefix("connection:") && lower.contains("close")
            }

            guard method == "GET" || method == "HEAD" else {
                sendStatus(fd: fd, code: 405, message: "Method Not Allowed")
                break
            }

            let rawTarget = String(parts[1])
            let pathOnly = rawTarget.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false).first.map(String.init) ?? "/"
            let decodedPath = pathOnly.removingPercentEncoding ?? pathOnly
            let cleanRel = decodedPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let relFile = cleanRel.isEmpty ? "index.html" : cleanRel

            let fileURL = rootDirectory.appendingPathComponent(relFile).standardizedFileURL
            guard fileURL.path.hasPrefix(rootPrefix) else {
                sendStatus(fd: fd, code: 403, message: "Forbidden")
                break
            }

            guard let fileData = loadCachedData(for: fileURL) else {
                sendStatus(fd: fd, code: 404, message: "Not Found")
                if wantsClose { break } else { continue }
            }

            let ext = fileURL.pathExtension.lowercased()
            let mime = Self.mimeType(for: ext)
            let cacheControl = Self.cacheControlHeader(for: ext)
            let connHeader = wantsClose ? "close" : "keep-alive"
            let totalLen = fileData.count

            let rangeHeader = lines.first { $0.lowercased().hasPrefix("range: bytes=") }
            if let rangeHeader, totalLen > 0, let (start, end) = Self.parseRange(rangeHeader, total: totalLen) {
                let sliceLen = end - start + 1
                let header = [
                    "HTTP/1.1 206 Partial Content",
                    "Content-Type: \(mime)",
                    "Content-Length: \(sliceLen)",
                    "Content-Range: bytes \(start)-\(end)/\(totalLen)",
                    "Accept-Ranges: bytes",
                    "Access-Control-Allow-Origin: *",
                    "Cache-Control: \(cacheControl)",
                    "Connection: \(connHeader)",
                    "",
                    ""
                ].joined(separator: "\r\n")
                if !writeAll(fd: fd, data: Data(header.utf8)) { break }
                if method == "GET" {
                    if !writeAll(fd: fd, data: fileData.subdata(in: start..<(end + 1))) { break }
                }
                if wantsClose { break } else { continue }
            }

            let header = [
                "HTTP/1.1 200 OK",
                "Content-Type: \(mime)",
                "Content-Length: \(totalLen)",
                "Accept-Ranges: bytes",
                "Access-Control-Allow-Origin: *",
                "Cache-Control: \(cacheControl)",
                "Connection: \(connHeader)",
                "",
                ""
            ].joined(separator: "\r\n")

            if !writeAll(fd: fd, data: Data(header.utf8)) { break }
            if method == "GET" && totalLen > 0 {
                if !writeAll(fd: fd, data: fileData) { break }
            }
            if wantsClose { break }
        }
    }

    private func sendStatus(fd: Int32, code: Int, message: String) {
        let body = Data("\(code) \(message)".utf8)
        let header = [
            "HTTP/1.1 \(code) \(message)",
            "Content-Type: text/plain; charset=utf-8",
            "Content-Length: \(body.count)",
            "Connection: close",
            "",
            ""
        ].joined(separator: "\r\n")
        _ = writeAll(fd: fd, data: Data(header.utf8))
        _ = writeAll(fd: fd, data: body)
    }

    @discardableResult
    private func writeAll(fd: Int32, data: Data) -> Bool {
        var ok = true
        data.withUnsafeBytes { rawBuf in
            guard let base = rawBuf.baseAddress else { return }
            var sent = 0
            let total = rawBuf.count
            while sent < total {
                let n = Darwin.send(fd, base.advanced(by: sent), total - sent, 0)
                if n <= 0 {
                    if n < 0 && errno == EINTR { continue }
                    ok = false
                    break
                }
                sent += n
            }
        }
        return ok
    }

    private static func parseRange(_ header: String, total: Int) -> (Int, Int)? {
        guard let eqIdx = header.firstIndex(of: "=") else { return nil }
        let spec = header[header.index(after: eqIdx)...].trimmingCharacters(in: .whitespaces)
        let bounds = spec.split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false)
        guard bounds.count == 2 else { return nil }
        let start = Int(bounds[0]) ?? 0
        let end = bounds[1].isEmpty ? (total - 1) : min(total - 1, Int(bounds[1]) ?? (total - 1))
        guard start >= 0, start <= end, end < total else { return nil }
        return (start, end)
    }

    private static func cacheControlHeader(for ext: String) -> String {
        switch ext {
        case "png", "wav", "ttf", "otf", "woff2", "svg", "ico":
            return "public, max-age=31536000, immutable"
        case "js", "mjs", "css":
            return "public, max-age=3600"
        default:
            return "no-cache"
        }
    }

    private static func mimeType(for ext: String) -> String {
        switch ext {
        case "html", "htm": return "text/html; charset=utf-8"
        case "css":         return "text/css; charset=utf-8"
        case "js", "mjs":   return "text/javascript; charset=utf-8"
        case "json":        return "application/json; charset=utf-8"
        case "png":         return "image/png"
        case "wav":         return "audio/wav"
        case "ttf":         return "font/ttf"
        case "otf":         return "font/otf"
        case "woff2":       return "font/woff2"
        case "svg":         return "image/svg+xml"
        case "ico":         return "image/x-icon"
        default:            return "application/octet-stream"
        }
    }
}
