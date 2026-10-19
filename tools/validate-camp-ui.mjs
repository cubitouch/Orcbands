import assert from 'node:assert/strict';
import {createLayout,pathSamples} from '../preview/environment-layout.js';
import {BUILDINGS,SUPPLIES,campAnchors,footprintStatus,pickCampAnchor,mapPoint,worldPoint} from '../preview/camp-ui-model.js';
const layout=createLayout(),before=JSON.stringify(layout),anchors=campAnchors(layout);
for(const anchor of anchors)assert.equal(pickCampAnchor(anchor,anchors)?.id,anchor.id,'Picking landmarks must use their actual world placement');
assert.equal(pickCampAnchor({x:90,z:90},anchors),null);
for(const key of Object.keys(BUILDINGS)){
 for(const p of [anchors[0],anchors[1],anchors[2],anchors[3],layout.trees[0],pathSamples[300],{x:30,z:30},{x:NaN,z:0}])assert(!footprintStatus(key,p,layout).valid,'A footprint cannot overlap occupied, path or invalid ground');
 let clear=0;for(let x=-16;x<=16;x++)for(let z=-16;z<=16;z++)if(footprintStatus(key,{x,z},layout).valid)clear++;
 assert(clear>0,'There must be usable clear preview locations for each structure');
}
for(const p of [{x:-40,z:-45},{x:40,z:35},...anchors]){const n=mapPoint(p.x,p.z),v=worldPoint(n.x,n.y);assert(Math.abs(v.x-p.x)<1e-10&&Math.abs(v.z-p.z)<1e-10,'Minimap coordinates must map to actual world positions');}
assert.equal(JSON.stringify(layout),before,'UI previews must not mutate the camp');assert(Object.isFrozen(SUPPLIES));
console.log('PASS: real landmark selection, blocked/clear footprints for every building, minimap round trips, unchanged camp layout and fixed illustrative supplies.');
