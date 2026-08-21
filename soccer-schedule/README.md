# ５リーグ日程帳

Ｊ１リーグ・プレミアリーグ・ラ・リーガ・セリエＡ・ブンデスリーガの日程を
**すべて日本時間（JST）** で一覧できる、ゼロ依存の単一HTMLアプリ。

## 使い方

`index.html` をブラウザで開くだけ（サーバー不要・オフライン動作）。

- **リーグチップ** … タップで絞り込み（複数選択可、「すべて」で解除）
- **検索欄** … チーム名・スタジアム名で絞り込み
- **今後のみ** … オフにすると過去の試合と結果も表示
- 日付見出しは JST 基準。深夜キックオフ（例: プレミアの日曜16:30 → 日本の月曜0:30）も
  日本のカレンダー上の日付に正しく振り分けられる
- 選択状態は端末に保存される（localStorage）

## データについて

初期状態では `data/matches.js` に **サンプルデータ**（デモ用のダミー日程）が入っており、
画面上部にその旨のバナーが出ます。実データへの更新は次のとおり。

### 実データに更新する（要ネット接続の環境で実行）

```bash
# 1) football-data.org の無料APIキーを取得（欧州4リーグ用）
#    https://www.football-data.org/client/register

# 2) 実行（Node 18 以上）
FOOTBALL_DATA_API_KEY=あなたのキー node scripts/update.mjs
```

主なオプション:

| オプション | 意味 |
|---|---|
| `--no-eu` | Ｊリーグのみ更新（APIキー不要） |
| `--no-j` | 欧州4リーグのみ更新 |
| `--season=2026` | 欧州のシーズン開始年を指定（省略時は今季） |
| `--jyears=2026,2027` | Ｊリーグの取得年度。秋春制で年をまたぐ場合は両年指定 |

- 欧州4リーグ: [football-data.org](https://www.football-data.org/) v4 API（無料枠 10リクエスト/分）
- Ｊ１: [Ｊリーグ公式データサイト](https://data.j-league.or.jp/) の日程検索結果を解析。
  サイトの構成変更で0件になった場合は `scripts/update.mjs` の `parseJleagueHtml` を修正する
- 片側だけ更新した場合、もう片側の既存データは維持される
- 日次更新したい場合は cron 等で上記コマンドを回し、`data/matches.js` を配信すればよい

## ファイル構成

```
index.html          表示アプリ本体（ゼロ依存）
data/matches.js     日程データ（update.mjs が生成。window.SCHEDULE_DATA を定義）
scripts/update.mjs  データ更新スクリプト（Node 18+、依存パッケージなし）
```

## データ形式

```js
window.SCHEDULE_DATA = {
  generatedAt: "ISO8601",   // 生成時刻（UTC）
  sample: true/false,       // サンプルデータかどうか（trueで警告バナー表示）
  leagues: [{ id, name, short, country, color }],
  matches: [{
    league: "J1|PL|PD|SA|BL1",
    matchday: 2,             // 節
    utc: "ISO8601",          // キックオフ（UTC）。表示側で JST に変換
    home, away, venue,
    status: "SCHEDULED|FINISHED|IN_PLAY|POSTPONED|CANCELLED",
    score: "1-0",            // 終了時のみ
    tbd: true                // キックオフ時刻未定なら
  }]
};
```
