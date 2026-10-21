# Orcbands — Unity starter (6.3 LTS)

This is the **first playable engine bootstrap**, not resource gathering yet.
The historical Three.js Asset Lab remains intact in `preview/`.

## Open on your Mac

1. In Unity Hub, **Add project from disk** and select this repository's `unity/` folder.
2. The project pins **Unity 6000.3.24f1**. For reproducible builds use this patch;
   if Hub shows a different 6.3 patch, install the pinned one or deliberately
   upgrade `ProjectSettings/ProjectVersion.txt` and CI together.
3. Generate the canonical forest assets from the repository root:
   `npm install --no-save --ignore-scripts three@0.166.1`
   then `node tools/generate-unity-environment.mjs`.
   The generated `.bytes`, scene-layout JSON, shaders' Unity meshes and cached
   materials stay ignored. GitHub Actions does this automatically before each build.
4. Let Unity import the assets. Choose **Orcbands → Generate Starter Scene**.
5. Open `Assets/Scenes/OrcbandsStarter.unity` and press **Play**.
6. Click the green capsule (worker) and right-click the ground to move it.
   Pan with WASD/arrows, dolly with the mouse wheel, Q/E to orbit and R to reset.

The generated scene is intentionally **gitignored**. Its inputs (meshes, generator
and scripts) are version-controlled, and CI regenerates it before each build.
Run the menu command after a clean clone or when source assets change.

## What is actually in the scene?

- The **real** original Pine 01 and Timber Hut 01 OBJ/MTL source assets, copied
  byte-for-byte from `preview/assets/`. Geometry scale and material import
  should be visually checked inside Unity.
- The **approved 244-pine forest layout**, directly imported from the Three.js
  seeded source, including exact resource placement, the original winding paths,
  terrain height/color and the authored stone and grass variants.
- Original resource meshes including berry bushes, wood/stone stockpiles,
  shelter and construction-kit, exported with vertex colors.
- Forest-edge tree shading, camp torches and animated firelight, directional
  shadows, low-lying terrain and a perspective RTS camera matching the
  reference Three.js angle.
- A green **placeholder** worker capsule with selection and direct click-to-move.
  There is no pathfinding, obstacle avoidance, resource harvesting, storage
  economy, construction simulation or persistent game state.

If the imports have missing or flat-looking materials, fix the Unity import
materials here rather than changing the approved original browser geometry.

## CI / licensing

`.github/workflows/unity-starter.yml` always runs the asset consistency
validation on Unity-related PRs. The Unity Web build additionally runs when
repository Action secrets `UNITY_LICENSE`, `UNITY_EMAIL`, `UNITY_PASSWORD`
are available. The macOS build is opt-in via **Actions → Unity Starter Builds →
Run workflow → StandaloneOSX** to limit CI usage.

The GameCI integration uses the custom method
`Orcbands.Editor.OrcbandsSceneSetup.Build` to recreate and build the same
scene without requiring a checked-in Unity scene YAML. It uploads each player
build as a GitHub Actions artifact. The existing Asset Lab remains served at
`https://cubitouch.github.io/Orcbands/`. After integration on `main`,
`.github/workflows/deploy-preview.yml` rebuilds Unity and publishes the playable
WebGL starter at `https://cubitouch.github.io/Orcbands/unity/`, while preserving
the Asset Lab at its current URL. PR builds also run a headless Chromium load
smoke check and upload a review screenshot.

Unity WebGL compression is disabled for GitHub Pages so JavaScript/WASM files
do not require server Content-Encoding headers. The web preview is only
published from `main`, not an unmerged PR. Keep the draft unmerged until
the actual preview/controls are reviewed.

See https://game.ci/docs/github/activation/ for current personal-license
instructions. Unity Personal licence activation on hosted CI is not guaranteed,
and Unity Hub remains the supported licensing route on your Mac. Never add a
license file or account credentials to the repository itself.

## Next milestone

Navigation around obstacles, real resource objects, a worker task state
machine, carrying/delivery, dynamic resource counters and persisted scene data.

## Visual fidelity pass 2 — awaiting WebGL review

This branch now reuses the **authored Three.js hearth and torch geometry**, tree-root
ground patches and per-source visibility falloff rather than substitutes. Unity
lighting moves closer to the original warm hemisphere and sunlight; the imported
pine/hut palettes are preserved rather than darkened in hard distance rings.
Flames use emissive vertex colors and a bounded animated light (their sculpted
mesh shapes do **not** yet deform); smoke and the original HUD remain separate
follow-ups.

### Manual comparison to perform before merging

1. Open the Three.js grove and the new GitHub Actions Unity WebGL screenshot
   side by side at 1280×800.
2. Verify the near pines, red hut roof, winding trail, tree-root patches and
   sheltered storage match their shapes, color balance and positions.
3. Inspect the six-source soft reveal around the hut/hearth/four torches;
   no three-band tree-color steps or abrupt fog circles should remain.
4. Inspect each torch basket and the hearth: authored stones/logs and faceted
   tongues should replace cylinders/cubes/capsules.
5. Try Q/E orbit, pan, zoom, click worker and right-click move.
6. Review WebGL compilation **and** the screenshot artifact. If colors,
   face culling, fog or shader support is wrong, leave this PR unmerged.

### Still not equivalent

The Three.js fire/smoke has per-vertex flame deformation, drifting smoke and
sparks. The Unity pass exports its actual shape but only animates the light.
Unity's color pipeline/tone mapping also differs; the pass is a closer visual
approximation, **not proven parity** until inspected.

## Art fidelity review

Compare the Unity preview and the approved Three.js Asset Lab at the same
perspective framing. The scene imports the **real deterministic geometry and
layout**, but materials, lighting and fog are rendered by Unity. Not yet an
identical render: fog-of-war mask/smoke/polished GUI remain future improvements.
Check the generated screenshot artifact on the Unity PR before merging. The
first WebGL milestone is environmental parity, not gameplay parity.

## Visual fidelity: fog of war, contact shadows and materials

The visibility effect is **Warcraft-style fog of war**, not weather or actual
grey fog. A six-source world-space mask (hut, hearth and four torches) dims
unrevealed geometry smoothly, retaining muted detail. Unity's normal
camera-distance fog is deliberately **disabled** to avoid a flat veil.

The original pine OBJ silhouettes create sun-cast shadows on the ground.
A soft, scale-aware root and low-canopy occlusion pass augments those shadows
*directly beneath trees*, so they do not appear to float. The original MTL
foliage swatches also receive slightly more local tonal separation.

In desktop and WebGL, press **F** to toggle fog of war for direct comparison
of lighting/materials. This is a review shortcut, not a gameplay exploration
system. CI publishes both `starter.png` (fog of war **on**) and
`fog-of-war-disabled.png` (fog of war **off**) from the same build. Keep
the original Asset Lab and this Unity scene side-by-side at equal framing
when checking colour, contact shading and fog-of-war boundaries.

Do **not** merge PR #40 solely because validation/CI passes; review the
actual screenshots and confirm material/fog depth first.


## Fire effects restoration — Unity visual pass 3

The approved source flame mesh is no longer frozen in Unity. GPU vertex motion
bends the original triangles using five authored fire centers, preserving
anchored bases and independent hearth/torch phases. Two small bounded particle
systems per source add procedural soft smoke discs and additive drifting sparks.
They use fixed seeds, controlled lifetimes, WebGL-safe unlit materials, and no
third-party art or per-frame geometry rebuilds. The local fire lights continue
to flicker.

On fire-visual PRs, **inspect both fog-on/off screenshots plus fire-motion-1.png
and fire-motion-2.png**, and compare the hearth and torch effects against the
Three.js camp. CI now requires that the real Unity canvas change across frames,
though human review must still check that the movement looks good. Keep the PR
unmerged until its WebGL images have been inspected. The decorative effects do
not implement gameplay and the Unity HUD has not yet been ported.


## Stable woodland fog during camera movement

The original fog-of-war mask (hut, hearth and four torches) is anchored to
world-space XZ coordinates. An additional Unity 85–135m atmospheric fade
was formerly measured from the moving RTS camera. Its grey band shifted
over otherwise stationary trees and terrain during pan/zoom/orbit; Unity's
built-in fog could add another camera-relative pass.

The scene now disables built-in Unity fog and evaluates its gentle, distant
horizon fade **from the fixed grove origin (0, -1)** in the two custom material
shaders. The six-source visibility, flame shaders, trees, paths, and terrain
are unchanged. This deliberately favors stable camp readability over a
physically camera-relative distance haze.

CI stores `fog-camera-pan.png`, `fog-camera-zoom.png` and
`fog-camera-zoom-reveal-off.png` next to the baseline screenshots. Compare
landmarks near the treeline at both camera positions and confirm that fog does
not develop moving grey discs. Press F to toggle the six-source visibility,
then R to reset the camera.
