# Arcane vs. Steel — Native Swift + Metal iOS & macOS App (`apple/`)

This directory contains the isolated **Xcode / Swift + Metal + CryptoKit (iOS + macOS)** native multiplatform target for *Arcane vs. Steel*, coexisting alongside the untouched root **Web / Vercel** version (`index.html`, `style.css`, `src/`, `vercel.json`).

## Core Architecture & AES-256-GCM Encrypted Sanctum Vault (`sanctum.pak`)
- **Zero Raw Code or Assets in `ArcaneVsSteel.app` / `.ipa`**:
  - `ResourcesBuildPhase` includes ONLY `Assets.xcassets` (`AppIcon`) — **zero** raw `.js`, `.html`, `.css`, `.png`, `.wav`, or `.ttf` game files are ever copied into `ArcaneVsSteel.app`!
  - During Xcode's `Pack Encrypted Sanctum Vault` build phase (`apple/pack_sanctum_vault.py`), every file in `../index.html`, `../style.css`, `../manifest.json`, `../src/**`, and `../assets/**` (`184` lossless game files) is individually sealed with **AES-256-GCM** (`12-byte CSPRNG nonce` + `ciphertext` + `16-byte GCM tag`) along with an AES-256-GCM encrypted Directory Table (`Magic: "AVSK\x01"`) into `${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/sanctum.pak` (with `< 10ms` incremental mtime skip when up-to-date).
- **Hardware `CryptoKit` In-Memory Decryption + Per-Launch Token Gate (`Core/LocalSanctumServer.swift`)**:
  - Reconstructs the 256-bit `SymmetricKey` at runtime by XOR-combining two non-ASCII `32-byte` `[UInt8]` constant shards (`0` plaintext keys and `0` asset filenames in `strings ArcaneVsSteel`), memory-maps `sanctum.pak` (`options: .mappedIfSafe`, `~0 MB` dirty RSS), and decrypts slices on demand in RAM via Apple Silicon hardware `CryptoKit` (`AES.GCM.open`) into a bounded `64 MB` (`<= 8 MB`/entry) `NSCache`.
  - Generates a fresh cryptographic session prefix (`/v_<randomHex32>`) via `SecRandomCopyBytes` on every launch, returning **`403 Forbidden`** immediately to any local loopback request lacking the active launch token, and sets `webView.isInspectable = false` in `#if !DEBUG` Release builds.
- **100% Untouched Original Design & Mechanics**:
  - **Versus Mode (`1v1 Sovereign Duel` + `Tag VS`)** runs the exact **autonomous AI-vs-AI HD-2D auto-battler** (with `Test Sandbox: Unlimited HP`, `Auto-Tourney Gauntlet`, `Tag Swap`, `Supreme Ult`, `Slow-Mo`, `1920x1080` `3x` seamless upper vault, and intact lower-floor reflections).
  - **Adventure Mode** runs the exact `9600px` 4-Realm Action-RPG pilgrimage with bottom-left 2.5D virtual analog joystick, bottom-right 5-orb radial clock-sweep skill cluster + `AUTO` & `LOCK` toggles, 3-branch RPG Skill Tree, Mini-Boss Wardens, and `11,800 HP` Colossal Boss `BEHEMOTH MALPHAS` (`ABYSSAL SIEGE GRAB` & automatic unavoidable `HELLPIT SOUL-TITHE`).

## Native iOS & macOS Metal + GPU Pipeline (`60 FPS` / ProMotion Ready)
- **`Metal/SanctumShaders.metal` & `Metal/SanctumMetalPipeline.swift`**:
  - Compiled Apple Metal shader library (`default.metallib`) driving an `MTKView` / `CAMetalLayer` substrate with strict Nearest-Neighbor sampling (`MTLSamplerMinMagFilter.nearest`, `magnificationFilter = .nearest`, `sampleCount = 1`).
  - Renders an instant `< 0.1ms` stepped obsidian-crypt boot frame and automatically suspends background redraws (`markGameStageOpaqueReady()`) once `#arena-canvas` presents Frame 1 so 100% of GPU bandwidth serves live combat.
- **1x Pixel-Pure Arena Resolution + Thermal-Optimal Dirty-Rect Compositor (`UI/SanctumWebStageView.swift`)**:
  - Locks `#arena-canvas` to crisp `1x` pixel-art resolution (`4x–6.25x` lower fragment fill-rate) upscaled via hardware Metal Nearest-Neighbor while keeping all HTML/CSS HUD fonts (`ArcanePixel`) Retina-sharp.
- **`Core/NativePlatformBridge.swift`**:
  - Pre-warmed `UIImpactFeedbackGenerator` tactile haptics, off-main-thread `audioSessionQueue` `10ms` `AVAudioSession` (`0` main-thread CoreAudio hangs, full iOS lock/sleep `'interrupted'` & `mediaServicesWereReset` WebAudio recovery), full `scenePhase` / `NSApplication` lifecycle thermal suspension, and event-driven `GCController` gamepad polling (`0%` CPU when no controller is connected).
- **Zero Impact on Web/Vercel**: `apple/` is excluded in `.vercelignore`, and root Web files (`index.html`, `style.css`, `src/`, `assets/`, `vercel.json`) have **zero modifications**.

## Building & Running Locally (`Release` Recommended for Full `-O` + Metal + Vault Speed)

### Regenerate Xcode Project (Deterministic)
```bash
python3 apple/generate_xcodeproj.py
```

### Open in Xcode
```bash
open apple/ArcaneVsSteel.xcodeproj
```
Select the **`ArcaneVsSteel`** scheme (configured to launch in **`Release`** mode by default) and choose **My Mac** or any **iPhone / iPad** destination.

### Command-Line Builds (`xcodebuild`)
```bash
# 1. Build Optimized Signed Release for Physical iOS Devices (`iphoneos`)
xcodebuild -project apple/ArcaneVsSteel.xcodeproj \
  -scheme ArcaneVsSteel \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath apple/build \
  build

# 2. Build Optimized Release for iOS Simulator (`iphonesimulator`)
xcodebuild -project apple/ArcaneVsSteel.xcodeproj \
  -scheme ArcaneVsSteel \
  -configuration Release \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath apple/build \
  build

# 3. Build Optimized Release for Native macOS (`macosx`)
xcodebuild -project apple/ArcaneVsSteel.xcodeproj \
  -scheme ArcaneVsSteel \
  -configuration Release \
  -destination 'platform=macOS' \
  -derivedDataPath apple/build \
  build
```
