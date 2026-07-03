#!/usr/bin/env node
/**
 * 収録実況の音声バンク生成（VOICEVOX → voice/*.mp3 ＋ manifest.json）
 *
 * 想定実行環境: GitHub Actions ubuntu-latest（7z / ffmpeg 同梱・フル回線）。
 *   node tools/gen_voice.js --ensure-engine
 *     … voice/ が完成済みならスキップ。無ければ VOICEVOX エンジン(linux-cpu)を
 *       GitHub Releases から取得・起動して生成する（actions/cache でキャッシュ推奨）。
 * ローカルに既にエンジンが立っている場合:
 *   VOICEVOX_URL=http://127.0.0.1:50021 node tools/gen_voice.js
 *
 * 出力: voice/p_<key>.mp3（実況句）/ n_<i>.mp3・N_<i>.mp3（馬名 通常/絶叫）/ r_<i>.mp3（レース名）
 *       voice/manifest.json … {"credit","map":{"p:gate_open":"p_gate_open.mp3","n:テッカコウガ":"n_00.mp3",...}}
 * ライセンス: 生成音声は VOICEVOX 各キャラクターの利用規約に従う（クレジット表記必須）。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "voice");
const DEF = JSON.parse(fs.readFileSync(path.join(__dirname, "voice_phrases.json"), "utf8"));
const ENGINE_URL = process.env.VOICEVOX_URL || "http://127.0.0.1:50021";

// ---- クリップ一覧（key → {text, tier, file}） ----
function planClips(){
  const clips = [];
  for(const [key, p] of Object.entries(DEF.phrases))
    clips.push({ key:"p:"+key, text:p.text, tier:p.tier, file:`p_${key}.mp3` });
  DEF.names.forEach((nm,i)=>{
    const idx = String(i).padStart(2,"0");
    clips.push({ key:"n:"+nm, text:nm,        tier:"high", file:`n_${idx}.mp3` });
    clips.push({ key:"N:"+nm, text:nm+"！",   tier:"max",  file:`N_${idx}.mp3` });
  });
  DEF.raceNames.forEach((nm,i)=>{
    clips.push({ key:"r:"+nm, text:nm, tier:"calm", file:`r_${String(i).padStart(2,"0")}.mp3` });
  });
  return clips;
}

function manifestComplete(clips){
  const mf = path.join(OUT, "manifest.json");
  if(!fs.existsSync(mf)) return false;
  try{
    const m = JSON.parse(fs.readFileSync(mf, "utf8"));
    return clips.every(c => m.map && m.map[c.key] && fs.existsSync(path.join(OUT, m.map[c.key])));
  }catch(e){ return false; }
}

async function jfetch(url, opt){
  const r = await fetch(url, opt);
  if(!r.ok) throw new Error(`${opt&&opt.method||"GET"} ${url} → HTTP ${r.status}`);
  return r;
}

// ---- VOICEVOX エンジンの取得・起動（--ensure-engine 時のみ） ----
async function ensureEngine(){
  try{ await jfetch(ENGINE_URL+"/version"); console.log("エンジン起動済み:", ENGINE_URL); return null; }catch(e){}
  const tmp = process.env.RUNNER_TEMP || "/tmp";
  const dl  = path.join(tmp, "vvengine_dl");
  const ex  = path.join(tmp, "vvengine");
  fs.mkdirSync(dl, { recursive:true });
  // 最新リリースの linux-cpu-x64 資産（分割7z）を取得
  console.log("VOICEVOX エンジンのリリース情報を取得…");
  const rel = await (await jfetch("https://api.github.com/repos/VOICEVOX/voicevox_engine/releases/latest",
    { headers:{ "User-Agent":"hizumeoto-voicegen", "Accept":"application/vnd.github+json" } })).json();
  // x64 を厳格に選ぶ（arm64 が混ざると x64 ランナーで起動不能。過去命名 linux-cpu-<ver> にもフォールバック）
  let assets = (rel.assets||[]).filter(a => /linux-cpu-x64.*\.7z\.\d+$/.test(a.name));
  if(!assets.length) assets = (rel.assets||[]).filter(a => /linux-cpu-(?!arm)[\d.]/.test(a.name) && /\.7z\.\d+$/.test(a.name));
  assets.sort((a,b)=>a.name.localeCompare(b.name));
  if(!assets.length) throw new Error("linux-cpu-x64 の 7z 資産が見つかりません（release: "+rel.tag_name+"）: "+ (rel.assets||[]).map(a=>a.name).join(", "));
  console.log("取得対象:", rel.tag_name, assets.map(a=>a.name+" ("+Math.round(a.size/1e6)+"MB)").join(", "));
  for(const a of assets){
    const dest = path.join(dl, a.name);
    if(fs.existsSync(dest) && fs.statSync(dest).size === a.size){ console.log("  キャッシュ済:", a.name); continue; }
    console.log("  ダウンロード:", a.name);
    const r = await jfetch(a.browser_download_url, { headers:{ "User-Agent":"hizumeoto-voicegen" } });
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  }
  console.log("展開中…");
  fs.rmSync(ex, { recursive:true, force:true }); fs.mkdirSync(ex, { recursive:true });
  execSync(`7z x -y -o"${ex}" "${path.join(dl, assets[0].name)}"`, { stdio:"inherit" });
  // run 実行体を探す
  let runBin = null;
  (function walk(d, depth){ if(depth>3||runBin) return;
    for(const f of fs.readdirSync(d)){ const p=path.join(d,f);
      const st=fs.statSync(p);
      if(st.isDirectory()) walk(p, depth+1);
      else if(f==="run" && (st.mode & 0o111)) runBin=p;
      else if(f==="run") { fs.chmodSync(p, 0o755); runBin=p; }
      if(runBin) return; } })(ex, 0);
  if(!runBin) throw new Error("エンジン実行体 run が見つかりません");
  console.log("エンジン起動:", runBin);
  const proc = spawn(runBin, ["--host","127.0.0.1","--port","50021"], { cwd:path.dirname(runBin), stdio:"inherit", detached:false });
  let died=false; proc.on("exit", code=>{ died=true; console.error("エンジンプロセスが終了 code="+code); });
  for(let i=0;i<180;i++){
    if(died) throw new Error("エンジンが即終了しました（アーキテクチャ/依存ライブラリを確認）");
    await new Promise(r=>setTimeout(r,2000));
    try{ await jfetch(ENGINE_URL+"/version"); console.log("エンジン準備完了"); return proc; }catch(e){}
  }
  throw new Error("エンジンが起動しませんでした");
}

// ---- 話者・スタイルの解決（名前ベース・フォールバック付き） ----
async function resolveStyles(){
  const speakers = await (await jfetch(ENGINE_URL+"/speakers")).json();
  const wanted = [DEF.speaker, ...(DEF.speakerFallbacks||[])];
  let sp = null;
  for(const w of wanted){ sp = speakers.find(s=>s.name===w || (s.name||"").includes(w)); if(sp) break; }
  if(!sp) sp = speakers[0];
  const styleId = name => { const st = sp.styles.find(s=>s.name===name) || sp.styles.find(s=>s.name==="ノーマル") || sp.styles[0]; return st.id; };
  const tiers = {};
  for(const [tier, cfg] of Object.entries(DEF.styles)) tiers[tier] = { id: styleId(cfg.styleName), ...cfg };
  console.log("話者:", sp.name, "／tier→style:", Object.entries(tiers).map(([k,v])=>`${k}=#${v.id}`).join(" "));
  return { speakerName: sp.name, tiers };
}

async function synthClip(text, tier, tiers){
  const t = tiers[tier] || tiers.calm;
  const q = await (await jfetch(`${ENGINE_URL}/audio_query?speaker=${t.id}&text=${encodeURIComponent(text)}`, { method:"POST" })).json();
  q.speedScale = t.speedScale; q.pitchScale = t.pitchScale;
  q.intonationScale = t.intonationScale; q.volumeScale = t.volumeScale;
  q.prePhonemeLength = 0.05; q.postPhonemeLength = 0.06;   // 結合再生用に前後の無音を最小化
  q.outputSamplingRate = 24000; q.outputStereo = false;
  const wav = Buffer.from(await (await jfetch(`${ENGINE_URL}/synthesis?speaker=${t.id}`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(q) })).arrayBuffer());
  return wav;
}

function wavToMp3(wav, outFile){
  execSync(`ffmpeg -hide_banner -loglevel error -y -i pipe:0 -ac 1 -ar 24000 -b:a 64k "${outFile}"`, { input: wav });
}

(async function main(){
  const clips = planClips();
  if(manifestComplete(clips)){ console.log(`voice/ は生成済み（${clips.length}クリップ・キャッシュ命中）→ スキップ`); return; }
  let engineProc = null;
  if(process.argv.includes("--ensure-engine")) engineProc = await ensureEngine();
  else await jfetch(ENGINE_URL+"/version");   // 起動済み前提

  fs.mkdirSync(OUT, { recursive:true });
  const { speakerName, tiers } = await resolveStyles();
  const map = {};
  let done = 0, totalBytes = 0;
  for(const c of clips){
    const outFile = path.join(OUT, c.file);
    if(!fs.existsSync(outFile)){
      const wav = await synthClip(c.text, c.tier, tiers);
      wavToMp3(wav, outFile);
    }
    map[c.key] = c.file;
    totalBytes += fs.statSync(outFile).size;
    if(++done % 25 === 0) console.log(`  ${done}/${clips.length} …`);
  }
  const manifest = { v:1, credit:`VOICEVOX:${speakerName}`, generated:new Date().toISOString(), clips:clips.length, map };
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
  console.log(`完了: ${clips.length}クリップ / 合計 ${(totalBytes/1e6).toFixed(1)}MB / 話者 ${speakerName}`);
  if(engineProc){ try{ engineProc.kill(); }catch(e){} }
  process.exit(0);
})().catch(e=>{ console.error("生成失敗:", e.message); process.exit(1); });
