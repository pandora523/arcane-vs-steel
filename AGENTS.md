# Arcane vs Steel — Workspace Agent Rules (Web & Native Swift iOS/macOS)

1. **Always Read Project Memory First (`<= 32 KB` Rolling Cap)**:
   - At the start of every session, read `docs/PROJECT_MEMORY_HANDOFF.md` and `docs/IMPLEMENTATION_LOG.md` (plus `.agents/skills/arcane-vs-steel-pipeline/SKILL.md` via `lookup_skill` when working on champions, stages, Adventure Mode, UI, or porting to Swift/Xcode).
   - Keep both active memory files compact (`<= 32 KB` each, holding only current baseline/invariants + latest 5 batches). When updating them after a milestone, rotate entries older than the latest 5 batches into `docs/archive/`, and **do NOT read `docs/archive/*`** unless investigating an older historical regression.

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
   - Use fast inner-loop checks while iterating (`node scripts/tests/test_all_heroes_gameloop.mjs --suite36 --quiet` or `--fast --quiet`), and run `node scripts/tests/check_docs_hygiene.mjs` (`< 50ms`) after markdown/doc edits instead of re-running gameplay suites.
   - Routine pre-push Web verification MUST run **`node scripts/verify_prepush.mjs --fast`** (or `node scripts/verify_prepush.mjs` when shared combat/Legacy hooks changed) **once** right before commit/push — it executes Legacy/Apple git purity, `check_docs_hygiene.mjs`, `check_all_ult_shader_boxes.mjs`, and SHA-256-cached `test_all_heroes_gameloop.mjs --quiet` with a 60s watchdog in one single command.
   - **NEVER run `scripts/tests/benchmark_roster_balance.mjs` or adjust character combat balance during normal UI, engine, stage, Adventure, audio, or platform tasks — ONLY run `benchmark_roster_balance.mjs` when the user explicitly asks to test or change character balance!**

6. **Fast Swarm Integration Policy (Zero Post-Worker Handoff Delay)**:
   - When using `/swarm`, spawn parallel workers with `workspace: "share"` (fast git worktree, avoiding full-clone overhead) and strictly non-overlapping file ownership (never split a binary `.png` sheet across two workers; group co-dependent edits to the same file into one worker; apply repo-wide glue such as `?v=30fps...` cache-bust bumps and combined test blocks once on `main` after merging).
   - Never spawn extra sequential post-worker `integrator` or `verifier` sub-agents after parallel workers complete — the coordinator merges finished worker branches directly onto `main`, runs `node scripts/verify_prepush.mjs --fast` directly, and pushes without handoff delays.

7. **Token-Efficient Workflow Policy (Zero-Bug Gate Preservation)**:
   - Use **`node scripts/ship_prep.mjs --bump next --rotate-docs --prune-backups`** in one command to bump `?v=30fpsXX` across all 28 runtime/test files, auto-rotate batches older than the latest 5 into `docs/archive/`, and prune old `fallback_backups/` snapshots instead of spending 8+ manual tool calls editing version strings and archive docs.
   - Do NOT append 150-300 line `Suite 36.XX` blocks or write custom Chrome scripts in `scratch/` on routine UI, audio, or tuning batches — only add compact unit assertions when introducing a new engine invariant. Reserve manual `node build/build_web_vault.mjs` + Headless Chrome screenshots strictly for Vault/loader or major layout changes (Vercel builds `dist/` automatically on `git push`).

8. **Mandatory New-Champion & EX Sprite Pipeline (Auto-Applied Without User Prompting)**:
   - Whenever asked to create or rework a champion, sprite sheet, or VFX sheet, immediately read `.agents/skills/arcane-vs-steel-pipeline/SKILL.md` and resolve any unspecified design choices upfront (theme/weapon/palette, Melee vs Ranged role, EX vs Legacy+EX, and 4-Auto/Skill/Ult/True-Ult choreography) **before** generating 300-cell PNG sheets so art builds once without costly rebuilds.
   - Every EX sprite/VFX build MUST automatically apply `scripts/ex_sprite_clean_utils.py` (`clean_512_pose_holes_and_specks` + `seal_160_char_pinholes_and_leaks`), pixel-by-pixel sculpted hands/vambraces (`0` circle/oval hand blobs), `>= 4px` inner cell margins (`0` border clips), grounded `Row 5 DEATH` + `setState` landing ground-snap, and pure-ranged `Row 2/3` target VFX separation (`maxX <= 262` on `*_ex_sheet.png`, spawning target VFX from `*_ex_vfx.png` on `enemy.x`).
