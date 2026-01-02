---
title: "与ダメージ計算"
description: "与ダメージを計算するツールです。"
---
<hr>

<section class="atk-tool">
  <h2>与ダメージ計算</h2>
  <h2>攻撃対象モンスター</h2>

<div class="form-row">
  <label for="monster-select">モンスター選択：</label>
  {{< monster_select >}}
</div>
  モンスターレベル：
  <input
    type="number"
    id="monster-level"
    value="1"
    min="1"
  >
</label>

</label>
  <div class="atk-form">
    <label>
      攻撃力（ATK）
      <input type="number" id="atk" value="100" min="0" placeholder="例：120">
    </label>
    <label>
      防御力（DEF）
      <input type="number" id="def" value="30" min="0" placeholder="例：80">
    </label>
    <button id="calc-btn">計算する</button>
  </div>
  <div class="atk-result">
    <p>与ダメージ：<span id="result">---</span></p>
  </div>
</section>

<script src="/js/atk-calc.js"></script>
<script>
document.getElementById("calc-btn").addEventListener("click", function () {
  const atk = Number(document.getElementById("atk").value);
  const def = Number(document.getElementById("def").value);

  const damage = Math.max(0, atk - def ));

  document.getElementById("result").textContent = damage;
});
  document.getElementById("monster-select").addEventListener("change", function () {
  const selected = this.options[this.selectedIndex];
  const defValue = selected.value;

  if (defValue !== "") {
    document.getElementById("def").value = defValue;
  }
});
  let baseDef = 0;

function recalcMonsterDef() {
  const level = Number(document.getElementById("monster-level").value);
  if (baseDef === 0) return;

  // ステータス上昇の計算式
  const calculatedDef = Math.floor(baseDef * ( 1 + (level - 1 ) * 0.1)) ;
  document.getElementById("def").value = calculatedDef;
}

document.getElementById("monster-select").addEventListener("change", function () {
  const selected = this.options[this.selectedIndex];
  baseDef = Number(selected.dataset.def || 0);

  document.getElementById("monster-level").value = 1;
  recalcMonsterDef();
});

document.getElementById("monster-level").addEventListener("input", function () {
  recalcMonsterDef();
});
</script>
