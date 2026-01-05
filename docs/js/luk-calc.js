// static/js/luk-calc.js（新規）
(() => {
  const $enemySelect = document.getElementById("enemy-select");
  const $enemyLevel = document.getElementById("enemy-level");
  const $order = document.getElementById("monster-order");
  const $btn = document.getElementById("calc-btn");

  const $enemyLuk = document.getElementById("enemy-luk");
  const $needHit = document.getElementById("need-hit");
  const $needEvade = document.getElementById("need-evade");
  const $needPerfect = document.getElementById("need-perfect");

  if (
    !$enemySelect || !$enemyLevel || !$order || !$btn ||
    !$enemyLuk || !$needHit || !$needEvade || !$needPerfect
  ) return;

  const n = (v, fallback = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  };

  // 敵LUKのLv変動：基礎値*(1+(Lv-1)*0.1) を切り捨て
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
      baseLuk: n(opt.dataset.luk, 0),
    };
  };

  // 並び順：defツールと同じ思想（選択維持）
  const snapshotOptions = () => {
    return Array.from($enemySelect.options).map(o => ({
      value: o.value,
      text: o.textContent || "",
      dataset: { ...o.dataset },
    }));
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
  };

  // 必要LUK（端数は切り上げ）
  const ceil = (x) => Math.ceil(x);

  const calcAndRender = () => {
    const enemy = getSelectedEnemy();
    if (!enemy) return;

    const lv = Math.max(1, Math.floor(n($enemyLevel.value, 1)));
    const enemyLuk = scaleByLevel(enemy.baseLuk, lv);

    const needHit = ceil(enemyLuk / 2);
    const needEvade = ceil(enemyLuk / 3);
    const needPerfect = ceil(enemyLuk * 100);

    $enemyLuk.textContent = String(enemyLuk);
    $needHit.textContent = String(needHit);
    $needEvade.textContent = String(needEvade);
    $needPerfect.textContent = String(needPerfect);
  };

  $order.addEventListener("change", applyOrder);
  $btn.addEventListener("click", calcAndRender);

  // init
  applyOrder();
})();
