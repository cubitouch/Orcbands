import {enterCamp} from './unity-test-session.mjs';
// Identical input sequence for baseline and candidate Unity WebGL builds.
// node tools/capture-unity-character-baseline.mjs <player-directory> <output>
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const site=resolve(process.argv[2]),output=resolve(process.argv[3]);
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://local').pathname;
  const file=resolve(site,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(site+'/'))throw Error('Invalid path');
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm','.data':'application/octet-stream'})[extname(file)]??'application/octet-stream'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(120000);
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const c=document.querySelector('#unity-canvas'),l=document.querySelector('#unity-loading-bar');return c&&c.width>300&&(!l||getComputedStyle(l).display==='none')},null,{timeout:180000});
 await enterCamp(page);
 await page.waitForTimeout(2500);
 const canvas=page.locator('#unity-canvas');
 await canvas.screenshot({path:resolve(output,'overall.png')});
 await canvas.click({position:{x:20,y:20}});
 await page.keyboard.press('f'); await page.waitForTimeout(350);
 await canvas.screenshot({path:resolve(output,'fog-off.png')});
 await page.keyboard.press('f');
 await canvas.hover(); await page.mouse.wheel(0,-2400);
 await page.waitForTimeout(500);
 await canvas.screenshot({path:resolve(output,'close.png')});
 await page.keyboard.press('r'); await page.waitForTimeout(200);
 await page.mouse.wheel(0,3200); await page.waitForTimeout(500);
 await canvas.screenshot({path:resolve(output,'out.png')});
 console.log('Captured matched Unity views:',output);
}finally{await browser.close();server.close()}
