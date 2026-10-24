# Worker animations — supplied Mixamo clips

The worker uses the user's Idle, replacement Walking (1), and Standing Melee Attack Downward
FBXs. Their original bytes are stored privately in `Orcbands-PrivateAssets`, under
`Mixamo/Worker/` (the last file is named `Chopping.fbx`). No source FBXs, imported
animation curves, avatars or controllers are committed to the public repository.
Generated Unity assets remain in the ignored Generated directory. Source files
and their vendor content are never uploaded as public workflow artifacts.

The replacement upload is stored at the existing `Walking.fbx` path with its
original GUID retained. Its Git blob is `a7231786bc6cc578b85a06f7013bf93e9c0eb359`
and SHA-256 is `f4f1e827ce7dbc825417e432cb394cceb601adc35227ec42358fe94e4a107437`.
The replacement has different FBX metadata, but all 1,575 parsed animation-key
arrays (times, values and tangent attributes) match the previous upload. It is
the requested new file; it does not provide a visibly different gait.

## Controls

- Left-click the worker to select him.
- Right-click ground to walk there; he returns to idle on arrival.
- Right-click any visible part of a tree (trunk or canopy) to command it. An amber
  ring marks the tree while the worker walks to its work position, faces the
  trunk, and repeats the chopping motion only after arrival.
- Right-click another tree to retarget, or ground to cancel the tree command and
  move. The tree marker clears on a ground command.

This is an animation interaction. Trees remain standing and no wood is awarded;
resource harvesting, tree health and pathfinding are separate gameplay features.
Walking speed is 3.0 world units per second, with the clip playing at 1.5×. The direct movement and terrain projection remain on the gameplay
root, with the original selection collider and ring.

## Retargeting and source boundaries

`WorkerAnimationFactory` creates an owned humanoid body avatar from a detached
reference instance of the untouched Synty worker, using explicit named body-bone
mapping. It validates the result as a valid humanoid avatar. It does not change
Synty's imported avatar, FBX metadata, mesh, atlas or prefab.

The target humanoid map omits optional finger mappings, retaining the coarse
Synty hand's authored tool grip. The axe stays under the existing `hand_r` socket;
no world-space position or bounds calculation follows the weapon each frame.

Each Mixamo file is imported as humanoid. The longest real take is selected,
avoiding the empty `Take 001` also present in the downloads. Idle and walking
loop with pose blending; chopping repeats its full strike/recovery without a
loop-pose smear. Horizontal travel is extracted from the source motion and
`applyRootMotion` remains false, so clips cannot move the gameplay root.
The controller contains only Idle, Walking and Chopping and crosses between them
on gameplay state changes. No procedural gait or runtime body-pose writer is used.
The character keeps the established model-mount scale and ground offset; it is
not resized or refitted from animated bounds.

## Builds and visual review

Trusted builds restore both `Synty/` and `Mixamo/` from the private asset repository.
Incomplete private source fails a trusted build. Normal public PR jobs receive
neither pack and retain the original selectable/movable proxy. Private imported
Unity Library data is never cached or uploaded.

The opt-in **Licensed Unity PR Visual Review** workflow publishes a compiled
Unity WebGL player before running smoke/capture tests. A maintainer requests it
by adding the `unity-visual-review` label to an open, same-repository PR targeting
`main`. The label reruns review on subsequent PR updates; remove it when review
is complete. Fork PRs cannot run this licensed job. Ordinary public PR builds
continue to use the proxy without private assets.

Deployment on `main` builds the licensed player, checks hosting format and runs
the existing browser smoke checks (boot, browser errors, stationary lighting,
fire motion and fog/camera diagnostics). It uploads `orcbands-unity-deploy-smoke`
and the playable build, then deploys. It does not run the full character capture
matrix or record Idle/Walking/Chopping videos. Manual main-branch starter builds
also skip the character review matrix. PR-only validation retains those captures.

`tools/capture-worker-animations.mjs` uses that actual
player and records WebM plus sampled frames for all three motions. Its checks
cover live skeleton movement, fixed root during clip-only previews, disabled root
motion, hand-local socket invariance, tree approach and chopping, ground-command
interruption, and idle on arrival. The existing smoke suite still covers forest
lighting stability, fire motion and fog/camera interactions.

For isolated art review, `window.orcbandsAnimationPreview('Idle'|'Walking'|'Chopping')`
explicitly previews a motion, and `'Gameplay'` returns ownership to the movement
commands. The ordinary controller never enters these review overrides on its own.
The static rest profile remains the fallback when licensed model assets are
available locally without the optional animation pack.

## Chopping cadence and fire-lit character stability

Chopping plays at an authored state speed of **1.5**: the 2.267-second source
cycle takes about **1.51 seconds** in game. Idle remains at 1.0; walking is now 1.5, and root
movement speed stays independent of clip playback. No source FBX is modified.

The character matte shader combines the sun/ambient and the five authored
unshadowed firelights in one colour pass (`noforwardadd novertexlights`). This
avoids repeatedly drawing the animated skin against the base depth for each
point light. It targets the fire-facing stipple/flicker reported in WebGL while
retaining the atlas, hard normals, directional shadow receiving/casting and
existing fog/grade. The separate forest materials and real scene lights retain
their existing rendering. The earlier diagnostic shadow-bias change is not part
of the final approach.

`CampCharacterLighting` binds the existing five Light components' positions,
ranges, colours and intensities once on startup. The character shader evaluates
a smooth bounded diffuse falloff from those values; this approximates Unity's
point-light attenuation rather than changing the purchased art. Call `Refresh`
when a future feature changes those stationary sources. There is no per-frame
bounds fitting, grip adjustment, or animation-owned root travel.

For an identical-pose diagnostic, `window.orcbandsShadowReview({...})` can freeze
a chopping pose, adjust sun bias, disable sun shadows, or disable the firelights.
Use `normalBias`, `bias`, `pose` (normalised clip time), `freeze`, `disableShadows`
and `disableFirelights`. These are explicit review operations, not gameplay
updates; restore both light switches and use the Gameplay animation preview when
finished. Only opt-in PR visual review records videos.

## Tree command update — 23 October 2026

Tested implementation: `c13b2e1c95134e352c4fc33e95e0ab3be8a7b420`.
Private source revision: `64f757cb32c0f62bb066890e1f90577a008e6010`.
That review verified the replacement walking blob before building.

Trees use static colliders from their actual mesh rather than a narrow capsule
around the trunk. Clicking foliage therefore commands the visible tree instead
of accidentally issuing a ground move behind it. A reusable amber command ring
marks the tree throughout the approach and chopping. Changing to another tree
replaces the pending target; a ground command or review reset clears it. Ring
position is projected to terrain when a command changes, without a per-frame
bounds fit or raycast. The worker selection ring and collider are unchanged.

[The licensed Unity build and real-pointer regression passed](https://github.com/cubitouch/Orcbands/actions/runs/39993207200).
[The public proxy WebGL build/capture suite also passed](https://github.com/cubitouch/Orcbands/actions/runs/39993213310)
with private checkout skipped, alongside [Forest Asset Lab validation](https://github.com/cubitouch/Orcbands/actions/runs/39993213318).
The evidence-only follow-up commit does not change the tested implementation.
The recorded command targets Pine 017 through its visible canopy. The worker is
Walking at 5.826 units away, stops at the configured 1.25-unit work distance, and
then enters Chopping with movement stopped and the marker still active. A ground
command changes to Walking, clears both the tree target and marker, and reaches
Idle on arrival. Terrain error is zero throughout; the report records no browser
errors. Live skeleton motion, disabled root motion, stationary chopping and the
unchanged hand-local axe socket all pass. An additional local pointer check on
the same compiled player offsets the canopy click by eight pixels away from the
trunk, then retargets Pine 017 to Pine 030 before issuing a ground cancellation;
the target and marker update correctly ([trace](reviews/worker-tree-command/edge-retarget-report.json)).

| Evidence from the actual compiled Unity WebGL player | Capture |
| --- | --- |
| Supplied replacement walking file | [MP4](reviews/worker-tree-command/walking.mp4), [frame](reviews/worker-tree-command/walking.png) |
| Pointer command, approach and chopping at RTS distance | [MP4](reviews/worker-tree-command/tree-command.mp4), [approach](reviews/worker-tree-command/tree-approach.png), [arrival](reviews/worker-tree-command/tree-arrived.png) |
| Chopping beside the targeted tree | [MP4](reviews/worker-tree-command/tree-chopping.mp4), [close frame](reviews/worker-tree-command/tree-chopping.png) |
| CI interaction and motion measurements | [JSON](reviews/worker-tree-command/animation-report.json) |

The recordings and sampled frames were visually inspected. The amber marker is
visible at RTS distance, the worker faces the tree on arrival, and the axe stays
in the right hand. Low pine branches still partly obscure the tool and body in
close views; foliage and tree geometry have not been redesigned. These are
unmodified-motion excerpts of the real WebGL recording, cropped to the canvas.
There is no new harvesting economy, tree damage/felling, synchronized hit effect,
or obstacle pathfinding. The supplied replacement has the same motion curves as
the previous walking file, as documented above. Desktop execution is untested.

## Previous animation integration evidence — 23 October 2026

Tested implementation: `0d4929745d0cb96fe57bb3fa4a9bf49e5f0cb0ca`.
The final evidence/documentation commit does not change that implementation.

| Check | Result |
| --- | --- |
| [Licensed Unity WebGL build and interaction regression](https://github.com/cubitouch/Orcbands/actions/runs/39948595606) | Passed |
| [Public proxy Unity WebGL build and smoke/capture tests](https://github.com/cubitouch/Orcbands/actions/runs/39948603184) | Passed; private checkout skipped |
| [Forest Asset Lab validation](https://github.com/cubitouch/Orcbands/actions/runs/39948603185) | Passed |
| Local execution of the animation regression against the same compiled player | Passed |
| Original uploaded FBX bytes versus private repository Git blob hashes | Identical for all three files |

Idle (16.633 seconds), Walking (1.033 seconds) and Chopping (2.267 seconds) all
import as humanoid clips. The actual Unity renderer and sampled skeleton reports
show live movement for each motion, a stationary gameplay root during clip-only
previews, root motion off, and unchanged hand-local grip position/rotation. The
pointer-driven run records Walking to Pine 017, Chopping there, Walking after a
new ground command, and Idle on arrival. Root-to-terrain error is zero in the
recorded interaction reports. No browser errors were recorded.

| Motion | Real Unity capture | Inspected frame |
| --- | --- | --- |
| Idle | [Short MP4](reviews/worker-animations/idle.mp4) | [Frame](reviews/worker-animations/idle.png) |
| Walking | [Short MP4](reviews/worker-animations/walking.mp4) | [Frame](reviews/worker-animations/walking.png) |
| Chopping | [Short MP4](reviews/worker-animations/chopping.mp4) | [Frame](reviews/worker-animations/chopping.png) |

The short MP4s are cropped, unmodified-motion segments from a recording of the
actual compiled WebGL player, previewing each state in place beside the campfire.
They use no AI imagery or alternative renderer. The complete CI artifact also
contains the full interaction recording, per-motion frames and
[the sampled regression report](reviews/worker-animations/animation-report.json).
Software-rendered capture timing is not a native GPU performance measurement.

The [actual tree interaction](reviews/worker-animations/tree-chopping.png) and
[return to idle](reviews/worker-animations/returned-idle.png) were inspected.
Body motion is retargeted to the original proportions, the axe stays in the
right hand, feet contact the terrain and existing camp light/shadows, fog,
smoke and sparks remain present without rectangular lighting artifacts.

### Limits

- Chopping is the supplied full-body downward melee motion, repeated as a work
  action. There is no tree damage, felling, wood reward or synchronized impact FX.
- The vendor hand retains its coarse mitten-like shape and controlled shaft
  overlap. No new mesh sculpting or two-hand weapon IK is introduced.
- Close views at a tree can be obscured by the existing low pine canopy; the
  clearing previews make the full motion visible for review.
- Desktop execution was not tested; WebGL builds exercise the shared animation
  and controller code. The PR remains a draft for human visual approval.


### Brisk walking and carry correction

Travel is now 3.0 units/second; the Walking state plays at 1.5×, matching
that 50% increase. Idle stays at 1× and Chopping stays at 1.5×. Root motion
remains off. `WorkerCarryPose`, on the Animator object, uses the base layer's
IK pass to move the animated right-hand goal slightly outward and rotate the
wrist during Walking only. Its editable `HandOffset` (metres in character
space) and `HandEuler` (relative to the animated hand) preserve the existing
hand-parented axe socket. The weight follows state transitions; idle and chopping
receive no correction. Future carrying clips can disable `CorrectionEnabled`.
No vendor FBX, rig or grip profile was edited.

`orcbandsCarryReview({handOffset:{x:.22,y:0,z:.06},handEuler:{x:0,y:35,z:0},
freeze:true,pose:.25,mode:'Walking',disable:false})` is an explicit WebGL
calibration hook. Restore the authored values, then use the Gameplay preview
to release the frozen pose. It never runs automatically during gameplay.

Tree work positions now stop outside each scaled Pine 01 crown: its authored
1.36m radius × overall scale × crown-width variant, plus .65m for the worker
body and a small visual margin. `WoodcuttingTarget.CrownRadius` and
`WorkerClearance` remain editable. This avoids the former fixed 1.25m stop
inside low branches. It is a target-specific stop distance; movement still
travels directly and does not avoid other obstacles until pathfinding lands.

Work positions also test a deterministic 15-degree fan around the tree, choosing
the nearest endpoint outside existing camp resource/hut/fire/torch footprints
and other tree colliders. This avoids placing the worker in Pine 017's food
baskets when moving the stop away from its branches. These footprint checks
only choose the endpoint; they do not route or collide the moving worker.
If the entire work circle is blocked, the original radial point is the fallback.
