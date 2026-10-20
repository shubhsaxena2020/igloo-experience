/**
 * Igloo Inc. Web Workers Verification Script
 * Validates:
 * 1. audioworker-036a09db.js (OggOpus WASM audio decoder)
 * 2. msdfworker-ac346fa7.js   (MSDF typography mesh layout & kerning)
 * 3. bitmapworker-046527f8.js (ImageBitmapLoader with flipY/premultiplyAlpha)
 * 4. exrworker-41cbee65.js    (OpenEXR HDR texture parser)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, 'assets');

console.log('====================================================');
console.log('  IGLOO INC. - 4 WEB WORKERS VERIFICATION SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. MSDF Worker Verification (Direct JS execution)
// ----------------------------------------------------
async function testMsdfWorker() {
  console.log('>>> [1/4] Testing msdfworker-ac346fa7.js...');
  const code = fs.readFileSync(path.join(ASSETS_DIR, 'msdfworker-ac346fa7.js'), 'utf8');
  const fontJson = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'fonts/IBMPlexMono-Medium.json'), 'utf8'));

  // Main-thread preprocessing as performed in App3D-d68cb154.js (class AR)
  const glyphs = fontJson.glyphs;
  fontJson.glyphs = {};
  glyphs.forEach(c => {
    const charStr = String.fromCharCode(c.unicode);
    c.isWhitespace = /\s/.test(charStr);
    fontJson.glyphs[charStr] = c;
  });
  fontJson.placeholderChar = Object.keys(fontJson.glyphs).sort()[0];

  let workerRes = null;
  const sandbox = {
    postMessage: (msg, transfer) => { workerRes = { msg, transfer }; },
    console,
    onmessage: null
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  sandbox.onmessage({
    data: {
      font: fontJson,
      options: {
        text: 'IGLOO INC.\nWORKER REVERSE ENGINEERING',
        width: 15,
        align: 'left',
        size: 1,
        lineHeight: 1.4,
        letterSpacing: 0,
        wordSpacing: 0,
        wordBreak: false,
        baseOffset: 0
      }
    }
  });

  const b = workerRes.msg.buffers;
  const passed = b && b.position && b.index && b.uv && b.centr && b.uvMask && b.textWeights && b.lineWeights;
  console.log('    ✓ Output buffers verified:', Object.keys(b).join(', '));
  console.log(`    ✓ Glyph Quads: ${b.position.length / 12}, Index count: ${b.index.length}`);
  console.log(`    ✓ maxLineHeight: ${b.maxLineHeight.toFixed(4)}, maxUVDisp: ${b.maxUVDisp.toFixed(4)}`);
  console.log(`    ✓ Transferred ArrayBuffers: ${workerRes.transfer.length}`);
  if (!passed) throw new Error('msdfworker verification failed');
  return true;
}

// ----------------------------------------------------
// 2. Audio Worker Verification (WASM OggOpus decoding)
// ----------------------------------------------------
async function testAudioWorker() {
  console.log('\n>>> [2/4] Testing audioworker-036a09db.js...');
  const code = fs.readFileSync(path.join(ASSETS_DIR, 'audioworker-036a09db.js'), 'utf8');
  const oggBuffer = fs.readFileSync(path.join(ASSETS_DIR, 'audio/beeps.ogg'));

  let workerRes = null;
  const sandbox = {
    Worker: class DummyWorker {},
    self: { postMessage: (msg, transfer) => { workerRes = { msg, transfer }; } },
    postMessage: (msg, transfer) => { workerRes = { msg, transfer }; },
    WebAssembly, console, setTimeout, clearTimeout,
    Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array,
    Float32Array, Float64Array, ArrayBuffer, DataView, Promise, Map, Set, WeakMap,
    BigInt, Math, Object, String, Number, Error,
    URL: { createObjectURL: () => 'blob:mock' },
    Blob: class {},
    onmessage: null
  };
  sandbox.self = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  await sandbox.onmessage({
    data: {
      buffer: oggBuffer.buffer.slice(oggBuffer.byteOffset, oggBuffer.byteOffset + oggBuffer.byteLength)
    }
  });

  const passed = workerRes.msg.samplesDecoded > 0 && workerRes.msg.channelData?.length > 0;
  console.log(`    ✓ Decoded samples: ${workerRes.msg.samplesDecoded}`);
  console.log(`    ✓ Sample rate: ${workerRes.msg.sampleRate} Hz`);
  console.log(`    ✓ Audio channels: ${workerRes.msg.channelData.length} (Channel 0 Float32 length: ${workerRes.msg.channelData[0].length})`);
  console.log(`    ✓ Transferred buffers: ${workerRes.transfer.length}`);
  if (!passed) throw new Error('audioworker verification failed');
  return true;
}

// ----------------------------------------------------
// 3. EXR Worker Verification (OpenEXR Parsing)
// ----------------------------------------------------
async function testExrWorker() {
  console.log('\n>>> [3/4] Testing exrworker-41cbee65.js...');
  const exrData = fs.readFileSync(path.join(ASSETS_DIR, 'images/cubes_env.exr'));
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/aces', 'Content-Length': exrData.length });
    res.end(exrData);
  });

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  try {
    const code = fs.readFileSync(path.join(ASSETS_DIR, 'exrworker-41cbee65.js'), 'utf8');
    let workerRes = null;
    const sandbox = {
      fetch, Request, Response, Headers, ReadableStream,
      ProgressEvent: class ProgressEvent { constructor(type, init) { this.loaded = init?.loaded || 0; this.total = init?.total || 0; } },
      TextDecoder, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array,
      Float32Array, Float64Array, ArrayBuffer, DataView, Promise, Map, Set, WeakMap,
      Math, Object, String, Number, Error, console, setTimeout, clearTimeout,
      postMessage: (msg, transfer) => { workerRes = { msg, transfer }; },
      onmessage: null
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    sandbox.onmessage({ data: { url: `http://127.0.0.1:${port}/cubes_env.exr` } });

    await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (workerRes) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(interval); reject(new Error('EXR worker timeout')); }, 5000);
    });

    const passed = workerRes.msg.width > 0 && workerRes.msg.height > 0 && workerRes.msg.data;
    console.log(`    ✓ Dimensions: ${workerRes.msg.width}x${workerRes.msg.height}`);
    console.log(`    ✓ Texture format: ${workerRes.msg.format} (RGBAFormat), Type: ${workerRes.msg.type} (HalfFloatType)`);
    console.log(`    ✓ ColorSpace: "${workerRes.msg.colorSpace}"`);
    console.log(`    ✓ Data array: ${workerRes.msg.data.constructor.name} [${workerRes.msg.data.length} elements]`);
    console.log(`    ✓ Transferred buffers: ${workerRes.transfer.length}`);
    if (!passed) throw new Error('exrworker verification failed');
    return true;
  } finally {
    server.close();
  }
}

// ----------------------------------------------------
// 4. Bitmap Worker Verification (ImageBitmap Loader)
// ----------------------------------------------------
async function testBitmapWorker() {
  console.log('\n>>> [4/4] Testing bitmapworker-046527f8.js...');
  const pngData = fs.readFileSync(path.join(ASSETS_DIR, 'images/perlin-datatexture.png'));
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': pngData.length });
    res.end(pngData);
  });

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  try {
    const code = fs.readFileSync(path.join(ASSETS_DIR, 'bitmapworker-046527f8.js'), 'utf8');
    let workerRes = null;
    let bitmapOptionsPassed = null;

    const sandbox = {
      fetch, Request, Response, Headers, ReadableStream,
      createImageBitmap: async (blob, options) => {
        bitmapOptionsPassed = options;
        return { width: 64, height: 64, close: () => {} };
      },
      ProgressEvent: class ProgressEvent {},
      TextDecoder, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array,
      Float32Array, Float64Array, ArrayBuffer, DataView, Promise, Map, Set, WeakMap,
      Math, Object, String, Number, Error, console, setTimeout, clearTimeout,
      postMessage: (msg, transfer) => { workerRes = { msg, transfer }; },
      onmessage: null
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    sandbox.onmessage({
      data: {
        url: `http://127.0.0.1:${port}/perlin-datatexture.png`,
        flipY: true
      }
    });

    await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (workerRes) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(interval); reject(new Error('Bitmap worker timeout')); }, 5000);
    });

    const passed = workerRes.msg.bitmap && workerRes.msg.bitmap.width > 0;
    console.log(`    ✓ createImageBitmap options:`, bitmapOptionsPassed);
    console.log(`    ✓ Returned ImageBitmap: ${workerRes.msg.bitmap.width}x${workerRes.msg.bitmap.height}`);
    console.log(`    ✓ Transferred bitmap handles: ${workerRes.transfer.length}`);
    if (!passed) throw new Error('bitmapworker verification failed');
    return true;
  } finally {
    server.close();
  }
}

// ----------------------------------------------------
// Run All Verifications
// ----------------------------------------------------
async function main() {
  try {
    await testMsdfWorker();
    await testAudioWorker();
    await testExrWorker();
    await testBitmapWorker();
    console.log('\n====================================================');
    console.log('  STATUS: ALL 4 WEB WORKERS SUCCESSFULLY VERIFIED');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\nVerification failed:', err);
    process.exit(1);
  }
}

main();
