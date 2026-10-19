import {createResource,RESOURCE_STATES,exportResourceOBJ} from './resources.js?v=__ORCBANDS_REVISION__';

export const RESOURCE_LABELS={
 'shelter/empty':'Storage lean-to · empty','shelter/stocked':'Storage lean-to · stocked',
 'construction/foundation':'Building site · foundation','construction/frame':'Building site · timber frame','construction/roof':'Building site · unfinished roof',
 'bush/full':'Berry bush · full','bush/picked':'Berry bush · partly picked','bush/empty':'Berry bush · empty',
 'wood/standing':'Pine 01 · preserved standing tree','wood/stump':'Pine stump','wood/trunk':'Felled pine trunk',
 'wood/logs':'Cut pine logs','wood/chips':'Wood chips',
 'stone/full':'Stone outcrop · full','stone/depleted':'Stone outcrop · depleted','stone/rubble':'Loose stone',
 ...Object.fromEntries(['woodpile','stonepile','food'].flatMap(kind=>['empty','partial','full'].map(state=>[kind+'/'+state,({woodpile:'Wood stockpile',stonepile:'Stone stockpile',food:'Food stores'})[kind]+' · '+state])))
};
export const RESOURCE_FAMILIES={bush:'Berries',wood:'Tree forms',stone:'Stone outcrop',woodpile:'Wood stockpile',stonepile:'Stone stockpile',food:'Food stores',shelter:'Storage shelter',construction:'Construction kit'};
export function buildResourceViewer(root,sourceTree,onChange){
 const views=new Map(),groups=new Map(),last=new Map();let key='bush/full';
 const familyHost=document.getElementById('resource-families'),stateHost=document.getElementById('resource-states');
 for(const [kind,states]of Object.entries(RESOURCE_STATES)){
  const group=document.createElement('div');group.className='controls';group.setAttribute('role','group');group.setAttribute('aria-label',RESOURCE_FAMILIES[kind]+' states');stateHost.append(group);groups.set(kind,group);
  const family=document.createElement('button');family.textContent=RESOURCE_FAMILIES[kind];family.dataset.resourceFamily=kind;familyHost.append(family);
  last.set(kind,kind+'/'+(kind==='wood'?'standing':states.includes('full')?'full':states.at(-1)));
  family.addEventListener('click',()=>{select(last.get(kind));onChange()});
  for(const state of states){
   const button=document.createElement('button');button.dataset.resource=kind+'/'+state;
   button.textContent=kind==='shelter'?({empty:'Empty shelter',stocked:'Stocked shelter'})[state]:kind==='construction'?({foundation:'Foundation markers',frame:'Timber frame',roof:'Unfinished roof'})[state]:kind==='bush'?({full:'Full berries',picked:'Partly picked',empty:'Empty bush'})[state]:kind==='wood'?({standing:'Standing pine',stump:'Stump',trunk:'Felled trunk',logs:'Cut logs',chips:'Wood chips'})[state]:kind==='stone'?({full:'Full outcrop',depleted:'Depleted outcrop',rubble:'Loose stone'})[state]:({full:'Full',partial:'Partial',empty:'Empty'})[state];
   button.addEventListener('click',()=>{select(kind+'/'+state);onChange()});group.append(button);
  }
 }
 for(const [kind,states] of Object.entries(RESOURCE_STATES))for(const state of states){
  const object=state==='standing'?sourceTree.clone(true):createResource(kind,state);
  object.name=RESOURCE_LABELS[kind+'/'+state];object.visible=false;root.add(object);views.set(kind+'/'+state,object);
 }
 function select(next){
  if(!views.has(next))throw Error('Unknown resource view: '+next);key=next;
  const family=key.split('/')[0];last.set(family,key);for(const[k,g]of groups)g.hidden=k!==family;
  document.querySelectorAll('[data-resource-family]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.resourceFamily===family)));
  for(const [name,object] of views)object.visible=name===key;
  document.querySelectorAll('[data-resource]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.resource===key)));
 }
 function framing(){
  if(key.startsWith('shelter/'))return {position:[6.3,4.6,7.9],target:[0,1.2,0]};
  if(key==='construction/foundation')return {position:[5.2,4.8,6.4],target:[.25,.12,0]};
  if(key.startsWith('construction/'))return {position:[6.5,5.5,8],target:[.25,1.15,0]};
  if(key.startsWith('stone/'))return {position:key==='stone/full'?[3.5,2.8,4.5]:[2.6,2.2,3.4],target:[0,key==='stone/full'?.8:.25,0]};
  if(key.startsWith('woodpile/'))return {position:[3.2,2.6,3.8],target:[0,.48,0]};
  if(key.startsWith('stonepile/'))return {position:[2.8,2.5,3.5],target:[0,.25,0]};
  if(key.startsWith('food/'))return {position:[1.7,2.3,2.4],target:[0,.25,-.1]};
  if(key==='wood/standing')return {position:[5.8,4.9,7.2],target:[0,2.2,0]};
  if(key==='wood/stump')return {position:[1.1,1.0,1.5],target:[0,.24,0]};
  if(key==='wood/chips')return {position:[1.25,1.5,1.6],target:[0,.06,0]};
  if(key==='wood/trunk')return {position:[2.7,2.2,3.4],target:[0,.32,0]};
  if(key==='wood/logs')return {position:[2.0,1.6,2.5],target:[0,.32,0]};
  return {position:[2.2,1.65,2.7],target:[0,.49,0]};
 }
 function metrics(){
  let triangles=0;views.get(key).traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3});
  return {key,label:RESOURCE_LABELS[key],triangles,contents:views.get(key).children[0]?.geometry?.userData.contents??null,berries:key.startsWith('bush/')?views.get(key).children[0].geometry.userData.berryCount:null};
 }
 function download(){
  const data=exportResourceOBJ(views.get(key)),url=URL.createObjectURL(new Blob([data],{type:'text/plain'}));
  const a=document.createElement('a');a.href=url;a.download='orcbands-'+key.replace('/','-')+'.obj';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 select(key);return {select,framing,metrics,download};
}
