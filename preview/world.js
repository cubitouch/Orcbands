// Original procedural prototype scenery. No purchased game assets.
export function createCrashSite(THREE) {
  const group=new THREE.Group();
  const mats={
    grass:mat(0x53794b), grass2:mat(0x648955),
    earth:mat(0x836a4c), bark:mat(0x634a34), pine:mat(0x2b6343),
    pine2:mat(0x3d8054), darkPine:mat(0x24513b),
    stone:mat(0x81928a), stone2:mat(0xa2ada1),
    wood:mat(0x87563a), woodLight:mat(0xad7750),
    canvas:mat(0xd5bb8b), red:mat(0x8f4c3b),
    metal:mat(0x89918f), fire:mat(0xfbc16b,{emissive:0xc36727,emissiveIntensity:.55}),
    shadow:mat(0x2e4435)
  };
  function mat(color,options={}){return new THREE.MeshStandardMaterial({color,roughness:.92,flatShading:true,...options});}
  function addMesh(parent,geo,m,pos,rot,scale) {
    const mesh=new THREE.Mesh(geo,m);
    if(pos)mesh.position.set(...pos);
    if(rot)mesh.rotation.set(...rot);
    if(scale)mesh.scale.set(...scale);
    mesh.castShadow=false; mesh.receiveShadow=true;
    parent.add(mesh); return mesh;
  }
  const cube=new THREE.BoxGeometry(1,1,1);
  const dodeca=new THREE.DodecahedronGeometry(1,0);
  const cylinder=(a,b,segments=8)=>new THREE.CylinderGeometry(a,b,1,segments);
  const base=addMesh(group,new THREE.BoxGeometry(17,.48,14),mats.grass,[0,-.30,0]);
  const rim=addMesh(group,new THREE.BoxGeometry(17.2,.24,14.2),mats.earth,[0,-.59,0]);
  addMesh(group,new THREE.CircleGeometry(1.2,14),mats.earth,[-1.6,-.053,1.1],[-Math.PI/2,0,0],[1.4,1,1]);
  function cone(x,z,scale=1,type=0) {
    const pine=new THREE.Group();
    pine.position.set(x,0,z);
    pine.scale.setScalar(scale);
    addMesh(pine,cylinder(.17,.25),mats.bark,[0,.48,0],null,[1,1.25,1]);
    const green=[mats.pine,mats.pine2,mats.darkPine][type%3];
    for(let i=0;i<3;i++) {
      const y=.95+i*.53;
      addMesh(pine,new THREE.ConeGeometry(1.05-i*.2,1.36,7),green,[0,y,0]);
    }
    group.add(pine);
  }
  [[-7,-5,1.5,1],[-5.5,-5.4,1.25,0],[-3.5,-5.7,1.05,2],[-6,-3,1.2,2],
   [-7,0,1.3,1],[-6.7,3.4,1.45,0],[-6.8,5.6,.8,2],
   [-3.9,5.65,1.25,0],[1.5,5.7,1.05,1],[4.9,5.6,1.55,2],
   [7.3,4,1.32,1],[7,-4.5,1.2,0],[5.2,-5.8,1.7,2],[1,-5.6,.9,1]]
   .forEach(row=>cone(...row));
  for(const [x,z,size] of [[-5,2.2,.42],[5.5,-.2,.55],[3.7,4.5,.38],[-3.7,3.5,.5],[-2,-5,.6]]) {
    addMesh(group,dodeca,mats.stone,[x,.19*size,z],[.1,x*.18,z*.12],[size,.64*size,size*.85]);
  }
  // Small supply pile by the stranded orc
  for(let i=0;i<4;i++)
    addMesh(group,cylinder(.12,.12,7),mats.bark,[-.7+i*.27,.12,2.8],[Math.PI/2,0,.12]);
  addMesh(group,cylinder(.33,.43,10),mats.bark,[-2.7,.31,1.7],null,[1,.6,1]);
  // Orc shelter: stone foundation, rough logs and patched canopy
  const hut=new THREE.Group();hut.position.set(-3.1,0,-2.45);
  addMesh(hut,cube,mats.earth,[0,.20,0],null,[2.55,.4,2.1]);
  addMesh(hut,cube,mats.wood,[0,.96,0],null,[2.1,1.25,1.7]);
  addMesh(hut,cube,mats.shadow,[0,.82,.89],null,[.70,1.08,.06]);
  for(const sx of [-1,1]){
    addMesh(hut,cube,mats.red,[sx*.68,1.81,0],[0,0,sx*.55],[1.53,.16,2.25]);
    addMesh(hut,cube,mats.woodLight,[sx*1.04,1.2,.35],null,[.14,1.4,.14]);
  }
  addMesh(hut,cube,mats.woodLight,[.6,.70,1.15],null,[.6,.55,.6]);
  group.add(hut);
  // Crash survivor's zeppelin: torn envelope, exposed ribs, rope lines and gondola
  const airship=new THREE.Group();
  airship.position.set(2.55,.55,-2.1);
  airship.rotation.set(.20,.42,-.17);
  addMesh(airship,new THREE.SphereGeometry(1,16,9),mats.canvas,[0,1.0,0],null,[2.05,.96,.92]);
  for(let k=0;k<5;k++){
    const x=-1.35+k*.68;
    const rib=addMesh(airship,new THREE.TorusGeometry(.91,.045,6,13),mats.wood,[x,1.0,0],[0,Math.PI/2,0],[1,.93,1]);
  }
  addMesh(airship,cube,mats.red,[0,1.76,0],null,[1.82,.1,.31]);
  addMesh(airship,cube,mats.wood,[.1,-.35,.05],null,[2.1,.57,.88]);
  addMesh(airship,cube,mats.woodLight,[-.35,-.13,.55],null,[.42,.18,.2]);
  addMesh(airship,cube,mats.shadow,[.10,-.34,.51],null,[.42,.31,.04]);
  for(const sx of [-1,1]){
    addMesh(airship,cylinder(.035,.04,5),mats.woodLight,[sx*1.1,.25,.37],[.25,0,.1],[1,1.8,1]);
  }
  // Detached propeller and scattered debris beside the wreck
  addMesh(airship,cylinder(.14,.14,7),mats.metal,[1.4,-.32,0],[0,0,Math.PI/2]);
  for(let i=0;i<3;i++){
    addMesh(airship,cube,mats.woodLight,[1.56,-.32,0],[0,0,i*Math.PI/3],[.1,.87,.11]);
  }
  group.add(airship);
  for(const [x,z,a] of [[4.7,-1.5,.3],[5,-.65,-.12],[3.6,-.2,.6]])
    addMesh(group,cube,mats.wood,[x,.11,z],[0,a,.18],[.92,.17,.23]);
  // Small glowing campfire near the foreground
  addMesh(group,new THREE.ConeGeometry(.27,.65,5),mats.fire,[-.30,.35,.52]);
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7;
    addMesh(group,dodeca,mats.stone,[-.30+Math.cos(a)*.38,.08,.52+Math.sin(a)*.38],null,[.2,.11,.18]);
  }
  return group;
}
