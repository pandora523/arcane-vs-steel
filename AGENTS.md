# Arcane vs Steel — Workspace Agent Rules (Web & Native Swift iOS/macOS)

1. **Always Read Project Memory First**:
   - At the start of every session, read `docs/PROJECT_MEMORY_HANDOFF.md` and `docs/IMPLEMENTATION_LOG.md` (plus `.agents/skills/arcane-vs-steel-pipeline/SKILL.md` via `lookup_skill` when working on champions, stages, Adventure Mode, UI, or porting to Swift/Xcode).
   - Update `docs/IMPLEMENTATION_LOG.md` and `docs/PROJECT_MEMORY_HANDOFF.md` immediately upon completing each milestone.

2. **Core Art & Gameplay Invariants (Shared Across Web & Swift iOS/macOS)**:
   - **100% Lossless Pixel Purity**: Never lossily compress PNG sprite sheets or use bilinear filtering (`imageSmoothingEnabled = false` on Canvas; `.nearest` filtering in SpriteKit / Metal / SwiftUI).
   - **Zero Emojis**: Never use Unicode emojis or dingbats anywhere in UI or combat callouts — always use `assets/sprites/avs_brand_logo.png`, `mage_icons.png`, `hero_icons_sheet.png`, and crisp pixel-art icons.
   - **Strict Mode Separation**: Keep **Versus Mode** (`1v1` + `Tag VS`, enlarged `3x` `1920x1080` stage with seamless upper vault & intact lower floor/character reflections) strictly separated from **Adventure Mode** (`9600px` 4-Realm pilgrimage, `11,800 HP` `BEHEMOTH MALPHAS` with `ABYSSAL SIEGE GRAB` & automatic unavoidable `HELLPIT SOUL-TITHE`) from the Title Screen.
   - **Protected Champions**: Never alter the 6 protected champions' sprite sheets or VS combat kits (`Ignis Sol`, `Aethelgard`, `Freyja`, `Seraphina`, `Kaze-Maru`, `Chronos`) unless explicitly asked by the user.

3. **Dual-Platform Coexistence (Web/Vercel + Native Swift iOS/macOS — Never Abandon Web!)**:
   - Both the **Web version** (root `index.html`, `style.css`, `src/`, `vercel.json` auto-deployed to Vercel on `git push origin main`) and the **Native Swift iOS/macOS version** are active first-class targets.
   - Keep all Xcode / Swift files cleanly isolated inside a dedicated subfolder (e.g. `apple/`) or sibling folder so root Web/Vercel builds and URLs stay 100% untouched and fast.
   - When running locally on macOS, you can develop & push Web updates to Vercel AND build/launch iOS Simulator & macOS targets via `xcodebuild`, `xcrun simctl`, and `open apple/<Project>.xcodeproj`.
