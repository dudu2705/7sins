const panel = document.getElementById("challenge");
const titleEl = document.getElementById("challenge-title");
const hintEl = document.getElementById("challenge-hint");
const timebar = document.getElementById("timebar-fill");
const body = document.getElementById("challenge-body");

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// Generic runner: shows the panel, ticks a countdown, resolves true/false.
function challenge({ title, hint, seconds, build, onKey, onTick }) {
  return new Promise((resolve) => {
    titleEl.textContent = title;
    hintEl.textContent = hint;
    body.innerHTML = "";
    timebar.style.width = "100%";
    const start = performance.now();
    const api = { done: false, body, elapsed: () => (performance.now() - start) / 1000, timeouts: [] };

    const keydown = (e) => onKey && onKey(e, api);
    const finish = (ok) => {
      if (api.done) return;
      api.done = true;
      clearInterval(iv);
      api.timeouts.forEach(clearTimeout);
      document.removeEventListener("keydown", keydown);
      panel.classList.add("hidden");
      resolve(ok);
    };
    api.finish = finish;
    api.later = (fn, ms) => api.timeouts.push(setTimeout(() => !api.done && fn(), ms));

    document.addEventListener("keydown", keydown);
    let last = start;
    const iv = setInterval(() => {
      const now = performance.now();
      const el = (now - start) / 1000;
      timebar.style.width = `${Math.max(0, (1 - el / seconds) * 100)}%`;
      if (onTick) onTick(api, (now - last) / 1000);
      last = now;
      if (el >= seconds) finish(false);
    }, 40);

    build(api);
    panel.classList.remove("hidden");
  });
}

// ---------- READ: type the passage ----------
const PASSAGES = [
  "Virtue is the quiet discipline of a hungry mind.",
  "A single candle needs no leave to defy the dark.",
  "He who masters his hunger is never ruled by it.",
  "Dawn belongs only to those who endured the night.",
  "Silence the whisper and the whole choir falls apart.",
  "Every vice begins as a small and reasonable wish.",
];

export function readGame(fx) {
  const target = pick(PASSAGES);
  return challenge({
    title: "Read",
    hint: "Copy the passage exactly before your focus slips.",
    seconds: 22,
    build(api) {
      const box = el("div", "passage");
      const spans = [...target].map((ch) => {
        const s = el("span", "", ch);
        box.append(s);
        return s;
      });
      const input = el("input", "type-input");
      input.autocomplete = "off";
      input.spellcheck = false;
      api.body.append(box, input);
      api.later(() => input.focus(), 30);
      api.body.parentElement.onclick = () => input.focus();
      let lastQuarter = 0;
      input.addEventListener("input", () => {
        const v = input.value;
        spans.forEach((s, i) => {
          s.className = i < v.length ? (v[i].toLowerCase() === target[i].toLowerCase() ? "ok" : "bad") : i === v.length ? "cur" : "";
        });
        const q = Math.floor((v.length / target.length) * 4);
        if (q > lastQuarter) fx.onPage();
        lastQuarter = q;
        if (v.toLowerCase() === target.toLowerCase()) api.finish(true);
      });
    },
  });
}

// ---------- RUN: alternate left / right ----------
export function runGame(fx) {
  let progress = 0;
  let next = "L";
  let rate = 0;
  let fill;
  let keyL;
  let keyR;
  const press = (side) => {
    if (side !== next) {
      progress = Math.max(0, progress - 2);
      return;
    }
    progress = Math.min(100, progress + 3.4);
    rate = Math.min(1, rate + 0.2);
    next = side === "L" ? "R" : "L";
    keyL.classList.toggle("next", next === "L");
    keyR.classList.toggle("next", next === "R");
  };
  return challenge({
    title: "Run",
    hint: "Alternate  ←  and  →  as fast as you can. Don't stumble.",
    seconds: 13,
    build(api) {
      const g = el("div", "gauge");
      fill = el("div", "gauge-fill");
      g.append(fill);
      const keys = el("div", "keys");
      keyL = el("button", "key next", "←");
      keyR = el("button", "key", "→");
      keyL.onclick = () => press("L");
      keyR.onclick = () => press("R");
      keys.append(keyL, keyR);
      api.body.append(g, keys, el("div", "readout", "REACH THE END OF THE ROAD"));
    },
    onKey(e) {
      if (e.repeat) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") press("L");
      else if (e.code === "ArrowRight" || e.code === "KeyD") press("R");
      else return;
      e.preventDefault();
    },
    onTick(api, dt) {
      progress = Math.max(0, progress - 11 * dt);
      rate = Math.max(0, rate - dt * 1.4);
      fx.setEffort(rate);
      fill.style.width = `${progress}%`;
      if (progress >= 100) api.finish(true);
    },
  });
}

// ---------- PUSH-UPS: hit the zone ----------
export function pushupGame(fx) {
  const GOAL = 6;
  let reps = 0;
  let strikes = 0;
  let pos = 0;
  let dir = 1;
  let speed = 0.9;
  let zoneC = 0.5;
  const zoneW = 0.2;
  let cursor;
  let zone;
  let readout;
  const showReadout = () => (readout.textContent = `REPS ${reps} / ${GOAL}     STRAIN ${"✕".repeat(strikes)}${"·".repeat(3 - strikes)}`);
  const newZone = () => {
    zoneC = rand(0.2, 0.8);
    zone.style.left = `${(zoneC - zoneW / 2) * 100}%`;
    zone.style.width = `${zoneW * 100}%`;
  };
  let apiRef;
  const strike = () => {
    if (Math.abs(pos - zoneC) <= zoneW / 2) {
      reps++;
      speed += 0.18;
      fx.onRep();
      newZone();
      if (reps >= GOAL) {
        apiRef.later(() => apiRef.finish(true), 650);
      }
    } else {
      strikes++;
      fx.onStrain();
      if (strikes >= 3) apiRef.finish(false);
    }
    showReadout();
  };
  return challenge({
    title: "Push-ups",
    hint: "Press SPACE when the line is inside the green. Three slips and your arms give out.",
    seconds: 20,
    build(api) {
      apiRef = api;
      const g = el("div", "gauge");
      zone = el("div", "zone");
      cursor = el("div", "cursor");
      g.append(zone, cursor);
      readout = el("div", "readout");
      const btn = el("button", "choice", "Push");
      btn.onclick = strike;
      api.body.append(g, btn, readout);
      newZone();
      showReadout();
    },
    onKey(e) {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      strike();
    },
    onTick(api, dt) {
      if (reps >= GOAL) return;
      pos += dir * speed * dt;
      if (pos > 1) { pos = 1; dir = -1; }
      if (pos < 0) { pos = 0; dir = 1; }
      cursor.style.left = `${pos * 100}%`;
    },
  });
}

// ---------- PODCAST: remember what you heard ----------
const WORDS = ["lantern", "river", "oath", "ember", "harbor", "willow", "anvil", "meadow", "candle", "thorn", "falcon", "marble", "orchard", "compass", "winter", "mirror"];

export function podcastGame(fx) {
  const heard = [];
  while (heard.length < 3) {
    const w = pick(WORDS);
    if (!heard.includes(w)) heard.push(w);
  }
  return challenge({
    title: "Podcast",
    hint: "Listen closely. The host names three things.",
    seconds: 20,
    build(api) {
      const line = el("div", "heard", heard.join("  ·  "));
      const input = el("input", "type-input");
      input.autocomplete = "off";
      input.spellcheck = false;
      input.placeholder = "type the three words, in order";
      input.style.visibility = "hidden";
      api.body.append(line, input);
      api.later(() => {
        line.textContent = "…";
        hintEl.textContent = "What did the host say? Type the three words in order.";
        input.style.visibility = "visible";
        input.focus();
      }, 3800);
      api.body.parentElement.onclick = () => input.focus();
      input.addEventListener("input", () => {
        const got = input.value.trim().toLowerCase().split(/\s+/);
        if (got.length === 3 && got.every((w, i) => w === heard[i])) api.finish(true);
      });
    },
  });
}
