(() => {
  const levelInput = document.getElementById("monster-level");
  const buttons = Array.from(document.querySelectorAll(".level-shortcut-btn"));

  if (!levelInput || buttons.length === 0) return;

  const clearActive = () => {
    buttons.forEach(b => b.classList.remove("active"));
  };

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const lv = Number(btn.dataset.level);
      if (!Number.isFinite(lv) || lv < 1) return;

      // 入力欄に反映
      levelInput.value = String(lv);

      // active 表現
      clearActive();
      btn.classList.add("active");

      // 既存の status-calc.js を動かす（どっちを見ていても動くように両方投げる）
      levelInput.dispatchEvent(new Event("input", { bubbles: true }));
      levelInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  // 手入力した場合は active を外す（補助としての位置づけ）
  levelInput.addEventListener("input", clearActive);
})();
