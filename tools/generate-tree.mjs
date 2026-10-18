// Deterministic geometry source for the shipped OBJ and MTL.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
function makeTree(){
 const vs=[],fs=[],PI=Math.PI;
 const v=(x,y,z)=>(vs.push([x,y,z].map(z=>+z.toFixed(5))),vs.length);
 const face=(mat,...ids)=>fs.push([mat,ids]);
 function ring(n,r,y,shift=0,offX=0,offZ=0,jitter=0){
  return Array.from({length:n},(_,i)=>{const a=2*PI*i/n+shift;
   const w=1+jitter*(.45*Math.sin(i*4.13+shift*2)+.55*Math.cos(i*2.71+shift));
   return v(offX+Math.cos(a)*r*w,y,offZ+Math.sin(a)*r*w);
  });
 }
 function connect(a,b,cols){a.forEach((q,i)=>face(cols[i%cols.length],q,b[i],b[(i+1)%a.length],a[(i+1)%a.length]))}
 const b=ring(9,.265,.035,.12),m=ring(9,.215,1.5,.12,.035,-.015),t=ring(9,.135,2.91,.12,.08,-.065);
 connect(b,m,['bark','bark_light','bark','bark_shadow']);connect(m,t,['bark','bark_light','bark']);
 const cb=v(0,.035,0),ct=v(.08,2.91,-.065);
 for(let i=0;i<9;i++){const j=(i+1)%9;face('bark_shadow',b[i],b[j],cb);face('bark_light',t[i],ct,t[j])}
 function tier(y,h,r,phase,seed){
  const n=9;const low=Array.from({length:n},(_,i)=>{const a=2*PI*i/n+phase;const w=1+.075*Math.sin(i*2.37+seed)+.055*Math.cos(i*3.73+seed);return v(Math.cos(a)*r*w,y+.075*Math.sin(i*2.15+seed),Math.sin(a)*r*w)});
  const mid=Array.from({length:n},(_,i)=>{const a=2*PI*i/n+phase;return v(Math.cos(a)*r*.66,y+h*.49+.045*Math.cos(i*1.3+seed),Math.sin(a)*r*.66)});
  const tip=v(.04*Math.sin(seed),y+h,.035*Math.cos(seed)),core=v(0,y+.035,0);
  const colors=['needle_main','needle_light','needle_main','needle_shadow','needle_main','needle_sun'];
  connect(low,mid,colors.slice(seed%6).concat(colors.slice(0,seed%6)));
  for(let i=0;i<n;i++){const j=(i+1)%n;face(colors[(i+seed+2)%6],mid[i],tip,mid[j]);face('needle_shadow',low[i],low[j],core)}
 }
 tier(.83,1.78,1.36,.05,1);tier(1.64,1.79,1.16,.28,2);
 tier(2.44,1.62,.94,.5,3);tier(3.14,1.44,.68,.12,4);
 let obj='# Original Orcbands low-poly pine; metres, +Y up\nmtllib low-poly-pine-01.mtl\no Orcbands_Pine_01\n';
 obj+=vs.map(p=>'v '+p.join(' ')).join('\n')+'\n';
 let current=null;
 for(const [mat,ids] of fs){if(current!==mat){obj+='usemtl '+mat+'\n';current=mat}obj+='f '+ids.join(' ')+'\n'}
 const colors={bark:[.315,.215,.13],bark_light:[.43,.306,.18],bark_shadow:[.22,.16,.11],
 needle_main:[.25,.405,.29],needle_light:[.325,.48,.32],needle_shadow:[.18,.325,.23],needle_sun:[.39,.51,.335]};
 const mtl=Object.entries(colors).map(([name,c])=>'newmtl '+name+'\nKa 0.05 0.05 0.05\nKd '+c.join(' ')+'\nKs 0 0 0\nillum 1\n').join('\n');
 return {obj,mtl,stats:{vertices:vs.length,faces:fs.length,materials:7,height:4.58,width:2.72}};
}
const asset=makeTree(),dir=path.resolve(process.argv[2]||'preview/assets');
await mkdir(dir,{recursive:true});
await writeFile(path.join(dir,'low-poly-pine-01.obj'),asset.obj);
await writeFile(path.join(dir,'low-poly-pine-01.mtl'),asset.mtl);
console.log('Generated original Pine 01',asset.stats);
