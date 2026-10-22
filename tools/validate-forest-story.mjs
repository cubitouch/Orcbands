import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createLayout,storyClearance,STORY_POCKETS} from '../preview/environment-layout.js';
import {createStoryGeometry,createStoryPropGeometry} from '../preview/forest-story.js';
const layout=createLayout(),g=createStoryGeometry(layout);
assert.deepEqual(layout.story,createLayout().story);
assert.notDeepEqual(layout.story,createLayout(42).story);
assert.deepEqual([...new Set(layout.story.map(p=>p.kind))].sort(),['branch','chips','deadLog','fern','mossRock','mushrooms']);
assert(layout.story.filter(p=>p.kind==='deadLog').length>=2,'Need strong deadwood silhouettes');
assert(layout.story.length<120,'Keep separated compositions rather than dense scatter');
for(const p of layout.story){
 assert(storyClearance(p.x,p.z,p.radius,layout.trees),'Blocked prop: '+JSON.stringify(p));
 const local=createStoryPropGeometry(p.kind,p.variant).attributes.position;
 for(let i=0;i<local.count;i++)assert(Math.hypot(local.getX(i),local.getZ(i))*p.scale<=p.radius+.001,
  'Actual geometry exceeds reserved footprint: '+p.kind);
 if(p.pocket>=0){const [x,z]=STORY_POCKETS[p.pocket];assert(Math.hypot(x-p.x,z-p.z)<2.36)}
}
for(const seed of [42,2303]){
 const alternate=createLayout(seed);
 for(const p of alternate.story)assert(storyClearance(p.x,p.z,p.radius,alternate.trees));
}
// Bark surfaces must light from outside in both renderers (Unity culls no faces).
const bark=createStoryPropGeometry('deadLog',0),bp=bark.attributes.position,bn=bark.attributes.normal;
for(let i=0;i<84;i+=3){
 const y=(bp.getY(i)+bp.getY(i+1)+bp.getY(i+2))/3;
 if(y>.43)assert(bn.getY(i)>0,'Upper bark normals must face outward');
}
const digest=mesh=>createHash('sha256').update(Buffer.from(mesh.attributes.position.array.buffer)).update(Buffer.from(mesh.attributes.color.array.buffer)).digest('hex');
assert.equal(digest(g),digest(createStoryGeometry(layout)),'Geometry must reproduce bit for bit');
assert(g.attributes.position.count/3<11000,'Story geometry budget');
// Full binary parity: every vertex and palette entry must come from the browser
// geometry, with X reflection, reversed winding, and the existing sRGB bridge.
const file=readFileSync('unity/Assets/Orcbands/Generated/woodland-story.bytes');
const pos=g.attributes.position,col=g.attributes.color;
assert.equal(file.readInt32LE(0),pos.count);
const srgb=c=>c<=.0031308?c*12.92:1.055*c**(1/2.4)-.055;
for(let i=0;i<pos.count;i++){
 const j=Math.floor(i/3)*3+[0,2,1][i%3];
 const expected=[-pos.getX(j),pos.getY(j),pos.getZ(j),srgb(col.getX(j)),srgb(col.getY(j)),srgb(col.getZ(j))];
 expected.forEach((v,k)=>assert(Math.abs(v-file.readFloatLE(4+(i*6+k)*4))<.00001,'Unity vertex/color mismatch'));
}
const exported=JSON.parse(readFileSync('unity/Assets/Orcbands/Generated/grove-layout.json'));
assert.deepEqual(exported.story,layout.story.map(p=>({...p,x:-p.x,angle:-p.angle})));
const setup=readFileSync('unity/Assets/Editor/OrcbandsSceneSetup.cs','utf8');
assert(setup.includes('"woodland-story", art, false'),'Unity must load the exported geometry');
console.log('PASS: story clearance, deterministic layout/geometry, full Unity vertex and palette parity',{
 props:layout.story.length,triangles:pos.count/3,bytes:file.length,sha256:digest(g),
 kinds:Object.fromEntries([...new Set(layout.story.map(p=>p.kind))].map(k=>[k,layout.story.filter(p=>p.kind===k).length]))
});
