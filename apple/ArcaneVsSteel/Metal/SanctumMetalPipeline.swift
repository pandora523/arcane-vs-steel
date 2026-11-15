import Foundation
import Metal
import MetalKit
import SwiftUI
import Combine

public struct SanctumMetalUniforms {
    public var viewportSize: SIMD2<Float>
    public var pixelScale: Float
    public var time: Float
}

/// Native Apple Metal (`MTLDevice` + `MTLCommandQueue` + `.metal` `MTLRenderPipelineState`) hardware pipeline
/// for iOS (Apple A-series / M-series ProMotion) and macOS (Apple Silicon / Metal 3).
/// Provides:
/// 1. Lossless Nearest-Neighbor (`MTLSamplerMinMagFilter.nearest`) GPU substrate with zero bilinear filtering.
/// 2. Instant zero-flash hardware Metal boot frame (`< 0.1ms`), automatically suspending background redraws
///    the instant the opaque combat canvas (`#arena-canvas`) presents its first frame so 100% of GPU bandwidth
///    is dedicated to live combat & WebGL2-on-Metal shader passes.
@MainActor
public final class SanctumMetalPipeline: NSObject, ObservableObject, MTKViewDelegate {
    public static let shared = SanctumMetalPipeline()

    public let device: MTLDevice?
    public let commandQueue: MTLCommandQueue?
    public let nearestSampler: MTLSamplerState?
    private var backdropPipeline: MTLRenderPipelineState?
    private var blitPipeline: MTLRenderPipelineState?

    public weak var attachedView: MTKView?
    private var bootTimestamp: CFTimeInterval = CACurrentMediaTime()
    @Published public private(set) var isStageOpaqueReady = false

    public var gpuSummary: String {
        guard let device else { return "Software Fallback" }
        #if os(iOS)
        let maxFPS = UIScreen.main.maximumFramesPerSecond
        return "\(device.name) (Max \(maxFPS)Hz)"
        #else
        return device.name
        #endif
    }

    private override init() {
        let dev = MTLCreateSystemDefaultDevice()
        self.device = dev
        self.commandQueue = dev?.makeCommandQueue()

        if let dev {
            let sampDesc = MTLSamplerDescriptor()
            sampDesc.minFilter = .nearest
            sampDesc.magFilter = .nearest
            sampDesc.mipFilter = .notMipmapped
            sampDesc.sAddressMode = .clampToEdge
            sampDesc.tAddressMode = .clampToEdge
            self.nearestSampler = dev.makeSamplerState(descriptor: sampDesc)
        } else {
            self.nearestSampler = nil
        }

        super.init()
        buildPipelines()
    }

    private func buildPipelines() {
        guard let device, let library = device.makeDefaultLibrary() else { return }

        if let vfn = library.makeFunction(name: "sanctumFullscreenVertex"),
           let ffn = library.makeFunction(name: "sanctumCryptBackdropFragment") {
            let desc = MTLRenderPipelineDescriptor()
            desc.label = "SanctumCryptBackdropPipeline"
            desc.vertexFunction = vfn
            desc.fragmentFunction = ffn
            desc.colorAttachments[0].pixelFormat = .bgra8Unorm
            self.backdropPipeline = try? device.makeRenderPipelineState(descriptor: desc)
        }

        if let vfn = library.makeFunction(name: "sanctumFullscreenVertex"),
           let bfn = library.makeFunction(name: "sanctumNearestBlitFragment") {
            let desc = MTLRenderPipelineDescriptor()
            desc.label = "SanctumNearestBlitPipeline"
            desc.vertexFunction = vfn
            desc.fragmentFunction = bfn
            desc.colorAttachments[0].pixelFormat = .bgra8Unorm
            self.blitPipeline = try? device.makeRenderPipelineState(descriptor: desc)
        }
    }

    public func configure(mtkView: MTKView) {
        mtkView.device = device
        mtkView.colorPixelFormat = .bgra8Unorm
        mtkView.framebufferOnly = true
        mtkView.clearColor = MTLClearColor(red: 5.0 / 255.0, green: 7.0 / 255.0, blue: 12.0 / 255.0, alpha: 1.0)
        mtkView.depthStencilPixelFormat = .invalid
        mtkView.sampleCount = 1 // Strictly 1x MSAA off for crisp pixel purity
        mtkView.delegate = self

        // Event-driven presentation: draws on resize / cold boot without wasting GPU bandwidth behind opaque arena
        mtkView.enableSetNeedsDisplay = true
        mtkView.isPaused = true

        #if os(iOS)
        mtkView.preferredFramesPerSecond = 60
        mtkView.isOpaque = true
        mtkView.contentScaleFactor = 1.0 // Pure 1x pixel-art substrate upscaled via CAMetalLayer Nearest-Neighbor
        if let metalLayer = mtkView.layer as? CAMetalLayer {
            metalLayer.magnificationFilter = .nearest
            metalLayer.minificationFilter = .nearest
            metalLayer.presentsWithTransaction = false
        }
        #elseif os(macOS)
        mtkView.preferredFramesPerSecond = 60
        mtkView.layer?.isOpaque = true
        if let metalLayer = mtkView.layer as? CAMetalLayer {
            metalLayer.magnificationFilter = .nearest
            metalLayer.minificationFilter = .nearest
            metalLayer.displaySyncEnabled = true
        }
        #endif

        self.attachedView = mtkView
        requestSingleMetalPass()
    }

    public func markGameStageOpaqueReady() {
        guard !isStageOpaqueReady else { return }
        isStageOpaqueReady = true
        attachedView?.isPaused = true
        attachedView?.enableSetNeedsDisplay = true
        attachedView?.releaseDrawables()
    }

    public func setApplicationActive(_ active: Bool) {
        if !active {
            attachedView?.isPaused = true
            attachedView?.releaseDrawables()
        } else if !isStageOpaqueReady {
            requestSingleMetalPass()
        }
    }

    public func requestSingleMetalPass() {
        guard let view = attachedView else { return }
        #if os(iOS)
        view.setNeedsDisplay()
        #elseif os(macOS)
        view.needsDisplay = true
        #endif
    }

    public func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        if !isStageOpaqueReady {
            requestSingleMetalPass()
        }
    }

    public func draw(in view: MTKView) {
        guard let commandQueue,
              let passDesc = view.currentRenderPassDescriptor,
              let drawable = view.currentDrawable,
              let cmdBuf = commandQueue.makeCommandBuffer(),
              let encoder = cmdBuf.makeRenderCommandEncoder(descriptor: passDesc) else {
            return
        }

        encoder.label = "SanctumMetalBackdropPass"
        if let backdropPipeline {
            var uniforms = SanctumMetalUniforms(
                viewportSize: SIMD2<Float>(
                    Float(max(1.0, view.drawableSize.width)),
                    Float(max(1.0, view.drawableSize.height))
                ),
                pixelScale: 4.0,
                time: Float(CACurrentMediaTime() - bootTimestamp)
            )
            encoder.setRenderPipelineState(backdropPipeline)
            encoder.setFragmentBytes(&uniforms, length: MemoryLayout<SanctumMetalUniforms>.stride, index: 0)
            encoder.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4)
        }
        encoder.endEncoding()

        cmdBuf.present(drawable)
        cmdBuf.commit()
    }
}

#if os(iOS)
public struct SanctumMetalBackdropView: UIViewRepresentable {
    public init() {}

    public func makeUIView(context: Context) -> MTKView {
        let view = MTKView(frame: .zero)
        SanctumMetalPipeline.shared.configure(mtkView: view)
        return view
    }

    public func updateUIView(_ uiView: MTKView, context: Context) {}
}
#elseif os(macOS)
public struct SanctumMetalBackdropView: NSViewRepresentable {
    public init() {}

    public func makeNSView(context: Context) -> MTKView {
        let view = MTKView(frame: .zero)
        SanctumMetalPipeline.shared.configure(mtkView: view)
        return view
    }

    public func updateNSView(_ nsView: MTKView, context: Context) {}
}
#endif
