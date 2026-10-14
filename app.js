const $=s=>document.querySelector(s);let cat="all";
const t=$("#theme");t.onclick=()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme=="dark"?"light":"dark";localStorage.theme=d.dataset.theme};
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SOCIALS=[["x","X"],["telegram","Telegram"],["discord","Discord"],["reddit","Reddit"],["github","GitHub"],["gitlab","GitLab"],["youtube","YouTube"],["medium","Medium"],["website","Website"]];
function parseEntry(e){let social={};if(e.length&&e[e.length-1]&&typeof e[e.length-1]==="object"){social=e[e.length-1];e=e.slice(0,-1)}const [cat,name,desc,url,logo,flag]=e;return {cat,name,desc,url:url||"",logo:logo||"",flag:flag||"",social}}
const ITEMS=ENTRIES.map(parseEntry);
$("#cats").innerHTML=`<button data-c="all" class="on">All (${ENTRIES.length})</button>`+Object.entries(CATEGORIES).map(([k,v])=>`<button data-c="${k}">${v} (${ITEMS.filter(e=>e.cat==k).length})</button>`).join("");
$("#cats").onclick=e=>{const b=e.target.closest("button");if(!b)return;cat=b.dataset.c;document.querySelectorAll("#cats button").forEach(x=>x.classList.toggle("on",x==b));render()};
$("#q").oninput=render;
function socialBar(name,social){const links=SOCIALS.filter(([k])=>social&&social[k]).map(([k,label])=>{const tip=esc(name+" on "+label);return `<a href="${esc(social[k])}" target="_blank" rel="noopener" aria-label="${tip}" title="${tip}"><svg aria-hidden="true" width="16" height="16"><use href="#i-${k}"/></svg></a>`}).join("");return links?`<div class="card-social">${links}</div>`:""}
function render(){const q=$("#q").value.toLowerCase().trim();let html="",n=0;
for(const[k,v]of Object.entries(CATEGORIES)){if(cat!="all"&&cat!=k)continue;
const items=ITEMS.filter(e=>e.cat==k&&(!q||(e.name+" "+e.desc+" "+e.url+" "+Object.values(e.social).join(" ")).toLowerCase().includes(q)));if(!items.length)continue;n+=items.length;
html+=`<section><h2>${v}</h2><div class="grid">`+items.map(({name,desc,url,logo,flag,social})=>{const ic=logo?`<img class="logo" src="assets/logos/${logo}.png" alt="" width="32" height="32" loading="lazy">`:`<span class="logo ph" aria-hidden="true">${esc(name.replace(/[^\p{L}\p{N} ]/gu,"").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase())}</span>`;const warn=flag=="warn";const body=`${warn?`<b class="badge">⚠️ High risk</b>`:""}<h3>${ic}${esc(name)}</h3><p>${esc(desc)}</p>`;const soc=socialBar(name,social);return url?`<article class="card${warn?" warn":""}"><a class="card-main" href="${esc(url)}" target="_blank" rel="noopener">${body}<span>${esc(url.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"").slice(0,48))}</span></a>${soc}</article>`:`<article class="card soon">${body}<span>Coming soon</span>${soc}</article>`}).join("")+`</div></section>`}
$("#list").innerHTML=html;$("#empty").hidden=n>0}
render();
