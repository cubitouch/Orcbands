import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';

const host=document.getElementById('viewer'),canvas=document.getElementById('viewport');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,120);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.075;
controls.minDistance=2.5;controls.maxDistance=26;
controls.maxPolarAngle=Math.PI*.495;controls.enablePan=true;
scene.add(new THREE.HemisphereLight(0xe6f4e4,0x655f53,2.2));
const sun=new THREE.DirectionalLight(0xffe8c3,2.35);
sun.position.set(-5,11,7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13});
sun.shadow.bias=-.0004;scene.add(sun);
const studio=new THREE.Group(),grove=new THREE.Group();
scene.add(studio,grove);
function ground(parent,r,color){
 const mesh=new THREE.Mesh(new THREE.CircleGeometry(r,64),new THREE.MeshStandardMaterial({color,roughness:1}));
 mesh.rotation.x=-Math.PI/2;mesh.position.y=-.035;mesh.receiveShadow=true;
 parent.add(mesh);
}
ground(studio,3,0x677e61);ground(grove,9,0x718461);
const grid=new THREE.GridHelper(6,12,0xd7e6ce,0x49604b);
grid.position.y=.006;
for(const m of (Array.isArray(grid.material)?grid.material:[grid.material])){m.transparent=true;m.opacity=.16}
studio.add(grid);
let sourceTree=null,mode='studio',spin=false,wireframe=false;
const assetRevision=document.querySelector('meta[name="orcbands-build"]')?.content||'dev';
function assetUrl(name){return './assets/'+name+'?v='+encodeURIComponent(assetRevision)}
function resetCamera(){
 if(mode==='grove'){camera.position.set(12.5,10.3,13.8);controls.target.set(0,1.75,0)}
 else{camera.position.set(5.8,4.9,7.2);controls.target.set(0,2.2,0)}
 controls.update();
}
function addDetails(){
 const stone=new THREE.MeshStandardMaterial({color:0x92968c,flatShading:true,roughness:1});
 const grass=new THREE.MeshStandardMaterial({color:0x506d4b,flatShading:true,roughness:1});
 for(let i=0;i<21;i++){
  const a=i*2.39996,r=2.1+i*.29;
  const b=new THREE.Mesh(new THREE.DodecahedronGeometry(.16+i%4*.045,0),stone);
  b.position.set(Math.cos(a)*r,.085,Math.sin(a)*r);b.scale.set(1.3,.6,.95);b.castShadow=true;grove.add(b);
 }
 for(let i=0;i<54;i++){
  const a=i*2.39996,r=1.7+Math.sqrt(i/54)*6.9;
  const t=new THREE.Mesh(new THREE.ConeGeometry(.055,.17+i%3*.045,3),grass);
  t.position.set(Math.cos(a)*r,.075,Math.sin(a)*r);grove.add(t);
 }
}
function setMode(next){
 mode=next;studio.visible=next==='studio';grove.visible=next==='grove';
 document.querySelectorAll('.scene').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===mode)));
 document.getElementById('scene-label').textContent=mode==='studio'?'Single tree · inspect geometry':'Grove · 7 instances';
 const url=new URL(location.href);
 if(next==='grove')url.searchParams.set('scene','grove');else url.searchParams.delete('scene');
 history.replaceState(null,'',url.pathname+url.search+url.hash);
 window.__orcbandsMode=next;
 resetCamera();
}
document.querySelectorAll('.scene').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.scene)));
document.getElementById('reset').addEventListener('click',resetCamera);
document.getElementById('spin').addEventListener('click',e=>{
 spin=!spin;e.currentTarget.setAttribute('aria-pressed',String(spin));
});
document.getElementById('wireframe').addEventListener('click',e=>{
 wireframe=!wireframe;e.currentTarget.setAttribute('aria-pressed',String(wireframe));
 if(sourceTree)sourceTree.traverse(o=>{if(o.isMesh)for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.wireframe=wireframe});
});
function resize(){
 const w=host.clientWidth,h=host.clientHeight;
 if(!w||!h)return;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);resize();
const status=document.getElementById('status');
new MTLLoader().setPath('./assets/').load('low-poly-pine-01.mtl',materials=>{
 materials.preload();
 new OBJLoader().setMaterials(materials).load(assetUrl('low-poly-pine-01.obj'),object=>{
  sourceTree=object;
  object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.geometry.computeVertexNormals()}});
  studio.add(object);
  const layout=[[-4.9,-3.2,1.05,.1],[-1.9,-3.75,.77,1.1],[2,-4.2,1.17,.3],
   [5.05,-1.1,.88,2],[-5.4,2.2,.9,2.1],[.4,2.4,1,1.5],[4.5,3.9,.76,.8]];
  for(const [x,z,scale,angle] of layout){
   const tree=object.clone(true);tree.position.set(x,0,z);tree.scale.setScalar(scale);tree.rotation.y=angle;grove.add(tree);
  }
  addDetails();
  status.textContent='Loaded actual OBJ/MTL · 144 faces · 4 foliage tiers · 4.58 units tall';
  document.getElementById('loading').hidden=true;
  window.__orcbandsTreeLoaded=true;
  setMode(new URLSearchParams(location.search).get('scene')==='grove'?'grove':'studio');
 },undefined,e=>{document.getElementById('loading').textContent='Tree OBJ failed to load';status.textContent=String(e)});
},undefined,e=>{document.getElementById('loading').textContent='Tree materials failed to load';status.textContent=String(e)});
const clock=new THREE.Clock();
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(clock.getDelta(),.06);
 if(spin)(mode==='studio'?studio:grove).rotation.y+=dt*.25;
 controls.update();renderer.render(scene,camera);
}
frame();