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

  h2 { margin: 16px 0 10px; }
  hr { margin: 14px 0; opacity: .4; }

  .row {
    display:flex;
    gap:12px;
    align-items:center;
    flex-wrap:wrap;
    margin: 8px 0;
  }

  .note { opacity: .8; }

  /* ラベル内の並びを安定化 */
  label {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 10px;
    padding: 6px 10px;
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 10px;
    background: rgba(0,0,0,.02);
  }

  input[type="number"], select {
    border: 1px solid rgba(0,0,0,.18);
    border-radius: 10px;
    padding: 6px 10px;
    background: #fff;
  }

  input[type="number"] {
    width: 84px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  select {
    min-width: 160px;
    width: 100%;
    max-width: 360px;
  }

  /* グリッド（PCは複数列、スマホは自動で落ちる） */
  .grid, .protein-grid, .equip-grid {
    display:grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
    margin: 6px 0 8px;
  }

  /* 装備だけ少し広め */
  .equip-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .equip-grid label {
    justify-content:flex-start;
  }

  .equip-grid select {
    flex: 1;
    max-width: none;
  }

  .equip-grid .lv {
    opacity:.65;
    margin-left: 8px;
  }

  /* ボタン */
  button {
    border: 1px solid rgba(0,0,0,.18);
    border-radius: 12px;
    padding: 8px 12px;
    background: #fff;
    cursor: pointer;
  }
  button:hover { background: rgba(0,0,0,.04); }

  /* 表 */
  .stats-table {
    width:100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 12px;
  }
  .stats-table th, .stats-table td {
    border: 1px solid rgba(0,0,0,0.12);
    padding: 8px 10px;
  }
  .stats-table th {
    background: rgba(0,0,0,0.05);
    text-align: left;
  }
  .stats-table td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .stats-table tr.active { background: rgba(255, 230, 150, 0.25); }

  /* エラー */
  .error {
    margin: 8px 0 0;
    color: #b00020;
    white-space: pre-wrap;
    display: none;
  }
  .error.is-visible { display: block; }

  /* スマホ：さらにタップしやすく */
  @media (max-width: 520px) {
    input[type="number"] { width: 96px; }
    label { padding: 8px 12px; }
    button { width: 100%; }
  }
</style>

<script src="/js/status-sim.js"></script>
