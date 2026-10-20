# Igloo Inc. — Detail Scene (class JF) & Router/Navigation System Documentation

A comprehensive reverse-engineering specification and architectural breakdown of the **Detail Scene (`class JF`)**, the **WebGL Router / Navigation Pipeline (`class a3`, `function eN`, `nP`)**, the **GPGPU Mouse Simulation Engine (`class KF`)**, **Volumetric Light Shafts (`class YF`, `class qF`)**, and **Portfolio Content Formatting (Pudgy Penguins & Overpass)** extracted from `assets/App3D-d68cb154.js`.

---

## 1. Architecture Overview

The 3D web experience of Igloo Inc. is orchestrated by a multi-scene render pipeline running on Three.js r165 with custom fullscreen composite passes. The experience is divided into two primary navigation states:
1. **Home (`/`)**: A continuous scrollable canvas comprising three 3D layers:
   - `ty.igloo` (`class F3`): The icy SSS igloo dome, ice terrain, and ambient snow.
   - `ty.cubes` (`class aF`): Floating portfolio cubes with surrounding interactive plexus nodes.
   - `ty.entry` (`class UF`): The lower entry portal and volumetric particle morphing engine.
2. **Project Detail (`/portfolio/:project`)**: A dedicated high-detail scene (`class JF`) featuring an interior 3D asset, volumetric light shafts, mouse-reactive particle fields, and an MSDF text/link overlay.

```
                          ┌──────────────────────────┐
                          │   Browser URL / Events   │
                          └─────────────┬────────────┘
                                        │
                         ┌──────────────▼─────────────┐
                         │   Router Wrapper (class a3)│
                         │   - routes: / & /portfolio │
                         └──────────────┬─────────────┘
                                        │ Q.emit('webgl_router_request_switch_scene')
                         ┌──────────────▼─────────────┐
                         │ Main Controller (class jF) │
                         │   navigateToSection()      │
                         └──────┬──────────────┬──────┘
         Enter Project Detail   │              │ Return to Home
                                │              │
        ┌───────────────────────▼──┐        ┌──▼────────────────────────┐
        │  Cubes Scene (class aF)  │        │ Detail Scene (class JF)   │
        │  - cameraZoom: 0 -> -3.5 │        │ - camera.z: 2.5 -> 4.0    │
        │  - plexus.click()        │        │ - playOutAnimation()      │
        │  - detailAnimationIn()   │        │ - emit webgl_project_hide │
        └──────────────┬───────────┘        └──┬────────────────────────┘
                       │                       │
        ┌──────────────▼───────────┐        ┌──▼────────────────────────┐
        │ Detail Scene (class JF)  │        │ Cubes Scene (class aF)    │
        │ - camera.z: 4.0 -> 2.5   │        │ - cameraZoom: -3.5 -> 0   │
        │ - playInAnimation()      │        │ - detailAnimationOut()    │
        │ - emit webgl_project_show│        │ - plexus.resetClick()     │
        └──────────────────────────┘        └───────────────────────────┘
```

---

## 2. Router & Navigation System (`class a3`, `function eN`, `nP`)

### 2.1 Route Definitions
The router is initialized in `function eN` using `class a3` (which encapsulates Navaid/regexparam router `nP`):

```javascript
function eN(i) {
  const e = new a3({
    base: "",
    routes: [
      { path: "/", data: { scene: "home" } },
      { path: "/portfolio/:project", data: { scene: "project" } }
    ],
    onChange: t => {
      Q.emit("webgl_router_request_switch_scene", t.scene, t.path, t.params);
    }
  });

  Q.on("webgl_switch_scene", t => e.go(t));
  Q.on("webgl_router_block_navigation", t => e.blocked = t);
  Q.once("webgl_router_start", () => e.start());

  return [];
}
```

### 2.2 Route Table

| Route Pattern | Target Scene | Parameter Map | Triggers / Preconditions |
| :--- | :--- | :--- | :--- |
| `/` | `"home"` | `{}` | Initial page load, clicking "Close" button, pressing <kbd>Escape</kbd>, or clicking navigation links. |
| `/portfolio/:project` | `"project"` | `{ project: string }` | Direct deep-link URL or clicking any 3D portfolio cube (`pudgy-penguins` or `overpass`). |

### 2.3 Navigation Locking
During camera zoom transitions, navigation is protected against double-clicks and race conditions:
- `Q.emit("webgl_router_block_navigation", true)`: Disables history pushes and intercepts all `a3.go()` calls.
- `Q.emit("webgl_router_block_navigation", false)`: Re-enables router execution once GSAP animation timelines resolve.

---

## 3. EventEmitter Protocol & Event Contracts

The application communicates across 3D scenes, UI controllers, and audio engines using a shared `EventEmitter3` instance (`const Q = new u2;`).

### 3.1 Detail Scene & Router Events

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `webgl_switch_scene` | UI / Mesh -> Router | `path: string` | Requests a route transition (e.g., `'portfolio/pudgy-penguins'` or `''` for root). |
| `webgl_router_request_switch_scene` | Router -> Controller | `(scene, path, params)` | Emitted when a URL route matches. Dispatched to `jF.navigateToSection()`. |
| `webgl_router_block_navigation` | Controller -> Router | `blocked: boolean` | Locks/unlocks the router during active GSAP transitions. |
| `webgl_router_start` | Controller -> Router | None | Starts URL listening and `popstate` event bindings. |
| `webgl_project_show` | Detail -> UI / CloseBtn | `projectIndex: number` | Reveals the project detail UI and Close button (`0` = Pudgy, `1` = Overpass). |
| `webgl_project_hide` | Detail -> UI / CloseBtn | None | Conceals the project detail UI and Close button. |
| `webgl_play_audio` | Scenes -> Audio Engine | `soundId: string` | Plays sound triggers: `'click-project'`, `'enter-project'`, `'project-text'`, `'leave-project'`, `'ui-long'`, `'ui-short'`. |
| `webgl_set_audio_volume` | Scene -> Audio Engine | `(channel, volume)` | Modulates audio channels (e.g., `'shard'` volume fade on detail exit). |

---

## 4. Detail Scene Architecture (`class JF`)

### 4.1 Class Hierarchy & Initialization
`class JF` extends `Jo` (the core WebGL Scene wrapper):
```javascript
class JF extends Jo {
  constructor(e = {}) {
    super({ orbit: false });
    this.objects = [];
    this.controller = e.mainController;
    this.displayUIvar = { value: 0 };
    this.init();
  }

  async init() {
    this.cameraOptions();
    this.renderOptions();
    this.mouseSim = new KF(this);
    await Promise.all([
      this.createBg(),
      this.createParticles(),
      this.createLittleParticles(),
      this.createObjects(),
      this.createLightShaft(),
      this.createLightPlane()
    ]);
    q.devScene && this.debug();
    this.beforeRenderCbs.push(this.update.bind(this));
    this.isReady();
  }
}
```

### 4.2 Camera Setup (`cameraOptions`)
- **Type**: Base Perspective Camera (FOV: 45°, Aspect: screen aspect ratio).
- **Base Position**: `(0, 0, 2.5)`
- **Base Target**: `(0, 0, 0)`
- **Displacement**: `position.set(0, 0)`
- **Position Lerp Factor**: `0.02`
- **Camera Shake**: Amplitude scalar `0.05`, Speed scalar `0.05`.

### 4.3 Scene Child Components
1. **Background Quad (`class HF`)**: Screen-aligned triangle mesh rendering a subtle dark noise gradient (`#09121f` to `#6b7685`) modulated by `wind_noise.ktx2` and rotation angle `-0.66`.
2. **Light Shaft (`class YF`)**: Diagonal volumetric light beam positioned at `(1.67, 0.79, 0)` with additive blending.
3. **Light Plane (`class qF`)**: Volumetric bokeh glow plane positioned at `(-2.05, -0.87, 1)` with harmonic floating motion.
4. **Floating Particles (`class WF`)**: 250 slow-drifting dust motes scattered across `[-2, 2]` with sinusoidal waving.
5. **Interactive Little Particles (`class XF`)**: 10,000 fine particles (`#2d3133`) advected in real-time by the mouse simulation texture (`tSim`).
6. **Detail 3D Object (`class VF`)**: High-res Draco mesh (`pudgy.drc` or `overpass_logo.drc`) with caustics and perlin lighting shaders.

---

## 5. Camera Zoom Animations & Transition Timelines

The transition between the main overview and project detail is a coordinated dual-camera choreography:

```
[Overview: Cubes Scene (aF)]                 [Detail Scene (JF)]
Camera Z: Initial Position                   Camera Z: 4.0 (Wide overview)
             │                                             │
             │ detailAnimationIn()                         │ playInAnimation()
             │ GSAP: cameraZoom -> -3.5                    │ GSAP: camera.z -> 2.5
             ▼                                             ▼
[Camera dives forward into cube] ──────► [Seamless cut to interior object]
             │                                             │
             │ (uDetailProgress: 0 -> 1)                   │ Display UI text
             │ (Chromatic aberration spike)                │ (Q.emit 'webgl_project_show')
```

### 5.1 Enter Transition Sequence (`playInAnimation`)
```javascript
playInAnimation(projectIndex, delay = 0) {
  // 1. Enable visibility only for the selected project model
  this.objects.forEach(s => { s.mesh.visible = (s.index === projectIndex); });

  // 2. Slow rotational spin up for the model
  re.to(this.objects.map(s => s.additionalRotationAmount), {
    overwrite: true,
    value: 1,
    duration: 1,
    delay: delay + 1.5,
    ease: "power1.out"
  });

  // 3. Trigger UI fade-in and sound notification
  re.fromTo(this.displayUIvar, { value: 0 }, {
    value: 1,
    duration: 0.7,
    delay: delay + 0.5,
    onComplete: () => {
      this.mouseSim.reset();
      Q.emit("webgl_project_show", projectIndex);
      Q.emit("webgl_play_audio", "project-text");
    }
  });

  // 4. Cinematic forward camera zoom: 4.0 -> 2.5
  re.fromTo(this.camera.basePosition, { z: 4 }, {
    overwrite: true,
    z: 2.5,
    duration: 2,
    delay: delay + 0.5,
    ease: "inOut1" // Bezier: M0,0 C0.5,0 0.1,1 1,1
  });
}
```

### 5.2 Exit Transition Sequence (`playOutAnimation`)
```javascript
playOutAnimation() {
  // 1. Quick reverse camera zoom: 2.5 -> 4.0
  re.to(this.camera.basePosition, {
    overwrite: true,
    z: 4,
    duration: 0.6,
    delay: 0,
    ease: "none"
  });

  // 2. Stop model rotation
  re.to(this.objects.map(e => e.additionalRotationAmount), {
    overwrite: true,
    value: 0,
    duration: 0.6,
    ease: "power1.in"
  });

  // 3. Immediately hide UI
  re.killTweensOf(this.displayUIvar);
  Q.emit("webgl_project_hide");
}
```

### 5.3 Cubes Scene Zoom & Post-Processing Blend
In `class aF` (Cubes Scene):
- **On Enter (`detailAnimationIn`)**:
  - `this.cameraZoom.value` tweens from `0` to `-3.5` (`duration: 1.25 + delay`, `ease: "power3.in"`).
  - Cubes additional rotation tweens to `0`.
  - Plexus click state activated: `this.cubes.forEach(t => t.plexus.click())`.
- **On Exit (`detailAnimationOut`)**:
  - `this.cameraZoom.value` tweens from `-3.5` to `0` (`duration: 1.45`, `ease: "power3.out"`).
  - Shard audio volume resets to `0`.
- **Composite Shader Uniforms**:
  - `uDetailProgress`: Tweens `0 -> 1` (`ease: "power3.in"`, duration `1.25s`).
  - `uDetailProgress2`: Tweens `0 -> 1` with extra delay (`ease: "sine.out"`, delay `+0.75s`, duration `1.25s`).
  - Shaders apply frost displacement (`tFrost`), chromatic aberration, and blue noise dithering (`tBlue`).

---

## 6. GPGPU Mouse Simulation Engine (`class KF`)

`class KF` implements a GPU-accelerated wave propagation and fluid advection simulation using double-buffered (ping-pong) render targets.

### 6.1 Buffer Dimensions & Ping-Pong State
- **Resolution**: `Math.floor(screen.width / 5)` × `Math.floor(screen.height / 5)`.
- **Render Targets**: Two `WebGLRenderTarget` instances (`this.rts = [rt0, rt1]`), `depthBuffer: false`, texture format HalfFloat (`RGBA16F`).
- **Buffers Swap**: Swaps active read/write targets every frame:
  `this.finalRT = (this.finalRT === this.rts[0]) ? this.rts[1] : this.rts[0]`.

### 6.2 Pointer Physics & Velocity Tracking
```javascript
update() {
  if (Fe.time - this.splatLastRenderTime < 0.015) return; // ~60fps throttle
  this.splatLastRenderTime = Fe.time;

  let dist = this.splatPosition.distanceTo(this.splatLastPosition);
  const timeSinceLastMove = Fe.time - this.splatLastMoveTime;
  if (dist > 0) this.splatLastMoveTime = Fe.time;

  if (timeSinceLastMove > 0.15 || this.splatHovered || dist > 0.3) {
    this.splatLastPosition.copy(this.splatPosition);
    this.splatTargetVelocity = 0;
    dist = 0;
  }

  // Velocity accumulation & decay
  this.splatTargetVelocity += dist * 6;
  this.splatTargetVelocity *= 0.88; // 12% decay per frame
  this.splatTargetVelocity = ie.clamp(this.splatTargetVelocity, 0, 1);

  // Smooth lerp with Power4.out curve
  this.splatVelocity = ie.lerp(
    this.splatVelocity,
    ie.ease(this.splatTargetVelocity, "power4.out"),
    0.1
  );

  // Pass uniforms to simulation quad
  this.fsQuad.material.uniforms.uSplatCoords.value.copy(this.splatPosition);
  this.fsQuad.material.uniforms.uSplatPrevCoords.value.copy(this.splatLastPosition);
  this.fsQuad.material.uniforms.uSplatRadius.value = this.splatVelocity;
  this.splatLastPosition.copy(this.splatPosition);
}
```

### 6.3 Simulation Shader Mechanics (`fragmentShader`)
1. **Noise Advection**: UV coordinates are displaced by an advection texture (`cubes/advect.png`):
   ```glsl
   vec2 advect = (texture2D(tAdvect, vUv * 3.0).xy * 2.0 - 1.0) * 1.0;
   uv += advect * invResolution;
   ```
2. **Wave Propagation**: 4-point cardinal cross-sampling spreads ripples outward:
   ```glsl
   float l = texture2D(tBuffer, uv - vec2(offset.x, 0.0)).r;
   float r = texture2D(tBuffer, uv + vec2(offset.x, 0.0)).r;
   float t = texture2D(tBuffer, uv + vec2(0.0, offset.y)).r;
   float b = texture2D(tBuffer, uv - vec2(0.0, offset.y)).r;
   float nextVal = max(max(max(l, r), t), b);
   ```
3. **Mouse Line Splat**: Continuous line segment distance calculation connecting previous and current pointer points:
   ```glsl
   float line(vec2 uv, vec2 p1, vec2 p2) {
       vec2 pa = uv - p1, ba = p2 - p1;
       pa.x *= aspect; ba.x *= aspect;
       float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
       return length(pa - ba * h);
   }
   float radius = 0.05 * smoothstep(0.1, 1.0, uSplatRadius);
   float splat = cubicIn(clamp(1.0 - line(vUv, uSplatPrevCoords.xy, uSplatCoords.xy) / radius, 0.0, 1.0));
   nextVal += splat;
   ```
4. **Damping & RGBA Encoding**:
   ```glsl
   nextVal *= 0.985;
   nextVal = min(nextVal, 1.0);
   vec4 prev = texture2D(tBuffer, uv);
   float rim = nextVal - prev.r;
   float rimLerp = (prev.b + rim) * 0.9;
   gl_FragColor = vec4(nextVal, rim, rimLerp, 1.0);
   ```

---

## 7. Lighting Shafts & Volumetric Planes (`class YF`, `class qF`)

### 7.1 Light Shaft (`class YF`)
- **Mesh Name**: `"lightshaft"`
- **Geometry**: Plane 1×1, `scale.set(1.5, 3.0, 1.0)`
- **Position**: `(1.67, 0.79, 0.0)`
- **Rotation**: `rotation.z = -40 * Math.PI / 180` (-40 degrees tilt)
- **Blending**: `AdditiveBlending` (`transparent: true, depthWrite: false`)
- **Uniforms**:
  - `uColor`: `new THREE.Color("#d1e3ff")`
  - `tMap`: `perlin-datatexture.png` (sRGB repeat)
- **Shader Equations**:
  ```glsl
  float t = time * 0.12;
  float noise = texture2D(tMap, vUv * vec2(1.0, 0.46) + vec2(t, t * 0.323)).r;
  noise += texture2D(tMap, vUv * vec2(0.5, 0.25) + vec2(-t * 0.77, -t * 0.414)).r;

  float circularGradient = 1.0 - clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0);
  circularGradient = pow(circularGradient, 2.0);

  float alpha = circularGradient * noise * 0.07;
  gl_FragColor = vec4(uColor, alpha);
  ```

### 7.2 Light Plane (`class qF`)
- **Mesh Name**: `"lightplane"`
- **Geometry**: Plane 1×1, `scale.set(4.0, 4.0, 4.0)`
- **Base Position**: `(-2.05, -0.87, 1.0)`
- **Dynamic Animation (`onBeforeRender`)**:
  ```javascript
  this.mesh.position.x = -2.20 + Math.sin(Fe.time * 0.30) * 0.20;
  this.mesh.position.y = -0.87 + Math.cos(Fe.time * 0.24) * 0.20;
  ```
- **Uniforms**:
  - `uColor`: `new THREE.Color("#d1e3ff")`
  - `tMap`: `perlin-datatexture.png`
  - `tBokeh`: `bokeh.ktx2`
- **Shader Equations**:
  ```glsl
  float circularGradient = pow(1.0 - clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0), 2.0);
  float bokeh = texture2D(tBokeh, vUv * 2.0).r;
  float noise = texture2D(tMap, vUv * 2.0 + time * 0.15).r;
  bokeh *= noise * 5.0;

  float alpha = (circularGradient + bokeh * circularGradient) * 0.15;
  gl_FragColor = vec4(uColor, alpha);
  ```

---

## 8. Portfolio Content Formatting (Pudgy Penguins & Overpass)

All portfolio data is extracted from the global configuration object `Be.cubes`.

### 8.1 Project 1: Pudgy Penguins
- **Title**: `PORTFOLIO_CO_01 Pudgy Penguins`
- **URL Hash**: `pudgy-penguins`
- **Date**: `01/02/2020`
- **Outer 3D Geometry**: `cube3.drc`
- **Detail 3D Mesh**: `pudgy.drc` (Scale: `1.1`, Texture: `pudgy_dark_color.ktx2`)
- **Summary Header**: `////// Summary` (Color: `#67707E`)
- **Body Text** (Color: `#A1AAB7`):
  > "Pudgy Penguins, a creative venture founded in 2021, quickly gained attention for its unique IP and engaging community. In 2022, the company was acquired by Igloo Inc., a strategic move aimed at expanding its reach and capabilities. The acquisition by Igloo Inc. was part of a broader vision to transform and reposition Pudgy Penguins as a next-generation entertainment company and the face of Web3 worldwide.
  >
  > We believe in a future where intellectual property, digital collectibles, and communities are born and thrive on the blockchain. Since our acquisition, Pudgy Penguins has leveraged its onchain origins to create a new model for consumer brands, shifting from a brand-and-consumer approach to a brand-and-participant model. Our business strategy focuses on expanding a vast range of content mediums, products, and experiences, driving people onchain into the new era of the internet. By harnessing the power of our vibrant community and the rich and whimsical universe of Pudgy Penguins, we're revolutionizing the way IP is created and experienced."
- **Social Header**: `/// Discover` (Color: `#67707E`)
- **Social Channels**:
  - `X`: `https://x.com/pudgypenguins`
  - `IG`: `https://instagram.com/pudgypenguins`
  - `LI`: `https://www.linkedin.com/company/pudgy-penguins`
  - `TK`: `https://www.tiktok.com/@pudgypenguins`
- **Visit Header**: `/// Visit` (Color: `#67707E`)
- **Website Link**:
  - `website`: `https://www.pudgypenguins.com`

---

### 8.2 Project 2: Overpass
- **Title**: `PORTFOLIO_CO_02 Overpass`
- **URL Hash**: `overpass`
- **Date**: `06/01/2023`
- **Outer 3D Geometry**: `cube1.drc`
- **Detail 3D Mesh**: `overpass_logo.drc` (Scale: `1.2`, Texture: `overpass_logo_dark_color.ktx2`)
- **Summary Header**: `////// Summary` (Color: `#67707E`)
- **Body Text** (Color: `#A1AAB7`):
  > "OverpassIP was established as a solution to a significant licensing challenge faced by Pudgy Penguins, marking its inception with a crucial breakthrough in NFT licensing. The company empowers NFT holders by allowing them to submit their digital assets for potential licensing opportunities, offering a platform where collections can significantly amplify their growth and engagement. By participating in OverpassIP, collections open up a realm of possibilities for their brands, bringing their holders along for the ride through expansive licensing avenues.
  >
  > Moreover, brands seeking to enhance their initiatives can access a curated pool of NFTs on OverpassIP, selecting the intellectual property that best aligns with their strategic goals. This innovative approach not only facilitates dynamic partnerships between NFT creators and brands but also pioneers new frontiers in the utilization of digital assets within the broader market."
- **Social Header**: `/// Discover` (Color: `#67707E`)
- **Social Channels**:
  - `X`: `https://twitter.com/OverpassIP`
- **Visit Header**: `/// Visit` (Color: `#67707E`)
- **Website Link**:
  - `website`: `https://www.overpassip.com`

---

### 8.3 UI Presentation & Typography Formatting (`class zF`, `class ey`, `class kF`)
- **Font**: `IBMPlexMono-Medium` rendered off-thread via MSDF worker (`Yh`).
- **Font Size**: `24px` on desktop, `18px` on screens with `height < 800px` or `width < 1600px`.
- **Text Width**: Clamped to `Math.min(screen.width - 40, 500px)`.
- **Vertical Spacing**: Stack gap `25px` between blocks.
- **Scroll Limit**: `scrollMax = Math.max(0, totalHeight - (screen.height - 260px))`.
- **Staggered Entrance Animation**:
  - Title & Short Text: `duration: 0.25s`, delay increment `0.1s`.
  - Body Content (>100 chars): `duration: 0.75s`, delay increment `0.3s`.
  - Links: `duration: 0.30s`, delay increment `0.1s`.
- **Interactive Mouse Distortion**: Every text element and link icon receives `tSim` from `mouseSim.finalRT.texture` to ripple dynamically when the pointer passes over.

---

## 9. Verification & Test Suite

The repository includes a comprehensive standalone test script:
```bash
npm test
# or
node test/verify_detail_router.js
```

The test runner validates 21 discrete test assertions across 7 modules:
1. **Bundle Static Extraction & Integrity**: Verifies symbols and EventEmitter token strings.
2. **Router Engine & Route Definitions**: Verifies path parsing, params extraction, and navigation blocking.
3. **EventEmitter Protocol & Lifecycle**: Verifies the exact sequence of switch, block, show, hide, and audio events.
4. **Camera Zoom Animations & Timelines**: Verifies camera z positions, tweens, and cubic ease curves.
5. **Mouse Simulation Math & GPGPU**: Verifies ping-pong buffer toggling, line segment SDF, and velocity damping.
6. **Lighting Shafts & Volumetrics**: Verifies positioning, scale, rotation angles, and harmonic math.
7. **Portfolio Content Schema**: Verifies extracted copy, links, and styling parameters for Pudgy Penguins and Overpass.
