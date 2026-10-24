# Finite trees and immediate wood collection

Select the worker and right-click a standing tree. The worker routes to it and
chops. Each accepted downward strike removes one of its **12 wood** and adds
one to the **Wood** counter at the top left. The current tree's remaining amount
appears underneath. Collection is immediate in this increment; it has no hauling
or delivery requirement.

The final strike removes the standing canopy and its colliders, spawns the
existing stump art, clears the target marker and leaves the worker idle with
“Tree exhausted · choose another tree”. Another tree requires a new order.
A ground or different-tree order interrupts chopping immediately. Partial tree
amounts remain intact for the current session; returning to a tree resumes its
remaining supply. Exhausted trees cannot award more wood. Reloading starts a
fresh session at zero; regrowth and save/load are not included.

## Implementation

`WorkerHarvest` owns the swing cursor, exact resource award and counter.
It reads the actual licensed Animator at phase 0.39, then asks `TreeChopEffects`
to render feedback. Disabling visual effects cannot alter wood yields. Public
proxy builds use the same swing duration through a game-time clock so resource
play is available without the private assets. Both clocks skip catch-up bursts
when a frame crosses multiple loops. Frozen animation, review previews,
walking, idle and transitions cannot generate resource awards.

A depleted `WoodcuttingTarget` remains as the resource's identity and zero balance.
The static-batched canopy renderers/colliders turn off individually. A shared
stump mesh is instantiated only for exhausted trees, with the original tree's
scale and orientation. Its smaller solid footprint replaces the crown at the
same stable obstacle index; navigation rebuilds and existing routes notice its
revision. Other resource props retain their original state.

`ForestShadowMap` repairs only the felled tree's ground-shadow region using the
original Pine 01 triangle projection and contact-shading formula. It rerenders
standing neighbours into that region, so overlapping shadows survive. A small
stump contact shadow remains. The texture is cloned lazily on the first felling;
both the terrain and root patches share that live texture, including regenerated
mipmaps. Untouched texture regions stay intact. No per-tree Update components,
falling-tree physics or new asset dependency is introduced.

## Verification

Every Unity build executes resource exhaustion/overharvest checks, swing cursor
regressions and a comparison between the runtime shadow raster and the canonical
source PNG. It also retains the navigation regressions.

`tools/capture-finite-trees.mjs` runs against both real public and licensed WebGL
players. It verifies zero initial wood, no preview awards, interruption/resumption,
exact 12-wood depletion, stump/marker/idle state, released crown clearance,
shadow repair, a second tree's exact cumulative 24 wood, and desktop/portrait
counter captures. The existing strike-effects, navigation, RTS controls, music
and character checks remain enabled.

Manual acceptance:

1. Select the worker, order a tree and watch the wood count rise at axe impacts.
2. Interrupt halfway, then return. Its remaining wood must not reset.
3. Finish the tree. Check the stump, lighter ground, idle worker and final total.
4. Walk beside the stump through the former crown area; the stump stays solid.
5. Choose another tree and confirm the total accumulates. Reload to reset.
