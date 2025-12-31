/**
 * クリック時の入口
 */
document.getElementById("calc-btn").addEventListener("click", onCalc);

/**
 * 計算全体の流れを管理する
 */
function onCalc() {
  const atk = getUserAtk();
  const def = getMonsterDef();

  const params = {
    atk: atk,
    def: def,
    // (ここに補正パラメータを追加予定)
  };

  const damage = calcDamage(params);
  renderResult(damage);
}

/* =========================
   入力・取得系
========================= */

/**
 * ユーザー入力のATKを取得
 */
function getUserAtk() {
  return Number(document.getElementById("atk").value);
}

/**
 * モンスターDEFを取得（将来DB参照）
 */
function getMonsterDef() {
  // 今は仮の値
  return ("モンスターのdef");
}

/* =========================
   計算ロジック
========================= */

/**
 * 与ダメージ計算の入口
 */
function calcDamage(params) {
  const base = calcBaseDamage(params);
  const modified = applyModifiers(base, params);
  const final = adjustFinalDamage(modified, params);

  return final;
}

/**
 * 基礎ダメージ
 */
function calcBaseDamage(params) {
  // (ここに基礎計算式)
  return params.atk - params.def;
}

/**
 * 各種補正
 */
function applyModifiers(baseDamage, params) {
  let damage = baseDamage ;

  // (ここに補正を追加)

  return damage;
}

/**
 * 最終調整
 */
function adjustFinalDamage(damage, params) {
  let finalDamage = damage;

  // (ここに最低保証・切り捨てなど)

  return finalDamage;
}

/* =========================
   表示系
========================= */

/**
 * 結果表示
 */
function renderResult(damage) {
  document.getElementById("damage-result").textContent = damage;
}
