# ART-02 — relaxed worker hands

Based on ART-01 PR #17 at `89dabbb28b2deab966e00ef75a013707a016d231`.
Head and costume design are unchanged. No rig or animation is added.

`worker_orc_hands.py` builds each hand as an editable continuous skin mesh:
a tapered wrist and broad palm, four separately curved fingers of different
lengths, an opposed thumb and thenar pad. Fine voxel union retains the finger
webs; the `ART02_hand` tag excludes hands from the coarse body remesh. Joint
folds are displaced into the skin; nails are separate muted olive plates.
The wrist joins underneath the lowest cuff, with a small inward hand offset
to clear the existing axe. The hand is relaxed, not posed to grip that axe.

Build using the existing command:

```sh
blender -b -t 4 --python-exit-code 1 --python art/worker_orc_sculpt_study.py -- --output art02-output
```

Output: complete editable Blender character, GLB with packed textures, and
metrics. All geometry is original and reproducible. This is scripted mesh
authoring with visual iteration, not a claim of manual brush sculpting.

The sculpt-study workflow compares with pinned ART-01 using the same renderer.
Additional views `13-hand-front`, `14-hand-palm`, and `15-hand-thumb` inspect
both surfaces and the opposite hand. Existing full-character, profile, rear,
RTS and real Chromium captures remain included in the downloadable artifact.

Remaining limitations: stylized rather than fully anatomical palms; restrained
crease detail; no skin weighting, gripping pose, retopology, or performance
validation. Existing forearm/cuff clipping above the hand remains a separate
body/costume issue. Artistic acceptance requires visual review.
