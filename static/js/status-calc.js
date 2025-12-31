document.addEventListener("DOMContentLoaded", () => {
  const levelInputElement =
    document.getElementById("monster-level");

/* =====　ステータス（VIT / ATK　など） */
  const statusValueElements =
    document.querySelectorAll("#status-table dd");

  function recalcStatusByLevel() {
    const currentLevel =
      parseInt(levelInputElement.value, 10);

    statusValueElements.forEach(statusEl => {
      const baseStatus =
        parseInt(statusEl.dataset.base, 10);

      const statType =
        statusEl.dataset.stat;

      let calculatedStatus;

      // ▼ MOVは計算しない
      if (statType === "mov") {
        calculatedStatus = baseStatus;
      } else {
        // ▼ それ以外は計算を適用
        calculatedStatus = Math.floor(baseStatus * ( 1 +( currentLevel - 1 ) * 0.1 ));
        // ↑ この式は自由に変更OK
      }

      statusEl.textContent = calculatedStatus;
    });
  }

  /* ===== 情報系（EXPのみ） ===== */
  const infoValueElements =
    document.querySelectorAll("#info-table dd[data-stat]");

  function recalcInfoByLevel() {
    const currentLevel =
      parseInt(levelInputElement.value, 10);

    infoValueElements.forEach(infoEl => {
      const statType =
        infoEl.dataset.stat;

      const baseValue =
        parseInt(infoEl.dataset.base, 10);

      // EXPのみ計算
      if (statType === "exp") {
        const calculatedExp = baseValue * ( 1 + Math.floor((currentLevel - 1) * 0.1)); // 仮式

        infoEl.textContent =
          Math.floor(calculatedExp);
      }
    });
  }

  /* ===== まとめて再計算 ===== */
  function recalcAllByLevel() {
    recalcStatusByLevel();
    recalcInfoByLevel();
  }

  recalcAllByLevel();
  levelInputElement.addEventListener("input", recalcAllByLevel);
});
