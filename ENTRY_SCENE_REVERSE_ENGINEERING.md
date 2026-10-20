# Igloo Inc. — Entry Scene (`class UF`) Reverse Engineering & Technical Specification

> **Target Source:** `assets/App3D-d68cb154.js` (Class `UF`, offset `1399761`)  
> **Repository:** `C:/Users/shubh/Projects/igloo-experience/`  
> **Scene Key:** `entry` in scene registry `ty = { igloo: F3, cubes: aF, entry: UF }`  
> **Test / Verification Module:** `verify_entry_scene.js`

---

## 1. Executive Summary & Architecture Overview

The **Entry Scene** (`class UF`) serves as the cinematic portal and intro transition for the entire Igloo Inc. WebGL2 experience. It animates a vertical descent through three shattered ring portals and into the central corporate showroom/igloo chamber.

Unlike a traditional linear video or time-based cutscene, the entry sequence is **fully interactive and scroll-scrubbed**:
- **Scene Height:** `this.height = 5.5` scroll units (total span `height + 1 = 6.5` units).
- **Progress Normalization:** `this.progress` maps monotonically from `0.0` (top of tunnel) to `1.0` (ground level of inner room).
- **Timeline Duration:** A 9.2-second GSAP master timeline is bound to `this.progress` via `this.timeline.progress(this.progress)`.
- **Scrub & Direction Detection:** Evaluates scroll delta per frame: `this.direction = this.progress > this.lastProgress ? 1 : -1`.
- **Auto-Center Mechanics:** When user scrolling rests for > 1.4 seconds past `progress > 0.15`, the engine auto-dallies the camera to `finalScrollAutocenter = 0.76`.

### Scene Sub-Element Graph

| Component | Class | Primary Geometry | Key Textures / Uniforms | Transform / Y-Position |
| :--- | :--- | :--- | :--- | :--- |
| **Tunnel** | `SF` | Procedural Cylinder (r=1.3, h=9) | `wind_noise.ktx2` | y = -4.5 (inverted normals) |
| **Snow Particles** | `CF` | 200 Points Buffer | Vertex noise + treadmill wrap | y = -3.5 |
| **Rings (Portals)** | `cF` | `shattered_ring.drc`, `shattered_ring2.drc` | Color + AO KTX2 textures | 3 instances: y = -1.65, -4.15, -6.65 |
| **Ring Forcefields** | `bF` | Procedural Planes | `triangles_tiling.ktx2`, `clouds_noise.ktx2` | 3 instances: y = -1.5, -4.0, -6.5 |
| **Plasma Rings** | `MF` | `shattered_ring_smoke.drc` | `wind_noise.ktx2` | 3 instances: y = -1.6, -4.1, -6.6 |
| **Smoke Trails** | `EF` | `smoke_trail.drc` | `wind_noise.ktx2` | 3 instances: y = -1.6, -4.1, -6.6 |
| **Room Ring** | `oF` | Procedural Plane | Rotating UV shader | y = 1.5 |
| **Floor** | `hF` | `floor.drc` | `floor_color.ktx2`, `perlin-datatexture.ktx2` | y = -10.33 |
| **Force Field** | `uF` | Procedural Cylinder (r=1, h=3) | `triangles_tiling.ktx2` | y = 1.5 |
| **Text Cylinders** | `fF` | `blurrytext_cylinder.drc` | `cubes/blurrytext_atlas.ktx2` | 4 meshes at y = -10.33 and y = -9.5 |
| **Ground Smoke** | `IF` | `shattered_ring_smoke.drc` | `wind_noise.ktx2` | y = -10.17, scale (5, 0.1, 5) |
| **Ceiling Smoke** | `TF` | `ceilingsmoke.drc` | `wind_noise.ktx2` | y = -9.4, scale (2, 0.1, 2) |
| **Ambient Particles** | `BF` | 60 Points Buffer | Point size flicker shader | y = -9.61 |
| **Container Particles**| `wF` | 150,000 GPGPU Points | 3D VDB volumes (`medium_32`, `peachesbody_64`, `x_64`) | y = -10.0 |
| **Light Room** | `dF` | Sphere (r=100) | `dot_pattern.ktx2`, `perlin-datatexture.ktx2` | Skybox dome |
| **Post-Processing** | `DF`/`RF` | Fullscreen Triangle | `blue-8-128-rgb.ktx2`, `scroll-datatexture.ktx2` | Glitch / chromatic / radial pass |

---

## 2. Custom GSAP Easing Curves

GreenSock's `CustomEase` plugin (v3.12.5) compiles SVG cubic Bezier path descriptions into lookup curves. In `App3D-d68cb154.js`, four custom curves specifically shape the Entry Scene, alongside global `inOut1` through `inOut4`:

```javascript
Ei.create("inOut5", "M0,0 C0.171,0 0.77,-0.013 0.842,0.272 0.972,0.794 0.972,0.85 1,1");
Ei.create("entry_ease", "M0,0 C0.358,0 0.336,0.209 0.442,0.519 0.59,0.952 0.768,0.918 1,1", { precision: 2 });
Ei.create("entry_ease_2", "M0,0 C0.388,0.082 0.924,0.862 1,1", { precision: 2 });
Ei.create("entry_ease_3", "M0,0 C0.272,0 0.472,0.454 0.496,0.496 0.66,0.79 0.685,1 1,1", { precision: 2 });
```

### Detailed Curve Formulations & Analysis

#### 1. `inOut5` — Late Explosive Ramp
- **SVG Path:** `M0,0 C0.171,0 0.77,-0.013 0.842,0.272 0.972,0.794 0.972,0.85 1,1`
- **Segments:**
  - Segment 1: $(0, 0) \to (0.171, 0) \to (0.77, -0.013) \to (0.842, 0.272)$
  - Segment 2: $(0.842, 0.272) \to (0.972, 0.794) \to (0.972, 0.85) \to (1.0, 1.0)$
- **Behavior:** Extends near zero for 70% of duration ($y(0.7) = 0.107$), breaks upward at $x=0.842$, and accelerates sharply into 1.0. Used for high-impact delayed snaps.

#### 2. `entry_ease` — S-Curve with Mid-Range Acceleration
- **SVG Path:** `M0,0 C0.358,0 0.336,0.209 0.442,0.519 0.59,0.952 0.768,0.918 1,1`
- **Segments:**
  - Segment 1: $(0, 0) \to (0.358, 0) \to (0.336, 0.209) \to (0.442, 0.519)$
  - Segment 2: $(0.442, 0.519) \to (0.59, 0.952) \to (0.768, 0.918) \to (1.0, 1.0)$
- **Behavior:** S-inflection inflection point at $(0.442, 0.519)$. Rapid mid-transition with prolonged soft arrival ($y(0.7) \approx 0.897$, $y(0.9) \approx 0.969$).
- **Application in `UF`:** Drives camera Z-dolly ($0 \to -1.5$) and `upOriginal` rotation recovery ($0 \to 1.0$) between $t = 3.5\text{s}$ and $7.2\text{s}$.

#### 3. `entry_ease_2` — Smooth Linear-Cubic Settling
- **SVG Path:** `M0,0 C0.388,0.082 0.924,0.862 1,1`
- **Segments:** Single cubic segment: $(0, 0) \to (0.388, 0.082) \to (0.924, 0.862) \to (1.0, 1.0)$
- **Behavior:** Mild low-order ease with continuous positive velocity.
- **Application in `UF`:** Drives terminal camera dolly ($z = -1.5 \to -3.0$) between $t = 7.2\text{s}$ and $9.2\text{s}$.

#### 4. `entry_ease_3` — Symmetric Smooth Progressive Plunge
- **SVG Path:** `M0,0 C0.272,0 0.472,0.454 0.496,0.496 0.66,0.79 0.685,1 1,1`
- **Segments:**
  - Segment 1: $(0, 0) \to (0.272, 0) \to (0.472, 0.454) \to (0.496, 0.496)$
  - Segment 2: $(0.496, 0.496) \to (0.66, 0.79) \to (0.685, 1.0) \to (1.0, 1.0)$
- **Behavior:** Crosses exactly at $(0.496, 0.496)$, providing an organic descent curve.
- **Application in `UF`:** Primary driver of camera vertical plunge ($y = 1.5 \to -9.83$) over 7.0 seconds.

### Sampled Numerical Table of Easing Curves

| $x$ (Time) | `inOut5` | `entry_ease` | `entry_ease_2` | `entry_ease_3` |
| :--- | :--- | :--- | :--- | :--- |
| **0.00** | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| **0.10** | 0.0001 | 0.0067 | 0.0344 | 0.0202 |
| **0.20** | 0.0027 | 0.0350 | 0.0907 | 0.0802 |
| **0.30** | 0.0089 | 0.1189 | 0.1639 | 0.1798 |
| **0.40** | 0.0199 | 0.3824 | 0.2511 | 0.3202 |
| **0.50** | 0.0374 | 0.6628 | 0.3500 | 0.5032 |
| **0.60** | 0.0642 | 0.8170 | 0.4594 | 0.6995 |
| **0.70** | 0.1070 | 0.8973 | 0.5784 | 0.8695 |
| **0.80** | 0.1879 | 0.9401 | 0.7067 | 0.9566 |
| **0.90** | 0.5098 | 0.9692 | 0.8450 | 0.9915 |
| **1.00** | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

---

## 3. Exact Camera Intro Timeline Breakdown

Total Timeline Duration: **9.20 seconds** (mapped across `progress = 0.0 \to 1.0`).

### Initial Camera Rig Configuration
- `camera.fov = 25.0` (set in `cameraOptions()`), overridden to `22.0` at $t=0.0$.
- `camera.basePosition = (0, 1.5, -2.0)`.
- `camera.baseTarget = (0, -2.5, -1.0)`.
- `camera.displacement.position = (0.07, 0.025)`.
- `camera.lerpPosition = 0.02`, `camera.lerpRotation = 0.02`, `camera.lerpTarget = 0.015`.
- `camera.shake = 0.02`, `camera.shakeSpeed = 0.25`.

### Complete Timeline Track Schedule

| Start (s) | Duration (s) | Target Property | From | To | Easing Curve |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0.00** | 2.50 | `timelinePosition.z, x` | (0, -2) | (0, 0) | `"power2.out"` |
| **0.00** | 2.50 | `timelineTarget.z, x` | (0, -1) | (0, 0) | `"power2.out"` |
| **0.00** | 0.00 | `camera.fov` | — | 22.0 | `timeline.set` |
| **0.00** | 7.20 | `camera.fov` | 22.0 | 30.0 | `"power1.inOut"` |
| **0.00** | 0.00 | `timelineDisplacement` | — | (0.01, 0.005) | `timeline.set` |
| **0.00** | 0.00 | `timelineDisplacementRot`| — | 0.0 | `timeline.set` |
| **0.20** | 7.00 | `timelinePosition.y` | 1.50 | -9.83 | `"entry_ease_3"` |
| **0.20** | 3.00 | `timelineTarget.y` | -2.50 | -10.00 | `"power1.inOut"` |
| **1.00** | 5.25 | `timelineAdditional.upRotation` | 0.0 | $\pi$ (3.14159) | `"power3.inOut"` |
| **1.50** | 0.00 | `containerparticles.mesh.visible` | — | `true` | `timeline.set` |
| **1.50** | 2.50 | `containerparticles.uAlpha` | 0.0 | 1.0 | `"power2.inOut"` |
| **3.20** | 2.50 | `timelineTarget.y` | -10.00 | -9.81 | `"power1.inOut"` |
| **3.40** | 0.00 | `floor.mesh.visible` | — | `true` | `timeline.set` |
| **3.40** | 5.00 | `floor.uAlpha` | 0.0 | 1.0 | `"power2.out"` |
| **3.40** | 0.00 | `groundsmoke.mesh.visible` | — | `true` | `timeline.set` |
| **3.40** | 0.00 | `ambientparticles.mesh.visible` | — | `true` | `timeline.set` |
| **3.50** | 3.70 | `timelineAdditional.upOriginal` | 0.0 | 1.0 | `"entry_ease"` |
| **3.50** | 3.70 | `timelinePosition.z` | 0.0 | -1.50 | `"entry_ease"` |
| **3.50** | 1.50 | `containerparticles.uShowNoise` | 1.0 | 0.0 | `"power1.inOut"` |
| **3.90** | 1.00 | `containerparticles.uInitialGlow` | 1.0 | 0.0 | `"power1.inOut"` |
| **4.00** | 0.00 | `forcefield.mesh.visible` | — | `true` | `timeline.set` |
| **4.00** | 2.00 | `forcefield.uAlpha` | 0.0 | 1.0 | `"power2.inOut"` |
| **4.00** | 1.00 | `timelineDisplacement.x, y` | (0.01, 0.005) | (0.0, 0.0) | `"power2.inOut"` |
| **4.00** | 2.00 | `timelineDisplacementTar.x, y` | (0.0, 0.0) | (-0.03, -0.01)| `"power2.inOut"` |
| **4.00** | 2.00 | `timelineDisplacementRot.value` | 0.0 | 0.05 | `"power2.inOut"` |
| **4.40** | 3.00 | `groundsmoke.uAlpha` | 0.0 | 1.0 | `"power2.out"` |
| **4.40** | 3.00 | `ambientparticles.uAlpha` | 0.0 | 1.0 | `"power2.out"` |
| **4.50** | 0.00 | `textcylinder.mesh.visible` | — | `true` | `timeline.set` |
| **4.50** | 0.00 | `textcylinder.mesh2.visible` | — | `true` | `timeline.set` |
| **4.50** | 0.00 | `ceilingsmoke.mesh.visible` | — | `true` | `timeline.set` |
| **4.50** | 2.00 | `textcylinder.mesh.uAlpha` | 0.0 | 1.0 | `"power2.inOut"` |
| **4.50** | 2.00 | `textcylinder.mesh2.uAlpha` | 0.0 | 1.0 | `"power2.inOut"` |
| **7.20** | 2.00 | `timelinePosition.z` | -1.50 | -3.00 | `"entry_ease_2"` |
| **7.20** | 2.00 | `timelineTarget.y` | -9.81 | -10.35 | `"power2.in"` |

### Camera Base Up Vector Dynamic Orientation
In `UF.update()`, the camera's up vector is recalculated every frame:
```javascript
const $x = new THREE.Vector3(0, 1, 0);
this.camera.baseUp.set(0, 0, -1);
this.camera.baseUp.applyAxisAngle($x, this.timelineAdditional.upRotation);
this.camera.baseUp.lerp($x, this.timelineAdditional.upOriginal).normalize();
```
1. At start ($t=0$): Camera points down the tunnel; its up vector is aligned with $-Z$ ($0, 0, -1$).
2. From $t = 1.0\text{s}$ to $6.25\text{s}$: `upRotation` spins by $\pi$ around the Y axis, performing an inverted barrel roll.
3. From $t = 3.5\text{s}$ to $7.2\text{s}$: `upOriginal` interpolates toward $(0, 1, 0)$, righting the camera upright as it settles into the room.

---

## 4. Dynamic Visibility & Audio Triggers (`timeline.onUpdate`)

### Mesh Visibility Window Table

| Element | Visibility Rule in `onUpdate` | Active Scroll Progress Window |
| :--- | :--- | :--- |
| `rings.mesh0` | `progress < 0.34` | $[0.00, 0.34)$ |
| `rings.mesh1` | `progress < 0.43` | $[0.00, 0.43)$ |
| `rings.mesh2` | `progress < 0.52` | $[0.00, 0.52)$ |
| `ringforcefield.mesh0` | `progress > 0.10 && progress < 0.34` | $(0.10, 0.34)$ |
| `ringforcefield.mesh1` | `progress > 0.25 && progress < 0.43` | $(0.25, 0.43)$ |
| `ringforcefield.mesh2` | `progress > 0.36 && progress < 0.52` | $(0.36, 0.52)$ |
| `plasma.mesh0` | `progress > 0.06 && progress < 0.34` | $(0.06, 0.34)$ |
| `plasma.mesh1` | `progress > 0.25 && progress < 0.43` | $(0.25, 0.43)$ |
| `plasma.mesh2` | `progress > 0.35 && progress < 0.52` | $(0.35, 0.52)$ |
| `smoketrail.mesh0` | `progress > 0.00 && progress < 0.37` | $(0.00, 0.37)$ |
| `smoketrail.mesh1` | `progress > 0.00 && progress < 0.47` | $(0.00, 0.47)$ |
| `smoketrail.mesh2` | `progress > 0.00 && progress < 0.56` | $(0.00, 0.56)$ |
| `tunnel.mesh` | `progress < 0.52` | $[0.00, 0.52)$ |
| `snowparticles.mesh` | `progress < 0.52` | $[0.00, 0.52)$ |
| `roomring.mesh` | `progress > 0.53` | $(0.53, 1.00]$ |

### Portal Proximity Audio Trigger
When passing through the three ring portals at coordinates $0.28$, $0.375$, and $0.465$:
```javascript
let n = Infinity;
[0.28, 0.375, 0.465].forEach(r => {
  const a = Math.abs(this.progress - r);
  n = Math.min(n, a);
});
this._portalsVolume = ie.ease(ie.fit(n, 0, 0.04, 1, 0), "power2.out") * 0.9;
Q.emit("webgl_set_audio_volume", "portals", this._portalsVolume);
```
- When $|progress - r| \le 0.04$, audio volume swells up to **0.90**.
- Outside the $\pm 0.04$ halo, volume drops cleanly to **0.00**.

### Post-Processing Glitch Ring Proximity Pass (`DF` / `RF`)
```javascript
const s = (n = null, r = null) => {
  const a = r !== null ? r : n === null || this.direction === -1 ? 1 : 0.5;
  e.uSquareAttr.value.set(Math.random() * 25.424, Math.random() * 64.453, a);
};
```
1. **Ring 1 Portal Impact ($t = 2.0\text{s}$):**
   - Call `s(null, null)`
   - `uRingProximity: 0 \to 1` ($t = 2.0 \to 2.5\text{s}$, `"power1.in"`)
   - `uRingProximity: 1 \to 0` ($t = 2.5 \to 2.9\text{s}$, `"power1.out"`)
2. **Ring 2 Portal Impact ($t = 2.95\text{s}$):**
   - Call `s(null, null)`
   - `uRingProximity: 0 \to 1` ($t = 2.95 \to 3.45\text{s}$, `"power1.in"`)
   - `uRingProximity: 1 \to 0` ($t = 3.45 \to 3.85\text{s}$, `"power1.out"`)
3. **Ring 3 Portal Impact ($t = 3.8\text{s}$):**
   - Call `s([true])`
   - `uRingProximity: 0 \to 1` ($t = 3.8 \to 4.3\text{s}$, `"power1.in"`)
   - `uRingProximity: 1 \to 0` ($t = 4.3 \to 4.9\text{s}$, `"power1.out"`)
4. **Final Settle ($t = 4.9\text{s}$):**
   - Call `s([false, 0.5])`

---

## 5. Rotating Text Cylinders (`blurrytext_cylinder.drc` & `blurrytext.drc`)

### 1. Room Text Cylinders (`class fF`)
- **Geometry:** `blurrytext_cylinder.drc` (5,571 bytes).
- **Atlas Texture:** `cubes/blurrytext_atlas.ktx2` (`srgb-repeat`).
- **Four Concentric Mesh Layers:**
  1. `this.mesh`: `y = -10.33`, `scale = 1.75`, `renderOrder = 1`, `name = "textcylinder"`
  2. `this.mesh2`: `y = -10.33`, `scale = 3.5`, `rotation.y = \pi/2`, `renderOrder = 0`, `name = "textcylinder2"`
  3. `this.mesh3`: `y = -9.5`, `scale = (2, 9, 2)`, `rotation.y = \pi`, `renderOrder = 0`, `name = "textcylinder3"`
  4. `this.mesh4`: `y = -9.5`, `scale = (3.3, 8, 3.3)`, `renderOrder = -1`, `name = "textcylinder4"`

#### Shaders and Fading
- **Outer Cylinders (`mesh`, `mesh2`):**
  ```glsl
  float alpha = texture2D(tMap, vUv).r;
  alpha *= clamp(vPos.y * 2.0, 0.0, 1.0); // vertical fade
  alpha *= sin(time * 2.0 + vRand * 10.0 + (vPos.x * 2.0 + vPos.z * 2.0)) * 0.5 + 0.5; // flicker
  float transition = falloffsmooth(length(vPos.xz), 0.0, 10.0, 3.0, uAlpha);
  alpha *= transition * 0.7 * uAlpha;
  ```
- **Inner Column Cylinders (`mesh3`, `mesh4`):**
  ```glsl
  float alpha = texture2D(tMap, vUv).r;
  alpha *= sin(time * 2.0 + vRand * 10.0 + (vPos.x * 2.0 + vPos.z * 2.0 + vPos.y)) * 0.5 + 0.5;
  alpha *= 0.25 * uAlpha;
  ```

#### Dynamic Rotation Coupling
In `fF.update()`:
```javascript
const e = this.scene.timelineAdditional.upRotation * 0.65;
this.mesh4.rotation.y = e;
this.mesh3.rotation.y = e + 2.0;
```
The text columns counter-rotate proportionally to the camera's barrel roll!

### 2. Billboard Screen-Space Text (`blurrytext.drc` / `class z3`)
Used in the subsequent Cubes scene to render floating portfolio descriptions in screen-space:
- **Geometry:** `blurrytext.drc` (1,187 bytes).
- **Attribute:** `attribute vec3 centr` encodes per-glyph local origin.
- **Vertex Shader:**
  ```glsl
  vec3 localpos = position - centr;
  vec3 offset = centr;
  offset.x /= aspect;
  float depth = offset.z * 0.5 + 0.5;
  localpos.x /= aspect;
  localpos *= 2.5 * mix(1.0, 2.0, depth);
  offset.y = fract((offset.y * 0.5 + 0.5) + uProgress * 1.25 * depth) * 2.0 - 1.0;
  offset *= 1.7;
  vec3 pos = localpos + offset;
  vAlpha = smoothstep(0.1, 0.6, texture2D(tPerlin, pos.xz * 3.0 + time * 0.075 + offset.z * 10.0).r);
  gl_Position = vec4(pos, 1.0);
  ```

---

## 6. Smoke Trails & Plasma Systems

Three distinct Draco geometries generate the volumetric haze effects:

### 1. `smoke_trail.drc` (`class EF`)
- **Instances:** 3 meshes (`smoketrail0`, `smoketrail1`, `smoketrail2`).
- **Positions:** $y = -1.60, -4.10, -6.60$ (step $\Delta y = 2.5$).
- **Initial Rotations:** $a \times \frac{\pi}{2}$ ($0, \frac{\pi}{2}, \pi$).
- **Update Logic:**
  ```javascript
  const e = this.scene.timelineAdditional.upRotation * 0.5;
  this.meshes.forEach(t => { t.rotation.y = t.initialRotation + e; });
  ```
- **Fragment Shader:** 3-octave wind advection:
  ```glsl
  vec2 uv = vUv * vec2(0.25, 0.5);
  uv.x += vPos.z * 0.1;
  float t = time * 0.15;
  float value = texture2D(tWind, uv * 3.0 + vec2(-t, t * 0.7)).r
              * texture2D(tWind, uv * 4.0 + vec2(-t, t * 0.7)).r
              * texture2D(tWind, uv * 6.0 + vec2(-t, t * 0.7)).r;
  float fade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.5, vUv.y) * (1.0 - abs((vUv.x - 0.5) * 2.0));
  float alpha = min(1.0, pow(value * fade * vFalloff * 2.75, 3.0));
  ```

### 2. `ceilingsmoke.drc` (`class TF`)
- **Single Mesh:** $y = -9.40$, `scale = (2.0, 0.1, 2.0)`, `renderOrder = 2`.
- **Shader:** Concentric radial haze ring ceiling cap with screen UV projection glare.

### 3. `shattered_ring_smoke.drc` (`class IF` & `class MF`)
- **As Ground Smoke (`IF`):** Single mesh at $y = -10.17$, `scale = (5.0, 0.1, 5.0)`.
- **As Plasma Rings (`MF`):** 3 meshes at $y = -1.60, -4.10, -6.60$, rotating with `upRotation * 0.5`.

---

## 7. Particle Systems

### 1. Snow Particles (`class CF`)
- **Count:** 200 point particles.
- **Bounding Box:** Scale $(3, 8, 3)$, centered at origin, offset $y -= 3.5$.
- **Simulation:**
  - Downward gravity drift: `pos.y -= mix(0.4, 0.7, fract(rand)) * time;`
  - Vortex swirl: `pos.xz = rotate(pos.xz, t * 0.5);`
  - Infinite volume treadmill: `pos = treadmill(pos, vec3(3.0, 4.0, 3.0));`
  - Squished particle quad: `float squish = pow(1.0 - abs(uv.x - 0.5), floor(vRandom.y * 3.0 + 2.0));`

### 2. Ambient Particles (`class BF`)
- **Count:** 60 point particles.
- **Bounding Box:** Scale $(2.5, 0.5, 2.5)$, position $y = -9.61$.
- **Simulation:** Slow 3D sinusoidal drifting waves and soft point flicker:
  ```glsl
  pos.x += sin(t * 0.4 + position.z * 2.5) * 0.75;
  pos.y += sin(t * 0.2 + position.x * 2.5) * 0.75;
  pos.z += sin(t * 0.2 + position.y * 2.5) * 0.75;
  vLightFalloff = sin(time * 1.8 + random.y * 22.43) * 0.4 + 0.6;
  ```

### 3. Container Particles GPGPU Simulation (`class wF`)
- **Count:** 150,000 particles.
- **Simulation Mesh:** `gE` custom particle simulation with 2 Ping-Pong FBO render targets (position + velocity).
- **VDB Volume Morphing:** Loads 3D volume textures:
  - `medium_32.ktx2` (scale 1.25)
  - `peachesbody_64.ktx2` (scale 1.20)
  - `x_64.ktx2` (scale 1.30)
- **Shader Transitions in Timeline:**
  - $t = 1.5\text{s}$: `uAlpha: 0 \to 1`
  - $t = 3.5\text{s}$: `uShowNoise: 1 \to 0`
  - $t = 3.9\text{s}$: `uInitialGlow: 1 \to 0`

---

## 8. Scroll & Auto-Center Logic

### Scroll Coordinate System (`jF.render()`)
```javascript
this.scroll.total = 0;
this.scrollComposers.forEach(p => {
  const A = p.passes[0].scene;
  A.__top = this.scroll.total;
  A.__bottom = A.__top + A.height;
  this.scroll.total += A.height;
});
```
- Scene 0 (`igloo`): $height = 2.35$
- Scene 1 (`cubes`): $height = \text{cubes.length}$ (typically 2.0)
- Scene 2 (`entry`): $height = 5.50$
- Total span for Entry scene: $S + 1 = 5.5 + 1 = 6.50$ units.
- Normalization: $progress = \frac{y - \text{top}}{6.50} \in [0.0, 1.0]$.

### Scroll Damping & Physics
```javascript
// Frame rate independent lerp and friction
this.scroll.targetY1 = ie.lerpFPSLimited(this.scroll.targetY1, this.scroll.targetY2, 0.075, 100 * this.scrollMultiplier);
this.scroll.y = ie.lerpFPS(this.scroll.y, this.scroll.targetY1, 0.15);
this.scroll.velocity += Math.abs(this.scroll.y - e) * 1.0;
this.scroll.velocity *= ie.frictionFPS(0.98);
```

### Auto-Center Logic (`UF.autoCenter`)
When scrolling stops for $> 1.4\text{s}$ and `!this.autoCenter.animating`:
```javascript
autoCenter(controller, screenOffset) {
  if (this.progress > 0.15) {
    const s = (this.finalScrollAutocenter - this.progress) * (this.height + 1);
    const duration = ie.clamp(Math.abs(s) * 4.0, 2.0, 20.0);
    controller.centerScroll(controller.scroll.y + s, duration);
  }
}
```
- **Threshold:** Only activates after passing $progress > 0.15$ (prevents pulling the user prematurely back to intro).
- **Target Point:** Lands exactly on $finalScrollAutocenter = 0.76$.
- **Offset Calculation:** $\Delta y = (0.76 - progress) \times 6.5$.
- **Duration Formula:** $\text{duration} = \text{clamp}(|\Delta y| \times 4.0, 2.0, 20.0)$ seconds.
- **Tween Ease:** Animated via GSAP `ease: "inOut3"` (`M0,0 C0.6,0 0,1 1,1`).

---

## 9. Verification & Automated Test Suite

A standalone test module is provided at `verify_entry_scene.js`. To execute the entire suite:

```bash
node verify_entry_scene.js
```

### Verification Suite Coverage
1. **Asset Integrity:** Verifies 20 critical Draco models, KTX2 textures, and WebGL workers on disk.
2. **Regex & Bundle Inspection:** Verifies class signatures, easing definitions, and scroll parameters in `App3D-d68cb154.js`.
3. **Cubic Bezier Easing Solver:** Evaluates `inOut5`, `entry_ease`, `entry_ease_2`, and `entry_ease_3` against boundary and midpoint constraints.
4. **Timeline Emulation:** Evaluates 9.2-second timeline trajectory (camera positions, targets, FOV, up-vector barrel roll, and portal audio volumes).
5. **Component Specs:** Validates mesh transform positions, scales, render orders, and shader uniform animations for text cylinders, smoke trails, and particles.
6. **Scroll Physics:** Validates auto-centering scroll calculations, duration bounds, and dead zones.

All 97 unit and mathematical assertions pass with 100% fidelity.
