import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {buildCampfire} from '../preview/campfire.js';
import {CAMPFIRE_PLACEMENT,createLayout,nearCampfire,pathDistance,groundHeight} from '../preview/environment-layout.js';
function capture(time){
 const parent=new THREE.Group(),fire=buildCampfire(parent,CAMPFIRE_PLACEMENT);
 const base=fire.root.position.toArray();fire.update(time);parent.updateMatrixWorld(true);
 const hash=createHash('sha256');let lights=0,flames=0,triangles=0;
 parent.traverse(o=>{
  if(o.isPointLight){lights++;assert(!o.castShadow);assert(o.distance<=5);}
  if(!o.isMesh)return;
  const pos=o.geometry.getAttribute('position');assert(pos.array.every(Number.isFinite));
  triangles+=(o.geometry.index?o.geometry.index.count:pos.count)/3*(o.count||1);
  for(const attr of Object.values(o.geometry.attributes))hash.update(new Uint8Array(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength));
  hash.update(JSON.stringify(o.matrixWorld.elements));
  if(o.instanceMatrix)hash.update(new Uint8Array(o.instanceMatrix.array.buffer));
  if(o.name.startsWith('Flame ')){flames++;assert.equal(o.position.y,o.name==='Flame heart'?.18:.19,'Flame bases must stay anchored');}
 });
 assert.equal(lights,1);assert.equal(flames,5);assert(triangles<1200);
 assert.deepEqual(fire.root.position.toArray(),base,'Animation cannot move the hearth');
 assert.equal(base[1],groundHeight(CAMPFIRE_PLACEMENT.x,CAMPFIRE_PLACEMENT.z));
 const bounds=new THREE.Box3().setFromObject(parent),size=bounds.getSize(new THREE.Vector3());
 assert(size.x<2.5&&size.z<2.5&&size.y<1.8,'Compact low-poly hearth');
 const result={sha256:hash.digest('hex'),metrics:fire.metrics(),triangles};
 parent.traverse(o=>{if(o.isMesh)o.geometry.dispose()});return result;
}
assert.deepEqual(capture(0),capture(0),'Campfire geometry and pose must reproduce at a given time');
assert.notDeepEqual(capture(0).metrics.scales,capture(1.1).metrics.scales,'Flames must flicker');
assert(pathDistance(CAMPFIRE_PLACEMENT.x,CAMPFIRE_PLACEMENT.z)>1.15,'Hearth must remain beside the route');
const layout=createLayout();
for(const p of [...layout.plants,...layout.rocks])assert(!nearCampfire(p.x,p.z),'Keep vegetation and rocks outside hearth');
console.log('PASS: deterministic 3D hearth, anchored animated flames, clear path, compact geometry and bounded light.',capture(0));
