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

## Art fidelity review

Compare the Unity preview and the approved Three.js Asset Lab at the same
perspective framing. The scene imports the **real deterministic geometry and
layout**, but materials, lighting and fog are rendered by Unity. Not yet an
identical render: fog-of-war mask/smoke/polished GUI remain future improvements.
Check the generated screenshot artifact on the Unity PR before merging. The
first WebGL milestone is environmental parity, not gameplay parity.
