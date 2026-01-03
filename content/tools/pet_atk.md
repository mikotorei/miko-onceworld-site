---
title: "ペット与ダメージ計算"
---

ペットの与ダメージを計算します（攻撃値は手入力）。  
※ペットはモンスター一覧と同じ候補から選びます。

<hr>

<section class="atk-tool">
  <h2>ペット与ダメージ計算</h2>

  <div class="atk-form">

  <div class="form-row">
      <label for="pet-select">ペット選択：</label>
      {{< monster_select_custom id="pet-select" >}}
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
      <span>並び順：</span>
      <label><input type="radio" name="sort-mode" value="id" checked> 図鑑番号</label>
      <label><input type="radio" name="sort-mode" value="kana"> 五十音</label>
  </div>

  <div class="form-row">
      <label for="monster-select">攻撃対象モンスター：</label>
      {{< monster_select_custom id="monster-select" >}}
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

  <button id="calc-btn">計算する</button>
  </div>

  <div class="atk-result">
  <p>与ダメージ：<span id="result">---</span></p>
  <p id="minline">最低ライン：---</p>
  </div>
</section>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const petSelectEl = document.getElementById("pet-select");
  const monsterSelectEl = document.getElementById("monster-select");
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

  if (!petSelectEl || !monsterSelectEl || !levelEl ||
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

  // option.value = "def|mdef|vit|attack_type"
  function parseMonsterOption(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    const v = (opt?.value || "").trim();
    if (!v.includes("|")) return null;

    const [defStr, mdefStr, vitStr, atkType] = v.split("|");
    return {
      def: Number(defStr || 0),
      mdef: Number(mdefStr || 0),
      vit: Number(vitStr || 0),
      attackType: (atkType || "").trim() // "物理" or "魔法"（ペット判定にも使用）
    };
  }

  // --- 対象モンスター：DEF/MDEF/VIT 自動反映 ---
  let baseDef = 0, baseMdef = 0, baseVit = 0;

  function loadTargetBases() {
    const data = parseMonsterOption(monsterSelectEl);
    if (!data) {
      baseDef = 0; baseMdef = 0; baseVit = 0;
      return;
    }
    baseDef = data.def;
    baseMdef = data.mdef;
    baseVit = data.vit;
  }

  function recalcTargetStats() {
    const lv = getLv();
    if (!baseDef && !baseMdef && !baseVit) return;

    const def = scaleByLevel(baseDef, lv);
    const mdef = scaleByLevel(baseMdef, lv);
    const vit = scaleByLevel(baseVit, lv);

    defEl.value = def;
    mdefEl.value = mdef;
    vitDisplayEl.textContent = vit * 18 + 100; // 既存仕様
  }

  function onTargetChanged() {
    loadTargetBases();
    recalcTargetStats();
  }

  // --- ペット：攻撃タイプで入力欄を切替 ---
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
    function updateMinLine() {
    const petData = parseMonsterOption(petSelectEl);
    const type = petData ? petData.attackType : "";

    const def = Number(defEl.value || 0);
    const mdef = Number(mdefEl.value || 0);

    if (type === "物理") {
    minlineEl.textContent = `確実に1以上出る最低ATK：${minPetAtkLine(def, mdef)}`;
  } else if (type === "魔法") {
    minlineEl.textContent = `確実に1以上出る最低INT：${minPetIntLine(def, mdef)}`;
  } else {
    minlineEl.textContent = "最低ライン：---";
  }
}
  }

  function updatePetTypeFromSelection() {
    const data = parseMonsterOption(petSelectEl);
    const type = data ? data.attackType : "";
    setPetType(type);
  }

  // --- 並び順：1つの切替で両方に反映 ---
  function sortOptions(selectEl, mode) {
    const currentValue = selectEl.value;

    const placeholder = selectEl.options[0];
    const opts = Array.from(selectEl.options).slice(1);

    opts.sort((a, b) => {
      if (mode === "id") {
        return Number(a.dataset.id || 0) - Number(b.dataset.id || 0);
      } else {
        const at = (a.dataset.title || "").trim();
        const bt = (b.dataset.title || "").trim();
        return at.localeCompare(bt, "ja");
      }
    });

    selectEl.innerHTML = "";
    selectEl.appendChild(placeholder);
    opts.forEach(o => selectEl.appendChild(o));

    selectEl.value = currentValue;
  }

  function applySortToBoth(mode) {
    sortOptions(petSelectEl, mode);
    sortOptions(monsterSelectEl, mode);
    // 並べ替え後に表示再反映
    updatePetTypeFromSelection();
    onTargetChanged();
  }

  document.querySelectorAll('input[name="sort-mode"]').forEach(r => {
    r.addEventListener("change", () => applySortToBoth(r.value));
  });

  // --- ペット：正式ダメージ式（平均値表示） ---
  // 乱数：0.9〜1.1 → 現在は 1.0 固定
  // 属性補正：未実装 → 1.0 固定
  // 最低保証：0

  function calcPetPhysical(petAtk, def, mdef) {
  const attr = 1.0;   // 属性補正（後回し）
  const rand = 1.0;   // 乱数（後回し）

  const raw =
    (petAtk * 1.75 - (def + mdef * 0.1)) *
    4 *
    attr *
    rand;

  return Math.max(0, Math.floor(raw));
}

function calcPetMagic(petInt, def, mdef) {
  const attr = 1.0;   // 属性補正（後回し）
  const rand = 1.0;   // 乱数（後回し）

  const raw =
    (petInt * 1.75 - (mdef + def * 0.1)) *
    4 *
    attr *
    rand;

  return Math.max(0, Math.floor(raw));
}
  // --- 最低ライン（確実に1以上：最悪乱数0.9、属性1.0） ---
  function minPetAtkLine(def, mdef) {
  const r = 0.9;   // 最悪乱数
  const a = 1.0;   // 属性補正（未実装なので等倍）
  const need = (1 / (4 * r * a)) + (def + mdef * 0.1);
  return Math.ceil(need / 1.75);
}

  function minPetIntLine(def, mdef) {
  const r = 0.9;
  const a = 1.0;
  const need = (1 / (4 * r * a)) + (mdef + def * 0.1);
  return Math.ceil(need / 1.75);
}

  // --- イベント ---
  petSelectEl.addEventListener("change", () => {
  updatePetTypeFromSelection();
  updateMinLine();
});

  monsterSelectEl.addEventListener("change", () => {
  levelEl.value = 1;
  onTargetChanged();
  updateMinLine();
});

  levelEl.addEventListener("input", () => {
  recalcTargetStats();
  updateMinLine();
});

  calcBtn.addEventListener("click", () => {
    const petData = parseMonsterOption(petSelectEl);
    if (!petData) {
      resultEl.textContent = 0;
      return;
    }

    const type = petData.attackType;
    const def = Number(defEl.value || 0);
    const mdef = Number(mdefEl.value || 0);

    let dmg = 0;
    if (type === "物理") {
      dmg = calcPetPhysical(Number(petAtkEl.value || 0), def, mdef);
    } else if (type === "魔法") {
      dmg = calcPetMagic(Number(petIntEl.value || 0), def, mdef);
    } else {
      dmg = 0;
    }

    resultEl.textContent = dmg;
  });

  // --- 初期化 ---
  applySortToBoth("id");
  updatePetTypeFromSelection();
  onTargetChanged();
  updateMinLine();
});
</script>
