// static/js/status-sim.js
// 武器/防具：+0が未強化（×1.0）、+1から補正（×1.1…）
//   スケール：基礎×(1+強化数×0.1)（mov除外）
// セット効果：防具5部位が同seriesなら、ステ振り/プロテイン/武器防具に×1.1（切り捨て）
//
// アクセサリー：Lv1が基礎（補正なし）
//   内部強化数 = (表示Lv - 1)
//   実数：基礎×(1+内部×0.1) を「(ステ振り+プロテイン+武器防具)の後」に加算
//   割合：基礎×(1+内部×0.01) を、その後に乗算（1 + %/100）
//   アクセはセット効果対象外

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const BASE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const PROTEIN_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const SCALE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const ARMOR_KEYS = ["head", "body", "hands", "feet", "shield"];

const $ = (id) => document.getElementById(id);

/* ---------- util ---------- */
const n = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clamp0 = (v) => Math.max(0, n(v, 0));
const clamp1 = (v) => Math.max(1, n(v, 1));

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

/* ---------- GitHub Pages 対応 ---------- */
function getAssetBaseUrl() {
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.src) return window.location.origin;
  const u = new URL(scriptEl.src, window.location.href);
  const basePath = u.pathname.replace(/\/js\/status-sim\.js$/, "");
  return `${u.origin}${basePath}`;
}
const ASSET_BASE = getAssetBaseUrl();
const abs = (p) => `${ASSET_BASE}${p}`;

/* ---------- 装備DB ---------- */
const SLOTS = [
  // weapon/armor
  { key: "weapon", indexUrl: "/db/equip/weapon/index.json", itemDir: "/db/equip/weapon/" },
  { key: "head", indexUrl: "/db/equip/armor/head/index.json", itemDir: "/db/equip/armor/head/" },
  { key: "body", indexUrl: "/db/equip/armor/body/index.json", itemDir: "/db/equip/armor/body/" },
  { key: "hands", indexUrl: "/db/equip/armor/hands/index.json", itemDir: "/db/equip/armor/hands/" },
  { key: "feet", indexUrl: "/db/equip/armor/feet/index.json", itemDir: "/db/equip/armor/feet/" },
  { key: "shield", indexUrl: "/db/equip/armor/shield/index.json", itemDir: "/db/equip/armor/shield/" },

  // accessory
  { key: "accessory", indexUrl: "/db/equip/accessory/index.json", itemDir: "/db/equip/accessory/" },
];

/* ---------- 保存 ---------- */
const STORAGE_KEY = "status_sim_state_v13_accessory_lv1_base";
const saveState = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
const loadState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
};
const clearState = () => localStorage.removeItem(STORAGE_KEY);

/* ---------- error ---------- */
function setErr(text) {
  const el = $("errBox");
  if (!el) return;
  const msg = (text || "").trim();
  el.textContent = msg;
  el.classList.toggle("is-visible", msg.length > 0);
}

/* ---------- fetch ---------- */
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

/* ---------- TOML簡易（base_add と base_rate を扱う） ---------- */
function parseMiniToml(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "+++" && !l.startsWith("#"));

  const item = { base_add: {}, base_rate: {} };
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
    else if (section === "base_rate") item.base_rate[key] = Number.isFinite(Number(value)) ? Number(value) : 0;
    else item[key] = value;
  }

  item.id = item.id || item.title || "unknown";
  return item;
}

/* ---------- 武器防具Lvスケール（+0対応、mov除外） ---------- */
function scaleEquipBaseAdd(baseAdd, enhance) {
  const lv = clamp0(enhance);
  const mul = 1 + lv * 0.1;

  const out = makeZeroStats();
  for (const k of SCALE_STATS) out[k] = Math.floor((baseAdd?.[k] ?? 0) * mul);
  out.mov = baseAdd?.mov ?? 0;
  return out;
}

/* ---------- アクセ：実数（Lv1基礎） ---------- */
function scaleAccFlatLv1Base(baseAdd, displayLv) {
  const internal = clamp1(displayLv) - 1;     // ★Lv1→0
  const mul = 1 + internal * 0.1;

  const out = makeZeroStats();
  for (const k of STATS) out[k] = Math.floor((baseAdd?.[k] ?? 0) * mul);
  return out;
}

/* ---------- アクセ：割合%（Lv1基礎） ---------- */
function scaleAccRatePercentLv1Base(baseRate, displayLv) {
  const internal = clamp1(displayLv) - 1;     // ★Lv1→0
  const mul = 1 + internal * 0.01;

  const out = makeZeroStats();
  for (const k of STATS) out[k] = (baseRate?.[k] ?? 0) * mul; // %は小数になり得る
  return out;
}

function applyRateToStatsFloor(stats, ratePercentByStat) {
  const out = makeZeroStats();
  for (const k of STATS) {
    const p = ratePercentByStat?.[k] ?? 0;   // 例 5.5 (%)
    const mul = 1 + p / 100;
    out[k] = Math.floor((stats?.[k] ?? 0) * mul);
  }
  return out;
}

/* ---------- セット判定（防具5部位同series） ---------- */
function getArmorSetSeries(slotItems, equipState) {
  let series = null;

  for (const key of ARMOR_KEYS) {
    const id = equipState?.[key]?.id || "";
    if (!id) return null;

    const item = (slotItems[key] || []).find((it) => it.id === id);
    if (!item) return null;

    const s = String(item.series ?? "").trim();
    if (!s) return null;

    if (series === null) series = s;
    if (series !== s) return null;
  }
  return series;
}

/* ---------- UI ---------- */
function fillSelect(selectEl, items) {
  selectEl.innerHTML = "";
  selectEl.append(new Option("（なし）", ""));
  for (const it of items) selectEl.append(new Option(it.title ?? it.id, it.id));
}

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

function renderTable(basePlusProtein, equipDisplay, total) {
  const tbody = $("statsTbody");
  if (!tbody) return;

  for (const tr of tbody.querySelectorAll("tr")) {
    const k = tr.dataset.stat;

    const b = basePlusProtein?.[k] ?? 0;
    const e = equipDisplay?.[k] ?? 0;
    const t = total?.[k] ?? 0;

    tr.querySelector('[data-col="base"]').textContent = String(b);
    tr.querySelector('[data-col="equip"]').textContent = String(e);
    tr.querySelector('[data-col="total"]').textContent = String(t);

    tr.classList.toggle("active", b !== 0 || e !== 0);
  }
}

/* ---------- 振り分け ---------- */
function readBasePointTotal() { return clamp0($("basePointTotal")?.value); }
function applyBasePointTotal(v) { const el = $("basePointTotal"); if (el) el.value = String(clamp0(v ?? 0)); }

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
function renderPointInfo(total, points, setOn) {
  const used = BASE_STATS.reduce((s, k) => s + (points?.[k] ?? 0), 0);
  const remain = total - used;
  const info = $("basePointInfo");
  if (info) info.textContent = setOn ? `使用 ${used} / 残り ${remain}（セットON）` : `使用 ${used} / 残り ${remain}`;
  return { used, remain };
}

/* ---------- プロテイン ---------- */
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

/* ---------- main ---------- */
async function main() {
  setErr("");
  buildTableRows();

  const saved = loadState();

  const slotItems = {};
  const loadErrors = [];

  for (const s of SLOTS) {
    slotItems[s.key] = [];

    const sel = $(`select_${s.key}`);
    const lv = $(`level_${s.key}`);

    // 画面に存在しない場合はスキップ（保険）
    if (!sel || !lv) continue;

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

      // ★初期Lv：武器防具は0、アクセは1
      if (s.key === "accessory") {
        lv.value = String(clamp1(saved?.equip?.[s.key]?.lv ?? 1));
      } else {
        lv.value = String(clamp0(saved?.equip?.[s.key]?.lv ?? 0));
      }
    } catch (e) {
      fillSelect(sel, []);
      sel.value = "";
      lv.value = (s.key === "accessory") ? "1" : "0";
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
      if (lv) lv.value = (s.key === "accessory") ? "1" : "0";
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

    // --- 武器防具（Lvスケール込み）合算 ---
    let equipSumRaw = makeZeroStats();
    const equipState = {};

    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      const lv = $(`level_${s.key}`);
      if (!sel || !lv) continue;

      const id = sel.value || "";

      // ★アクセだけLv1以上、他は0以上
      let level;
      if (s.key === "accessory") {
        level = clamp1(lv.value);
        if (Number(lv.value) < 1) lv.value = "1";
      } else {
        level = clamp0(lv.value);
        if (Number(lv.value) < 0) lv.value = "0";
      }

      equipState[s.key] = { id, lv: level };

      // accessory はここでは扱わない（順序のため）
      if (s.key === "accessory") continue;

      if (!id) continue;
      const chosen = (slotItems[s.key] || []).find((it) => it.id === id);
      if (!chosen) continue;

      equipSumRaw = addStats(equipSumRaw, scaleEquipBaseAdd(chosen.base_add ?? {}, level));
    }

    // --- セット判定（防具5部位）→ セット効果は「ステ振り/プロテイン/武器防具」のみ ---
    const setSeries = getArmorSetSeries(slotItems, equipState);
    const setMul = setSeries ? 1.1 : 1.0;

    const { remain } = renderPointInfo(basePointTotal, basePointsRaw, !!setSeries);
    if (remain < 0) errs.push(`ポイント超過：残り ${remain}`);

    const basePoints = setMul === 1.0 ? basePointsRaw : mulStatsFloor(basePointsRaw, setMul);
    const proteinApplied = setMul === 1.0 ? proteinAppliedRaw : mulStatsFloor(proteinAppliedRaw, setMul);
    const equipSum = setMul === 1.0 ? equipSumRaw : mulStatsFloor(equipSumRaw, setMul);

    // ① ステ振り + プロテイン + 武器防具（ここまで）
    const basePlusProtein = addStats(basePoints, proteinApplied);
    const sumBeforeAcc = addStats(basePlusProtein, equipSum);

    // --- アクセ（実数→加算、割合→乗算） ---
    let accFlat = makeZeroStats();
    let accRatePercent = makeZeroStats();

    const accId = equipState.accessory?.id || "";
    const accLvDisplay = equipState.accessory?.lv ?? 1; // 表示Lv
    if (accId) {
      const accItem = (slotItems.accessory || []).find((it) => it.id === accId);
      if (accItem) {
        accFlat = scaleAccFlatLv1Base(accItem.base_add ?? {}, accLvDisplay);
        accRatePercent = scaleAccRatePercentLv1Base(accItem.base_rate ?? {}, accLvDisplay);
      }
    }

    // ② 実数を加算
    const sumAfterFlat = addStats(sumBeforeAcc, accFlat);

    // ③ 割合を乗算（最後）
    const total = applyRateToStatsFloor(sumAfterFlat, accRatePercent);

    // 表示用：「装備」列には武器防具＋アクセ実数を含める（割合は合計に反映）
    const equipDisplay = addStats(equipSum, accFlat);

    setErr(errs.join("\n"));
    renderTable(basePlusProtein, equipDisplay, total);

    saveState({
      basePointTotal,
      basePoints: basePointsRaw,
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
