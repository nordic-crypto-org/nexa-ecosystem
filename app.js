const $=s=>document.querySelector(s);let cat="all";
const t=$("#theme");t.onclick=()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme=="dark"?"light":"dark";localStorage.theme=d.dataset.theme};
const slug=s=>s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SOCIALS=[["x","X"],["telegram","Telegram"],["discord","Discord"],["reddit","Reddit"],["github","GitHub"],["gitlab","GitLab"],["youtube","YouTube"],["medium","Medium"],["website","Website"]];
function parseEntry(e){let social={};if(e.length&&e[e.length-1]&&typeof e[e.length-1]==="object"){social={...e[e.length-1]};e=e.slice(0,-1)}const network=social.network||"",live=social.live!==false,appstore=social.appstore||"",play=social.play||"",download=social.download||"";delete social.network;delete social.live;delete social.appstore;delete social.play;delete social.download;const [cat,name,desc,url,logo,flag]=e;return {cat,name,desc,url:url||"",logo:logo||"",flag:flag||"",network,live,appstore,play,download,social}}
const ITEMS=ENTRIES.map(parseEntry).filter(e=>e.live||e.network=="testnet");
const TESTNET_NOTE=`<p class="note">Testnet experiments by Nordic Crypto. Testnet coins have no value; never send mainnet funds. Nordic Estate, Nordic ICO and Nordic Crypto Pool are testnet demos pending legal assessment, not a public offer.</p>`;
$("#cats").innerHTML=`<button data-c="all" class="on">All (${ITEMS.length})</button>`+Object.entries(CATEGORIES).map(([k,v])=>`<button data-c="${k}">${v} (${ITEMS.filter(e=>e.cat==k).length})</button>`).join("")+`<button data-c="libraries">Libraries</button>`;
$("#cats").onclick=e=>{const b=e.target.closest("button");if(!b)return;cat=b.dataset.c;document.querySelectorAll("#cats button").forEach(x=>x.classList.toggle("on",x==b));render();if(cat=="libraries")$("#libtree")?.scrollIntoView({behavior:"smooth",block:"start"})};
$("#q").oninput=render;
function initialsText(name){return name.replace(/[^\p{L}\p{N} ]/gu,"").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()}
function initials(name){return esc(initialsText(name))}
function logoPlaceholder(name){return `<span class="logo ph" aria-hidden="true">${initials(name)}</span>`}
function logoHTML(name,logo){return logo?`<img class="logo" src="assets/logos/${esc(logo)}.png" alt="" width="32" height="32" loading="lazy" data-initials="${esc(initialsText(name))}">`:logoPlaceholder(name)}
function bindLogoFallbacks(root){root.querySelectorAll("img.logo[data-initials]").forEach(img=>{const swap=()=>{if(!img.isConnected)return;const span=document.createElement("span");span.className="logo ph";span.setAttribute("aria-hidden","true");span.textContent=img.getAttribute("data-initials")||"";img.replaceWith(span)};img.addEventListener("error",swap);if(img.complete&&img.naturalWidth===0)swap()})}
function socialBar(name,social){const links=SOCIALS.filter(([k])=>social&&social[k]).map(([k,label])=>{const tip=esc(name+" on "+label);return `<a href="${esc(social[k])}" target="_blank" rel="noopener" aria-label="${tip}" title="${tip}"><svg aria-hidden="true" width="16" height="16"><use href="#i-${k}"/></svg></a>`}).join("");return links?`<div class="card-social">${links}</div>`:""}
function storeBar(e){const btns=[["appstore","App Store",e.appstore],["play","Google Play",e.play],["download","Direct download",e.download]].filter(([, ,u])=>u).map(([k,label,u])=>`<a class="store-btn store-${k}" href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}</a>`).join("");return btns?`<div class="card-stores">${btns}</div>`:""}
function render(){const q=$("#q").value.toLowerCase().trim();let html="",n=0;
const showLibs=cat=="all"||cat=="libraries";
const showEntries=cat!="libraries";
if(showEntries){
for(const[k,v]of Object.entries(CATEGORIES)){if(cat!="all"&&cat!=k)continue;
const items=ITEMS.filter(e=>e.cat==k&&(!q||(e.name+" "+e.desc+" "+e.url+" "+Object.values(e.social).join(" ")).toLowerCase().includes(q)));if(!items.length)continue;n+=items.length;
html+=`<section id="${k}"><h2>${v}</h2>${k=="testnet"?TESTNET_NOTE:""}<div class="grid">`+items.map(e=>{const {name,desc,url,logo,flag,network,live,social}=e;const ic=logoHTML(name,logo);const warn=flag=="warn";const badges=[warn?`<b class="badge">⚠️ High risk</b>`:"",network=="testnet"?`<b class="badge testnet">Testnet experiment</b>`:""].filter(Boolean).join("");const body=`${badges?`<span class="badges">${badges}</span>`:""}<h3>${ic}${esc(name)}</h3><p>${esc(desc)}</p>`;const extra=storeBar(e)+socialBar(name,social);return url&&live?`<article id="${slug(name)}" class="card${warn?" warn":""}"><a class="card-main" href="${esc(url)}" target="_blank" rel="noopener">${body}<span>${esc(url.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"").slice(0,48))}</span></a>${extra}</article>`:`<article id="${slug(name)}" class="card soon">${body}<span>Coming soon</span>${extra}</article>`}).join("")+`</div></section>`}
}
if(showLibs){const tree=typeof LIB_TREE!=="undefined"?LIB_TREE:null;if(tree){const qn=q;const nodes=tree.nodes.filter(n=>!qn||(n.name+" "+(n.note||"")).toLowerCase().includes(qn));const idset=new Set(nodes.map(n=>n.id));const edges=tree.edges.filter(e=>idset.has(e.from)&&idset.has(e.to));if(nodes.length){n+=nodes.length;html+=renderLibTree(tree,nodes,edges)}}}
$("#list").innerHTML=html;bindLogoFallbacks($("#list"));$("#empty").hidden=n>0}
function nodeById(nodes,id){return nodes.find(n=>n.id==id)}
function renderLibTree(tree,nodes,edges){
const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
const logo=n=>logoHTML(n.name,n.logo||"");
const nodeClass=n=>`lib-node${n.planned?" planned":""}${n.deprecated?" deprecated":""}`;
const nodeInner=n=>{const badge=n.planned?`<b class="badge planned">Planned</b>`:n.deprecated?`<b class="badge">Deprecated</b>`:"";const title=`${logo(n)}<span>${esc(n.name)}</span>`;const head=n.url?`<a href="${esc(n.url)}" target="_blank" rel="noopener">${title}</a>`:`<span class="lib-name">${title}</span>`;return `${badge?`<span class="badges">${badge}</span>`:""}${head}${n.note?`<p>${esc(n.note)}</p>`:""}`};
const cards=nodes.map(n=>`<article class="card ${nodeClass(n)}" id="lib-${esc(n.id)}">${nodeInner(n)}</article>`).join("");
const forest=renderDepForest(nodes,edges,byId);
const legend=`<p class="lib-legend"><span class="lib-legend-item"><span class="swatch verified"></span> Verified from a public source repo</span><span class="lib-legend-item"><span class="swatch unverified"></span> Unverified</span><span class="lib-legend-item"><span class="swatch planned"></span> Planned</span></p>`;
const dep=forest?`<h3 id="lib-deps" class="lib-edges-h">Dependencies, down to libnexa (C)</h3>${legend}${forest}`:"";
return `<section id="libraries" class="lib-section"><h2>Libraries</h2><p class="lib-intro">${esc(tree.intro)}</p><div class="grid lib-grid">${cards}</div>${dep}</section>`
}
// Renamed edges are a former name of the target, not a child. Other edges run from a dependent to the library it depends on, so dependents hang under that library. No edge is added that is not in the data.
function renderDepForest(nodes,edges,byId){
const children={},aliases={},isChild=new Set();
for(const e of edges){
const from=byId[e.from],to=byId[e.to];
if(!from||!to)continue;
if(e.kind=="renamed"){(aliases[e.to]||=[]).push({node:from,edge:e});continue}
(children[e.to]||=[]).push({node:from,edge:e});
isChild.add(e.from);
}
const order=new Map(nodes.map((n,i)=>[n.id,i]));
const depth=id=>{const seen=new Set();const walk=x=>{if(seen.has(x))return 0;seen.add(x);const kids=children[x]||[];return kids.length?1+Math.max(...kids.map(k=>walk(k.node.id))):1};return walk(id)};
const rootIds=[...new Set([...Object.keys(children),...Object.keys(aliases)])].filter(id=>byId[id]&&!isChild.has(id));
rootIds.sort((a,b)=>depth(b)-depth(a)||order.get(a)-order.get(b));
if(!rootIds.length)return "";
const treeLogo=n=>logoHTML(n.name,n.logo||"");
const aliasHTML=id=>(aliases[id]||[]).map(({node,edge})=>{
const name=`<span>${esc(node.name)}</span>`;
const head=node.url?`<a class="lib-tree-alias-name" href="${esc(node.url)}" target="_blank" rel="noopener">${treeLogo(node)}${name}</a>`:`<span class="lib-tree-alias-name">${treeLogo(node)}${name}</span>`;
return `<div class="lib-tree-alias"><span class="lib-tree-rel">Former name</span>${head}${edge.via?`<small>${esc(edge.via)}</small>`:""}</div>`}).join("");
const relText=(e,parent)=>e.planned?`Planned · ${parent.name}`:e.verified?`Depends on ${parent.name}`:`Unverified · ${parent.name}`;
const nodeCard=(n,edge,parent)=>{
const badge=n.planned?`<b class="badge planned">Planned</b>`:n.deprecated?`<b class="badge">Deprecated</b>`:"";
const title=`${treeLogo(n)}<span class="lib-tree-label">${esc(n.name)}</span>${badge}`;
const head=n.url?`<a href="${esc(n.url)}" target="_blank" rel="noopener">${title}</a>`:`<span class="lib-name">${title}</span>`;
const cap=edge?`<p class="lib-tree-cap"><span class="lib-tree-rel">${esc(relText(edge,parent))}</span>${edge.via?`<small>${esc(edge.via)}</small>`:""}</p>`:"";
return `<div class="lib-tree-node${n.planned?" planned":""}${n.deprecated?" deprecated":""}">${head}${aliasHTML(n.id)}${cap}</div>`};
const branch=(id,path)=>{
const kids=children[id]||[];
if(!kids.length)return "";
const ulCls=kids.every(k=>k.edge.planned)?"planned":kids.every(k=>!k.edge.verified&&!k.edge.planned)?"unverified":"verified";
return `<ul class="${ulCls}">${kids.map(k=>{const cyc=path.has(k.node.id);const next=new Set(path);next.add(k.node.id);const cls=k.edge.planned?"planned":k.edge.verified?"verified":"unverified";return `<li class="${cls}">${nodeCard(k.node,k.edge,byId[id])}${cyc?"":branch(k.node.id,next)}</li>`}).join("")}</ul>`};
const cols=rootIds.map(id=>{const n=byId[id];return `<div class="lib-tree-col"><ul class="lib-tree"><li class="lib-tree-root">${nodeCard(n,null,null)}${branch(id,new Set([id]))}</li></ul></div>`}).join("");
return `<div class="lib-forest" role="group" aria-label="Library dependency trees">${cols}</div>`
}
render();
if(location.hash)document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
