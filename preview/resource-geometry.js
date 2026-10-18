import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {seededRandom} from './environment-layout.js?v=__ORCBANDS_REVISION__';

export function paint(g,color,seed=1){
 const source=g.index?g.toNonIndexed():g,random=seededRandom(seed),base=new THREE.Color(color),colors=[];
 for(const name of Object.keys(source.attributes))if(!['position','normal'].includes(name))source.deleteAttribute(name);
 if(source!==g)g.dispose();
 for(let i=0;i<source.attributes.position.count;i+=3){
  const c=base.clone().multiplyScalar(.91+random()*.17);for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);
 }
 source.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return source;
}
export function triangles(points,faces,color,seed){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>points[i])),3));g.computeVertexNormals();return paint(g,color,seed);
}
export function join(parts){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;}
export function beam(a,b,r1,r2,color,seed=1){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
 const g=paint(new THREE.CylinderGeometry(r2,r1,delta.length(),7),color,seed);
 g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
 g.translate(...start.add(end).multiplyScalar(.5).toArray());return g;
}
export function leaf(width,length,color,seed){
 return triangles([[0,0,0],[-width,.07,length*.42],[0,.15,length*.54],[width,.06,length*.45],[0,.04,length]],
  [[0,1,2],[0,2,3],[1,4,2],[2,4,3],[0,3,1],[1,3,4]],color,seed);
}
export function uprightTrunk(length,bottom,top,seed=1){
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
export function logGeometry(length=2.75,radius=.255,seed=1,branches=true){
 const parts=[uprightTrunk(length,radius,radius*.64,seed)];
 if(branches)for(const [x,y,z,tx,tz] of [[-.15,.85,.05,-.43,.16],[-.13,1.8,.04,-.36,.22],[.04,2.25,-.12,.16,-.35]])
  parts.push(beam([x,y,z],[tx,y+.1,tz],.075,.045,0x594027,seed));
 const g=join(parts);g.rotateZ(-Math.PI/2);g.translate(-length/2,0,0);g.rotateZ(-Math.atan((radius*.36-.035)/length));g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y,0);return g;
}
