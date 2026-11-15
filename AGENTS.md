# Arcane vs Steel — Workspace Agent Rules (Web & Native Swift iOS/macOS)

1. **Always Read Project Memory First**:
   - At the start of every session, read `docs/PROJECT_MEMORY_HANDOFF.md` and `docs/IMPLEMENTATION_LOG.md` (plus `.agents/skills/arcane-vs-steel-pipeline/SKILL.md` via `lookup_skill` when working on champions, stages, Adventure Mode, UI, or porting to Swift/Xcode).
   - Update `docs/IMPLEMENTATION_LOG.md` and `docs/PROJECT_MEMORY_HANDOFF.md` immediately upon completing each milestone.

2. **Core Art & Gameplay Invariants (Shared Across Web & Swift iOS/macOS)**:
   - **100% Lossless Pixel Purity**: Never lossily compress PNG sprite sheets or use bilinear filtering (`imageSmoothingEnabled = false` on Canvas; `.nearest` filtering in SpriteKit / Metal / SwiftUI).
   - **Zero Emojis**: Never use Unicode emojis or dingbats anywhere in UI or combat callouts — always use `assets/sprites/avs_brand_logo.png`, `mage_icons.png`, `hero_icons_sheet.png`, and crisp pixel-art icons.
   - **Strict Mode Separation**: Keep **Versus Mode** (`1v1` + `Tag VS`, enlarged `3x` `1920x1080` stage with seamless upper vault & intact lower floor/character reflections) strictly separated from **Adventure Mode** (`9600px` 4-Realm pilgrimage, `11,800 HP` `BEHEMOTH MALPHAS` with `ABYSSAL SIEGE GRAB` & automatic unavoidable `HELLPIT SOUL-TITHE`) from the Title Screen.
   - **Protected Champions**: Never alter the 6 protected champions' sprite sheets or VS combat kits (`Ignis Sol`, `Aethelgard`, `Freyja`, `Seraphina`, `Kaze-Maru`, `Chronos`) unless explicitly asked by the user.

3. **Local macOS & Xcode Integration**:
   - When running locally on macOS for the Swift iOS/macOS version, use `xcodebuild` and `xcrun simctl` directly to build, verify, and launch iOS Simulator / native macOS targets, and use `open <Project>.xcodeproj` when opening in `Xcode.app`.
