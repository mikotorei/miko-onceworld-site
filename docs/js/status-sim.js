// static/js/status-sim.js
// 目的：武器 + 防具5種（頭/体/腕/足/盾）を選択 → base_add を合算 → 基礎+装備を表示

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const $ = (id) => document.getElementById(id);

const SLOTS = [
  { key: "weapon", label: "武器", indexUrl: "/db/equip/weapon/index.json", itemDir: "/db/equip/weapon/" },
  { key: "head",   label: "頭",   indexUrl: "/db/equip/armor/head/index.json",   itemDir: "/db/equip/armor/head/" },
  { key: "body",   label: "体",   indexUrl: "/db/equip/armor/body/index.json",   itemDir: "/db/equip/armor/body/" },
  { key: "hands",  label: "腕",   indexUrl: "/db/equip/armor/hands/index.json",  itemDir: "/db/equip/armor/hands/" },
  { key: "feet",   label: "足",   indexUrl: "/db/equip/armor/feet/index.json",   itemDir: "/db/equip/armor/feet/" },
  { key: "shield", label: "盾",   indexUrl: "/db/equip/armor/shield/index.json", itemDir: "/db/equip/armor/shield/" },
];

// --- サブパス配信（GitHub Pagesなど）対応：/REPO_NAME を自動付与 ---
function getAssetBaseUrl() {
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.src) return window.location.origin;
  const u = new URL(scriptEl.src, window.location.href);
  const basePath = u.pathname.replace(/\/js\/status-sim\.js$/, "");
  return `${u.origin}${basePath}`;
}
const ASSET_BASE = getAssetBaseUrl();
const abs = (path) => `${ASSET_BASE}${path}`;

function n(v, fb = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fb;
}

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

// 用途限定 TOML パーサ（前回と同等）
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

    const num = Number(raw);
    const value =
      Number.isFinite(num) && raw !== "" && !raw.includes('"') ? num : raw;

    if (section === "base_add") item.base_add[key] = n(value, 0);
    else item[key] = value;
  }

  item.id = item.id || item.title || "unknown";
  return item;
}

async function loadIndex(indexPath) {
  const url = abs(indexPath);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`index.json を読み込めません: ${url}`);
  return await res.json(); // ["file.toml", ...]
}

async function loadToml(dirPath, filename) {
  const url = abs(`${dirPath}${filename}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TOML を読み込めません: ${url}`);
  const text = await res.text();
  return parseMiniToml(text);
}

function fillSelect(selectEl, items) {
  selectEl.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "（なし）";
  selectEl.appendChild(opt0);

  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = it.id;
    opt.textContent = it.title ?? it.id;
    selectEl.appendChild(opt);
  }
}

function findById(items, id) {
  if (!id) return null;
  return items.find((it) => it.id === id) ?? null;
}

function readBaseStatsFromUI() {
  const out = makeZeroStats();
  for (const k of STATS) out[k] = n($(`base_${k}`)?.value, 0);
  return out;
}

function resetBaseStatsUI() {
  for (const k of STATS) {
    const el = $(`base_${k}`);
    if (el) el.value = "0";
  }
}

async function main() {
  const baseBox = $("baseBox");
  const equipBox = $("equipBox");
  const totalBox = $("totalBox");
  const recalcBtn = $("recalcBtn");
  const resetBtn = $("resetBtn");

  if (!baseBox || !equipBox || !totalBox) return;

  // スロットごとのアイテム一覧をロード
  const slotItems = {}; // key -> items[]
  for (const s of SLOTS) {
    const files = await loadIndex(s.indexUrl);
    const items = [];
    for (const f of files) items.push(await loadToml(s.itemDir, f));
    slotItems[s.key] = items;

    const sel = $(`select_${s.key}`);
    if (sel) fillSelect(sel, items);
  }

  const recalc = () => {
    const base = readBaseStatsFromUI();

    let equipSum = makeZeroStats();
    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      const chosen = findById(slotItems[s.key], sel?.value);
      equipSum = addStats(equipSum, chosen?.base_add ?? {});
    }

    const total = addStats(base, equipSum);

    baseBox.textContent = renderStats(base);
    equipBox.textContent = renderStats(equipSum);
    totalBox.textContent = renderStats(total);
  };

  // 入力変化で自動再計算
  for (const k of STATS) $(`base_${k}`)?.addEventListener("input", recalc);
  for (const s of SLOTS) $(`select_${s.key}`)?.addEventListener("change", recalc);

  recalcBtn?.addEventListener("click", recalc);
  resetBtn?.addEventListener("click", () => { resetBaseStatsUI(); recalc(); });

  recalc();
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => {
    const totalBox = $("totalBox");
    if (totalBox) totalBox.textContent = String(e?.message ?? e);
    console.error(e);
  });
});
