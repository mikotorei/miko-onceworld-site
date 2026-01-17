// static/js/status-sim.js
// 検証版：切り捨て（Math.floor）を一切しない
// - mov 基礎値 = 6（ステ振り不可・プロテイン対象外）
// - セット判定/装備/アクセ/ペットの順序は従来どおり
// - ただし「丸め」は一切しない（表示も小数になる）

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const BASE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const PROTEIN_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const SCALE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const ARMOR_KEYS = ["head", "body", "hands", "feet", "shield"];
const ACCESSORY_KEYS = ["accessory1", "accessory2", "accessory3"];
const PET_KEYS = ["pet1", "pet2", "pet3"];

const $ = (id) => document.getElementById(id);
const BASE_MOV = 6;

/* ---------- util ---------- */
const n = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clamp0 = (v) => Math.max(0, n(v, 0));
const clamp1 = (v) => Math.max(1, n(v, 1));
const clampStage = (v) => Math.max(0, Math.min(4, n(v, 0)));

function makeZeroStats() {
  return Object.fromEntries(STATS.map((k) => [k, 0]));
}
function addStats(a, b) {
  const out = { ...a };
  for (const k of STATS) out[k] = (out[k] ?? 0) + (b?.[k] ?? 0);
  return out;
}
function mulStats(stats, mul) {
  const out = makeZeroStats();
  for (const k of STATS) out[k] = (stats?.[k] ?? 0) * mul;
  return out;
}
function applyRateToStats(stats, ratePercentByStat) {
  const out = makeZeroStats();
  for (const k of STATS) {
    const p = ratePercentByStat?.[k] ?? 0;
    out[k] = (stats?.[k] ?? 0) * (1 + p / 100);
  }
  return out;
}
// ★切り捨て無し：通常割合→最終割合を連続乗算（丸めなし）
function applyCombinedRates(stats, normalRatePercentByStat, finalRatePercentByStat) {
  const out = makeZeroStats();
  for (const k of STATS) {
    const x = stats?.[k] ?? 0;
    const p1 = normalRatePercentByStat?.[k] ?? 0;
    const p2 = finalRatePercentByStat?.[k] ?? 0;
    out[k] = x * (1 + p1 / 100) * (1 + p2 / 100);
  }
  return out;
}

function fmt(v) {
  const x = Number(v ?? 0);
  if (!Number.isFinite(x)) return "0";
  // 表示だけ：小数第4位まで（末尾の0と.を削除）
  const s = x.toFixed(4).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}

/* ---------- error ---------- */
function setErr(text) {
  const el = $("errBox");
  if (!el) return;
  const msg = (text || "").trim();
  el.textContent = msg;
  el.classList.toggle("is-visible", msg.length > 0);
}
function flashInfo(msg, ms = 700) {
  setErr(msg);
  window.setTimeout(() => setErr(""), ms);
}

/* ---------- GitHub Pages 対応（安定版） ---------- */
function getAssetBaseUrl() {
  const s = document.currentScript;
  if (!s?.src) return location.origin;
  const u = new URL(s.src, location.href);
  const basePath = u.pathname.replace(/\/js\/status-sim\.js$/, "");
  return `${u.origin}${basePath}`;
}
const ASSET_BASE = getAssetBaseUrl();
const abs = (p) => `${ASSET_BASE}${p}`;

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

/* ---------- TOML簡易（base_add / base_rate） ---------- */
function parseMiniToml(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "+++" && !l.startsWith("#"));

  const item = { base_add: {}, base_rate: {} };
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

    const value = Number.isFinite(Number(raw)) ? Number(raw) : raw;

    if (section === "base_add") item.base_add[key] = Number.isFinite(Number(value)) ? Number(value) : 0;
    else if (section === "base_rate") item.base_rate[key] = Number.isFinite(Number(value)) ? Number(value) : 0;
    else item[key] = value;
  }

  item.id = item.id || item.title || "unknown";
  return item;
}

/* ---------- スケール（切り捨て無し） ---------- */
function scaleEquipBaseAdd(baseAdd, enhance) {
  const lv = clamp0(enhance);
  const mul = 1 + lv * 0.1;

  const out = makeZeroStats();
  for (const k of SCALE_STATS) out[k] = (baseAdd?.[k] ?? 0) * mul;
  out.mov = baseAdd?.mov ?? 0; // movはスケールしない
  return out;
}
function scaleAccFlatLv1Base(baseAdd, displayLv) {
  const internal = clamp1(displayLv) - 1;
  const mul = 1 + internal * 0.1;

  const out = makeZeroStats();
  for (const k of STATS) out[k] = (baseAdd?.[k] ?? 0) * mul;
  return out;
}
function scaleAccRatePercentLv1Base(baseRate, displayLv) {
  const internal = clamp1(displayLv) - 1;
  const mul = 1 + internal * 0.01;

  const out = makeZeroStats();
  for (const k of STATS) out[k] = (baseRate?.[k] ?? 0) * mul;
  return out;
}

/* ---------- セット判定 ---------- */
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

/* ---------- ペット：段階0..stageを合算 ---------- */
function sumPetUpToStage(pet, stage) {
  const s = clampStage(stage);
  const outAdd = makeZeroStats();
  const outRate = makeZeroStats();
  const outFinal = makeZeroStats();

  const stages = Array.isArray(pet?.stages) ? pet.stages : [];
  for (let i = 0; i <= s; i++) {
    const st = stages[i] || {};
    const add = st.base_add || {};
    const rate = st.base_rate || {};
    const fin = st.final_rate || {};

    for (const k of STATS) outAdd[k] += add?.[k] ?? 0;
    for (const k of STATS) outRate[k] += rate?.[k] ?? 0;
    for (const k of STATS) outFinal[k] += fin?.[k] ?? 0;
  }
  return { add: outAdd, rate: outRate, final: outFinal };
}

/* ---------- UI ---------- */
function fillSelect(selectEl, items, getLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  selectEl.append(new Option("（なし）", ""));
  for (const it of items) {
    const label = getLabel ? getLabel(it) : it.title ?? it.id;
    selectEl.append(new Option(label, it.id));
  }
}

function buildTableRows() {
  const tbody = $("statsTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  for (const k of STATS) {
    const tr = document.createElement("tr");
    tr.dataset.stat = k;
    tr.innerHTML = `
      <td>${k}</td>
      <td class="num" data-col="base"></td>
      <td class="num" data-col="equip"></td>
      <td class="num" data-col="total"></td>
    `;
    tbody.appendChild(tr);
  }
}

function renderTable(basePlusProtein, equipDisplay, total) {
  const tbody = $("statsTbody");
  if (!tbody) return;

  for (const tr of tbody.querySelectorAll("tr")) {
    const k = tr.dataset.stat;
    tr.querySelector('[data-col="base"]').textContent = fmt(basePlusProtein?.[k] ?? 0);
    tr.querySelector('[data-col="equip"]').textContent = fmt(equipDisplay?.[k] ?? 0);
    tr.querySelector('[data-col="total"]').textContent = fmt(total?.[k] ?? 0);
  }
}

/* ---------- 保存 ---------- */
const STORAGE_KEY = "status_sim_state_no_floor_debug";
const saveState = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
const loadState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
};
const clearState = () => localStorage.removeItem(STORAGE_KEY);

/* ---------- main ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  buildTableRows();
  const saved = loadState();

  // ---- ペットDB読み込み ----
  let petList = [];
  try {
    const petDB = await fetchJSON(abs("/db/pet_skills.json"));
    petList = Array.isArray(petDB?.pets) ? petDB.pets : [];
    flashInfo(`pet_skills.json 読み込みOK：${petList.length}体`, 600);
  } catch (e) {
    flashInfo(`pet_skills.json 読み込み失敗：${String(e?.message ?? e)}`, 4000);
  }

  // ペットselectへ反映 + 復元
  for (const k of PET_KEYS) {
    fillSelect($(`select_${k}`), petList, (p) => p.name ?? p.id);
    const sel = $(`select_${k}`);
    const stg = $(`stage_${k}`);
    if (sel) sel.value = saved?.pets?.[k]?.id ?? "";
    if (stg) stg.value = String(clampStage(saved?.pets?.[k]?.stage ?? 0));
  }
  for (const k of PET_KEYS) {
    const sel = $(`select_${k}`);
    const stg = $(`stage_${k}`);
    if (!sel || !stg) continue;
    sel.addEventListener("change", () => {
      if (sel.value && String(stg.value) === "0") stg.value = "1";
      recalc();
    });
  }

  // ---- 装備DB読み込み ----
  const SLOTS = [
    { key: "weapon", indexUrl: "/db/equip/weapon/index.json", itemDir: "/db/equip/weapon/" },
    { key: "head", indexUrl: "/db/equip/armor/head/index.json", itemDir: "/db/equip/armor/head/" },
    { key: "body", indexUrl: "/db/equip/armor/body/index.json", itemDir: "/db/equip/armor/body/" },
    { key: "hands", indexUrl: "/db/equip/armor/hands/index.json", itemDir: "/db/equip/armor/hands/" },
    { key: "feet", indexUrl: "/db/equip/armor/feet/index.json", itemDir: "/db/equip/armor/feet/" },
    { key: "shield", indexUrl: "/db/equip/armor/shield/index.json", itemDir: "/db/equip/armor/shield/" },
    { key: "accessory", indexUrl: "/db/equip/accessory/index.json", itemDir: "/db/equip/accessory/" }
  ];

  const slotItems = {};
  const loadErrors = [];

  for (const s of SLOTS) {
    slotItems[s.key] = [];
    try {
      const files = await fetchJSON(abs(s.indexUrl));
      const items = [];
      for (const f of files) {
        const toml = await fetchText(abs(`${s.itemDir}${f}`));
        items.push(parseMiniToml(toml));
      }
      slotItems[s.key] = items;
    } catch (e) {
      loadErrors.push(`${s.key}: ${String(e?.message ?? e)}`);
    }
  }

  // 装備UI復元
  for (const key of ["weapon", "head", "body", "hands", "feet", "shield"]) {
    fillSelect($(`select_${key}`), slotItems[key] || [], (it) => it.title ?? it.id);
    const sel = $(`select_${key}`);
    const lv = $(`level_${key}`);
    if (sel) sel.value = saved?.equip?.[key]?.id ?? "";
    if (lv) lv.value = String(clamp0(saved?.equip?.[key]?.lv ?? 0));
  }
  for (const akey of ACCESSORY_KEYS) {
    fillSelect($(`select_${akey}`), slotItems.accessory || [], (it) => it.title ?? it.id);
    const sel = $(`select_${akey}`);
    const lv = $(`level_${akey}`);
    if (sel) sel.value = saved?.equip?.[akey]?.id ?? "";
    if (lv) lv.value = String(clamp1(saved?.equip?.[akey]?.lv ?? 1));
  }

  // 振り分け・プロテイン復元
  if ($("basePointTotal")) $("basePointTotal").value = String(clamp0(saved?.basePointTotal ?? 0));
  for (const k of BASE_STATS) if ($(`base_${k}`)) $(`base_${k}`).value = String(clamp0(saved?.basePoints?.[k] ?? 0));
  if ($("shakerCount")) $("shakerCount").value = String(clamp0(saved?.shakerCount ?? 0));
  for (const k of PROTEIN_STATS) if ($(`protein_${k}`)) $(`protein_${k}`).value = String(clamp0(saved?.proteinRaw?.[k] ?? 0));

  // ボタン
  $("recalcBtn")?.addEventListener("click", recalc);
  $("resetBtn")?.addEventListener("click", () => {
    for (const k of BASE_STATS) if ($(`base_${k}`)) $(`base_${k}`).value = "0";
    recalc();
  });
  $("clearSaveBtn")?.addEventListener("click", () => {
    clearState();

    if ($("basePointTotal")) $("basePointTotal").value = "0";
    for (const k of BASE_STATS) if ($(`base_${k}`)) $(`base_${k}`).value = "0";
    if ($("shakerCount")) $("shakerCount").value = "0";
    for (const k of PROTEIN_STATS) if ($(`protein_${k}`)) $(`protein_${k}`).value = "0";

    for (const key of ["weapon", "head", "body", "hands", "feet", "shield"]) {
      if ($(`select_${key}`)) $(`select_${key}`).value = "";
      if ($(`level_${key}`)) $(`level_${key}`).value = "0";
    }
    for (const akey of ACCESSORY_KEYS) {
      if ($(`select_${akey}`)) $(`select_${akey}`).value = "";
      if ($(`level_${akey}`)) $(`level_${akey}`).value = "1";
    }
    for (const k of PET_KEYS) {
      if ($(`select_${k}`)) $(`select_${k}`).value = "";
      if ($(`stage_${k}`)) $(`stage_${k}`).value = "0";
    }

    recalc();
  });

  document.querySelectorAll("input,select").forEach((el) => {
    el.addEventListener("input", recalc);
    el.addEventListener("change", recalc);
  });

  function recalc() {
    const errs = [];
    if (loadErrors.length) errs.push(...loadErrors);

    const basePointTotal = clamp0($("basePointTotal")?.value);

    // ステ振り（mov固定6）
    const basePointsRaw = makeZeroStats();
    for (const k of BASE_STATS) basePointsRaw[k] = clamp0($(`base_${k}`)?.value);
    basePointsRaw.mov = BASE_MOV;

    // プロテイン（mov対象外）
    const shaker = clamp0($("shakerCount")?.value);
    const proteinRaw = makeZeroStats();
    for (const k of PROTEIN_STATS) proteinRaw[k] = clamp0($(`protein_${k}`)?.value);
    proteinRaw.mov = 0;

    // シェイカー補正（丸めなし）
    const proteinAppliedRaw = mulStats(proteinRaw, 1 + shaker * 0.01);

    // 武器防具（丸めなし）
    let equipSumRaw = makeZeroStats();
    const equipState = {};
    for (const key of ["weapon", "head", "body", "hands", "feet", "shield"]) {
      const id = $(`select_${key}`)?.value || "";
      const lv = clamp0($(`level_${key}`)?.value);
      equipState[key] = { id, lv };
      if (!id) continue;
      const it = (slotItems[key] || []).find((v) => v.id === id);
      if (!it) continue;
      equipSumRaw = addStats(equipSumRaw, scaleEquipBaseAdd(it.base_add ?? {}, lv));
    }

    // セット判定（丸めなし）
    const setSeries = getArmorSetSeries(slotItems, equipState);
    const setMul = setSeries ? 1.1 : 1.0;

    // ポイント超過チェック（mov除外）
    const used = BASE_STATS.reduce((s, k) => s + (basePointsRaw[k] ?? 0), 0);
    const remain = basePointTotal - used;
    const info = $("basePointInfo");
    if (info) info.textContent = setSeries ? `使用 ${used} / 残り ${remain}（セットON）` : `使用 ${used} / 残り ${remain}`;
    if (remain < 0) errs.push(`ポイント超過：残り ${remain}`);

    // セット適用（丸めなし：あなたの式に近い）
    const basePoints = mulStats(basePointsRaw, setMul);
    const proteinApplied = mulStats(proteinAppliedRaw, setMul);
    const equipSum = mulStats(equipSumRaw, setMul);

    // 土台
    const basePlusProtein = addStats(basePoints, proteinApplied);
    const sumBeforeAcc = addStats(basePlusProtein, equipSum);

    // アクセ
    let accFlat = makeZeroStats();
    let accRate = makeZeroStats();
    for (const akey of ACCESSORY_KEYS) {
      const id = $(`select_${akey}`)?.value || "";
      const lv = clamp1($(`level_${akey}`)?.value);
      equipState[akey] = { id, lv };
      if (!id) continue;
      const it = (slotItems.accessory || []).find((v) => v.id === id);
      if (!it) continue;

      accFlat = addStats(accFlat, scaleAccFlatLv1Base(it.base_add ?? {}, lv));
      accRate = addStats(accRate, scaleAccRatePercentLv1Base(it.base_rate ?? {}, lv));
    }

    // ペット
    let petFlat = makeZeroStats();
    let petRate = makeZeroStats();
    let petFinalRate = makeZeroStats();

    const petsState = {};
    for (const pk of PET_KEYS) {
      const pid = $(`select_${pk}`)?.value || "";
      const stage = clampStage($(`stage_${pk}`)?.value);
      petsState[pk] = { id: pid, stage };
      if (!pid || stage <= 0) continue;

      const pet = petList.find((p) => String(p.id) === String(pid));
      if (!pet) continue;

      const summed = sumPetUpToStage(pet, stage);
      petFlat = addStats(petFlat, summed.add);
      petRate = addStats(petRate, summed.rate);
      petFinalRate = addStats(petFinalRate, summed.final);
    }

    // ⑤ 実数加算
    const sumAfterFlat = addStats(addStats(sumBeforeAcc, accFlat), petFlat);

    // ⑥＋⑦ 割合（丸めなし）
    const totalRate = addStats(accRate, petRate);
    const total = applyCombinedRates(sumAfterFlat, totalRate, petFinalRate);

    // 表示用：装備列＝武器防具＋アクセ実数＋ペット実数
    const equipDisplay = addStats(addStats(equipSum, accFlat), petFlat);

    setErr(errs.join("\n"));
    renderTable(basePlusProtein, equipDisplay, total);

    saveState({
      basePointTotal,
      basePoints: Object.fromEntries(BASE_STATS.map((k) => [k, basePointsRaw[k] ?? 0])),
      shakerCount: shaker,
      proteinRaw: Object.fromEntries(PROTEIN_STATS.map((k) => [k, proteinRaw[k] ?? 0])),
      equip: equipState,
      pets: petsState
    });
  }

  recalc();
});
