# Issue #15 — Worker Orc art-direction brief & production gates

**Status: art specification / baseline tooling only; no candidate sculpt has been
approved or shipped.** This document does not claim completion of issue #15.

## Source hierarchy

1. **P0 identity — `Fiche de personnage : Orque bûcheron 3D.png`.**
   Front/left/back/right turnaround, large face, idle, walk and woodchop.
2. **P1 craft — `Planche de présentation des orcs artisans.png`.**
   Face expressions, hand/tool details, posed work and worker vs lumber variants.
3. **P1 context — `Présentation de personnages orcs en 3D.png`.**
   Forest crash-site village in angled RTS lighting, two distinct workers at
   approximately the same scale, readable working actions and muted palettes.
4. Environment-only `Campement orc forestier stylisé.png` is referenced by
   the issue but was **not** among the three owner uploads reviewed here.

The three actual originals are fingerprinted in
[`art/references/manifest.json`](../art/references/manifest.json); the binary
files must still be added before that issue acceptance item can pass.
These reference sheets are concept illustrations, **not proof of a mesh**.

## Ranked visual specification (compare against the *exported GLB*)

| Priority | Area | Required visual difference from current procedural asset |
| --- | --- | --- |
| P0 | Readable overall silhouette | Broad trapezoid upper body, neck integrated into shoulders, heavy forearms, big planted boots, comparatively compact waist. No capsule/doll look. |
| P0 | Face as recognisable character | Low, expressive heavy brows, inset eyes, planar nose and cheeks, broad compressed muzzle and asymmetric lower tusks; fleshy sculpted transitions and credible ear thickness. Red tied bandana with cloth folds, not a sphere stacked over head. |
| P0 | Anatomical continuity | Shoulder → upper arm → elbow → forearm volumes flow continuously. Hands have palms, finger joints and a believable tool grip; avoid intersections and floating decorations. |
| P0 | Worker identity | Earth-brown **fitted leather apron/tunic** over dark trousers, dual stitched suspenders, wide belt and rectangular buckle, accessible tool pouches, red headscarf. Do not replace with combat armour or oversized loincloth. |
| P1 | Material identity | Olive/yellow-green skin with restrained mottling, creases/scars and color variation; leather grain/worn edges/stitching; thick woven cloth; rough forged metal; textured wooden handle. Real UV-mapped portable images, not procedural-only studio shading. |
| P1 | Gear | Compact, worn wood axe with believable head thickness, edge wear, sturdy wrapped haft and working grip; straps, pouches and belt visually fitted to body. |
| P1 | Expression & pose | Determined, slightly grumpy default. Leg/arm masses read from isometric height; idle stance stable, knees able to flex; axe swing has room for deformation. |
| P2 | Fine details | Buckle rivets, stitches, scars, boot straps, shirt patches and ornamental marks. These should **support** readable forms rather than hide poor forms. |

Reference #1 is a relatively practical brown-apron worker; the showcase images
include elaborate red faction gear. **Do not collapse those into one over-armoured
hero:** prioritize the simple red headscarf, brown apron and tools for Worker 001.
Use the more decorated gear for a later lumber-variant if helpful.

## Production route

**Preferred:** original sculpt, preferably an artist using Blender Sculpt or
Nomad Sculpt, followed by retopology, manual UV layout, PBR texture authoring
and controlled baking. A licensed external base is acceptable only if its
actual delivered mesh is visually inspected first and its license explicitly
permits modification and the intended public redistributions. The CC0
low-poly/goblin route and further sphere/cylinder embellishments have already
failed to reach the visual bar.

Stage A — **Static sculpt gate**. Author substantial organic head/torso/arm
meshes with coherent proportions, fit clothing, and produce Blender source,
UV-mapped portable textures and an actual exported GLB. Photograph/render at
front, profile, back, 3/4, face, gear and five-unit RTS distance. A blind
side-by-side versus the current asset must be *immediately* distinguishable.

Stage B — **Portable material gate**. Blender and WebGL must agree under
comparable, not flattering, light. Record ALBEDO color space, metal/roughness
and optional normal map, texture dimensions, UV seams and draw calls. A 4K
map is not justified by a character occupying ~100px in RTS framing.

Stage C — **Rigging only after A passes**. Rebuild/reweight appropriate bones,
test shoulders/elbows/wrists/hips/knees, idle/walk/chop/carry-with-prop,
check grip and apron collision. A connected skeleton and successful GLB parse
are not evidence of acceptable deformation. Unity Humanoid only if tested in
Unity.

Stage D — **Desktop acceptance**. Test 3–5 actors at default angled camera,
profile + facial closeup, pose extrema and real Chromium/WebGL. Record source
commit, actual GLB hashes/byte sizes, textures, mesh count and triangle count.
No silent replacement on `main` if a reviewer cannot spot significant quality
gain at gameplay distance.

## How to use this review gate

```sh
# Requires Blender CLI (GitHub Actions also runs this)
mkdir -p /tmp/orcbands-base /tmp/issue15-review
blender -b -t 2 --python-exit-code 1 --python art/worker_orc_vnext.py -- \
  --output /tmp/orcbands-base --export-only
blender -b -t 2 --python-exit-code 1 --python art/render_issue15_glb.py -- \
  --baseline /tmp/orcbands-base/worker-orc-vnext.glb \
  --output /tmp/issue15-review
# Once a legitimate candidate exists, add:
# --candidate art/candidate/worker-orc-candidate.glb
```

The reviewer imports **actual GLBs** into a fresh Blender scene, not their
authoring-source meshes, and renders both from fixed identical physical cameras.
The `issue15-review/` CI artifact contains the baseline PNGs and GLB metrics;
the existing browser smoke captures the same baseline in real Chromium WebGL.
Do not interpret an automatic green check or a generated HTML comparison as
human approval of artistic quality.

### What is still unavailable

The original reference PNGs have not been checked into the branch by the GitHub
text-only connector; the owner can add them from the matching ZIP. More
importantly, no sculpt-quality model matching them exists yet. An automated
modeling script or AI-derived illustration **is not** a substitute for the
sculpt/retopo/material work described above. Estimated specialized artist
effort is several working days to a few weeks depending on revision count,
texture finish, and animation scope; commission scope must be bid from the
real references rather than treating any estimate as a guarantee.


## Direct baseline pixel inspection (real CI artifacts)

Inspected Blender baseline GLB imports and the matching browser screenshot from
[exact-head #15 review run](https://github.com/cubitouch/Orcbands/actions/runs/39042483402).
The reference artwork's thick cloth folds, eyelid anatomy, angular lower jaw,
olive skin variations and fitted apron were compared against **actual model
pixels**, not just source-code descriptions.

Observed, still-unacceptable discrepancies:

- **Face:** flattened simple nostrils/muzzle with very shallow eye sockets,
  segmented broad eyebrow pieces, large separately apparent tusk elements and
  a thin rigid halo-like red headband in place of tied textured fabric.
- **Body:** abrupt shoulder/upper-arm cylinder transitions, glove/mitten-like
  finger silhouettes, insufficient neck/torso sculpting and simple boot shapes.
- **Clothing:** mostly rigid hanging panels, bare torso/exposed green abdomen,
  asymmetrical single shoulder pad, rounded gear blobs; the reference's
  continuous fitted leather apron and layered stitching are not present.
- **Axe:** basic flat jagged geometric head instead of an authored forged-metal
  cutting head with visible thickness, edge wear and convincing handle wrap.
- **RTS:** five *real instances* are recognizable as orcs but still read like
  identical blocky toys beside the cohesive sculpted reference workers.
- **Materials:** exported GLB contains **zero image textures**. Its color
  relies on 18 material slots / vertex color, rather than authored UV-mapped
  skin/leather/cloth/metal textures and baked relief.

Recorded from `issue15-review/baseline/glb-metrics.json` on the exact candidate
review workflow: **131 mesh objects, 94,416 imported/triangulated triangles,
18 Blender material names, 0 image textures, 2,239,104-byte GLB**, SHA-256
`7678338bd25606fdc0947c324ab2a4cb10b0579369f30b142d1b5f8b9887b132`.
These are baseline evidence measurements, **not candidate budgets** and not an
art-quality pass. The other historical pipeline's `model-info.json` reported
43,187 *mesh polygons* while labeling that figure "triangles"; for review,
use actual triangulated-face counts from the imported GLB.

Full-size evidence is attached as workflow artifact
`issue15-exported-glb-review`: front, left, back, right, 3/4, face, hands,
five actor RTS, actual Chromium WebGL and machine-readable metrics.
