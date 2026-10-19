import {HUT_PLACEMENT,CAMPFIRE_PLACEMENT,TORCH_PLACEMENTS,pathSamples,clearingTrail,hutApproach} from './environment-layout.js?v=__ORCBANDS_REVISION__';
export const SUPPLIES=Object.freeze({wood:120,stone:75,food:48,population:'0 / 6'});
export const BUILDINGS=Object.freeze({
 hut:{name:'Timber hut',category:'Hearth & home',description:'A sturdy first home for the tribe.',width:6.6,depth:5.2,wood:60,stone:20,icon:'hut'},
 shelter:{name:'Storage shelter',category:'Supplies',description:'Keep timber and food close to camp.',width:4.2,depth:3,wood:35,stone:10,icon:'shelter'},
 construction:{name:'Building site',category:'Village expansion',description:'Mark the footprint of the next building.',width:3.7,depth:2.6,wood:25,stone:15,icon:'frame'}
});
export function campAnchors(layout){
 const shelter=layout.resources.find(p=>p.kind==='shelter'),site=layout.resources.find(p=>p.kind==='construction');
 return [{id:'hut',kind:'hut',...HUT_PLACEMENT,name:'Timber hut',description:'The heart of your new settlement.',status:'Home · 6 places',condition:100,icon:'hut'},
 {id:'shelter',kind:'shelter',...shelter,name:'Storage shelter',description:'A dry bay for the camp’s supplies.',status:'Storage · stocked',condition:100,icon:'shelter'},
 {id:'construction',kind:'construction',...site,name:'Building site',description:'Timber raised. Roofing still to finish.',status:'Construction · roof stage',condition:55,icon:'frame'},
 {id:'fire',kind:'fire',...CAMPFIRE_PLACEMENT,name:'Campfire',description:'A little warmth in the forest clearing.',status:'Hearth · lit',condition:100,icon:'fire'}];
}
const distanceToBox=(x,z,p,w,d)=>Math.hypot(Math.max(0,Math.abs(x-p.x)-w/2),Math.max(0,Math.abs(z-p.z)-d/2));
export function footprintStatus(kind,p,layout){
 const spec=BUILDINGS[kind];if(!spec||!Number.isFinite(p.x)||!Number.isFinite(p.z))return {valid:false,reason:'Choose a point in the clearing'};
 const w=spec.width,d=spec.depth,blocked=reason=>({valid:false,reason});
 if(Math.abs(p.x)+w/2>19||Math.abs(p.z)+d/2>19)return blocked('Beyond the camp boundary');
 if([...pathSamples,...clearingTrail,...hutApproach].some(t=>distanceToBox(t.x,t.z,p,w,d)<t.halfWidth+.2))return blocked('Keep the path clear');
 if(Math.abs(p.x-HUT_PLACEMENT.x)<w/2+3.25&&Math.abs(p.z-HUT_PLACEMENT.z)<d/2+2.55)return blocked('Too close to the hut');
 if(layout.resources.some(r=>distanceToBox(r.x,r.z,p,w,d)<r.radius+.2))return blocked('Existing resources or building');
 if(distanceToBox(CAMPFIRE_PLACEMENT.x,CAMPFIRE_PLACEMENT.z,p,w,d)<1.4||TORCH_PLACEMENTS.some(t=>distanceToBox(t.x,t.z,p,w,d)<.65))return blocked('Leave room around the fire');
 if(layout.trees.some(t=>distanceToBox(t.x,t.z,p,w,d)<.45*t.scale+.25))return blocked('A tree is in the way');
 if(layout.rocks.some(r=>distanceToBox(r.x,r.z,p,w,d)<r.radius+.1))return blocked('Rocky ground');
 return {valid:true,reason:'Clear footprint'};
}
export function pickCampAnchor(point,anchors){
 return anchors.filter(a=>Math.hypot(point.x-a.x,point.z-a.z)<(a.kind==='fire'?1.4:a.kind==='hut'?3.3:2.35)).sort((a,b)=>Math.hypot(point.x-a.x,point.z-a.z)-Math.hypot(point.x-b.x,point.z-b.z))[0]??null;
}
export const MAP={left:-40,top:-45,size:80};
export function mapPoint(x,z){return {x:(x-MAP.left)/MAP.size*100,y:(z-MAP.top)/MAP.size*100}}
export function worldPoint(x,y){return {x:MAP.left+x/100*MAP.size,z:MAP.top+y/100*MAP.size}}
