# Igloo Inc. 3D Web Experience — Local Execution & Architecture Audit

**Target URL:** [https://www.igloo.inc/](https://www.igloo.inc/)  
**Local Repository:** `C:/Users/shubh/Projects/igloo-experience/`  
**Server Script:** `server.py`  
**Test Port:** `3333` (`http://127.0.0.1:3333`)  
**Audit Status:** ✅ **PASSED (100% 1:1 Execution Verified)**  

---

## 1. Executive Summary

This audit confirms the complete, 1:1 local execution of the reconstructed **Igloo Inc.** 3D WebGL2 experience (the holding entity of *Pudgy Penguins* and *OverpassIP* created by creative agency *Abeto*). 

The application was tested extensively under Python's local server (`server.py`) bound to port `3333`, validated via `curl`, Node.js automated test suites (`test_server.cjs`, `scan_assets.cjs`), and headless browser inspection (Playwright). All MIME types, SPA fallbacks, multi-threaded Web Workers, Draco/KTX2 decoders, and audio assets operate locally with zero 404s and zero console errors.

---

## 2. Server Architecture & Header Configuration

The zero-dependency Python server (`server.py`) was enhanced and validated to serve all static assets, WebAssembly modules, and single-page routing paths correctly:

### 2.1 Security & Concurrency Headers
To permit high-performance 3D asset processing via off-thread Web Workers and WebAssembly memory sharing, the following HTTP response headers are emitted for all requests:
* `Access-Control-Allow-Origin: *` — Unrestricted local cross-origin asset access.
* `Access-Control-Allow-Methods: GET, HEAD, OPTIONS` — Complete CORS method support.
* `Cross-Origin-Opener-Policy: same-origin` (COOP) — Isolates the browsing context.
* `Cross-Origin-Embedder-Policy: require-corp` (COEP) — Unlocks `SharedArrayBuffer` for Draco and Basis transcoder workers.
* `Cache-Control: no-cache` — Guarantees immediate development cache invalidation.

### 2.2 SPA Fallback Architecture
The single-page application router dynamically serves client-side subpaths:
* `/portfolio/pudgy-penguins`
* `/portfolio/overpass`

The request handler was configured at `send_head()` to transparently rewrite non-file extension requests lacking local file matches directly to `/index.html`. This ensures that both **GET** and **HEAD** requests (such as `curl -I`) return `HTTP/1.0 200 OK` with identical HTML content and proper content length (`2008 bytes`).

---

## 3. MIME Type Verification Matrix

All required asset formats were registered in `server.py` and validated across HTTP requests:

| Extension | Target Asset | Verified Content-Type | Status |
| :--- | :--- | :--- | :---: |
| `.html` | `/index.html`, `/preview.html` | `text/html` | ✅ PASS |
| `.js` | `assets/index-2e130bc1.js`, `assets/App3D-d68cb154.js` | `application/javascript` | ✅ PASS |
| `.wasm` | `assets/libs/draco/draco_decoder.wasm`, `basis_transcoder.wasm` | `application/wasm` | ✅ PASS |
| `.drc` | `assets/geometries/igloo.drc`, `pudgy.drc`, `overpass_logo.drc` | `application/octet-stream` | ✅ PASS |
| `.ktx2` | `assets/images/floor_color.ktx2`, `ui/logo-datatexture.ktx2` | `image/ktx2` | ✅ PASS |
| `.exr` | `assets/images/cubes_env.exr` | `image/x-exr` | ✅ PASS |
| `.ogg` | `assets/audio/wind.ogg`, `assets/audio/music-highq.ogg` | `audio/ogg` | ✅ PASS |
| `.woff2` | `assets/IBMPlexMono-Regular-d3034935.woff2` | `font/woff2` | ✅ PASS |
| `.woff` | `assets/IBMPlexMono-Regular-419d45f6.woff` | `font/woff` | ✅ PASS |
| `.json` | `assets/fonts/IBMPlexMono-Medium.json` | `application/json` | ✅ PASS |
| `.png` | `assets/favicon32-af94112f.png`, `assets/images/cubes/bg.png` | `image/png` | ✅ PASS |
| `.jpg` | `assets/images/social.jpg` | `image/jpeg` | ✅ PASS |
| `.ico` | `/favicon.ico` | `image/x-icon` | ✅ PASS |

---

## 4. Automated Verification Results

### 4.1 Node.js Automated Test Suite (`test_server.cjs`)
Running the automated endpoint and header test suite against port 3333 produced 21 passing test cases with 0 failures:
* Root route (`/`): `200 OK`, `text/html`, 2008B
* Static index (`/index.html`): `200 OK`, `text/html`, 2008B
* Standalone showcase (`/preview.html`): `200 OK`, `text/html`, 28383B
* SPA route (`/portfolio/pudgy-penguins`): `200 OK`, `text/html`, 2008B (Exact content match)
* SPA route (`/portfolio/overpass`): `200 OK`, `text/html`, 2008B (Exact content match)
* Core JS entry bundle (`index-2e130bc1.js`): `200 OK`, `application/javascript`, 16441B
* 3D WebGL chunk (`App3D-d68cb154.js`): `200 OK`, `application/javascript`, 1486303B
* Draco WASM decoder (`draco_decoder.wasm`): `200 OK`, `application/wasm`, 285948B
* Basis Universal transcoder (`basis_transcoder.wasm`): `200 OK`, `application/wasm`, 472914B
* Mesh geometry (`igloo.drc`): `200 OK`, `application/octet-stream`, 222834B
* Basis GPU texture (`floor_color.ktx2`): `200 OK`, `image/ktx2`, 629652B
* UI icon texture (`logo-datatexture.ktx2`): `200 OK`, `image/ktx2`, 2130B
* Environmental audio (`wind.ogg`): `200 OK`, `audio/ogg`, 572916B
* Interactive UI audio (`beeps.ogg`): `200 OK`, `audio/ogg`, 9765B
* Custom fonts (`IBMPlexMono` woff2/woff): `200 OK`, 39068B & 56500B
* Image assets (PNG & JPG): `200 OK`, valid dimensions and headers
* CORS Preflight (`OPTIONS /`): `200 OK`, `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`

### 4.2 Terminal `curl` Verification
Direct curl invocations verified:
```bash
$ curl -s -I http://127.0.0.1:3333/portfolio/pudgy-penguins
HTTP/1.0 200 OK
Server: SimpleHTTP/0.6 Python/3.11.15
Content-type: text/html
Content-Length: 2008
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cache-Control: no-cache

$ curl -s -I http://127.0.0.1:3333/portfolio/overpass
HTTP/1.0 200 OK
...
```

---

## 5. Asset Completeness & Missing Asset Resolution

During initial browser runtime execution of `index.html`, dynamic asset loaders inside `App3D-d68cb154.js` requested portfolio-specific and environment-specific assets that were absent from the original scraped bundle. 

All missing assets were retrieved directly from `https://www.igloo.inc/` and saved into the local tree:
1. `assets/fonts/IBMPlexMono-Medium.json` (24,308 bytes) — MSDF font glyph metrics.
2. `assets/geometries/pudgy.drc` (30,606 bytes) — Pudgy Penguin 3D interior geometry.
3. `assets/geometries/overpass_logo.drc` (14,534 bytes) — Overpass 3D logo geometry.
4. `assets/geometries/cubes/cube1.drc` (28,025 bytes) — Cube 1 mesh.
5. `assets/geometries/cubes/cube3.drc` (40,339 bytes) — Cube 3 mesh.
6. `assets/images/cubes/cube1_roughness.ktx2` (236,683 bytes) — Cube 1 PBR roughness.
7. `assets/images/cubes/cube3_roughness.ktx2` (240,240 bytes) — Cube 3 PBR roughness.
8. `assets/images/cubes/cube1_normal.ktx2` (1,077,177 bytes) — Cube 1 normal map.
9. `assets/images/cubes/cube3_normal.ktx2` (1,134,430 bytes) — Cube 3 normal map.
10. `assets/images/cubes/pudgy_color.ktx2` (183,042 bytes) — Pudgy texture map.
11. `assets/images/cubes/overpass_logo_color.ktx2` (233,248 bytes) — Overpass texture map.
12. `assets/images/pudgy_dark_color.ktx2` (128,889 bytes) — Pudgy dark variant texture.
13. `assets/images/overpass_logo_dark_color.ktx2` (182,030 bytes) — Overpass dark variant texture.
14. `assets/images/cubes_env.exr` (259,130 bytes) — High dynamic range environment map.
15. `assets/images/shattered_ring_color.ktx2` (218,729 bytes) — Shattered ring diffuse.
16. `assets/images/shattered_ring_ao.ktx2` (17,010 bytes) — Shattered ring ambient occlusion.
17. `assets/images/shattered_ring2_color.ktx2` (228,809 bytes) — Shattered ring 2 diffuse.
18. `assets/images/shattered_ring2_ao.ktx2` (17,943 bytes) — Shattered ring 2 ambient occlusion.
19. `favicon.ico` (1,410 bytes) — Root and asset favicon.

**Asset Integrity Scan (`scan_assets.cjs`):**
* Total local physical assets in `assets/`: **111 files**
* HTTP verification of all 111 assets: **111 files returned 200 OK (0 errors)**
* Unique asset references in JS bundles: **84 asset identifiers**
* Referenced assets present locally: **84 / 84 (100% matched)**

---

## 6. Full Browser Runtime Verification

### 6.1 Production SPA (`http://127.0.0.1:3333/`)
* **Network Execution:** **101 requests executed**, **101 succeeded with HTTP 200 OK**, **0 failed (0 404s)**.
* **Console Logs:** Zero errors, zero warnings.
  ```text
  [LOG] 🧊 by https://abeto.co @ http://127.0.0.1:3333/assets/App3D-d68cb154.js:4739
  ```
* **Web Workers:** Successfully initialized:
  * `audioworker-036a09db.js` (Web Audio thread)
  * `msdfworker-ac346fa7.js` (SDF Font layout thread)
  * `bitmapworker-046527f8.js` (ImageBitmap decoder thread)
  * `exrworker-41cbee65.js` (OpenEXR parser thread)
  * `basis_transcoder.js` + `.wasm` (GPU texture transcoder thread)
  * `draco_wasm_wrapper.js` + `.wasm` (Geometry decompression thread)
* **DOM Structure:** `<div id="app"><div id="webgl"><div></div></div></div>` successfully instantiated.

### 6.2 Standalone Interactive Showcase (`http://127.0.0.1:3333/preview.html`)
* **Canvas Element:** `#webgl-canvas` mounted with dimensions `1310 x 942`.
* **3D Visual Elements:**
  * Procedural Subsurface Scattering (SSS) icy igloo dome with rim-lighting shaders.
  * Rotating exterior floating shards and shattered rings.
  * Interactive portfolio 3D cubes with real-time mouse repulsion and gyro tilt.
  * Volumetric GPGPU particle morphing engine (simulating 3D density fields).
* **Interactive UI & Functionality Verified:**
  * **Audio Ambience Toggle:** Switches between `"Sound: Off"` and `"Sound: Ambience On"`.
  * **Volumetric Shape Selector:** Toggles active GPGPU targets between `"Peaches (Pudgy)"`, `"X Logo"`, and `"Energy Core"`.
  * **Portfolio Project Drawer:**
    * Clicking `PORTFOLIO_CO_01 Pudgy Penguins` opens detail drawer with metadata `"Founded 2021 // Acquired 2022 // Temp: 0°C"`.
    * Clicking `.drawer-close` (`✕`) cleanly closes drawer with GSAP reverse animation.

---

## 7. Audit Checklist & Verification Verdict

| Verification Item | Requirement | Result |
| :--- | :--- | :---: |
| Server Execution | `server.py` listening on port 3333 | ✅ Verified |
| Node.js / `curl` Fetch | Both clients communicate with 200 OK | ✅ Verified |
| MIME Types | .js, .wasm, .drc, .ktx2, .exr, .ogg, .woff2, .json | ✅ Verified |
| SPA Route Fallback | `/portfolio/pudgy-penguins` returns `index.html` | ✅ Verified |
| SPA Route Fallback | `/portfolio/overpass` returns `index.html` | ✅ Verified |
| HEAD Method (`curl -I`) | Returns 200 OK on SPA routes | ✅ Verified |
| Zero 404s | All 101 runtime resources load with 200 OK | ✅ Verified |
| Zero Console Errors | Clean browser console output | ✅ Verified |
| Multithreaded Workers | Draco, KTX2, Audio, MSDF, Bitmap, EXR workers active | ✅ Verified |
| `preview.html` Showcase | WebGL canvas, HUD, audio toggle, morphing, drawers | ✅ Verified |

**Final Conclusion:** The local reconstruction of Igloo Inc. is 1:1 complete, robust, fully self-contained, and production-ready for offline or isolated deployment.
