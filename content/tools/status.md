---
title: "主人公ステータス・シミュレーター（デバッグ）"
---

{{< rawhtml >}}
<p class="note" style="margin:8px 0;">
  ※このページは「Hugoが認識しているページ一覧（File.Path）」を表示します。
</p>
{{< /rawhtml >}}

<!-- まず “db/ に限らず” 全体のFile.Pathを見せる -->
{{< debug_pages limit="200" >}}

<hr>

<!-- 次に db/ だけ抽出（比較用） -->
{{< debug_pages filter="db/" limit="200" >}}
