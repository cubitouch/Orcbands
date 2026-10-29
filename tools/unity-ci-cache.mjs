import {createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {appendFile, mkdir, open, rename, rm, stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {pipeline} from 'node:stream/promises';
import {createGzip} from 'node:zlib';
import {pathToFileURL} from 'node:url';

const magic = Buffer.from('ORCLIB01');
const headerSize = magic.length + 32 + 12;
const context = 'Orcbands licensed Unity Library cache v1';
const derive = (secret, salt) => hkdfSync('sha256', secret, salt, context, 32);
function requireSecret(secret) {
  if (!secret) throw Error('Licensed Unity cache requires a secret');
}

export async function encryptStream(source, destination, secret) {
  requireSecret(secret);
  const salt = randomBytes(32), iv = randomBytes(12);
  const header = Buffer.concat([magic, salt, iv]);
  const cipher = createCipheriv('aes-256-gcm', derive(secret, salt), iv);
  cipher.setAAD(header);
  const handle = await open(destination, 'w', 0o600);
  await handle.write(header); await handle.close();
  await pipeline(source, cipher, createWriteStream(destination, {flags:'a'}));
  await appendFile(destination, cipher.getAuthTag());
}

// Authenticate to a temporary archive before allowing tar to touch Library.
export async function decryptFile(source, destination, secret) {
  requireSecret(secret);
  const {size} = await stat(source);
  if (size <= headerSize + 16) throw Error('Truncated Unity cache');
  const handle = await open(source, 'r');
  const header = Buffer.alloc(headerSize), tag = Buffer.alloc(16);
  await handle.read(header, 0, header.length, 0);
  await handle.read(tag, 0, tag.length, size - tag.length);
  await handle.close();
  if (!header.subarray(0, magic.length).equals(magic)) throw Error('Unknown Unity cache format');
  const decipher = createDecipheriv('aes-256-gcm',
    derive(secret, header.subarray(8, 40)), header.subarray(40, 52));
  decipher.setAAD(header); decipher.setAuthTag(tag);
  try {
    await pipeline(createReadStream(source, {start:headerSize, end:size-17}),
      decipher, createWriteStream(destination, {mode:0o600}));
  } catch (error) {
    await rm(destination, {force:true});
    throw error;
  }
}

function tar(args) {
  const child = spawn('tar', args, {stdio:['ignore','pipe','inherit']});
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(Error('Unity cache tar failed')));
  });
  return {child, done};
}

export function cacheIdentity({mode, secret='', platform, os, compatibility, source}) {
  if (!['public','licensed'].includes(mode)) throw Error('Unknown Unity cache mode');
  if (mode === 'licensed') requireSecret(secret);
  const identity = mode === 'licensed' ? createHash('sha256').update(secret).digest('hex').slice(0,16) : 'public';
  const prefix = `unity-library-v1-${os}-${platform}-${mode}-${identity}-${compatibility}-`;
  return {prefix, key:prefix+source, path:mode === 'licensed' ? '.unity-ci-cache/library.enc' : 'unity/Library'};
}

async function main(operation) {
  const directory = '.unity-ci-cache', encrypted = directory+'/library.enc';
  const secret = process.env.ORCBANDS_CACHE_SECRET;
  if (operation === 'key') {
    const result = cacheIdentity({mode:process.env.ORCBANDS_CACHE_MODE, secret,
      platform:process.env.ORCBANDS_CACHE_PLATFORM, os:process.env.RUNNER_OS,
      compatibility:process.env.ORCBANDS_CACHE_COMPATIBILITY, source:process.env.ORCBANDS_CACHE_SOURCE});
    for (const [key,value] of Object.entries(result))
      await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  } else if (operation === 'pack') {
    requireSecret(secret);
    await mkdir(directory, {recursive:true});
    const {child, done} = tar(['-cf','-','-C','unity','Library']);
    // Compress before encrypting: cache service compression cannot shrink ciphertext.
    const compressed = createGzip({level:1});
    try {
      await Promise.all([done, pipeline(child.stdout, compressed),
        encryptStream(compressed, encrypted, secret)]);
    } catch (error) {
      child.kill();
      await rm(encrypted, {force:true});
      throw error;
    }
  } else if (operation === 'restore') {
    try {
      await stat(encrypted);
    } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    const archive = directory+'/library.tar.gz';
    const staging = directory+'/restored';
    try {
      await decryptFile(encrypted, archive, secret);
      await mkdir(staging, {recursive:true});
      await tar(['-xzf',archive,'-C',staging,'--no-same-owner']).done;
      await stat(staging+'/Library');
      await rm('unity/Library', {recursive:true,force:true});
      await rename(staging+'/Library', 'unity/Library');
      console.log('Authenticated licensed Unity cache restored.');
    } finally {
      await rm(archive, {force:true});
      await rm(staging, {recursive:true,force:true});
    }
  } else throw Error('Expected key, pack or restore');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main(process.argv[2]);
