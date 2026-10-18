import assert from 'node:assert/strict';
import * as THREE from 'three';
import {resourceGeometry,buildGroveResources} from '../preview/resources.js';
import {createLayout,RESOURCE_PLACEMENTS,groundHeight} from '../preview/environment-layout.js';
for(const kind of ['woodpile','stonepile','food']){
 const empty=resourceGeometry(kind,'empty'),partial=resourceGeometry(kind,'partial'),full=resourceGeometry(kind,'full');
 assert.equal(empty.userData.contents,0);assert(full.userData.contents>partial.userData.contents&&partial.userData.contents>0,'Stockpile fill must be readable and monotonic');
 const count=kind==='food'?empty.userData.containerVertices:empty.attributes.position.count;
 for(const g of [partial,full])assert.deepEqual(g.attributes.position.array.slice(0,count*3),empty.attributes.position.array.slice(0,count*3),'Fill state must preserve supports/containers');
 for(const g of [empty,partial,full]){
  const pos=g.attributes.position;
  for(let i=0;i<pos.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,i),b=new THREE.Vector3().fromBufferAttribute(pos,i+1),c=new THREE.Vector3().fromBufferAttribute(pos,i+2);assert(b.sub(a).cross(c.sub(a)).length()>1e-7,'No degenerate storage triangles')}
 }
}
const full=resourceGeometry('stone','full'),depleted=resourceGeometry('stone','depleted');
assert.equal(full.attributes.position.count,depleted.attributes.position.count);
for(let i=0;i<full.attributes.position.count;i++){
 assert.equal(full.attributes.position.getX(i),depleted.attributes.position.getX(i));assert.equal(full.attributes.position.getZ(i),depleted.attributes.position.getZ(i));
}
const fullBox=new THREE.Box3().setFromBufferAttribute(full.attributes.position),depletedBox=new THREE.Box3().setFromBufferAttribute(depleted.attributes.position);
assert(fullBox.max.y>1.5&&depletedBox.max.y<.55,'Mining must leave a low remnant in the same footprint');
for(const p of RESOURCE_PLACEMENTS.filter(p=>['stone','woodpile','stonepile','food'].includes(p.kind))){
 const root=new THREE.Group(),mesh=buildGroveResources(root,[p]),pos=mesh.geometry.attributes.position;let contact=Infinity;
 for(let i=0;i<pos.count;i++)contact=Math.min(contact,pos.getY(i)-groundHeight(pos.getX(i),pos.getZ(i)));
 assert(contact<.025&&contact>-.10,'Stockpiles/outcrops must sit in the terrain, without floating or excessive sinking');
}
assert.equal(createLayout().trees.length,244,'Preserve the standing forest');
console.log('PASS: empty/partial/full contents, fixed supports/baskets, valid triangles, matching outcrop footprint, visible depletion and terrain contact.');
