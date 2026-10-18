import {createResource,RESOURCE_STATES,exportResourceOBJ} from './resources.js?v=__ORCBANDS_REVISION__';

export const RESOURCE_LABELS={
 'bush/full':'Berry bush · full','bush/picked':'Berry bush · partly picked','bush/empty':'Berry bush · empty',
 'wood/standing':'Pine 01 · preserved standing tree','wood/stump':'Pine stump','wood/trunk':'Felled pine trunk',
 'wood/logs':'Cut pine logs','wood/chips':'Wood chips'
};
export function buildResourceViewer(root,sourceTree){
 const views=new Map();let key='bush/full';
 for(const [kind,states] of Object.entries(RESOURCE_STATES))for(const state of states){
  const object=state==='standing'?sourceTree.clone(true):createResource(kind,state);
  object.name=RESOURCE_LABELS[kind+'/'+state];object.visible=false;root.add(object);views.set(kind+'/'+state,object);
 }
 function select(next){
  if(!views.has(next))throw Error('Unknown resource view: '+next);key=next;
  for(const [name,object] of views)object.visible=name===key;
  document.querySelectorAll('[data-resource]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.resource===key)));
 }
 function framing(){
  if(key==='wood/standing')return {position:[5.8,4.9,7.2],target:[0,2.2,0]};
  if(key==='wood/stump')return {position:[1.1,1.0,1.5],target:[0,.24,0]};
  if(key==='wood/chips')return {position:[1.25,1.5,1.6],target:[0,.06,0]};
  if(key==='wood/trunk')return {position:[2.7,2.2,3.4],target:[0,.32,0]};
  if(key==='wood/logs')return {position:[2.0,1.6,2.5],target:[0,.32,0]};
  return {position:[2.2,1.65,2.7],target:[0,.49,0]};
 }
 function metrics(){
  let triangles=0;views.get(key).traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3});
  return {key,label:RESOURCE_LABELS[key],triangles,berries:key.startsWith('bush/')?views.get(key).children[0].geometry.userData.berryCount:null};
 }
 function download(){
  const data=exportResourceOBJ(views.get(key)),url=URL.createObjectURL(new Blob([data],{type:'text/plain'}));
  const a=document.createElement('a');a.href=url;a.download='orcbands-'+key.replace('/','-')+'.obj';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 select(key);return {select,framing,metrics,download};
}
