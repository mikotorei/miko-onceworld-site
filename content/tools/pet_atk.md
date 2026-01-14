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

  <label>並び順：</label>
      <select data-monster-order="both">
        <option value="id-asc">図鑑番号（昇順）</option>
        <option value="name-asc">名前（昇順）</option>
        <option value="name-desc">名前（降順）</option>
      </select>
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
  const petSelectEl   = document.getElementById("pet-select");
  const enemySelectEl = document.getElementById("enemy-select");
  const levelEl       = document.getElementById("monster-level");

  const petTypeEl = document.getElementById("pet-type");
  const petAtkEl  = document.getElementById("pet-atk");
  const petIntEl  = document.getElementById("pet-int");

  const defEl        = document.getElementById("def");
  const mdefEl       = document.getElementById("mdef");
  const vitDisplayEl = document.getElementById("vit-display");

  const resultEl  = document.getElementById("result");
  const minlineEl = document.getElementById("minline");
  const calcBtn   = document.getElementById("calc-btn");

  const orderEl = document.querySelector('[data-monster-order="both"]');

  if (!petSelectEl || !enemySelectEl || !levelEl ||
      !petTypeEl || !petAtkEl || !petIntEl ||
      !defEl || !mdefEl || !vitDisplayEl ||
      !resultEl || !minlineEl || !calcBtn || !orderEl) return;

  // --------------------------
  // ユーティリティ
  // --------------------------
  const num = (v, fallback = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  };

  function scaleByLevel(base, lv) {
    return Math.floor(base * (1 + (lv - 1) * 0.1));
  }
  function getLv() {
    return Math.max(1, num(levelEl.value, 1));
  }

  function getSelectedOpt(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    if (!opt || !opt.value) return null; // 未選択
    return opt;
  }

  // --------------------------
  // ペット：攻撃タイプで入力欄を切替
  // attack_type は "物理" / "魔法" 想定
  // --------------------------
  function setPetType(type) {
    petTypeEl.textContent = type || "---";

    if (type === "物理") {
      petAtkEl.disabled = false;
      petAtkEl.style.opacity = "1";
      petIntEl.disabled = true;
      petIntEl.value = 0;
      petIntEl.style.opacity = "0.5";
    } else if (type === "魔法") {
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

  function getPetAttackType() {
    const opt = getSelectedOpt(petSelectEl);
    return opt ? (opt.dataset.attackType || "").trim() : "";
  }

  function updatePetTypeFromSelection() {
    setPetType(getPetAttackType());
  }

  // --------------------------
  // 対象モンスター：DEF/MDEF/VIT 自動反映
  // --------------------------
  let baseDef = 0, baseMdef = 0, baseVit = 0;

  function loadTargetBases() {
    const opt = getSelectedOpt(enemySelectEl);
    if (!opt) {
      baseDef = 0; baseMdef = 0; baseVit = 0;
      return;
    }
    baseDef  = num(opt.dataset.def, 0);
    baseMdef = num(opt.dataset.mdef, 0);
    baseVit  = num(opt.dataset.vit, 0);
  }

  function recalcTargetStats() {
    const lv = getLv();
    if (!baseDef && !baseMdef && !baseVit) return;

    const def  = scaleByLevel(baseDef, lv);
    const mdef = scaleByLevel(baseMdef, lv);
    const vit  = scaleByLevel(baseVit, lv);

    defEl.value = def;
    mdefEl.value = mdef;
    vitDisplayEl.textContent = vit * 18 + 100; // 既存仕様
  }

  function onTargetChanged() {
    loadTargetBases();
    recalcTargetStats();
  }

  // --------------------------
  // ダメージ式（乱数/属性補正は後回しで 1.0 固定）
  // 最低保証：0
  // --------------------------
  function calcPetPhysical(petAtk, def, mdef) {
    const attr = 1.0;
    const rand = 1.0;
    const raw = (petAtk * 1.75 - (def + mdef * 0.1)) * 4 * attr * rand;
    return Math.max(0, Math.floor(raw));
  }

  function calcPetMagic(petInt, def, mdef) {
    const attr = 1.0;
    const rand = 1.0;
    const raw = (petInt * 1.75 - (mdef + def * 0.1)) * 4 * attr * rand;
    return Math.max(0, Math.floor(raw));
  }

  // --------------------------
  // 最低ライン（確実に1以上：最悪乱数0.9、属性1.0）
  // --------------------------
  function minPetAtkLine(def, mdef) {
    const r = 0.9, a = 1.0;
    const need = (1 / (4 * r * a)) + (def + mdef * 0.1);
    return Math.ceil(need / 1.75);
  }
  function minPetIntLine(def, mdef) {
    const r = 0.9, a = 1.0;
    const need = (1 / (4 * r * a)) + (mdef + def * 0.1);
    return Math.ceil(need / 1.75);
  }

  function updateMinLine() {
    const type = getPetAttackType();
    const def  = num(defEl.value, 0);
    const mdef = num(mdefEl.value, 0);

    if (type === "物理") {
      minlineEl.textContent = `確実に1以上出る最低ATK：${minPetAtkLine(def, mdef)}`;
    } else if (type === "魔法") {
      minlineEl.textContent = `確実に1以上出る最低INT：${minPetIntLine(def, mdef)}`;
    } else {
      minlineEl.textContent = "最低ライン：---";
    }
  }

  // --------------------------
  // 並び順：このページでは「ペット/敵」両方を同じ並び順に
  // （後で共通JS化する時も移行しやすい）
  // --------------------------
  function snapshotOptions(selectEl) {
    return Array.from(selectEl.options).map(o => ({
      value: o.value,
      text: o.textContent || "",
      dataset: { ...o.dataset },
      isPlaceholder: o.value === "" || (o.textContent || "").includes("選択してください"),
    }));
  }

  const petBase  = snapshotOptions(petSelectEl);
  const enemyBase = snapshotOptions(enemySelectEl);

  function rebuild(selectEl, items) {
    const current = selectEl.value;
    selectEl.innerHTML = "";

    items.forEach(it => {
      const o = document.createElement("option");
      o.value = it.value;
      o.textContent = it.text;
      for (const [k, v] of Object.entries(it.dataset)) o.dataset[k] = v;
      selectEl.appendChild(o);
    });

    if (items.some(it => it.value === current)) selectEl.value = current;
  }

  function sortItems(baseItems, mode) {
    const placeholder = baseItems.filter(x => x.isPlaceholder);
    const list = baseItems.filter(x => !x.isPlaceholder);

    if (mode === "id-asc") {
      list.sort((a, b) => num(a.dataset.id) - num(b.dataset.id));
    } else if (mode === "name-asc") {
      list.sort((a, b) => (a.dataset.name || "").localeCompare(b.dataset.name || "", "ja"));
    } else if (mode === "name-desc") {
      list.sort((a, b) => (b.dataset.name || "").localeCompare(a.dataset.name || "", "ja"));
    }
    return [...placeholder, ...list];
  }

  function applySortBoth() {
    const mode = orderEl.value || "id-asc";
    rebuild(petSelectEl, sortItems(petBase, mode));
    rebuild(enemySelectEl, sortItems(enemyBase, mode));

    // 並び替え後の表示更新
    updatePetTypeFromSelection();
    onTargetChanged();
    updateMinLine();
  }

  orderEl.addEventListener("change", applySortBoth);
  window.addEventListener("pageshow", applySortBoth);

  // --------------------------
  // イベント
  // --------------------------
  petSelectEl.addEventListener("change", () => {
    updatePetTypeFromSelection();
    updateMinLine();
  });

  enemySelectEl.addEventListener("change", () => {
    levelEl.value = 1;
    onTargetChanged();
    updateMinLine();
  });

  levelEl.addEventListener("input", () => {
    recalcTargetStats();
    updateMinLine();
  });

  calcBtn.addEventListener("click", () => {
    const type = getPetAttackType();
    const def  = num(defEl.value, 0);
    const mdef = num(mdefEl.value, 0);

    let dmg = 0;
    if (type === "物理") {
      dmg = calcPetPhysical(num(petAtkEl.value, 0), def, mdef);
    } else if (type === "魔法") {
      dmg = calcPetMagic(num(petIntEl.value, 0), def, mdef);
    } else {
      dmg = 0;
    }

    resultEl.textContent = dmg;
    updateMinLine();
  });

  // --------------------------
  // 初期化
  // --------------------------
  applySortBoth();
  updatePetTypeFromSelection();
  onTargetChanged();
  updateMinLine();
});
</script>
