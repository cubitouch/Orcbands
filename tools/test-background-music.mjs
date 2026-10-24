// Exercise the actual WebGL host without waiting for an engine build.
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const source='https://audio-previews.elements.envatousercontent.com/files/608037494/preview.mp3';
let html=await readFile(new URL('../unity/Assets/WebGLTemplates/Orcbands/index.html',import.meta.url),'utf8');
html=html.replaceAll(/\{\{\{\s*(\w+)\s*\}\}\}/g,(_,key)=>key==='LOADER_FILENAME'?'mock.loader.js':'mock');
// A short original PCM tone makes decoding/playback tests independent of the remote preview service.
const samples=24000*2,wave=Buffer.alloc(44+samples*2);
wave.write('RIFF',0);wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);
wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(24000,24);wave.writeUInt32LE(48000,28);
wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++)wave.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*220/24000)*300),44+i*2);
const fixture=process.env.ORCBANDS_MUSIC_FIXTURE?await readFile(process.env.ORCBANDS_MUSIC_FIXTURE):wave;
const server=createServer((req,res)=>{
 const loader=req.url?.includes('mock.loader.js');res.setHeader('Content-Type',loader?'application/javascript':'text/html');
 res.end(loader?'window.createUnityInstance=async()=>({SendMessage(){}});':html);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let requests=0,fail=false,hold;
 await page.route(source,async route=>{
  requests++;if(hold)await hold;
  if(fail)await route.abort('failed');else await route.fulfill({status:200,contentType:process.env.ORCBANDS_MUSIC_FIXTURE?'audio/mpeg':'audio/wav',body:fixture});
 });
 const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url);await page.waitForFunction(()=>window.orcbandsCharacterReport);
 const button=page.locator('#music-toggle');
 assert.equal(await button.getAttribute('aria-pressed'),'false');assert.equal(requests,0,'Music downloaded before consent');
 assert.equal(await page.locator('audio').getAttribute('src'),source);
 await button.click();await page.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>.1);
 assert.equal(await button.getAttribute('aria-pressed'),'true');
 assert(await page.locator('audio').evaluate(a=>a.loop&&a.volume>0&&a.volume<=.3));
 await page.locator('audio').evaluate(a=>{a.currentTime=a.duration-.08;});
 await page.waitForFunction(()=>document.querySelector('audio').currentTime<.8);
 await button.click();assert(await page.locator('audio').evaluate(a=>a.paused));
 assert.equal(await button.getAttribute('aria-pressed'),'false');
 await button.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('audio').paused);
 await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('audio').paused);
 await page.reload();assert(await page.locator('audio').evaluate(a=>a.paused));
 // Disabling while a play request is pending must stay disabled when loading completes.
 let release;hold=new Promise(r=>release=r);
 await button.click();await button.click();release();hold=null;
 await page.waitForTimeout(300);assert(await page.locator('audio').evaluate(a=>a.paused));
 assert.equal(await button.getAttribute('aria-pressed'),'false');
 await page.reload();fail=true;await button.click();
 await page.waitForFunction(()=>document.querySelector('#music-status').textContent.includes('unavailable'));
 assert.equal(await button.getAttribute('aria-pressed'),'false');
 fail=false;await button.click();await page.waitForFunction(()=>!document.querySelector('audio').paused);
 await button.click();
 await page.setViewportSize({width:390,height:844});
 assert(await button.isVisible());assert((await button.boundingBox()).width>=100);
 assert.deepEqual(errors,[]);
 console.log('PASS: supplied music source, no autoplay/download, decoded playback, loop/quiet volume, off/resume, keyboard, reload, pending cancellation, failure/retry and mobile button.');
} finally {await browser.close();await new Promise(r=>server.close(r));}
