#!/usr/bin/env node
/**
 * Arcane vs Steel — Single-Turn Pre-Push Verification Runner (`scripts/verify_prepush.mjs`)
 *
 * Replaces 5 separate LLM tool calls with 1 fast deterministic gate:
 *   1. Protected Legacy (`8435209`) & `apple/**` git-diff purity check
 *   2. `node scripts/tests/check_docs_hygiene.mjs`
 *   3. `node scripts/tests/check_all_ult_shader_boxes.mjs`
 *   4. `node scripts/tests/test_all_heroes_gameloop.mjs --quiet` (pass `--fast` for smart git-aware mode, `--full` to bypass SHA-256 PNG/pak cache)
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const args = process.argv.slice(2);
const allowApple = args.includes('--allow-apple');
const forwardFlags = args.filter((a) => a === '--fast' || a === '--full' || a === '--suite36' || a === '--ex-only');

const tStart = Date.now();

function runStep(label, cmd, cmdArgs, timeoutMs = 65000) {
  const t0 = Date.now();
  execFileSync(cmd, cmdArgs, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    timeout: timeoutMs
  });
  console.log(`[OK] ${label} (${Date.now() - t0}ms)`);
}

// 1. Git purity gate (11 Legacy entities/shaders vs 8435209 + apple/ untouched unless --allow-apple)
const legacyFiles = [
  'src/entities/Warrior.js',
  'src/entities/FireMage.js',
  'src/entities/Valkyrie.js',
  'src/entities/Priestess.js',
  'src/entities/Ronin.js',
  'src/entities/Chronomancer.js',
  'src/entities/Titan.js',
  'src/entities/Archer.js',
  'src/entities/Android.js',
  'src/entities/Reaper.js',
  'src/entities/IceMage.js',
  'src/engine/shaders/warriorShaders.js',
  'src/engine/shaders/fireShaders.js',
  'src/engine/shaders/valkyrieShaders.js',
  'src/engine/shaders/priestessShaders.js',
  'src/engine/shaders/stormShaders.js',
  'src/engine/shaders/chronoShaders.js',
  'src/engine/shaders/titanShaders.js',
  'src/engine/shaders/archerShaders.js',
  'src/engine/shaders/cyberShaders.js',
  'src/engine/shaders/abyssalShaders.js',
  'src/engine/shaders/iceShaders.js'
];

const legDiff = execFileSync('git', ['diff', '--name-only', '8435209', '--', ...legacyFiles], {
  cwd: REPO_ROOT,
  encoding: 'utf8'
}).trim();
if (legDiff) {
  throw new Error(`[verify_prepush] Forbidden diff vs 8435209 on Legacy files:\n${legDiff}`);
}

if (!allowApple) {
  const appleDiff = execFileSync('git', ['status', '--porcelain', '--', 'apple'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  }).trim();
  if (appleDiff) {
    throw new Error(`[verify_prepush] Unexpected changes in apple/ (pass --allow-apple if intentional):\n${appleDiff}`);
  }
}
console.log('[OK] Git purity verified (0 Legacy diff vs 8435209, apple/ clean)');

// 2. Docs & SHA-256 hygiene
runStep('check_docs_hygiene', process.execPath, [path.join(REPO_ROOT, 'scripts/tests/check_docs_hygiene.mjs')], 10000);

// 3. All-23 Ultimate shader boxes & viewport border audit
runStep(
  'check_all_ult_shader_boxes',
  process.execPath,
  [path.join(REPO_ROOT, 'scripts/tests/check_all_ult_shader_boxes.mjs'), ...(args.includes('--full') ? ['--full'] : [])],
  95000
);

// 4. Gameloop suite (60s internal + 70s external watchdog)
runStep(
  `test_all_heroes_gameloop (--quiet ${forwardFlags.join(' ')})`.trim(),
  process.execPath,
  [path.join(REPO_ROOT, 'scripts/tests/test_all_heroes_gameloop.mjs'), '--quiet', ...forwardFlags],
  70000
);

console.log(`[PASS] verify_prepush: All gates passed in ${((Date.now() - tStart) / 1000).toFixed(2)}s!`);
