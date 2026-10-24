import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createLayout,groundHeight,pathDistance,pathPoint,wornGround,woodlandTrails,MAP_HALF_EXTENT} from '../preview/environment-layout.js';
const layout=createLayout();
assert.deepEqual(layout,createLayout(),'Scene must reproduce exactly');
assert.notDeepEqual(layout,createLayout(42),'Seed must control variation');
assert.equal(layout.trees.length,1220,'Expand the original 244-pine forest fivefold');
assert.equal(MAP_HALF_EXTENT,110);
assert.equal(woodlandTrails.length,6,'Six connected seeded woodland branches');
for(const route of woodlandTrails)for(const p of route){
 assert(Math.abs(p.x)<MAP_HALF_EXTENT&&Math.abs(p.z)<MAP_HALF_EXTENT,'Trail must remain on the map');
 assert(wornGround(p.x,p.z)>.65,'New trails must be continuously worn');
}
for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]])
 assert(layout.trees.filter(t=>t.x*sx>44&&t.z*sz>39).length>80,'New trees must spread across the wider map');
const widths=new Set(layout.trees.map(p=>p.width));
const heights=new Set(layout.trees.map(p=>p.height));
assert(widths.size>=3&&heights.size>=3,'Forest must mix tall, narrow and broad low crowns');
assert(layout.trees.some(p=>p.height>1.2)&&layout.trees.some(p=>p.height<.85),
  'Tree silhouettes must differ meaningfully at RTS viewing distance');
assert.deepEqual([...new Set(layout.plants.map(p=>p.type))].sort(),[0,1,2]);
assert.deepEqual([...new Set(layout.rocks.map(p=>p.type))].sort(),[0,1,2]);
for(const tree of layout.trees) {
  assert(tree.scale>=.83&&tree.scale<=1.17,'Keep original deterministic overall scale range');
  assert(tree.width>=.78&&tree.width<=1.14&&tree.height>=.77&&tree.height<=1.27,
    'Separate crown and height variants must remain restrained');
  assert(pathDistance(tree.x,tree.z)>1.36*tree.scale*tree.width+.30,
    'Wider crowns must not obstruct walkable paths');
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
const {buildEnvironment,hearthBounceColor}=await import('../preview/environment.js');
// The stronger warm pool is baked in the same terrain vertices for both
// browser and Unity. It stays spatially bounded, without a spotlight decal.
const neutralGround=new THREE.Color(0x687958);
const fireCenter=hearthBounceColor(neutralGround.clone(),.1,.15);
const fireEdge=hearthBounceColor(neutralGround.clone(),3.5,.15);
const distantGround=hearthBounceColor(neutralGround.clone(),9,.15);
assert(fireCenter.r>neutralGround.r+.12,'Firelight bounce should have a noticeable amber lift');
assert(fireCenter.r>fireEdge.r&&fireEdge.r>distantGround.r,'Hearth bounce should fade smoothly');
assert(distantGround.equals(neutralGround),'No firelight tint beyond the local clearing');
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
