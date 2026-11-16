"""Shrink the original PNG images WITHOUT changing a single pixel.

    py tools/compress-originals.py          # report + rewrite
    py tools/compress-originals.py --dry    # report only

For every PNG over 300 KB in assets/ (except the generated assets/opt/):
  • an alpha channel that is fully opaque is dropped (RGBA -> RGB: the
    picture is identical, a quarter of the data disappears)
  • the file is re-encoded with maximum zlib compression
The new file is decoded again and compared with the original pixel by pixel;
it replaces the original only if every pixel matches AND it is smaller.
JPEG files are left as they are (re-saving a JPEG always loses quality).

Needs Pillow + numpy (py -m pip install --user pillow numpy).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MIN_BYTES = 300 * 1024
Image.MAX_IMAGE_PIXELS = None


def pixels(im):
    """RGBA array; images without alpha get an opaque one, so RGB == opaque RGBA."""
    return np.asarray(im.convert("RGBA"))


def main():
    dry = "--dry" in sys.argv
    before = after = 0
    for src in sorted((ROOT / "assets").rglob("*")):
        if src.suffix.lower() != ".png" or not src.is_file() or "opt" in src.relative_to(ROOT / "assets").parts[:1]:
            continue
        size = src.stat().st_size
        if size < MIN_BYTES:
            continue
        rel = src.relative_to(ROOT).as_posix()
        with Image.open(src) as im:
            im.load()
            ref = pixels(im)
            out = im
            if im.mode == "RGBA" and (ref[..., 3] == 255).all():
                out = im.convert("RGB")
            elif im.mode not in ("RGB", "RGBA", "L", "LA", "P"):
                print(f"skip  {rel} (mode {im.mode})")
                continue
            tmp = src.with_suffix(".tmp.png")
            out.save(tmp, "PNG", optimize=True, compress_level=9)
        with Image.open(tmp) as chk:
            same = np.array_equal(pixels(chk), ref)
        new = tmp.stat().st_size
        before += size
        if same and new < size and not dry:
            tmp.replace(src)
            after += new
            verdict = "replaced"
        else:
            tmp.unlink()
            after += size if not dry else min(size, new)
            verdict = "kept (pixels differ!)" if not same else ("would replace" if dry and new < size else "kept")
        print(f"{size / 1048576:6.1f} MB -> {new / 1048576:6.1f} MB  {verdict:14}  {rel}")
    print(f"\nPNG total: {before / 1048576:.1f} MB -> {after / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
