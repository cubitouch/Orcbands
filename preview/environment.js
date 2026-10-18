import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createLayout, seededRandom, groundHeight, wornGround} from './environment-layout.js?v=__ORCBANDS_REVISION__';

import {noise,groundVariation} from './ground-surface.js?v=__ORCBANDS_REVISION__';

const earth = new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
const leaves = new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
const matrix = new THREE.Object3D();
function geometry(vertices, colors) {
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  if(colors)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.computeVertexNormals();return g;
}
function triangle(out,colors,a,b,c,color) {
  out.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);
}
function surface(parent,g,material=earth) {
  const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function buildTerrain(parent) {
  const vertices=[],colors=[];
  // One continuous mesh: dense vertices in the walkable woodland, coarse in distant meadow.
  const xs=[-250],zs=[-250];
  for(let n=-100;n < -26;n+=2)xs.push(n);
  for(let n=-26;n < -10;n+=1)xs.push(n);
  for(let i=0;i<50;i++)xs.push(-10+i*.4);
  for(let n=10;n < 26;n+=1)xs.push(n);
  for(let n=26;n <=100;n+=2)xs.push(n);
  for(let n=-100;n < -34;n+=2)zs.push(n);
  for(let i=0;i<114;i++)zs.push(-34+i*68/114);
  for(let n=34;n <=100;n+=2)zs.push(n);
  xs.push(250);zs.push(250);
  const grassDark=new THREE.Color(0x637648),grassLight=new THREE.Color(0x85935b);
  const soilDark=new THREE.Color(0x857152),soilLight=new THREE.Color(0xa28b65);
  const points=[];
  for(const z of zs)for(const x of xs)points.push([x,groundHeight(x,z),z]);
  const shade=(x,z)=>{
    const variation=groundVariation(x,z);
    const grass=grassDark.clone().lerp(grassLight,.54+(variation-.5)*.24);
    const soil=soilDark.clone().lerp(soilLight,.22+noise(x*.9+18,z*.9)*.65);
    const worn=wornGround(x,z);
    // Discrete earth/turf flecks give broken polygon edges instead of an airbrushed stripe.
    const coverage=worn>.73?1:worn>.43?.72:worn>.23?.32:0;
    return grass.lerp(soil,coverage).multiplyScalar(.98+variation*.04);
  };
  const face=(a,b,c)=>{
    vertices.push(...points[a],...points[b],...points[c]);
    const x=(points[a][0]+points[b][0]+points[c][0])/3,z=(points[a][2]+points[b][2]+points[c][2])/3;
    const color=shade(x,z),flat=wornGround(x,z)>.12;
    for(const i of [a,b,c]){
      const c=flat?color:shade(points[i][0],points[i][2]);
      colors.push(c.r,c.g,c.b);
    }
  };
  for(let z=0;z<zs.length-1;z++)for(let x=0;x<xs.length-1;x++){
    const a=z*xs.length+x,b=a+xs.length,c=a+1,d=b+1;
    // Alternating diagonals avoid a dominant directional pattern at path edges.
    if((x+z)%2){face(a,b,d);face(a,d,c)}else{face(a,b,c);face(b,d,c)}
  }
  surface(parent,geometry(vertices,colors)).name='Forest floor';
}
function patch(x,z,rx,rz,color,seed) {
  const random=seededRandom(seed),vertices=[],colors=[],n=11;
  const center=[x,groundHeight(x,z)+.012,z],points=[];
  for(let i=0;i<n;i++) {
    const a=i/n*Math.PI*2,r=.82+random()*.25,px=x+Math.cos(a)*rx*r,pz=z+Math.sin(a)*rz*r;
    points.push([px,groundHeight(px,pz)+.012,pz]);
  }
  for(let i=0;i<n;i++)triangle(vertices,colors,center,points[(i+1)%n],points[i],new THREE.Color(color));
  return geometry(vertices,colors);
}
export function createGrassGeometry(type) {
  const random=seededRandom(40+type),vertices=[],colors=[];
  const count=[7,9,7][type],height=[.30,.68,.40][type],width=[.095,.043,.19][type];
  for(let i=0;i<count;i++) {
    const a=i*2.399+random()*.4,r=random()*.14;
    const bx=Math.cos(a)*r,bz=Math.sin(a)*r,h=height*(.65+random()*.6),w=width*(.8+random()*.4);
    const sx=Math.cos(a+Math.PI/2)*w,sz=Math.sin(a+Math.PI/2)*w;
    const lean=[.13,.20,.37][type],mx=bx+Math.cos(a)*lean*.45,mz=bz+Math.sin(a)*lean*.45;
    const base1=[bx-sx*.45,0,bz-sz*.45],base2=[bx+sx*.45,0,bz+sz*.45];
    const left=[mx-sx*.5,h*.52,mz-sz*.5],right=[mx+sx*.5,h*.52,mz+sz*.5];
    const ridge=[mx,h*.60,mz],tip=[bx+Math.cos(a)*lean,h,bz+Math.sin(a)*lean];
    const color=new THREE.Color([0x647d40,0x7b8d48,0x4c713e][type]).multiplyScalar(.85+random()*.25);
    triangle(vertices,colors,base1,base2,ridge,color);
    triangle(vertices,colors,base1,ridge,left,color);
    triangle(vertices,colors,base2,right,ridge,color.clone().multiplyScalar(1.1));
    triangle(vertices,colors,left,ridge,tip,color);
    triangle(vertices,colors,ridge,right,tip,color.clone().multiplyScalar(1.1));
  }
  return geometry(vertices,colors);
}
export function createRockGeometry(type) {
  // Three separately authored outlines: chipped wedge, tall split boulder, low layered shelf.
  const outlines=[
    [[-.44,-.23],[-.16,-.39],[.31,-.25],[.43,.11],[.06,.34],[-.38,.23]],
    [[-.83,-.42],[-.42,-.73],[.24,-.61],[.78,-.22],[.65,.44],[.02,.68],[-.70,.47]],
    [[-1.6,-.42],[-.95,-.83],[.29,-.69],[1.43,-.25],[1.13,.54],[.30,.78],[-1.28,.63]]
  ];
  const outline=outlines[type],n=outline.length,h=[.38,1.12,.72][type],vertices=[],colors=[];
  const lower=outline.map(([x,z])=>[x,-.13,z]);
  const middle=outline.map(([x,z],i)=>[x*(i%2?.94:1),h*(.48+.12*Math.sin(i*2.3)),z]);
  const top=outline.map(([x,z],i)=>[x*.67+.06,h*(.84+.13*Math.sin(i*1.9+type)),z*.68-.03]);
  const palette=[0x77786a,0x919080,0x828577,0x9b9785,0x72796d];
  for(let i=0;i<n;i++) {
    const j=(i+1)%n,c=new THREE.Color(palette[(i+type)%palette.length]);
    triangle(vertices,colors,lower[i],middle[i],lower[j],c);
    triangle(vertices,colors,lower[j],middle[i],middle[j],c);
    triangle(vertices,colors,middle[i],top[i],middle[j],c);
    triangle(vertices,colors,middle[j],top[i],top[j],c);
    triangle(vertices,colors,top[i],[.04,h*.94,-.04],top[j],c.clone().multiplyScalar(1.08));
  }
  return geometry(vertices,colors);
}
function instances(parent,g,material,placements,baseOffset=0) {
  if(!placements.length)return;
  const mesh=new THREE.InstancedMesh(g,material,placements.length);
  placements.forEach((p,i)=>{
    matrix.position.set(p.x,groundHeight(p.x,p.z)+baseOffset*p.scale,p.z);
    matrix.rotation.set(0,p.angle,0);matrix.scale.setScalar(p.scale);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);
    if(p.color!==undefined)mesh.setColorAt(i,new THREE.Color().setRGB(.95+p.color*.08,.96+p.color*.04,.9+p.color*.09));
  });
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function instanceAsset(parent,source,placements,baseOffset=0) {
  // Consolidate an OBJ's material runs into one shared instanced batch per material.
  // No vertex positions, palette entries or normals are changed.
  const buckets=new Map();
  source.traverse(object=>{
    if(!object.isMesh)return;
    const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const group of (g.groups.length?g.groups:[{start:0,count:g.attributes.position.count,materialIndex:0}])) {
      const material=materials[group.materialIndex],part=new THREE.BufferGeometry();
      for(const name of ['position','normal']) {
        const attribute=g.getAttribute(name);
        part.setAttribute(name,new THREE.Float32BufferAttribute(attribute.array.slice(group.start*3,(group.start+group.count)*3),3));
      }
      if(!buckets.has(material))buckets.set(material,[]);buckets.get(material).push(part);
    }
  });
  for(const [material,parts] of buckets) {
    const g=mergeGeometries(parts);instances(parent,g,material,placements,baseOffset);
    parts.forEach(p=>p.dispose());
  }
}
export function buildEnvironment(parent,sourceTree) {
  const layout=createLayout();
  buildTerrain(parent);instanceAsset(parent,sourceTree,layout.trees,-.035);
  const patches=[];
  layout.trees.forEach((p,i)=>patches.push(patch(p.x,p.z,1.3*p.scale,1.1*p.scale,0x5e6b46,i+12)));
  layout.rocks.filter(p=>p.type>0).forEach((p,i)=>patches.push(patch(p.x,p.z,p.radius*1.2,p.radius*.9,0x737351,i+120)));
  const merged=mergeGeometries(patches);surface(parent,merged);patches.forEach(g=>g.dispose());
  for(let type=0;type<3;type++) {
    instances(parent,createGrassGeometry(type),leaves,layout.plants.filter(p=>p.type===type));
    instances(parent,createRockGeometry(type),earth,layout.rocks.filter(p=>p.type===type),-.035);
  }
  return layout;
}
