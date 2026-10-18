import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {flameGeometry} from './campfire.js?v=__ORCBANDS_REVISION__';
import {groundHeight} from './environment-layout.js?v=__ORCBANDS_REVISION__';
import {TORCH_PLACEMENTS} from './camp-visibility.js?v=__ORCBANDS_REVISION__';

export function buildTorches(parent){
 const root=new THREE.Group();root.name='Camp torches';parent.add(root);
 const wood=new THREE.MeshStandardMaterial({color:0x68482c,roughness:1,flatShading:true});
 const iron=new THREE.MeshStandardMaterial({color:0x45413c,roughness:.82,metalness:.25,flatShading:true});
 const stone=new THREE.MeshStandardMaterial({color:0x777566,roughness:1,flatShading:true});
 const parts=[[],[],[]],flames=[],lights=[];
 const flameMaterials=[0xf58022,0xffc94b,0xffe6a0].map(color=>new THREE.MeshBasicMaterial({color,toneMapped:false}));
 TORCH_PLACEMENTS.forEach((p,i)=>{
  const base=groundHeight(p.x,p.z);
  const add=(g,slot,y)=>{g.translate(p.x,base+y,p.z);parts[slot].push(g)};
  add(new THREE.CylinderGeometry(.075,.115,1.7,7),0,.81);
  add(new THREE.CylinderGeometry(.25,.32,.18,6),2,.025);
  // Flared iron basket and collar, open at the flame end.
  add(new THREE.CylinderGeometry(.21,.105,.28,7,1,true),1,1.68);
  for(const y of [.35,1.28,1.56])add(new THREE.CylinderGeometry(.112,.112,.075,7),1,y);
  for(let j=0;j<3;j++){
   const g=flameGeometry([.15,.11,.065][j],[.56,.44,.31][j],.065);
   const mesh=new THREE.Mesh(g,flameMaterials[j]);mesh.name=`Torch ${i+1} flame ${j}`;
   mesh.position.set(p.x+(j-1)*.045,base+1.76,p.z+(j===1?.035:0));root.add(mesh);flames.push({mesh,phase:i*2+j});
  }
  const light=new THREE.PointLight(0xffae58,2.8,5,2);light.position.set(p.x,base+2,p.z);light.castShadow=false;root.add(light);lights.push(light);
 });
 parts.forEach((geometries,i)=>{
  const mesh=new THREE.Mesh(mergeGeometries(geometries),[wood,iron,stone][i]);mesh.name=['Torch stakes','Iron baskets and bindings','Buried stone footings'][i];
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);geometries.forEach(g=>g.dispose());
 });
 function update(time){
  flames.forEach(({mesh,phase})=>{const pulse=Math.sin(time*(7+phase*.12)+phase*1.7);mesh.scale.set(1+pulse*.06,1+pulse*.12,1-pulse*.05);mesh.rotation.y=Math.sin(time*4+phase)*.15});
  lights.forEach((light,i)=>light.intensity=2.8+.25*Math.sin(time*8+i*2)+.12*Math.sin(time*13+i));
 }
 update(0);return {root,update,metrics(){return {count:TORCH_PLACEMENTS.length,scales:flames.map(f=>f.mesh.scale.y)}}};
}
