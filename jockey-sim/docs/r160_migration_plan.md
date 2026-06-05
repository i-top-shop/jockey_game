# 本体 r160/ESM 移行＋スライス技術統合 計画

> 作成: 2026-06-05 / 前提: 縦スライス(`slice/straight-duel.html`, r160)で「スタイライズドはWebで到達可能」を実証済み。
> 本計画は **本体 `jockey_game.html`(r128/UMD) を r160/ESM へ移行し、スライスの技術（Composer・GLTF馬・接地IK・首pump・インスタンシング）をレース画面へ統合**する。
> 鉄則（roadmap）：**移行は単独で完了・検証してから下流（機能）へ着手する厳格直列**。物理/AI/balance/timeScaleは不変。全コミット前に4ゲート（node --check / 文字化け / balance_check / 実機）。

---

## 現状の前提（本体の描画スタックと依存）
- three は `vendor/three.min.js`（**r128 UMD・グローバル `THREE`**）を `<script src>`。ゲーム全体が1つの非module `<script>`。
- `ensureThree()`：`WebGLRenderer({antialias})` / `ACESFilmicToneMapping`(exposure 1.16) / `PCFSoftShadowMap` / `PMREMGenerator` 環境マップ / `Fog` / 自発光は `toneMapped=false`。
- **`outputColorSpace`(sRGB)未設定**＝r128の既定リニア出力前提で色を作り込んでいる（←ここがr160で最大の破壊的変更）。
- ライト強度（Hemi/Directional/Ambient）は **物理正規化前(legacy)** の値。
- smoke(jsdom)は外部 `three` を読まず、`threeReady=false` 経路でロジックのみ検証して通っている。
- 配布：`vendor/three.min.js`(ローカル) + `build.js`(dist へコピー) + GitHub Pages。

## 確定すべき方針（推奨を明記）
1. **依存とビルド**：推奨＝**ESMの three + addons をローカル vendor ＋ esbuild で単一HTMLへバンドル**。
   - 理由：オフライン/単一HTML/将来のApp Store(Capacitor)という本作の identity を維持（CDN import map はネット依存で却下）。
   - 影響：`build.js` を「コピー」から「esbuildバンドル」へ拡張（**生成補助・実行時非依存＝成果物は常に単一HTML**）。devDependency に three / esbuild を追加（ゲーム本体はバンドル後ゼロ依存のまま）。
2. **ESMブートストラップ・グローバル方式（採用）**：小さな `<script type="module">` が **THREE（と将来のaddons）を import し `window` へ提供**。ゲーム本体は**通常スクリプトのまま global THREE/addons を使用**（＝大規模な"ロジック/描画分離"は不要）。
   - 効果：**jsdomは module を実行しない**ので `window.THREE` 未定義 → **smoke はロジックを従来通り検証**（balance/物理の回帰基盤を一切壊さない）。本体構造は維持＝低リスク。Stage1の移行は「ブートストラップの import を r128→r160 に差し替え＋本体の色/ライト再調整」に閉じる。
   - 実証：増分0.1（r128 ESM化）で smoke 緑・実機描画不変を確認済み。
3. **直列順守**：Stage1（移行・機能不変）を完全に緑にしてから Stage2（機能）へ。

---

## Stage 0 ── 足場（リスク小・絵は不変）
- [x] **0.1 three を UMD→ESM 化**：r128 ESMビルド(`vendor/three.module.js`)を同梱、`<script type="module">`で `window.THREE` 提供。本体コード不変。build.js/sw.js を対応（SW v3）。**smoke緑・実機描画不変を確認済み**。
- [ ] **0.2 esbuild＋addonブートストラップ**：esbuild(devDep)で three+addons(`EffectComposer/RenderPass/UnrealBloomPass/ShaderPass/OutputPass/GLTFLoader/SkeletonUtils`)を1つのESMへbundleし `window` へ提供。`build.js` をバンドル対応（成果物は単一HTML維持）。dev は import map もしくは vendor 直import。
- [ ] smoke がロジック側で従来通り緑、`npm run gates` 緑、実機で**r128のまま**現状描画が出る（まだ移行しない）ことを確認。
- **ゲート**：4ゲート緑・見た目不変。

## Stage 1 ── r128 → r160 移行（描画のみ・機能不変・厳格検証）★最重要　【実質完了】
- [x] vendor の three を **r128→r160** 差し替え（ブートストラップ import 経由）。削除/改名APIの使用なしを確認（旧encoding/Geometry/Face3 未使用）。
- [x] **色管理**：`renderer.outputColorSpace = SRGBColorSpace`。全 `CanvasTexture` に `.colorSpace=SRGBColorSpace`（`srgbTex` ヘルパー＋一括置換）。
- [x] **ライト**：当面 `renderer.useLegacyLights = true` で旧来強度を維持（移行差分を最小化）。→ 物理正規化への再スケールは後日（任意）。
- [x] **実機確認**：地面/馬/スタンド/影/カメラ等は正常。smoke緑・構文OK・balance不変（描画のみ）。
- [ ] **【後回し・既知】夕景の空(MeshBasic)が暗くなる**。暫定で空テクスチャを `LinearSRGBColorSpace`（デコード無し）にして緩和済み。黄昏の見え方の微調整は後日。
- **ゲート**：実機で破綻なし（空のトーンのみ要微調整）。**Stage2 着手可**。

## Stage 2 ── スライス技術の統合（段階的・各々4ゲート＋実機）
- [ ] **2a. EffectComposer**：Bloom＋グレード＋ビネット＋OutputPass（スライス移植）。常時は控えめ、直線/ゴール前で強める（予算オーケストレーター連動・「予算先払い」）。
- [ ] **2b. GLTF馬モデル**：`makeHorseMesh`(箱)→ GLTF へ置換。**接地IK・首pump をスライスから移植**し、`drawTrack` の馬更新ループへ結線。脚の位相アニメは fallback として残す。※暫定は公式 `Horse.glb`、本番は**ボーン付きサラブレッド**（別アセット工程）。毛色/差し毛/ゼッケン/枠番帽の既存仕様を新モデルへ写経。
- [ ] **2c. インスタンシング**：発走ゲート支柱・観客・砂煙・（必要なら芝）を InstancedMesh 化＝ドローコール削減（スライスで 234→34 を実証）。
- [ ] **2d. カメラ**：スライスの静穏リグ/真後ろ option を `CameraDirector` に統合（既存チェイス/一人称/俯瞰は維持）。
- **各サブステージのゲート**：描画のみ＝**balance不変**、4ゲート＋実機、FPS実測。

## Stage 3 ── モバイル実機＆予算連動の仕上げ
- [ ] 中位Android実機でFPS計測。Composer/GLTF/影/インスタンスを**予算オーケストレーターにぶら下げ**、動的解像度/LOD/カリングでティア別に60/30fps保証。
- [ ] HTML総量・初期ロード体感（GLTF/addons同梱）の確認（≤2MB目標／超過時はサイト配布で外部fetch）。

---

## 横断リスクと対策
- **色/ライト総崩れ（最大リスク）**：Stage1を機能ゼロで単独遂行・実機で旧版と比較。`§5`トーンマップ規約（exposure1.16・MeshBasic toneMapped=false）を r160 文脈で再定義。
- **smoke が module で動かない**：→ **ブートストラップ・グローバル方式**で回避（本体は通常スクリプト＝jsdomで実行され、moduleは無視される＝THREE未定義でロジック検証は不変）。増分0.1で実証済み。
- **balance を揺らさない**：本移行は描画のみ。`stepRace/computeDesired/engine.js/timeScale` は不可触。各コミットで balance_check。
- **配布の単一HTMLが壊れる**：esbuild は「生成補助」。dev は分割、**dist は常に単一HTML**を維持（build検査でCDN残存/外部参照を検出）。
- **GLTF馬の品質**：暫定サンプルはモーフ。本番品質はボーン付きアセット導入が前提（首/脚の表現・IK簡素化）。アセット工程は独立投資。
- **effort 目安**：Stage0=S / Stage1=L（色再調整が主）/ Stage2=L（2bが重い）/ Stage3=M。**Stage1の単独完遂が成否を分ける**。

## マイルストーン受け入れ
- [ ] Stage1完了＝r160で**現状同等以上の絵**・全ゲート緑・balance不変。
- [ ] Stage2完了＝レース画面にBloom/GLTF馬/接地IK/首pump/インスタンシングが乗り、balance不変・実機60fps。
- [ ] Stage3完了＝中位Android下限クリア・予算オーケストレーター連動。
- [ ] 共通：`node --check` / 文字化け / balance_check / 実機（§8 4ゲート）。
