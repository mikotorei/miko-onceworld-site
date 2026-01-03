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
  <span>並び順：</span>
  <label><input type="radio" name="monster-sort" value="id" checked> 図鑑番号</label>
  <label><input type="radio" name="monster-sort" value="kana"> 五十音</label>
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
    <p>対象モンスターの体力（レベル反映）：<span id="vit-display">---</span></p>
    <p>与ダメージ：<span id="result">---</span></p>
    <p id="minline">最低ライン：---</p>
</section>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const vitDisplayEl = document.getElementById("vit-display");
  const selectEl  = document.getElementById("monster-select");
  const levelEl   = document.getElementById("monster-level");
  const atkEl     = document.getElementById("atk");
  const intEl     = document.getElementById("int");
  const defEl     = document.getElementById("def");
  const mdefEl    = document.getElementById("mdef");
  const resultEl  = document.getElementById("result");
  const minlineEl = document.getElementById("minline");
  const calcBtn   = document.getElementById("calc-btn");

  // 要素不足なら何もしない（ページが壊れないように）
  if (!selectEl || !levelEl || !atkEl || !intEl || !defEl || !mdefEl || !resultEl || !minlineEl || !calcBtn || !vitDisplayEl) return;
  
  // モンスター基礎値（Lv1）
  let baseDef = 0;
  let baseMdef = 0;
  let baseVit = 0;

  // レベル補正：基礎×(1+(Lv-1)*0.1) を切り捨て
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

  // value="def|mdef" から基礎DEF/MDEFを読む
  function loadMonsterBases() {
  const opt = selectEl.options[selectEl.selectedIndex];
  const v = (opt?.value || "").trim(); // "def|mdef|vit"

  if (!v || !v.includes("|")) {
    baseDef = 0;
    baseMdef = 0;
    baseVit = 0;
    return;
  }

  const parts = v.split("|");
  baseDef = Number(parts[0] || 0);
  baseMdef = Number(parts[1] || 0);
  baseVit = Number(parts[2] || 0);
}

  function recalcMonsterStats() {
  const lv = getLv();
  if (!baseDef && !baseMdef && !baseVit) return;

  const def  = scaleByLevel(baseDef, lv);
  const mdef = scaleByLevel(baseMdef, lv);
  const vit  = scaleByLevel(baseVit, lv);
  const vitDisplayValue = vit * 18 + 100;

  defEl.value = def;
  mdefEl.value = mdef;
  vitDisplayEl.textContent = vitDisplayValue;
}

  // 正式ダメージ（乱数は後回し：r=1.0で表示）
  function calcPhysicalDamage(atk, def, mdef, r = 1.0) {
    const raw = (atk * 1.75 - (def + mdef / 10)) * 4 * r;
    return Math.max(0, Math.floor(raw));
  }
  function calcMagicDamage(intv, def, mdef, r = 1.0) {
    const raw = (intv * 1.26 - (mdef + def / 10)) * 4 * r;
    return Math.max(0, Math.floor(raw));
  }

  // 「確実に通る最低ライン」：最悪乱数 r=0.9 でも 1以上
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
  // --- モンスター並び替え（図鑑番号 / 五十音） ---
function sortMonsterOptions(mode) {
  const currentValue = selectEl.value;

  // 先頭の「--選択してください--」は残す
  const placeholder = selectEl.options[0];
  const opts = Array.from(selectEl.options).slice(1);

  opts.sort((a, b) => {
    if (mode === "id") {
      const ai = Number(a.dataset.id || 0);
      const bi = Number(b.dataset.id || 0);
      return ai - bi;
    } else {
      const at = (a.dataset.title || "").trim();
      const bt = (b.dataset.title || "").trim();
      return at.localeCompare(bt, "ja");
    }
  });

  // 作り直し
  selectEl.innerHTML = "";
  selectEl.appendChild(placeholder);
  opts.forEach(o => selectEl.appendChild(o));

  // 選択状態を復元
  selectEl.value = currentValue;
}

// 並び順切替イベント
document.querySelectorAll('input[name="monster-sort"]').forEach(r => {
  r.addEventListener("change", () => {
    sortMonsterOptions(r.value);

    // 並べ替え後、選択が維持されていれば表示更新
    onMonsterOrLevelChanged();
  });
});
  }

// イベント
selectEl.addEventListener("change", () => {
  levelEl.value = 1; // モンスター切替でLv1に戻す（不要なら削除OK）
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
  function sortMonsterOptions(mode) {
  const currentValue = selectEl.value;

  // 先頭の「--選択してください--」は残す
  const placeholder = selectEl.options[0];
  const opts = Array.from(selectEl.options).slice(1);

  opts.sort((a, b) => {
    if (mode === "id") {
      const ai = Number(a.dataset.id || 0);
      const bi = Number(b.dataset.id || 0);
      return ai - bi;
    } else {
      // 五十音：タイトルで比較（日本語ロケール）
      const at = (a.dataset.title || "").trim();
      const bt = (b.dataset.title || "").trim();
      return at.localeCompare(bt, "ja");
    }
  });

  // 一旦中身を作り直す
  selectEl.innerHTML = "";
  selectEl.appendChild(placeholder);
  opts.forEach(o => selectEl.appendChild(o));

  // 選択状態を復元（同じvalueがあれば）
  selectEl.value = currentValue;
}

// 並び順切替イベント
document.querySelectorAll('input[name="monster-sort"]').forEach(r => {
  r.addEventListener("change", () => {
    sortMonsterOptions(r.value);

    // 並べ替え後に選択が維持されていれば、表示も更新
    onMonsterOrLevelChanged();
  });
});

// 初期化
  sortMonsterOptions("id");
  onMonsterOrLevelChanged();
  updateMinLine();
});
</script>
