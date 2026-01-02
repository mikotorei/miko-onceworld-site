---
title: "与ダメージ計算"
description: "与ダメージを計算するツールです。"
---
<hr>

<section class="atk-tool">
  <h2>与ダメージ計算</h2>
  <h2>攻撃対象モンスター</h2>

<label>
  モンスター選択：
{{< monster_select >}}
  
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
    <label>
      スキル倍率（%）
      <input type="number" id="rate" value="100" min="0" placeholder="例：150">
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
  const rate = Number(document.getElementById("rate").value);

  const damage = Math.max(0, Math.floor((atk - def) * (rate / 100)));

  document.getElementById("result").textContent = damage;
});
  document.getElementById("monster-select").addEventListener("change", function () {
  const selected = this.options[this.selectedIndex];
  const defValue = selected.value;

  if (defValue !== "") {
    document.getElementById("def").value = defValue;
  }
});
</script>
