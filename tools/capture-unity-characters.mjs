import {enterCamp} from './unity-test-session.mjs';
// Runs against a real Unity player. No image synthesis or alternative renderer.
import {strict as assert} from 'node:assert';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve(process.argv[3]??'smoke-artifacts/unity-webgl/characters');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]??'http://127.0.0.1:8765/');
 await page.waitForFunction(()=>window.orcbandsReview,null,{timeout:180000});
 await enterCamp(page);
 const report=async()=>{
  const received=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:15000});
  await page.evaluate(()=>window.orcbandsCharacterReport());
  return JSON.parse((await received).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);
 };
 const waitFrames=async(count=2)=>{
  const start=(await report()).frame;
  for(let i=0;i<100;i++){
   await page.waitForTimeout(100);
   if((await report()).frame>=start+count)return;
  }
  throw Error('Unity did not advance review frames');
 };
 // createUnityInstance can resolve before Start/first rendered frame.
 await waitFrames(3);
 const pointer=async(p,button='left')=>{
  await page.mouse.move(p.x,p.y);
  await page.mouse.down({button});
  await waitFrames(2); // Unity polls button state once per frame.
  await page.mouse.up({button});
  await waitFrames(2);
 };
 await page.locator('#unity-canvas').focus();
 const focused=process.env.ORCBANDS_WORKER_REVIEW==='1';
 const views=focused?['worker-front','worker-side','worker-three-quarter','normal','cool']:['worker-front','worker-side','worker-three-quarter','overall','close','normal','out','normal-off','warm','cool','warrior','shaman','warrior-normal','shaman-normal'];
 for(const view of views){
  await page.evaluate(v=>window.orcbandsReview(v),view);
  await page.waitForTimeout(650);
  await page.locator('#unity-canvas').screenshot({path:resolve(output,view+'.png')});
 }
 await page.evaluate(()=>window.orcbandsReview('normal'));
 await page.waitForTimeout(500);
 // 60 frames measures this software-rendered browser only, not native GPU performance.
 const elapsed=focused?null:await page.evaluate(()=>new Promise(done=>{
  let n=0,start=performance.now(); function frame(){if(++n===60)done(performance.now()-start);else requestAnimationFrame(frame)}requestAnimationFrame(frame);
 }));
 const initial=await report();
 const box=await page.locator('#unity-canvas').boundingBox();
 const point=p=>({x:box.x+p.x*box.width,y:box.y+(1-p.y)*box.height});
 // Real pointer inputs hit the independent root collider, then the real terrain.
 await pointer(point(initial.unitScreen));
 await page.waitForTimeout(150);
 const selected=await report();
 console.log('Character selection:',JSON.stringify({initial,selected}));
 await writeFile(resolve(output,'interaction.json'),JSON.stringify({initial,selected},null,2));
 assert(selected.selected,'Worker could not be selected at normal RTS zoom');
 await page.locator('#unity-canvas').screenshot({path:resolve(output,'selected.png')});
 await pointer(point(initial.destinationScreen),'right');
 await page.waitForTimeout(1100);
 const moved=await report();
 assert(Math.hypot(moved.feet.x-initial.feet.x,moved.feet.z-initial.feet.z)>1,'Right-click did not move worker');
 assert(moved.groundError<.025,'Worker root no longer follows terrain');
 if(initial.licensedGrip){
  assert(moved.licensedGrip,'Licensed hand socket disappeared after movement');
  assert.deepEqual(moved.gripInHand,initial.gripInHand,'Grip moved relative to hand');
  assert(moved.gripParentCorrect,'Axe socket lost the hand_r parent');
  assert.deepEqual(moved.gripEuler,initial.gripEuler,'Grip rotated relative to hand');
  if(!initial.animated){
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const cross=(a,b)=>a.x*b.z-a.z*b.x;
  assert(dot(initial.facing,moved.facing)<.99,'Movement did not change worker facing');
  const c=dot(initial.facing,moved.facing),s=cross(initial.facing,moved.facing);
  const expected={x:c*initial.axeUp.x-s*initial.axeUp.z,y:initial.axeUp.y,z:s*initial.axeUp.x+c*initial.axeUp.z};
  assert(Math.hypot(expected.x-moved.axeUp.x,expected.y-moved.axeUp.y,expected.z-moved.axeUp.z)<.01,'Axe did not follow worker facing');
  }

 }
 await page.locator('#unity-canvas').screenshot({path:resolve(output,'moved.png')});
 await page.evaluate(()=>window.orcbandsReview('worker-moved'));
 await waitFrames(3);
 await page.locator('#unity-canvas').screenshot({path:resolve(output,'worker-moved.png')});
 await page.evaluate(()=>window.orcbandsReview('out'));
 await page.waitForTimeout(200);
 const out=await report();
 await pointer(point(out.unitScreen));
 await page.waitForTimeout(150);
 assert((await report()).selected,'Worker could not be selected at zoomed-out review distance');
 await page.locator('#unity-canvas').screenshot({path:resolve(output,'out-selected.png')});
 const key=async(k)=>{await page.keyboard.down(k);await waitFrames(3);await page.keyboard.up(k);await waitFrames(2)};
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
 await page.evaluate(()=>window.orcbandsReview('normal')); await waitFrames(2);
 const cameraInitial=(await report()).camera;
 await key('q'); const orbit=(await report()).camera;
 assert(distance(cameraInitial,orbit)>.05,'Q orbit did not move camera');
 await key('r'); const reset=(await report()).camera;
 assert(distance(reset,{x:-20,y:22,z:26})<.01,'R did not restore approved camera');
 await key('w'); const pan=(await report()).camera;
 assert(distance(reset,pan)>.05,'W camera pan did not move');
 await page.locator('#unity-canvas').hover(); await page.mouse.wheel(0,-120); await waitFrames(2);
 const zoom=(await report()).camera;
 assert(distance(pan,zoom)>.05,'Mouse wheel did not dolly camera');
 await key('r');
 await writeFile(resolve(output,'capture.json'),JSON.stringify({source:'Unity WebGL',viewport:[1280,800],views,sixtyBrowserFramesMs:elapsed,interaction:{initial,selected,moved,zoomedOutSelectable:true,camera:{cameraInitial,orbit,reset,pan,zoom}},errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
} finally {await browser.close()}
