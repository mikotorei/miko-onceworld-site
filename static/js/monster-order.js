(() => {
  const enemySelect = document.getElementById("enemy-select");
  const orderSelect = document.getElementById("monster-order");

  if (!enemySelect || !orderSelect) return;

  // 初期の<option>一覧を保持（順番を戻したい/基準にしたいので）
  const baseOptions = Array.from(enemySelect.options).map(o => ({
    value: o.value,
    text: o.textContent || "",
    dataset: { ...o.dataset },
    isPlaceholder: o.value === "" // 「-- 選択してください --」を先頭固定にする
  }));

  const n = (v, fallback = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  };

  const rebuild = (items) => {
    const current = enemySelect.value;
    enemySelect.innerHTML = "";

    for (const it of items) {
      const o = document.createElement("option");
      o.value = it.value;
      o.textContent = it.text;
      for (const [k, v] of Object.entries(it.dataset)) o.dataset[k] = v;
      enemySelect.appendChild(o);
    }

    // 選択中を維持（存在すれば）
    if (items.some(it => it.value === current)) enemySelect.value = current;
  };

  const applyOrder = () => {
    const mode = orderSelect.value;

    // placeholder は常に先頭固定
    const placeholder = baseOptions.filter(o => o.isPlaceholder);
    const list = baseOptions.filter(o => !o.isPlaceholder);

    if (mode === "id-asc") {
      list.sort((a, b) => n(a.dataset.id) - n(b.dataset.id));
    } else if (mode === "name-asc") {
      list.sort((a, b) => (a.dataset.name || "").localeCompare(b.dataset.name || "", "ja"));
    } else if (mode === "name-desc") {
      list.sort((a, b) => (b.dataset.name || "").localeCompare(a.dataset.name || "", "ja"));
    }

    rebuild([...placeholder, ...list]);
  };

  orderSelect.addEventListener("change", applyOrder);

  // 初期適用
  applyOrder();
})();
