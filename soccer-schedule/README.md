# ６リーグ日程帳

Ｊ１・プレミアリーグ・ラ・リーガ・セリエＡ・ブンデスリーガ・リーグ・アンの日程を
**すべて日本時間（JST）** で一覧できる、ゼロ依存の単一HTMLアプリ。
Ｊ２は**北海道コンサドーレ札幌の試合のみ**特別収録（リーグ色はＪ１＝緑、Ｊ２＝深緑）。

## 使い方

`index.html` をブラウザで開くだけ（サーバー不要・オフライン動作）。

- **リーグチップ** … タップで絞り込み（複数選択可、「すべて」で解除）。数字は今後の試合数
- **今後 / 終了 / すべて** … 終了は新しい順に表示（**スコアは表示しない**）
- **日付 / 節** … 日付順（日本時間の日付で区切り）か、リーグ×節ごとのまとまりで表示
- **日付ストリップ** … 今日から14日分。タップでその日にジャンプ（数字はその日の試合数）
- **検索欄** … クラブ名・スタジアム名・リーグ名で絞り込み
- **★ 推し** … クラブ名をタップすると推しクラブに登録（端末に保存）。「★ 推し」チップで推しの試合だけに絞れる
- **ネタバレ防止**: 試合結果・スコアは画面にもデータにも一切含めない（終了した試合は「終了」とだけ表示）。キックオフ後2時間強は「キックオフ済」表示
- 深夜キックオフ（例: プレミアの日曜16:30 → 日本の月曜0:30）も日本のカレンダー上の日付に正しく振り分け
- 設定・推しクラブは端末に保存される（localStorage）

## データについて（2026-27シーズン・実データ収録済み）

`data/matches.js` には **2026-27シーズンの実際の日程 全2,170試合** を収録済み
（Ｊ１ 380・Ｊ２札幌 38・プレミア 380・ラリーガ 380・セリエＡ 380・ブンデス 306・リーグアン 306）。
2026-10-10 時点までの消化状況（終了／未消化）と確定キックオフ日時を反映。スコアは収録しない。

### 収録内容と精度

- **Ｊ１・Ｊ２**: Ｊリーグ公式サイトの日程から自動生成されている
  [j-schedule-ics-maker](https://github.com/takahashimasaki4biz/j-schedule-ics-maker)
  のクラブ別ICSを全クラブぶん突合して復元（ホーム側・アウェイ側の二重記録が全試合一致することを検証済み）。
  終了済みかどうかは報道各社の検索結果から反映（スコアは収録しない）。
  第20節 京都×岡山はＪリーグ公式でも「日程未定」のため、その旨表示している
- **欧州5リーグ**: 全節の対戦カードと開催日は [openfootball](https://github.com/openfootball) の公式日程データ（週次更新）。
  放送編成で確定済みの節は openfootball と各リーグ公式発表・報道の確報（`data/corrections/`）で個別キックオフ日時に補正済み
- **未確定の節は「時刻未定」表示**（日付は暫定。放送編成の発表で確定していく）
- Ｗ杯影響によるラリーガ開幕節の延期4試合、セリエＡ第4節のEL日程待ち2試合なども反映済み

### データを最新化する（要ネット接続、Node 18+、APIキー不要）

```bash
# 1) 欧州5リーグ: openfootball から確定キックオフ日時・消化状況を取り込む
node scripts/update-europe.mjs

# 2) Ｊリーグ: 公式日程由来のICS（上流が止まっている間はスキップされる）
node scripts/update-jleague-ics.mjs

# 3) 補正ファイルの適用と仕上げ（終了判定）。公式発表で分かった日時変更は
#    data/corrections/YYYY-MM-DD-*.json に書いてから実行する（形式はスクリプト冒頭のコメント参照）
node scripts/apply-corrections.mjs
```

- どのスクリプトもスコアは書き込まない（ネタバレ防止）。終了判定はキックオフから2時間半経過で自動
- `update.mjs`（football-data.org のAPIキーを使う旧方式）も残してあるが、通常は上の3本で足りる
- 日次更新したい場合は cron 等で上記コマンドを回し、`data/matches.js` を配信すればよい

## ファイル構成

```
index.html                      表示アプリ本体（ゼロ依存）
data/matches.js                 日程データ（window.SCHEDULE_DATA を定義）
data/corrections/*.json         公式発表で確認した日時変更の記録（apply-corrections.mjs が適用）
scripts/update-europe.mjs       欧州5リーグ更新（openfootball・キー不要）
scripts/update-jleague-ics.mjs  Ｊリーグ日程更新（ICS方式・キー不要）
scripts/apply-corrections.mjs   補正適用＋終了判定の仕上げ
scripts/update.mjs              旧方式（football-data.org / Ｊリーグ公式サイトHTML解析）
scripts/lib/teams.mjs           クラブ名対訳・照合の共通モジュール
```

## データ形式

```js
window.SCHEDULE_DATA = {
  generatedAt: "ISO8601",   // 生成時刻（UTC）
  sample: true/false,       // サンプルデータかどうか（trueで警告バナー表示）
  leagues: [{ id, name, short, country, color }],
  matches: [{
    league: "J1|J2|PL|PD|SA|BL1|FL1",
    matchday: 2,             // 節
    utc: "ISO8601",          // キックオフ（UTC）。表示側で JST に変換
    home, away, venue,
    status: "SCHEDULED|FINISHED|IN_PLAY|POSTPONED|CANCELLED",
    tbd: true,               // キックオフ時刻未定なら（日付は暫定表示）
    dateTBD: true            // 開催日そのものが未定なら（例: J1第20節 京都×岡山）
  }]
};
```
