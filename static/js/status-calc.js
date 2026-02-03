document.addEventListener("DOMContentLoaded", () => {
  const levelInputElement = document.getElementById("monster-level");
  if (!levelInputElement) return;

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
    const currentLevel = parseInt(levelInputElement.value, 10) || 1;

    statusValueElements.forEach((statusEl) => {
      const baseStatus = parseInt(statusEl.dataset.base, 10) || 0;
      const statType = statusEl.dataset.stat;

      let calculatedStatus;

      // MOVは計算しない
      if (statType === "mov") {
        calculatedStatus = baseStatus;
      } else {
        calculatedStatus = Math.floor(baseStatus * (1 + (currentLevel - 1) * 0.1));
      }

      // 表示だけカンマ
      statusEl.textContent = fmtSafe(calculatedStatus);
    });
  }

  /* ===== 情報系（EXPのみ） ===== */
  const infoValueElements = document.querySelectorAll("#info-table dd[data-stat]");

  function recalcInfoByLevel() {
    const currentLevel = parseInt(levelInputElement.value, 10) || 1;

    infoValueElements.forEach((infoEl) => {
      const statType = infoEl.dataset.stat;
      const baseValue = parseInt(infoEl.dataset.base, 10) || 0;

      if (statType !== "exp") return;

      // 獲得EXP ＝ 基礎EXP × floor( max(1, 0.2 × Lv^1.1) )
      const rawScale = 0.2 * Math.pow(currentLevel, 1.1);
      const scale = Math.floor(Math.max(1, rawScale));
      const exp = baseValue * scale;

      // 表示だけカンマ
      infoEl.textContent = fmtSafe(exp);
    });
  }

  /* ===== まとめて再計算 ===== */
  function recalcAllByLevel() {
    recalcStatusByLevel();
    recalcInfoByLevel();
  }

  recalcAllByLevel();

  // input でも change でも反応（スマホ対策）
  levelInputElement.addEventListener("input", recalcAllByLevel);
  levelInputElement.addEventListener("change", recalcAllByLevel);
});
