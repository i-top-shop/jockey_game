/**
 * 実験用エンジン（engine.js の派生）。空き進路探索AI＋ペース因果を重み W でパラメータ化し、
 * sims/grid_search.js から多目的探索する。収束した W を engine.js / jockey_game.html へ焼き込む。
 * ※ production の engine.js は触らない。本ファイルはバランス探索専用。
 */
const TRK_R=140, TRK_SL=360, TRK_LB=Math.PI*TRK_R, TRK_P=2*TRK_LB+2*TRK_SL;
function curveAt(s){ s=((s%TRK_P)+TRK_P)%TRK_P; return (s<TRK_LB || (s>=TRK_LB+TRK_SL && s<2*TRK_LB+TRK_SL)) ? -1 : 0; }

const cruiseBase=18.8, staFatigue=24;
const STYLES={
  nige:  {cg:0.55, sb:1.08, kg:0.62, cr:520, pref:[0,1.6]},
  senko: {cg:0.22, sb:1.00, kg:0.88, cr:450, pref:[0.6,2.6]},
  sashi: {cg:-0.22,sb:0.92, kg:1.08, cr:370, pref:[1.4,4.0]},
  oikomi:{cg:-0.46,sb:0.84, kg:1.22, cr:310, pref:[2.2,5.2]},
};
const SK=Object.keys(STYLES);
const ABK=["rocket","settle","burst","breaker","corner","stayer","fighter","widerush","frontsoul","hotblood","mud","fast"];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), ch=a=>a[Math.floor(Math.random()*a.length)];

function derive(s,ab,DIST,cond){
  const mm=Math.abs(DIST-s.aptDist), aptF=clamp(0.45-mm/650,-0.7,0.45);
  let keen=clamp((76-s.temper)/20,0,1.5); if(ab==="hotblood") keen=clamp(keen+0.45,0,1.9);
  return {
    baseTop:(19.4+(s.speed-78)*0.072+aptF*0.30)*cond,
    kickInst:(s.instant-72)*0.052,
    accelUp:1.5+(s.instant-70)*0.030+(s.power-72)*0.006,
    drainResist:clamp((0.74+(s.stamina-72)*0.014)*(1+aptF*0.12),0.52,1.55)*cond,
    keen, gatePow:clamp((s.power-70)/30,-0.4,1),
    cornerSkill:clamp((s.power-72)/45,0,0.55),
    gutsF:clamp((s.guts-70)/30,0,1.2),
  };
}
const topBase=h=>h.p.baseTop+STYLES[h.style].kg*h.p.kickInst;

// ---- 空き進路探索AI（重みパラメータ化） ----
const AI_DEFAULT = {
  clear:1.5, wall:0.22, slow:0.85, cbend:0.52, cstr:0.10,
  beside:0.45, fin:0.30, cout:0.20, inertia:0.33, rate:1.2, contest:0.0,
};
function aiPreferredLane(h, field, onBend, remain, W){
  const front = STYLES[h.style].cg > 0, decide = remain < 520;
  let best=h.lane, bestScore=-Infinity;
  for(let L=0; L<=7.001; L+=0.5){
    let score=0;
    let bGap=Infinity, bSpd=999;
    for(const o of field){ if(o===h||o.finished) continue; const g=o.dist-h.dist;
      if(g>0 && g<15 && Math.abs(o.lane-L)<0.95 && g<bGap){ bGap=g; bSpd=o.speed; } }
    if(bGap<15){ const sl=Math.max(0,h.speed-bSpd); score -= (15-bGap)*W.wall + sl*W.slow; } else score += W.clear;
    score -= L * (onBend? W.cbend : W.cstr);
    let beside=0;
    for(const o of field){ if(o===h||o.finished) continue; if(Math.abs(o.dist-h.dist)<3.0 && Math.abs(o.lane-L)<0.9) beside++; }
    score -= beside*W.beside;
    if(front) score -= L*W.fin; else if(decide) score += Math.min(L,4)*W.cout;
    score -= Math.abs(L - h.target)*W.inertia;
    if(score>bestScore){ bestScore=score; best=L; }
  }
  return best;
}

function race(DIST, P){
  P=Object.assign({BASE:0.34, COEF:0.052, FREE:16.3, DM:1.0}, P||{});
  const W=Object.assign({}, AI_DEFAULT, P.W||{});
  const startS=((TRK_P-(DIST%TRK_P))%TRK_P), straightDist=DIST-400;
  const g=Math.random();
  const going=g<0.62?{drain:1.0,fast:true,bad:0}:g<0.85?{drain:1.045,bad:0.6}:{drain:1.09,heavy:true,bad:1};
  const F=[];
  for(let i=0;i<12;i++){
    const style=ch(SK), ab=ch(ABK);
    const s={speed:ri(66,93),stamina:ri(66,93),instant:ri(64,92),temper:ri(55,90),power:ri(62,92),guts:ri(60,92),aptDist:ch([1200,1400,1600,1800,2000])};
    if(ab==="hotblood"){s.speed+=4;s.instant+=4;}
    const cr=Math.random(), cond=cr<0.22?1.04:cr<0.74?1.0:cr<0.90?0.985:0.965;
    const pref=STYLES[style].pref;
    const h={id:i,style,ab,stats:s,p:derive(s,ab,DIST,cond),dist:0,lane:rnd(pref[0],pref[1]),target:(pref[0]+pref[1])/2,
             speed:0,stamina:100,minSta:100,committed:false,finished:false,ft:0};
    h.commitDist=DIST-STYLES[style].cr+rnd(-55,55);
    let q=Math.random()<0.18?"good":Math.random()>0.85?"slow":"ok"; if(ab==="rocket"&&q==="slow")q="ok";
    let off=q==="good"?rnd(1.5,3):q==="slow"?-rnd(2,4):rnd(-0.5,1); off+=h.p.gatePow*1.2;
    h.dist=Math.max(0,0.5+off); h.speed=(q==="slow"?12.5:14.5)+h.p.gatePow*0.8; F.push(h);
  }
  const dt=1/30; let t=0;
  while(F.some(h=>!h.finished)&&t<300){ t+=dt;
    for(const h of F){ if(h.finished)continue;
      let leader=true; for(const o of F){ if(o===h||o.finished)continue; if(o.dist>h.dist){leader=false;break;} }
      const inStr=h.dist>=straightDist; let tm=1;
      if(h.ab==="burst"&&inStr)tm+=0.10; if(h.ab==="widerush"&&inStr&&h.lane>=4)tm+=0.09;
      if(h.ab==="frontsoul"&&leader)tm+=0.05; if(h.ab==="mud"&&going.heavy)tm+=0.06; if(h.ab==="fast"&&going.fast)tm+=0.05;
      const tTop=topBase(h)*tm; let target;
      if(h.dist>=h.commitDist){ target=tTop; h.committed=true; }
      else{
        let cg=STYLES[h.style].cg;
        if(cg>0){ let ld=true,lm=Infinity,contest=0;
          for(const o of F){ if(o===h||o.finished)continue; const gp=o.dist-h.dist;
            if(gp>0) ld=false; if(gp<=0) lm=Math.min(lm,-gp);
            if(STYLES[o.style].cg>0 && Math.abs(gp)<8) contest++; }
          const early=h.dist<DIST*0.72;
          if(W.contest>0 && contest>=1 && early) cg+=Math.min(0.5,contest*W.contest);   // ハナ争い→ハイペース
          else if(ld&&lm>6) cg-=Math.min(0.85,(lm-6)*0.06);                              // 楽逃げ→スロー
        }
        target=cruiseBase+cg+rnd(-0.15,0.15);
      }
      let battle=false;
      if(h.dist>straightDist-120){
        for(const o of F){ if(o===h||o.finished)continue; if(Math.abs(o.dist-h.dist)<3.2){battle=true;break;} }
        if(battle){ let gb=0.4+h.p.gutsF*0.7; if(h.ab==="fighter")gb*=1.8; target+=gb; }
      }
      let drain=P.BASE + Math.pow(Math.max(0,h.speed-P.FREE),1.8)*P.COEF*STYLES[h.style].sb;
      if(h.committed) drain+=1.0;
      let gm=going.drain; if(h.ab==="mud"&&going.heavy)gm=1.0; drain*=gm;
      if(h.ab==="stayer"&&h.dist>DIST*0.66)drain*=0.9;
      if(h.ab==="frontsoul"&&leader)drain*=0.95;
      drain/=h.p.drainResist; drain*=P.DM;
      h.stamina=clamp(h.stamina-drain*dt,0,100); if(h.stamina<h.minSta)h.minSta=h.stamina;
      let floor=h.ab==="stayer"?0.76:0.66, vCeil=tTop+0.6;
      if(h.stamina<staFatigue){ const f=floor+(1-floor)*(h.stamina/staFatigue); vCeil=tTop*f; }
      target=clamp(target,6,vCeil);
      const rate=target>h.speed?h.p.accelUp:2.4;
      h._v=Math.max(0,h.speed+clamp(target-h.speed,-rate*dt,rate*dt));
    }
    for(const h of F){ if(h.finished)continue;
      let cap=Infinity, blk=false; const bg=h.ab==="breaker"?6.5*0.8:6.5;
      for(const o of F){ if(o===h||o.finished)continue; const gap=o.dist-h.dist;
        if(gap>0&&gap<bg&&Math.abs(o.lane-h.lane)<0.95){ cap=Math.min(cap,o.speed); blk=true; } }
      let v=h._v; if(blk)v=Math.min(v,cap); h.speed=v;
      const sW=startS+h.dist, onBend=curveAt(sW)!==0;
      // 空き進路探索AI（重みパラメータ化）：前が壁/内が空く/外に出す/コースロスを統合採点
      const want=aiPreferredLane(h, F, onBend, DIST - h.dist, W);
      h.target += clamp(want - h.target, -W.rate*dt, W.rate*dt) + (rnd(-0.5,0.5))*dt*0.12;
      h.lane=clamp(h.lane+clamp(h.target-h.lane,-1.9*dt,1.9*dt),0,7);
      let gl=onBend?0.0026:0.0005;
      if(onBend){ let red=h.p.cornerSkill; if(h.ab==="corner")red+=0.5; gl*=clamp(1-red,0.35,1); }
      h.dist+=h.speed*(1-h.lane*gl)*dt;
      if(!h.finished&&h.dist>=DIST){ const over=h.dist-DIST, ve=Math.max(0.1,h.speed*(1-h.lane*gl)); h.ft=t-over/ve; h.finished=true; }
    }
  }
  const r=[...F].sort((a,b)=>a.ft-b.ft); r.forEach((h,i)=>h.rank=i+1);
  return { F, win:r[0] };
}

function runMany(DIST, N, P){
  const sw={nige:0,senko:0,sashi:0,oikomi:0}, ab={}; ABK.forEach(k=>ab[k]=0);
  let ts=0, emptied=0, minSum=0, aptGoodWin=0,aptGoodN=0,aptBadWin=0,aptBadN=0;
  for(let i=0;i<N;i++){
    const {F,win}=race(DIST,P);
    sw[win.style]++; ab[win.ab]++; ts+=win.ft;
    emptied+=F.filter(h=>h.minSta<4).length;
    minSum+=F.reduce((a,h)=>a+h.minSta,0)/F.length;
    for(const h of F){ const mm=Math.abs(DIST-h.stats.aptDist);
      if(mm<=200){ aptGoodN++; if(h.rank===1)aptGoodWin++; } else if(mm>=600){ aptBadN++; if(h.rank===1)aptBadWin++; } }
  }
  return { DIST, N, time:ts/N, styles:sw, abilities:ab, emptiedPerRace:emptied/N, avgMinSta:minSum/N,
    aptGoodRate:aptGoodN? aptGoodWin/aptGoodN*100:NaN, aptBadRate:aptBadN? aptBadWin/aptBadN*100:NaN };
}
module.exports={ race, runMany, ABK, SK, AI_DEFAULT };
