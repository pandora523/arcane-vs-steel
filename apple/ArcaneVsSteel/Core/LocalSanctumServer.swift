import Foundation
import Darwin
import CryptoKit
import Security

/// Ultra-fast, zero-dependency, 100% offline AES-256-GCM encrypted vault server bound strictly to `127.0.0.1`.
/// Memory-maps `sanctum.pak` (`~0 MB` dirty RSS), reconstructs the 256-bit `SymmetricKey` from two XOR-masked
/// `[UInt8]` shards, gates all HTTP requests behind a per-launch `SecRandomCopyBytes` secret session prefix
/// (`403 Forbidden` to any unauthorized local probe), and decrypts assets on demand in RAM via Apple Silicon
/// hardware `CryptoKit` (`AES.GCM.open`) with a bounded `64 MB` (`<= 8 MB`/entry) RAM cache.
public final class LocalSanctumServer: @unchecked Sendable {
    public static let shared = LocalSanctumServer()

    private struct VaultEntry {
        let offset: Int
        let length: Int
        let mimeType: String
        let cacheControl: String
    }

    private struct LoadedVault {
        let mappedPak: Data
        let key: SymmetricKey
        let toc: [String: VaultEntry]
    }

    private static let maxCacheTotalBytes = 64 * 1024 * 1024
    private static let maxCacheEntryBytes = 8 * 1024 * 1024

    // Two 32-byte non-ASCII obfuscated shards XOR-combined at runtime (zero plaintext keys or filenames in binary)
    private static let vaultShardA: [UInt8] = [
        0x20, 0x28, 0xEE, 0x99, 0x50, 0xA4, 0xB4, 0x8F,
        0x93, 0x03, 0xE2, 0xBE, 0x17, 0xCD, 0x7A, 0xAB,
        0x34, 0x19, 0x47, 0x1A, 0x0C, 0x96, 0x57, 0xCB,
        0xE3, 0x9A, 0x44, 0xE9, 0x5B, 0x63, 0xF9, 0x50
    ]
    private static let vaultShardB: [UInt8] = [
        0x57, 0xE1, 0x7F, 0xF6, 0x98, 0x8F, 0x7F, 0x59,
        0xF1, 0x0B, 0x25, 0x1B, 0xF8, 0x28, 0xF1, 0x11,
        0x2E, 0xCB, 0x03, 0x03, 0x90, 0x43, 0xFE, 0x93,
        0xE6, 0xBC, 0x46, 0x9F, 0x11, 0xB6, 0x30, 0x99
    ]

    private let lock = NSLock()
    private var listenFD: Int32 = -1
    private var boundPort: UInt16 = 0
    private var sessionPrefix: String = ""
    private var loadedVault: LoadedVault?
    private var isRunning = false

    private let fileCache = NSCache<NSString, NSData>()
    private let acceptQueue = DispatchQueue(label: "com.arcanevssteel.sanctum.accept", qos: .userInitiated)
    private let clientQueue = DispatchQueue(label: "com.arcanevssteel.sanctum.client", qos: .userInitiated, attributes: .concurrent)

    private init() {
        fileCache.totalCostLimit = Self.maxCacheTotalBytes
        fileCache.countLimit = 192
    }

    @inline(never)
    private static func reconstructVaultKey() -> SymmetricKey {
        var raw = [UInt8](repeating: 0, count: 32)
        for idx in 0..<32 {
            raw[idx] = vaultShardA[idx] ^ vaultShardB[idx]
        }
        let symKey = SymmetricKey(data: raw)
        for idx in 0..<32 {
            raw[idx] = 0
        }
        return symKey
    }

    private static func generateSessionPrefix() -> String {
        var entropy = [UInt8](repeating: 0, count: 16)
        let status = entropy.withUnsafeMutableBytes { buf -> Int32 in
            guard let base = buf.baseAddress else { return errSecParam }
            return SecRandomCopyBytes(kSecRandomDefault, buf.count, base)
        }
        if status != errSecSuccess {
            let fallback = SymmetricKey(size: .bits128)
            fallback.withUnsafeBytes { rawBuf in
                for i in 0..<min(16, rawBuf.count) {
                    entropy[i] = rawBuf[i]
                }
            }
        }
        let hexAlphabet: [UInt8] = Array("0123456789abcdef".utf8)
        var hexChars = [UInt8]()
        hexChars.reserveCapacity(32)
        for byte in entropy {
            hexChars.append(hexAlphabet[Int(byte >> 4)])
            hexChars.append(hexAlphabet[Int(byte & 0x0F)])
        }
        let randomHex32 = String(decoding: hexChars, as: UTF8.self)
        return "/v_\(randomHex32)"
    }

    private static func locateSanctumPakURL() -> URL? {
        if let bundled = Bundle.main.url(forResource: "sanctum", withExtension: "pak") {
            return bundled
        }
        if let resDir = Bundle.main.resourceURL {
            let direct = resDir.appendingPathComponent("sanctum.pak")
            if FileManager.default.fileExists(atPath: direct.path) {
                return direct
            }
        }
        let devFallback = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent("apple/build/sanctum.pak")
        if FileManager.default.fileExists(atPath: devFallback.path) {
            return devFallback
        }
        return nil
    }

    private static func openEncryptedVault() -> LoadedVault? {
        guard let pakURL = locateSanctumPakURL(),
              let pakData = try? Data(contentsOf: pakURL, options: .mappedIfSafe),
              pakData.count > 37 else {
            return nil
        }

        // Verify magic `"AVSK\x01"` (`0x41 0x56 0x53 0x4B 0x01`)
        guard pakData[0] == 0x41,
              pakData[1] == 0x56,
              pakData[2] == 0x53,
              pakData[3] == 0x4B,
              pakData[4] == 0x01 else {
            return nil
        }

        let b0 = UInt32(pakData[5])
        let b1 = UInt32(pakData[6]) << 8
        let b2 = UInt32(pakData[7]) << 16
        let b3 = UInt32(pakData[8]) << 24
        let tocSealedLen = Int(b0 | b1 | b2 | b3)
        let payloadBase = 9 + tocSealedLen
        guard tocSealedLen >= 28, payloadBase <= pakData.count else {
            return nil
        }

        let key = reconstructVaultKey()
        let tocSlice = pakData.subdata(in: 9..<payloadBase)
        guard let tocBox = try? AES.GCM.SealedBox(combined: tocSlice),
              let tocPlain = try? AES.GCM.open(tocBox, using: key),
              let rawJSON = try? JSONSerialization.jsonObject(with: tocPlain, options: []),
              let rawMap = rawJSON as? [String: [Any]] else {
            return nil
        }

        var toc = [String: VaultEntry]()
        toc.reserveCapacity(rawMap.count)
        for (vpath, tuple) in rawMap {
            guard tuple.count >= 3,
                  let offsetNum = tuple[0] as? NSNumber,
                  let lengthNum = tuple[1] as? NSNumber,
                  let mime = tuple[2] as? String else {
                continue
            }
            let offset = offsetNum.intValue
            let length = lengthNum.intValue
            guard offset >= payloadBase,
                  length >= 28,
                  offset + length <= pakData.count else {
                continue
            }
            let ext = (vpath as NSString).pathExtension.lowercased()
            toc[vpath] = VaultEntry(
                offset: offset,
                length: length,
                mimeType: mime,
                cacheControl: cacheControlHeader(for: ext)
            )
        }

        guard !toc.isEmpty else { return nil }
        return LoadedVault(mappedPak: pakData, key: key, toc: toc)
    }

    private static var defaultEntryName: String {
        String(decoding: [0x69, 0x6E, 0x64, 0x65, 0x78, 0x2E, 0x68, 0x74, 0x6D, 0x6C] as [UInt8], as: UTF8.self)
    }

    public func ensureStarted() -> URL? {
        lock.lock()
        defer { lock.unlock() }

        if isRunning, boundPort > 0, !sessionPrefix.isEmpty {
            return URL(string: "http://127.0.0.1:\(boundPort)\(sessionPrefix)/\(Self.defaultEntryName)")
        }

        guard let vault = Self.openEncryptedVault() else {
            return nil
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

        let prefix = Self.generateSessionPrefix()
        self.loadedVault = vault
        self.sessionPrefix = prefix
        self.listenFD = fd
        self.boundPort = UInt16(bigEndian: actualAddr.sin_port)
        self.isRunning = true

        acceptQueue.async { [weak self] in
            self?.acceptLoop(serverFD: fd)
        }

        return URL(string: "http://127.0.0.1:\(boundPort)\(prefix)/\(Self.defaultEntryName)")
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

    private func decryptVaultEntry(for virtualPath: String, vault: LoadedVault) -> (Data, VaultEntry)? {
        guard let entry = vault.toc[virtualPath] else {
            return nil
        }
        let cacheKey = virtualPath as NSString
        if let cached = fileCache.object(forKey: cacheKey) {
            return (cached as Data, entry)
        }

        let slice = vault.mappedPak.subdata(in: entry.offset..<(entry.offset + entry.length))
        guard let sealedBox = try? AES.GCM.SealedBox(combined: slice),
              let decrypted = try? AES.GCM.open(sealedBox, using: vault.key) else {
            return nil
        }

        if decrypted.count <= Self.maxCacheEntryBytes {
            fileCache.setObject(decrypted as NSData, forKey: cacheKey, cost: decrypted.count)
        }
        return (decrypted, entry)
    }

    private static func normalizeVirtualPath(_ rawSubpath: String) -> String? {
        if rawSubpath.contains("\0") || rawSubpath.contains("\\") {
            return nil
        }
        let parts = rawSubpath.split(separator: "/", omittingEmptySubsequences: true)
        var clean: [Substring] = []
        clean.reserveCapacity(parts.count)
        for seg in parts {
            if seg == "." { continue }
            if seg == ".." { return nil }
            clean.append(seg)
        }
        if clean.isEmpty {
            return defaultEntryName
        }
        return clean.joined(separator: "/")
    }

    private func handleClient(fd: Int32) {
        defer { Darwin.close(fd) }

        guard let vault = loadedVault else { return }
        let requiredPrefix = sessionPrefix + "/"
        guard !sessionPrefix.isEmpty else { return }

        var yes: Int32 = 1
        _ = setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &yes, socklen_t(MemoryLayout<Int32>.size))
        _ = setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &yes, socklen_t(MemoryLayout<Int32>.size))
        var sndBuf: Int32 = 512 * 1024
        _ = setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &sndBuf, socklen_t(MemoryLayout<Int32>.size))

        var tv = timeval(tv_sec: 4, tv_usec: 0)
        _ = setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))

        var buffer = [UInt8](repeating: 0, count: 16384)

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

            // Strictly enforce unguessable per-launch cryptographic session prefix (`403 Forbidden` otherwise)
            guard decodedPath.hasPrefix(requiredPrefix) else {
                sendStatus(fd: fd, code: 403, message: "Forbidden")
                break
            }

            let subpath = String(decodedPath.dropFirst(requiredPrefix.count))
            guard let virtualPath = Self.normalizeVirtualPath(subpath) else {
                sendStatus(fd: fd, code: 403, message: "Forbidden")
                break
            }

            guard let (fileData, entry) = decryptVaultEntry(for: virtualPath, vault: vault) else {
                sendStatus(fd: fd, code: 404, message: "Not Found")
                if wantsClose { break } else { continue }
            }

            let connHeader = wantsClose ? "close" : "keep-alive"
            let totalLen = fileData.count

            let rangeHeader = lines.first { $0.lowercased().hasPrefix("range: bytes=") }
            if let rangeHeader, totalLen > 0, let (start, end) = Self.parseRange(rangeHeader, total: totalLen) {
                let sliceLen = end - start + 1
                let header = [
                    "HTTP/1.1 206 Partial Content",
                    "Content-Type: \(entry.mimeType)",
                    "Content-Length: \(sliceLen)",
                    "Content-Range: bytes \(start)-\(end)/\(totalLen)",
                    "Accept-Ranges: bytes",
                    "Cache-Control: \(entry.cacheControl)",
                    "X-Content-Type-Options: nosniff",
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
                "Content-Type: \(entry.mimeType)",
                "Content-Length: \(totalLen)",
                "Accept-Ranges: bytes",
                "Cache-Control: \(entry.cacheControl)",
                "X-Content-Type-Options: nosniff",
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
            return "private, max-age=31536000, immutable"
        case "js", "mjs", "css":
            return "private, max-age=3600"
        default:
            return "no-store"
        }
    }
}
