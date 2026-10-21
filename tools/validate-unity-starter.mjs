import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
function file(path) { return readFileSync(resolve(root, path), 'utf8'); }
const manifest = JSON.parse(file('unity/Packages/manifest.json'));
assert.equal(manifest.dependencies['com.unity.modules.physics'], '1.0.0');
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
assert.match(file('unity/Assets/Editor/OrcbandsSceneSetup.cs'), /RenderSettings\\.fog = true/);
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

// Guard the meaning of fog: the six-source Warcraft-like visibility mask is
// not a camera-distance atmospheric fog layer.
const sceneSource = file('unity/Assets/Editor/OrcbandsSceneSetup.cs');
assert.match(sceneSource, /RenderSettings\.fog = false;/);
assert.match(sceneSource, /controller\.Reveal = reveal;/);
for (const shader of ['WorldColorLit', 'VertexColorLit']) {
  const src = file('unity/Assets/Orcbands/Shaders/' + shader + '.shader');
  assert.match(src, /_CampRevealSources\[6\]/);
  assert.match(src, /smoothstep\(-5\.0, 3\.0,/);
  assert(!src.includes('float3(.206, .253, .265)'),
    'Avoid the removed grey FOW overlay');
}
assert.match(file('tools/generate-unity-tree-shadows.mjs'),
  /addRootContactOcclusion\(soft, trees, size\)/);
assert.match(file('unity/Assets/Orcbands/Runtime/OrcbandsController.cs'),
  /KeyCode\.F/);

assert.match(sceneSource,
  /"forest-patches", terrainArt, false/);
