---
title: "主人公ステータス・シミュレーター（デバッグ）"
---

<p class="note">
  ※このページは「Hugoが認識しているページ一覧」を表示します（.Fileが取れない場合でも表示されます）。
</p>
{{< rawhtml >}}
<script>
console.log("EQUIP_DB:", window.EQUIP_DB);
console.log("ACC_DB:", window.ACC_DB);
console.log("PET_DB:", window.PET_DB);
</script>
{{< /rawhtml >}}

{{< debug_pages limit="60" >}}

<hr>

{{< debug_pages filter="monster" limit="120" >}}

<hr>

{{< debug_pages filter="tools" limit="120" >}}

<hr>

{{< debug_pages filter="db" limit="200" >}}
