// static/js/status-sim.js
// 装備Lv表示「+1～」 / 内部Lv=表示Lv-1 / 未強化は倍率1.0

const STATS = ["vit","spd","atk","int","def","mdef","luk","mov"];
const BASE_STATS = ["vit","spd","atk","int","def","mdef","luk"];
const PROTEIN_STATS = ["vit","spd","atk","int","def","mdef","luk"];
const SCALE_STATS = ["vit","spd","atk","int","def","mdef","luk"];
const ARMOR_KEYS = ["head","body","hands","feet","shield"];

const $ = (id)=>document.getElementById(id);

/* ---------------- 基本ユーティリティ ---------------- */

const n = (v, fb=0)=>Number.isFinite(Number(v)) ? Number(v) : fb;
const clamp0 = (v)=>Math.max(0, n(v,0));
const clamp1 = (v)=>Math.max(1, n(v,1)); // Lv用（必ず1以上）

function makeZeroStats(){
  return Object.fromEntries(STATS.map(k=>[k,0]));
}
function addStats(a,b){
  const o={...a};
  for(const k of STATS) o[k]=(o[k]||0)+(b?.[k]||0);
  return o;
}
function mulStatsFloor(s,m){
  const o=makeZeroStats();
  for(const k of STATS) o[k]=Math.floor((s?.[k]||0)*m);
  return o;
}

/* ---------------- GitHub Pages 対応 ---------------- */

function getAssetBaseUrl(){
  const s=document.currentScript;
  if(!s?.src) return location.origin;
  const u=new URL(s.src,location.href);
  return u.origin+u.pathname.replace(/\/js\/status-sim\.js$/,"");
}
const ASSET_BASE=getAssetBaseUrl();
const abs=(p)=>ASSET_BASE+p;

/* ---------------- 装備DB ---------------- */

const SLOTS=[
  {key:"weapon", index:"/db/equip/weapon/index.json", dir:"/db/equip/weapon/"},
  {key:"head",   index:"/db/equip/armor/head/index.json",   dir:"/db/equip/armor/head/"},
  {key:"body",   index:"/db/equip/armor/body/index.json",   dir:"/db/equip/armor/body/"},
  {key:"hands",  index:"/db/equip/armor/hands/index.json",  dir:"/db/equip/armor/hands/"},
  {key:"feet",   index:"/db/equip/armor/feet/index.json",   dir:"/db/equip/armor/feet/"},
  {key:"shield", index:"/db/equip/armor/shield/index.json", dir:"/db/equip/armor/shield/"},
];

/* ---------------- 保存 ---------------- */

const STORAGE_KEY="status_sim_state_v10_plus_level";
const saveState=(s)=>localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
const loadState=()=>{ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch{return{}} };
const clearState=()=>localStorage.removeItem(STORAGE_KEY);

/* ---------------- 通信 ---------------- */

async function fetchJSON(u){
  const r=await fetch(u,{cache:"no-store"});
  if(!r.ok) throw new Error("404: "+u);
  return r.json();
}
async function fetchText(u){
  const r=await fetch(u,{cache:"no-store"});
  if(!r.ok) throw new Error("404: "+u);
  return r.text();
}

/* ---------------- TOML簡易パース ---------------- */

function parseMiniToml(t){
  const item={base_add:{}};
  let sec="";
  for(const l of t.split(/\r?\n/).map(v=>v.trim())){
    if(!l||l==="+++"||l.startsWith("#")) continue;
    const s=l.match(/^\[(.+)\]$/);
    if(s){ sec=s[1]; continue; }
    const kv=l.match(/^([\w_]+)\s*=\s*(.+)$/);
    if(!kv) continue;
    let v=kv[2].replace(/^"|"$|^'|'$/g,"");
    v=Number.isFinite(Number(v))?Number(v):v;
    if(sec==="base_add") item.base_add[kv[1]]=v;
    else item[kv[1]]=v;
  }
  item.id=item.id||item.title||"unknown";
  return item;
}

/* ---------------- 装備Lvスケール ---------------- */

function scaleEquipBaseAdd(baseAdd, displayLv){
  const internalLv = clamp1(displayLv) - 1; // ★ここが肝
  const mul = 1 + internalLv * 0.1;

  const o=makeZeroStats();
  for(const k of SCALE_STATS){
    o[k]=Math.floor((baseAdd?.[k]||0)*mul);
  }
  o.mov=baseAdd?.mov||0;
  return o;
}

/* ---------------- セット効果判定 ---------------- */

function getArmorSetSeries(items, state){
  let s=null;
  for(const k of ARMOR_KEYS){
    const id=state[k]?.id;
    if(!id) return null;
    const it=(items[k]||[]).find(v=>v.id===id);
    if(!it?.series) return null;
    if(s===null) s=it.series;
    if(s!==it.series) return null;
  }
  return s;
}

/* ---------------- UI ---------------- */

function fillSelect(sel,items){
  sel.innerHTML="";
  sel.append(new Option("（なし）",""));
  for(const it of items) sel.append(new Option(it.title||it.id,it.id));
}

function buildTable(){
  const tb=$("statsTbody"); tb.innerHTML="";
  for(const k of STATS){
    tb.insertAdjacentHTML("beforeend",
      `<tr data-stat="${k}">
        <td>${k}</td>
        <td class="num" data-col="base"></td>
        <td class="num" data-col="equip"></td>
        <td class="num" data-col="total"></td>
      </tr>`);
  }
}

function renderTable(b,e,t){
  for(const tr of $("statsTbody").children){
    const k=tr.dataset.stat;
    tr.querySelector('[data-col="base"]').textContent=b[k]||0;
    tr.querySelector('[data-col="equip"]').textContent=e[k]||0;
    tr.querySelector('[data-col="total"]').textContent=t[k]||0;
  }
}

/* ---------------- メイン ---------------- */

document.addEventListener("DOMContentLoaded",async()=>{
  buildTable();
  const saved=loadState();
  const items={};
  const equipState={};

  for(const s of SLOTS){
    const sel=$(`select_${s.key}`);
    const lv=$(`level_${s.key}`);
    items[s.key]=[];

    try{
      const files=await fetchJSON(abs(s.index));
      for(const f of files){
        items[s.key].push(parseMiniToml(await fetchText(abs(s.dir+f))));
      }
      fillSelect(sel,items[s.key]);
    }catch{}

    sel.value=saved.equip?.[s.key]?.id||"";
    lv.value=clamp1(saved.equip?.[s.key]?.lv||1);

    sel.onchange=lv.oninput=recalc;
  }

  function recalc(){
    const base=makeZeroStats();
    for(const k of BASE_STATS) base[k]=clamp0($(`base_${k}`)?.value);

    const protein=makeZeroStats();
    for(const k of PROTEIN_STATS) protein[k]=clamp0($(`protein_${k}`)?.value);

    let equipSum=makeZeroStats();

    for(const s of SLOTS){
      const id=$(`select_${s.key}`).value;
      const lv=clamp1($(`level_${s.key}`).value);
      equipState[s.key]={id,lv};
      if(!id) continue;
      const it=items[s.key].find(v=>v.id===id);
      equipSum=addStats(equipSum,scaleEquipBaseAdd(it.base_add,lv));
    }

    const setOn=getArmorSetSeries(items,equipState);
    const mul=setOn?1.1:1;

    const baseP=mulStatsFloor(base,mul);
    const protP=mulStatsFloor(protein,mul);
    const equipP=mulStatsFloor(equipSum,mul);

    const total=addStats(addStats(baseP,protP),equipP);
    renderTable(addStats(baseP,protP),equipP,total);

    saveState({equip:equipState});
  }

  recalc();
});
