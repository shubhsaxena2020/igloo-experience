# Reverse Engineering & Architecture Specification: Cubes Scene (class `aF`)

> **Source**: `C:/Users/shubh/Projects/igloo-experience/assets/App3D-d68cb154.js`  
> **Target**: [Igloo Inc. Official Experience](https://www.igloo.inc/)  
> **Key Scene Classes**: `aF` (CubesScene), `nF` (CubeItem), `WL` (CubeMaterial), `jL` (MouseFrost), `JL` (AdvectionShader), `rF` (BackgroundShapes), `k3` (Background), `z3` (BlurryText), `sF` (Plexus), `KL` (HUD & Temp Info)

---

## 1. Scene Overview & Execution Flow

The **Cubes Scene** (`class aF`) is the secondary portfolio showcase in the Igloo 3D experience, responsible for displaying interactive, photorealistic melting ice cubes enclosing corporate assets (`Pudgy Penguins` and `OverpassIP`).

```
                              ┌────────────────────────────────────────┐
                              │            aF (Cubes Scene)            │
                              └───────────────────┬────────────────────┘
                                                  │
                 ┌────────────────────────────────┼─────────────────────────────────┐
                 │                                │                                 │
     ┌───────────▼──────────┐        ┌────────────▼───────────┐         ┌───────────▼──────────┐
     │      Background      │        │ Floating Shapes (rF)   │         │    Portfolio Cubes   │
     │   k3 (Dual-Perlin    │        │  cubes/background_     │         │   nF (0: Pudgy,      │
     │   + Dot Grid + Noise)│        │  shapes.drc + KTX2     │         │       1: Overpass)   │
     └──────────────────────┘        └────────────────────────┘         └───────────┬──────────┘
                                                                                    │
                                               ┌────────────────────────────────────┼───────────────────────────┐
                                               │                                    │                           │
                                    ┌──────────▼─────────┐              ┌───────────▼──────────┐    ┌───────────▼───────────┐
                                    │    Outer Ice Box   │              │     Inner Object     │    │   Fluid Interaction   │
                                    │ WL (Transmissive   │              │  mesh3: pudgy /      │    │ jL + JL (Ping-Pong    │
                                    │ PBR + Chrom. Aber.)│              │  overpass_logo.drc   │    │ Advect & Splat)       │
                                    └────────────────────┘              └──────────────────────┘    └───────────────────────┘
```

### Scene Initialization Parameters
- **Vertical Offset**: `-5.75` units per cube.
- **Scroll Mapping**: `camera.basePosition.y = camera.initialPosition.y + (cubes.length + 1) * verticalOffset * progress`.
- **Camera Configuration**:
  - `basePosition`: `vec3(0, 0, 5)`
  - `baseTarget`: `vec3(0, 0, 0)`
  - `displacement.position`: `vec2(0.1, 0.05)` (subtle pointer parallax)
  - `shake`: `0.02`, `shakeSpeed`: `0.1` (procedural micro-wobble)
  - `fov`: Dynamic FOV: `45.0 - 5.0 * abs(controller.scroll.velocity)` (zooms outward during fast scroll)
  - `zoom`: Responsive zoom: `min(1.0, screen.aspectRatio * 1.25)`

---

## 2. The Two Portfolio Cubes (`Be.cubes`)

The cubes array is defined in `Be.cubes` with exact asset bindings, physical dimensions, and editorial content:

### Cube 0: `PORTFOLIO_CO_01 Pudgy Penguins`
- **Identifier**: `cube3`
- **Hash / Route**: `pudgy-penguins` (`/portfolio/pudgy-penguins`)
- **Date**: `01/02/2020`
- **Base Temperature**: `0.0°C` (`32.0°F`)
- **Scroll Position**: `(1 + 0) * -5.75 = -5.75`
- **Centered Progress**: `-5.75 / ((2 + 1) * -5.75) = 1/3 ≈ 0.3333`
- **Outer Geometry**: `assets/geometries/cubes/cube3.drc`
- **Inner Object**: `assets/geometries/pudgy.drc` (`pudgy`, scale `1.1`)
- **Inner Texture**: `assets/images/cubes/pudgy_color.ktx2`
- **Roughness Map**: `assets/images/cubes/cube3_roughness.ktx2`
- **Normal Map**: `assets/images/cubes/cube3_normal.ktx2`
- **Summary**:
  > Pudgy Penguins, a creative venture founded in 2021, quickly gained attention for its unique IP and engaging community. In 2022, the company was acquired by Igloo Inc., a strategic move aimed at expanding its reach and capabilities...
- **Socials**: X (`@pudgypenguins`), IG (`@pudgypenguins`), LI (`pudgy-penguins`), TK (`@pudgypenguins`)
- **Web Link**: `https://www.pudgypenguins.com`

### Cube 1: `PORTFOLIO_CO_02 Overpass`
- **Identifier**: `cube1`
- **Hash / Route**: `overpass` (`/portfolio/overpass`)
- **Date**: `06/01/2023`
- **Base Temperature**: `-3.0°C` (`26.6°F`)
- **Scroll Position**: `(1 + 1) * -5.75 = -11.50`
- **Centered Progress**: `-11.50 / ((2 + 1) * -5.75) = 2/3 ≈ 0.6667`
- **Outer Geometry**: `assets/geometries/cubes/cube1.drc`
- **Inner Object**: `assets/geometries/overpass_logo.drc` (`overpass_logo`, scale `1.2`)
- **Inner Texture**: `assets/images/cubes/overpass_logo_color.ktx2`
- **Roughness Map**: `assets/images/cubes/cube1_roughness.ktx2`
- **Normal Map**: `assets/images/cubes/cube1_normal.ktx2`
- **Summary**:
  > OverpassIP was established as a solution to a significant licensing challenge faced by Pudgy Penguins, marking its inception with a crucial breakthrough in NFT licensing. The company empowers NFT holders by allowing them to submit their digital assets for potential licensing opportunities...
- **Socials**: X (`@OverpassIP`)
- **Web Link**: `https://www.overpassip.com`

---

## 3. Cube Material & Refraction Optics (`class WL`)

The outer ice cube is rendered with a heavily customized `MeshPhysicalMaterial` (`Ys`) incorporating:
1. **Volumetric Refraction & Multi-Sampled Chromatic Aberration**:
   - `AWESOME_SAMPLES`: 3 passes.
   - Blue noise jitter (`noises/blue-8-128-rgb.ktx2`) offsets each sample ray.
   - Refraction ray exit calculated in world space via `refract(-v, normalize(n), 1.0 / ior)`.
   - Separate dispersion scaling per color channel:
     - Red: `ior`
     - Green: `ior * (1.0 + chromaticAberration * (i + noise.r) / 3.0)`
     - Blue: `ior * (1.0 + 2.0 * chromaticAberration * (i + noise.b) / 3.0)`
   - Sampling utilizes **N8 Mipped Bicubic Texture Filtering** across the transmission render target mipmaps.
2. **Two-Pass Transmission Multiplexing**:
   - In `aF.update()`:
     - **Pass 1 (Transmission Capture)**:
       - Cube material set to `BackSide` (`ei = 1`).
       - `tTransmissionSamplerMap` bound to static `cubes/bg.png` (`_bgTex`).
       - Inner object (`mesh3`) set to `visible = true`.
       - Smoke plane (`mesh2`), plexus particles, HUD texts set to `visible = false`.
       - Render full scene to `_transmissionRT` (HalfFloatType render target).
     - **Pass 2 (Screen Composite)**:
       - Cube material set to `FrontSide` (`es = 0`).
       - `tTransmissionSamplerMap` bound to `_transmissionRT.texture`.
       - Inner object (`mesh3`) set to `visible = false` (its refracted image is already captured in `_transmissionRT`).
       - Foreground elements (`mesh2`, plexus, HUD, shapes) set to `visible = true`.
       - Render to screen / post-processing pipeline.
3. **Micro-Crystal Sparkling**:
   - Uniform `tTriangles`: `igloo/triangles_tiling.ktx2` tiled at `vNormalMapUv * (9.0 * min(1.0, resolution.y / 1300.0))`.
   - `totalEmissiveRadiance += triangles * mousefrostrim * 10.0 + triangles * pow(mousefrost, 2.0)`.

---

## 4. Fluid Simulation Overlay & Mouse Splat (`class JL` & `jL`)

Each cube maintains its own high-resolution 2D fluid simulation buffer:
- **Buffer Format**: Ping-pong pair of two `512x512` `WebGLRenderTarget`s with `HalfFloatType` (`Mi`), `depthBuffer: false`.
- **Vector Flow Noise**: `assets/images/cubes/advect.png` (colordata repeat), an RGB tangent-space flow map.

### Ping-Pong Advection Shader (`JL`)
The simulation evaluates every frame on a `Pass.FullScreenQuad`:
```glsl
// 1. Noise-driven Advection
vec2 noiseUv = vUv;
vec2 advect = (texture2D(tAdvect, noiseUv * 3.0).xy * 2.0 - 1.0) * 1.0;
uv += advect * invResolution;

// 2. Wave Propagation (4-neighbor cross)
float wavespeed = 1.0;
vec2 offset = invResolution * wavespeed;
float l = texture2D(tBuffer, uv - vec2(offset.x, 0.0)).r;
float r = texture2D(tBuffer, uv + vec2(offset.x, 0.0)).r;
float t = texture2D(tBuffer, uv + vec2(0.0, offset.y)).r;
float b = texture2D(tBuffer, uv - vec2(0.0, offset.y)).r;
float nextVal = max(max(max(l, r), t), b);

// 3. Mouse Line Segment Splat
float radius = 0.05 * smoothstep(0.1, 1.0, uSplatRadius);
float splat = cubicIn(clamp(1.0 - line(vUv, uSplatPrevCoords.xy, uSplatCoords.xy) / radius, 0.0, 1.0));
nextVal += splat;

// 4. Damping & Rim Extraction
nextVal *= 0.985;
nextVal = min(nextVal, 1.0);
float rim = nextVal - texture2D(tBuffer, uv).r;

gl_FragColor = vec4(nextVal, rim, 0.0, 1.0);
```

### Interactive Splat Mechanics (`jL`)
- Raycasts onto the cube outer mesh using `three-mesh-bvh` (`bE.prototype.raycast = VL`).
- Extracts UV1 coordinates (`hit.uv1`) from the intersection.
- Calculates pointer velocity:
  - `e = splatPosition.distanceTo(splatLastPosition)`
  - `splatTargetVelocity += e * 6; splatTargetVelocity *= 0.88;`
  - `soundVelocity += e * 4; soundVelocity *= 0.98;`
- Shaders receive:
  - `uSplatCoords`: current UV hit
  - `uSplatPrevCoords`: previous frame UV hit
  - `uSplatRadius`: smoothed velocity `splatVelocity`
- Audio feedback:
  - `soundVelocity` drives ice-cracking audio volume: `webgl_set_audio_volume, "shard", soundVolume * 0.5`.

---

## 5. Floating Background Shapes (`class rF`)

- **Geometry**: `assets/geometries/cubes/background_shapes.drc`
- **Texture**: `assets/images/shapes_blurred.ktx2`
- **Vertex Attributes**: `position`, `color`, `centr` (pivot of each shape cluster), `primrand` (random scalar per shape).
- **Transform Pipeline**:
  - Reconstructs a static view matrix (`viewMatrixCopy`) positioned at `z = -5.0` to decouple shapes from camera perspective translations.
  - Rotates each individual primitive around its local `centr`:
    `customPos = rotation3D(vec3(0, 0, 1), uProgress * 5.0 * mix(0.1, 0.5, primrand) + time * 0.2 * primrand) * vec4(customPos, 1.0);`
  - Applies responsive horizontal offset:
    `vec3 offset = centr * vec3(clamp(aspect * 0.5, 0.65, 1.0), 1.0, 1.0); offset.y -= 5.0; customPos += offset;`
  - Vertical drift with page scroll: `customPos.y += uProgress * 10.0;`
- **Fragment Breathing**:
  - Sample red channel of blurred shape atlas.
  - Multi-harmonic sinusoidal modulation:
    `idle = sin((pos.x + pos.y) * 5.0 + time * 3.0) * cos(pos.y * 10.0 + alpha * 3.0 + time * 2.0) * sin(pos.y * 2.0 + time * 2.0);`
    `alpha = idle * 0.9 * alpha + 0.1 * alpha; alpha *= 0.65;`

---

## 6. Cold Smoke Mist & HUD Temperature Display

### Cold Smoke (`mesh2` in `nF`)
- Attached beneath each cube at `y = -0.35` (`PlaneGeometry(2.5, 3.5)`).
- Spherical billboard vertex shader: `projectionMatrix * viewMatrix * (billboardModelMatrix() * vec4(position, 1.0))`.
- Animated dual-sample noise using `wind_noise.ktx2`.
- Fades out quickly when scrolled away from center: `clamp(1.0 - abs(uProgress) * 20.0, 0.0, 1.0)`.

### Dynamic Temperature HUD (`KL` / `XL`)
- Real-time temperature simulation:
  `temp = targetTemp + sin(time * 0.05 + rand1) * 2.0`
- Displays both Celsius and Fahrenheit: `(temp * 1.8 + 32.0)`
- MSDF font glyphs sampled from `IBMPlexMono-Medium-datatexture.ktx2` and `numbers-datatexture.ktx2`.
- Positioned in 3D billboard space anchored to the top-right corner of the cube bounding box.
- Random digital beeping sound trigger (`webgl_play_audio`, `"beeps" | "beeps2" | "beeps3"`).
