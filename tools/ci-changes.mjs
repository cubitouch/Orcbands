import {execFileSync} from 'node:child_process';
import {appendFileSync, readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// These modules feed the generated Unity scene, even though they live in preview/.
const sceneInputs = new Set([
  'environment-layout.js', 'environment.js', 'forest-story.js', 'ground-surface.js',
  'resources.js', 'resource-geometry.js', 'storage-resources.js',
  'settlement-resources.js', 'campfire.js', 'torches.js', 'fire-motion.js', 'camp-visibility.js',
].map(name => 'preview/' + name));

export function classify(paths) {
  const infrastructure = paths.some(p => p.startsWith('.github/actions/unity-cache/') ||
    /^tools\/(ci-changes|unity-ci-cache|test-ci-changes|test-unity-ci-cache|find-unity-player|test-find-unity-player)\.mjs$/.test(p));
  const unity = infrastructure || paths.some(p => p.startsWith('unity/') || sceneInputs.has(p) ||
    p.startsWith('preview/assets/') || /^tools\/generate-(unity-|tree\.|hut\.)/.test(p) ||
    ['.github/workflows/unity-starter.yml', '.github/workflows/worker-art-review.yml',
      '.github/workflows/deploy-preview.yml'].includes(p));
  const browser = paths.some(p => p.startsWith('unity/Assets/WebGLTemplates/') ||
    /^tools\/(test-(save-store|menu-host|background-music)|unity-test-session)\.mjs$/.test(p));
  const preview = paths.some(p => p.startsWith('preview/') ||
    /^tools\/(generate-(tree|hut)|validate-|smoke-(preview|camp-ui))/.test(p) ||
    p === '.github/workflows/validate-preview.yml');
  const bridge = unity || infrastructure || paths.some(p =>
    /^tools\/validate-(unity-|forest-story)/.test(p));
  return {unity, browser, preview, bridge};
}

export function changedPaths(event, eventName) {
  const base = eventName === 'pull_request' ? event.pull_request.base.sha : event.before;
  const head = eventName === 'pull_request' ? event.pull_request.head.sha : event.after;
  if (!base || /^0+$/.test(base) || !head) return null;
  // Separate arguments and NUL delimiters preserve spaces and renamed/deleted inputs.
  const range = eventName === 'pull_request' ? `${base}...${head}` : `${base}..${head}`;
  return execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', range],
    {encoding: 'utf8'}).split('\0').filter(Boolean);
}

export function route(paths, event, eventName) {
  const result = paths ? classify(paths) : {unity:true, browser:true, preview:true, bridge:true};
  const labels = event.pull_request?.labels?.map(label => label.name) ?? [];
  const reviewScript = paths?.some(p => /^tools\/(capture-|smoke-unity-webgl|unity-test-session)/.test(p));
  const explicit = labels.includes('unity-full-review') || labels.includes('unity-gameplay-review') ||
    (labels.includes('unity-visual-review') && (event.action === 'labeled' || reviewScript));
  result.player = result.unity || explicit || eventName === 'workflow_dispatch';
  result.bridge ||= result.player;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const paths = changedPaths(event, process.env.GITHUB_EVENT_NAME);
  const result = route(paths, event, process.env.GITHUB_EVENT_NAME);
  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}=${value}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}
