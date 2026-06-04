/**
 * 多目的グリッドサーチ（再バランス基盤）。AAAロードマップ Phase3a「balance_check の多目的
 * グリッドサーチ自動化＝手動チューニング禁止・収束を機械化」の実装。
 *
 *   node sims/grid_search.js [evalN]   省略時 300
 *
 * production engine.js から検証済みベースライン（脚質シェア/勝ちタイム/スタミナ切れ）を実測し、
 * それを目標に engine_lab の空き進路探索AIの重み W を座標降下で収束させる。
 * 収束した W を engine.js / jockey_game.html の aiPreferredLane に焼き込む。
 */
const prod = require("./engine");        // 検証済みベースライン（laneBias版）
const lab  = require("./engine_lab");    // 探索対象（重みパラメータ化）
const DISTS=[1200,1600,2000];
const N = parseInt(process.argv[2]||"300",10);
const styleShares = r => ({ nige:r.styles.nige/r.N*100, senko:r.styles.senko/r.N*100, sashi:r.styles.sashi/r.N*100, oikomi:r.styles.oikomi/r.N*100 });
const maxAb = r => Math.max(...lab.ABK.map(k=>(r.abilities[k]||0)/r.N*100));

// 1) production からベースライン目標を実測
console.log("ベースライン実測中（production engine.js, N="+ (N*2) +"）…");
const base={};
for(const D of DISTS){ const r=prod.runMany(D, N*2); base[D]={ time:r.time, sh:styleShares(r), emptied:r.emptiedPerRace }; }
for(const D of DISTS){ const b=base[D]; console.log(`  ${D}m 目標: ${b.time.toFixed(1)}s 逃${b.sh.nige.toFixed(0)}/先${b.sh.senko.toFixed(0)}/差${b.sh.sashi.toFixed(0)}/追${b.sh.oikomi.toFixed(0)} 切れ${b.emptied.toFixed(1)}`); }

// 2) 目的関数（違反量の重み和。0に近いほどベースライン一致）
function objective(W){
  let pen=0;
  for(const D of DISTS){
    const r=lab.runMany(D, N, {W});
    const sh=styleShares(r), b=base[D];
    for(const s of ["nige","senko","sashi","oikomi"]){
      if(sh[s] < 9)  pen += (9 - sh[s])*1.6;        // どの脚質も沈ませない
      if(sh[s] > 40) pen += (sh[s] - 40)*1.2;       // 一脚質の支配を防ぐ
    }
    if(D===1200 && (sh.nige+sh.senko) < 50) pen += (50-(sh.nige+sh.senko))*0.5;   // 前有利
    if(D===2000 && (sh.sashi+sh.oikomi) < 55) pen += (55-(sh.sashi+sh.oikomi))*0.5; // 差し追込有利
    pen += Math.max(0, Math.abs(r.time - b.time) - 2.0) * 2.0;                    // 勝ちタイム±2s
    const lim = D===1200?2.5 : D===1600?4.5 : 8.5;
    pen += Math.max(0, r.emptiedPerRace - lim) * 1.0;                             // スタミナ切れ上限
    pen += Math.max(0, maxAb(r) - 12.5) * 1.2;                                     // 固有最大シェア
  }
  return pen;
}

// 3) 座標降下（影響の大きい4重み。各候補値を試し最良へ）
const grid = {
  cbend:[0.20,0.35,0.52,0.70],
  cout :[0.20,0.40,0.70,1.00],
  fin  :[0.15,0.30,0.50],
  clear:[0.6,1.0,1.5],
};
let W=Object.assign({}, lab.AI_DEFAULT, {contest:0.0});
let best=objective(W);
console.log(`\n初期 W の目的値: ${best.toFixed(2)}`);
for(let round=1; round<=2; round++){
  console.log(`\n--- ラウンド ${round} ---`);
  for(const dim of Object.keys(grid)){
    let bv=W[dim], bp=best;
    for(const v of grid[dim]){
      if(v===W[dim]) continue;
      const save=W[dim]; W[dim]=v; const p=objective(W); W[dim]=save;
      if(p<bp){ bp=p; bv=v; }
    }
    W[dim]=bv; best=bp;
    console.log(`  ${dim} = ${bv}  → 目的値 ${best.toFixed(2)}`);
  }
}

// 4) 収束 W を検証（高N）
console.log(`\n=== 収束 W ===`); console.log(JSON.stringify(W));
console.log(`\n検証（N=${N*2}）:`);
let ok=true;
for(const D of DISTS){
  const r=lab.runMany(D, N*2, {W}); const sh=styleShares(r);
  const mx=maxAb(r);
  const within = Math.abs(r.time-base[D].time)<=3 && ["nige","senko","sashi","oikomi"].every(s=>sh[s]>=8) && mx<=13;
  if(!within) ok=false;
  console.log(`  ${D}m ${r.time.toFixed(1)}s 逃${sh.nige.toFixed(0)}/先${sh.senko.toFixed(0)}/差${sh.sashi.toFixed(0)}/追${sh.oikomi.toFixed(0)} 切れ${r.emptiedPerRace.toFixed(1)} 固有最大${mx.toFixed(1)}% ${within?"✓":"✗"}`);
}
console.log(`\n${ok? "OK: この W は焼き込み可（脚質≥8%・タイム±3s・固有≤13%）" : "要再探索: まだレンジ外あり"}　目的値=${best.toFixed(2)}`);
