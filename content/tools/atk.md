---
title: "与ダメージ計算"
---

<p>与ダメージを計算するツールです。</p>

<div id="atk-calc">
  <!-- ここに計算UIが入ります -->
</div>
<hr>

<section class="atk-tool">
  <h2>与ダメージ計算</h2>

  <div class="atk-form">
    <label>
      攻撃力（ATK）
      <input type="number" id="atk-value" min="0" placeholder="例：120">
    </label>

    <label>
      防御力（DEF）
      <input type="number" id="def-value" min="0" placeholder="例：80">
    </label>

    <label>
      スキル倍率（%）
      <input type="number" id="skill-rate" min="0" placeholder="例：150">
    </label>

    <button id="calc-damage">計算する</button>
  </div>

  <div class="atk-result">
    <p>与ダメージ：</p>
    <p id="damage-result">---</p>
  </div>
</section>
