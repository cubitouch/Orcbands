"""Reproducibly publish the three sculpt milestones behind issue #15.

Milestones #16/#17 are pinned to *exact* original PR heads; the final hands
stage is generated from the checked-out source. This prevents all viewer
buttons from pointing at the same newest geometry. No third-party artwork
downloads, binary assets or mutable branches required at build time.

Usage:
    python3 tools/build-sculpt-versions.py --output preview/assets
Requires git + headless Blender. Invoke from repository root.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

STAGES = [
    {
        "id": "sculpt-v1",
        "name": "Textured sculpt — #16",
        "commit": "e1897aad03dde8f5f1ef95054ba86b7b8d8c5fe9",
        "files": ["worker_orc_sculpt_study.py"],
        "filename": "worker-orc-sculpt-v1.glb",
    },
    {
        "id": "sculpt-v2",
        "name": "Face sculpt — #17",
        "commit": "89dabbb28b2deab966e00ef75a013707a016d231",
        "files": ["worker_orc_sculpt_study.py", "worker_orc_head.py"],
        "filename": "worker-orc-sculpt-v2-head.glb",
    },
    {
        "id": "sculpt",
        "name": "Inward palms and left hatchet — #22",
        "commit": None,
        "files": ["worker_orc_sculpt_study.py", "worker_orc_head.py", "worker_orc_hands.py"],
        "filename": "worker-orc-sculpt-study.glb",
    },
]


def run(args):
    print("+", " ".join(str(a) for a in args), flush=True)
    subprocess.run(args, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("preview/assets"))
    parser.add_argument("--only", choices=[s["id"] for s in STAGES])
    opt = parser.parse_args()
    output = opt.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    results = {}
    with tempfile.TemporaryDirectory(prefix="orcbands-sculpt-stage-") as root:
        tmp = Path(root)
        for stage in STAGES:
            if opt.only and stage["id"] != opt.only:
                continue
            src = tmp / stage["id"] / "art"
            src.mkdir(parents=True, exist_ok=True)
            revision = stage["commit"]
            if revision:
                # GitHub explicitly supports fetching reachable SHA refs.
                # Keeping a real merge history in #16-18 preserves these commits.
                run(["git", "fetch", "--no-tags", "--depth=1", "origin", revision])
                for filename in stage["files"]:
                    body = subprocess.check_output(
                        ["git", "show", f"{revision}:art/{filename}"]
                    )
                    (src / filename).write_bytes(body)
            else:
                for filename in stage["files"]:
                    shutil.copy2(Path("art") / filename, src / filename)
            render = tmp / (stage["id"] + "-out")
            render.mkdir(parents=True, exist_ok=True)
            run(
                [
                    "blender",
                    "-b",
                    "-t",
                    "2",
                    "--python-exit-code",
                    "1",
                    "--python",
                    str(src / "worker_orc_sculpt_study.py"),
                    "--",
                    "--output",
                    str(render),
                ]
            )
            generated = render / "worker-orc-sculpt-study.glb"
            data = generated.read_bytes()
            assert len(data) > 100_000 and data[:4] == b"glTF", stage["id"]
            final = output / stage["filename"]
            shutil.copyfile(generated, final)
            results[stage["id"]] = {
                "name": stage["name"],
                "filename": stage["filename"],
                "source_revision": revision or subprocess.check_output(
                    ["git", "rev-parse", "HEAD"], text=True
                ).strip(),
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "skinned": False,
            }
            print("SCULPT_VERSION", json.dumps(results[stage["id"]]), flush=True)
    (output / "sculpt-versions.json").write_text(
        json.dumps(results, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
