/**
 * Phase3a 物理再バランス：府中モデル用 多目的グリッドサーチ（座標降下）。
 *
 *   node sims/tokyo_tune.js [evalN]   省略時 400
 *
 * 目標（東京実時計帯・脚質バランス・スタミナ体験の3目的）:
 *   時計   : 1200 68-71s / 1600 92.5-96s / 2000 117-121.5s（勝ち時計）
 *   脚質   : 全距離で各9%以上・40%以下。1200は前(逃+先)≥45%、2000は差し追込≥50%
 *   スタミナ: 切れ ≤2.5 / ≤4.5 / ≤8.5 頭。固有シェア最大 ≤13%
 * 探索軸（engine.race の P オーバーライド）:
 *   BASE(基礎消費) / FREE(消費フリー速度) / SLU(坂の上り消費) / BEND(コーナー横ロス) / COEF(速度消費係数)
 * 収束した値は engine.js / course_def.js(slope.upDrain, groundLoss.bendRef) / 本体 に焼き込むこと。
 */
const prod = require("./engine");
const DISTS=[1200,1600,2000];
const N = parseInt(process.argv[2]||"400",10);
const sh = r => ({ nige:r.styles.nige/r.N*100, senko:r.styles.senko/r.N*100, sashi:r.styles.sashi/r.N*100, oikomi:r.styles.oikomi/r.N*100 });
const maxAb = r => Math.max(...prod.ABK.map(k=>(r.abilities[k]||0)/r.N*100));
const TIME_TGT = { 1200:[68,71], 1600:[92.5,96], 2000:[117,121.5] };
const EMPT_LIM = { 1200:2.5, 1600:4.5, 2000:8.5 };

function objective(P, verbose){
  let pen=0; const rows=[];
  for(const D of DISTS){
    const r=prod.runMany(D, N, P);
    const s=sh(r), mx=maxAb(r);
    for(const k of ["nige","senko","sashi","oikomi"]){
      if(s[k] < 9)  pen += (9 - s[k])*1.6;
      if(s[k] > 40) pen += (s[k] - 40)*1.2;
    }
    if(D===1200 && (s.nige+s.senko) < 45) pen += (45-(s.nige+s.senko))*0.6;
    if(D===2000 && (s.sashi+s.oikomi) < 50) pen += (50-(s.sashi+s.oikomi))*0.6;
    const [t0,t1]=TIME_TGT[D];
    if(r.time<t0) pen += (t0-r.time)*2.2;
    if(r.time>t1) pen += (r.time-t1)*2.2;
    pen += Math.max(0, r.emptiedPerRace - EMPT_LIM[D]) * 1.4;
    pen += Math.max(0, mx - 13) * 1.2;
    rows.push(`  ${D}m ${r.time.toFixed(1)}s 逃${s.nige.toFixed(0)}/先${s.senko.toFixed(0)}/差${s.sashi.toFixed(0)}/追${s.oikomi.toFixed(0)} 切れ${r.emptiedPerRace.toFixed(1)} 固有最大${mx.toFixed(1)}%`);
  }
  if(verbose) rows.forEach(x=>console.log(x));
  return pen;
}

const grid = {
  BASE:[0.26,0.28,0.30],
  FREE:[15.5,15.8,16.1],
  SLU :[0.35,0.50,0.65],
  BEND:[0.0026,0.0032,0.0038],
  COEF:[0.050,0.055,0.060],
};
let P={BASE:0.26, FREE:15.8, SLU:0.50, BEND:0.0026, COEF:0.055};
let best=objective(P);
console.log(`初期 P=${JSON.stringify(P)} → 目的値 ${best.toFixed(2)}`);
for(let round=1; round<=3; round++){
  console.log(`\n--- ラウンド ${round} ---`);
  let improved=false;
  for(const dim of Object.keys(grid)){
    let bv=P[dim], bp=best;
    for(const v of grid[dim]){
      if(v===P[dim]) continue;
      const save=P[dim]; P[dim]=v; const p=objective(P); P[dim]=save;
      if(p<bp){ bp=p; bv=v; }
    }
    if(bv!==P[dim]) improved=true;
    P[dim]=bv; best=bp;
    console.log(`  ${dim} = ${bv}  → 目的値 ${best.toFixed(2)}`);
  }
  if(!improved){ console.log("  改善なし＝収束"); break; }
}
console.log(`\n=== 収束 P ===\n${JSON.stringify(P)}`);
console.log(`\n検証（N=${N*3}）:`);
const saveN=N;
{
  let pen=0;
  for(const D of DISTS){
    const r=prod.runMany(D, saveN*3, P);
    const s=sh(r), mx=maxAb(r);
    const [t0,t1]=TIME_TGT[D];
    const ok = r.time>=t0-0.5 && r.time<=t1+0.5 && ["nige","senko","sashi","oikomi"].every(k=>s[k]>=8)
            && r.emptiedPerRace<=EMPT_LIM[D]+0.5 && mx<=13.5;
    console.log(`  ${D}m ${r.time.toFixed(1)}s 逃${s.nige.toFixed(0)}/先${s.senko.toFixed(0)}/差${s.sashi.toFixed(0)}/追${s.oikomi.toFixed(0)} 切れ${r.emptiedPerRace.toFixed(1)} 固有最大${mx.toFixed(1)}% ${ok?"✓":"✗"}`);
    if(!ok) pen++;
  }
  console.log(pen===0? "\nOK: この P を焼き込み可" : "\n要再探索: レンジ外あり");
}
