// static/js/status-sim.js
// 機能：武器＋防具5種の選択、基礎ステ入力、合計表示
// 追加：localStorage による保存 / 復元

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const $ = (id) => document.getElementById(id);

const SLOTS = [
  { key: "weapon", indexUrl: "/db/equip/weapon/index.json", itemDir: "/db/equip/weapon/" },
  { key: "head",   indexUrl: "/db/equip/armor/head/index.json",   itemDir: "/db/equip/armor/head/" },
  { key: "body",   indexUrl: "/db/equip/armor/body/index.json",   itemDir: "/db/equip/armor/body/" },
  { key: "hands",  indexUrl: "/db/equip/armor/hands/index.json",  itemDir: "/db/equip/armor/hands/" },
  { key: "feet",   indexUrl: "/db/equip/armor/feet/index.json",   itemDir: "/db/equip/armor/feet/" },
  { key: "shield", indexUrl: "/db/equip/armor/shield/index.json", itemDir: "/db/equip/armor/shield/" },
];

// ====== 配信パス対応 ======
function getAssetBaseUrl() {
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.src) return window.location.origin;
  const u = new URL(scriptEl.src, window.location.href);
  const basePath = u.pathname.replace(/\/js\/status-sim\.js$/, "");
  return `${u.origin}${basePath}`;
}
const ASSET_BASE = getAssetBaseUrl();
const abs = (p) => `${ASSET_BASE}${p}`;

// ====== localStorage ======
const STORAGE_KEY = "status_sim_state_v1";

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

// ====== util ======
const n = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function makeZeroStats() {
  return Object.fromEntries(STATS.map((k) => [k, 0]));
}

function addStats(a, b) {
  const out = { ...a };
  for (const k of STATS) out[k] = (out[k] ?? 0) + (b?.[k] ?? 0);
  return out;
}

function renderStats(obj) {
  const ordered = Object.fromEntries(STATS.map((k) => [k, obj?.[k] ?? 0]));
  return JSON.stringify(ordered, null, 2);
}

// ====== TOML（簡易） ======
function parseMiniToml(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "+++" && !l.startsWith("#"));

  const item = { base_add: {} };
  let section = "";

  for (const line of lines) {
    const sec = line.match(/^\[(.+?)\]$/);
    if (sec) { section = sec[1]; continue; }

    const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (!kv) continue;

    const key = kv[1];
    let raw = kv[2].trim();
    if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);

    const value = n(raw, raw);
    if (section === "base_add") item.base_add[key] = n(value, 0);
    else item[key] = value;
  }

  item.id = item.id || item.title || "unknown";
  return item;
}

async function loadIndex(path) {
  const res = await fetch(abs(path), { cache: "no-store" });
  if (!res.ok) throw new Error(`index.json を読み込めません: ${path}`);
  return await res.json();
}

async function loadToml(dir, file) {
  const res = await fetch(abs(`${dir}${file}`), { cache: "no-store" });
  if (!res.ok) throw new Error(`TOML を読み込めません: ${file}`);
  return parseMiniToml(await res.text());
}

// ====== UI ======
function fillSelect(selectEl, items) {
  selectEl.innerHTML = "";
  selectEl.append(new Option("（なし）", ""));
  for (const it of items) selectEl.append(new Option(it.title ?? it.id, it.id));
}

function readBaseStatsFromUI() {
  const out = makeZeroStats();
  for (const k of STATS) out[k] = n($(`base_${k}`)?.value, 0);
  return out;
}

function applyBaseStatsToUI(stats) {
  for (const k of STATS) {
    const el = $(`base_${k}`);
    if (el) el.value = stats?.[k] ?? 0;
  }
}

// ====== main ======
async function main() {
  const baseBox = $("baseBox");
  const equipBox = $("equipBox");
  const totalBox = $("totalBox");

  const saved = loadState();

  const slotItems = {};
  for (const s of SLOTS) {
    const files = await loadIndex(s.indexUrl);
    const items = [];
    for (const f of files) items.push(await loadToml(s.itemDir, f));
    slotItems[s.key] = items;

    const sel = $(`select_${s.key}`);
    if (sel) {
      fillSelect(sel, items);
      if (saved?.equip?.[s.key]) sel.value = saved.equip[s.key];
      sel.addEventListener("change", recalc);
    }
  }

  applyBaseStatsToUI(saved?.base);

  for (const k of STATS) {
    $(`base_${k}`)?.addEventListener("input", recalc);
  }

  function recalc() {
    const base = readBaseStatsFromUI();
    let equipSum = makeZeroStats();
    const equipState = {};

    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      const chosen = slotItems[s.key].find(it => it.id === sel?.value);
      equipState[s.key] = sel?.value || "";
      equipSum = addStats(equipSum, chosen?.base_add ?? {});
    }

    const total = addStats(base, equipSum);

    baseBox.textContent = renderStats(base);
    equipBox.textContent = renderStats(equipSum);
    totalBox.textContent = renderStats(total);

    saveState({ base, equip: equipState });
  }

  recalc();
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch(e => {
    console.error(e);
    const totalBox = $("totalBox");
    if (totalBox) totalBox.textContent = String(e);
  });
});
