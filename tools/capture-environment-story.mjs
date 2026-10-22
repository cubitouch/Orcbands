// Matched, real WebGL review of a checkout, including an uncluttered canvas crop.
// Usage: node tools/capture-environment-story.mjs [checkout] [output-dir]
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const repo=resolve(import.meta.dirname,'..');
const root=resolve(process.argv[2]??repo,'preview');
const output=resolve(process.argv[3]??resolve(repo,'smoke-artifacts/story'));
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://local').pathname;
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+'/'))throw Error('Invalid path');
  let body=await readFile(file);
  if(file.endsWith('/app.js'))body=Buffer.from(body.toString().replace('requestAnimationFrame(frame);','setTimeout(()=>requestAnimationFrame(frame),160);').replace('const reviewViews={',
   'const reviewViews={detail:{position:[-3.4,3.6,13.2],target:[-6.2,.3,11.2]},'));
  res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(file)]??'text/plain'});res.end(body);
 }catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 await context.route('https://cdn.jsdelivr.net/npm/three@0.166.1/**',async route=>{
  const relative=new URL(route.request().url()).pathname.split('/three@0.166.1/')[1];
  await route.fulfill({body:await readFile(resolve(repo,'node_modules/three',relative)),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}});
 });
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));
 console.log('Loading',root);await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForFunction(()=>window.__orcbandsTreeLoaded,{timeout:60000});
 console.log('Tree ready');await page.getByRole('button',{name:'Forest grove',exact:true}).click();console.log('Grove selected');
 await page.evaluate(()=>window.__orcbandsReview.setFireTime(0));
 const metrics={};
 for(const view of ['overall','hut','shelter','construction','path','detail']){
  console.log('Capture',view);await page.evaluate(v=>window.__orcbandsReview.view(v),view);
  await page.waitForTimeout(500);
  await page.screenshot({path:resolve(output,view+'.png'),clip:await page.locator('canvas').boundingBox()});
  metrics[view]=await page.evaluate(()=>window.__orcbandsReview.metrics());
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.__orcbandsReview.view('overall'));
 await page.waitForTimeout(500);
 await page.screenshot({path:resolve(output,'mobile.png'),clip:await page.locator('canvas').boundingBox()});
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(resolve(output,'metrics.json'),JSON.stringify(metrics,null,2)+'\n');
 console.log('Captured real WebGL views in',output,'overall:',metrics.overall.calls,'draw calls,',metrics.overall.triangles,'triangles');
}finally{await browser.close();server.close()}
