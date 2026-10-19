import * as THREE from 'three';
import {paint,triangles,join,beam,logGeometry} from './resource-geometry.js?v=__ORCBANDS_REVISION__';
import {storageResourceGeometry} from './storage-resources.js?v=__ORCBANDS_REVISION__';

const TIMBER=0x65492e,END=0xaa8657,ROOF=[0x90493c,0xa25443,0x874336,0x99503e];
function box(parts,x,y,z,w,h,d,color=TIMBER,seed=1){const g=paint(new THREE.BoxGeometry(w,h,d),color,seed);g.translate(x,y+h/2,z);parts.push(g)}
function timber(parts,a,b,width=.16,color=TIMBER){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
 const g=paint(new THREE.BoxGeometry(width,delta.length(),width),color,Math.round((a[0]+a[2]+8)*100));
 g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());parts.push(g);
}
function pad(parts,x,z){const g=paint(new THREE.CylinderGeometry(.28,.33,.16,6),0x85867a,41);g.rotateY(x+z);g.translate(x,.08,z);parts.push(g)}
function roofBoard(parts,x1,x2,z1,z2,height,index){
 const points=[];for(const drop of [0,.075])for(const[x,z]of [[x1,z1],[x2,z1],[x2,z2],[x1,z2]])points.push([x,height(x,z)-drop,z]);
 parts.push(triangles(points,[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,4],[1,5,4],[1,2,5],[2,6,5],[2,3,6],[3,7,6],[3,0,7],[0,4,7]],ROOF[index%4],800+index));
}
function post(parts,x,z,height){pad(parts,x,z);box(parts,x,.1,z,.20,height-.1,.20);box(parts,x-.001,height,z,.23,.07,.23,END,3);}
function leanToShell(){
 const parts=[];
 for(const x of [-1.6,1.6])for(const z of [-1,1])post(parts,x,z,z<0?2.62:2.10);
 for(const z of [-1,1])timber(parts,[-1.73,z<0?2.51:1.94,z],[1.73,z<0?2.51:1.94,z],.21);
 for(const x of [-1.6,1.6]){
  timber(parts,[x,2.52,-1.2],[x,1.89,1.3],.17);
  for(const z of [-1,1])timber(parts,[x,z<0?1.85:1.35,z],[x+(x<0?.48:-.48),z<0?2.47:1.90,z],.12,0x775537);
  timber(parts,[x,.65,-1],[x,1.95,-.35],.11);
 }
 // Slatted back leaves ventilation gaps and keeps the unloading side open.
 for(let i=0;i<11;i++)box(parts,-1.44+i*.288,.27,-1.03,.25,1.20+(i%3)*.025,.065,i%2?0x7d5d3a:0x705133,i+25);
 timber(parts,[-1.55,.72,-.98],[1.55,.72,-.98],.12);
 for(const x of [-1.6,-.8,0,.8,1.6])timber(parts,[x,2.78,-1.38],[x,2.07,1.45],.10,0x8a6941);
 for(let i=0;i<14;i++){const x=-1.98+i*.283;roofBoard(parts,x,x+.287,-1.43,1.48,(x,z)=>2.85-(z+1.43)*.25,i);}
 // Heavy edge boards and a small red trade pennant match the hut's materials.
 timber(parts,[-2.02,2.85,-1.45],[2.02,2.85,-1.45],.12,0x6d4430);timber(parts,[-2.02,2.12,1.49],[2.02,2.12,1.49],.13,0x6d4430);
 parts.push(triangles([[1.62,1.90,1.03],[1.62,1.28,1.03],[1.20,1.43,1.03]],[[0,2,1],[0,1,2]],0x9e4d3c,51));
 return parts;
}
function shelter(state){
 const parts=leanToShell(),shellVertices=parts.reduce((n,g)=>n+g.attributes.position.count,0);
 if(state==='stocked'){
  const logs=storageResourceGeometry('woodpile','full');logs.scale(.7,.7,.7);logs.translate(-.72,0,-.04);parts.push(logs);
  const food=storageResourceGeometry('food','full');food.scale(.73,.73,.73);food.translate(.65,0,-.15);parts.push(food);
  // Dressed crate and low unloading boards; front bay is deliberately free.
  box(parts,.70,0,-.70,.65,.46,.48,0x8c693f,70);
  for(const y of [.055,.36])box(parts,.70,y,-.447,.69,.07,.045,0x60482e,73);
  for(const x of [.40,1.0])box(parts,x,.02,-.44,.06,.43,.045,0x60482e,74);
 }
 const g=join(parts);g.userData.shellVertices=shellVertices;g.userData.contents=state==='stocked'?1:0;return g;
}
function foundations(){
 const parts=[];
 for(const x of [-1.5,1.5])for(const z of [-1.03,1.03]){
  pad(parts,x,z);box(parts,x*1.12,0,z*1.17,.075,.39,.075,END,90);
 }
 for(const z of [-1.2,1.2])parts.push(beam([-1.68,.30,z],[1.68,.30,z],.012,.012,0xb9a16e,91));
 for(const x of [-1.68,1.68])parts.push(beam([x,.30,-1.2],[x,.30,1.2],.012,.012,0xb9a16e,92));
 for(const z of [-1.03,1.03])timber(parts,[-1.5,.17,z],[1.5,.17,z],.16,0x7c5d3a);
 for(const x of [-1.5,1.5])timber(parts,[x,.17,-1.03],[x,.17,1.03],.16,0x7c5d3a);
 return parts;
}
function frame(parts){
 for(const x of [-1.5,1.5])for(const z of [-1.03,1.03]){
  box(parts,x,.22,z,.19,2.02,.19);box(parts,x,2.24,z,.23,.06,.23,END,97);
  timber(parts,[x,1.54,z],[x+(x<0?.48:-.48),2.17,z],.105,0x7b5836);
 }
 for(const z of [-1.03,1.03]){
  timber(parts,[-1.62,2.18,z],[1.62,2.18,z],.19);
  timber(parts,[-1.76,2.16,z],[0,3.18,z],.14,0x8c6940);timber(parts,[0,3.18,z],[1.76,2.16,z],.14,0x8c6940);
  timber(parts,[0,2.20,z],[0,3.15,z],.12);
 }
 for(const x of [-1.5,1.5])timber(parts,[x,2.18,-1.14],[x,2.18,1.14],.17);
 timber(parts,[0,3.18,-1.42],[0,3.18,1.42],.17,0x765333);
 for(const z of [-.36,.36])for(const side of [-1,1])timber(parts,[0,3.18,z],[side*1.82,2.14,z],.10,0x947248);
 timber(parts,[-1.5,.30,-1.03],[-1.5,1.90,1.03],.11,0x8b6942);
}
function construction(state){
 const parts=foundations(),foundationVertices=parts.reduce((n,g)=>n+g.attributes.position.count,0);
 if(state!=='foundation')frame(parts);
 const frameVertices=parts.reduce((n,g)=>n+g.attributes.position.count,0);
 if(state==='roof'){
  // Incomplete strips on both slopes leave exposed rafters and visible gaps.
  for(let i=0;i<4;i++)roofBoard(parts,-1.90,.025,-1.40+i*.29,-1.12+i*.29,(x)=>3.28+x*.58,i);
  for(let i=0;i<3;i++)roofBoard(parts,0,1.90,-.55+i*.29,-.28+i*.29,(x)=>3.28-x*.58,9+i);
 }
 // Reusable loose timber and roofing boards stay outside the marked footprint.
 for(let i=0;i<4;i++)box(parts,2.14+(i%2)*.25,(i>>1)*.11,-.2,.21,.095,1.52,0x957247,110+i);
 for(let i=0;i<3;i++)box(parts,2.28,.22+i*.055,-.52,.58,.045,.32,ROOF[i],120+i);
 const offcut=logGeometry(.65,.11,132,false);offcut.rotateY(.45);offcut.translate(2.14,0,.85);parts.push(offcut);
 const g=join(parts);g.userData.foundationVertices=foundationVertices;g.userData.frameVertices=frameVertices;g.userData.stage=state;return g;
}
export function settlementResourceGeometry(kind,state){return kind==='shelter'?shelter(state):construction(state)}
