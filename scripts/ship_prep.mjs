#!/usr/bin/env node
/**
 * Arcane vs Steel — Token-Saving Release Prep Utility (`scripts/ship_prep.mjs`)
 *
 * Usage:
 *   node scripts/ship_prep.mjs --bump next               # Auto-bumps latest v=30fpsXX -> v=30fps(XX+1) across runtime/test files
 *   node scripts/ship_prep.mjs --bump 30fps148           # Bumps current live v=30fpsXX -> v=30fps148
 *   node scripts/ship_prep.mjs --rotate-docs             # Auto-rotates batches > 5 from active memory docs into docs/archive/
 *   node scripts/ship_prep.mjs --prune-backups           # Keeps latest 6 rolling snapshots + pinned milestone baselines
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');

function walkFiles(dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, pred, out);
    else if (pred(ent.name, full)) out.push(full);
  }
  return out;
}

function detectCurrentMaxVersion() {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  let maxNum = 0;
  for (const m of html.matchAll(/\bv=30fps(\d+)\b/g)) {
    const n = Number.parseInt(m[1], 10);
    if (n > maxNum) maxNum = n;
  }
  if (!maxNum) throw new Error('[ship_prep] Could not detect current v=30fpsXX in index.html');
  return maxNum;
}

function bumpCacheBust(targetArg) {
  const curNum = detectCurrentMaxVersion();
  const curTag = `30fps${curNum}`;
  let nextTag = targetArg === 'next' ? `30fps${curNum + 1}` : String(targetArg).replace(/^\?v=/, '').replace(/^v=/, '');
  if (!/^30fps\d+$/.test(nextTag)) {
    throw new Error(`[ship_prep] Invalid --bump target '${targetArg}' (expected 'next' or '30fpsNNN')`);
  }
  if (nextTag === curTag) {
    console.log(`[ship_prep] Cache-bust already at v=${curTag} (0 files changed).`);
    return;
  }

  const targets = [
    path.join(REPO_ROOT, 'index.html'),
    path.join(REPO_ROOT, 'manifest.json'),
    path.join(REPO_ROOT, 'style.css'),
    ...walkFiles(path.join(REPO_ROOT, 'src'), (n) => n.endsWith('.js')),
    ...walkFiles(path.join(REPO_ROOT, 'scripts/tests'), (n) => n.endsWith('.mjs'))
  ].filter((p) => fs.existsSync(p));

  const re = new RegExp(`v=${curTag}\\b`, 'g');
  let updatedCount = 0;
  for (const fp of targets) {
    const src = fs.readFileSync(fp, 'utf8');
    if (!re.test(src)) continue;
    re.lastIndex = 0;
    const next = src.replace(re, `v=${nextTag}`);
    if (next !== src) {
      fs.writeFileSync(fp, next, 'utf8');
      updatedCount++;
    }
  }
  console.log(`[OK] Bumped v=${curTag} -> v=${nextTag} across ${updatedCount} files (apple/** & pinned versions untouched).`);
}

function pruneBackups(keepRecent = 6) {
  const fbRoot = path.join(REPO_ROOT, 'fallback_backups');
  if (!fs.existsSync(fbRoot)) return;
  const dirs = fs
    .readdirSync(fbRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();

  if (dirs.length <= keepRecent) {
    console.log(`[OK] fallback_backups has ${dirs.length} snapshots (<= ${keepRecent}, nothing to prune).`);
    return;
  }

  const cutoff = dirs.length - keepRecent;
  let removed = 0;
  for (let i = 0; i < cutoff; i++) {
    const name = dirs[i];
    if (
      name.endsWith('_pre_aethelgard_ex_overhaul') ||
      name.endsWith('_pre_11hero_ex_roster_overhaul')
    ) {
      continue;
    }
    fs.rmSync(path.join(fbRoot, name), { recursive: true, force: true });
    removed++;
  }
  console.log(`[OK] Pruned ${removed} old snapshot(s) from fallback_backups/ (kept latest ${keepRecent} + pinned milestones).`);
}

function rotateMemoryDocs(maxBatches = 5) {
  // 1. Rotate docs/IMPLEMENTATION_LOG.md (`## Latest Completed Batch` / `## Previous Completed Batch` sections)
  const logPath = path.join(REPO_ROOT, 'docs/IMPLEMENTATION_LOG.md');
  const logArchivePath = path.join(REPO_ROOT, 'docs/archive/IMPLEMENTATION_LOG_ARCHIVE_PRE_V121.md');
  const logTxt = fs.readFileSync(logPath, 'utf8');
  const logHeadingRe = /^## (?:Latest|Previous) Completed Batch \(/gm;
  const logStarts = [...logTxt.matchAll(logHeadingRe)].map((m) => m.index);
  let rotatedLogCount = 0;
  if (logStarts.length > maxBatches) {
    const cutIdx = logStarts[maxBatches];
    const kept = logTxt.slice(0, cutIdx).trimEnd() + '\n';
    const archived = '\n' + logTxt.slice(cutIdx).trim() + '\n';
    fs.appendFileSync(logArchivePath, archived, 'utf8');
    fs.writeFileSync(logPath, kept, 'utf8');
    rotatedLogCount = logStarts.length - maxBatches;
  }

  // 2. Rotate docs/PROJECT_MEMORY_HANDOFF.md (`### 1. Current Live Baseline` .. `\n---\n\n## 2.`)
  const memPath = path.join(REPO_ROOT, 'docs/PROJECT_MEMORY_HANDOFF.md');
  const memArchivePath = path.join(REPO_ROOT, 'docs/archive/PROJECT_MEMORY_ARCHIVE_PRE_V121.md');
  const memTxt = fs.readFileSync(memPath, 'utf8');
  const sec2Idx = memTxt.indexOf('\n---\n\n## 2.');
  let rotatedMemCount = 0;
  if (sec2Idx > 0) {
    const sec1 = memTxt.slice(0, sec2Idx);
    const rest = memTxt.slice(sec2Idx);
    const batchEntryRe = /^- \*\*(?:Batch `\?v=30fps\d+`|Previous Live Batch \(`\?v=30fps\d+)/gm;
    // Group by unique top-level batch heading version numbers in order of appearance
    const versionMatches = [
      ...sec1.matchAll(/^- \*\*(?:Batch `\?v=(30fps\d+)`|Previous Live Batch \(`\?v=(30fps\d+)`)/gm)
    ];
    const seenVersions = [];
    for (const vm of versionMatches) {
      const v = vm[1] || vm[2];
      if (v && !seenVersions.includes(v)) seenVersions.push(v);
    }
    if (seenVersions.length > maxBatches) {
      const oldestKeepVer = seenVersions[maxBatches];
      const cutRe = new RegExp(`\\n- \\*\\*Previous Live Batch \\(\`\\?v=${oldestKeepVer}\``);
      const cutMatch = sec1.match(cutRe);
      if (cutMatch && cutMatch.index !== undefined) {
        const keptSec1 = sec1.slice(0, cutMatch.index).trimEnd() + '\n\n';
        const archivedSec1 = '\n' + sec1.slice(cutMatch.index).trim() + '\n';
        fs.appendFileSync(memArchivePath, archivedSec1, 'utf8');
        fs.writeFileSync(memPath, keptSec1 + rest, 'utf8');
        rotatedMemCount = seenVersions.length - maxBatches;
      }
    }
  }
  console.log(
    `[OK] Memory doc rotation check complete (rotated ${rotatedMemCount} handoff batch(es), ${rotatedLogCount} log batch(es)).`
  );
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/ship_prep.mjs [--bump next|30fpsNNN] [--rotate-docs] [--prune-backups]');
  process.exit(0);
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--bump' && args[i + 1]) {
    bumpCacheBust(args[++i]);
  } else if (args[i] === '--rotate-docs') {
    rotateMemoryDocs(5);
  } else if (args[i] === '--prune-backups') {
    pruneBackups(6);
  }
}
