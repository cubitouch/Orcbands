import { writeFileSync, mkdirSync } from 'node:fs';

// Deterministic original prototype geometry. No purchased assets.
function buildModel(){
 const lines=['# Orcbands Worker Orc 001 — original procedural prototype','# Units: metres; Y-up; Z-forward','mtllib orc-worker.mtl','s off'];let count=0, faces=0;
 const palette={skin:'#80a848',skinDark:'#62863b',skinLight:'#a3bd67',leather:'#6a4330',leatherLight:'#95623c',pants:'#3a3a32',red:'#ae4839',redDark:'#762f2b',iron:'#869096',steel:'#a9b2af',wood:'#71452b',ivory:'#eee1b2',black:'#292a25',eye:'#e5c988'};
 let currentObj='',currentMat='';
 function use(obj,mat){if(currentObj!==obj){lines.push('o '+obj);currentObj=obj;currentMat=''}if(currentMat!==mat){lines.push('usemtl '+mat);currentMat=mat}}
 function mesh(obj,mat,v,f){use(obj,mat);const offset=count;for(const p of v){lines.push('v '+p.map(n=>Number(n.toFixed(5))).join(' '));count++;}for(const t of f){lines.push('f '+t.map(i=>i+offset+1).join(' '));faces++;}}
 function ell(obj,mat,c,s,rings=8,segments=12){let v=[],f=[];for(let i=0;i<=rings;i++){const a=Math.PI*i/rings;for(let j=0;j<=segments;j++){const b=2*Math.PI*j/segments;v.push([c[0]+s[0]*Math.sin(a)*Math.cos(b),c[1]+s[1]*Math.cos(a),c[2]+s[2]*Math.sin(a)*Math.sin(b)])}}for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;f.push([a,b,a+1],[a+1,b,b+1])}mesh(obj,mat,v,f)}
 function box(obj,mat,c,s){const [x,y,z]=c,[a,b,d]=s.map(e=>e/2);const v=[[x-a,y-b,z-d],[x+a,y-b,z-d],[x+a,y+b,z-d],[x-a,y+b,z-d],[x-a,y-b,z+d],[x+a,y-b,z+d],[x+a,y+b,z+d],[x-a,y+b,z+d]];const f=[];for(const [i,j,k,l] of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])f.push([i,j,k],[i,k,l]);mesh(obj,mat,v,f)}
 function cylinder(obj,mat,a,b,r1,r2,seg=10){const dx=b.map((n,i)=>n-a[i]);const len=Math.hypot(...dx);if(len<.001)return;const up=dx.map(n=>n/len);const arbitrary=Math.abs(up[1])<.9?[0,1,0]:[1,0,0];let u=[up[1]*arbitrary[2]-up[2]*arbitrary[1],up[2]*arbitrary[0]-up[0]*arbitrary[2],up[0]*arbitrary[1]-up[1]*arbitrary[0]];const ul=Math.hypot(...u);u=u.map(n=>n/ul);const w=[up[1]*u[2]-up[2]*u[1],up[2]*u[0]-up[0]*u[2],up[0]*u[1]-up[1]*u[0]];const v=[],f=[];for(let ring=0;ring<2;ring++)for(let i=0;i<seg;i++){const angle=i*2*Math.PI/seg,r=ring?r2:r1,p=ring?b:a;v.push(p.map((n,j)=>n+r*(Math.cos(angle)*u[j]+Math.sin(angle)*w[j])))}v.push([...a],[...b]);for(let i=0;i<seg;i++){let n=(i+1)%seg;f.push([i,n,seg+n],[i,seg+n,seg+i],[2*seg,n,i],[2*seg+1,seg+i,seg+n]);}mesh(obj,mat,v,f)}
 // Main body / silhouette
 ell('torso','skin',[0,1.63,0],[.68,.59,.37],8,14);
 ell('torso','leather',[0,1.57,.16],[.53,.44,.27],7,12);
 box('torso','leatherLight',[0,1.25,.36],[.83,.42,.10]);
 box('torso','leather',[0,1.13,.06],[.93,.16,.66]);
 box('torso','iron',[0,1.13,.40],[.24,.18,.05]);
 box('torso','black',[0,1.13,.43],[.14,.1,.025]);
 cylinder('torso','leatherLight',[-.45,2.01,.26],[.34,1.22,.45],.08,.08,8);
 cylinder('torso','leatherLight',[.40,2.01,-.18],[-.37,1.24,-.2],.075,.075,8);
 box('torso','red',[0,.95,.40],[.52,.39,.08]);
 ell('torso','leather',[.45,1.03,.04],[.17,.21,.26],6,10);
 // Legs / boots
 for(const [side,sx] of [['left',-1],['right',1]]){const x=sx*.32,id=side+'_leg';
 cylinder(id,'pants',[x,1.13,0],[x,.48,.02],.235,.20,9);
 ell(id,'pants',[x,.65,0],[.235,.28,.22],7,10);
 cylinder(id,'leather',[x,.51,.01],[x,.16,.04],.21,.245,9);
 box(id,'leather',[x,.17,.12],[.50,.27,.56]);
 box(id,'leatherLight',[x,.40,.03],[.44,.07,.44]);
 box(id,'black',[x,.06,.15],[.52,.10,.59]);
 }
 // Arms / bracers (whole-arm articulation prototype)
 for(const [side,sx] of [['left',-1],['right',1]]){const id=side+'_arm',x=sx*.72;
 ell(id,'skin',[x,1.86,0],[.31,.26,.31],7,10);
 cylinder(id,'skin',[x,1.84,0],[sx*.84,1.33,.09],.25,.22,10);
 cylinder(id,'leather',[sx*.83,1.56,.08],[sx*.85,1.34,.09],.23,.23,10);
 ell(id,'skin',[sx*.87,1.19,.13],[.22,.20,.22],7,10);
 cylinder(id,'iron',[sx*.85,1.5,.09],[sx*.85,1.46,.09],.235,.235,9);
 }
 // Head + features
 cylinder('head','skinDark',[0,1.97,0],[0,2.22,0],.27,.29,10);
 ell('head','skin',[0,2.33,.08],[.44,.38,.36],9,14);
 ell('head','skinDark',[0,2.17,.30],[.35,.15,.18],7,11);
 ell('head','skinLight',[0,2.31,.41],[.19,.135,.14],6,10);
 for(const sx of [-1,1]){
  cylinder('head','skin', [sx*.36,2.4,.0],[sx*.68,2.43,-.02],.14,.05,8);
  ell('head','eye',[sx*.19,2.43,.39],[.082,.055,.04],5,8);
  ell('head','black',[sx*.19,2.43,.428],[.028,.037,.02],5,8);
  cylinder('head','ivory',[sx*.24,2.15,.40],[sx*.29,2.38,.43],.10,0,8);
  ell('head','skinDark',[sx*.21,2.52,.35],[.20,.065,.10],5,9);
 }
 ell('head','red',[0,2.62,.03],[.45,.105,.36],5,13);
 cylinder('head','redDark',[.33,2.59,-.2],[.52,2.37,-.38],.09,.04,7);
 // Hair tuft
 cylinder('head','black',[0,2.7,-.01],[.08,2.88,-.08],.095,0,7);
 // Axe and handle are attached to right arm for temporary browser animation
 cylinder('right_arm','wood',[.91,1.36,.26],[.97,.56,.3],.055,.052,9);
 box('right_arm','iron',[.97,.56,.31],[.20,.20,.13]);
 box('right_arm','steel',[1.105,.56,.31],[.27,.27,.10]);
 // metal rivets
 for(const y of [1.32,1.6])for(const sx of [-1,1])ell(sx===-1?'left_arm':'right_arm','iron',[sx*.854,y,.33],[.035,.035,.018],4,6);
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
