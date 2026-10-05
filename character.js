import * as THREE from "three";

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const SKIN_HEALTHY = new THREE.Color(0xc98f6a);
const SKIN_WITHERED = new THREE.Color(0x8a9084);
const HAIR_HEALTHY = new THREE.Color(0x1e130d);
const HAIR_WITHERED = new THREE.Color(0x6e6b66);
const TANK = new THREE.Color(0x9a8470);
const TANK_WITHERED = new THREE.Color(0x3c3a3e);

const JOINTS = {
  spineX: 0, spineZ: 0,
  headX: 0, headY: 0, headZ: 0,
  aX: 0, aZ: 0, bX: 0, bZ: 0, aEl: 0, bEl: 0,
  aHip: 0, bHip: 0, aKn: 0, bKn: 0,
  hipsY: 0.97, tiltX: 0, rootY: 0,
};
const fresh = () => ({ ...JOINTS });
const NEUTRAL = { smile: 0, brow: 0, lids: 0, mouth: 0 };

// ---------- painterly low-poly helpers ----------
function brushTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f4f4f4";
  ctx.fillRect(0, 0, 128, 128);
  ctx.lineCap = "round";
  for (let i = 0; i < 110; i++) {
    const v = Math.random() > 0.5 ? 255 : 150;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.14})`;
    ctx.lineWidth = 3 + Math.random() * 9;
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 36, y + (Math.random() - 0.5) * 36);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// vertex-colour gradient: darker toward the bottom, like a painted ambient-occlusion wash
function paint(geo, k = 0.32) {
  if (geo.attributes.color) return geo;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const h = max.y - min.y || 1;
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const b = 1 - k * (1 - (pos.getY(i) - min.y) / h);
    col[i * 3] = b;
    col[i * 3 + 1] = b;
    col[i * 3 + 2] = Math.min(1, b * 1.04);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

const lathe = (pts, seg = 8) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export function createCharacter(scene) {
  const brush = brushTexture();
  const painted = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, map: brush, vertexColors: true, flatShading: true, roughness: 0.9, ...extra });
  const skinMat = painted(SKIN_HEALTHY);
  const hairMat = painted(HAIR_HEALTHY);
  const tankMat = painted(TANK);
  const pantsMat = painted(0x56596e);
  const shoeMat = painted(0xcfcfd4, { roughness: 0.7 });
  const soleMat = painted(0x15151a);

  const thinLimbs = []; // x/z width shrinks with atrophy
  const muscles = []; // bulges that vanish with atrophy
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(paint(geo), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const limb = (pts, mat, parent, seg = 7) => {
    const m = mesh(lathe(pts, seg), mat, parent);
    thinLimbs.push(m);
    return m;
  };
  const bulge = (r, mat, parent, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = mesh(new THREE.IcosahedronGeometry(r, 1), mat, parent, x, y, z);
    m.scale.set(sx, sy, sz);
    muscles.push(m);
    return m;
  };

  const person = new THREE.Group();
  const tilt = new THREE.Group();
  person.add(tilt);
  scene.add(person);

  const hips = new THREE.Group();
  hips.position.y = 0.97;
  tilt.add(hips);
  const pelvis = mesh(lathe([[0, -0.1], [0.15, -0.1], [0.18, -0.02], [0.17, 0.06], [0, 0.08]], 8), pantsMat, hips);

  const spine = new THREE.Group();
  spine.position.y = 0.04;
  hips.add(spine);

  // ---- torso: tapered V, tank top ----
  const torso = mesh(
    lathe([[0, 0], [0.15, 0], [0.17, 0.08], [0.19, 0.2], [0.22, 0.34], [0.255, 0.46], [0.26, 0.54], [0.215, 0.62], [0.09, 0.68], [0, 0.69]], 9),
    tankMat, spine
  );
  const belly = mesh(new THREE.IcosahedronGeometry(0.17, 1), tankMat, spine, 0, 0.14, 0.1);
  belly.scale.setScalar(0.001);
  const neck = mesh(lathe([[0, 0.66], [0.07, 0.66], [0.062, 0.76], [0, 0.77]], 7), skinMat, spine);
  thinLimbs.push(neck);

  // ---- head ----
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.74;
  spine.add(headPivot);
  const head = mesh(new THREE.SphereGeometry(0.115, 12, 9), skinMat, headPivot, 0, 0.135, 0);
  head.scale.set(0.92, 1.14, 1.02);
  const jaw = mesh(new THREE.IcosahedronGeometry(0.06, 1), skinMat, headPivot, 0, 0.04, 0.045);
  jaw.scale.set(1.35, 0.8, 1.0);
  const hair = mesh(new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat, headPivot, 0, 0.15, -0.008);
  hair.scale.set(0.94, 1.1, 1.05);
  hair.rotation.x = -0.28;
  for (const [x, z, rz] of [[-0.05, 0.1, 0.5], [0.04, 0.105, -0.4], [0, 0.11, 0.1]]) {
    const tuft = mesh(new THREE.ConeGeometry(0.03, 0.08, 4), hairMat, headPivot, x, 0.215, z);
    tuft.rotation.set(1.1, 0, rz);
  }
  const nose = mesh(new THREE.ConeGeometry(0.016, 0.04, 5), skinMat, headPivot, 0, 0.1, 0.116);
  nose.rotation.x = Math.PI / 2 - 0.15;
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.IcosahedronGeometry(0.026, 0), skinMat, headPivot, s * 0.107, 0.13, 0);
    ear.scale.set(0.45, 1, 0.75);
  }

  // face decals: drawn skin features + additive red eye glow
  const FACE = 256;
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = faceCanvas.height = FACE;
  const fctx = faceCanvas.getContext("2d");
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = FACE;
  const gctx = glowCanvas.getContext("2d");
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;

  const decalGeo = (r) => new THREE.SphereGeometry(r, 36, 26, Math.PI / 2 - 0.95, 1.9, 0.3 * Math.PI, 0.55 * Math.PI);
  const faceMesh = new THREE.Mesh(decalGeo(0.1152), new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.75, depthWrite: false }));
  head.add(faceMesh);
  const glowMesh = new THREE.Mesh(decalGeo(0.1158), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  head.add(glowMesh);

  const hex = (c) => `#${c.getHexString()}`;
  const skinTone = new THREE.Color();
  const hairTone = new THREE.Color();

  function drawFace(v, e) {
    const W = FACE;
    fctx.clearRect(0, 0, W, W);
    gctx.clearRect(0, 0, W, W);
    skinTone.copy(SKIN_HEALTHY).lerp(SKIN_WITHERED, v);
    hairTone.copy(HAIR_HEALTHY).lerp(HAIR_WITHERED, v);
    const cx = W / 2;
    const eyeY = 93;
    const eyeDX = 40;

    // gaunt cheeks + sunken sockets
    for (const s of [-1, 1]) {
      let g = fctx.createRadialGradient(cx + s * 56, 140, 2, cx + s * 56, 140, 42);
      g.addColorStop(0, `rgba(25,20,22,${0.55 * v})`);
      g.addColorStop(1, "rgba(25,20,22,0)");
      fctx.fillStyle = g;
      fctx.fillRect(0, 90, W, 120);
      g = fctx.createRadialGradient(cx + s * eyeDX, eyeY + 2, 2, cx + s * eyeDX, eyeY + 2, 34);
      g.addColorStop(0, `rgba(30,15,28,${0.18 + 0.6 * v})`);
      g.addColorStop(1, "rgba(30,15,28,0)");
      fctx.fillStyle = g;
      fctx.fillRect(0, 40, W, 110);
      const h = fctx.createRadialGradient(cx + s * 58, 122, 2, cx + s * 58, 122, 28);
      h.addColorStop(0, `rgba(255,220,190,${0.18 * (1 - v)})`);
      h.addColorStop(1, "rgba(255,220,190,0)");
      fctx.fillStyle = h;
      fctx.fillRect(0, 90, W, 70);
    }

    // eyes
    const lidDrop = clamp(e.lids + v * 0.35, 0, 1);
    for (const s of [-1, 1]) {
      const ex = cx + s * eyeDX;
      fctx.save();
      fctx.beginPath();
      fctx.ellipse(ex, eyeY, 21, 10 * (1 - lidDrop * 0.55), 0, 0, Math.PI * 2);
      fctx.clip();
      fctx.fillStyle = `rgb(${lerp(236, 226, v) | 0},${lerp(232, 190, v) | 0},${lerp(222, 170, v) | 0})`;
      fctx.fillRect(ex - 24, eyeY - 14, 48, 28);
      const k = clamp((v - 0.35) / 0.65, 0, 1);
      fctx.fillStyle = v > 0.35 ? `rgb(${lerp(70, 210, k) | 0},${lerp(100, 25, k) | 0},${lerp(130, 20, k) | 0})` : "#4a6a86";
      fctx.beginPath();
      fctx.arc(ex - s, eyeY, 8.5, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = "#050405";
      fctx.beginPath();
      fctx.arc(ex - s, eyeY, 4.2, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = "rgba(255,255,255,0.85)";
      fctx.fillRect(ex - 4, eyeY - 5, 3, 3);
      fctx.fillStyle = hex(skinTone);
      fctx.fillRect(ex - 24, eyeY - 14, 48, 6 + lidDrop * 14);
      fctx.restore();
      fctx.strokeStyle = "rgba(20,10,10,0.85)";
      fctx.lineWidth = 2.4;
      fctx.beginPath();
      fctx.ellipse(ex, eyeY, 21, 10 * (1 - lidDrop * 0.55), 0, Math.PI, Math.PI * 2);
      fctx.stroke();
      fctx.strokeStyle = `rgba(40,20,45,${0.1 + 0.6 * v})`;
      fctx.lineWidth = 3 + v * 3;
      fctx.beginPath();
      fctx.ellipse(ex, eyeY + 5, 20, 9, 0, 0.15 * Math.PI, 0.85 * Math.PI);
      fctx.stroke();

      if (v > 0.3) {
        const a = clamp((v - 0.3) / 0.5, 0, 1);
        const g = gctx.createRadialGradient(ex - s, eyeY, 1, ex - s, eyeY, 16);
        g.addColorStop(0, `rgba(255,70,30,${a})`);
        g.addColorStop(0.5, `rgba(255,30,10,${a * 0.6})`);
        g.addColorStop(1, "rgba(255,0,0,0)");
        gctx.fillStyle = g;
        gctx.fillRect(ex - 20, eyeY - 20, 40, 40);
      }

      // brows: e.brow > 0 is angry (inner end down), < 0 is raised
      const baseY = eyeY - 28 + v * 3;
      const inner = baseY + e.brow * 12 + v * 5;
      const outer = baseY - 2 - e.brow * 3;
      fctx.strokeStyle = hex(hairTone);
      fctx.lineWidth = lerp(9, 3.5, v);
      fctx.lineCap = "round";
      fctx.beginPath();
      fctx.moveTo(ex - s * 22, outer);
      fctx.quadraticCurveTo(ex, baseY - 5, ex + s * 22, inner);
      fctx.stroke();
    }

    // nose shading
    fctx.fillStyle = `rgba(60,30,28,${0.2 + 0.2 * v})`;
    for (const s of [-1, 1]) {
      fctx.beginPath();
      fctx.ellipse(cx + s * 9, 138, 4, 3, 0, 0, Math.PI * 2);
      fctx.fill();
    }
    fctx.strokeStyle = `rgba(60,30,28,${0.25 + 0.35 * v})`;
    fctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      fctx.beginPath();
      fctx.moveTo(cx + s * 6, 108);
      fctx.quadraticCurveTo(cx + s * 12, 128, cx + s * 14, 138);
      fctx.stroke();
    }

    // mouth
    const my = 168;
    const mw = 26 - v * 2;
    const smile = e.smile * 8 - v * 6;
    const open = e.mouth * 14;
    const lipC = `rgb(${lerp(168, 112, v) | 0},${lerp(88, 86, v) | 0},${lerp(80, 88, v) | 0})`;
    if (open > 0.5) {
      fctx.fillStyle = "#1a0707";
      fctx.beginPath();
      fctx.ellipse(cx, my + open * 0.5, mw * 0.8, open * 0.7 + 2, 0, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = "#e8e2d0";
      fctx.fillRect(cx - mw * 0.55, my - 2, mw * 1.1, 4);
    }
    fctx.strokeStyle = lipC;
    fctx.lineCap = "round";
    fctx.lineWidth = 6 - v * 2;
    fctx.beginPath();
    fctx.moveTo(cx - mw, my - smile * 0.5);
    fctx.quadraticCurveTo(cx, my + smile + 1, cx + mw, my - smile * 0.5);
    fctx.stroke();
    fctx.lineWidth = 7 - v * 3;
    fctx.beginPath();
    fctx.moveTo(cx - mw * 0.8, my - smile * 0.3 + 1);
    fctx.quadraticCurveTo(cx, my + smile + open + 8, cx + mw * 0.8, my - smile * 0.3 + 1);
    fctx.stroke();
    fctx.strokeStyle = "rgba(25,8,8,0.8)";
    fctx.lineWidth = 2;
    fctx.beginPath();
    fctx.moveTo(cx - mw, my - smile * 0.5);
    fctx.quadraticCurveTo(cx, my + smile + 1, cx + mw, my - smile * 0.5);
    fctx.stroke();

    // folds, forehead lines, stubble, sores
    fctx.strokeStyle = `rgba(30,15,15,${0.7 * v})`;
    fctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      fctx.beginPath();
      fctx.moveTo(cx + s * 16, 140);
      fctx.quadraticCurveTo(cx + s * 32, 156, cx + s * (mw + 6), my - 4);
      fctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      fctx.beginPath();
      fctx.moveTo(cx - 36, 40 + i * 7);
      fctx.quadraticCurveTo(cx, 36 + i * 7, cx + 36, 40 + i * 7);
      fctx.stroke();
    }
    fctx.fillStyle = `rgba(20,14,12,${0.4 - 0.1 * v})`;
    let seed = 7;
    for (let i = 0; i < 380; i++) {
      seed = (seed * 16807) % 2147483647;
      const r1 = seed / 2147483647;
      seed = (seed * 16807) % 2147483647;
      const r2 = seed / 2147483647;
      const x = cx + (r1 - 0.5) * 150;
      const y = 150 + r2 * 90;
      const dx = (x - cx) / 75;
      const dy = (y - 195) / 55;
      if (dx * dx + dy * dy > 1 || (Math.abs(y - my) < 12 && Math.abs(x - cx) < mw)) continue;
      fctx.fillRect(x, y, 1.4, 1.4);
    }
    if (v > 0.55) {
      const a = (v - 0.55) / 0.45;
      fctx.fillStyle = `rgba(110,30,40,${0.55 * a})`;
      for (const [x, y, r] of [[cx - 60, 150, 5], [cx + 52, 176, 4], [cx + 20, 60, 3.5], [cx - 38, 196, 3]]) {
        fctx.beginPath();
        fctx.arc(x, y, r, 0, Math.PI * 2);
        fctx.fill();
      }
    }
    faceTex.needsUpdate = true;
    glowTex.needsUpdate = true;
  }

  // ---- arms & legs ----
  const ARM_UP = [[0, -0.3], [0.045, -0.3], [0.052, -0.27], [0.068, -0.16], [0.075, -0.08], [0.082, -0.02], [0.07, 0.03], [0, 0.04]];
  const ARM_LO = [[0, -0.28], [0.04, -0.28], [0.045, -0.24], [0.058, -0.12], [0.054, -0.04], [0.05, 0], [0, 0.01]];
  const THIGH = [[0, -0.46], [0.07, -0.46], [0.085, -0.4], [0.1, -0.28], [0.12, -0.15], [0.125, -0.05], [0.11, 0], [0, 0.02]];
  const SHIN = [[0, -0.42], [0.045, -0.42], [0.055, -0.36], [0.07, -0.2], [0.09, -0.12], [0.08, -0.04], [0.075, 0], [0, 0.01]];

  function makeArm(side) {
    const sh = new THREE.Group();
    sh.position.set(side * 0.31, 0.58, 0);
    spine.add(sh);
    limb(ARM_UP, skinMat, sh);
    bulge(0.052, skinMat, sh, 0, -0.14, 0.04, 1, 1.5, 1);
    const el = new THREE.Group();
    el.position.y = -0.3;
    sh.add(el);
    limb(ARM_LO, skinMat, el);
    const hand = new THREE.Group();
    hand.position.y = -0.31;
    el.add(hand);
    const fist = mesh(new THREE.IcosahedronGeometry(0.055, 0), skinMat, hand);
    fist.scale.set(0.9, 1.15, 0.72);
    thinLimbs.push(fist);
    return { sh, el, hand };
  }
  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, -0.02, 0);
    hips.add(hip);
    limb(THIGH, pantsMat, hip, 8);
    const kn = new THREE.Group();
    kn.position.y = -0.46;
    hip.add(kn);
    limb(SHIN, pantsMat, kn, 8);
    const shoe = mesh(new THREE.BoxGeometry(0.115, 0.07, 0.27), shoeMat, kn, 0, -0.395, 0.055);
    mesh(new THREE.BoxGeometry(0.12, 0.03, 0.28), soleMat, kn, 0, -0.44, 0.055);
    thinLimbs.push(shoe);
    return { hip, kn };
  }
  const armA = makeArm(-1);
  const armB = makeArm(1);
  const legA = makeLeg(-1);
  const legB = makeLeg(1);

  // ---- handheld props ----
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: 0x08080a })));
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.108), new THREE.MeshBasicMaterial({ color: 0x9fc4ff }));
  phoneScreen.position.z = 0.006;
  phone.add(phoneScreen);
  const phoneLight = new THREE.PointLight(0x9fc4ff, 0, 2.5, 2);
  phoneLight.position.z = 0.1;
  phone.add(phoneLight);
  phone.position.set(0, -0.04, 0.05);
  phone.rotation.x = -0.6;
  phone.visible = false;
  armB.hand.add(phone);

  const food = new THREE.Group();
  const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 3), new THREE.MeshStandardMaterial({ color: 0xe0902a, roughness: 0.6 }));
  slice.rotation.z = Math.PI / 2;
  food.add(slice);
  for (const [y, z] of [[0, 0.02], [0.03, -0.03], [-0.03, -0.02]]) {
    const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), new THREE.MeshStandardMaterial({ color: 0xa02818 }));
    pep.position.set(0.012, y, z);
    pep.rotation.z = Math.PI / 2;
    food.add(pep);
  }
  food.position.set(0, -0.06, 0.04);
  food.visible = false;
  armB.hand.add(food);

  const chips = new THREE.Group();
  chips.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.035), new THREE.MeshStandardMaterial({ color: 0xd8402a, roughness: 0.5 })));
  const chipsTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 }));
  chipsTop.position.y = 0.085;
  chips.add(chipsTop);
  chips.position.set(0, -0.06, 0.04);
  chips.visible = false;
  armA.hand.add(chips);

  // headphones (podcast)
  const headphones = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0x111116, metalness: 0.5, roughness: 0.4 }));
  band.position.y = 0.13;
  headphones.add(band);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, emissive: 0x2a5aff, emissiveIntensity: 0, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.045, 12), cupMat);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(s * 0.12, 0.13, 0);
    headphones.add(cup);
  }
  headphones.visible = false;
  headPivot.add(headphones);

  for (const m of thinLimbs) m.userData.base = m.scale.clone();
  for (const m of muscles) m.userData.base = m.scale.clone();

  // ---------- atrophy ----------
  const look = { v: 0, bloat: 0, drawn: -1 };
  function applyBody() {
    const v = look.v;
    torso.scale.set(lerp(1.18, 0.8, v), 1, lerp(0.72, 0.45, v));
    pelvis.scale.set(lerp(1.15, 0.95, v), 1, lerp(0.8, 0.6, v));
    const b = 0.001 + look.bloat * 1.0;
    belly.scale.set(1.15 * b, 0.9 * b, 0.95 * b);
  }
  function setAtrophy(v) {
    const w = lerp(1, 0.38, v);
    for (const m of thinLimbs) m.scale.set(m.userData.base.x * w, m.userData.base.y, m.userData.base.z * w);
    const mu = lerp(0.12, 0.9, Math.pow(1 - v, 1.3));
    for (const m of muscles) m.scale.set(m.userData.base.x * mu, m.userData.base.y * mu, m.userData.base.z * mu);
    skinMat.color.copy(SKIN_HEALTHY).lerp(SKIN_WITHERED, v);
    hairMat.color.copy(HAIR_HEALTHY).lerp(HAIR_WITHERED, v);
    tankMat.color.copy(TANK).lerp(TANK_WITHERED, v);
    hair.scale.set(0.94 * lerp(1, 0.9, v), lerp(1.1, 1.0, v), 1.05 * lerp(1, 0.9, v));
    head.scale.set(0.92 * lerp(1, 0.9, v), 1.14, 1.02 * lerp(1, 0.92, v));
    jaw.scale.set(lerp(1.35, 0.9, v), lerp(0.8, 0.7, v), lerp(1, 0.85, v));
    look.v = v;
    applyBody();
  }
  setAtrophy(0);

  // ---------- pose targets ----------
  const cur = fresh();
  let gait = 0;
  const expr = { ...NEUTRAL };
  const exprTarget = { ...NEUTRAL };
  let redrawT = 0;

  const actor = {
    person, tilt, spine, headPivot, headphones, cupMat,
    phone, phoneLight, food, chips,
    handA: armA.hand, handB: armB.hand,
    move: null,
    face: null,
    pose: null,
    collapse: false,
    rep: -10,
    strain: -10,
    failed: false,
    bloatTarget: 0,
    time: 0,
  };

  function idle(t, v) {
    const T = fresh();
    const br = Math.sin(t * 1.6);
    T.spineX = 0.02 + br * 0.012 + 0.55 * v;
    T.headX = -0.02 + br * 0.01 - 0.3 * v;
    T.headY = Math.sin(t * 0.4) * 0.12 * (1 - 0.6 * v);
    T.aX = T.bX = -0.04 + 0.22 * v;
    T.aZ = -0.12 + 0.08 * v;
    T.bZ = 0.12 - 0.08 * v;
    T.aEl = T.bEl = -0.12 - 0.35 * v;
    T.aHip = T.bHip = -0.12 * v;
    T.aKn = T.bKn = 0.2 * v;
    T.hipsY = 0.97 - 0.05 * v;
    T.spineZ = (Math.random() - 0.5) * 0.03 * v;
    T.aX += (Math.random() - 0.5) * 0.05 * v;
    T.bX += (Math.random() - 0.5) * 0.05 * v;
    return T;
  }

  function applyGait(T, speed, run, v) {
    const amp = (run ? 0.95 : 0.55) * (1 - 0.35 * v);
    const s = Math.sin(gait);
    T.aHip = s * amp;
    T.bHip = -s * amp;
    T.aKn = Math.max(0, -Math.cos(gait)) * amp * 1.3 + (run ? 0.25 : 0.05);
    T.bKn = Math.max(0, Math.cos(gait)) * amp * 1.3 + (run ? 0.25 : 0.05);
    T.aX = -s * amp * 0.8;
    T.bX = s * amp * 0.8;
    if (run) {
      T.aEl = T.bEl = -1.4;
      T.spineX += 0.22;
    }
    T.hipsY -= Math.abs(s) * (run ? 0.06 : 0.025);
  }

  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  function update(dt, t, v, ctx) {
    actor.time = t;
    const T = idle(t, v);
    if (ctx.tempted) {
      T.headY += Math.sin(t * 2.3) * 0.28;
      T.spineZ += Math.sin(t * 1.7) * 0.04;
      T.aX -= 0.15;
      T.bX -= 0.15;
      T.aEl -= 0.5;
      T.bEl -= 0.5;
    }

    let moving = false;
    if (actor.move) {
      const m = actor.move;
      const dx = m.x - person.position.x;
      const dz = m.z - person.position.z;
      const dist = Math.hypot(dx, dz);
      const speed = typeof m.speed === "function" ? m.speed() : m.speed;
      const yawT = Math.atan2(dx, dz);
      const err = angleDiff(yawT, person.rotation.y);
      person.rotation.y += Math.sign(err) * Math.min(Math.abs(err), dt * 9);
      if (dist < 0.04) {
        person.position.x = m.x;
        person.position.z = m.z;
        actor.move = null;
        m.resolve();
      } else if (Math.abs(err) < 0.7) {
        const step = Math.min(dist, speed * dt);
        person.position.x += (dx / dist) * step;
        person.position.z += (dz / dist) * step;
        gait += dt * speed * (m.run ? 2.1 : 3.4) * (1 - 0.3 * v);
        moving = true;
        applyGait(T, speed, m.run, v);
      }
      person.visible = person.position.x < 13;
    } else if (actor.face) {
      const f = actor.face;
      const err = angleDiff(f.yaw, person.rotation.y);
      person.rotation.y += Math.sign(err) * Math.min(Math.abs(err), dt * 7);
      if (Math.abs(err) < 0.03) {
        actor.face = null;
        f.resolve();
      }
    }

    if (!moving && actor.pose) actor.pose(T, t, v);
    if (actor.collapse) {
      T.tiltX = 1.5;
      T.rootY = 0.14;
      T.aX = T.bX = -0.2;
      T.aZ = -0.5;
      T.bZ = 0.5;
      T.spineX = 0.1;
      T.aEl = T.bEl = -0.2;
      T.headX = 0;
      T.hipsY = 0.97;
    }

    const rate = 1 - Math.exp(-dt * (actor.collapse ? 4 : 13));
    for (const k in cur) cur[k] += (T[k] - cur[k]) * rate;

    spine.rotation.set(cur.spineX, 0, cur.spineZ);
    headPivot.rotation.set(cur.headX, cur.headY, cur.headZ);
    armA.sh.rotation.set(cur.aX, 0, cur.aZ);
    armB.sh.rotation.set(cur.bX, 0, cur.bZ);
    armA.el.rotation.x = cur.aEl;
    armB.el.rotation.x = cur.bEl;
    legA.hip.rotation.x = cur.aHip;
    legB.hip.rotation.x = cur.bHip;
    legA.kn.rotation.x = cur.aKn;
    legB.kn.rotation.x = cur.bKn;
    hips.position.y = cur.hipsY;
    tilt.rotation.x = cur.tiltX;
    person.position.y = cur.rootY;

    // expression easing + face redraw
    let changed = false;
    for (const k in expr) {
      const d = exprTarget[k] - expr[k];
      if (Math.abs(d) > 0.002) {
        expr[k] += d * (1 - Math.exp(-dt * 12));
        changed = true;
      }
    }
    redrawT += dt;
    if ((changed || look.drawn !== look.v) && redrawT > 0.04) {
      drawFace(look.v, expr);
      look.drawn = look.v;
      redrawT = 0;
    }
    if (Math.abs(actor.bloatTarget - look.bloat) > 0.002) {
      look.bloat += (actor.bloatTarget - look.bloat) * (1 - Math.exp(-dt * 2));
      applyBody();
    }
  }

  function moveTo(x, z, opts = {}) {
    return new Promise((resolve) => {
      actor.move = { x, z, speed: opts.speed ?? 1.7, run: !!opts.run, resolve };
    });
  }

  function faceYaw(yaw) {
    return new Promise((resolve) => {
      actor.face = { yaw, resolve };
    });
  }

  function setExpression(e) {
    Object.assign(exprTarget, NEUTRAL, e || {});
  }

  function reset() {
    actor.move = null;
    actor.face = null;
    actor.pose = null;
    actor.collapse = false;
    actor.bloatTarget = 0;
    look.bloat = 0;
    person.position.set(0, 0, 0.5);
    person.rotation.set(0, 0, 0);
    person.visible = true;
    headphones.visible = false;
    phone.visible = food.visible = chips.visible = false;
    setExpression(null);
    for (const k in cur) cur[k] = JOINTS[k];
  }

  person.position.set(0, 0, 0.5);
  drawFace(0, expr);

  return { actor, person, spine, setAtrophy, setExpression, update, moveTo, faceYaw, reset, cupMat };
}
