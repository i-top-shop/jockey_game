/**
 * 蹄音 -ジョッキーの判断- バランス検証エンジン（AI 12頭・ヘッドレス）
 * ゲーム本体 computeDesired/stepRace のAI挙動を忠実に再現したもの。
 * ※プレイヤー専用要素（ギア/ムチ/折り合い操作）は含まない＝AI同士の地力バランスを測る。
 *
 * 使い方: const {runMany} = require("./engine");
 *   runMany(1600, 1500, {BASE:0.34}) → 集計オブジェクト
 */
// コース＝共有正典 sims/course_def.js（府中モデル：左回り2083.1m・直線525.9m・クロソイド複合カーブ・
// 標高2.7m）。κ(s)連続・groundLoss=f(κ)・坂=slope{upDrain,upSlow,downFast}をデータ駆動で参照。
const { COURSE_DEF, JOCKEY_PERSONAS, buildCourse } = require("./course_def");
const Course = buildCourse(COURSE_DEF);
const TRK_P = Course.P;

// Phase3a 物理再バランス：実時計帯（東京1600≈94s級）へ速度系を再回帰（旧: cruise18.8/top19.4/FREE16.3/COEF0.052）
const cruiseBase=17.1, staFatigue=24;
// 創発ペース／ハナ争い（Stage1）：先頭争いからペースを発生させ、スタミナ・縦長・失速へ波及させる
const LEAD_ZONE=9, HANA_ESC=0.9, LONE_EASE=1.5, PACE_DRAIN=0.25, FOLLOW_MAX=2.0;
// 後続の役割ギャップ（馬身。先頭からの距離）。ペースで伸縮し、馬群を約8〜20馬身に束ねる
const ROLEGAP={nige:1, senko:3.5, sashi:8, oikomi:13};
// cr=仕掛け残りm。直線525.9m化に合わせ+40〜50m（4角進入〜直線入口で動く実際の呼吸へ）
const STYLES={
  nige:  {cg:0.55, sb:1.08, kg:0.62, cr:560, pref:[0,1.6]},
  senko: {cg:0.22, sb:1.00, kg:0.88, cr:500, pref:[0.6,2.6]},
  sashi: {cg:-0.22,sb:0.92, kg:1.08, cr:420, pref:[1.4,4.0]},
  oikomi:{cg:-0.46,sb:0.84, kg:1.22, cr:355, pref:[2.2,5.2]},
};
const SK=Object.keys(STYLES);
const ABK=["rocket","settle","burst","breaker","corner","stayer","fighter","widerush","frontsoul","hotblood","mud","fast"];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), ch=a=>a[Math.floor(Math.random()*a.length)];

// ゲーム本体 deriveParams と同一（調子condを乗算）
function derive(s,ab,DIST,cond){
  const mm=Math.abs(DIST-s.aptDist), aptF=clamp(0.45-mm/650,-0.7,0.45);
  let keen=clamp((76-s.temper)/20,0,1.5); if(ab==="hotblood") keen=clamp(keen+0.45,0,1.9);
  return {
    baseTop:(17.7+(s.speed-78)*0.0655+aptF*0.27)*cond,
    kickInst:(s.instant-72)*0.047,
    accelUp:1.5+(s.instant-70)*0.030+(s.power-72)*0.006,
    drainResist:clamp((0.74+(s.stamina-72)*0.014)*(1+aptF*0.12),0.52,1.55)*cond,
    keen, gatePow:clamp(((s.gate!=null?s.gate:s.power)-70)/30,-0.4,1),
    cornerSkill:clamp(((s.corner!=null?s.corner:s.power)-72)/45,0,0.55),
    gutsF:clamp((s.guts-70)/30,0,1.2),
  };
}
const topBase=h=>h.p.baseTop+STYLES[h.style].kg*h.p.kickInst;

/** 1レース実行。P でドレイン/坂/横ロス系を上書き可能（既定＝ゲーム現行値。グリッドサーチが使う） */
function race(DIST, P){
  P=Object.assign({BASE:0.28, COEF:0.055, FREE:16.1, DM:1.0,
                   SLU:COURSE_DEF.slope.upDrain, BEND:COURSE_DEF.groundLoss.bendRef}, P||{});
  const glX=k=>{ const g=COURSE_DEF.groundLoss, t=clamp(k/g.kappaRef,0,1); return g.straight+(P.BEND-g.straight)*t; };
  const SLOPE=COURSE_DEF.slope;
  const startS=((TRK_P-(DIST%TRK_P))%TRK_P), straightDist=DIST-Course.homeStraight;
  const g=Math.random();
  const going=g<0.62?{drain:1.0,fast:true,bad:0}:g<0.85?{drain:1.045,bad:0.6}:{drain:1.09,heavy:true,bad:1};
  const F=[];
  for(let i=0;i<12;i++){
    const style=ch(SK), ab=ch(ABK);
    const power=ri(62,92);
    const s={speed:ri(66,93),stamina:ri(66,93),instant:ri(64,92),temper:ri(55,90),power,guts:ri(60,92),aptDist:ch([1200,1400,1600,1800,2000]),
             gate:clamp(power+(ab==="rocket"?9:0)+ri(-6,6),50,99), corner:clamp(power+(ab==="corner"?9:0)+ri(-6,6),50,99)};
    if(ab==="hotblood"){s.speed+=4;s.instant+=4;}
    const cr=Math.random(), cond=cr<0.22?1.04:cr<0.74?1.0:cr<0.90?0.985:0.965;
    const pref=STYLES[style].pref;
    const h={id:i,style,ab,stats:s,p:derive(s,ab,DIST,cond),dist:0,lane:rnd(pref[0],pref[1]),target:(pref[0]+pref[1])/2,
             speed:0,stamina:100,minSta:100,committed:false,finished:false,ft:0};
    // ライバル騎手の個性（本体と同一の共有定義。行動傾向のみ＝能力数値は不変）
    h.jockey=ch(JOCKEY_PERSONAS);
    h.laneBias=clamp(rnd(-0.9,0.9)+h.jockey.lane, -1.6, 1.6);
    h.commitDist=DIST-STYLES[style].cr+rnd(-55,55)-h.jockey.commit;
    let q=Math.random()<0.18?"good":Math.random()>0.85?"slow":"ok"; if(ab==="rocket"&&q==="slow")q="ok";
    let off=q==="good"?rnd(1.5,3):q==="slow"?-rnd(2,4):rnd(-0.5,1); off+=h.p.gatePow*1.2;
    h.dist=Math.max(0,0.5+off); h.speed=(q==="slow"?11.4:13.2)+h.p.gatePow*0.8; F.push(h);
  }
  const dt=1/30; let t=0;
  let pace=cruiseBase, fhPaceSum=0, fhPaceN=0, peakLen=0, peakContest=0;   // 創発ペース・前半ペース・ピーク縦長・最大競り強度
  while(F.some(h=>!h.finished)&&t<300){ t+=dt;
    // --- レース状態：先頭・順位・ハナ争い頭数・創発ペース（毎フレーム） ---
    const alive=F.filter(h=>!h.finished);
    let lead=0; for(const h of alive) if(h.dist>lead)lead=h.dist;
    const byDist=[...alive].sort((a,b)=>b.dist-a.dist); byDist.forEach((h,i)=>h._rankNow=i+1);
    const nAlive=alive.length;
    // ハナ争い：先頭ゾーンの「逃げ頭数」が主因（先行多は「前半が締まる」副次）
    let nNigeLead=0, nSenkoLead=0;
    for(const h of alive){ if((lead-h.dist)<LEAD_ZONE){ if(h.style==="nige")nNigeLead++; else if(h.style==="senko")nSenkoLead++; } }
    const contest = Math.max(0, nNigeLead-1) + nSenkoLead*0.22;                     // 逃げ複数で競る＋先行多で締まる
    if(contest>peakContest && lead>DIST*0.1 && lead<DIST*0.5) peakContest=contest;  // 前半（スタート後）の最大競り強度
    const leaderSpeed=byDist[0]?byDist[0].speed:cruiseBase;
    pace += (leaderSpeed-pace)*Math.min(1,2*dt);                                    // 創発ペース（先頭速度の平滑）
    const paceLevel = pace>cruiseBase+1.5?3 : pace>cruiseBase+0.75?2 : pace<cruiseBase-0.45?0 : 1;  // 0スロー..3超ハイ
    let minDist=Infinity; for(const h of alive) if(h.dist<minDist)minDist=h.dist;
    if(lead>=DIST*0.12 && lead<DIST*0.34){ fhPaceSum+=leaderSpeed; fhPaceN++; }       // 立ち上がり後の前半ペース（失速前）
    if(peakLen===0 && lead>=DIST*0.4) peakLen=lead-minDist;                            // 道中(40%地点・仕掛け前)の馬群長＝見える隊列
    for(const h of F){ if(h.finished)continue;
      if(h._rankAtStr==null && h.dist>=straightDist) h._rankAtStr=h._rankNow;        // 直線入口の順位
      let leader=true; for(const o of F){ if(o===h||o.finished)continue; if(o.dist>h.dist){leader=false;break;} }
      const inStr=h.dist>=straightDist, last400=(DIST-h.dist)<400; let tm=1;
      // 末脚系は「残り400m」に紐付け（旧仕様の直線=残り400mと等価＝直線525.9m化でも総獲得が距離非依存で不変）
      if(h.ab==="burst"&&last400)tm+=0.045; if(h.ab==="widerush"&&last400&&h.lane>=4)tm+=0.041;
      if(h.ab==="frontsoul"&&leader)tm+=0.05; if(h.ab==="mud"&&going.heavy)tm+=0.06; if(h.ab==="fast"&&going.fast)tm+=0.05;
      const tTop=topBase(h)*tm; let target;
      if(h.dist>=h.commitDist){ target=tTop; h.committed=true; }
      else{
        const gapToLead=lead-h.dist, early=clamp((DIST*0.5-h.dist)/(DIST*0.5),0,1);  // early:前半=1 後半=0
        const paceFactor=0.6+paceLevel*0.2; h._contesting=false;                      // スロー詰める..超ハイ開く
        let cg=STYLES[h.style].cg;
        const isPacer = h._rankNow===1 || (h.style==="nige" && gapToLead<2.0);
        if(isPacer && h.style==="nige"){                            // 先頭の逃げ：ハナ争い/単騎楽逃げ
          if(contest>0.1 && gapToLead<LEAD_ZONE){ cg+=Math.min(2.2,HANA_ESC*contest)*(0.5+early*0.5); h._contesting=true; }
          else if(nNigeLead<=1 && gapToLead<1.5){ cg-=LONE_EASE*(0.4+early*0.6); }
        } else if(!isPacer){                                        // 後続：先頭ペースに乗り役割ギャップへ寄せる（馬群を8〜20馬身に束ね・脱落防止）
          const tgtGap=((ROLEGAP[h.style]||6)+(h.id%4)*0.8)*2.4*paceFactor;   // 同脚質は少し散らす
          cg=(pace-cruiseBase)+clamp((gapToLead-tgtGap)*0.10, -0.5, 2.0);     // 基準＝先頭ペース（付いて行く）＋ギャップ補正
          cg=Math.min(cg, FOLLOW_MAX);   // 追走の上限：暴走する先頭には付き合わず脚を溜める
          if(contest>0.1 && h.style==="senko" && gapToLead<LEAD_ZONE){ cg+=Math.min(1.6,HANA_ESC*contest)*0.4*(0.5+early*0.5); h._contesting=true; }
        }
        target=cruiseBase+cg+rnd(-0.15,0.15);
      }
      let battle=false;
      if(h.dist>straightDist-120){
        for(const o of F){ if(o===h||o.finished)continue; if(Math.abs(o.dist-h.dist)<3.2){battle=true;break;} }
        if(battle){ let gb=0.4+h.p.gutsF*0.7; if(h.ab==="fighter")gb*=1.8; target+=gb; }
      }
      // ---- 坂（勾配1%あたり）：上り=消費追加＋目標減速 / 下り=目標微増。drainResistが効く＝
      //      スタミナ自慢は坂に強い。「坂で止まる馬を坂下で脚を残して差す」判断の物理根拠 ----
      const gPct = Course.gradeAt(startS+h.dist)*100;
      const slopeV = gPct>0 ? -SLOPE.upSlow*gPct : SLOPE.downFast*(-gPct);
      target += slopeV;
      // ---- スタミナ消費（ゲーム本体と同一構造。Pで調整実験可） ----
      let drain=P.BASE + Math.pow(Math.max(0,h.speed-P.FREE),1.8)*P.COEF*STYLES[h.style].sb;
      if(h.committed) drain+=1.0;
      if(h._contesting) drain+=PACE_DRAIN*contest;   // ハナ争いは脚を使う＝後半に失速の伏線
      if(gPct>0) drain+=P.SLU*gPct;                  // 上り坂の追加消費（回帰対象）
      let gm=going.drain; if(h.ab==="mud"&&going.heavy)gm=1.0; drain*=gm;
      if(h.ab==="stayer"&&h.dist>DIST*0.66)drain*=0.9;
      if(h.ab==="frontsoul"&&leader)drain*=0.95;
      drain/=h.p.drainResist; drain*=P.DM;
      h.stamina=clamp(h.stamina-drain*dt,0,100); if(h.stamina<h.minSta)h.minSta=h.stamina;
      let floor=h.ab==="stayer"?0.76:0.66, vCeil=tTop+0.6;
      if(h.stamina<staFatigue){ const f=floor+(1-floor)*(h.stamina/staFatigue); vCeil=tTop*f; }
      vCeil += slopeV;                                                   // 坂は上限にも効く（上りで頭打ち＝坂で止まる）
      if(!h.committed && (lead-h.dist)>30 && h.stamina>20) vCeil+=1.8;   // 後方に離れた馬は馬群へ取り付くため一時的に上限up（脱落防止＝馬群を束ねる）
      target=clamp(target,6,vCeil);
      const rate=target>h.speed?h.p.accelUp:2.4;
      h._v=Math.max(0,h.speed+clamp(target-h.speed,-rate*dt,rate*dt));
    }
    for(const h of F){ if(h.finished)continue;
      let cap=Infinity, blk=false; const bg=h.ab==="breaker"?4.5*0.8:4.5;   // blockGap 6.5→4.5
      if((lead-h.dist)<30) for(const o of F){ if(o===h||o.finished)continue; const gap=o.dist-h.dist;   // 後方に離れた馬は開けた所＝ブロック対象外（デッドロック回避）
        if(gap>0&&gap<bg&&Math.abs(o.lane-h.lane)<0.7){ cap=Math.min(cap,o.speed); blk=true; } }   // blockLane 0.95→0.7
      let v=h._v; if(blk)v=Math.min(v,cap); h.speed=v;
      const sW=startS+h.dist, kappa=Math.abs(Course.kappaAt(sW)), onBend=kappa!==0, cg=STYLES[h.style].cg;
      if((DIST-h.dist)>480){ const HB={nige:0.5,senko:0.72,sashi:2.35,oikomi:2.55}, BS={nige:0.6,senko:0.9,sashi:1.15,oikomi:1.3}; const home=clamp((HB[h.style]??1.4)+h.laneBias*(BS[h.style]??1.1),0,6); h.target+=clamp(home-h.target,-0.5,0.5)*dt*0.5; }
      else{ if((h.style==="sashi"||h.style==="oikomi")&&h.target<3.4)h.target+=dt*0.9;
            if(cg>0&&h.target>1.4)h.target-=dt*0.5; }
      if(blk){ const d=(h.id%2? -0.7 : 1.0); h.target=clamp(h.target + d*(onBend?0.7:1.2)*dt, 0, onBend?4.5:6.5); }  // 詰まったら左右に開いて抜ける（IDで散らしデッドロック回避）
      h.lane=clamp(h.lane+clamp(h.target-h.lane,-1.9*dt,1.9*dt),0,7);
      let gl=glX(kappa);   // 横ロス＝曲率連続 f(κ)（bendRefはP.BENDで回帰実験可）
      if(onBend){ let red=h.p.cornerSkill; if(h.ab==="corner")red+=0.5; gl*=clamp(1-red,0.35,1); }
      h.dist+=h.speed*(1-h.lane*gl)*dt;
      if(!h.finished&&h.dist>=DIST){ const over=h.dist-DIST, ve=Math.max(0.1,h.speed*(1-h.lane*gl)); h.ft=t-over/ve; h.finished=true; }
    }
    // パスC：馬体接触の解消（本体 stepRace と同一・位置のみ＝速度/スタミナ不変。パワーで押し勝つ）
    const BL=2.0, ML=0.72, kB=clamp(10*dt,0,1);   // bumpDistGap 2.6→2.0 / bumpLaneGap →0.72
    for(let i=0;i<F.length;i++){ const a=F[i]; if(a.finished)continue;
      for(let j=i+1;j<F.length;j++){ const b=F[j]; if(b.finished)continue;
        const dd=a.dist-b.dist; if(dd>BL||dd<-BL)continue;
        const dl=a.lane-b.lane, effML=ML*(1-Math.abs(dd)/BL);
        if(Math.abs(dl)>=effML)continue;
        const dir=dl!==0?(dl>0?1:-1):((a.id>b.id)?1:-1), overlap=effML-Math.abs(dl);
        const pa=a.stats.power, pb=b.stats.power, sum=pa+pb;
        a.lane=clamp(a.lane+dir*overlap*(pb/sum)*kB,0,7);
        b.lane=clamp(b.lane-dir*overlap*(pa/sum)*kB,0,7);
      }
    }
  }
  const r=[...F].sort((a,b)=>a.ft-b.ft); r.forEach((h,i)=>h.rank=i+1);
  return { F, win:r[0], fhPace:(fhPaceN?fhPaceSum/fhPaceN:cruiseBase), peakLen, peakContest, nNige:F.filter(h=>h.style==="nige").length };
}

/** Nレース回して集計 */
function runMany(DIST, N, P){
  const sw={nige:0,senko:0,sashi:0,oikomi:0}, ab={}; ABK.forEach(k=>ab[k]=0);
  let ts=0, emptied=0, minSum=0;
  let aptGoodWin=0, aptGoodN=0, aptBadWin=0, aptBadN=0;
  for(let i=0;i<N;i++){
    const {F,win}=race(DIST,P);
    sw[win.style]++; ab[win.ab]++; ts+=win.ft;
    emptied+=F.filter(h=>h.minSta<4).length;
    minSum+=F.reduce((a,h)=>a+h.minSta,0)/F.length;
    for(const h of F){
      const mm=Math.abs(DIST-h.stats.aptDist);
      if(mm<=200){ aptGoodN++; if(h.rank===1)aptGoodWin++; }
      else if(mm>=600){ aptBadN++; if(h.rank===1)aptBadWin++; }
    }
  }
  return { DIST, N, time:ts/N, styles:sw, abilities:ab,
    emptiedPerRace:emptied/N, avgMinSta:minSum/N,
    aptGoodRate:aptGoodN? aptGoodWin/aptGoodN*100 : NaN,
    aptBadRate: aptBadN ? aptBadWin/aptBadN*100 : NaN };
}
module.exports={ race, runMany, ABK, SK };
