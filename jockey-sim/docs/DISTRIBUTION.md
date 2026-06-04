# 配布ガイド — テスターにすぐ遊んでもらう

蹄音は**ほぼ単一HTML・ゼロ依存**。Three.js をローカル同梱したので、CDN/ネットが無くても描画できます。
配布物は実質 **2ファイル**だけ：

```
index.html (= jockey_game.html)   … ゲーム本体
vendor/three.min.js               … Three.js r128（ローカル同梱）
```

> フォント（Zen Kaku Gothic New / Dela Gothic One）のみ Google Fonts から読み込みます。
> オンライン時はそのフォント、**オフライン時はOSのゴシック体に自動フォールバック**（読めます）。
> 日本語フォント全文字の同梱は数MBになり「単一HTML ≤2MB」を壊すため、意図的にCDNのままにしています。

---

## 0. 配布用ビルド

```
cd jockey-sim
npm run build       # → dist/ に index.html と vendor/ を組み立て（CDN残存も自動検査）
```

`dist/` が配布用フォルダです（gitignore 済み・いつでも再生成可）。

ローカル確認：
```
npm run serve       # → http://localhost:8080/dist/ をブラウザで開く
```

---

## 1. itch.io（ゲーム配布に最適・おすすめ）

スマホでもURLを開くだけで遊べ、gitのpush不要。

1. `npm run build` 後、**`dist/` の中身**（`index.html` と `vendor/` フォルダ）を zip にする
   - ⚠ `dist` フォルダごとではなく、**中身を zip のルートに**置く（`index.html` が zip 直下）
2. itch.io にログイン → **Dashboard → Create new project**
3. **Kind of project** = `HTML`
4. zip をアップロード → **「This file will be played in the browser」**にチェック
5. **Embed options**: Viewport を縦長に（例 幅 420 × 高さ 820。スマホ縦画面前提のため）／「Fullscreen button」ON 推奨
6. **Visibility** を `Draft`（限定）or `Restricted`（パスワード）にしてテスターにURL共有 → 公開時 `Public`

セーブ（育成・戦績）は itch のブラウザ実行でも **localStorage が効く**ので継続します。

---

## 2. GitHub Pages（URL固定で配りたい場合）

このリポジトリに **`.github/workflows/pages.yml`**（自動デプロイ）を同梱済み。

### 初回セットアップ
1. GitHub で**新規リポジトリを作成**（例 `hizumeoto`）
2. ローカルから push：
   ```
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin master        # ← 監視ブランチは main / master
   ```
3. GitHub の **Settings → Pages → Build and deployment → Source** を **「GitHub Actions」**に設定
4. 以降、main/master に push するたびに自動ビルド＆デプロイ
5. 公開URL：**`https://<user>.github.io/<repo>/`**

> ワークフローが `jockey-sim/build.js` を実行し `jockey-sim/dist/` を Pages へ配信します（依存ゼロ・`npm install` 不要）。
> 現在の作業ブランチ `feat/aaa-phase1` で動かすなら、`pages.yml` の `branches:` にそのブランチ名を足すか、master へマージしてください。

### 手早く試すだけなら（ビルド/Action無し）
リポジトリ root から Pages を有効化し、`https://<user>.github.io/<repo>/jockey-sim/jockey_game.html` を直接開いてもOK
（`vendor/three.min.js` は相対参照なのでそのまま動きます。URLが長いだけ）。

---

## 3. その場で見せる / 同一Wi-Fi

```
cd jockey-sim
npm run serve                      # http://localhost:8080/dist/
```
同じWi-Fiのスマホからは、PCのローカルIP（例 `http://192.168.x.x:8080/dist/`）で開けます。
外部の人に一時公開するなら `npx --yes ngrok http 8080` 等のトンネルでURLを発行。

---

## 4. ファイルを直接渡す（オフライン）

`dist/` フォルダ（`index.html` + `vendor/`）を zip で送り、`index.html` をブラウザで開いてもらうだけ。
ネット不要で描画まで動きます（フォントのみOSフォールバック）。

---

## メモ
- **claude.ai アーティファクト**は localStorage 不可＋外部fetch制限のため非推奨（単発体験版どまり）。配布は上記1〜4で。
- セーブキー：`hizumeoto_save_v1`（localStorage）。ホスト/ローカル配布なら戦績・育成がリロード後も残る＝「一次・正規版」体験。
- Three.js を更新する時は `vendor/three.min.js` を差し替え、`npm run gates` と実機確認を回す。
