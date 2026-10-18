# Worker Orc CI and visual evidence

The current **static Worker Orc sculpt** lives in `art/worker_orc_sculpt_study.py`
(with `worker_orc_head.py` and `worker_orc_hands.py`). It is not the experimental
rigged character, and a green render job does not establish artistic acceptance.

## Automatic checks

- `validate-preview.yml` — basic geometry, syntax and browser scene smoke.
- `grip-visual-qa.yml` — for current sculpt, hand, head, renderer or viewer
  changes: export the editable Blender source and real GLB, render nine angles
  *from that exported GLB*, and capture the sculpt loaded in real Chromium
  WebGL. Artifact: `worker-orc-current-sculpt-review`.
- `verify-sculpt-versions.yml` — for viewer or sculpt-version builder changes:
  regenerate and smoke-test the separate historical #16/#17 stages and current
  sculpt. These milestones stay selectable in the Asset Lab.
- `blender-art-review.yml` and `rig-worker-orc.yml` — only run when their
  respective **legacy Blender vNext** or **experimental rig** inputs change.
  They no longer rebuild for unrelated current-sculpt or viewer-label edits.

## Historical workflows: manual only

`issue15-glb-review.yml` produces the original #15 baseline multi-angle
evidence, while `issue15-sculpt-study.yml` compares a pinned #18 snapshot
against the current sculpt. Both remain available via **Run workflow** in
Actions for explicit historical comparisons. Neither runs on every art PR.

The already-uploaded artifacts on prior PRs remain available according to
GitHub Actions' artifact-retention policy; they are not required for the new
current-sculpt acceptance path.

## Publishing

`deploy-preview.yml` only deploys on `main` (or manually). It builds the
current static sculpt as well as the historical selectable versions, and stamps
model hashes into the deployed Asset Lab. A successful PR check does not
deploy PR content. After merge, compare the live Pages revision and hashes
against the merged main commit.

**Not validated:** final art quality, skinned motion, Unity Humanoid import,
or five-instance game performance.
