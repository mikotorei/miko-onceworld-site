// static/js/status-sim.js
// 目的：weapon を選ぶ → base_add（加算）だけ反映して表示する（最小構成）

const STATS = ["vit", "spd", "atk", "int", "def", "mdef", "luk", "mov"];
const $ = (id) => document.getElementById(id);

function makeZeroStats() {
  return Object.fromEntries(STATS.map((k) => [k, 0]));
}

function addStats(a, b) {
  const out = { ...a };
  for (const k of STATS) out[k] = (out[k] ?? 0) + (b?.[k] ?? 0);
  return out;
}

function itemToAddStats(item) {
  return addStats(makeZeroStats(), item?.base_add ?? {});
}

function renderStats(obj) {
  const ordered = Object.fromEntries(STATS.map((k) => [k, obj?.[k] ?? 0]));
  return JSON.stringify(ordered, null, 2);
}

/**
 * 超ミニTOMLパーサ（今回の用途限定）
 * 対応する形式：
 *  title = "..."
 *  slot = "weapon"
 *  series = "..."
 *  [base_add]
 *  atk = 50
 */
function parseMiniToml(text) {
  // Hugoの front matter みたいに +++ が入ってても、行として無視する
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

    // 文字列 "..." を剥がす
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }

    // 数値化できるものは数値に
    const num = Number(raw);
    const value = Number.isFinite(num) && raw !== "" && !raw.includes('"') ? num : raw;

    if (section === "base_add") {
      item.base_add[key] = Number.isFinite(Number(value)) ? Number(value) : value;
    } else {
      item[key] = value;
    }
  }

  // select の value に使うキー（id がない場合の保険）
  item.id = item.id || item.title || "unknown";
  return item;
}

async function loadWeaponIndex() {
  const res = await fetch("/db/equip/weapon/index.json", { cache: "no-store" });
  if (!res.ok) throw new Error("index.json を読み込めません: /db/equip/weapon/index.json");
  return await res.json(); // ["test_weapon.toml", ...]
}

async function loadWeaponToml(filename) {
  const res = await fetch(`/db/equip/weapon/${filename}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`TOML を読み込めません: ${filename}`);
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

async function main() {
  const weaponSelect = $("weaponSelect");
  const resultBox = $("resultBox");
  const recalcBtn = $("recalcBtn");

  if (!weaponSelect || !resultBox) return;

  // 1) weapon/index.json から読み込み対象を取得
  const files = await loadWeaponIndex();

  // 2) TOML を全部ロードして items にする
  const items = [];
  for (const f of files) items.push(await loadWeaponToml(f));

  // 3) UI へ反映
  fillSelect(weaponSelect, items);

  const recalc = () => {
    const w = findById(items, weaponSelect.value);
    const added = itemToAddStats(w);
    resultBox.textContent = renderStats(added);
  };

  weaponSelect.addEventListener("change", recalc);
  recalcBtn?.addEventListener("click", recalc);

  recalc();
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => {
    const resultBox = $("resultBox");
    if (resultBox) resultBox.textContent = String(e?.message ?? e);
    console.error(e);
  });
});
