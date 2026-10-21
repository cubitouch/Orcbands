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

assert.match(file('unity/Assets/Editor/OrcbandsSceneSetup.cs'), /244/);
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
for (const shader of ['WorldColorLit', 'VertexColorLit']) {
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

// Lighting parity: the source scene's hearth and four torches contribute
// actual illumination, not just emissive meshes. Verify the Unity builder
// does not silently regress to its original under-lit 0.9 / 0.72 lights.
const sceneCode = file('unity/Assets/Editor/OrcbandsSceneSetup.cs');
assert.match(sceneCode, /QualitySettings\.pixelLightCount = 6;/);
assert.match(sceneCode, /5\.5f, 4\.2f, \.8f\);/);
assert.match(sceneCode, /5\.2f, 2\.9f, i \* 2\.3f\);/);

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

// Unity-only terrain colour blend: smooth hard face-sized soil rectangles,
// without changing Three.js scene art or terrain geometry topology.
assert.match(file('preview/environment.js'), /smoothPathColors = false/);
assert.match(file('preview/environment.js'), /smoothstep\(worn,\.09,\.88\)/);
assert.match(file('tools/generate-unity-environment.mjs'),
  /createTerrainGeometry\(\{smoothPathColors:true\}\)/);
