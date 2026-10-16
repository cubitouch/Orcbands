import { writeFileSync, mkdirSync } from 'node:fs';

// Deterministic original prototype geometry. No purchased assets.
function buildModel(){
 const lines=['# Orcbands Worker Orc 001 — original procedural prototype','# Units: metres; Y-up; Z-forward','mtllib orc-worker.mtl','s off'];let count=0, faces=0;
 const palette={skin:'#789949',skinDark:'#54773b',skinLight:'#9fb770',leather:'#674331',leatherLight:'#966643',pants:'#393730',red:'#a84a3a',redDark:'#79392e',iron:'#777f7c',steel:'#afb8b0',wood:'#7b4b30',ivory:'#e9dbb5',black:'#272a22',eye:'#e5c988'};
 let currentObj='',currentMat='';
 function use(obj,mat){if(currentObj!==obj){lines.push('o '+obj);currentObj=obj;currentMat=''}if(currentMat!==mat){lines.push('usemtl '+mat);currentMat=mat}}
 function mesh(obj,mat,v,f){use(obj,mat);const offset=count;for(const p of v){lines.push('v '+p.map(n=>Number(n.toFixed(5))).join(' '));count++;}for(const t of f){lines.push('f '+t.map(i=>i+offset+1).join(' '));faces++;}}
 function ell(obj,mat,c,s,rings=8,segments=12){let v=[],f=[];for(let i=0;i<=rings;i++){const a=Math.PI*i/rings;for(let j=0;j<=segments;j++){const b=2*Math.PI*j/segments;v.push([c[0]+s[0]*Math.sin(a)*Math.cos(b),c[1]+s[1]*Math.cos(a),c[2]+s[2]*Math.sin(a)*Math.sin(b)])}}for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;f.push([a,b,a+1],[a+1,b,b+1])}mesh(obj,mat,v,f)}
 function box(obj,mat,c,s){const [x,y,z]=c,[a,b,d]=s.map(e=>e/2);const v=[[x-a,y-b,z-d],[x+a,y-b,z-d],[x+a,y+b,z-d],[x-a,y+b,z-d],[x-a,y-b,z+d],[x+a,y-b,z+d],[x+a,y+b,z+d],[x-a,y+b,z+d]];const f=[];for(const [i,j,k,l] of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])f.push([i,j,k],[i,k,l]);mesh(obj,mat,v,f)}
 function cylinder(obj,mat,a,b,r1,r2,seg=10){const dx=b.map((n,i)=>n-a[i]);const len=Math.hypot(...dx);if(len<.001)return;const up=dx.map(n=>n/len);const arbitrary=Math.abs(up[1])<.9?[0,1,0]:[1,0,0];let u=[up[1]*arbitrary[2]-up[2]*arbitrary[1],up[2]*arbitrary[0]-up[0]*arbitrary[2],up[0]*arbitrary[1]-up[1]*arbitrary[0]];const ul=Math.hypot(...u);u=u.map(n=>n/ul);const w=[up[1]*u[2]-up[2]*u[1],up[2]*u[0]-up[0]*u[2],up[0]*u[1]-up[1]*u[0]];const v=[],f=[];for(let ring=0;ring<2;ring++)for(let i=0;i<seg;i++){const angle=i*2*Math.PI/seg,r=ring?r2:r1,p=ring?b:a;v.push(p.map((n,j)=>n+r*(Math.cos(angle)*u[j]+Math.sin(angle)*w[j])))}v.push([...a],[...b]);for(let i=0;i<seg;i++){let n=(i+1)%seg;f.push([i,n,seg+n],[i,seg+n,seg+i],[2*seg,n,i],[2*seg+1,seg+i,seg+n]);}mesh(obj,mat,v,f)}

 // Carefully art-directed second-pass model: warmer palette, layered materials,
 // organic silhouettes, sculpted face, functional clothing and a wedge-shaped axe.
 function prism(obj,mat,points,z,depth){
  const n=points.length,verts=[],faces=[];
  for(const zz of [z-depth/2,z+depth/2])for(const p of points)verts.push([p[0],p[1],zz]);
  for(let i=1;i<n-1;i++){faces.push([0,i+1,i],[n,n+i,n+i+1]);}
  for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,n+j],[i,n+j,n+i]);}
  mesh(obj,mat,verts,faces);
 }
 function strap(obj,mat,a,b,width=.07){
  cylinder(obj,mat,a,b,width,width,7);
 }
 // Torso: bare green shoulders around a warm leather worker's vest.
 ell('torso','skin',[0,1.65,-.035],[.66,.52,.34],12,16);
 ell('torso','leather',[0,1.53,.10],[.51,.45,.315],11,14);
 ell('torso','leatherLight',[0,1.54,.375],[.36,.34,.075],11,14);
 // Shoulder straps, heavy leather belt and riveted buckle.
 for(const sx of [-1,1]){
  strap('torso','leather', [sx*.38,1.97,.16],[sx*.30,1.31,.43],.086);
  ell('torso','iron',[sx*.31,1.37,.45],[.042,.047,.027],6,8);
 }
 cylinder('torso','leather',[0,1.17,0],[0,1.01,0],.47,.49,13);
 box('torso','leather',[0,1.12,.33],[.88,.17,.31]);
 box('torso','iron',[0,1.115,.50],[.245,.175,.058]);
 box('torso','leather',[0,1.115,.532],[.14,.075,.015]);
 // Layered apron has a curved, tapered silhouette rather than a rectangle.
 prism('torso','leather',[
  [-.43,1.07],[.43,1.07],[.44,.55],[.27,.46],[-.39,.49]],.402,.095);
 prism('torso','leatherLight',[
  [-.34,1.00],[-.16,.98],[-.20,.55],[-.33,.56]],.466,.017);
 prism('torso','redDark',[
  [.13,.76],[.32,.76],[.27,.56],[.15,.57]],.472,.014);
 // Knife, tool pouch and two loops read clearly in the RTS silhouette.
 ell('torso','leather',[.50,1.00,.09],[.23,.25,.205],8,10);
 ell('torso','leatherLight',[.52,1.17,.15],[.18,.08,.17],6,9);
 box('torso','iron',[.51,1.18,.30],[.08,.09,.028]);
 for(const x of [-.26,.16]){
  strap('torso','iron',[x,.92,.49],[x+.04,.81,.50],.016);
 }
 // Shoulder/hip skirt and differently sized leg gaiters.
 for(const [side,sx] of [['left',-1],['right',1]]) {
  const x=sx*.31,id=side+'_leg';
  ell(id,'pants',[x,.83,-.012],[.265,.42,.25],10,12);
  cylinder(id,'pants',[x,.91,0],[x,.46,.07],.235,.215,11);
  cylinder(id,'leatherLight',[x,.49,.06],[x,.25,.09],.255,.26,11);
  ell(id,'leather',[x,.17,.135],[.28,.22,.38],9,12);
  ell(id,'leatherLight',[x,.135,.27],[.29,.11,.29],7,12);
  box(id,'black',[x,.065,.19],[.59,.1,.78]);
  for(const y of [.29,.40])strap(id,'leather',[x-.20,y,.286],[x+.20,y,.286],.028);
  ell(id,'iron',[x+.12,.4,.287],[.025,.028,.019],5,6);
 }
 // Muscular upper arms and forearms taper gradually toward big hands.
 for(const [side,sx] of [['left',-1],['right',1]]) {
  const id=side+'_arm';
  ell(id,'skin',[sx*.72,1.88,0],[.31,.32,.34],11,13);
  ell(id,'skinDark',[sx*.84,1.67,-.025],[.22,.29,.26],9,11);
  cylinder(id,'skin',[sx*.86,1.70,.02],[sx*.96,1.30,.13],.22,.195,12);
  ell(id,'leather',[sx*.93,1.40,.13],[.23,.20,.225],8,12);
  for(const y of [1.31,1.51]){
    cylinder(id,'leatherLight',[sx*.94,y+.028,.125],[sx*.94,y-.025,.125],.229,.229,10);
  }
  ell(id,'skin',[sx*.97,1.17,.17],[.205,.19,.22],9,11);
  // Thumb and three readable glove/knuckle volumes.
  ell(id,'skin',[sx*.83,1.16,.30],[.09,.11,.115],7,8);
  for(let j=0;j<3;j++){
    ell(id,'skinDark',[sx*(.88+j*.092),1.06,.29],[.055,.067,.065],6,8);
  }
  ell(id,'iron',[sx*.93,1.46,.35],[.029,.034,.026],5,8);
 }
 // Head: a wider, heavier jaw, prominent brow, low-set eyes and cheek planes.
 cylinder('head','skinDark',[0,1.96,0],[0,2.18,0],.27,.33,12);
 ell('head','skin',[0,2.32,.045],[.455,.36,.35],12,18);
 ell('head','skin',[0,2.15,.225],[.43,.19,.275],10,15);
 ell('head','skinDark',[0,2.14,.433],[.315,.093,.055],8,13);
 ell('head','black',[0,2.195,.462],[.245,.031,.018],6,11);
 ell('head','skinLight',[0,2.34,.38],[.175,.124,.16],10,12);
 // Nose nostrils sit on the muzzle.
 for(const sx of [-1,1]){
  ell('head','skinDark',[sx*.107,2.305,.520],[.048,.034,.018],6,8);
  // Set the eyelids UNDER heavy brow ridges for a serious expression.
  ell('head','skinDark',[sx*.207,2.446,.319],[.15,.075,.092],7,10);
  ell('head','ivory',[sx*.198,2.431,.401],[.085,.056,.032],7,10);
  ell('head','black',[sx*.194,2.426,.431],[.033,.033,.014],6,8);
  ell('head','skin',[sx*.197,2.485,.394],[.172,.061,.085],7,10);
  // Tusks originate from the lower jaw and curve OUT before pointing up.
  cylinder('head','ivory',[sx*.279,2.115,.420],[sx*.310,2.325,.452],.087,.017,11);
  ell('head','skin',[sx*.328,2.255,.290],[.15,.12,.12],7,9);
  // Triangular ears with inner ear shading and dark piercings.
  cylinder('head','skin',[sx*.37,2.39,-.015],[sx*.68,2.43,-.085],.155,.03,10);
  ell('head','skinDark',[sx*.47,2.40,.032],[.14,.062,.034],5,8);
  ell('head','iron',[sx*.51,2.35,-.060],[.033,.046,.028],6,7);
 }
 // A broad, cloth headband, side knot, trailing ribbons and hair crest.
 ell('head','red',[0,2.59,.020],[.47,.106,.365],6,15);
 ell('head','redDark',[0,2.53,.340],[.31,.04,.035],5,10);
 ell('head','red',[.42,2.55,-.285],[.12,.09,.11],6,9);
 prism('head','red',[[.40,2.55],[.62,2.52],[.60,2.25],[.52,2.34]],-.315,.06);
 prism('head','redDark',[[.47,2.54],[.58,2.44],[.58,2.17],[.53,2.27]],-.36,.045);
 cylinder('head','black',[0,2.65,-.10],[.015,2.83,-.13],.13,.045,9);
 // Leather scar/hair and smaller accessory marks.
 strap('head','skinDark',[-.26,2.38,.366],[-.19,2.28,.427],.012);
 // A functional axe silhouette instead of square hammer blocks.
 cylinder('right_arm','wood',[.99,1.41,.26],[1.02,.61,.29],.052,.045,11);
 cylinder('right_arm','leather',[.992,1.29,.264],[.996,1.06,.273],.060,.061,10);
 ell('right_arm','iron',[1.023,.635,.29],[.086,.095,.082],7,9);
 prism('right_arm','steel',[
  [1.02,.86],[1.24,.91],[1.51,.84],[1.49,.50],[1.24,.45],[1.02,.55]
 ],.292,.12);
 prism('right_arm','iron',[[1.47,.81],[1.57,.75],[1.56,.61],[1.47,.53]],.294,.14);
 for(const y of [1.13,1.22])strap('right_arm','leatherLight',[.943,y,.318],[1.04,y+.012,.319],.013);
 // Boots, skin and leather details intentionally asymmetrical.
 ell('left_arm','leather',[ -.85,1.78,-.12],[.08,.13,.11],5,7);
 const mtl=['# Original Orcbands worker palette'];
 for(const [k,c] of Object.entries(palette)){const rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255);mtl.push('newmtl '+k,'Ka 0.2 0.2 0.2','Kd '+rgb.join(' '),'Ks 0.05 0.05 0.05','Ns 7','d 1','illum 2','');}
 return {obj:lines.join('\n')+'\n',mtl:mtl.join('\n')+'\n',vertices:count,faces};
}


function regroupObj(source){
 
 const objects=new Map(),preamble=['# Orcbands Worker Orc 001 — original procedural prototype','# Units: metres; Y-up; Z-forward','mtllib orc-worker.mtl','s off'];
 let part=null, material=null;const oldToLocal=[null];
 for(const line of source.split(/\r?\n/)){
  if(line.startsWith('o ')){part=line.slice(2).trim();if(!objects.has(part))objects.set(part,{vertices:[],faces:[]});}
  else if(line.startsWith('usemtl ')){material=line.slice(7).trim();}
  else if(line.startsWith('v ')){const o=objects.get(part);if(!o)throw Error('vertex without object');o.vertices.push(line);oldToLocal.push([part,o.vertices.length-1]);}
  else if(line.startsWith('f ')){const o=objects.get(part);if(!o||!material)throw Error('face without material');o.faces.push({material,indices:line.slice(2).trim().split(/\s+/).map(Number)});}
 }
 const lookup=new Map();let globalIdx=1;
 for(const [name,o] of objects)for(let i=0;i<o.vertices.length;i++)lookup.set(name+':'+i,globalIdx++);
 const out=[...preamble];
 for(const [name,o] of objects){
  out.push('o '+name,...o.vertices);let mat=null;
  for(const f of o.faces){if(f.material!==mat){mat=f.material;out.push('usemtl '+mat);}
   out.push('f '+f.indices.map(index=>{
    const loc=oldToLocal[index];if(!loc)throw Error('bad index '+index);return lookup.get(loc[0]+':'+loc[1]);
   }).join(' '));
  }
 }
 return out.join('\n')+'\n';

}

const out=process.argv[2] || 'preview/assets';
mkdirSync(out,{recursive:true});
const {obj:rawObj,mtl,vertices,faces}=buildModel();
const obj=regroupObj(rawObj);
writeFileSync(`${out}/orc-worker.obj`,obj);
writeFileSync(`${out}/orc-worker.mtl`,mtl);
console.log(`Orcbands worker: ${vertices} vertices, ${faces} triangles -> ${out}`);
