---
title: "与ダメージ計算"
---

与ダメージを計算するツールです。

<hr>

<section class="atk-tool">
  <h2>与ダメージ計算</h2>

  <div class="atk-form">

  <div class="form-row">
      <label for="monster-select">モンスター選択：</label>
      {{< monster_select >}}
    </div>

  <div class="form-row">
      <label for="monster-level">モンスターレベル：</label>
      <input type="number" id="monster-level" value="1" min="1">
    </div>

  <div class="form-row">
      <span>攻撃タイプ：</span>
      <label><input type="radio" name="attack-type" value="phys" checked> 物理（ATK）</label>
      <label><input type="radio" name="attack-type" value="magic"> 魔法（INT）</label>
    </div>

  <div class="form-row">
      <label for="atk">ATK：</label>
      <input type="number" id="atk" value="100" min="0">
    </div>

  <div class="form-row">
      <label for="int">INT：</label>
      <input type="number" id="int" value="100" min="0">
    </div>

  <div class="form-row">
      <label for="def">DEF：</label>
      <input type="number" id="def" value="0" min="0">
    </div>

  <div class="form-row">
      <label for="mdef">MDEF：</label>
      <input type="number" id="mdef" value="0" min="0">
    </div>

  <button id="calc-btn">計算する</button>
  </div>

  <div class="atk-result">
    <p>与ダメージ：<span id="result">---</span></p>
    <p id="minline">最低ライン：---</p>
  </div>
</section>
<script>
document.addEventListener("DOMContentLoaded", () => {
const selectEl  = document.getElementById("monster-select");
const levelEl   = document.getElementById("monster-level");
const atkEl     = document.getElementById("atk");
const intEl     = document.getElementById("int");
const defEl     = document.getElementById("def");
const mdefEl    = document.getElementById("mdef");
const resultEl  = document.getElementById("result");
const minlineEl = document.getElementById("minline");
const calcBtn   = document.getElementById("calc-btn");
if (!selectEl || !levelEl || !atkEl || !intEl || !defEl || !mdefEl || !resultEl || !minlineEl || !calcBtn) return;

// モンスター基礎値（Lv1）
let baseDef = 0;
let baseMdef = 0;

// レベル補正：基礎値 × (1 + (Lv-1)*0.1) を切り捨て
function scaleByLevel(base, lv) {
  return Math.floor(base * (1 + (lv - 1) * 0.1));
}
function getLv() {
  return Math.max(1, Number(levelEl.value || 1));
}
function getAttackType() {
  const checked = document.querySelector('input[name="attack-type"]:checked');
  return checked ? checked.value : "phys";
}

// select の data-* から基礎DEF/MDEFを読む
function loadMonsterBases() {
  const opt = selectEl.options[selectEl.selectedIndex];
  baseDef  = Number(opt?.dataset?.def  ?? opt?.value ?? 0);
  baseMdef = Number(opt?.dataset?.mdef ?? 0);
}

// DEF/MDEF をレベル反映して入力欄へ
function recalcMonsterStats() {
  const lv = getLv();
  if (!baseDef && !baseMdef) return;
  const def  = scaleByLevel(baseDef, lv);
  const mdef = scaleByLevel(baseMdef, lv);
  defEl.value  = def;
  mdefEl.value = mdef;
}

// ---- 正式ダメージ式（乱数は後回し：r=1.0で表示） ----
function calcPhysicalDamage(atk, def, mdef, r = 1.0) {
  const raw = (atk * 1.75 - (def + mdef / 10)) * 4 * r;
  return Math.max(0, Math.floor(raw));
}
function calcMagicDamage(intv, def, mdef, r = 1.0) {
  const raw = (intv * 1.26 - (mdef + def / 10)) * 4 * r;
  return Math.max(0, Math.floor(raw));
}

// ---- 確実に通る最低ライン（最悪乱数 r=0.9 でも 1以上） ----
function minAtkLine(def, mdef) {
  const r = 0.9;
  const need = (1 / (4 * r)) + (def + mdef / 10);
  return Math.ceil(need / 1.75);
}
function minIntLine(def, mdef) {
  const r = 0.9;
  const need = (1 / (4 * r)) + (mdef + def / 10);
  return Math.ceil(need / 1.26);
}
function updateMinLine() {
  const type = getAttackType();
  const def  = Number(defEl.value || 0);
  const mdef = Number(mdefEl.value || 0);
  if (type === "phys") {
    minlineEl.textContent = `確実に1以上出る最低ATK：${minAtkLine(def, mdef)}`;
  } else {
    minlineEl.textContent = `確実に1以上出る最低INT：${minIntLine(def, mdef)}`;
  }
}
function onMonsterOrLevelChanged() {
  loadMonsterBases();
  recalcMonsterStats();
  updateMinLine();
}

// --- イベント ---
selectEl.addEventListener("change", () => {
  levelEl.value = 1; // モンスター切替時はLv1に戻す（不要なら削除OK）
  onMonsterOrLevelChanged();
});
levelEl.addEventListener("input", () => {
  recalcMonsterStats();
  updateMinLine();
});
document.querySelectorAll('input[name="attack-type"]').forEach(radio => {
  radio.addEventListener("change", updateMinLine);
});
calcBtn.addEventListener("click", () => {
  const type = getAttackType();
  const atk  = Number(atkEl.value || 0);
  const intv = Number(intEl.value || 0);
  const def  = Number(defEl.value || 0);
  const mdef = Number(mdefEl.value || 0);
  const dmg = (type === "phys")
    ? calcPhysicalDamage(atk, def, mdef, 1.0)
    : calcMagicDamage(intv, def, mdef, 1.0);
  resultEl.textContent = dmg;
  updateMinLine();
});

// 初期化
onMonsterOrLevelChanged();
updateMinLine();
});
</script>
