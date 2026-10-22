import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {makeHut} from './generate-hut.mjs';
import {HUT_PLACEMENT,inHutFootprint,createLayout,pathDistance} from '../preview/environment-layout.js';
const asset=makeHut();
assert(asset.obj.includes('usemtl plank_damp'),'Hut wall slats must have a darker damp base');
assert(asset.obj.includes('usemtl roof_eave'),'Low roof boards need weathered eaves');
assert(asset.mtl.includes('newmtl plank_damp')&&asset.mtl.includes('newmtl roof_eave'),'Hut material ramps not exported');
assert(asset.stats.triangles<3800,'Material weathering must stay within the browser geometry budget');
assert.deepEqual(asset,makeHut(),'Hut export must be deterministic');
assert.equal(asset.obj,await readFile('preview/assets/timber-hut-01.obj','utf8'));
assert.equal(asset.mtl,await readFile('preview/assets/timber-hut-01.mtl','utf8'));
const materials=new MTLLoader().parse(asset.mtl);
const model=new OBJLoader().setMaterials(materials).parse(asset.obj);
model.updateMatrixWorld(true);
let triangles=0;
const parts=new Set();
model.traverse(o=>{
 if(!o.isMesh)return;parts.add(o.name);
 const positions=o.geometry.getAttribute('position');
 assert([...positions.array].every(Number.isFinite),'Finite exported coordinates');
 triangles+=positions.count/3;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<positions.count;i+=3){
  a.fromBufferAttribute(positions,i);b.fromBufferAttribute(positions,i+1);c.fromBufferAttribute(positions,i+2);
  assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-14,'No degenerate exported triangles');
 }
});
assert.equal(triangles,asset.stats.triangles);
for(const name of ['entrance_lintel','shadowed_back_wall','roof_underlay','ridge_cap_0','entrance_barrel','crate_body','tribe_banner','banner_emblem'])assert(parts.has(name),'Missing '+name);
const ray=new THREE.Raycaster();
function cast(origin,direction){ray.set(new THREE.Vector3(...origin),new THREE.Vector3(...direction));return ray.intersectObject(model,true)}
// Regression: the early straight gable left visible sky gaps under the bowed roof.
for(const x of [-1.2,1.2])for(const side of [-1,1]){
 const hits=cast([x,3.3,side*8],[0,0,-side]);
 assert(hits.length&&hits[0].object.name.startsWith('curved_gable_infill'),'Curved gable must close the roof/wall gap');
}
const underside=cast([1.2,3.1,2.2],[0,1,0]);
assert(underside.length&&underside[0].object.name==='roof_underlay','Overhang must have a real underside');
const doorway=cast([0,1.15,8],[0,0,-1]);
assert(doorway.length&&doorway[0].point.z < -1.5,'Entrance must be a real open recess');
for(const x of [-2.55,-1.25,.08,1.25,2.55]){
 const hits=cast([x,8,.65],[0,-1,0]);assert(hits.length,'Roof coverage missing');
 const hit=hits[0],m=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;
 assert(m.name.startsWith('roof_'),'Roof must cover the walls');
}
const layout=createLayout();
for(const p of [...layout.plants,...layout.rocks])assert(!inHutFootprint(p.x,p.z),'Dressing must clear hut foundation');
// Main track stays east of the complete building and its pennant.
for(const [x,z] of [[-2.8,-2.4],[-2.8,2.4],[2.8,-2.4],[2.8,2.4],[3.65,-.55]]){
 const wx=x+HUT_PLACEMENT.x,wz=z+HUT_PLACEMENT.z;
 // The entrance approach deliberately meets the step; these corners must stay clear of it.
 assert(pathDistance(wx,wz)>.10,'Building must not block the path');
}
const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
console.log('PASS: deterministic shipped hut, valid triangles, curved gable closure, open doorway, roof coverage, clear foundation and path.',{
 ...asset.stats,bounds:size.toArray(),sha256:createHash('sha256').update(asset.obj).digest('hex')
});
