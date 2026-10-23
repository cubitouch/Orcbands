# Worker animations — supplied Mixamo clips

The worker uses the user's Idle, Walking and Standing Melee Attack Downward
FBXs. Their original bytes are stored privately in `Orcbands-PrivateAssets`, under
`Mixamo/Worker/` (the last file is named `Chopping.fbx`). No source FBXs, imported
animation curves, avatars or controllers are committed to the public repository.
Generated Unity assets remain in the ignored Generated directory. Source files
and their vendor content are never uploaded as public workflow artifacts.

## Controls

- Left-click the worker to select him.
- Right-click ground to walk there; he returns to idle on arrival.
- Right-click a tree trunk to approach it, face it and repeat the chopping motion.
- Right-click ground again to stop chopping and move.

This is an animation interaction. Trees remain standing and no wood is awarded;
resource harvesting, tree health and pathfinding are separate gameplay features.
Walking speed is 2.0 world units per second rather than the old unanimated
4.5-unit slide. The direct movement and terrain projection remain on the gameplay
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

The branch-scoped licensed review publishes a compiled Unity WebGL player before
running smoke/capture tests. `tools/capture-worker-animations.mjs` uses that actual
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

Rendered acceptance and any remaining retargeting limitations are recorded below
once the actual Unity build has been inspected.
