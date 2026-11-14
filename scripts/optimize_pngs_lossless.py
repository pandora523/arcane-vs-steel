#!/usr/bin/env python3
"""
100% Bit-Exact Lossless PNG Recompressor (`zlib` level 9 + adaptive PNG filter search).
- Leaves all 11 protected/roster champion `*_sheet.png` files completely untouched.
- Verifies SHA-256 of decoded RGBA pixel bytes BEFORE and AFTER recompression:
  overwrites ONLY when RGBA pixel bytes are 100.00% bit-identical AND file size strictly shrinks.
"""

import hashlib
import io
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPRITES_DIR = ROOT / "assets" / "sprites"

PROTECTED_CHAMPION_SHEETS = {
    "warrior_sheet.png",
    "mage_sheet.png",
    "archer_sheet.png",
    "priestess_sheet.png",
    "reaper_sheet.png",
    "chronomancer_sheet.png",
    "titan_sheet.png",
    "ronin_sheet.png",
    "valkyrie_sheet.png",
    "icemage_sheet.png",
    "android_sheet.png",
}


def rgba_sha256(img: Image.Image) -> str:
    return hashlib.sha256(img.convert("RGBA").tobytes()).hexdigest()


def main() -> None:
    total_before = 0
    total_after = 0
    optimized_count = 0

    for png_path in sorted(SPRITES_DIR.glob("*.png")):
        if png_path.name in PROTECTED_CHAMPION_SHEETS:
            continue
        raw_before = png_path.read_bytes()
        size_before = len(raw_before)
        total_before += size_before

        with Image.open(io.BytesIO(raw_before)) as im:
            orig_size = im.size
            orig_hash = rgba_sha256(im)
            buf = io.BytesIO()
            im.save(buf, format="PNG", optimize=True, compress_level=9)
            cand_bytes = buf.getvalue()

        if len(cand_bytes) < size_before:
            with Image.open(io.BytesIO(cand_bytes)) as check_im:
                if check_im.size != orig_size or rgba_sha256(check_im) != orig_hash:
                    raise RuntimeError(f"RGBA pixel mismatch on {png_path.name}; aborting!")
            png_path.write_bytes(cand_bytes)
            total_after += len(cand_bytes)
            optimized_count += 1
            saved_kb = (size_before - len(cand_bytes)) / 1024.0
            print(
                f"  [LOSSLESS] {png_path.name}: {size_before / 1024:.1f} KB -> "
                f"{len(cand_bytes) / 1024:.1f} KB (-{saved_kb:.1f} KB, SHA-256 RGBA verified)"
            )
        else:
            total_after += size_before

    saved_total_kb = (total_before - total_after) / 1024.0
    print(
        f"\nDone: {optimized_count} PNGs losslessly recompressed | "
        f"{total_before / (1024 * 1024):.2f} MB -> {total_after / (1024 * 1024):.2f} MB "
        f"(-{saved_total_kb:.1f} KB, 0 pixels altered)."
    )


if __name__ == "__main__":
    main()
