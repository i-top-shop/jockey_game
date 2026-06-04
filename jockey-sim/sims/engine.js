/**
 * 蹄音 -ジョッキーの判断- バランス検証エンジン（AI 12頭・ヘッドレス）
 * ゲーム本体 computeDesired/stepRace のAI挙動を忠実に再現したもの。
 * ※プレイヤー専用要素（ギア/ムチ/折り合い操作）は含まない＝AI同士の地力バランスを測る。
 *
 * 使い方: const {runMany} = require("./engine");
 *   runMany(1600, 1500, {BASE:0.34}) → 集計オブジェクト
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

// ゲーム本体 deriveParams と同一（調子condを乗算）
function derive(s,ab,DIST,cond){
  const mm=Math.abs(DIST-s.aptDist), aptF=clamp(0.45-mm/650,-0.7,0.45);
  let keen=clamp((76-s.temper)/20,0,1.5); if(ab==="hotblood") keen=clamp(keen+0.45,0,1.9);
  return {
    baseTop:(19.4+(s.speed-78)*0.072+aptF*0.30)*cond,
    kickInst:(s.instant-72)*0.052,
    accelUp:1.5+(s.instant-70)*0.030+(s.power-72)*0.006,
    drainResist:clamp((0.74+(s.stamina-72)*0.014)*(1+aptF*0.12),0.52,1.55)*cond,
    keen, gatePow:clamp(((s.gate!=null?s.gate:s.power)-70)/30,-0.4,1),
    cornerSkill:clamp(((s.corner!=null?s.corner:s.power)-72)/45,0,0.55),
    gutsF:clamp((s.guts-70)/30,0,1.2),
  };
}
const topBase=h=>h.p.baseTop+STYLES[h.style].kg*h.p.kickInst;

/** 1レース実行。P でドレイン系を上書き可能（既定＝ゲーム現行値） */
function race(DIST, P){
  P=Object.assign({BASE:0.34, COEF:0.052, FREE:16.3, DM:1.0}, P||{});
  const startS=((TRK_P-(DIST%TRK_P))%TRK_P), straightDist=DIST-400;
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
             speed:0,stamina:100,minSta:100,committed:false,finished:false,ft:0,laneBias:rnd(-0.9,0.9)};
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
        if(cg>0){ let ld=true,lm=Infinity;
          for(const o of F){ if(o===h||o.finished)continue; const gp=o.dist-h.dist; if(gp>0){ld=false;break;} lm=Math.min(lm,-gp); }
          if(ld&&lm>6) cg-=Math.min(0.85,(lm-6)*0.06);     // 楽逃げ
        }
        target=cruiseBase+cg+rnd(-0.15,0.15);
      }
      let battle=false;
      if(h.dist>straightDist-120){
        for(const o of F){ if(o===h||o.finished)continue; if(Math.abs(o.dist-h.dist)<3.2){battle=true;break;} }
        if(battle){ let gb=0.4+h.p.gutsF*0.7; if(h.ab==="fighter")gb*=1.8; target+=gb; }
      }
      // ---- スタミナ消費（ゲーム本体と同一構造。Pで調整実験可） ----
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
      const sW=startS+h.dist, onBend=curveAt(sW)!==0, cg=STYLES[h.style].cg;
      if((DIST-h.dist)>480){ const home=clamp((cg>0?0.6:2.4)+h.laneBias,0,6); h.target+=clamp(home-h.target,-0.5,0.5)*dt*0.5; }
      else{ if((h.style==="sashi"||h.style==="oikomi")&&h.target<3.4)h.target+=dt*0.9;
            if(cg>0&&h.target>1.4)h.target-=dt*0.5; }
      if(blk) h.target=Math.min(onBend?4.5:6, h.target+(onBend?0.6:1.0)*dt);
      h.lane=clamp(h.lane+clamp(h.target-h.lane,-1.9*dt,1.9*dt),0,7);
      let gl=onBend?0.0026:0.0005;
      if(onBend){ let red=h.p.cornerSkill; if(h.ab==="corner")red+=0.5; gl*=clamp(1-red,0.35,1); }
      h.dist+=h.speed*(1-h.lane*gl)*dt;
      if(!h.finished&&h.dist>=DIST){ const over=h.dist-DIST, ve=Math.max(0.1,h.speed*(1-h.lane*gl)); h.ft=t-over/ve; h.finished=true; }
    }
    // パスC：馬体接触の解消（本体 stepRace と同一・位置のみ＝速度/スタミナ不変。パワーで押し勝つ）
    const BL=2.6, ML=0.85, kB=clamp(10*dt,0,1);
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
  return { F, win:r[0] };
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
