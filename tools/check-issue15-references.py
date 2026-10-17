#!/usr/bin/env python3
"""Verify exact owner-provided Worker Orc concept PNGs (issue #15).

--require-all is the release gate. The default validates metadata and any
present files without failing this preparation-only PR for missing binaries.
No Pillow or external dependency is needed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "art" / "references" / "manifest.json"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-all", action="store_true")
    args = parser.parse_args()
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data["issue"] != 15 or len(data["references"]) != 3:
        raise ValueError("Unexpected reference manifest or number of originals")
    seen = set()
    missing = []
    for record in data["references"]:
        name = record["file"]
        if "/" in name or "\\" in name or name in seen:
            raise ValueError(f"Unsafe or duplicate reference file name: {name!r}")
        seen.add(name)
        path = MANIFEST.parent / name
        if not path.is_file():
            missing.append(name)
            continue
        content = path.read_bytes()
        if content[:8] != b"\x89PNG\r\n\x1a\n" or content[12:16] != b"IHDR":
            raise ValueError(f"Not a PNG: {name}")
        width, height = struct.unpack(">II", content[16:24])
        actual = (width, height, len(content), hashlib.sha256(content).hexdigest())
        expected = (
            record["width"], record["height"], record["bytes"], record["sha256"]
        )
        if actual != expected:
            raise ValueError(f"Reference changed: {name}; actual={actual}, expected={expected}")
        print(f"Verified {name}: {width}x{height}, {len(content)} B, SHA-256 {actual[3]}")
    if missing:
        print("Missing original image(s): " + ", ".join(missing), file=sys.stderr)
        if args.require_all:
            return 1
        print("Preparation mode: missing binary references do not fail yet.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
