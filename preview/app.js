import * as THREE from 'three';
import {buildCampUI} from './camp-ui.js?v=__ORCBANDS_REVISION__';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {buildEnvironment,instanceAsset} from './environment.js?v=__ORCBANDS_REVISION__';
import {buildTorches} from './torches.js?v=__ORCBANDS_REVISION__';
import {buildCampVisibility} from './camp-visibility.js?v=__ORCBANDS_REVISION__';
import {buildFireAtmosphere} from './fire-atmosphere.js?v=__ORCBANDS_REVISION__';
import {buildGroveResources} from './resources.js?v=__ORCBANDS_REVISION__';
import {buildResourceViewer,RESOURCE_LABELS} from './resource-viewer.js?v=__ORCBANDS_REVISION__';
import {buildCampfire} from './campfire.js?v=__ORCBANDS_REVISION__';
import {HUT_PLACEMENT,TORCH_PLACEMENTS} from './environment-layout.js?v=__ORCBANDS_REVISION__';
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
// Cool canopy ambience separates the shadowed woodland from the hearth,
// without touching the six-source visibility mask or animating distant lights.
scene.add(new THREE.HemisphereLight(0xdce9e9,0x586b6c,2.05));
const sun=new THREE.DirectionalLight(0xffedda,2.25);
sun.position.set(-5,11,7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13});
sun.shadow.bias=-.0004;scene.add(sun);
const studio=new THREE.Group(),grove=new THREE.Group(),hutStudio=new THREE.Group(),resourceStudio=new THREE.Group();
scene.add(studio,grove,hutStudio,resourceStudio);
function ground(parent,r,color){
 const mesh=new THREE.Mesh(new THREE.CircleGeometry(r,64),new THREE.MeshStandardMaterial({color,roughness:1}));
 mesh.rotation.x=-Math.PI/2;mesh.position.y=-.035;mesh.receiveShadow=true;
 parent.add(mesh);
}
ground(resourceStudio,3.5,0x677e61);ground(studio,3,0x677e61);ground(hutStudio,4.6,0x677e61);
const grid=new THREE.GridHelper(6,12,0xd7e6ce,0x49604b);
grid.position.y=.006;
for(const m of (Array.isArray(grid.material)?grid.material:[grid.material])){m.transparent=true;m.opacity=.16}
studio.add(grid);
let resourceViewer=null,campUI=null;
let atmosphere=null,torches=null,campVisibility=null,fogEnabled=true;
let campfire=null,fireTimeOverride=null,treeCount=36;
let sourceTree=null,sourceHut=null,mode='studio',spin=false,wireframe=false;
const assetRevision=document.querySelector('meta[name="orcbands-build"]')?.content||'dev';
function assetUrl(name){return './assets/'+name+'?v='+encodeURIComponent(assetRevision)}
function activeRoot(){return {studio,grove,hut:hutStudio,resources:resourceStudio}[mode]}
function resetCamera(){
 controls.enableDamping=false;controls.update();controls.enableDamping=true;
 spin=false;document.getElementById('spin').setAttribute('aria-pressed','false');
 grove.rotation.y=0;studio.rotation.y=0;hutStudio.rotation.y=0;resourceStudio.rotation.y=0;renderer.shadowMap.needsUpdate=true;
 controls.minDistance=mode==='grove'?6:mode==='resources'?.7:2.5;controls.maxDistance=mode==='grove'?115:26;
 if(mode==='grove'){camera.position.set(...(fogEnabled?[20,22,26]:[27,27,32]));controls.target.set(0,0,-1)}
 else if(mode==='resources'){const view=resourceViewer.framing();camera.position.set(...view.position);controls.target.set(...view.target)}
 else if(mode==='hut'){camera.position.set(7.3,5.0,9);controls.target.set(.3,1.8,0)}
 else{camera.position.set(5.8,4.9,7.2);controls.target.set(0,2.2,0)}
 controls.update();
}
function setMode(next){
 if(next!=='grove'&&campUI?.isActive())campUI.setActive(false,false);
 mode=next;
 scene.background=next==='grove'?new THREE.Color(fogEnabled?0x40534f:0x9da98c):null;
 scene.fog=next==='grove'?new THREE.Fog(fogEnabled?0x40534f:0x9da98c,85,135):null;
 sun.position.set(...(next==='grove'?[-22,36,18]:[-5,11,7]));
 const extent=next==='grove'?51:13;
 Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:100});
 sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
 campVisibility?.setEnabled(next==='grove'&&fogEnabled);
 studio.visible=next==='studio';grove.visible=next==='grove';hutStudio.visible=next==='hut';resourceStudio.visible=next==='resources';
 document.getElementById('resource-controls').hidden=next!=='resources';
 document.querySelectorAll('.scene').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===mode)));
 document.getElementById('grove-views').hidden=next!=='grove';
 document.getElementById('hut-views').hidden=next!=='hut';
 document.getElementById('status').textContent=next==='resources'?resourceViewer.metrics().label+' · original reusable resource geometry':next==='grove'?`Forest camp · ${treeCount} pines · Timber Hut 01 · campfire · 4 torches`:next==='hut'?'Timber Hut 01 · original static OBJ/MTL · timber frame, red roof and open entrance':'Loaded actual OBJ/MTL · 144 faces · 4 foliage tiers · 4.58 units tall';
 resize();
 document.getElementById('scene-label').textContent=mode==='resources'?resourceViewer.metrics().label:mode==='studio'?'Single tree · inspect geometry':mode==='hut'?'Timber Hut · 01':`Forest camp · ${treeCount} pines + hut`;
 const url=new URL(location.href);
 if(next!=='studio')url.searchParams.set('scene',next);else url.searchParams.delete('scene');
 if(next==='resources')url.searchParams.set('asset',resourceViewer.metrics().key);else url.searchParams.delete('asset');
 history.replaceState(null,'',url.pathname+url.search+url.hash);
 window.__orcbandsMode=next;
 resetCamera();
}
document.querySelectorAll('.scene').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.scene)));
document.getElementById('fog').addEventListener('click',e=>{
 fogEnabled=!fogEnabled;e.currentTarget.setAttribute('aria-pressed',String(fogEnabled));
 campVisibility?.setEnabled(mode==='grove'&&fogEnabled);
 if(mode==='grove'){scene.background.set(fogEnabled?0x40534f:0x9da98c);scene.fog.color.copy(scene.background)}
});
document.getElementById('reset').addEventListener('click',resetCamera);
document.getElementById('spin').addEventListener('click',e=>{
 spin=!spin;e.currentTarget.setAttribute('aria-pressed',String(spin));
});
document.getElementById('wireframe').addEventListener('click',e=>{
 renderer.shadowMap.needsUpdate=true;
 wireframe=!wireframe;e.currentTarget.setAttribute('aria-pressed',String(wireframe));
 for(const root of [sourceTree,sourceHut,grove,hutStudio,resourceStudio])root?.traverse(o=>{if(o.isMesh)for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.wireframe=wireframe});
});
function resize(){
 const w=host.clientWidth,h=host.clientHeight;
 if(!w||!h)return;
 renderer.setSize(w,h,false);camera.aspect=w/h;
 // Keep woodland width readable on a portrait screen without pushing the camera into fog.
 camera.fov=campUI?.isActive()?(camera.aspect<.85?50:38):mode!=='studio'?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(38)/2)*Math.max(1,(mode==='grove'?1.45:1.20)/camera.aspect))):38;
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
 resourceViewer=buildResourceViewer(resourceStudio,tree,()=>setMode('resources'));
 const requestedAsset=new URLSearchParams(location.search).get('asset');
 if(Object.hasOwn(RESOURCE_LABELS,requestedAsset))resourceViewer.select(requestedAsset);
 const layout=buildEnvironment(grove,tree);buildGroveResources(grove,layout.resources);
 instanceAsset(hutStudio,hut,[{x:0,z:0,scale:1,angle:0}]);
 instanceAsset(grove,hut,[HUT_PLACEMENT]);
 campfire=buildCampfire(grove,layout.campfire);treeCount=layout.trees.length;
 torches=buildTorches(grove);atmosphere=buildFireAtmosphere(grove,[layout.campfire,...TORCH_PLACEMENTS]);campVisibility=buildCampVisibility(grove);
 window.__orcbandsLayout=layout;
 document.getElementById('loading').hidden=true;
 window.__orcbandsTreeLoaded=true;window.__orcbandsHutLoaded=true;
 const requested=new URLSearchParams(location.search).get('scene');
 setMode(['grove','hut','resources'].includes(requested)?requested:'studio');
 campUI=buildCampUI({host,canvas,grove,layout,camera,setScene:()=>setMode('grove'),stopSpin:()=>{spin=false;document.getElementById('spin').setAttribute('aria-pressed','false')},focus:(x,z)=>{const next=new THREE.Vector3(THREE.MathUtils.clamp(x,-19,19),0,THREE.MathUtils.clamp(z,-19,19));camera.position.add(next.clone().sub(controls.target));controls.target.copy(next);controls.update();},onToggle:value=>{if(value&&host.clientWidth/host.clientHeight<.85){camera.position.set(15,27,20);controls.target.set(0,0,-1);controls.update();}requestAnimationFrame(resize)}});
 window.__orcbandsCampUI={metrics:()=>campUI.metrics(),projectPoint:(x,z)=>campUI.projectPoint(x,z)};
 if(new URLSearchParams(location.search).get('hud')==='1')campUI.setActive(true,false);
}).catch(error=>{document.getElementById('loading').textContent='Asset failed to load';status.textContent=String(error)});
function selectResource(key){resourceViewer.select(key);setMode('resources')}
document.getElementById('download-resource').addEventListener('click',()=>resourceViewer.download());
window.__orcbandsResourceReview={select:selectResource,metrics:()=>resourceViewer?.metrics()};
const reviewViews={
 shelter:{position:[9.2,4.8,-2],target:[5.5,1,-8]},
 construction:{position:[1.0,6.5,14.0],target:[6,1,8.5]},
 quarry:{position:[-4.5,6.5,3.7],target:[-10,.65,-3.5]},
 stockyard:{position:[0,8,11.5],target:[-2.3,.4,5.8]},
 foodstore:{position:[-3,4.2,3.8],target:[-8,.35,1.6]},
 berries:{position:[3.5,4.2,5.4],target:[6.5,.4,-.4]},
 woodcut:{position:[-1,4.3,4.5],target:[-4.2,.25,7.4]},
 overall:{position:[20,22,26],target:[0,0,-1]},
 path:{position:[12,12,17],target:[0,0,1]},
 low:{position:[3,4.6,13],target:[-3,1,0]},
 hut:{position:[7,7,10],target:[-3,1,-3.8]},
 campfire:{position:[6.5,5.8,8.7],target:[-1,1,-1.7]},
 fire:{position:[3,2.8,5.8],target:[.1,.65,.15]},
 wide:{position:[-48,43,57],target:[0,0,0]}
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
 setFireTime(value){fireTimeOverride=Number.isFinite(value)?value:null;campfire?.update(fireTimeOverride??clock.elapsedTime);torches?.update(fireTimeOverride??clock.elapsedTime);atmosphere?.update(fireTimeOverride??clock.elapsedTime)},
 view(name){if(mode!=='grove')setMode('grove');reviewView(name)},
 metrics(){return {atmosphere:atmosphere?.metrics(),torches:torches?.metrics(),visibility:campVisibility?.metrics(),campfire:campfire?.metrics(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,rotation:activeRoot().rotation.y,fov:camera.fov,camera:camera.position.toArray(),target:controls.target.toArray()}},
};
const clock=new THREE.Clock();
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(clock.getDelta(),.06);
 campfire?.update(fireTimeOverride??clock.elapsedTime);
 torches?.update(fireTimeOverride??clock.elapsedTime);atmosphere?.update(fireTimeOverride??clock.elapsedTime);
 if(spin){activeRoot().rotation.y+=dt*.25;renderer.shadowMap.needsUpdate=true}
 campVisibility?.update();
 if(mode==='grove'){
  const previous=controls.target.clone();controls.target.x=THREE.MathUtils.clamp(controls.target.x,-19,19);
  controls.target.z=THREE.MathUtils.clamp(controls.target.z,-19,19);controls.target.y=THREE.MathUtils.clamp(controls.target.y,0,6);
  camera.position.add(controls.target.clone().sub(previous));
 }
 controls.update();campUI?.update(clock.elapsedTime);renderer.render(scene,camera);
}
frame();
