import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TORCH_PLACEMENTS,REVEAL_SOURCES,visibilityAt,buildCampVisibility} from '../preview/camp-visibility.js';
import {buildTorches} from '../preview/torches.js';
import {groundHeight,pathDistance,createLayout,nearTorch} from '../preview/environment-layout.js';

assert.equal(TORCH_PLACEMENTS.length,4);
for(const p of REVEAL_SOURCES)assert.equal(visibilityAt(p.x,p.z),1,'Reveal source must be clear');
for(const [x,z] of [[40,40],[-40,-40],[0,35]])assert.equal(visibilityAt(x,z),0,'Distant forest must receive full mist treatment');
// Continuous transition and monotonic falloff away from the southernmost source.
let previous=1;
for(let z=10;z<27;z+=.05){const v=visibilityAt(-1,z);assert(v<=previous+1e-6);assert(previous-v<.04);previous=v;}
assert(visibilityAt(-1,16)>.5,'Nearby forest beyond torch radius must remain partly visible');
assert(visibilityAt(-1,19)>0,'Soft reveal transition must extend into surrounding woodland');
const layout=createLayout();
for(const p of TORCH_PLACEMENTS){
 assert(pathDistance(p.x,p.z)>.6,'Stakes must remain beside the path');
 assert(layout.trees.every(t=>Math.hypot(t.x-p.x,t.z-p.z)>2),'Torches must not intersect trees');
 assert(Number.isFinite(groundHeight(p.x,p.z)));
}
for(const p of [...layout.plants,...layout.rocks])assert(!nearTorch(p.x,p.z),'No vegetation or loose rocks through torch footings');
function capture(t){
 const root=new THREE.Group(),torches=buildTorches(root);torches.update(t);root.updateMatrixWorld(true);
 let count=0;const geometry=[];
 root.traverse(o=>{
  if(o.isPointLight){count++;assert(!o.castShadow&&o.distance<=5);}
  if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite));geometry.push(Array.from(o.geometry.attributes.position.array));}
 });
 assert.equal(count,4);return {geometry,metrics:torches.metrics()};
}
assert.deepEqual(capture(0),capture(0));assert.notDeepEqual(capture(0).metrics.scales,capture(1).metrics.scales);
const root=new THREE.Group(),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),2);root.add(mesh);
const mask=buildCampVisibility(root),shader={vertexShader:'#include <common>\n#include <project_vertex>',fragmentShader:'#include <common>\n#include <opaque_fragment>',uniforms:{}};
mesh.material.onBeforeCompile(shader);assert(shader.vertexShader.includes('instanceMatrix*campLocal'));
mask.setEnabled(false);assert.equal(shader.uniforms.campFogEnabled.value,0);mask.setEnabled(true);
root.rotation.y=.7;mask.update();
const identity=new THREE.Matrix4().elements;
assert(new THREE.Matrix4().multiplyMatrices(root.matrixWorld,shader.uniforms.campFogInverse.value).elements.every((v,i)=>Math.abs(v-identity[i])<1e-12),'Mask follows grove rotation');
console.log('PASS: source union, soft boundary, path/tree/plant clearance, deterministic torches, animation, instanced mask, toggle and rotation.');
