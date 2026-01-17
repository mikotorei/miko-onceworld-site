// static/js/status-sim.js
// アクセ3枠対応版（Lv1基礎）

const STATS = ["vit","spd","atk","int","def","mdef","luk","mov"];
const BASE_STATS = ["vit","spd","atk","int","def","mdef","luk"];
const PROTEIN_STATS = ["vit","spd","atk","int","def","mdef","luk"];
const SCALE_STATS = ["vit","spd","atk","int","def","mdef","luk"];
const ARMOR_KEYS = ["head","body","hands","feet","shield"];
const ACCESSORY_KEYS = ["accessory1","accessory2","accessory3"];

const $ = (id)=>document.getElementById(id);

/* util */
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp0=(v)=>Math.max(0,n(v,0));
const clamp1=(v)=>Math.max(1,n(v,1));

const makeZeroStats=()=>Object.fromEntries(STATS.map(k=>[k,0]));
const addStats=(a,b)=>{const o={...a};for(const k of STATS)o[k]=(o[k]||0)+(b?.[k]||0);return o;}
const mulStatsFloor=(s,m)=>{const o=makeZeroStats();for(const k of STATS)o[k]=Math.floor((s?.[k]||0)*m);return o;}

/* paths */
function getBase(){
  const s=document.currentScript.src;
  return new URL(s,location.href).origin + s.replace(/^.*\/js\/status-sim\.js$/,"");
}
const BASE=getBase();
const abs=(p)=>BASE+p;

/* slots */
const SLOTS=[
  {key:"weapon",url:"/db/equip/weapon/index.json",dir:"/db/equip/weapon/"},
  {key:"head",url:"/db/equip/armor/head/index.json",dir:"/db/equip/armor/head/"},
  {key:"body",url:"/db/equip/armor/body/index.json",dir:"/db/equip/armor/body/"},
  {key:"hands",url:"/db/equip/armor/hands/index.json",dir:"/db/equip/armor/hands/"},
  {key:"feet",url:"/db/equip/armor/feet/index.json",dir:"/db/equip/armor/feet/"},
  {key:"shield",url:"/db/equip/armor/shield/index.json",dir:"/db/equip/armor/shield/"},
  {key:"accessory",url:"/db/equip/accessory/index.json",dir:"/db/equip/accessory/"},
];

/* storage */
const KEY="status_sim_v14_acc3";
const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
const load=()=>JSON.parse(localStorage.getItem(KEY)||"{}");

/* fetch */
const fetchJSON=u=>fetch(u,{cache:"no-store"}).then(r=>r.json());
const fetchText=u=>fetch(u,{cache:"no-store"}).then(r=>r.text());

/* toml */
function parseToml(t){
  const it={base_add:{},base_rate:{}};
  let sec="";
  for(const l of t.split(/\r?\n/).map(v=>v.trim())){
    if(!l||l==="+++"||l.startsWith("#"))continue;
    const s=l.match(/^\[(.+)\]$/); if(s){sec=s[1];continue;}
    const m=l.match(/^(\w+)\s*=\s*(.+)$/); if(!m)continue;
    let v=m[2].replace(/^"|"$|^'|'$/g,"");
    v=Number.isFinite(Number(v))?Number(v):v;
    if(sec==="base_add")it.base_add[m[1]]=v;
    else if(sec==="base_rate")it.base_rate[m[1]]=v;
    else it[m[1]]=v;
  }
  it.id=it.id||it.title;
  return it;
}

/* scale */
function scaleEquip(base,lv){
  const m=1+clamp0(lv)*0.1;
  const o=makeZeroStats();
  for(const k of SCALE_STATS)o[k]=Math.floor((base?.[k]||0)*m);
  o.mov=base?.mov||0;
  return o;
}
function scaleAccFlat(base,lv){
  const m=1+(clamp1(lv)-1)*0.1;
  const o=makeZeroStats();
  for(const k of STATS)o[k]=Math.floor((base?.[k]||0)*m);
  return o;
}
function scaleAccRate(base,lv){
  const m=1+(clamp1(lv)-1)*0.01;
  const o=makeZeroStats();
  for(const k of STATS)o[k]=(base?.[k]||0)*m;
  return o;
}
function applyRate(s,r){
  const o=makeZeroStats();
  for(const k of STATS)o[k]=Math.floor((s[k]||0)*(1+(r[k]||0)/100));
  return o;
}

/* set */
function getSet(items,state){
  let s=null;
  for(const k of ARMOR_KEYS){
    const id=state[k]?.id; if(!id)return null;
    const it=(items[k]||[]).find(v=>v.id===id); if(!it?.series)return null;
    if(s===null)s=it.series; else if(s!==it.series)return null;
  }
  return s;
}

/* table */
function build(){
  const tb=$("statsTbody"); tb.innerHTML="";
  for(const k of STATS){
    tb.insertAdjacentHTML("beforeend",
      `<tr data-k="${k}">
        <td>${k}</td><td class="num b"></td><td class="num e"></td><td class="num t"></td>
      </tr>`);
  }
}
function render(b,e,t){
  for(const tr of $("statsTbody").children){
    const k=tr.dataset.k;
    tr.querySelector(".b").textContent=b[k]||0;
    tr.querySelector(".e").textContent=e[k]||0;
    tr.querySelector(".t").textContent=t[k]||0;
  }
}

/* main */
document.addEventListener("DOMContentLoaded",async()=>{
  build();
  const saved=load();
  const items={};

  for(const s of SLOTS){
    items[s.key]=[];
    const sel=$(`select_${s.key}`); // weapon等
    if(!sel)continue;

    const files=await fetchJSON(abs(s.url));
    for(const f of files){
      items[s.key].push(parseToml(await fetchText(abs(s.dir+f))));
    }
    sel.innerHTML=`<option value="">（なし）</option>`+
      items[s.key].map(i=>`<option value="${i.id}">${i.title||i.id}</option>`).join("");
  }

  function recalc(){
    const base=makeZeroStats();
    for(const k of BASE_STATS)base[k]=clamp0($(`base_${k}`)?.value);

    const protRaw=makeZeroStats();
    for(const k of PROTEIN_STATS)protRaw[k]=clamp0($(`protein_${k}`)?.value);
    const shaker=clamp0($("shakerCount")?.value);
    const prot=mulStatsFloor(protRaw,1+shaker*0.01);

    let equip=makeZeroStats();
    const state={};

    for(const s of ["weapon","head","body","hands","feet","shield"]){
      const id=$(`select_${s}`).value;
      const lv=clamp0($(`level_${s}`).value);
      state[s]={id,lv};
      if(!id)continue;
      const it=items[s].find(v=>v.id===id);
      equip=addStats(equip,scaleEquip(it.base_add,lv));
    }

    const setMul=getSet(items,state)?1.1:1;
    const baseP=setMul===1?base:mulStatsFloor(base,setMul);
    const protP=setMul===1?prot:mulStatsFloor(prot,setMul);
    const equipP=setMul===1?equip:mulStatsFloor(equip,setMul);

    let sum=addStats(addStats(baseP,protP),equipP);

    let accFlat=makeZeroStats();
    let accRate=makeZeroStats();

    for(const i of ACCESSORY_KEYS){
      const id=$(`select_${i}`)?.value;
      const lv=clamp1($(`level_${i}`)?.value);
      if(!id)continue;
      const it=items.accessory.find(v=>v.id===id);
      accFlat=addStats(accFlat,scaleAccFlat(it.base_add,lv));
      accRate=addStats(accRate,scaleAccRate(it.base_rate,lv));
    }

    sum=addStats(sum,accFlat);
    const total=applyRate(sum,accRate);

    render(addStats(baseP,protP),addStats(equipP,accFlat),total);
    save({});
  }

  document.querySelectorAll("input,select").forEach(e=>e.addEventListener("input",recalc));
  recalc();
});
