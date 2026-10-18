import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createLayout,groundHeight,pathDistance,pathPoint,wornGround} from '../preview/environment-layout.js';
const layout=createLayout();
assert.deepEqual(layout,createLayout(),'Scene must reproduce exactly');
assert.notDeepEqual(layout,createLayout(42),'Seed must control variation');
assert(layout.trees.length>=235&&layout.trees.length<=250,'Deep surrounding woodland');
assert.deepEqual([...new Set(layout.plants.map(p=>p.type))].sort(),[0,1,2]);
assert.deepEqual([...new Set(layout.rocks.map(p=>p.type))].sort(),[0,1,2]);
for(const tree of layout.trees) {
  assert(tree.scale>=.83&&tree.scale<=1.17,'Only modest uniform tree scales');
  assert(pathDistance(tree.x,tree.z)>1.36*tree.scale+.3,'Tree canopy must clear the path');
  assert(Math.hypot(tree.x/6,tree.z/5)>1,'Central clearing remains available');
}
for(const p of [...layout.trees,...layout.rocks,...layout.plants]) {
  assert([p.x,p.z,p.scale,p.angle,groundHeight(p.x,p.z)].every(Number.isFinite));
}
for(const rock of layout.rocks)assert(pathDistance(rock.x,rock.z)>rock.radius+.22,'Rocks must clear the path');
for(const plant of layout.plants) {
  const radius=[.30,.36,.55][plant.type]*plant.scale;
  assert(pathDistance(plant.x,plant.z)>radius+.21,'Entire grass silhouette must clear the path fringe');
}
for(let i=0;i<=100;i++) {
  const p=pathPoint(i/100);
  assert(p.halfWidth>.75&&p.halfWidth<1.6,'Continuous readable corridor width');
}
console.log('PASS: seeded layout, clear corridor, central clearing, all six prop forms.',{
  trees:layout.trees.length,rocks:layout.rocks.length,plants:layout.plants.length,
  sha256:createHash('sha256').update(JSON.stringify(layout)).digest('hex')
});

// Validate real generated buffers too: placement alone would not catch missing or inverted surfaces.
const THREE=await import('three');
const {readFile}=await import('node:fs/promises');
const {OBJLoader}=await import('three/addons/loaders/OBJLoader.js');
const {MTLLoader}=await import('three/addons/loaders/MTLLoader.js');
const {buildEnvironment}=await import('../preview/environment.js');
const materials=new MTLLoader().parse(await readFile('preview/assets/low-poly-pine-01.mtl','utf8'));
const source=new OBJLoader().setMaterials(materials).parse(await readFile('preview/assets/low-poly-pine-01.obj','utf8'));
source.traverse(o=>{if(o.isMesh)o.geometry.computeVertexNormals()});
function bufferSignature(){
  const parent=new THREE.Group();buildEnvironment(parent,source);
  const hash=createHash('sha256');
  parent.traverse(o=>{
    if(!o.isMesh)return;
    for(const attr of Object.values(o.geometry.attributes)){
      assert(attr.array.every(Number.isFinite),'Invalid generated vertex data');
      hash.update(new Uint8Array(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength));
    }
    if(o.instanceMatrix)hash.update(new Uint8Array(o.instanceMatrix.array.buffer));
    if(o.instanceColor)hash.update(new Uint8Array(o.instanceColor.array.buffer));
    if(o.name==='Forest floor'){
      const normals=o.geometry.getAttribute('normal');
      for(let i=0;i<normals.count;i++)assert(normals.getY(i)>.9,'Terrain and integrated path must face upward');
    }
  });
  const result=hash.digest('hex');
  parent.traverse(o=>{if(o.isMesh)o.geometry.dispose()});
  return result;
}
const geometryHash=bufferSignature();assert.equal(geometryHash,bufferSignature());
console.log('PASS: actual mesh attributes and instance buffers reproduce bit-for-bit; integrated path faces upward.',geometryHash);

for(let i=0;i<=50;i++){const p=pathPoint(i/50);assert(wornGround(p.x,p.z)>.65,'Worn route must remain readable');}
