// Export the APPROVED Three.js forest and resource geometry for Unity.
// The layout, resource states and color information come directly from the
// existing Asset Lab source, rather than from a second independently-authored map.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import {
  createLayout, groundHeight, wornGround, HUT_PLACEMENT, TORCH_PLACEMENTS,
} from '../preview/environment-layout.js';
import { groundVariation, noise } from '../preview/ground-surface.js';
import { createGrassGeometry, createRockGeometry, createForestFloorPatches } from '../preview/environment.js';
import { buildCampfire } from '../preview/campfire.js';
import { buildTorches } from '../preview/torches.js';
import { resourceGeometry } from '../preview/resources.js';

const root = resolve(import.meta.dirname, '../unity/Assets/Orcbands/Generated');
mkdirSync(root, { recursive: true });
const layout = createLayout();
if (layout.trees.length !== 244) throw new Error('Expected the approved 244-pine forest');
const expected = ['shelter/stocked', 'construction/roof', 'bush/full', 'wood/stump', 'stone/full'];
for (const key of expected) if (!layout.resources.some(r => r.kind + '/' + r.state === key))
  throw new Error('Missing forest resource: ' + key);
writeFileSync(resolve(root, 'grove-layout.json'), JSON.stringify({
  seed: layout.seed,
  // Three.js is right-handed and Unity's world is left-handed: reflect X
  // so the original camera/view and the authored layout match on screen.
  trees: layout.trees.map(p => ({ ...p, x: -p.x, angle: -p.angle })),
  hut: { ...HUT_PLACEMENT, x: -HUT_PLACEMENT.x, angle: -HUT_PLACEMENT.angle },
  campfire: { ...layout.campfire, x: -layout.campfire.x },
  torches: TORCH_PLACEMENTS.map(p => ({ ...p, x: -p.x })),
  resourceCount: layout.resources.length,
}, null, 2) + '\n');

// A compact non-indexed triangle stream, authored in metres, Y up:
// int32 vertex count then xyz/rgb float32 × count. Unity creates meshes from
// these streams, using the local vertex-color shader (no OBJ-color importer assumptions).
const linearToSrgb = c => c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055;
function exportMesh(name, items) {
  const floats = [];
  const tmp = new THREE.Vector3();
  const color = new THREE.Color();
  for (const { geom, position = [0, 0, 0], scale = 1, angle = 0, matrix = null, materialColor = null, colorIsSrgb = false } of items) {
    const pos = geom.attributes.position, colors = geom.attributes.color;
    const m = matrix ?? new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
      new THREE.Vector3(scale, scale, scale));
    const indices = geom.index ? geom.index.array : null;
    const count = indices ? indices.length : pos.count;
    if (count % 3) throw new Error(name + ' is not a triangle mesh');
    for (let i = 0; i < count; i++) {
      // Swap winding as well as flipping X so normals remain outward/upward.
      const source = Math.floor(i / 3) * 3 + [0, 2, 1][i % 3];
      const j = indices ? indices[source] : source;
      tmp.fromBufferAttribute(pos, j).applyMatrix4(m);
      tmp.x = -tmp.x;
      if (colors) color.fromBufferAttribute(colors, j);
      else color.setRGB(1, 1, 1);
      if (materialColor) color.multiply(materialColor);
      floats.push(tmp.x, tmp.y, tmp.z,
        Math.max(0, Math.min(1, colorIsSrgb ? color.r : linearToSrgb(color.r))),
        Math.max(0, Math.min(1, colorIsSrgb ? color.g : linearToSrgb(color.g))),
        Math.max(0, Math.min(1, colorIsSrgb ? color.b : linearToSrgb(color.b))));
    }
  }
  const count = floats.length / 6;
  const buffer = Buffer.allocUnsafe(4 + count * 6 * 4);
  buffer.writeInt32LE(count, 0);
  for (let i = 0; i < floats.length; i++) buffer.writeFloatLE(floats[i], i * 4 + 4);
  writeFileSync(resolve(root, name + '.bytes'), buffer);
  console.log(name, count / 3, 'triangles', buffer.length, 'bytes');
}
// Terrain: reproduce the approved woodland's height, mottled grass and irregular
// worn paths from the exact JS functions. A 0.75m grid reads well at RTS height.
const terrain = [];
const shade = (x, z) => {
  const variation = groundVariation(x, z);
  const worn = wornGround(x, z);
  const dirt = worn > .73 ? 1 : worn > .43 ? .72 : worn > .23 ? .32 : 0;
  const grass = new THREE.Color(0x637648).lerp(new THREE.Color(0x85935b),
    .54 + (variation - .5) * .24);
  const soil = new THREE.Color(0x857152).lerp(new THREE.Color(0xa28b65),
    .22 + noise(x * .9 + 18, z * .9) * .65);
  return grass.lerp(soil, dirt).multiplyScalar(.98 + variation * .04);
};
const verts = [];
const step = .75, half = 49, side = Math.round(2 * half / step);
for (let iz = 0; iz < side; iz++) for (let ix = 0; ix < side; ix++) {
  const x = -half + ix * step, z = -half + iz * step;
  const a = [x, groundHeight(x, z), z];
  const b = [x, groundHeight(x, z + step), z + step];
  const c = [x + step, groundHeight(x + step, z), z];
  const d = [x + step, groundHeight(x + step, z + step), z + step];
  for (const tri of (ix + iz) % 2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]]) {
    // Flat earth/soil flecks like the Three.js terrain, preserving silhouettes.
    const px = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
    const pz = (tri[0][2] + tri[1][2] + tri[2][2]) / 3;
    const face = shade(px, pz);
    // X reflection reverses triangle winding. Keep the collider facing upward.
    for (const vertex of [tri[0], tri[2], tri[1]]) {
      const tint = wornGround(px, pz) > .12 ? face : shade(vertex[0], vertex[2]);
      verts.push(-vertex[0], vertex[1], vertex[2],
        linearToSrgb(tint.r), linearToSrgb(tint.g), linearToSrgb(tint.b));
    }
  }
}
const terrainBytes = Buffer.allocUnsafe(4 + verts.length * 4);
terrainBytes.writeInt32LE(verts.length / 6, 0);
for (let i = 0; i < verts.length; i++) terrainBytes.writeFloatLE(verts[i], i * 4 + 4);
writeFileSync(resolve(root, 'terrain.bytes'), terrainBytes);
console.log('terrain', verts.length / 18, 'triangles', terrainBytes.length, 'bytes');


// Export the original authored hearth and torch geometry rather than replacing
// their silhouettes with Unity capsules/cubes. Flame meshes are a separate
// emissive channel; light intensity remains animated by the Unity component.
// Reflect the world in exactly the same way as resources and terrain.
function exportAuthoredGroup(name, root, isFlame) {
  root.updateMatrixWorld(true);
  const items = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const glow = /Flame|flame|Glowing coals/.test(mesh.name);
    if (glow !== isFlame) return;
    if (Array.isArray(mesh.material)) throw new Error('Unhandled fire material groups');
    const instances = mesh.isInstancedMesh ? mesh.count : 1;
    for (let i = 0; i < instances; i++) {
      const instance = new THREE.Matrix4();
      if (mesh.isInstancedMesh) mesh.getMatrixAt(i, instance);
      const world = new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, instance);
      const materialColor = mesh.material.color?.clone() ?? new THREE.Color(1, 1, 1);
      items.push({geom:mesh.geometry, matrix:world, materialColor});
    }
  });
  if (!items.length) throw new Error('Missing approved authored art: ' + name);
  exportMesh(name, items);
}
const hearthScene = new THREE.Group();
const hearth = buildCampfire(hearthScene, layout.campfire);
hearth.update(0);
exportAuthoredGroup('hearth-art', hearth.root, false);
exportAuthoredGroup('hearth-flames', hearth.root, true);
const torchesScene = new THREE.Group();
const torches = buildTorches(torchesScene);
torches.update(0);
exportAuthoredGroup('torches-art', torches.root, false);
exportAuthoredGroup('torches-flames', torches.root, true);
exportMesh('forest-patches', [{geom: createForestFloorPatches(layout)}]);

const resources = layout.resources.map(p => ({
  geom: resourceGeometry(p.kind, p.state),
  position: [p.x, groundHeight(p.x, p.z) - .012, p.z],
  scale: p.scale ?? 1,
  angle: p.angle ?? 0,
}));
exportMesh('resource-art', resources);

exportMesh('stone-props', layout.rocks.map(p => ({
  geom: createRockGeometry(p.type),
  position: [p.x, groundHeight(p.x, p.z) - .035 * p.scale, p.z],
  scale: p.scale, angle: p.angle,
})));

const grasses = [0, 1, 2].map(createGrassGeometry);
exportMesh('grass-props', layout.plants.map(p => ({
  geom: grasses[p.type],
  position: [p.x, groundHeight(p.x, p.z), p.z],
  scale: p.scale, angle: p.angle,
})));
console.log('Exported the Three.js grove: 244 pines,', layout.resources.length,
  'resource placements,', layout.plants.length, 'plants,', layout.rocks.length, 'rocks');
