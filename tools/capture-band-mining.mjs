import {enterCamp} from './unity-test-session.mjs';
import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const output=resolve('smoke-artifacts/unity-webgl/band-mining');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const traces=[],errors=[];
let page;
try {
 page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]??'http://127.0.0.1:8765/');
 await page.waitForFunction(()=>window.orcbandsCharacterReport,null,{timeout:180000});
 await enterCamp(page);
 const report=async()=>{
  const wait=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:30000});
  await page.evaluate(()=>window.orcbandsCharacterReport());
  const result=JSON.parse((await wait).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);traces.push(result);return result;
 };
 const until=async(predicate,label)=>{
  for(let i=0;i<1200;i++){const r=await report();if(predicate(r))return r;await page.waitForTimeout(100);}
  throw Error('Timed out: '+label);
 };
 const frames=async(n=2)=>{const start=(await report()).frame;return until(r=>r.frame>=start+n,'Unity frames');};
 const click=async(p,button='left')=>{
  const box=await page.locator('#unity-canvas').boundingBox();assert(p.z>0&&p.x>0&&p.x<1&&p.y>0&&p.y<1,'Target outside canvas');
  await page.mouse.move(box.x+p.x*box.width,box.y+(1-p.y)*box.height);
  await page.mouse.down({button});await frames();await page.mouse.up({button});await frames();
 };
 const first=await report();assert.equal(first.band.length,3);assert.equal(first.stone,0);
 assert(first.band.every(u=>u.visibleTools===1&&!u.miningTool));
 await page.screenshot({path:resolve(output,'three-starting-orcs.png')});
 await click(first.band[0].screen);
 await page.keyboard.down('Shift');await click((await report()).band[1].screen);await click((await report()).band[2].screen);await page.keyboard.up('Shift');
 let grouped=await report();assert(grouped.band.every(u=>u.selected));
 await click(grouped.destinationScreen,'right');
 grouped=await until(r=>r.band.every(u=>!u.moving),'group movement');
 assert(grouped.band.every(u=>Math.hypot(u.feet.x-u.destination.x,u.feet.z-u.destination.z)<.08),'A group order stopped before arrival');
 assert(grouped.band.every((u,i)=>Math.hypot(u.feet.x-first.band[i].feet.x,u.feet.z-first.band[i].feet.z)>.5),'A selected orc did not follow the group movement order');
 for(let i=0;i<3;i++)for(let j=0;j<i;j++)assert(Math.hypot(grouped.band[i].feet.x-grouped.band[j].feet.x,grouped.band[i].feet.z-grouped.band[j].feet.z)>=1.29,'Group members overlap');
 await page.screenshot({path:resolve(output,'group-movement.png')});
 await click(grouped.band[1].screen);
 let r=await report();assert.deepEqual(r.band.map(u=>u.selected),[false,true,false]);
 await click(r.mineScreen,'right');
 r=await until(r=>r.stone>=2,'companion mines stone');
 assert.equal(r.wood,0);assert.equal(r.mineRemaining,24-r.stone);
 assert(r.band[1].miningTool&&r.band[1].visibleTools===1);assert.equal(r.band[1].order,'mine');
 await page.screenshot({path:resolve(output,'pickaxe-mining.png')});
 // Independently command the first worker to chop while its companion keeps mining.
 await click(r.band[0].screen);r=await report();
 // Use the known camp-edge tree: the nearest visible tree after movement
 // may be inside a closed forest pocket that must first be cleared.
 await click(first.chopScreen,'right');assert.equal((await report()).chopTarget,first.chopScreenTarget);
 r=await until(r=>r.wood>=2&&r.stone>=3,'parallel mining and chopping');
 assert(!r.band[0].miningTool&&r.band[1].miningTool);
 assert(r.band.every(u=>u.visibleTools===1));
 await page.screenshot({path:resolve(output,'parallel-wood-and-stone.png')});
 // Capture every member/order and the partial outcrop through the real session bridge.
 await page.evaluate(()=>{
  let seq=0;const waiting=new Map(),receiver=window.orcbandsSessionEvent;window.orcbandsSessionEvent=json=>{const r=JSON.parse(json),p=waiting.get(r.id);if(p){waiting.delete(r.id);p(r);}receiver(json);};
  window.bandSession=(action,data)=>new Promise(resolve=>{const id='band-test-'+(++seq);waiting.set(id,resolve);window.orcbandsUnity.SendMessage('Orcbands Controller','SessionCommand',JSON.stringify({id,action,json:data?JSON.stringify(data):''}));});
 });
 const command=(action,data)=>page.evaluate(([a,d])=>window.bandSession(a,d),[action,data]);
 assert((await command('pause')).ok);
 const snapshot=JSON.parse((await command('snapshot')).snapshot);assert.equal(snapshot.version,2);assert.equal(snapshot.companions.length,2);
 assert.equal(snapshot.companions[0].order,'mine');assert(snapshot.stone>0);
 const invalid=structuredClone(snapshot);invalid.companions[1].worker.x=999;
 assert(!(await command('load',invalid)).ok);assert.deepEqual(JSON.parse((await command('snapshot')).snapshot),snapshot);
 assert((await command('load',snapshot)).ok);await command('pause');
 const restored=JSON.parse((await command('snapshot')).snapshot);
 assert.equal(restored.wood,snapshot.wood);assert.equal(restored.stone,snapshot.stone);assert.deepEqual(restored.mines,snapshot.mines);
 assert.deepEqual(restored.companions.map(u=>u.worker),snapshot.companions.map(u=>u.worker));
 await command('resume');
 // Box-select all three at their work sites, then issue a shared quarry order.
 r=await report();
 const bounds=await page.locator('#unity-canvas').boundingBox();
 // Direct session commands clear Unity's pointer ownership. Re-enter the
 // canvas as a player does after clicking Resume outside it.
 await page.mouse.move(bounds.x-8,bounds.y+10);await frames();
 const left=Math.min(...r.band.map(u=>u.screen.x))-.03,right=Math.max(...r.band.map(u=>u.screen.x))+.03;
 const bottom=Math.min(...r.band.map(u=>u.screen.y))-.03,top=Math.max(...r.band.map(u=>u.screen.y))+.03;
 // Workers can be occluded by the outcrop. Box selection uses their world
 // positions, as the player's ordinary drag selection does.
 await page.mouse.move(bounds.x+left*bounds.width,bounds.y+(1-bottom)*bounds.height);
 await page.mouse.down();await frames();
 await page.mouse.move(bounds.x+right*bounds.width,bounds.y+(1-top)*bounds.height,{steps:6});await frames();
 await page.mouse.up();await frames();
 r=await report();assert(r.band.every(u=>u.selected));await click(r.mineScreen,'right');
 r=await until(r=>r.stone===24,'shared outcrop exhaustion');
 assert.equal(r.mineRemaining,0);assert(r.band.every(u=>u.order==='idle'&&!u.moving));
 const final=r;await frames(15);assert.equal((await report()).stone,24,'Outcrop overharvest');
 await page.screenshot({path:resolve(output,'outcrop-exhausted.png')});
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'report.json'),JSON.stringify({pass:true,first,final,traces,errors},null,2));
 console.log('BAND_MINING_BROWSER: PASS companion selection, group movement, actual mining/tool switch, parallel work, shared finite supply, three-worker orders and save/load');
} catch(error) {
 await writeFile(resolve(output,'report.json'),JSON.stringify({pass:false,failure:String(error),traces,errors},null,2));
 if(page)await page.screenshot({path:resolve(output,'failure.png'),timeout:30000}).catch(()=>{});
 throw error;
} finally {await browser.close();}
