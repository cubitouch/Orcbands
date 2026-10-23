# Worker resting pose and axe grip (ART-CHAR-04)

This documents the static pose foundation and its inspected ART-CHAR-04 captures.
With the supplied Mixamo pack, [worker animations](worker-animations.md) now take
ownership of the body Animator; the hand-local axe socket and finger grip remain.

## Owned configuration

`unity/Assets/Editor/WorkerRestProfile.asset` is the editable profile for the licensed
male goblin worker. It contains absolute bone-local Euler rotations for arms, wrists and right-hand fingers, the
`hand_r` socket position/rotation, a shaft grip point in imported axe coordinates,
and the calibrated axe length. All values are applied once during scene generation.
The vendor prefab, FBX, texture atlas and import settings are unchanged.

The hierarchy is gameplay Worker → ModelMount → licensed rig → hand_r →
Worker axe grip → original Synty axe. The socket uses hand-local coordinates;
no world-up attachment calculation or frame-based correction remains. The
shaft calibration uses the actual `Prop_Axe_01` orientation (+Y shaft), with an
explicit grip point on the lower wooden handle rather than the centre of its
blade-heavy bounding box. The palm offset and right-hand finger curl are tuned together in real WebGL renders.

The authored pose lowers both upper arms, slightly bends the elbows and keeps
spine, pelvis, head, legs and feet unchanged. Model Animators are disabled before
posing to prevent the imported bind pose overwriting it. The worker is fitted
to 2.0 units from baked posed character geometry, before adding the .85-unit axe.
This fitting happens during scene generation only. The independent selection
capsule remains 2.10 units and the selection ring is unchanged.

## Animation handoff

When introducing licensed or original idle/work/walk clips, give the model's
Animator an appropriate avatar/controller, enable it, and keep `applyRootMotion`
false. The gameplay Worker root continues to own movement, facing and terrain
alignment. Replace or skip `WorkerRestProfile.Apply` during generation if a
controller should own the initial pose. There is no Update/LateUpdate writer to
fight the Animator. Keep the axe socket under `hand_r`; tune a clip's wrist/finger
pose to that socket instead of reattaching or fitting the axe each frame. Retain
the authored model-mount scale and ground offset; do not refit animated bounds.
The static resting pose provides no gait or harvesting motion.

## Reproduce visual review

The branch-scoped `Worker Axe and Rest Pose Licensed Review` push workflow builds
this same-repository integration branch with the private pack, without merging or
deploying it. It never uploads vendor source or an imported Unity Library. Ordinary
PR builds continue to use the original public proxy without private assets.

The existing WebGL capture script includes `worker-front`, `worker-side` and
`worker-three-quarter` (beside the campfire), plus normal selected and moved
screenshots. Movement is exercised with real left/right pointer inputs. The
follow-up moved close view preserves the new location and facing. Capture reports
check ground alignment and, for licensed builds, the hand-local socket and weapon
orientation after turning. Existing smoke checks cover boot, distant-background
stability, fire motion and fog toggling. Images still require visual inspection:
mathematical socket invariance cannot prove that a handle looks grasped.

Inspect the front/profile views for palm contact, shaft direction, blade clearance
and finger silhouette; inspect the camp view for shadows and lighting integration;
inspect selected/moved views for RTS readability and terrain contact. An open,
low-poly hand may require a controlled shaft intersection or authored finger pose.
Human visual approval is required before merging.

### Interactive calibration in the actual Unity player

For art iteration only, `window.orcbandsTuneWorker({gripPosition, gripEuler,
bones: [{name, euler}]})` changes the worker socket and named local bone rotations
on explicit request. `gripPosition`, `gripEuler` and each `euler` are `{x,y,z}`
objects. This command runs once; it does not fit bounds or change vendor assets.
It is separate from normal gameplay and cannot write the owned source profile.
Copy accepted calibration values into `WorkerRestProfile.asset`, regenerate and
validate the untouched default player before accepting screenshots as evidence.

## Inspected result — 23 October 2026

Tested implementation: `20b0038133902a1becc4557f5c3b7be959ee4b93`.
[Licensed Unity build and regression capture](https://github.com/cubitouch/Orcbands/actions/runs/39935247764) passed.
The first three screenshots below are higher-resolution captures from the untouched
compiled player; no interactive tuning was applied. Selected/moved views and
`capture.json` are the matching CI captures. All images use actual Unity WebGL.

| Required view | Evidence |
| --- | --- |
| Front | [Worker and grip](reviews/worker-rest-pose/worker-front.png) |
| Profile | [Handle and blade clearance](reviews/worker-rest-pose/worker-side.png) |
| Campfire three-quarter | [Resting stance](reviews/worker-rest-pose/worker-three-quarter.png) |
| RTS selected | [Normal camera and selection ring](reviews/worker-rest-pose/selected.png) |
| Moved and turned | [Close view after real pointer movement](reviews/worker-rest-pose/worker-moved.png) |

The movement capture records 2.035 units travelled, a changed facing, zero root
ground error, unchanged hand-local grip position, correct weapon rotation with
facing, and no browser errors. Selection, right-click movement, zoomed-out
selection, camera orbit/pan/zoom/reset and the existing smoke checks pass. The
smoke checks exercise fire motion, fog toggling and stable distant forest lighting.
Visual inspection found the handle against/through the gripping area, a blade
clear of the arm and legs, planted feet, camp-lit shadows and visible smoke/sparks
without rectangular lighting artifacts. The 2.0-unit height and 2.10-unit selection
capsule are retained; no commercial source files are added to the public tree.

Limitations: the vendor hand remains a coarse, mitten-like low-poly shape; the
shaft uses a small controlled overlap rather than an anatomical finger wrap. The
pose is static while moving; no walking/breathing clips are included. Desktop
player execution was not tested in this task; the compiled WebGL player uses the
same shared presentation code. Human visual approval remains pending.
