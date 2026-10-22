// Original Timber Hut 01, authored in metres, +Y up, entrance toward +Z.
// Run directly to reproduce the shipped OBJ/MTL; no modelling dependencies.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function makeHut(){
 const vertices=[],faces=[];
 let part='foundation';
 const palette={
  timber:[.40,.275,.16],timber_light:[.50,.355,.215],timber_dark:[.265,.17,.095],
  plank:[.37,.255,.155],plank_warm:[.42,.29,.175],plank_shadow:[.295,.195,.115],plank_damp:[.245,.177,.122],plank_dry:[.455,.315,.198],
  roof_red:[.56,.235,.19],roof_light:[.62,.275,.22],roof_warm:[.59,.25,.195],
  roof_shadow:[.48,.19,.16],roof_dark:[.335,.125,.105],roof_eave:[.405,.157,.134],roof_ridge:[.62,.295,.235],
  stone:[.41,.405,.36],stone_light:[.50,.48,.425],stone_shadow:[.32,.33,.30],
  bone:[.72,.625,.42],bone_shadow:[.51,.42,.265],bone_root:[.475,.41,.28],iron:[.115,.128,.12],
  interior:[.087,.062,.041],cloth:[.36,.061,.054],cloth_light:[.46,.082,.063],cloth_hem:[.245,.054,.052]
 };
 const v=p=>(vertices.push(p.map(n=>+n.toFixed(6))),vertices.length);
 const face=(material,points)=>faces.push({part,material,indices:points.map(v)});
 const sub=(a,b)=>a.map((n,i)=>n-b[i]),add=(a,b)=>a.map((n,i)=>n+b[i]),mul=(a,k)=>a.map(n=>n*k);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>mul(a,1/Math.hypot(...a));
 function beam(name,a,b,w,d,material='timber'){
  part=name;const axis=unit(sub(b,a)),u=unit(cross(Math.abs(axis[2])>.9?[0,1,0]:[0,0,1],axis)),q=cross(axis,u);
  const outline=[[-.37,-.5],[.37,-.5],[.5,-.37],[.5,.37],[.37,.5],[-.37,.5],[-.5,.37],[-.5,-.37]];
  const ring=p=>outline.map(([x,z])=>add(p,add(mul(u,x*w),mul(q,z*d))));
  const low=ring(a),high=ring(b);
  for(let i=0;i<8;i++){
   const j=(i+1)%8;face(material,[low[i],low[j],high[j],high[i]]);
  }
  face(material,[...low].reverse());face(material,high);
 }
 function box(name,x,y,z,w,h,d,material='plank',weather=true){
  // Broad weathering bands keep slats dirty at their bases, dry above.
  if(weather&&h>1.15&&/^(side_slat_|back_slat_|front_slat_)/.test(name)){
   // Low damp section plus the original varied slat tone above.
   // Two bands preserve the Asset Lab's triangle budget.
   box(name,x,y-h*.31,z,w,h*.38,d,'plank_damp',false);
   const sunExposed=/_([048])$/.test(name);
   box(name,x,y+h*.19,z,w,h*.62,d,sunExposed?'plank_dry':material,false);
   return;
  }
  part=name;
  const points=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]
   .map(([a,b,c])=>[x+a*w/2,y+b*h/2,z+c*d/2]);
  for(const ids of [[4,5,6,7],[1,0,3,2],[5,1,2,6],[0,4,7,3],[3,7,6,2],[0,1,5,4]])face(material,ids.map(i=>points[i]));
 }
 function footing(name,x,z,w=.52,d=.52,h=.36){
  part=name;const outline=[[-.4,-.5],[.35,-.5],[.5,-.28],[.46,.37],[.23,.5],[-.4,.45],[-.52,.15]];
  const low=outline.map(([a,b])=>[x+a*w,-.13,z+b*d]);
  const high=outline.map(([a,b],i)=>[x+a*w*.9+.015,h*(.87+.1*Math.sin(i*1.4)),z+b*d*.87]);
  for(let i=0;i<outline.length;i++){
   const j=(i+1)%outline.length;face(i%3===0?'stone_shadow':'stone',[low[i],high[i],high[j],low[j]]);
   face('stone_light',[high[i],[x,h*.96,z],high[j]]);
  }
 }
 function tusk(name,x,y,z,side){
  part=name;const rings=[[[x,y,z],.19,.23],[[x+side*.035,y+.28,z+.018],.14,.16],[[x+side*.09,y+.53,z+.035],.075,.09]];
  const points=rings.map(([p,w,d])=>[[p[0]-w/2,p[1],p[2]-d/2],[p[0]+w/2,p[1],p[2]-d/2],[p[0]+w/2,p[1],p[2]+d/2],[p[0]-w/2,p[1],p[2]+d/2]]);
  for(let j=0;j<2;j++)for(let i=0;i<4;i++)face(j===0?'bone_root':i===0?'bone_shadow':'bone',[points[j][i],points[j+1][i],points[j+1][(i+1)%4],points[j][(i+1)%4]]);
  const tip=[x+side*.155,y+.72,z+.075];
  for(let i=0;i<4;i++)face(i===0?'bone_shadow':'bone',[points[2][i],tip,points[2][(i+1)%4]]);
 }
 // Raised, embedded sill and irregular stone pads carry the frame into the ground.
 box('interior_floor',0,.09,0,4.3,.18,3.55,'interior');
 for(const x of [-2.12,2.12])for(const z of [-1.72,1.88])footing('corner_stone_'+x+'_'+z,x,z,.68,.66,.39);
 for(const x of [-1.05,1.05])footing('door_stone_'+x,x,2.10,.52,.57,.28);
 footing('entrance_step',0,2.27,1.7,.73,.16);
 // Unequal-width wall slats make the building feel assembled, rather than extruded.
 const plankColors=['plank','plank_shadow','plank_warm','plank','plank_warm','plank_shadow'];
 for(const side of [-1,1]){
  for(let i=0;i<10;i++){
   const z=-1.66+i*.36,w=.337+.014*Math.sin(i*2.2),h=2.12+.055*Math.sin(i*2.1+side);
   box('side_slat_'+side+'_'+i,side*2.02,.24+h/2,z,.16,h,w,plankColors[(i+(side>0?2:0))%6]);
  }
  beam('side_lower_sill_'+side,[side*2.12,.33,-1.8],[side*2.12,.33,1.95],.23,.22,'timber_dark');
  beam('side_eave_beam_'+side,[side*2.12,2.38,-1.95],[side*2.12,2.38,2.08],.25,.28,'timber_light');
  beam('side_mid_post_'+side,[side*2.16,.22,.1],[side*2.16,2.5,.1],.25,.26);
  beam('side_diagonal_'+side,[side*2.18,.46,-1.35],[side*2.18,1.88,-.03],.16,.14,'timber_light');
  beam('side_diagonal_front_'+side,[side*2.18,.44,.36],[side*2.18,1.8,1.56],.15,.14,'timber');
 }
 for(let i=0;i<12;i++)box('back_slat_'+i,-1.88+i*.34,1.35,-1.83,.319,2.18,.16,plankColors[i%6]);
 for(const side of [-1,1])for(let i=0;i<3;i++)box('front_slat_'+side+'_'+i,side*(1.34+i*.28),1.35,1.88,.26,2.16,.17,plankColors[(i+1)%6]);
 for(const side of [-1,1])for(const z of [-1.76,1.99]){
  const x=side*2.15;
  beam('corner_post_'+side+'_'+z,[x,.20,z],[x+side*.035,2.68,z],.34,.35,'timber_light');
  beam('corner_binding_'+side+'_'+z,[x,1.78,z],[x,1.93,z],.375,.39,'timber_dark');
  tusk('ivory_post_cap_'+side+'_'+z,x,2.65,z,side);
 }
 beam('entrance_left',[-.94,.20,2.04],[-.99,2.42,2.04],.28,.30,'timber_light');
 beam('entrance_right',[.94,.20,2.04],[.99,2.42,2.04],.28,.30,'timber_light');
 beam('entrance_lintel',[-1.17,2.34,2.07],[1.17,2.34,2.07],.29,.34,'timber_dark');
 // The entrance is physically open: walls, roof and a dark back wall form its recess.
 box('shadowed_back_wall',0,1.24,-1.70,3.82,2.1,.035,'interior');
 // Curved low-poly roof profile: full ridge, broad slopes, low slightly sagging eaves.
 const profile=[[0,3.91],[.55,3.85],[1.13,3.58],[1.73,3.13],[2.28,2.63],[2.73,2.40]];
 function roofY(x,z){
  x=Math.abs(x);let y=2.40;
  for(let i=0;i<profile.length-1;i++)if(x>=profile[i][0]&&x<=profile[i+1][0]){
   const a=profile[i],b=profile[i+1],t=(x-a[0])/(b[0]-a[0]);y=a[1]+(b[1]-a[1])*t;break;
  }
  return y+.035*Math.sin(z*1.3)-.045*Math.pow(Math.abs(z)/2.35,2);
 }
 for(const z of [-1.97,2.07]){
  const xs=[-2.18,-1.73,-1.13,-.55,0,.55,1.13,1.73,2.18];
  for(let i=0;i<xs.length-1;i++){
   part='curved_gable_infill_'+z+'_'+i;
   const x0=xs[i],x1=xs[i+1];
   const quad=[[x0,2.38,z],[x1,2.38,z],[x1,roofY(x1,z)+.015,z],[x0,roofY(x0,z)+.015,z]];
   face(i%3?'plank_shadow':'plank',z>0?quad:quad.reverse());
  }
  beam('gable_tie_'+z,[-2.31,2.42,z],[2.31,2.42,z],.24,.22,'timber');
  // Segmented chamfered rafters follow the same bowed profile as the roof skin.
  const arc=[...profile.slice(1).map(([x,y])=>[-x,y]).reverse(),...profile];
  for(let i=0;i<arc.length-1;i++){
   const [x0]=arc[i],[x1]=arc[i+1];
   beam('curved_fascia_'+z+'_'+i,[x0,roofY(x0,z)-.055,z+(z>0?.27:-.27)],[x1,roofY(x1,z)-.055,z+(z>0?.27:-.27)],.13,.15,'timber_light');
  }
  beam('gable_king_post_'+z,[0,2.45,z],[0,3.84,z],.17,.18,'timber_dark');
 }
 // Continuous dark red underside keeps seams from exposing the interior.
 for(const side of [-1,1])for(let i=0;i<profile.length-1;i++){
  part='roof_underlay';const x0=side*profile[i][0],x1=side*profile[i+1][0];
  const quad=[[x0,roofY(x0,-2.31),-2.31],[x1,roofY(x1,-2.31),-2.31],[x1,roofY(x1,2.40),2.40],[x0,roofY(x0,2.40),2.40]];
  const upper=side>0?[...quad].reverse():quad;
  face('roof_dark',upper);face('roof_dark',[...upper].reverse());
 }
 const roofColors=['roof_red','roof_warm','roof_red','roof_shadow','roof_light','roof_red','roof_warm'];
 // Staggered, chipped panels. Independent outlines and front hems break the eave silhouette.
 for(const side of [-1,1])for(let row=0;row<5;row++){
  const outer=2.76-row*.55,inner=Math.max(.015,outer-.65);
  for(let col=0;col<8;col++){
   part='roof_panel_'+side+'_'+row+'_'+col;
   const stagger=row%2?.16:0,z0=Math.max(-2.36,-2.36+col*.60-stagger),z1=Math.min(2.45,-2.36+(col+1)*.60-stagger);
   if(z1-z0<.1)continue;
   const outerX=outer+.025*Math.sin(col*4.1+row),innerX=inner;
   const corners=[[innerX,z0+.018],[outerX-.06,z0],[outerX+.022*Math.sin(col+row),z0+.16],
    [outerX-.025,z1-.08],[outerX-.10,z1],[innerX,z1-.01]];
   const points=corners.map(([x,z])=>[side*x,roofY(x,z)+.040+row*.008,z]);
   const center=[side*((outerX+innerX)/2),roofY((outerX+innerX)/2,(z0+z1)/2)+.045+row*.008,(z0+z1)/2];
   for(let j=0;j<points.length;j++){
    const next=(j+1)%points.length,tri=[points[j],points[next],center];
    const swatch=roofColors[(col*3+row*2+(side>0?2:0))%roofColors.length];
     const roofMaterial=row===0?'roof_eave':row===4?'roof_ridge':swatch;
     face(roofMaterial,side>0?tri.reverse():tri);
   }
   // A thin, dark chipped edge gives the lowest row visible thickness without heavy gutters.
   if(row===0){
    const a=points[1],b=points[2],c=points[3];
    face('roof_shadow',side>0?[a,[a[0],a[1]-.065,a[2]],[b[0],b[1]-.065,b[2]],b]:[b,[b[0],b[1]-.065,b[2]],[a[0],a[1]-.065,a[2]],a]);
    face('roof_shadow',side>0?[b,[b[0],b[1]-.065,b[2]],[c[0],c[1]-.065,c[2]],c]:[c,[c[0],c[1]-.065,c[2]],[b[0],b[1]-.065,b[2]],b]);
   }
  }
 }
 // Ridge caps prevent a bright slit and give the roof its slightly uneven crest.
 for(let i=0;i<9;i++){
  const z=-2.38+i*.54,z1=z+.59;
  part='ridge_cap_'+i;
  const a=[-.13,roofY(.13,z)+.09,z],b=[.13,roofY(.13,z)+.09,z],c=[0,roofY(0,z)+.16,z];
  const d=[-.13,roofY(.13,z1)+.09,z1],e=[.13,roofY(.13,z1)+.09,z1],f=[0,roofY(0,z1)+.16,z1];
  face(i%3?'roof_red':'roof_light',[a,d,f,c]);face('roof_warm',[c,f,e,b]);
  face('roof_shadow',[a,c,b]);face('roof_shadow',[d,e,f]);
 }
 // Barrel staves and hoops; small original dressing pieces belong to this hut asset.
 function barrel(name,x,z,scale=1){
  const n=10,rings=[[.04,.25],[.13,.30],[.42,.335],[.72,.30],[.79,.25]].map(([y,r])=>Array.from({length:n},(_,i)=>[x+Math.cos(i/n*Math.PI*2)*r*scale,y*scale,z+Math.sin(i/n*Math.PI*2)*r*scale]));
  part=name;
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){
   const k=(i+1)%n;face(plankColors[(i+2)%6],[rings[j][i],rings[j+1][i],rings[j+1][k],rings[j][k]]);
  }
  face('timber_light',[...rings.at(-1)].reverse());
  for(const y of [.17,.63]){
   const r=(y<.3?.312:.318)*scale;
   const low=Array.from({length:n},(_,i)=>[x+Math.cos(i/n*Math.PI*2)*r,y*scale,z+Math.sin(i/n*Math.PI*2)*r]);
   const high=low.map(([a,b,c])=>[a,b+.065*scale,c]);
   for(let i=0;i<n;i++){const k=(i+1)%n;face('iron',[low[i],high[i],high[k],low[k]])}
  }
 }
 barrel('entrance_barrel',-1.65,2.36,1);barrel('small_barrel',-1.30,2.25,.7);
 box('crate_body',1.62,.34,2.23,.58,.58,.53,'plank_shadow');
 for(let i=0;i<4;i++)box('crate_front_slat_'+i,1.4+i*.145,.34,2.51,.13,.57,.045,i%2?'plank':'plank_warm');
 beam('crate_brace',[1.36,.10,2.55],[1.88,.57,2.55],.075,.06,'timber_light');
 // Simple original tribe pennant, with a cream skull-like mark and cut-out-looking dark eyes.
 beam('banner_pole',[3.10,-.04,-.55],[3.08,3.15,-.55],.12,.13,'timber_dark');
 beam('banner_crossbar',[2.58,2.98,-.55],[3.67,2.98,-.55],.08,.085,'timber_light');
 part='tribe_banner';
 const cloth=[[2.66,2.94,-.52],[3.60,2.94,-.51],[3.63,1.84,-.46],[3.28,1.72,-.43],[3.14,1.90,-.44],[2.69,1.78,-.49]];
 const mid=[3.16,2.43,-.40];
 for(let i=0;i<cloth.length;i++)face(Math.min(cloth[i][1],cloth[(i+1)%cloth.length][1])<2?'cloth_hem':i%3?'cloth':'cloth_light',[cloth[(i+1)%cloth.length],cloth[i],mid]);
 // Rear face makes the cloth readable from both orbit directions.
 for(let i=0;i<cloth.length;i++)face('cloth',[cloth[i],cloth[(i+1)%cloth.length],mid.map((n,j)=>n-(j===2?.014:0))]);
 part='banner_emblem';
 const symbol=[[2.92,2.63,-.365],[3.08,2.72,-.365],[3.36,2.65,-.365],[3.34,2.35,-.365],[3.23,2.34,-.365],[3.20,2.18,-.365],[3.06,2.21,-.365],[3.02,2.37,-.365],[2.93,2.40,-.365]];
 for(let i=1;i<symbol.length-1;i++)face('bone',[symbol[0],symbol[i],symbol[i+1]].reverse());
 face('bone',[[2.95,2.55,-.36],[2.76,2.73,-.36],[2.81,2.43,-.36]]);
 face('bone',[[3.34,2.58,-.36],[3.48,2.43,-.36],[3.52,2.72,-.36]]);
 box('emblem_eye_left',3.035,2.51,-.345,.095,.07,.012,'cloth');
 box('emblem_eye_right',3.235,2.51,-.345,.095,.07,.012,'cloth');
 let obj='# Original Orcbands Timber Hut 01; metres, +Y up, front +Z\nmtllib timber-hut-01.mtl\n';
 obj+=vertices.map(p=>'v '+p.join(' ')).join('\n')+'\n';
 let currentPart=null,currentMaterial=null;
 for(const f of faces){
  if(f.part!==currentPart){obj+='o '+f.part+'\n';currentPart=f.part}
  if(f.material!==currentMaterial){obj+='usemtl '+f.material+'\n';currentMaterial=f.material}
  obj+='f '+f.indices.join(' ')+'\n';
 }
 const mtl=Object.entries(palette).map(([name,c])=>'newmtl '+name+'\nKa 0.05 0.05 0.05\nKd '+c.join(' ')+'\nKs 0 0 0\nillum 1\n').join('\n');
 return {obj,mtl,stats:{vertices:vertices.length,faces:faces.length,triangles:faces.reduce((n,f)=>n+f.indices.length-2,0),materials:Object.keys(palette).length,parts:new Set(faces.map(f=>f.part)).size}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const asset=makeHut(),dir=path.resolve(process.argv[2]||'preview/assets');await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'timber-hut-01.obj'),asset.obj);await writeFile(path.join(dir,'timber-hut-01.mtl'),asset.mtl);
 console.log('Generated original Timber Hut 01',asset.stats);
}
