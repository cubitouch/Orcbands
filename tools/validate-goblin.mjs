import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {makeGoblin} from './generate-goblin.mjs';

const asset=makeGoblin();
assert.equal(asset.obj,makeGoblin().obj,'Export must reproduce exactly');
assert.equal(asset.obj,await readFile('preview/assets/goblin-01.obj','utf8'));
assert.equal(asset.mtl,await readFile('preview/assets/goblin-01.mtl','utf8'));
const model=new OBJLoader().setMaterials(new MTLLoader().parse(asset.mtl)).parse(asset.obj);
const names=new Set();let triangles=0;
model.traverse(o=>{
 if(!o.isMesh)return;names.add(o.name);
 const p=o.geometry.attributes.position;triangles+=p.count/3;
 assert([...p.array].every(Number.isFinite),'Coordinates must be finite');
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<p.count;i+=3){
  a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
  assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-14,`Degenerate triangle in ${o.name}`);
 }
});
assert.equal(triangles,asset.stats.triangles);
assert(triangles<3000,'Keep the static study within its mesh budget');
for(const n of ['head','nose','beard','crest_lock_1','right_ear','left_ear','right_eye','left_eye','right_tusk','left_tusk','buckle_face','right_palm','left_palm','right_finger_0','left_finger_0'])assert(names.has(n),'Missing '+n);
model.updateMatrixWorld(true);
const ray=new THREE.Raycaster();
function visible(x,y){ray.set(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1));return ray.intersectObject(model,true)[0]?.object.name}
// The face details must actually face forwards and sit above the head surface.
assert.equal(visible(0,1.66),'nose');
assert.equal(visible(-.15,1.715),'right_eye');
assert.equal(visible(.15,1.715),'left_eye');
assert.equal(visible(0,1.28),'beard');
assert.equal(visible(0,.78),'buckle_face');
console.log('PASS: deterministic Goblin 01, finite non-degenerate exported triangles and visible face/belt details.',asset.stats);
