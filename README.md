# Igloo Inc. — 3D Web Experience (Reconstruction)

A fully local, reverse-engineered reconstruction of the official **Igloo Inc.** website ([https://www.igloo.inc/](https://www.igloo.inc/)), the holding company behind **Pudgy Penguins** and **OverpassIP**.

---

## Quick Start

### Option 1: Zero-Dependency Python Server (Recommended)
```bash
python server.py 3000
```
Then open: [http://localhost:3000](http://localhost:3000)

### Option 2: Node / Vite Dev Server
```bash
npm install
npm run dev
```

---

## Included Artifacts

* **`index.html`**: The full production single-page application with patched local asset routing.
* **`preview.html`**: A standalone, self-contained interactive 3D WebGL showcase replicating the SSS icy igloo dome, rotating shards, interactive floating portfolio cubes (Pudgy Penguins & OverpassIP), manifesto banner, and real-time volumetric GPGPU particle morphing engine.
* **`assets/`**:
  * **Core Bundles**: `index-2e130bc1.js`, `App3D-d68cb154.js`.
  * **4 Dedicated Web Workers**: `audioworker`, `msdfworker`, `bitmapworker`, `exrworker`.
  * **Geometries**: 18 Draco-compressed 3D mesh files (`.drc`).
  * **Textures**: 67 Basis-Universal KTX2 GPU textures (`.ktx2`).
  * **Volumetric SDFs**: 3D density fields for Pudgy Penguin (Peaches), X / Twitter, and Medium.
  * **Audio**: 18 spatial and interactive `.ogg` sound assets.

---

## Reverse Engineering Highlights

* **Creative Agency**: Abeto ([https://abeto.co](https://abeto.co)).
* **Graphics Stack**: Three.js r165 + `pmndrs/postprocessing` + custom Subsurface Scattering shader (NVIDIA GPU Gems) + N8 Bicubic filtering.
* **UI & Animation**: Svelte + GSAP 3 (Club GSAP custom Bezier easings).
* **Typography**: IBM Plex Mono Medium rendered off-thread via Multi-channel Signed Distance Field (MSDF) workers.
