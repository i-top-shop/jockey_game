// Stage1 検証：逃げ頭数でビン分けし、創発ペース・馬群の縦長・スタミナ・直線入口→着順を計測。
//   使い方: node sims/pace_report.js [距離] [レース数]
const { race } = require("./engine");
const DIST = +process.argv[2] || 1600;
const N    = +process.argv[3] || 6000;
const SK = ["nige","senko","sashi","oikomi"];
const JP = {nige:"逃",senko:"先",sashi:"差",oikomi:"追"};
const binOf = pc => pc>=1.3 ? "強" : pc>=0.3 ? "中" : "無";   // 前半の最大競り強度でビン分け（実際に競ったか）
const BINORD = ["無","中","強"], BINLBL = {"無":"競りなし(単騎/0頭級)","中":"競り 中(逃2頭級)","強":"競り 強(逃3頭+級)"};

const bins = {};
for(let i=0;i<N;i++){
  const { F, win, fhPace, peakLen, peakContest } = race(DIST);
  const b = binOf(peakContest);
  const o = bins[b] || (bins[b] = { races:0, fhPace:0, len:0, win:{}, st:{} });
  o.races++; o.fhPace += fhPace; o.len += (peakLen||0);
  o.win[win.style] = (o.win[win.style]||0)+1;
  for(const h of F){
    const s = o.st[h.style] || (o.st[h.style] = { n:0, minSta:0, strRank:0, rank:0 });
    s.n++; s.minSta += h.minSta; s.strRank += (h._rankAtStr||h.rank); s.rank += h.rank;
  }
}

console.log(`\n===== Stage1 ペース/隊列 検証  ${DIST}m × ${N}レース =====`);
for(const b of BINORD){
  const o = bins[b]; if(!o) continue;
  const pace = o.fhPace/o.races, len = o.len/o.races;
  const lvl = pace>20.2?"超ハイ": pace>19.5?"ハイ": pace<18.3?"スロー":"平均";
  console.log(`\n■ ${BINLBL[b]}  (${o.races}R)`);
  console.log(`   前半ペース=${pace.toFixed(2)} m/s 【${lvl}】   前半ピーク縦長=${len.toFixed(0)} m`);
  let line="   直線入口→着順: ";
  for(const k of SK){ const s=o.st[k]; if(s&&s.n) line += `${JP[k]} ${(s.strRank/s.n).toFixed(1)}→${(s.rank/s.n).toFixed(1)}  `; }
  console.log(line);
  let sta="   最低スタミナ: ";
  for(const k of SK){ const s=o.st[k]; if(s&&s.n) sta += `${JP[k]} ${(s.minSta/s.n).toFixed(0)}  `; }
  console.log(sta);
  const w=o.win, tot=o.races;
  console.log(`   勝ち脚質: 逃${((w.nige||0)/tot*100).toFixed(0)}% 先${((w.senko||0)/tot*100).toFixed(0)}% 差${((w.sashi||0)/tot*100).toFixed(0)}% 追${((w.oikomi||0)/tot*100).toFixed(0)}%`);
}
console.log("\n(直線入口→着順：数字が増える＝直線で順位を落とす＝失速。逃げ頭数が増えるほど前半ペースが上がり縦長になり逃げが失速、を確認)");
