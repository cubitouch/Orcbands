import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.join(repo,'preview');
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep))throw Error('Path traversal');
  res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/plain'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 if(process.env.ORCBANDS_LOCAL_THREE==='1')await context.route('https://cdn.jsdelivr.net/npm/three@0.166.1/**',async route=>{
  const relative=new URL(route.request().url()).pathname.split('/three@0.166.1/')[1];
  await route.fulfill({body:await readFile(path.join(repo,'node_modules/three',relative)),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await mkdir(path.join(repo,'smoke-artifacts/goblin'),{recursive:true});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?scene=goblin');
 await page.waitForFunction(()=>window.__orcbandsGoblinLoaded&&window.__orcbandsMode==='goblin',null,{timeout:60000});
 const capture=async name=>{
  await page.waitForTimeout(250);
  await page.locator('canvas').screenshot({path:path.join(repo,'smoke-artifacts/goblin',name+'.png')});
 };
 await capture('three-quarter');
 for(const view of ['front','rear','profile','face','rts']){
  await page.locator('[data-goblin-view="'+view+'"]').click();await capture(view);
 }
 await page.getByRole('button',{name:'Wireframe',exact:true}).click();await capture('wireframe');
 await page.getByRole('button',{name:'Wireframe',exact:true}).click();
 await page.getByRole('button',{name:'Auto rotate',exact:true}).click();
 await page.waitForFunction(()=>window.__orcbandsReview.metrics().rotation>.01);
 await page.getByRole('button',{name:'Reset camera',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Auto rotate',exact:true}).getAttribute('aria-pressed'),'false');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('link',{name:'Download goblin OBJ',exact:true}).click();
 assert.equal((await downloadPromise).suggestedFilename(),'goblin-01.obj');
 const mtl=await page.request.get('http://127.0.0.1:'+server.address().port+'/assets/goblin-01.mtl');assert(mtl.ok());
 await page.getByRole('button',{name:'Single tree',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__orcbandsMode),'studio');
 await page.getByRole('button',{name:'Goblin',exact:true}).click();
 await page.reload();await page.waitForFunction(()=>window.__orcbandsMode==='goblin');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Reset camera',exact:true}).click();
 await capture('mobile');
 await page.locator('[data-goblin-view="face"]').click();await capture('mobile-face');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');
 assert.deepEqual(errors,[],'Browser errors');
 console.log('PASS: Goblin deep link, five camera views, wireframe, rotation, reset, OBJ/MTL downloads, scene switching, reload and mobile framing.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
