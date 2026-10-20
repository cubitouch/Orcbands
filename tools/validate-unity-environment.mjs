// Structural check for generated geometry before expensive Unity compilation.
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
const root = resolve(import.meta.dirname, '../unity/Assets/Orcbands/Generated');
const grove = JSON.parse(readFileSync(resolve(root, 'grove-layout.json'), 'utf8'));
assert.equal(grove.seed, 2302);
assert.equal(grove.trees.length, 244);
assert.equal(grove.torches.length, 4);
assert(grove.resourceCount >= 15);
for (const name of ['terrain', 'resource-art', 'stone-props', 'grass-props']) {
  const file = resolve(root, name + '.bytes');
  const data = readFileSync(file);
  const count = data.readInt32LE(0);
  assert(count > 0 && count % 3 === 0, name + ' vertex count');
  assert.equal(statSync(file).size, 4 + 24 * count, name + ' binary shape');
  for (let i = 4; i < data.length; i += 4)
    assert(Number.isFinite(data.readFloatLE(i)), name + ' non-finite geometry');
  console.log(name, count / 3, 'triangles');
}
console.log('Three.js to Unity approved map and mesh bridge OK');
