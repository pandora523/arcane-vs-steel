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

4. **Mandatory Pre-Change Fallback Backup (`fallback_backups/`)**:
   - Before modifying project code/assets in any task, always run `bash scripts/create_fallback_backup.sh <label>` so a clean fallback snapshot (`RESTORE_THIS_BACKUP.sh` + `SHA256SUMS.txt`) is saved in `fallback_backups/`.

5. **Verification & Character Balance Policy (Never Run Balance Benchmarks Unasked)**:
   - Routine pre-push Web verification runs ONLY the fast suites: `node scripts/tests/check_all_ult_shader_boxes.mjs` and `node scripts/tests/test_all_heroes_gameloop.mjs`.
   - **NEVER run `scripts/tests/benchmark_roster_balance.mjs` or adjust character combat balance during normal UI, engine, stage, Adventure, audio, or platform tasks — ONLY run `benchmark_roster_balance.mjs` when the user explicitly asks to test or change character balance!**

6. **Fast Swarm Integration Policy (Zero Post-Worker Handoff Delay)**:
   - When using `/swarm`, spawn parallel workers with `workspace: "share"` (fast git worktree, avoiding full-clone overhead) and strictly non-overlapping file ownership (never split a binary `.png` sheet across two workers; group co-dependent edits to the same file into one worker; apply repo-wide glue such as `?v=30fps...` cache-bust bumps and combined test blocks once on `main` after merging).
   - Never spawn extra sequential post-worker `integrator` or `verifier` sub-agents after parallel workers complete — the coordinator merges finished worker branches directly onto `main`, runs the fast verification suites (`check_all_ult_shader_boxes.mjs` and `test_all_heroes_gameloop.mjs`) directly, and pushes without handoff delays.
