const fs = require('fs');
const path = require('path');
const http = require('http');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath.replace(/\\/g, '/'));
    }
  });
  return arrayOfFiles;
}

const allAssetFiles = getAllFiles('assets');
console.log(`Total local physical asset files in assets/: ${allAssetFiles.length}`);

// Test every single asset via HTTP on server.py
async function checkAllAssetsOverHttp() {
  console.log(`Verifying all ${allAssetFiles.length} physical assets over HTTP...`);
  let ok = 0;
  let errors = 0;

  for (const file of allAssetFiles) {
    const urlPath = '/' + file;
    await new Promise((resolve) => {
      http.get('http://127.0.0.1:3333' + urlPath, (res) => {
        if (res.statusCode === 200) {
          ok++;
        } else {
          console.error(`HTTP ERROR ${res.statusCode} for ${urlPath}`);
          errors++;
        }
        res.resume();
        resolve();
      }).on('error', (err) => {
        console.error(`REQUEST ERROR for ${urlPath}: ${err.message}`);
        errors++;
        resolve();
      });
    });
  }

  console.log(`HTTP Verification: ${ok} files returned 200 OK, ${errors} errors.`);
}

// Check references in index-2e130bc1.js and App3D-d68cb154.js
function analyzeReferences() {
  const bundles = [
    'index.html',
    'preview.html',
    'assets/index-2e130bc1.js',
    'assets/App3D-d68cb154.js',
    'assets/audioworker-036a09db.js',
    'assets/msdfworker-ac346fa7.js',
    'assets/bitmapworker-046527f8.js',
    'assets/exrworker-41cbee65.js'
  ];

  const localFileSet = new Set(allAssetFiles.map(f => '/' + f));
  const localBaseSet = new Set(allAssetFiles.map(f => path.basename(f)));

  console.log('\nAnalyzing asset references in bundles...');
  const referencedAssets = new Set();
  const fileExts = /\.(drc|ktx2|ogg|wasm|woff2?|png|jpg|js)/i;

  for (const b of bundles) {
    if (!fs.existsSync(b)) continue;
    const content = fs.readFileSync(b, 'utf8');
    // Find strings matching paths or filenames
    const matches = content.match(/["'`]([a-zA-Z0-9_\-\.\/]+?\.(?:drc|ktx2|ogg|wasm|woff2?|png|jpg|js))["'`]/g) || [];
    for (const m of matches) {
      const clean = m.slice(1, -1);
      if (fileExts.test(clean)) {
        referencedAssets.add(clean);
      }
    }
  }

  console.log(`Found ${referencedAssets.size} asset strings in code.`);
  let foundCount = 0;
  let missing = [];

  for (const ref of referencedAssets) {
    const base = path.basename(ref);
    if (localBaseSet.has(base)) {
      foundCount++;
    } else {
      missing.push(ref);
    }
  }

  console.log(`Referenced assets present locally: ${foundCount}`);
  if (missing.length > 0) {
    console.log(`Unmatched references:`, missing);
  }
}

async function main() {
  await checkAllAssetsOverHttp();
  analyzeReferences();
}

main();
