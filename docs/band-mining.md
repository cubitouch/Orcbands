# Starting band, mining and cleared forest paths

The Unity camp starts with three distinct controllable orcs from the purchased Synty pack: worker, armored warrior and shaman. These are visual identities; all three can chop and mine, each with its own animated rig and right-hand tools. The other three band members are reserved for later recruitment; recruitment itself is not part of this increment.

- Click an orc to select it; Shift-click toggles additional members. Drag a box to select a group.
- Right-click ground to move the selected orcs. Group destinations are spaced apart.
- Right-click a standing tree to equip the axe and chop. Each tree still contains 12 wood.
- Right-click the tall harvestable stone outcrop near camp to equip the purchased Synty pickaxe and mine. It contains 24 stone shared by all miners. Small decorative rocks and the pre-existing depleted rock remain scenery.
- Resources enter the shared camp totals immediately. Each worker has an independent order and work position. The authored quarry initially has room for one miner from the camp side; clearing nearby trees opens more approaches. Extra workers reject safely when no separate reachable work position is available. After depletion, each assigned orc tries the nearest reachable resource of the same type within 6 metres of the depleted node. Occupied work spots and paths longer than 12 metres are skipped. If none is available the orc stops; explicit ground/resource orders always take over immediately.
- Felling removes the crown's selection colliders, repairs its shadow and rebuilds navigation immediately. Only the stump's narrow 0.265m core (scaled with the tree) remains solid; low roots do not reserve the old crown area. Clearing adjacent trees can open a new route.
- Saves now include all three orcs, selections, tools, orders, stone and partial/exhausted outcrops. Version 1 camps are validated and upgraded with two safely placed idle companions before the live world changes.

The pickaxe shares the existing right-hand socket and uses the existing overhead work swing; this increment does not require a new animation source. Public builds have original switchable proxy tools. Licensed models remain private.

Unit separation uses routes planned around other workers and swept separation checks. Idle orcs can move aside to nearby clear ground when they block a follower; gathering orders are not interrupted. A persistently occupied narrow route stops with feedback rather than letting units overlap; this is not a formation or crowd simulation.

## Manual acceptance

1. Start a new camp: worker, warrior and shaman (visibly different models), zero wood/stone, one equipped axe per orc. Check click, Shift-click, forward/reverse drag selection and spaced group movement.
2. Send a companion to the tall stone outcrop: only that orc moves; its axe switches to a pickaxe, it mines with strike feedback and stone rises as the outcrop supply falls.
3. Send another orc to a tree at the same time. Wood and stone rise independently. Swap the miner to a tree and verify the axe returns; ground orders interrupt collection.
4. Assign all three to the outcrop. They use separate work positions and never collect more than 24 total. Exhaustion shows the low depleted mesh. Miners continue at a nearby reachable outcrop if one exists; the current camp has one mineable outcrop, so they stop there.
5. Save during mixed work, load, then reload/Continue. Verify all positions, selections, tools, orders, balances and partial node supplies. Import an old v1 save; the original forest/wood survive and two companions are added.
6. Assign one tree in a cluster and let it deplete: the orc should move to a nearby reachable tree, keep its axe and continue. Interrupt with a ground order; work must stop. Save/load during the continued order and confirm it resumes at the new target.
7. Cut neighbouring trees at a choke point, then order a unit through the cleared gap. It should traverse the former crowns while avoiding the small stump cores. Save/reload and repeat the route.

## Automated coverage

`BandMiningChecks.Run` runs inside both Unity builds: distinct purchased models, per-character avatars/right-hand tools, nearby continuation/blocked/distant/exhausted-node guards, band/tool setup, distinct mining reservations, tool changes, finite supply, depleted art, save migration/overlap rejection, and a sealed tree choke that becomes a direct walking path after felling. `capture-band-mining.mjs` exercises actual pointer input, a companion mining, parallel wood/stone work, shared depletion, tool exclusivity and complete band save/load in both public and licensed browser players. Existing navigation, finite-tree, menu, camera and animation regressions remain enabled.
