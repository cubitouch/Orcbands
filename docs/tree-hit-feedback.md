# Tree-hit feedback and background music

While an orc is stationary and chopping its commanded tree, each downward strike
gives that tree a small elastic shudder and emits nine faceted wood chips from
the visible struck face, clear of the low foliage. The base remains anchored and the tree settles within 0.65s.
Chips tumble, fall and shrink away within 0.7s. They are visual feedback only;
trees are not felled and no wood inventory is awarded.

`TreeChopEffects` reads the live Animator's normalized chopping time in
`LateUpdate`. The supplied downward melee clip contacts around phase 0.39,
measured from the retargeted hand/axe motion. The cursor emits once per crossing
and never replays a backlog after a long frame, preview, restart or retarget.
Walking, idle, transitions and animation previews cannot generate hits. A new
command stops new hits; the existing shudder and chips finish settling.

The struck renderers receive temporary material property overrides. Their
world-space vertex deformation also drives directional shadows and works with
the existing static pine batching. Tree roots, mesh colliders, work distances
and navigation footprints remain fixed. The overrides are restored after each
pulse, including when the effect component is disabled. The woodland stays
static when nothing is being chopped. No per-tree Update components, copied
meshes, material clones or global forest-sway shader parameters are needed.

One lazy particle pool has a hard 64-chip cap and one original tetrahedral chip
mesh. The shared WorldColorLit material keeps the camp's existing lighting and
fog behavior, with a lighter fresh-wood colour for readability. The game does not allocate particle objects on each strike.

## Music

The Unity web player has a keyboard-accessible **Music: Off / On** button below
the canvas. Music starts off, loads only after a click and loops at 24% volume.
Off pauses immediately, including while loading. Re-enabling resumes playback.
A playback/network error restores the off state with a retry message. Reloading
starts off again, so it cannot surprise the user with autoplay.

The audio element streams the exact supplied preview:
https://audio-previews.elements.envatousercontent.com/files/608037494/preview.mp3

The preview bytes are not committed or bundled with Unity. Availability depends
on that external URL. The HTML music control applies to the browser player;
native desktop audio has not been added in this pass.

## Review

1. Right-click a reachable tree and watch at RTS distance, then closer up. The
   tree should react to the downward strike, not the wind-up or recovery.
2. Watch several cycles: one restrained recoil and small chip burst per swing.
   Nearby trees and the hut should remain still.
3. Interrupt with a ground command or retarget. The old tree should settle,
   chips should expire and no further strikes should appear on the old target.
4. Check that the worker remains outside low branches and pathfinding still
   routes around the same trees and buildings.
5. Toggle music on/off, then use Enter and Space on the button. Confirm quiet,
   looping playback and that turning it off works during loading too.

Every player build runs `TreeChopChecks` for the strike cursor and settling
envelope. `capture-tree-chop-feedback.mjs` checks three real licensed swings,
tree/worker root stability, clearance, the bounded chip pool, cancellation and
settling. It captures a closer tree review view. Public proxy builds verify no
phantom hits. `test-background-music.mjs` exercises the actual host controls and
audio decoder using an original short tone, independent of the external server;
`ORCBANDS_MUSIC_FIXTURE` can test the supplied MP3 bytes locally.
