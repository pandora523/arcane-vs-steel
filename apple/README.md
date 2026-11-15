# Arcane vs. Steel — Native Swift + Metal iOS & macOS App (`apple/`)

This directory contains the isolated **Xcode / Swift + Metal (iOS + macOS)** native multiplatform target for *Arcane vs. Steel*, coexisting alongside the untouched root **Web / Vercel** version (`index.html`, `style.css`, `src/`, `vercel.json`).

## Core Architecture & 1:1 Design / Mechanics Parity
- **100% Untouched Original Design & Mechanics**:
  - Bundles the exact, unmodified root game runtime (`../index.html`, `../style.css`, `../manifest.json`, `../src/`, `../assets/`) as read-only Xcode bundle references (`COMPRESS_PNG_FILES = NO`, `STRIP_PNG_TEXT = NO`) served in-process over a RAM-cached loopback HTTP/1.1 server (`LocalSanctumServer.swift` bound strictly to `127.0.0.1`).
  - **Versus Mode (`1v1 Sovereign Duel` + `Tag VS`)** runs the exact **autonomous AI-vs-AI HD-2D auto-battler** (with `Test Sandbox: Unlimited HP`, `Auto-Tourney Gauntlet`, `Tag Swap`, `Supreme Ult`, `Slow-Mo`, `1920x1080` `3x` seamless upper vault, and intact lower-floor reflections).
  - **Adventure Mode** runs the exact `9600px` 4-Realm Action-RPG pilgrimage with bottom-left 2.5D virtual analog joystick, bottom-right 5-orb radial clock-sweep skill cluster + `AUTO` toggle, 3-branch RPG Skill Tree, Mini-Boss Wardens, and `11,800 HP` Colossal Boss `BEHEMOTH MALPHAS` (`ABYSSAL SIEGE GRAB` & automatic unavoidable `HELLPIT SOUL-TITHE`).

## Native iOS & macOS Metal + GPU Pipeline (`60 FPS` / ProMotion Ready)
- **`Metal/SanctumShaders.metal` & `Metal/SanctumMetalPipeline.swift`**:
  - Compiled Apple Metal shader library (`default.metallib`) driving an `MTKView` / `CAMetalLayer` substrate with strict Nearest-Neighbor sampling (`MTLSamplerMinMagFilter.nearest`, `magnificationFilter = .nearest`, `sampleCount = 1`).
  - Renders an instant `< 0.1ms` stepped obsidian-crypt boot frame and automatically suspends background redraws (`markGameStageOpaqueReady()`) once `#arena-canvas` presents Frame 1 so 100% of GPU bandwidth serves live combat.
- **WebGL2-on-Metal (`ANGLE Metal`) `ArcaneShaderFX` GPU Compositor (`UI/SanctumWebStageView.swift`)**:
  - Compiles an ES 3.00 fragment shader directly to Apple Metal (`MTLRenderPipelineState`) via WebKit's `webgl2` (`high-performance`) backend, executing `ArcaneShaderFX` dual-buffer (`albedo` + `emissive` HDR split & `16px` smoothstep border feather) across an 8-slot `2560x1680` GPU atlas with **zero** `putImageData` cross-process IPC stalls and **zero** `268,800`-pixel CPU resolve loops.
- **1x Pixel-Pure Arena Resolution + GPU `IOSurface` Sprite Atlas LRU**:
  - Locks `#arena-canvas` to crisp `1x` pixel-art resolution (`4x–6.25x` lower fragment fill-rate) upscaled via hardware Metal Nearest-Neighbor while keeping all HTML/CSS HUD fonts (`ArcanePixel`) Retina-sharp.
  - Promotes `6240x2080` champion/VFX sprite sheets and `9600px` Adventure panoramas once into a 14-slot GPU `IOSurface` canvas LRU cache (`~84–140 MB` peak VRAM, flushing immediately on `resetMatch()` / `goToTitleScreen()`), eliminating CPU PNG re-decoding mid-combat.
- **`Core/LocalSanctumServer.swift` & `Core/NativePlatformBridge.swift`**:
  - 64 MB `NSCache` RAM asset cache (`<= 8 MB` per entry) + persistent `HTTP/1.1 keep-alive` sockets + immutable cache headers + full `scenePhase` / `NSApplication` lifecycle thermal suspension.
  - Pre-warmed `UIImpactFeedbackGenerator` tactile haptics, off-main-thread `audioSessionQueue` `10ms` `AVAudioSession` (`0` main-thread CoreAudio hangs, full iOS lock/sleep `'interrupted'` & `mediaServicesWereReset` WebAudio recovery), ProMotion `CADisableMinimumFrameDurationOnPhone = true`, and event-driven `GCController` gamepad polling (0% CPU when no controller is connected).
- **Zero Impact on Web/Vercel**: `apple/` is excluded in `.vercelignore`, and root Web files (`index.html`, `style.css`, `src/`, `assets/`, `vercel.json`) have **zero modifications**.

## Building & Running Locally (`Release` Recommended for Full `-O` + Metal Speed)

### Open in Xcode
```bash
open apple/ArcaneVsSteel.xcodeproj
```
Select the **`ArcaneVsSteel`** scheme (configured to launch in **`Release`** mode by default) and choose **My Mac** or any **iPhone / iPad** destination.

### Command-Line Builds (`xcodebuild`)
```bash
# Build Optimized Release for iOS Simulator
xcodebuild -project apple/ArcaneVsSteel.xcodeproj \
  -scheme ArcaneVsSteel \
  -configuration Release \
  -sdk iphonesimulator \
  -derivedDataPath apple/build \
  build

# Build Optimized Release for Native macOS
xcodebuild -project apple/ArcaneVsSteel.xcodeproj \
  -scheme ArcaneVsSteel \
  -configuration Release \
  -destination 'platform=macOS' \
  -derivedDataPath apple/build \
  build
```
