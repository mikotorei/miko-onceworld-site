---
title: "被ダメージ計算"
---

<p>被ダメージを計算するツールです。</p>

<div class="tool-box">

  <div class="tool-row">
    <label for="enemy-select">敵モンスター選択：</label>
    {{< monster_select_enemy >}}
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

  <hr>

  <div class="tool-row">
    <label for="self-def">自DEF：</label>
    <input type="number" id="self-def" value="0" min="0" placeholder="例：80">
  </div>

  <div class="tool-row">
    <label for="self-mdef">自MDEF：</label>
    <input type="number" id="self-mdef" value="0" min="0" placeholder="例：60">
  </div>

  <div class="tool-row">
    <button id="calc-btn" type="button">計算する</button>
  </div>

  <hr>

  <section class="tool-result">
<h2>計算結果</h2>

<p>
  敵の攻撃タイプ：
    <strong id="enemy-attack-type">---</strong>
</p>

<p>
  最終被ダメージ：
    <strong id="result-dmg">---</strong>
    <span class="note">（最低保証：1）</span>
  </p>

<p>
  被ダメを一桁(1〜9)に抑えるには：
    <strong id="need-label">必要DEF</strong>
    <strong id="result-need">---</strong>
  </p>
  </section>

</div>

<script src="{{ "js/def-calc.js" | relURL }}"></script>
