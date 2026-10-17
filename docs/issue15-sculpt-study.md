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

## Baseline vs static sculpt candidate — measured second iteration

Exact run: https://github.com/cubitouch/Orcbands/actions/runs/39049757150
(original editable Blender file, textured GLB, 16 imported image textures,
one comparison HTML, 16 matching camera renders and Chromium screenshot).
Second-iteration GLB: 4,047,624 bytes, SHA-256
`e075708fa9fdb8d83b6fdff088cc954c6c387331cd80210ad9ad9831d0f62950`,
103 mesh objects and **96,416 imported triangles**. Do not mistake code
generator polygon count for actual exported triangle count.

Direct pixel inspection: outfit now has a more fitted textured apron rather
than the exposed-belly baseline; face looks sterner, bandana covers scalp,
visible fingers and metal axe profile. **Still stylized and far less polished**
than the original sculpted reference: face planes, shoulder masses, boots,
eyelids, and material wear remain relatively synthetic. A manual Blender
artist can replace pieces without disturbing the CI comparison contract.

Upon eventual owner-approved merge, the existing Asset Lab will gain a
separate opt-in `Textured sculpt study` button; the **Rigged beta default
is deliberately unchanged**. The GLB remains unrigged, so animation controls
disable in this mode. The deployment records its actual GLB SHA-256.

## Third iteration — directed soft-surface refinement

The next pass focuses on silhouette and material form rather than increasing
primitive ornamentation. The front apron is now a single curved, tapered
mesh with deliberate vertical drape folds, physical thickness, and an
asymmetric lower hem; one stitched repair patch provides workwear character.
The red headscarf is rebuilt as a continuous radially sampled cloth crown,
replacing stacked rigid circular band/cap forms. A softer folded brow welt,
rear fabric ties and cheek/temple creases add closer-reading detail. Organic
skin joints receive a denser voxel union and additional smoothing. Small axe
wear marks/wood grain are present in real geometry.

These are still scripted 3D geometry studies; the artist-quality benchmark and
all animation/Unity caveats remain. Compare *actual exported GLB renders* and
five-character RTS scale before deciding whether to preserve this pass.

## Pixel QA correction after v3 render

The third-pass exported GLB was built and rendered successfully, but actual
front and face-close pixels exposed a **chest/apron intersection** near the
upper bib and mismatched suspender anchor locations. This correction moves
the upper bib forward while keeping the hem closer to the body, aligns straps
with the upper bib edge, and adapts edge stitching to the new cloth surface.
This is a geometry correction, **not** automatic artistic approval.

## Rear turnaround correction

The prior GLB close inspection confirmed a major **rear panel vs torso
self-intersection**, even though front/RTS appeared acceptable. The rear apron
is now an actual curved, outward-fitted waist panel below visible upper-back
skin, with opposing crossed leather suspenders and low-back stitching.
The target is the four-view turnaround's crossed back harness, *not* an
armoured full-back vest. This will be reviewed from a real exported-GLB back
camera before any claim of improvement or owner approval.
