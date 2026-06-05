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
2. **アーキテクチャ分離**：**ロジック（非module・jsdom検証可）と 描画（ESM module・THREE/addons）を分離**。
   - 現コードは既に境界が緩く存在（`stepRace/computeDesired/UI/audio/career`＝ロジック ↔ `ensureThree/drawTrack/makeHorseMesh/updateCamera`＝描画）。
   - 効果：**smoke はロジック側を従来通り検証**（描画module は jsdom が現在の外部threeと同様に無視）。**balance/物理の回帰基盤を一切壊さない**。描画とロジックの疎結合化は将来にも効く。
3. **直列順守**：Stage1（移行・機能不変）を完全に緑にしてから Stage2（機能）へ。

---

## Stage 0 ── 足場（リスク小・絵は不変）
- [ ] esbuild 導入（devDep）。`build.js`：ロジック`<script>` ＋ 描画module をバンドルし dist/index.html を生成（インライン化＝単一HTML維持）。
- [ ] ESM three(r160) + 必要 addons を vendor（`EffectComposer/RenderPass/UnrealBloomPass/ShaderPass/OutputPass/GLTFLoader/SkeletonUtils`）。
- [ ] **コード分割の足場**：描画関連（`ensureThree/buildEnv/buildSky/buildLights/buildSun/buildTrack/buildStand/makeHorseMesh/drawTrack/updateCamera/Dust/buildStartGate`）を描画module へ寄せ、ロジックは非module のまま。`window` 経由の薄い橋渡しで状態共有（`state`/`CFG`/関数フック）。
- [ ] smoke がロジック側で従来通り緑、`npm run gates` 緑、実機で**r128のまま**現状描画が出る（まだ移行しない）ことを確認。
- **ゲート**：4ゲート緑・見た目不変。

## Stage 1 ── r128 → r160 移行（描画のみ・機能不変・厳格検証）★最重要
- [ ] 描画module を r160 ESM 化（`import * as THREE from 'three'`）。
- [ ] **色管理**：`renderer.outputColorSpace = SRGBColorSpace`、`THREE.ColorManagement.enabled=true`（既定）。全 `CanvasTexture` に `.colorSpace=SRGBColorSpace`、環境/反射系は `NoColorSpace/Linear` を適切に。**全色の見え方を再調整**（exposure/材質色/フォグ色）。
- [ ] **ライト**：物理正規化(useLegacyLights=false 既定)に合わせ Hemi/Directional/Ambient/Sun の intensity を再スケール。影(`PCFSoftShadowMap`)・`shadow.bias`再調整。
- [ ] **PMREM環境マップ**：r160 の API/色空間で再構築（`buildEnv`）。
- [ ] 削除/改名API（`outputEncoding`等）を置換。`MeshBasicMaterial.toneMapped=false` 群は維持。
- [ ] 予算オーケストレーター（`Budget`）の `renderer.info`/解像度操作を r160 対応に。
- **ゲート（このStageの完了条件）**：全画面遷移・無頭レース・**balance_check 回帰（不変）**・smoke 緑、**実機で「色が破綻せず現状同等以上」**（roadmapの「単独完了・検証」）。**ここを緑にするまで Stage2 に入らない。**

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
- **smoke が module で動かない**：→ ロジック/描画分離で回避（smoke はロジックのみ）。分離が不十分だと回帰基盤が死ぬので Stage0 の完了条件に必須化。
- **balance を揺らさない**：本移行は描画のみ。`stepRace/computeDesired/engine.js/timeScale` は不可触。各コミットで balance_check。
- **配布の単一HTMLが壊れる**：esbuild は「生成補助」。dev は分割、**dist は常に単一HTML**を維持（build検査でCDN残存/外部参照を検出）。
- **GLTF馬の品質**：暫定サンプルはモーフ。本番品質はボーン付きアセット導入が前提（首/脚の表現・IK簡素化）。アセット工程は独立投資。
- **effort 目安**：Stage0=S / Stage1=L（色再調整が主）/ Stage2=L（2bが重い）/ Stage3=M。**Stage1の単独完遂が成否を分ける**。

## マイルストーン受け入れ
- [ ] Stage1完了＝r160で**現状同等以上の絵**・全ゲート緑・balance不変。
- [ ] Stage2完了＝レース画面にBloom/GLTF馬/接地IK/首pump/インスタンシングが乗り、balance不変・実機60fps。
- [ ] Stage3完了＝中位Android下限クリア・予算オーケストレーター連動。
- [ ] 共通：`node --check` / 文字化け / balance_check / 実機（§8 4ゲート）。
