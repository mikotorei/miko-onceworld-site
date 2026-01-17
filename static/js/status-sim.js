// static/js/status-sim.js
// floor 位置：
// ① (②+①+③) の後
// ② ×④ の後
// ③ 通常割合⑥ の後
// ④ 最終割合⑦ の後

const STATS = ["vit","spd","atk","int","def","mdef","luk","mov"];
const BASE_STATS = ["vit","spd","atk","int","def","mdef","luk"];
const PROTEIN_STATS = ["vit","spd","atk","int","def","mdef","luk"];
const ARMOR_KEYS = ["head","body","hands","feet","shield"];
const ACCESSORY_KEYS = ["accessory1","accessory2","accessory3"];
const PET_KEYS = ["pet1","pet2","pet3"];

const BASE_MOV = 6;
const EPS = 1e-9;
const floorSafe = (v)=>Math.floor(v+EPS);
const $ = (id)=>document.getElementById(id);

const n=(v,f=0)=>Number.isFinite(+v)?+v:f;
const clamp0=(v)=>Math.max(0,n(v));
const clamp1=(v)=>Math.max(1,n(v));
const clampStage=(v)=>Math.max(0,Math.min(4,n(v)));

const zero=()=>Object.fromEntries(STATS.map(k=>[k,0]));
const add=(a,b)=>{const r={...a};for(const k of STATS)r[k]+=b?.[k]??0;return r;};
const mul=(a,m)=>{const r=zero();for(const k of STATS)r[k]=(a[k]??0)*m;return r;};
const floorStats=(a)=>{const r=zero();for(const k of STATS)r[k]=floorSafe(a[k]??0);return r;};

function applyRateFloor(stats,rate){
  const r=zero();
  for(const k of STATS){
    r[k]=floorSafe((stats[k]??0)*(1+(rate[k]??0)/100));
  }
  return r;
}

/* ---------- fetch ---------- */
async function fetchJSON(u){const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw u;return r.json();}
async function fetchText(u){const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw u;return r.text();}

/* ---------- toml ---------- */
function parseToml(t){
  const o={base_add:{},base_rate:{}};
  let s="";
  t.split(/\r?\n/).map(l=>l.trim()).forEach(l=>{
    if(!l||l==="+++"||l.startsWith("#"))return;
    const m1=l.match(/^\[(.+?)\]$/);if(m1){s=m1[1];return;}
    const m2=l.match(/^(\w+)\s*=\s*(.+)$/);if(!m2)return;
    const k=m2[1],v=+m2[2];
    if(s==="base_add")o.base_add[k]=v||0;
    else if(s==="base_rate")o.base_rate[k]=v||0;
    else o[k]=m2[2];
  });
  o.id=o.id||o.title;
  return o;
}

/* ---------- table ---------- */
function buildTable(){
  const tbody=$("statsTbody");
  if(!tbody)return;
  tbody.innerHTML="";
  for(const k of STATS){
    const tr=document.createElement("tr");
    tr.dataset.stat=k;
    tr.innerHTML=`
      <td>${k}</td>
      <td class="num" data-col="base"></td>
      <td class="num" data-col="equip"></td>
      <td class="num" data-col="total"></td>`;
    tbody.appendChild(tr);
  }
}
function renderTable(basePlusProtein,equipDisplay,total){
  const tbody=$("statsTbody");
  if(!tbody)return;
  for(const tr of tbody.querySelectorAll("tr")){
    const k=tr.dataset.stat;
    tr.querySelector('[data-col="base"]').textContent = Math.floor(basePlusProtein[k]??0);
    tr.querySelector('[data-col="equip"]').textContent = Math.floor(equipDisplay[k]??0);
    tr.querySelector('[data-col="total"]').textContent = total[k]??0;
  }
}

/* ---------- pet ---------- */
function sumPet(p,stage){
  const a=zero(),r=zero(),f=zero();
  for(let i=1;i<=stage;i++){
    const s=p.stages[i]; if(!s)continue;
    for(const k of STATS){
      a[k]+=s.base_add?.[k]??0;
      r[k]+=s.base_rate?.[k]??0;
      f[k]+=s.final_rate?.[k]??0;
    }
  }
  return {add:a,rate:r,final:f};
}

/* ---------- main ---------- */
document.addEventListener("DOMContentLoaded",async()=>{
  buildTable();

  const pets=(await fetchJSON("/db/pet_skills.json")).pets;

  const slots={
    weapon:"/db/equip/weapon/",
    head:"/db/equip/armor/head/",
    body:"/db/equip/armor/body/",
    hands:"/db/equip/armor/hands/",
    feet:"/db/equip/armor/feet/",
    shield:"/db/equip/armor/shield/",
    accessory:"/db/equip/accessory/"
  };

  const equipDB={};
  for(const k in slots){
    equipDB[k]=[];
    const files=await fetchJSON(slots[k]+"index.json");
    for(const f of files){
      equipDB[k].push(parseToml(await fetchText(slots[k]+f)));
    }
  }

  function recalc(){
    /* ② base */
    let base=zero();
    for(const k of BASE_STATS) base[k]=clamp0($(`base_${k}`)?.value);
    base.mov=BASE_MOV;

    /* ① protein */
    let protein=zero();
    const shaker=clamp0($("shakerCount")?.value);
    for(const k of PROTEIN_STATS){
      protein[k]=clamp0($(`protein_${k}`)?.value)*(1+shaker*0.01);
    }

    /* ③ equip */
    let equip=zero();
    const equipState={};
    for(const k of ["weapon",...ARMOR_KEYS]){
      const id=$(`select_${k}`)?.value;
      const lv=clamp0($(`level_${k}`)?.value);
      equipState[k]={id,lv};
      if(!id)continue;
      const it=equipDB[k].find(v=>v.id===id);
      const m=1+lv*0.1;
      for(const s of STATS) equip[s]+=(it.base_add[s]||0)*m;
    }

    /* floor after (②+①+③) */
    let total=floorStats(add(add(base,protein),equip));

    /* ④ set */
    let setMul=1;
    const ids=ARMOR_KEYS.map(k=>equipState[k]?.id);
    if(ids.every(Boolean)){
      const series=new Set(ARMOR_KEYS.map(k=>equipDB[k].find(v=>v.id===equipState[k].id)?.series));
      if(series.size===1)setMul=1.1;
    }
    total=floorStats(mul(total,setMul));

    /* ⑤ flat */
    let accFlat=zero(),accRate=zero();
    for(const k of ACCESSORY_KEYS){
      const id=$(`select_${k}`)?.value;
      const lv=clamp1($(`level_${k}`)?.value);
      if(!id)continue;
      const it=equipDB.accessory.find(v=>v.id===id);
      const fm=1+(lv-1)*0.1, rm=1+(lv-1)*0.01;
      for(const s of STATS){
        accFlat[s]+=(it.base_add[s]||0)*fm;
        accRate[s]+=(it.base_rate[s]||0)*rm;
      }
    }

    let petFlat=zero(),petRate=zero(),petFinal=zero();
    for(const k of PET_KEYS){
      const id=$(`select_${k}`)?.value;
      const st=clampStage($(`stage_${k}`)?.value);
      if(!id||!st)continue;
      const s=sumPet(pets.find(v=>v.id===id),st);
      petFlat=add(petFlat,s.add);
      petRate=add(petRate,s.rate);
      petFinal=add(petFinal,s.final);
    }

    total=add(total,add(accFlat,petFlat));

    /* ⑥ */
    total=applyRateFloor(total,add(accRate,petRate));
    /* ⑦ */
    total=applyRateFloor(total,petFinal);

    renderTable(add(base,protein),add(equip,add(accFlat,petFlat)),total);
  }

  document.querySelectorAll("input,select").forEach(e=>{
    e.addEventListener("input",recalc);
    e.addEventListener("change",recalc);
  });

  recalc();
});
