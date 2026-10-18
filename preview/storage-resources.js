import * as THREE from 'three';
import {paint,triangles,join,logGeometry,beam} from './resource-geometry.js?v=__ORCBANDS_REVISION__';

function box(x,y,z,w,h,d,color,seed=1){const g=paint(new THREE.BoxGeometry(w,h,d),color,seed);g.translate(x,y+h/2,z);return g;}
function stone(type=0,fracture=false){
 // Separately authored broken silhouettes, not scaled versions of one polyhedron.
 const outlines=[
  [[-.80,-.55],[.30,-.72],[.78,-.27],[.74,.48],[.06,.70],[-.67,.43]],
  [[-.55,-.40],[-.14,-.64],[.45,-.48],[.62,.04],[.30,.54],[-.38,.48],[-.69,.04]],
  [[-.85,-.24],[-.41,-.55],[.28,-.47],[.89,-.10],[.59,.39],[-.22,.51],[-.81,.23]]
 ];
 const outline=outlines[type%3],n=outline.length,pts=[],parts=[];
 for(let ring=0;ring<3;ring++)outline.forEach(([x,z],i)=>{
  const scale=[1,1.03,.63][ring],y=ring===0?0:ring===1?.61+.05*Math.sin(i*1.7+type):.95+.06*Math.sin(i*2.1+type);
  pts.push([x*scale+(ring===2?.10:0),y,z*scale-(ring===2?.06:0)]);
 });
 for(let ring=0;ring<2;ring++)for(let j=0;j<n;j++){
  const a=ring*n+j,b=ring*n+(j+1)%n,c=b+n,d=a+n;
  const fresh=fracture&&(j===3||j===4),color=fresh?0x969e99:ring?0x7c8881:0x6e7971;
  if(fracture&&j===(type===1?4:3)){
   const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),path=type===1?[.48,.34,.53]:[.38,.58,.44],lo=path[ring],hi=path[ring+1];
   const q=[pts[a],pts[b],pts[c],pts[d],lerp(pts[a],pts[b],lo),lerp(pts[a],pts[b],lo+.025),lerp(pts[d],pts[c],hi),lerp(pts[d],pts[c],hi+.018)];
   parts.push(triangles(q,[[0,3,6],[0,6,4],[5,7,2],[5,2,1]],color,ring*20+j));
   parts.push(triangles(q,[[4,6,5],[5,6,7]],0x4e5b54,ring+90));
  }else parts.push(triangles(pts,[[a,d,b],[b,d,c]],color,type*30+j));
 }
 const top=[.10,.98,-.06],bottom=[0,0,0];
 for(let j=0;j<n;j++){
  parts.push(triangles([top,pts[n*2+j],pts[n*2+(j+1)%n]],[[0,2,1]],fracture?0x9ca39b:0x879087,type*10+j));
  parts.push(triangles([bottom,pts[j],pts[(j+1)%n]],[[0,1,2]],0x667168,type+5));
 }
 return join(parts);
}
function chunk(parts,type,x,y,z,sx,sy,sz,angle=0,fracture=false){
 const g=stone(type,fracture);g.scale(sx,sy,sz);g.rotateY(angle);g.translate(x,y,z);parts.push(g);
}
function mineGeometry(state){
 const parts=[];
 if(state==='full'){
  chunk(parts,0,-.34,0,-.10,1.22,1.78,1.10,.12,true);
  chunk(parts,1,.82,0,.01,.85,1.04,.85,-.30,true);
  chunk(parts,2,-.50,0,.64,.85,.53,.57,.3);
 }else if(state==='depleted'){
  chunk(parts,0,-.34,0,-.10,1.22,.43,1.10,.12,true);
  chunk(parts,1,.82,0,.01,.85,.34,.85,-.30,true);
  chunk(parts,2,-.50,0,.64,.85,.24,.57,.3);
 }
 const pieces=state==='rubble'?11:5;
 for(let i=0;i<pieces;i++){
  const a=i*2.399,r=state==='rubble'?(i>7?.10+(i-8)*.05:.22+Math.sqrt(i/pieces)*.48):.60+i*.12;
  const size=state==='rubble'?.25+(i%3)*.055:.12+(i%3)*.035;
  chunk(parts,i%3,Math.cos(a)*r,state==='rubble'&&i>7?.15:0,Math.sin(a)*r,size,size*.72,size*.8,i*.7);
 }
 const g=join(parts);g.userData.fragments=state==='rubble'?pieces:pieces+3;return g;
}
function woodStockpile(state){
 const parts=[box(-.62,0,0,.15,.12,1.6,0x685037),box(.62,0,0,.15,.12,1.6,0x685037,4)];
 const positions=[[-.57,.12],[-.19,.12],[.19,.12],[.57,.12],[-.38,.41],[0,.41],[.38,.41],[-.19,.70],[.19,.70]];
 const count=state==='full'?9:state==='partial'?4:0;
 for(let i=0;i<count;i++){
  const [z,y]=positions[i],g=logGeometry(1.84+(i%3)*.09,.17,400+i,false);g.rotateY(((i%3)-1)*.018);g.translate((i%2)*.035,y,z);parts.push(g);
 }
 const g=join(parts);g.userData.contents=count;return g;
}
function stoneStockpile(state){
 const parts=[box(0,0,-.70,2.0,.12,.10,0x71573a),box(0,0,.70,2.0,.12,.10,0x71573a,2),box(-.95,0,0,.1,.12,1.4,0x71573a,3),box(.95,0,0,.1,.12,1.4,0x71573a,4)];
 const positions=[[-.58,0,-.38],[-.02,0,-.39],[.53,0,-.36],[-.60,0,.06],[0,0,.04],[.56,0,.10],[-.46,0,.42],[.10,0,.40],[.58,0,.43],[-.30,.27,-.16],[.28,.28,-.08],[-.02,.29,.28]];
 const count=state==='full'?12:state==='partial'?4:0;
 for(let i=0;i<count;i++){const [x,y,z]=positions[i],s=.30+(i%3)*.025;chunk(parts,i%3,x,y,z,s*1.08,s*.94,s*.88,i*.7)}
 const g=join(parts);g.userData.contents=count;return g;
}
function basket(){
 const parts=[],n=10,pts=[];
 for(const [r,y]of [[.255,.02],[.32,.43],[.215,.045],[.279,.43]])for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pts.push([Math.cos(a)*r,y,Math.sin(a)*r])}
 for(let i=0;i<n;i++){
  const j=(i+1)%n;
  parts.push(triangles(pts,[[i,n+i,j],[j,n+i,n+j]],i%2?0x9b7846:0x87643b,480+i));
  parts.push(triangles(pts,[[n*2+i,n*2+j,n*3+i],[n*2+j,n*3+j,n*3+i]],0x775b36,490+i));
  parts.push(triangles(pts,[[n+i,n*3+i,n+j],[n+j,n*3+i,n*3+j]],0xb08d58,500+i));
 }
 const floor=paint(new THREE.CylinderGeometry(.217,.217,.035,n),0x674e30);floor.translate(0,.028,0);parts.push(floor);
 for(const [r,y]of [[.268,.10],[.292,.27],[.314,.425]]){const hoop=paint(new THREE.TorusGeometry(r,.018,4,10),0x6e5131,501);hoop.rotateX(Math.PI/2);hoop.translate(0,y,0);parts.push(hoop)}
 return join(parts);
}
function sack(fill){
 const n=9,points=[],parts=[];
 for(const [r,y]of [[.19,0],[.28,.18],[.25,.43],[.085,.64],[.13,.72]])for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2+.15;points.push([Math.cos(a)*r*(1+.06*Math.sin(i*3)),y,Math.sin(a)*r]);
 }
 for(let ring=0;ring<4;ring++)for(let j=0;j<n;j++){
  const a=ring*n+j,b=ring*n+(j+1)%n,c=b+n,d=a+n;
  parts.push(triangles(points,[[a,d,b],[b,d,c]],j%3?0xa58c66:0x947957,600+j));
 }
 for(let j=0;j<n;j++){
  parts.push(triangles([[0,0,0],points[j],points[(j+1)%n]],[[0,1,2]],0x8e7554,610));
  parts.push(triangles([[0,.69,0],points[n*4+j],points[n*4+(j+1)%n]],[[0,2,1]],0x7e674b,611));
 }
 const tie=paint(new THREE.TorusGeometry(.09,.018,4,9),0x65503a);tie.rotateX(Math.PI/2);tie.translate(0,.645,0);parts.push(tie);
 parts.push(beam([.06,.645,.04],[.21,.57,.05],.017,.012,0x65503a),beam([.06,.645,.04],[.13,.55,-.11],.016,.01,0x65503a));
 const g=join(parts);g.scale(1,fill,1);return g;
}
function foodStockpile(state){
 const parts=[],centers=[[-.38,.14],[.38,.04]];
 // Containers precede contents so the unchanged basket shell can be compared across fill states.
 for(const [x,z]of centers){const g=basket();g.translate(x,0,z);parts.push(g)}
 const containerVertices=parts.reduce((sum,g)=>sum+g.attributes.position.count,0);
 const bag=sack(state==='full'?1:state==='partial'?.54:.17);bag.rotateY(.4);bag.translate(.88,0,-.30);parts.push(bag);
 if(state!=='empty')for(const[x,z]of (state==='full'?centers:[centers[0]])){const h=state==='full'?.24:.15,fill=paint(new THREE.CylinderGeometry(.267,.217,h,10),0x973a47,645);fill.translate(x,.05+h/2,z);parts.push(fill)}
 const count=state==='full'?24:state==='partial'?8:0;
 for(let i=0;i<count;i++){
  const which=state==='full'?Math.floor(i/12):0,j=i%12,[x,z]=centers[which],top=state==='full'&&j>=7,a=j*2.399,r=top?.11:.17;
  const g=paint(new THREE.IcosahedronGeometry(.066+(i%3)*.004,0),i%3?0xc33c4f:0xd15158,650+i);
  g.translate(x+Math.cos(a)*r,top?.435:state==='partial'?.255:.315,z+Math.sin(a)*r);parts.push(g);
 }
 const g=join(parts);g.translate(-.18,0,0);g.userData.contents=count;g.userData.containerVertices=containerVertices;return g;
}
export function storageResourceGeometry(kind,state){
 if(kind==='stone')return mineGeometry(state);
 if(kind==='woodpile')return woodStockpile(state);
 if(kind==='stonepile')return stoneStockpile(state);
 if(kind==='food')return foodStockpile(state);
 throw Error('Unknown storage resource: '+kind);
}
