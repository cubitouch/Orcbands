import {strict as assert} from 'node:assert';
import {findPlayer} from './find-unity-player.mjs';
const repo='example/game';
const run = (id, overrides={}) => ({id,head_branch:'main',head_repository:{full_name:repo},conclusion:'success',...overrides});
const artifact = (expired=false) => ({name:'orcbands-unity-published-build',expired});
const checked=[];
const api = async path => {
  if (path.includes('/workflows/')) return {workflow_runs:[run(9),run(8,{head_branch:'feature'}),
    run(7,{head_repository:{full_name:'fork/game'}}),run(6,{conclusion:'failure'}),run(5),run(4)]};
  checked.push(path);
  return {artifacts:[artifact(path.includes('/5/'))]};
};
assert.equal(await findPlayer(api,repo,9,async()=>true),'4');
assert.equal(checked.length,2);
assert.equal(await findPlayer(api,repo,9,async()=>false),'');
assert.equal(await findPlayer(async()=>({workflow_runs:[]}),repo,9,async()=>true),'');
console.log('Player reuse: only successful main builds, expired/missing artifacts fall back to a build.');
