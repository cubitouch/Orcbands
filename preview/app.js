import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {buildEnvironment,instanceAsset} from './environment.js?v=__ORCBANDS_REVISION__';
import {HUT_PLACEMENT} from './environment-layout.js?v=__ORCBANDS_REVISION__';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';

const host=document.getElementById('viewer'),canvas=document.getElementById('viewport');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;
// Static art only needs new shadows after a scene/material change or active rotation.
renderer.shadowMap.autoUpdate=false;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,240);
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
const studio=new THREE.Group(),grove=new THREE.Group(),hutStudio=new THREE.Group();
scene.add(studio,grove,hutStudio);
function ground(parent,r,color){
 const mesh=new THREE.Mesh(new THREE.CircleGeometry(r,64),new THREE.MeshStandardMaterial({color,roughness:1}));
 mesh.rotation.x=-Math.PI/2;mesh.position.y=-.035;mesh.receiveShadow=true;
 parent.add(mesh);
}
ground(studio,3,0x677e61);ground(hutStudio,4.6,0x677e61);
const grid=new THREE.GridHelper(6,12,0xd7e6ce,0x49604b);
grid.position.y=.006;
for(const m of (Array.isArray(grid.material)?grid.material:[grid.material])){m.transparent=true;m.opacity=.16}
studio.add(grid);
let sourceTree=null,sourceHut=null,mode='studio',spin=false,wireframe=false;
const assetRevision=document.querySelector('meta[name="orcbands-build"]')?.content||'dev';
function assetUrl(name){return './assets/'+name+'?v='+encodeURIComponent(assetRevision)}
function resetCamera(){
 controls.enableDamping=false;controls.update();controls.enableDamping=true;
 spin=false;document.getElementById('spin').setAttribute('aria-pressed','false');
 grove.rotation.y=0;studio.rotation.y=0;hutStudio.rotation.y=0;renderer.shadowMap.needsUpdate=true;
 controls.minDistance=mode==='grove'?6:2.5;controls.maxDistance=mode==='grove'?90:26;
 if(mode==='grove'){camera.position.set(27,27,32);controls.target.set(0,0,0)}
 else if(mode==='hut'){camera.position.set(7.3,5.0,9);controls.target.set(.3,1.8,0)}
 else{camera.position.set(5.8,4.9,7.2);controls.target.set(0,2.2,0)}
 controls.update();
}
function setMode(next){
 mode=next;
 scene.background=next==='grove'?new THREE.Color(0x9da98c):null;
 scene.fog=next==='grove'?new THREE.Fog(0x9da98c,65,110):null;
 sun.position.set(...(next==='grove'?[-22,36,18]:[-5,11,7]));
 const extent=next==='grove'?28:13;
 Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:100});
 sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
 studio.visible=next==='studio';grove.visible=next==='grove';hutStudio.visible=next==='hut';
 document.querySelectorAll('.scene').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===mode)));
 document.getElementById('grove-views').hidden=next!=='grove';
 document.getElementById('hut-views').hidden=next!=='hut';
 document.getElementById('status').textContent=next==='grove'?'Forest grove · Pine 01 + Timber Hut 01':next==='hut'?'Timber Hut 01 · original static OBJ/MTL · timber frame, red roof and open entrance':'Loaded actual OBJ/MTL · 144 faces · 4 foliage tiers · 4.58 units tall';
 resize();
 document.getElementById('scene-label').textContent=mode==='studio'?'Single tree · inspect geometry':mode==='hut'?'Timber Hut · 01':'Forest grove · 36 pines + hut';
 const url=new URL(location.href);
 if(next!=='studio')url.searchParams.set('scene',next);else url.searchParams.delete('scene');
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
 renderer.shadowMap.needsUpdate=true;
 wireframe=!wireframe;e.currentTarget.setAttribute('aria-pressed',String(wireframe));
 for(const root of [sourceTree,sourceHut,grove,hutStudio])root?.traverse(o=>{if(o.isMesh)for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.wireframe=wireframe});
});
function resize(){
 const w=host.clientWidth,h=host.clientHeight;
 if(!w||!h)return;
 renderer.setSize(w,h,false);camera.aspect=w/h;
 // Keep woodland width readable on a portrait screen without pushing the camera into fog.
 camera.fov=mode!=='studio'?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(38)/2)*Math.max(1,(mode==='grove'?1.45:1.20)/camera.aspect))):38;
 camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);resize();
const status=document.getElementById('status');
function loadAsset(stem){
 return new Promise((resolve,reject)=>new MTLLoader().setPath('./assets/').load(stem+'.mtl?v='+encodeURIComponent(assetRevision),materials=>{
  materials.preload();new OBJLoader().setMaterials(materials).load(assetUrl(stem+'.obj'),resolve,undefined,reject);
 },undefined,reject));
}
Promise.all([loadAsset('low-poly-pine-01'),loadAsset('timber-hut-01')]).then(([tree,hut])=>{
 sourceTree=tree;sourceHut=hut;
 for(const object of [tree,hut])object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.geometry.computeVertexNormals()}});
 studio.add(tree);
 const layout=buildEnvironment(grove,tree);
 instanceAsset(hutStudio,hut,[{x:0,z:0,scale:1,angle:0}]);
 instanceAsset(grove,hut,[HUT_PLACEMENT]);
 window.__orcbandsLayout=layout;
 document.getElementById('loading').hidden=true;
 window.__orcbandsTreeLoaded=true;window.__orcbandsHutLoaded=true;
 const requested=new URLSearchParams(location.search).get('scene');
 setMode(['grove','hut'].includes(requested)?requested:'studio');
}).catch(error=>{document.getElementById('loading').textContent='Asset failed to load';status.textContent=String(error)});
const reviewViews={
 overall:{position:[27,27,32],target:[0,0,0]},
 path:{position:[12,12,17],target:[0,0,1]},
 low:{position:[3,4.6,13],target:[-3,1,0]},
 hut:{position:[7,7,10],target:[-3,1,-3.8]},
 wide:{position:[-36,35,44],target:[0,0,0]}
};
function reviewView(name){
 const view=reviewViews[name];if(!view)throw Error('Unknown view');
 resetCamera();camera.position.set(...view.position);controls.target.set(...view.target);controls.update();
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>reviewView(button.dataset.view)));
window.__orcbandsHutReview={
 view(name){setMode('hut');const views={front:[[.5,3.5,10.5],[.3,1.7,0]],rear:[[-7.5,4.8,-8.5],[.2,1.8,0]],roof:[[6.5,8,7.2],[.3,2,0]],detail:[[3.8,2.6,6.4],[.1,1.55,1.1]]};
 if(!views[name])throw Error('Unknown hut view');camera.position.set(...views[name][0]);controls.target.set(...views[name][1]);controls.update();}
};
document.querySelectorAll('[data-hut-view]').forEach(button=>button.addEventListener('click',()=>window.__orcbandsHutReview.view(button.dataset.hutView)));
window.__orcbandsReview={
 view(name){if(mode!=='grove')setMode('grove');reviewView(name)},
 metrics(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,rotation:(mode==='studio'?studio:mode==='hut'?hutStudio:grove).rotation.y,fov:camera.fov,camera:camera.position.toArray(),target:controls.target.toArray()}},
};
const clock=new THREE.Clock();
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(clock.getDelta(),.06);
 if(spin){(mode==='studio'?studio:mode==='hut'?hutStudio:grove).rotation.y+=dt*.25;renderer.shadowMap.needsUpdate=true}
 if(mode==='grove'){
  const previous=controls.target.clone();controls.target.x=THREE.MathUtils.clamp(controls.target.x,-19,19);
  controls.target.z=THREE.MathUtils.clamp(controls.target.z,-19,19);controls.target.y=THREE.MathUtils.clamp(controls.target.y,0,6);
  camera.position.add(controls.target.clone().sub(previous));
 }
 controls.update();renderer.render(scene,camera);
}
frame();
