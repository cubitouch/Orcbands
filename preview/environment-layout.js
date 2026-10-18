// Metres, +Y up. This module is independent of Three.js so placement can be audited.
export const GROVE_SEED = 2302;
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
// A continuous S bend, wide enough for future RTS units; no segmented box meshes.
export function pathPoint(t) {
  const z = 25 - 50 * t;
  const x = -2 + 5.2 * Math.sin((t * 1.8 - .4) * Math.PI);
  const halfWidth = 1.26 + .15 * Math.sin(t * 15) + .08 * Math.cos(t * 31);
  return {x, z, halfWidth};
}
export const pathSamples = Array.from({length:201}, (_, i) => pathPoint(i / 200));
export function pathDistance(x, z) {
  // Signed distance to the corridor edge (conservative at bends).
  return Math.min(...pathSamples.map(p => Math.hypot(x - p.x, z - p.z) - p.halfWidth));
}
// Deliberately authored pockets. The southern opening reveals the clearing from the reset camera.
const treePositions = [
  [-16,-11],[-13,-13],[-10,-11],[-7,-14],[-6,-14],[0,-16],[5,-16],[9,-14],[13,-12],[16,-10],
  [-17,-6],[-13,-7],[-10,-6],[-8,-9],[-16,-1],[-12,-2],[-10,1],
  [10,-6],[13,-7],[16,-4],[11,-2],[15,1],[17,5],[12,5],
  [-16,5],[-13,6],[-10,7],[-15,10],[-11,12],[-8,11],
  [10,10],[14,11],[17,13],[7,14],[-3,-9],[8,4]
];
export function createLayout(seed = GROVE_SEED) {
  const random = seededRandom(seed);
  const trees = treePositions.map(([x,z]) => ({x, z, scale:.83 + random() * .34, angle:random() * Math.PI * 2}));
  const rocks = [];
  // Outcrops anchor the two woodland shoulders; smaller companions make them feel embedded.
  for (const [cx,cz,count] of [[-7,3,5],[8,-9,5],[-13,-10,4],[14,7,4],[-6,13,3]]) {
    for (let i=0;i<count;i++) {
      const a=random()*Math.PI*2, r=i ? .8+random()*1.7 : 0;
      const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,type=i===0?2:i<3?1:0;
      const scale=i===0 ? 1.0+random()*.25 : .55+random()*.5;
      const radius=[.45,.95,1.65][type]*scale;
      if(pathDistance(x,z)>radius+.45 && trees.every(t=>Math.hypot(t.x-x,t.z-z)>radius+.5))
        rocks.push({x,z,type,scale,radius,angle:random()*6.28});
    }
  }
  const plants=[];
  function plant(x,z,type,scale) {
    const radius=[.30,.36,.55][type]*scale;
    if(pathDistance(x,z)<radius+.22 || rocks.some(r=>Math.hypot(x-r.x,z-r.z)<r.radius+radius*.5))return;
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
    if(pathDistance(x,z)>.7 && trees.every(t=>Math.hypot(t.x-x,t.z-z)>1) && rocks.every(r=>Math.hypot(r.x-x,r.z-z)>r.radius+.5))
      rocks.push({x,z,type:0,scale:.35+random()*.4,radius:.4,angle:random()*6.28});
  }
  return {seed,trees,rocks,plants};
}
