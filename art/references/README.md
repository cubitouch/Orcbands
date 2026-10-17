# Issue #15: Worker Orc original references

The source of truth is the **actual three high-resolution images** listed in
[manifest.json](manifest.json), *not* the current procedural Blender character,
nor screenshots of another model. The project owner provided the three images
in ChatGPT on 2026-10-17. They are AI-generated **concept art**, not meshes,
UV maps, wireframes, topology guidance, or finished game assets.

The originals have been reviewed and cryptographically fingerprinted; their
binary bytes **are not yet in this Git branch**. The connected GitHub API can
write text but does not take the conversation's local binary attachments.
**Do not check off issue #15's "references inside repository" acceptance item
until the actual full-resolution PNGs are committed here.**

## Add originals

Unzip the owner-provided `Orcbands_issue15_original_art_refs.zip`. Copy all
three PNGs from `original-references/` into this directory without modifying
the filenames or recompressing the pixels. Then run:

```sh
python3 tools/check-issue15-references.py --require-all
git add art/references/*.png
```

The expected dimensions and SHA-256 digests are recorded in the manifest.
The fourth environment-art reference named by issue #15 was not among the
three attachments and remains an optional, separately verified input.

## Usage and rights

Art direction only. These AI concept renderings make no representation about
underlying editable topology, original 3D models, performance, or Unity
compatibility. Do not copy third-party meshes, textures or trademarked insignia
from other franchises. Obtain a separate redistribution license for any
external base sculpt; a commercial marketplace license may allow use inside a
game without authorizing public distribution of the *source asset* in this
open repository. Keep provenance for any third-party contribution.
