// static/js/status-sim.js
// 機能：武器＋防具5種の選択、基礎ステ入力、合計表示
// 追加：localStorage 保存/復元 + 表形式表示（基礎/装備/合計）

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

// ====== 配信パス対応（GitHub Pagesなど） ======
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
const STORAGE_KEY = "status_sim_state_v2_table";

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function clearState() {
  localStorage.removeItem(STORAGE_KEY);
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

// ====== UI（入力/選択） ======
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
function resetBaseStatsUI() {
  for (const k of STATS) {
    const el = $(`base_${k}`);
    if (el) el.value = "0";
  }
}

// ====== UI（表） ======
function buildTableRows() {
  const tbody = $("statsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  for (const k of STATS) {
    const tr = document.createElement("tr");
    tr.dataset.stat = k;

    const tdName = document.createElement("td");
    tdName.textContent = k;

    const tdBase = document.createElement("td");
    tdBase.className = "num";
    tdBase.dataset.col = "base";

    const tdEquip = document.createElement("td");
    tdEquip.className = "num";
    tdEquip.dataset.col = "equip";

    const tdTotal = document.createElement("td");
    tdTotal.className = "num";
    tdTotal.dataset.col = "total";

    tr.append(tdName, tdBase, tdEquip, tdTotal);
    tbody.appendChild(tr);
  }
}

function renderTable(base, equip, total) {
  const tbody = $("statsTbody");
  if (!tbody) return;

  for (const tr of tbody.querySelectorAll("tr")) {
    const k = tr.dataset.stat;
    const b = base?.[k] ?? 0;
    const e = equip?.[k] ?? 0;
    const t = total?.[k] ?? 0;

    tr.querySelector('[data-col="base"]').textContent = String(b);
    tr.querySelector('[data-col="equip"]').textContent = String(e);
    tr.querySelector('[data-col="total"]').textContent = String(t);

    // 変化がある行をハイライト（装備が付いてる or 基礎が0じゃない）
    tr.classList.toggle("active", b !== 0 || e !== 0);
  }
}

// ====== main ======
async function main() {
  buildTableRows();

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

  for (const k of STATS) $(`base_${k}`)?.addEventListener("input", recalc);

  $("recalcBtn")?.addEventListener("click", recalc);
  $("resetBtn")?.addEventListener("click", () => { resetBaseStatsUI(); recalc(); });

  $("clearSaveBtn")?.addEventListener("click", () => {
    clearState();
    resetBaseStatsUI();
    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      if (sel) sel.value = "";
    }
    recalc();
  });

  function recalc() {
    const base = readBaseStatsFromUI();

    let equipSum = makeZeroStats();
    const equipState = {};

    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      const chosen = slotItems[s.key].find((it) => it.id === sel?.value);
      equipState[s.key] = sel?.value || "";
      equipSum = addStats(equipSum, chosen?.base_add ?? {});
    }

    const total = addStats(base, equipSum);

    renderTable(base, equipSum, total);
    saveState({ base, equip: equipState });
  }

  recalc();
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => {
    console.error(e);
    const tbody = $("statsTbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="4">${String(e?.message ?? e)}</td></tr>`;
  });
});
