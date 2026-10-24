# Orcbands 🌲

A small-scale fantasy survival RTS, planned for Unity 6 with direct unit control and an elevated three-quarter camera. A playable [Unity WebGL prototype](https://cubitouch.github.io/Orcbands/unity/) is available.

## [View the original low-poly Pine 01](https://cubitouch.github.io/Orcbands/)

The browser Asset Lab shows **real original static meshes**, not AI concept art. Inspect the model from all angles, explore a 1,220-tree forest camp with a winding path, three grass forms, three rock silhouettes and an animated campfire, inspect the red-roofed Timber Hut 01, or toggle wireframe.

- [Original OBJ geometry](preview/assets/low-poly-pine-01.obj) and [MTL material palette](preview/assets/low-poly-pine-01.mtl)
- [Original hut OBJ](preview/assets/timber-hut-01.obj), [hut MTL](preview/assets/timber-hut-01.mtl) and [Timber Hut 01 review](docs/timber-hut-01.md)
- [Reproducible geometry generator](tools/generate-tree.mjs) (Node.js 22+)
- No purchased asset-pack models are bundled.

Our earlier hand-built orc experiment was retired. The Unity playable prototype now uses licensed Synty mini-orcs when the private asset pack is available; the original proxy remains for public PR builds.

## Run locally

```sh
node tools/generate-tree.mjs
node tools/generate-hut.mjs
python3 -m http.server 8000 --directory preview
```

Visit http://localhost:8000/ . The page uses Three.js from a CDN.

## Intended game

- Direct Warcraft-style RTS unit control, initially single-player.
- Start with shelter, wood, food and stone gathering.
- Low-poly trees and simple static environments made in-house.
- Licensed third-party character art kept separately from the public source.

See [Asset Lab documentation](docs/asset-lab.md) and [ENV-02 composition, screenshots and validation](docs/environment-env-02.md).

## Third-party character assets

We use [**POLYGON MINI – Fantasy Character Pack – Art by Synty**](https://assetstore.unity.com/packages/3d/characters/humanoids/fantasy/polygon-mini-fantasy-character-pack-art-by-synty-122084) (Synty Studios, Unity Asset Store, package ID **122084**) for the goblin worker, warrior, shaman and the worker's **SM_Prop_Axe_01** axe.

The character models, prefabs, textures and Unity metadata are purchased commercial assets, **not included in this public Git repository**. They are stored in the private `cubitouch/Orcbands-PrivateAssets` repository and made available to trusted Unity builds; public pull-request checks retain a procedural fallback. Ownership and license remain with their respective rights holders. See [Unity private-asset build setup](unity/README.md#licensed-synty-mini-orcs--private-source-integration).

The user-supplied Mixamo idle, walking and chopping FBXs also stay in the private asset repository. See [worker animation controls and integration](docs/worker-animations.md).

Playable controls: left-click or drag a box to select; right-click ground/tree to move or chop. Move the pointer near the game edges to pan, use the wheel for bounded zoom, Q/E to orbit and R to reset. [Camera and selection details](docs/rts-controls.md).

Trees contain 12 wood. Each axe strike adds one wood to the live counter; exhausted trees leave a stump and the worker stops. [Finite tree controls and limits](docs/finite-trees.md).
