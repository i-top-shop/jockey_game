/**
 * バランス回帰チェック（物理・固有・距離まわりを変更したら必ず実行）
 *   node sims/balance_check.js [レース数/距離]   省略時 1200
 *
 * ■ 合格目安（2026-07 Phase3a 府中モデル・実時計帯ベースライン / drain BASE=0.28・FREE=16.1・COEF=0.055
 *   ・slope.upDrain=0.35・bendRef=0.0032。旧オーバル(1200≈64s/1600≈86s/2000≈111s)は廃止）
 *   時計        : 1200m 66-71s / 1600m 90-95s / 2000m 114-120s（勝ち時計。体感は÷timeScale1.5）
 *   脚質        : 1200mは前寄り（逃+先 ≥ 38%）/ 2000mは差し+追込 ≥ 60%。
 *                 どの脚質も 8%未満に沈まない・47%超で支配しない
 *   スタミナ切れ: 1200m ≤ 2.5頭 / 1600m ≤ 4.5頭 / 2000m ≤ 8.5頭（12頭中、minSta<4）
 *   距離適性    : ◎(±200m) 9〜11.5% / ×(600m以上ズレ) 5〜7%（平均8.3%。1600mの×は構造上サンプル無し）
 *   固有        : 全12種が 4〜13.5% に収まる（超えたら調整。末脚系は「残り400m」紐付けが正典）
 */
const { runMany, ABK } = require("./engine");
const N = parseInt(process.argv[2]||"1200",10);
const AB_JA={rocket:"ロケット",settle:"折り合い",burst:"末脚爆発",breaker:"馬群突破",corner:"コーナー巧者",stayer:"スタミナ王",fighter:"勝負根性",widerush:"大外一気",frontsoul:"逃げ魂",hotblood:"剛腕気性",mud:"雨の鬼",fast:"高速巧者"};
const TIME_TGT={1200:[66,71], 1600:[90,95], 2000:[114,120]};
const EMPT_LIM={1200:2.5, 1600:4.5, 2000:8.5};

let allOk=true;
for(const DIST of [1200,1600,2000]){
  const r=runMany(DIST,N);
  const s=r.styles, pv=k=>s[k]/N*100, pct=k=>pv(k).toFixed(0);
  const [t0,t1]=TIME_TGT[DIST];
  const timeOk = r.time>=t0 && r.time<=t1;
  const styleOk = ["nige","senko","sashi","oikomi"].every(k=>pv(k)>=8 && pv(k)<=47)
    && (DIST!==1200 || (pv("nige")+pv("senko"))>=38)
    && (DIST!==2000 || (pv("sashi")+pv("oikomi"))>=60);
  const emptOk = r.emptiedPerRace <= EMPT_LIM[DIST];
  const shares=ABK.map(k=>[k, r.abilities[k]/N*100]).sort((a,b)=>b[1]-a[1]);
  const abOk = shares.every(([k,v])=>v>=4 && v<=13.5);
  if(!(timeOk&&styleOk&&emptOk&&abOk)) allOk=false;
  console.log(`\n=== ${DIST}m （${N}レース） ===`);
  console.log(`勝ちタイム平均: ${r.time.toFixed(1)}s（目安 ${t0}-${t1}s）${timeOk?"✓":"✗"}`);
  console.log(`脚質勝率: 逃 ${pct("nige")}% / 先 ${pct("senko")}% / 差 ${pct("sashi")}% / 追 ${pct("oikomi")}% ${styleOk?"✓":"✗"}`);
  console.log(`スタミナ切れ: ${r.emptiedPerRace.toFixed(1)}頭/12（≤${EMPT_LIM[DIST]}）${emptOk?"✓":"✗"}  平均最低スタミナ: ${r.avgMinSta.toFixed(0)}`);
  console.log(`距離適性 1頭あたり勝率: ◎ ${r.aptGoodRate.toFixed(1)}% / × ${isNaN(r.aptBadRate)?"—":r.aptBadRate.toFixed(1)+"%"} (平均8.3%)`);
  const warn=shares.filter(([k,v])=>v>13.5||v<4).map(([k,v])=>`${AB_JA[k]}${v.toFixed(1)}%`);
  console.log(`固有シェア最大: ${AB_JA[shares[0][0]]} ${shares[0][1].toFixed(1)}% / 最小: ${AB_JA[shares[shares.length-1][0]]} ${shares[shares.length-1][1].toFixed(1)}%${warn.length?`  ⚠ 要注意: ${warn.join(", ")}`:"  ✓"}`);
}
console.log(allOk? "\n→ 全レンジ回帰OK（府中モデル・Phase3aベースライン）" : "\n→ ✗ レンジ外あり。原因のパラメータを戻す/再回帰（sims/tokyo_tune.js）すること。");
if(!allOk) process.exit(1);
