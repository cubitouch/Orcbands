import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {groundHeight,seededRandom} from './environment-layout.js?v=__ORCBANDS_REVISION__';

const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
const cache=new Map();
function paint(g,color,seed=1){
 const source=g.index?g.toNonIndexed():g,random=seededRandom(seed),base=new THREE.Color(color),colors=[];
 for(const name of Object.keys(source.attributes))if(!['position','normal'].includes(name))source.deleteAttribute(name);
 if(source!==g)g.dispose();
 for(let i=0;i<source.attributes.position.count;i+=3){
  const c=base.clone().multiplyScalar(.91+random()*.17);for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);
 }
 source.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return source;
}
function triangles(points,faces,color,seed){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>points[i])),3));g.computeVertexNormals();return paint(g,color,seed);
}
function join(parts){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;}
function beam(a,b,r1,r2,color,seed=1){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
 const g=paint(new THREE.CylinderGeometry(r2,r1,delta.length(),7),color,seed);
 g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
 g.translate(...start.add(end).multiplyScalar(.5).toArray());return g;
}
function leaf(width,length,color,seed){
 return triangles([[0,0,0],[-width,.07,length*.42],[0,.15,length*.54],[width,.06,length*.45],[0,.04,length]],
  [[0,1,2],[0,2,3],[1,4,2],[2,4,3],[0,3,1],[1,3,4]],color,seed);
}
function bushGeometry(state){
 const parts=[],random=seededRandom(3101);
 // Low, spreading branching habit; broad pointed leaves break up the faceted masses.
 const lobes=[[-.48,.48,.08,.48,.40,.42],[.06,.69,-.08,.57,.48,.49],[.51,.43,.06,.44,.35,.39],[-.10,.37,.42,.52,.33,.37],[.02,.42,-.44,.43,.34,.39]];
 for(let i=0;i<lobes.length;i++){
  const [x,y,z,w,h,d]=lobes[i];
  parts.push(beam([0,.06,0],[x,y-.12,z],.045,.018,0x5a452d,i+31));
  const pts=[],n=7;
  for(let j=0;j<n;j++){const a=j/n*Math.PI*2;pts.push([x+Math.cos(a)*w*(.9+random()*.18),y-h*.35+random()*.06,z+Math.sin(a)*d])}
  pts.push([x-.10,y+h*.55,z+.04],[x+.08,y-h*.8,z]);
  const faces=[];for(let j=0;j<n;j++){faces.push([j,7,(j+1)%n],[j,(j+1)%n,8])}
  parts.push(triangles(pts,faces,[0x54753b,0x648443,0x496e38,0x597a3c,0x4e723d][i],i+21));
  for(let j=0;j<5;j++){
   const a=j/5*Math.PI*2+i*.7,g=leaf(.15+random()*.045,.38+random()*.14,j%2?0x6d8c47:0x52773d,i*10+j);
   g.rotateX(-.25+random()*.35);g.rotateY(a);g.translate(x+Math.sin(a)*w*.65,y+.06,z+Math.cos(a)*d*.55);parts.push(g);
  }
 }
 const bunches=[[-.59,.56,.31],[-.41,.72,-.17],[-.12,.91,.26],[.24,.92,.14],[.57,.53,.31],[.61,.54,-.17],[.13,.63,-.61],[-.31,.53,-.55],[-.18,.39,.67],[.21,.43,.63]];
 let berryCount=0;
 bunches.forEach(([x,y,z],i)=>{
  for(let j=0;j<3;j++){
   if(state==='empty'||(state==='picked'&&j!==i%3))continue;
   const radius=.083+((i*3+j)%4)*.006,bx=x+(j-1)*.105,by=y+(j===1?.075:0),bz=z+(j===1?-.035:.025);
   const fruit=paint(new THREE.IcosahedronGeometry(radius,0),[0xc83e52,0xb92f46,0xd4515b][(i+j)%3],i*3+j+80);
   fruit.translate(bx,by,bz);parts.push(fruit);berryCount++;
   const crown=leaf(.038,.075,0x4e6132,i+j);crown.rotateX(Math.PI/2);crown.translate(bx,by+radius*.92,bz-.025);parts.push(crown);
  }
 });
 const g=join(parts);g.scale(.8,.94,.8);g.userData.berryCount=berryCount;return g;
}
function uprightTrunk(length,bottom,top,seed=1){
 const parts=[],pts=[],n=9;
 for(let ring=0;ring<3;ring++)for(let j=0;j<n;j++){
  const a=j/n*Math.PI*2+.12,t=ring/2,r=bottom+(top-bottom)*t;
  pts.push([Math.cos(a)*r+t*.035, t*length+(ring===2?Math.sin(j*2.3)*.018:0),Math.sin(a)*r-t*.025]);
 }
 for(let ring=0;ring<2;ring++)for(let j=0;j<n;j++){
  const a=ring*n+j,b=ring*n+(j+1)%n,c=b+n,d=a+n;
  parts.push(triangles(pts,[[a,d,b],[b,d,c]],[0x503722,0x6e4e2e,0x503722,0x38291c][j%4],seed+j));
 }
 // Broad fresh sapwood rim and one restrained heartwood ring; no fine texture lines.
 for(const [offset,r,y] of [[18,top,length],[0,bottom,0]]){
  const center=[offset===18?.035:0,y,offset===18?-.025:0];
  const disk=[center,...Array.from({length:n},(_,j)=>{const p=pts[offset+j];return [center[0]+(p[0]-center[0])*.72,p[1],center[2]+(p[2]-center[2])*.72]}),...pts.slice(offset,offset+n)];
  for(let j=0;j<n;j++){
   const k=(j+1)%n,orient=faces=>offset===18?faces.map(f=>[f[0],f[2],f[1]]):faces;
   parts.push(triangles(disk,orient([[1+j,10+j,1+k],[1+k,10+j,10+k]]),0xd6b17a,seed+j));
   parts.push(triangles(disk,orient([[0,1+j,1+k]]),0xbd965f,seed+j));
  }
 }
 return join(parts);
}
function logGeometry(length=2.75,radius=.255,seed=1,branches=true){
 const parts=[uprightTrunk(length,radius,radius*.64,seed)];
 if(branches)for(const [x,y,z,tx,tz] of [[-.15,.85,.05,-.43,.16],[-.13,1.8,.04,-.36,.22],[.04,2.25,-.12,.16,-.35]])
  parts.push(beam([x,y,z],[tx,y+.1,tz],.075,.045,0x594027,seed));
 const g=join(parts);g.rotateZ(-Math.PI/2);g.translate(-length/2,0,0);g.rotateZ(-Math.atan((radius*.36-.035)/length));g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y,0);return g;
}
function woodGeometry(state){
 if(state==='trunk')return logGeometry();
 const parts=[];
 if(state==='stump'){
  parts.push(uprightTrunk(.44,.265,.25,311));
  for(let j=0;j<5;j++){
   const a=j/5*Math.PI*2+.1,c=Math.cos(a),s=Math.sin(a),w=.10;
   parts.push(triangles([[c*.18,.24,s*.18],[c*.44,.01,s*.44],[c*.24-s*w,.005,s*.24+c*w],[c*.24+s*w,.005,s*.24-c*w]],[[0,2,1],[0,1,3],[0,3,2]],j%2?0x503722:0x6e4e2e,30+j));
  }
  // A broad split makes the cut read as wood rather than a perfect cylinder cap.
  parts.push(triangles([[-.07,.444,-.22],[.015,.446,.07],[.04,.445,-.12]],[[0,1,2]],0x715232,90));
 }
 if(state==='logs')for(const [i,x,y,z,l] of [[0,0,0,-.19,1.26],[1,.10,0,.20,1.43],[2,-.06,.30,0,1.14]]){
  const g=logGeometry(l,.18,i+80,false);g.rotateY((i-1)*.05);g.translate(x,y,z);parts.push(g);
 }
 if(state==='chips'){
  const random=seededRandom(319);
  for(let i=0;i<19;i++){
   const a=random()*Math.PI*2,r=.32+random()*.52,l=.07+random()*.11,w=.025+random()*.035;
   const g=triangles([[-l*.5,0,-w],[l*.5,0,-w*.4],[l*.35,0,w],[-l*.4,0,w*.5],[0,.035,0]],[[0,4,1],[1,4,2],[2,4,3],[3,4,0],[0,1,2],[0,2,3]],i%3?0xd2ad72:0xb58a53,i+111);
   g.rotateY(random()*Math.PI*2);g.translate(Math.cos(a)*r,.007,Math.sin(a)*r);parts.push(g);
  }
 }
 return join(parts);
}
export const RESOURCE_STATES={bush:['full','picked','empty'],wood:['standing','stump','trunk','logs','chips']};
export function resourceGeometry(kind,state){
 if(!RESOURCE_STATES[kind]?.includes(state)||state==='standing')throw Error('Unknown procedural resource: '+kind+'/'+state);
 const key=kind+'/'+state;if(!cache.has(key))cache.set(key,kind==='bush'?bushGeometry(state):woodGeometry(state));return cache.get(key);
}
export function createResource(kind,state){
 const root=new THREE.Group();root.name=kind+' '+state;
 const mesh=new THREE.Mesh(resourceGeometry(kind,state),material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return root;
}
export function buildGroveResources(parent,placements){
 const parts=[];
 for(const p of placements){
  const g=resourceGeometry(p.kind,p.state).clone(),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.angle||0);
  if(p.kind==='wood'&&p.state!=='chips'){
   const dx=groundHeight(p.x+.5,p.z)-groundHeight(p.x-.5,p.z),dz=groundHeight(p.x,p.z+.5)-groundHeight(p.x,p.z-.5);
   rotation.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-dx,1,-dz).normalize()));
  }
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(p.x,groundHeight(p.x,p.z)-.012,p.z),rotation,new THREE.Vector3().setScalar(p.scale||1));
  g.applyMatrix4(matrix);
  if(p.state==='chips'){
   const position=g.attributes.position;
   for(let i=0;i<position.count;i++)position.setY(i,position.getY(i)+groundHeight(position.getX(i),position.getZ(i))-groundHeight(p.x,p.z));
   g.computeVertexNormals();
  }
  parts.push(g);
 }
 const mesh=new THREE.Mesh(join(parts),material);mesh.name='Berry patches and woodcutting site';mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
// Self-contained OBJ with the common RGB-per-vertex extension (no external MTL).
// Export in asset coordinates, independently of the inspector's orbit/rotation.
export function exportResourceOBJ(source){
 const root=source.clone(true);root.updateMatrixWorld(true);
 const lines=['# Orcbands resource; metres, +Y up; vertex colors are sRGB'];let index=1;
 const v=new THREE.Vector3(),color=new THREE.Color();
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const sourceGeometry=mesh.geometry,g=sourceGeometry.index?sourceGeometry.toNonIndexed():sourceGeometry;
  const positions=g.attributes.position,colors=g.attributes.color,materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  lines.push('o '+(mesh.name||'resource').replace(/\s+/g,'_'));
  for(let i=0;i<positions.count;i++){
   v.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
   if(colors)color.fromBufferAttribute(colors,i);
   else{const group=g.groups.find(group=>i>=group.start&&i<group.start+group.count);color.copy(materials[group?.materialIndex||0].color)}
   color.convertLinearToSRGB();lines.push('v '+[v.x,v.y,v.z,color.r,color.g,color.b].map(n=>n.toFixed(6)).join(' '));
  }
  for(let i=0;i<positions.count;i+=3)lines.push('f '+[index+i,index+i+1,index+i+2].join(' '));
  index+=positions.count;if(g!==sourceGeometry)g.dispose();
 });
 return lines.join('\n')+'\n';
}
