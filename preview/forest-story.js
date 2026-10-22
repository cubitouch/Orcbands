import * as THREE from 'three';
import {triangles,paint,join,leaf} from './resource-geometry.js?v=__ORCBANDS_REVISION__';
import {groundHeight,seededRandom,STORY_POCKETS} from './environment-layout.js?v=__ORCBANDS_REVISION__';
import {noise} from './ground-surface.js?v=__ORCBANDS_REVISION__';

// Small deadwood and stems need only triangular cross sections at RTS scale.
function beam(a,b,r1,r2,color,seed=1){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
 const g=paint(new THREE.CylinderGeometry(r2,r1,delta.length(),3),color,seed);
 g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
 g.translate(...start.add(end).multiplyScalar(.5).toArray());return g;
}
// Broad organic stains are baked into the existing terrain, without extra
// coplanar discs, decals, material passes or an abrupt perimeter ring.
export function woodlandMulch(x,z){
 let amount=0;
 for(const [cx,cz] of STORY_POCKETS){
  const d=Math.hypot((x-cx)/2.8,(z-cz)/2.1);
  amount=Math.max(amount,Math.max(0,1-d+(noise(x*.85+4,z*.8)-.5)*.43));
 }
 return amount;
}
function deadLog(variant){
 const parts=[],n=7,length=2.65,points=[];
 // Crooked, sunken trunk with jagged dark broken ends; deliberately different
 // from the straight, pale-cut timber resources already in the camp.
 for(let ring=0;ring<3;ring++)for(let j=0;j<n;j++){
  const a=j/n*Math.PI*2,r=[.29,.34,.22][ring]*(1+.13*Math.sin(j*4.1));
  points.push([-length/2+ring*length/2+(ring===1?0:.12*Math.sin(j*2.2)),
   .24+Math.sin(a)*r+(ring===1?.06:0),Math.cos(a)*r+(ring===1?.1:0)]);
 }
 for(let ring=0;ring<2;ring++)for(let j=0;j<n;j++){
  const a=ring*n+j,b=ring*n+(j+1)%n,c=b+n,d=a+n;
  const color=[0x514435,0x63513a,0x453b2e,0x6b5a42][(j+variant)%4];
  parts.push(triangles(points,[[a,d,b],[b,d,c]],color,50+j));
 }
 for(const offset of [0,14]){
  const center=[offset===0?-length/2:length/2,.24,0],end=[center,...points.slice(offset,offset+n)];
  const faces=Array.from({length:n},(_,j)=>offset===0?[0,j+1,(j+1)%n+1]:[0,(j+1)%n+1,j+1]);
  parts.push(triangles(end,faces,0x554431,70));
 }
 parts.push(beam([-.4,.42,.05],[-.7,.66,.52],.11,.035,0x514333));
 parts.push(beam([.65,.33,-.1],[.95,.43,-.53],.085,.025,0x514333));
 // Asymmetric moss shelf, rather than an evenly painted green cylinder.
 const moss=paint(new THREE.DodecahedronGeometry(1,0),0x607047,83);
 moss.scale(.72,.10,.23);moss.translate(-.28,.56,.06);parts.push(moss);
 return join(parts);
}
function fallenBranch(variant){
 const color=[0x69553d,0x5b4b37,0x756047][variant];
 return join([beam([-.55,.06,-.09],[.14,.12,.08],.065,.043,color),
  beam([.14,.12,.08],[.57,.045,.18],.043,.012,color),
  beam([-.1,.10,.02],[.12,.09,-.38],.035,.01,color)]);
}
function mossRock(variant){
 const g=paint(new THREE.IcosahedronGeometry(1,0),0x7e8070,91+variant);
 g.scale(.66,.49,.47);g.rotateY(variant*.8);g.translate(.04,.26,-.02);
 const p=g.attributes.position,c=g.attributes.color;
 for(let i=0;i<p.count;i+=3){
  const y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;
  const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3;
  // Moss favours the upper left shoulder; quiet grey facets remain exposed.
  if(y>.33&&x<.29)for(let j=0;j<3;j++){
   const color=new THREE.Color(y>.52?0x71814d:0x576b40);c.setXYZ(i+j,color.r,color.g,color.b);
  }
 }
 return g;
}
function mushroomCluster(variant){
 const parts=[],random=seededRandom(901+variant);
 for(let i=0;i<4;i++){
  const x=(random()-.5)*.40,z=(random()-.5)*.38,h=.12+random()*.16,r=.085+random()*.07;
  parts.push(beam([x,0,z],[x+.012,h,z],.022,.018,0xb7aa83,50+i));
  const cap=paint(new THREE.ConeGeometry(r,r*.62,5,1),[0xae8052,0x9b6f49,0xb39464][variant],100+i);
  cap.translate(x+.012,h,z);parts.push(cap);
 }
 return join(parts);
}
function fern(variant){
 const parts=[];
 for(let i=0;i<5;i++){
  const g=leaf(.12,.39+(i%3)*.07,[0x4e693f,0x617547,0x6b794b][variant],71+i);
  g.rotateX(-.36);g.rotateY(i*2.399);parts.push(g);
 }
 return join(parts);
}
function chips(variant){
 const parts=[];
 for(let i=0;i<3;i++){
  const g=triangles([[-.13,0,-.03],[.11,0,-.04],[.07,.035,.04],[-.08,0,.06]],
   [[0,2,1],[0,3,2],[0,1,3],[1,2,3]],0x99805b,variant+i);
  g.rotateY(i*2.399);g.translate(Math.cos(i*2.399)*.08,.008,Math.sin(i*2.399)*.07);parts.push(g);
 }
 return join(parts);
}
const factories={deadLog,branch:fallenBranch,mossRock,mushrooms:mushroomCluster,fern,chips};
export function createStoryPropGeometry(kind,variant){return factories[kind](variant)}
export function createStoryGeometry(layout){
 const cache=new Map(),parts=[];
 for(const p of layout.story){
  const key=p.kind+'/'+p.variant;
  if(!cache.has(key))cache.set(key,createStoryPropGeometry(p.kind,p.variant));
  const g=cache.get(key).clone();g.scale(p.scale,p.scale,p.scale);g.rotateY(p.angle);
  g.translate(p.x,groundHeight(p.x,p.z),p.z);parts.push(g);
 }
 const merged=join(parts);cache.forEach(g=>g.dispose());return merged;
}
export function buildForestStory(parent,layout){
 const material=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(createStoryGeometry(layout),material);
 mesh.name='Woodland deadwood, moss and undergrowth';mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
 return mesh;
}
