---
title: "主人公ステータス・シミュレーター"
---

<div class="sim">

<h2>主人公 振り分けポイント</h2>

<div class="row">
  <label class="pill">合計 <input id="basePointTotal" type="number" min="0" value="0"></label>
  <div id="basePointInfo" class="note"></div>
</div>

<div class="grid">
  <label class="pill">vit <input id="base_vit" type="number" min="0" value="0"></label>
  <label class="pill">spd <input id="base_spd" type="number" min="0" value="0"></label>
  <label class="pill">atk <input id="base_atk" type="number" min="0" value="0"></label>
  <label class="pill">int <input id="base_int" type="number" min="0" value="0"></label>
  <label class="pill">def <input id="base_def" type="number" min="0" value="0"></label>
  <label class="pill">mdef <input id="base_mdef" type="number" min="0" value="0"></label>
  <label class="pill">luk <input id="base_luk" type="number" min="0" value="0"></label>
</div>

<hr>

<h2>結果</h2>

<table class="stats-table">
  <thead>
    <tr>
      <th>ステ</th>
      <th>基礎＋プロテイン</th>
      <th>装備</th>
      <th>合計</th>
    </tr>
  </thead>
  <tbody id="statsTbody"></tbody>
</table>

<div class="row buttons">
  <button id="recalcBtn" type="button">再計算</button>
  <button id="resetBtn" type="button">振り分けリセット</button>
  <button id="clearSaveBtn" type="button">保存クリア</button>
</div>

<div class="error" id="errBox"></div>

<hr>

<details class="fold" id="foldProtein">
<summary>プロテイン</summary>

<div class="row">
  <label class="pill">シェイカー <input id="shakerCount" type="number" min="0" value="0"></label>
</div>

<div class="grid">
  <label class="pill">vit <input id="protein_vit" type="number" min="0" value="0"></label>
  <label class="pill">spd <input id="protein_spd" type="number" min="0" value="0"></label>
  <label class="pill">atk <input id="protein_atk" type="number" min="0" value="0"></label>
  <label class="pill">int <input id="protein_int" type="number" min="0" value="0"></label>
  <label class="pill">def <input id="protein_def" type="number" min="0" value="0"></label>
  <label class="pill">mdef <input id="protein_mdef" type="number" min="0" value="0"></label>
  <label class="pill">luk <input id="protein_luk" type="number" min="0" value="0"></label>
</div>

</details>

<details class="fold" id="foldEquip">
<summary>装備</summary>

<div class="equip-grid">
  <label class="equip-row">
    <span class="slot">武器</span>
    <select id="select_weapon"></select>
    <span class="lv">+</span><input id="level_weapon" type="number" min="0" value="0">
  </label>

  <label class="equip-row">
    <span class="slot">頭</span>
    <select id="select_head"></select>
    <span class="lv">+</span><input id="level_head" type="number" min="0" value="0">
  </label>

  <label class="equip-row">
    <span class="slot">体</span>
    <select id="select_body"></select>
    <span class="lv">+</span><input id="level_body" type="number" min="0" value="0">
  </label>

  <label class="equip-row">
    <span class="slot">腕</span>
    <select id="select_hands"></select>
    <span class="lv">+</span><input id="level_hands" type="number" min="0" value="0">
  </label>

  <label class="equip-row">
    <span class="slot">足</span>
    <select id="select_feet"></select>
    <span class="lv">+</span><input id="level_feet" type="number" min="0" value="0">
  </label>

  <label class="equip-row">
    <span class="slot">盾</span>
    <select id="select_shield"></select>
    <span class="lv">+</span><input id="level_shield" type="number" min="0" value="0">
  </label>
</div>

</details>

</div>

<style>
  .sim { max-width: 980px; }
  hr { margin: 14px 0; opacity: .4; }

  .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin: 8px 0; }
  .note { opacity: .8; }

  .pill{
    display:flex; align-items:center; justify-content:space-between;
    gap:10px; padding: 6px 10px;
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 12px;
    background: rgba(0,0,0,.02);
  }

  input[type="number"], select{
    border: 1px solid rgba(0,0,0,.18);
    border-radius: 12px;
    padding: 6px 10px;
    background: #fff;
  }
  input[type="number"]{
    width: 84px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  select{
    min-width: 160px;
    width: 100%;
    max-width: 420px;
  }

  .grid{
    display:grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap:10px;
    margin: 6px 0 8px;
  }

  .fold{
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 14px;
    padding: 8px 10px;
    background: rgba(0,0,0,.01);
    margin: 10px 0;
  }
  .fold > summary{
    cursor: pointer;
    user-select: none;
    font-weight: 600;
    padding: 4px 2px;
  }
  .fold[open] > summary { margin-bottom: 8px; }

  .equip-grid{ display:grid; grid-template-columns: 1fr; gap:10px; margin: 6px 0 8px; }
  .equip-row{
    display:flex; align-items:center; gap:10px;
    padding: 8px 10px;
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 12px;
    background: rgba(0,0,0,.02);
  }
  .equip-row .slot{ width: 64px; opacity: .8; }
  .equip-row select{ flex: 1; max-width: none; }
  .equip-row .lv{ opacity: .65; }
  .equip-row input[type="number"]{ width: 76px; }

  .buttons{ margin-top: 10px; }
  button{
    border: 1px solid rgba(0,0,0,.18);
    border-radius: 12px;
    padding: 8px 12px;
    background: #fff;
    cursor: pointer;
  }
  button:hover{ background: rgba(0,0,0,.04); }

  .stats-table{
    width:100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 12px;
  }
  .stats-table th, .stats-table td{
    border: 1px solid rgba(0,0,0,0.12);
    padding: 8px 10px;
  }
  .stats-table th{ background: rgba(0,0,0,0.05); text-align:left; }
  .stats-table td.num{ text-align:right; font-variant-numeric: tabular-nums; }
  .stats-table tr.active{ background: rgba(255, 230, 150, 0.25); }

  .error{ margin: 8px 0 0; color: #b00020; white-space: pre-wrap; display: none; }
  .error.is-visible{ display: block; }

  @media (max-width: 520px){
    input[type="number"]{ width: 96px; }
    .equip-row .slot{ width: 56px; }
    .equip-row input[type="number"]{ width: 86px; }
    button{ width: 100%; }
  }
</style>

<script src="/js/status-sim.js"></script>
