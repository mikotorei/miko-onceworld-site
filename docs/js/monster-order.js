(() => {
  const num = (v, fallback = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  };

  // selectの<option>をスナップショットして、並び替えの基準にする
  const snapshotOptions = (selectEl) =>
    Array.from(selectEl.options).map(o => ({
      value: o.value,
      text: o.textContent || "",
      dataset: { ...o.dataset },
      isPlaceholder: o.value === "" || (o.textContent || "").includes("選択してください"),
    }));

  const rebuild = (selectEl, items) => {
    const current = selectEl.value;
    selectEl.innerHTML = "";

    for (const it of items) {
      const o = document.createElement("option");
      o.value = it.value;
      o.textContent = it.text;
      for (const [k, v] of Object.entries(it.dataset)) o.dataset[k] = v;
      selectEl.appendChild(o);
    }

    // 選択中の値が存在すれば維持
    if (items.some(it => it.value === current)) selectEl.value = current;
  };

  const sortItems = (baseItems, mode) => {
    const placeholder = baseItems.filter(x => x.isPlaceholder);
    const list = baseItems.filter(x => !x.isPlaceholder);

    if (mode === "id-asc") {
      list.sort((a, b) => num(a.dataset.id) - num(b.dataset.id));
    } else if (mode === "name-asc") {
      list.sort((a, b) => (a.dataset.name || "").localeCompare(b.dataset.name || "", "ja"));
    } else if (mode === "name-desc") {
      list.sort((a, b) => (b.dataset.name || "").localeCompare(a.dataset.name || "", "ja"));
    }

    return [...placeholder, ...list];
  };

  // roleで結線（enemy/pet など）
  const setupRole = (role) => {
    const selectEl = document.querySelector(`[data-monster-select="${role}"]`);
    const orderEl  = document.querySelector(`[data-monster-order="${role}"]`);
    if (!selectEl || !orderEl) return;

    const base = snapshotOptions(selectEl);

    const apply = () => {
      const mode = orderEl.value || "id-asc";
      rebuild(selectEl, sortItems(base, mode));
    };

    orderEl.addEventListener("change", apply);

    // 戻る/再訪（bfcache）対策：復元された選択状態で再適用
    window.addEventListener("pageshow", apply);

    // 初期適用
    apply();
  };

  // よく使うroleは全部張っておく（存在しないroleは無視される）
  setupRole("enemy");
  setupRole("pet");

  // ペット与ダメのように「1つの並び順で複数selectを動かす」ケース
  // order: data-monster-order="both"
  // 対象: #pet-select と #enemy-select（両方あれば両方）
  const setupBoth = () => {
    const orderEl = document.querySelector(`[data-monster-order="both"]`);
    if (!orderEl) return;

    const petSelect  = document.getElementById("pet-select");
    const enemySelect = document.getElementById("enemy-select");
    if (!petSelect && !enemySelect) return;

    const petBase = petSelect ? snapshotOptions(petSelect) : null;
    const enemyBase = enemySelect ? snapshotOptions(enemySelect) : null;

    const apply = () => {
      const mode = orderEl.value || "id-asc";
      if (petSelect && petBase) rebuild(petSelect, sortItems(petBase, mode));
      if (enemySelect && enemyBase) rebuild(enemySelect, sortItems(enemyBase, mode));
    };

    orderEl.addEventListener("change", apply);
    window.addEventListener("pageshow", apply);
    apply();
  };

  setupBoth();
})();
