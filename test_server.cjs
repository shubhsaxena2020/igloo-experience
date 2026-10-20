const http = require('http');

const baseUrl = 'http://127.0.0.1:3333';

function fetchUrl(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, { method: options.method || 'GET' }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: Buffer.concat(chunks),
          text() { return this.data.toString('utf8'); }
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const tests = [
    { url: '/', expectedStatus: 200, expectedMime: 'text/html', desc: 'Root path /' },
    { url: '/index.html', expectedStatus: 200, expectedMime: 'text/html', desc: 'Static /index.html' },
    { url: '/preview.html', expectedStatus: 200, expectedMime: 'text/html', desc: 'Standalone /preview.html' },
    { url: '/portfolio/pudgy-penguins', expectedStatus: 200, expectedMime: 'text/html', desc: 'SPA fallback /portfolio/pudgy-penguins' },
    { url: '/portfolio/overpass', expectedStatus: 200, expectedMime: 'text/html', desc: 'SPA fallback /portfolio/overpass' },
    { url: '/assets/index-2e130bc1.js', expectedStatus: 200, expectedMime: 'application/javascript', desc: 'JS bundle index-2e130bc1.js' },
    { url: '/assets/App3D-d68cb154.js', expectedStatus: 200, expectedMime: 'application/javascript', desc: 'JS chunk App3D-d68cb154.js' },
    { url: '/assets/libs/draco/draco_decoder.wasm', expectedStatus: 200, expectedMime: 'application/wasm', desc: 'WASM binary draco_decoder.wasm' },
    { url: '/assets/libs/basis/basis_transcoder.wasm', expectedStatus: 200, expectedMime: 'application/wasm', desc: 'WASM binary basis_transcoder.wasm' },
    { url: '/assets/geometries/igloo.drc', expectedStatus: 200, expectedMime: 'application/octet-stream', desc: 'Draco geometry igloo.drc' },
    { url: '/assets/images/floor_color.ktx2', expectedStatus: 200, expectedMime: 'image/ktx2', desc: 'KTX2 texture floor_color.ktx2' },
    { url: '/assets/images/ui/logo-datatexture.ktx2', expectedStatus: 200, expectedMime: 'image/ktx2', desc: 'KTX2 UI logo-datatexture.ktx2' },
    { url: '/assets/audio/wind.ogg', expectedStatus: 200, expectedMime: 'audio/ogg', desc: 'Audio wind.ogg' },
    { url: '/assets/audio/beeps.ogg', expectedStatus: 200, expectedMime: 'audio/ogg', desc: 'Audio beeps.ogg' },
    { url: '/assets/IBMPlexMono-Regular-d3034935.woff2', expectedStatus: 200, expectedMime: 'font/woff2', desc: 'Font woff2' },
    { url: '/assets/IBMPlexMono-Regular-419d45f6.woff', expectedStatus: 200, expectedMime: 'font/woff', desc: 'Font woff' },
    { url: '/assets/favicon32-af94112f.png', expectedStatus: 200, expectedMime: 'image/png', desc: 'Image PNG favicon32' },
    { url: '/assets/images/social.jpg', expectedStatus: 200, expectedMime: 'image/jpeg', desc: 'Image JPG social.jpg' }
  ];

  console.log('=== RUNNING HTTP & MIME TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await fetchUrl(t.url);
      const contentType = res.headers['content-type'] || '';
      const corsOrigin = res.headers['access-control-allow-origin'];
      const coop = res.headers['cross-origin-opener-policy'];
      const coep = res.headers['cross-origin-embedder-policy'];

      const statusPass = res.status === t.expectedStatus;
      const mimePass = contentType.startsWith(t.expectedMime);
      const corsPass = corsOrigin === '*';
      const coopPass = coop === 'same-origin';
      const coepPass = coep === 'require-corp';

      if (statusPass && mimePass && corsPass && coopPass && coepPass) {
        console.log(`[PASS] ${t.desc}`);
        console.log(`       Status: ${res.status} | Content-Type: ${contentType} | Size: ${res.data.length}B`);
        console.log(`       Security Headers: CORS=${corsOrigin}, COOP=${coop}, COEP=${coep}`);
        passed++;
      } else {
        console.error(`[FAIL] ${t.desc}`);
        console.error(`       Status: ${res.status} (expected ${t.expectedStatus})`);
        console.error(`       Content-Type: ${contentType} (expected ${t.expectedMime})`);
        console.error(`       CORS: ${corsOrigin}, COOP: ${coop}, COEP: ${coep}`);
        failed++;
      }
    } catch (err) {
      console.error(`[ERROR] ${t.desc}: ${err.message}`);
      failed++;
    }
  }

  // Test OPTIONS method
  console.log('\n=== TESTING OPTIONS CORS PREFLIGHT ===');
  const optRes = await fetchUrl('/', { method: 'OPTIONS' });
  const optCors = optRes.headers['access-control-allow-origin'];
  const optMethods = optRes.headers['access-control-allow-methods'];
  if (optRes.status === 200 && optCors === '*' && optMethods) {
    console.log(`[PASS] OPTIONS / -> Status: ${optRes.status}, Allow-Methods: ${optMethods}, CORS: ${optCors}`);
    passed++;
  } else {
    console.error(`[FAIL] OPTIONS / -> Status: ${optRes.status}, Methods: ${optMethods}, CORS: ${optCors}`);
    failed++;
  }

  // SPA Route Matching Verification
  console.log('\n=== VERIFYING SPA ROUTING FALLBACKS ===');
  const indexRes = await fetchUrl('/index.html');
  const indexHtml = indexRes.text();

  const spaRoutes = [
    '/portfolio/pudgy-penguins',
    '/portfolio/overpass'
  ];

  for (const route of spaRoutes) {
    const spaRes = await fetchUrl(route);
    const spaHtml = spaRes.text();
    const matches = spaHtml === indexHtml;
    if (spaRes.status === 200 && matches) {
      console.log(`[PASS] Route '${route}' returned 200 OK and index.html identical content (${spaHtml.length} bytes)`);
      passed++;
    } else {
      console.error(`[FAIL] Route '${route}' status: ${spaRes.status}, identical to index.html: ${matches}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);
}

run();
