import {strict as assert} from 'node:assert';
import {createReadStream} from 'node:fs';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cacheIdentity, encryptStream, decryptFile} from './unity-ci-cache.mjs';

const run = promisify(execFile), root = await mkdtemp(join(tmpdir(),'orcbands-cache-test-'));
const script = new URL('unity-ci-cache.mjs', import.meta.url).pathname;
const secret = 'test-only-private-token', other = 'rotated-test-token';
const metadata = {mode:'licensed',secret,os:'Linux',platform:'WebGL',compatibility:'engine-packages',source:'source-a'};
try {
  const identity = cacheIdentity(metadata);
  assert.notEqual(identity.prefix,cacheIdentity({...metadata,secret:other}).prefix);
  assert.notEqual(identity.prefix,cacheIdentity({...metadata,mode:'public'}).prefix);
  assert.notEqual(identity.prefix,cacheIdentity({...metadata,platform:'StandaloneOSX'}).prefix);
  assert.notEqual(identity.prefix,cacheIdentity({...metadata,compatibility:'new-engine'}).prefix);
  assert.equal(identity.prefix,cacheIdentity({...metadata,source:'source-b'}).prefix);
  assert.notEqual(identity.key,cacheIdentity({...metadata,source:'source-b'}).key);
  assert(!identity.key.includes(secret));
  assert.throws(()=>cacheIdentity({...metadata,secret:''}));
  assert.throws(()=>cacheIdentity({...metadata,mode:'typo'}));

  const plain=join(root,'plain'), encoded=join(root,'encrypted'), decoded=join(root,'decoded');
  const data = Buffer.from('private-mesh-and-compiled-output\n'.repeat(100000));
  await writeFile(plain,data);
  await encryptStream(createReadStream(plain),encoded,secret);
  assert(!(await readFile(encoded)).includes(Buffer.from('private-mesh')));
  await decryptFile(encoded,decoded,secret);assert.deepEqual(await readFile(decoded),data);
  await assert.rejects(decryptFile(encoded,decoded,other));
  await assert.rejects(readFile(decoded));
  const tampered=await readFile(encoded);tampered[100]^=1;await writeFile(encoded,tampered);
  await assert.rejects(decryptFile(encoded,decoded,secret));await assert.rejects(readFile(decoded));
  await writeFile(encoded,Buffer.from('truncated'));
  await assert.rejects(decryptFile(encoded,decoded,secret));

  // Exercise the actual CLI archive format, not just cipher primitives.
  await mkdir(join(root,'unity/Library/Bee'),{recursive:true});
  await writeFile(join(root,'unity/Library/Bee/build-state'),data);
  const env={...process.env,ORCBANDS_CACHE_SECRET:secret};
  await run(process.execPath,[script,'pack'],{cwd:root,env});
  await rm(join(root,'unity/Library'),{recursive:true});
  await run(process.execPath,[script,'restore'],{cwd:root,env});
  assert.deepEqual(await readFile(join(root,'unity/Library/Bee/build-state')),data);
  await writeFile(join(root,'unity/Library/sentinel'),'keep-existing');
  await assert.rejects(run(process.execPath,[script,'restore'],{cwd:root,env:{...env,ORCBANDS_CACHE_SECRET:other}}));
  assert.equal(await readFile(join(root,'unity/Library/sentinel'),'utf8'),'keep-existing');
  await rm(join(root,'.unity-ci-cache/library.enc'));
  await run(process.execPath,[script,'restore'],{cwd:root,env}); // Cold cache is normal.
  console.log('Unity cache: archive round-trip, tamper/wrong-key rejection, cold restore and isolation pass.');
} finally {await rm(root,{recursive:true,force:true});}
