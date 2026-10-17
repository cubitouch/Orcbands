# ART-01 — Worker Orc head candidate

Base: PR #16 at `e1897aad03dde8f5f1ef95054ba86b7b8d8c5fe9`.
Reference: owner’s [Worker Orc turnaround](https://github.com/cubitouch/Orcbands/issues/15#issuecomment-6236454614).

## Build and editable source

```sh
blender -b -t 4 --python-exit-code 1 --python art/worker_orc_sculpt_study.py -- --output art01-output
```

Produces the complete editable `worker-orc-sculpt-study.blend`, packed-image
`worker-orc-sculpt-study.glb`, and metrics. The Blender source contains editable
head geometry, eyelids, ears and tusks; no rig. All UVs and image textures are
packed. Facial pigmentation additionally uses portable vertex colors.

`worker_orc_head.py` is executed by the existing build. It authors a landmark
surface for the cranium, jaw and muzzle; unions the nasal cartilage and brows
at 0.007 voxel resolution; carves actual nostril cavities; then adds restrained
surface folds. Eyelid topology wraps the eyes. Ears have thickness and a concave
bowl. The `ART01_head` property excludes these pieces from the body's 0.020
voxel remesh. The neck overlaps the closed lower head. This is an authored mesh
construction workflow, **not a claim of manual Blender brush sculpting**.

## Visual assessment

The revised head has a fuller projecting mandible and lower lip, a coherent
mouth crease, smaller curved tusks, rounded cartilage ears, recessed eyes and
skin-colored brows blended into the skull. It removes the old dark strip brows,
floating nostril marks and several decorative crease tubes. The original
bandana is retained; the new cranium sits beneath it.

Remaining gap to the reference: the cheeks and nose still look simplified;
the face lacks the concept's subtle asymmetry, varied facial planes and painted
skin finish. The ears have a helix and bowl but not a fully developed antihelix.
The head is a static art candidate, not retopologized for deformation. Geometry
cost increased; no gameplay frame-time claim is made. Body/costume limitations
remain outside ART-01. Artistic acceptance is pending owner review.

## Evidence

The sculpt-study workflow compares the actual exported GLB against the pinned
PR #16 generator, under identical lighting and cameras. It uploads both full
character profiles, front, rear, face, face profiles, three-quarter upper body,
five-character RTS view, a Chromium screenshot, and the editable source/GLB.
Its artifact is `issue15-textured-sculpt-study`. Passing CI is not art approval.
