# Orcbands 🌲

A small-scale, open-ended fantasy survival RTS about three orcs who survive a
zeppelin crash and try to build a sustainable home.

The project is starting with **real 3D asset experiments** and browser-first
previews; there is no playable Unity game yet.

## [Explore the 3D Asset Lab](https://cubitouch.github.io/Orcbands/)

Our first asset is an **original, low-poly worker orc** generated as actual
polygon geometry. In the [Asset Lab](preview/index.html), inspect the model from
every angle, preview simple idle/walk/chop motion and place it in an original
procedural **crash-site diorama** with a zeppelin wreck and shelter.

> The current character is segmented for demonstration, **not** a skinned
> Unity Humanoid rig. The browser's rigid-part animation previews are not
> production-ready animation clips.

If Pages isn't live yet, visit **Settings → Pages → Source: GitHub Actions**
after the first deployment; see [setup guidance](docs/asset-lab.md).

### Develop the model locally without Unity

Requires Node.js 22+ to regenerate and validate the models.

```bash
node tools/generate-orc.mjs
node tools/validate-orc.mjs
python3 -m http.server 8000 --directory preview
```

Visit http://localhost:8000/ . The viewer uses Three.js loaded from a CDN.

## Game direction

- Direct Warcraft-style RTS control of three orcs, later potentially five.
- Fixed three-quarter / isometric camera.
- Build shelter, grow food, replant trees, gather wood, stone, iron and crystals.
- Explore paths and forests, defend against occasional enemies.
- Pause and accelerate time; no pay-to-wait timers.
- Sustain the tribe without hunting; if every orc dies, the run ends.
- Single-player initially; cooperative multiplayer may come later.

### Roadmap

1. ✅ First original 3D orc model and browser viewer (prototype, not Humanoid).
2. ☐ Proper skinned rig and humanoid animations.
3. ☐ Unity 6 project and headless WebGL CI build.
4. ☐ RTS camera, unit selection, movement and resource gathering.
5. ☐ Survival loop, growing settlement, exploration and combat.

Asset Lab details: [docs/asset-lab.md](docs/asset-lab.md).

**All current 3D prototypes are original procedural geometry.** No purchased
Asset Store models are included.

## Worker Orc quality overhaul (#15)

The [production brief](docs/worker-orc-production-brief.md) contains the original
concept sheets, ranked visual requirements and an original-sculpt production
workflow. Reference recovery is complete on this branch; the replacement sculpt
and its visual acceptance remain pending.
