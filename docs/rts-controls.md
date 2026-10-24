# RTS camera and selection

Move the pointer into the outer 4% of the game viewport to pan in that direction.
Speed rises smoothly toward the edge, up to 18 units/second. Corners cap diagonal
speed. Panning stays camera-relative after orbiting and clamps to the existing
±102-unit map bounds. Leaving the canvas or losing focus stops pointer scrolling.
WASD/arrow-key pan and Q/E orbit remain available; R restores the original view.

The wheel dollies between 24 and 55 units from the ground focus, preserving the
original three-quarter angle and ~40-unit reset view. Art-review presets can still
use closer or overhead cameras for diagnostics; normal wheel input restores the
playable limits.

Left-click selects on release. Drag at least six pixels to show a translucent
selection rectangle; release to select the worker if its projected collider centre
is inside the box. Either drag direction works. An empty click/box deselects.
Edge scrolling pauses while holding the selection button. Focus loss cancels a
pending drag; releasing outside the canvas cancels it. Only the existing worker
is selectable in this prototype; no extra units are created.

The WebGL host forwards pointer enter/leave/focus to Unity, including releases
outside the captured canvas. `RtsCamera` owns navigation; `OrcbandsController`
keeps selection and gameplay commands. Desktop builds use Unity's viewport and
application-focus checks. There is no per-frame browser message loop.

`tools/capture-rts-controls.mjs` drives real mouse, wheel and keyboard events
against the actual Unity player. It checks click/box/reverse/empty selection,
drag-scroll suppression, all four edges, leave-canvas stop, zoom bounds and reset,
and saves selection/zoom screenshots plus the report. Public PR CI runs it before
character captures. Main deployment retains its shorter smoke path.
