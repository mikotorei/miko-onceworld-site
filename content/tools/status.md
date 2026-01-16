---
title: "主人公ステータス・シミュレーター"
---

<div class="sim">

  <h2>主人公 振り分けポイント</h2>

  <div class="row">
    <label>total <input id="basePointTotal" type="number" min="0" value="0"></label>
    <div id="basePointInfo" class="note"></div>
  </div>

  <div class="grid">
    <label>vit <input id="base_vit" type="number" min="0" value="0"></label>
    <label>spd <input id="base_spd" type="number" min="0" value="0"></label>
    <label>atk <input id="base_atk" type="number" min="0" value="0"></label>
    <label>int <input id="base_int" type="number" min="0" value="0"></label>
    <label>def <input id="base_def" type="number" min="0" value="0"></label>
    <label>mdef <input id="base_mdef" type="number" min="0" value="0"></label>
    <label>luk <input id="base_luk" type="number" min="0" value="0"></label>
  </div>

  <hr>

  <h2>プロテイン</h2>

  <div class="row">
    <label>shaker <input id="shakerCount" type="number" min="0" value="0"></label>
  </div>

  <div class="protein-grid">
    <label>vit <input id="protein_vit" type="number" min="0" value="0"></label>
    <label>spd <input id="protein_spd" type="number" min="0" value="0"></label>
    <label>atk <input id="protein_atk" type="number" min="0" value="0"></label>
    <label>int <input id="protein_int" type="number" min="0" value="0"></label>
    <label>def <input id="protein_def" type="number" min="0" value="0"></label>
    <label>mdef <input id="protein_mdef" type="number" min="0" value="0"></label>
    <label>luk <input id="protein_luk" type="number" min="0" value="0"></label>
  </div>

  <hr>

  <h2>装備</h2>

  <div class="equip-grid">
    <label>weapon
      <select id="select_weapon"></select>
      <span class="lv">lv</span><input id="level_weapon" type="number" min="0" value="0">
    </label>

    <label>head
  <select id="select_head"></select>
      <span class="lv">lv</span><input id="level_head" type="number" min="0" value="0">
    </label>

    <label>body
  <select id="select_body"></select>
      <span class="lv">lv</span><input id="level_body" type="number" min="0" value="0">
    </label>

    <label>hands
  <select id="select_hands"></select>
      <span class="lv">lv</span><input id="level_hands" type="number" min="0" value="0">
    </label>

    <label>feet
  <select id="select_feet"></select>
      <span class="lv">lv</span><input id="level_feet" type="number" min="0" value="0">
    </label>

    <label>shield
  <select id="select_shield"></select>
      <span class="lv">lv</span><input id="level_shield" type="number" min="0" value="0">
    </label>
  </div>

  <div class="row">
    <button id="recalcBtn" type="button">recalc</button>
    <button id="resetBtn" type="button">reset</button>
    <button id="clearSaveBtn" type="button">clear</button>
  </div>

  <div class="error" id="errBox"></div>

  <hr>

  <h2>結果</h2>

  <table class="stats-table">
    <thead>
      <tr>
        <th>stat</th>
        <th>base(+protein)</th>
        <th>equip</th>
        <th>total</th>
      </tr>
    </thead>
    <tbody id="statsTbody"></tbody>
  </table>

</div>

<style>
  .sim { max-width: 980px; }
  .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin: 8px 0; }
  .note { opacity: .85; }

  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
  .grid label { display:flex; justify-content:space-between; gap: 8px; align-items:center; }
  .grid input { width: 72px; }

  #basePointTotal, #shakerCount { width: 96px; }

  .protein-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin: 6px 0 8px; }
  .protein-grid label { display:flex; justify-content:space-between; align-items:center; gap: 10px; }
  .protein-grid input { width: 96px; }

  .equip-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; margin: 8px 0; }
  .equip-grid label { display:flex; justify-content:space-between; align-items:center; gap: 10px; }
  .equip-grid select { min-width: 140px; }
  .equip-grid .lv { opacity:.7; }
  .equip-grid input[type="number"] { width: 72px; }

  .stats-table { width:100%; border-collapse: collapse; }
  .stats-table th, .stats-table td { border: 1px solid rgba(0,0,0,0.15); padding: 8px 10px; }
  .stats-table th { background: rgba(0,0,0,0.05); text-align: left; }
  .stats-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .stats-table tr.active { background: rgba(255, 230, 150, 0.35); }

  .error { margin: 8px 0 0; color: #b00020; white-space: pre-wrap; display: none; }
  .error.is-visible { display: block; }
</style>

<script src="/js/status-sim.js"></script>
