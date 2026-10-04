import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------- Sins ----------
const SINS = [
  { name: "Pride", text: "\"You deserve to be above everyone else in this room.\"", color: 0xffd34d },
  { name: "Greed", text: "\"More. You always need more, no matter the cost.\"", color: 0x4dff88 },
  { name: "Lust", text: "\"Give in to the craving. Just this once.\"", color: 0xff4d9e },
  { name: "Envy", text: "\"They have what you don't. It isn't fair.\"", color: 0x4dd2ff },
  { name: "Gluttony", text: "\"One more won't hurt. You've earned it.\"", color: 0xff9a4d },
  { name: "Wrath", text: "\"Let it burn. Let it all burn.\"", color: 0xff4d4d },
  { name: "Sloth", text: "\"Why bother? Just lie there. Nothing matters.\"", color: 0x9a9aff },
];

const ACTIVITIES = {
  read: { label: "reads quietly", relief: [8, 14] },
  run: { label: "goes for a run", relief: [10, 18] },
  pushup: { label: "grinds out push-ups", relief: [9, 16] },
  podcast: { label: "listens to a podcast", relief: [6, 12] },
};

// ---------- Game state ----------
const state = {
  corruption: 0,
  busy: false,
  gameOver: false,
  started: false,
  currentSin: null,
  temptationTimer: null,
  succumbCount: 0,
  resistCount: 0,
};

// ---------- DOM ----------
const meterFill = document.getElementById("meter-fill");
const statusText = document.getElementById("status-text");
const temptationPanel = document.getElementById("temptation");
const sinNameEl = document.getElementById("temptation-sin");
const sinTextEl = document.getElementById("temptation-text");
const gameoverPanel = document.getElementById("gameover");
const gameoverStats = document.getElementById("gameover-stats");
const introPanel = document.getElementById("intro");

document.getElementById("start").addEventListener("click", () => {
  introPanel.classList.add("hidden");
  state.started = true;
  scheduleNextTemptation(true);
});

document.getElementById("restart").addEventListener("click", () => resetGame());

document.getElementById("choice-succumb").addEventListener("click", () => resolveTemptation("succumb"));
document.querySelectorAll(".choice[data-activity]").forEach((btn) => {
  btn.addEventListener("click", () => resolveTemptation(btn.dataset.activity));
});

// ---------- Three.js setup ----------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060608);
scene.fog = new THREE.Fog(0x060608, 6, 16);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.6, 5.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI / 2.05;
controls.update();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
renderer.setSize(window.innerWidth, window.innerHeight);

// ---- Room ----
const room = new THREE.Group();
scene.add(room);

const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a3f36, roughness: 0.9 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x35333e, roughness: 0.95 });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
room.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), wallMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 4;
room.add(ceiling);

const wallGeo = new THREE.PlaneGeometry(8, 4);
const backWall = new THREE.Mesh(wallGeo, wallMat);
backWall.position.set(0, 2, -4);
room.add(backWall);

const leftWall = new THREE.Mesh(wallGeo, wallMat);
leftWall.position.set(-4, 2, 0);
leftWall.rotation.y = Math.PI / 2;
room.add(leftWall);

const rightWall = new THREE.Mesh(wallGeo, wallMat);
rightWall.position.set(4, 2, 0);
rightWall.rotation.y = -Math.PI / 2;
room.add(rightWall);

// simple furniture: a bed and a desk, so it reads as "a room"
const bed = new THREE.Mesh(
  new THREE.BoxGeometry(2, 0.5, 3),
  new THREE.MeshStandardMaterial({ color: 0x3a3045 })
);
bed.position.set(-2.7, 0.25, -2.2);
bed.castShadow = true;
room.add(bed);

const desk = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 0.9, 0.7),
  new THREE.MeshStandardMaterial({ color: 0x4a3b2a })
);
desk.position.set(3, 0.45, -3.3);
desk.castShadow = true;
room.add(desk);

// ---- Lights ----
const hemi = new THREE.HemisphereLight(0x9099bb, 0x1a1512, 1.4);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0x6b6b80, 1.3);
scene.add(ambient);

const lamp = new THREE.PointLight(0xfff0d0, 3.2, 14, 2);
lamp.position.set(0, 3.6, 0.5);
lamp.castShadow = true;
scene.add(lamp);

const fillLight = new THREE.PointLight(0x8899ff, 0.9, 12, 2);
fillLight.position.set(-2, 2, 3);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xff2a2a, 0, 8, 2);
rimLight.position.set(0, 1.5, -2);
scene.add(rimLight);

// ---- Character ("you") ----
const person = new THREE.Group();
person.position.set(0, 0, 0.5);
scene.add(person);

const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a6b8a });
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8), bodyMat);
torso.position.y = 1.05;
torso.castShadow = true;
person.add(torso);

const headMat = new THREE.MeshStandardMaterial({ color: 0xd8b99a });
const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), headMat);
head.position.y = 1.72;
head.castShadow = true;
person.add(head);

// ---- Demon ----
const demon = new THREE.Group();
demon.position.set(0, 0, -3.2);
demon.scale.setScalar(0.001);
scene.add(demon);

const demonMat = new THREE.MeshStandardMaterial({
  color: 0x1a0505,
  emissive: 0x440000,
  emissiveIntensity: 0.4,
  roughness: 0.6,
});

const demonBody = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 8), demonMat);
demonBody.position.y = 1.2;
demon.add(demonBody);

const demonHead = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), demonMat);
demonHead.position.y = 2.5;
demon.add(demonHead);

const hornMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
[-0.2, 0.2].forEach((x) => {
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), hornMat);
  horn.position.set(x, 2.85, 0);
  horn.rotation.z = x < 0 ? 0.3 : -0.3;
  demon.add(horn);
});

const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 2 });
[-0.15, 0.15].forEach((x) => {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
  eye.position.set(x, 2.55, 0.4);
  demon.add(eye);
});

// ---------- Helpers ----------
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function updateMeter() {
  meterFill.style.width = `${state.corruption}%`;
  const t = state.corruption / 100;
  demon.scale.setScalar(0.001 + t * 0.9);
  demon.position.z = -3.2 + t * 1.6;
  rimLight.intensity = t * 2.2;
  scene.fog.color.setHex(t > 0.5 ? 0x200505 : 0x060608);
  scene.background.setHex(t > 0.5 ? 0x160303 : 0x060608);
}

function setStatus(msg) {
  statusText.textContent = msg;
}

function scheduleNextTemptation(firstOne = false) {
  if (state.gameOver) return;
  clearTimeout(state.temptationTimer);
  const delay = firstOne ? rand(3000, 5000) : rand(7000, 13000);
  state.temptationTimer = setTimeout(spawnTemptation, delay);
}

function spawnTemptation() {
  if (state.gameOver || state.busy || !state.started) return;
  const sin = SINS[Math.floor(Math.random() * SINS.length)];
  state.currentSin = sin;
  sinNameEl.textContent = sin.name;
  sinNameEl.style.color = `#${sin.color.toString(16).padStart(6, "0")}`;
  sinTextEl.textContent = sin.text;
  temptationPanel.classList.remove("hidden");
  setStatus("A thought is trying to take hold...");
}

function resolveTemptation(choice) {
  if (!state.currentSin || state.gameOver) return;
  const sin = state.currentSin;
  temptationPanel.classList.add("hidden");
  state.currentSin = null;

  if (choice === "succumb") {
    state.succumbCount++;
    const gain = rand(14, 26);
    state.corruption = clamp(state.corruption + gain, 0, 100);
    updateMeter();
    setStatus(`You gave in to ${sin.name}.`);
    flashRed();
    if (state.corruption >= 100) {
      triggerGameOver();
      return;
    }
    scheduleNextTemptation();
  } else {
    state.resistCount++;
    const act = ACTIVITIES[choice];
    state.busy = true;
    setStatus(`Resisting ${sin.name}: you ${act.label}...`);
    bobCharacter();
    const duration = rand(2200, 3200);
    setTimeout(() => {
      const relief = rand(act.relief[0], act.relief[1]);
      state.corruption = clamp(state.corruption - relief, 0, 100);
      updateMeter();
      state.busy = false;
      setStatus(`Feeling steadier.`);
      scheduleNextTemptation();
    }, duration);
  }
}

let flashT = 0;
function flashRed() {
  flashT = 1;
}

let bobT = 0;
function bobCharacter() {
  bobT = 1;
}

function triggerGameOver() {
  state.gameOver = true;
  clearTimeout(state.temptationTimer);
  setStatus("");
  setTimeout(() => {
    gameoverStats.textContent = `Resisted ${state.resistCount} time(s). Gave in ${state.succumbCount} time(s).`;
    gameoverPanel.classList.remove("hidden");
    // character "taken"
    person.visible = false;
  }, 1600);
}

function resetGame() {
  state.corruption = 0;
  state.busy = false;
  state.gameOver = false;
  state.currentSin = null;
  state.succumbCount = 0;
  state.resistCount = 0;
  person.visible = true;
  updateMeter();
  gameoverPanel.classList.add("hidden");
  setStatus("");
  scheduleNextTemptation(true);
}

// ---------- Render loop ----------
const clock = new THREE.Clock();
function animate() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  lamp.intensity = 3.2 + Math.sin(t * 2) * 0.08;

  if (flashT > 0) {
    flashT = Math.max(0, flashT - dt * 1.5);
    rimLight.intensity = Math.max(rimLight.intensity, flashT * 4);
  }

  if (bobT > 0) {
    bobT = Math.max(0, bobT - dt * 0.4);
  }
  person.position.y = bobT > 0 ? Math.sin(t * 10) * 0.05 * bobT : 0;

  if (state.gameOver) {
    demon.position.y = Math.sin(t * 1.5) * 0.08;
    demon.rotation.y += dt * 0.3;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateMeter();
animate();
