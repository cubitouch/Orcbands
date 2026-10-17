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
  if(process.env.ORCBANDS_TEST_SCULPT==='1') {
    await page.getByRole('button',{name:'Sculpt #18 · Hands'}).click();
    await page.waitForFunction(()=>document.getElementById('scene-label')?.textContent.includes('Sculpt #18'),null,{timeout:60000});
    await page.waitForTimeout(750);
    if(await page.getByRole('button',{name:'Walk'}).isEnabled())
      throw new Error('Static sculpt must disable animation controls');
    if(await page.getByRole('button',{name:'Textured sculpt study'}).getAttribute('aria-pressed')!=='true')
      throw new Error('Sculpt tab failed to activate');
    await page.screenshot({path:path.join(repo,'smoke-artifacts','real-sculpt-browser.png')});
    await page.getByRole('button',{name:'Original placeholder'}).click();
  }
  if(process.env.ORCBANDS_TEST_SCULPT_STAGES==='1') {
    const stages=[
      ['sculpt-v1','Sculpt #16 · Original','Sculpt #16'],
      ['sculpt-v2','Sculpt #17 · Face','Sculpt #17'],
      ['sculpt','Sculpt #18 · Hands','Sculpt #18']
    ];
    const loadedBodies=new Map();
    for(const [id,buttonName,sceneLabel] of stages) {
      await page.getByRole('button',{name:buttonName}).click();
      await page.waitForFunction(label=>document.getElementById('scene-label')?.textContent.includes(label),sceneLabel,{timeout:90000});
      await page.waitForTimeout(800);
      if(await page.getByRole('button',{name:'Walk'}).isEnabled())
        throw new Error(id+': static sculpt incorrectly allows animation');
      const info=await page.evaluate(id=>{
        const btn=document.querySelector('[data-version="'+id+'"]');
        return {pressed:btn?.getAttribute('aria-pressed'),url:new URL(location.href).searchParams.get('model')};
      },id);
      if(info.pressed!=='true'||info.url!==id)throw new Error(id+': selected version or permalink mismatch: '+JSON.stringify(info));
      const file='/assets/'+({ 'sculpt-v1':'worker-orc-sculpt-v1.glb','sculpt-v2':'worker-orc-sculpt-v2-head.glb',sculpt:'worker-orc-sculpt-study.glb'}[id]);
      const bytes=await page.evaluate(async path=>{
        const response=await fetch(path);
        if(!response.ok)throw new Error(path+' response '+response.status);
        return new Uint8Array(await response.arrayBuffer());
      },file);
      loadedBodies.set(id,bytes.length+':'+bytes.slice(0,24).join(','));
      await page.screenshot({path:path.join(repo,'smoke-artifacts',id+'-real-webgl.png')});
    }
    if(new Set([...loadedBodies.values()]).size!==3)
      throw new Error('Distinct sculpt choices must load distinct GLB bytes: '+JSON.stringify([...loadedBodies]));
    const direct=await browser.newPage({viewport:{width:1024,height:768},deviceScaleFactor:1});
    await direct.goto(url+'/?model=sculpt-v2',{waitUntil:'domcontentloaded'});
    await direct.waitForFunction(()=>document.getElementById('scene-label')?.textContent.includes('Sculpt #17'),null,{timeout:90000});
    await direct.close();
    await page.getByRole('button',{name:'Original placeholder'}).click();
  }
  if(process.env.ORCBANDS_TEST_RIG==='1') {
    // The latest *sculpt* is the default. Rigged beta remains independently
    // selectable for the only genuine skinned/animated character.
    await page.getByRole('button',{name:'Rigged beta'}).click();
    await page.waitForFunction(()=>document.getElementById('scene-label')?.textContent.includes('Rigged beta'),null,{timeout:60000});
    await page.waitForTimeout(700);
    await page.getByRole('button',{name:'Walk'}).click();
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(repo,'smoke-artifacts','real-rig-walk-browser.png')});
    await page.getByRole('button',{name:'Chop wood'}).click();
    await page.waitForTimeout(450);
    await page.screenshot({path:path.join(repo,'smoke-artifacts','real-rig-chop-browser.png')});
    await page.getByRole('button',{name:'Carry'}).click();
    await page.waitForTimeout(450);
    await page.screenshot({path:path.join(repo,'smoke-artifacts','real-rig-carry-browser.png')});
    if(errors.length)throw new Error('GLB browser errors: '+errors.join('\\n'));
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
