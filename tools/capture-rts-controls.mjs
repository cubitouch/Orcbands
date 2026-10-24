// Actual Unity WebGL input: edge pan, wheel limits and click/box selection.
import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const output=resolve(process.argv[3]??'smoke-artifacts/unity-webgl/controls');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]??'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.orcbandsCharacterReport,null,{timeout:180000});
 const report=async()=>{const m=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:30000});await page.evaluate(()=>window.orcbandsCharacterReport());return JSON.parse((await m).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);};
 const frames=async(n=3)=>{const first=(await report()).frame;for(let i=0;i<150;i++){await page.waitForTimeout(100);if((await report()).frame>=first+n)return;}throw Error('Unity frames stalled');};
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
 await frames();
 const box=await page.locator('#unity-canvas').boundingBox();
 const move=async(x,y)=>page.mouse.move(box.x+x*box.width,box.y+(1-y)*box.height);
 const click=async(x,y)=>{await move(x,y);await page.mouse.down();await frames(2);await page.mouse.up();await frames(2);};
 const reset=async()=>{await move(.5,.5);await page.locator('#unity-canvas').focus();await page.keyboard.down('r');await frames(2);await page.keyboard.up('r');await frames(3);};
 const shot=async(name)=>page.screenshot({clip:box,path:resolve(output,name+'.png'),timeout:120000});
 const result={edges:{}};
 // Empty click clears selection; a box in either drag direction selects the orc.
 await reset();let r=await report();
 const drag=async(a,b)=>{await move(a.x,a.y);await page.mouse.down();await frames(2);await move(b.x,b.y);await frames(3);};
 const around=p=>[{x:p.x-.045,y:p.y-.075},{x:p.x+.045,y:p.y+.075}];
 let corners=around(r.unitScreen);
 const before=r.camera;
 await drag(...corners);assert((await report()).boxSelecting,'Selection rectangle did not start');await shot('selection-box');
 assert(distance((await report()).camera,before)<.01,'Drawing a selection moved the camera');
 await page.mouse.up();await frames(3);assert((await report()).selected,'Box did not select worker');
 await drag({x:.18,y:.2},{x:.25,y:.28});await page.mouse.up();await frames(3);assert(!(await report()).selected,'Empty box did not deselect worker');
 r=await report();corners=around(r.unitScreen);await drag(corners[1],corners[0]);await page.mouse.up();await frames(3);assert((await report()).selected,'Reverse-direction box failed');
 await click(r.unitScreen.x,r.unitScreen.y);assert((await report()).selected,'Click selection regressed');
 // Crossing a game edge while holding the selection button must not edge-scroll.
 await move(.5,.5);await page.mouse.down();await frames(2);const held=(await report()).camera;
 await move(.999,.5);await frames(6);assert(distance((await report()).camera,held)<.01,'Edge scrolling moved a selection drag');
 await page.mouse.up();await move(.5,.5);await frames(3);
 for(const [name,x,y] of [['left',.001,.5],['right',.999,.5],['top',.5,.999],['bottom',.5,.001]]){
  await reset();const start=await report();await move(x,y);await frames(7);const end=await report();
  assert(distance(start.cameraFocus,end.cameraFocus)>.05,name+' edge did not pan');
  assert(end.pointerInside,'Canvas hover signal missing');result.edges[name]={start,end};
  await page.mouse.move(box.x-4,box.y+box.height/2);await frames(3);const outside=await report();await frames(5);
  assert(distance((await report()).camera,outside.camera)<.01,'Camera continued scrolling outside the canvas');
 }
 const left=result.edges.left,right=result.edges.right,top=result.edges.top,bottom=result.edges.bottom;
 const dot=(a,b,c,d)=>(b.x-a.x)*(d.x-c.x)+(b.z-a.z)*(d.z-c.z);
 assert(dot(left.start.cameraFocus,left.end.cameraFocus,right.start.cameraFocus,right.end.cameraFocus)<0,'Horizontal edges pan in the same direction');
 assert(dot(top.start.cameraFocus,top.end.cameraFocus,bottom.start.cameraFocus,bottom.end.cameraFocus)<0,'Vertical edges pan in the same direction');
 await reset();await move(.5,.5);
 const wheelTo=async(direction,target)=>{
  // Unity normalises a browser wheel event to one notch, even for large deltas.
  for(let i=0;i<24;i++){
   if(Math.abs((await report()).cameraDistance-target)<.05)break;
   await page.mouse.wheel(0,direction*3000);await frames(2);
  }
  // One further notch must stay pinned to the limit.
  await page.mouse.wheel(0,direction*3000);await frames(2);
  return report();
 };
 const near=await wheelTo(-1,24);assert(Math.abs(near.cameraDistance-near.zoomMin)<.05,'Near zoom escaped limit');await shot('zoom-near');
 const far=await wheelTo(1,55);assert(Math.abs(far.cameraDistance-far.zoomMax)<.05,'Far zoom escaped limit');await shot('zoom-far');
 assert.equal(near.zoomMin,24);assert.equal(far.zoomMax,55);
 await reset();const centre=await report();assert(centre.cameraDistance>24&&centre.cameraDistance<55);
 assert(distance(centre.camera,{x:-20,y:22,z:26})<.01,'Reset camera changed');
 assert.deepEqual(errors,[]);
 result.zoom={near,far,reset:centre};result.errors=errors;
 await writeFile(resolve(output,'controls-report.json'),JSON.stringify(result,null,2));
 console.log('PASS: real Unity click/box/reverse/empty selection, drag suppresses edge scrolling, all four mouse edges, leave-canvas stop, bounded zoom and reset.');
} finally {await browser.close();}
