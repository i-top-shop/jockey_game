# CLAUDE.md — 蹄音（ひづめおと）-ジョッキーの判断-

3DジョッキーシミュレーションSLG（単一HTML / Three.js r128 / スマホ縦画面前提）。
ロールモデルは **Gallop Racer**。コア体験は **「最高の騎乗で能力差を覆した」** という達成感。

## 0. 設計理念（変更不可）
- 重視: ペース判断・位置取り・折り合い・馬群さばき・仕掛けタイミング・展開予測
- 排除: ムチ連打・反射神経・連打ゲー（**入力は少なく・重く**。すべて状態設定型）
- 固有能力・調子・距離適性はどれも**単独で±15%以内**＝常に「腕で覆せる」余地を残す

## 1. リポジトリ構成
```
jockey_game.html        … ゲーム本体（全コード内包・約2,500行・単一<script>）
CLAUDE.md               … 本ファイル（開発憲法）
sims/engine.js          … AI12頭のヘッドレスレースエンジン（本体物理の写し）
sims/balance_check.js   … 回帰チェック（物理を触ったら必ず実行）
sims/stamina_tune.js    … スタミナ調整実験（BASEスイープ）
docs/jockey_sim_redesign.md … Gallop Racer再設計ブループリント（フェーズ2計画）
docs/jockey_game_design.md  … 初期設計書
```

## 2. ゲーム本体の地図（jockey_game.html 内）
| 区画 | 内容 |
|---|---|
| CSS | HUD／7段ギア・速度計／順位ボード／実況帯／写真判定／出走前カード／ビネット等 |
| markup | screens: title / select / tactic / race / result。track-wrap内に各オーバーレイ |
| 定義 | `CFG`（物理定数）`STYLES`（脚質）`ABILITIES`（固有12種）`CANDIDATES`（騎乗馬12頭）`COATS` |
| 生成 | `buildField`→`makeHorse`→`deriveParams`（ステータス→物理）。調子・馬体重・人気/オッズもここ |
| 進行 | `initRace`（距離/馬場/展開予測/ゲートカード）→`updateGate`（自動発走）→`beginRun`→`loop`→`stepRace`/`computeDesired`（物理中核）→`finishRace`（賞金/写真判定/講評`buildAdvice`） |
| 操作 | `shiftGear`(7段)・`doWhip`・内外レーン。`resetPlayerControls`/`syncGearUI` |
| 音 | `Sfx`（Web Audio合成: 4ビート蹄音`gallopStride`・地鳴り`rumble`・歓声・ベル・ジングル） |
| 実況 | `jcall`(テキスト)＋`callRace`(イベント検知)。`Voice`（Web Speech・**男性日本語音声優先**） |
| 3D | `ensureThree`(ACESトーンマップ)・`buildTrack/Stand/Sun`・`Dust`・`buildStartGate`・`makeHorseMesh`（**膝関節脚**）・`drawTrack`（バンク/騎手追い/砂煙/影/順位ボード）・`updateCamera` |

## 3. 物理・バランスの基準値（★=実測調整済み。安易に変えない）
```
コース: 右回りオーバル 周長1599.6m（TRK_R140/TRK_SL360/LANE_W2.4/8レーン）。ゴール固定、
        距離変更は startS=((P-(DIST%P))%P) で開始点を後退。残り400mから直線。
速度  : cruiseBase 18.8 ★ / topSpeed=19.4+(speed-78)*0.072+aptF*0.30（×調子×局面補正）
適性  : aptF=clamp(0.45-|DIST-aptDist|/650, -0.7, 0.45) → top+0.30aptF・drainResist×(1+0.12aptF)
脚質  : cruiseGain 逃+0.55/先+0.22/差-0.22/追-0.46、staBurn 1.08/1.00/0.92/0.84、
        kickGain 0.62/0.88/1.08/1.22、AI仕掛け残り 520/450/370/310(±55)
消費  : drain = 0.34★(基礎) + pow(max(0,v-16.3),1.8)*0.052*staBurn ★
        + AI仕掛け1.0 / プレイヤー max(0,gear-4)*0.45 / 力み0.9 → ×馬場 → /drainResist
馬場  : 良1.0(bad0)/稍重1.045(bad0.6)/重1.09(bad1.0)。mudは重で消費1.0&top+6%、fastは良+5%
失速  : stamina<24 で上限が floor0.66(stayer0.76)まで線形低下
時間  : timeScale 1.5 ★（2.0は「速すぎ」で却下済み）/ finishMult 5 / dtCap 0.06
馬群  : 前詰まり gap<6.5(breaker×0.8)&レーン差<0.95 / コーナー外ロス0.0026・直線0.0005
演出  : スローモー=残り48m&2着差<3m→×0.42 / 写真判定=1-2着タイム差<0.03
調子  : 絶好調1.04/普通1.0/地味0.985/不調0.965（top・drainResist両方に乗算）
```

### 検証済みベースライン（`node sims/balance_check.js` がこのレンジに入ればOK）
> ⚠ この数値は**現行オーバルコース前提**（周長1599.6m）。東京府中の実測ジオメトリへ移行する際は別レンジへ再定義する（[docs/AAA_roadmap.md](docs/AAA_roadmap.md) のPhase3a・物理再バランス節を参照）。正規出典は `sims/balance_check.js` line 6。
| 距離 | 時計(シム) | 脚質傾向 | スタミナ切れ | 適性◎/× |
|---|---|---|---|---|
| 1200m | ≈64s | 前有利（逃+先≥50%） | ≤2頭 | 9-11% / 5-7% |
| 1600m | ≈86s | 均衡〜差し優勢 | ≤4頭 | 〃 |
| 2000m | ≈111s | 差+追≥55% | ≤8頭 | 〃 |
- 固有12種の勝率シェアは 6〜12%。13%超え or 4%未満（大標本で）は要調整。

### ⚠ 実証済みの失敗パターン（やってはいけない）
1. **スタミナを一律に緩める**（DM<1、COEF↓、FREE↑）→ 逃げ先行が止まらず差し追込が壊滅。
   緩めるのは **基礎消費BASEのみ**（0.30〜0.40の範囲、現行0.34）。
2. 固有・調子の効果を15%超に → 「腕より馬」のゲームになる。
3. timeScale変更はユーザー合意必須（1.5で確定）。

## 4. プレイヤー操作仕様
- **7段ギア**: target = idle + (maxv-idle)×(g-1)/6。idle=巡航-3、maxv=max(top+0.8, 巡航+2.6)。
  G4≈巡航 / G1=抑える(折り合い回復) / G7=全力。G5以上で仕掛け扱い（_commitAt記録）。
  上限vCeil = top + 0.6+max(0,g-4)×0.35（G7はスタミナ切れ後も+0.8）。
- **折り合い**: G≤2で回復、G≥5で低下（気性keen依存、settle固有は×0.55）。
  **悪天候(bad>0)でギア上げ下げを反転させるとchurn蓄積**（反転+1.6/同方向+0.5、減衰0.6/s）
  → composure減 ×bad。「ガチャ切り＝折り合いを欠く」仕様。
- **ムチ**: 直線手前150mから。効果= whipPow×0.55^使用回数（逓減）、1.6s、CD0.75、
  スタミナ<12で不発。whipPow=1.25+(瞬発-70)×0.020。連打無効が思想。
- **発走**: 自動（反射要素なし）。出=gatePow+調子+乱数。rocketは出遅れ帳消し。

## 5. 3D・演出の注意（gotchas）
- **トーンマップ**: ACES exposure1.16。`MeshBasicMaterial`は一括で`toneMapped=false`
  （authored色維持）。**新規のMeshBasic/Sprite/数字スプライトにも必ず`toneMapped:false`**。
- **脚は2関節**: `legs=[{hip,knee,front}]`。位相 `LEGPH=[2.6,3.05,0,0.45]`(FL,FR,BL,BR)。
  hipスイング`0.72*sp*sin`、膝`(front?-1:1)*(0.30+0.55*sp)*max(0,sin(a+1.5))`。
  ※旧形式 `lg[i].rotation` のコードを書かない。
- **馬体の回転軸**: モデルは+X前方。`rotation.y`=向き / `rotation.x`=**バンク(ロール)**
  （コーナーで -0.17*sp へ lerp、内傾） / `rotation.z`=**うねり(ピッチ)** sin(ph)*0.055*sp。
  バウンド bob=max(0,sin(ph+0.3))*0.085*sp。騎手は gear≥6/ムチで低く激しく追う。
- **砂煙Dust**: スプライトプール60。自馬から26m以内・3.2m毎・馬場で色変化。
- **発走ゲート**: `syncHorseMeshes`内で`buildStartGate(startS)`再構築、`beginRun`で
  `openStartGate()`。アニメはフレーム加算(+0.03)。
- **順位ボード/スピードライン/速度計**: renderで毎フレーム更新（軽量DOM/CSS）。
- CFG.DIST/straightDist は**レース毎に変異**。判定は残り距離ベースで書く。

## 6. 音声（Sfx / Voice）
- Sfx: 合成のみ（アセット無し）。蹄音は**4ビート**`gallopStride`（7.0m毎・距離同期）、
  地鳴りrumble(lowpass180, 速度連動≤0.16)、歓声(道中0.06→直線0.19→ゴール0.30)。
  master 0.85。初回タップで init/resume（自動再生制限対応）。
- Voice: Web Speech。**男性ja音声優先**（Otoya/Ichiro/Hattori/Daichi/Takumi…、女性名は回避。
  無ければ pitch0.82 で男性寄り補正、男性voiceなら0.94）。rate1.06。
  読み上げは `jcall(text, lead=true)` のみ（発走/最終コーナー/直線/接戦/仕掛け/全力/ムチ/
  写真判定/「1着は、◯◯！」）。**cancel-then-speak**で最新優先。
  正規化: 括弧除去・全角空白→読点・`\d+m`→メートル・1着→いっちゃく。
  iOS対策で初回ジェスチャー時に`prime()`。ミュート(Sfx.on)に追従。

## 7. キャリア（セッション内）
- 賞金: 着順[—,1000,400,250,150,100,60,40,30]万 × 距離倍率(1/1.1/1.3)
- 騎手P: [—,50,24,16,10,6,3]。**人気薄(5番人気以下)で勝つと+30**＝コア達成感に直結
- `state.career`{funds,points,races,wins}はメモリ内。結果画面ピル＋タイトルに通算表示。

## 8. 開発ワークフロー（必須）
1. **物理・固有・距離を触ったら**: `node sims/balance_check.js`（レンジは§3）。
   スタミナ系は `node sims/stamina_tune.js` も。
2. **構文**: ブラウザで開く前に `node --check`（インライン<script>を抽出して検証）。
3. **無頭スモーク**: `npm run smoke`（jsdom）でロード時実行・DOM結線・画面遷移・**無頭レース完走＋永続化**を自動検証（要素ID参照ミス／ロード時例外を機械検出）。`npm run gates` で balance_check＋smoke を一括実行。※jsdom は devDependency（`npm i`）。ゲーム本体はゼロ依存の単一HTMLのまま。
4. **見た目・手触り**: スモークが緑でも、最終は必ず実ブラウザでプレイ確認（描画・カメラ・音はWebGL/WebAudioが要るためjsdomでは見えない）。**Playwright MCP導入を強く推奨**
   （スクリーンショット＋consoleエラー確認まで自動化できる）。
5. 文字化け検査: 過去にハングル1文字混入事故あり。非日本語CJKの混入をgrepで確認。
6. 配布形態: claude.aiアーティファクトで配るなら **localStorage禁止**（動かない）。
   ローカル/自社サイト配布なら localStorage/IndexedDB 使用可（フェーズ2の永続化はこちら）。

## 9. フェーズ2ロードマップ（docs/jockey_sim_redesign.md 詳細）

> 📌 **AAA級スマホ・ジョッキーゲーム化の正式計画は [docs/AAA_roadmap.md](docs/AAA_roadmap.md)（Phase1-4）が最新・正典。** 本§9は初期フェーズ2構想で、AAAロードマップに包含・拡張された。エンジン横断の鉄則（物理の縦は凍結／engine.js同期義務／±15%不可侵／判定は残距離ベース／全コミット前4ゲート）はAAAロードマップ「エンジン横断の鉄則」節を参照。
1. **騎手成長**: スタート/折り合い/さばき/追い の騎手スキル（補正は各≤10%）＋賞金ループ
2. **重賞G3→G1**＋**年間スケジュール**（騎乗依頼＝どの馬で勝つかの戦略）
3. 専用出馬表画面・キャリア永続化
4. 複数コース（固有「東京巧者」等の有効化）
5. ポリッシュ: BGMループ、モーション微調整（hip0.72/膝0.30+0.55/バンク-0.17は初期値。
   実機を見ながら詰める）、写真判定のカメラズーム

## 10. 移行セットアップ
```
F:\VS\jockey-sim\ を作成 → 本キット一式を配置 → git init & 初回コミット
→ claude で起動 → 「CLAUDE.mdを読んでから作業して」
→ 初手推奨: ①Playwright MCPで描画検証体制 ②sims実行確認 ③フェーズ2の騎手成長から着手
```
