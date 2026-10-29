import {appendFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {classify} from './ci-changes.mjs';

// Only reuse a successful deployment's main-branch player. PR artifacts are
// deliberately excluded. If retention has expired, request a fresh build.
export async function findPlayer(api, repository, currentRun, compatible) {
  const {workflow_runs:runs} = await api(`/repos/${repository}/actions/workflows/deploy-preview.yml/runs?branch=main&event=push&status=success&per_page=30`);
  for (const run of runs) {
    if (String(run.id) === String(currentRun) || run.head_branch !== 'main' ||
      run.head_repository?.full_name !== repository || run.conclusion !== 'success') continue;
    if (!await compatible(run.head_sha)) continue;
    const {artifacts} = await api(`/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`);
    if (artifacts.some(a => a.name === 'orcbands-unity-published-build' && !a.expired))
      return String(run.id);
  }
  return '';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const api = async path => {
    const response = await fetch('https://api.github.com'+path, {headers:{
      Authorization:`Bearer ${process.env.GITHUB_TOKEN}`, Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
    }});
    if (!response.ok) throw Error(`Player lookup failed (${response.status})`);
    return response.json();
  };
  let run = '';
  const compatible = sha => {
    try {
      // An intervening failed deployment may contain Unity changes: compare
      // against the artifact's actual source, not just this push's before SHA.
      execFileSync('git',['merge-base','--is-ancestor',sha,process.env.GITHUB_SHA]);
      const paths = execFileSync('git',['diff','--name-only','--no-renames','-z',`${sha}..${process.env.GITHUB_SHA}`],
        {encoding:'utf8'}).split('\0').filter(Boolean);
      return !classify(paths).unity;
    } catch {return false;}
  };
  try {run = await findPlayer(api,process.env.GITHUB_REPOSITORY,process.env.GITHUB_RUN_ID,compatible);}
  catch {console.log('::notice::Previous player unavailable; building a fresh Unity player.');}
  await appendFile(process.env.GITHUB_OUTPUT, `run=${run}\n`);
  console.log(run ? `Reusing successful main player from run ${run}.` : 'No reusable player; fresh build required.');
}
