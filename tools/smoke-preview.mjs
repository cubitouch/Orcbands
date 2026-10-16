import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Real Chromium/WebGL smoke test: proof that the assets display, not merely parse.
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'preview');
const types={'.html':'text/html','.js':'text/javascript','.obj':'text/plain','.mtl':'text/plain'};
const server=createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))throw new Error('Path traversal');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    res.end(data);
  } catch(error){
    res.writeHead(404);res.end('Not found');
  }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
let browser;
try {
  browser=await chromium.launch({headless:true,args:[
    '--no-sandbox',
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader'
  ]});
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('loading')?.hidden===true,null,{timeout:60000});
  await mkdir(path.join(repo,'smoke-artifacts'),{recursive:true});
  await page.screenshot({path:path.join(repo,'smoke-artifacts','character-studio.png')});
  if(process.env.ORCBANDS_TEST_BLENDER==='1') {
    await page.getByRole('button',{name:'Blender vNext'}).click();
    await page.waitForFunction(()=>document.getElementById('scene-label')?.textContent.includes('Blender static asset'),null,{timeout:60000});
    await page.waitForTimeout(700);
    await page.screenshot({path:path.join(repo,'smoke-artifacts','character-blender.png')});
    if(!await page.getByRole('button',{name:'Walk'}).isDisabled())throw new Error('Unrigged Blender model should not enable walk animation');
    await page.getByRole('button',{name:'Original placeholder'}).click();
  }
  await page.getByRole('button',{name:'Crash site'}).click();
  await page.waitForFunction(()=>document.getElementById('scene-label')?.textContent.includes('Crash site'));
  await page.screenshot({path:path.join(repo,'smoke-artifacts','crash-site.png')});
  await page.getByRole('button',{name:'Chop wood'}).click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('Chop'));
  await page.getByRole('button',{name:'Character studio'}).click();
  if(errors.length)throw new Error('Browser errors: '+errors.join('\n'));
  console.log('PASS: WebGL context, original model loaded, two preview scenes rendered, and animation controls worked.');
} finally {
  await browser?.close();
  server.close();
}
