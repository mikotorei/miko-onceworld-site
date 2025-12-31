document.addEventListener("DOMContentLoaded", () => {
  const levelInput =
    document.getElementById("monster-level");

  // 計算対象は「data-stat」を持つものだけ
  const calcTargets =
    document.querySelectorAll("#info-table dd[data-stat]");

  function recalcInfoByLevel() {
    const level =
      parseInt(levelInput.value, 10);

    calcTargets.forEach(el => {
      const statType =
        el.dataset.stat;

      const baseValue =
        parseInt(el.dataset.base, 10);

      let result;

      if (statType === "exp") {
        // 仮の計算式（後で自由に変更）
        const rawValue =
          baseValue + (level - 1) * 10;

        result = Math.floor(rawValue);
        el.textContent = result;
      }
    });
  }

  recalcInfoByLevel();
  levelInput.addEventListener("input", recalcInfoByLevel);
});
