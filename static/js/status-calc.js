document.addEventListener("DOMContentLoaded", () => {
  const levelInputElement = document.getElementById("monster-level");

  // 表示専用：fmt() が無い環境でも壊れない
  const fmtSafe = (v) => {
    try {
      if (typeof window.fmt === "function") return window.fmt(v);
    } catch {}
    return String(Number(v) || 0);
  };

  /* ===== ステータス（VIT / ATK など） ===== */
  const statusValueElements = document.querySelectorAll("#status-table dd");

  function recalcStatusByLevel() {
    const currentLevel = parseInt(levelInputElement.value, 10);

    statusValueElements.forEach((statusEl) => {
      // data-base は「カンマ無しの数値」を前提（テンプレ側でも維持できている）
      const baseStatus = parseInt(statusEl.dataset.base, 10);
      const statType = statusEl.dataset.stat;

      let calculatedStatus;

      // ▼ MOVは計算しない
      if (statType === "mov") {
        calculatedStatus = baseStatus;
      } else {
        // ▼ それ以外は計算を適用
        calculatedStatus = Math.floor(baseStatus * (1 + (currentLevel - 1) * 0.1));
      }

      // ★表示だけカンマ
      statusEl.textContent = fmtSafe(calculatedStatus);
    });
  }

  /* ===== 情報系（EXPのみ） ===== */
  const infoValueElements = document.querySelectorAll("#info-table dd[data-stat]");

  function recalcInfoByLevel() {
    const currentLevel = parseInt(levelInputElement.value, 10);

    infoValueElements.forEach((infoEl) => {
      const statType = infoEl.dataset.stat;
      const baseValue = parseInt(infoEl.dataset.base, 10);

      // EXPのみ計算
      if (statType === "exp") {
        const calculatedExp = baseValue * (1 + Math.floor((currentLevel - 1) * 0.1)); // 仮式
        const v = Math.floor(calculatedExp);

        // ★表示だけカンマ
        infoEl.textContent = fmtSafe(v);
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
