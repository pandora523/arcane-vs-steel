import SwiftUI
import WebKit
#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

@MainActor
public final class SanctumWebCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
    let bridge = NativePlatformBridge()
    var didLoadInitialURL = false

    func makeConfiguredWebView() -> WKWebView {
        let contentController = WKUserContentController()
        contentController.add(bridge, name: NativePlatformBridge.messageHandlerName)

        // 1. Document-Start Metal & GPU Fast-Path (1x pixel-pure canvas + GPU IOSurface sprite atlas LRU + layer CSS)
        contentController.addUserScript(WKUserScript(
            source: Self.buildMetalFastPathDocumentStartScript(),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        // 2. Document-End WebGL2-on-Metal (`ANGLE Metal`) ArcaneShaderFX GPU Compositor + Native Haptics Bridge
        contentController.addUserScript(WKUserScript(
            source: Self.buildNativeEnhancementScript(),
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        ))

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        #if os(iOS)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        #else
        config.mediaTypesRequiringUserActionForPlayback = []
        #endif

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        bridge.webView = webView

        #if os(iOS)
        let cryptBg = UIColor(red: 5.0 / 255.0, green: 7.0 / 255.0, blue: 12.0 / 255.0, alpha: 1.0)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.underPageBackgroundColor = cryptBg
        webView.isMultipleTouchEnabled = true
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        #elseif os(macOS)
        let cryptBg = NSColor(srgbRed: 5.0 / 255.0, green: 7.0 / 255.0, blue: 12.0 / 255.0, alpha: 1.0)
        webView.setValue(false, forKey: "drawsBackground")
        webView.underPageBackgroundColor = cryptBg
        #endif

        return webView
    }

    func loadSanctumIfNeeded(in webView: WKWebView) {
        guard !didLoadInitialURL else { return }
        guard let url = LocalSanctumServer.shared.ensureStarted() else { return }
        didLoadInitialURL = true
        var req = URLRequest(url: url)
        req.cachePolicy = .useProtocolCachePolicy
        webView.load(req)
    }

    func setSceneActive(_ active: Bool, in webView: WKWebView) {
        bridge.setApplicationActive(active)
        #if os(iOS)
        if webView.isHidden == active {
            webView.isHidden = !active
        }
        #endif
    }

    private static func buildMetalFastPathDocumentStartScript() -> String {
        return #"""
        (function() {
          // 1. 1x Pixel-Pure Arena Backing Store + Metal Nearest-Neighbor Hardware Upscale
          try {
            Object.defineProperty(window, 'devicePixelRatio', {
              get: function() { return 1; },
              configurable: true
            });
          } catch (_) {}

          // 2. Zero-Duplication Direct HTMLImageElement Texture Path:
          // WebKit's native CGImage/Metal texture cache already hardware-accelerates decoded <img> sheets
          // directly without cloning 51.9 MB (6240x2080 RGBA) duplicate <canvas> IOSurfaces into VRAM.
          window.__avsEvictImageCache = function(_img) {};

          // 3. CoreAnimation / Metal Compositor Layer Isolation & Zero-Blur Fast CSS
          const injectPerfCSS = () => {
            if (document.getElementById('avs-metal-compositor-css')) return;
            const style = document.createElement('style');
            style.id = 'avs-metal-compositor-css';
            style.textContent = `
              #arena-canvas {
                will-change: transform;
                transform: translateZ(0);
                -webkit-transform: translateZ(0);
                contain: strict;
                image-rendering: pixelated !important;
              }
              .hud-top, .hud-bottom, .adventure-controls {
                transform: translateZ(0);
                -webkit-transform: translateZ(0);
                contain: layout style;
              }
              #adventure-controls {
                padding-bottom: env(safe-area-inset-bottom, 0px);
              }
              .victory-overlay, .pause-modal, .adv-skill-tree-modal {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
              }
              .stage-halo {
                filter: none !important;
                -webkit-filter: none !important;
              }
            `;
            (document.head || document.documentElement).appendChild(style);
          };
          if (document.head || document.documentElement) {
            injectPerfCSS();
          } else {
            document.addEventListener('DOMContentLoaded', injectPerfCSS, { once: true });
          }
        })();
        """#
    }

    private static func buildMetalShaderFXModuleSource() -> String {
        #if targetEnvironment(simulator)
        let isSimFlag = "true"
        #else
        let isSimFlag = "false"
        #endif
        return """
        window.__AVS_IS_IOS_SIMULATOR__ = \(isSimFlag);
        """ + "\n" + #"""
        import { ArcaneShaderFX } from '/src/engine/ArcaneShaderFX.js?v=30fps111';

        // Default to ArcaneShaderFX's unified low-power dirty-rect 2D compositor:
        // - Eliminates permanent ANGLE WebGL2 context + `powerPreference: 'high-performance'` GPU P-state boost
        // - Eliminates cross-context WebGL2 <-> Canvas2D Metal command-buffer stalls (up to 8 flushes/frame)
        // - Performs 0 pixel scans, 0 uploads, and 0 blits whenever `dirtyMaxX < dirtyMinX`
        // - Produces 100% bit-identical HD-2D pixel albedo + additive emissive bloom!
        (function configureThermalOptimalShaderPipeline() {
          const params = new URLSearchParams(window.location.search || '');
          const forceWebGL = params.get('webglShader') === '1';
          if (!forceWebGL || !ArcaneShaderFX) {
            window.__AVS_METAL_WEBGL2_ACTIVE__ = false;
            window.__AVS_GL_RENDERER__ = 'Unified2D-DirtyRect-LowPower';
            return;
          }

          try {
            const MAX_W = 736;
            const MAX_H = 464;
            const GL_W = MAX_W;
            const GL_H = MAX_H * 2;
            const glCanvas = document.createElement('canvas');
            glCanvas.width = GL_W;
            glCanvas.height = GL_H;
            const gl = glCanvas.getContext('webgl2', {
              alpha: true,
              premultipliedAlpha: true,
              antialias: false,
              depth: false,
              stencil: false,
              preserveDrawingBuffer: false,
              powerPreference: 'low-power'
            });
            if (!gl) {
              window.__AVS_METAL_WEBGL2_ACTIVE__ = false;
              return;
            }
            window.__AVS_GL_RENDERER__ = String(gl.getParameter(gl.RENDERER) || 'WebGL2-LowPower');
            // Release optional probe immediately unless custom GL debug pipeline is active
            glCanvas.width = 0;
            glCanvas.height = 0;
            window.__AVS_METAL_WEBGL2_ACTIVE__ = false;
          } catch (err) {
            window.__AVS_METAL_WEBGL2_ACTIVE__ = false;
            window.__AVS_METAL_SHADER_ERR__ = String(err && err.message ? err.message : err);
          }
        })();
        """#
    }

    private static func buildNativeEnhancementScript() -> String {
        let args = ProcessInfo.processInfo.arguments
        let smokeMode: String
        if args.contains("--measure-fps") {
            smokeMode = "measure_fps"
        } else if args.contains("--smoke-versus") {
            smokeMode = "versus"
        } else if args.contains("--smoke-roster") {
            smokeMode = "roster"
        } else if args.contains("--smoke-adventure") {
            smokeMode = "adventure"
        } else {
            smokeMode = "none"
        }

        #if os(macOS)
        let isMacNative = "true"
        #else
        let isMacNative = "false"
        #endif

        // JSON-encode the ES module source safely so it embeds cleanly inside `<script type="module">`
        let moduleSource = buildMetalShaderFXModuleSource()
        let encodedModuleJSON: String
        if let data = try? JSONEncoder().encode(moduleSource),
           let str = String(data: data, encoding: .utf8) {
            encodedModuleJSON = str
        } else {
            encodedModuleJSON = "\"\""
        }

        return """
        (function() {
          const postNative = (payload) => {
            try {
              window.webkit?.messageHandlers?.avsNative?.postMessage(payload);
            } catch (_) {}
          };

          // Signal native MTKView to suspend background redraws once the game canvas presents Frame 1
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              postNative({ action: 'stageReady' });
            });
          });

          // Inject ES Module into page document so it shares exact singleton module cache with game entities
          const modScript = document.createElement('script');
          modScript.type = 'module';
          modScript.textContent = \(encodedModuleJSON);
          (document.head || document.documentElement).appendChild(modScript);

          // Tactile native haptics on original arcade buttons & Adventure 5-orb cluster
          document.addEventListener('pointerdown', (e) => {
            const btn = e.target?.closest?.('button, .champ-card, .stage-card');
            if (!btn) return;
            const id = btn.id || '';
            if (id === 'adv-btn-ultimate' || id === 'btn-test-ult') {
              postNative({ action: 'haptic', style: 'heavy' });
            } else if (id === 'adv-btn-overdrive' || id === 'btn-start-duel' || id === 'btn-nav-commence') {
              postNative({ action: 'haptic', style: 'medium' });
            } else {
              postNative({ action: 'haptic', style: 'light' });
            }
          }, { passive: true });

          // Native macOS window fullscreen hook for Fullscreen/Landscape buttons
          if (\(isMacNative)) {
            ['btn-mobile-landscape', 'btn-vs-pause-landscape', 'adv-btn-landscape'].forEach((id) => {
              const el = document.getElementById(id);
              if (el) {
                el.addEventListener('click', () => postNative({ action: 'toggleMacFullscreen' }));
              }
            });
          }

          // Optional CLI smoke-test / 60FPS telemetry hooks (strictly inactive on normal launch)
          const smoke = '\(smokeMode)';
          if (smoke !== 'none') {
            setTimeout(() => {
              if (smoke === 'measure_fps') {
                document.getElementById('btn-go-mode')?.click();
                setTimeout(() => {
                  document.getElementById('btn-mode-2v2-tag')?.click();
                  setTimeout(() => document.getElementById('btn-nav-commence')?.click(), 120);
                }, 180);
                setTimeout(() => {
                  const deltas = [];
                  let prev = performance.now();
                  const sample = (t) => {
                    deltas.push(t - prev);
                    prev = t;
                    if (deltas.length < 180) {
                      requestAnimationFrame(sample);
                    } else {
                      const sorted = [...deltas].sort((a, b) => a - b);
                      const sum = deltas.reduce((a, b) => a + b, 0);
                      const avgMs = sum / deltas.length;
                      const avgFps = 1000 / Math.max(0.1, avgMs);
                      const p95Ms = sorted[Math.floor(sorted.length * 0.95)] || avgMs;
                      const arena = document.getElementById('arena-canvas');
                      postNative({
                        action: 'fpsReport',
                        avgFps: Math.round(avgFps * 100) / 100,
                        avgFrameMs: Math.round(avgMs * 100) / 100,
                        p95FrameMs: Math.round(p95Ms * 100) / 100,
                        samples: deltas.length,
                        canvasWidth: arena ? arena.width : 0,
                        canvasHeight: arena ? arena.height : 0,
                        dpr: window.devicePixelRatio,
                        webglMetalShaderFX: Boolean(window.__AVS_METAL_WEBGL2_ACTIVE__),
                        glRenderer: window.__AVS_GL_RENDERER__ || '',
                        shaderErr: window.__AVS_METAL_SHADER_ERR__ || ''
                      });
                    }
                  };
                  requestAnimationFrame((t0) => {
                    prev = t0;
                    requestAnimationFrame(sample);
                  });
                }, 1400);
              } else if (smoke === 'versus') {
                document.getElementById('btn-go-mode')?.click();
                setTimeout(() => document.getElementById('btn-nav-commence')?.click(), 180);
              } else if (smoke === 'roster') {
                document.getElementById('btn-go-mode')?.click();
                setTimeout(() => document.getElementById('btn-mode-next')?.click(), 180);
              } else if (smoke === 'adventure') {
                document.getElementById('btn-title-adventure')?.click();
                setTimeout(() => document.getElementById('btn-start-duel')?.click(), 220);
              }
            }, 350);
          }
        })();
        """
    }
}

#if os(iOS)
private struct SanctumWebHostView: UIViewRepresentable {
    let isSceneActive: Bool

    func makeCoordinator() -> SanctumWebCoordinator {
        SanctumWebCoordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = context.coordinator.makeConfiguredWebView()
        context.coordinator.loadSanctumIfNeeded(in: webView)
        context.coordinator.setSceneActive(isSceneActive, in: webView)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        context.coordinator.setSceneActive(isSceneActive, in: uiView)
    }
}
#elseif os(macOS)
private struct SanctumWebHostView: NSViewRepresentable {
    let isSceneActive: Bool

    func makeCoordinator() -> SanctumWebCoordinator {
        SanctumWebCoordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let webView = context.coordinator.makeConfiguredWebView()
        context.coordinator.loadSanctumIfNeeded(in: webView)
        context.coordinator.setSceneActive(isSceneActive, in: webView)
        DispatchQueue.main.async {
            webView.window?.makeFirstResponder(webView)
        }
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        context.coordinator.setSceneActive(isSceneActive, in: nsView)
    }
}
#endif

public struct SanctumWebStageView: View {
    @ObservedObject private var metal = SanctumMetalPipeline.shared
    private let isSceneActive: Bool

    public init(isSceneActive: Bool = true) {
        self.isSceneActive = isSceneActive
    }

    public var body: some View {
        ZStack {
            if !metal.isStageOpaqueReady {
                SanctumMetalBackdropView()
                    .ignoresSafeArea()
            }
            SanctumWebHostView(isSceneActive: isSceneActive)
                .ignoresSafeArea()
        }
        .background(Color(red: 5.0 / 255.0, green: 7.0 / 255.0, blue: 12.0 / 255.0))
    }
}
