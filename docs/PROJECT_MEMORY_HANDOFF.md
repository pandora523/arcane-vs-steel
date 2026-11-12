# Arcane vs Steel — Project Memory & Session Handoff

> **IMPORTANT FOR ANY NEW CHAT / AGENT**: Read this file alongside `docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md` and `docs/champion_pipeline_db.json` at the start of a new conversation so full project context, user preferences, protected champions, and recent reworks are preserved seamlessly.

## 1. Current Live Baseline (`main`, Cache-Bust `?v=30fps71`)
- **All 11 HD-2D 30fps Champions (`208x208` cells, 9 rows x 30 frames + `vfx` sheets + `128x128` portraits)** are live and verified on `main`.
- **Epic Battle HP Inflation & Ultimate Pacing**:
  - Champion HP pools are inflated (`3600–4390 HP`) so fights last ~`50–80s` in 1v1 (`~58s` in 2v2 Brawl, `~120s` in 2v2 Tag) and champions reliably cast **3 Overdrives (`ULTIMATE`)** to unlock and cast their **Supreme Ultimate (`TRUE_ULTIMATE`)** (`99.8%` `TRUE_ULTIMATE` rate in 1v1 benchmarks).
  - Test Mode (`testModeUnlimitedHp`) supports infinite HP & rapid testing of Overdrives and Supreme Ultimates.

---

## 2. User-Confirmed Protected Champions (DO NOT ALTER UNLESS EXPLICITLY ASKED)
The user explicitly confirmed that the following **6 champions are doing fine** — **do NOT modify their particles, VFX, animations, kits, or stats** unless the user specifically asks for a change to one of them (only global `?v=30fpsXX` cache-bust query bumps are allowed):
1. **Ignis Sol** (`src/entities/FireMage.js`, `heroId: 'mage'`) — switches stage to `LAYWASTE OF INFERNO` strictly on meteor ground impact (`t >= 3.22s`).
2. **Aethelgard** (`src/entities/Warrior.js`, `heroId: 'warrior'`) — `v4` 2H Greatsword rig + High-Sky Sacred Vow & Cathedral Pillar Supreme Ultimate.
3. **Freyja** (`src/entities/Valkyrie.js`, `heroId: 'valkyrie'`) — articulated multi-angle spear dives (`make_spear_dive_cfg`, zero canvas rotation/shear) + `TWILIGHT OF RAGNAROK: GUNGNIR`.
4. **Seraphina** (`src/entities/Priestess.js`, `heroId: 'priestess'`) — grounded Auto/Skill rig (Wing Vault `86px` preserved) + `FINAL GRACE` (`+30%` max HP heal + instant `740`-dmg holy beam at `t = 3.03s`).
5. **Kaze-Maru / Ronin** (`src/entities/Ronin.js`, `heroId: 'ronin'`) — `AMAKAKERU: THOUSAND THUNDER JUDGMENTS`.
6. **Chronos** (`src/entities/Chronomancer.js`, `heroId: 'chronomancer'`) — Twin Clock-Blade/Clone combo, Chrono-Schism Rewind, Mid-Air Time-Stop + `ETERNAL ZERO` Twelfth Bell Shatter (`680` dmg at `t = 3.53s`).

---

## 3. Recent Champion Reworks & Visual Clarity Rules

### Torgar (`src/entities/Titan.js`, `heroId: 'titan'`, v6)
- **4-Variant Dynamic Normal Attack (`Row 2 F00..F29`)**: Cycles cleanly through 4 distinct hammer techniques so normal attacks never look repetitive:
  1. `F00..F07`: Magnetic Fissure Sweep (`stage 0`, `spawnFissureWave`)
  2. `F08..F14`: Volcanic-Horn Uppercut (`stage 1`, `Row 2` magma pillar)
  3. `F15..F21`: Battering-Ram Thrust (`stage 2`)
  4. `F22..F29`: Overhead World-Breaker Slam (`stage 3` finisher + Khazad Ancestor)
- **Overdrive Ultimate (`WORLD-BREAKER HOME RUN`)**: Torgar steps into a 2H baseball-bat windup and swings horizontally, launching the enemy across the arena to the **farthest side of the stage** with a wall-crash impact and **`0.8s` stun**.
- **Supreme Ultimate (`GOD-HAMMER MJOLNIR: CONTINENTAL SUNDER`)**: High-impact orbital leap & `735`-crit tectonic sunder at `t = 3.23s`.

### Malakor (`src/entities/Reaper.js`, `heroId: 'reaper'`, v6)
- **Shadow-Burrow Ambush (`CROUCH`)**: Malakor sinks completely underground for ~`1.27s` (`1–2s` window) leaving a dark abyssal ground indicator vortex (`abyssalRiftGroundPortal` + dark tell ring) before erupting upward in a surprise scythe ambush.
- **High-Impact Overdrive (`ULTIMATE`)**: Sky-Lock ambush combo + `Thanatos Stand` & `4` Wraith Clones.
- **Supreme Ultimate (`MEMENTO MORI: OBLIVION GUILLOTINE` + Death Covenant Companions)**:
  - Delivers the `720`-crit Oblivion Guillotine execution and summons **two targetable Death Companions** (`assets/sprites/reaper_companions.png`) for **`12.5s`** with fortified survivability:
    1. **Herald of Oblivion (Death-Mage)**: `480 HP + 60 Soul Ward`, casts homing dark-magic orbs at enemies.
    2. **Soul-Weaver (Healer)**: `420 HP + 50 Soul Ward`, channels an emerald-necrotic mend tether healing the Death-Mage (and granting Covenant Grace sustain to Malakor).

### Combat Particle & VFX Readability (`?v=30fps71`)
- Avoid excessive particle spam, per-frame walk/idle dust, or stacked high-alpha `globalCompositeOperation = 'lighter'` passes (`keep additive bloom <= 0.16–0.22`) so pixel-art silhouettes and combat telegraphs remain sharp.
- `Fighter.js` and `VFXManager.js` include `isDeclutteredHero` (`titan`, `reaper`, `archer`, `icemage`, `android`) gates so those 5 heroes stay visually clean while leaving the 6 protected heroes 100% untouched.

---

## 4. Automated Verification Suites (`scripts/tests/`)
Always run all 3 suites from `/home/antigravity/pandora523/arcane-vs-steel` before committing gameplay or VFX changes:
```bash
node scripts/tests/check_all_ult_shader_boxes.mjs
node scripts/tests/test_all_heroes_gameloop.mjs
node scripts/tests/benchmark_roster_balance.mjs
```
And whenever modifying `.js` / `.png` / `.css` / `index.html` assets, bump the cache-bust query string (`?v=30fps71` -> `?v=30fps72`, etc.) across `index.html`, `src/`, and `scripts/`.

## 5. Persistent Prior Session Reference
- Full prior session debug renders and logs are stored in the persistent `~/.gemini` volume at:
  `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088/`
