# Igloo Inc. Experience — Post-Processing & Spatial Audio System Specification

> Reverse engineered from `assets/App3D-d68cb154.js` and verified with `verify_audio_and_postprocessing.cjs`.

---

## 1. Post-Processing Pipeline Architecture

The post-processing system in `App3D` is built on top of `pmndrs/postprocessing`, wrapped and coordinated by three custom classes:
- **`QU`**: Low-level ping-pong `EffectComposer` managing `renderTarget1` (`"EffectComposer.rt1"`), `renderTarget2` (`"EffectComposer.rt2"`), `copyPass`, delta timing, and pass iteration. Uses `HalfFloatType` (`RGBA16F`) render targets.
- **`tA`**: Extended composer managing multi-pass sorting and automatic resizing on window resize events (`Q.on("resize", ...)`). Enforces that any pass with `isGammaCorrectionPass = true` is sorted to render last.
- **`Fd` (Pass Builder & pmndrs Adapter)**: Subclasses `Pass` (`Dc`) and encapsulates an internal `pmndrs.EffectComposer` (`E2`). Allows chaining and configuring modular effects into individual passes.

```
Three.js Scene Render
        │
        ▼
   [RenderPass (dE)]
        │
        ▼
   [BloomPass (Fd / BloomEffect n_ + MipmapBlurPass yB)]
        │ (6-level downsampling/upsampling pyramid)
        ▼
   [Bokeh Depth of Field (Fd / DepthOfFieldEffect TB)]
        │ (CoC -> Kawase Blur -> Near/Far Bokeh Base & Fill)
        ▼
   [SMAA / FXAA Anti-Aliasing (Fd / SMAAEffect XB)]
        │ (Edge detection -> Blending weights -> Neighborhood blend)
        ▼
   [ColorSpace & ToneMapping (EffectMaterial ENCODE_OUTPUT)]
        │ (<colorspace_fragment> + <dithering_fragment>)
        ▼
   Screen Output (Canvas)
```

---

### 1.1 Bloom with 6 Levels (`BloomEffect` + `MipmapBlurPass`)

- **Class**: Subclasses `Effect` (`Bc`) with internal `MipmapBlurPass` (`yB`).
- **Configuration in Scenes**:
  - `F3` (Igloo scene): `{ debug: false, levels: 6, luminanceThreshold: 0.2, intensity: 1, radius: 0.85 }`
  - `aF` (Cubes scene): `{ debug: false, levels: 6, luminanceThreshold: 0.2, intensity: 1, radius: 0.85 }`
  - `UF` (Entry/Portals scene): `{ debug: false, levels: 6, luminanceThreshold: 0.0, intensity: 1, radius: 0.85 }`
- **6-Level Dual-Filter Algorithm (`yB`)**:
  - When `levels: 6`, generates a progressive mip chain:
    - **6 Downsampling Targets**: `Downsampling.Mipmap0` through `Downsampling.Mipmap5`.
    - **5 Upsampling Targets**: `Upsampling.Mipmap0` through `Upsampling.Mipmap4`.
  - **Downsampling**: Evaluated via `AB` (13-tap tent filter with bilinear filtering) to halve resolution per step.
  - **Upsampling**: Evaluated via `xB` (9-tap tent filter with radius `0.85`), progressively blending with matching downsampled mipmaps (`supportBuffer = downsamplingMipmaps[u].texture`).
  - Produces broad, flicker-free bloom without temporal jitter or energy loss.

---

### 1.2 Bokeh Depth of Field (`DepthOfFieldEffect`)

- **Class**: `TB` (`class extends Bc`).
- **Configuration Defaults**:
  ```javascript
  {
    resolutionScale: 0.5,       // Half resolution for performance
    worldFocusDistance: 4,      // Focus plane at 4 units
    worldFocusRange: 10,        // Transition range of 10 units
    bokehScale: 5               // Bokeh circle scale factor
  }
  ```
- **Internal Passes & Buffer Routing**:
  1. **CoC Pass (`cocPass = new Os(new CB(camera))`):** Computes signed Circle of Confusion from camera depth buffer into render target `DoF.CoC`.
  2. **CoC Blur Pass (`blurPass = new Id(...)`):** Runs Kawase blur kernel (`kernelSize: MEDIUM`) over near CoC buffer into `DoF.CoC.Blurred`.
  3. **Mask Pass (`maskPass = new Os(new MB(...))`):** Masks out near-field data to isolate far-field blur into `DoF.Masked.Far`.
  4. **Near Bokeh Passes:**
     - `bokehNearBasePass` (`new xh(false, true)`): Base bokeh disc kernel for foreground bokeh blur into `DoF.Bokeh.Near`.
     - `bokehNearFillPass` (`new xh(true, true)`): Fills gaps between kernel sample taps.
  5. **Far Bokeh Passes:**
     - `bokehFarBasePass` (`new xh(false, false)`): Base bokeh disc kernel for background bokeh into `DoF.Bokeh.Far`.
     - `bokehFarFillPass` (`new xh(true, false)`): Fills gaps for background elements.
  6. **Final Composite Shader (`bB`):** Combines input buffer with near and far bokeh buffers based on CoC values.

---

### 1.3 Anti-Aliasing: SMAA & FXAA

- **SMAA (`SMAAEffect` / `XB`)**:
  - Instantiated with preset `"HIGH"` (`so.HIGH`).
  - Color edge detection mode (`c_.COLOR`).
  - Three distinct GPU execution phases:
    1. Edge Detection: Identifies high-frequency color contrasts in the scene.
    2. Blending Weight Calculation: Searches precomputed area and search LUT textures.
    3. Neighborhood Blending: Resamples neighboring pixels to reconstruct smooth edges.
  - Flags: `renderToScreen = true`, `fullscreenMaterial.encodeOutput = true`, `isGammaCorrectionPass = true`.
- **FXAA (`FXAAEffect` / `PB`)**:
  - Subclasses `Bc` with `EDGE_THRESHOLD_MIN` and luminosity edge evaluation.
  - Used as fallback / lightweight single-pass anti-aliasing.

---

### 1.4 ToneMapping & Output Encoding

- Post-processing passes inherit from `EffectMaterial` (`JB`), which defines:
  ```glsl
  FRAGMENT_MAIN_IMAGE
  color0.a = clamp(color0.a, 0.0, 1.0);
  gl_FragColor = color0;
  #ifdef ENCODE_OUTPUT
  #include <colorspace_fragment>
  #endif
  #include <dithering_fragment>
  ```
- Any pass configuring `fullscreenMaterial.encodeOutput = true` executes `<colorspace_fragment>` and `<dithering_fragment>` on output.
- Pass sorting in `tA`:
  ```javascript
  this.passes.sort((s, n) => {
    const r = [s, n].map(a => a.isGammaCorrectionPass ? 1 : 0);
    return r[0] - r[1];
  });
  ```
  Guarantees color space encoding (linear -> sRGB) and dithering happen as the terminal step before displaying to the canvas.

---

## 2. Spatial Audio System Architecture

### 2.1 Audio Controller (`class u3`)

`u3` initializes 18 audio clips stored in `assets/audio/`, registering them into the underlying `HU` audio manager.

| Index | Name | Audio File | Default Vol | Loop | AutoPlay | Throttling | Purpose |
|---|---|---|---|---|---|---|---|
| 1 | `music-bg` | `music-highq.ogg` | 0.20 | Yes | Yes | — | Background soundtrack |
| 2 | `room-bg` | `room.ogg` | 0.45 | Yes | Yes | — | Ambient room tone / reverb |
| 3 | `wind` | `wind.ogg` | 0.00 | Yes | Yes | — | Procedural arctic wind (scroll-driven) |
| 4 | `igloo` | `igloo.ogg` | 0.00 | Yes | Yes | — | Igloo plexus proximity hum |
| 5 | `beeps` | `beeps.ogg` | 0.50 | No | No | 0.4s | Text scramble / typewriter sound 1 |
| 6 | `beeps2` | `beeps2.ogg` | 0.50 | No | No | 0.4s | Text scramble / typewriter sound 2 |
| 7 | `beeps3` | `beeps3.ogg` | 0.50 | No | No | 0.4s | Text scramble / typewriter sound 3 |
| 8 | `click-project`| `click-project.ogg`| 0.50 | No | No | — | Project cube select click |
| 9 | `enter-project`| `enter-project.ogg`| 0.50 | No | No | — | Project detail transition in |
| 10 | `leave-project`| `leave-project.ogg`| 0.50 | No | No | — | Project detail transition out |
| 11 | `shard` | `shard.ogg` | 0.00 | Yes | Yes | — | Ice crystal / frost interaction hum |
| 12 | `project-text` | `project-text.ogg` | 0.50 | No | No | — | Project title & date reveal |
| 13 | `portals` | `circles.ogg` | 0.00 | Yes | Yes | — | Portal ring passage sound |
| 14 | `particles` | `particles.ogg` | 0.00 | Yes | Yes | — | Fluid simulation / splat velocity |
| 15 | `logo` | `logo.ogg` | 0.30 | No | No | — | Logo hover / intro chime |
| 16 | `ui-long` | `ui-long.ogg` | 0.30 | No | No | — | Carousel navigation & button hover |
| 17 | `ui-short` | `ui-short.ogg` | 0.30 | No | No | — | Menu toggle & link clicks |
| 18 | `manifesto` | `manifesto.ogg` | 0.30 | No | No | — | Manifesto slide transition |

---

### 2.2 Volume Curves & Proximity Math

All volume modulations use standard helper functions from the `ie` math library:
- **`fit(x, a1, a2, b1, b2)`**: Clamps `x` to `[a1, a2]` and remaps linearly to `[b1, b2]`.
- **`lerpFPS(current, target, rate)`**: Frame-rate independent exponential smoothing using `damp(rate, deltaRatio) = 1 - exp(log(1 - rate) * deltaRatio)`.
- **`ease(t, "power2.out")`**: Quadratic ease-out `1 - (1 - t)^2`.

#### 1. Wind Volume Curve (Scroll Height Driven)
In `F3.update`:
$$\text{windVolume} = \text{fit}(\text{progress}, 0.05, 0.20, 0, 1) \times \text{fit}(\text{progress}, 0.75, 0.95, 1, 0)$$
$$\text{Emitted Volume} = \text{windVolume} \times 0.4$$
- $0 \le \text{progress} \le 0.05$: Silent ($0.0$)
- $0.05 < \text{progress} < 0.20$: Linear fade-in from $0.0$ to $0.4$
- $0.20 \le \text{progress} \le 0.75$: Sustained plateau at $0.4$
- $0.75 < \text{progress} < 0.95$: Linear fade-out from $0.4$ to $0.0$
- $\text{progress} \ge 0.95$: Silent ($0.0$)

#### 2. Igloo Proximity Volume Curve
In `U3.update` & `F3.update`:
$$c = (\text{plexusConnections} > 0 ? 1 : 0) \times \text{scene.\_windVolume}$$
$$\text{iglooVolume} = \text{lerpFPS}(\text{iglooVolume}, c, 0.1)$$
$$\text{Emitted Volume} = \text{iglooVolume} \times 0.5$$
- Gated by active camera/cursor proximity to the 3D igloo structure (detected via plexus wireframe intersections).
- Gated by Arctic wind availability ($\text{windVolume}$).
- Peak volume: $0.5$.

#### 3. Portal Rings Passage Volume Curve
In `UF` (Entry scene scrub):
Three portal ring checkpoints exist along the camera path at scroll progress $r \in \{0.28, 0.375, 0.465\}$:
$$n = \min_{r} |\text{progress} - r|$$
$$\text{portalsVolume} = \text{ease}\left(\text{fit}(n, 0, 0.04, 1, 0), \text{"power2.out"}\right) \times 0.9$$
- Within an influence radius of $\pm 0.04$ around each portal ring, the volume spikes following a smooth quadratic ease curve up to $0.9$. Outside $\pm 0.04$, volume is strictly $0.0$.

#### 4. Shard Frost Volume Curve (Interactive Proximity)
In `aF.update`:
1. Determines nearest project cube to current scroll progress:
   $$n = \arg\min_a |\text{cube}_a.\text{centeredProgress} - \text{progress}|$$
2. On active cube $n$, samples mouse frost interaction velocity:
   $$\text{rate} = (\text{soundVelocity} > \text{shardVolume}) ? 0.20 : 0.05$$
   $$\text{shardVolume} = \text{lerpFPS}(\text{shardVolume}, \text{soundVelocity}, \text{rate})$$
   $$\text{Emitted Volume} = \text{shardVolume} \times 0.5$$
- Asymmetric envelope: Fast attack ($0.20$) on user drag/hover; gentle decay ($0.05$) to keep frost shimmer audible.

#### 5. Particles Fluid Simulation Volume Curve
In `VolumeParticles`:
$$\text{particlesVolume} = 0.04 \times e + \text{splatVelocity} \times 0.21$$
- Directly proportional to fluid splat perturbation impulse and velocity.

---

### 2.3 Web Audio API Routing & Architecture

```
                                  [Web Worker: audioworker-036a09db.js]
                                                   │
                          ArrayBuffer (.ogg)       │ Transferred Float32Array PCM
                                  ▼                ▼
                          AudioBufferCache (Ow) -> AudioBuffer
                                                   │
   [BufferSourceNode] (Audio / PositionalAudio)   │
           │                                       │
           ▼ (for PositionalAudio)                 │
     [PannerNode]                                  │
     (refDistance, rolloffFactor, distanceModel)   │
           │                                       │
           ▼                                       ▼
     [GainNode] (individualVolume: 0..1) ───────────
           │
           ▼
     [AudioListener GainNode (KI)] (Master Volume: 0..1)
           │
           ▼ (Exponential ramp: setTargetAtTime(target, time, 0.35))
   [AudioContext.destination]
```

1. **Lazy Initialization & Autoplay Unlock (`DU` / `RU` / `he.audio`)**:
   - `AudioContext` starts in `"suspended"` state.
   - Listens to document user gestures: `click`, `touch_end`, `keydown`.
   - On first interaction, calls `context.resume()`, marks `contextStarted = true`, and resolves `contextReady` Promise.
2. **Master Volume Ramping**:
   - Master volume changes are smoothed exponentially:
     `listener.gain.gain.setTargetAtTime(target, Math.max(0.1, currentTime), 0.35)`
   - Time constant `0.35s` prevents clicks, pops, and sudden jarring audio cuts.
3. **Mute State & Page Visibility**:
   - Muted by default (`volume: 1, muted: true`).
   - Page visibility API: when tab is hidden, ramps master volume to 0. When restored, restores volume to unmuted level.
4. **Off-Thread Audio Decoding**:
   - Audio files are fetched as ArrayBuffers via `FileLoader`.
   - Transferred to Web Worker pool (`Nw = new jo(1)` running `audioworker-036a09db.js`).
   - Worker decodes Ogg Vorbis stream into raw PCM `Float32Array` buffers without blocking the 60fps WebGL render loop.
   - Decoded buffers are stored in `Ow._audiobuffersCache`.
