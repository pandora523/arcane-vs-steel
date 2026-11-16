#!/usr/bin/env node
/**
 * Arcane vs. Steel — Zero-Dependency Web / Vercel Code & Asset Encryption Vault Builder
 *
 * Uses ONLY Node.js built-in modules (`node:fs`, `node:path`, `node:crypto`, `node:zlib`, `node:url`).
 * Leaves all repository source files (`index.html`, `style.css`, `src/**`, `assets/**`) 100% untouched
 * and outputs an encrypted production bundle into `dist/`:
 *   - `dist/index.html`        (zero plain CSS/JS/PNG/TTF asset URLs; placeholder data URIs + boot script)
 *   - `dist/boot.<hash>.js`    (minified IIFE WebCrypto AES-256-GCM loader, pure-JS fallback, DOM guards,
 *                               transparent Image/fetch asset interceptors, topological ES module linker)
 *   - `dist/packs/<16hex>.bin` (AVSV\x01 + 12-byte IV + AES-256-GCM ciphertext + 16-byte authTag)
 *   - `dist/manifest.json`     (minimal PWA metadata with zero sprite sheet paths)
 *   - `dist/robots.txt`        (scraper & AI crawler disallow rules)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT_DIR = path.resolve(__dirname, '..');

export const AVSV_MAGIC = Buffer.from([0x41, 0x56, 0x53, 0x56, 0x01]); // "AVSV\x01"
const TRANSPARENT_GIF_DATA_URI =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf'
};

/**
 * Encrypts a plaintext Buffer into `AVSV\x01 || 12-byte IV || ciphertext || 16-byte authTag`.
 * Layout matches WebCrypto `crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextWithTag)`.
 */
export function encryptAvsvPack(plaintextBuf, masterKey, iv = crypto.randomBytes(12)) {
  if (!Buffer.isBuffer(masterKey) && !(masterKey instanceof Uint8Array)) {
    throw new TypeError('masterKey must be a 32-byte Buffer or Uint8Array');
  }
  if (masterKey.length !== 32) {
    throw new RangeError(`Expected 32-byte masterKey, got ${masterKey.length}`);
  }
  if (iv.length !== 12) {
    throw new RangeError(`Expected 12-byte IV, got ${iv.length}`);
  }
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const ct = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([AVSV_MAGIC, iv, ct, authTag]);
}

/**
 * Parses and validates an `AVSV\x01` pack header without decrypting.
 */
export function parseAvsvPackHeader(packBuf) {
  const buf = Buffer.isBuffer(packBuf) ? packBuf : Buffer.from(packBuf);
  if (buf.length < 33) {
    throw new Error(`Invalid AVSV pack length (${buf.length} < 33)`);
  }
  if (
    buf[0] !== 0x41 ||
    buf[1] !== 0x56 ||
    buf[2] !== 0x53 ||
    buf[3] !== 0x56 ||
    buf[4] !== 0x01
  ) {
    throw new Error('Invalid AVSV magic header');
  }
  const iv = buf.subarray(5, 17);
  const ciphertext = buf.subarray(17, buf.length - 16);
  const authTag = buf.subarray(buf.length - 16);
  return { version: buf[4], iv, ciphertext, authTag };
}

/**
 * Decrypts and authenticates an `AVSV\x01` pack using Node's `aes-256-gcm`.
 */
export function decryptAvsvPack(packBuf, masterKey) {
  const { iv, ciphertext, authTag } = parseAvsvPackHeader(packBuf);
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Unpacks the decrypted Code + Style Vault payload (handles gzip or raw UTF-8 JSON).
 */
export function unpackCodeVaultPayload(decryptedBuf) {
  const buf = Buffer.isBuffer(decryptedBuf) ? decryptedBuf : Buffer.from(decryptedBuf);
  const jsonBuf =
    buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf;
  return JSON.parse(jsonBuf.toString('utf8'));
}

/**
 * Lexical scanner for ES module static/dynamic `import` and `export ... from` specifiers.
 * Properly skips `//` line comments, `/* ... * /` block comments, single/double-quoted strings,
 * nested template literals `` `...${...}...` ``, and regex literals so zero module code is ever mangled.
 */
export function scanEsModuleDependencies(code, moduleRelPath) {
  const tokens = [];
  const len = code.length;
  let i = 0;

  const canStartRegex = () => {
    if (tokens.length === 0) return true;
    const prev = tokens[tokens.length - 1];
    if (prev.type === 'kw') {
      return [
        'return',
        'throw',
        'case',
        'delete',
        'void',
        'typeof',
        'instanceof',
        'in',
        'of',
        'new',
        'yield',
        'await',
        'else'
      ].includes(prev.val);
    }
    if (prev.type === 'punc') {
      return !')]}'.includes(prev.val);
    }
    return false;
  };

  while (i < len) {
    const ch = code[i];
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      i++;
      continue;
    }
    if (ch === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < len && code[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i;
      i++;
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\') i += 2;
        else i++;
      }
      const end = i;
      i++;
      tokens.push({
        type: 'str',
        val: code.slice(start + 1, end),
        innerStart: start + 1,
        innerEnd: end
      });
      continue;
    }
    if (ch === '`') {
      i++;
      let exprDepth = 0;
      while (i < len) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === '`' && exprDepth === 0) {
          i++;
          break;
        }
        if (code[i] === '$' && code[i + 1] === '{') {
          exprDepth++;
          i += 2;
          continue;
        }
        if (code[i] === '}' && exprDepth > 0) {
          exprDepth--;
          i++;
          continue;
        }
        if (exprDepth > 0 && (code[i] === "'" || code[i] === '"')) {
          const q = code[i++];
          while (i < len && code[i] !== q) {
            if (code[i] === '\\') i += 2;
            else i++;
          }
          i++;
          continue;
        }
        i++;
      }
      tokens.push({ type: 'tpl' });
      continue;
    }
    if (ch === '/' && canStartRegex()) {
      i++;
      let inCharClass = false;
      while (i < len) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === '[') inCharClass = true;
        else if (code[i] === ']') inCharClass = false;
        else if (code[i] === '/' && !inCharClass) {
          i++;
          while (i < len && /[a-z]/i.test(code[i])) i++;
          break;
        } else if (code[i] === '\n') {
          break;
        }
        i++;
      }
      tokens.push({ type: 'rx' });
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      i++;
      while (i < len && /[A-Za-z0-9_$]/.test(code[i])) i++;
      const word = code.slice(start, i);
      const prevPunc = tokens.length > 0 ? tokens[tokens.length - 1] : null;
      const isProp = prevPunc && prevPunc.type === 'punc' && prevPunc.val === '.';
      tokens.push({ type: isProp ? 'prop' : 'kw', val: word });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      i++;
      while (i < len && /[0-9A-Za-z_.]/.test(code[i])) i++;
      tokens.push({ type: 'num' });
      continue;
    }
    tokens.push({ type: 'punc', val: ch });
    i++;
  }

  const foundSpecs = [];
  let topBraceDepth = 0;
  let topParenDepth = 0;

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.type === 'punc') {
      if (tok.val === '{') topBraceDepth++;
      else if (tok.val === '}') topBraceDepth = Math.max(0, topBraceDepth - 1);
      else if (tok.val === '(') topParenDepth++;
      else if (tok.val === ')') topParenDepth = Math.max(0, topParenDepth - 1);
      continue;
    }

    // Dynamic `import('./foo.js')` anywhere
    if (
      tok.type === 'kw' &&
      tok.val === 'import' &&
      tokens[t + 1]?.type === 'punc' &&
      tokens[t + 1]?.val === '(' &&
      tokens[t + 2]?.type === 'str'
    ) {
      foundSpecs.push(tokens[t + 2]);
      continue;
    }

    // Top-level static `import` / `export ... from`
    if (
      topBraceDepth === 0 &&
      topParenDepth === 0 &&
      tok.type === 'kw' &&
      (tok.val === 'import' || tok.val === 'export')
    ) {
      if (tok.val === 'import' && tokens[t + 1]?.type === 'str') {
        foundSpecs.push(tokens[t + 1]);
        continue;
      }
      let k = t + 1;
      let clauseBrace = 0;
      while (k < tokens.length) {
        const tk = tokens[k];
        if (tk.type === 'punc' && tk.val === '{') {
          clauseBrace++;
        } else if (tk.type === 'punc' && tk.val === '}') {
          clauseBrace = Math.max(0, clauseBrace - 1);
        } else if (
          clauseBrace === 0 &&
          tk.type === 'kw' &&
          tk.val === 'from' &&
          tokens[k + 1]?.type === 'str'
        ) {
          foundSpecs.push(tokens[k + 1]);
          break;
        } else if (
          clauseBrace === 0 &&
          ((tk.type === 'punc' && tk.val === ';') ||
            (tk.type === 'kw' &&
              ['const', 'let', 'var', 'function', 'class', 'async'].includes(tk.val)))
        ) {
          break;
        }
        k++;
      }
    }
  }

  const baseDir = path.posix.dirname(moduleRelPath);
  const resolvedDeps = [];
  for (const spec of foundSpecs) {
    if (!spec.val.startsWith('.')) continue;
    const cleanRel = spec.val.split('?')[0].split('#')[0];
    const targetKey = path.posix.normalize(path.posix.join(baseDir, cleanRel));
    resolvedDeps.push({
      raw: spec.val,
      target: targetKey,
      innerStart: spec.innerStart,
      innerEnd: spec.innerEnd
    });
  }

  resolvedDeps.sort((a, b) => a.innerStart - b.innerStart);
  return resolvedDeps;
}

/**
 * Traverses the ES module graph reachable from `entryRelPath` (`src/main.js`) and returns
 * leaf-to-root topological sort order + exact dependency spans for every module.
 */
function buildModuleGraph(rootDir, entryRelPath = 'src/main.js') {
  const modules = Object.create(null);
  const visited = new Set();
  const visiting = new Set();
  const order = [];

  function dfs(modRelPath) {
    if (visited.has(modRelPath)) return;
    if (visiting.has(modRelPath)) {
      throw new Error(`Circular ES module dependency detected at ${modRelPath}`);
    }
    const absPath = path.join(rootDir, modRelPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Missing ES module imported in graph: ${modRelPath}`);
    }
    visiting.add(modRelPath);
    const code = fs.readFileSync(absPath, 'utf8');
    const deps = scanEsModuleDependencies(code, modRelPath);
    for (const d of deps) {
      dfs(d.target);
    }
    visiting.delete(modRelPath);
    visited.add(modRelPath);
    modules[modRelPath] = {
      code,
      deps: deps.map((d) => [d.innerStart, d.innerEnd, d.target])
    };
    order.push(modRelPath);
  }

  dfs(entryRelPath);
  return { entry: entryRelPath, order, modules };
}

/**
 * Collects all runtime game assets under `assets/sprites/*.png`, `assets/sfx/*.wav`, `assets/fonts/*.ttf`.
 */
function collectVaultAssets(rootDir) {
  const assetDirs = [
    { dir: 'assets/sprites', exts: new Set(['.png']) },
    { dir: 'assets/sfx', exts: new Set(['.wav']) },
    { dir: 'assets/fonts', exts: new Set(['.ttf']) }
  ];
  const list = [];
  for (const { dir, exts } of assetDirs) {
    const absDir = path.join(rootDir, dir);
    if (!fs.existsSync(absDir)) continue;
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!exts.has(ext)) continue;
      const relPath = `${dir}/${ent.name}`;
      list.push({
        relPath,
        absPath: path.join(absDir, ent.name),
        mime: MIME_BY_EXT[ext] || 'application/octet-stream'
      });
    }
  }
  return list;
}

/**
 * Strips `@font-face` blocks loading `assets/fonts/pixel_art.ttf` from `style.css`
 * because the runtime loader decrypts `pixel_art.ttf` into a `FontFace('ArcanePixel', buf)`
 * directly in RAM before CSS injection (avoiding any plain `.ttf` request).
 */
function prepareVaultCss(rawCss) {
  return rawCss.replace(/@font-face\s*\{[^}]*pixel_art\.ttf[^}]*\}\s*/gi, '');
}

/**
 * Splits a 32-byte master key into 4 shuffled 8-byte XOR-masked shards + 2 16-byte mask arrays
 * + permutation + salt so zero hex/base64 key literals exist in `boot.<hash>.js`.
 */
function createObfuscatedKeyShards(masterKey) {
  const perm = Array.from({ length: 32 }, (_, i) => i);
  for (let i = 31; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  const masks = crypto.randomBytes(32);
  const salt = crypto.randomInt(17, 251);
  const shards = [[], [], [], []];
  for (let k = 0; k < 32; k++) {
    const origIdx = perm[k];
    const maskedByte = masterKey[origIdx] ^ masks[k] ^ ((origIdx * 131 + salt) & 0xff);
    shards[k >> 3].push(maskedByte);
  }
  return {
    s0: shards[0],
    s1: shards[1],
    s2: shards[2],
    s3: shards[3],
    m0: Array.from(masks.subarray(0, 16)),
    m1: Array.from(masks.subarray(16, 32)),
    pm: perm,
    salt
  };
}

/**
 * Reconstructs the 32-byte master key from a generated `boot.<hash>.js` file (used by test suites
 * to verify bit-for-bit AES-256-GCM pack decryption after CLI builds).
 */
export function extractMasterKeyFromBootScript(bootJsSource) {
  const m = bootJsSource.match(
    /s0=new Uint8Array\(\[([0-9,]+)\]\),s1=new Uint8Array\(\[([0-9,]+)\]\),s2=new Uint8Array\(\[([0-9,]+)\]\),s3=new Uint8Array\(\[([0-9,]+)\]\),m0=new Uint8Array\(\[([0-9,]+)\]\),m1=new Uint8Array\(\[([0-9,]+)\]\),pm=new Uint8Array\(\[([0-9,]+)\]\),ks=(\d+)/
  );
  if (!m) {
    throw new Error('Unable to locate key shards in boot script');
  }
  const parseNums = (s) => s.split(',').map((n) => Number(n));
  const shards = [parseNums(m[1]), parseNums(m[2]), parseNums(m[3]), parseNums(m[4])];
  const masks = [parseNums(m[5]), parseNums(m[6])];
  const pm = parseNums(m[7]);
  const salt = Number(m[8]);
  const key = Buffer.alloc(32);
  for (let k = 0; k < 32; k++) {
    const oi = pm[k];
    key[oi] = shards[k >> 3][k & 7] ^ masks[k >> 4][k & 15] ^ ((oi * 131 + salt) & 0xff);
  }
  return key;
}

/**
 * Minifies the self-contained bootstrapper JS safely (strips comments and redundant whitespace
 * while preserving strings and syntax) and validates syntax with `new Function(...)`.
 */
function minifyBootScript(source) {
  let out = '';
  const len = source.length;
  let i = 0;
  const isIdent = (c) => Boolean(c && /[A-Za-z0-9_$]/.test(c));

  while (i < len) {
    const ch = source[i];
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch;
      out += ch;
      i++;
      while (i < len) {
        const c = source[i];
        out += c;
        if (c === '\\') {
          i++;
          if (i < len) out += source[i];
          i++;
          continue;
        }
        i++;
        if (c === q) break;
      }
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      while (
        i < len &&
        (source[i] === ' ' || source[i] === '\t' || source[i] === '\r' || source[i] === '\n')
      ) {
        i++;
      }
      const prev = out[out.length - 1];
      const next = source[i];
      if (
        (isIdent(prev) && isIdent(next)) ||
        ((prev === '+' || prev === '-') && next === prev)
      ) {
        out += ' ';
      }
      continue;
    }
    out += ch;
    i++;
  }

  // Syntax check to guarantee 100% valid JS output
  // eslint-disable-next-line no-new-func
  new Function(out);
  return out;
}

/**
 * Generates the runtime IIFE bootstrapper (`dist/boot.<hash>.js`).
 */
function generateBootScript(codePackId, keyData) {
  const raw = `(function(){
"use strict";
const s0=new Uint8Array([${keyData.s0.join(',')}]),s1=new Uint8Array([${keyData.s1.join(',')}]),s2=new Uint8Array([${keyData.s2.join(',')}]),s3=new Uint8Array([${keyData.s3.join(',')}]),m0=new Uint8Array([${keyData.m0.join(',')}]),m1=new Uint8Array([${keyData.m1.join(',')}]),pm=new Uint8Array([${keyData.pm.join(',')}]),ks=${keyData.salt};
const CP="${codePackId}";

/* 1. Anti-theft DOM guards: block contextmenu on canvas/img, dragstart on img, and Ctrl/Cmd+S */
document.addEventListener("contextmenu",function(e){
  const t=e.target;
  if(t&&t.closest&&t.closest("canvas,img"))e.preventDefault();
},true);
document.addEventListener("dragstart",function(e){
  const t=e.target;
  if(t&&(t.tagName==="IMG"||(t.closest&&t.closest("img,canvas"))))e.preventDefault();
},true);
window.addEventListener("keydown",function(e){
  if((e.ctrlKey||e.metaKey)&&(e.key==="s"||e.key==="S"||e.code==="KeyS")){
    e.preventDefault();
    e.stopPropagation();
  }
},true);

const origFetch=window.fetch.bind(window);
const imgProto=HTMLImageElement.prototype;
const origSrcDesc=Object.getOwnPropertyDescriptor(imgProto,"src");
const origCompleteDesc=Object.getOwnPropertyDescriptor(imgProto,"complete");
const origSetAttr=Element.prototype.setAttribute;
const origGetAttr=Element.prototype.getAttribute;
const origRemoveAttr=Element.prototype.removeAttribute;

/* Pure-JS NIST AES-256-GCM fallback used ONLY when crypto.subtle is absent (non-HTTPS LAN IP) */
function makePureAes256Gcm(keyBytes){
  const S=new Uint8Array(256),p=new Uint8Array(256),q=new Uint8Array(256);
  let x=1;
  for(let i=0;i<256;i++){
    p[i]=x;q[x]=i;
    x^=(x<<1)^((x&128)?0x11b:0);
  }
  S[0]=99;
  for(let i=1;i<256;i++){
    let z=p[255-q[i]],s=z;
    for(let k=0;k<4;k++){z=((z<<1)|(z>>>7))&255;s^=z;}
    S[i]=s^99;
  }
  const xt=function(a){return((a<<1)^((a&128)?27:0))&255;};
  const rk=new Uint8Array(240);
  rk.set(keyBytes);
  let rcon=1;
  for(let i=32;i<240;i+=4){
    let t0=rk[i-4],t1=rk[i-3],t2=rk[i-2],t3=rk[i-1];
    if((i&31)===0){
      const u=t0;t0=S[t1]^rcon;t1=S[t2];t2=S[t3];t3=S[u];rcon=xt(rcon);
    }else if((i&31)===16){
      t0=S[t0];t1=S[t1];t2=S[t2];t3=S[t3];
    }
    rk[i]=rk[i-32]^t0;rk[i+1]=rk[i-31]^t1;rk[i+2]=rk[i-30]^t2;rk[i+3]=rk[i-29]^t3;
  }
  const st=new Uint8Array(16),tp=new Uint8Array(16);
  function encBlock(inp,out){
    for(let i=0;i<16;i++)st[i]=inp[i]^rk[i];
    for(let r=1;r<=14;r++){
      const ro=r<<4;
      tp[0]=S[st[0]];tp[1]=S[st[5]];tp[2]=S[st[10]];tp[3]=S[st[15]];
      tp[4]=S[st[4]];tp[5]=S[st[9]];tp[6]=S[st[14]];tp[7]=S[st[3]];
      tp[8]=S[st[8]];tp[9]=S[st[13]];tp[10]=S[st[2]];tp[11]=S[st[7]];
      tp[12]=S[st[12]];tp[13]=S[st[1]];tp[14]=S[st[6]];tp[15]=S[st[11]];
      if(r<14){
        for(let c=0;c<16;c+=4){
          const a0=tp[c],a1=tp[c+1],a2=tp[c+2],a3=tp[c+3],xr=a0^a1^a2^a3;
          st[c]=a0^xr^xt(a0^a1)^rk[ro+c];
          st[c+1]=a1^xr^xt(a1^a2)^rk[ro+c+1];
          st[c+2]=a2^xr^xt(a2^a3)^rk[ro+c+2];
          st[c+3]=a3^xr^xt(a3^a0)^rk[ro+c+3];
        }
      }else{
        for(let i=0;i<16;i++)out[i]=tp[i]^rk[ro+i];
      }
    }
  }
  const H=new Uint8Array(16);
  encBlock(new Uint8Array(16),H);
  const hv=new DataView(H.buffer);
  const h0=hv.getUint32(0,false),h1=hv.getUint32(4,false),h2=hv.getUint32(8,false),h3=hv.getUint32(12,false);
  function ghashWords(y,x0,x1,x2,x3){
    let b0=(y[0]^x0)>>>0,b1=(y[1]^x1)>>>0,b2=(y[2]^x2)>>>0,b3=(y[3]^x3)>>>0;
    let z0=0,z1=0,z2=0,z3=0,v0=h0,v1=h1,v2=h2,v3=h3;
    const words=[b0,b1,b2,b3];
    for(let w=0;w<4;w++){
      const wd=words[w];
      for(let bit=31;bit>=0;bit--){
        if((wd>>>bit)&1){z0=(z0^v0)>>>0;z1=(z1^v1)>>>0;z2=(z2^v2)>>>0;z3=(z3^v3)>>>0;}
        const lsb=v3&1;
        v3=((v3>>>1)|((v2&1)<<31))>>>0;
        v2=((v2>>>1)|((v1&1)<<31))>>>0;
        v1=((v1>>>1)|((v0&1)<<31))>>>0;
        v0=(v0>>>1)>>>0;
        if(lsb)v0=(v0^0xe1000000)>>>0;
      }
    }
    y[0]=z0;y[1]=z1;y[2]=z2;y[3]=z3;
  }
  return function decryptGcm(iv,ctAndTag){
    if(ctAndTag.length<16)throw new Error("AVSV short tag");
    const ctLen=ctAndTag.length-16;
    const y=new Uint32Array(4),blk=new Uint8Array(16),bv=new DataView(blk.buffer);
    const fullEnd=ctLen-(ctLen&15);
    const cv=new DataView(ctAndTag.buffer,ctAndTag.byteOffset,ctAndTag.byteLength);
    for(let off=0;off<fullEnd;off+=16){
      ghashWords(y,cv.getUint32(off,false),cv.getUint32(off+4,false),cv.getUint32(off+8,false),cv.getUint32(off+12,false));
    }
    if(fullEnd<ctLen){
      blk.fill(0);
      for(let i=fullEnd;i<ctLen;i++)blk[i-fullEnd]=ctAndTag[i];
      ghashWords(y,bv.getUint32(0,false),bv.getUint32(4,false),bv.getUint32(8,false),bv.getUint32(12,false));
    }
    const hi=Math.floor((ctLen*8)/4294967296)>>>0,lo=(ctLen*8)>>>0;
    ghashWords(y,0,0,hi,lo);
    const j0=new Uint8Array(16),ej0=new Uint8Array(16),tagOut=new Uint8Array(16),tv=new DataView(tagOut.buffer);
    j0.set(iv,0);j0[15]=1;
    encBlock(j0,ej0);
    tv.setUint32(0,y[0],false);tv.setUint32(4,y[1],false);tv.setUint32(8,y[2],false);tv.setUint32(12,y[3],false);
    let diff=0;
    for(let i=0;i<16;i++)diff|=(tagOut[i]^ej0[i])^ctAndTag[ctLen+i];
    if(diff!==0)throw new Error("AVSV auth failed");
    const out=new Uint8Array(ctLen),cb=new Uint8Array(16),ksBlk=new Uint8Array(16),cbv=new DataView(cb.buffer);
    cb.set(iv,0);
    let ctr=2;
    for(let off=0;off<ctLen;off+=16){
      cbv.setUint32(12,ctr,false);
      ctr=(ctr+1)>>>0;
      encBlock(cb,ksBlk);
      const n=ctLen-off<16?ctLen-off:16;
      for(let i=0;i<n;i++)out[off+i]=ctAndTag[off+i]^ksBlk[i];
    }
    return out.buffer;
  };
}

let subtleKeyPromise=null;
let pureFallbackDec=null;

function initVaultKey(){
  const raw=new Uint8Array(32);
  const sh=[s0,s1,s2,s3],mk=[m0,m1];
  for(let k=0;k<32;k++){
    const oi=pm[k];
    raw[oi]=sh[k>>3][k&7]^mk[k>>4][k&15]^((oi*131+ks)&255);
  }
  s0.fill(0);s1.fill(0);s2.fill(0);s3.fill(0);m0.fill(0);m1.fill(0);pm.fill(0);
  if(window.crypto&&window.crypto.subtle&&typeof window.crypto.subtle.importKey==="function"){
    const keyCopy=raw.slice(0);
    raw.fill(0);
    subtleKeyPromise=window.crypto.subtle.importKey("raw",keyCopy,{name:"AES-GCM"},false,["decrypt"]).then(function(ck){
      keyCopy.fill(0);
      return ck;
    });
  }else{
    pureFallbackDec=makePureAes256Gcm(raw);
    raw.fill(0);
  }
}

async function decryptPackBuffer(packArrayBuf){
  const u8=new Uint8Array(packArrayBuf);
  if(u8.length<33||u8[0]!==65||u8[1]!==86||u8[2]!==83||u8[3]!==86||u8[4]!==1){
    throw new Error("Invalid AVSV pack");
  }
  const iv=u8.subarray(5,17);
  const body=u8.subarray(17);
  if(subtleKeyPromise){
    const ck=await subtleKeyPromise;
    return window.crypto.subtle.decrypt({name:"AES-GCM",iv:iv,tagLength:128},ck,body);
  }
  return pureFallbackDec(iv,body);
}

async function fetchAndDecryptPack(packId){
  const delays=[120,300];
  let lastErr=null;
  for(let attempt=0;attempt<=delays.length;attempt++){
    try{
      const res=await origFetch("packs/"+packId+".bin");
      if(!res.ok)throw new Error("Vault HTTP "+res.status);
      const enc=await res.arrayBuffer();
      return await decryptPackBuffer(enc);
    }catch(err){
      lastErr=err;
      if(attempt<delays.length){
        await new Promise(function(r){setTimeout(r,delays[attempt]);});
      }
    }
  }
  throw lastErr||new Error("Vault pack load failed: "+packId);
}

async function gunzipToText(buf){
  const u8=new Uint8Array(buf);
  if(u8.length>=2&&u8[0]===31&&u8[1]===139&&typeof DecompressionStream==="function"){
    const ds=new DecompressionStream("gzip");
    const stream=new Blob([u8]).stream().pipeThrough(ds);
    return new Response(stream).text();
  }
  return new TextDecoder("utf-8").decode(u8);
}

function bytesToBase64(buf){
  const u8=new Uint8Array(buf);
  let bin="";
  const step=8192;
  for(let i=0;i<u8.length;i+=step){
    bin+=String.fromCharCode.apply(null,u8.subarray(i,Math.min(i+step,u8.length)));
  }
  return btoa(bin);
}

async function bootVault(){
  initVaultKey();
  const rawVaultBuf=await fetchAndDecryptPack(CP);
  const vaultJson=await gunzipToText(rawVaultBuf);
  const vault=JSON.parse(vaultJson);
  const assetTable=vault.assets||Object.create(null);
  const inFlight=new Map();
  const smallCache=new Map();
  let smallCacheBytes=0;
  const SMALL_ITEM_CAP=5242880;
  const SMALL_TOTAL_CAP=29360128;

  function resolveAssetKey(rawInput){
    if(!rawInput||typeof rawInput!=="string")return null;
    if(rawInput.startsWith("blob:")||rawInput.startsWith("data:"))return null;
    let pathname="";
    try{
      const u=new URL(rawInput,document.baseURI);
      if(u.origin!==window.location.origin)return null;
      pathname=decodeURIComponent(u.pathname);
    }catch(_){
      pathname=rawInput.split("?")[0].split("#")[0];
    }
    const idx=pathname.indexOf("assets/");
    if(idx===-1)return null;
    const norm=pathname.slice(idx);
    return Object.prototype.hasOwnProperty.call(assetTable,norm)?norm:null;
  }

  function loadAssetBytes(assetKey){
    const cached=smallCache.get(assetKey);
    if(cached){
      smallCache.delete(assetKey);
      smallCache.set(assetKey,cached);
      return Promise.resolve(cached.slice(0));
    }
    const pending=inFlight.get(assetKey);
    if(pending)return pending.then(function(b){return b.slice(0);});
    const entry=assetTable[assetKey];
    const p=fetchAndDecryptPack(entry[0]).then(function(decBuf){
      inFlight.delete(assetKey);
      if(decBuf.byteLength<=SMALL_ITEM_CAP){
        while(smallCacheBytes+decBuf.byteLength>SMALL_TOTAL_CAP&&smallCache.size>0){
          const oldest=smallCache.keys().next().value;
          const oldBuf=smallCache.get(oldest);
          smallCache.delete(oldest);
          if(oldBuf)smallCacheBytes-=oldBuf.byteLength;
        }
        smallCache.set(assetKey,decBuf);
        smallCacheBytes+=decBuf.byteLength;
        return decBuf.slice(0);
      }
      return decBuf;
    },function(err){
      inFlight.delete(assetKey);
      throw err;
    });
    inFlight.set(assetKey,p);
    return p;
  }

  /* 2. Install transparent HTMLImageElement & window.fetch interceptors */
  function revokeImgBlobUrl(img){
    if(img&&img.__avsBlobUrl){
      try{URL.revokeObjectURL(img.__avsBlobUrl);}catch(_){}
      img.__avsBlobUrl="";
    }
  }
  if(origSrcDesc&&origSrcDesc.get&&origSrcDesc.set){
    const nativeGet=origSrcDesc.get;
    const nativeSet=origSrcDesc.set;
    Object.defineProperty(imgProto,"src",{
      configurable:true,
      enumerable:origSrcDesc.enumerable,
      get:function(){
        if(typeof this.__avsLogicalSrc==="string"&&this.__avsLogicalSrc.length>0){
          return this.__avsLogicalSrc;
        }
        return nativeGet.call(this);
      },
      set:function(val){
        const str=val==null?"":String(val);
        const reqId=(this.__avsReqId=(this.__avsReqId||0)+1);
        revokeImgBlobUrl(this);
        if(!str){
          this.__avsLogicalSrc="";
          this.__avsRawSrc="";
          this.__avsPending=false;
          this.__avsFailed=false;
          origRemoveAttr.call(this,"src");
          return;
        }
        const assetKey=resolveAssetKey(str);
        if(assetKey){
          let resolvedUrl=str;
          try{resolvedUrl=new URL(str,document.baseURI).href;}catch(_){}
          this.__avsRawSrc=str;
          this.__avsLogicalSrc=resolvedUrl;
          this.__avsPending=true;
          this.__avsFailed=false;
          const self=this;
          const mime=assetTable[assetKey][1];
          loadAssetBytes(assetKey).then(function(bytes){
            if(self.__avsReqId!==reqId)return;
            revokeImgBlobUrl(self);
            const blobUrl=URL.createObjectURL(new Blob([bytes],{type:mime}));
            self.__avsBlobUrl=blobUrl;
            self.__avsPending=false;
            self.__avsFailed=false;
            nativeSet.call(self,blobUrl);
          },function(){
            if(self.__avsReqId!==reqId)return;
            self.__avsPending=false;
            self.__avsFailed=true;
            self.dispatchEvent(new Event("error"));
          });
          return;
        }
        this.__avsLogicalSrc="";
        this.__avsRawSrc="";
        this.__avsPending=false;
        this.__avsFailed=false;
        nativeSet.call(this,str);
      }
    });
  }

  if(origCompleteDesc&&origCompleteDesc.get){
    const nativeComplete=origCompleteDesc.get;
    Object.defineProperty(imgProto,"complete",{
      configurable:true,
      enumerable:origCompleteDesc.enumerable,
      get:function(){
        if(this.__avsPending)return false;
        return nativeComplete.call(this);
      }
    });
  }

  imgProto.removeAttribute=function(name){
    if(name&&String(name).toLowerCase()==="src"){
      this.__avsReqId=(this.__avsReqId||0)+1;
      revokeImgBlobUrl(this);
      this.__avsLogicalSrc="";
      this.__avsRawSrc="";
      this.__avsPending=false;
      this.__avsFailed=false;
    }
    return origRemoveAttr.call(this,name);
  };
  imgProto.setAttribute=function(name,val){
    if(name&&String(name).toLowerCase()==="src"){
      this.src=val;
      return;
    }
    return origSetAttr.call(this,name,val);
  };
  imgProto.getAttribute=function(name){
    if(name&&String(name).toLowerCase()==="src"&&this.__avsRawSrc){
      return this.__avsRawSrc;
    }
    return origGetAttr.call(this,name);
  };

  window.fetch=function(input,init){
    const rawUrl=typeof input==="string"?input:(input instanceof URL?input.href:(input&&typeof input.url==="string"?input.url:""));
    const assetKey=resolveAssetKey(rawUrl);
    if(assetKey){
      const mime=assetTable[assetKey][1];
      return loadAssetBytes(assetKey).then(function(bytes){
        return new Response(bytes,{status:200,statusText:"OK",headers:{"Content-Type":mime}});
      });
    }
    return origFetch(input,init);
  };

  /* 3. Decrypt ArcanePixel font & inject vault CSS before booting */
  if(vault.font&&assetTable[vault.font]&&typeof FontFace==="function"&&document.fonts){
    try{
      const fontBuf=await loadAssetBytes(vault.font);
      const ff=new FontFace("ArcanePixel",fontBuf,{weight:"normal",style:"normal",display:"block"});
      await ff.load();
      document.fonts.add(ff);
    }catch(_){}
  }

  const styleEl=document.createElement("style");
  styleEl.setAttribute("data-avs-vault","1");
  styleEl.textContent=vault.css||"";
  document.head.appendChild(styleEl);
  const bootMask=document.getElementById("avs-boot-cloak");
  if(bootMask&&bootMask.parentNode)bootMask.parentNode.removeChild(bootMask);

  if(document.readyState==="loading"){
    await new Promise(function(resolve){
      document.addEventListener("DOMContentLoaded",resolve,{once:true});
    });
  }

  /* Hydrate deferred favicon and [data-avs-src] DOM images (lazy-observing stage gallery thumbs) */
  const iconLinks=document.querySelectorAll("link[data-avs-icon]");
  if(iconLinks.length>0){
    const iconKey=resolveAssetKey(iconLinks[0].getAttribute("data-avs-icon"));
    if(iconKey){
      loadAssetBytes(iconKey).then(function(buf){
        const uri="data:"+assetTable[iconKey][1]+";base64,"+bytesToBase64(buf);
        for(let i=0;i<iconLinks.length;i++){
          iconLinks[i].type=assetTable[iconKey][1];
          iconLinks[i].href=uri;
          iconLinks[i].removeAttribute("data-avs-icon");
        }
      }).catch(function(){});
    }
  }

  const domImgs=document.querySelectorAll("img[data-avs-src]");
  for(let i=0;i<domImgs.length;i++){
    const el=domImgs[i];
    const logical=el.getAttribute("data-avs-src");
    if(!logical)continue;
    el.removeAttribute("data-avs-src");
    el.src=logical;
  }

  /* 4. Topological In-Memory ES Module Graph Linker + Immediate Blob URL Revocation */
  const blobUrls=Object.create(null);
  const createdUrls=[];
  const order=vault.order;
  const mods=vault.modules;
  for(let i=0;i<order.length;i++){
    const key=order[i];
    const m=mods[key];
    const code=m.code;
    const deps=m.deps;
    let linked="";
    let pos=0;
    for(let d=0;d<deps.length;d++){
      const span=deps[d];
      linked+=code.slice(pos,span[0])+blobUrls[span[2]];
      pos=span[1];
    }
    linked+=code.slice(pos);
    const u=URL.createObjectURL(new Blob([linked],{type:"text/javascript"}));
    blobUrls[key]=u;
    createdUrls.push(u);
  }
  vault.modules=null;

  const domReadyQueue=[];
  const origWinAdd=window.addEventListener;
  const origDocAdd=document.addEventListener;
  window.addEventListener=function(type,fn,opts){
    if(type==="DOMContentLoaded"&&typeof fn==="function"){
      domReadyQueue.push(fn);
      return;
    }
    return origWinAdd.call(this,type,fn,opts);
  };
  document.addEventListener=function(type,fn,opts){
    if(type==="DOMContentLoaded"&&typeof fn==="function"){
      domReadyQueue.push(fn);
      return;
    }
    return origDocAdd.call(this,type,fn,opts);
  };

  try{
    await import(blobUrls[vault.entry]);
  }finally{
    window.addEventListener=origWinAdd;
    document.addEventListener=origDocAdd;
    for(let i=0;i<createdUrls.length;i++){
      URL.revokeObjectURL(createdUrls[i]);
    }
    createdUrls.length=0;
  }

  for(let i=0;i<domReadyQueue.length;i++){
    domReadyQueue[i](new Event("DOMContentLoaded"));
  }
}

bootVault().catch(function(err){
  console.error("Sanctum Vault boot failure:",err);
});
})();`;

  return minifyBootScript(raw);
}

/**
 * Transforms root `index.html` into `dist/index.html` with zero plain CSS/JS/PNG/TTF URLs.
 */
function transformIndexHtml(rawHtml, bootFileName) {
  let html = rawHtml;

  // 1. Remove plain stylesheet, font preload, and apple-touch-icon links; rewrite favicon to data placeholder
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["']preload["'][^>]*assets\/fonts\/[^>]*>\s*/gi, '');
  html = html.replace(/<link\b[^>]*rel=["']apple-touch-icon["'][^>]*>\s*/gi, '');
  html = html.replace(
    /<link\b[^>]*rel=["']icon["'][^>]*href=(["'])(assets\/[^"']+)\1[^>]*>/gi,
    `<link rel="icon" type="image/gif" data-avs-icon="$2" href="${TRANSPARENT_GIF_DATA_URI}" />`
  );

  // 2. Inject darkforge boot cloak so zero FOUC occurs during the few ms of WebCrypto CSS/font decryption
  html = html.replace(
    /<\/head>/i,
    `  <style id="avs-boot-cloak">html,body{background:#05070c;margin:0;overflow:hidden}#app{opacity:0}</style>\n</head>`
  );

  // 3. Rewrite every `<img ... src="assets/...">` (including multi-line tags) to `data-avs-src` + 1x1 GIF
  html = html.replace(/<img\b[^>]*>/gis, (imgTag) =>
    imgTag.replace(
      /\bsrc=(["'])(assets\/[^"']+)\1/i,
      `data-avs-src=$1$2$1 src="${TRANSPARENT_GIF_DATA_URI}"`
    )
  );

  // 4. Replace `<script type="module" src="src/main.js..."></script>` with `<script src="boot.<hash>.js"></script>`
  html = html.replace(
    /<script\b[^>]*type=["']module["'][^>]*src=["']src\/main\.js[^"']*["'][^>]*>\s*<\/script>/gi,
    `<script src="${bootFileName}"></script>`
  );

  // Build-time safety assertion: zero plain `src="assets/..."`, `href="assets/..."`, `href="style.css..."`, or `src="src/..."`
  const leakedRef = html.match(
    /(?<![\w-])(?:src|href)\s*=\s*["'](?:\.\/|\/)?(?:assets\/|style\.css|src\/)[^"']*["']/i
  );
  if (leakedRef) {
    throw new Error(`Leaked plain asset/code reference in dist/index.html: ${leakedRef[0]}`);
  }

  return html;
}

function generateRobotsTxt() {
  const blockedBots = [
    'HTTrack',
    'WebCopier',
    'Teleport',
    'TeleportPro',
    'WebZIP',
    'SiteSnucker',
    'Offline Explorer',
    'BlackWidow',
    'Wget',
    'curl',
    'GPTBot',
    'ChatGPT-User',
    'CCBot',
    'ClaudeBot',
    'anthropic-ai',
    'Google-Extended',
    'Bytespider'
  ];
  const lines = [];
  for (const bot of blockedBots) {
    lines.push(`User-agent: ${bot}`, 'Disallow: /', '');
  }
  lines.push('User-agent: *', 'Disallow: /packs/', '');
  return lines.join('\n');
}

function generateDistManifest(rootDir) {
  let srcManifest = {};
  const manifestPath = path.join(rootDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    srcManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  return JSON.stringify(
    {
      name: srcManifest.name || 'Arcane vs. Steel',
      short_name: srcManifest.short_name || 'Arcane vs Steel',
      description:
        srcManifest.description ||
        'HD-2D 30fps pixel-art arena battler and 4-realm Adventure Campaign.',
      start_url: './',
      display: srcManifest.display || 'fullscreen',
      orientation: srcManifest.orientation || 'any',
      background_color: srcManifest.background_color || '#05070c',
      theme_color: srcManifest.theme_color || '#05070c',
      icons: []
    },
    null,
    2
  );
}

/**
 * Builds the complete encrypted Web Vault into `outDir` (default `<rootDir>/dist`).
 */
export function buildWebVault(options = {}) {
  const t0 = performance.now();
  const rootDir = path.resolve(options.rootDir || DEFAULT_ROOT_DIR);
  const outDir = path.resolve(options.outDir || path.join(rootDir, 'dist'));
  const packsDir = path.join(outDir, 'packs');

  // 1. Clean and recreate dist/ and dist/packs/
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(packsDir, { recursive: true });

  // 2. Generate fresh per-build 256-bit master key and pack-ID HMAC key
  const masterKey =
    options.masterKey && options.masterKey.length === 32
      ? Buffer.from(options.masterKey)
      : crypto.randomBytes(32);
  const hmacKey = crypto.randomBytes(32);

  const usedPackIds = new Set();
  const derivePackId = (label) => {
    let suffix = 0;
    while (true) {
      const id = crypto
        .createHmac('sha256', hmacKey)
        .update(suffix === 0 ? label : `${label}#${suffix}`)
        .digest('hex')
        .slice(0, 16);
      if (!usedPackIds.has(id)) {
        usedPackIds.add(id);
        return id;
      }
      suffix++;
    }
  };

  // 3. Encrypt individual asset packs (`assets/sprites/*.png`, `assets/sfx/*.wav`, `assets/fonts/*.ttf`)
  const assetList = collectVaultAssets(rootDir);
  const assetTable = Object.create(null);
  const assetPackRecords = [];
  let totalPlainAssetBytes = 0;
  let totalEncryptedPackBytes = 0;

  for (const item of assetList) {
    const plainBuf = fs.readFileSync(item.absPath);
    const packId = derivePackId(item.relPath);
    const encBuf = encryptAvsvPack(plainBuf, masterKey);
    const packPath = path.join(packsDir, `${packId}.bin`);
    fs.writeFileSync(packPath, encBuf);
    assetTable[item.relPath] = [packId, item.mime];
    assetPackRecords.push({
      relPath: item.relPath,
      packId,
      packFile: `packs/${packId}.bin`,
      mime: item.mime,
      plainBytes: plainBuf.length,
      encryptedBytes: encBuf.length
    });
    totalPlainAssetBytes += plainBuf.length;
    totalEncryptedPackBytes += encBuf.length;
  }

  // 4. Build & encrypt Code + Style Vault (`style.css` + reachable `src/**/*.js` DAG + assetTable)
  const rawCss = fs.readFileSync(path.join(rootDir, 'style.css'), 'utf8');
  const sanitizedCss = prepareVaultCss(rawCss);
  const modGraph = buildModuleGraph(rootDir, 'src/main.js');

  const codeVaultObj = {
    v: 1,
    entry: modGraph.entry,
    font: 'assets/fonts/pixel_art.ttf',
    css: sanitizedCss,
    order: modGraph.order,
    modules: modGraph.modules,
    assets: assetTable
  };
  const codeVaultJsonBuf = Buffer.from(JSON.stringify(codeVaultObj), 'utf8');
  const codeVaultCompressedBuf = zlib.gzipSync(codeVaultJsonBuf, { level: 9 });
  const codePackId = derivePackId('__avs_code_style_vault__');
  const codeVaultEncBuf = encryptAvsvPack(codeVaultCompressedBuf, masterKey);
  fs.writeFileSync(path.join(packsDir, `${codePackId}.bin`), codeVaultEncBuf);
  totalEncryptedPackBytes += codeVaultEncBuf.length;

  // 5. Generate minified `dist/boot.<hash>.js` with XOR-masked shuffled key shards
  const keyShards = createObfuscatedKeyShards(masterKey);
  const bootJs = generateBootScript(codePackId, keyShards);
  const bootHash = crypto.createHash('sha256').update(bootJs).digest('hex').slice(0, 12);
  const bootFileName = `boot.${bootHash}.js`;
  fs.writeFileSync(path.join(outDir, bootFileName), bootJs, 'utf8');

  // 6. Transform `index.html` -> `dist/index.html` & write `dist/robots.txt` + `dist/manifest.json`
  const rawIndexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const distIndexHtml = transformIndexHtml(rawIndexHtml, bootFileName);
  fs.writeFileSync(path.join(outDir, 'index.html'), distIndexHtml, 'utf8');
  fs.writeFileSync(path.join(outDir, 'robots.txt'), generateRobotsTxt(), 'utf8');
  fs.writeFileSync(path.join(outDir, 'manifest.json'), generateDistManifest(rootDir) + '\n', 'utf8');

  const elapsedMs = performance.now() - t0;

  return {
    rootDir,
    outDir,
    bootFileName,
    codePackId,
    masterKey,
    moduleCount: modGraph.order.length,
    assetCount: assetPackRecords.length,
    totalPackCount: assetPackRecords.length + 1,
    codeRawBytes: codeVaultJsonBuf.length,
    codeEncryptedBytes: codeVaultEncBuf.length,
    totalPlainAssetBytes,
    totalEncryptedPackBytes,
    elapsedMs,
    assetPacks: assetPackRecords
  };
}

const isCliEntry =
  process.argv[1] &&
  fs.existsSync(process.argv[1]) &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(__filename);

if (isCliEntry) {
  const result = buildWebVault();
  const mb = (n) => (n / (1024 * 1024)).toFixed(2);
  const kb = (n) => (n / 1024).toFixed(1);
  console.log(
    `[AVSV Web Vault] Built ${result.totalPackCount} AES-256-GCM packs (${result.moduleCount} ES modules + CSS -> packs/${result.codePackId}.bin [${kb(result.codeEncryptedBytes)} KB], ${result.assetCount} lossless assets [${mb(result.totalEncryptedPackBytes)} MB]) + dist/${result.bootFileName} in ${result.elapsedMs.toFixed(1)}ms`
  );
}
