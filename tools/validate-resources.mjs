import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {resourceGeometry,createResource,buildGroveResources,RESOURCE_STATES,exportResourceOBJ} from '../preview/resources.js';
import {RESOURCE_PLACEMENTS,createLayout,pathDistance,inHutFootprint,nearTorch,nearCampfire,nearResource,groundHeight} from '../preview/environment-layout.js';
const second=await import('../preview/resources.js?independent=1');
function hash(g){const h=createHash('sha256');for(const a of Object.values(g.attributes))h.update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));return h.digest('hex')}
for(const [kind,states] of Object.entries(RESOURCE_STATES))for(const state of states){
 if(state==='standing')continue;
 const g=resourceGeometry(kind,state);assert.equal(hash(g),hash(second.resourceGeometry(kind,state)),'Independent generation must match');
 assert(g.attributes.position.array.every(Number.isFinite));assert(g.attributes.color.array.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 assert(g.attributes.normal.array.every(Number.isFinite));assert(g.attributes.position.count%3===0);
 const bounds=new THREE.Box3().setFromBufferAttribute(g.attributes.position);assert(bounds.min.y>=-.001,'Studio resource must rest above the floor');
 const obj=exportResourceOBJ(createResource(kind,state)),parsed=new OBJLoader().parse(obj);let colored=false;
 parsed.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.color?.count===o.geometry.attributes.position.count,'OBJ export must retain palette');assert(o.geometry.attributes.color.array.every((v,i)=>Math.abs(v-g.attributes.color.array[i])<.00001),'OBJ round trip must preserve actual palette values');colored=true}});assert(colored);
}
const foliage=resourceGeometry('bush','empty').attributes.position.array;
for(const [state,count] of [['full',30],['picked',10],['empty',0]]){
 const g=resourceGeometry('bush',state);assert.equal(g.userData.berryCount,count);
 assert.deepEqual(g.attributes.position.array.slice(0,foliage.length),foliage,'Picking must preserve foliage');
}
const stump=resourceGeometry('wood','stump'),p=stump.attributes.position;let cutArea=0;
for(let i=0;i<p.count;i+=3){
 const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);
 const cross=b.clone().sub(a).cross(c.clone().sub(a));assert(cross.length()>.000001,'No degenerate triangles');
 if(Math.min(a.y,b.y,c.y)>.40&&cross.y>0)cutArea+=cross.y*.5;
}
assert(cutArea>.14,'Fresh-cut stump face must point upward and cover the trunk');
const fallen=resourceGeometry('wood','trunk').attributes.position;
const extent=new THREE.Box3().setFromBufferAttribute(fallen);
for(const side of ['left','right']){
 let lowest=Infinity;
 for(let i=0;i<fallen.count;i++)if(side==='left'?fallen.getX(i)<extent.min.x+.07:fallen.getX(i)>extent.max.x-.07)lowest=Math.min(lowest,fallen.getY(i));
 assert(lowest<.035,'Both tapered trunk ends must rest on the ground');
}
const layout=createLayout();
for(const r of RESOURCE_PLACEMENTS){
 assert(pathDistance(r.x,r.z)>r.radius+.25,'Resources must not obstruct the routes');
 assert(!inHutFootprint(r.x,r.z,r.radius)&&!nearTorch(r.x,r.z,r.radius)&&!nearCampfire(r.x,r.z,r.radius));
 assert(layout.trees.every(t=>Math.hypot(t.x-r.x,t.z-r.z)>.3*t.scale+r.radius),'Keep resources clear of standing trunks');
}
for(const r of layout.rocks)assert(!nearResource(r.x,r.z,r.radius),'Keep old rocks outside resource footprints');
for(const r of layout.plants)assert(!nearResource(r.x,r.z,[.30,.36,.55][r.type]*r.scale),'Clear ground cover underneath resource props');
const root=new THREE.Group(),batch=buildGroveResources(root,layout.resources);assert.equal(root.children.length,1,'Grove resources use one draw batch');
assert(batch.geometry.attributes.position.array.every(Number.isFinite));
console.log('PASS: reproducible tree/berry forms, identical foliage across depletion states, colored OBJ round trip, upward cut face, grounded studio meshes, route/prop clearance and one grove batch.',{triangles:batch.geometry.attributes.position.count/3,plants:layout.plants.length,rocks:layout.rocks.length});
