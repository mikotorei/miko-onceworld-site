---
title: "ペット与ダメージ計算"
---

ペットの与ダメージを計算します（攻撃値は手入力）。  

<hr>

<section class="atk-tool">
  <h2>ペット与ダメージ計算</h2>

  <div class="atk-form">

  <div class="form-row">
      <label for="pet-select">ペット選択：</label>
      {{< monster_select id="pet-select" role="pet" >}}
    </div>

  <div class="form-row">
      <label>ペット攻撃タイプ：</label>
      <strong><span id="pet-type">---</span></strong>
    </div>

  <div class="form-row">
      <label for="pet-atk">ATK（物理用）：</label>
      <input type="number" id="pet-atk" value="0" min="0">
    </div>

  <div class="form-row">
      <label for="pet-int">INT（魔法用）：</label>
      <input type="number" id="pet-int" value="0" min="0">
    </div>

  <hr>

  <div class="form-row">
      <label for="enemy-select">攻撃対象モンスター：</label>
      {{< monster_select id="enemy-select" role="enemy" >}}

  <label for="monster-order">並び順：</label>
     <select id="monster-order" data-monster-order="enemy">
        <option value="id-asc" selected>図鑑番号（昇順）</option>
        <option value="name-asc">名前（昇順）</option>
        <option value="name-desc">名前（降順）</option>
      </select>
    </div>
  <div class="form-row" id="common-lv-row" style="display:none;">
      <label>よくあるLv：</label>
      <div id="common-lv-buttons"></div>
    </div>

  <div class="form-row">
      <label for="monster-level">モンスターレベル：</label>
      <input type="number" id="monster-level" value="1" min="1">
    </div>

  <div class="form-row">
      <label for="def">DEF：</label>
      <input type="number" id="def" value="0" min="0">
    </div>

  <div class="form-row">
      <label for="mdef">MDEF：</label>
      <input type="number" id="mdef" value="0" min="0">
    </div>

  <div class="form-row">
      <label>対象モンスター体力（レベル反映）：</label>
      <span id="vit-display">---</span>
    </div>

  <button id="calc-btn" type="button">計算する</button>
  </div>

  <div class="atk-result">
    <p>与ダメージ：<span id="result">---</span></p>
    <p id="minline">最低ライン：---</p>
  </div>
</section>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const petSelectEl = document.getElementById("pet-select");
  const enemySelectEl = document.getElementById("enemy-select");
  const levelEl = document.getElementById("monster-level");

  const petTypeEl = document.getElementById("pet-type");
  const petAtkEl = document.getElementById("pet-atk");
  const petIntEl = document.getElementById("pet-int");

  const defEl = document.getElementById("def");
  const mdefEl = document.getElementById("mdef");
  const vitDisplayEl = document.getElementById("vit-display");

  const resultEl = document.getElementById("result");
  const minlineEl = document.getElementById("minline");
  const calcBtn = document.getElementById("calc-btn");

  const commonRow = document.getElementById("common-lv-row");
  const commonWrap = document.getElementById("common-lv-buttons");

  if (!petSelectEl || !enemySelectEl || !levelEl ||
      !petTypeEl || !petAtkEl || !petIntEl ||
      !defEl || !mdefEl || !vitDisplayEl ||
      !resultEl || !minlineEl || !calcBtn) return;

  // --- ユーティリティ ---
  function scaleByLevel(base, lv) {
    return Math.floor(base * (1 + (lv - 1) * 0.1));
  }
  function getLv() {
    return Math.max(1, Number(levelEl.value || 1));
  }

  // ★ ペット攻撃タイプ（monster_select の data-attack-type を使う）
  function updatePetType() {
    const opt = petSelectEl.options[petSelectEl.selectedIndex];
    const t = opt?.dataset?.attackType || "";
    petTypeEl.textContent = t || "---";

    if (t === "物理") {
      petAtkEl.disabled = false;
      petAtkEl.style.opacity = "1";
      petIntEl.disabled = true;
      petIntEl.value = 0;
      petIntEl.style.opacity = "0.5";
    } else if (t === "魔法") {
      petIntEl.disabled = false;
      petIntEl.style.opacity = "1";
      petAtkEl.disabled = true;
      petAtkEl.value = 0;
      petAtkEl.style.opacity = "0.5";
    } else {
      petAtkEl.disabled = true;
      petIntEl.disabled = true;
      petAtkEl.value = 0;
      petIntEl.value = 0;
      petAtkEl.style.opacity = "0.5";
      petIntEl.style.opacity = "0.5";
    }
  }

  // ★ 敵「よくあるLv」描画（data-levels）
  function renderCommonLevels() {
    if (!commonRow || !commonWrap) return;

    const opt = enemySelectEl.options[enemySelectEl.selectedIndex];
    const raw = opt?.dataset?.levels || "";

    const levels = String(raw)
      .split(",")
      .map(s => Number(String(s).trim()))
      .filter(n => Number.isFinite(n) && n >= 1);

    if (!opt || !opt.value || levels.length === 0) {
      commonWrap.innerHTML = "";
      commonRow.style.display = "none";
      return;
    }

    commonWrap.innerHTML = "";
    commonRow.style.display = "";
    levels.forEach(lv => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = String(lv);
      b.style.marginRight = "6px";
      b.style.padding = "4px 10px";
      b.style.borderRadius = "999px";
      b.style.border = "1px solid #ddd";
      b.style.background = "#fff";
      b.style.cursor = "pointer";

      b.addEventListener("click", () => {
        levelEl.value = lv;
        levelEl.dispatchEvent(new Event("input", { bubbles: true }));
      });

      commonWrap.appendChild(b);
    });
  }

  // --- 敵のDEF/MDEF/VIT 自動反映 ---
  let baseDef = 0, baseMdef = 0, baseVit = 0;

  function loadEnemyBases() {
    const opt = enemySelectEl.options[enemySelectEl.selectedIndex];
    if (!opt || !opt.value) {
      baseDef = 0; baseMdef = 0; baseVit = 0;
      return;
    }
    baseDef  = Number(opt.dataset.def || 0);
    baseMdef = Number(opt.dataset.mdef || 0);
    baseVit  = Number(opt.dataset.vit || 0);
  }

  function recalcEnemyStats() {
    const lv = getLv();
    if (!baseDef && !baseMdef && !baseVit) return;

    const def = scaleByLevel(baseDef, lv);
    const mdef = scaleByLevel(baseMdef, lv);
    const vit = scaleByLevel(baseVit, lv);

    defEl.value = def;
    mdefEl.value = mdef;
    vitDisplayEl.textContent = vit * 18 + 100;
  }

  function onEnemyOrLevelChanged() {
    loadEnemyBases();
    recalcEnemyStats();
    updateMinLine();
  }

  // --- ダメージ ---
  function calcPetPhysical(petAtk, def, mdef) {
    const raw = (petAtk * 1.75 - (def + mdef * 0.1)) * 4;
    return Math.max(0, Math.floor(raw));
  }

  function calcPetMagic(petInt, def, mdef) {
    const raw = (petInt * 1.75 - (mdef + def * 0.1)) * 4;
    return Math.max(0, Math.floor(raw));
  }

  function minPetAtkLine(def, mdef) {
    const r = 0.9;
    const need = (1 / (4 * r)) + (def + mdef * 0.1);
    return Math.ceil(need / 1.75);
  }

  function minPetIntLine(def, mdef) {
    const r = 0.9;
    const need = (1 / (4 * r)) + (mdef + def * 0.1);
    return Math.ceil(need / 1.75);
  }

  function updateMinLine() {
    const t = (petSelectEl.options[petSelectEl.selectedIndex]?.dataset?.attackType || "").trim();
    const def = Number(defEl.value || 0);
    const mdef = Number(mdefEl.value || 0);

    if (t === "物理") {
      minlineEl.textContent = `確実に1以上出る最低ATK：${minPetAtkLine(def, mdef)}`;
    } else if (t === "魔法") {
      minlineEl.textContent = `確実に1以上出る最低INT：${minPetIntLine(def, mdef)}`;
    } else {
      minlineEl.textContent = "最低ライン：---";
    }
  }

  // --- イベント ---
  petSelectEl.addEventListener("change", () => {
    updatePetType();
    updateMinLine();
  });

  enemySelectEl.addEventListener("change", () => {
    levelEl.value = 1;
    renderCommonLevels();
    onEnemyOrLevelChanged();
  });

  levelEl.addEventListener("input", () => {
    recalcEnemyStats();
    updateMinLine();
  });

  calcBtn.addEventListener("click", () => {
    const t = (petSelectEl.options[petSelectEl.selectedIndex]?.dataset?.attackType || "").trim();
    const def = Number(defEl.value || 0);
    const mdef = Number(mdefEl.value || 0);

    let dmg = 0;
    if (t === "物理") dmg = calcPetPhysical(Number(petAtkEl.value || 0), def, mdef);
    else if (t === "魔法") dmg = calcPetMagic(Number(petIntEl.value || 0), def, mdef);

    resultEl.textContent = dmg;
    updateMinLine();
  });

  // 初期化
  updatePetType();
  renderCommonLevels();
  onEnemyOrLevelChanged();
});
</script>

{{< rawhtml >}}
<script src="/js/monster-order.js"></script>
{{< /rawhtml >}}
