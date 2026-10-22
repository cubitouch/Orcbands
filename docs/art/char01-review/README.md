# ART-CHAR-01 — inspected Unity WebGL evidence

Implementation: `6b2e50b8403ba45c04480475a3b2074add1aa8b9` (PR #56).
Base: `901eb3633331b53ca37feed68ed66f7e290dbfe0`.

All images are captures from real Unity WebGL players. Comparison sheets crop
only the 4-pixel canvas focus/border edge and add labels outside the captured
scene. `roles-normal.jpg` contains native-resolution, **1:1** crops from the
normal RTS camera; it does not enlarge or invent unit detail. No image generation
or alternative scene renderer is used.

## Sources

- [Passing Unity build, smoke, art capture and controls](https://github.com/cubitouch/Orcbands/actions/runs/39810701376)
- [Passing Asset Lab and camp UI workflows](https://github.com/cubitouch/Orcbands/actions/runs/39810701269)
- [Original PNG captures and interaction metadata](https://github.com/cubitouch/Orcbands/actions/runs/39810701376/artifacts/12441440156)
- [Built WebGL player](https://github.com/cubitouch/Orcbands/actions/runs/39810701376/artifacts/12440607861)
- The before image is the downloaded deployed main player at the same viewport,
  camera position (-20,22,26), target (0,0,-1), FOV 38 and worker spawn (1.7,2.8).
  Its file hashes and source URL are retained in `baseline-source.json`.

## Render inspection

- The proxy stands beside the hearth rather than on it, with connected foot
  shadows and a restrained hollow selection ring. Its broad head, short legs,
  ears, tunic and tool read at normal camera distance.
- Skin stays olive under both cooler woodland fill and warm firelight. Rough,
  faceted surfaces have no plastic specular highlight. Clothing remains subdued
  and deliberately dark in the cool frontal shadow; this remains an art-review
  point for the eventual licensed character atlas.
- Warrior shoulder armor/shield and shaman robe/staff/headdress produce distinct
  silhouettes. The shaman has the strongest normal-distance secondary identifier;
  the worker/warrior distinction is subtler and should be reviewed in the 1:1 crops.
- Fog on/off and the existing camera pan/zoom captures were inspected. No moving
  gray veil or newly introduced rectangular light regions were observed.
- The two stationary frames show **0.000%** changed distant-forest pixels in the
  existing sampled region. Warm light intensity/color remain static; flame, smoke
  and spark animation remain present in the actual fire-motion frame pair.

## Functional checks from real inputs

`capture.json` records successful normal and distant selection, over 2 units of
right-click movement, zero terrain/feet error, camera orbit, exact reset to the
approved camera, pan and mouse-wheel dolly. Pointer buttons and keys are held
across measured Unity frames so a press is not lost between input polls. The
startup capture also waits for engine frames before positioning the actor.

`validation.json` records build/source provenance and comparison measurements.
Both repository workflows passed on the inspected implementation commit. The
macOS job was intentionally skipped under the repository's opt-in policy; a
native desktop build/live acceptance pass is still outstanding. Browser frame
timing uses SwiftShader software rasterization and is **not** evidence of native
GPU frame rate. A same-host, same-camera software comparison also showed no
slowdown in this sample (two 20-frame samples: main 26.88/39.14 seconds; candidate
13.72/24.83 seconds). These highly variable software timings do not establish a
performance improvement; raw observations are in `software-benchmark.json`.
The presentation adds no lights and at most six active proxy
renderers; the normal movement controller remains the only per-frame character
behavior.

## Review images

- `camp-before-after.jpg`: identical default camp framing before and after.
- `close.jpg`: worker proportions, matte surfaces and grounding near the hut.
- `warm-cool.jpg`: warm hearth and cool forest illumination.
- `normal-distant.jpg`: real selected unit at normal and distant views.
- `fog-on-off.jpg`: identical framing with visibility enabled and disabled.
- `roles-normal.jpg`: 1:1 worker, warrior and shaman normal-camera crops.
- `warrior.jpg`, `shaman.jpg`: close silhouette/material inspection.
- `stationary.jpg`: the actual 2.8-second stationary-camera pair.

Final owner art-direction approval remains pending. PR #56 is a draft and must
not be merged automatically. The original proxy is not a substitute for the
planned purchased rigged models.
