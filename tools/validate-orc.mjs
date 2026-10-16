import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const path='preview/assets/orc-worker.obj';
const source=readFileSync(path,'utf8');
const materialText=readFileSync('preview/assets/orc-worker.mtl','utf8');
const lines=source.split(/\r?\n/);
let vertices=0,triangles=0;
const objects=new Set(),usedMaterials=new Set(),availableMaterials=new Set();
for(const line of materialText.split(/\r?\n/))if(line.startsWith('newmtl '))availableMaterials.add(line.slice(7).trim());
for(const line of lines){
 if(line.startsWith('v ')){const xyz=line.trim().split(/\s+/).slice(1).map(Number);assert.equal(xyz.length,3);assert(xyz.every(Number.isFinite));vertices++;}
 if(line.startsWith('f ')){
  const indices=line.trim().split(/\s+/).slice(1).map(Number);
  assert.equal(indices.length,3,'All faces must be triangles');
  assert(indices.every(i=>Number.isInteger(i)&&i>0&&i<=vertices),'Face index out of range');
  triangles++;
 }
 if(line.startsWith('o '))objects.add(line.slice(2).trim());
 if(line.startsWith('usemtl '))usedMaterials.add(line.slice(7).trim());
}
for(const name of ['torso','head','left_arm','right_arm','left_leg','right_leg'])assert(objects.has(name),'Missing articulated part: '+name);
for(const m of usedMaterials)assert(availableMaterials.has(m),'Missing material: '+m);
assert(vertices>500,'Model appears empty');
assert(triangles>500,'Mesh appears empty');
console.log('OBJ valid:',vertices,'vertices,',triangles,'triangles,',objects.size,'parts,',usedMaterials.size,'materials');
