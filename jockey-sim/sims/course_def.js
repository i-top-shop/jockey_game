/**
 * 共有正典定義（コース＋ライバル騎手個性） — AAAロードマップ Phase2-7「コース定義の一元化」
 *
 * ・COURSE_DEF: コースをセグメント列（直線/円弧）で表すデータ駆動定義。
 *     現行オーバルの「同値再現」：第1コーナー(R140半円)→向正面360m→最終コーナー(R140半円)
 *     →ホームストレッチ360m→ゴール(s=0)。トータル周長 2π·140+720 ≈ 1599.6m。
 *     東京府中への移行はこのテーブルの差し替え（クロソイドは type:"clothoid" を追加実装）で行う。
 * ・groundLoss: 横ロスを二値(直線/コーナー)から曲率連続 f(κ) へ拡張した係数。
 *     κ=0 → 0.0005（旧 groundLossStraight） / κ=1/140 → 0.0026（旧 groundLossBend）を通る線形
 *     ＝現行コースでは完全に同値（balance_check の前提を汚さない）。
 * ・JOCKEY_PERSONAS: ライバル騎手の個性（行動傾向のみ・馬の能力数値は不変＝±15%思想を守る）。
 *     commit=仕掛けの前倒しm（+早仕掛け/−脚ため）、lane=置き所の内外バイアス、
 *     aggr=被せ/包みの積極性（本体のみ使用）、名前はすべて架空。
 *
 * 使い方:
 *   node   : const { COURSE_DEF, JOCKEY_PERSONAS, buildCourse } = require("./course_def");
 *   ブラウザ: jockey_game.html 内に同一データを埋め込み（window.COURSE_DEF / window.JOCKEY_PERSONAS）。
 *            sims/smoke.js が本モジュールと埋め込みを機械照合＝二重定義のドリフトを検出する。
 */
(function(root){
  "use strict";

  const COURSE_DEF = {
    name: "北嶺競馬場（現行オーバル・同値再現）",
    laneW: 2.4,
    lanes: 8,
    // 始点（s=0=ゴール線）のポーズ。現行 trackPose(0) と同一：(SL/2, R)・heading 0（+X向き）
    start: { x: 180, z: 140, heading: 0 },
    segments: [
      { type:"arc",      len: Math.PI*140, R:140, dir:-1 },  // 第1コーナー（右回り半円）
      { type:"straight", len: 360 },                          // 向正面
      { type:"arc",      len: Math.PI*140, R:140, dir:-1 },  // 第2＝最終コーナー（右回り半円）
      { type:"straight", len: 360 },                          // ホームストレッチ → ゴール(s=0)
    ],
    // 横ロス係数 f(κ)：gl(κ) = straight + (bendRef - straight) × clamp(κ/kappaRef, 0, 1)
    groundLoss: { straight: 0.0005, bendRef: 0.0026, kappaRef: 1/140 },
  };

  // ライバル騎手の個性（すべて架空の騎手名）。effects は AI の行動傾向のみ。
  //   commit: 仕掛け地点の前倒しm（正=早仕掛け・負=ぎりぎりまで脚をためる）
  //   lane  : 置き所バイアスへの加算（負=イン突き・正=外へ持ち出す）
  //   aggr  : 被せ/包みの積極性倍率（本体の updateSqueeze のみ参照。engine.js には無い）
  const JOCKEY_PERSONAS = [
    { name:"早瀬 迅",   tag:"強気の早仕掛け", commit:+65, lane: 0.0, aggr:1.3 },
    { name:"深井 慎",   tag:"脚ため職人",     commit:-55, lane: 0.0, aggr:0.8 },
    { name:"内村 蔵人", tag:"イン突きの名手", commit:  0, lane:-0.7, aggr:1.1 },
    { name:"大曽根 豪", tag:"大外一気",       commit:  0, lane:+0.8, aggr:0.9 },
    { name:"並木 均",   tag:"堅実穏健",       commit:  0, lane: 0.0, aggr:1.0 },
    { name:"鬼頭 剛",   tag:"喧嘩上等",       commit:+30, lane:+0.3, aggr:1.5 },
    { name:"白石 涼",   tag:"クレバー",       commit:-30, lane:-0.3, aggr:0.9 },
    { name:"風間 翔",   tag:"バランス型",     commit:  0, lane: 0.0, aggr:1.0 },
  ];

  /** COURSE_DEF から走行系（kappaAt / poseAt / glOf / 周長）を構築する。
   *  直線と定常円弧は閉形式＝サンプリング誤差ゼロ（現行コースの同値再現を保証）。 */
  function buildCourse(def){
    // セグメント入口ポーズを積み上げ
    const segs=[]; let s0=0;
    let x=def.start.x, z=def.start.z, hd=def.start.heading;
    for(const sg of def.segments){
      const e={ ...sg, s0, x0:x, z0:z, h0:hd };
      segs.push(e);
      if(sg.type==="arc"){
        const k=(sg.dir||-1)/sg.R;                       // 符号付き曲率（右回り=負）
        const h1=hd + k*sg.len;
        x = x + ( Math.sin(h1)-Math.sin(hd) )/k;
        z = z - ( Math.cos(h1)-Math.cos(hd) )/k;
        hd = h1;
      } else {
        x += Math.cos(hd)*sg.len; z += Math.sin(hd)*sg.len;
      }
      s0 += sg.len;
    }
    const P=s0;
    const gl=def.groundLoss;
    function segOf(s){ s=((s%P)+P)%P; for(let i=segs.length-1;i>=0;i--){ if(s>=segs[i].s0) return [segs[i], s-segs[i].s0]; } return [segs[0], s]; }
    return {
      P, laneW:def.laneW, lanes:def.lanes,
      kappaAt(s){ const [sg]=segOf(s); return sg.type==="arc" ? (sg.dir||-1)/sg.R : 0; },
      poseAt(s){
        const [sg,d]=segOf(s);
        if(sg.type==="arc"){
          const k=(sg.dir||-1)/sg.R, h=sg.h0+k*d;
          return { x: sg.x0+(Math.sin(h)-Math.sin(sg.h0))/k,
                   z: sg.z0-(Math.cos(h)-Math.cos(sg.h0))/k,
                   heading: h, curve: k };
        }
        return { x: sg.x0+Math.cos(sg.h0)*d, z: sg.z0+Math.sin(sg.h0)*d, heading: sg.h0, curve: 0 };
      },
      glOf(kappaAbs){
        const t=Math.max(0, Math.min(1, kappaAbs/gl.kappaRef));
        return gl.straight + (gl.bendRef-gl.straight)*t;
      },
    };
  }

  const api={ COURSE_DEF, JOCKEY_PERSONAS, buildCourse };
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  else { root.COURSE_DEF=COURSE_DEF; root.JOCKEY_PERSONAS=JOCKEY_PERSONAS; root.buildCourse=buildCourse; }
})(typeof globalThis!=="undefined" ? globalThis : this);
