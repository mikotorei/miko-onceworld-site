---
title: "命中回避計算ツール"
---
<div class="tool-box">

  <div class="tool-row">
    <label for="enemy-select">敵モンスター選択：</label>
    {{< monster_select id="enemy-select" role="enemy" >}}
  </div>

  <div class="tool-row">
    <label for="enemy-level">敵レベル：</label>
    <input type="number" id="enemy-level" value="1" min="1">
  </div>

  <div class="tool-row">
    <label for="monster-order">並び順：</label>
    <select id="monster-order">
      <option value="id-asc" selected>図鑑番号（昇順）</option>
      <option value="name-asc">名前（昇順）</option>
      <option value="name-desc">名前（降順）</option>
    </select>
  </div>

  <div class="tool-row">
    <button id="calc-btn" type="button">計算する</button>
  </div>

  <hr>

<section class="tool-result">
    <h2>計算結果</h2>
    <p>敵LUK：<strong id="enemy-luk">---</strong></p>
    <p>命中に必要な攻撃側LUK：<strong id="need-hit">---</strong></p>
    <p>回避が発生する防御側LUK：<strong id="need-evade">---</strong></p>
    <p>ほぼ完全回避の防御側LUK：<strong id="need-perfect">---</strong></p>
</section>

</div>

{{< rawhtml >}}
<script src="/js/luk-calc.js"></script>
{{< /rawhtml >}}

{{< rawhtml >}}
<script src="/js/monster-order.js"></script>
{{< /rawhtml >}}
