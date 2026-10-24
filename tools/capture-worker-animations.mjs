// Real Unity WebGL: validate retargeting, root ownership and actual tree commands.
import {strict as assert} from 'node:assert';
import {chromium} from 'playwright';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve(process.argv[3]??'smoke-artifacts/unity-webgl/animations');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:output,size:{width:1280,height:800}}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const report=async()=>{
 const msg=page.waitForEvent('console',{predicate:m=>m.text().includes('CHARACTER_REPORT:'),timeout:30000});
 await page.evaluate(()=>window.orcbandsCharacterReport());
 return JSON.parse((await msg).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);
};
const frames=async(count=3)=>{
 const f=(await report()).frame;
 for(let i=0;i<150;i++){await page.waitForTimeout(100);if((await report()).frame>=f+count)return;}
 throw Error('Unity frames stalled');
};
const until=async(predicate,label)=>{
 for(let i=0;i<120;i++){const r=await report();if(predicate(r))return r;await frames(2);}
 throw Error('Timed out waiting for '+label);
};
const screenshot=async(name)=>page.locator('#unity-canvas').screenshot({path:resolve(output,name+'.png')});
const pointer=async(p,button='left')=>{
 const box=await page.locator('#unity-canvas').boundingBox();
 assert(p.z>0&&p.x>0&&p.x<1&&p.y>0&&p.y<1,'Command target must be visible');
 await page.mouse.move(box.x+p.x*box.width,box.y+(1-p.y)*box.height);
 await page.mouse.down({button});await frames(2);await page.mouse.up({button});await frames(2);
};
const result={source:'Unity WebGL',previews:{},interaction:{}};
try{
 await page.goto(process.argv[2]??'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.orcbandsAnimationPreview,null,{timeout:180000});
 await frames();
 assert((await report()).animated,'Licensed humanoid Animator is missing');
 for(const mode of ['Idle','Walking','Chopping']){
  await page.evaluate(()=>window.orcbandsReview('worker-three-quarter'));
  await page.evaluate(m=>window.orcbandsAnimationPreview(m),mode);
  await until(r=>r.animatorState===mode,mode+' Animator state');
  const samples=[];
  for(let i=0;i<5;i++){
   await frames(i%2===0?2:3);
   const r=await report();samples.push(r);
   assert.equal(r.animationRate,mode==='Idle'?1:1.5,'Unexpected animation playback rate');
   assert.equal(r.treeCount,1220,'Expanded forest missing trees');
   assert.equal(r.mapHalfExtent,110,'Camera uses obsolete map bounds');
   if(i>0)assert(Math.abs(r.carryWeight)<.01,'Walking carry correction leaked into another state');
   assert.equal(r.activeSkinCount,1,'Worker must have one visible skin');
   assert(r.workerReceivesShadows,'Character must still receive scene shadows');
   assert(!r.rootMotion,'Root motion must stay disabled');
   assert(r.gripParentCorrect,'Weapon socket is not under hand_r');
   assert.deepEqual(r.gripInHand,samples[0].gripInHand,'Weapon grip moved in hand space');
   assert(distance(r.feet,samples[0].feet)<.002,'Clip moved the gameplay root');
   await screenshot(mode.toLowerCase()+'-'+i);
  }
  assert(samples.some(r=>distance(r.rightHand,samples[0].rightHand)>.001||distance(r.leftFoot,samples[0].leftFoot)>.001),mode+' did not animate the actual skeleton');
  if(mode==='Chopping'){
   const first=samples[0],last=samples.at(-1);
   const rate=(last.animationTime-first.animationTime)*last.choppingClipLength/(last.gameTime-first.gameTime);
   assert(Math.abs(rate-1.5)<.12,'Chopping time did not advance at the authored rate: '+rate);
   result.choppingMeasuredRate=rate;
  }
  result.previews[mode]=samples;
 }
 await page.evaluate(()=>window.orcbandsAnimationPreview('Gameplay'));
 await page.evaluate(()=>window.orcbandsReview('normal'));await frames();
 let r=await report();const startingFeet=r.feet;await pointer(r.unitScreen);
 assert((await report()).selected,'Worker selection failed');
 const clickedTree=r.chopScreenTarget;
 assert(clickedTree,'No visible canopy target found');
 await pointer(r.chopScreen,'right');
 result.interaction.approach=await until(r=>r.chopTarget!==''&&r.animation==='Walking','walk to tree');
 assert.equal(result.interaction.approach.chopTarget,clickedTree,'Canopy click commanded another tree');
 assert(result.interaction.approach.treeMarkerVisible,'Commanded tree marker missing during approach');
 assert(result.interaction.approach.moving,'Worker must approach before chopping');
 assert(result.interaction.approach.targetDistance>result.interaction.approach.targetStandOff+.035,'Approach sample is already at tree');
 await screenshot('tree-approach');
 result.interaction.chopping=await until(r=>r.chopTarget!==''&&r.animation==='Chopping'&&r.animatorState==='Chopping','chop at tree');
 assert(!result.interaction.chopping.moving,'Chopping began while moving');
 assert(result.interaction.chopping.workPositionClear,'Chopping endpoint overlaps a camp footprint');
 assert(result.interaction.chopping.treeMarkerVisible,'Tree marker disappeared while chopping');
 assert.equal(result.interaction.chopping.chopTarget,clickedTree,'Chop target changed on arrival');
 assert(Math.abs(result.interaction.chopping.targetDistance-result.interaction.chopping.targetStandOff)<.04,'Worker did not stop at the tree work position');
 const stationary=result.interaction.chopping.feet;
 await frames(5);
 assert(distance((await report()).feet,stationary)<.002,'Chopping moved gameplay root');
 assert(result.interaction.chopping.groundError<.025,'Chopping root left terrain');
 await page.evaluate(()=>window.orcbandsReview('worker-chopping'));await frames();
 await screenshot('tree-chopping');
 await page.evaluate(()=>window.orcbandsReview('worker-wide'));await frames();
 r=await report();await pointer(r.returnScreen,'right');
 result.interaction.interrupted=await until(r=>r.chopTarget===''&&r.animation==='Walking','move interrupts chopping');
 assert(!result.interaction.interrupted.treeMarkerVisible,'Tree marker must clear on a ground command');
 result.interaction.returned=await until(r=>r.animation==='Idle'&&r.animatorState==='Idle','idle on arrival');
 assert(distance(result.interaction.returned.feet,startingFeet)<.15,'Worker did not return to the commanded camp position');
 assert(result.interaction.returned.groundError<.025,'Returning worker left terrain');
 await page.evaluate(()=>window.orcbandsReview('worker-moved'));await frames();
 await screenshot('returned-idle');
 assert.deepEqual(errors,[],'Browser errors');
 result.errors=errors;
 await writeFile(resolve(output,'animation-report.json'),JSON.stringify(result,null,2));
 console.log('PASS: humanoid Idle/Walking/Chopping animate, root stays fixed, hand grip persists; tree approach/chop/move interruption/idle work.');
}finally{
 const video=page.video();await context.close();
 if(video)await rename(await video.path(),resolve(output,'worker-animations.webm'));
 await browser.close();
}
