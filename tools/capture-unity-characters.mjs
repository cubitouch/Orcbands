// Runs against a real Unity player. No image synthesis or alternative renderer.
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
 const views=['overall','close','normal','out','normal-off','warm','cool','warrior','shaman'];
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
 await writeFile(resolve(output,'capture.json'),JSON.stringify({source:'Unity WebGL',viewport:[1280,800],views,sixtyBrowserFramesMs:elapsed,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
} finally {await browser.close()}
