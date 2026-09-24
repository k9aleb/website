const CASES = [
  { name: "Recoil Case", rarity: "consumer" },
  { name: "Kilowatt Case", rarity: "consumer" },
  { name: "Fracture Case", rarity: "industrial" },
  { name: "Snakebite Case", rarity: "industrial" },
  { name: "Revolution Case", rarity: "milspec" },
  { name: "Dreams & Nightmares", rarity: "milspec" },
  { name: "Clutch Case", rarity: "restricted" },
  { name: "Prisma Case", rarity: "restricted" },
  { name: "Spectrum 2 Case", rarity: "classified" },
  { name: "Chroma 3 Case", rarity: "classified" },
  { name: "Broken Fang Case", rarity: "covert" },
  { name: "Gamma Case", rarity: "covert" },
  { name: "Danger Zone Case", rarity: "gold" },
];

const LEGENDARY = { name: "Prime Case", rarity: "gold", legendary: true };

const WEIGHTS = {
  consumer: 34,
  industrial: 24,
  milspec: 18,
  restricted: 12,
  classified: 7,
  covert: 4,
  gold: 2,
};

const PRIZE_CANDIDATES = [
  "prize.png",
  "prize.jpg",
  "prize.jpeg",
  "prize.webp",
  "prize.gif",
  "image.png",
  "image.jpg",
  "image.jpeg",
  "image.webp",
];

const reel = document.getElementById("reel");
const viewport = document.getElementById("viewport");
const statusEl = document.getElementById("status");
const revealEl = document.getElementById("reveal");
const revealCrate = document.getElementById("reveal-crate");
const prizeFrame = document.getElementById("prize-frame");
const prizeImage = document.getElementById("prize-image");
const burstEl = document.getElementById("burst");

const SPIN_MS = 6400;
const STRIP_LENGTH = 80;
const WIN_FROM_END = 8;

let busy = false;
let audioCtx = null;
let tickRaf = 0;
let prizeSrc = null;

function pickFillerCase() {
  const pool = CASES.flatMap((item) => Array(WEIGHTS[item.rarity]).fill(item));
  return pool[Math.floor(Math.random() * pool.length)];
}

function crateMarkup() {
  return `
    <div class="crate" aria-hidden="true">
      <div class="crate-lid"></div>
      <div class="crate-body">
        <span class="crate-latch"></span>
      </div>
    </div>
  `;
}

function itemCard(item) {
  const el = document.createElement("article");
  el.className = "item";
  if (item.legendary) el.classList.add("legendary");
  el.style.setProperty("--rarity", `var(--${item.rarity})`);
  el.innerHTML = `
    ${crateMarkup()}
    <p class="item-name">${item.name}</p>
  `;
  return el;
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function beep(freq, duration, type, volume) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function swell() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(90, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.55);
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.72);
}

function markerX() {
  const rect = viewport.getBoundingClientRect();
  return rect.left + rect.width / 2;
}

function cardCenter(card) {
  const rect = card.getBoundingClientRect();
  return rect.left + rect.width / 2;
}

function renderStrip(items) {
  reel.replaceChildren(...items.map(itemCard));
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function tryImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function resolvePrizeSrc() {
  for (const name of PRIZE_CANDIDATES) {
    const found = await tryImage(name);
    if (found) return found;
  }
  return null;
}

function spawnBurst() {
  burstEl.replaceChildren();
  for (let i = 0; i < 42; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    const angle = (Math.PI * 2 * i) / 42 + Math.random() * 0.2;
    const dist = 120 + Math.random() * 220;
    spark.style.setProperty("--x", `${Math.cos(angle) * dist}px`);
    spark.style.setProperty("--y", `${Math.sin(angle) * dist}px`);
    spark.style.animationDelay = `${Math.random() * 80}ms`;
    burstEl.appendChild(spark);
  }
}

async function playOpenSequence() {
  revealEl.hidden = false;
  revealEl.className = "reveal";
  prizeFrame.classList.remove("show");
  revealCrate.classList.remove("open", "shake");
  burstEl.replaceChildren();
  await waitFrame();
  revealEl.classList.add("active");
  statusEl.textContent = "Legendary crate locked in...";
  beep(180, 0.2, "triangle", 0.05);
  await wait(420);
  revealCrate.classList.add("shake");
  await wait(700);
  revealCrate.classList.add("open");
  spawnBurst();
  swell();
  beep(880, 0.18, "square", 0.04);
  statusEl.textContent = "Opening crate...";
  await wait(720);
  if (prizeSrc) {
    prizeImage.src = prizeSrc;
    prizeImage.hidden = false;
  } else {
    prizeImage.removeAttribute("src");
    prizeImage.hidden = true;
  }
  prizeFrame.classList.add("show");
  if (!prizeSrc) {
    prizeFrame.classList.add("missing");
    document.getElementById("prize-caption").textContent =
      "Drop prize.png in this folder";
  } else {
    prizeFrame.classList.remove("missing");
    document.getElementById("prize-caption").textContent = "Exceedingly Rare";
  }
  statusEl.textContent = "Unboxed.";
  await wait(900);
  revealEl.classList.add("shown");
  busy = false;
}

async function startSpin() {
  if (busy) return;
  busy = true;
  ensureAudio();
  cancelAnimationFrame(tickRaf);
  revealEl.hidden = true;
  revealEl.className = "reveal";

  document.body.classList.add("spinning");
  statusEl.textContent = "Rolling...";

  const winIndex = STRIP_LENGTH - WIN_FROM_END;
  const items = Array.from({ length: STRIP_LENGTH }, (_, i) =>
    i === winIndex ? LEGENDARY : pickFillerCase()
  );
  renderStrip(items);

  reel.style.transition = "none";
  reel.style.transform = "translateX(0px)";
  await waitFrame();

  const cards = [...reel.children];
  const winCard = cards[winIndex];
  
  const target = Math.round(
    winCard.offsetLeft + winCard.offsetWidth / 2 - viewport.clientWidth / 2
  );

  reel.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.72, 0.08, 1)`;
  reel.style.transform = `translateX(${-target}px)`;

  let lastIndex = -1;
  const watch = () => {
    let closest = 0;
    let closestDist = Infinity;
    const mark = markerX();
    cards.forEach((card, i) => {
      const dist = Math.abs(cardCenter(card) - mark);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    if (closest !== lastIndex) {
      lastIndex = closest;
      beep(620, 0.04, "square", 0.03);
    }
    tickRaf = requestAnimationFrame(watch);
  };
  tickRaf = requestAnimationFrame(watch);

  const sound = new Audio("noise.mp3");

  await wait(SPIN_MS + 60);
  cancelAnimationFrame(tickRaf);
  document.body.classList.remove("spinning");
  winCard.classList.add("winner");
  statusEl.textContent = "Landed.";
  beep(330, 0.22, "triangle", 0.06);
  await wait(380);
  await playOpenSequence(); + sound.play();
}

function onOpenIntent(event) {
  if (event.button !== undefined && event.button !== 0) return;
  startSpin();
}

document.addEventListener("pointerdown", onOpenIntent);
renderStrip(Array.from({ length: 24 }, pickFillerCase));
resolvePrizeSrc().then((src) => {
  prizeSrc = src;
});
