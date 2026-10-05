import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ---------- post-processing ----------
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAberr: { value: 0.0016 },
    uSat: { value: 1.0 },
    uTint: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uAberr; uniform float uSat; uniform float uTint;
    varying vec2 vUv;
    void main(){
      vec2 d = (vUv - 0.5);
      vec2 off = d * uAberr * (0.4 + length(d) * 2.0);
      vec3 c = vec3( texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b );
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // split toning: cold shadows, warm highlights
      c *= mix(vec3(0.95, 0.98, 1.1), vec3(1.1, 1.0, 0.9), smoothstep(0.02, 0.6, l));
      // sickly red wash as corruption grows
      c = mix(c, c * vec3(1.25, 0.8, 0.8), uTint);
      c = mix(vec3(l), c, uSat);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const ao = new GTAOPass(scene, camera, size.x, size.y);
  ao.output = GTAOPass.OUTPUT.Default;
  ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.2, thickness: 1.2, scale: 1.1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1, rings: 2, samples: 8 });
  composer.addPass(ao);

  const bloom = new UnrealBloomPass(size.clone(), 0.4, 0.6, 0.88);
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return {
    composer,
    bloom,
    grade,
    render: (dt) => composer.render(dt),
    setSize: (w, h) => {
      composer.setSize(w, h);
      ao.setSize(w, h);
    },
  };
}
