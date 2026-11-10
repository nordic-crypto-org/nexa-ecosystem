const $=s=>document.querySelector(s);let cat="all";
const t=$("#theme");t.onclick=()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme=="dark"?"light":"dark";localStorage.theme=d.dataset.theme};
const slug=s=>s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SOCIALS=[["x","X"],["telegram","Telegram"],["discord","Discord"],["reddit","Reddit"],["github","GitHub"],["gitlab","GitLab"],["youtube","YouTube"],["medium","Medium"],["website","Website"]];
function parseEntry(e){let social={};if(e.length&&e[e.length-1]&&typeof e[e.length-1]==="object"){social={...e[e.length-1]};e=e.slice(0,-1)}const network=social.network||"",live=social.live!==false,appstore=social.appstore||"",play=social.play||"",download=social.download||"";delete social.network;delete social.live;delete social.appstore;delete social.play;delete social.download;const [cat,name,desc,url,logo,flag]=e;return {cat,name,desc,url:url||"",logo:logo||"",flag:flag||"",network,live,appstore,play,download,social}}
const ITEMS=ENTRIES.map(parseEntry).filter(e=>e.live);
$("#cats").innerHTML=`<button data-c="all" class="on">All (${ITEMS.length})</button>`+Object.entries(CATEGORIES).map(([k,v])=>`<button data-c="${k}">${v} (${ITEMS.filter(e=>e.cat==k).length})</button>`).join("")+`<button data-c="libraries">Libraries</button>`;
$("#cats").onclick=e=>{const b=e.target.closest("button");if(!b)return;cat=b.dataset.c;document.querySelectorAll("#cats button").forEach(x=>x.classList.toggle("on",x==b));render();if(cat=="libraries")$("#libtree")?.scrollIntoView({behavior:"smooth",block:"start"})};
$("#q").oninput=render;
function initials(name){return esc(name.replace(/[^\p{L}\p{N} ]/gu,"").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase())}
function logoHTML(name,logo){const ph=`<span class="logo ph" aria-hidden="true">${initials(name)}</span>`;return logo?`<img class="logo" src="assets/logos/${esc(logo)}.png" alt="" width="32" height="32" loading="lazy" onerror="this.outerHTML='${ph}'">`:ph}
function socialBar(name,social){const links=SOCIALS.filter(([k])=>social&&social[k]).map(([k,label])=>{const tip=esc(name+" on "+label);return `<a href="${esc(social[k])}" target="_blank" rel="noopener" aria-label="${tip}" title="${tip}"><svg aria-hidden="true" width="16" height="16"><use href="#i-${k}"/></svg></a>`}).join("");return links?`<div class="card-social">${links}</div>`:""}
function storeBar(e){const btns=[["appstore","App Store",e.appstore],["play","Google Play",e.play],["download","Direct download",e.download]].filter(([, ,u])=>u).map(([k,label,u])=>`<a class="store-btn store-${k}" href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}</a>`).join("");return btns?`<div class="card-stores">${btns}</div>`:""}
function render(){const q=$("#q").value.toLowerCase().trim();let html="",n=0;
const showLibs=cat=="all"||cat=="libraries";
const showEntries=cat!="libraries";
if(showEntries){
for(const[k,v]of Object.entries(CATEGORIES)){if(cat!="all"&&cat!=k)continue;
const items=ITEMS.filter(e=>e.cat==k&&(!q||(e.name+" "+e.desc+" "+e.url+" "+Object.values(e.social).join(" ")).toLowerCase().includes(q)));if(!items.length)continue;n+=items.length;
html+=`<section><h2>${v}</h2><div class="grid">`+items.map(e=>{const {name,desc,url,logo,flag,network,social}=e;const ic=logoHTML(name,logo);const warn=flag=="warn";const badges=[warn?`<b class="badge">⚠️ High risk</b>`:"",network=="testnet"?`<b class="badge testnet">Testnet experiment</b>`:""].filter(Boolean).join("");const body=`${badges?`<span class="badges">${badges}</span>`:""}<h3>${ic}${esc(name)}</h3><p>${esc(desc)}</p>`;const extra=storeBar(e)+socialBar(name,social);return url?`<article id="${slug(name)}" class="card${warn?" warn":""}"><a class="card-main" href="${esc(url)}" target="_blank" rel="noopener">${body}<span>${esc(url.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"").slice(0,48))}</span></a>${extra}</article>`:`<article id="${slug(name)}" class="card soon">${body}<span>Coming soon</span>${extra}</article>`}).join("")+`</div></section>`}
}
if(showLibs){const tree=typeof LIB_TREE!=="undefined"?LIB_TREE:null;if(tree){const qn=q;const nodes=tree.nodes.filter(n=>!qn||(n.name+" "+(n.note||"")).toLowerCase().includes(qn));const idset=new Set(nodes.map(n=>n.id));const edges=tree.edges.filter(e=>idset.has(e.from)&&idset.has(e.to));if(nodes.length){n+=nodes.length;html+=renderLibTree(tree,nodes,edges)}}}
$("#list").innerHTML=html;$("#empty").hidden=n>0}
function nodeById(nodes,id){return nodes.find(n=>n.id==id)}
function renderLibTree(tree,nodes,edges){
const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
const logo=n=>logoHTML(n.name,n.logo||"");
const nodeClass=n=>`lib-node${n.planned?" planned":""}${n.deprecated?" deprecated":""}`;
const nodeInner=n=>{const badge=n.planned?`<b class="badge planned">Planned</b>`:n.deprecated?`<b class="badge">Deprecated</b>`:"";const title=`${logo(n)}<span>${esc(n.name)}</span>`;const head=n.url?`<a href="${esc(n.url)}" target="_blank" rel="noopener">${title}</a>`:`<span class="lib-name">${title}</span>`;return `${badge?`<span class="badges">${badge}</span>`:""}${head}${n.note?`<p>${esc(n.note)}</p>`:""}`};
const edgeClass=e=>e.planned?"planned":e.verified?"verified":"unverified";
const edgeLabel=e=>e.planned?"Planned":e.kind=="renamed"?"Renamed to":e.verified?"Depends on":"Unverified";
const edgeList=edges.map(e=>{const a=byId[e.from],b=byId[e.to];if(!a||!b)return "";return `<li class="lib-edge ${edgeClass(e)}"><span class="lib-edge-from">${esc(a.name)}</span><span class="lib-edge-rel">${esc(edgeLabel(e))}</span><span class="lib-edge-to">${esc(b.name)}</span>${e.via?`<small>${esc(e.via)}</small>`:""}</li>`}).join("");
const cards=nodes.map(n=>`<article class="card ${nodeClass(n)}" id="lib-${esc(n.id)}">${nodeInner(n)}</article>`).join("");
return `<section id="libraries" class="lib-section"><h2>Libraries</h2><p class="lib-intro">${esc(tree.intro)}</p><p class="lib-legend"><span class="swatch verified"></span> Verified from a public source repo <span class="swatch unverified"></span> Unverified <span class="swatch planned"></span> Planned</p><div class="grid lib-grid">${cards}</div><h3 class="lib-edges-h">Dependencies, down to libnexa (C)</h3><ul class="lib-edges">${edgeList}</ul></section>`
}
render();
if(location.hash)document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
