// static/js/status-sim.js
// B: 主人公の基礎ステ入力 + 装備加算（base_add） + 合計表示

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const $ = (id) => document.getElementById(id);

function getAssetBaseUrl() {
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.src) return window.location.origin;
  const u = new URL(scriptEl.src, window.location.href);
  const basePath = u.pathname.replace(/\/js\/status-sim\.js$/, "");
  return `${u.origin}${basePath}`;
}
const ASSET_BASE = getAssetBaseUrl();

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

/**
 * 超ミニTOMLパーサ（今回の用途限定）
 *  title = "..."
 *  slot = "weapon"
 *  [base_add]
 *  atk = 50
 */
function parseMiniToml(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "+++" && !l.startsWith("#"));

  const item = { base_add: {} };
  let section = "";

  for (const line of lines) {
    const sec = line.match(/^\[(.+?)\]$/);
    if (sec) {
      section = sec[1];
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (!kv) continue;

    const key = kv[1];
    let raw = kv[2].trim();

    if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);

    const num = Number(raw);
    const value =
      Number.isFinite(num) && raw !== "" && !raw.includes('"') ? num : raw;

    if (section === "base_add") {
      item.base_add[key] = Number.isFinite(Number(value)) ? Number(value) : value;
    } else {
      item[key] = value;
    }
  }

  item.id = item.id || item.title || "unknown";
  return item;
}

async function loadWeaponIndex() {
  const url = `${ASSET_BASE}/db/equip/weapon/index.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`index.json を読み込めません: ${url}`);
  return await res.json();
}

async function loadWeaponToml(filename) {
  const url = `${ASSET_BASE}/db/equip/weapon/${filename}`;
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
  for (const k of STATS) {
    const el = $(`base_${k}`);
    out[k] = n(el?.value, 0);
  }
  return out;
}

function resetBaseStatsUI() {
  for (const k of STATS) {
    const el = $(`base_${k}`);
    if (el) el.value = "0";
  }
}

async function main() {
  const weaponSelect = $("weaponSelect");
  const baseBox = $("baseBox");
  const equipBox = $("equipBox");
  const totalBox = $("totalBox");
  const recalcBtn = $("recalcBtn");
  const resetBtn = $("resetBtn");

  if (!weaponSelect || !baseBox || !equipBox || !totalBox) return;

  const files = await loadWeaponIndex();
  const weaponItems = [];
  for (const f of files) weaponItems.push(await loadWeaponToml(f));
  fillSelect(weaponSelect, weaponItems);

  const recalc = () => {
    const base = readBaseStatsFromUI();
    const w = findById(weaponItems, weaponSelect.value);
    const equip = addStats(makeZeroStats(), w?.base_add ?? {});
    const total = addStats(base, equip);

    baseBox.textContent = renderStats(base);
    equipBox.textContent = renderStats(equip);
    totalBox.textContent = renderStats(total);
  };

  // 入力変化で自動再計算
  for (const k of STATS) {
    const el = $(`base_${k}`);
    el?.addEventListener("input", recalc);
  }
  weaponSelect.addEventListener("change", recalc);
  recalcBtn?.addEventListener("click", recalc);

  resetBtn?.addEventListener("click", () => {
    resetBaseStatsUI();
    recalc();
  });

  recalc();
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => {
    const totalBox = $("totalBox");
    if (totalBox) totalBox.textContent = String(e?.message ?? e);
    console.error(e);
  });
});
