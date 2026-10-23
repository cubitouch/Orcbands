# Worker resting pose and axe grip (ART-CHAR-04)

## Owned configuration

`unity/Assets/Editor/WorkerRestProfile.asset` is the editable profile for the licensed
male goblin worker. It contains absolute bone-local Euler rotations for arms, wrists and right-hand grip, the
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
