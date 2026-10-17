# Worker Orc #15 — original static sculpt study

**This is a distinct editable 3D candidate**, not a refreshed render of the
previous procedural doll and not a completed #15 / production ready model.

Original artwork is available [in the owner's issue comment](https://github.com/cubitouch/Orcbands/issues/15#issuecomment-6236454614):
the third image is the primary four-view brown-apron Worker Orc.

Run:
```sh
blender -b -t 2 --python-exit-code 1 --python art/worker_orc_sculpt_study.py -- --output issue15-sculpt
```

Generates original editable `.blend`, glTF binary `.glb` containing UV-mapped
image albedo textures, and metrics. The original model source is
`art/worker_orc_sculpt_study.py`. No external asset licensing dependencies.

The static study deliberately uses different modelling from the earlier
primitive prototype: a detailed single facial surface with mathematically
carved brow/socket/nose/cheek/muzzle/jaw forms; custom swept limb surfaces,
a sculpted apron surface, articulated individual finger chains, fitted
suspenders and a manually outlined 3D forged axe head. The small repeating
image textures are baked into GLB as actual portable images. This is still
**code-directed modelling, not a manual artist sculpt**. It may remain below
the supplied painterly concept quality.

`.github/workflows/issue15-sculpt-study.yml` does not replace the site on
`main`; it creates actual exported-GLB side-by-side renders and a real
Chromium WebGL screenshot on the PR head. Download
`issue15-textured-sculpt-study` from the Actions run and open
`review/comparison.html` for before/after at identical views. Verify facial
expression, overall stance, correct clothing and gameplay distance before
approving as an advance. Rigging, real movement, mobile and Unity integration
remain explicitly deferred.

References can be viewed via the GitHub issue without requiring the original
binary PNGs to be duplicated in the repository; issue #15's explicit
**"inside repository"** checkbox remains unchecked until actual PNGs are
committed with the manifest checker.
