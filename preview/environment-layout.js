import {noise} from './ground-surface.js?v=__ORCBANDS_REVISION__';
// Metres, +Y up. This module is independent of Three.js so placement can be audited.
export const TORCH_PLACEMENTS=[{x:-7,z:0},{x:5,z:5},{x:4,z:-11},{x:-1,z:9}];
export function nearTorch(x,z,margin=0){return TORCH_PLACEMENTS.some(p=>Math.hypot(x-p.x,z-p.z)<.38+margin)}
export const RESOURCE_PLACEMENTS=[
 {kind:'shelter',state:'stocked',x:5.5,z:-8,angle:.05,radius:2.65},
 {kind:'construction',state:'roof',x:6,z:8.5,angle:-.10,radius:3.05},
 {kind:'bush',state:'full',x:7.2,z:0,scale:1,angle:.4,radius:1.0},
 {kind:'bush',state:'picked',x:6.2,z:-2.2,scale:.85,angle:1.7,radius:.85},
 {kind:'bush',state:'full',x:6.6,z:2,scale:.82,angle:2.8,radius:.82},
 {kind:'bush',state:'full',x:-7.4,z:-4.4,scale:.95,angle:2.2,radius:.95},
 {kind:'bush',state:'empty',x:-7,z:-6.5,scale:.85,angle:.7,radius:.85},
 {kind:'bush',state:'picked',x:-6.5,z:-7.8,scale:.90,angle:1.2,radius:.90},
 {kind:'wood',state:'stump',x:-4.6,z:6.7,angle:.2,radius:.5},
 {kind:'wood',state:'trunk',x:-4.3,z:8.4,angle:-.25,radius:1.5},
 {kind:'woodpile',state:'full',x:-2.6,z:7.1,angle:1.35,radius:1.33},
 {kind:'wood',state:'chips',x:-4.6,z:6.7,angle:.2,radius:.86},
 {kind:'stone',state:'full',x:-10,z:-3.5,angle:.2,radius:1.75},
 {kind:'stone',state:'depleted',x:8.6,z:-4.1,angle:-.3,radius:1.4},
 {kind:'stonepile',state:'partial',x:-1.2,z:5.1,angle:.12,radius:1.25},
 {kind:'food',state:'full',x:-8,z:1.6,angle:-.3,radius:1.15}
];
export function nearResource(x,z,margin=0){return RESOURCE_PLACEMENTS.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+margin)}
export const GROVE_SEED = 2302;
export const CAMPFIRE_PLACEMENT={x:.1,z:.15};
export function nearCampfire(x,z,margin=0){return Math.hypot(x-CAMPFIRE_PLACEMENT.x,z-CAMPFIRE_PLACEMENT.z)<1.15+margin;}
export const HUT_PLACEMENT = {x:-3,z:-3.8,scale:1,angle:0};
export function inHutFootprint(x,z,margin=0){return Math.abs(x-HUT_PLACEMENT.x)<2.9+margin && Math.abs(z-HUT_PLACEMENT.z)<2.6+margin;}
export function seededRandom(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function groundHeight(x, z) {
  const edge = Math.min(1, Math.hypot(x / 11, z / 10));
  return edge * (.18 * Math.sin(x * .19 + z * .12) + .13 * Math.cos(z * .28) + .12);
}
// A broad woodland meander with smaller local deviations, not an engineered arc.
export function pathPoint(t) {
  const z = 25 - 50 * t;
  const x = -2 + 5.2 * Math.sin((t * 1.8 - .4) * Math.PI) + .34*Math.sin(t*26) + .18*Math.sin(t*47);
  const halfWidth = 1.12 + .20 * Math.sin(t * 16) + .13 * Math.cos(t * 29);
  return {x, z, halfWidth};
}
export const pathSamples = Array.from({length:601}, (_, i) => pathPoint(-1+i/200));
// A short foot trail opens toward the future camp clearing, without adding a new game system.
export const clearingTrail = Array.from({length:49},(_,i)=>{
 const t=i/48;return {x:2.8-8.2*t,z:2.1+1.0*Math.sin(t*3.4)-1.1*t,halfWidth:.62+.20*Math.sin(t*Math.PI)};
});
export const hutApproach=Array.from({length:33},(_,i)=>{
 const t=i/32;return {x:-2.4-.6*t+.12*Math.sin(t*Math.PI),z:1.9-3.55*t,halfWidth:.67+.08*Math.sin(t*4)};
});
export function pathDistance(x, z) {
 let d=Infinity;
 for(const samples of [pathSamples,clearingTrail,hutApproach])for(const p of samples)d=Math.min(d,Math.hypot(x-p.x,z-p.z)-p.halfWidth);
 return d;
}
export function wornGround(x,z){
 // Cache-friendly nearest route lookup, with a smooth, asymmetric noisy transition into turf.
 const t=(25-z)/50,step=1/200,index=Math.round((t+1)*200);
 let distance=Infinity;
 for(let j=Math.max(0,index-10);j<=Math.min(pathSamples.length-1,index+10);j++){
  const p=pathSamples[j];distance=Math.min(distance,Math.hypot(x-p.x,z-p.z)-p.halfWidth);
 }
 for(const p of [...clearingTrail,...hutApproach])distance=Math.min(distance,Math.hypot(x-p.x,z-p.z)-p.halfWidth);
 const edge=(noise(x*1.6+8,z*1.6)-.5)*.58+(noise(x*.55,z*.55+20)-.5)*.9;
 const track=Math.max(0,Math.min(1,(.65-distance+edge)/1.15));
 // An irregular trampled apron at the trail junction, fading into the open clearing.
 const clearing=Math.hypot((x+.2)/3.7,(z-1.8)/2.25);
 const apron=Math.max(0,Math.min(1,(1-clearing+(noise(x*1.1,z*1.1)-.5)*.45)*1.8));
 const fireApron=Math.max(0,1-Math.hypot(x-CAMPFIRE_PLACEMENT.x,z-CAMPFIRE_PLACEMENT.z)/1.7);
 const workApron=Math.max(0,1-Math.hypot((x+4.2)/2.5,(z-7.5)/2.0));
 const stockApron=Math.max(0,1-Math.hypot((x+1.2)/1.8,(z-5.1)/1.3));
 const miningApron=Math.max(0,1-Math.hypot((x+10)/2.0,(z+3.5)/1.5));
 const shelterApron=Math.max(0,1-Math.hypot((x-5.5)/2.9,(z+7.6)/2.5));
 const buildApron=Math.max(0,1-Math.hypot((x-6)/3.4,(z-8.5)/2.6));
 return Math.max(track,apron*.82,fireApron*.95,workApron*.85,stockApron*.85,miningApron*.8,shelterApron*.88,buildApron*.82);
}
// Deliberately authored pockets. The southern opening reveals the clearing from the reset camera.
const treePositions = [
  [-16,-11],[-13,-13],[-10,-11],[-7,-14],[-6,-14],[.6,-16.5],[5,-16],[9,-14],[13,-12],[16,-10],
  [-17,-6],[-13,-7],[-10,-6],[-8,-9],[-16,-1],[-12,-2],[-10,1],
  [10,-6],[13,-7],[16,-4],[11,-2],[15,1],[17,5],[12,5],
  [-16,5],[-13,6],[-10,7],[-15,10],[-11,12],[-8,11],
  [10,10],[14,11],[17,13],[7,14],[-3,-9],[8,4]
];
// Irregular woodland pockets surround the existing inner composition, with a second northern layer.
function outerForest(seed,existing){
 const random=seededRandom(seed+6200),trees=[];
 const clusters=[[-27,-23,7],[-17,-25,6],[-5,-27,6],[8,-27,6],[21,-25,7],
  [30,-17,8],[29,-5,7],[31,9,7],[25,22,7],[13,27,6],[-1,28,6],[-16,26,7],
  [-27,17,8],[-29,4,8],[-30,-9,8],[-30,-38,6],[-15,-39,6],[1,-42,7],[18,-40,7],[34,-31,6]];
 for(const [cx,cz,count] of clusters){
  let placed=0;
  for(let attempt=0;placed<count&&attempt<240;attempt++){
   const angle=random()*Math.PI*2,r=Math.sqrt(random());
   const x=cx+Math.cos(angle)*r*6.5,z=cz+Math.sin(angle)*r*4.8;
   const scale=.83+random()*.34;
   if(pathDistance(x,z)<1.36*scale+.38)continue;
   if([...existing,...trees].some(t=>Math.hypot(t.x-x,t.z-z)<2.12))continue;
   trees.push({x,z,scale,angle:random()*Math.PI*2});placed++;
  }
 }
 // Connect the pockets into woodland rather than leaving separate islands on a lawn.
 let connected=0;
 for(let attempt=0;connected<72&&attempt<4000;attempt++){
  const x=-34+random()*68,z=-38+random()*69,scale=.83+random()*.34;
  if(Math.hypot(x/20,z/18)<1.04 || pathDistance(x,z)<1.36*scale+.38)continue;
  if([...existing,...trees].some(t=>Math.hypot(t.x-x,t.z-z)<2.12))continue;
  trees.push({x,z,scale,angle:random()*Math.PI*2});connected++;
 }
 return trees;
}
export function createLayout(seed = GROVE_SEED) {
  const random = seededRandom(seed);
  const trees = treePositions.map(([x,z]) => ({x, z, scale:.83 + random() * .34, angle:random() * Math.PI * 2}));
  const rocks = [];
  // Outcrops anchor the two woodland shoulders; smaller companions make them feel embedded.
  for (const [cx,cz,count] of [[-7.8,4.5,5],[8,-9,5],[-13,-10,4],[14,7,4],[-6,13,3]]) {
    for (let i=0;i<count;i++) {
      const a=random()*Math.PI*2, r=i ? .8+random()*1.7 : 0;
      const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,type=i===0?2:i<3?1:0;
      const scale=i===0 ? 1.0+random()*.25 : .55+random()*.5;
      const radius=[.45,.95,1.65][type]*scale;
      if(!inHutFootprint(x,z,radius) && pathDistance(x,z)>radius+.45 && trees.every(t=>Math.hypot(t.x-x,t.z-z)>radius+.5))
        rocks.push({x,z,type,scale,radius,angle:random()*6.28});
    }
  }
  const plants=[];
  function plant(x,z,type,scale) {
    const radius=[.30,.36,.55][type]*scale;
    if(inHutFootprint(x,z,radius) || pathDistance(x,z)<radius+.22 || rocks.some(r=>Math.hypot(x-r.x,z-r.z)<r.radius+radius*.5))return;
    plants.push({x,z,type,scale,angle:random()*6.28,color:random()});
  }
  for (const tree of trees) {
    for(let i=0;i<15;i++) {
      const a=random()*6.28,r=.45+Math.sqrt(random())*2.25;
      plant(tree.x+Math.cos(a)*r,tree.z+Math.sin(a)*r,i%3,.7+random()*.65);
    }
  }
  // Uneven meadow islands, with the middle deliberately quieter.
  for(const [cx,cz] of [[-5,7],[6,7],[-5,-5],[7,-3],[-2,11],[1,-6],[-7,0],[2,3]]) {
    for(let i=0;i<20;i++) {
      const a=random()*6.28,r=Math.sqrt(random())*1.9;
      plant(cx+Math.cos(a)*r,cz+Math.sin(a)*r,i%3,.55+random()*.45);
    }
  }
  // A few small stones sit outside the walkable corridor, never scattered across it.
  for(let i=0;i<24;i++) {
    const p=pathPoint(.1+random()*.8),side=i%2?1:-1;
    const x=p.x+side*(p.halfWidth+1.0+random()*.9),z=p.z;
    if(!inHutFootprint(x,z,.4) && pathDistance(x,z)>.7 && trees.every(t=>Math.hypot(t.x-x,t.z-z)>1) && rocks.every(r=>Math.hypot(r.x-x,r.z-z)>r.radius+.5))
      rocks.push({x,z,type:0,scale:.35+random()*.4,radius:.4,angle:random()*6.28});
  }
  const added=outerForest(seed,trees),forestRandom=seededRandom(seed+6300);
  trees.push(...added);
  for(const tree of added)for(let i=0;i<5;i++){
   const angle=forestRandom()*Math.PI*2,r=.5+Math.sqrt(forestRandom())*2.0;
   const x=tree.x+Math.cos(angle)*r,z=tree.z+Math.sin(angle)*r,type=i%3,scale=.65+forestRandom()*.55;
   const radius=[.30,.36,.55][type]*scale;
   if(pathDistance(x,z)>radius+.25)plants.push({x,z,type,scale,angle:forestRandom()*6.28,color:forestRandom()});
  }
  return {seed,trees,rocks:rocks.filter(p=>!nearCampfire(p.x,p.z,p.radius)&&!nearTorch(p.x,p.z,p.radius)&&!nearResource(p.x,p.z,p.radius)),
   plants:plants.filter(p=>!nearCampfire(p.x,p.z,[.30,.36,.55][p.type]*p.scale)&&!nearTorch(p.x,p.z,[.30,.36,.55][p.type]*p.scale)&&!nearResource(p.x,p.z,[.30,.36,.55][p.type]*p.scale)),campfire:{...CAMPFIRE_PLACEMENT},resources:RESOURCE_PLACEMENTS.map(p=>({...p}))};
}
