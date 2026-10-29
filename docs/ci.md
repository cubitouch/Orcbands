# CI review levels

Unity compilation and executable engine regressions remain part of every player build. Browser work is split into a short default path and an explicit exhaustive review.

| Request | Unity build | Browser checks |
| --- | --- | --- |
| Ordinary PR | Public proxy | Save-store/menu-host checks, rendered gameplay frames and actual pointer selection |
| PR labelled `unity-visual-review` | Licensed, replacing the duplicate public build | The short checks plus one band/resource/save-load playthrough |
| PR labelled `unity-full-review` | Public and licensed | Full gameplay regressions, visual comparisons and animation captures |
| Manual WebGL build | Selected ref | Short checks; enable `full_review` for the exhaustive suite |

Create/apply `unity-full-review` when a release or substantial rendering/animation change needs the complete suite. Remove it to return to short checks. The long scripts are retained for focused local runs too. The normal player job has a 30-minute safety limit; exhaustive jobs retain 90 minutes. These are limits, not expected durations: Unity compilation still takes several minutes.

Licensed assets stay restricted to opted-in, same-repository PRs targeting `main`. Fork and other-base PRs retain the public path. Changes to unrelated labels do not rebuild or cancel ongoing checks.

`ORCBANDS_SMOKE_QUICK=1 node tools/smoke-unity-webgl.mjs` runs the short render/input smoke. Without that flag the script retains the existing full visual smoke, including forest stability, fire and fog captures. `ORCBANDS_PLAYER_DIR` can select an already compiled local player for smoke verification.
