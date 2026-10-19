import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createLayout} from '../preview/environment-layout.js';
import {footprintStatus} from '../preview/camp-ui-model.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.join(repo,'preview'),out=path.join(repo,'smoke-artifacts/camp-ui');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost'),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!f.startsWith(root+path.sep))throw Error('Path traversal');res.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/plain'});res.end(await readFile(f));}catch{res.writeHead(404);res.end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});const errors=[];
 async function context(options){const c=await browser.newContext(options);c.on('page',p=>{p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})});if(process.env.ORCBANDS_LOCAL_THREE==='1')await c.route('https://cdn.jsdelivr.net/npm/three@0.166.1/**',async route=>{const relative=new URL(route.request().url()).pathname.split('/three@0.166.1/')[1];await route.fulfill({body:await readFile(path.join(repo,'node_modules/three',relative)),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}})});return c;}
 const base='http://127.0.0.1:'+server.address().port,c=await context({viewport:{width:1440,height:960}}),page=await c.newPage();
 const metrics=()=>page.evaluate(()=>window.__orcbandsCampUI.metrics()),shot=name=>page.screenshot({path:path.join(out,name+'.png')});
 await page.goto(base+'/?scene=grove&hud=1');await page.waitForFunction(()=>window.__orcbandsCampUI?.metrics().active,null,{timeout:60000});await page.evaluate(()=>window.__orcbandsReview.setFireTime(0));
 const initial=await metrics();assert.equal(initial.selected,'hut');await shot('camp-overview');
 await page.getByRole('button',{name:'Select next structure',exact:true}).click();assert.equal((await metrics()).selected,'shelter');
 const hutPoint=await page.evaluate(()=>window.__orcbandsCampUI.projectPoint(-3,-3.8));assert(hutPoint.visible);await page.mouse.click(hutPoint.x,hutPoint.y);assert.equal((await metrics()).selected,'hut','A click on the actual camp must select the hut');
 await page.locator('[data-camp-anchor="construction"]').click();assert.equal((await metrics()).selected,'construction');const target=await page.evaluate(()=>window.__orcbandsReview.metrics().target);assert(Math.hypot(target[0]-6,target[2]-8.5)<.1,'Minimap pins must focus the real landmark');
 await shot('camp-selected');
 // Return the camera to the clearing before testing ground previews.
 await page.evaluate(()=>window.__orcbandsReview.view('overall'));
 await page.keyboard.press('b');assert((await metrics()).buildOpen);await shot('camp-build-menu');
 await page.locator('[data-build="shelter"]').click();assert.equal((await metrics()).placing,'shelter');assert.equal((await metrics()).placement.valid,false,'Starting footprint deliberately intersects the existing camp');
 const layout=createLayout(),candidates=[];for(let x=-16;x<=16;x++)for(let z=-16;z<=16;z++)if([[0,0],[.6,0],[-.6,0],[0,.6],[0,-.6]].every(([dx,dz])=>footprintStatus('shelter',{x:x+dx,z:z+dz},layout).valid))candidates.push({x,z});
 let placed=false;for(const p of candidates){const s=await page.evaluate(p=>{const s=window.__orcbandsCampUI.projectPoint(p.x,p.z);return {...s,onCanvas:document.elementFromPoint(s.x,s.y)?.id==='viewport'}},p);if(!s.visible||!s.onCanvas)continue;await page.mouse.move(s.x,s.y);if((await metrics()).placement.valid){placed=true;break;}}
 assert(placed,'A real pointer must reach a valid clear footprint');await shot('camp-footprint-valid');
 const blocked=await page.evaluate(()=>window.__orcbandsCampUI.projectPoint(-3,-3.8));await page.mouse.move(blocked.x,blocked.y);assert.equal((await metrics()).placement.valid,false,'Occupied ground must show a blocked preview');await shot('camp-footprint-blocked');
 assert.deepEqual((await metrics()).supplies,initial.supplies,'Previewing must not spend resources');
 await page.keyboard.press('Escape');assert.equal((await metrics()).placing,null);assert.equal(await page.locator('[data-build="shelter"]').evaluate(e=>e===document.activeElement),true,'Cancel returns keyboard focus to its build card');
 await page.keyboard.press('Escape');assert(!(await metrics()).buildOpen);await page.getByRole('button',{name:'Back to Asset Lab',exact:true}).click();assert(!(await metrics()).active);assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('camp-mode')),false);
 await page.getByRole('button',{name:'Timber hut',exact:true}).click();assert.equal(await page.evaluate(()=>window.__orcbandsMode),'hut');await page.getByRole('button',{name:'Camp interface',exact:true}).click();assert((await metrics()).active);
 const desktopFinal=await metrics(),desktopScene=await page.evaluate(()=>window.__orcbandsReview.metrics());await c.close();
 const mobileContext=await context({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=await mobileContext.newPage();await mobile.goto(base+'/?scene=grove&hud=1');await mobile.waitForFunction(()=>window.__orcbandsCampUI?.metrics().active,null,{timeout:60000});await mobile.evaluate(()=>window.__orcbandsReview.setFireTime(0));await mobile.screenshot({path:path.join(out,'camp-mobile.png')});
 const exit=await mobile.getByRole('button',{name:'Back to Asset Lab',exact:true}).boundingBox();assert(exit.x>=0&&exit.y>=0&&exit.x+exit.width<=390&&exit.y+exit.height<=844,'Mobile exit must stay reachable');
 await mobile.getByRole('button',{name:'Select next structure',exact:true}).tap();assert.equal(await mobile.evaluate(()=>window.__orcbandsCampUI.metrics().selected),'shelter');
 await mobile.locator('.hud-build-launch').tap();await mobile.locator('[data-build="hut"]').tap();assert.equal(await mobile.evaluate(()=>window.__orcbandsCampUI.metrics().placing),'hut');await mobile.screenshot({path:path.join(out,'camp-mobile-build.png')});
 await mobile.getByRole('button',{name:'Cancel preview · Esc',exact:true}).tap();assert.equal(await mobile.evaluate(()=>window.__orcbandsCampUI.metrics().placing),null);await mobile.getByRole('button',{name:'Close build menu',exact:true}).tap();await mobile.reload();await mobile.waitForFunction(()=>window.__orcbandsCampUI?.metrics().active);await mobile.getByRole('button',{name:'Back to Asset Lab',exact:true}).tap();assert.equal(await mobile.evaluate(()=>window.__orcbandsCampUI.metrics().overlayVisible),false);
 const summary={initial,final:desktopFinal,scene:desktopScene,errors};await writeFile(path.join(out,'metrics.json'),JSON.stringify(summary,null,2)+'\n');assert.deepEqual(errors,[],'No browser errors');console.log('PASS: HUD deep links, actual world selection, minimap focus, clear/blocked footprint pointer input, unchanged resources, keyboard cancel/focus, mobile taps and exit, legacy studio return; no browser errors.');
}finally{await browser?.close();server.closeAllConnections();server.close();}
