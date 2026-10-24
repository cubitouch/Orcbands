// Real compiled Unity gameplay, in both public-proxy and licensed-character builds.
import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const output=resolve(process.argv[3]??'smoke-artifacts/unity-webgl/finite-trees');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const traces=[],errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]??'http://127.0.0.1:8765/');
 await page.waitForFunction(()=>window.orcbandsCharacterReport,null,{timeout:180000});
 const report=async()=>{
  const pending=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:30000});
  await page.evaluate(()=>window.orcbandsCharacterReport());
  const r=JSON.parse((await pending).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);
  traces.push(r);return r;
 };
 const until=async(predicate,label)=>{
  for(let i=0;i<1200;i++){const r=await report();if(predicate(r))return r;await page.waitForTimeout(100);}
  throw Error('Timed out: '+label);
 };
 const frames=async(n=2)=>{const start=(await report()).frame;return until(r=>r.frame>=start+n,'Unity frames');};
 const click=async(p,button)=>{
  const b=await page.locator('#unity-canvas').boundingBox();
  assert(p.z>0&&p.x>0&&p.x<1&&p.y>0&&p.y<1,'Target outside viewport');
  await page.mouse.move(b.x+p.x*b.width,b.y+(1-p.y)*b.height);
  await page.mouse.down({button});await frames();await page.mouse.up({button});await frames();
 };
 await frames();const initial=await report();assert.equal(initial.wood,0);
 await page.evaluate(()=>window.orcbandsAnimationPreview('Chopping'));await frames(8);
 assert.equal((await report()).wood,0,'Animation preview awarded resources');
 await page.evaluate(()=>window.orcbandsAnimationPreview('Gameplay'));await frames();
 await page.screenshot({path:resolve(output,'wood-zero.png')});
 await click(initial.unitScreen,'left');assert((await report()).selected);
 const firstTree=initial.chopScreenTarget;
 await click(initial.chopScreen,'right');
 const partial=await until(r=>r.wood>=2,'two harvested wood');
 assert(partial.wood<12);assert.equal(partial.remainingWood,12-partial.wood);
 await page.evaluate(p=>window.orcbandsNavigationCommand(p),initial.feet);await frames(1);
 const cancelled=await report();assert.equal(cancelled.chopTarget,'');
 await frames(10);assert.equal((await report()).wood,cancelled.wood,'Interrupted task kept harvesting');
 assert.equal((await report()).lastTreeRemaining,12-cancelled.wood,'Interrupted tree reset its supply');
 await until(r=>!r.moving,'return to camp');
 await click(initial.chopScreen,'right');
 assert.equal((await report()).chopTarget,firstTree);
 const depleted=await until(r=>r.depletedTrees===1,'first tree exhaustion');
 assert.equal(depleted.wood,12,'Tree yield was duplicated or lost across interruption');
 assert.equal(depleted.lastTreeRemaining,0);assert(depleted.stumpVisible);
 assert.equal(depleted.lastDepletedTree,firstTree);assert.equal(depleted.chopTarget,'');
 assert(!depleted.treeMarkerVisible&&!depleted.moving);assert(depleted.navigationClear);
 assert(depleted.navigationRevision>initial.navigationRevision);assert.equal(depleted.shadowRepairs,1);
 assert(depleted.shadowChangedPixels>100,'Canopy left a stale ground shadow');
 assert(depleted.lastTreeClearance,'Former crown still blocks the worker');
 await frames(10);assert.equal((await report()).wood,12,'Exhausted node kept awarding wood');
 await page.screenshot({path:resolve(output,'first-tree-cleared.png')});
 await page.evaluate(()=>window.orcbandsReview('harvest-stump'));await frames();
 await page.screenshot({path:resolve(output,'stump-close.png')});
 // Travel into the former crown, staying outside the small solid stump.
 const beside={...depleted.stumpPosition,x:depleted.stumpPosition.x+depleted.stumpRadius+.62+.05};
 await page.evaluate(p=>window.orcbandsNavigationCommand(p),beside);
 await frames(1);await until(r=>!r.moving,'newly cleared space');
 const arrived=await report();
 assert(Math.hypot(arrived.feet.x-beside.x,arrived.feet.z-beside.z)<.04,'Crown footprint was not released');
 assert.equal(arrived.wood,12);
 await page.evaluate(()=>window.orcbandsReview('normal'));await frames();
 // Clicking the depleted tree's original canopy position cannot create more wood.
 await click((await report()).stumpScreen,'right');await frames(8);
 assert.equal((await report()).wood,12,'Depleted tree was harvestable twice');
 await until(r=>!r.moving,'ground click after depletion');
 const second=await report();assert(second.chopScreenTarget&&second.chopScreenTarget!==firstTree);
 await click(second.chopScreen,'right');
 const finished=await until(r=>r.depletedTrees===2,'second tree exhaustion');
 assert.equal(finished.wood,24);assert.equal(finished.shadowRepairs,2);assert(finished.stumpVisible);
 assert.equal(finished.chopTarget,'');assert(!finished.treeMarkerVisible);
 // Every resource award belongs to one actual accepted swing; idle/travel never produce wood.
 assert.equal(finished.wood,finished.treeStrikes);
 await page.screenshot({path:resolve(output,'wood-twenty-four.png')});
 // Readability of the same native counter at a compact laptop/portrait viewport.
 await page.setViewportSize({width:390,height:844});await frames();
 await page.screenshot({path:resolve(output,'wood-mobile.png')});
 // A fresh high-DPI context checks the same native HUD at real Retina resolution.
 await page.close();
 const retina=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2});
 retina.on('pageerror',e=>errors.push(e.message));
 await retina.goto(process.argv[2]??'http://127.0.0.1:8765/');
 await retina.waitForFunction(()=>window.orcbandsCharacterReport,null,{timeout:180000});
 let retinaReady=false;
 for(let i=0;i<160;i++){
  const pending=retina.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:30000});
  await retina.evaluate(()=>window.orcbandsCharacterReport());
  const r=JSON.parse((await pending).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);
  if(r.gameTime>5){assert.equal(r.wood,0,'Fresh session did not reset wood');retinaReady=true;break;}
  await retina.waitForTimeout(100);
 }
 assert(retinaReady,'Retina scene never rendered beyond the splash');
 const dpi=await retina.evaluate(()=>({ratio:document.querySelector('canvas').width/document.querySelector('canvas').getBoundingClientRect().width}));
 assert(dpi.ratio>1.9,'Retina capture did not use a high-resolution render surface');
 await retina.screenshot({path:resolve(output,'wood-retina.png'),scale:'css'});
 assert.deepEqual(errors,[]);
 console.log('PASS: real tree strikes award exact finite wood; preview/interrupt/exhaustion guards; resume, two stumps, released crown clearance, repaired shadows and desktop/portrait/Retina counter views.');
} finally {
 await writeFile(resolve(output,'finite-trees-report.json'),JSON.stringify({traces,errors},null,2));
 await browser.close();
}
