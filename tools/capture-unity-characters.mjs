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
 const views=['overall','close','normal','out','normal-off','warm','cool','warrior','shaman','warrior-normal','shaman-normal'];
 for(const view of views){
  await page.evaluate(v=>window.orcbandsReview(v),view);
  await page.waitForTimeout(650);
  await page.locator('#unity-canvas').screenshot({path:resolve(output,view+'.png')});
 }
 await page.evaluate(()=>window.orcbandsReview('normal'));
 await page.waitForTimeout(500);
 // 60 frames measures this software-rendered browser only, not native GPU performance.
 const elapsed=await page.evaluate(()=>new Promise(done=>{
  let n=0,start=performance.now(); function frame(){if(++n===60)done(performance.now()-start);else requestAnimationFrame(frame)}requestAnimationFrame(frame);
 }));
 const report=async()=>{
  const received=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:15000});
  await page.evaluate(()=>window.orcbandsCharacterReport());
  return JSON.parse((await received).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);
 };
 const initial=await report();
 const box=await page.locator('#unity-canvas').boundingBox();
 const point=p=>({x:box.x+p.x*box.width,y:box.y+(1-p.y)*box.height});
 // Real pointer inputs hit the independent root collider, then the real terrain.
 await page.mouse.click(...Object.values(point(initial.unitScreen)));
 await page.waitForTimeout(150);
 const selected=await report(); assert(selected.selected,'Worker could not be selected at normal RTS zoom');
 await page.locator('#unity-canvas').screenshot({path:resolve(output,'selected.png')});
 await page.mouse.click(...Object.values(point(initial.destinationScreen)),{button:'right'});
 await page.waitForTimeout(1100);
 const moved=await report();
 assert(Math.hypot(moved.feet.x-initial.feet.x,moved.feet.z-initial.feet.z)>1,'Right-click did not move worker');
 assert(moved.groundError<.025,'Worker root no longer follows terrain');
 await page.locator('#unity-canvas').screenshot({path:resolve(output,'moved.png')});
 await page.evaluate(()=>window.orcbandsReview('out'));
 await page.waitForTimeout(200);
 const out=await report();
 await page.mouse.click(...Object.values(point(out.unitScreen)));
 await page.waitForTimeout(150);
 assert((await report()).selected,'Worker could not be selected at zoomed-out review distance');
 await page.locator('#unity-canvas').screenshot({path:resolve(output,'out-selected.png')});
 await writeFile(resolve(output,'capture.json'),JSON.stringify({source:'Unity WebGL',viewport:[1280,800],views,sixtyBrowserFramesMs:elapsed,interaction:{initial,selected,moved,zoomedOutSelectable:true},errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
} finally {await browser.close()}
