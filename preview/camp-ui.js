import * as THREE from 'three';
import {groundHeight,pathSamples} from './environment-layout.js?v=__ORCBANDS_REVISION__';
import {SUPPLIES,BUILDINGS,MAP,campAnchors,footprintStatus,pickCampAnchor,mapPoint,worldPoint} from './camp-ui-model.js?v=__ORCBANDS_REVISION__';

const SHAPES={
 wood:'<path d="M6 12 22 5l6 5-16 8z" fill="#9b7444"/><path d="m12 18 16-8v9L12 26z" fill="#65482d"/><path d="m6 12 6 6v8l-6-6z" fill="#d7b37b"/><path d="m8 16 3 3m4-4 10-5" stroke="#3d3927" stroke-width="1.4"/>',
 stone:'<path d="m4 21 4-12 12-5 9 10-4 12H11z" fill="#9fa99c"/><path d="m8 9 5 11 16-6M13 20l-2 6" fill="none" stroke="#586b62" stroke-width="2"/>',
 food:'<path d="M8 18q8-5 16 0l-2 11H10z" fill="#9e7944"/><path d="M8 19h16M10 24h12" stroke="#dcc28b" fill="none"/><circle cx="12" cy="16" r="4" fill="#d46a5a"/><circle cx="20" cy="16" r="4" fill="#a94548"/><circle cx="16" cy="11" r="4" fill="#c35450"/><path d="m16 7 2-4 4 2" fill="none" stroke="#98b96b" stroke-width="2"/>',
 population:'<path d="M5 28v-9l5-5 5 5v9m2 0V12l5-6 6 6v16" fill="#9caf7b"/><path d="M3 28h27" stroke="#d5d7ad" stroke-width="2"/>',
 hut:'<path d="M7 15v14h20V15" fill="#a58755"/><path d="m3 16 13-12 14 12-3 4-11-9L6 20z" fill="#b3674c"/><path d="M13 29V18h7v11" fill="#344a37"/><path d="M7 17v12m19-12v12" stroke="#57472f" stroke-width="3"/>',
 shelter:'<path d="M6 13v16m20-19v19" stroke="#b18c55" stroke-width="3"/><path d="m3 12 22-7 5 6-24 8z" fill="#b76b4d"/><path d="M10 24h10m-10 4h10" stroke="#b59456" stroke-width="3"/>',
 frame:'<path d="M6 28V14l10-10 11 10v14M6 14h21M16 4v10M6 28h21M6 14l7 7" fill="none" stroke="#bd9a61" stroke-width="3" stroke-linejoin="round"/>',
 fire:'<path d="m8 28 16-4m-16 0 16 4" stroke="#9e8051" stroke-width="3"/><path d="M17 2c2 10 10 11 9 18s-17 10-20 2 6-10 6-16c5 7 4 8 5-4" fill="#d98944"/><path d="M16 14c8 9 2 12-2 10-5-2 1-5 2-10" fill="#f0d380"/>',
 build:'<path d="m8 5 5 1 2 5-4 4-5-2-1-5m8 6 14 14m-7-23 7 7-5 5-7-7zM5 27l10-10" fill="none" stroke="#d9c285" stroke-width="3" stroke-linejoin="round"/>',
 next:'<path d="m6 8 9 8-9 8m11-16 9 8-9 8" fill="none" stroke="#d1c28c" stroke-width="2.5"/>',
 focus:'<path d="M4 12V5h7m10 0h7v7m0 9v7h-7m-10 0H4v-7" fill="none" stroke="#ccbd87" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#b9ce8c"/>'
};
export function icon(name){return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">'+(SHAPES[name]??SHAPES.hut)+'</svg>'}
const svgNS='http://www.w3.org/2000/svg';
export function buildCampUI({host,canvas,grove,layout,camera,setScene,focus,stopSpin,onToggle}){
 const anchors=campAnchors(layout),ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
 let active=false,selected=anchors[0],catalogOpen=false,placing=null,placementPoint={x:0,z:5},lastStatus=null,pointerStart=null,originButton=null,lastMapTime=0;
 const root=document.createElement('section');root.className='camp-hud';root.hidden=true;root.setAttribute('aria-label','Camp interface preview');
 root.innerHTML=`<div class="hud-top"><div class="hud-brand hud-slab"><div class="hud-eyebrow">Orcbands</div><strong>Bracken camp</strong><small>Day 01 · Early morning</small></div>
 <dl class="hud-supplies hud-slab" aria-label="Sample supplies">${Object.entries(SUPPLIES).map(([key,value])=>`<div class="hud-supply">${icon(key)}<div><dt>${key}</dt><dd>${value}</dd></div></div>`).join('')}</dl>
 <button type="button" class="hud-return" data-hud-exit>Back to Asset Lab</button></div>
 <div class="hud-hint"><span class="hud-hint-desktop">Select a building · drag to orbit · scroll to zoom · B to build</span><span class="hud-hint-mobile">Tap a building · drag to orbit · pinch to zoom</span></div>
 <div class="hud-placement hud-slab" hidden><strong data-place-status role="status" aria-live="polite"></strong><p>Move over the ground, or tap a spot. Footprint preview only.</p><button type="button" data-cancel-place>Cancel preview · Esc</button></div>
 <div class="hud-dock"><section class="hud-selection hud-slab" aria-label="Selection"><div class="hud-eyebrow">Selected structure</div><div class="hud-selection-head"><div class="hud-portrait"></div><div><h2 aria-live="polite"></h2><div class="hud-subtitle"></div></div></div><p class="hud-description"></p><div class="hud-condition-label"><span>Preview condition</span><span data-condition-text></span></div><div class="hud-condition" role="progressbar" aria-label="Sample condition" aria-valuemin="0" aria-valuemax="100"><span></span></div><div class="hud-selection-actions"><button type="button" data-focus-selected>${icon('focus')}<span>Focus</span></button><button type="button" data-next-selected aria-label="Select next structure">${icon('next')}<span>Next</span></button><button type="button" data-toggle-build aria-label="Build menu" aria-controls="camp-build-menu">${icon('build')}<span>Build</span></button></div></section>
 <button type="button" class="hud-build-launch" data-toggle-build aria-controls="camp-build-menu" aria-expanded="false">${icon('build')}Build menu <small>B</small></button>
 <section class="hud-build hud-slab" id="camp-build-menu" aria-label="Build menu" hidden><div class="hud-build-heading"><strong>Grow the camp</strong><button type="button" data-close-build aria-label="Close build menu">Close ×</button></div><div class="hud-catalog">${Object.entries(BUILDINGS).map(([key,b])=>`<button type="button" class="hud-build-card" data-build="${key}" aria-pressed="false">${icon(b.icon)}<span>${b.name}</span><span class="hud-cost"><span>${icon('wood')}${b.wood}</span><span>${icon('stone')}${b.stone}</span></span></button>`).join('')}</div><p class="hud-build-note">Sample costs · choose a structure to preview its footprint.</p></section>
 <section class="hud-map hud-slab" aria-label="Camp minimap"><div class="hud-map-header"><span>The clearing</span><span class="hud-compass">N ↑</span></div><div class="hud-map-inner"><svg viewBox="-40 -45 80 80" role="img" aria-label="Map of the actual grove"><defs><radialGradient id="camp-map-light"><stop offset="0" stop-color="#5d7045"/><stop offset=".72" stop-color="#263f2e"/><stop offset="1" stop-color="#12281f"/></radialGradient><clipPath id="camp-map-clip"><rect x="-40" y="-45" width="80" height="80"/></clipPath></defs><g clip-path="url(#camp-map-clip)"><rect x="-40" y="-45" width="80" height="80" fill="url(#camp-map-light)"/><g data-map-trees></g><path data-map-path fill="none" stroke="#9a9261" stroke-width="1.6" opacity=".7"/><polygon data-map-view fill="#e8dba411" stroke="#dbcc90" stroke-width=".7"/></g></svg></div><p class="hud-map-footer">Tap a landmark to focus</p></section></div><div class="hud-preview-badge">Interface preview · sample resources &amp; condition</div>`;
 host.append(root);
 const q=s=>root.querySelector(s),all=s=>root.querySelectorAll(s),map=q('.hud-map-inner'),placementPanel=q('.hud-placement');
 q('[data-map-path]').setAttribute('d',pathSamples.map((p,i)=>(i?'L':'M')+p.x+','+p.z).join(' '));
 const trees=document.createDocumentFragment();for(const t of layout.trees){const c=document.createElementNS(svgNS,'circle');c.setAttribute('cx',t.x);c.setAttribute('cy',t.z);c.setAttribute('r',1.05*t.scale);c.setAttribute('fill','#749064');c.setAttribute('opacity','.52');trees.append(c)}q('[data-map-trees]').append(trees);
 for(const a of anchors){const b=document.createElement('button'),p=mapPoint(a.x,a.z);b.type='button';b.className='hud-map-pin';b.dataset.campAnchor=a.id;b.setAttribute('aria-label','Focus '+a.name);b.style.left=p.x+'%';b.style.top=p.y+'%';b.innerHTML=icon(a.icon);b.addEventListener('click',event=>{event.stopPropagation();cancelPlacement(false);select(a);focus(a.x,a.z);});map.append(b)}
 const overlay=new THREE.Group();overlay.name='Camp selection and footprint preview';overlay.visible=false;grove.add(overlay);
 const ringMaterial=new THREE.MeshBasicMaterial({color:0xe2c276,transparent:true,opacity:.90,depthWrite:false,side:THREE.DoubleSide}),ghostMaterial=new THREE.MeshBasicMaterial({color:0x96c779,transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide});
 const ring=new THREE.Mesh(new THREE.BufferGeometry(),ringMaterial),ghost=new THREE.Mesh(new THREE.BufferGeometry(),ghostMaterial);ring.renderOrder=5;ghost.renderOrder=4;overlay.add(ring,ghost);ghost.visible=false;
 function geometry(points,faces){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>points[i])),3));return g}
 function replace(mesh,g){mesh.geometry.dispose();mesh.geometry=g;}
 function select(a){
  selected=a;q('h2').textContent=a.name;q('.hud-portrait').innerHTML=icon(a.icon);q('.hud-subtitle').textContent=a.status;q('.hud-description').textContent=a.description;
  q('[data-condition-text]').textContent=a.condition+'%';q('.hud-condition').setAttribute('aria-valuenow',String(a.condition));q('.hud-condition span').style.width=a.condition+'%';all('[data-camp-anchor]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.campAnchor===a.id)));
  const pts=[],faces=[],r=a.kind==='fire'?1.25:a.kind==='hut'?3.25:2.25;
  for(let i=0;i<64;i++)for(const rad of [r,r+.08]){const angle=i/64*Math.PI*2,x=a.x+Math.cos(angle)*rad,z=a.z+Math.sin(angle)*rad;pts.push([x,groundHeight(x,z)+.055,z]);}
  for(let i=0;i<64;i++){const n=(i+1)%64;faces.push([i*2,n*2,i*2+1],[i*2+1,n*2,n*2+1]);}replace(ring,geometry(pts,faces));
 }
 function showCatalog(open,restore=false){catalogOpen=open;q('.hud-build').hidden=!open;q('.hud-build-launch').hidden=open;all('[data-toggle-build]').forEach(b=>b.setAttribute('aria-expanded',String(open)));if(!open){cancelPlacement(false);if(restore)q('.hud-build-launch').focus();}}
 function updateFootprint(){
  if(!placing)return;const b=BUILDINGS[placing],p=placementPoint,pts=[];
  const coordinates=[[-b.width/2,-b.depth/2],[b.width/2,-b.depth/2],[b.width/2,b.depth/2],[-b.width/2,b.depth/2]];
  for(const [x,z]of coordinates){const px=p.x+x,pz=p.z+z;pts.push([px,groundHeight(px,pz)+.07,pz]);}replace(ghost,geometry(pts,[[0,2,1],[0,3,2]]));
  lastStatus=footprintStatus(placing,p,layout);ghostMaterial.color.set(lastStatus.valid?0x9dcc78:0xdb7160);placementPanel.dataset.valid=String(lastStatus.valid);
  const text=b.name+' · '+lastStatus.reason;if(q('[data-place-status]').textContent!==text)q('[data-place-status]').textContent=text;
 }
 function cancelPlacement(restore=true){const old=originButton;placing=null;ghost.visible=false;placementPanel.hidden=true;all('[data-build]').forEach(b=>b.setAttribute('aria-pressed','false'));if(restore&&old&&!q('.hud-build').hidden)old.focus();}
 function beginPlacement(kind,button){placing=kind;originButton=button;stopSpin();placementPoint={x:0,z:5};ghost.visible=true;placementPanel.hidden=false;all('[data-build]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.build===kind)));updateFootprint();}
 function setActive(value,restore=true){
  active=value;root.hidden=!value;overlay.visible=value;document.body.classList.toggle('camp-mode',value);
  const url=new URL(location.href);if(value)url.searchParams.set('hud','1');else url.searchParams.delete('hud');history.replaceState(null,'',url.pathname+url.search+url.hash);
  if(value){setScene();select(selected);stopSpin();}else{cancelPlacement(false);showCatalog(false);if(restore)document.getElementById('camp-ui-toggle').focus();}
  onToggle(value);
 }
 q('[data-hud-exit]').addEventListener('click',()=>setActive(false));q('[data-focus-selected]').addEventListener('click',()=>focus(selected.x,selected.z));q('[data-next-selected]').addEventListener('click',()=>{cancelPlacement(false);select(anchors[(anchors.indexOf(selected)+1)%anchors.length]);});
 all('[data-toggle-build]').forEach(b=>b.addEventListener('click',()=>showCatalog(!catalogOpen)));q('[data-close-build]').addEventListener('click',()=>showCatalog(false,true));q('[data-cancel-place]').addEventListener('click',()=>cancelPlacement());
 all('[data-build]').forEach(b=>b.addEventListener('click',()=>beginPlacement(b.dataset.build,b)));
 const trigger=document.getElementById('camp-ui-toggle');trigger.addEventListener('click',()=>setActive(true));
 document.addEventListener('keydown',event=>{if(!active||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target.matches('input,textarea,select,[contenteditable=true]'))return;if(event.key==='Escape'){event.preventDefault();if(placing)cancelPlacement();else if(catalogOpen)showCatalog(false,true);}else if(event.key.toLowerCase()==='b'){event.preventDefault();showCatalog(!catalogOpen);}});
 function groundPoint(clientX,clientY){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;ray.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),camera);return ray.ray.intersectPlane(plane,point)?{x:point.x,z:point.z}:null;}
 canvas.addEventListener('pointerdown',event=>{if(!event.isPrimary){pointerStart=null;return;}if(active&&event.button===0)pointerStart={x:event.clientX,y:event.clientY};});
 canvas.addEventListener('pointermove',event=>{if(active&&placing&&!event.buttons){const p=groundPoint(event.clientX,event.clientY);if(p){placementPoint=p;updateFootprint();}}});
 canvas.addEventListener('pointerup',event=>{if(!active||!pointerStart)return;const start=pointerStart;pointerStart=null;if(Math.hypot(event.clientX-start.x,event.clientY-start.y)>6)return;const p=groundPoint(event.clientX,event.clientY);if(!p)return;if(placing){placementPoint=p;updateFootprint();}else{const a=pickCampAnchor(p,anchors);if(a)select(a);}});
 canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
 map.querySelector('svg').addEventListener('click',event=>{const r=map.getBoundingClientRect(),p=worldPoint((event.clientX-r.left)/r.width*100,(event.clientY-r.top)/r.height*100);focus(p.x,p.z);});
 function update(time){if(!active||time-lastMapTime<.15)return;lastMapTime=time;const pts=[];for(const[x,y]of [[-1,1],[1,1],[1,-1],[-1,-1]]){ray.setFromCamera(new THREE.Vector2(x,y),camera);const hit=ray.ray.intersectPlane(plane,point);if(!hit)return;pts.push(point.x+','+point.z);}q('[data-map-view]').setAttribute('points',pts.join(' '));}
 select(selected);
 function projectPoint(x,z){const p=new THREE.Vector3(x,groundHeight(x,z)+.02,z).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,visible:p.z>=-1&&p.z<=1};}
 return {setActive,update,projectPoint,isActive:()=>active,metrics:()=>({active,selected:selected.id,buildOpen:catalogOpen,placing,placement:placing?{...placementPoint,...lastStatus}:null,supplies:{...SUPPLIES},overlayVisible:overlay.visible})};
}
