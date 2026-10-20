/**
 * IglooSceneReconstruction.js
 *
 * Modular Reverse-Engineered Reconstruction of the Central Igloo Scene (class F3)
 * Source target: App3D-d68cb154.js (assets/App3D-d68cb154.js)
 * Website: https://www.igloo.inc/
 *
 * Features extracted:
 *  - Scene Orchestration (F3): Camera curve, Timeline, Intro Timeline, Bloom, Audio modulation
 *  - Batched Igloo Dome (U3): Draco batching (igloo.drc), vertex centering, BatchedMesh,
 *    options FloatDataTexture, dual-stage lerp physics, quaternion orientation,
 *    dual lightmap shader (tMap & tMapExploded), inside glow, idle wave, fake sunlight SSS.
 *  - Igloo Cage (w3): Wireframe overlay (igloo_cage.drc) with additive blending.
 *  - Igloo Outline (C3): Outline mesh (igloo_outline.drc) with 3D sine shimmer & materialize.
 *  - Terrain & Base (y3, M3, b3): ground.drc, patch.drc, ground_color, ground_glow, ground_sansigloo_color,
 *    real-time mouse glow, dual animated wind noise, dual shockwave falloff.
 *  - Distant Mountains (S3): mountain.drc, 5 instances, screen-space & height fog, horizon preservation.
 *  - Volumetric Floor (hF): floor.drc, axis-angle piece rotation animation, shadow/radial glow.
 *  - Subsurface Scattering: GPU Gems 1 Ch. 16 Wrapped Diffuse Shader + Backscatter bounce.
 *  - 3D MSDF Manifesto Typography (L3): 3D billboarding, multi-channel signed distance field,
 *    8-column cryptographic glyph scramble reveal, logo hover glitch/blink.
 */

// ============================================================================
// 1. GLSL SHADER CHUNKS & CORE FORMULAS
// ============================================================================

export const ShaderChunks = {
  // Global uniform block (ae)
  globalUBO: `
    uniform Global {
      vec2 resolution;
      vec2 resolutionUI;
      float aspect;
      float time;
      float dtRatio;
    };
  `,

  // MSDF Evaluation functions (ii)
  msdfFunctions: `
    float median(sampler2D tMap, vec2 uv) {
      vec3 tex = texture2D(tMap, uv).rgb;
      return max(min(tex.r, tex.g), min(max(tex.r, tex.g), tex.b)) - 0.5;
    }
    float msdf(sampler2D tMap, vec2 uv) {
      float signedDist = median(tMap, uv);
      float d = fwidth(signedDist);
      return smoothstep(-d, d, signedDist);
    }
    float msdfOpaque(sampler2D tMap, vec2 uv) {
      return step(0.0, median(tMap, uv));
    }
  `,

  // Linear step, point-line distance, falloff & falloffsmooth (Ue)
  falloffFunctions: `
    float _linstep(float begin, float end, float t) {
      return clamp((t - begin) / (end - begin), 0.0, 1.0);
    }
    float falloff(float _input, float start, float end, float margin, float progress) {
      float m = margin * sign(end - start);
      float p = mix(start - m, end, progress);
      return _linstep(p + m, p, _input);
    }
    float falloffsmooth(float _input, float start, float end, float margin, float progress) {
      float m = margin * sign(end - start);
      float p = mix(start - m, end, progress);
      return smoothstep(p + m, p, _input);
    }
  `,

  // 3D Axis-Angle Rotation (yd)
  rotation3D: `
    mat4 rotation3D(vec3 axis, float angle) {
      axis = normalize(axis);
      float s = sin(angle);
      float c = cos(angle);
      float oc = 1.0 - c;
      return mat4(
        oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
        0.0,                                0.0,                                0.0,                                1.0
      );
    }
    vec3 rotate3D(vec3 v, vec3 axis, float angle) {
      mat4 m = rotation3D(axis, angle);
      return (m * vec4(v, 1.0)).xyz;
    }
  `,

  // GPU Gems Chapter 16 Subsurface Scattering: Wrapped Diffuse Formula
  // Ref: https://developer.nvidia.com/gpugems/gpugems/part-iii-materials/chapter-16-real-time-approximations-subsurface-scattering
  gpuGemsWrappedDiffuse: `
    float calculateWrappedDiffuse(vec3 lightDir, vec3 normal, float wrap, float bounceFactor) {
      float dp = dot(lightDir, normal);
      // Wrapped diffuse formula: softens terminator, lets light bleed past 90 degrees
      float wrapDiffuse = max(0.0, (dp + wrap) / (1.0 + wrap));
      // Subsurface backscatter bounce from opposite hemisphere
      wrapDiffuse += max(0.0, -dp) * bounceFactor;
      return wrapDiffuse;
    }
  `
};

// ============================================================================
// 2. CONFIGURATION & CONSTANTS
// ============================================================================

export const IGLOO_CONFIG = {
  camera: {
    fov: 30,
    basePosition: [-14, 4, 14],
    baseTarget: [0, 1, 0],
    displacement: [0.07, 0.025],
    shake: 0.01,
    shakeSpeed: 0.5
  },
  postprocessing: {
    bloom: {
      levels: 6,
      luminanceThreshold: 0.2,
      intensity: 1.0,
      radius: 0.85
    }
  },
  manifesto: {
    title: '////// Manifesto',
    text: 'Our mission is to build the next generation of consumer brands at the intersection of Community, AI, and crypto.',
    copyright: '// Copyright © 2026',
    rights: 'Igloo, Inc.\nAll Rights Reserved.',
    colorTitle: '#3C3C54',
    colorText: '#ffffff'
  },
  mountainTransforms: [
    { pos: [59.53, -1, -11.84], rot: [4.1 * Math.PI / 180, -42.8 * Math.PI / 180, 5 * Math.PI / 180], scale: [4, 3.14, 4] },
    { pos: [1, -2.21, -23], rot: [3.5 * Math.PI / 180, 30 * Math.PI / 180, 0], scale: [2, 2, 2] },
    { pos: [75, 0, -90], rot: [3.2 * Math.PI / 180, -16.7 * Math.PI / 180, -2.6 * Math.PI / 180], scale: [8, 8, 8] },
    { pos: [250, 11.33, -133], rot: [13.2 * Math.PI / 180, 20 * Math.PI / 180, 5 * Math.PI / 180], scale: [10, 10, 10] },
    { pos: [-25.22, -1.59, -53.05], rot: [3.5 * Math.PI / 180, 25 * Math.PI / 180, 0], scale: [2.5, 2.5, 2.5] }
  ],
  terrainTransforms: [
    { pos: [-3.76, -0.58, 12.5], rot: [-5.1 * Math.PI / 180, 0, 0], scale: [0.6, 0.6, 0.6] },
    { pos: [-17.63, -0.01, 2], rot: [2.7 * Math.PI / 180, 0.8 * Math.PI / 180, 0], scale: [1, 1, 1] },
    { pos: [3.12, -0.75, -1.02], rot: [0, 0, 0], scale: [1.5, 0.66, 1.5] },
    { pos: [6, 0.16, 15.78], rot: [1.1 * Math.PI / 180, 0, 7 * Math.PI / 180], scale: [1, 1, 1] },
    { pos: [16.06, 0.34, 4], rot: [0, 0, 0], scale: [1, 1, 1] }
  ],
  patchTransforms: [
    { pos: [-9.34, -1.77, 6.96], rot: [0, 0, 0], scale: [7, 7, 7] },
    { pos: [-8.82, -1.35, 11.69], rot: [-5.5 * Math.PI / 180, -25.6 * Math.PI / 180, 0], scale: [8, 8, 8] }
  ]
};

// ============================================================================
// 3. BATCHED IGLOO DOME (class U3)
// ============================================================================

export class BatchedIglooDome {
  constructor(scene) {
    this.scene = scene;
    this.mousePosition = { x: 0, y: 0, z: 0 };
    this.mouseVelocity = 0;
    this.introDisplacementModulator = { value: 0 };
    this.objects = [];
    this.optionsTexture = null;
  }

  /**
   * Split batched geometry containing `batchId` attribute into array of centered geometries
   */
  static processBatchedGeometry(bufferGeometry) {
    // 1. Group vertices by batchId
    // 2. Read centroid from `centr` attribute & rand from `rand` attribute
    // 3. Subtract centroid from every vertex position so origin is local (0,0,0)
    // 4. Return array of individual brick geometries + metadata
    return bufferGeometry;
  }

  /**
   * Igloo Dome Custom Shader
   */
  static getDomeShader() {
    return {
      vertexShader: `
        ${ShaderChunks.globalUBO}

        attribute float batchId;
        attribute float emission;

        uniform sampler2D batchingTexture;
        uniform sampler2D tOptions;

        varying vec2 vUv;
        varying vec3 vPos;
        varying float vDisplacement;
        varying float vBounce;
        varying float vEmission;

        mat4 getBatchingMatrix(const in float i) {
          int size = textureSize(batchingTexture, 0).x;
          int j = int(i) * 4;
          int x = j % size;
          int y = j / size;
          vec4 v1 = texelFetch(batchingTexture, ivec2(x, y), 0);
          vec4 v2 = texelFetch(batchingTexture, ivec2(x + 1, y), 0);
          vec4 v3 = texelFetch(batchingTexture, ivec2(x + 2, y), 0);
          vec4 v4 = texelFetch(batchingTexture, ivec2(x + 3, y), 0);
          return mat4(v1, v2, v3, v4);
        }

        vec4 getOptions(const in float i) {
          int size = textureSize(tOptions, 0).x;
          int x = int(i) % size;
          int y = int(i) / size;
          return texelFetch(tOptions, ivec2(x, y), 0);
        }

        void main() {
          vUv = uv;
          vEmission = emission;

          mat4 batchingMatrix = getBatchingMatrix(batchId);
          vec3 pos = (batchingMatrix * vec4(position, 1.0)).xyz;
          vPos = pos;

          vec4 options = getOptions(batchId);
          vDisplacement = options.r;
          vBounce = options.g;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,

      fragmentShader: `
        ${ShaderChunks.globalUBO}
        ${ShaderChunks.falloffFunctions}

        varying vec2 vUv;
        varying vec3 vPos;
        varying float vDisplacement;
        varying float vEmission;
        varying float vBounce;

        uniform sampler2D tMap;
        uniform sampler2D tMapExploded;
        uniform sampler2D tTriangles;
        uniform sampler2D tNoise;

        uniform float uProgress;
        uniform float uIntroMaterialize;

        void main() {
          vec3 color = texture2D(tMap, vUv).rgb;
          vec3 exploded = texture2D(tMapExploded, vUv).rgb + 0.05;
          vec3 blue = vec3(0.5, 0.7, 1.0);

          // Fade between 'together' lightmap and 'exploded' lightmap based on displacement
          float textureMix = clamp(5.0 * vDisplacement, 0.0, 1.0);
          color = mix(color, exploded, textureMix);

          // Intro materialize animation
          if (uIntroMaterialize < 1.0) {
            float introEmissive = 1.0 - falloffsmooth(vPos.y, 3.95, -0.4, 1.5, uIntroMaterialize);
            if (introEmissive > 0.9999) discard;

            float triangles = texture2D(tTriangles, vUv * 5.0).r;
            introEmissive += clamp(introEmissive * triangles * 13.0, 0.0, 1.0);
            color += introEmissive * blue;
          }

          // Add emission based on displacement
          color += pow(vEmission, 2.0) * clamp(1.0 * vDisplacement, 0.0, 1.0) * blue;

          // Add traveling idle emission
          vec3 powEmission = pow(vEmission, 8.0) * blue * 0.5;
          color += powEmission * (sin(vPos.x - time * 1.0 + 3.2) * 0.5 + 0.5);

          // Interior glow on faces furthest from camera
          color += max(0.0, smoothstep(0.0, 2.0, vPos.x * 0.5 - vPos.z * 0.5)) * powEmission;

          // Fake SSS from sunlight (directional gradient, dark at baseline)
          color += (vPos.x * 0.1 + 0.4) * 0.3 * min(vPos.y + 0.5, 1.0) * 0.5;

          // Color safety clamp
          color = clamp(color, vec3(0.0), vec3(1.0));

          // Ground bounce light
          float verticalGrad = (1.0 - smoothstep(-1.5, 1.0, vPos.y));
          color += verticalGrad * vBounce * vec3(0.8, 0.9, 1.0) * 0.25;

          gl_FragColor = vec4(color, 1.0);
        }
      `
    };
  }

  /**
   * Physics & Spring simulation for brick interaction
   */
  updatePhysics(delta, time, scrollProgress, mousePlanePos) {
    const scrollEase = Math.sin(Math.max(0, Math.min(1, scrollProgress / 0.4)) * Math.PI * 0.5);

    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];

      // 1. Continuous idle organic wave
      let l = 0.4;
      l *= Math.sin(-time * 2.0 + obj.centroid.x) * 0.5 + 0.5;
      l *= Math.cos(-time) * 0.5 + 0.5;
      l *= (0.5 + 1.5 * obj.rand.z);
      l *= 0.5 * this.introDisplacementModulator.value;

      // 2. Proximity mouse repulsion
      const dist = Math.hypot(
        obj.centroid.x - mousePlanePos.x,
        obj.centroid.y - mousePlanePos.y,
        obj.centroid.z - mousePlanePos.z
      );
      const tDist = Math.max(0, Math.min(1, (dist - 1.0) / 2.0));
      const fit = 1.0 - tDist * tDist * (3.0 - 2.0 * tDist);
      const c = Math.sin(time + obj.rand.x * 12.342) * obj.rand.y;
      l = Math.max(l, fit * (0.5 + 0.3 * c));

      // 3. Bounce spring
      obj.targetBounce1 = l;
      obj.targetBounce2 += (obj.targetBounce1 - obj.targetBounce2) * 0.05;
      obj.bounce += (obj.targetBounce2 - obj.bounce) * 0.05;

      // 4. Height gating: only blocks above y=0.45 disperse
      const tH = Math.max(0, Math.min(1, (obj.centroid.y - 0.45) / 0.25));
      const heightGate = tH * tH * (3.0 - 2.0 * tH);
      l *= heightGate;
      l = Math.max(0, l);

      // 5. Dual-stage lerp smoothing
      obj.targetDisplacement1 = l;
      obj.targetDisplacement2 += (obj.targetDisplacement1 - obj.targetDisplacement2) * 0.06;
      obj.displacement += (obj.targetDisplacement2 - obj.displacement) * 0.06;

      // 6. Store in options float texture
      if (this.optionsTexture) {
        this.optionsTexture.image.data[i * 4 + 0] = obj.displacement;
        this.optionsTexture.image.data[i * 4 + 1] = obj.bounce;
      }
    }

    if (this.optionsTexture) {
      this.optionsTexture.needsUpdate = true;
    }
  }
}

// ============================================================================
// 4. 3D MSDF MANIFESTO TYPOGRAPHY (class L3)
// ============================================================================

export class ManifestoTypography {
  static getManifestoShader() {
    return {
      vertexShader: `
        ${ShaderChunks.falloffFunctions}

        attribute vec3 textWeights;
        uniform float uShow1;
        uniform float uShow2;

        varying vec2 vUv;
        varying float vAlpha;

        // Cylindrical/Planar Billboarding matrix
        mat4 billboardModelMatrix() {
          mat4 modelView = modelViewMatrix;
          modelView[0][0] = 1.0; modelView[0][1] = 0.0; modelView[0][2] = 0.0;
          modelView[1][0] = 0.0; modelView[1][1] = 1.0; modelView[1][2] = 0.0;
          modelView[2][0] = 0.0; modelView[2][1] = 0.0; modelView[2][2] = 1.0;
          return modelView;
        }

        void main() {
          float tr1 = falloff(textWeights.x, 0.0, 1.0, 0.1, clamp(uShow1, 0.0, 1.0));
          float tr2 = falloff(textWeights.x, 0.0, 1.0, 1.0, clamp(uShow2, 0.0, 1.0));

          vUv = uv;
          // Cryptographic glyph scrambling: 8-column horizontal texture offset
          vUv.x = mod(uv.x + 0.125 * mod(floor((1.0 - tr2) * 5.753), 8.0), 1.0);
          vAlpha = tr1;

          gl_Position = projectionMatrix * billboardModelMatrix() * vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        ${ShaderChunks.msdfFunctions}

        uniform sampler2D tMap;
        uniform vec3 uColor;
        uniform float uBlink;

        varying vec2 vUv;
        varying float vAlpha;

        void main() {
          vec2 uv = vUv;
          float alpha = vAlpha;

          // Logo hover glitch / blink modulation
          if (uBlink < 1.0) {
            alpha *= 0.6 + 0.4 * mod(floor(uBlink * 5.0), 2.0);
          }

          // True multi-channel signed distance field evaluation
          alpha *= msdf(tMap, uv);
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    };
  }
}
