// Goblin 01: hand-authored faceted surfaces. Metres, +Y up, front +Z.
// A static study inspired by the supplied goblin reference; no third-party mesh data.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function makeGoblin(){
 const vertices=[],faces=[];
 const palette={
  skin:[.43,.57,.255],skin_light:[.54,.65,.32],skin_shadow:[.34,.46,.22],
  skin_dark:[.265,.36,.175],ear_inner:[.34,.405,.22],
  hair:[.235,.225,.28],hair_light:[.295,.28,.325],hair_shadow:[.17,.17,.215],
  socket:[.16,.135,.17],eye:[.45,.16,.19],eye_light:[.58,.23,.24],
  tooth:[.86,.82,.60],tooth_shadow:[.63,.61,.43],
  leather:[.30,.17,.18],leather_light:[.38,.23,.22],leather_dark:[.225,.13,.15],
  red:[.60,.245,.235],red_shadow:[.44,.18,.19],
  wrap:[.28,.265,.25],wrap_light:[.36,.335,.29],
  metal:[.55,.55,.43],metal_light:[.70,.69,.51],metal_dark:[.38,.39,.32]
 };
 const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]);
 const mul=(a,s)=>a.map(x=>x*s),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>mul(a,1/Math.hypot(...a));
 let part='body';
 function face(mat,points){
  const indices=points.map(p=>{vertices.push(p.map(x=>+x.toFixed(6)));return vertices.length});
  faces.push({part,material:mat,indices});
 }
 // All rings run clockwise viewed from above, giving outward side normals.
 function loft(name,rings,materials,cap=true){
  part=name;const n=rings[0].length;
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){
   const k=(i+1)%n;
   const mat=typeof materials==='function'?materials(j,i):materials;
   face(mat,[rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]]);
  }
  if(cap){face(typeof materials==='function'?materials(0,0):materials,[...rings[0]].reverse());face(typeof materials==='function'?materials(rings.length-2,0):materials,rings.at(-1))}
 }
 const ring=(x,y,z,rx,rz,n=12)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [x+Math.sin(a)*rx,y,z+Math.cos(a)*rz]});
 const form=(name,sections,mat,n=12)=>loft(name,sections.map(([x,y,z,rx,rz])=>ring(x,y,z,rx,rz,n)),mat);
 // An extruded front outline gives broad readable planes instead of spherical parts.
 function plate(name,outline,depth,mat,sideMat=mat){
  part=name;const back=outline.map(([x,y,z])=>[x,y,z-depth]);
  face(mat,outline);face(sideMat,[...back].reverse());
  for(let i=0;i<outline.length;i++){const k=(i+1)%outline.length;face(sideMat,[outline[i],back[i],back[k],outline[k]])}
 }
 function tube(name,points,radii,mat,n=6){
  const direction=unit(sub(points.at(-1),points[0]));
  const u=unit(cross(Math.abs(direction[2])>.9?[0,1,0]:[0,0,1],direction)),v=cross(direction,u);
  // Local ring winding is reversed relative to the forward axis for outward faces.
  const rings=points.map((p,j)=>Array.from({length:n},(_,i)=>{
   const a=-i/n*Math.PI*2;return add(p,add(mul(u,Math.cos(a)*radii[j][0]),mul(v,Math.sin(a)*radii[j][1])));
  }));
  loft(name,rings,mat);
 }
 // Torso is a single connected low-poly volume, subtly leaning forwards.
 form('torso',[[0,.68,0,.235,.145],[0,.83,0,.245,.15],[0,1.04,-.005,.285,.17],
  [0,1.23,-.015,.345,.18],[0,1.34,-.025,.32,.155],[0,1.40,-.02,.14,.12]],
  (j,i)=>i===0||i===11?'skin_light':i<5?'skin':'skin_shadow');
 form('neck',[[0,1.30,-.035,.15,.13],[0,1.52,-.035,.17,.14]],'skin_shadow',10);
 // Long limbs, with elbows and wrists shaped into the same continuous surface.
 for(const s of [-1,1]){
  const side=s<0?'right':'left';
  form(side+'_arm',[[s*.47,.54,.035,.075,.065],[s*.49,.66,.015,.092,.078],
   [s*.48,.82,0,.11,.095],[s*.46,.97,-.005,.09,.085],[s*.43,1.13,-.015,.12,.105],
   [s*.365,1.29,-.025,.14,.135]],(j,i)=>i<3||i===11?'skin':'skin_shadow',8);
  form(side+'_upper_arm_band',[[s*.469,.90,-.004,.099,.094],[s*.453,.978,-.009,.103,.095]],'red',8);
  form(side+'_wrist_wrap',[[s*.483,.59,.018,.086,.078],[s*.493,.74,.009,.104,.091]],
   (j,i)=>i<3?'wrap_light':'wrap',8);
  // A narrow red seam, deliberately restrained against the larger plain cuff.
  form(side+'_cuff_seam',[[s*.494,.725,.009,.105,.092],[s*.491,.75,.008,.104,.092]],'red_shadow',8);
  form(side+'_palm',[[s*.495,.40,.063,.087,.055],[s*.514,.47,.057,.104,.065],
   [s*.491,.59,.025,.08,.063]],(j,i)=>i<3||i===7?'skin':'skin_shadow',8);
  // Three separate tapering fingers hang alongside the thigh; thumb faces inward.
  for(let f=0;f<3;f++){
   const x=s*(.454+f*.045),z=.071+(f===1?.005:0),y=.405+(f===2?.02:0);
   tube(side+'_finger_'+f,[[x,y+.035,z],[x+s*.006,y-.045,z+.012],[x-s*.006,y-.075,z+.035]],
    [[.022,.027],[.021,.023],[.013,.017]],'skin',5);
  }
  tube(side+'_thumb',[[s*.43,.52,.085],[s*.399,.467,.106],[s*.414,.43,.124]],
   [[.029,.033],[.027,.029],[.019,.021]],'skin_light',5);
  // Compact muscular legs leave a real gap between the feet.
  form(side+'_leg',[[s*.156,.075,.018,.091,.087],[s*.16,.22,0,.086,.079],
   [s*.157,.37,-.005,.098,.086],[s*.156,.49,0,.112,.106],[s*.145,.70,0,.124,.12]],
   (j,i)=>i<3||i===7?'skin':'skin_shadow',8);
  form(side+'_foot',[[s*.16,.022,.067,.108,.15],[s*.16,.075,.082,.112,.17],
   [s*.16,.13,.012,.085,.09]],(j,i)=>j===1?'skin':'skin_shadow',8);
  for(let t=0;t<3;t++){
   const x=s*.16+(t-1)*.056;
   plate(side+'_toe_'+t,[[x-.022,.035,.24],[x+.022,.035,.24],[x+.023,.075,.23],[x-.021,.08,.23]],.04,'skin_light','skin');
  }
  form(side+'_shin_guard',[[s*.16,.12,.013,.095,.085],[s*.16,.29,0,.104,.095],[s*.157,.38,-.006,.103,.094]],'wrap',8);
  for(let band=0;band<3;band++){
   const y=.15+band*.075;
   form(side+'_shin_binding_'+band,[[s*.16,y,.006,.102,.093],[s*.16,y+.031,.003,.105,.096]],band%2?'leather_dark':'wrap_light',8);
  }
  const x=s*.157;
  plate(side+'_knee_red_fold',[[x-.116,.392,.10],[x+.104,.395,.108],[x+.075,.35,.13],[x+.01,.327,.14],[x-.05,.368,.142]],.044,'red','red_shadow');
 }
 // Leather skirt wraps around the body; the hem is intentionally uneven.
 const skirtBottom=ring(0,.49,.005,.305,.196,12).map((p,i)=>[p[0],p[1]+[.02,0,.035,.01,.02,0,.01,0,.03,.015,.035,0][i],p[2]]);
 const skirtMid=ring(0,.61,0,.29,.187,12),skirtTop=ring(0,.80,0,.258,.164,12);
 loft('leather_skirt',[skirtBottom,skirtMid,skirtTop],(j,i)=>i%3===0?'leather_light':i%3===1?'leather':'leather_dark');
 loft('red_skirt_hem',[skirtBottom.map(p=>[p[0]*1.01,p[1]-.005,p[2]*1.015]),skirtBottom.map(p=>[p[0]*1.012,p[1]+.036,p[2]*1.02])],'red');
 form('wide_belt',[[0,.72,0,.276,.18],[0,.80,0,.27,.176]],'leather_dark');
 form('belt_upper_edge',[[0,.795,0,.273,.178],[0,.82,0,.264,.173]],'leather_light');
 // Large irregular hexagonal buckle, with inset face and visible rim.
 const buckle=[[-.10,.725,.208],[-.125,.79,.208],[-.063,.854,.208],[.042,.86,.208],[.096,.805,.208],[.075,.732,.208],[-.01,.695,.208]];
 plate('buckle_rim',buckle,.046,'metal_dark');
 plate('buckle_face',buckle.map(([x,y,z])=>[x*.78,.78+(y-.78)*.76,z+.014]),.018,'metal','metal_light');
 plate('buckle_highlight',[[-.081,.79,.226],[-.042,.832,.226],[.043,.837,.226],[.024,.816,.227],[-.037,.813,.227]],.006,'metal_light');
 plate('belt_rivet',[[.185,.755,.156],[.208,.78,.156],[.185,.804,.156],[.163,.779,.156]],.026,'metal');
 // Oversized head. Twelve facets per loop, with cheek and jaw volumes built in.
 const headSections=[
  [0,1.36,.035,.255,.19],[0,1.44,.035,.335,.235],[0,1.59,.012,.405,.265],
  [0,1.79,-.015,.423,.282],[0,1.97,-.035,.377,.255],[0,2.045,-.055,.265,.205]
 ];
 form('head',headSections,(j,i)=>j===4?'skin_light':i===0||i===11?'skin_light':i>5&&i<10?'skin_shadow':'skin',12);
 // Triangular ears use a sculpted inner ridge and thickness, not flat triangles.
 for(const s of [-1,1]){
  const side=s<0?'right':'left';part=side+'_ear';
  const rootTop=[s*.34,1.86,-.01],tip=[s*.715,1.965,-.005],lower=[s*.455,1.565,.015],rootLow=[s*.355,1.62,.06];
  const ridge=[s*.467,1.779,.101],rear=[s*.46,1.76,-.095];
  const points=[rootLow,lower,tip,rootTop];
  for(let i=0;i<4;i++){
   const k=(i+1)%4;
   face(i===1?'skin_light':'skin',s>0?[points[i],points[k],ridge]:[ridge,points[k],points[i]]);
   face('skin_shadow',s>0?[points[k],points[i],rear]:[rear,points[i],points[k]]);
  }
  const inner=[[s*.417,1.744,.083],[s*.475,1.646,.047],[s*.636,1.91,.018]];
  plate(side+'_ear_inner',s<0?inner.reverse():inner,.005,'ear_inner');
 }
 // Muzzle connects into the cheeks. Front is shallow and angular, with a broad lip.
 form('muzzle',[[0,1.405,.216,.21,.067],[0,1.455,.252,.265,.09],[0,1.54,.251,.253,.104],
  [0,1.595,.211,.178,.072]],(j,i)=>j===2?'skin_light':i<3||i===11?'skin':'skin_shadow',10);
 plate('mouth_shadow',[[-.231,1.478,.295],[-.17,1.455,.336],[.17,1.455,.336],[.231,1.478,.295],
  [.165,1.442,.337],[-.165,1.442,.337]],.009,'skin_dark');
 // A narrow lower-lip plane keeps the mouth readable above the beard.
 plate('lower_lip',[[-.17,1.44,.338],[.165,1.44,.338],[.14,1.418,.322],[-.135,1.418,.322]],.014,'skin_light');
 // Red eyes sit in dark sockets beneath heavy brows, following the head facets.
 for(const s of [-1,1]){
  const side=s<0?'right':'left';
  const eyeOutline=[[s*.065,1.778,.278],[s*.313,1.786,.221],[s*.31,1.685,.236],[s*.072,1.679,.292]];
  plate(side+'_eye_socket',s>0?[...eyeOutline].reverse():eyeOutline,.022,'socket');
  const red=[[s*.097,1.751,.289],[s*.278,1.754,.247],[s*.276,1.696,.253],[s*.099,1.695,.301]];
  plate(side+'_eye',s>0?[...red].reverse():red,.008,'eye');
  const light=[[s*.103,1.748,.294],[s*.27,1.751,.252],[s*.267,1.738,.257],[s*.103,1.735,.298]];
  plate(side+'_eye_glint',s>0?[...light].reverse():light,.004,'eye_light');
  const brow=[[s*.038,1.818,.305],[s*.303,1.838,.252],[s*.347,1.803,.235],[s*.318,1.772,.258],[s*.051,1.767,.325]];
  plate(side+'_heavy_brow',s>0?[...brow].reverse():brow,.067,'hair','hair_light');
  // Small lower tusks curve upward beside the mouth, with cream front facets.
  tube(side+'_tusk',[[s*.194,1.465,.317],[s*.211,1.507,.354],[s*.216,1.577,.357],[s*.208,1.608,.353]],
   [[.041,.035],[.036,.028],[.016,.015],[.002,.002]],(j,i)=>i<3?'tooth':'tooth_shadow',5);
 }
 // Wedge-shaped nose has a raised bridge, triangular tip and shaded underside.
 part='nose';
 const nt=[0,1.79,.302],nl=[-.066,1.607,.318],nr=[.066,1.607,.318],tip=[0,1.625,.425],nb=[0,1.585,.343];
 face('skin_light',[nt,nl,tip]);face('skin',[nt,tip,nr]);face('skin_shadow',[nl,nb,tip]);face('skin_dark',[tip,nb,nr]);
 // Close-fitting angular scalp and a short asymmetric raised crest.
 form('scalp',[[0,1.975,-.055,.305,.214],[0,2.055,-.058,.256,.205],[0,2.085,-.065,.12,.15]],
  (j,i)=>i<4?'hair_light':'hair',10);
 // One continuous swept crest, rather than separate conical spikes.
 part='crest_lock_1';
 const hairSections=[
  [[-.155,2.005,.17],[.13,2.005,.17],[-.035,2.12,.15]],
  [[-.165,2.03,.04],[.16,2.03,.04],[.015,2.205,.02]],
  [[-.145,2.025,-.11],[.18,2.025,-.11],[.09,2.15,-.13]],
  [[-.12,1.99,-.265],[.115,1.99,-.265],[.12,2.045,-.29]]
 ];
 for(let j=0;j<hairSections.length-1;j++){
  const [l,r,t]=hairSections[j],[ll,rr,tt]=hairSections[j+1];
  face(j===0?'hair_light':'hair',[l,t,tt,ll]);
  face('hair_light',[t,r,rr,tt]);face('hair_shadow',[r,l,ll,rr]);
 }
 face('hair_light',[hairSections[0][1],hairSections[0][2],hairSections[0][0]]);
 face('hair_shadow',hairSections.at(-1));
 // Sideburns and a broad sculpted beard wrap the jaw in a faceted horseshoe.
 for(const s of [-1,1]){
  const side=s<0?'right':'left';
  const edge=[[s*.325,1.74,.171],[s*.407,1.72,.08],[s*.398,1.48,.141],[s*.30,1.37,.254],[s*.278,1.47,.277]];
  plate(side+'_sideburn',s>0?[...edge].reverse():edge,.065,'hair','hair_shadow');
 }
 // Connected beard front has designed plane breaks; no stacked loose spikes.
 const beardTop=[[-.343,1.46,.212],[-.24,1.395,.307],[0,1.385,.34],[.24,1.395,.307],[.343,1.46,.212]];
 const beardMid=[[-.35,1.325,.20],[-.235,1.245,.285],[0,1.205,.323],[.235,1.245,.285],[.35,1.325,.20]];
 const beardLow=[[-.275,1.247,.125],[-.16,1.17,.195],[0,1.145,.235],[.16,1.17,.195],[.275,1.247,.125]];
 part='beard';
 for(let i=0;i<4;i++){
  face(i===1?'hair_light':'hair',[beardTop[i],beardMid[i],beardMid[i+1],beardTop[i+1]]);
  face(i===2?'hair_light':'hair_shadow',[beardMid[i],beardLow[i],beardLow[i+1],beardMid[i+1]]);
 }
 const back=[0,1.32,.015];
 for(let i=0;i<4;i++)face('hair_shadow',[beardLow[i+1],beardLow[i],back]);
 face('hair_shadow',[beardTop[0],back,beardLow[0],beardMid[0]]);
 face('hair_shadow',[beardTop[4],beardMid[4],beardLow[4],back]);
 face('hair',[...beardTop].reverse().concat([back]));
 let obj='# Orcbands Goblin 01 — static reference-inspired study; metres, +Y up, front +Z\nmtllib goblin-01.mtl\ns off\n';
 obj+=vertices.map(p=>'v '+p.join(' ')).join('\n')+'\n';
 let previousPart,previousMat;
 for(const f of faces){
  if(f.part!==previousPart){obj+='o '+f.part+'\n';previousPart=f.part}
  if(f.material!==previousMat){obj+='usemtl '+f.material+'\n';previousMat=f.material}
  obj+='f '+f.indices.join(' ')+'\n';
 }
 const mtl=Object.entries(palette).map(([name,rgb])=>`newmtl ${name}\nKa 0.05 0.05 0.05\nKd ${rgb.join(' ')}\nKs 0 0 0\nillum 1\n`).join('\n');
 const bounds=[0,1,2].map(i=>[Math.min(...vertices.map(v=>v[i])),Math.max(...vertices.map(v=>v[i]))]);
 return {obj,mtl,vertices,faces,palette,stats:{vertices:vertices.length,faces:faces.length,triangles:faces.reduce((n,f)=>n+f.indices.length-2,0),parts:new Set(faces.map(f=>f.part)).size,materials:Object.keys(palette).length,bounds}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const out=path.resolve(process.argv[2]||'preview/assets');await mkdir(out,{recursive:true});
 const asset=makeGoblin();await writeFile(path.join(out,'goblin-01.obj'),asset.obj);await writeFile(path.join(out,'goblin-01.mtl'),asset.mtl);
 console.log(JSON.stringify(asset.stats,null,2));
}
