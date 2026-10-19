import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {RESOURCE_STATES} from '../preview/resources.js';
import {RESOURCE_FAMILIES} from '../preview/resource-viewer.js';

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
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 // Optional offline capture uses the exact same pinned Three.js package as the import map.
 if(process.env.ORCBANDS_LOCAL_THREE==='1')await context.route('https://cdn.jsdelivr.net/npm/three@0.166.1/**',async route=>{
  const relative=new URL(route.request().url()).pathname.split('/three@0.166.1/')[1];
  await route.fulfill({body:await readFile(path.join(repo,'node_modules/three',relative)),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}});
 });
 const page=await context.newPage();
 const errors=[];
 context.on('page',p=>{
  p.on('pageerror',error=>errors.push(String(error)));
  p.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 });
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 const metrics=()=>page.evaluate(()=>window.__orcbandsReview.metrics());
 const check=(value,message)=>{if(!value)throw Error(message)};
 const moved=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]))>.05;

 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__orcbandsTreeLoaded===true,null,{timeout:60000});
 if(!await page.locator('canvas').count())throw Error('WebGL canvas missing');
 if(!await page.getByRole('link',{name:'Download tree OBJ'}).count())throw Error('OBJ download link missing');
 await mkdir(path.join(repo,'smoke-artifacts'),{recursive:true});
 await page.screenshot({path:path.join(repo,'smoke-artifacts/pine-studio.png')});
 await page.getByRole('button',{name:'Wireframe'}).click();
 if(await page.getByRole('button',{name:'Wireframe'}).getAttribute('aria-pressed')!=='true')throw Error('Wireframe control broken');
 await page.getByRole('button',{name:'Wireframe'}).click();
 await page.getByRole('button',{name:'Timber hut',exact:true}).click();
 await page.waitForFunction(()=>window.__orcbandsHutLoaded&&window.__orcbandsMode==='hut');
 await page.screenshot({path:path.join(repo,'smoke-artifacts/hut-three-quarter.png')});
 check(await page.getByRole('link',{name:'Download hut OBJ'}).count(),'Hut OBJ download missing');
 for(const view of ['front','rear','roof','detail']){
  await page.locator('[data-hut-view="'+view+'"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(repo,'smoke-artifacts/hut-'+view+'.png')});
 }
 const hutMetrics=await metrics();
 check(hutMetrics.calls<=24&&hutMetrics.triangles<4000,'Hut batching/geometry budget exceeded');
 await page.getByRole('button',{name:'Auto rotate'}).click();
 await page.waitForFunction(()=>window.__orcbandsReview.metrics().rotation>.01);
 await page.getByRole('button',{name:'Reset camera'}).click();
 await page.getByRole('button',{name:'Wireframe'}).click();
 await page.screenshot({path:path.join(repo,'smoke-artifacts/hut-wireframe.png')});
 await page.getByRole('button',{name:'Wireframe'}).click();
 await page.getByRole('button',{name:'Forest grove'}).click();
 await page.waitForFunction(()=>window.__orcbandsMode==='grove');
 await page.evaluate(()=>window.__orcbandsReview.setFireTime(0));
 for(const view of ['overall','path','low','wide','hut','campfire','fire','berries','woodcut','quarry','stockyard','foodstore','shelter','construction']) {
  await page.evaluate(view=>window.__orcbandsReview.view(view),view);
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(repo,'smoke-artifacts/grove-'+view+'.png')});
 }
 const desktopMetrics=await metrics();
 if(process.env.ORCBANDS_CAPTURE_FIRE_VIDEO==='1'){
  await page.setViewportSize({width:960,height:660});
  await page.evaluate(()=>window.__orcbandsReview.view('campfire'));
  const frames=path.join(repo,'smoke-artifacts/fire-frames');await rm(frames,{recursive:true,force:true});await mkdir(frames,{recursive:true});
  for(let i=0;i<36;i++){
   await page.evaluate(t=>window.__orcbandsReview.setFireTime(t),i/12);
   await page.waitForTimeout(40);
   await page.locator('canvas').screenshot({path:path.join(frames,String(i).padStart(3,'0')+'.png')});
  }
  await page.setViewportSize({width:1280,height:800});
  await page.evaluate(()=>{window.__orcbandsReview.setFireTime(0);window.__orcbandsReview.view('fire')});
 }
 check(desktopMetrics.atmosphere.puffs===28&&desktopMetrics.atmosphere.sparks===18,'Smoke and spark pools missing');
 check(desktopMetrics.visibility.enabled&&desktopMetrics.visibility.sources===6,'Grove fog reveal sources missing');
 check(desktopMetrics.torches.count===4,'Four torches must render');
 await page.getByRole('button',{name:'Fog of war',exact:true}).click();
 check(!(await metrics()).visibility.enabled,'Fog toggle must reveal full forest');
 await page.evaluate(()=>window.__orcbandsReview.view('overall'));
 await page.waitForTimeout(200);
 await page.screenshot({path:path.join(repo,'smoke-artifacts/grove-fog-off.png')});
 await page.getByRole('button',{name:'Fog of war',exact:true}).click();
 await page.evaluate(()=>window.__orcbandsReview.setFireTime(1.1));
 check(JSON.stringify((await metrics()).atmosphere.smokeSample)!==JSON.stringify(desktopMetrics.atmosphere.smokeSample),'Smoke must rise and drift');
 check((await metrics()).campfire.lightColor!==desktopMetrics.campfire.lightColor,'Firelight warmth must vary');
 check(JSON.stringify((await metrics()).torches.scales)!==JSON.stringify(desktopMetrics.torches.scales),'Torch flames must animate');
 check(JSON.stringify((await metrics()).campfire.scales)!==JSON.stringify(desktopMetrics.campfire.scales),'Campfire pose must animate');
 await page.evaluate(()=>{window.__orcbandsReview.view('campfire');window.__orcbandsReview.setFireTime(1.1)});
 await page.waitForTimeout(120);
 await page.screenshot({path:path.join(repo,'smoke-artifacts/grove-motion-1.png')});
 await page.evaluate(()=>window.__orcbandsReview.setFireTime(2.3));
 await page.waitForTimeout(120);
 await page.screenshot({path:path.join(repo,'smoke-artifacts/grove-motion-2.png')});
 await page.evaluate(()=>window.__orcbandsReview.setFireTime(null));
 const resumeTime=(await metrics()).campfire.time;
 await page.waitForFunction(start=>window.__orcbandsReview.metrics().campfire.time>start+.05,resumeTime);
 check(desktopMetrics.calls<=66,'Grove draw-call budget exceeded');
 check(desktopMetrics.triangles<195000,'Grove triangle budget exceeded');
 await page.getByRole('button',{name:'Resources',exact:true}).click();
 for(const key of Object.entries(RESOURCE_STATES).flatMap(([kind,states])=>states.map(state=>kind+'/'+state))){
  await page.locator('[data-resource-family="'+key.split('/')[0]+'"]').click();
  await page.locator('[data-resource="'+key+'"]').click();await page.waitForTimeout(160);
  const resource=await page.evaluate(()=>window.__orcbandsResourceReview.metrics());
  check(resource.key===key,'Resource selection must switch geometry');
  if(key.startsWith('bush/'))check(resource.berries===({'bush/full':30,'bush/picked':10,'bush/empty':0})[key],'Berry state count mismatch');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(repo,'smoke-artifacts/resource-'+key.replace('/','-')+'.png')});
 }
 await page.locator('[data-resource-family="bush"]').click();
 await page.locator('[data-resource="bush/full"]').click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download resource OBJ',exact:true}).click();
 const download=await downloadPromise;await download.saveAs(path.join(repo,'smoke-artifacts/berry-full.obj'));
 check(download.suggestedFilename()==='orcbands-bush-full.obj','Resource OBJ download failed');
 const exported=await readFile(path.join(repo,'smoke-artifacts/berry-full.obj'),'utf8');
 check(exported.split('\n').find(line=>line.startsWith('v ')).trim().split(/\s+/).length===7,'Downloaded OBJ must carry RGB vertex colors');
 await page.getByRole('button',{name:'Wireframe',exact:true}).click();
 await page.screenshot({path:path.join(repo,'smoke-artifacts/resource-wireframe.png')});
 await page.getByRole('button',{name:'Wireframe',exact:true}).click();
 await page.getByRole('button',{name:'Auto rotate',exact:true}).click();
 await page.waitForFunction(()=>window.__orcbandsReview.metrics().rotation>.01);
 await page.getByRole('button',{name:'Reset camera',exact:true}).click();
 await page.reload();await page.waitForFunction(()=>window.__orcbandsMode==='resources'&&window.__orcbandsResourceReview.metrics().key==='bush/full');
 check(!(await metrics()).visibility.enabled,'Resource studio must not receive grove fog');
 await page.getByRole('button',{name:'Forest grove'}).click();
 const signature=await page.evaluate(()=>JSON.stringify(window.__orcbandsLayout));
 // Exercise actual pointer orbit and wheel zoom, rather than only camera presets.
 await page.getByRole('button',{name:'Reset camera'}).click();
 await page.waitForTimeout(250);
 const reset=await metrics();
 const box=await page.locator('canvas').boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
 await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.54,{steps:8});await page.mouse.up();
 await page.waitForTimeout(250);
 check(moved(reset.camera,(await metrics()).camera),'Desktop orbit did not move camera');
 const beforeZoom=await metrics();await page.mouse.wheel(0,-240);await page.waitForTimeout(250);
 check(moved(beforeZoom.camera,(await metrics()).camera),'Wheel zoom did not work');
 await page.mouse.down({button:'right'});await page.mouse.move(box.x+box.width*.65,box.y+box.height*.58,{steps:6});await page.mouse.up({button:'right'});
 await page.waitForTimeout(250);
 check(moved(reset.target,(await metrics()).target),'Desktop pan did not move target');
 await page.getByRole('button',{name:'Reset camera'}).click();await page.waitForTimeout(500);
 check(!moved(reset.camera,(await metrics()).camera),'Reset camera does not restore framing');
 await page.getByRole('button',{name:'Auto rotate'}).click();
 await page.waitForFunction(()=>Math.abs(window.__orcbandsReview.metrics().rotation)>.01);
 check(Math.abs((await metrics()).rotation)>.01,'Auto rotate did not rotate grove');
 await page.getByRole('button',{name:'Auto rotate'}).click();
 await page.getByRole('button',{name:'Single tree',exact:true}).click();
 await page.waitForTimeout(200);
 await page.screenshot({path:path.join(repo,'smoke-artifacts/pine-studio-return.png')});
 check(!(await metrics()).visibility.enabled,'Studio must not have fog of war');
 check((await page.getByRole('button',{name:'Single tree',exact:true}).getAttribute('aria-pressed'))==='true','Return to studio failed');

 const direct=await context.newPage();
 await direct.goto(url+'/?scene=grove');
 await direct.waitForFunction(()=>window.__orcbandsTreeLoaded&&window.__orcbandsMode==='grove',{timeout:60000});
 check(await direct.evaluate(()=>JSON.stringify(window.__orcbandsLayout))===signature,'Reload changed seeded geometry placement');
 await direct.close();
 const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});
 await mobile.goto(url+'/?scene=grove');
 await mobile.waitForFunction(()=>window.__orcbandsTreeLoaded&&window.__orcbandsMode==='grove',{timeout:60000});
 const mobileMetrics=await mobile.evaluate(()=>window.__orcbandsReview.metrics());
 check(mobileMetrics.fov>50,'Portrait grove framing was not adapted');
 await mobile.screenshot({path:path.join(repo,'smoke-artifacts/grove-mobile.png')});
 // CDP sends real touch input through OrbitControls: one-finger orbit and two-finger pinch/pan.
 const cdp=await context.newCDPSession(mobile);
 const mb=await mobile.locator('canvas').boundingBox();
 const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],i)=>({x,y,id:i+1}))});
 const x=mb.x+mb.width*.5,y=mb.y+mb.height*.6;
 await touch('touchStart',[[x,y]]);await touch('touchMove',[[x+55,y+10]]);await touch('touchEnd',[]);
 await mobile.waitForTimeout(300);
 const mobileOrbit=await mobile.evaluate(()=>window.__orcbandsReview.metrics());
 check(moved(mobileMetrics.camera,mobileOrbit.camera),'Mobile orbit did not work');
 await touch('touchStart',[[x-35,y],[x+35,y]]);
 await touch('touchMove',[[x-60,y+20],[x+65,y+20]]);await touch('touchEnd',[]);
 await mobile.waitForTimeout(300);
 const mobilePinch=await mobile.evaluate(()=>window.__orcbandsReview.metrics());
 check(moved(mobileOrbit.camera,mobilePinch.camera),'Mobile pinch zoom did not work');
 check(moved(mobileOrbit.target,mobilePinch.target),'Mobile two-finger pan did not work');
 await mobile.getByRole('button',{name:'Reset camera'}).click();await mobile.waitForTimeout(400);
 const mobileReset=await mobile.evaluate(()=>window.__orcbandsReview.metrics());
 check(!moved(mobileReset.camera,mobileMetrics.camera),'Mobile reset failed');
 await mobile.screenshot({path:path.join(repo,'smoke-artifacts/grove-mobile-reset.png')});
 await writeFile(path.join(repo,'smoke-artifacts/metrics.json'),JSON.stringify({desktop:desktopMetrics,mobile:mobileMetrics,hut:hutMetrics},null,2)+'\n');
 await mobile.getByRole('button',{name:'Timber hut',exact:true}).click();
 await mobile.waitForFunction(()=>window.__orcbandsMode==='hut');
 await mobile.screenshot({path:path.join(repo,'smoke-artifacts/hut-mobile.png')});
 await mobile.reload();await mobile.waitForFunction(()=>window.__orcbandsHutLoaded&&window.__orcbandsMode==='hut');
 await mobile.getByRole('button',{name:'Resources',exact:true}).click();
 await mobile.locator('[data-resource-family="food"]').click();
 await mobile.locator('[data-resource="food/partial"]').click();
 await mobile.evaluate(()=>window.scrollTo(0,0));
 await mobile.screenshot({path:path.join(repo,'smoke-artifacts/resource-mobile.png')});
 await mobile.reload();await mobile.waitForFunction(()=>window.__orcbandsMode==='resources'&&window.__orcbandsResourceReview.metrics().key==='food/partial');
 await mobile.close();
 if(errors.length)throw Error('Browser errors: '+errors.join('\n'));
 console.log('PASS: Pine 01, hut studio + views/wireframe/rotation/deep link, grove + hut + tree/berry resources and colored OBJ download; seeded reload; desktop orbit/zoom/pan/reset; mobile touch orbit/pinch/pan/reset; no browser errors.',desktopMetrics);
}finally{await browser?.close();server.closeAllConnections();server.close()}
