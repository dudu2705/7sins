import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createPost } from "./style.js";

const rand = (a, b) => a + Math.random() * (b - a);

// ---------- procedural textures ----------
function canvasTex(size, draw, repeatX = 1, repeatY = 1, srgb = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function speckle(ctx, size, count) {
  for (let i = 0; i < count; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, rand(1, 3), rand(1, 3));
  }
}

function plasterTexture(ctx, s) {
  ctx.fillStyle = "#1d2129";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, rand(40, 140));
    const l = rand(10, 24);
    g.addColorStop(0, `hsla(220,14%,${l}%,0.35)`);
    g.addColorStop(1, `hsla(220,14%,${l}%,0)`);
    ctx.save();
    ctx.translate(Math.random() * s, Math.random() * s);
    ctx.fillStyle = g;
    ctx.fillRect(-160, -160, 320, 320);
    ctx.restore();
  }
  // damp streaks running down from the ceiling
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * s;
    const g = ctx.createLinearGradient(0, 0, 0, s * rand(0.2, 0.6));
    g.addColorStop(0, "rgba(5,8,10,0.45)");
    g.addColorStop(1, "rgba(5,8,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, rand(4, 18), s);
  }
  speckle(ctx, s, 9000);
}

function plankTexture(ctx, s) {
  const n = 12;
  const w = s / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `hsl(${rand(20, 30)},${rand(25, 40)}%,${rand(9, 15)}%)`;
    ctx.fillRect(i * w, 0, w, s);
    for (let k = 0; k < 40; k++) {
      ctx.strokeStyle = `rgba(0,0,0,${rand(0.05, 0.2)})`;
      ctx.beginPath();
      const x = i * w + rand(2, w - 2);
      ctx.moveTo(x, 0);
      ctx.lineTo(x + rand(-2, 2), s);
      ctx.stroke();
    }
    ctx.fillStyle = "#050405";
    ctx.fillRect(i * w, 0, 2, s);
    const j = rand(0.2, 0.8) * s;
    ctx.fillRect(i * w, j, w, 2);
  }
  speckle(ctx, s, 6000);
}

function glowTexture(inner, mid) {
  return canvasTex(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, mid);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

function sigilTexture() {
  return canvasTex(1024, (ctx, s) => {
    const c = s / 2;
    ctx.translate(c, c);
    ctx.strokeStyle = "#ff5a2a";
    ctx.shadowColor = "#ff3a10";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 5;
    for (const r of [c - 14, c - 38, c * 0.62]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 7; i++) {
      const a = ((i * 3) / 7) * Math.PI * 2 - Math.PI / 2;
      const r = c * 0.62;
      ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2;
      const r1 = c - 38;
      const r2 = c - 14;
      const len = i % 8 === 0 ? 0 : rand(0.3, 1);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * (r1 + (r2 - r1) * len), Math.sin(a) * (r1 + (r2 - r1) * len));
      ctx.stroke();
    }
  });
}

function posterTexture(kind) {
  return canvasTex(256, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    if (kind === 0) {
      g.addColorStop(0, "#2a0c10");
      g.addColorStop(1, "#08060a");
    } else {
      g.addColorStop(0, "#0c1a2a");
      g.addColorStop(1, "#05070c");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = kind === 0 ? "#c9b48a" : "#9fb6d8";
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.4, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#050305";
    if (kind === 0) {
      for (const x of [-0.08, 0.08]) {
        ctx.beginPath();
        ctx.arc(s / 2 + x * s, s * 0.38, s * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillRect(s / 2 - 6, s * 0.46, 12, 22);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.8);
      for (let x = 0; x <= s; x += 16) ctx.lineTo(x, s * 0.7 - Math.abs(Math.sin(x * 0.05)) * 40);
      ctx.lineTo(s, s);
      ctx.lineTo(0, s);
      ctx.fill();
    }
    ctx.fillStyle = kind === 0 ? "#c9b48a" : "#9fb6d8";
    ctx.font = "bold 20px serif";
    ctx.textAlign = "center";
    ctx.fillText(kind === 0 ? "MEMENTO MORI" : "NIGHTFALL", s / 2, s * 0.9);
  });
}

function crackTexture() {
  return canvasTex(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const g = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(0,0,0,0.65)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(0,0,0,0.95)";
    ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      let x = s / 2;
      let y = s / 2;
      let a = (i / 11) * Math.PI * 2 + rand(-0.2, 0.2);
      ctx.lineWidth = rand(1.5, 3.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        a += rand(-0.6, 0.6);
        const l = rand(10, 24);
        x += Math.cos(a) * l;
        y += Math.sin(a) * l;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

function rectPath(p, cx, y0, w, h) {
  p.moveTo(cx - w / 2, y0);
  p.lineTo(cx + w / 2, y0);
  p.lineTo(cx + w / 2, y0 + h);
  p.lineTo(cx - w / 2, y0 + h);
  p.closePath();
  return p;
}

// monitor content, redrawn per mode
function makeScreen() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 144;
  const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  function draw(mode) {
    const w = c.width;
    const h = c.height;
    if (mode === "lust") {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#5a0f2e");
      g.addColorStop(1, "#c0306a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.filter = "blur(10px)";
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `rgba(255,${rand(120, 200)},${rand(150, 210)},0.45)`;
        ctx.beginPath();
        ctx.ellipse(rand(20, w - 20), rand(30, h - 10), rand(14, 30), rand(24, 50), rand(0, 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = "none";
    } else if (mode === "greed") {
      ctx.fillStyle = "#04140a";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#3dff7a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      let y = h * 0.8;
      for (let x = 0; x < w; x += 12) {
        y = Math.max(10, y - rand(-6, 14));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#3dff7a";
      ctx.font = "bold 22px monospace";
      ctx.fillText("+ 1,284%", 14, 28);
    } else {
      ctx.fillStyle = "#0a0f1a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(120,160,255,0.25)";
      for (let i = 0; i < 5; i++) ctx.fillRect(14, 16 + i * 22, rand(60, 180), 8);
    }
    tex.needsUpdate = true;
  }
  draw("idle");
  return { tex, draw };
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const fogColor = new THREE.Color(0x07080d);
  const fogSick = new THREE.Color(0x1a0606);
  const scene = new THREE.Scene();
  scene.background = fogColor.clone();
  scene.fog = new THREE.FogExp2(fogColor.clone(), 0.045);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0.5, 2.5, 6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.4, 1, 0);
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.enableDamping = true;
  controls.update();

  let post = null;
  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (post) post.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);
  resize();
  post = createPost(renderer, scene, camera);

  // ---------- materials ----------
  const wallTex = canvasTex(512, plasterTexture, 0.25, 0.25);
  const floorTex = canvasTex(512, plankTexture, 1, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, bumpMap: wallTex, bumpScale: 0.6, roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, bumpMap: floorTex, bumpScale: 1.2, roughness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2b2e37, roughness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1e17, roughness: 0.7 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x17110e, roughness: 0.8 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: 0.4, metalness: 0.6 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x08080b, roughness: 0.4 });

  const room = new THREE.Group();
  scene.add(room);

  // ---------- walls (right wall has a doorway) ----------
  const DOOR_Z = 1.0;
  function wallMesh(withDoor) {
    const s = new THREE.Shape();
    rectPath(s, 0, 0, 8, 4);
    if (withDoor) s.holes.push(rectPath(new THREE.Path(), DOOR_Z, 0, 1.0, 2.1));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), wallMat);
    m.receiveShadow = true;
    return m;
  }
  const backWall = wallMesh(false);
  backWall.position.z = -4;
  const leftWall = wallMesh(false);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.x = -4;
  const rightWall = wallMesh(true);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.x = 4;
  const frontWall = wallMesh(false);
  frontWall.rotation.y = Math.PI;
  frontWall.position.z = 4;
  room.add(backWall, leftWall, rightWall, frontWall);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), wallMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4;
  room.add(ceiling);

  // baseboards
  for (const [x, z, ry] of [[0, -3.98, 0], [-3.98, 0, Math.PI / 2], [0, 3.98, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 0.04), trimMat);
    b.position.set(x, 0.07, z);
    b.rotation.y = ry;
    room.add(b);
  }
  for (const [len, z] of [[3, -2.5], [1.6, 3.2]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.04), trimMat);
    b.position.set(3.98, 0.07, z);
    b.rotation.y = Math.PI / 2;
    room.add(b);
  }

  // ---------- window with blinds ----------
  const winGlow = new THREE.Mesh(new THREE.ShapeGeometry(rectPath(new THREE.Shape(), 0, 0, 1.6, 1.4)), new THREE.MeshBasicMaterial({ color: 0x5f78b0, fog: false }));
  winGlow.position.set(0, 1.15, -3.97);
  room.add(winGlow);
  for (const [w, h, x, y] of [[1.8, 0.1, 0, 2.6], [1.8, 0.1, 0, 1.1], [0.1, 1.6, -0.85, 1.85], [0.1, 1.6, 0.85, 1.85], [0.06, 1.5, 0, 1.85]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), trimMat);
    f.position.set(x, y, -3.92);
    room.add(f);
  }
  for (let i = 0; i < 7; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.035, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a3d45, roughness: 0.6 }));
    slat.position.set(0, 2.5 - i * 0.14, -3.84);
    slat.rotation.x = 0.55;
    slat.castShadow = true;
    room.add(slat);
  }
  const moon = new THREE.SpotLight(0x8aa4ff, 160, 0, 0.6, 0.5, 2);
  moon.position.set(0, 2.2, -6.5);
  moon.target.position.set(0.3, 0, 0.8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.bias = -0.0008;
  moon.shadow.normalBias = 0.02;
  scene.add(moon, moon.target);

  // ---------- door + outside ----------
  const frameShape = rectPath(new THREE.Shape(), 0, 0, 1.2, 2.25);
  frameShape.holes.push(rectPath(new THREE.Path(), 0, 0, 1.0, 2.1));
  const doorFrame = new THREE.Mesh(new THREE.ShapeGeometry(frameShape), trimMat);
  doorFrame.rotation.y = -Math.PI / 2;
  doorFrame.position.set(3.97, 0, DOOR_Z);
  room.add(doorFrame);

  const doorHinge = new THREE.Group();
  const doorRoot = new THREE.Group();
  doorRoot.rotation.y = -Math.PI / 2;
  doorRoot.position.set(3.9, 0, DOOR_Z);
  doorHinge.position.x = -0.5;
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.1, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x232830, roughness: 0.55 })
  );
  slab.position.set(0.5, 1.05, 0);
  slab.castShadow = true;
  doorHinge.add(slab);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 6), metalMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.88, 1.0, 0.06);
  doorHinge.add(handle);
  doorRoot.add(doorHinge);
  room.add(doorRoot);

  const groundTex = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = "#2c3a2f";
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 5000);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `hsl(${rand(90, 140)},${rand(15, 30)}%,${rand(6, 14)}%)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, rand(3, 7));
    }
  }, 14, 10);
  const outsideGround = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 28),
    new THREE.MeshStandardMaterial({ map: groundTex, emissive: 0x2c4268, emissiveIntensity: 1, roughness: 1 })
  );
  outsideGround.rotation.x = -Math.PI / 2;
  outsideGround.position.set(24, -0.01, 1);
  scene.add(outsideGround);

  const skyTex = canvasTex(256, (ctx, sz) => {
    const g = ctx.createLinearGradient(0, 0, 0, sz);
    g.addColorStop(0, "#080c1c");
    g.addColorStop(0.6, "#243558");
    g.addColorStop(1, "#4a6590");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sz, sz);
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.rotation.y = -Math.PI / 2;
  sky.position.set(44, 14, 1);
  scene.add(sky);
  const moonDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,255,1)", "rgba(190,210,255,0.9)"), fog: false }));
  moonDisc.position.set(43, 15, -4);
  moonDisc.scale.set(7, 7, 1);
  scene.add(moonDisc);

  const treeMat = new THREE.MeshStandardMaterial({ color: 0x0c150f, emissive: 0x2a4468, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const x = rand(7, 34);
    let z = rand(-12, 14);
    if (Math.abs(z - DOOR_Z) < 2.2) z += z < DOOR_Z ? -3 : 3;
    const h = rand(3, 6);
    const tree = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1 - k * 0.25, h * 0.5, 7), treeMat);
      cone.position.y = h * 0.35 + k * h * 0.22;
      tree.add(cone);
    }
    tree.position.set(x, 0, z);
    scene.add(tree);
  }

  // ---------- furniture ----------
  const box = (w, h, d, mat, x, y, z, parent = room) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.MeshStandardMaterial({ color: 0x241418, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.006, 0.5);
  rug.receiveShadow = true;
  room.add(rug);

  // bed
  const bed = new THREE.Group();
  bed.position.set(-2.7, 0, -2.2);
  box(2, 0.3, 3, darkWood, 0, 0.18, 0, bed);
  box(1.9, 0.18, 2.9, new THREE.MeshStandardMaterial({ color: 0x1c2234, roughness: 1 }), 0, 0.42, 0, bed);
  box(1.9, 0.05, 1.7, new THREE.MeshStandardMaterial({ color: 0x2b1c26, roughness: 1 }), 0, 0.53, 0.55, bed);
  box(0.8, 0.12, 0.45, new THREE.MeshStandardMaterial({ color: 0x8a8f9a, roughness: 1 }), 0, 0.57, -1.2, bed);
  box(2, 1.2, 0.12, darkWood, 0, 0.6, -1.5, bed);
  room.add(bed);

  // nightstand + lamp
  box(0.45, 0.5, 0.4, woodMat, -1.3, 0.25, -3.75);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff9a40, emissiveIntensity: 0.9 }));
  lampShade.position.set(-1.3, 0.72, -3.75);
  room.add(lampShade);
  box(0.03, 0.2, 0.03, metalMat, -1.3, 0.58, -3.75);
  const bedLamp = new THREE.PointLight(0xffa860, 6, 8, 2);
  bedLamp.position.set(-1.3, 0.95, -3.55);
  scene.add(bedLamp);

  // desk + monitor
  const desk = new THREE.Group();
  desk.position.set(3, 0, -3.3);
  box(1.7, 0.06, 0.8, woodMat, 0, 0.9, 0, desk);
  for (const [x, z] of [[-0.8, -0.34], [0.8, -0.34], [-0.8, 0.34], [0.8, 0.34]]) box(0.06, 0.9, 0.06, metalMat, x, 0.45, z, desk);
  room.add(desk);

  const monitor = new THREE.Group();
  monitor.position.set(3.35, 0.93, -3.55);
  box(0.12, 0.2, 0.1, blackMat, 0, 0.1, 0, monitor);
  box(0.9, 0.52, 0.04, blackMat, 0, 0.5, 0, monitor);
  const screen = makeScreen();
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.tex });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.46), screenMat);
  screenMesh.position.set(0, 0.5, 0.025);
  monitor.add(screenMesh);
  room.add(monitor);
  box(0.5, 0.025, 0.16, blackMat, 3.3, 0.94, -3.15);
  const monitorLight = new THREE.PointLight(0x7fa0ff, 2.5, 6, 2);
  monitorLight.position.set(3.35, 1.4, -3.0);
  scene.add(monitorLight);

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.5 }));
  mug.position.set(2.4, 0.98, -3.55);
  mug.castShadow = true;
  scene.add(mug);
  const mugHome = mug.position.clone();

  const chair = new THREE.Group();
  chair.position.set(3.4, 0, -2.45);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.8 });
  box(0.5, 0.08, 0.5, chairMat, 0, 0.5, 0, chair);
  box(0.46, 0.6, 0.06, chairMat, 0, 0.85, 0.26, chair);
  box(0.05, 0.4, 0.05, metalMat, 0, 0.26, 0, chair);
  box(0.55, 0.04, 0.08, metalMat, 0, 0.04, 0, chair);
  box(0.08, 0.04, 0.55, metalMat, 0, 0.04, 0, chair);
  scene.add(chair);

  // the book you read
  const book = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.46), new THREE.MeshStandardMaterial({ color: 0x4a0f12, roughness: 0.7 }));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.05, 0.43), new THREE.MeshStandardMaterial({ color: 0xc9bd9c, roughness: 1 }));
  pages.position.y = 0.04;
  const flip = new THREE.Group();
  flip.position.set(0, 0.07, 0);
  const flipPage = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.004, 0.42), new THREE.MeshStandardMaterial({ color: 0xd6cba9 }));
  flipPage.position.x = 0.075;
  flip.add(flipPage);
  book.add(cover, pages, flip);
  book.position.set(2.7, 0.97, -3.1);
  book.rotation.y = 0.3;
  scene.add(book);
  const bookHome = { pos: book.position.clone(), rotY: book.rotation.y };

  // fridge (gluttony)
  const FRIDGE = new THREE.Vector3(1.45, 0, -3.6);
  const fridge = new THREE.Group();
  fridge.position.copy(FRIDGE);
  const fridgeMat = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.35, metalness: 0.3 });
  box(0.62, 1.1, 0.6, new THREE.MeshStandardMaterial({ color: 0x8a9aa8, emissive: 0x2a3a48, emissiveIntensity: 0.3, roughness: 0.6 }), 0, 0.55, 0, fridge);
  for (const y of [0.35, 0.65]) box(0.54, 0.02, 0.5, fridgeMat, 0, y, 0.04, fridge);
  const fridgeDoorHinge = new THREE.Group();
  fridgeDoorHinge.position.set(-0.31, 0, 0.31);
  box(0.62, 1.1, 0.05, fridgeMat, 0.31, 0.55, 0, fridgeDoorHinge);
  box(0.03, 0.4, 0.04, metalMat, 0.54, 0.7, 0.05, fridgeDoorHinge);
  fridge.add(fridgeDoorHinge);
  scene.add(fridge);
  const fridgeLight = new THREE.PointLight(0xcfe8ff, 0, 5, 2);
  fridgeLight.position.set(1.45, 0.8, -3.0);
  scene.add(fridgeLight);

  // mirror (pride)
  const mirror = new THREE.Group();
  mirror.position.set(-3.95, 1.1, 2.2);
  mirror.rotation.y = Math.PI / 2;
  box(0.95, 2.0, 0.05, trimMat, 0, 0, 0, mirror);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.83, 1.88),
    new THREE.MeshStandardMaterial({ color: 0x2a3a52, metalness: 0.9, roughness: 0.08, emissive: 0x0e1a2c, emissiveIntensity: 0.8 })
  );
  glass.position.z = 0.03;
  mirror.add(glass);
  room.add(mirror);

  // posters
  for (const [x, y, z, ry, kind, w, h] of [[-2.7, 2.1, -3.97, 0, 0, 0.9, 1.2], [3.97, 2.2, -2.2, -Math.PI / 2, 1, 1.0, 1.3]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: posterTexture(kind), roughness: 0.9 }));
    p.position.set(x, y, z);
    p.rotation.y = ry;
    room.add(p);
  }

  // wall cracks from punching (wrath)
  const crackTex = crackTexture();
  const cracks = [];
  for (const [y, z, s] of [[1.45, -1.0, 0.8], [1.2, -0.7, 0.6], [1.65, -1.25, 0.7], [1.0, -1.1, 0.5]]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false }));
    c.rotation.y = -Math.PI / 2;
    c.position.set(3.975, y, z);
    scene.add(c);
    cracks.push(c);
  }

  const shards = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(rand(0.02, 0.05), 0.01, rand(0.02, 0.05)), new THREE.MeshStandardMaterial({ color: 0xb8b0a0 }));
    sh.position.set(rand(-0.15, 0.15), 0.01, rand(-0.15, 0.15));
    sh.rotation.y = rand(0, 3);
    shards.add(sh);
  }
  shards.visible = false;
  scene.add(shards);

  // snacks (sloth) + cash (greed)
  const snacks = new THREE.Group();
  const snackCols = [0xd9602a, 0x2a8fd9, 0xd9c22a, 0xc43030, 0x3aa84a];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(rand(0.1, 0.2), 0.04, rand(0.1, 0.16)), new THREE.MeshStandardMaterial({ color: snackCols[i % 5], roughness: 0.6 }));
    s.position.set(-2.7 + rand(-0.7, 0.7), 0.58, -2.2 + rand(-0.9, 1.1));
    s.rotation.y = rand(0, 3);
    s.scale.setScalar(0.001);
    snacks.add(s);
  }
  scene.add(snacks);

  const cash = new THREE.Group();
  const cashLight = new THREE.PointLight(0xffd34d, 0, 5, 2);
  cashLight.position.set(2.8, 1.5, -3.0);
  scene.add(cashLight);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.06 + (i % 3) * 0.03, 0.08),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x2f7a3a : 0xc9a227, roughness: 0.4, metalness: i % 2 ? 0 : 0.7, emissive: i % 2 ? 0x000000 : 0x3a2c00 })
    );
    m.position.set(2.3 + (i % 4) * 0.2 + rand(-0.03, 0.03), 0.96 + (i % 3) * 0.015, -3.35 + Math.floor(i / 4) * 0.18);
    m.rotation.y = rand(-0.3, 0.3);
    m.scale.setScalar(0.001);
    cash.add(m);
  }
  scene.add(cash);

  // ---------- sigil (only shown while sinning / tempted) ----------
  const SIGIL = new THREE.Vector3(0, 0, 0.5);
  const sigilMat = new THREE.MeshBasicMaterial({ map: sigilTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sigil = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 4.1), sigilMat);
  sigil.rotation.x = -Math.PI / 2;
  sigil.position.set(SIGIL.x, 0.014, SIGIL.z);
  sigil.visible = false;
  scene.add(sigil);
  const sigilLight = new THREE.PointLight(0xff3a1a, 0, 7, 2);
  sigilLight.position.set(0, 0.5, 0.5);
  scene.add(sigilLight);

  // ---------- ambient + fill + aura ----------
  scene.add(new THREE.HemisphereLight(0x2c3556, 0x120a08, 0.55));
  scene.add(new THREE.AmbientLight(0x1b1e30, 0.8));
  const fill = new THREE.PointLight(0xffc8a0, 16, 8, 2);
  fill.position.set(0.8, 1.9, 2.6);
  scene.add(fill);
  const aura = new THREE.PointLight(0xffffff, 0, 6, 2);
  aura.position.set(0, 1.4, 1.3);
  scene.add(aura);

  // ---------- dust ----------
  const DUST = 120;
  const dustPos = new Float32Array(DUST * 3);
  const dustVel = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = rand(-3.8, 3.8);
    dustPos[i * 3 + 1] = rand(0, 4);
    dustPos[i * 3 + 2] = rand(-3.8, 3.8);
    dustVel[i] = rand(0.03, 0.15);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ map: glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0.4)"), size: 0.06, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x9fb0d0 })
  );
  scene.add(dust);
  const dustCool = new THREE.Color(0x9fb0d0);
  const dustHot = new THREE.Color(0xff6a30);

  // ---------- per-frame ----------
  const _c = new THREE.Color();
  const lampBase = bedLamp.intensity;
  function update(dt, t, corruption, gloom, sigilLevel) {
    const v = corruption;
    const lamp = (1 - 0.4 * v) * (1 - gloom * 0.9);
    bedLamp.intensity = lampBase * lamp * (0.97 + Math.sin(t * 9) * 0.02 + (Math.random() - 0.5) * (v > 0.5 ? 0.25 : 0.02));
    lampShade.material.emissiveIntensity = 0.9 * lamp;
    moon.intensity = 160 * (1 - 0.55 * v) * (1 - gloom * 0.5);
    winGlow.material.color.setHex(0x5f78b0).lerp(_c.setHex(0x40202a), v * 0.7);

    scene.fog.color.copy(fogColor).lerp(fogSick, v * 0.8);
    scene.background.copy(scene.fog.color);

    const s = sigilLevel;
    sigil.visible = s > 0.01;
    sigilMat.opacity = s * (0.85 + Math.sin(t * 3) * 0.1);
    sigilLight.intensity = s * 7;
    dust.material.color.copy(dustCool).lerp(dustHot, s);
    dust.material.opacity = 0.35 + s * 0.4;

    const p = dustGeo.attributes.position;
    for (let i = 0; i < DUST; i++) {
      let y = p.array[i * 3 + 1] + dustVel[i] * (1 + s * 4) * dt;
      p.array[i * 3] += Math.sin(t + i) * 0.1 * dt;
      if (y > 4) y = 0;
      p.array[i * 3 + 1] = y;
    }
    p.needsUpdate = true;

    post.bloom.strength = 0.5 + s * 0.55 + v * 0.2;
    post.grade.uniforms.uTint.value = v * 0.3 + s * 0.15;
    post.grade.uniforms.uSat.value = 1 - v * 0.35;

    controls.update();
  }

  return {
    renderer, scene, camera, controls, update,
    render: (dt) => post.render(dt),
    door: doorHinge,
    book, flip, bookHome,
    aura, fill,
    SIGIL,
    props: {
      chair, mug, mugHome, shards, cracks, snacks, cash, cashLight,
      fridgeDoor: fridgeDoorHinge, fridgeLight, FRIDGE,
      screen, screenMat, monitorLight, bedLamp,
    },
  };
}
