class wF{constructor(e){this.scene=e,this.ready=new Promise(t=>{this.isReady=t}),this.cubeSize=.65,this.particles=150*1e3,this.fluidSim=new $U({borders:!1,simRes:128,dyeRes:128,curlStrength:0,splatRadius:.22,splatForce:35,pressureIterations:2,densityDissipation:.88,velocityDissipation:.98,pressureDissipation:.86,splatRadiusVelocity:!1,renderEvent:!1}),this.fluidSim.disable(),this.currentLink=0,this.vdbs=[],this.vdbScales=Be.links.map(t=>t.scale),this.soundControl=new _F(this),this.init()}async init(){const e=await le.load(`volumes/${Be.links[0].vdb}.ktx2`,"3d-data");this.vdbs.push(e);for(let l=1;l<Be.links.length;l++)this.vdbs.push(le.load(`volumes/${Be.links[l].vdb}.ktx2`,"3d-data"));const t=ie.getTextureSizeParticles(this.particles),s=new Float32Array(t*t*4);for(let l=0;l<this.particles;l++)s[l*4+0]=ie.fit(Math.random(),0,1,-this.cubeSize*.5,this.cubeSize*.5),s[l*4+1]=ie.fit(Math.random(),0,1,-this.cubeSize*.5,this.cubeSize*.5),s[l*4+2]=ie.fit(Math.random(),0,1,-this.cubeSize*.5,this.cubeSize*.5),s[l*4+3]=Math.random();const n=new Hi(s,t,t,wt,Lt);n.needsUpdate=!0;const r=new Hi(new Float32Array(t*t*4),t,t,wt,Lt);r.needsUpdate=!0;const a=new Hi(s.slice(),t,t,wt,Lt);a.needsUpdate=!0;const o=new b(-.75,1,-.1);this.mesh=new gE({count:this.particles,geometry:"points",material:new fe({uniformsGroups:[he.UBO],uniforms:{tTexture1:{value:null},tTexture2:{value:null},uColorInitial:{value:new Z("#b5d5ff")},uColorLight:{value:new Z("#bdc6d4")},uColorDark:{value:new Z("#222b42")},uColorFast:{value:new Z("#d7ebfa")},uSize:{value:10},uLightPos:{value:o},uVisible:{value:0},uAlpha:{value:1},uInitialGlow:{value:0}},vertexShader:`
                    ${ae}

                    attribute vec4 rand;
                    attribute vec2 texuv;
                    uniform sampler2D tTexture1;
                    uniform sampler2D tTexture2;

                    uniform float uSize;

                    varying float vShadow;
                    varying float vVel;
                    varying float vY;

                    void main() {
                        vec4 posData = texture2D(tTexture1, texuv);
                        vec4 velData = texture2D(tTexture2, texuv);

                        vec3 pos = posData.xyz;
                        vec4 vPos = modelViewMatrix * vec4(pos, 1.0);
                        float size = uSize;

                        vShadow = posData.w;
                        vVel = velData.w;
                        vY = posData.y;

                        gl_Position = projectionMatrix * vPos;
                        gl_PointSize = size / length(vPos.xyz) * (resolution.y / 1300.0);
                    }
                `,fragmentShader:`
                    ${ae}
                    ${Zo}
                    ${Ht}
                    ${yd}
                    ${AF}

                    uniform vec3 uColorLight;
                    uniform vec3 uColorDark;
                    uniform vec3 uColorInitial;
                    uniform vec3 uColorFast;

                    uniform vec3 uLightPos;

                    uniform float uVisible;
                    uniform float uAlpha;
                    uniform float uInitialGlow;

                    varying float vShadow;
                    varying float vVel;
                    varying float vY;

                    void main() {
                        float alpha = step(length(gl_PointCoord.xy - 0.5), 0.5) * uVisible;
                        if (alpha < 0.001) discard;

                        // calculate normal
                        vec2 uv = 2.0 * gl_PointCoord.xy - 1.0;
                        vec3 n = vec3(uv, sqrt(1.0 - clamp(dot(uv, uv), 0.0, 1.0)));
                        n.y = 1.0 - n.y;

                        // calculate light direction
                        float lightShadow = max(0.0, dot(normalize(rotateY(3.1416) * uLightPos), normalize(n)));
                        float ramp = lightShadow * vShadow;

                        // base color
                        vec3 color = mix(uColorDark, uColorLight, ramp);

                        // highlight color for velocity
                        color = mix(color, uColorFast, pow(fit(vVel, 0.003, 0.005, 0.0, 1.0), 2.0));

                        // poor's man motion blur
                        alpha *= max(uInitialGlow, pow(fit(vVel, 0.002, 0.007, 1.0, 0.0), 2.0) * 0.5 + 0.5);

                        // we do a blending trick here. the initial hidden state requires: alpha 0, uInitialGlow 1 and color white
                        // alpha must be animated first and the color used will be
                        vec3 fadeInColor = mix(vec3(1.0), uColorInitial, linearstep(0.0, 1.0, uAlpha));
                        color = mix(color, fadeInColor, uInitialGlow);

                        gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha * uAlpha);
                    }
                `,depthTest:!0,depthWrite:!0,transparent:!0,blending:cy,blendEquation:ar,blendDst:hy,blendSrc:Ou})},{textures:2,initialTextures:[n,r],material:new fe({uniformsGroups:[he.UBO],uniforms:{tTexture1:{value:null},tTexture2:{value:null},tOrig:{value:a},tVel:this.fluidSim.velUniform,uViewMatrix:{value:new De},uModelMatrix:{value:new De},uProjMatrix:{value:new De},uRotation:{value:0},uCubeSize:{value:this.cubeSize},tVolume:{value:this.vdbs[this.currentLink]},uVolumeScale:{value:this.vdbScales[0]},uLightPos:{value:o},uInteractForce:{value:1},uAdditionalNoise:{value:0},uShowNoise:{value:0}},vertexShader:`
                    attribute vec4 rand;
                    varying vec4 vRand;
                    void main() {
                        vRand = rand;
                        gl_Position = vec4(position, 1.0);
                    }
                `,fragmentShader:`

                    varying vec4 vRand;

                    #define outPos pc_fragColor
                    uniform sampler2D tTexture1;

                    layout(location = 1) out highp vec4 outVel;
                    uniform sampler2D tTexture2;

                    uniform sampler2D tOrig;
                    uniform sampler2D tVel;

                    uniform mat4 uProjMatrix;
                    uniform mat4 uViewMatrix;
                    uniform mat4 uModelMatrix;

                    uniform float uCubeSize;
                    uniform vec3 uLightPos;
                    uniform float uRotation;
                    uniform float uAdditionalNoise;
                    uniform float uShowNoise;
                    uniform float uInteractForce;

                    #ifdef GL_FRAGMENT_PRECISION_HIGH
                        precision highp sampler3D;
                    #else
                        precision mediump sampler3D;
                    #endif
                    uniform sampler3D tVolume;
                    uniform float uVolumeScale;

                    ${ae}
                    ${pF}
                    ${mF}
                    ${yd}

                    void main() {
                        ivec2 uv = ivec2(gl_FragCoord.xy);
                        vec4 currentPos = texelFetch(tTexture1, uv, 0);
                        vec4 currentVel = texelFetch(tTexture2, uv, 0);
                        float positionLimit = uCubeSize * 0.5;

                        // constant rotation
                        mat3 rotMatrix = rotateY(uRotation);

                        // sample volume
                        vec3 samplePos = rotMatrix * (currentPos.xyz / uCubeSize) * uVolumeScale + 0.5;

                        vec4 volData = texture(tVolume, samplePos);
                        vec3 grad = normalize(volData.rgb * 2.0 - 1.0) * rotMatrix;
                        float dist = (volData.a * 2.0 - 1.0) * 2.0;

                        // velocity

                        // fluid sim interaction
                        float pushForce = 0.0005;
                        vec4 wPos = uModelMatrix * vec4(currentPos.xyz, 1.0);
                        vec4 vPos = uViewMatrix * wPos;
                        vec4 posProjected = uProjMatrix * vPos;
                        vec2 uvScreen = (posProjected.xy / posProjected.w + 1.0) * 0.5;
                        vec3 vel = texture2D(tVel, uvScreen).xyz;
                        vec3 up = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
                        vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
                        vec3 disp = right * vel.x + up * vel.y;
                        currentVel.xyz += disp * pushForce * dtRatio * uInteractForce;
                        float invFluidStrength = 1.0 - length(vel) * 0.65 * uInteractForce;

                        float additionalNoise = max(uAdditionalNoise, uShowNoise);

                        // add curl noise
                        float force1 = 0.0002 * (0.7 + 0.3 * vRand.z) + 0.0004 * additionalNoise;
                        currentVel.xyz += BitangentNoise4D(vec4((currentPos.xyz) * 7.0, time * (1.0 + 0.7 * vRand.y))) * force1 * dtRatio;

                        // towards origanl position
                        vec4 origPos = texelFetch(tOrig, uv, 0);
                        vec3 toOrig = origPos.xyz - currentPos.xyz;
                        currentVel.xyz += (origPos.xyz - currentPos.xyz) * 0.001 * dtRatio * invFluidStrength;

                        // towards the surface
                        float force2 = 0.0015 * (0.7 + 0.3 * vRand.w);
                        float signForce = mix(0.0, -0.3, sign(dist) + 1.0);
                        currentVel.xyz += grad * force2 * signForce * dtRatio * invFluidStrength;

                        // friction
                        currentVel.xyz *= frictionFPS(0.9, dtRatio);

                        // position

                        // add vel to position
                        currentPos.xyz += currentVel.xyz * dtRatio;

                        // clamp position to a cube -> switch to cylinder
                        currentPos.y = clamp(currentPos.y, -0.34, 0.35);
                        currentPos.xz = normalize(currentPos.xz) * clamp(length(currentPos.xz), 0.0, 0.275);

                        // https://developer.nvidia.com/gpugems/gpugems/part-iii-materials/chapter-16-real-time-approximations-subsurface-scattering
                        vec3 lightPos = normalize(uLightPos);
                        float wrap = 0.25;
                        float dp = dot(lightPos, grad);
                        float wrapDiffuse = max(0.0, (dp + wrap) / (1.0 + wrap));

                        // bounce
                        dp = -dp;
                        wrapDiffuse += max(0.0, dp) * 0.1;

                        // particles inside the volume are dark
                        // currentPos.a = lerpFPS(currentPos.a, mix(wrapDiffuse * 0.2, wrapDiffuse, smoothstep(-0.05, -0.001, dist)), 0.2, dtRatio);
                        float targetShadow = mix(wrapDiffuse * 0.2, wrapDiffuse, smoothstep(-0.05, -0.001, dist));
                        currentPos.a = mix(targetShadow, currentPos.a, additionalNoise);

                        // save the length of the velocity interpolated for emissiviness
                        currentVel.a = lerpFPS(currentVel.a, length(currentVel.xyz), 0.035, dtRatio);

                        outVel = currentVel;
                        outPos = currentPos;
                    }
                `})}),this.mesh.name="volume particles",this.mesh.position.set(0,-9.785,0),this.mesh.updateMatrixWorld(),this.scene.add(this.mesh),this.initializeShape(),this.UI=new yF(this),await this.UI.ready,q.devScene&&this.UI.enable(),this.scene.beforeRenderCbs.push(this.update.bind(this)),this.isReady()}initializeShape(){let e=0;const t=()=>{e+=Fe.delta,this.mesh.compute(void 0,this.scene,this.scene.camera),e>1e3&&(Q.off("webgl_prerender",t),this.mesh.material.uniforms.uVisible.value=1)};Q.on("webgl_prerender",t)}update(){var e,t;if(this.fluidSim.points[0].position.copy($t.get(0).position01),this.fluidSim._update(Fe.time,Fe.delta),this.mesh.computationMaterial.uniforms.uRotation.value-=Fe.delta*75e-5,!q.devScene){const s=ie.smoothstep(.45,.65,this.scene.progress),n=1-ie.smoothstep(.8,.93,this.scene.progress);this.mesh.computationMaterial.uniforms.uInteractForce.value=s*n,(e=this.soundControl)==null||e.update(s*n)}(t=this.UI)==null||t.update()}}