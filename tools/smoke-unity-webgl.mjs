import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const site = resolve(root, 'build/WebGL/Orcbands');
const screenshot = resolve(root, 'smoke-artifacts/unity-webgl/starter.png');
const files = await readdir(resolve(site, 'Build'));
assert(files.some(x => x.endsWith('.wasm')), 'Missing uncompressed WASM');
assert(files.some(x => x.endsWith('.data')), 'Missing uncompressed .data');
assert(!files.some(x => x.endsWith('.gz') || x.endsWith('.br')),
  'WebGL output requires Content-Encoding headers GitHub Pages cannot provide');

await mkdir(resolve(root, 'smoke-artifacts/unity-webgl'), { recursive: true });
const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1',
  '--directory', site], { stdio: 'ignore' });
let browser;
try {
  let serving = false;
  for (let i = 0; i < 50; i++) {
    try { const res = await fetch('http://127.0.0.1:8765/');
      if (res.ok) { serving = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  assert(serving, 'Local Unity WebGL server did not respond');

  browser = await chromium.launch({
    headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico'))
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 40000 });
  // Unity's standard Web template hides the loading bar only after
  // createUnityInstance resolves and the engine starts running.
  const loaded = await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    const loader = document.querySelector('#unity-loading-bar');
    return canvas && canvas.width >= 300 && canvas.height >= 200 &&
      (!loader || window.getComputedStyle(loader).display === 'none');
  }, null, { timeout: 180000 });
  assert(await loaded.jsonValue(), 'Unity never completed WebGL initialization');
  await page.waitForTimeout(2500);
  // Review the same broad landscape presentation as the original Asset Lab,
  // not Unity's default white 960x600 player chrome.
  const viewport = page.locator('#viewport');
  assert.equal(await viewport.count(), 1, 'Expected Orcbands gallery WebGL template');
  const box = await page.locator('#unity-canvas').boundingBox();
  assert(box && box.width > 1050 && box.height > 390,
    'Unity should fill the approved wide landscape gallery');
  await page.screenshot({ path: screenshot, fullPage: true });
  // Additional screenshot isolates material/lighting quality from the
  // static Warcraft-style visibility mask. Keep the default screenshot on.
  await page.locator('#unity-canvas').click({position:{x:20,y:20}});
  await page.keyboard.press('f');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: resolve(root, 'smoke-artifacts/unity-webgl/fog-of-war-disabled.png'),
    fullPage: true
  });
  await page.keyboard.press('f');
  assert.deepEqual(errors, [], 'Browser errors occurred while loading Unity WebGL');
  console.log('Unity WebGL loaded successfully; review screenshot: ' + screenshot);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
