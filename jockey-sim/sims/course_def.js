/**
 * 共有正典定義（コース＋ライバル騎手個性） — AAAロードマップ Phase3a「東京府中の実測ジオメトリ」
 *
 * ・COURSE_DEF: 北嶺競馬場〈府中モデル〉。左回り・周長2083.1m・ホームストレッチ525.9m・
 *     高低差2.7m（3角進入から下り→直線残り460→260mに+2.0mの上り坂）。
 *     実在の東京競馬場（芝Aコース）の公開数値（周長約2083m・直線525.9m・高低差2.7m・左回り）を
 *     骨格に、コーナー半径/クロソイド長/向正面長は「閉路が機械精度で閉じる」よう
 *     数値ソルバで解いた調整値（閉路誤差1.2e-10m・旋回和=2π）。
 *     セグメント: ゴール→立ち上がり120m→1-2角(クロソイド50+R95円弧+クロソイド50)
 *     →向正面645.9m→3-4角(クロソイド90+R112円弧+クロソイド90=大回り複合)→直線525.9m→ゴール。
 *     発走位置は距離から自動導出（startS=P-DIST）：2000m=ゴール板過ぎ（1角ポケット相当）・
 *     1600m=向正面入口・1200m=向正面奥、と実配置の趣を再現する。
 * ・elevation: 標高プロファイル（s→標高m の折れ線）。elevAt/gradeAt を buildCourse が提供。
 * ・slope: 坂の物理係数（勾配1%あたり）。upDrain=上りのスタミナ追加消費/秒、
 *     upSlow=上りの目標速度低下(m/s)、downFast=下りの目標速度増加(m/s)。
 *     engine.js と本体の両方が同一式で参照する（Phase3a 物理再バランスの回帰対象）。
 * ・groundLoss: 横ロス f(κ)。kappaRef=最タイト半径(R95)の曲率。クロソイドでロスが連続に立ち上がる。
 * ・JOCKEY_PERSONAS: ライバル騎手の個性（行動傾向のみ・馬の能力数値は不変＝±15%思想を守る）。
 *
 * 使い方:
 *   node   : const { COURSE_DEF, JOCKEY_PERSONAS, buildCourse } = require("./course_def");
 *   ブラウザ: jockey_game.html 内に同一データを埋め込み（smoke.js が座標/κ/gl/標高を機械照合）。
 */
(function(root){
  "use strict";

  const COURSE_DEF = {
    name: "北嶺競馬場〈府中モデル〉左回り 芝2083m",
    laneW: 2.4,
    lanes: 8,
    homeStraight: 525.9,                     // 最終直線長（直線判定・実況・HUDの正典）
    // 始点（s=0=ゴール線）。コース重心がワールド原点に来る平行移動量（ソルバのbboxから算出）
    start: { x: 221.37, z: -114.34, heading: 0 },
    // 閉路ソルバの解（旋回和=2π・閉路誤差1.2e-10）。数値は調整値（出典: 周長/直線/高低差はJRA公開値）
    segments: [
      { type:"straight", len: 120 },                                              // ゴール→1角 立ち上がり
      { type:"clothoid", len: 50,  k0: 0,                 k1: 1/95 },              // 1角 進入緩和
      { type:"arc",      len: 243.426335230765, R: 95,    dir: +1 },               // 1-2角 本体（タイト）
      { type:"clothoid", len: 50,  k0: 1/95,              k1: 0 },                 // 2角 脱出緩和
      { type:"straight", len: 645.9 },                                             // 向正面（長い）
      { type:"clothoid", len: 90,  k0: 0,                 k1: 1/112.02852292395615 }, // 3角 進入緩和
      { type:"arc",      len: 267.87366476933585, R: 112.02852292395615, dir: +1 }, // 3-4角 本体（大回り）
      { type:"clothoid", len: 90,  k0: 1/112.02852292395615, k1: 0 },              // 4角 脱出緩和
      { type:"straight", len: 525.9 },                                             // ホームストレッチ → ゴール(s=0)
    ],
    // 横ロス係数 f(κ)：gl(κ) = straight + (bendRef - straight) × clamp(κ/kappaRef, 0, 1)
    //   kappaRef=1/95（最タイトの1-2角）。bendRef はPhase3a再バランスの回帰値。
    groundLoss: { straight: 0.0005, bendRef: 0.0032, kappaRef: 1/95 },
    // 標高プロファイル（[s, 標高m] 折れ線・s=0=ゴール・e(0)=e(P)）。高低差2.7m。
    //   3角手前(s≈1050)が最高2.9 → 3-4角で下り → 直線入口過ぎ(残り460m)が最低0.2
    //   → 残り460→260mで+2.0mの上り（心臓破りの坂）→ ゴールまでほぼ平坦。
    elevation: [
      [0, 2.4], [120, 2.4], [460, 1.9], [760, 2.2], [1050, 2.9],
      [1350, 1.3], [1557.2, 0.6], [1623, 0.2], [1823, 2.2], [2083.1, 2.4],
    ],
    // 坂の物理（勾配1%あたり）。Phase3a 多目的グリッドサーチの回帰値。
    slope: { upDrain: 0.35, upSlow: 0.50, downFast: 0.20 },
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

  /** COURSE_DEF から走行系（kappaAt / poseAt / glOf / elevAt / gradeAt / 周長）を構築する。
   *  直線と定常円弧は閉形式。クロソイドは構築時に1m刻みでシンプソン積分したLUTを線形補間
   *  （位置誤差はサブmm・headingとκは解析式）。
   *  outSign: 外向き法線の符号。右回り(+1)＝現行互換 / 左回り(-1)。laneWorld系はこれを使う。 */
  function buildCourse(def){
    // セグメント入口ポーズを積み上げ（クロソイドはLUT生成）
    const segs=[]; let s0=0, turn=0;
    let x=def.start.x, z=def.start.z, hd=def.start.heading;
    for(const sg of def.segments){
      const e={ ...sg, s0, x0:x, z0:z, h0:hd };
      segs.push(e);
      if(sg.type==="arc"){
        const k=(sg.dir||-1)/sg.R;
        const h1=hd + k*sg.len;
        x = x + ( Math.sin(h1)-Math.sin(hd) )/k;
        z = z - ( Math.cos(h1)-Math.cos(hd) )/k;
        hd = h1; turn += k*sg.len;
      } else if(sg.type==="clothoid"){
        // κ(d)=k0+(k1-k0)d/L・h(d)=h0+k0·d+(k1-k0)d²/2L。1m刻みシンプソンでLUT化
        const L=sg.len, n=Math.max(8, Math.ceil(L)), lut=new Float64Array((n+1)*2);
        let cx=x, cz=z; lut[0]=cx; lut[1]=cz;
        const hAt=d=>hd + sg.k0*d + (sg.k1-sg.k0)*d*d/(2*L);
        for(let i=0;i<n;i++){
          const d0=L*i/n, d1=L*(i+1)/n, dm=(d0+d1)/2, dd=d1-d0;
          cx += dd/6*(Math.cos(hAt(d0))+4*Math.cos(hAt(dm))+Math.cos(hAt(d1)));
          cz += dd/6*(Math.sin(hAt(d0))+4*Math.sin(hAt(dm))+Math.sin(hAt(d1)));
          lut[(i+1)*2]=cx; lut[(i+1)*2+1]=cz;
        }
        e.lut=lut; e.n=n;
        x=cx; z=cz; hd=hAt(L); turn += (sg.k0+sg.k1)*L/2;
      } else {
        x += Math.cos(hd)*sg.len; z += Math.sin(hd)*sg.len;
      }
      s0 += sg.len;
    }
    const P=s0;
    const closure=Math.hypot(x-def.start.x, z-def.start.z);   // 閉路誤差（smokeが<0.05mを照合）
    const gl=def.groundLoss;
    // 標高（折れ線補間）。gradeAt は±10mの中央差分＝折れ点を滑らかに
    const ep=def.elevation||[[0,0],[P,0]];
    function elevAt(s){
      s=((s%P)+P)%P;
      for(let i=1;i<ep.length;i++){
        if(s<=ep[i][0]){ const [s0e,e0]=ep[i-1], [s1e,e1]=ep[i];
          return e0 + (e1-e0)*((s-s0e)/Math.max(1e-9,(s1e-s0e))); }
      }
      return ep[ep.length-1][1];
    }
    function gradeAt(s){ return (elevAt(s+10)-elevAt(s-10))/20; }
    function segOf(s){ s=((s%P)+P)%P; for(let i=segs.length-1;i>=0;i--){ if(s>=segs[i].s0) return [segs[i], s-segs[i].s0]; } return [segs[0], s]; }
    return {
      P, laneW:def.laneW, lanes:def.lanes,
      homeStraight: def.homeStraight || 400,
      outSign: turn<0 ? +1 : -1,             // 右回り=+1（現行互換）/ 左回り=-1
      closure,
      kappaAt(s){
        const [sg,d]=segOf(s);
        if(sg.type==="arc") return (sg.dir||-1)/sg.R;
        if(sg.type==="clothoid") return sg.k0 + (sg.k1-sg.k0)*d/sg.len;
        return 0;
      },
      poseAt(s){
        const [sg,d]=segOf(s);
        if(sg.type==="arc"){
          const k=(sg.dir||-1)/sg.R, h=sg.h0+k*d;
          return { x: sg.x0+(Math.sin(h)-Math.sin(sg.h0))/k,
                   z: sg.z0-(Math.cos(h)-Math.cos(sg.h0))/k,
                   heading: h, curve: k };
        }
        if(sg.type==="clothoid"){
          const L=sg.len, t=d/L*sg.n, i=Math.min(sg.n-1, Math.floor(t)), f=t-i;
          return { x: sg.lut[i*2]*(1-f)+sg.lut[(i+1)*2]*f,
                   z: sg.lut[i*2+1]*(1-f)+sg.lut[(i+1)*2+1]*f,
                   heading: sg.h0 + sg.k0*d + (sg.k1-sg.k0)*d*d/(2*L),
                   curve: sg.k0 + (sg.k1-sg.k0)*d/L };
        }
        return { x: sg.x0+Math.cos(sg.h0)*d, z: sg.z0+Math.sin(sg.h0)*d, heading: sg.h0, curve: 0 };
      },
      glOf(kappaAbs){
        const t=Math.max(0, Math.min(1, kappaAbs/gl.kappaRef));
        return gl.straight + (gl.bendRef-gl.straight)*t;
      },
      elevAt, gradeAt,
    };
  }

  const api={ COURSE_DEF, JOCKEY_PERSONAS, buildCourse };
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  else { root.COURSE_DEF=COURSE_DEF; root.JOCKEY_PERSONAS=JOCKEY_PERSONAS; root.buildCourse=buildCourse; }
})(typeof globalThis!=="undefined" ? globalThis : this);
