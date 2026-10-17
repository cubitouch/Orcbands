import * as THREE from 'three';
import { createCrashSite } from './world.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas=document.getElementById('viewport');
const viewer=document.getElementById('viewer');
const loading=document.getElementById('loading');
const status=document.getElementById('status');
const assetRevision=document.querySelector('meta[name="orcbands-build"]')?.content||'dev';
const assetUrl=name=>'./assets/'+name+'?v='+encodeURIComponent(assetRevision);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,0.1,100);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setClearColor(0x1c2c28,0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
let sceneMode='character';
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;
controls.dampingFactor=.075;
controls.minDistance=3.4;
controls.maxDistance=12;
controls.minPolarAngle=.22;
controls.maxPolarAngle=1.53;
controls.enablePan=true;
function resetView(){
 if(sceneMode==='camp'){
   camera.position.set(11.6,9.3,12.5);
   controls.target.set(0,1.05,-.2);
 } else {
   camera.position.set(5.1,3.8,6.8);
   controls.target.set(0,1.43,0);
 }
 controls.update();
}
resetView();
scene.add(new THREE.HemisphereLight(0xdff4f9,0x433d2f,2.25));
const key=new THREE.DirectionalLight(0xffe7bd,2.6);
key.position.set(-4,8,6);
scene.add(key);
const fill=new THREE.DirectionalLight(0x94c5a9,1.3);
fill.position.set(5,3,-5);
scene.add(fill);
const floor=new THREE.Mesh(new THREE.CircleGeometry(2.5,64),new THREE.MeshStandardMaterial({color:0x365241,roughness:1,metalness:0}));
floor.rotation.x=-Math.PI/2;
floor.position.y=-.02;
scene.add(floor);
const grid=new THREE.GridHelper(5,10,0x52725d,0x52725d);
grid.position.y=.001;
const gridMaterials=Array.isArray(grid.material)?grid.material:[grid.material];
gridMaterials.forEach(m=>{m.transparent=true;m.opacity=.18});
scene.add(grid);
const model=new THREE.Group();
scene.add(model);
let blenderModel=null;
const sculptFiles={
  'sculpt-v1':'worker-orc-sculpt-v1.glb',
  'sculpt-v2':'worker-orc-sculpt-v2-head.glb',
  sculpt:'worker-orc-sculpt-study.glb'
};
const sculptLabels={
  'sculpt-v1':'Sculpt #16 · Original',
  'sculpt-v2':'Sculpt #17 · Face',
  sculpt:'Sculpt #18 · Hands'
};
const sculptModels=new Map();
const sculptRequested=new Set();
const versionLabels={
  prototype:'Original prototype',
  blender:'Blender static asset',
  rigged:'Rigged beta',
  ...sculptLabels
};
function isSculpt(version){return Object.hasOwn(sculptFiles,version);}
function selectedLabel(){return versionLabels[modelVersion]||versionLabels.prototype;}
function updateModelLink(version){
  const pageUrl=new URL(window.location.href);
  pageUrl.searchParams.set('model',version);
  window.history.replaceState(null,'',pageUrl.pathname+pageUrl.search+pageUrl.hash);
}
let riggedModel=null;
let riggedMixer=null;
let riggedClips=[];
let modelVersion='prototype';
const requestedFromUrl=new URLSearchParams(window.location.search).get('model');
let requestedVersion=Object.hasOwn(versionLabels,requestedFromUrl)?requestedFromUrl:'sculpt'; // latest artistic study by default
let glbRequested=false;
let rigGlbRequested=false;
const crashSite=createCrashSite(THREE);
crashSite.visible=false;
scene.add(crashSite);

const pivots={};
const articulation={
  left_arm:[-.72,1.91,0],
  right_arm:[.72,1.91,0],
  left_leg:[-.32,1.13,0],
  right_leg:[.32,1.13,0],
  head:[0,2.04,0],
};
let pose='idle',spinning=false,ready=false;
const clock=new THREE.Clock();
function updateRiggedProps(clipName) {
  if(!riggedModel) return;
  const carrying=clipName.toLowerCase()==='carry';
  riggedModel.traverse(object=>{
    if(object.name.startsWith('CARRY_PROP_')) object.visible=carrying;
    if(object.name.startsWith('Axe')) object.visible=!carrying;
  });
}
function playRiggedClip(name) {
  if(!riggedMixer)return;
  const clip=riggedClips.find(c=>c.name.toLowerCase().includes(name.toLowerCase()));
  if(!clip){status.textContent='Missing exported animation: '+name;return;}
  updateRiggedProps(name);
  riggedMixer.stopAllAction();
  const action=riggedMixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat,Infinity);
  action.play();
}
function setPose(next){
  pose=next;
  document.querySelectorAll('.pose').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pose===next)));
  if(modelVersion==='rigged') {
    playRiggedClip(next==='chop'?'Chop':next==='walk'?'Walk':next==='carry'?'Carry':'Idle');
    status.textContent='Rigged beta — actual skinned '+next+' animation (not Unity-validated)';
  } else {
    status.textContent=next==='idle'?'Idle — inspect the model':next==='walk'?'Walk — prototype rigid-part cycle':'Chop — prototype swing (not skeletal animation)';
  }
}
document.querySelectorAll('.pose').forEach(button=>button.addEventListener('click',()=>setPose(button.dataset.pose)));
function syncCharacterPosition() {
  const x=sceneMode==='camp'?-1.15:0;
  const z=sceneMode==='camp'?1.15:0;
  const angle=sceneMode==='camp'?-.18:0;
  model.position.x=x; model.position.z=z; model.rotation.y=angle;
  if(blenderModel) {
    blenderModel.position.set(x,0,z);
    blenderModel.rotation.y=angle;
  }
  for(const sceneObject of sculptModels.values()){
    sceneObject.position.set(x,0,z);
    sceneObject.rotation.y=angle;
  }
  if(riggedModel){
    riggedModel.position.set(x,0,z);
    riggedModel.rotation.y=angle;
  }
}
function setModelVersion(version) {
  if(!Object.hasOwn(versionLabels,version))return;
  requestedVersion=version;
  if(version==='blender'&&!blenderModel){
    if(glbRequested)return;
    glbRequested=true;
    status.textContent='Loading Blender vNext model…';
    new GLTFLoader().load(assetUrl('worker-orc-vnext.glb'), gltf=>{
      blenderModel=gltf.scene;
      scene.add(blenderModel);
      blenderModel.traverse(child=>{
        if(child.isMesh){ child.castShadow=true; child.receiveShadow=true; }
      });
      glbRequested=false;
      if(requestedVersion==='blender')setModelVersion('blender');
      else blenderModel.visible=false;
    },undefined,()=>{
      glbRequested=false;
      status.textContent='Blender model not bundled here yet; original prototype remains available.';
    });
    return;
  }
  if(isSculpt(version)&&!sculptModels.has(version)) {
    if(sculptRequested.has(version))return;
    sculptRequested.add(version);
    status.textContent='Loading '+sculptLabels[version]+'…';
    new GLTFLoader().load(assetUrl(sculptFiles[version]),gltf=>{
      const candidate=gltf.scene;
      candidate.traverse(node=>{
        if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}
      });
      scene.add(candidate);
      sculptModels.set(version,candidate);
      sculptRequested.delete(version);
      if(requestedVersion===version)setModelVersion(version);
      else candidate.visible=false;
    },undefined,()=>{
      sculptRequested.delete(version);
      status.textContent=sculptLabels[version]+' GLB unavailable; previous model preserved.';
    });
    return;
  }
  if(version==='rigged'&&!riggedModel) {
    if(rigGlbRequested)return;
    rigGlbRequested=true;
    status.textContent='Loading animated skinned orc…';
    new GLTFLoader().load(assetUrl('worker-orc-skinned-experiment.glb'),gltf=>{
      if(!gltf.animations.length){
        rigGlbRequested=false;
        status.textContent='Rigged model loaded but animation clips are missing.';
        return;
      }
      riggedModel=gltf.scene;
      updateRiggedProps('Idle');
      riggedClips=gltf.animations;
      riggedMixer=new THREE.AnimationMixer(riggedModel);
      riggedModel.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
      scene.add(riggedModel);
      rigGlbRequested=false;
      if(requestedVersion==='rigged')setModelVersion('rigged');
      else riggedModel.visible=false;
    },undefined,()=>{
      rigGlbRequested=false;
      status.textContent='Animated GLB unavailable in this preview; no model changed.';
    });
    return;
  }
  modelVersion=version;
  model.visible=version==='prototype';
  if(blenderModel)blenderModel.visible=version==='blender';
  for(const [stage,candidate] of sculptModels)candidate.visible=version===stage;
  if(riggedModel)riggedModel.visible=version==='rigged';
  document.querySelectorAll('.version').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.version===version)));
  document.querySelectorAll('.pose').forEach(b=>b.disabled=version==='blender'||isSculpt(version)||(b.dataset.pose==='carry'&&version!=='rigged'));
  document.getElementById('scene-label').textContent=selectedLabel()+' · '+(sceneMode==='camp'?'Crash site':'Studio');
  syncCharacterPosition();
  if(version==='rigged')setPose(pose==='carry'?pose:'idle');
  else status.textContent=isSculpt(version)?sculptLabels[version]+' — original static textured GLB, not rigged or Unity-validated':version==='blender'?'Blender vNext — static model; proper Humanoid rig and animation pending':'Original placeholder — rigid-part movement preview';
}
document.querySelectorAll('.version').forEach(button=>button.addEventListener('click',()=>{
  updateModelLink(button.dataset.version);
  setModelVersion(button.dataset.version);
}));
function setScene(mode) {
  sceneMode=mode;
  crashSite.visible=mode==='camp';
  floor.visible=mode==='character';
  grid.visible=mode==='character';
  document.getElementById('scene-label').textContent=selectedLabel()+' · '+(mode==='camp'?'Crash site':'Studio');
  document.querySelectorAll('.scene').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scene===mode)));
  syncCharacterPosition();
  resetView();
}
document.querySelectorAll('.scene').forEach(button=>button.addEventListener('click',()=>setScene(button.dataset.scene)));
document.getElementById('spin').addEventListener('click',e=>{
 spinning=!spinning;
 e.currentTarget.setAttribute('aria-pressed',String(spinning));
});
document.getElementById('reset').addEventListener('click',()=>{resetView();model.rotation.y=0;if(blenderModel)blenderModel.rotation.y=0;for(const candidate of sculptModels.values())candidate.rotation.y=0;if(riggedModel)riggedModel.rotation.y=0;});
function resize(){
 const width=viewer.clientWidth,height=viewer.clientHeight;
 if(width===0||height===0)return;
 renderer.setSize(width,height,false);
 camera.aspect=width/height;
 camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);
resize();
function onModelLoaded(object){
  model.add(object);
  for(const [name,origin] of Object.entries(articulation)){
    const mesh=object.getObjectByName(name);
    if(!mesh||!mesh.isMesh)throw new Error('Missing articulated mesh: '+name);
    const pivot=new THREE.Group();
    pivot.name='pivot_'+name;
    pivot.position.set(...origin);
    object.remove(mesh);
    mesh.geometry.translate(-origin[0],-origin[1],-origin[2]);
    pivot.add(mesh);
    model.add(pivot);
    pivots[name]=pivot;
  }
  object.traverse(child=>{
    if(child.isMesh){child.castShadow=true;child.receiveShadow=true;}
  });
  ready=true;
  loading.hidden=true;
  setPose('idle');
  // Old primitive is a compatibility fallback when the newest GLB cannot load.
  setModelVersion(requestedVersion);
}
new MTLLoader().setPath('./assets/').load('orc-worker.mtl',materials=>{
  materials.preload();
  new OBJLoader().setMaterials(materials).setPath('./assets/').load('orc-worker.obj',onModelLoaded,undefined,error=>{
    loading.textContent='Could not load the orc mesh. Serve this folder over HTTP, not file://.';
    status.textContent=String(error);
  });
},undefined,error=>{
  loading.textContent='Could not load the character materials.';
  status.textContent=String(error);
});
function frame(){
 requestAnimationFrame(frame);
 const delta=clock.getDelta();
 const t=clock.elapsedTime;
 if(riggedMixer)riggedMixer.update(delta);
 if(ready){
   const l=pivots.left_leg,r=pivots.right_leg,la=pivots.left_arm,ra=pivots.right_arm,h=pivots.head;
   const walk=pose==='walk',chop=pose==='chop';
   const stride=walk?Math.sin(t*7)*.50:0;
   l.rotation.x=stride;r.rotation.x=-stride;
   la.rotation.x=walk?-stride*.6:chop?.12:Math.sin(t*1.3)*.015;
   ra.rotation.x=walk?stride*.6:chop?-.8+Math.cos(t*5.2)*.8:Math.sin(t*1.3+.8)*.025;
   ra.rotation.z=chop?-.10:0;
   h.rotation.y=Math.sin(t*.85)*.035;
   model.position.y=walk?Math.abs(Math.sin(t*7))*.037:Math.sin(t*1.5)*.014;
   if(spinning){if(modelVersion==='rigged'&&riggedModel)riggedModel.rotation.y+=.0045;else if(modelVersion==='blender'&&blenderModel)blenderModel.rotation.y+=.0045;else if(isSculpt(modelVersion)&&sculptModels.has(modelVersion))sculptModels.get(modelVersion).rotation.y+=.0045;else model.rotation.y+=.0045;}
 }
 controls.update();
 renderer.render(scene,camera);
}
frame();
