# CI review levels and build reuse

Ordinary player builds run Unity compilation, executable engine regressions, save-store/menu-host checks, and a short rendered-frame/pointer-input smoke. The four-minute band/resource browser playthrough is now opt-in.

| Change or request | Unity build | Browser checks |
| --- | --- | --- |
| Documentation only | Skipped | Routing/cache unit checks only |
| Asset Lab UI or browser test only | Skipped | Relevant Asset Lab checks; menu/save tests run independently when their sources change |
| Unity, its WebGL template, or a generated-scene input | Public proxy | Short boot/input smoke and save/menu checks |
| PR labelled `unity-visual-review` | Licensed, replacing the public build | Same short checks; changed review scripts also request a build |
| PR labelled `unity-gameplay-review` | Licensed, replacing the public build | Short checks plus band/resource/save-load playthrough |
| PR labelled `unity-full-review` | Public and licensed | Full gameplay, art and animation suite |
| Manual WebGL build | Selected ref | Short checks; optional `gameplay_review` or `full_review` inputs |

Labels are explicit opt-ins. Applying `unity-visual-review` requests a player even on a test-only PR; keeping that label on a documentation-only PR does not rebuild. Gameplay/full labels deliberately force their checks until removed. Unrelated label edits neither rebuild nor cancel running checks. Apply gameplay/full review before merging a change that needs those acceptance tests. They remain available as focused local scripts.

`tools/ci-changes.mjs` detects Unity inputs using the entire PR diff against its merge base, including renamed and removed files. Browser preview modules consumed by the scene exporter (including fire, torches, visibility placements and resource geometry) still rebuild Unity. WebGL template files are build inputs because Unity bakes them into its player. Browser test changes alone do not compile a player; use a review label to exercise them against a new build. Unknown/manual event baselines fall back to building.

## Unity Library caching

All player workflows restore and save `Library`, including imported assets and incremental compiler output. Keys separate runner OS, target platform, public/licensed mode, Unity version and package configuration. An exact source hash selects a matching Library; a compatible prefix allows incremental rebuilds after source changes. Every build still runs the editor regressions and BuildPipeline. Cache writes occur only after a successful build and cannot fail an otherwise valid job.

Public proxy imports are cached directly. Licensed imports are compressed and encrypted with AES-256-GCM before they enter the public repository's cache service. The private-assets token derives an encryption key using HKDF with a random salt; a random nonce and authenticated header protect each archive. Only ciphertext is cached. Restoration authenticates the complete archive before extracting it. Key rotation changes the cache namespace and causes a cold build. There is no new secret to configure. Public caches reject Synty/Mixamo asset directories and never restore the licensed namespace.

GitHub cache scope is not a confidentiality boundary: fork PRs can read some base-branch caches. Encryption is required even though licensed builds are limited to opted-in, same-repository PRs targeting `main`, or trusted manual/deployment runs. Forks and other-base PRs retain the public path. The cache contains neither the checkout nor Unity activation credentials. A missing or rejected licensed archive falls back to a clean build. PR caches can warm later pushes to the same PR; successful main builds seed compatible caches for later PRs.

## Browser-only deployments

On `main`, browser-only changes reuse the player artifact from a successful main deployment and publish it alongside the updated Asset Lab. Reuse compares **all changes since that artifact's actual commit**, not just the latest push, so a failed intervening Unity deployment cannot hide a required rebuild. Missing/expired artifacts, lookup failures, incompatible source changes and manual dispatches cause a new build. Reused artifacts are retained with the new successful deployment. Documentation-only pushes do not trigger deployment.

The last uncached licensed run spent 6m44s compiling and 4m01s in the now-optional playthrough. Removing that playthrough saves about four minutes; cache gains still need measurement on a warm runner. The first cache-writing run may take extra time to compress/upload Library. Player jobs retain a 30-minute safety limit (90 for full review); those are limits, not expected durations.

`ORCBANDS_SMOKE_QUICK=1 node tools/smoke-unity-webgl.mjs` runs the short smoke. Without that flag, the full visual smoke remains available. `ORCBANDS_PLAYER_DIR` selects an existing local player. Deployment retains its existing visual smoke whenever Unity is rebuilt.

Local checks: `node tools/test-ci-changes.mjs`, `node tools/test-unity-ci-cache.mjs`, and `node tools/test-find-unity-player.mjs`.
