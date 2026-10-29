# Worker collision and navigation

Workers now plan routes around tree crowns, the hut, shelter, construction frame,
stockpiles, bushes, fire/torch footprints, medium/large rocks and solid woodland
props. The visual layout is unchanged. These footprints are exported from the
same seeded placements as the rendered forest, including its reflected X axis.

Select the worker and right-click ground as before. Clear ground is reached
exactly when the destination is unoccupied. Group orders receive spaced goals; occupied destinations resolve to nearby separate slots. A click inside scenery resolves to the closest clear grid point within
four metres; if that point cannot be reached, the command is rejected. Destinations
outside the map clamp to its boundary with body clearance. A short on-screen
message explains an adjusted or rejected command. Rejection cancels the previous
order, removes the tree marker and leaves the worker idle.

Right-clicking a tree searches its 24 existing work-circle positions in one
navigation search. Only reachable, clear positions are accepted. The worker
stops outside the low branches at the established stand-off, faces the trunk and
chops. A new ground/tree command replaces the route immediately. No blocked
fallback work position is used.

## Implementation

`WorkerNavigation` uses a 0.5-metre grid, eight-neighbour A*, a binary heap and
four-metre spatial bins. Circle and oriented-box footprints are inflated by
0.62 metres for the worker's body and visual margin, plus a one-centimetre
numerical skin to keep tangent routes outside that clearance. Diagonal edges cannot cut
blocked corners. Route smoothing only removes waypoints when an exact swept
clearance test succeeds. The same sweep guards every movement step, including
long frames. Terrain elevation, three-unit/second travel, root-motion ownership,
the hand-held axe and existing animation rates are preserved.

Footprints describe the current static map. Felling updates `Obstacles` and calls `Rebuild()` immediately, replacing the crown with the narrow stump core; active commands then replan against the new revision. The three-worker band also uses reserved work positions, routes around other workers and swept unit separation. Persistent crowding stops safely with feedback. Movable physics objects, slope/cliff navigation and dynamic fog exploration remain outside this implementation. See [band, mining and tree-cleared paths](band-mining.md).
Sub-grid gaps can be rejected conservatively. The four-metre blocked-click
projection does not search every alternative reachable point; a nearby isolated
point may cause a safe rejection instead.

## Validation

Every Unity player build runs executable C# regressions before compiling the
player: direct routes, circle/rotated-building detours, analytical circle clearance,
swept collision, sealed regions, tight/wide gaps, multiple work endpoints,
blocked-click projection, bounds, blocked starts, the actual hut crossing and
twelve reachable tree approaches in the generated 1,220-tree scene.

Public and licensed PR WebGL checks run `tools/capture-worker-navigation.mjs`
against the compiled player. It follows a hut detour, checks terrain/obstacle
clearance, arrival, a blocked hut-centre command, retargeting, real-pointer tree
selection/approach/chopping and interruption. Reports and screenshots are uploaded
with the normal browser-smoke artifacts. Main deployment keeps its shorter smoke
suite; it does not repeat the longer PR navigation traversal.

Manual review before merge:

1. Send the orc across the hut and across a cluster of trees; check the turns and
   body clearance at normal RTS zoom.
2. Click a tree with neighbouring trees beside it. Confirm the orc reaches a clear
   side and begins chopping only after arrival.
3. Retarget while walking around an obstacle, then interrupt chopping with a
   ground command. Check that neither command resumes later.
4. Click inside the hut or stockpile; check the adjusted-destination feedback.
5. Try a narrow gap and a distant woodland destination. The orc must avoid
   clipping; unreachable orders should stop safely with feedback.

