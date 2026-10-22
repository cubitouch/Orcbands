# ART-CHAR-01 — character presentation

Draft art direction for original temporary geometry. No Synty model, texture,
preview download, rig or runtime Asset Store dependency is included.

## Lighting audit and material choices

The starter uses Unity 6000.3.24f1's **built-in forward renderer**, surface shaders,
a trilight ambient fill and a single shadow-casting directional sun. The existing
source describes its Gamma-space WebGL output; the project does not commit a
color-space override. This change does not migrate color space or render pipeline.
`FilmicGrade` applies the existing exposure (.83), contrast (1.17) and saturation
(1.07) after lighting. Firelight radiance and grade remain unchanged.

All five camp point lights keep their fixed intensity/color. Flame geometry,
smoke and sparks keep their existing animations. No character lights are added.
Environment shaders, fog globals, horizon origin and all original assets are
unchanged. Character surfaces receive the same cool ambient fill, warm local
lights, directional shadows and world-space visibility as the surroundings.

`Orcbands/CharacterMatte` is an independent, back-face-culled diffuse shader.
It deliberately has **no specular lobe**, emission or rim/outline light: even
metal starts as restrained weathered gray. This is the matte end of the requested
roughness range, avoiding synthetic-looking highlights in the existing Gamma
lighting setup. Flat normals come from original faceted meshes, not a pixel
shader trick. Preserve imported authored hard edges; don't recalculate every
vertex to smooth normals when importing the licensed art.

`Assets/Orcbands/CharacterPalette.asset` is the reusable artist-editable profile.
Generation reads it without replacing it and creates six shared materials:

| Surface | RGB defaults (0–1) | Intended role |
| --- | --- | --- |
| Skin | .46, .51, .24 | Olive, readable under cool fill |
| Cloth | .40, .18, .15 | Desaturated red major area |
| Leather | .25, .19, .12 | Muted earth brown |
| Metal | .25, .28, .28 | Weathered charcoal armor |
| Bone | .73, .68, .49 | Warm cream tusks/staff detail |
| Faction | .56, .36, .19 | Small ochre sash; not an outline |

`TonalDepth` adjusts material contrast independently of environment materials.
These values pass through the existing lighting and filmic grade, so they are
not promotional-art color matches. `_MainTex` also supports an imported color
atlas (white by default). With an atlas, use white `_Color` initially to avoid
multiplying an already colored texture by a second full palette tint.

**Regression rule:** the shader's fog final-color callback runs in ForwardBase
and ForwardAdd. Only ForwardBase adds woodland/atmosphere constants; ForwardAdd
only attenuates its own radiance. Never add ambient tint to every light pass.
The mask and far fade use world XZ, never camera distance. Keep the existing
stationary-forest smoke check and inspect the captures for rectangular tiles.

## World scale and structure

| Reference | Size in world units |
| --- | --- |
| Pine 01 | top Y 4.58; actual vertex span 4.545 |
| Hut | vertex span 4.226; entrance framing up to about 2.42 |
| Worker / warrior proxy | top Y 1.525; worker width about 1.20 including tool |
| Shaman proxy | staff top Y 1.85, headdress top Y 1.655 |
| Selection collider | height 1.65, radius .48, centered at Y .825 |
| Selection ring | radius .58, width .035, Y .045 above feet |

One unit is treated as approximately one metre. The worker is roughly one third
of the reference pine height, smaller than the old 2-unit capsule, and comfortably
below the hut entrance. A broad head, short legs and large tunic area retain
readability. Warrior shoulders/shield and shaman robe/staff distinguish roles by
silhouette rather than label alone. They are presentation examples, not gameplay
classes or final purchased-character art. Each active role uses at most six mesh
renderers/shared materials (one per surface) rather than one renderer per part.

`Worker` is a unit-scale gameplay root whose origin is on the terrain. Its
capsule collider is independent of visual bounds. `CharacterPresentation` owns
an independent `ModelMount` with editable `ModelScale`, `ModelEuler` and
`PivotOffset`. `Apply()` only changes that mount. Movement translates/turns the
root; the indicator follows the feet. The root no longer contains the capsule's
historical +1-height correction. Selection and right-click terrain movement use
the same controller and remain a single-worker prototype without pathfinding.

Do not normalize every role to one height. Start workers around 1.45–1.60;
warriors around 1.55–1.75; chiefs/shamans can vary by silhouette/accessories.
Those are art-review starting ranges, not enforced gameplay rules. Size the root
collider and ring deliberately for larger variants while retaining unit root scale.
The approved normal camera position/FOV, dolly limits and controls are unchanged.

## Replacing the proxy with licensed characters

1. Purchase/import the pack locally through Unity's normal authorized workflow.
   Keep redistribution/licensing obligations with the project owner; this change
   does not fetch any vendor content. Do not commit unlicensed vendor files.
2. Generate the starter scene. Create an **owned character prefab** outside
   `Generated/` and the ignored generated scene so regeneration cannot lose it.
   Keep the unit-scale gameplay root and collider; put the imported visual prefab
   under its `ModelMount`. Remove the three temporary review-role children.
3. Leave imported model scale/import settings intact initially. Confirm +Y up and
   +Z facing; correct rig facing with `ModelEuler` rather than movement code.
   Assign ModelMount on `CharacterPresentation`, then call `Apply()`.
4. In a neutral/rest pose, call `FitRestPose(targetHeight)` once (via an editor
   helper/debug Inspector or code). It applies orientation before measuring
   active renderer bounds, fits the requested height, centers XZ and lifts the
   lowest renderer bound to the feet. Check feet visually: weapons, capes and
   unusual rig bounds can require a manual `PivotOffset`/`ModelScale` correction.
   Never fit animated bounds every frame. Parent/root must have unit scale.
5. Disable root motion on the Animator. Keep rig/Animator on the visual child;
   do not put animation translations on the gameplay root. Remove child physics
   colliders so selection still hits the dedicated root collider. Enable receive
   shadows and shadow casting on the model renderers.
6. Map material slots to the six generated character materials, or duplicate
   them to an owned art folder. For atlas-based models, preserve original UVs,
   assign their licensed atlas to `_MainTex`, and start `_Color` at white.
   Atlas recoloring requires an authorized atlas/material workflow, not blindly
   applying six tints to a single textured material. Inspect face/clothing under
   both hearth and forest light before adjusting the palette.
7. Replace `CharacterSceneFactory.Create` at the procedural scene's worker spawn
   with `PrefabUtility.InstantiatePrefab` of the owned prefab. Place its root
   using `Surface(...)`; wire the controller to that root. Remove/update the
   proxy-only `CharacterReview` wiring. Movement logic needs no model-specific
   offsets or imports. Merely editing the ignored generated scene is temporary.
8. Verify normal and distant selection, feet/ring alignment, facing on movement,
   animation transitions and WebGL shader inclusion on a fresh generated build.

## Review and verification

`tools/capture-unity-characters.mjs` renders the **actual Unity player** in
Chromium. It captures camp/normal/close/distant, fog on/off, warmer hearth and
cooler forest positions, plus worker/warrior/shaman silhouettes. Its real pointer
inputs verify normal and distant selection, right-click displacement and terrain
height alignment; screenshots preserve the selected and moved results.

For deterministic art views, the WebGL console exposes
`orcbandsReview('normal')`, `'close'`, `'out'`, `'normal-off'`, `'warm'`, `'cool'`,
`'warrior'`, `'shaman'`, `'warrior-normal'`, `'shaman-normal'`.
These are explicit review commands; no presentation behavior runs each frame.
They reposition the actor/camera for inspection. Reload/reset before gameplay;
the controller's normal pan focus remains the approved camp origin.

`tools/capture-unity-character-baseline.mjs <player-directory> <output>` applies
an identical camera-input sequence to downloaded main and candidate builds. The
before/after comparisons must use those matched captures, not the independently
framed character detail views. Atmospheric animations intentionally remain live.

CI retains the existing stationary 2.8-second forest check, fire-motion pairs,
fog pan/zoom pairs and browser boot/error checks. Software-browser frame timing
is recorded only as a diagnostic; it is not a desktop hardware performance claim.
macOS remains the repository's opt-in workflow and requires separate live testing.
See the PR review evidence for the exact inspected build and outstanding limits.
