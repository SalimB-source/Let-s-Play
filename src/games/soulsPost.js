// ════════════════════════════════════════════════════════════════════
// LA CENDRE — chaîne de post-traitement (v6 « qualité »)
// Render → GTAO (occlusion ambiante) → Bloom → DOF → Output (ACES +
// sRGB) → Étalonnage → FXAA.
// Le GTAO « pose » chaque objet au sol (contact visuel), le DOF donne
// la profondeur de champ cinématique, l'étalonnage pousse l'ambiance
// remaster : hautes lumières ambre, ombres indigo, grain fin animé.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

/** Étalonnage « nuit de cendre » : tons froids, noirs denses, silhouettes lisibles. */
export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 col = tex.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // Étalonnage nocturne : indigo froid dans l'ombre, braise sourde dans
      // les hautes lumières. La saturation reste retenue pour ne pas éclaircir
      // artificiellement les pierres ni masquer les ennemis carmin.
      vec3 warm = col * vec3(1.05, 0.82, 0.97);
      vec3 cool = col * vec3(0.72, 0.86, 1.10);
      col = mix(cool, warm, smoothstep(0.10, 0.68, l));
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, 1.12);
      vec3 sCurve = col * col * (3.0 - 2.0 * clamp(col, 0.0, 1.0));
      col = mix(col, sCurve, 0.10);
      col = max(col * 0.91 - vec3(0.008), vec3(0.0));
      // Vignettage dense, mais doux au centre pour conserver la lisibilité.
      float d = distance(vUv, vec2(0.5, 0.48));
      col *= 1.0 - smoothstep(0.58, 0.95, d) * 0.43;
      // Grain fin animé.
      col += (hash(vUv * 720.0 + fract(uTime) * 37.0) - 0.5) * 0.03;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), tex.a);
    }`,
};

/**
 * Construit la chaîne complète.
 * @returns {{ composer, resize(w,h,dpr), render(dt), setFocus(dist), dispose() }}
 */
export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  const size = renderer.getSize(new THREE.Vector2());

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // GTAO : occlusion ambiante globale — les objets se « posent » au sol.
  const gtao = new GTAOPass(scene, camera, Math.max(1, size.x), Math.max(1, size.y));
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.86;
  composer.addPass(gtao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.64, 0.72, 0.7);
  composer.addPass(bloom);

  // Profondeur de champ : le Gardien Chitine au foyer, la cour se défocle.
  const bokeh = new BokehPass(scene, camera, {
    focus: 4.3,
    aperture: 0.00025,
    maxblur: 0.006,
  });
  composer.addPass(bokeh);

  const output = new OutputPass();
  composer.addPass(output);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);

  let pixelRatio = renderer.getPixelRatio();
  let focusCurrent = 4.3;
  let focusTarget = 4.3;

  return {
    composer,
    resize(width, height, dpr) {
      pixelRatio = dpr;
      composer.setPixelRatio(dpr);
      composer.setSize(width, height);
      fxaa.material.uniforms.resolution.value.set(1 / (width * dpr), 1 / (height * dpr));
    },
    /** Point de netteté (distance caméra → Gardien Chitine), lissé. */
    setFocus(distance) {
      focusTarget = distance;
    },
    render(dt) {
      grade.uniforms.uTime.value += dt;
      focusCurrent += (focusTarget - focusCurrent) * (1 - Math.exp(-8 * dt));
      bokeh.uniforms.focus.value = focusCurrent;
      composer.render(dt);
    },
    dispose() {
      for (const pass of [renderPass, gtao, bloom, bokeh, output, grade, fxaa]) {
        pass.dispose?.();
      }
      composer.dispose?.();
    },
    get pixelRatio() { return pixelRatio; },
  };
}
