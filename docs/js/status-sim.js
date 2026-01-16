// static/js/status-sim.js
// 安定版：装備が一部404でも落ちず、画面にエラーを出す
// 機能：基礎 + プロテイン(7種) + 装備(武器+防具5種) => 表表示 + 保存

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const PROTEIN_STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk"]; // movなし
const $ = (id) => document.getElementById(id);

const SLOTS = [
  { key: "weapon", label: "武器", indexUrl: "/db/equip/weapon/index.json", itemDir: "/db/equip/weapon/" },
  { key: "head",   label: "頭",   indexUrl: "/db/equip/armor/head/index.json",   itemDir: "/db/equip/armor/head/" },
  { key: "body",   label: "体",   indexUrl: "/db/equip/armor/body/index.json",   itemDir: "/db/equip/armor/body/" },
  { key: "hands",  label: "腕",   indexUrl: "/db/equip/armor/hands/index.json",  itemDir: "/db/equip/armor/hands/" },
  { key: "feet",   label: "足",   indexUrl: "/db/equip/armor/feet/index.json",   itemDir: "/db/equip/armor/feet/" },
  { key: "shield", label: "盾",   indexUrl: "/db/equip/armor/shield/index.json", itemDir: "/db/equip/armor/shield/" },
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
const STORAGE_KEY = "status_sim_state_v4_table_protein_per_stat";
const saveState = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
const loadState = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } };
const clearState = () => localStorage.removeItem(STORAGE_KEY);

// ====== util ======
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

function setErr(text) {
  const el = $("errBox");
  if (el) el.textContent = text || "";
}

// ====== プロテイン ======
function readProteinFromUI() {
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
function proteinSummaryText(p) {
  const parts = [];
  for (const k of PROTEIN_STATS) {
    const v = p?.[k] ?? 0;
    if (v !== 0) parts.push(`${k}+${v}`);
  }
  return parts.length ? `プロテイン補正：${parts.join(" / ")}（movは対象外）` : `プロテイン補正：なし（movは対象外）`;
}

// ====== 基礎 ======
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

// ====== UI（select） ======
function fillSelect(selectEl, items) {
  selectEl.innerHTML = "";
  selectEl.append(new Option("（なし）", ""));
  for (const it of items) selectEl.append(new Option(it.title ?? it.id, it.id));
}

// ====== UI（表） ======
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

// ====== main ======
async function main() {
  setErr("");

  // 表がなければここで止めて、原因を画面に出す
  if (!buildTableRows()) {
    setErr("statsTbody が見つかりません。status.md が置き換わっているか確認してください。");
    return;
  }

  const saved = loadState();
  const proteinInfo = $("proteinInfo");

  // スロットロード：1つ失敗しても他は動く
  const slotItems = {}; // key -> items[]
  const loadErrors = [];

  for (const s of SLOTS) {
    const sel = $(`select_${s.key}`);
    slotItems[s.key] = [];

    // select自体がない場合はスキップ（ただし表は動く）
    if (!sel) {
      loadErrors.push(`select_${s.key} が見つかりません`);
      continue;
    }

    try {
      const files = await loadIndex(s.indexUrl);
      const items = [];
      for (const f of files) items.push(await loadToml(s.itemDir, f));
      slotItems[s.key] = items;

      fillSelect(sel, items);
      if (saved?.equip?.[s.key]) sel.value = saved.equip[s.key];
    } catch (e) {
      // 失敗しても（なし）だけ入れて進行
      fillSelect(sel, []);
      loadErrors.push(`${s.label} DB 読込失敗: ${String(e?.message ?? e)}`);
    }

    sel.addEventListener("change", recalc);
  }

  // 基礎・プロテイン復元
  applyBaseStatsToUI(saved?.base);
  applyProteinToUI(saved?.protein);

  for (const k of STATS) $(`base_${k}`)?.addEventListener("input", recalc);
  for (const k of PROTEIN_STATS) $(`protein_${k}`)?.addEventListener("input", recalc);

  $("recalcBtn")?.addEventListener("click", recalc);
  $("resetBtn")?.addEventListener("click", () => { resetBaseStatsUI(); recalc(); });

  $("clearSaveBtn")?.addEventListener("click", () => {
    clearState();
    resetBaseStatsUI();
    resetProteinUI();
    for (const s of SLOTS) {
      const sel = $(`select_${s.key}`);
      if (sel) sel.value = "";
    }
    recalc();
  });

  function recalc() {
    const baseRaw = readBaseStatsFromUI();
    const protein = readProteinFromUI();
    const basePlusProtein = addStats(baseRaw, protein);

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

    if (proteinInfo) proteinInfo.textContent = proteinSummaryText(protein);

    // エラー表示（DBの404があればここで見える）
    setErr(loadErrors.length ? loadErrors.join("\n") : "");

    renderTable(basePlusProtein, equipSum, total);
    saveState({ base: baseRaw, protein, equip: equipState });
  }

  recalc();
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => {
    console.error(e);
    setErr(String(e?.message ?? e));
  });
});
