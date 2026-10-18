import * as THREE from 'three';
import {createFlameMotion,fireSignal} from './fire-motion.js?v=__ORCBANDS_REVISION__';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRockGeometry} from './environment.js?v=__ORCBANDS_REVISION__';
import {groundHeight,seededRandom} from './environment-layout.js?v=__ORCBANDS_REVISION__';

export function flameGeometry(radius,height,lean){
 const vertices=[],n=5;
 const low=Array.from({length:n},(_,i)=>[Math.cos(i/n*Math.PI*2)*radius,0,Math.sin(i/n*Math.PI*2)*radius]);
 const mid=Array.from({length:n},(_,i)=>[Math.cos(i/n*Math.PI*2+.2)*radius*.64+lean*.36,height*.45,Math.sin(i/n*Math.PI*2+.2)*radius*.64]);
 const tip=[lean,height,-radius*.12];
 const tri=(a,b,c)=>vertices.push(...a,...b,...c);
 for(let i=0;i<n;i++){
  const j=(i+1)%n;
  tri(low[i],mid[i],low[j]);tri(low[j],mid[i],mid[j]);tri(mid[i],tip,mid[j]);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
export function buildCampfire(parent,placement){
 const root=new THREE.Group();root.name='Campfire';
 const base=groundHeight(placement.x,placement.z);root.position.set(placement.x,base,placement.z);parent.add(root);
 const random=seededRandom(2701),matrix=new THREE.Object3D();
 // Reuse the authored chipped-stone shape, partly buried and turned around the hearth.
 const stones=new THREE.InstancedMesh(createRockGeometry(0),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),11);
 stones.name='Hearth stones';stones.castShadow=true;stones.receiveShadow=true;
 for(let i=0;i<11;i++){
  const angle=i/11*Math.PI*2,r=.76+(random()-.5)*.08,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
  matrix.position.set(x,groundHeight(placement.x+x,placement.z+z)-base-.04,z);
  matrix.rotation.set(0,angle+random()*.3,0);matrix.scale.set(.62+random()*.12,.65+random()*.12,.65);
  matrix.updateMatrix();stones.setMatrixAt(i,matrix.matrix);
 }
 root.add(stones);
 const charcoal=new THREE.Mesh(new THREE.CylinderGeometry(.69,.62,.065,12),new THREE.MeshStandardMaterial({color:0x33271c,roughness:1}));
 charcoal.name='Ash bed';charcoal.position.y=.015;charcoal.receiveShadow=true;root.add(charcoal);
 const wood=new THREE.MeshStandardMaterial({color:0x43301f,roughness:1,flatShading:true});
 const logs=[];
 for(let i=0;i<3;i++){
  const g=new THREE.CylinderGeometry(.11,.14,1.12,7,1);g.rotateZ(Math.PI/2);
  g.rotateY(i*Math.PI/3+.2);g.translate(0,.14+i*.035,0);logs.push(g);
 }
 const merged=mergeGeometries(logs);logs.forEach(g=>g.dispose());
 const fuel=new THREE.Mesh(merged,wood);fuel.name='Crossed firewood';fuel.castShadow=true;root.add(fuel);
 const emberMaterial=new THREE.MeshBasicMaterial({color:0xe85c17,toneMapped:false});
 const embers=[];
 for(let i=0;i<13;i++){
  const angle=random()*Math.PI*2,r=random()*.49,g=new THREE.IcosahedronGeometry(.045+random()*.035,0);
  g.scale(1,.35,1);g.translate(Math.cos(angle)*r,.08,Math.sin(angle)*r);embers.push(g);
 }
 const emberGeometry=mergeGeometries(embers);embers.forEach(g=>g.dispose());
 const emberMesh=new THREE.Mesh(emberGeometry,emberMaterial);emberMesh.name='Glowing coals';root.add(emberMesh);
 const orange=new THREE.MeshBasicMaterial({color:0xf87519,toneMapped:false});
 const gold=new THREE.MeshBasicMaterial({color:0xffcf4c,toneMapped:false});
 const core=new THREE.MeshBasicMaterial({color:0xffe9a0,toneMapped:false});
 const tongues=[];
 const placements=[[-.23,.03,.20,.76,-.12],[.21,-.07,.18,.84,.13],[.02,.16,.18,.91,-.12],[-.02,-.05,.25,1.13,.15]];
 for(let i=0;i<placements.length;i++){
  const [x,z,r,h,lean]=placements[i],mesh=new THREE.Mesh(flameGeometry(r,h,lean),i%2?gold:orange);
  mesh.position.set(x,.19,z);mesh.name='Flame tongue '+i;root.add(mesh);tongues.push(mesh);
 }
 const heart=new THREE.Mesh(flameGeometry(.18,.65,-.04),core);heart.position.set(.03,.18,.10);heart.name='Flame heart';root.add(heart);tongues.push(heart);
 // A small local light provides warmth; it never creates a dynamic shadow-map pass.
 const light=new THREE.PointLight(0xff963d,1.2,4.5,2);light.name='Fire warmth';light.position.y=.72;light.castShadow=false;root.add(light);
 const motion=tongues.map((mesh,i)=>createFlameMotion(mesh,i*1.9));
 let time=0;
 function update(t){
  time=t;
  motion.forEach(animate=>animate(t));
  const warmth=fireSignal(t,.8);
  light.intensity=7.2+warmth*1.6;
  light.color.setHSL(.075+warmth*.012,1,.62);
  light.position.set(Math.sin(t*2.8)*.055,.76+warmth*.035,Math.cos(t*3.1)*.045);
  emberMaterial.color.setHSL(.045+warmth*.008,.95,.42+warmth*.035);
 }
 update(0);
 return {root,update,metrics(){return {time,scales:tongues.map(m=>m.scale.y),lightIntensity:light.intensity,lightColor:light.color.getHex(),tip:Array.from(tongues[0].geometry.attributes.position.array.slice(21,24))}}};
}
