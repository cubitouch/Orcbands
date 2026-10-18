import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'preview');
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep))throw Error('Path traversal');
  const data=await readFile(file);
  const type=file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/plain';
  res.writeHead(200,{'Content-Type':type});res.end(data);
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'
 ]});
 const url='http://127.0.0.1:'+server.address().port;
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__orcbandsTreeLoaded===true,null,{timeout:60000});
 if(!await page.locator('canvas').count())throw Error('WebGL canvas missing');
 if(!await page.getByRole('link',{name:'Download tree OBJ'}).count())throw Error('OBJ download link missing');
 await mkdir(path.join(repo,'smoke-artifacts'),{recursive:true});
 await page.screenshot({path:path.join(repo,'smoke-artifacts/pine-studio.png')});
 await page.getByRole('button',{name:'Wireframe'}).click();
 if(await page.getByRole('button',{name:'Wireframe'}).getAttribute('aria-pressed')!=='true')throw Error('Wireframe control broken');
 await page.getByRole('button',{name:'Wireframe'}).click();
 await page.getByRole('button',{name:'Small grove'}).click();
 await page.waitForFunction(()=>window.__orcbandsMode==='grove');
 await page.screenshot({path:path.join(repo,'smoke-artifacts/pine-grove.png')});
 const direct=await browser.newPage();
 await direct.goto(url+'/?scene=grove');
 await direct.waitForFunction(()=>window.__orcbandsTreeLoaded&&window.__orcbandsMode==='grove',{timeout:60000});
 await direct.close();
 if(errors.length)throw Error('Browser errors: '+errors.join('\n'));
 console.log('PASS: original OBJ/MTL displayed in WebGL, single tree + grove, wireframe and deep link.');
}finally{await browser?.close();server.close()}
