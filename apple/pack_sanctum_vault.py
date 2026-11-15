#!/usr/bin/env python3
"""
Xcode Build-Time AES-256-GCM Encrypted Vault Packer (`sanctum.pak`) for Arcane vs. Steel.

Scans `../index.html`, `../style.css`, `../manifest.json`, `../src/**`, and `../assets/**`
(`.js`, `.mjs`, `.html`, `.css`, `.json`, `.png`, `.wav`, `.ttf`) and packs their exact,
100% lossless raw bytes into a single AES-256-GCM encrypted archive (`sanctum.pak`) compatible
with Apple Silicon hardware `CryptoKit.AES.GCM.SealedBox(combined:)`.

Archive Binary Format (`sanctum.pak`):
  - Bytes [0..<5]   : Magic `"AVSK\x01"` (`0x41 0x56 0x53 0x4B 0x01`)
  - Bytes [5..<9]   : Little-endian `UInt32` `tocSealedLength`
  - Bytes [9..<9+N] : `tocSealedBox` (`12-byte nonce` + `ciphertext` + `16-byte GCM tag`)
                      decrypting to UTF-8 JSON `{ "<virtualPath>": [offset, length, mimeType], ... }`
                      where `offset` is the exact absolute byte offset inside `sanctum.pak`
  - Bytes [9+N...]  : Concatenated per-file `AES.GCM.SealedBox` (`12-byte nonce` + `ciphertext` + `16-byte tag`)
"""

import argparse
import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

APPLE_DIR = Path(__file__).resolve().parent
REPO_ROOT = APPLE_DIR.parent
PACKER_PATH = Path(__file__).resolve()

MAGIC = b"AVSK\x01"
GCM_NONCE_LEN = 12
GCM_TAG_LEN = 16
GCM_OVERHEAD = GCM_NONCE_LEN + GCM_TAG_LEN

# Two 32-byte non-ASCII obfuscated shards XOR-combined at runtime in `LocalSanctumServer.swift`
VAULT_SHARD_A = bytes([
    0x20, 0x28, 0xEE, 0x99, 0x50, 0xA4, 0xB4, 0x8F,
    0x93, 0x03, 0xE2, 0xBE, 0x17, 0xCD, 0x7A, 0xAB,
    0x34, 0x19, 0x47, 0x1A, 0x0C, 0x96, 0x57, 0xCB,
    0xE3, 0x9A, 0x44, 0xE9, 0x5B, 0x63, 0xF9, 0x50,
])
VAULT_SHARD_B = bytes([
    0x57, 0xE1, 0x7F, 0xF6, 0x98, 0x8F, 0x7F, 0x59,
    0xF1, 0x0B, 0x25, 0x1B, 0xF8, 0x28, 0xF1, 0x11,
    0x2E, 0xCB, 0x03, 0x03, 0x90, 0x43, 0xFE, 0x93,
    0xE6, 0xBC, 0x46, 0x9F, 0x11, 0xB6, 0x30, 0x99,
])

ALLOWED_EXTENSIONS = {
    ".js",
    ".mjs",
    ".html",
    ".htm",
    ".css",
    ".json",
    ".png",
    ".wav",
    ".ttf",
    ".otf",
    ".woff2",
    ".svg",
    ".ico",
}


def reconstruct_vault_key() -> bytes:
    return bytes(a ^ b for a, b in zip(VAULT_SHARD_A, VAULT_SHARD_B))


def mime_type_for_path(rel_path: str) -> str:
    ext = Path(rel_path).suffix.lower().lstrip(".")
    if ext in ("html", "htm"):
        return "text/html; charset=utf-8"
    if ext == "css":
        return "text/css; charset=utf-8"
    if ext in ("js", "mjs"):
        return "text/javascript; charset=utf-8"
    if ext == "json":
        return "application/json; charset=utf-8"
    if ext == "png":
        return "image/png"
    if ext == "wav":
        return "audio/wav"
    if ext == "ttf":
        return "font/ttf"
    if ext == "otf":
        return "font/otf"
    if ext == "woff2":
        return "font/woff2"
    if ext == "svg":
        return "image/svg+xml"
    if ext == "ico":
        return "image/x-icon"
    return "application/octet-stream"


def collect_vault_inputs() -> Tuple[List[Tuple[str, Path, str]], int]:
    """
    Returns `(entries, max_mtime_ns)` where each entry is `(virtual_path, abs_path, mime_type)`.
    Includes directory mtimes so file deletions/renames also invalidate incremental skip.
    """
    entries: List[Tuple[str, Path, str]] = []
    max_mtime_ns = PACKER_PATH.stat().st_mtime_ns

    for root_file in ("index.html", "style.css", "manifest.json"):
        p = REPO_ROOT / root_file
        if not p.is_file():
            raise FileNotFoundError(f"Required root game file missing: {p}")
        st = p.stat()
        if st.st_mtime_ns > max_mtime_ns:
            max_mtime_ns = st.st_mtime_ns
        entries.append((root_file, p, mime_type_for_path(root_file)))

    for folder_name in ("src", "assets"):
        base_dir = REPO_ROOT / folder_name
        if not base_dir.is_dir():
            raise FileNotFoundError(f"Required game directory missing: {base_dir}")
        base_st = base_dir.stat()
        if base_st.st_mtime_ns > max_mtime_ns:
            max_mtime_ns = base_st.st_mtime_ns

        for dirpath, dirnames, filenames in os.walk(base_dir):
            dirnames[:] = sorted(d for d in dirnames if not d.startswith("."))
            dir_st = os.stat(dirpath)
            if dir_st.st_mtime_ns > max_mtime_ns:
                max_mtime_ns = dir_st.st_mtime_ns

            for fname in sorted(filenames):
                if fname.startswith("."):
                    continue
                fpath = Path(dirpath) / fname
                if fpath.suffix.lower() not in ALLOWED_EXTENSIONS:
                    continue
                if not fpath.is_file():
                    continue
                fst = fpath.stat()
                if fst.st_mtime_ns > max_mtime_ns:
                    max_mtime_ns = fst.st_mtime_ns
                vpath = fpath.relative_to(REPO_ROOT).as_posix()
                entries.append((vpath, fpath, mime_type_for_path(vpath)))

    entries.sort(key=lambda item: item[0])
    return entries, max_mtime_ns


def resolve_default_output_path() -> Path:
    target_build_dir = os.environ.get("TARGET_BUILD_DIR", "").strip()
    unlocalized_res = os.environ.get("UNLOCALIZED_RESOURCES_FOLDER_PATH", "").strip()
    if target_build_dir and unlocalized_res:
        return Path(target_build_dir) / unlocalized_res / "sanctum.pak"
    return APPLE_DIR / "build" / "sanctum.pak"


def find_node_binary() -> Optional[str]:
    env_path = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:" + os.environ.get("PATH", "")
    found = shutil.which("node", path=env_path)
    if found:
        return found
    for candidate in ("/opt/homebrew/bin/node", "/usr/local/bin/node"):
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None


def build_padded_toc_bytes(
    file_records: List[Tuple[str, int, int, str]],
) -> Tuple[bytes, int]:
    """
    Computes exact absolute offsets inside `sanctum.pak` (`9 + tocSealedLen + relOffset`)
    by stabilizing `tocPlainLen` with RFC-8259-valid trailing ASCII spaces.
    Returns `(toc_plain_bytes, payload_base_offset)`.
    """
    probe_obj = {
        vpath: [rel_off + 1048576, sealed_len, mime]
        for vpath, rel_off, sealed_len, mime in file_records
    }
    probe_raw = json.dumps(probe_obj, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    target_plain_len = ((len(probe_raw) + 256 + 63) // 64) * 64
    toc_sealed_len = target_plain_len + GCM_OVERHEAD
    payload_base = len(MAGIC) + 4 + toc_sealed_len

    exact_obj = {
        vpath: [payload_base + rel_off, sealed_len, mime]
        for vpath, rel_off, sealed_len, mime in file_records
    }
    exact_raw = json.dumps(exact_obj, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    if len(exact_raw) > target_plain_len:
        target_plain_len = ((len(exact_raw) + 64 + 63) // 64) * 64
        toc_sealed_len = target_plain_len + GCM_OVERHEAD
        payload_base = len(MAGIC) + 4 + toc_sealed_len
        exact_obj = {
            vpath: [payload_base + rel_off, sealed_len, mime]
            for vpath, rel_off, sealed_len, mime in file_records
        }
        exact_raw = json.dumps(exact_obj, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

    padded = exact_raw + (b" " * (target_plain_len - len(exact_raw)))
    assert len(padded) == target_plain_len
    return padded, payload_base


def pack_with_python_cryptography(
    entries: List[Tuple[str, Path, str]],
    output_tmp: Path,
    key: bytes,
) -> bool:
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore
    except Exception:
        return False

    aesgcm = AESGCM(key)
    sealed_blobs: List[bytes] = []
    file_records: List[Tuple[str, int, int, str]] = []
    rel_offset = 0

    for vpath, fpath, mime in entries:
        raw = fpath.read_bytes()
        nonce = os.urandom(GCM_NONCE_LEN)
        ct_and_tag = aesgcm.encrypt(nonce, raw, None)
        combined = nonce + ct_and_tag
        sealed_blobs.append(combined)
        file_records.append((vpath, rel_offset, len(combined), mime))
        rel_offset += len(combined)

    toc_plain, _ = build_padded_toc_bytes(file_records)
    toc_nonce = os.urandom(GCM_NONCE_LEN)
    toc_sealed = toc_nonce + aesgcm.encrypt(toc_nonce, toc_plain, None)

    with output_tmp.open("wb") as out:
        out.write(MAGIC)
        out.write(struct.pack("<I", len(toc_sealed)))
        out.write(toc_sealed)
        for blob in sealed_blobs:
            out.write(blob)
    return True


NODE_PACKER_JS = r"""
const fs = require('node:fs');
const crypto = require('node:crypto');

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const key = Buffer.from(payload.keyHex, 'hex');
const magic = Buffer.from([0x41, 0x56, 0x53, 0x4b, 0x01]);
const GCM_OVERHEAD = 28;

function sealCombined(plainBuf) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = cipher.update(plainBuf);
  const fin = cipher.final();
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, fin, tag], 12 + ct.length + fin.length + 16);
}

const sealedBlobs = [];
const records = [];
let relOffset = 0;

for (const item of payload.entries) {
  const raw = fs.readFileSync(item.absPath);
  const sealed = sealCombined(raw);
  sealedBlobs.push(sealed);
  records.push([item.vpath, relOffset, sealed.length, item.mime]);
  relOffset += sealed.length;
}

const probeObj = {};
for (const [vpath, roff, slen, mime] of records) {
  probeObj[vpath] = [roff + 1048576, slen, mime];
}
let targetPlainLen = Math.ceil((Buffer.byteLength(JSON.stringify(probeObj), 'utf8') + 256) / 64) * 64;
let tocSealedLen = targetPlainLen + GCM_OVERHEAD;
let payloadBase = magic.length + 4 + tocSealedLen;

const buildExactJson = (base) => {
  const obj = {};
  for (const [vpath, roff, slen, mime] of records) {
    obj[vpath] = [base + roff, slen, mime];
  }
  return Buffer.from(JSON.stringify(obj), 'utf8');
};

let exactRaw = buildExactJson(payloadBase);
if (exactRaw.length > targetPlainLen) {
  targetPlainLen = Math.ceil((exactRaw.length + 64) / 64) * 64;
  tocSealedLen = targetPlainLen + GCM_OVERHEAD;
  payloadBase = magic.length + 4 + tocSealedLen;
  exactRaw = buildExactJson(payloadBase);
}

const padSpaces = Buffer.alloc(targetPlainLen - exactRaw.length, 0x20);
const tocPlain = Buffer.concat([exactRaw, padSpaces], targetPlainLen);
const tocSealed = sealCombined(tocPlain);
if (tocSealed.length !== tocSealedLen) {
  throw new Error('TOC sealed length mismatch');
}

const lenBuf = Buffer.alloc(4);
lenBuf.writeUInt32LE(tocSealed.length, 0);

const fd = fs.openSync(payload.outputTmp, 'w');
try {
  fs.writeSync(fd, magic);
  fs.writeSync(fd, lenBuf);
  fs.writeSync(fd, tocSealed);
  for (const blob of sealedBlobs) {
    fs.writeSync(fd, blob);
  }
} finally {
  fs.closeSync(fd);
}
"""


def pack_with_node_crypto(
    entries: List[Tuple[str, Path, str]],
    output_tmp: Path,
    key: bytes,
) -> bool:
    node_bin = find_node_binary()
    if not node_bin:
        return False

    stdin_payload = json.dumps(
        {
            "keyHex": key.hex(),
            "outputTmp": str(output_tmp),
            "entries": [
                {"vpath": vpath, "absPath": str(fpath), "mime": mime}
                for vpath, fpath, mime in entries
            ],
        }
    ).encode("utf-8")

    proc = subprocess.run(
        [node_bin, "-e", NODE_PACKER_JS],
        input=stdin_payload,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"Node AES-256-GCM packer failed: {err}")
    return True


SWIFT_PACKER_SRC = r"""
import Foundation
import CryptoKit

struct InputEntry: Decodable {
    let vpath: String
    let absPath: String
    let mime: String
}
struct InputPayload: Decodable {
    let keyHex: String
    let outputTmp: String
    let entries: [InputEntry]
}

let stdinData = FileHandle.standardInput.readDataToEndOfFile()
let payload = try JSONDecoder().decode(InputPayload.self, from: stdinData)

var keyBytes: [UInt8] = []
var idx = payload.keyHex.startIndex
while idx < payload.keyHex.endIndex {
    let next = payload.keyHex.index(idx, offsetBy: 2)
    keyBytes.append(UInt8(payload.keyHex[idx..<next], radix: 16)!)
    idx = next
}
let symKey = SymmetricKey(data: keyBytes)
let magic = Data([0x41, 0x56, 0x53, 0x4B, 0x01])

var sealedBlobs: [Data] = []
var records: [(String, Int, Int, String)] = []
var relOffset = 0

for item in payload.entries {
    let raw = try Data(contentsOf: URL(fileURLWithPath: item.absPath))
    let sealed = try AES.GCM.seal(raw, using: symKey).combined!
    sealedBlobs.append(sealed)
    records.append((item.vpath, relOffset, sealed.count, item.mime))
    relOffset += sealed.count
}

var probeDict: [String: [Any]] = [:]
for (vp, roff, slen, mime) in records {
    probeDict[vp] = [roff + 1048576, slen, mime]
}
let probeJson = try JSONSerialization.data(withJSONObject: probeDict)
let targetPlainLen = ((probeJson.count + 256 + 63) / 64) * 64
let tocSealedLen = targetPlainLen + 28
let payloadBase = magic.count + 4 + tocSealedLen

var exactDict: [String: [Any]] = [:]
for (vp, roff, slen, mime) in records {
    exactDict[vp] = [payloadBase + roff, slen, mime]
}
var tocPlain = try JSONSerialization.data(withJSONObject: exactDict)
if tocPlain.count < targetPlainLen {
    tocPlain.append(Data(repeating: 0x20, count: targetPlainLen - tocPlain.count))
}
let tocSealed = try AES.GCM.seal(tocPlain, using: symKey).combined!

var outData = Data()
outData.reserveCapacity(payloadBase + relOffset)
outData.append(magic)
var leLen = UInt32(tocSealed.count).littleEndian
withUnsafeBytes(of: &leLen) { outData.append(contentsOf: $0) }
outData.append(tocSealed)
for blob in sealedBlobs {
    outData.append(blob)
}
try outData.write(to: URL(fileURLWithPath: payload.outputTmp), options: .atomic)
"""


def pack_with_swift_cryptokit(
    entries: List[Tuple[str, Path, str]],
    output_tmp: Path,
    key: bytes,
) -> bool:
    xcrun_bin = shutil.which("xcrun", path="/usr/bin:/bin:" + os.environ.get("PATH", ""))
    if not xcrun_bin:
        return False

    stdin_payload = json.dumps(
        {
            "keyHex": key.hex(),
            "outputTmp": str(output_tmp),
            "entries": [
                {"vpath": vpath, "absPath": str(fpath), "mime": mime}
                for vpath, fpath, mime in entries
            ],
        }
    ).encode("utf-8")

    proc = subprocess.run(
        [xcrun_bin, "swift", "-e", SWIFT_PACKER_SRC],
        input=stdin_payload,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"Swift CryptoKit AES-256-GCM packer failed: {err}")
    return True


NODE_VERIFIER_JS = r"""
const fs = require('node:fs');
const crypto = require('node:crypto');

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const key = Buffer.from(payload.keyHex, 'hex');
const pak = fs.readFileSync(payload.pakPath);

if (pak.length < 37 || pak[0] !== 0x41 || pak[1] !== 0x56 || pak[2] !== 0x53 || pak[3] !== 0x4b || pak[4] !== 0x01) {
  throw new Error('Invalid AVSK\\x01 header');
}

function openCombined(buf) {
  if (buf.length < 28) throw new Error('SealedBox too short');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(12, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

const tocLen = pak.readUInt32LE(5);
const tocPlain = openCombined(pak.subarray(9, 9 + tocLen));
const toc = JSON.parse(tocPlain.toString('utf8'));
const tocKeys = Object.keys(toc);
if (tocKeys.length !== payload.expected.length) {
  throw new Error(`TOC count mismatch: got ${tocKeys.length}, expected ${payload.expected.length}`);
}

for (const item of payload.expected) {
  const rec = toc[item.vpath];
  if (!Array.isArray(rec) || rec.length < 3) {
    throw new Error(`Missing TOC entry for ${item.vpath}`);
  }
  const [offset, length, mime] = rec;
  if (mime !== item.mime) {
    throw new Error(`MIME mismatch for ${item.vpath}: ${mime} !== ${item.mime}`);
  }
  const dec = openCombined(pak.subarray(offset, offset + length));
  const decSha = crypto.createHash('sha256').update(dec).digest('hex');
  const srcSha = crypto.createHash('sha256').update(fs.readFileSync(item.absPath)).digest('hex');
  if (decSha !== srcSha) {
    throw new Error(`SHA-256 mismatch for ${item.vpath}`);
  }
}
process.stdout.write(JSON.stringify({ verifiedFiles: tocKeys.length, pakBytes: pak.length }));
"""


def verify_pak_archive(
    pak_path: Path,
    entries: List[Tuple[str, Path, str]],
    key: bytes,
) -> Dict[str, int]:
    node_bin = find_node_binary()
    if node_bin:
        stdin_payload = json.dumps(
            {
                "keyHex": key.hex(),
                "pakPath": str(pak_path),
                "expected": [
                    {"vpath": vpath, "absPath": str(fpath), "mime": mime}
                    for vpath, fpath, mime in entries
                ],
            }
        ).encode("utf-8")
        proc = subprocess.run(
            [node_bin, "-e", NODE_VERIFIER_JS],
            input=stdin_payload,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.decode("utf-8", errors="replace").strip())
        return json.loads(proc.stdout.decode("utf-8"))

    # Pure-Python cryptography fallback if installed
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore

    aesgcm = AESGCM(key)
    pak = pak_path.read_bytes()
    if len(pak) < 37 or pak[:5] != MAGIC:
        raise RuntimeError("Invalid AVSK\\x01 header")
    (toc_len,) = struct.unpack("<I", pak[5:9])
    toc_box = pak[9 : 9 + toc_len]
    toc_plain = aesgcm.decrypt(toc_box[:12], toc_box[12:], None)
    toc = json.loads(toc_plain.decode("utf-8"))
    if len(toc) != len(entries):
        raise RuntimeError(f"TOC count mismatch: {len(toc)} != {len(entries)}")
    for vpath, fpath, mime in entries:
        offset, length, rec_mime = toc[vpath]
        if rec_mime != mime:
            raise RuntimeError(f"MIME mismatch on {vpath}")
        box = pak[offset : offset + length]
        dec = aesgcm.decrypt(box[:12], box[12:], None)
        if hashlib.sha256(dec).digest() != hashlib.sha256(fpath.read_bytes()).digest():
            raise RuntimeError(f"SHA-256 mismatch on {vpath}")
    return {"verifiedFiles": len(toc), "pakBytes": len(pak)}


def is_pak_up_to_date(pak_path: Path, max_input_mtime_ns: int) -> bool:
    try:
        st = pak_path.stat()
        if st.st_size <= 37 or st.st_mtime_ns < max_input_mtime_ns:
            return False
        with pak_path.open("rb") as fh:
            if fh.read(len(MAGIC)) != MAGIC:
                return False
        return True
    except OSError:
        return False


def purge_legacy_bundle_resources(res_dir: Path) -> None:
    """
    Removes any stale pre-vault raw game files (`index.html`, `style.css`, `manifest.json`,
    `src/`, `assets/`) left behind in incremental `.app` bundle build folders.
    Strictly guarded so it ONLY operates inside `.app` bundle directories, never on repo root.
    """
    resolved = res_dir.resolve()
    if resolved == REPO_ROOT.resolve() or ".app" not in str(resolved):
        return
    for legacy_file in ("index.html", "style.css", "manifest.json"):
        p = resolved / legacy_file
        if p.is_file() or p.is_symlink():
            p.unlink()
    for legacy_dir in ("src", "assets"):
        d = resolved / legacy_dir
        if d.is_symlink():
            d.unlink()
        elif d.is_dir():
            shutil.rmtree(d)


def main() -> int:
    t0 = time.perf_counter()
    parser = argparse.ArgumentParser(
        description="Pack Arcane vs. Steel runtime and assets into AES-256-GCM sanctum.pak."
    )
    parser.add_argument(
        "positional_output",
        nargs="?",
        default=None,
        help="Optional output path for sanctum.pak",
    )
    parser.add_argument(
        "-o",
        "--output",
        dest="output",
        default=None,
        help="Output path for sanctum.pak",
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Force re-packing even when sanctum.pak is newer than all inputs",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Decrypt and verify SHA-256 of every entry in sanctum.pak after packing",
    )
    args = parser.parse_args()

    out_str = args.output or args.positional_output
    output_path = Path(out_str).resolve() if out_str else resolve_default_output_path().resolve()
    purge_legacy_bundle_resources(output_path.parent)

    entries, max_input_mtime_ns = collect_vault_inputs()
    key = reconstruct_vault_key()

    if not args.force and is_pak_up_to_date(output_path, max_input_mtime_ns):
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        if args.verify:
            stats = verify_pak_archive(output_path, entries, key)
            total_ms = (time.perf_counter() - t0) * 1000.0
            print(
                f"[SanctumVault] Up-to-date & verified: {output_path} "
                f"({stats['verifiedFiles']} files, {stats['pakBytes']} bytes, {total_ms:.1f}ms)"
            )
            return 0
        print(
            f"[SanctumVault] Up-to-date: {output_path} "
            f"({len(entries)} files, fast-skipped in {elapsed_ms:.1f}ms)"
        )
        return 0

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_tmp = output_path.parent / f".{output_path.name}.{os.getpid()}.tmp"

    try:
        packed = (
            pack_with_node_crypto(entries, output_tmp, key)
            or pack_with_python_cryptography(entries, output_tmp, key)
            or pack_with_swift_cryptokit(entries, output_tmp, key)
        )
        if not packed:
            raise RuntimeError("No AES-256-GCM backend available (tried node:crypto, cryptography, swift CryptoKit)")
        os.replace(output_tmp, output_path)
    finally:
        if output_tmp.exists():
            try:
                output_tmp.unlink()
            except OSError:
                pass

    pak_size = output_path.stat().st_size
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    if args.verify:
        stats = verify_pak_archive(output_path, entries, key)
        total_ms = (time.perf_counter() - t0) * 1000.0
        print(
            f"[SanctumVault] Packed & SHA-256 verified {stats['verifiedFiles']} files -> {output_path} "
            f"({pak_size / (1024 * 1024):.2f} MB) in {total_ms:.1f}ms"
        )
    else:
        print(
            f"[SanctumVault] Packed {len(entries)} encrypted files -> {output_path} "
            f"({pak_size / (1024 * 1024):.2f} MB) in {elapsed_ms:.1f}ms"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
