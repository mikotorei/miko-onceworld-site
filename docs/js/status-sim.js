(() => {
  const STATS = ["vit","spd","atk","int","def","mdef","luk","mov"];
  const $ = (id) => document.getElementById(id);
  const n = (v, fb=0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fb;
  };

  // --- inputs ---
  const shakerEl = $("shaker");

  const prot = Object.fromEntries(STATS.map(s => [s, $(`prot-${s}`)]));
  const pts  = Object.fromEntries(STATS.map(s => [s, $(`pt-${s}`)]));

  const equipEnhEl = $("equip-enh");
  const equipSel = {
    weapon: $("equip-weapon"),
    head: $("equip-head"),
    body: $("equip-body"),
    arms: $("equip-arms"),
    legs: $("equip-legs"),
    shield: $("equip-shield"),
  };

  const matchStatusEl = $("match-status");

  const accEnhEl = $("acc-enh");
  const accSel = [ $("acc-1"), $("acc-2") ];

  const petSel = [ $("pet-1"), $("pet-2"), $("pet-3") ];
  const petLv  = [ $("petlv-1"), $("petlv-2"), $("petlv-3") ];
  const petStageLabel = [ $("petstage-1"), $("petstage-2"), $("petstage-3") ];

  const calcBtn = $("status-calc");

  // --- outputs ---
  const out = Object.fromEntries(STATS.map(s => [s, $(`out-${s}`)]));
  const outRealDef = $("out-realdef");
  const outRealMdef = $("out-realmdef");
  const outDebug = $("out-debug");

  if (!calcBtn) return;

  const EQUIP_DB = Array.isArray(window.EQUIP_DB) ? window.EQUIP_DB : [];
  const ACC_DB   = Array.isArray(window.ACC_DB) ? window.ACC_DB : [];
  const PET_DB   = Array.isArray(window.PET_DB) ? window.PET_DB : [];

  // ---------- helpers ----------
  function addDict(dst, src, mul=1) {
    for (const k of Object.keys(src || {})) dst[k] = (dst[k] || 0) + n(src[k]) * mul;
  }

  // ペット段階：Lv31/71/121/181 で 1段階ずつ
  function petStageFromLv(lv) {
    if (lv >= 181) return 4;
    if (lv >= 121) return 3;
    if (lv >= 71)  return 2;
    if (lv >= 31)  return 1;
    return 0;
  }

  // ⑥/⑦：割合合計 → 倍率
  function rateMul(sumRate) {
    return 1 + sumRate;
  }

  // 装備実数：基礎×(1+強化×0.1)
  function equipScale(base, enh) {
    return base * (1 + enh * 0.1);
  }

  // アクセ実数：基礎×(1+強化×0.1)
  function accFlatScale(base, enh) {
    return base * (1 + enh * 0.1);
  }

  // アクセ割合：基礎×(1+強化×0.01) で“割合値”自体が増える
  function accRateScale(baseRate, enh) {
    return baseRate * (1 + enh * 0.01);
  }

  // ---------- UI build ----------
  function fillSelect(sel, items, placeholderText) {
    sel.innerHTML = "";
    const p = document.createElement("option");
    p.value = "";
    p.textContent = placeholderText;
    sel.appendChild(p);

    items.forEach((it, idx) => {
      const o = document.createElement("option");
      o.value = String(idx);
      o.textContent = it.title;
      // datasetに必要情報を詰める
      if (it.slot != null) o.dataset.slot = String(it.slot || "");
      if (it.series != null) o.dataset.series = String(it.series || "");
      if (it.match_mul != null) o.dataset.matchMul = String(it.match_mul || 1.0);
      o.dataset.payload = JSON.stringify(it);
      sel.appendChild(o);
    });
  }

  function buildEquipSelects() {
    const bySlot = { weapon:[], head:[], body:[], arms:[], legs:[], shield:[] };
    for (const it of EQUIP_DB) {
      const slot = String(it.slot || "").toLowerCase();
      if (bySlot[slot]) bySlot[slot].push(it);
    }
    fillSelect(equipSel.weapon, bySlot.weapon, "-- 武器なし --");
    fillSelect(equipSel.head,   bySlot.head,   "-- 頭なし --");
    fillSelect(equipSel.body,   bySlot.body,   "-- 胴なし --");
    fillSelect(equipSel.arms,   bySlot.arms,   "-- 腕なし --");
    fillSelect(equipSel.legs,   bySlot.legs,   "-- 脚なし --");
    fillSelect(equipSel.shield, bySlot.shield, "-- 盾なし --");
  }

  function buildAccSelects() {
    accSel.forEach(sel => fillSelect(sel, ACC_DB, "-- アクセなし --"));
  }

  function buildPetSelects() {
    petSel.forEach(sel => fillSelect(sel, PET_DB, "-- ペットなし --"));
  }

  // ---------- collect ----------
  // ① protein_effect = protein_count * (1 + shaker*0.01)
  function collectProtein() {
    const s = Math.max(0, n(shakerEl?.value, 0));
    const mul = 1 + s * 0.01;

    const add = {};
    STATS.forEach(k => {
      const count = Math.max(0, n(prot[k]?.value, 0));
      add[k] = count * mul;
    });
    return { add, mul };
  }

  // ② points
  function collectPoints() {
    const add = {};
    STATS.forEach(k => add[k] = Math.max(0, n(pts[k]?.value, 0)));
    return { add };
  }

  // ③ equip add (実数)
  function collectEquip(enh) {
    const add = {};
    STATS.forEach(k => add[k] = 0);

    const picks = {};
    for (const [slot, sel] of Object.entries(equipSel)) {
      const opt = sel?.options?.[sel.selectedIndex];
      if (!opt || !opt.value) { picks[slot] = null; continue; }
      picks[slot] = JSON.parse(opt.dataset.payload || "{}");
      const base = picks[slot].base_add || {};
      for (const k of Object.keys(base)) {
        add[k] += equipScale(n(base[k]), enh);
      }
    }
    return { add, picks };
  }

  // ④ match bonus（防具5部位が同シリーズなら、そのシリーズの match_mul を適用）
  function calcMatchMul(picks) {
    const armorSlots = ["head","body","arms","legs","shield"];
    const series = armorSlots.map(s => picks[s]?.series || "").filter(v => v);
    if (series.length !== 5) {
      if (matchStatusEl) matchStatusEl.textContent = "未一致（防具5部位が揃っていません）";
      return 1.0;
    }
    const allSame = series.every(v => v === series[0]);
    if (!allSame) {
      if (matchStatusEl) matchStatusEl.textContent = "未一致（シリーズが揃っていません）";
      return 1.0;
    }

    const mul = n(picks.head?.match_mul, 1.0) || 1.0;
    if (matchStatusEl) matchStatusEl.textContent = `一致：${series[0]}（×${mul}）`;
    return mul;
  }

  // ⑤ flat add (アクセ実数 + ペット実数)
  // ⑥ rate sum (アクセ割合 + ペット割合) → multiplier = 1 + sum
  // ⑦ final rate sum (アクセ最終 + ペット最終) → multiplier = 1 + sum
  function collectAcc(enh) {
    const flat = {};
    const rate = {};
    const final = {};
    STATS.forEach(k => { flat[k]=0; rate[k]=0; final[k]=0; });

    accSel.forEach(sel => {
      const opt = sel?.options?.[sel.selectedIndex];
      if (!opt || !opt.value) return;
      const it = JSON.parse(opt.dataset.payload || "{}");

      // ⑤ 実数
      for (const k of Object.keys(it.flat_add || {})) {
        flat[k] += accFlatScale(n(it.flat_add[k]), enh);
      }
      // ⑥ 割合（％値自体が強化で増える）
      for (const k of Object.keys(it.rate_add || {})) {
        rate[k] += accRateScale(n(it.rate_add[k]), enh);
      }
      // ⑦ 最終割合（同上）
      for (const k of Object.keys(it.final_add || {})) {
        final[k] += accRateScale(n(it.final_add[k]), enh);
      }
    });

    return { flat, rate, final };
  }

  function collectPets() {
    const flat = {};
    const rate = {};
    const final = {};
    STATS.forEach(k => { flat[k]=0; rate[k]=0; final[k]=0; });

    for (let i=0; i<3; i++) {
      const sel = petSel[i];
      const lv = Math.max(1, n(petLv[i]?.value, 1));
      const opt = sel?.options?.[sel.selectedIndex];
      const stage = petStageFromLv(lv);

      if (petStageLabel[i]) petStageLabel[i].textContent = `段階：${stage}`;

      if (!opt || !opt.value) continue;
      const pet = JSON.parse(opt.dataset.payload || "{}");
      const stages = Array.isArray(pet.stages) ? pet.stages : [];

      // 段階分だけ累積
      for (let k=0; k<Math.min(stage, stages.length); k++) {
        const eff = stages[k] || {};
        addDict(flat, eff.flat_add || {}, 1);
        addDict(rate, eff.rate_add || {}, 1);
        addDict(final, eff.final_add || {}, 1);
      }
    }

    return { flat, rate, final };
  }

  // ---------- calc ----------
  function calcFinal() {
    const shaker = Math.max(0, n(shakerEl?.value, 0));
    const equipEnh = Math.max(0, n(equipEnhEl?.value, 0));
    const accEnh = Math.max(0, n(accEnhEl?.value, 0));

    const p = collectProtein();     // ①
    const t = collectPoints();      // ②
    const e = collectEquip(equipEnh); // ③
    const matchMul = calcMatchMul(e.picks); // ④

    const acc = collectAcc(accEnh); // ⑤〜⑦(アクセ側)
    const pets = collectPets();     // ⑤〜⑦(ペット側)

    // 合算
    const s1 = {}; // (①+②+③)
    const sCore = {}; // ((①+②+③)*④)
    const sPlusFlat = {}; // +⑤
    const sumRate = {}; // ⑥(割合合計)
    const sumFinal = {}; // ⑦(最終割合合計)
    const result = {};

    STATS.forEach(k => {
      s1[k] = (n(p.add[k]) + n(t.add[k]) + n(e.add[k]));
      sCore[k] = s1[k] * matchMul;

      const flat5 = n(acc.flat[k]) + n(pets.flat[k]); // ⑤
      sPlusFlat[k] = sCore[k] + flat5;

      sumRate[k] = n(acc.rate[k]) + n(pets.rate[k]);     // ⑥（合計）
      sumFinal[k] = n(acc.final[k]) + n(pets.final[k]);  // ⑦（合計）

      const mul6 = rateMul(sumRate[k]);
      const mul7 = rateMul(sumFinal[k]);

      // Q1: 最後に切り捨て
      result[k] = Math.floor(sPlusFlat[k] * mul6 * mul7);
    });

    // 表示
    STATS.forEach(k => { if (out[k]) out[k].textContent = String(result[k]); });

    // 実DEF / 実MDEF（式は後で差し替え）
    if (outRealDef) outRealDef.textContent = "---";
    if (outRealMdef) outRealMdef.textContent = "---";

    // 検算用
    if (outDebug) {
      outDebug.textContent =
`式：(((①+②+③)×④)+⑤)×⑥×⑦
① protein: 個数×(1+shaker×0.01) / shaker=${shaker}
③ equip: 基礎×(1+強化×0.1) / equip強化=${equipEnh}
アクセ：実数×(1+強化×0.1), 割合×(1+強化×0.01) / acc強化=${accEnh}
④ matchMul=${matchMul}

①(protein_add)
${JSON.stringify(p.add, null, 2)}

②(points_add)
${JSON.stringify(t.add, null, 2)}

③(equip_add)
${JSON.stringify(e.add, null, 2)}

⑤(flat_add = acc + pet)
${JSON.stringify(Object.fromEntries(STATS.map(k => [k, n(acc.flat[k])+n(pets.flat[k])])), null, 2)}

⑥(rate_sum)
${JSON.stringify(sumRate, null, 2)}

⑦(final_sum)
${JSON.stringify(sumFinal, null, 2)}

result
${JSON.stringify(result, null, 2)}
`;
    }
  }

  function bindAutoRecalc() {
    const recalc = () => calcFinal();

    shakerEl?.addEventListener("input", recalc);

    STATS.forEach(k => {
      prot[k]?.addEventListener("input", recalc);
      pts[k]?.addEventListener("input", recalc);
    });

    equipEnhEl?.addEventListener("input", recalc);
    Object.values(equipSel).forEach(sel => sel?.addEventListener("change", recalc));

    accEnhEl?.addEventListener("input", recalc);
    accSel.forEach(sel => sel?.addEventListener("change", recalc));

    petSel.forEach(sel => sel?.addEventListener("change", recalc));
    petLv.forEach(el => el?.addEventListener("input", recalc));

    calcBtn.addEventListener("click", recalc);
  }

  // init
  if (matchStatusEl) matchStatusEl.textContent = `DB: equip=${EQUIP_DB.length}, pet=${PET_DB.length}, acc=${ACC_DB.length}`;
  buildEquipSelects();
  buildAccSelects();
  buildPetSelects();
  bindAutoRecalc();
  calcFinal();
})();
