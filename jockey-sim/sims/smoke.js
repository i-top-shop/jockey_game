// jsdom スモークテスト：ロード→画面遷移→無頭でレース完走まで検証
// 外部fetch無し（THREE/フォント）。WebAudio/SpeechはbeforeParseでスタブ。
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync(require("path").join(__dirname,"..","jockey_game.html"), "utf8");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => errors.push("jsdomError: " + (e.detail && e.detail.message || e.message || e)));

// WebAudio/Speech の汎用フェイク（Sfx/Voice を無例外で動かす。実装はブラウザ任せ）
function fakeAudio(window){
  function uni(){
    const param = { value:0 };
    ["setValueAtTime","linearRampToValueAtTime","exponentialRampToValueAtTime","setTargetAtTime","cancelScheduledValues"].forEach(m=>param[m]=()=>param);
    return new Proxy({}, { get:(t,p)=>{
      if(p in t) return t[p];
      if(p==="gain"||p==="frequency"||p==="Q"||p==="detune"||p==="pan"||p==="playbackRate") return param;
      if(p==="getChannelData") return ()=>new Float32Array(128);
      if(p==="buffer"||p==="type"||p==="loop"||p==="value") return undefined;
      return ()=>t.__n || (t.__n=uni());   // connect/start/stop/任意メソッド → ノードを返す
    }, set:()=>true });
  }
  function Ctx(){ return new Proxy({ currentTime:0, sampleRate:44100, state:"running" }, { get:(t,p)=>{
    if(p in t) return t[p];
    if(p==="destination"||p==="listener") return uni();
    if(p==="resume"||p==="close"||p==="suspend") return ()=>Promise.resolve();
    return ()=>uni();   // createX 系すべて → ノード
  }}); }
  window.AudioContext = Ctx; window.webkitAudioContext = Ctx;
  window.speechSynthesis = { getVoices:()=>[], speak(){}, cancel(){}, addEventListener(){}, onvoiceschanged:null };
  window.SpeechSynthesisUtterance = function(t){ this.text=t; };
}

const dom = new JSDOM(html, { url:"https://localhost/", runScripts:"dangerously", pretendToBeVisual:true, virtualConsole:vc, beforeParse:fakeAudio });
const { window } = dom;
window.addEventListener("error", e => errors.push("window.error: " + (e.error && e.error.message || e.message)));
const $ = id => window.document.getElementById(id);
const click = id => { const el=$(id); if(!el) throw new Error("element不在: #"+id); el.dispatchEvent(new window.Event("click",{bubbles:true})); };
function check(label, fn){ try{ const r=fn(); console.log((r===false?"✗":"✓")+" "+label+(r&&r!==true?(" → "+r):"")); return r!==false; }
  catch(e){ console.log("✗ "+label+" → THREW: "+e.message); errors.push(label+": "+e.message); return false; } }

console.log("=== ロード時 ===");
check("ロード時エラーなし", () => errors.length===0 ? true : ("errors="+errors.length));
check("新規関数が存在", () => ["jLevel","awardJockeyXP","playerLaneSituation","renderJockeyGrowth","saveCareer","loadCareer","beginRun","stepRace","finishRace"].every(f=>typeof window[f]==="function"));
check("Save.ok=true（localStorage有効）", () => window.Save && window.Save.ok===true);
check("新規DOM要素が存在", () => ["lane-ind","li-in","li-front","li-out","result-jockey","sta-lab","comp-lab"].every(id=>!!$(id)));

console.log("\n=== 画面遷移フロー ===");
check("タイトル→馬選択→12枚", () => { click("btn-to-select"); return $("horse-list").children.length===12; });
check("馬選択→作戦", () => { $("horse-list").children[2].dispatchEvent(new window.Event("click",{bubbles:true})); click("btn-to-tactic"); return $("screen-tactic").classList.contains("active"); });
check("距離2000＋差し選択→出走可", () => {
  Array.from($("dist-grid").children).find(b=>/2000/.test(b.textContent)).dispatchEvent(new window.Event("click",{bubbles:true}));
  Array.from($("tactic-grid").children).find(b=>/さし|差し/.test(b.textContent)).dispatchEvent(new window.Event("click",{bubbles:true}));
  return !$("btn-to-race").disabled;
});
check("レース開始(initRace)", () => { window.document.dispatchEvent(new window.Event("pointerdown",{bubbles:true})); click("btn-to-race"); return $("screen-race").classList.contains("active"); });

console.log("\n=== 無頭レース完走（player側スキル/実況/講評/成長の実走） ===");
check("発走(beginRun)", () => { window.beginRun(); return true; });
let steps=0;
check("stepRace+render を反復（全馬決着まで）", () => {
  for(let i=0;i<4000;i++){ window.stepRace(0.18); steps++; if(i%15===0) window.render(); }
  return "steps="+steps;
});
check("playerLaneSituation()正常", () => { const s=window.playerLaneSituation(); return typeof s.front==="boolean"&&typeof s.inner==="boolean"&&typeof s.outer==="boolean"; });
check("finishRace 実行（例外なし）", () => { window.finishRace(); return true; });
check("着順表が12行生成", () => $("result-body").children.length===12);
check("講評に騎乗貢献度スコア", () => /騎乗貢献度/.test($("result-advice").innerHTML));
check("騎手成長枠に騎手レベル", () => /騎手レベル/.test($("result-jockey").textContent));
check("キャリアが保存された(localStorageにraces>0)", () => {
  const raw = window.localStorage.getItem("hizumeoto_save_v1");
  if(!raw) return false; const c=JSON.parse(raw).career; return c && c.races>=1 ? ("races="+c.races+" Lv経験XP="+c.jockey.xp) : false;
});

window.close();
console.log("\n収集エラー数: " + errors.length);
if(errors.length){ errors.slice(0,12).forEach(e=>console.log("  - "+String(e).slice(0,180))); process.exit(1); }
console.log("SMOKE PASS");
