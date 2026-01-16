const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const PROTEIN_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const $ = (id) => document.getElementById(id);

const SLOTS = [
  { key: "weapon", label: "武器", indexUrl: "/db/equip/weapon/index.json", itemDir: "/db/equip/weapon/" },
  { key: "head",   label: "頭",   indexUrl: "/db/equip/armor/head/index.json",   itemDir: "/db/equip/armor/head/" },
  { key: "body",   label: "体",   indexUrl: "/db/equip/armor/body/index.json",   itemDir: "/db/equip/armor/body/" },
  { key: "hands",  label: "腕",   indexUrl: "/db/equip/armor/hands/index.json",  itemDir: "/db/equip/armor/hands/" },
  { key: "feet",   label: "足",   indexUrl: "/db/equip/armor/feet/index.json",   itemDir: "/db/equip/armor/feet/" },
  { key: "shield", label: "盾",   indexUrl: "/db/equip/armor/shield/index.json", itemDir: "/db/equip/armor/shield/" },
];

function getAssetBaseUrl() {
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.src) return window.location.origin;
  const u = new URL(scriptEl.src, window.location.href);
  const basePath = u.pathname.replace(/\/js\/status-sim\.js$/, "");
  return `${u.origin}${basePath}`;
}
const ASSET_BASE = getAssetBaseUrl();
const abs = (p) => `${ASSET_BASE}${p}`;

const STORAGE_KEY = "status_sim_state_v5_table_protein_shaker";
const saveState = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
const loadState = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } };
const clearState = () => localStorage.removeItem(STORAGE_KEY);

const n = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clamp0 = (v) => Math.max(0, n(v, 0));

function makeZeroStats() { return Object.fromEntries(STATS.map((k) => [k, 0])); }
function addStats(a, b) {
  const out = { ...a };
  for (const k of STATS) out[k] = (out[k] ?? 0) + (b?.[k] ?? 0);
  return out;
}

function setErr(text) {
  const el = $("errBox");
  if (el) el.textContent = text || "";
}

function readShakerFromUI() {
  const el = $("shakerCount");
  return clamp0(el?.value);
}
function applyShakerToUI(v) {
  const el = $("shakerCount");
  if (el) el.value = String(clamp0(v ?? 0));
}
function shakerMultiplier(shakerCount) {
  return 1 + 0.01 * clamp0(shakerCount);
}

function readProteinRawFromUI() {
  const out = makeZeroStats();
  for (const k of PROTEIN_STATS) out[k] = clamp0($(`protein_${k}`)?.value);
  return out;
}
function applyProteinToUI(stats) {
  for (const k of PROTEIN_STATS) {
    const el = $(`protein_${k}`);
    if (el) el.value = String(clamp0(stats?.[k] ?? 0));
  }
}
function resetProteinUI() {
  for (const k of PROTEIN_STATS) {
    const el = $(`protein_${k}`);
    if (el) el.value = "0";
  }
}
function applyShakerToProtein(rawProtein, shakerCount) {
  const out = makeZeroStats();
  const mul = shakerMultiplier(shakerCount);
  for (const k of PROTEIN_STATS) out[k] = Math.floor((rawProtein?.[k] ?? 0) * mul);
  return out;
}

function proteinInfoText(rawProtein, shakerCount, appliedProtein) {
  const mul = shakerMultiplier(shakerCount);
  const head = `シェイカー: ${shakerCount}  倍率: x${mul.toFixed(2)}（+${(mul - 1).toFixed(2)}）`;
  const lines = [];
  for (const k of PROTEIN_STATS) {
    const raw = rawProtein?.[k] ?? 0;
    const ap = appliedProtein?.[k] ?? 0;
    if (raw !== 0 || ap !== 0) lines.push(`${k}: ${raw} → ${ap}`);
  }
  return lines.length ? `${head}\n${lines.join("\n")}\n※movは対象外` : `${head}\nプロテイン補正：なし\n※movは対象外`;
}

function parseMiniToml(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && l !== "+++" && !l.startsWith("#"));
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
  const url = abs(path);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`404: ${url}`);
  return await res.json();
}
async function loadToml(dir, file) {
  const url = abs(`${dir}${file}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`404: ${url}`);
  return parseMiniToml(await res.text());
}

function fillSelect(selectEl, items) {
  selectEl.innerHTML = "";
  selectEl.append(new Option("（なし）", ""));
  for (const it of items) selectEl.append(new Option(it.title ?? it.id, it.id));
}

function buildTableRows() {
  const tbody = $("statsTbody");
  if (!tbody) return false;
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
  return true;
}

function renderTable(basePlusProtein, equip, total) {
  const tbody = $("statsTbody");
  if (!tbody) return;
  for (const tr of tbody.querySelectorAll("tr")) {
    const k = tr.dataset.stat;
    const b = basePlusProtein?.[k] ?? 0;
    const e = equip?.[k] ?? 0;
    const t = total?.[k] ?? 0;

    tr.querySelector('[data-col="base"]').textContent = String(b);
    tr.querySelector('[data-col="equip"]').textContent = String(e);
    tr.querySelector('[data-col="total"]').textContent = String(t);

    tr.classList.toggle("active", b !== 0 || e !== 0);
  }
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

document.addEventListener("DOMContentLoaded", async () => {
  setErr("");

  if (!buildTableRows()) {
    setErr("statsTbody が見つかりません。status.md を置き換えたか確認してください。");
    return;
  }

  // ★ここが今回の核心：shakerCount 要素が無いと絶対に倍率が 1 のまま
  if (!$("shakerCount")) {
    setErr("shakerCount（シェイカー入力欄）が見つかりません。status.md の置き換え漏れの可能性があります。");
  }

  const saved = loadState();
  const proteinInfo = $("proteinInfo");

  const slotItems = {};
  const loadErrors = [];

  for (const s of SLOTS) {
    const sel = $(`select_${s.key}`);
    slotItems[s.key] = [];
    if (!sel) { loadErrors.push(`select_${s.key} が見つかりません`); continue; }

    try {
      const files = await loadIndex(s.indexUrl);
      const items = [];
      for (const f of files) items.push(await loadToml(s.itemDir, f));
      slotItems[s.key] = items;
      fillSelect(sel, items);
      if (saved?.equip?.[s.key]) sel.value = saved.equip[s.key];
    } catch (e) {
      fillSelect(sel, []);
      loadErrors.push(`${s.label} DB 読込失敗: ${String(e?.message ?? e)}`);
    }

    sel.addEventListener("change", recalc);
  }

  applyBaseStatsToUI(saved?.base);
  applyShakerToUI(saved?.shakerCount);
  applyProteinToUI(saved?.proteinRaw);

  for (const k of STATS) $(`base_${k}`)?.addEventListener("input", recalc);
  for (const k of PROTEIN_STATS) $(`protein_${k}`)?.addEventListener("input", recalc);
  $("shakerCount")?.addEventListener("input", recalc);

  $("recalcBtn")?.addEventListener("click", recalc);
  $("resetBtn")?.addEventListener("click", () => { resetBaseStatsUI(); recalc(); });
  $("clearSaveBtn")?.addEventListener("click", () => {
    clearState();
    resetBaseStatsUI();
    resetProteinUI();
    applyShakerToUI(0);
    for (const s of SLOTS) { const sel = $(`select_${s.key}`); if (sel) sel.value = ""; }
    recalc();
  });

  function recalc() {
    const baseRaw = readBaseStatsFromUI();
    const shakerCount = readShakerFromUI();

    const proteinRaw = readProteinRawFromUI();
    const proteinApplied = applyShakerToProtein(proteinRaw, shakerCount);

    const basePlusProtein = addStats(baseRaw, proteinApplied);

    let equipSum = makeZeroStats();
    const equipState = {};
    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      const id = sel?.value || "";
      equipState[s.key] = id;
      const chosen = (slotItems[s.key] || []).find((it) => it.id === id);
      equipSum = addStats(equipSum, chosen?.base_add ?? {});
    }

    const total = addStats(basePlusProtein, equipSum);

    if (proteinInfo) proteinInfo.textContent = proteinInfoText(proteinRaw, shakerCount, proteinApplied);
    setErr((loadErrors.length ? loadErrors.join("\n") : "") + ( $("shakerCount") ? "" : "\nshakerCount が見つかりません（status.md未更新の可能性）" ));

    renderTable(basePlusProtein, equipSum, total);
    saveState({ base: baseRaw, shakerCount, proteinRaw, equip: equipState });
  }

  recalc();
});
