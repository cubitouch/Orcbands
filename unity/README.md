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
6. Click the original miniature worker proxy and right-click the ground to move it.
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
- An original faceted **temporary worker proxy** with selection and direct click-to-move.
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


## Stationary-forest lighting stability

PR #43 isolated a bug that made large parts of the forest pulse grey/green **even
when the camera did not move**. Three matched WebGL pairs demonstrated that the
changes disappeared when the five campfire/torch point lights were held steady;
disabling sunlight shadows had no additional effect. The moving visibility/fog
mask was not the cause of this time-dependent regression.

Unity now keeps **point-light intensity and colour static**. The fire shapes
still deform in the GPU shader, their procedural smoke and sparks still move,
and the camp retains warm illumination. This is a deliberate compromise: do
not reintroduce dynamic point-light flicker until it is spatially confined and
proven not to affect distant trees or large terrain meshes.

The WebGL smoke test now compares the same unchanged camera frame 2.8 seconds
apart and asserts that an affected distant-forest sample remains stable. It
also saves the pair as `stationary/forest-t0.png` and
`stationary/forest-t3.png`, alongside the existing fire-motion captures.


## Forward-additive lighting and the bright rectangular tiles

The residual static, straight-edged bright rectangles were not fixed by
camera-anchored fog, stationary point lights, smoothing terrain colors or
Gaussian reveal falloff. PR #48 isolated the reveal and baked-shadow outputs
at the same camera. **The exact same rectangular brightness discontinuities
appeared in both diagnostic views**, so they could not originate solely from
one mask's geometry.

The custom surface shaders use Unity's `finalcolor` callback. This runs in
both `ForwardBase` and **each extra `ForwardAdd` point-light pass**. The
original callback blended a fixed woodland grey-green and atmospheric colour
into *every* pass, injecting a constant even when a point light had zero
radiance. The subsequent additive accumulation created square/rectangular
light regions associated with per-light rasterization.

The shaders now use the same linear reveal attenuation in every pass, but add
the constant ambient tint and far atmospheric colour **only in ForwardBase**.
ForwardAdd uses pure multiplicative attenuation, so black light contributions
stay black; there is no bright constant to accumulate repeatedly. This keeps
all five static warm lights, animated fire meshes, smoke and sparks.

Before merging, compare the same-camera Unity WebGL `starter.png` capture
against PR #48's original and mask-isolation captures. Check the exact ground
rectangle, then fire/spark visibility and dark forest readability. This is a
lighting-composition correction, not a change to the underlying terrain or
visibility layout.

## Miniature character presentation (ART-CHAR-01)

See [the character presentation guide](../docs/art/ART-CHAR-01.md) for the palette,
world-scale rationale, visual/gameplay root contract, WebGL review captures and
licensed-model replacement workflow. The starter uses original temporary geometry;
no Synty assets are included. Keep the PR unmerged until its real Unity screenshots
have been reviewed.


## Licensed Synty mini-orcs — private source integration

The purchased Synty files live exclusively in the private
[cubitouch/Orcbands-PrivateAssets](https://github.com/cubitouch/Orcbands-PrivateAssets)
repository at `Synty/`; they are intentionally absent from this public project.
No Synty source FBX, prefab, atlas or derivative Unity import cache should be
committed, uploaded as a CI artifact or included in the public PR review.

To see the genuine mini-orcs locally, clone the private repo next to the public
one, then from the public Orcbands repository root:

```sh
cp -R ../Orcbands-PrivateAssets/Synty unity/Assets/Synty
# Complete the usual generated environment step; then:
# Unity editor → Orcbands → Generate Starter Scene
```

The `unity/Assets/Synty/` path is ignored by the public git repository. Keep
the existing vendor file and folder metadata unchanged: the model prefab
references are maintained by Unity GUIDs. When private files are absent,
normal local and pull-request builds continue to show the original faceted
character proxy.

With the purchased pack, the existing `CharacterSceneFactory` uses
`SM_Chr_Dungeon_GoblinMale_01` as the worker, and loads the real warrior and
shaman for the character review camera presets. These are the *original vendor
prefabs*, fitted to the established 1.525-unit worker height under an independent
gameplay root. Their own color atlases are adapted to `Orcbands/CharacterMatte`
for camp lighting and fog without altering the original private materials.
Motion remains placeholder direct click-to-move; no animation clips are added.

### Trusted GitHub build

The Actions secret `PRIVATE_ASSETS_TOKEN` belongs to the **public** Orcbands
repository, but must be a fine-grained PAT with only `Contents: read` on
`cubitouch/Orcbands-PrivateAssets`.

- The published `main` WebGL workflow checks out the private repository
  into an ephemeral workspace, copies `Synty/` to `unity/Assets/Synty/`, then
  builds with `ORCBANDS_REQUIRE_PRIVATE_ASSETS=1`. Missing files or checkout
  authentication cause a hard build failure, not a misleading proxy release.
- A manually triggered Unity workflow on `main` can create a licensed WebGL
  or macOS build. Normal pull-request jobs always use the public-only proxy
  and never access the private token.
- Both workflows **disable Unity Library caching** because cached imported
  licensed art could otherwise be retrievable from public PR workflows.

Only compiled game player artifacts may be published; do not upload raw source
assets or the imported `unity/Library`. A PR preview with a proxy does not
prove that licensed Synty art looks correct. Inspect the actual WebGL screenshots
after the first trusted `main` build, specifically the worker's size, UV atlas,
shadows, materials, foot alignment, right-click movement and selection.

### Pack reference and character dimensions

- [**POLYGON MINI – Fantasy Character Pack – Art by Synty**](https://assetstore.unity.com/packages/3d/characters/humanoids/fantasy/polygon-mini-fantasy-character-pack-art-by-synty-122084), Unity Asset Store ID 122084, purchased Synty Studios models and props.
- Worker: `SM_Chr_Dungeon_GoblinMale_01.prefab`, fitted to **2.0 world units** for RTS readability (the previous target was 1.525).
- Tool: `SM_Prop_Axe_01.prefab` from the **same pack**, attached to the original `hand_r` bone with a grip-aware offset. The axe is excluded from the initial rest-pose height fit.
- Gameplay root, independent capsule selection collider and navigation remain unchanged. The axe is presentation only; chopping animation and actual harvesting are not implemented yet.
- Purchased art remains exclusively in the private asset repository, not in the public git tree.
