// static/js/def-calc.js（新規 or 全文置き換え）
(() => {
  const $enemySelect = document.getElementById("enemy-select");
  const $enemyLevel = document.getElementById("enemy-level");
  const $order = document.getElementById("monster-order");

  const $selfDef = document.getElementById("self-def");
  const $selfMdef = document.getElementById("self-mdef");

  const $btn = document.getElementById("calc-btn");

  const $enemyType = document.getElementById("enemy-attack-type");
  const $resultDmg = document.getElementById("result-dmg");
  const $needLabel = document.getElementById("need-label");
  const $resultNeed = document.getElementById("result-need");

  if (
    !$enemySelect || !$enemyLevel || !$order ||
    !$selfDef || !$selfMdef || !$btn ||
    !$enemyType || !$resultDmg || !$needLabel || !$resultNeed
  ) return;

  // --- helpers ---
  const n = (v, fallback = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  };

  // 従来と同じ：基礎値*(1+(Lv-1)*0.1) を切り捨て
  const scaleByLevel = (base, lv) => {
    const L = Math.max(1, Math.floor(n(lv, 1)));
    const b = n(base, 0);
    return Math.floor(b * (1 + (L - 1) * 0.1));
  };

  const getSelectedEnemy = () => {
    const opt = $enemySelect.options[$enemySelect.selectedIndex];
    if (!opt) return null;

    return {
      id: n(opt.dataset.id, 0),
      name: opt.dataset.name || opt.textContent || "",
      attackType: opt.dataset.attackType || "",
      baseAtk: n(opt.dataset.atk, 0),
      baseInt: n(opt.dataset.int, 0),
    };
  };

  // damage (乱数/属性補正は未実装：掛けない)
  // 最低保証：1
  const calcPhysicalTaken = (enemyAtk, selfDef, selfMdef) => {
    const raw = (enemyAtk * 1.75 - (selfDef + selfMdef * 0.1)) * 4;
    const floored = Math.floor(raw);
    return Math.max(1, floored);
  };

  const calcMagicTaken = (enemyInt, selfDef, selfMdef) => {
    const raw = (enemyInt * 1.75 - (selfMdef + selfDef * 0.1)) * 4;
    const floored = Math.floor(raw);
    return Math.max(1, floored);
  };

  // 一桁(1〜9)に抑えるための必要ライン（表示は片方のみ）
  // floor(raw) <= 9 を保証するため raw < 10 を満たす最小整数を返す
  // 物理: raw = (enemyAtk*1.75 - (DEF + MDEF*0.1))*4
  // -> enemyAtk*1.75 - (DEF + MDEF*0.1) < 2.5
  // -> DEF > enemyAtk*1.75 - MDEF*0.1 - 2.5
  const needDefForSingleDigit = (enemyAtk, selfMdef) => {
    const threshold = enemyAtk * 1.75 - selfMdef * 0.1 - 2.5;
    const req = Math.floor(threshold) + 1; // strict ">"
    return Math.max(0, req);
  };

  // 魔法: raw = (enemyInt*1.75 - (MDEF + DEF*0.1))*4
  // -> MDEF > enemyInt*1.75 - DEF*0.1 - 2.5
  const needMdefForSingleDigit = (enemyInt, selfDef) => {
    const threshold = enemyInt * 1.75 - selfDef * 0.1 - 2.5;
    const req = Math.floor(threshold) + 1;
    return Math.max(0, req);
  };

  // --- sort options ---
  const snapshotOptions = () => {
    const opts = Array.from($enemySelect.options).map(o => ({
      value: o.value,
      text: o.textContent || "",
      dataset: { ...o.dataset },
    }));
    return opts;
  };

  const rebuildOptions = (items) => {
    const currentValue = $enemySelect.value;
    $enemySelect.innerHTML = "";
    for (const it of items) {
      const o = document.createElement("option");
      o.value = it.value;
      o.textContent = it.text;
      for (const [k, v] of Object.entries(it.dataset)) o.dataset[k] = v;
      $enemySelect.appendChild(o);
    }
    // 元の選択を可能な限り維持
    const found = Array.from($enemySelect.options).some(o => o.value === currentValue);
    if (found) $enemySelect.value = currentValue;
  };

  const baseList = snapshotOptions();

  const applyOrder = () => {
    const mode = $order.value;
    const items = [...baseList];

    if (mode === "id-asc") {
      items.sort((a, b) => n(a.dataset.id) - n(b.dataset.id));
    } else if (mode === "name-asc") {
      items.sort((a, b) => (a.dataset.name || "").localeCompare(b.dataset.name || "", "ja"));
    } else if (mode === "name-desc") {
      items.sort((a, b) => (b.dataset.name || "").localeCompare(a.dataset.name || "", "ja"));
    }

    rebuildOptions(items);
    // 表示更新だけ
    const e = getSelectedEnemy();
    $enemyType.textContent = e?.attackType || "---";
  };

  // --- calc ---
  const calcAndRender = () => {
    const enemy = getSelectedEnemy();
    if (!enemy) return;

    const lv = Math.max(1, Math.floor(n($enemyLevel.value, 1)));

    const enemyAtk = scaleByLevel(enemy.baseAtk, lv);
    const enemyInt = scaleByLevel(enemy.baseInt, lv);

    const selfDef = Math.max(0, Math.floor(n($selfDef.value, 0)));
    const selfMdef = Math.max(0, Math.floor(n($selfMdef.value, 0)));

    const type = enemy.attackType; // "物理" or "魔法"
    $enemyType.textContent = type || "---";

    if (type === "魔法") {
      const dmg = calcMagicTaken(enemyInt, selfDef, selfMdef);
      $resultDmg.textContent = String(dmg);

      const need = needMdefForSingleDigit(enemyInt, selfDef);
      $needLabel.textContent = "必要MDEF";
      $resultNeed.textContent = String(need);
    } else {
      // 物理（デフォルト）
      const dmg = calcPhysicalTaken(enemyAtk, selfDef, selfMdef);
      $resultDmg.textContent = String(dmg);

      const need = needDefForSingleDigit(enemyAtk, selfMdef);
      $needLabel.textContent = "必要DEF";
      $resultNeed.textContent = String(need);
    }
  };

  // events
  $order.addEventListener("change", applyOrder);
  $enemySelect.addEventListener("change", () => {
    const e = getSelectedEnemy();
    $enemyType.textContent = e?.attackType || "---";
  });
  $btn.addEventListener("click", calcAndRender);

  // init
  applyOrder();
  const initEnemy = getSelectedEnemy();
  $enemyType.textContent = initEnemy?.attackType || "---";
})();
