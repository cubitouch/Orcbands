# Orcbands 🌲

A small-scale fantasy survival RTS, planned for Unity 6 with direct unit control and an elevated three-quarter camera. **There is no playable Unity build yet.**

## [View the original low-poly Pine 01](https://cubitouch.github.io/Orcbands/)

The browser Asset Lab shows **real original static meshes**, not AI concept art. Inspect the model from all angles, explore a 244-tree forest camp with a winding path, three grass forms, three rock silhouettes and an animated campfire, inspect the red-roofed Timber Hut 01, or toggle wireframe.

- [Original OBJ geometry](preview/assets/low-poly-pine-01.obj) and [MTL material palette](preview/assets/low-poly-pine-01.mtl)
- [Original hut OBJ](preview/assets/timber-hut-01.obj), [hut MTL](preview/assets/timber-hut-01.mtl) and [Timber Hut 01 review](docs/timber-hut-01.md)
- [Reproducible geometry generator](tools/generate-tree.mjs) (Node.js 22+)
- No purchased asset-pack models are bundled.

Our earlier experimental procedural worker orc was retired because the quality wasn't suitable; characters will be evaluated separately from licensed packs. Git history retains the old experiment.

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
- Licensed third-party character art, evaluated before purchase.

See [Asset Lab documentation](docs/asset-lab.md) and [ENV-02 composition, screenshots and validation](docs/environment-env-02.md).
