// static/js/status-sim.js
// GitHub Pages対応 + 装備Lvスケール + 防具5部位シリーズ一致でセット効果（x1.1）

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const BASE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const PROTEIN_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const SCALE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];

const ARMOR_KEYS = ["head", "body", "hands", "feet", "shield"]; // セット判定対象（防具5部位）

const $ = (id) => document.getElementById(id);

// --- 配信パス対応（GitHub PagesでもOK） ---
function getAssetBaseUrl() {
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.src) return window.location.origin;
  const u = new URL(scriptEl.src, window.location.href);
  const basePath = u.pathname.replace(/\/js\/status-sim\.js$/, "");
  return `${u.origin}${basePath}`;
}
const ASSET_BASE = getAssetBaseUrl();
const abs = (p) => `${ASSET_BASE}${p}`;

// --- 装備DB ---
const SLOTS = [
  { key: "weapon", label: "weapon", indexUrl: "/db/equip/weapon/index.json", itemDir: "/db/equip/weapon/" },
  { key: "head", label: "head", indexUrl: "/db/equip/armor/head/index.json", itemDir: "/db/equip/armor/head/" },
  { key: "body", label: "body", indexUrl: "/db/equip/armor/body/index.json", itemDir: "/db/equip/armor/body/" },
  { key: "hands", label: "hands", indexUrl: "/db/equip/armor/hands/index.json", itemDir: "/db/equip/armor/hands/" },
  { key: "feet", label: "feet", indexUrl: "/db/equip/armor/feet/index.json", itemDir: "/db/equip/armor/feet/" },
  { key: "shield", label: "shield", indexUrl: "/db/equip/armor/shield/index.json", itemDir: "/db/equip/armor/shield/" },
];

// --- localStorage ---
const STORAGE_KEY = "status_sim_state_v9_set_bonus_armor5";
const saveState = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
const loadState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
};
const clearState = () => localStorage.removeItem(STORAGE_KEY);

// --- util ---
const n = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clamp0 = (v) => Math.max(0, n(v, 0));

function makeZeroStats() {
  return Object.fromEntries(STATS.map((k) => [k, 0]));
}
function addStats(a, b) {
  const out = { ...a };
  for (const k of STATS) out[k] = (out[k] ?? 0) + (b?.[k] ?? 0);
  return out;
}
function mulStatsFloor(stats, mul) {
  const out = makeZeroStats();
  for (const k of STATS) out[k] = Math.floor((stats?.[k] ?? 0) * mul);
  return out;
}

function setErr(text) {
  const el = $("errBox");
  if (!el) return;
  const msg = (text || "").trim();
  el.textContent = msg;
  el.classList.toggle("is-visible", msg.length > 0);
}

// --- fetch（404を安全に扱う） ---
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`404: ${url}`);
  return await res.json();
}
async function fetchText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`404: ${url}`);
  return await res.text();
}

// --- TOML（簡易） ---
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

    const value = Number.isFinite(Number(raw)) ? Number(raw) : raw;

    if (section === "base_add") item.base_add[key] = Number.isFinite(Number(value)) ? Number(value) : 0;
    else item[key] = value;
  }

  item.id = item.id || item.title || "unknown";
  return item;
}

// --- 装備Lvスケール（mov除外） ---
function scaleEquipBaseAdd(baseAdd, level) {
  const out = makeZeroStats();
  const lv = clamp0(level);
  const mul = 1 + lv * 0.1;

  for (const k of SCALE_STATS) {
    out[k] = Math.floor((baseAdd?.[k] ?? 0) * mul);
  }
  // movはスケール対象外：そのまま
  out.mov = baseAdd?.mov ?? 0;
  return out;
}

// --- セット判定（防具5部位が同シリーズ） ---
function getArmorSetSeries(slotItems, equipState) {
  // 5部位すべて装備していて、シリーズが全て一致している時だけ series を返す
  let series = null;

  for (const key of ARMOR_KEYS) {
    const id = equipState?.[key]?.id || "";
    if (!id) return null;

    const item = (slotItems[key] || []).find((it) => it.id === id);
    if (!item) return null;

    const s = String(item.series ?? "").trim();
    if (!s) return null; // series未設定は発動不可にする（安全）
    if (series === null) series = s;
    if (series !== s) return null;
  }
  return series; // 発動中のシリーズ名
}

// --- UI ---
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

// --- 振り分け ---
function readBasePointTotal() {
  return clamp0($("basePointTotal")?.value);
}
function applyBasePointTotal(v) {
  const el = $("basePointTotal");
  if (el) el.value = String(clamp0(v ?? 0));
}
function readBasePointsFromUI() {
  const out = makeZeroStats();
  for (const k of BASE_STATS) out[k] = clamp0($(`base_${k}`)?.value);
  out.mov = 0;
  return out;
}
function applyBasePointsToUI(stats) {
  for (const k of BASE_STATS) {
    const el = $(`base_${k}`);
    if (el) el.value = String(clamp0(stats?.[k] ?? 0));
  }
}
function resetBasePointsUI() {
  for (const k of BASE_STATS) {
    const el = $(`base_${k}`);
    if (el) el.value = "0";
  }
}
function renderPointInfo(total, points, setSeries) {
  const used = BASE_STATS.reduce((s, k) => s + (points?.[k] ?? 0), 0);
  const remain = total - used;
  const info = $("basePointInfo");
  if (info) {
    info.textContent = setSeries
      ? `使用 ${used} / 残り ${remain}（セット効果:ON）`
      : `使用 ${used} / 残り ${remain}`;
  }
  return { used, remain };
}

// --- プロテイン + シェイカー ---
function readShaker() { return clamp0($("shakerCount")?.value); }
function applyShaker(v) { const el = $("shakerCount"); if (el) el.value = String(clamp0(v ?? 0)); }
function shakerMul(shakerCount) { return 1 + 0.01 * clamp0(shakerCount); }

function readProteinRaw() {
  const out = makeZeroStats();
  for (const k of PROTEIN_STATS) out[k] = clamp0($(`protein_${k}`)?.value);
  return out;
}
function applyProteinRaw(stats) {
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
function applyShakerToProtein(raw, shakerCount) {
  const out = makeZeroStats();
  const mul = shakerMul(shakerCount);
  for (const k of PROTEIN_STATS) out[k] = Math.floor((raw?.[k] ?? 0) * mul);
  return out;
}

// --- main ---
async function main() {
  setErr("");

  if (!buildTableRows()) {
    setErr("statsTbody が見つかりません");
    return;
  }

  const saved = loadState();

  const slotItems = {};
  const loadErrors = [];

  for (const s of SLOTS) {
    slotItems[s.key] = [];

    const sel = $(`select_${s.key}`);
    const lv = $(`level_${s.key}`);

    if (!sel || !lv) {
      loadErrors.push(`${s.key}: select/level not found`);
      continue;
    }

    try {
      const files = await fetchJSON(abs(s.indexUrl));
      const items = [];
      for (const f of files) {
        const toml = await fetchText(abs(`${s.itemDir}${f}`));
        items.push(parseMiniToml(toml));
      }
      slotItems[s.key] = items;

      fillSelect(sel, items);
      sel.value = saved?.equip?.[s.key]?.id ?? "";
      lv.value = String(clamp0(saved?.equip?.[s.key]?.lv ?? 1));
    } catch (e) {
      fillSelect(sel, []);
      sel.value = "";
      lv.value = "0";
      loadErrors.push(`${s.key}: ${String(e?.message ?? e)}`);
    }

    sel.addEventListener("change", recalc);
    lv.addEventListener("input", recalc);
  }

  applyBasePointTotal(saved?.basePointTotal);
  applyBasePointsToUI(saved?.basePoints);
  applyShaker(saved?.shakerCount);
  applyProteinRaw(saved?.proteinRaw);

  $("basePointTotal")?.addEventListener("input", recalc);
  for (const k of BASE_STATS) $(`base_${k}`)?.addEventListener("input", recalc);
  $("shakerCount")?.addEventListener("input", recalc);
  for (const k of PROTEIN_STATS) $(`protein_${k}`)?.addEventListener("input", recalc);

  $("recalcBtn")?.addEventListener("click", recalc);
  $("resetBtn")?.addEventListener("click", () => { resetBasePointsUI(); recalc(); });

  $("clearSaveBtn")?.addEventListener("click", () => {
    clearState();
    applyBasePointTotal(0);
    resetBasePointsUI();
    resetProteinUI();
    applyShaker(0);
    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      const lv = $(`level_${s.key}`);
      if (sel) sel.value = "";
      if (lv) lv.value = "0";
    }
    recalc();
  });

  function recalc() {
    const errs = [];
    if (loadErrors.length) errs.push(...loadErrors);

    const basePointTotal = readBasePointTotal();
    const basePointsRaw = readBasePointsFromUI();

    const shakerCount = readShaker();
    const proteinRaw = readProteinRaw();
    const proteinAppliedRaw = applyShakerToProtein(proteinRaw, shakerCount);

    // まず装備（Lvスケール込み）を合算し、equipStateも組み立てる
    let equipSumRaw = makeZeroStats();
    const equipState = {};

    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      const lv = $(`level_${s.key}`);
      const id = sel?.value || "";
      const level = clamp0(lv?.value);

      equipState[s.key] = { id, lv: level };

      if (!id) continue;
      const chosen = (slotItems[s.key] || []).find((it) => it.id === id);
      if (!chosen) continue;

      const scaled = scaleEquipBaseAdd(chosen.base_add ?? {}, level);
      equipSumRaw = addStats(equipSumRaw, scaled);
    }

    // セット判定（防具5部位 series一致）
    const setSeries = getArmorSetSeries(slotItems, equipState);
    const setMul = setSeries ? 1.1 : 1.0;

    // used/remain 表示（セットON表示もここで）
    const { remain } = renderPointInfo(basePointTotal, basePointsRaw, setSeries);
    if (remain < 0) errs.push(`ポイント超過：残り ${remain}`);

    // セット効果：ステ振り/プロテイン/装備それぞれに x1.1
    const basePoints = setMul === 1.0 ? basePointsRaw : mulStatsFloor(basePointsRaw, setMul);
    const proteinApplied = setMul === 1.0 ? proteinAppliedRaw : mulStatsFloor(proteinAppliedRaw, setMul);
    const equipSum = setMul === 1.0 ? equipSumRaw : mulStatsFloor(equipSumRaw, setMul);

    const basePlusProtein = addStats(basePoints, proteinApplied);
    const total = addStats(basePlusProtein, equipSum);

    setErr(errs.join("\n"));
    renderTable(basePlusProtein, equipSum, total);

    saveState({
      basePointTotal,
      basePoints: basePointsRaw, // 入力そのものは生値で保存
      shakerCount,
      proteinRaw,
      equip: equipState,
    });
  }

  recalc();
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => {
    console.error(e);
    setErr(String(e?.message ?? e));
  });
});
