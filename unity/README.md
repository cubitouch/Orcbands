# Orcbands — Unity starter (6.3 LTS)

This is the **first playable engine bootstrap**, not resource gathering yet.
The historical Three.js Asset Lab remains intact in `preview/`.

## Open on your Mac

1. In Unity Hub, **Add project from disk** and select this repository's `unity/` folder.
2. The project pins **Unity 6000.3.24f1**. For reproducible builds use this patch;
   if Hub shows a different 6.3 patch, install the pinned one or deliberately
   upgrade `ProjectSettings/ProjectVersion.txt` and CI together.
3. Let Unity import the assets. Choose **Orcbands → Generate Starter Scene**.
4. Open `Assets/Scenes/OrcbandsStarter.unity` and press **Play**.
5. Click the green capsule (worker) and right-click the ground to move it.
   Pan with WASD/arrows; use the mouse wheel to zoom.

The generated scene is intentionally **gitignored**. Its inputs (meshes, generator
and scripts) are version-controlled, and CI regenerates it before each build.
Run the menu command after a clean clone or when source assets change.

## What is actually in the scene?

- The **real** original Pine 01 and Timber Hut 01 OBJ/MTL source assets, copied
  byte-for-byte from `preview/assets/`. Geometry scale and material import
  should be visually checked inside Unity.
- A **smaller 58-tree grove slice**, not yet the full 244-tree environment.
- Flat terrain, directional light, basic fog and an isometric/RTS camera.
- A green **placeholder** worker capsule with selection and direct click-to-move.
  There is no pathfinding, obstacle avoidance, harvesting, animation, storage,
  economy, build placement or persistent game state.

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
