// Structural check for generated geometry before expensive Unity compilation.
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
const root = resolve(import.meta.dirname, '../unity/Assets/Orcbands/Generated');
const grove = JSON.parse(readFileSync(resolve(root, 'grove-layout.json'), 'utf8'));
assert.equal(grove.seed, 2302);
assert.equal(grove.trees.length, 1220);
assert.equal(grove.torches.length, 4);
assert.equal(grove.workExclusions.length,22,'Camp work-position footprint export');
for(const p of grove.workExclusions)assert([p.x,p.z,p.radius].every(Number.isFinite)&&p.radius>0);
assert(grove.resourceCount >= 15);
for (const name of ['woodland-story', 'terrain', 'resource-art', 'stone-props', 'grass-props', 'forest-patches', 'hearth-art', 'hearth-flames', 'torches-art', 'torches-flames']) {
  const file = resolve(root, name + '.bytes');
  const data = readFileSync(file);
  const count = data.readInt32LE(0);
  assert(count > 0 && count % 3 === 0, name + ' vertex count');
  assert.equal(statSync(file).size, 4 + 24 * count, name + ' binary shape');
  for (let i = 4; i < data.length; i += 4)
    assert(Number.isFinite(data.readFloatLE(i)), name + ' non-finite geometry');
  console.log(name, count / 3, 'triangles');
}
// The original pine OBJ-based shadow map is part of visual parity, not optional.
const shadowPng = readFileSync(resolve(root, 'approved-pine-shadows.png'));
assert(shadowPng.subarray(0, 8).equals(
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'PNG signature');
assert.equal(shadowPng.readUInt32BE(16), 2048, 'shadow map width');
assert.equal(shadowPng.readUInt32BE(20), 2048, 'shadow map height');
assert(shadowPng.length > 5000, 'pine shadow map empty');
console.log('Three.js to Unity approved map and mesh bridge OK');
