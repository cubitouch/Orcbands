import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {buildFireAtmosphere} from '../preview/fire-atmosphere.js';
import {createFlameMotion} from '../preview/fire-motion.js';
import {flameGeometry,buildCampfire} from '../preview/campfire.js';
import {CAMPFIRE_PLACEMENT,TORCH_PLACEMENTS} from '../preview/environment-layout.js';
const mesh=new THREE.Mesh(flameGeometry(.2,1,.1));
const animate=createFlameMotion(mesh,1),rest=mesh.geometry.attributes.position.array.slice();
for(const time of [0,.3,1.1,3.7,10000]){
 animate(time);const p=mesh.geometry.attributes.position.array;assert(p.every(Number.isFinite));
 for(let i=0;i<rest.length;i+=3)if(rest[i+1]===0)assert.deepEqual(Array.from(p.slice(i,i+3)),Array.from(rest.slice(i,i+3)),'Bottom ring must stay anchored');
 assert(mesh.scale.y>.65&&mesh.scale.y<1.3);
}
animate(0);const start=mesh.geometry.attributes.position.array.slice();animate(1.1);
assert.notDeepEqual(mesh.geometry.attributes.position.array,start,'Flame shape must deform, not just scale');animate(0);assert.deepEqual(mesh.geometry.attributes.position.array,start,'Pose is independent of playback history');
function capture(time){
 const parent=new THREE.Group(),fx=buildFireAtmosphere(parent,[CAMPFIRE_PLACEMENT,...TORCH_PLACEMENTS]);fx.update(time);
 const hash=createHash('sha256');let count=0;
 parent.traverse(o=>{
  if(!o.isMesh)return;count++;assert(!o.castShadow&&!o.material.depthWrite,'Particles must not write depth or cast shadows');
  assert(o.instanceMatrix.array.every(Number.isFinite));hash.update(new Uint8Array(o.instanceMatrix.array.buffer));
  const alpha=o.geometry.attributes.smokeAlpha;
  if(alpha){assert(Array.from(alpha.array).every(v=>v>=0&&v<=.131));hash.update(new Uint8Array(alpha.array.buffer));}
 });
 assert.equal(count,2,'Only two particle draw batches');assert.equal(fx.metrics().puffs,28);assert.equal(fx.metrics().sparks,18);
 fx.update(0);fx.update(time);return {hash:hash.digest('hex'),metrics:fx.metrics()};
}
assert.deepEqual(capture(0),capture(0));assert.deepEqual(capture(2.3),capture(2.3));assert.notDeepEqual(capture(0),capture(1.1));
const fire=buildCampfire(new THREE.Group(),CAMPFIRE_PLACEMENT);let min=Infinity,max=0;const colors=new Set();
for(let t=0;t<8;t+=.05){fire.update(t);const m=fire.metrics();min=Math.min(min,m.lightIntensity);max=Math.max(max,m.lightIntensity);colors.add(m.lightColor)}
assert(min>5&&max<9&&max-min>1);assert(colors.size>5,'Firelight must vary gently in warmth');
console.log('PASS: deforming anchored flames, deterministic smoke/sparks, two particle batches, bounded opacity, stateless playback and varying warm light.');
