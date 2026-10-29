import {strict as assert} from 'node:assert';
import {classify, changedPaths, route} from './ci-changes.mjs';
import {readFileSync} from 'node:fs';

for (const path of ['README.md', 'docs/ci.md', 'docs/band-mining.md'])
  assert.deepEqual(classify([path]), {unity:false,browser:false,preview:false,bridge:false});
for (const path of ['preview/camp-ui.js', 'preview/app.js', 'tools/smoke-preview.mjs',
  'tools/capture-band-mining.mjs', 'tools/smoke-unity-webgl.mjs'])
  assert.equal(classify([path]).unity, false, path);
for (const path of ['unity/Assets/Orcbands/Runtime/WorkerNavigation.cs',
  'unity/Packages/manifest.json', 'unity/ProjectSettings/ProjectVersion.txt',
  'unity/Assets/WebGLTemplates/Orcbands/index.html', 'preview/environment-layout.js',
  'preview/campfire.js', 'preview/torches.js', 'tools/generate-unity-tree-shadows.mjs',
  'tools/generate-tree.mjs', 'preview/assets/low-poly-pine-01.obj',
  '.github/actions/unity-cache/action.yml', 'tools/unity-ci-cache.mjs'])
  assert.equal(classify([path]).unity, true, path);
assert.equal(classify(['tools/test-menu-host.mjs']).browser, true);
assert.equal(classify(['preview/camp-ui.js']).preview, true);
assert.equal(classify(['tools/validate-unity-starter.mjs']).bridge, true);
assert.equal(classify(['tools/validate-unity-starter.mjs']).preview, false);
assert.equal(changedPaths({}, 'workflow_dispatch'), null);
const event = (names, action='synchronize') => ({action,pull_request:{labels:names.map(name=>({name}))}});
assert.equal(route(['docs/ci.md'],event(['unity-visual-review']),'pull_request').player,false);
assert.equal(route(['tools/capture-band-mining.mjs'],event([]),'pull_request').player,false);
assert.equal(route(['tools/capture-band-mining.mjs'],event(['unity-visual-review']),'pull_request').player,true);
assert.equal(route(['README.md'],event(['unity-visual-review'],'labeled'),'pull_request').player,true);
assert.equal(route(['README.md'],event(['unity-gameplay-review']),'pull_request').player,true);
assert.equal(route([],{},'workflow_dispatch').player,true);
// Every direct scene-generator import must keep its Unity rebuild dependency.
const generator = readFileSync(new URL('generate-unity-environment.mjs', import.meta.url), 'utf8');
for (const [, path] of generator.matchAll(/from '\.\.\/(preview\/[^']+)'/g))
  assert.equal(classify([path]).unity, true, `Missing generator dependency: ${path}`);
console.log('CI routing: docs, browser-only, scene imports, engine and manual cases pass.');
