import {enterCamp} from './unity-test-session.mjs';
import { strict as assert } from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const site = process.env.ORCBANDS_PLAYER_DIR ? resolve(process.env.ORCBANDS_PLAYER_DIR) : resolve(root, 'build/WebGL/Orcbands');
const quick = process.env.ORCBANDS_SMOKE_QUICK === '1';
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
  if (!quick) await page.waitForTimeout(2500);
  // Review the same broad landscape presentation as the original Asset Lab,
  // not Unity's default white 960x600 player chrome.
  const viewport = page.locator('#viewport');
  assert.equal(await viewport.count(), 1, 'Expected Orcbands gallery WebGL template');
  const box = await page.locator('#unity-canvas').boundingBox();
  assert(box && box.width > 1050 && box.height > 390,
    'Unity should fill the approved wide landscape gallery');
  await enterCamp(page);
  await page.screenshot({ path: screenshot, fullPage: true });
  if (quick) {
    const report = async () => {
      const pending = page.waitForEvent('console', {predicate:m=>m.text().includes('CHARACTER_REPORT:'), timeout:30000});
      await page.evaluate(()=>window.orcbandsCharacterReport());
      return JSON.parse((await pending).text().split('CHARACTER_REPORT:')[1].split('\n')[0]);
    };
    const frames = async count => {
      const first = await report();
      for (let i = 0; i < 60; i++) {
        const current = await report();
        if (current.splashFinished && current.sessionRunning && current.frame >= first.frame + count) return current;
        await page.waitForTimeout(100);
      }
      throw Error('Unity did not render live gameplay frames');
    };
    const ready = await frames(3);
    await page.mouse.move(box.x + ready.unitScreen.x * box.width, box.y + (1-ready.unitScreen.y) * box.height);
    await page.mouse.down(); await frames(2); await page.mouse.up();
    assert((await frames(2)).selected, 'Worker selection did not reach the live player');
    console.log('QUICK_UNITY_SMOKE: PASS real rendered frames, running session and pointer selection');
  } else {
  // Guard against the stationary-camera forest flicker reproduced by PR #43.
  // This patch of distant pines used to change colour in ~20% of its pixels
  // over 3 seconds while the player was completely untouched. The hearth,
  // torches and their animated particles are deliberately outside the ROI.
  const stationary = resolve(root, 'smoke-artifacts/unity-webgl/stationary');
  await mkdir(stationary, { recursive: true });
  const firstForest = await page.locator('#unity-canvas').screenshot({
    path: resolve(stationary, 'forest-t0.png')
  });
  await page.waitForTimeout(2800);
  const secondForest = await page.locator('#unity-canvas').screenshot({
    path: resolve(stationary, 'forest-t3.png')
  });
  const distantForestChangedFraction = await page.evaluate(async (captures) => {
    async function pixels(base64) {
      const image = new Image();
      image.src = 'data:image/png;base64,' + base64;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    }
    const before = await pixels(captures[0]);
    const after = await pixels(captures[1]);
    if (before.width !== after.width || before.height !== after.height)
      throw new Error('Stationary scene changed canvas dimensions');
    const width = before.width;
    const height = before.height;
    let changed = 0, total = 0;
    for (let y = Math.floor(height * .06); y < Math.floor(height * .38); y += 2) {
      for (let x = Math.floor(width * .20); x < Math.floor(width * .36); x += 2) {
        const index = (y * width + x) * 4;
        const rgbDifference = (Math.abs(before.data[index] - after.data[index])
          + Math.abs(before.data[index + 1] - after.data[index + 1])
          + Math.abs(before.data[index + 2] - after.data[index + 2])) / 3;
        if (rgbDifference > 3.5) changed++;
        total++;
      }
    }
    return changed / total;
  }, [firstForest.toString('base64'), secondForest.toString('base64')]);
  assert(distantForestChangedFraction < .012,
    'Distant forest changes while the camera is stationary: '
      + (100 * distantForestChangedFraction).toFixed(2) + '% of sampled pixels');
  console.log('Stationary background changed pixels: '
    + (100 * distantForestChangedFraction).toFixed(3) + '%');
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
  // Capture motion from the *actual* Unity player rather than treating a
  // successful static screenshot as proof that smoke and flames are animated.
  const baseline = await page.locator('#unity-canvas').screenshot({
    path: resolve(root, 'smoke-artifacts/unity-webgl/fire-motion-1.png')
  });
  await page.waitForTimeout(1400);
  const later = await page.locator('#unity-canvas').screenshot({
    path: resolve(root, 'smoke-artifacts/unity-webgl/fire-motion-2.png')
  });
  assert(!baseline.equals(later), 'Unity fire scene did not change across frames');
  // The actual player frame-change assertion and both fire screenshots always
  // run. Keep the additional video frames for optional full art review only.
  if (process.env.ORCBANDS_CAPTURE_FIRE_VIDEO === '1') {
  // Make the moving effects reviewable without installing Unity: a short
  // capture from the real WebGL canvas, not a synthetic art animation.
  const frames = resolve(root, 'smoke-artifacts/unity-webgl/fire-frames');
  await mkdir(frames, { recursive: true });
  for (let frame = 0; frame < 12; frame++) {
    await page.waitForTimeout(180);
    await page.locator('#unity-canvas').screenshot({
      path: resolve(frames, 'frame-' + String(frame).padStart(2, '0') + '.png')
    });
  }
  const movie = resolve(root, 'smoke-artifacts/unity-webgl/fire-motion.mp4');
  const encoded = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', '5',
    '-i', resolve(frames, 'frame-%02d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '25', movie
  ], { encoding: 'utf8', timeout: 30000 });
  if (encoded.status !== 0)
    console.warn('Could not encode optional fire motion review clip:', encoded.stderr);
  }
  // Regression captures for the fog patch reported during RTS navigation.
  // The camera moves, but the six-source visibility and distant atmospheric
  // fade must remain attached to stable world-space positions.
  await page.locator('#unity-canvas').focus();
  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  await page.screenshot({
    path: resolve(root, 'smoke-artifacts/unity-webgl/fog-camera-pan.png'),
    fullPage: true
  });
  await page.locator('#unity-canvas').hover();
  await page.mouse.wheel(0, -520);
  await page.waitForTimeout(650);
  await page.screenshot({
    path: resolve(root, 'smoke-artifacts/unity-webgl/fog-camera-zoom.png'),
    fullPage: true
  });
  // Keep two visibility states at the same moved camera position for review.
  await page.keyboard.press('f');
  await page.waitForTimeout(350);
  await page.screenshot({
    path: resolve(root, 'smoke-artifacts/unity-webgl/fog-camera-zoom-reveal-off.png'),
    fullPage: true
  });
  await page.keyboard.press('f');
  await page.keyboard.press('r');
  await page.waitForTimeout(350);
  }
  assert.deepEqual(errors, [], 'Browser errors occurred while loading Unity WebGL');
  console.log('Unity WebGL loaded successfully; review screenshot: ' + screenshot);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}

