import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/\/$/, '');
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

function collectFiles(dir, predicate, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) collectFiles(full, predicate, out);
    else if (predicate(ent.name, full)) out.push(full);
  }
  return out;
}

const emojiTargets = [
  path.join(REPO_ROOT, 'AGENTS.md'),
  path.join(REPO_ROOT, '.agents/skills/arcane-vs-steel-pipeline/SKILL.md'),
  path.join(REPO_ROOT, 'index.html'),
  path.join(REPO_ROOT, 'style.css'),
  path.join(REPO_ROOT, 'manifest.json'),
  ...collectFiles(path.join(REPO_ROOT, 'docs'), (name) => name.endsWith('.md')),
  ...collectFiles(
    path.join(REPO_ROOT, 'src'),
    (name) => name.endsWith('.js') && name !== 'PixelFont.js'
  )
];

for (const fPath of emojiTargets) {
  if (!fs.existsSync(fPath)) {
    throw new Error(`[check_docs_hygiene] Missing scan target: ${fPath}`);
  }
  const txt = fs.readFileSync(fPath, 'utf8');
  const m = txt.match(EMOJI_RE);
  if (m) {
    throw new Error(
      `[check_docs_hygiene] Forbidden Unicode emoji '${m[0]}' (U+${m[0].codePointAt(0).toString(16).toUpperCase()}) in ${fPath}`
    );
  }
}

const protectedDocsSha256 = {
  'docs/CHAMPION_DEVELOPMENT_PLAYBOOK.md':
    '2891ca38b0ec6e6df9e629e99ccdc1fe1403b297e41fc330174b4c556f9b0361',
  '.agents/skills/arcane-vs-steel-pipeline/SKILL.md':
    '7b915cc454b5b4c9e979313a56eca6a3329dccedc6aa77aba69c14becea87705'
};

for (const [rel, expectedSha] of Object.entries(protectedDocsSha256)) {
  const abs = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`[check_docs_hygiene] Missing protected file: ${rel}`);
  }
  const actualSha = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  if (actualSha !== expectedSha) {
    throw new Error(
      `[check_docs_hygiene] Protected file '${rel}' was modified! expected=${expectedSha}, actual=${actualSha}`
    );
  }
}

const skillAbs = path.join(REPO_ROOT, '.agents/skills/arcane-vs-steel-pipeline/SKILL.md');
const skillBytes = fs.statSync(skillAbs).size;
if (skillBytes > 12288) {
  throw new Error(
    `[check_docs_hygiene] Pipeline SKILL.md must stay compact (<= 12288 bytes), got ${skillBytes}!`
  );
}
const skillTxt = fs.readFileSync(skillAbs, 'utf8');
for (const marker of ['New-Champion Design-First Gate', 'ex_sprite_clean_utils.py']) {
  if (!skillTxt.includes(marker)) {
    throw new Error(`[check_docs_hygiene] Pipeline SKILL.md missing '${marker}'!`);
  }
}

for (const rel of ['docs/PROJECT_MEMORY_HANDOFF.md', 'docs/IMPLEMENTATION_LOG.md']) {
  const abs = path.join(REPO_ROOT, rel);
  const bytes = fs.statSync(abs).size;
  if (bytes < 2048 || bytes > 32768) {
    throw new Error(
      `[check_docs_hygiene] Active memory doc '${rel}' must stay between 2048 and 32768 bytes, got ${bytes}!`
    );
  }
}

for (const rel of [
  'docs/archive/PROJECT_MEMORY_ARCHIVE_PRE_V121.md',
  'docs/archive/IMPLEMENTATION_LOG_ARCHIVE_PRE_V121.md'
]) {
  const abs = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(abs) || fs.statSync(abs).size < 1024) {
    throw new Error(`[check_docs_hygiene] Missing or empty archive file: ${rel}`);
  }
}

const agentsTxt = fs.readFileSync(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8');
for (const marker of [
  'Fast Swarm Integration Policy',
  'Token-Efficient Workflow Policy',
  'Mandatory New-Champion & EX Sprite Pipeline'
]) {
  if (!agentsTxt.includes(marker)) {
    throw new Error(`[check_docs_hygiene] AGENTS.md missing required section '${marker}'!`);
  }
}

console.log(
  `[PASS] check_docs_hygiene: 0 emojis across ${emojiTargets.length} files, intact protected SHA-256s, and compact memory docs verified!`
);
