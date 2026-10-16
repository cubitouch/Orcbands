# Orcbands Asset Lab

The [Asset Lab](../preview/index.html) is a **real interactive Three.js viewer** for
original, procedurally generated 3D assets. It does not require a Unity account or
a local Unity installation.

## Play with it

Once GitHub Pages is enabled for this public repository (Settings → Pages →
Build and deployment → Source: **GitHub Actions**), the deployed URL is:

https://cubitouch.github.io/Orcbands/

The default site is the original low-poly **Worker Orc 001**. Drag to rotate,
pinch or scroll to zoom, and choose Idle, Walk or Chop. These are articulated
rigid-part previews, **not** skinned Humanoid animations or verified Unity
animations yet.

If GitHub Pages is not available, use the Actions artifacts from the validation
workflow, or open the site locally over HTTP.

## Regenerate the real meshes

```sh
node tools/generate-orc.mjs
node tools/validate-orc.mjs
python3 -m http.server 8000 --directory preview
```

Open http://localhost:8000/ .

Asset sources are `preview/assets/orc-worker.obj` and its `.mtl` materials.
All geometry is original and algorithmically generated, with six articulated
sections. No Asset Store content has been copied into this repository.

## Unity import (later)

Unity can import the OBJ mesh, but the prototype lacks skin weights, an FBX
skeleton, and a validated Humanoid Avatar. It is **not** ready for Unity's
Humanoid animation retargeting. The next modeling milestone is a skinned,
rigged version with named humanoid bones, verified in Unity.

## CI and deployment

The validation workflow checks syntax, geometry, and bit-for-bit reproducibility.
After the preview branch merges, GitHub Actions publishes the `preview/`
directory to GitHub Pages on every main-branch preview change. GitHub Pages
needs to be configured with **GitHub Actions** as its deployment source.
