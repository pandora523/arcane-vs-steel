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

          // 2. Bounded GPU IOSurface Atlas Cache for Sprite Sheets, Stages & Panoramas (0 CPU PNG Re-Decodes)
          const proto = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
          if (proto && proto.drawImage && !proto.__avsMetalAtlasWrapped) {
            const rawDrawImage = proto.drawImage;
            const MAX_ATLASES = 28;
            const lruKeys = [];
            const atlasMap = new Map();

            function resolveGpuAtlas(img) {
              if (!(img instanceof HTMLImageElement) || !img.complete) return img;
              const nw = img.naturalWidth | 0;
              const nh = img.naturalHeight | 0;
              if (nw < 256 || nh <= 0) return img;
              const src = img.currentSrc || img.src || '';
              if (!src) return img;

              let entry = atlasMap.get(src);
              if (entry && entry.w === nw && entry.h === nh) {
                const idx = lruKeys.indexOf(src);
                if (idx >= 0 && idx !== lruKeys.length - 1) {
                  lruKeys.splice(idx, 1);
                  lruKeys.push(src);
                }
                return entry.canvas;
              }

              while (lruKeys.length >= MAX_ATLASES) {
                const oldest = lruKeys.shift();
                const evicted = atlasMap.get(oldest);
                if (evicted && evicted.canvas) {
                  evicted.canvas.width = 0;
                  evicted.canvas.height = 0;
                }
                atlasMap.delete(oldest);
              }

              const gpuCanvas = document.createElement('canvas');
              gpuCanvas.width = nw;
              gpuCanvas.height = nh;
              const gctx = gpuCanvas.getContext('2d');
              if (!gctx) return img;
              gctx.imageSmoothingEnabled = false;
              rawDrawImage.call(gctx, img, 0, 0);

              atlasMap.set(src, { canvas: gpuCanvas, w: nw, h: nh });
              lruKeys.push(src);
              return gpuCanvas;
            }

            proto.drawImage = function(image) {
              const src = (image instanceof HTMLImageElement && image.naturalWidth >= 256)
                ? resolveGpuAtlas(image)
                : image;
              switch (arguments.length) {
                case 3:
                  return rawDrawImage.call(this, src, arguments[1], arguments[2]);
                case 5:
                  return rawDrawImage.call(this, src, arguments[1], arguments[2], arguments[3], arguments[4]);
                case 9:
                  return rawDrawImage.call(
                    this, src,
                    arguments[1], arguments[2], arguments[3], arguments[4],
                    arguments[5], arguments[6], arguments[7], arguments[8]
                  );
                default:
                  return rawDrawImage.apply(this, arguments);
              }
            };
            proto.__avsMetalAtlasWrapped = true;
          }

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
        import { ArcaneShaderFX, PURE_WHITE, clamp01 } from '/src/engine/ArcaneShaderFX.js?v=30fps110';
        import { Renderer } from '/src/engine/Renderer.js?v=30fps110';
        import { PixelForge } from '/src/engine/PixelForge.js?v=30fps110';

        // 1. GPU IOSurface Pre-Baked VS Stage Mosaic + 15Hz Cached Volumetric God-Rays
        (function installMetalRendererStageCache() {
          try {
            if (!Renderer || Renderer.prototype.__avsMetalStageCached) return;

            const origDrawHD2DArena = Renderer.prototype.drawHD2DArena;
            const origDrawGodRays = Renderer.prototype.drawVolumetricGodRays;

            // Cache the 9 static stage/vault/reflection blits + linear floorFade gradient into ONE 1x pixel-pure IOSurface
            Renderer.prototype.drawHD2DArena = function(ctx, ww, gy) {
              if (
                (this.adventureMode && ww > 1600) ||
                (this.trueUltStageOverride && this.trueUltStageAlpha > 0.01)
              ) {
                return origDrawHD2DArena.call(this, ctx, ww, gy);
              }
              const assets = PixelForge.initAssets();
              const stageMeta = this.getCurrentStageMeta();
              const bg = PixelForge.ensureImage((stageMeta && assets[stageMeta.assetKey]) || assets.arenaBg);
              if (!bg || !bg.complete || bg.naturalWidth <= 0) {
                return origDrawHD2DArena.call(this, ctx, ww, gy);
              }

              const srcW = bg.naturalWidth || 640;  // 640
              const srcH = bg.naturalHeight || 360; // 360
              const upperVault = this.getOrBakeStageUpperVault(bg);
              const vaultH = upperVault ? upperVault.height : 0; // 280
              const cacheKey = (bg.currentSrc || bg.src || stageMeta?.id || 'default') + ':' + vaultH;

              if (!this._avsStageMosaic || this._avsStageMosaicKey !== cacheKey) {
                // 1x native art resolution: 3 columns (left mirror + center + right mirror) = 1920 x (vaultH + srcH + srcH)
                const mw = srcW * 3;
                const mh = vaultH + srcH * 2;
                const mc = this._avsStageMosaic || document.createElement('canvas');
                mc.width = mw;
                mc.height = mh;
                const mctx = mc.getContext('2d', { alpha: false });
                if (!mctx) return origDrawHD2DArena.call(this, ctx, ww, gy);
                mctx.imageSmoothingEnabled = false;
                mctx.fillStyle = '#04050a';
                mctx.fillRect(0, 0, mw, mh);

                const topStageY = vaultH;
                const botMirrorY = vaultH + srcH;

                if (upperVault && vaultH > 0) {
                  mctx.save(); mctx.translate(srcW, 0); mctx.scale(-1, 1); mctx.drawImage(upperVault, 0, 0, srcW, vaultH); mctx.restore();
                  mctx.drawImage(upperVault, srcW, 0, srcW, vaultH);
                  mctx.save(); mctx.translate(srcW * 3, 0); mctx.scale(-1, 1); mctx.drawImage(upperVault, 0, 0, srcW, vaultH); mctx.restore();
                }

                // Main stage row (left wing mirror + center + right wing mirror)
                mctx.save(); mctx.translate(srcW, topStageY); mctx.scale(-1, 1); mctx.drawImage(bg, 0, 0, srcW, srcH); mctx.restore();
                mctx.drawImage(bg, srcW, topStageY, srcW, srcH);
                mctx.save(); mctx.translate(srcW * 3, topStageY); mctx.scale(-1, 1); mctx.drawImage(bg, 0, 0, srcW, srcH); mctx.restore();

                // Intact lower-floor vertical reflection row + exact floorFade gradient
                mctx.save(); mctx.translate(srcW, botMirrorY + srcH); mctx.scale(-1, -1); mctx.drawImage(bg, 0, 0, srcW, srcH); mctx.restore();
                mctx.save(); mctx.translate(srcW, botMirrorY + srcH); mctx.scale(1, -1); mctx.drawImage(bg, 0, 0, srcW, srcH); mctx.restore();
                mctx.save(); mctx.translate(srcW * 3, botMirrorY + srcH); mctx.scale(-1, -1); mctx.drawImage(bg, 0, 0, srcW, srcH); mctx.restore();

                const fadeStart = botMirrorY - 4;
                const fadeEnd = botMirrorY + Math.round(520 / 3);
                const floorFade = mctx.createLinearGradient(0, fadeStart, 0, fadeEnd);
                floorFade.addColorStop(0, 'rgba(4, 5, 10, 0)');
                floorFade.addColorStop(0.46, 'rgba(4, 5, 10, 0.84)');
                floorFade.addColorStop(1, '#04050a');
                mctx.fillStyle = floorFade;
                mctx.fillRect(0, fadeStart, mw, srcH + 8);

                this._avsStageMosaic = mc;
                this._avsStageMosaicKey = cacheKey;
                this._avsStageVaultH = vaultH;
                this._avsStageSrcH = srcH;
              }

              const drawW = 1920;
              const drawH = 1080;
              const drawX = Math.round((ww - drawW) * 0.5);
              const drawY = Math.round(gy - drawH * 0.82);
              const vaultDrawH = Math.round(drawH * ((this._avsStageVaultH || 0) / (this._avsStageSrcH || 360)));
              const mosaicWorldX = drawX - drawW;
              const mosaicWorldY = drawY - vaultDrawH;
              const mosaicWorldW = drawW * 3;
              const mosaicWorldH = vaultDrawH + drawH * 2;

              const prevSmooth = ctx.imageSmoothingEnabled;
              ctx.imageSmoothingEnabled = false;
              ctx.fillStyle = '#04050a';
              if (mosaicWorldY > -1400) {
                ctx.fillRect(mosaicWorldX, mosaicWorldY - 960, mosaicWorldW, 964);
              }
              // Single Nearest-Neighbor IOSurface GPU blit replaces 10 blits + linear gradient!
              ctx.drawImage(this._avsStageMosaic, mosaicWorldX, mosaicWorldY, mosaicWorldW, mosaicWorldH);
              ctx.imageSmoothingEnabled = prevSmooth;

              // Preserve live animated flagstone specular trim seams & bespoke stage effects (torches, sakura, gears)
              const seamStage = this.getActiveStageId();
              const seamPulse = 0.5 + 0.5 * Math.sin(this.time * 3.8);
              for (let r = 0; r < 5; r++) {
                const ry = Math.round((gy - 22 + r * r * 12) / 3) * 3;
                if (seamStage === 'inferno' || seamStage === 'shogunate_inferno') {
                  ctx.fillStyle = seamStage === 'shogunate_inferno' ? 'rgba(18, 7, 6, 0.46)' : 'rgba(15, 6, 4, 0.44)';
                  ctx.fillRect(-800, ry, ww + 1600, 3);
                  const lavaSeamAlpha = (0.12 + 0.08 * Math.sin(this.time * 5.2 + r * 1.3)).toFixed(3);
                  ctx.fillStyle = seamStage === 'shogunate_inferno'
                    ? `rgba(244, 63, 94, ${lavaSeamAlpha})`
                    : `rgba(251, 146, 60, ${lavaSeamAlpha})`;
                  ctx.fillRect(-800, ry + 1, ww + 1600, 2);
                } else {
                  ctx.fillStyle = 'rgba(6, 10, 20, 0.36)';
                  ctx.fillRect(-800, ry, ww + 1600, 3);
                  if (r === 1) {
                    const pAlpha = (0.11 + 0.04 * seamPulse).toFixed(3);
                    ctx.fillStyle = `rgba(125, 211, 252, ${pAlpha})`;
                    ctx.fillRect(-800, ry + 1, ww + 1600, 2);
                  }
                }
              }

              ctx.save();
              ctx.imageSmoothingEnabled = false;
              const baseStageId = this.permanentStageOverride || this.stageId;
              if (baseStageId === 'inferno') {
                this.drawInfernoStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
              } else if (baseStageId === 'glacial') {
                this.drawGlacialStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
              } else if (baseStageId === 'shogunate') {
                this.drawShogunateStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
              } else if (baseStageId === 'shogunate_inferno') {
                this.drawShogunateInfernoStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
              } else if (baseStageId === 'shogunate_glacial') {
                this.drawShogunateGlacialStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
              } else if (baseStageId === 'sanctuary') {
                this.drawSanctuaryStageEffects(ctx, drawX, drawY, drawW, drawH, gy, 1.0);
              } else if (baseStageId === 'sylvan') {
                this.drawSylvanStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
              } else if (baseStageId === 'boneyard') {
                this.drawBoneyardStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
              } else if (baseStageId === 'clocktower') {
                this.drawClocktowerStageEffects(ctx, bg, drawX, drawY, drawW, drawH, gy);
              } else {
                this.drawStagePixelFlames(ctx, bg, drawX, drawY, drawW, drawH, gy);
              }
              ctx.restore();
            };

            // Cache volumetric god-rays onto a half-res GPU IOSurface updated at 15Hz (eliminates 5 LinearGradients + 10 polygons/frame!)
            Renderer.prototype.drawVolumetricGodRays = function(ctx, ww, gy) {
              if (this.adventureMode) {
                return origDrawGodRays.call(this, ctx, ww, gy);
              }
              const stageKey = this.getActiveStageId();
              const bucket = Math.floor((this.time || 0) * 15);
              const RW = 640;
              const RH = 320;
              const worldX = Math.round(ww * 0.5 - 640);
              const worldY = Math.round(gy - 560);
              const worldW = 1280;
              const worldH = 640;

              if (!this._avsGodRayCanvas || this._avsGodRayStage !== stageKey || this._avsGodRayBucket !== bucket) {
                const rc = this._avsGodRayCanvas || document.createElement('canvas');
                if (rc.width !== RW) rc.width = RW;
                if (rc.height !== RH) rc.height = RH;
                const rctx = rc.getContext('2d');
                if (!rctx) return origDrawGodRays.call(this, ctx, ww, gy);
                rctx.setTransform(1, 0, 0, 1, 0, 0);
                rctx.clearRect(0, 0, RW, RH);
                rctx.save();
                rctx.scale(RW / worldW, RH / worldH);
                rctx.translate(-worldX, -worldY);
                origDrawGodRays.call(this, rctx, ww, gy);
                rctx.restore();
                this._avsGodRayCanvas = rc;
                this._avsGodRayStage = stageKey;
                this._avsGodRayBucket = bucket;
              }

              const prevComp = ctx.globalCompositeOperation;
              ctx.globalCompositeOperation = 'lighter';
              ctx.drawImage(this._avsGodRayCanvas, worldX, worldY, worldW, worldH);
              ctx.globalCompositeOperation = prevComp;
            };

            Renderer.prototype.__avsMetalStageCached = true;
          } catch (_) {}
        })();

        (function installMetalWebGL2ShaderFX() {
          try {
            if (!ArcaneShaderFX || ArcaneShaderFX.prototype.__avsMetalGLInstalled) return;

            const MAX_W = 736; // Covers all 11 champions (640x420, 640x460, and Archer 720x460)
            const MAX_H = 464;
            const GL_W = MAX_W;
            const GL_H = MAX_H * 2; // Top half = crisp pixel albedo, bottom half = HDR emissive bloom

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
              powerPreference: 'high-performance'
            });
            if (!gl) {
              window.__AVS_METAL_SHADER_ERR__ = 'no_webgl2_context';
              return;
            }
            const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
            const glRenderer = String(
              (dbgExt ? gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || ''
            );
            const isSoftwareWebGL = /Software/i.test(glRenderer);
            window.__AVS_GL_RENDERER__ = glRenderer;

            const vsSrc = `#version 300 es
            void main() {
              vec2 pos = vec2((gl_VertexID & 1) != 0 ? 1.0 : -1.0, (gl_VertexID & 2) != 0 ? 1.0 : -1.0);
              gl_Position = vec4(pos, 0.0, 1.0);
            }`;

            const fsSrc = `#version 300 es
            precision highp float;
            precision highp int;
            uniform sampler2D u_albedo;
            uniform sampler2D u_emissive;
            uniform ivec2 u_vpOrigin;
            uniform ivec2 u_rectMin;
            uniform ivec2 u_rectSize;
            uniform ivec2 u_surfSize;
            out vec4 fragColor;

            void main() {
              int localX = int(gl_FragCoord.x) - u_vpOrigin.x;
              int localYFromBottom = int(gl_FragCoord.y) - u_vpOrigin.y;
              int totalH = u_rectSize.y * 2;
              int slotY = (totalH - 1) - localYFromBottom;
              bool isEmissive = slotY >= u_rectSize.y;
              int rx = clamp(localX, 0, u_rectSize.x - 1);
              int ry = clamp(isEmissive ? (slotY - u_rectSize.y) : slotY, 0, u_rectSize.y - 1);
              int sx = u_rectMin.x + rx;
              int sy = u_rectMin.y + ry;

              // Exact 16px smoothstep edge feather in full surface coordinates
              int yEdge = min(sy, u_surfSize.y - 1 - sy);
              int xEdge = min(sx, u_surfSize.x - 1 - sx);
              int d = min(yEdge, xEdge);
              float k = 1.0;
              if (d < 16) {
                float u = d <= 0 ? 0.0 : (float(d) / 16.0);
                k = u * u * (3.0 - 2.0 * u);
              }

              vec4 alb = texelFetch(u_albedo, ivec2(sx, ry), 0);
              if (!isEmissive) {
                float outA = alb.a * k;
                fragColor = vec4(alb.rgb * outA, outA);
                return;
              }

              vec4 emi = texelFetch(u_emissive, ivec2(sx, ry), 0);
              bool hasAlb = alb.a > 0.0 || alb.r > 0.0 || alb.g > 0.0 || alb.b > 0.0;
              bool hasEmi = emi.r > 0.0 || emi.g > 0.0 || emi.b > 0.0;
              if (!hasAlb && !hasEmi) {
                fragColor = vec4(0.0);
                return;
              }

              vec3 l = emi.rgb * (255.0 * 1.22);
              if (hasAlb) {
                vec3 c255 = alb.rgb * 255.0;
                float peak = max(c255.r, max(c255.g, c255.b));
                if (peak > 150.0) {
                  float boost = ((peak - 150.0) / 105.0) * 0.42 * alb.a;
                  l += c255 * boost;
                }
              }

              float maxL = max(l.r, max(l.g, l.b));
              if (maxL < 2.0) {
                fragColor = vec4(0.0);
                return;
              }

              float aEmi0 = min(255.0, floor(maxL + 0.5));
              float scale = 255.0 / max(1.0, aEmi0);
              vec3 uRgb = min(vec3(255.0), floor(l * scale + 0.5)) * k;
              float outA = (aEmi0 * k) / 255.0;
              fragColor = vec4((uRgb / 255.0) * outA, outA);
            }`;

            const compileShader = (type, src) => {
              const sh = gl.createShader(type);
              gl.shaderSource(sh, src);
              gl.compileShader(sh);
              if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(sh) || 'shader_compile_failed';
                gl.deleteShader(sh);
                throw new Error(log);
              }
              return sh;
            };

            const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
            const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
            const prog = gl.createProgram();
            gl.attachShader(prog, vs);
            gl.attachShader(prog, fs);
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
              throw new Error(gl.getProgramInfoLog(prog) || 'program_link_failed');
            }

            gl.useProgram(prog);
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);

            const makeNearestTex = (unit) => {
              gl.activeTexture(gl.TEXTURE0 + unit);
              const tex = gl.createTexture();
              gl.bindTexture(gl.TEXTURE_2D, tex);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
              gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, MAX_W, MAX_H);
              return tex;
            };

            const albedoTex = makeNearestTex(0);
            const emissiveTex = makeNearestTex(1);
            gl.uniform1i(gl.getUniformLocation(prog, 'u_albedo'), 0);
            gl.uniform1i(gl.getUniformLocation(prog, 'u_emissive'), 1);
            const uVpOrigin = gl.getUniformLocation(prog, 'u_vpOrigin');
            const uRectMin = gl.getUniformLocation(prog, 'u_rectMin');
            const uRectSize = gl.getUniformLocation(prog, 'u_rectSize');
            const uSurfSize = gl.getUniformLocation(prog, 'u_surfSize');
            gl.disable(gl.BLEND);
            gl.enable(gl.SCISSOR_TEST);

            const origRenderLayer = ArcaneShaderFX.prototype.renderLayer;

            ArcaneShaderFX.prototype.renderLayer = function(ctx, passName, centerWorldX = 600, groundWorldY = 580, alpha = 1.0) {
              if ((!this.active.length && !this.worldMotes.length) || !ctx) return;
              const W = this.viewW | 0;
              const H = this.viewH | 0;
              if (W <= 0 || H <= 0 || W > MAX_W || H > MAX_H || gl.isContextLost()) {
                return origRenderLayer.call(this, ctx, passName, centerWorldX, groundWorldY, alpha);
              }

              this.arenaCenterX = Number.isFinite(this.overrideCenterWorldX)
                ? this.overrideCenterWorldX
                : centerWorldX;
              this.groundWorldY = groundWorldY;
              const isBack = passName === 'back';
              const surface = isBack ? this.surfaceBack : this.surfaceFront;
              const pen = isBack ? this.penBack : this.penFront;
              const { scale, worldW, worldH, worldLeft, worldTop } = this.computeViewport(centerWorldX, groundWorldY);

              // Fast dirty-row clear (clears only rows touched on previous pass instead of full 268,800px)
              const alb32 = surface.albedo;
              const emi32 = surface.emissive;
              const clearY0 = surface._dirtyY0 !== undefined ? surface._dirtyY0 : 0;
              const clearY1 = surface._dirtyY1 !== undefined ? surface._dirtyY1 : (H - 1);
              if (clearY0 <= clearY1) {
                const startIdx = clearY0 * W;
                const endIdx = (clearY1 + 1) * W;
                alb32.fill(0, startIdx, endIdx);
                emi32.fill(0, startIdx, endIdx);
              }
              surface._dirtyY0 = H;
              surface._dirtyY1 = -1;

              let drewAny = false;
              for (let i = 0; i < this.active.length; i++) {
                const s = this.active[i];
                const lx = Math.round((s.worldX - worldLeft) / scale);
                const ly = Math.round((s.worldY - worldTop) / scale);
                if (lx < -160 || lx > W + 160 || ly < -160 || ly > H + 160) continue;
                s.inst.cfg.x = lx;
                s.inst.cfg.y = ly;
                s.inst.render(pen, passName);
                drewAny = true;
              }

              if (!isBack && this.worldMotes.length > 0) {
                pen.configure(0, 0, false, 0, 1, 1.05);
                pen.pass = 'front';
                for (let i = 0; i < this.worldMotes.length; i++) {
                  const m = this.worldMotes[i];
                  const mx = (m.worldX - worldLeft) / scale;
                  const my = (m.worldY - worldTop) / scale;
                  if (mx < -8 || mx > W + 8 || my < -8 || my > H + 8) continue;
                  const u = clamp01(m.age / m.maxLife);
                  const fade = 1 - u;
                  if (m.kind === 'glint') {
                    const pulse = Math.sin(u * Math.PI);
                    pen.stipple(mx, my, PURE_WHITE, pulse);
                    pen.stipple(mx - 1, my, m.color, pulse * 0.85);
                    pen.stipple(mx + 1, my, m.color, pulse * 0.85);
                    pen.stipple(mx, my - 1, m.color, pulse * 0.85);
                    pen.stipple(mx, my + 1, m.color, pulse * 0.85);
                    pen.radialGlow(mx, my, 3.2, m.color, 0.28 * pulse);
                  } else {
                    const tx = mx - (m.vx * 0.022) / scale;
                    const ty = my - (m.vy * 0.022) / scale;
                    pen.line(tx, ty, mx, my, u < 0.25 ? PURE_WHITE : m.color, fade);
                    pen.radialGlow(mx, my, 3.2, m.color, 0.24 * fade);
                  }
                  drewAny = true;
                }
              }

              if (!drewAny) return;

              // Tight 32-bit bounding-box scan (skips interior pixels of non-empty rows!)
              let minX = W, minY = H, maxX = -1, maxY = -1;
              for (let y = 0; y < H; y++) {
                const rowOff = y * W;
                let rowFirst = -1;
                for (let x = 0; x < W; x++) {
                  if ((alb32[rowOff + x] | (emi32[rowOff + x] & 0xffffff)) !== 0) {
                    rowFirst = x;
                    break;
                  }
                }
                if (rowFirst < 0) continue;
                let rowLast = rowFirst;
                for (let x = W - 1; x > rowFirst; x--) {
                  if ((alb32[rowOff + x] | (emi32[rowOff + x] & 0xffffff)) !== 0) {
                    rowLast = x;
                    break;
                  }
                }
                if (y < minY) minY = y;
                maxY = y;
                if (rowFirst < minX) minX = rowFirst;
                if (rowLast > maxX) maxX = rowLast;
              }

              if (maxX < minX) return;
              surface._dirtyY0 = minY;
              surface._dirtyY1 = maxY;

              const bw = maxX - minX + 1;
              const bh = maxY - minY + 1;
              const dstX = worldLeft + minX * scale;
              const dstY = worldTop + minY * scale;
              const dstW = bw * scale;
              const dstH = bh * scale;
              const bloomLeft = (worldLeft - 4) + (minX / W) * (worldW + 8);
              const bloomTop = (worldTop - 4) + (minY / H) * (worldH + 8);
              const bloomW = (bw / W) * (worldW + 8);
              const bloomH = (bh / H) * (worldH + 8);

              // Simulator-only fast path when WebGL2 is backed by LLVMpipe (`Apple Software Renderer`),
              // avoiding full-canvas `glReadPixels` while keeping Hardware Metal WebGL2 on all real Apple GPUs!
              if (isSoftwareWebGL) {
                if (!this._simFastCanvases || this._simFastW !== W || this._simFastH !== H) {
                  const mk = () => {
                    const c = document.createElement('canvas');
                    c.width = W;
                    c.height = H;
                    const cx = c.getContext('2d', { willReadFrequently: true });
                    return { c, cx, id: cx.createImageData(W, H) };
                  };
                  this._simFastCanvases = { alb: mk(), emi: mk() };
                  this._simFastW = W;
                  this._simFastH = H;
                }
                const albBuf = this._simFastCanvases.alb;
                const emiBuf = this._simFastCanvases.emi;
                const outAlb = albBuf.id.data;
                const outEmi = emiBuf.id.data;

                for (let y = minY; y <= maxY; y++) {
                  const yEdge = y < H - 1 - y ? y : H - 1 - y;
                  const rowOff = y * W;
                  for (let x = minX; x <= maxX; x++) {
                    const i = rowOff + x;
                    const c = alb32[i];
                    const l = emi32[i] & 0xffffff;
                    const o = i << 2;
                    if (!c && !l) {
                      outAlb[o + 3] = 0;
                      outEmi[o + 3] = 0;
                      continue;
                    }
                    const xEdge = x < W - 1 - x ? x : W - 1 - x;
                    const d = yEdge < xEdge ? yEdge : xEdge;
                    let k = 1.0;
                    if (d < 16) {
                      const u = d <= 0 ? 0 : d * 0.0625;
                      k = u * u * (3 - 2 * u);
                    }
                    if (!c) {
                      outAlb[o + 3] = 0;
                    } else {
                      outAlb[o] = c & 255;
                      outAlb[o + 1] = (c >>> 8) & 255;
                      outAlb[o + 2] = (c >>> 16) & 255;
                      outAlb[o + 3] = ((c >>> 24) * k) | 0;
                    }
                    let lr = (l & 255) * 1.22;
                    let lg = ((l >>> 8) & 255) * 1.22;
                    let lb = ((l >>> 16) & 255) * 1.22;
                    if (c) {
                      const cr = c & 255, cg = (c >>> 8) & 255, cb = (c >>> 16) & 255;
                      const peak = cr > cg ? (cr > cb ? cr : cb) : (cg > cb ? cg : cb);
                      if (peak > 150) {
                        const boost = ((peak - 150) / 105) * 0.42 * ((c >>> 24) / 255);
                        lr += cr * boost; lg += cg * boost; lb += cb * boost;
                      }
                    }
                    const maxL = lr > lg ? (lr > lb ? lr : lb) : (lg > lb ? lg : lb);
                    if (maxL < 2) {
                      outEmi[o + 3] = 0;
                    } else {
                      const aEmi = maxL >= 255 ? 255 : Math.round(maxL);
                      const sc = (255 / (aEmi || 1)) * k;
                      outEmi[o] = Math.min(255, lr * sc) | 0;
                      outEmi[o + 1] = Math.min(255, lg * sc) | 0;
                      outEmi[o + 2] = Math.min(255, lb * sc) | 0;
                      outEmi[o + 3] = (aEmi * k) | 0;
                    }
                  }
                }

                albBuf.cx.putImageData(albBuf.id, 0, 0, minX, minY, bw, bh);
                emiBuf.cx.putImageData(emiBuf.id, 0, 0, minX, minY, bw, bh);

                const prevSmooth = ctx.imageSmoothingEnabled;
                const prevAlpha = ctx.globalAlpha;
                const prevComp = ctx.globalCompositeOperation;
                ctx.imageSmoothingEnabled = false;
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = prevAlpha * alpha * 0.48;
                ctx.drawImage(emiBuf.c, minX, minY, bw, bh, bloomLeft, bloomTop, bloomW, bloomH);
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = prevAlpha * alpha;
                ctx.drawImage(albBuf.c, minX, minY, bw, bh, dstX, dstY, dstW, dstH);
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = prevAlpha * alpha * 0.76;
                ctx.drawImage(emiBuf.c, minX, minY, bw, bh, dstX, dstY, dstW, dstH);
                ctx.globalCompositeOperation = prevComp;
                ctx.imageSmoothingEnabled = prevSmooth;
                ctx.globalAlpha = prevAlpha;
                return;
              }

              const byteStart = minY * W * 4;
              const byteEnd = (maxY + 1) * W * 4;
              const albSlice = new Uint8Array(alb32.buffer, byteStart, byteEnd - byteStart);
              const emiSlice = new Uint8Array(emi32.buffer, byteStart, byteEnd - byteStart);

              // Upload ONLY the active vertical slice (W x bh) to Apple Metal via ANGLE-WebGL2
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, albedoTex);
              gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, bh, gl.RGBA, gl.UNSIGNED_BYTE, albSlice);

              gl.activeTexture(gl.TEXTURE1);
              gl.bindTexture(gl.TEXTURE_2D, emissiveTex);
              gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, bh, gl.RGBA, gl.UNSIGNED_BYTE, emiSlice);

              // Render ONLY (bw x 2*bh) at top-left of glCanvas (canvasY 0..2*bh -> WebGL y = GL_H - 2*bh .. GL_H)
              const totalSlotH = bh * 2;
              const vpY = GL_H - totalSlotH;
              gl.viewport(0, vpY, bw, totalSlotH);
              gl.scissor(0, vpY, bw, totalSlotH);
              gl.uniform2i(uVpOrigin, 0, vpY);
              gl.uniform2i(uRectMin, minX, minY);
              gl.uniform2i(uRectSize, bw, bh);
              gl.uniform2i(uSurfSize, W, H);
              gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

              const prevSmooth = ctx.imageSmoothingEnabled;
              const prevAlpha = ctx.globalAlpha;
              const prevComp = ctx.globalCompositeOperation;
              ctx.imageSmoothingEnabled = false;

              // Sub-Pass 1: Tight-Rect Wide Additive Emissive Under-Bloom (`lighter`)
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = prevAlpha * alpha * 0.48;
              ctx.drawImage(glCanvas, 0, bh, bw, bh, bloomLeft, bloomTop, bloomW, bloomH);

              // Sub-Pass 2: Tight-Rect Crisp Stepped Pixel-Art Albedo (`source-over`)
              ctx.globalCompositeOperation = 'source-over';
              ctx.globalAlpha = prevAlpha * alpha;
              ctx.drawImage(glCanvas, 0, 0, bw, bh, dstX, dstY, dstW, dstH);

              // Sub-Pass 3: Tight-Rect Pixel-Aligned Specular Emissive Over-Bloom (`lighter`)
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = prevAlpha * alpha * 0.76;
              ctx.drawImage(glCanvas, 0, bh, bw, bh, dstX, dstY, dstW, dstH);

              ctx.globalCompositeOperation = prevComp;
              ctx.imageSmoothingEnabled = prevSmooth;
              ctx.globalAlpha = prevAlpha;
            };

            ArcaneShaderFX.prototype.__avsMetalGLInstalled = true;
            window.__AVS_METAL_WEBGL2_ACTIVE__ = true;
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
    func makeCoordinator() -> SanctumWebCoordinator {
        SanctumWebCoordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = context.coordinator.makeConfiguredWebView()
        context.coordinator.loadSanctumIfNeeded(in: webView)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
#elseif os(macOS)
private struct SanctumWebHostView: NSViewRepresentable {
    func makeCoordinator() -> SanctumWebCoordinator {
        SanctumWebCoordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let webView = context.coordinator.makeConfiguredWebView()
        context.coordinator.loadSanctumIfNeeded(in: webView)
        DispatchQueue.main.async {
            webView.window?.makeFirstResponder(webView)
        }
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}
}
#endif

public struct SanctumWebStageView: View {
    @ObservedObject private var metal = SanctumMetalPipeline.shared

    public init() {}

    public var body: some View {
        ZStack {
            if !metal.isStageOpaqueReady {
                SanctumMetalBackdropView()
                    .ignoresSafeArea()
            }
            SanctumWebHostView()
                .ignoresSafeArea()
        }
        .background(Color(red: 5.0 / 255.0, green: 7.0 / 255.0, blue: 12.0 / 255.0))
    }
}
