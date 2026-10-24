import {strict as assert} from 'node:assert';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const output=resolve(process.argv[3]??'smoke-artifacts/unity-webgl/tree-feedback');
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
  return JSON.parse((await pending).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);
 };
 const frames=async(n=2)=>{
  const first=(await report()).frame;
  for(let i=0;i<150;i++){await page.waitForTimeout(100);if((await report()).frame>=first+n)return;}
  throw Error('Unity frames stalled');
 };
 await frames();const initial=await report();
 assert.equal(initial.treeStrikes,0);assert.equal(initial.woodChips,0);assert.equal(initial.activeTreePulses,0);
 if(!initial.animated){console.log('PASS: public proxy stays free of phantom tree strikes; rendered strike test runs with licensed animation.');}
 else {
  const canvas=await page.locator('#unity-canvas').boundingBox();
  const click=async(p,button)=>{
   await page.mouse.move(canvas.x+p.x*canvas.width,canvas.y+(1-p.y)*canvas.height);
   await page.mouse.down({button});await frames();await page.mouse.up({button});await frames();
  };
  await click(initial.unitScreen,'left');assert((await report()).selected);
  await click(initial.chopScreen,'right');
  let working;
  for(let i=0;i<600;i++){
   const r=await report();traces.push(r);
   assert(r.navigationClear);assert(r.groundError<.015);
   if(r.moving) assert.equal(r.treeStrikes,0,'Walking triggered an axe hit');
   if(r.chopTarget&&!r.moving&&r.animation==='Chopping'){working=r;break;}
   await page.waitForTimeout(100);
  }
  assert(working,'Worker never arrived to chop');
  await page.evaluate(()=>window.orcbandsReview('tree-feedback'));await frames();
  const startCount=working.treeStrikes,hits=[];let count=startCount,sawChips=false,sawBend=false;
  for(let i=0;i<400;i++){
   const r=await report();traces.push(r);
   assert.deepEqual(r.targetFeet,working.targetFeet,'Effect moved the tree collider/root');
   assert(Math.hypot(r.feet.x-working.feet.x,r.feet.z-working.feet.z)<.002,'Effect moved worker root');
   assert(r.navigationClear);assert(r.activeTreePulses<=1);assert(r.woodChips<=64);
   sawChips ||= r.woodChips>0;sawBend ||= r.treeBend>.002;
   if(r.treeStrikes>count){
    assert.equal(r.treeStrikes,count+1,'Duplicate/catch-up strike');count=r.treeStrikes;hits.push(r);
    assert.equal(r.lastStruckTree,r.chopTarget);
    const phase=r.lastStrikePhase%1;
    assert(phase>=.39-.001&&phase<.67,'Feedback missed the downward strike phase: '+phase);
    if(hits.length===1)await page.locator('#unity-canvas').screenshot({path:resolve(output,'strike.png'),timeout:120000});
   }
   if(hits.length>=3&&sawBend&&sawChips)break;
   await page.waitForTimeout(100);
  }
  assert(hits.length>=3,'Three consecutive strikes missing');assert(sawChips,'No wood chips');assert(sawBend,'Tree did not shudder');
  await page.evaluate(home=>window.orcbandsNavigationCommand(home),initial.feet);
  await frames(1);
  const cancelled=await report();assert.equal(cancelled.chopTarget,'');
  const previous=cancelled.treeStrikes;
  let settled;
  for(let i=0;i<100;i++){
   const r=await report();traces.push(r);
   assert.equal(r.treeStrikes,previous,'Hit emitted after cancellation');
   if(!r.activeTreePulses&&!r.woodChips){settled=r;break;}
   await page.waitForTimeout(100);
  }
  assert(settled,'Effects did not settle and expire');assert.equal(settled.treeBend,0);
  await page.locator('#unity-canvas').screenshot({path:resolve(output,'settled.png'),timeout:120000});
  assert.deepEqual(errors,[]);
  console.log('PASS: actual licensed swing-synchronized tree shudder/chips, three hits, fixed roots/clearance, bounded pool and clean cancellation/settling.');
 }
} finally {
 await writeFile(resolve(output,'tree-feedback-report.json'),JSON.stringify({traces,errors},null,2));
 await browser.close();
}
