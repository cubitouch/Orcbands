import * as THREE from 'three';
import {groundHeight,seededRandom} from './environment-layout.js?v=__ORCBANDS_REVISION__';

// Small, fixed pools of reusable mesh particles. No spawning, textures or timers.
export function buildFireAtmosphere(parent,sources){
 const root=new THREE.Group();root.name='Smoke and drifting embers';parent.add(root);
 const random=seededRandom(2901),puffs=[],sparks=[];
 sources.forEach((source,index)=>{
  const hearth=index===0,count=hearth?12:4;
  const base=groundHeight(source.x,source.z)+(hearth?1.05:2.22);
  for(let i=0;i<count;i++)puffs.push({x:source.x,z:source.z,base,phase:i/count+random()*.04,
   life:(hearth?4.8:3.5)+random()*1.4,rise:hearth?2.8:1.65,size:hearth?.45:.21,
   offset:random()*Math.PI*2});
  for(let i=0;i<(hearth?10:2);i++)sparks.push({x:source.x,z:source.z,base:base-.3,
   phase:random(),life:1.8+random()*1.4,rise:hearth?2.1:1.15,offset:random()*Math.PI*2});
 });
 const smokeGeometry=new THREE.IcosahedronGeometry(1,1);
 const alpha=new THREE.InstancedBufferAttribute(new Float32Array(puffs.length),1);alpha.setUsage(THREE.DynamicDrawUsage);
 smokeGeometry.setAttribute('smokeAlpha',alpha);
 const smokeMaterial=new THREE.MeshBasicMaterial({color:0x939489,transparent:true,depthWrite:false});
 smokeMaterial.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float smokeAlpha;\nvarying float vSmokeAlpha;\nvarying vec3 vSmokeNormal;\nvarying vec3 vSmokeView;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    vSmokeAlpha=smokeAlpha;
    vec3 smokeNormal=normal;
    #ifdef USE_INSTANCING
     smokeNormal=mat3(instanceMatrix)*smokeNormal;
    #endif
    vSmokeNormal=normalize(normalMatrix*smokeNormal);`)
   .replace('#include <project_vertex>','#include <project_vertex>\nvSmokeView=-mvPosition.xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vSmokeAlpha;\nvarying vec3 vSmokeNormal;\nvarying vec3 vSmokeView;')
   .replace('#include <color_fragment>',`#include <color_fragment>
    float facing=abs(dot(normalize(vSmokeNormal),normalize(vSmokeView)));
    diffuseColor.a*=vSmokeAlpha*smoothstep(.15,.95,facing);`);
 };
 smokeMaterial.customProgramCacheKey=()=> 'fire-smoke-soft-alpha-v2';
 const smoke=new THREE.InstancedMesh(smokeGeometry,smokeMaterial,puffs.length);smoke.name='Thin drifting smoke';
 smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);smoke.frustumCulled=false;smoke.renderOrder=2;root.add(smoke);
 const emberMaterial=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const embers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),emberMaterial,sparks.length);embers.name='Rising sparks';
 embers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);embers.frustumCulled=false;embers.renderOrder=1;root.add(embers);
 const pose=new THREE.Object3D(),color=new THREE.Color();let time=0;
 function update(t){
  time=t;
  puffs.forEach((p,i)=>{
   const age=((t/p.life+p.phase)%1+1)%1,fade=Math.pow(Math.sin(Math.PI*age),1.3);
   const spread=p.size*(.32+age*1.15);
   pose.position.set(p.x+age*age*.85+Math.sin(age*5+p.offset)*.12*age,
    p.base+age*p.rise,p.z-age*age*.45+Math.cos(age*4+p.offset)*.16*age);
   pose.rotation.set(age*.6+p.offset,age*.8+p.offset,age*.4);
   pose.scale.set(spread*(1+age*.3),spread*.86,spread);pose.updateMatrix();smoke.setMatrixAt(i,pose.matrix);
   alpha.setX(i,fade*(i<12?.105:.065));
  });
  sparks.forEach((p,i)=>{
   const age=((t/p.life+p.phase)%1+1)%1,fade=Math.pow(Math.sin(Math.PI*age),2);
   pose.position.set(p.x+Math.sin(age*7+p.offset)*.17+age*.35,p.base+age*p.rise,p.z+Math.cos(age*6+p.offset)*.14-age*.20);
   pose.rotation.set(age*8,p.offset,age*5);pose.scale.setScalar((i<10?.024:.016)*fade);
   pose.updateMatrix();embers.setMatrixAt(i,pose.matrix);
   color.setRGB(1,.32+age*.25,.035).multiplyScalar(.6+fade*.8);embers.setColorAt(i,color);
  });
  smoke.instanceMatrix.needsUpdate=true;alpha.needsUpdate=true;embers.instanceMatrix.needsUpdate=true;embers.instanceColor.needsUpdate=true;
 }
 update(0);
 return {root,update,metrics(){return {time,puffs:puffs.length,sparks:sparks.length,
  smokeSample:Array.from(smoke.instanceMatrix.array.slice(12,15)),opacitySample:alpha.getX(0)}}};
}
