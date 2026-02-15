import * as THREE from 'three';

// Custom post-processing without dependency on three/addons
// We implement bloom-like glow and chromatic aberration via custom shaders

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;
    this.vhsEnabled = true;
    this.time = 0;

    this.setupRenderTargets();
    this.setupShaders();
  }

  setupRenderTargets() {
    const size = this.renderer.getSize(new THREE.Vector2());
    const params = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    };

    this.renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, params);

    // Bloom targets
    this.bloomTarget = new THREE.WebGLRenderTarget(size.x / 2, size.y / 2, params);
    this.bloomTarget2 = new THREE.WebGLRenderTarget(size.x / 4, size.y / 4, params);
  }

  setupShaders() {
    // Full screen quad
    this.quadGeo = new THREE.PlaneGeometry(2, 2);

    // Brightness extraction shader
    this.brightMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: 0.6 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float threshold;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
          if (brightness > threshold) {
            gl_FragColor = color;
          } else {
            gl_FragColor = vec4(0.0);
          }
        }
      `,
    });

    // Blur shader
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        direction: { value: new THREE.Vector2(1, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform vec2 direction;
        varying vec2 vUv;
        void main() {
          vec4 color = vec4(0.0);
          vec2 off1 = vec2(1.3846153846) * direction / resolution;
          vec2 off2 = vec2(3.2307692308) * direction / resolution;
          color += texture2D(tDiffuse, vUv) * 0.2270270270;
          color += texture2D(tDiffuse, vUv + off1) * 0.3162162162;
          color += texture2D(tDiffuse, vUv - off1) * 0.3162162162;
          color += texture2D(tDiffuse, vUv + off2) * 0.0702702703;
          color += texture2D(tDiffuse, vUv - off2) * 0.0702702703;
          gl_FragColor = color;
        }
      `,
    });

    // Final composite shader with chromatic aberration and VHS
    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        bloomStrength: { value: 0.8 },
        time: { value: 0 },
        vhsEnabled: { value: 1.0 },
        chromaticAberration: { value: 0.003 },
        vignetteIntensity: { value: 0.4 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        uniform float bloomStrength;
        uniform float time;
        uniform float vhsEnabled;
        uniform float chromaticAberration;
        uniform float vignetteIntensity;
        varying vec2 vUv;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          vec2 uv = vUv;

          // VHS scanline wobble
          if (vhsEnabled > 0.5) {
            uv.x += sin(uv.y * 100.0 + time * 2.0) * 0.0003;
            uv.y += sin(time * 0.5) * 0.0002;
          }

          // Chromatic aberration
          float ca = chromaticAberration;
          if (vhsEnabled > 0.5) {
            ca += sin(time * 3.0) * 0.001;
          }

          vec2 dir = uv - vec2(0.5);
          float dist = length(dir);

          float r = texture2D(tDiffuse, uv + dir * ca).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv - dir * ca).b;

          vec3 color = vec3(r, g, b);

          // Add bloom
          vec3 bloom = texture2D(tBloom, vUv).rgb;
          color += bloom * bloomStrength;

          // Vignette
          float vignette = 1.0 - dist * vignetteIntensity;
          vignette = clamp(vignette, 0.0, 1.0);
          vignette = smoothstep(0.0, 1.0, vignette);
          color *= vignette;

          // VHS noise
          if (vhsEnabled > 0.5) {
            float noise = random(uv + time) * 0.03;
            color += noise;

            // Occasional scanline
            float scanline = sin(uv.y * 400.0 + time * 10.0) * 0.02;
            color -= scanline;
          }

          // Subtle color grading - push toward pink/blue
          color.r *= 1.05;
          color.b *= 1.1;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.brightQuad = new THREE.Mesh(this.quadGeo, this.brightMat);
    this.blurQuad = new THREE.Mesh(this.quadGeo, this.blurMat);
    this.compositeQuad = new THREE.Mesh(this.quadGeo, this.compositeMat);

    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();
  }

  setVHS(enabled) {
    this.vhsEnabled = enabled;
    this.compositeMat.uniforms.vhsEnabled.value = enabled ? 1.0 : 0.0;
  }

  setBloom(enabled) {
    this.compositeMat.uniforms.bloomStrength.value = enabled ? 0.8 : 0.0;
  }

  resize(width, height) {
    this.renderTarget.setSize(width, height);
    this.bloomTarget.setSize(width / 2, height / 2);
    this.bloomTarget2.setSize(width / 4, height / 4);
  }

  clearQuadScene() {
    while (this.quadScene.children.length > 0) {
      this.quadScene.remove(this.quadScene.children[0]);
    }
  }

  render(time) {
    this.time = time;

    if (!this.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Render scene to texture
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    // 2. Extract bright areas
    this.brightMat.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.clearQuadScene();
    this.quadScene.add(this.brightQuad);
    this.renderer.setRenderTarget(this.bloomTarget);
    this.renderer.render(this.quadScene, this.orthoCamera);

    // 3. Blur horizontally
    this.blurMat.uniforms.tDiffuse.value = this.bloomTarget.texture;
    this.blurMat.uniforms.resolution.value.set(this.bloomTarget.width, this.bloomTarget.height);
    this.blurMat.uniforms.direction.value.set(1, 0);
    this.clearQuadScene();
    this.quadScene.add(this.blurQuad);
    this.renderer.setRenderTarget(this.bloomTarget2);
    this.renderer.render(this.quadScene, this.orthoCamera);

    // 4. Blur vertically
    this.blurMat.uniforms.tDiffuse.value = this.bloomTarget2.texture;
    this.blurMat.uniforms.resolution.value.set(this.bloomTarget2.width, this.bloomTarget2.height);
    this.blurMat.uniforms.direction.value.set(0, 1);
    this.renderer.setRenderTarget(this.bloomTarget);
    this.renderer.render(this.quadScene, this.orthoCamera);

    // 5. Composite final
    this.compositeMat.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.compositeMat.uniforms.tBloom.value = this.bloomTarget.texture;
    this.compositeMat.uniforms.time.value = time;
    this.clearQuadScene();
    this.quadScene.add(this.compositeQuad);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.orthoCamera);
  }
}
