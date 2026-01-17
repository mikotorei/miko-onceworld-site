// static/js/status-sim.js
// 切り捨て位置：
// ① (②+①+③) の後
// ② ×④（セット補正）の後
// ③ 通常割合⑥ の後
// ④ 最終割合⑦ の後

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const BASE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const PROTEIN_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const SCALE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const ARMOR_KEYS = ["head", "body", "hands", "feet", "shield"];
const ACCESSORY_KEYS = ["accessory1", "accessory2", "accessory3"];
const PET_KEYS = ["pet1", "pet2", "pet3"];

const $ = (id) => document.getElementById(id);
const BASE_MOV = 6;

const EPS = 1e-9;
const floorSafe = (v) => Math.floor(v + EPS);

/* ---------- util ---------- */
const n = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clamp0 = (v) => Math.max(0, n(v, 0));
const clamp1 = (v) => Math.max(1, n(v, 1));
const clampStage = (v) => Math.max(0, Math.min(4, n(v, 0)));

function makeZeroStats() {
  return Object.fromEntries(STATS.map(k => [k, 0]));
}
function addStats(a, b) {
  const r = { ...a };
  for (const k of STATS) r[k] += b?.[k] ?? 0;
  return r;
}
function mulStats(a, m) {
  const r = makeZeroStats();
  for (const k of STATS) r[k] = (a?.[k] ?? 0) * m;
  return r;
}
function floorStats(a) {
  const r = makeZeroStats();
  for (const k of STATS) r[k] = floorSafe(a?.[k] ?? 0);
  return r;
}

/* ---------- UI ---------- */
function setErr(text) {
  const el = $("errBox");
  if (!el) return;
  const msg = (text || "").trim();
  el.textContent = msg;
  el.classList.toggle("is-visible", msg.length > 0);
}

/* ---------- GitHub Pages ---------- */
function getAssetBaseUrl() {
  const s = document.currentScript;
  if (!s?.src) return location.origin;
  const u = new URL(s.src, location.href);
  return `${u.origin}${u.pathname.replace(/\/js\/status-sim\.js$/, "")}`;
}
const ASSET_BASE = getAssetBaseUrl();
const abs = (p) => `${ASSET_BASE}${p}`;

/* ---------- fetch ---------- */
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`404: ${url}`);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`404: ${url}`);
  return r.text();
}

/* ---------- TOML ---------- */
function parseMiniToml(text) {
  const item = { base_add: {}, base_rate: {} };
  let sec = "";
  text.split(/\r?\n/).map(l => l.trim()).forEach(l => {
    if (!l || l === "+++" || l.startsWith("#")) return;
    const s = l.match(/^\[(.+?)\]$/);
    if (s) { sec = s[1]; return; }
    const m = l.match(/^([\w]+)\s*=\s*(.+)$/);
    if (!m) return;
    const k = m[1];
    const v = Number(m[2]);
    if (sec === "base_add") item.base_add[k] = Number.isFinite(v) ? v : 0;
    else if (sec === "base_rate") item.base_rate[k] = Number.isFinite(v) ? v : 0;
    else item[k] = m[2];
  });
  item.id = item.id || item.title || "unknown";
  return item;
}

/* ---------- scale ---------- */
function scaleEquipBaseAdd(baseAdd, lv) {
  const m = 1 + clamp0(lv) * 0.1;
  const r = makeZeroStats();
  for (const k of SCALE_STATS) r[k] = (baseAdd?.[k] ?? 0) * m;
  r.mov = baseAdd?.mov ?? 0;
  return r;
}
function scaleAccFlat(baseAdd, lv) {
  const m = 1 + (clamp1(lv) - 1) * 0.1;
  const r = makeZeroStats();
  for (const k of STATS) r[k] = (baseAdd?.[k] ?? 0) * m;
  return r;
}
function scaleAccRate(baseRate, lv) {
  const m = 1 + (clamp1(lv) - 1) * 0.01;
  const r = makeZeroStats();
  for (const k of STATS) r[k] = (baseRate?.[k] ?? 0) * m;
  return r;
}

/* ---------- set ---------- */
function getArmorSetSeries(slotItems, equipState) {
  let s = null;
  for (const k of ARMOR_KEYS) {
    const id = equipState[k]?.id;
    if (!id) return null;
    const it = slotItems[k]?.find(v => v.id === id);
    if (!it?.series) return null;
    if (s === null) s = it.series;
    if (s !== it.series) return null;
  }
  return s;
}

/* ---------- pet ---------- */
function sumPetUpToStage(pet, stage) {
  const a = makeZeroStats(), r = makeZeroStats(), f = makeZeroStats();
  for (let i = 0; i <= clampStage(stage); i++) {
    const s = pet.stages?.[i];
    if (!s) continue;
    for (const k of STATS) {
      a[k] += s.base_add?.[k] ?? 0;
      r[k] += s.base_rate?.[k] ?? 0;
      f[k] += s.final_rate?.[k] ?? 0;
    }
  }
  return { add: a, rate: r, final: f };
}

/* ---------- rate ---------- */
function applyRateFloor(stats, rate) {
  const r = makeZeroStats();
  for (const k of STATS) {
    r[k] = floorSafe((stats[k] ?? 0) * (1 + (rate[k] ?? 0) / 100));
  }
  return r;
}

/* ---------- main ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  const saved = {};
  const petDB = await fetchJSON(abs("/db/pet_skills.json"));
  const pets = petDB.pets ?? [];

  const SLOT_DEF = {
    weapon: "/db/equip/weapon/",
    head: "/db/equip/armor/head/",
    body: "/db/equip/armor/body/",
    hands: "/db/equip/armor/hands/",
    feet: "/db/equip/armor/feet/",
    shield: "/db/equip/armor/shield/",
    accessory: "/db/equip/accessory/"
  };

  const slotItems = {};
  for (const k in SLOT_DEF) {
    slotItems[k] = [];
    const files = await fetchJSON(abs(SLOT_DEF[k] + "index.json"));
    for (const f of files) {
      slotItems[k].push(parseMiniToml(await fetchText(abs(SLOT_DEF[k] + f))));
    }
  }

  function recalc() {
    /* ② base */
    let base = makeZeroStats();
    for (const k of BASE_STATS) base[k] = clamp0($(`base_${k}`)?.value);
    base.mov = BASE_MOV;

    /* ① protein */
    let protein = makeZeroStats();
    const shaker = clamp0($("shakerCount")?.value);
    for (const k of PROTEIN_STATS) {
      protein[k] = clamp0($(`protein_${k}`)?.value) * (1 + shaker * 0.01);
    }

    /* ③ equip */
    let equip = makeZeroStats();
    const equipState = {};
    for (const k of ["weapon", ...ARMOR_KEYS]) {
      const id = $(`select_${k}`)?.value;
      const lv = clamp0($(`level_${k}`)?.value);
      equipState[k] = { id, lv };
      if (!id) continue;
      const it = slotItems[k]?.find(v => v.id === id);
      equip = addStats(equip, scaleEquipBaseAdd(it.base_add ?? {}, lv));
    }

    /* ★ floor after (②+①+③) */
    let total = floorStats(addStats(addStats(base, protein), equip));

    /* ④ set */
    const setMul = getArmorSetSeries(slotItems, equipState) ? 1.1 : 1.0;
    total = floorStats(mulStats(total, setMul));

    /* ⑤ flat */
    let accFlat = makeZeroStats(), accRate = makeZeroStats();
    for (const k of ACCESSORY_KEYS) {
      const id = $(`select_${k}`)?.value;
      const lv = clamp1($(`level_${k}`)?.value);
      if (!id) continue;
      const it = slotItems.accessory.find(v => v.id === id);
      accFlat = addStats(accFlat, scaleAccFlat(it.base_add ?? {}, lv));
      accRate = addStats(accRate, scaleAccRate(it.base_rate ?? {}, lv));
    }

    let petFlat = makeZeroStats(), petRate = makeZeroStats(), petFinal = makeZeroStats();
    for (const k of PET_KEYS) {
      const id = $(`select_${k}`)?.value;
      const st = clampStage($(`stage_${k}`)?.value);
      if (!id || !st) continue;
      const p = pets.find(v => v.id === id);
      const s = sumPetUpToStage(p, st);
      petFlat = addStats(petFlat, s.add);
      petRate = addStats(petRate, s.rate);
      petFinal = addStats(petFinal, s.final);
    }

    total = addStats(total, addStats(accFlat, petFlat));

    /* ⑥ normal rate */
    total = applyRateFloor(total, addStats(accRate, petRate));

    /* ⑦ final rate */
    total = applyRateFloor(total, petFinal);

    for (const k of STATS) {
      document.querySelector(`[data-total="${k}"]`).textContent = total[k];
    }
  }

  document.querySelectorAll("input,select").forEach(e => {
    e.addEventListener("input", recalc);
    e.addEventListener("change", recalc);
  });

  recalc();
});
