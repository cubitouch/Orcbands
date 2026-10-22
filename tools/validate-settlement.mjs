import assert from 'node:assert/strict';
import * as THREE from 'three';
import {resourceGeometry,buildGroveResources} from '../preview/resources.js';
import {RESOURCE_PLACEMENTS,groundHeight} from '../preview/environment-layout.js';
const empty=resourceGeometry('shelter','empty'),stocked=resourceGeometry('shelter','stocked');
// Colour ramps follow material position, rather than adding random paint noise
// or modifying the global resource palette.
const {weatherTimber,weatherRoof}=await import('../preview/settlement-resources.js');
const {paint}=await import('../preview/resource-geometry.js');
const sample=(g,check)=>{const p=g.getAttribute('position'),c=g.getAttribute('color');let sum=0,n=0;for(let i=0;i<p.count;i++)if(check(p.getY(i))){sum+=c.getX(i);n++}assert(n>0);return sum/n};
const wood=paint(new THREE.BoxGeometry(.3,2,.3),0x705038,101);wood.translate(0,1,0);
weatherTimber(wood);
assert(sample(wood,y=>y>1.9)>sample(wood,y=>y<.1)+.05,'Upper wood must be drier and lighter than wet foundations');
const roofProbe=paint(new THREE.BoxGeometry(.6,1,.6),0x81352e,102);roofProbe.translate(0,2.6,0);
weatherRoof(roofProbe);
assert(sample(roofProbe,y=>y>3)>sample(roofProbe,y=>y<2.2)+.025,'Roof weathering should shade eaves more than high slopes');

assert.deepEqual(stocked.attributes.position.array.slice(0,empty.userData.shellVertices*3),empty.attributes.position.array,'Stocking must preserve the shelter shell');
const foundation=resourceGeometry('construction','foundation'),frame=resourceGeometry('construction','frame'),roof=resourceGeometry('construction','roof');
for(const g of [frame,roof])assert.deepEqual(g.attributes.position.array.slice(0,foundation.userData.foundationVertices*3),foundation.attributes.position.array.slice(0,foundation.userData.foundationVertices*3),'Build stages must preserve foundation markers');
assert.deepEqual(roof.attributes.position.array.slice(0,frame.userData.frameVertices*3),frame.attributes.position.array.slice(0,frame.userData.frameVertices*3),'Roof stage must preserve the erected frame');
assert(foundation.attributes.position.count<frame.attributes.position.count&&frame.attributes.position.count<roof.attributes.position.count,'Build stages add structure');
for(const g of [empty,stocked,foundation,frame,roof]){
 const p=g.attributes.position;
 for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);assert(b.sub(a).cross(c.sub(a)).length()>1e-7,'No degenerate settlement triangles');}
}
const mesh=new THREE.Mesh(empty,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
const frontHits=new THREE.Raycaster(new THREE.Vector3(0,1,2),new THREE.Vector3(0,0,-1)).intersectObject(mesh);
assert(frontHits.length&&frontHits[0].point.z<-.9,'Keep the unloading bay open to the back wall');
const overhead=new THREE.Raycaster(new THREE.Vector3(0,4,0),new THREE.Vector3(0,-1,0)).intersectObject(mesh);
assert(overhead.length&&overhead[0].point.y>2.3,'Shelter roof must cover the central storage bay');
for(const p of RESOURCE_PLACEMENTS.filter(p=>['shelter','construction'].includes(p.kind))){
 const batch=buildGroveResources(new THREE.Group(),[p]),pos=batch.geometry.attributes.position;let contact=Infinity;
 for(let i=0;i<pos.count;i++)contact=Math.min(contact,pos.getY(i)-groundHeight(pos.getX(i),pos.getZ(i)));
 assert(contact>-.10&&contact<.025,'Settlement props must sit on terrain');
 const g=resourceGeometry(p.kind,p.state),points=g.attributes.position;
 for(let i=0;i<points.count;i++)assert(Math.hypot(points.getX(i),points.getZ(i))<=p.radius,'Authored footprint must include the complete structure and clutter');
 for(const other of RESOURCE_PLACEMENTS.filter(o=>o!==p))assert(Math.hypot(p.x-other.x,p.z-other.z)>p.radius+other.radius+.15,'No overlapping settlement/resource footprints');
}
console.log('PASS: cumulative foundations/frame, fixed shelter shell, valid triangles, open unloading bay, covered storage, grounded structures and complete non-overlapping footprints.');
