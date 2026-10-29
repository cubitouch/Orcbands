import {enterCamp} from './unity-test-session.mjs';
import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const output=resolve(process.argv[3]??'smoke-artifacts/unity-webgl/starting-band');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const traces=[],errors=[];
let page;
try {
 page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(process.argv[2]??'http://127.0.0.1:8765/');
 await page.waitForFunction(()=>window.orcbandsCharacterReport,null,{timeout:180000});
 await enterCamp(page);
 const report=async()=>{
  const pending=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:30000});
  await page.evaluate(()=>window.orcbandsCharacterReport());
  const r=JSON.parse((await pending).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);traces.push(r);return r;
 };
 const until=async(predicate,label)=>{
  const deadline=Date.now()+180000;
  while(Date.now()<deadline){const r=await report();if(predicate(r))return r;await page.waitForTimeout(100);}
  throw Error('Timed out: '+label);
 };
 const frames=async(n=2)=>{const start=(await report()).frame;return until(r=>r.frame>=start+n,'rendered frames');};
 const click=async(p,button='left')=>{
  const box=await page.locator('#unity-canvas').boundingBox();
  assert(p.z>0&&p.x>0&&p.x<1&&p.y>0&&p.y<1,'Target outside canvas');
  await page.mouse.move(box.x+p.x*box.width,box.y+(1-p.y)*box.height);
  await page.mouse.down({button});await frames();await page.mouse.up({button});await frames();
 };
 const first=await report();
 assert.deepEqual(first.band.map(u=>u.startingRole),[0,1,2]);
 assert.equal(new Set(first.band.map(u=>u.model)).size,3);
 assert(first.band.every(u=>u.animated&&u.gripParentCorrect&&u.visibleTools===1),'Each purchased model needs animation and its own right-hand tool');
 await page.evaluate(()=>window.orcbandsReview('band'));await frames(3);
 await page.screenshot({path:resolve(output,'three-distinct-orcs.png')});
 await page.evaluate(()=>window.orcbandsReview('normal'));await frames(2);
 let r=await report();await click(r.band[0].screen);
 await page.keyboard.down('Shift');await click((await report()).band[1].screen);await click((await report()).band[2].screen);await page.keyboard.up('Shift');
 r=await report();assert(r.band.every(u=>u.selected));await click(r.destinationScreen,'right');
 const walking=new Set();
 await until(r=>{
  r.band.forEach((u,i)=>{if(u.animation==='Walking')walking.add(i);});
  return r.band.every(u=>!u.moving);
 },'all three models walk to the group destination');
 assert.equal(walking.size,3,'A model did not enter its walking state');
 r=await report();await click(r.band[0].screen);await click(first.chopScreen,'right');
 const depleted=await until(r=>r.depletedTrees>=1,'first tree depleted');
 assert.equal(depleted.wood,12);assert(depleted.chopTarget&&depleted.chopTarget!==depleted.lastDepletedTree,'No nearby tree continuation');
 assert(!depleted.band[0].miningTool&&depleted.band[0].visibleTools===1);
 r=await until(r=>r.wood>12,'wood collected from the automatic next tree');
 await page.evaluate(()=>window.orcbandsReview('tree-feedback'));await frames(2);
 await page.screenshot({path:resolve(output,'continued-at-nearby-tree.png')});
 await page.evaluate(p=>window.orcbandsNavigationCommand(p),r.feet);await frames(2);
 const stopped=await report();assert.equal(stopped.chopTarget,'');await frames(10);
 assert.equal((await report()).wood,stopped.wood,'Explicit order failed to interrupt continued harvesting');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'report.json'),JSON.stringify({pass:true,first,depleted,stopped,traces,errors},null,2));
 console.log('STARTING_BAND: PASS three purchased models, right-hand tools, individual animated movement, real tree depletion/continuation and interruption');
} catch(error) {
 await writeFile(resolve(output,'report.json'),JSON.stringify({pass:false,failure:String(error),traces,errors},null,2));
 if(page)await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});
 throw error;
} finally {await browser.close();}
