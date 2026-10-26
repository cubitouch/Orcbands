import {enterCamp} from './unity-test-session.mjs';
// Run against the actual Unity player; all moves use the gameplay command path.
import {strict as assert} from 'node:assert';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const output = resolve(process.argv[3] ?? 'smoke-artifacts/unity-webgl/navigation');
await mkdir(output, {recursive:true});
const browser = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const traces=[];
try {
 const page = await browser.newPage({viewport:{width:1280,height:800}}), errors = [];
 page.on('pageerror', e=>errors.push(e.message));
 await page.goto(process.argv[2] ?? 'http://127.0.0.1:8765/', {waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.orcbandsCharacterReport, null, {timeout:180000});
 await enterCamp(page);
 const report = async()=>{
  const pending=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:30000});
  await page.evaluate(()=>window.orcbandsCharacterReport());
  return JSON.parse((await pending).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);
 };
 const frames = async(n=2)=>{
  const first=(await report()).frame;
  for(let i=0;i<150;i++){
   await page.waitForTimeout(100);
   if((await report()).frame>=first+n) return;
  }
  throw Error('Unity frames stalled');
 };
 const command = async point=>{
  await page.evaluate(point=>window.orcbandsNavigationCommand(point), point);
  await page.waitForTimeout(150);
 };
 await frames();
 const initial=await report(), home=initial.feet;
 assert(initial.navigationClear, 'Spawn collides');
 assert(initial.navigationObstacles>=1220);
 const follow = async(name, point)=>{
  await command(point);
  const samples=[]; let sawDetour=false, arrived=false;
  for(let i=0;i<600;i++){
   const r=await report(); samples.push(r);
   assert(r.navigationClear, name+': worker penetrated scenery');
   assert(r.groundError<.015, name+': worker left terrain');
   assert(!r.commandResult.startsWith('No clear route'),name+': command rejected');
   sawDetour ||= r.remainingWaypoints>1;
   if(!r.moving){arrived=true;break;}
   await page.waitForTimeout(100);
  }
  assert(arrived,name+': route did not finish');
  const last=samples.at(-1);
  assert(Math.hypot(last.feet.x-last.navigationDestination.x,last.feet.z-last.navigationDestination.z)<.04,name+': stopped before endpoint');
  await page.screenshot({path:resolve(output,name+'.png'),timeout:120000});
  traces.push({name,sawDetour,samples}); return {last,sawDetour};
 };
 // Cross the hut from the clearing to its far side, then retarget during travel.
 const hut=await follow('hut-detour',{x:0,y:0,z:-9});
 assert(hut.sawDetour,'Hut command followed a straight line');
 await follow('return-home',home);
 // The hut centre must resolve to clear ground and never enter the building.
 const blocked=await follow('blocked-hut-click',{x:3,y:0,z:-3.8});
 assert(Math.hypot(blocked.last.feet.x-3,blocked.last.feet.z+3.8)>3,'Blocked click stopped inside hut');
 await command(home); await page.waitForTimeout(250);
 await command({x:1.7,y:0,z:2.8});
 const returned=await follow('retarget-home',home);
 assert(!returned.last.moving);
 // Keep the visible-tree right-click interaction on the new route system.
 let r=await report();
 const canvas=await page.locator('#unity-canvas').boundingBox();
 const click=async(p,button)=>{
  await page.mouse.move(canvas.x+p.x*canvas.width,canvas.y+(1-p.y)*canvas.height);
  await frames(2);
  await page.mouse.down({button});await frames(2);await page.mouse.up({button});await frames(2);
 };
 await click(r.unitScreen,'left');r=await report();assert(r.selected,'Worker selection failed');
 await click(r.chopScreen,'right');
 const chopping=[];let reachedTree=false;
 for(let i=0;i<600;i++){
  r=await report();chopping.push(r);assert(r.navigationClear,'Tree approach collided');
  assert(r.chopTarget,'Tree command lost target');
  if(!r.moving){reachedTree=true;break;}
  await page.waitForTimeout(100);
 }
 assert(reachedTree,'Tree approach stalled');
 assert(Math.abs(r.targetDistance-r.targetStandOff)<.04,'Wrong chopping stand-off');
 assert(r.treeMarkerVisible && r.workPositionClear);
 if(r.animated) assert.equal(r.animation,'Chopping');
 await page.screenshot({path:resolve(output,'tree-arrived.png'),timeout:120000});
 traces.push({name:'tree-approach',samples:chopping});
 await follow('interrupt-chop',home);
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'navigation-report.json'),JSON.stringify({initial,traces,errors},null,2));
 console.log('PASS: actual Unity hut detour, swept clearance, blocked-click projection, arrival, retarget, pointer tree approach/chop and interruption.');
} finally {
 await writeFile(resolve(output,'navigation-traces.json'),JSON.stringify(traces,null,2));
 await browser.close();
}
