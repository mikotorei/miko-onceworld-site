---
title: "主人公ステータス・シミュレーター"
---

<div class="tool-box" id="status-sim">
  <h2>主人公ステータス・シミュレーター</h2>

  <!-- =========================
       確認用：DB読み込みチェック
       ========================= -->
  {{< equip_db >}}
  {{< acc_db >}}
  {{< pet_db >}}

  {{< rawhtml >}}
  <p id="db-debug" class="note" style="margin:8px 0;">
    DB: ---
  </p>
  <script>
  (function(){
    const e = (window.EQUIP_DB && Array.isArray(window.EQUIP_DB)) ? window.EQUIP_DB.length : 0;
    const a = (window.ACC_DB && Array.isArray(window.ACC_DB)) ? window.ACC_DB.length : 0;
    const p = (window.PET_DB && Array.isArray(window.PET_DB)) ? window.PET_DB.length : 0;

    const el = document.getElementById("db-debug");
    if (el) {
      el.textContent = `DB: equip=${e}, acc=${a}, pet=${p}`;
    }
  })();
  </script>
  {{< /rawhtml >}}

  <hr>

  <!-- 以下は将来用のUI（今は動作確認しない） -->

  <section class="tool-result">
    <h3>入力（仮）</h3>
    <p class="note">
      ※このページは現在「DBが正しく読み込まれているか」を確認する段階です。<br>
      計算処理・選択UIはまだ未接続で問題ありません。
    </p>
  </section>

</div>
