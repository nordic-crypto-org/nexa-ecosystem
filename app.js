const $=s=>document.querySelector(s);let cat="all";
const t=$("#theme");t.onclick=()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme=="dark"?"light":"dark";localStorage.theme=d.dataset.theme};
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
$("#cats").innerHTML=`<button data-c="all" class="on">All (${ENTRIES.length})</button>`+Object.entries(CATEGORIES).map(([k,v])=>`<button data-c="${k}">${v} (${ENTRIES.filter(e=>e[0]==k).length})</button>`).join("");
$("#cats").onclick=e=>{const b=e.target.closest("button");if(!b)return;cat=b.dataset.c;document.querySelectorAll("#cats button").forEach(x=>x.classList.toggle("on",x==b));render()};
$("#q").oninput=render;
function render(){const q=$("#q").value.toLowerCase().trim();let html="",n=0;
for(const[k,v]of Object.entries(CATEGORIES)){if(cat!="all"&&cat!=k)continue;
const items=ENTRIES.filter(e=>e[0]==k&&(!q||(e[1]+" "+e[2]+" "+e[3]).toLowerCase().includes(q)));if(!items.length)continue;n+=items.length;
html+=`<section><h2>${v}</h2><div class="grid">`+items.map(([,name,desc,url,logo,flag])=>{const ic=logo?`<img class="logo" src="assets/logos/${logo}.png" alt="" width="32" height="32" loading="lazy">`:`<span class="logo ph" aria-hidden="true">${esc(name.replace(/[^\p{L}\p{N} ]/gu,"").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase())}</span>`;return url?`<a class="card${flag=="warn"?" warn":""}" href="${esc(url)}" target="_blank" rel="noopener">${flag=="warn"?`<b class="badge">⚠️ High risk</b>`:""}<h3>${ic}${esc(name)}</h3><p>${esc(desc)}</p><span>${esc(url.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"").slice(0,48))}</span></a>`:`<div class="card soon"><h3>${ic}${esc(name)}</h3><p>${esc(desc)}</p><span>Coming soon</span></div>`}).join("")+`</div></section>`}
$("#list").innerHTML=html;$("#empty").hidden=n>0}
render();
