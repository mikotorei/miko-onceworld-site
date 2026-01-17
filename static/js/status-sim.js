// static/js/status-sim.js
// 安定版：アクセ3枠（Lv1基礎）＋ペット3体（段階0〜4）計算反映（ステップ5）
// ★改善：ペットを選択したら、段階が0のとき自動で1にする（操作性向上）
//
// 武器/防具：+0が基礎（×1.0）、+1から補正
//   実数スケール：基礎×(1+強化×0.1)（mov除外）
// セット効果：防具5部位が同seriesなら、ステ振り/プロテイン/武器防具に×1.1（切り捨て）
//
// アクセ（3枠）：Lv1が基礎（補正なし）
//   内部強化数 = (Lv - 1)
//   実数：基礎×(1+内部×0.1) を「(ステ振り+プロテイン+武器防具)の後」に加算
//   割合：基礎×(1+内部×0.01) を、その後に乗算（1 + %/100）
//   アクセはセット効果対象外
//
// ペット（3体）
//   段階：0=未解放 / 1=31 / 2=71 / 3=121 / 4=181
//   選択したペットの stages[0..stage] を合算して補正を作る
//   実数はアクセ実数と同タイミングで加算
//   割合はアクセ割合と同タイミングで最後に乗算
//   ペットはセット効果対象外

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const BASE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const PROTEIN_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const SCALE_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"];
const ARMOR_KEYS = ["head", "body", "hands", "feet", "shield"];
const ACCESSORY_KEYS = ["accessory1", "accessory2", "accessory3"];
const PET_KEYS = ["pet1", "pet2", "pet3"];

const $ = (id) => document.getElementById(id);

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
function mulStatsFloor(stats, mul) {
  const out = makeZeroStats();
  for (const k of STATS) out[k] = Math.floor((stats?.[k] ?? 0) * mul);
  return out;
}

/* ---------- error ---------- */
function setErr(text) {
  const el = $("errBox");
  if (!el) return;
  const msg = (text || "").trim();
  el.textContent = msg;
  el.classList.toggle("is-visible", msg.length > 0);
}
function flashInfo(msg, ms = 900) {
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

/* ---------- スケール ---------- */
function scaleEquipBaseAdd(baseAdd, enhance) {
  const lv = clamp0(enhance);
  const mul = 1 + lv * 0.1;

  const out = makeZeroStats();
  for (const k of SCALE_STATS) out[k] = Math.floor((baseAdd?.[k] ?? 0) * mul);
  out.mov = baseAdd?.mov ?? 0;
  return out;
}

function scaleAccFlatLv1Base(baseAdd, displayLv) {
  const internal = clamp1(displayLv) - 1;
  const mul = 1 + internal * 0.1;

  const out = makeZeroStats();
  for (const k of STATS) out[k] = Math.floor((baseAdd?.[k] ?? 0) * mul);
  return out;
}

function scaleAccRatePercentLv1Base(baseRate, displayLv) {
  const internal = clamp1(displayLv) - 1;
  const mul = 1 + internal * 0.01;

  const out = makeZeroStats();
  for (const k of STATS) out[k] = (baseRate?.[k] ?? 0) * mul;
  return out;
}

function applyRateToStatsFloor(stats, ratePercentByStat) {
  const out = makeZeroStats();
  for (const k of STATS) {
    const p = ratePercentByStat?.[k] ?? 0;
    out[k] = Math.floor((stats?.[k] ?? 0) * (1 + p / 100));
  }
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

  const stages = Array.isArray(pet?.stages) ? pet.stages : [];
  for (let i = 0; i <= s; i++) {
    const st = stages[i] || {};
    const add = st.base_add || {};
    const rate = st.base_rate || {};
    for (const k of STATS) outAdd[k] += (add?.[k] ?? 0);
    for (const k of STATS) outRate[k] += (rate?.[k] ?? 0);
  }
  return { add: outAdd, rate: outRate };
}

/* ---------- UI ---------- */
function fillSelect(selectEl, items, getLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  selectEl.append(new Option("（なし）", ""));
  for (const it of items) {
    const label = getLabel ? getLabel(it) : (it.title ?? it.id);
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
    tr.querySelector('[data-col="base"]').textContent = String(basePlusProtein?.[k] ?? 0);
    tr.querySelector('[data-col="equip"]').textContent = String(equipDisplay?.[k] ?? 0);
    tr.querySelector('[data-col="total"]').textContent = String(total?.[k] ?? 0);
  }
}

/* ---------- 保存 ---------- */
const STORAGE_KEY = "status_sim_state_acc3_lv1base_petcalc_v2";
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
    flashInfo(`pet_skills.json 読み込みOK：${petList.length}体`, 700);
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

  // ★操作性：ペットを選んだら段階が0のとき自動で1にする
  for (const k of PET_KEYS) {
    const sel = $(`select_${k}`);
    const stg = $(`stage_${k}`);
    if (!sel || !stg) continue;
    sel.addEventListener("change", () => {
      const pid = sel.value || "";
      if (pid && String(stg.value) === "0") stg.value = "1";
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
    { key: "accessory", indexUrl: "/db/equip/accessory/index.json", itemDir: "/db/equip/accessory/" },
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

  if ($("basePointTotal")) $("basePointTotal").value = String(clamp0(saved?.basePointTotal ?? 0));
  for (const k of BASE_STATS) {
    const el = $(`base_${k}`);
    if (el) el.value = String(clamp0(saved?.basePoints?.[k] ?? 0));
  }
  if ($("shakerCount")) $("shakerCount").value = String(clamp0(saved?.shakerCount ?? 0));
  for (const k of PROTEIN_STATS) {
    const el = $(`protein_${k}`);
    if (el) el.value = String(clamp0(saved?.proteinRaw?.[k] ?? 0));
  }

  $("recalcBtn")?.addEventListener("click", recalc);
  $("resetBtn")?.addEventListener("click", () => {
    for (const k of BASE_STATS) {
      const el = $(`base_${k}`);
      if (el) el.value = "0";
    }
    recalc();
  });
  $("clearSaveBtn")?.addEventListener("click", () => {
    clearState();

    if ($("basePointTotal")) $("basePointTotal").value = "0";
    for (const k of BASE_STATS) if ($(`base_${k}`)) $(`base_${k}`).value = "0";
    if ($("shakerCount")) $("shakerCount").value = "0";
    for (const k of PROTEIN_STATS) if ($(`protein_${k}`)) $(`protein_${k}`).value = "0";

    for (const key of ["weapon","head","body","hands","feet","shield"]) {
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

    const basePointsRaw = makeZeroStats();
    for (const k of BASE_STATS) basePointsRaw[k] = clamp0($(`base_${k}`)?.value);
    basePointsRaw.mov = 0;

    const shaker = clamp0($("shakerCount")?.value);
    const proteinRaw = makeZeroStats();
    for (const k of PROTEIN_STATS) proteinRaw[k] = clamp0($(`protein_${k}`)?.value);
    const proteinAppliedRaw = mulStatsFloor(proteinRaw, 1 + shaker * 0.01);

    let equipSumRaw = makeZeroStats();
    const equipState = {};

    for (const key of ["weapon","head","body","hands","feet","shield"]) {
      const id = $(`select_${key}`)?.value || "";
      const lv = clamp0($(`level_${key}`)?.value);
      equipState[key] = { id, lv };

      if (!id) continue;
      const it = (slotItems[key] || []).find((v) => v.id === id);
      if (!it) continue;
      equipSumRaw = addStats(equipSumRaw, scaleEquipBaseAdd(it.base_add ?? {}, lv));
    }

    const setSeries = getArmorSetSeries(slotItems, equipState);
    const setMul = setSeries ? 1.1 : 1.0;

    const used = BASE_STATS.reduce((s, k) => s + (basePointsRaw[k] ?? 0), 0);
    const remain = basePointTotal - used;
    const info = $("basePointInfo");
    if (info) info.textContent = setSeries ? `使用 ${used} / 残り ${remain}（セットON）` : `使用 ${used} / 残り ${remain}`;
    if (remain < 0) errs.push(`ポイント超過：残り ${remain}`);

    const basePoints = setMul === 1.0 ? basePointsRaw : mulStatsFloor(basePointsRaw, setMul);
    const proteinApplied = setMul === 1.0 ? proteinAppliedRaw : mulStatsFloor(proteinAppliedRaw, setMul);
    const equipSum = setMul === 1.0 ? equipSumRaw : mulStatsFloor(equipSumRaw, setMul);

    const basePlusProtein = addStats(basePoints, proteinApplied);
    const sumBeforeAcc = addStats(basePlusProtein, equipSum);

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

    // --- ペット（3体） ---
    let petFlat = makeZeroStats();
    let petRate = makeZeroStats();

    const petsState = {};
    for (const pk of PET_KEYS) {
      const pid = $(`select_${pk}`)?.value || "";
      const stage = clampStage($(`stage_${pk}`)?.value);
      petsState[pk] = { id: pid, stage };

      if (!pid || stage <= 0) continue;
      const pet = petList.find((p) => p.id === pid);
      if (!pet) continue;

      const summed = sumPetUpToStage(pet, stage);
      petFlat = addStats(petFlat, summed.add);
      petRate = addStats(petRate, summed.rate);
    }

    const sumAfterFlat = addStats(addStats(sumBeforeAcc, accFlat), petFlat);
    const totalRate = addStats(accRate, petRate);
    const total = applyRateToStatsFloor(sumAfterFlat, totalRate);

    const equipDisplay = addStats(addStats(equipSum, accFlat), petFlat);

    setErr(errs.join("\n"));
    renderTable(basePlusProtein, equipDisplay, total);

    saveState({
      basePointTotal,
      basePoints: Object.fromEntries(BASE_STATS.map((k) => [k, basePointsRaw[k] ?? 0])),
      shakerCount: shaker,
      proteinRaw: Object.fromEntries(PROTEIN_STATS.map((k) => [k, proteinRaw[k] ?? 0])),
      equip: equipState,
      pets: petsState,
    });
  }

  recalc();
});
