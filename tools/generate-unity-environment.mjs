// Export the APPROVED Three.js forest and resource geometry for Unity.
// The layout, resource states and color information come directly from the
// existing Asset Lab source, rather than from a second independently-authored map.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import {
  createLayout, groundHeight, wornGround, HUT_PLACEMENT, TORCH_PLACEMENTS, TREE_COUNT, MAP_HALF_EXTENT,
} from '../preview/environment-layout.js';
import { groundVariation, noise } from '../preview/ground-surface.js';
import { createGrassGeometry, createRockGeometry, createForestFloorPatches, createTerrainGeometry } from '../preview/environment.js';
import { createStoryGeometry } from '../preview/forest-story.js';
import { buildCampfire } from '../preview/campfire.js';
import { buildTorches } from '../preview/torches.js';
import { resourceGeometry } from '../preview/resources.js';
import { generateTreeShadowTexture, originalPineTriangles } from './generate-unity-tree-shadows.mjs';

const root = resolve(import.meta.dirname, '../unity/Assets/Orcbands/Generated');
mkdirSync(root, { recursive: true });
const layout = createLayout();
if (layout.trees.length !== TREE_COUNT) throw new Error('Expected the expanded 1,220-pine forest');
const shadowResult = generateTreeShadowTexture(layout.trees, resolve(root, 'approved-pine-shadows.png'));
if (shadowResult.enhancedRoots < 80)
  throw new Error('Too few tree roots have ground-contact shading');
// Original local pine geometry supports small runtime shadow repairs after felling.
const shadowSource = originalPineTriangles();
writeFileSync(resolve(root, 'pine-shadow-source.json'), JSON.stringify({
  vertices: shadowSource.vertices.map(([x,y,z])=>({x:-x,y,z})),
  triangles: shadowSource.triangles.flat(),
}) + '\n');
const expected = ['shelter/stocked', 'construction/roof', 'bush/full', 'wood/stump', 'stone/full'];
for (const key of expected) if (!layout.resources.some(r => r.kind + '/' + r.state === key))
  throw new Error('Missing forest resource: ' + key);
writeFileSync(resolve(root, 'grove-layout.json'), JSON.stringify({
  seed: layout.seed,
  mapHalfExtent: MAP_HALF_EXTENT,
  // Gameplay footprints share the exact reflected placements with rendered art.
  navigationObstacles: [
    ...layout.trees.map(p=>({x:-p.x,z:p.z,radius:1.36*p.scale*(p.width??1)})),
    ...layout.resources.filter(p=>p.state!=='chips').map(p=>({x:-p.x,z:p.z,radius:p.radius})),
    {x:-HUT_PLACEMENT.x,z:HUT_PLACEMENT.z,halfWidth:3.25,halfDepth:2.6,angle:-HUT_PLACEMENT.angle},
    {x:-layout.campfire.x,z:layout.campfire.z,radius:1.15},
    ...TORCH_PLACEMENTS.map(p=>({x:-p.x,z:p.z,radius:.38})),
    ...layout.rocks.filter(p=>p.type>0).map(p=>({x:-p.x,z:p.z,radius:p.radius})),
    ...layout.story.filter(p=>p.kind==='deadLog'||p.kind==='mossRock')
      .map(p=>({x:-p.x,z:p.z,radius:p.radius})),
  ],
  // Existing authored camp footprints also protect chopping work positions.
  workExclusions: [...layout.resources,
    {...HUT_PLACEMENT,radius:3.9}, {...layout.campfire,radius:1.15},
    ...TORCH_PLACEMENTS.map(p=>({...p,radius:.38}))]
    .map(p=>({x:-p.x,z:p.z,radius:p.radius})),
  trails: layout.trails.map(samples => ({points:samples.map(p=>({...p,x:-p.x}))})),
  // Three.js is right-handed and Unity's world is left-handed: reflect X
  // so the original camera/view and the authored layout match on screen.
  trees: layout.trees.map(p => ({ ...p, x: -p.x, angle: -p.angle })),
  hut: { ...HUT_PLACEMENT, x: -HUT_PLACEMENT.x, angle: -HUT_PLACEMENT.angle },
  campfire: { ...layout.campfire, x: -layout.campfire.x },
  torches: TORCH_PLACEMENTS.map(p => ({ ...p, x: -p.x })),
  mines: layout.resources.map((p,i)=>({...p,obstacleIndex:layout.trees.length+layout.resources.slice(0,i).filter(r=>r.state!=='chips').length}))
    .filter(p=>p.kind==='stone'&&p.state==='full').map(p=>({...p,x:-p.x,angle:-(p.angle??0)})),
  resourceCount: layout.resources.length,
  story: layout.story.map(p => ({...p,x:-p.x,angle:-p.angle})),
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
// Unity now loads the exact approved terrain geometry with the original
// nonuniform tessellation, meandering paths, far meadow and color flecks.
// No independent 0.75m reconstruction that can introduce checkerboard faceting.
exportMesh('terrain', [{geom: createTerrainGeometry()}]);

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
exportMesh('woodland-story', [{geom:createStoryGeometry(layout)}]);
exportMesh('forest-patches', [{geom: createForestFloorPatches(layout)}]);

exportMesh('harvest-stump', [{geom:resourceGeometry('wood','stump')}]);

exportMesh('mine-full', [{geom:resourceGeometry('stone','full')}]);
exportMesh('mine-depleted', [{geom:resourceGeometry('stone','depleted')}]);
const resources = layout.resources.filter(p=>!(p.kind==='stone'&&p.state==='full')).map(p => ({
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
console.log('Exported the woodland:', layout.trees.length, 'pines,', layout.resources.length,
  'resource placements,', layout.plants.length, 'plants,', layout.rocks.length, 'rocks');

