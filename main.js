import * as THREE from "three";
import { createWorld } from "./world.js";
import { createCharacter } from "./character.js";
import { readGame, runGame, pushupGame, podcastGame } from "./challenges.js";

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
  read: { label: "reads", relief: [9, 15] },
  run: { label: "runs into the night", relief: [11, 18] },
  pushup: { label: "trains", relief: [10, 16] },
  podcast: { label: "listens", relief: [7, 12] },
};

const FAIL_GAIN = [10, 18];
const GIVE_IN_GAIN = [14, 26];

// ---------- Game state ----------
const state = {
  corruption: 0,
  busy: false,
  sinning: false,
  wrathCount: 0,
  gameOver: false,
  started: false,
  currentSin: null,
  temptationTimer: null,
  succumbCount: 0,
  resistCount: 0,
  failCount: 0,
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
const hurtEl = document.getElementById("hurt");

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

// ---------- World + character ----------
const world = createWorld(document.getElementById("scene"));
const hero = createCharacter(world.scene);
const actor = hero.actor;

// ---------- Helpers ----------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (min, max) => min + Math.random() * (max - min);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (p) => p * p * (3 - 2 * p);
const setStatus = (msg) => (statusText.textContent = msg);

const tweens = [];
function tween(ms, fn) {
  return new Promise((resolve) => tweens.push({ t: 0, ms, fn, resolve }));
}

function cameraCue(pos, target, ms) {
  const cam = world.camera;
  const tgt = world.controls.target;
  const p0 = cam.position.clone();
  const t0 = tgt.clone();
  return tween(ms, (p) => {
    cam.position.lerpVectors(p0, pos, ease(p));
    tgt.lerpVectors(t0, target, ease(p));
  });
}

// ---------- visual state ----------
let visCorruption = 0;
let lastAtrophy = -1;
let gloom = 0;
let flashT = 0;
let auraLevel = 0;
let sigilLevel = 0;
let effort = 0;

function updateMeter() {
  meterFill.style.width = `${state.corruption}%`;
}

// ---------- Poses ----------
const poses = {
  reach(T, t, v) {
    T.spineX = 0.6 + 0.3 * v;
    T.headX = 0.3;
    T.bX = -1.2;
    T.bEl = -0.25;
    T.aX = -0.35;
  },
  read(T, t, v) {
    T.spineX = 0.1 + 0.3 * v;
    T.headX = 0.55;
    T.aX = T.bX = -1.0;
    T.aEl = T.bEl = -1.35;
    T.aZ = 0.3;
    T.bZ = -0.3;
  },
  crouch(T) {
    T.spineX = 0.9;
    T.aX = T.bX = -1.5;
    T.aHip = T.bHip = -1.3;
    T.aKn = T.bKn = 1.6;
    T.hipsY = 0.6;
  },
  plank(T, t, v) {
    const down = Math.sin(Math.PI * clamp((t - actor.rep) / 0.9, 0, 1));
    const sag = clamp(1 - (t - actor.strain) / 0.7, 0, 1);
    const th = 1.12 + down * 0.2 + sag * 0.1;
    T.tiltX = actor.failed ? 1.42 : th;
    T.aX = T.bX = -th;
    T.aEl = T.bEl = actor.failed ? 0 : -down * 0.8;
    T.spineX = 0;
    T.headX = -0.5;
    T.aHip = T.bHip = 0;
    T.aKn = T.bKn = 0;
    T.hipsY = 0.97;
    T.spineZ = Math.sin(t * 38) * 0.02 * (0.3 + v);
  },
  sit(T, t, v) {
    T.hipsY = 0.62;
    T.aHip = T.bHip = -1.45;
    T.aKn = T.bKn = 1.45;
    T.spineX = 0.08 + 0.3 * v;
    T.headX = 0.1 + Math.sin(t * 3.2) * 0.07;
    T.headY = Math.sin(t * 1.6) * 0.05;
    T.bX = -0.9;
    T.bEl = -2.1;
    T.bZ = -0.25;
    T.aX = -0.9;
    T.aEl = -0.7;
  },
  raiseHands(T) {
    T.aX = T.bX = -2.5;
    T.aEl = T.bEl = -0.9;
    T.aZ = 0.4;
    T.bZ = -0.4;
  },
};

// ---------- Activities ----------
const goHome = async () => {
  actor.pose = null;
  await hero.moveTo(0, 0.5);
  await hero.faceYaw(0);
};

const BOOK_HOLD = { pos: new THREE.Vector3(0, 0.42, 0.28), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2, 0, 0)) };

async function actRead() {
  const { book, flip, bookHome } = world;
  await hero.moveTo(2.7, -2.45);
  await hero.faceYaw(Math.PI);
  actor.pose = poses.reach;
  await wait(650);
  hero.spine.attach(book);
  const p0 = book.position.clone();
  const q0 = book.quaternion.clone();
  await tween(500, (p) => {
    book.position.lerpVectors(p0, BOOK_HOLD.pos, ease(p));
    book.quaternion.slerpQuaternions(q0, BOOK_HOLD.q, ease(p));
  });
  actor.pose = poses.read;

  const ok = await readGame({
    onPage: () => tween(450, (p) => (flip.rotation.z = Math.PI * ease(p))).then(() => (flip.rotation.z = 0)),
  });

  actor.pose = poses.reach;
  world.scene.attach(book);
  const bp = book.position.clone();
  const bq = book.quaternion.clone();
  const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, bookHome.rotY, 0));
  await tween(550, (p) => {
    book.position.lerpVectors(bp, bookHome.pos, ease(p));
    book.quaternion.slerpQuaternions(bq, hq, ease(p));
  });
  await goHome();
  return ok;
}

async function actRun() {
  const door = world.door;
  await hero.moveTo(3.3, 1.0);
  await hero.faceYaw(Math.PI / 2);
  const camPos = world.camera.position.clone();
  const camTarget = world.controls.target.clone();
  cameraCue(new THREE.Vector3(-1.2, 1.9, 1.6), new THREE.Vector3(8, 1.1, 1.0), 1200);
  await tween(600, (p) => (door.rotation.y = -1.75 * ease(p)));
  await hero.moveTo(5.0, 1.0, { run: true, speed: 3.5 });

  let running = true;
  const game = runGame({ setEffort: (e) => (effort = e) }).then((r) => {
    running = false;
    return r;
  });
  (async () => {
    let out = true;
    while (running) {
      await hero.moveTo(out ? 12 : 5.5, 1.0, { run: true, speed: () => 2.2 + effort * 4.5 });
      out = !out;
    }
  })();
  const ok = await game;

  actor.move = null;
  await hero.moveTo(5.0, 1.0, { run: true, speed: 4 });
  await hero.moveTo(3.4, 1.0, { speed: 2 });
  cameraCue(camPos, camTarget, 1200);
  await tween(600, (p) => (door.rotation.y = -1.75 * (1 - ease(p))));
  await goHome();
  return ok;
}

async function actPushup() {
  await hero.moveTo(-1.3, 0.6);
  await hero.faceYaw(Math.PI / 2);
  actor.pose = poses.crouch;
  await wait(450);
  actor.failed = false;
  actor.rep = -10;
  actor.strain = -10;
  actor.pose = poses.plank;

  const ok = await pushupGame({
    onRep: () => (actor.rep = actor.time),
    onStrain: () => (actor.strain = actor.time),
  });
  if (!ok) {
    actor.failed = true;
    await wait(900);
  } else {
    await wait(300);
  }
  actor.failed = false;
  actor.pose = poses.crouch;
  await wait(550);
  await goHome();
  return ok;
}

async function actPodcast() {
  await hero.moveTo(-2.7, -0.35);
  await hero.faceYaw(0);
  actor.pose = poses.raiseHands;
  await wait(350);
  actor.headphones.visible = true;
  await wait(350);
  actor.pose = poses.sit;
  const z0 = hero.person.position.z;
  await tween(600, (p) => (hero.person.position.z = z0 + (-0.95 - z0) * ease(p)));

  const ok = await podcastGame();

  actor.pose = null;
  actor.headphones.visible = false;
  const z1 = hero.person.position.z;
  await tween(600, (p) => (hero.person.position.z = z1 + (-0.35 - z1) * ease(p)));
  await goHome();
  return ok;
}

const ACT = { read: actRead, run: actRun, pushup: actPushup, podcast: actPodcast };

// ---------- Sin animations ----------
const P = world.props;
const lights = { monitor: P.monitorLight.color.clone() };

const sitPose = (T, v, extra) => {
  T.hipsY = 0.62;
  T.aHip = T.bHip = -1.5;
  T.aKn = T.bKn = 1.5;
  T.spineX = 0.1 + 0.3 * v;
  if (extra) extra(T);
};

async function sitAtChair() {
  await hero.moveTo(3.4, -2.1);
  await hero.faceYaw(Math.PI);
  actor.pose = (T, t, v) => sitPose(T, v);
  const z0 = hero.person.position.z;
  await tween(500, (p) => (hero.person.position.z = z0 + (-2.45 - z0) * ease(p)));
}

async function leaveChair() {
  actor.pose = null;
  const z0 = hero.person.position.z;
  await tween(500, (p) => (hero.person.position.z = z0 + (-2.1 - z0) * ease(p)));
}

async function sitOnBedEdge() {
  await hero.moveTo(-2.7, -0.35);
  await hero.faceYaw(0);
  actor.pose = (T, t, v) => sitPose(T, v);
  const z0 = hero.person.position.z;
  await tween(500, (p) => (hero.person.position.z = z0 + (-0.95 - z0) * ease(p)));
}

async function leaveBedEdge() {
  actor.pose = null;
  const z0 = hero.person.position.z;
  await tween(500, (p) => (hero.person.position.z = z0 + (-0.35 - z0) * ease(p)));
}

const scaleTo = (obj, a, b, ms) => tween(ms, (p) => obj.scale.setScalar(Math.max(0.001, a + (b - a) * ease(p))));

const SIN_ACT = {
  // Lust: a compulsive late-night screen binge. Kept implicit, nothing explicit is shown.
  async Lust() {
    await sitAtChair();
    P.screen.draw("lust");
    P.monitorLight.color.setHex(0xff3a8a);
    P.monitorLight.intensity = 7;
    hero.setExpression({ lids: 0.55, smile: 0.4, brow: -0.2, mouth: 0.25 });
    const t0 = actor.time;
    actor.pose = (T, t, v) => {
      sitPose(T, v);
      const b = Math.sin((t - t0) * 6);
      T.spineX = 0.4 + 0.3 * v + b * 0.035;
      T.headX = 0.3 + b * 0.05;
      T.aX = -0.95;
      T.aEl = -1.15;
      T.bX = -0.4;
      T.bEl = -0.6;
      T.bZ = 0.3;
    };
    await wait(5000);
    P.screen.draw("idle");
    P.monitorLight.color.copy(lights.monitor);
    P.monitorLight.intensity = 2.5;
    hero.setExpression(null);
    await leaveChair();
  },

  async Wrath() {
    const { cracks, chair, mug, mugHome, shards } = P;
    hero.setExpression({ brow: 1, lids: 0.15, smile: -0.8, mouth: 0.6 });
    await hero.moveTo(3.0, -0.9);
    await hero.faceYaw(Math.PI / 2);
    const t0 = actor.time;
    actor.pose = (T, t, v) => {
      const ph = ((t - t0) * 2.6) % 1;
      const thrust = ph < 0.35 ? ph / 0.35 : Math.max(0, 1 - (ph - 0.35) / 0.4);
      T.spineX = 0.25 + 0.2 * thrust;
      T.aHip = -0.45;
      T.bHip = 0.4;
      T.bX = lerp(0.6, -1.55, thrust);
      T.bEl = lerp(-1.6, -0.15, thrust);
      T.aX = -0.9;
      T.aEl = -1.7;
      T.aZ = 0.2;
    };
    const first = state.wrathCount * 2;
    for (let i = 0; i < 5; i++) {
      await wait(560);
      const c = cracks[Math.min(cracks.length - 1, first + Math.floor(i / 2.5))];
      c.material.opacity = 1;
      flashT = Math.max(flashT, 0.6);
    }
    state.wrathCount++;

    await hero.moveTo(3.3, -1.9);
    await hero.faceYaw(Math.PI);
    actor.pose = (T, t, v) => {
      T.aHip = -0.2 + Math.sin((t - t0) * 12) * 0.1;
      T.bHip = 0.1;
      T.spineX = 0.2;
    };
    await wait(250);
    actor.pose = (T) => {
      T.aHip = -1.1;
      T.spineX = 0.1;
      T.aX = -0.5;
      T.bX = 0.6;
    };
    await wait(200);
    const cp = chair.position.clone();
    tween(450, (p) => {
      chair.rotation.z = 1.5 * ease(p);
      chair.position.set(cp.x + 0.35 * ease(p), 0.27 * ease(p), cp.z - 0.2 * ease(p));
    });
    tween(500, (p) => {
      mug.position.set(mugHome.x - 0.5 * ease(p), mugHome.y * (1 - ease(p)) + 0.05 * ease(p), mugHome.z + 0.6 * ease(p));
    }).then(() => {
      shards.position.set(mug.position.x, 0, mug.position.z);
      shards.visible = true;
      mug.visible = false;
    });
    await wait(450);
    flashT = 1;
    actor.pose = (T, t) => {
      T.headX = -0.45;
      T.aX = T.bX = -2.6;
      T.aEl = T.bEl = -0.5;
      T.aZ = -0.4;
      T.bZ = 0.4;
      T.spineX = -0.1;
      T.spineZ = Math.sin(t * 30) * 0.03;
    };
    await wait(1400);

    // he cools off and tidies up
    hero.setExpression(null);
    actor.pose = null;
    shards.visible = false;
    mug.visible = true;
    mug.position.copy(mugHome);
    await tween(500, (p) => {
      chair.rotation.z = 1.5 * (1 - ease(p));
      chair.position.set(cp.x + 0.35 * (1 - ease(p)), 0.27 * (1 - ease(p)), cp.z - 0.2 * (1 - ease(p)));
    });
  },

  async Sloth() {
    await hero.moveTo(-2.7, -0.35);
    await hero.faceYaw(0);
    hero.setExpression({ lids: 0.65, smile: 0.1, mouth: 0 });
    actor.chips.visible = true;
    const x0 = hero.person.position.z;
    const t0 = actor.time;
    let lying = false;
    actor.pose = (T, t, v) => {
      if (!lying) {
        sitPose(T, v);
        return;
      }
      const eat = Math.max(0, Math.sin((t - t0) * 2.6));
      T.tiltX = -Math.PI / 2;
      T.rootY = 0.66;
      T.headX = 0.1;
      T.aX = -0.9;
      T.aEl = -0.7;
      T.aZ = 0.3;
      T.bX = -2.3;
      T.bEl = lerp(-0.4, -2.0, eat);
      T.bZ = -0.45;
      T.aHip = T.bHip = 0;
      T.aKn = T.bKn = 0.15;
      T.hipsY = 0.97;
    };
    await tween(450, (p) => (hero.person.position.z = x0 + (-0.95 - x0) * ease(p)));
    lying = true;
    await tween(300, (p) => (hero.person.position.z = -0.95 + (-1.2 + 0.95) * ease(p)));
    hero.setExpression({ lids: 0.65, smile: 0.1, mouth: 0.3 });
    const items = P.snacks.children;
    for (let i = 0; i < items.length; i++) {
      scaleTo(items[i], 0.001, 1, 400);
      await wait(520);
    }
    await wait(500);
    hero.setExpression(null);
    lying = false;
    actor.chips.visible = false;
    actor.pose = (T, t, v) => sitPose(T, v);
    await wait(500);
    hero.person.position.z = -0.95;
    await leaveBedEdge();
    for (const s of items) scaleTo(s, 1, 0.001, 600);
  },

  async Gluttony() {
    const { fridgeDoor, fridgeLight } = P;
    await hero.moveTo(1.6, -2.6);
    await hero.faceYaw(Math.PI);
    await tween(450, (p) => {
      fridgeDoor.rotation.y = -1.9 * ease(p);
      fridgeLight.intensity = 6 * ease(p);
    });
    actor.pose = (T, t, v) => {
      T.spineX = 0.45;
      T.bX = -1.3;
      T.bEl = -0.3;
      T.aX = -0.4;
    };
    await wait(500);
    actor.food.visible = true;
    hero.setExpression({ smile: 0.3, lids: 0.3, mouth: 0.6 });
    actor.bloatTarget = 1;
    const t0 = actor.time;
    actor.pose = (T, t, v) => {
      const eat = 0.5 + 0.5 * Math.sin((t - t0) * 9);
      T.spineX = 0.25;
      T.bX = -1.6;
      T.bEl = lerp(-0.8, -2.3, eat);
      T.bZ = -0.2;
      T.aX = -1.4;
      T.aEl = lerp(-1.8, -0.7, eat);
      T.aZ = 0.2;
      T.headX = 0.1 - eat * 0.12;
    };
    const mouthTimer = setInterval(() => hero.setExpression({ smile: 0.3, lids: 0.3, mouth: Math.random() > 0.5 ? 0.9 : 0.15 }), 160);
    await wait(5000);
    clearInterval(mouthTimer);
    actor.food.visible = false;
    hero.setExpression({ lids: 0.5, smile: -0.1, mouth: 0 });
    actor.pose = (T) => {
      T.spineX = -0.15;
      T.aX = T.bX = -0.6;
      T.aEl = T.bEl = -0.4;
    };
    await wait(900);
    await tween(450, (p) => {
      fridgeDoor.rotation.y = -1.9 * (1 - ease(p));
      fridgeLight.intensity = 6 * (1 - ease(p));
    });
    hero.setExpression(null);
    actor.bloatTarget = 0;
  },

  async Greed() {
    await sitAtChair();
    P.screen.draw("greed");
    P.monitorLight.color.setHex(0x3dff7a);
    P.monitorLight.intensity = 5;
    P.cashLight.intensity = 6;
    hero.setExpression({ smile: 0.9, lids: 0.1, brow: -0.3, mouth: 0.15 });
    const t0 = actor.time;
    actor.pose = (T, t, v) => {
      sitPose(T, v);
      const c = Math.sin((t - t0) * 7);
      T.spineX = 0.3 + 0.3 * v;
      T.headY = Math.sin((t - t0) * 2.4) * 0.5;
      T.headX = 0.15;
      T.aX = -1.2 + c * 0.2;
      T.bX = -1.2 - c * 0.2;
      T.aEl = T.bEl = -0.9;
      T.aZ = 0.25;
      T.bZ = -0.25;
    };
    for (const s of P.cash.children) {
      scaleTo(s, 0.001, 1, 350);
      await wait(520);
    }
    await wait(1200);
    for (const s of P.cash.children) scaleTo(s, 1, 0.001, 500);
    P.screen.draw("idle");
    P.monitorLight.color.copy(lights.monitor);
    P.monitorLight.intensity = 2.5;
    P.cashLight.intensity = 0;
    hero.setExpression(null);
    await leaveChair();
  },

  async Envy() {
    await sitOnBedEdge();
    actor.phone.visible = true;
    actor.phoneLight.intensity = 1.6;
    hero.setExpression({ brow: 0.9, smile: -0.7, lids: 0.2, mouth: 0 });
    const t0 = actor.time;
    actor.pose = (T, t, v) => {
      sitPose(T, v);
      const s = Math.sin((t - t0) * 5);
      T.spineX = 0.2 + 0.3 * v;
      T.headX = 0.45;
      T.headY = Math.sin((t - t0) * 1.1) * 0.12;
      T.bX = -1.2;
      T.bEl = -1.9 + s * 0.12;
      T.bZ = -0.2;
      T.aX = -0.5;
      T.aEl = -1.9;
      T.aZ = 0.1 + Math.sin((t - t0) * 20) * 0.03;
    };
    await wait(5200);
    actor.phone.visible = false;
    actor.phoneLight.intensity = 0;
    hero.setExpression(null);
    await leaveBedEdge();
  },

  async Pride() {
    await hero.moveTo(-3.05, 2.2);
    await hero.faceYaw(-Math.PI / 2);
    hero.setExpression({ smile: 0.8, lids: 0.35, brow: -0.2, mouth: 0 });
    const t0 = actor.time;
    actor.pose = (T, t, v) => {
      const ph = Math.floor((t - t0) / 1.4) % 3;
      T.headX = -0.12;
      T.spineX = -0.08;
      if (ph === 0) {
        T.aX = T.bX = -1.2;
        T.aZ = -0.8;
        T.bZ = 0.8;
        T.aEl = T.bEl = -2.3;
      } else if (ph === 1) {
        T.aX = T.bX = -0.1;
        T.aZ = -0.75;
        T.bZ = 0.75;
        T.aEl = T.bEl = -1.4;
        T.spineX = -0.15;
      } else {
        T.aX = -1.4;
        T.bX = -0.9;
        T.aZ = -0.2;
        T.bZ = 0.9;
        T.aEl = -2.2;
        T.bEl = -0.5;
        T.headY = 0.25;
      }
    };
    await wait(5600);
    hero.setExpression(null);
    actor.pose = null;
  },
};

// ---------- Flow ----------
function scheduleNextTemptation(firstOne = false) {
  if (state.gameOver) return;
  clearTimeout(state.temptationTimer);
  const delay = firstOne ? rand(3000, 5000) : rand(6000, 11000);
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
  world.aura.color.setHex(sin.color);
  setStatus("A thought is trying to take hold...");
}

function addCorruption(amount) {
  state.corruption = clamp(state.corruption + amount, 0, 100);
  updateMeter();
  flashT = 1;
  return state.corruption >= 100;
}

async function resolveTemptation(choice) {
  if (!state.currentSin || state.gameOver) return;
  const sin = state.currentSin;
  temptationPanel.classList.add("hidden");
  state.currentSin = null;
  state.busy = true;

  if (choice === "succumb") {
    state.succumbCount++;
    setStatus(`You gave in to ${sin.name}.`);
    const dead = addCorruption(rand(...GIVE_IN_GAIN));
    state.sinning = true;
    await SIN_ACT[sin.name]();
    await goHome();
    state.sinning = false;
    return afterResolve(dead);
  }

  const act = ACTIVITIES[choice];
  setStatus(`Resisting ${sin.name}: he ${act.label}...`);
  const ok = await ACT[choice]();
  if (ok) {
    state.resistCount++;
    state.corruption = clamp(state.corruption - rand(...act.relief), 0, 100);
    updateMeter();
    setStatus("The whisper fades. Feeling steadier.");
    return afterResolve(false);
  }
  state.failCount++;
  setStatus(`His focus slipped. ${sin.name} seeps in.`);
  return afterResolve(addCorruption(rand(...FAIL_GAIN)));
}

function afterResolve(dead) {
  state.busy = false;
  if (dead) return triggerGameOver();
  scheduleNextTemptation();
}

function triggerGameOver() {
  state.gameOver = true;
  clearTimeout(state.temptationTimer);
  setStatus("");
  actor.pose = null;
  actor.collapse = true;
  tween(2500, (p) => (gloom = ease(p)));
  setTimeout(() => {
    gameoverStats.textContent = `Resisted ${state.resistCount}. Failed ${state.failCount}. Gave in ${state.succumbCount}.`;
    gameoverPanel.classList.remove("hidden");
  }, 2200);
}

function resetGame() {
  state.corruption = 0;
  state.busy = false;
  state.gameOver = false;
  state.currentSin = null;
  state.succumbCount = 0;
  state.resistCount = 0;
  state.failCount = 0;
  gloom = 0;
  state.wrathCount = 0;
  state.sinning = false;
  for (const c of world.props.cracks) c.material.opacity = 0;
  hero.reset();
  updateMeter();
  gameoverPanel.classList.add("hidden");
  setStatus("");
  scheduleNextTemptation(true);
}

// ---------- Render loop ----------
const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt * 1000;
    const p = Math.min(1, tw.t / tw.ms);
    tw.fn(p);
    if (p >= 1) {
      tweens.splice(i, 1);
      tw.resolve();
    }
  }

  const target = state.corruption / 100;
  visCorruption += (target - visCorruption) * (1 - Math.exp(-dt * 1.6));
  if (Math.abs(visCorruption - lastAtrophy) > 0.002) {
    hero.setAtrophy(visCorruption);
    lastAtrophy = visCorruption;
  }

  hero.update(dt, t, visCorruption, { tempted: !!state.currentSin });
  if (actor.headphones.visible) hero.cupMat.emissiveIntensity = 0.6 + Math.sin(t * 7) * 0.4;

  auraLevel += ((state.currentSin ? 1 : 0) - auraLevel) * (1 - Math.exp(-dt * 3));
  world.aura.intensity = auraLevel * (2.2 + Math.sin(t * 5) * 0.6);
  world.fill.position.set(hero.person.position.x + 0.8, 1.9, hero.person.position.z + 2);
  world.fill.intensity = 16 * (1 - gloom * 0.8);
  world.aura.position.set(hero.person.position.x, 1.5, hero.person.position.z + 0.9);

  flashT = Math.max(0, flashT - dt * 1.2);
  hurtEl.style.opacity = flashT;

  sigilLevel += ((state.currentSin || state.sinning ? 1 : 0) - sigilLevel) * (1 - Math.exp(-dt * 2.5));
  world.update(dt, t, visCorruption, gloom, sigilLevel);
  world.render(dt);
  requestAnimationFrame(animate);
}

updateMeter();
animate();
