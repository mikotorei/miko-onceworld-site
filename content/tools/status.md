---
title: "主人公ステータス・シミュレーター"
---

<div class="sim">
  <h2>主人公 基礎ステータス</h2>

  <div class="grid">
    <label>vit <input id="base_vit" type="number" inputmode="numeric" value="0" /></label>
    <label>spd <input id="base_spd" type="number" inputmode="numeric" value="0" /></label>
    <label>atk <input id="base_atk" type="number" inputmode="numeric" value="0" /></label>
    <label>int <input id="base_int" type="number" inputmode="numeric" value="0" /></label>
    <label>def <input id="base_def" type="number" inputmode="numeric" value="0" /></label>
    <label>mdef <input id="base_mdef" type="number" inputmode="numeric" value="0" /></label>
    <label>luk <input id="base_luk" type="number" inputmode="numeric" value="0" /></label>
    <label>mov <input id="base_mov" type="number" inputmode="numeric" value="0" /></label>
  </div>

  <hr />

  <h2>プロテイン</h2>
  <div class="row">
    <label>所持数
      <input id="proteinCount" type="number" inputmode="numeric" min="0" value="0" />
    </label>
    <div class="hint">※ mov以外に補正が入ります</div>
  </div>

  <hr />

  <h2>装備</h2>

  <div class="equip-grid">
    <label>武器 <select id="select_weapon"></select></label>
    <label>頭 <select id="select_head"></select></label>
    <label>体 <select id="select_body"></select></label>
    <label>腕 <select id="select_hands"></select></label>
    <label>足 <select id="select_feet"></select></label>
    <label>盾 <select id="select_shield"></select></label>
  </div>

  <div class="row">
    <button id="recalcBtn" type="button">再計算</button>
    <button id="resetBtn" type="button">基礎ステを0に戻す</button>
    <button id="clearSaveBtn" type="button">保存をクリア</button>
  </div>

  <hr />

  <h2>結果（表）</h2>

  <div class="note" id="proteinInfo"></div>

  <table class="stats-table">
    <thead>
      <tr>
        <th>ステ</th>
        <th>基礎（＋プロテイン）</th>
        <th>装備</th>
        <th>合計</th>
      </tr>
    </thead>
    <tbody id="statsTbody"></tbody>
  </table>
</div>

<style>
  .sim { max-width: 980px; }
  .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin: 8px 0; }
  .hint { opacity: .75; font-size: .95em; }
  .note { margin: 8px 0 12px; opacity: .85; }

  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
  .grid label { display:flex; justify-content:space-between; gap: 8px; align-items:center; }
  .grid input { width: 72px; }

  #proteinCount { width: 96px; }

  .equip-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin: 8px 0; }
  .equip-grid label { display:flex; justify-content:space-between; align-items:center; gap: 10px; }
  .equip-grid select { min-width: 140px; }

  .stats-table { width:100%; border-collapse: collapse; }
  .stats-table th, .stats-table td { border: 1px solid rgba(0,0,0,0.15); padding: 8px 10px; }
  .stats-table th { background: rgba(0,0,0,0.05); text-align: left; }
  .stats-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .stats-table tr.active { background: rgba(255, 230, 150, 0.35); }
</style>

<script src="/js/status-sim.js"></script>
