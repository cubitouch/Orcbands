// Real compiled Unity: save a partly felled tree, finish it, then restore both worlds.
import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {enterCamp} from './unity-test-session.mjs';
const out=resolve(process.argv[3]??'smoke-artifacts/unity-webgl/menu-persistence');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],evidence={};
let page;
try {
 page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 if(process.env.ORCBANDS_TEST_CPU_RATE)await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.ORCBANDS_TEST_CPU_RATE)});
 const url=process.argv[2]??'http://127.0.0.1:8765/';
 await page.goto(url);await page.waitForFunction(()=>window.orcbandsUnity && !document.querySelector('#new-game').disabled,null,{timeout:180000});
 const attach=()=>page.evaluate(()=>{
  let seq=0;const receiver=window.orcbandsSessionEvent,waiters=new Map();
  window.orcbandsSessionEvent=json=>{const r=JSON.parse(json);if(waiters.has(r.id)){waiters.get(r.id)(r);waiters.delete(r.id);}receiver(json);};
  window.testSession=(action,json)=>new Promise(resolve=>{const id='test-'+(++seq);waiters.set(id,resolve);window.orcbandsUnity.SendMessage('Orcbands Controller','SessionCommand',JSON.stringify({id,action,json:json?JSON.stringify(json):''}));});
 });await attach();
 const session=(action,json)=>page.evaluate(({action,json})=>window.testSession(action,json),{action,json});
 const snapshot=async()=>JSON.parse((await session('snapshot')).snapshot);
 const report=async()=>{
  const pending=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:30000});await page.evaluate(()=>window.orcbandsCharacterReport());const r=JSON.parse((await pending).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);evidence.lastReport=r;return r;
 };
 const until=async(test,label)=>{for(let i=0;i<800;i++){const r=await report();if(test(r))return r;await page.waitForTimeout(100);}throw Error('Timed out: '+label);};
 const frames=async(n=2)=>{const first=(await report()).frame;await until(r=>r.frame>=first+n,'Unity input frames');};
 const click=async(p,button)=>{
  assert(p.z>0&&p.x>0&&p.x<1&&p.y>0&&p.y<1,'Target is outside the viewport');
  const b=await page.locator('canvas').boundingBox();await page.mouse.move(b.x+p.x*b.width,b.y+(1-p.y)*b.height);
  // Sample both edges in actual Unity frames, even on a busy software renderer.
  await page.mouse.down({button});await frames();await page.mouse.up({button});await frames();
 };
 await page.screenshot({path:resolve(out,'menu-desktop.png')});
 await enterCamp(page);await frames(3);const start=await until(r=>r.gameTime>3,'render');
 assert((await session('snapshot')).running,'Camp is paused after entering gameplay');
 const originalCamera=await snapshot();
 await click(start.unitScreen,'left');assert((await report()).selected,'Worker click was not sampled');
 await click((await report()).chopScreen,'right');assert((await report()).chopTarget,'Tree order was not sampled');
 await until(r=>r.wood>=2,'partial tree');
 await page.keyboard.down('q');await frames(3);await page.keyboard.up('q');
 await page.keyboard.down('ArrowRight');await frames(3);await page.keyboard.up('ArrowRight');
 await page.locator('#menu-toggle').click();
 await page.waitForFunction(()=>!document.querySelector('#session-overlay').hidden);
 const partial=await snapshot();assert(partial.wood>=2&&partial.wood<12);assert.equal(partial.order,'chop');
 assert.notDeepEqual(partial.focus,originalCamera.focus);assert.notDeepEqual(partial.cameraOffset,originalCamera.cameraOffset);
 evidence.partial=partial;
 await page.waitForTimeout(1500);assert.deepEqual(await snapshot(),partial,'Menu did not freeze gameplay');
 await page.locator('#save-game').click();await page.getByRole('button',{name:'Save here',exact:true}).first().click();
 await page.locator('#load-back').click();await page.locator('#resume-game').click();
 await until(r=>r.depletedTrees===1,'tree exhausted');await page.locator('#menu-toggle').click();
 await page.waitForFunction(()=>!document.querySelector('#session-overlay').hidden);
 const full=await snapshot();assert.equal(full.wood,12);assert.equal(full.trees.filter(n=>n===0).length,1);
 await page.locator('#save-game').click();await page.getByRole('button',{name:'Save here',exact:true}).nth(1).click();
 await page.screenshot({path:resolve(out,'named-saves.png')});
 await page.locator('#load-back').click();await page.locator('#load-game').click();
 // Autosave row, then Camp 1.
 await page.getByRole('button',{name:'Load',exact:true}).nth(1).click();
 await page.waitForFunction(()=>document.querySelector('#session-overlay').hidden);
 await page.locator('#menu-toggle').click();await page.waitForFunction(()=>!document.querySelector('#session-overlay').hidden);
 const restored=await snapshot();assert.equal(restored.wood,partial.wood);assert.deepEqual(restored.trees,partial.trees);
 assert(Math.hypot(restored.worker.x-partial.worker.x,restored.worker.z-partial.worker.z)<.05);
 assert.deepEqual(restored.focus,partial.focus);assert.deepEqual(restored.cameraOffset,partial.cameraOffset);
 const regrown=await report();assert.equal(regrown.depletedTrees,0);assert.equal(regrown.shadowRepairs,0);
 const bad={...restored,wood:999};const rejected=await session('load',bad);assert(!rejected.ok);assert.deepEqual(await snapshot(),restored,'Invalid load changed the camp');
 // Replay is harmless to a current camp.
 await page.locator('#settings-game').click();await page.locator('#replay-intro').click();await page.locator('#intro-autoplay').uncheck();
 for(let i=0;i<4;i++) {await page.screenshot({path:resolve(out,`intro-${i+1}.png`)});if(i<3)await page.locator('#intro-next').click();}
 await page.locator('#intro-skip').click();assert.deepEqual(await snapshot(),restored,'Replay reset the camp');
 await page.locator('#load-game').click();await page.getByRole('button',{name:'Load',exact:true}).nth(2).click();
 await page.waitForFunction(()=>document.querySelector('#session-overlay').hidden);await page.locator('#menu-toggle').click();await page.waitForFunction(()=>!document.querySelector('#session-overlay').hidden);
 const restoredFull=await snapshot();assert.equal(restoredFull.wood,12);assert.deepEqual(restoredFull.trees,full.trees);
 const stump=await report();assert.equal(stump.depletedTrees,1);assert.equal(stump.shadowRepairs,1);assert(stump.navigationClear);assert(stump.stumpVisible);assert(stump.lastTreeClearance);
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#continue-game').disabled,null,{timeout:180000});await attach();
 await page.locator('#continue-game').click();await page.waitForFunction(()=>document.querySelector('#session-overlay').hidden);
 await page.locator('#menu-toggle').click();await page.waitForFunction(()=>!document.querySelector('#session-overlay').hidden);const reloaded=await snapshot();assert.equal(reloaded.wood,12);assert.deepEqual(reloaded.trees,full.trees);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'menu-mobile.png')});
 await page.locator('#new-game').click();await page.locator('#confirm-yes').click();await page.locator('#intro-skip').click();await page.waitForFunction(()=>document.querySelector('#session-overlay').hidden);
 const fresh=await snapshot();assert.equal(fresh.wood,0);assert(fresh.trees.every(n=>n===12));assert(await page.evaluate(()=>Boolean(localStorage.getItem('orcbands.save.v1.slot1')&&localStorage.getItem('orcbands.save.v1.slot2'))));
 Object.assign(evidence,{partial,full,restored,restoredFull,reloaded,fresh,errors});assert.deepEqual(errors,[]);
 console.log('PASS: real partial/exhausted tree saves, paused simulation, exact counters, worker/order/camera restoration, stumps/collision/shadows, rejected corrupt load, harmless replay, reload/Continue and fresh game preserving named camps.');
} catch(error) {
 evidence.failure=String(error);evidence.errors=errors;
 if(page){evidence.menu=await page.locator('#session-overlay').evaluate(el=>({hidden:el.hidden,status:document.querySelector('#session-status').textContent})).catch(()=>null);await page.screenshot({path:resolve(out,'failure.png'),timeout:30000}).catch(()=>{});}
 throw error;
} finally {await writeFile(resolve(out,'persistence-report.json'),JSON.stringify(evidence,null,2));await browser.close();}
