(() => {
  const num = (v, fallback = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  };

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

  // 1つのツール（section）内で、並び順selectと対象selectを結線する
  const bindOne = (orderEl) => {
    const container = orderEl.closest("section") || document;

    // data-monster-order="enemy" / "pet" / "both"
    // 旧方式（id="monster-order"だけ）の場合は enemy 扱い
    const role = orderEl.dataset.monsterOrder || "enemy";

    const findSelect = (r) => {
      // 新方式：data-monster-select（monster_select shortcodeのrole付与で付く）
      let s = container.querySelector(`[data-monster-select="${r}"]`);
      if (s) return s;

      // 旧方式：id固定にフォールバック
      if (r === "enemy") return container.querySelector("#enemy-select");
      if (r === "pet") return container.querySelector("#pet-select");
      return null;
    };

    const apply = () => {
      const mode = orderEl.value || "id-asc";

      if (role === "both") {
        const pet = findSelect("pet");
        const enemy = findSelect("enemy");

        if (pet) {
          const base = snapshotOptions(pet);
          rebuild(pet, sortItems(base, mode));
        }
        if (enemy) {
          const base = snapshotOptions(enemy);
          rebuild(enemy, sortItems(base, mode));
        }
        return;
      }

      const target = findSelect(role);
      if (!target) return;

      const base = snapshotOptions(target);
      rebuild(target, sortItems(base, mode));
    };

    orderEl.addEventListener("change", apply);
    window.addEventListener("pageshow", apply); // 戻る/再訪(bfcache)対策
    apply(); // 初期適用
  };

  const boot = () => {
    // 新方式：data-monster-order を全部拾う
    const dataOrders = Array.from(document.querySelectorAll("[data-monster-order]"));
    // 旧方式：id="monster-order" も拾う（複数あってもOK）
    const idOrders = Array.from(document.querySelectorAll("#monster-order"));

    const all = [...new Set([...dataOrders, ...idOrders])];
    all.forEach(bindOne);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
