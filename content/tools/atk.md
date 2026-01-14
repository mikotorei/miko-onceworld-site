---
title: "与ダメージ計算"
---

与ダメージを計算するツールです。

<section class="atk-tool">
  <h2>与ダメージ計算</h2>

  <div class="atk-form">

    <div class="form-row">
      <label for="enemy-select">モンスター選択：</label>
      {{< monster_select id="enemy-select" role="enemy" >}}

      <label>並び順：</label>
      <select data-monster-order="enemy">
        <option value="id-asc">図鑑番号（昇順）</option>
        <option value="name-asc">名前（昇順）</option>
        <option value="name-desc">名前（降順）</option>
      </select>
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

    <button id="calc-btn" type="button">計算する</button>
  </div>

  <div class="atk-result">
    <p>対象モンスターの体力（レベル反映）：<span id="vit-display">---</span></p>
    <p>与ダメージ：<span id="result">---</span></p>
    <p id="minline">最低ライン：---</p>
  </div>
</section>

{{< rawhtml >}}
<script>
document.addEventListener("DOMContentLoaded", () => {
  const selectEl  = document.getElementById("enemy-select");
  const levelEl   = document.getElementById("monster-level");
  const atkEl     = document.getElementById("atk");
  const intEl     = document.getElementById("int");
  const defEl     = document.getElementById("def");
  const mdefEl    = document.getElementById("mdef");
  const resultEl  = document.getElementById("result");
  const minlineEl = document.getElementById("minline");
  const calcBtn   = document.getElementById("calc-btn");
  const vitDisplayEl = document.getElementById("vit-display"); // 任意（無くても動く）

  if (!selectEl || !levelEl || !atkEl || !intEl || !defEl || !mdefEl || !resultEl || !minlineEl || !calcBtn) return;

  let baseDef = 0;
  let baseMdef = 0;
  let baseVit = 0;

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

  // 共通monster_selectの data-* を読む
  function loadMonsterBases() {
    const opt = selectEl.options[selectEl.selectedIndex];
    if (!opt || !opt.value) {
      baseDef = 0; baseMdef = 0; baseVit = 0;
      return;
    }
    baseDef  = Number(opt.dataset.def || 0);
    baseMdef = Number(opt.dataset.mdef || 0);
    baseVit  = Number(opt.dataset.vit || 0);
  }

  function recalcMonsterStats() {
    const lv = getLv();
    if (!baseDef && !baseMdef && !baseVit) return;

    const def  = scaleByLevel(baseDef, lv);
    const mdef = scaleByLevel(baseMdef, lv);

    defEl.value  = def;
    mdefEl.value = mdef;

    // VIT表示がある場合だけ更新（HP換算：vit*18+100）
    if (vitDisplayEl) {
      const vit = scaleByLevel(baseVit, lv);
      vitDisplayEl.textContent = vit * 18 + 100;
    }
  }

  function calcPhysicalDamage(atk, def, mdef, r = 1.0) {
    const raw = (atk * 1.75 - (def + mdef / 10)) * 4 * r;
    return Math.max(0, Math.floor(raw));
  }

  function calcMagicDamage(intv, def, mdef, r = 1.0) {
    const raw = (intv * 1.26 - (mdef + def / 10)) * 4 * r;
    return Math.max(0, Math.floor(raw));
  }

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

    minlineEl.textContent =
      (type === "phys")
        ? `確実に1以上出る最低ATK：${minAtkLine(def, mdef)}`
        : `確実に1以上出る最低INT：${minIntLine(def, mdef)}`;
  }

  function onMonsterOrLevelChanged() {
    loadMonsterBases();
    recalcMonsterStats();
    updateMinLine();
  }

  // --- イベント登録 ---
  selectEl.addEventListener("change", () => {
    levelEl.value = 1;
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
});
</script>
<script src="/js/monster-order.js"></script>
{{< /rawhtml >}}
