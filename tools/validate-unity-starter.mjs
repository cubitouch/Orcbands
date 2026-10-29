import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
function file(path) { return readFileSync(resolve(root, path), 'utf8'); }
const manifest = JSON.parse(file('unity/Packages/manifest.json'));
assert.equal(manifest.dependencies['com.unity.modules.physics'], '1.0.0');
assert.equal(manifest.dependencies['com.unity.modules.particlesystem'], '1.0.0',
  'Unity smoke and sparks require the built-in Particle System module');
assert.match(file('unity/ProjectSettings/ProjectVersion.txt'), /^m_EditorVersion: 6000\.3\.24f1/m);
for (const name of ['low-poly-pine-01.obj', 'low-poly-pine-01.mtl',
                    'timber-hut-01.obj', 'timber-hut-01.mtl']) {
  assert.equal(file('unity/Assets/Orcbands/Art/' + name),
               file('preview/assets/' + name), 'Asset drift: ' + name);
}
for (const path of [
  'unity/Assets/Editor/OrcbandsSceneSetup.cs',
  'unity/Assets/Orcbands/Shaders/VertexColorLit.shader',
  'unity/Assets/Orcbands/Shaders/WorldColorLit.shader',
  'unity/Assets/Orcbands/Runtime/CampReveal.cs',
  'unity/Assets/Orcbands/Runtime/CampFlame.cs',
  'tools/generate-unity-environment.mjs',
  'unity/Assets/Orcbands/Runtime/OrcbandsController.cs',
  '.github/workflows/unity-starter.yml'
]) assert(existsSync(resolve(root, path)), 'Missing ' + path);
assert.match(file('unity/Assets/Editor/OrcbandsSceneSetup.cs'), /void Build\(\)/);
assert.match(file('unity/Assets/Editor/OrcbandsSceneSetup.cs'), /GenerateScene\(\);/);
assert.match(file('unity/Assets/Orcbands/Runtime/OrcbandsController.cs'), /GetMouseButtonDown\(1\)/);
assert(file('unity/Assets/Editor/OrcbandsSceneSetup.cs').includes('RenderSettings.fog = false;'),
  'Built-in camera-relative fog should not overlap our authored world-space shaders');
assert.match(file('unity/Assets/Orcbands/Runtime/CampReveal.cs'), /RevealedAtmosphere/);
console.log('Unity starter bridge validated: 4 copied mesh inputs, manifest, version, scene and CI.');

assert.match(file('unity/Assets/Editor/OrcbandsSceneSetup.cs'), /1220/);
assert.match(file('unity/Assets/Editor/OrcbandsSceneSetup.cs'), /camera.fieldOfView = 38f/);

// Catch a truncated namespace/class in the standalone visibility component
// before the expensive Unity editor compilation; this is not a C# compiler.
const revealSource = file('unity/Assets/Orcbands/Runtime/CampReveal.cs');
const braces = revealSource.match(/[{}]/g) ?? [];
let balance = 0;
for (const brace of braces) {
  balance += brace === '{' ? 1 : -1;
  assert(balance >= 0, 'CampReveal.cs has an unmatched closing brace');
}
assert.equal(balance, 0, 'CampReveal.cs has an unmatched opening brace');

// The original combines perspective-distance atmospheric fog with the
// separate six-source Warcraft-like visibility mask.
const sceneSource = file('unity/Assets/Editor/OrcbandsSceneSetup.cs');
assert.match(sceneSource, /RenderSettings\.fog = false;/);
assert.match(sceneSource, /controller\.Reveal = reveal;/);
for (const shader of ['WorldColorLit', 'VertexColorLit', 'CharacterMatte']) {
  const src = file('unity/Assets/Orcbands/Shaders/' + shader + '.shader');
  assert.match(src, /_CampRevealSources\[6\]/);
  assert.match(src, /smoothstep\(-5\.0, 3\.0,/);
  assert.match(src, /_CampAtmosphereColor/);
  assert.match(src, /_CampAtmosphereOrigin/);
  assert.match(src, /smoothstep\(85\.0, 135\.0, worldDistance\)/);
  assert.doesNotMatch(src, /distance\(_WorldSpaceCameraPos, IN\.worldPos\)/,
    'World fog cannot depend on moving camera position');
  assert.match(src, /distance\(IN\.worldPos\.xz, _CampAtmosphereOrigin\.xy\)/);
  assert(!src.includes('float3(.206, .253, .265)'),
    'Avoid the removed grey FOW overlay');
}
assert.match(file('tools/generate-unity-tree-shadows.mjs'),
  /addRootContactOcclusion\(soft, trees, size\)/);
assert.match(file('unity/Assets/Orcbands/Runtime/OrcbandsController.cs'),
  /KeyCode\.F/);

assert.match(sceneSource,
  /"forest-patches", terrainArt, false/);
assert.match(sceneSource, /pos\.scale \* pos\.width/);
assert.match(sceneSource, /pos\.scale \* pos\.height/);
const bakedPines = file('tools/generate-unity-tree-shadows.mjs');
assert.match(bakedPines, /placement\.width \?\? 1/);
assert.match(bakedPines, /placement\.height \?\? 1/);
assert.match(file('preview/environment.js'), /p\.scale\*\(p\.width\?\?1\)/);


// Lighting parity: distinct stationary warmth for the main hearth and
// narrower four torches; cool woodland fill must not alter fog shaders.
const sceneCode = file('unity/Assets/Editor/OrcbandsSceneSetup.cs');
assert.match(sceneCode, /QualitySettings\.pixelLightCount = 6;/);
assert.match(sceneCode, /7\.2f, 6\.7f, \.8f, new Color\(1f, \.48f, \.22f\)\)/);
assert.match(sceneCode, /4\.5f, 2\.45f, i \* 2\.3f, new Color\(1f, \.66f, \.36f\)\)/);
assert.match(sceneCode, /RenderSettings\.ambientSkyColor = new Color\(\.26f, \.35f, \.39f\);/);
assert.match(sceneCode, /motion\.LightColor = warmthColor;/);
assert.match(file('unity/Assets/Orcbands/Runtime/CampFlame.cs'),
  /Warmth\.color = LightColor;/);
assert.match(file('preview/app.js'), /skyFill\.intensity=next==='grove'\?1\.72:2\.05/);

// Fire visual parity: source mesh deformation, smoke and sparks must all be
// present in the built scene (not just an intensity-flickering point light).
assert.match(file('unity/Assets/Orcbands/Shaders/VertexColorLit.shader'), /vertex:AnimateFire/);
assert.match(file('unity/Assets/Orcbands/Shaders/VertexColorLit.shader'), /_CampFireSources\[5\]/);
assert.match(sceneCode, /fireArt\.SetFloat\("_FireMotion", 1f\)/);
assert.match(sceneCode, /AddComponent<CampFireAtmosphere>\(\)/);
assert.match(sceneCode, /fireAtmosphere\.Sources\[i \+ 1\]/);
const particles = file('unity/Assets/Orcbands/Runtime/CampFireAtmosphere.cs');
assert.match(particles, /new ParticleSystem\.MinMaxGradient\(gradient\)/);
assert.match(particles, /SmokeMaterial/);
assert.match(particles, /EmberMaterial/);
assert.match(file('unity/Assets/Orcbands/Shaders/FireParticles.shader'), /Blend \[_SrcBlend\] \[_DstBlend\]/);
assert.match(file('tools/smoke-unity-webgl.mjs'), /fire-motion-2\.png/);

// World-anchored atmosphere is configured once, not updated from camera motion.
assert.match(revealSource, /Shader\.SetGlobalVector\("_CampAtmosphereOrigin"/);
assert.match(file('tools/smoke-unity-webgl.mjs'), /fog-camera-pan\.png/);
assert.match(file('tools/smoke-unity-webgl.mjs'), /fog-camera-zoom\.png/);

// Stationary forest regression: animated fire geometry and smoke persist, but
// point-light intensity/colour must not animate (PR #43 proved that caused
// large grey/green terrain regions to pulse without any camera movement).
const fireLight = file('unity/Assets/Orcbands/Runtime/CampFlame.cs');
assert.match(fireLight, /Warmth\.intensity = BaseIntensity;/);
assert.doesNotMatch(fireLight, /void Update\(/);
assert.match(file('tools/smoke-unity-webgl.mjs'), /distantForestChangedFraction < \.012/);
assert.match(file('tools/smoke-unity-webgl.mjs'), /stationary.*forest-t0\.png/s);

// Fog-of-war/atmosphere ambient tint may be emitted ONLY by ForwardBase.
// Unity's ForwardAdd executes finalcolor again for every extra point light;
// adding the constant in those passes created rectangular light tiles even
// in reveal-mask-only and baked-shadow-only diagnostic modes (PR #48).
for (const shader of ['WorldColorLit', 'VertexColorLit', 'CharacterMatte']) {
  const source = file('unity/Assets/Orcbands/Shaders/' + shader + '.shader');
  assert.match(source, /#if !defined\(UNITY_PASS_FORWARDADD\)[\s\S]*distant \+= float3\(\.12, \.15, \.13\) \* \.29;/);
  assert.match(source, /#if defined\(UNITY_PASS_FORWARDADD\)[\s\S]*color\.rgb \*= 1\.0 - atmosphericFog;/);
  assert.match(source, /#else[\s\S]*color\.rgb = lerp\(color\.rgb, _CampAtmosphereColor,/);
}


// Licensed art never belongs to the public git tree or public PR artifacts.
const licensedFactory = file('unity/Assets/Editor/LicensedCharacterFactory.cs');
assert.match(licensedFactory, /Assets\/Synty\/PolygonMiniFantasyCharacters\/Prefabs\/Characters\//);
assert.match(licensedFactory, /ORCBANDS_REQUIRE_PRIVATE_ASSETS/);
assert.match(licensedFactory, /_Albedo_Map/);
assert.match(licensedFactory, /FitRestPose\(presentation.TargetHeight\)/);
assert.match(file('unity/Assets/Editor/CharacterSceneFactory.cs'), /LicensedCharacterFactory\.TryCreate\(feet\)/);
assert.match(file('unity/.gitignore'), /\/Assets\/Synty\//);
const trustedDeploy = file('.github/workflows/deploy-preview.yml');
const publicPrCi = file('.github/workflows/unity-starter.yml');
assert.match(trustedDeploy, /secrets\.PRIVATE_ASSETS_TOKEN/);
assert.match(trustedDeploy, /ORCBANDS_REQUIRE_PRIVATE_ASSETS: "1"/);
assert.match(trustedDeploy, /github\.ref == 'refs\/heads\/main'/);
assert.match(publicPrCi, /github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
assert(!trustedDeploy.includes('actions/cache'), 'Never cache private Unity imports in public CI');
assert(!publicPrCi.includes('actions/cache'), 'Never cache private Unity imports in public CI');
assert.match(file('unity/Assets/Orcbands/Shaders/CharacterMatte.shader'), /clip\(atlas\.a - \.5\)/);


// Private licensed-character presentation: prove the pack's real prop is used,
// while preserving public PR builds that intentionally have no vendor art.
const licensed = file('unity/Assets/Editor/LicensedCharacterFactory.cs');
assert.match(licensed, /presentation\.TargetHeight = 2\.0f;/);
assert.match(licensed, /collider\.height = 2\.10f;/);
assert.match(licensed, /SM_Prop_Axe_01\.prefab/);
const workerRest = file('unity/Assets/Editor/WorkerRestProfile.cs');
assert.match(workerRest, /RequireBone\(model, "hand_r"\)/);
assert(!licensed.includes('sharedMesh.bounds'), 'Final grip must use explicit calibration');
assert.match(workerRest, /animator.enabled = false/);
assert.match(licensed, /presentation\.FitRestPose\(presentation\.TargetHeight\);[\s\S]*AttachWorkerAxe/);
assert.match(file('README.md'), /polygon-mini-fantasy-character-pack-art-by-synty-122084/);

// Publishing must not wait for the exhaustive art capture and animation video.
// Licensed review is a maintainer-labelled, same-repository PR operation.
assert(trustedDeploy.includes('node tools/smoke-unity-webgl.mjs'));
assert(!trustedDeploy.includes('node tools/capture-unity-characters.mjs'));
assert(!trustedDeploy.includes('node tools/capture-worker-animations.mjs'));
const visualReview = file('.github/workflows/worker-art-review.yml');
assert.match(visualReview, /on:\s*pull_request:/);
assert.match(visualReview, /head\.repo\.full_name == github\.repository/);
assert.match(visualReview, /base\.ref == 'main'/);
assert.match(visualReview, /pull_request\.state == 'open'/);
assert.match(visualReview, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'unity-visual-review'\)/);
assert(!/^  pull_request_target:/m.test(visualReview));
assert(!/^  push:/m.test(visualReview));
assert(visualReview.includes('node tools/capture-unity-characters.mjs'));
assert(visualReview.includes('node tools/capture-worker-animations.mjs'));
assert.match(publicPrCi, /name: Full Unity regression and art review \(opt-in\)[\s\S]*unity-full-review/);
assert.match(visualReview, /name: Full licensed regression and art review \(opt-in\)\n        if: contains\(github\.event\.pull_request\.labels\.\*\.name, 'unity-full-review'\)/);
assert.match(publicPrCi, /ORCBANDS_SMOKE_QUICK/);
assert.match(visualReview, /name: Focused band and resource playthrough/);

// Characters keep diffuse firelight in their base pass so moving skin does not
// accumulate depth-competing ForwardAdd draws. The forest retains real lights.
const characterShader = file('unity/Assets/Orcbands/Shaders/CharacterMatte.shader');
assert.match(characterShader, /#pragma surface surf Lambert .*noforwardadd novertexlights/);
assert.match(characterShader, /o\.Emission = o\.Albedo \* CampFirelight/);
assert.match(file('unity/Assets/Orcbands/Shaders/CampFirelight.cginc'), /_CampFirePositionRange\[5\]/);
assert.match(characterShader, /#include "CampFirelight.cginc"/);
const worldShader = file('unity/Assets/Orcbands/Shaders/WorldColorLit.shader');
assert.match(worldShader, /noforwardadd novertexlights/);
assert.match(worldShader, /#include "CampFirelight.cginc"/);
assert.match(worldShader, /o\.Emission = o\.Albedo \* CampFirelight/);
assert.match(sceneCode, /CampCharacterLighting/);

