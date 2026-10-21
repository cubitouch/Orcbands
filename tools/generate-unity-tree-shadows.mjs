// Bake silhouettes from the ORIGINAL Pine 01 OBJ triangles and seeded forest
// placements. This reuses the approved geometry rather than inventing Unity
// shadow shapes. The texture augments Unity's limited WebGL shadow cascades.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { groundHeight } from '../preview/environment-layout.js';

export const SHADOW_MAP_SIZE = 1024;
export const SHADOW_HALF_EXTENT = 55;

// Same sun direction as the approved Three.js grove: (-22, 36, 18).
// A point at elevation y projects to x + 22/36*y, z - 18/36*y.
const sun = { x: -22, y: 36, z: 18 };

function originalPineTriangles() {
  const path = resolve(import.meta.dirname, '../preview/assets/low-poly-pine-01.obj');
  const vertices = [], triangles = [];
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/);
      vertices.push([Number(x), Number(y), Number(z)]);
    } else if (line.startsWith('f ')) {
      const indices = line.trim().split(/\s+/).slice(1)
        .map(part => Number(part.split('/')[0]) - 1);
      for (let i = 1; i < indices.length - 1; i++)
        triangles.push([indices[0], indices[i], indices[i + 1]]);
    }
  }
  if (vertices.length < 50 || triangles.length < 100 ||
      triangles.some(t => t.some(i => i < 0 || i >= vertices.length)))
    throw new Error('Malformed original Pine 01 geometry');
  return {vertices, triangles};
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (const b of bytes) {
    crc ^= b;
    for (let k = 0; k < 8; k++)
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, payload) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, payload])));
  return Buffer.concat([length, name, payload, crc]);
}

function saveMaskPNG(mask, size, filepath) {
  // PNG RGBA image. Top row is world +Z; in Unity UV origin is at bottom.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let row = 0; row < size; row++) {
    let offset = row * (size * 4 + 1);
    raw[offset++] = 0; // no PNG row filter
    for (let x = 0; x < size; x++) {
      const shadow = mask[row * size + x];
      const brightness = Math.round(255 * (1 - shadow * .48));
      raw[offset++] = brightness;
      raw[offset++] = brightness;
      raw[offset++] = brightness;
      raw[offset++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 7 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(filepath, png);
  return png.length;
}

function blurInto(source, size) {
  // 3x3 separable tent-like softening approximates the original PCF edge.
  const mid = new Float32Array(source.length);
  const end = new Float32Array(source.length);
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const p = row * size + col;
      const left = row * size + Math.max(0, col - 1);
      const right = row * size + Math.min(size - 1, col + 1);
      mid[p] = (source[left] + 2 * source[p] + source[right]) * .25;
    }
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const p = row * size + col;
      const top = Math.max(0, row - 1) * size + col;
      const bottom = Math.min(size - 1, row + 1) * size + col;
      end[p] = (mid[top] + 2 * mid[p] + mid[bottom]) * .25;
    }
  return end;
}

// Add local ambient occlusion directly below each tree. Cast shadows alone
// fall away from the sun and leave the trunks visually floating above the soil.
// Keep two feathered Gaussian scales: tight roots + broad low canopy, with
// multiplicative union to avoid opaque hard circles where trees overlap.
export function addRootContactOcclusion(mask, trees, size = SHADOW_MAP_SIZE) {
  const worldPerTexel = 2 * SHADOW_HALF_EXTENT / size;
  let enhancedRoots = 0;
  for (const tree of trees) {
    const centerX = (tree.x + SHADOW_HALF_EXTENT) / worldPerTexel;
    const centerY = (SHADOW_HALF_EXTENT - tree.z) / worldPerTexel;
    const scale = tree.scale ?? 1;
    const crownScale = scale * (tree.width ?? 1);
    const rootSigma = Math.max(.30, .43 * scale);
    const canopySigma = Math.max(.75, .94 * crownScale);
    const radius = Math.ceil(3 * canopySigma / worldPerTexel);
    let peakAdded = 0;
    for (let row = Math.max(0, Math.floor(centerY - radius));
         row <= Math.min(size - 1, Math.ceil(centerY + radius)); row++) {
      const wz = (row + .5 - centerY) * worldPerTexel;
      for (let col = Math.max(0, Math.floor(centerX - radius));
           col <= Math.min(size - 1, Math.ceil(centerX + radius)); col++) {
        const wx = (col + .5 - centerX) * worldPerTexel;
        const dist2 = wx * wx + wz * wz;
        const root = .48 * Math.exp(-dist2 / (2 * rootSigma * rootSigma));
        const canopy = .15 * Math.exp(-dist2 / (2 * canopySigma * canopySigma));
        const contact = Math.min(.70, root + canopy);
        const pixel = row * size + col;
        const before = mask[pixel];
        mask[pixel] = 1 - (1 - before) * (1 - contact);
        // A projected cast shadow may already be near 1 at the tree base.
        // Validate grounded pixels rather than only the incremental change.
        if (contact > .40) peakAdded = Math.max(peakAdded, mask[pixel]);
      }
    }
    if (peakAdded > .025) enhancedRoots++;
  }
  return enhancedRoots;
}

function projectToPixels(vertex, placement, size) {
  const cosine = Math.cos(placement.angle), sine = Math.sin(placement.angle);
  const [x, y, z] = vertex;
  const width = placement.scale * (placement.width ?? 1);
  const rx = x * cosine + z * sine, rz = -x * sine + z * cosine;
  const height = y * placement.scale * (placement.height ?? 1);
  const worldX = placement.x + width * rx + (-sun.x / sun.y) * height;
  const worldZ = placement.z + width * rz + (-sun.z / sun.y) * height;
  return [(worldX + SHADOW_HALF_EXTENT) * size / (2 * SHADOW_HALF_EXTENT),
          (SHADOW_HALF_EXTENT - worldZ) * size / (2 * SHADOW_HALF_EXTENT)];
}

export function generateTreeShadowTexture(trees, destination) {
  const { vertices, triangles } = originalPineTriangles();
  const size = SHADOW_MAP_SIZE;
  const shadow = new Float32Array(size * size);
  const epsilon = 1e-7;
  for (const tree of trees) {
    if (!Number.isFinite(groundHeight(tree.x, tree.z)))
      throw new Error('Invalid forest ground elevation');
    const verts = vertices.map(v => projectToPixels(v, tree, size));
    for (const [a, b, c] of triangles) {
      const p = verts[a], q = verts[b], r = verts[c];
      const det = (q[0] - p[0]) * (r[1] - p[1]) -
                  (q[1] - p[1]) * (r[0] - p[0]);
      if (Math.abs(det) < epsilon) continue;
      const left = Math.max(0, Math.floor(Math.min(p[0], q[0], r[0])));
      const right = Math.min(size - 1, Math.ceil(Math.max(p[0], q[0], r[0])));
      const top = Math.max(0, Math.floor(Math.min(p[1], q[1], r[1])));
      const bottom = Math.min(size - 1, Math.ceil(Math.max(p[1], q[1], r[1])));
      if (right < left || bottom < top) continue;
      for (let iy = top; iy <= bottom; iy++) {
        const y = iy + .5;
        for (let ix = left; ix <= right; ix++) {
          const x = ix + .5, dx = x - p[0], dy = y - p[1];
          const u = (dx * (r[1] - p[1]) - dy * (r[0] - p[0])) / det;
          const v = (dy * (q[0] - p[0]) - dx * (q[1] - p[1])) / det;
          if (u >= 0 && v >= 0 && u + v <= 1) shadow[iy * size + ix] = 1;
        }
      }
    }
  }
  const soft = blurInto(shadow, size);
  const enhancedRoots = addRootContactOcclusion(soft, trees, size);
  if (enhancedRoots < trees.length / 3)
    throw new Error('Most pine roots lack contact shading: ' + enhancedRoots);
  const count = shadow.reduce((sum, value) => sum + (value ? 1 : 0), 0);
  if (count < 3000 || count > size * size * .5)
    throw new Error('Suspicious original pine shadow coverage: ' + count);
  const bytes = saveMaskPNG(soft, size, destination);
  console.log('Original-tree sun-shadow map', trees.length, 'trees,', count,
    'covered texels,', enhancedRoots, 'grounded roots,', bytes, 'PNG bytes');
  return { count, bytes, enhancedRoots };
}
