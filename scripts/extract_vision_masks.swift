import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    fputs("Usage: swift scripts/extract_vision_masks.swift <assets_sprites_dir> <output_dir>\n", stderr)
    exit(1)
}
let inputDir = args[1]
let outputDir = args[2]
try FileManager.default.createDirectory(atPath: outputDir, withIntermediateDirectories: true)

let personas = [
    "nyx", "warrior", "mage", "priestess", "chronomancer", "valkyrie",
    "ronin", "archer", "reaper", "titan", "icemage", "android"
]

let ciCtx = CIContext()

for p in personas {
    let inPath = "\(inputDir)/\(p)_ex_portrait_raw.jpg"
    let outPath = "\(outputDir)/\(p)_vision_mask.png"
    if FileManager.default.fileExists(atPath: outPath) {
        continue
    }
    guard FileManager.default.fileExists(atPath: inPath),
          let ciImg = CIImage(contentsOf: URL(fileURLWithPath: inPath)) else {
        fputs("[WARN] Missing \(inPath)\n", stderr)
        continue
    }
    let handler = VNImageRequestHandler(ciImage: ciImg, options: [:])
    let req = VNGenerateForegroundInstanceMaskRequest()
    do {
        try handler.perform([req])
        guard let obs = req.results?.first else {
            fputs("[WARN] No foreground mask for \(p)\n", stderr)
            continue
        }
        let maskBuf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
        let maskCI = CIImage(cvPixelBuffer: maskBuf)
        guard let cgMask = ciCtx.createCGImage(maskCI, from: maskCI.extent) else { continue }
        let rep = NSBitmapImageRep(cgImage: cgMask)
        if let png = rep.representation(using: .png, properties: [:]) {
            try png.write(to: URL(fileURLWithPath: outPath))
            print("[OK] Vision Subject Lift \(p) -> \(outPath)")
        }
    } catch {
        fputs("[ERR] Vision Subject Lift \(p): \(error)\n", stderr)
    }
}
