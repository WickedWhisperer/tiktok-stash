/* stash.js — TikTok Stash  */
'use strict';

/* ── CONFIG ────────────────────────────────── */
const DATA_URL        = '../archive/search/search_index.json';
const CACHE_NAME      = 'stash-v5';
const LS_INDEX        = 'stash-idx-v1';
const LS_RECENT       = 'stash-recent-v1';
const LS_MUTE         = 'stash-muted-v1';
const LS_MODE         = 'stash-mode-v1';
const GRID_BATCH      = 45;
const FEED_H          = window.innerHeight || 800; // card height for virtual scroll
const FEED_OVERSCAN   = 2;

/* ── SVGs ──────────────────────────────────── */
const I = {
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
  heart:  `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  comment:`<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>`,
  share:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>`,
  copy:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
  music:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
  mute:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
  unmute: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  back:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`,
  pause:  `<svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  play:   `<svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  up:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`,
  home:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
  grid:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zm0 10h8v8H3zm10-10h8v8h-8zm0 10h8v8h-8z"/></svg>`,
  export_:`<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
  plus:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="color:#000"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
  check:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#2eb86a"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
  warn_s: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:#ffcc00"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  dice:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="3" ry="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="#000"/><circle cx="15.5" cy="8.5" r="1.5" fill="#000"/><circle cx="12" cy="12" r="1.5" fill="#000"/><circle cx="8.5" cy="15.5" r="1.5" fill="#000"/><circle cx="15.5" cy="15.5" r="1.5" fill="#000"/></svg>`,
};

/* ── STATE ─────────────────────────────────── */
let all = [], filtered = [], mode = localStorage.getItem(LS_MODE) || 'grid';
let isMuted = localStorage.getItem(LS_MUTE) !== 'false';
let activeTag = '', gridCount = 0, gridObs = null, feedObs = null;
let activeVid = null, feedRaf = 0, searchTimer = null, hdrObs = null;
let feedStartIdx = 0; // first rendered card index in virtual feed

/* ── ELEMENTS ──────────────────────────────── */
const $  = id => document.getElementById(id);
const el = {
  header:     $('appHeader'),
  hdrTab:     { grid: $('tabGrid'), feed: $('tabFeed') },
  searchInp:  $('searchInp'),
  sClear:     $('sClear'),
  authorSel:  $('authorSel'),
  sortSel:    $('sortSel'),
  dateSel:    $('dateSel'),
  progRail:   $('progRail'),
  progFill:   $('progFill'),
  offBanner:  $('offBanner'),
  errBanner:  $('errBanner'),
  errMsg:     $('errMsg'),
  tagBar:     $('tagBar'),
  skelWrap:   $('skelWrap'),
  gridRoot:   $('gridRoot'),
  gCount:     $('gCount'),
  liveDot:    $('liveDot'),
  netLbl:     $('netLbl'),
  vGrid:      $('vGrid'),
  dashWrap:   $('dashWrap'),
  dashGrid:   $('dashGrid'),
  topTags:    $('topTags'),
  recentWrap: $('recentWrap'),
  recentRow:  $('recentRow'),
  feedRoot:   $('feedRoot'),
  feedTop:    $('feedTop'),
  feedItems:  $('feedItems'),
  feedBot:    $('feedBot'),
  fab:        $('fab'),
  navHome:    $('navHome'),
  navGrid:    $('navGrid'),
  navExport:  $('navExport'),
  sheetBg:    $('sheetBg'),
};

/* ── UTILS ─────────────────────────────────── */
function esc(v){ return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function ea(v){ return esc(v).replace(/`/g,'&#96;'); }
function fmt(n){
  const x=Number(n);
  if(!Number.isFinite(x)||x<0) return '—';
  if(x>=1e6) return (x/1e6).toFixed(1)+'M';
  if(x>=1e3) return (x/1e3).toFixed(1)+'K';
  return String(x);
}
function fmtDur(s){
  s=Math.round(Number(s)||0);
  if(!s) return '';
  const m=Math.floor(s/60),sec=s%60;
  return `${m}:${String(sec).padStart(2,'0')}`;
}
function fmtDate(iso){
  if(!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
  catch { return ''; }
}
function initials(n){ return String(n||'?').slice(0,2).toUpperCase(); }
function isUrl(v){ return typeof v==='string' && /^https?:\/\//i.test(v); }

function normList(v){
  if(!v) return [];
  if(Array.isArray(v)) return v.map(x=>{
    if(typeof x==='string') return x.trim();
    if(x&&typeof x==='object') return (x.name||x.title||x.text||x.username||x.id||'').toString().trim();
    return '';
  }).filter(Boolean);
  if(typeof v==='string') return v.trim()?[v.trim()]:[];
  return [];
}

function getStat(item, key){
  const d=item?.[key]; if(d!=null&&Number.isFinite(Number(d))) return Number(d);
  const s=item?.stats||{};
  const m={likes:['likes','diggCount','digg'],views:['views','playCount'],comments:['comments','commentCount'],shares:['shares','shareCount'],favorites:['favorites','collectCount'],reposts:['reposts','repostCount']};
  for(const k of (m[key]||[key])) if(s[k]!=null&&Number.isFinite(Number(s[k]))) return Number(s[k]);
  return 0;
}

function getPlayback(item){ return isUrl(item?.public_link_url)?item.public_link_url : isUrl(item?.video_storage_url)?item.video_storage_url : ''; }
function getPoster(item)  { return item?.video_cover_url||item?.video?.cover_url||item?.music_cover||item?.music?.cover_medium_url||''; }
function getAvatar(item)  { return item?.author_avatar||''; }
function getMusicUrl(item){ return item?.music_url||item?.music?.play_url||''; }
function getMusicCover(item){ return item?.music?.cover_medium_url||item?.music_cover||''; }
function getMusicTitle(item){ return item?.music_name||item?.music?.title||''; }
function getMusicAuthor(item){ return item?.music_author||item?.music?.author||''; }
function getAuthorUrl(item){ return item?.author_profile||`https://www.tiktok.com/@${encodeURIComponent(item?.author||'')}`; }
function getDuration(item){ return item?.video?.duration||item?.video_duration||0; }

function highlight(text, q){
  const s=esc(text||''); if(!q) return s;
  const e=esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  try { return s.replace(new RegExp(`(${e})`,'gi'),'<mark>$1</mark>'); } catch{ return s; }
}

function debounce(fn, ms){ return (...a)=>{ clearTimeout(searchTimer); searchTimer=setTimeout(()=>fn(...a),ms); }; }

/* ── CACHE ─────────────────────────────────── */
async function readCache(){
  if('caches' in window){ try{ const c=await caches.open(CACHE_NAME), r=await c.match(DATA_URL); if(r){ const d=await r.json(); if(Array.isArray(d)) return d; } }catch{} }
  try{ const r=localStorage.getItem(LS_INDEX); if(r){ const d=JSON.parse(r); if(Array.isArray(d)) return d; } }catch{}
  return null;
}
async function writeCache(items){
  try{ localStorage.setItem(LS_INDEX,JSON.stringify(items)); }catch{}
  if(!('caches' in window)) return;
  try{ const c=await caches.open(CACHE_NAME); await c.put(DATA_URL,new Response(JSON.stringify(items),{headers:{'Content-Type':'application/json'}})); }catch{}
}

/* ── RECENT SEARCHES ───────────────────────── */
function loadRecent(){ try{ return JSON.parse(localStorage.getItem(LS_RECENT)||'[]'); }catch{ return []; } }
function saveRecent(q){ q=String(q||'').trim(); if(!q) return; const l=loadRecent().filter(x=>x!==q); l.unshift(q); localStorage.setItem(LS_RECENT,JSON.stringify(l.slice(0,8))); renderRecent(); }
function renderRecent(){
  const l=loadRecent();
  if(!l.length){ el.recentWrap.classList.add('hidden'); return; }
  el.recentWrap.classList.remove('hidden');
  el.recentRow.innerHTML=l.map(q=>`<button class="r-chip" data-q="${ea(q)}">${I.search} ${esc(q)}</button>`).join('');
  el.recentRow.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{ el.searchInp.value=b.dataset.q; el.sClear.classList.add('show'); doRender(); }));
}

/* ── URL STATE ─────────────────────────────── */
function pushState(){
  const p=new URLSearchParams();
  const q=el.searchInp.value.trim();
  if(q) p.set('q',q);
  if(el.authorSel.value) p.set('a',el.authorSel.value);
  if(el.sortSel.value!=='likes') p.set('s',el.sortSel.value);
  if(el.dateSel.value) p.set('d',el.dateSel.value);
  if(activeTag) p.set('t',activeTag);
  const str=p.toString();
  history.replaceState(null,'',str?`#${str}`:location.pathname+location.search);
}
function restoreState(){
  const h=location.hash.replace(/^#/,''); if(!h) return;
  const p=new URLSearchParams(h);
  if(p.has('q')){ el.searchInp.value=p.get('q'); el.sClear.classList.add('show'); }
  if(p.has('a')) el.authorSel.value=p.get('a');
  if(p.has('s')) el.sortSel.value=p.get('s');
  if(p.has('d')) el.dateSel.value=p.get('d');
  if(p.has('t')) activeTag=p.get('t');
}

/* ── PROGRESS ──────────────────────────────── */
function prog(pct){
  if(pct>0){ el.progRail.classList.add('on'); el.progFill.style.width=pct+'%'; }
  else { el.progFill.style.width='100%'; setTimeout(()=>{ el.progRail.classList.remove('on'); el.progFill.style.width='0%'; },280); }
}

/* ── HEADER HEIGHT ─────────────────────────── */
function syncHeaderH(){
  const h=Math.ceil(el.header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--hh',h+'px');
}

/* ── AUTHORS ───────────────────────────────── */
function populateAuthors(){
  const prev=el.authorSel.value;
  const authors=[...new Set(all.map(x=>x.author).filter(Boolean))].sort();
  el.authorSel.innerHTML='<option value="">All authors</option>'+authors.map(a=>`<option value="${ea(a)}">@${esc(a)}</option>`).join('');
  if(authors.includes(prev)) el.authorSel.value=prev;
}

/* ── FILTER ─────────────────────────────────── */
function applyFilters(){
  const q=el.searchInp.value.trim().toLowerCase();
  const a=el.authorSel.value, s=el.sortSel.value;
  const days=parseInt(el.dateSel.value,10)||0;
  let items=all.slice();
  if(q) items=items.filter(x=>(x.search_text||'').includes(q));
  if(a) items=items.filter(x=>x.author===a);
  if(activeTag){ const t=activeTag.toLowerCase().replace(/^#/,''); items=items.filter(x=>normList(x.hashtags).some(h=>h.toLowerCase().replace(/^#/,'')===t)); }
  if(days){ const cut=Date.now()-days*86400000; items=items.filter(x=>{ const ts=new Date(x.created_at||0).getTime(); return Number.isFinite(ts)&&ts>=cut; }); }
  items.sort((a,b)=>{
    if(s==='date_desc') return new Date(b.created_at||0)-new Date(a.created_at||0);
    if(s==='date_asc')  return new Date(a.created_at||0)-new Date(b.created_at||0);
    return getStat(b,s)-getStat(a,s);
  });
  filtered=items;
}

function hasFilters(){ return el.searchInp.value.trim()||el.authorSel.value||el.dateSel.value||activeTag; }

/* ── TAG BAR ───────────────────────────────── */
function renderTagBar(){
  if(!activeTag){ el.tagBar.innerHTML=''; return; }
  const t=activeTag.replace(/^#/,'');
  el.tagBar.innerHTML=`<button class="a-tag" id="rmTag">#${esc(t)} ×</button>`;
  $('rmTag').onclick=()=>{ activeTag=''; renderTagBar(); doRender(); };
}

/* ── ANALYTICS DASHBOARD ───────────────────── */
function renderDash(items){
  if(!items.length){ el.dashWrap.classList.add('hidden'); return; }
  const authors=new Set(items.map(x=>x.author).filter(Boolean));
  let likes=0,views=0,faves=0,pub=0;
  const tagMap=new Map();
  items.forEach(x=>{
    likes+=getStat(x,'likes'); views+=getStat(x,'views'); faves+=getStat(x,'favorites');
    if(isUrl(x.public_link_url)) pub++;
    normList(x.hashtags).forEach(h=>{ h=h.replace(/^#/,''); tagMap.set(h,(tagMap.get(h)||0)+1); });
  });
  el.dashGrid.innerHTML=[
    dash(fmt(items.length),'Videos'),
    dash(authors.size,'Authors'),
    dash(fmt(likes),'Likes'),
    dash(fmt(views),'Views'),
    dash(fmt(faves),'Saved'),
    dash(fmt(pub),'Playable'),
  ].join('');
  const topTags=[...tagMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
  el.topTags.innerHTML=topTags.map(([t,n])=>`<button class="top-tag" data-tag="${ea(t)}">#${esc(t)}<span class="top-tag-n">${n}</span></button>`).join('');
  el.topTags.querySelectorAll('[data-tag]').forEach(b=>b.addEventListener('click',()=>{ activeTag=b.dataset.tag; renderTagBar(); doRender(); }));
  el.dashWrap.classList.remove('hidden');
}
function dash(v,l){ return `<div class="dash-m"><div class="dash-v">${esc(String(v))}</div><div class="dash-l">${esc(l)}</div></div>`; }

/* ── GRID CARD ─────────────────────────────── */
function buildGridCard(item){
  const poster=getPoster(item), dur=getDuration(item), likes=getStat(item,'likes');
  const hasLink=isUrl(item.public_link_url)||isUrl(item.video_storage_url);
  const arc = hasLink ? `<div class="g-arc ok">${I.check}</div>` : item.download_status==='failed'?`<div class="g-arc bad">${I.warn_s}</div>`:'';
  return `<div class="g-card" data-id="${ea(item.id||'')}">
    <div class="g-thumb" ${poster?`style="background-image:url('${ea(poster)}')"`:''} loading="lazy"></div>
    <div class="g-scrim"></div>
    ${dur?`<div class="g-dur">${esc(fmtDur(dur))}</div>`:''}
    ${arc}
    <div class="g-info">
      <div class="g-stat">${I.heart} ${fmt(likes)}</div>
      <div class="g-cap">${highlight(item.caption||'', el.searchInp.value.trim())}</div>
    </div>
  </div>`;
}

/* ── GRID INFINITE SCROLL ──────────────────── */
function renderGridBatch(){
  if(mode!=='grid') return;
  const slice=filtered.slice(gridCount,gridCount+GRID_BATCH);
  if(!slice.length) return;
  el.vGrid.insertAdjacentHTML('beforeend',slice.map(buildGridCard).join(''));
  gridCount+=slice.length;
  $('gSentinel')?.remove();
  if(gridCount<filtered.length){
    el.vGrid.insertAdjacentHTML('beforeend','<div id="gSentinel" style="height:1px"></div>');
    watchSentinel();
  }
  // wire card clicks
  el.vGrid.querySelectorAll('.g-card:not([data-w])').forEach(c=>{
    c.setAttribute('data-w','1');
    c.addEventListener('click',()=>{ const idx=filtered.findIndex(x=>String(x.id||'')===c.dataset.id); if(idx>=0) openFeed(idx); });
  });
}

function watchSentinel(){
  if(gridObs){ gridObs.disconnect(); gridObs=null; }
  const s=$('gSentinel'); if(!s) return;
  gridObs=new IntersectionObserver(es=>{ if(es[0].isIntersecting) renderGridBatch(); },{rootMargin:'600px 0px'});
  gridObs.observe(s);
}

/* ── FEED VIRTUAL WINDOW ───────────────────── */
function buildFeedCard(item, idx){
  const pb=getPlayback(item), poster=getPoster(item), av=getAvatar(item);
  const musicCover=getMusicCover(item)||poster, musicTitle=getMusicTitle(item), musicAuth=getMusicAuthor(item);
  const tags=normList(item.hashtags).slice(0,6);
  const q=el.searchInp.value.trim();
  const hasLink=isUrl(item.public_link_url);
  const arcCls=hasLink?'ok':item.download_status==='failed'?'warn':'none';
  const arcTxt=hasLink?'Archived':item.download_status==='failed'?'Failed':'Not stored';

  return `<div class="f-card" data-id="${ea(item.id||'')}" data-fidx="${idx}">
    ${poster?`<div class="f-poster" style="background-image:url('${ea(poster)}')"></div>`:''}
    ${pb?`<video class="f-video" preload="none" playsinline loop ${isMuted?'muted':''} poster="${ea(poster)}" data-src="${ea(pb)}"></video>`:''}
    <div class="f-grad"></div>
    <div class="f-tap"></div>
    <div class="f-pause-ico"><svg viewBox="0 0 24 24" fill="rgba(255,255,255,.75)" width="64" height="64"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg></div>

    <div class="f-top-row">
      <button class="f-back-btn" aria-label="Back to grid">←</button>
      <button class="f-mute-btn" aria-label="Toggle mute">${isMuted?I.mute:I.unmute}</button>
    </div>

    <div class="f-actions">
      <button class="f-act" aria-label="Like">
        <div class="f-act-ico">${I.heart}</div>
        <span class="f-act-lbl">${fmt(getStat(item,'likes'))}</span>
      </button>
      <button class="f-act" aria-label="Comments">
        <div class="f-act-ico">${I.comment}</div>
        <span class="f-act-lbl">${fmt(getStat(item,'comments'))}</span>
      </button>
      <button class="f-act" aria-label="Share">
        <div class="f-act-ico">${I.share}</div>
        <span class="f-act-lbl">${fmt(getStat(item,'shares'))}</span>
      </button>
      ${pb?`<button class="f-act copy-lnk" data-url="${ea(pb)}" aria-label="Copy link">
        <div class="f-act-ico">${I.copy}</div>
        <span class="f-act-lbl">Copy</span>
      </button>`:''}
      <div class="f-disc">
        <div class="f-disc-inner">
          ${musicCover?`<img src="${ea(musicCover)}" alt="music" loading="lazy">`:`${I.music}`}
        </div>
      </div>
    </div>

    <div class="f-info">
      <div class="f-auth-row">
        <a class="f-ava" href="${ea(getAuthorUrl(item))}" target="_blank" rel="noopener">
          ${av?`<img src="${ea(av)}" alt="${ea(item.author||'')}" loading="lazy">`:`${esc(initials(item.author))}`}
        </a>
        <div>
          <div class="f-auth-name">@${esc(item.author||'unknown')}</div>
          <div class="f-auth-date">${esc(fmtDate(item.created_at))}</div>
        </div>
      </div>
      ${item.caption?`<div class="f-cap" data-full="${ea(item.caption)}">${esc(item.caption.slice(0,110))}${item.caption.length>110?'<span class="f-more">… more</span>':''}</div>`:''}
      ${tags.length?`<div class="f-tags">${tags.map(t=>`<button class="f-tag" data-tag="${ea(t.replace(/^#/,''))}">#${esc(t.replace(/^#/,''))}</button>`).join('')}</div>`:''}
      ${musicTitle?`<div class="f-music">${I.music}<span class="f-music-txt">${esc(musicTitle)}${musicAuth?' · '+esc(musicAuth):''}</span></div>`:''}
      <div class="f-arc-pill ${arcCls}">${arcCls==='ok'?I.check:arcCls==='warn'?I.warn_s:''} ${arcTxt}</div>
    </div>
  </div>`;
}

function renderFeedWindow(){
  if(mode!=='feed') return;
  const feedEl=el.feedRoot;
  const scrollTop=feedEl.scrollTop;
  const viewH=feedEl.clientHeight||window.innerHeight;
  const cardH=viewH; // each card = 100dvh = viewH
  const start=Math.max(0,Math.floor(scrollTop/cardH)-FEED_OVERSCAN);
  const vis=Math.ceil(viewH/cardH)+FEED_OVERSCAN*2;
  const end=Math.min(filtered.length,start+vis);

  feedStartIdx=start;
  el.feedTop.style.height=`${start*cardH}px`;
  el.feedBot.style.height=`${Math.max(0,filtered.length-end)*cardH}px`;
  el.feedItems.innerHTML=filtered.slice(start,end).map((item,i)=>buildFeedCard(item,start+i)).join('');

  attachFeedObs(feedEl);
  wireFeedCards();
}

function scheduleFeed(){
  if(feedRaf) return;
  feedRaf=requestAnimationFrame(()=>{ feedRaf=0; renderFeedWindow(); });
}

/* ── FEED INTERSECTION OBSERVER (THE KEY FIX) ─
   root MUST be the scrolling container, not null  */
function attachFeedObs(feedEl){
  if(feedObs){ feedObs.disconnect(); feedObs=null; }
  const videos=[...el.feedItems.querySelectorAll('.f-video')];
  if(!videos.length) return;

  feedObs=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const vid=entry.target;
      const src=vid.getAttribute('data-src');

      /* Lazy-load: set src when card enters the overscan zone */
      if(entry.isIntersecting && src){
        vid.removeAttribute('data-src');
        vid.src=src;
        vid.load();
      }

      /* Play/pause: 55%+ visibility in the scroller */
      if(entry.intersectionRatio>=0.55){
        if(activeVid && activeVid!==vid){ try{ activeVid.pause(); }catch{} stopDisc(activeVid); }
        activeVid=vid;
        vid.muted=isMuted;
        vid.play().catch(()=>{});
        spinDisc(vid,true);
      } else if(entry.intersectionRatio<0.3){
        try{ vid.pause(); }catch{}
        spinDisc(vid,false);
      }
    });
  },{
    root: feedEl,                   // ← THE FIX: observe within the feed scroller
    threshold:[0.1,0.3,0.55,0.85],
    rootMargin:'50% 0px',           // pre-load src 50% outside viewport
  });

  videos.forEach(vid=>{
    vid.addEventListener('error',()=>{ vid.style.display='none'; },{ once:true });
    feedObs.observe(vid);
  });
}

function spinDisc(vid,on){
  const disc=vid.closest('.f-card')?.querySelector('.f-disc');
  if(disc) disc.classList.toggle('on',on);
}
function stopDisc(vid){ spinDisc(vid,false); }

/* ── FEED CARD EVENTS ──────────────────────── */
function wireFeedCards(){
  // tap-to-pause
  el.feedItems.querySelectorAll('.f-tap').forEach(area=>{
    area.addEventListener('click',()=>{
      const vid=area.closest('.f-card')?.querySelector('.f-video'); if(!vid) return;
      const ico=area.closest('.f-card')?.querySelector('.f-pause-ico');
      if(vid.paused){ vid.play().catch(()=>{}); ico?.classList.remove('show'); }
      else { vid.pause(); ico?.classList.add('show'); }
    });
  });

  // back button
  el.feedItems.querySelectorAll('.f-back-btn').forEach(b=>b.addEventListener('click',()=>setMode('grid')));

  // mute toggle
  el.feedItems.querySelectorAll('.f-mute-btn').forEach(b=>b.addEventListener('click',()=>toggleMute()));

  // hashtag filter
  el.feedItems.querySelectorAll('.f-tag').forEach(b=>b.addEventListener('click',()=>{
    const t=b.dataset.tag;
    activeTag=activeTag===t?'':t;
    renderTagBar();
    // stay in feed, just update filter state for next grid visit
  }));

  // caption expand
  el.feedItems.querySelectorAll('.f-more').forEach(span=>span.addEventListener('click',e=>{
    e.stopPropagation();
    const cap=span.closest('.f-cap'); if(!cap) return;
    cap.textContent=cap.dataset.full; cap.classList.add('open');
  }));

  // copy link
  el.feedItems.querySelectorAll('.copy-lnk').forEach(b=>b.addEventListener('click',async e=>{
    e.stopPropagation();
    await copyText(b.dataset.url,b.querySelector('.f-act-ico'));
  }));
}

function toggleMute(){
  isMuted=!isMuted;
  localStorage.setItem(LS_MUTE,isMuted);
  document.querySelectorAll('.f-video').forEach(v=>{ v.muted=isMuted; });
  document.querySelectorAll('.f-mute-btn').forEach(b=>{ b.innerHTML=isMuted?I.mute:I.unmute; });
}

/* ── OPEN FEED AT INDEX ─────────────────────── */
function openFeed(idx){
  setMode('feed',true);
  requestAnimationFrame(()=>{
    const cardH=el.feedRoot.clientHeight||window.innerHeight;
    el.feedRoot.scrollTop=idx*cardH;
    renderFeedWindow();
  });
}

/* ── COPY ──────────────────────────────────── */
async function copyText(text,iconEl){
  if(!text) return;
  try{ await navigator.clipboard.writeText(text); }
  catch{ const t=document.createElement('textarea'); t.value=text; t.style.cssText='position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch{} document.body.removeChild(t); }
  if(iconEl){ const p=iconEl.innerHTML; iconEl.innerHTML='✓'; iconEl.style.color='#2eb86a'; setTimeout(()=>{ iconEl.innerHTML=p; iconEl.style.color=''; },1200); }
}

/* ── EXPORT SHEET ──────────────────────────── */
function showExport(){
  el.sheetBg.classList.remove('hidden');
}
function hideExport(){
  el.sheetBg.classList.add('hidden');
}

function exportJSON(){
  const data=JSON.stringify(filtered,null,2);
  const a=document.createElement('a');
  a.href='data:application/json,'+encodeURIComponent(data);
  a.download='stash-export.json'; a.click();
}

function exportCSV(){
  const cols=['id','author','caption','created_at','url','likes','views','comments','shares','favorites'];
  const rows=[cols.join(','),...filtered.map(x=>[x.id,x.author,`"${(x.caption||'').replace(/"/g,'""')}"`,x.created_at,x.url,getStat(x,'likes'),getStat(x,'views'),getStat(x,'comments'),getStat(x,'shares'),getStat(x,'favorites')].join(','))];
  const a=document.createElement('a');
  a.href='data:text/csv,'+encodeURIComponent(rows.join('\n'));
  a.download='stash-export.csv'; a.click();
}

/* ── MODE SWITCH ───────────────────────────── */
function setMode(m, skipRender=false){
  mode=m==='feed'?'feed':'grid';
  localStorage.setItem(LS_MODE,mode);
  el.hdrTab.grid.classList.toggle('on',mode==='grid');
  el.hdrTab.feed.classList.toggle('on',mode==='feed');
  el.navGrid.classList.toggle('on',mode==='grid');
  el.navHome.classList.toggle('on',mode==='feed');

  if(mode==='feed'){
    el.feedRoot.classList.remove('hidden');
    el.gridRoot.classList.add('hidden');
    el.header.classList.add('slide-up');  // ← hide header completely in feed
    document.body.style.overflow='hidden';
  } else {
    el.feedRoot.classList.add('hidden');
    el.gridRoot.classList.remove('hidden');
    el.header.classList.remove('slide-up');
    document.body.style.overflow='';
    if(activeVid){ try{activeVid.pause();}catch{} stopDisc(activeVid); activeVid=null; }
    if(feedObs){ feedObs.disconnect(); feedObs=null; }
  }
  if(!skipRender) doRender();
}

/* ── SURPRISE ME ───────────────────────────── */
function surprise(){
  if(!filtered.length) return;
  openFeed(Math.floor(Math.random()*filtered.length));
}

/* ── RENDER ORCHESTRATION ──────────────────── */
function resetGrid(){
  gridCount=0;
  if(gridObs){ gridObs.disconnect(); gridObs=null; }
  el.vGrid.innerHTML='';
}

function doRender(){
  applyFilters();
  renderTagBar();
  pushState();

  const n=filtered.length, tot=all.length;
  el.gCount.textContent=n===tot?`${fmt(n)} videos`:`${fmt(n)} of ${fmt(tot)}`;

  renderDash(filtered);
  renderRecent();

  if(mode==='grid'){
    resetGrid();
    if(!n){
      el.vGrid.innerHTML=`<div class="empty" style="grid-column:1/-1"><h2>No results</h2><p>Try clearing filters.</p></div>`;
    } else {
      renderGridBatch();
    }
  } else {
    renderFeedWindow();
  }
}

const debouncedRender=debounce(doRender,200);

/* ── DATA LOADING ──────────────────────────── */
async function loadData(force=false){
  prog(20);
  el.errBanner.classList.add('hidden');
  el.offBanner.classList.add('hidden');
  el.skelWrap.classList.remove('hidden');
  el.gridRoot.classList.add('hidden');
  el.feedRoot.classList.add('hidden');

  const opts=force?{cache:'no-store'}:{};
  try{
    prog(55);
    const r=await fetch(DATA_URL,opts);
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const data=await r.json();
    if(!Array.isArray(data)) throw new Error('Not an array');
    all=data;
    await writeCache(data);
    el.liveDot.className='live-dot live';
    el.netLbl.textContent='Live';
    el.offBanner.classList.add('hidden');
  } catch(err){
    const cached=await readCache();
    if(cached&&cached.length){
      all=cached;
      el.liveDot.className='live-dot cache';
      el.netLbl.textContent='Cached';
      el.offBanner.classList.remove('hidden');
    } else {
      el.errMsg.innerHTML=`<strong>Could not load archive.</strong> ${esc(err.message)}<br>Check that <code>archive/search/search_index.json</code> exists and GitHub Pages is serving the repo root.`;
      el.errBanner.classList.remove('hidden');
      el.skelWrap.classList.add('hidden');
      prog(0); return;
    }
  }

  prog(90);
  populateAuthors();
  restoreState();
  renderRecent();

  el.skelWrap.classList.add('hidden');
  if(mode==='feed'){ el.feedRoot.classList.remove('hidden'); el.header.classList.add('slide-up'); }
  else              { el.gridRoot.classList.remove('hidden'); }

  doRender();
  prog(0);
}

/* ── EVENTS ────────────────────────────────── */
function wire(){
  // Search
  el.searchInp.addEventListener('input',()=>{ el.sClear.classList.toggle('show',!!el.searchInp.value); debouncedRender(); });
  el.searchInp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ saveRecent(el.searchInp.value); doRender(); } if(e.key==='Escape'){ el.searchInp.value=''; el.sClear.classList.remove('show'); doRender(); } });
  el.sClear.addEventListener('click',()=>{ el.searchInp.value=''; el.sClear.classList.remove('show'); doRender(); el.searchInp.focus(); });

  el.authorSel.addEventListener('change',doRender);
  el.sortSel.addEventListener('change',doRender);
  el.dateSel.addEventListener('change',doRender);

  // Mode tabs
  el.hdrTab.grid.addEventListener('click',()=>setMode('grid'));
  el.hdrTab.feed.addEventListener('click',()=>setMode('feed'));

  // Nav bar
  el.navHome.addEventListener('click',()=>setMode('feed'));
  el.navGrid.addEventListener('click',()=>setMode('grid'));
  el.navExport.addEventListener('click',showExport);

  // Surprise Me — the '+' nav button opens feed at random
  $('navPlus').addEventListener('click',surprise);

  // FAB (back to top)
  el.fab.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

  // Feed scroll → virtual render
  el.feedRoot.addEventListener('scroll',scheduleFeed,{passive:true});

  // Grid scroll → FAB
  window.addEventListener('scroll',()=>{ el.fab.classList.toggle('hidden',window.scrollY<500); },{passive:true});

  // Keyboard shortcuts
  document.addEventListener('keydown',e=>{
    if(e.key==='/'&&document.activeElement!==el.searchInp){ e.preventDefault(); el.searchInp.focus(); el.searchInp.select(); }
    if(e.key==='Escape'&&mode==='feed') setMode('grid');
  });

  // Online/Offline
  window.addEventListener('online', ()=>{ el.offBanner.classList.add('hidden'); el.liveDot.className='live-dot live'; el.netLbl.textContent='Online'; });
  window.addEventListener('offline',()=>{ el.offBanner.classList.remove('hidden'); el.liveDot.className='live-dot off'; el.netLbl.textContent='Offline'; });

  // Header resize → sync CSS var
  if('ResizeObserver' in window){
    hdrObs=new ResizeObserver(syncHeaderH);
    hdrObs.observe(el.header);
  } else window.addEventListener('resize',syncHeaderH,{passive:true});

  // Reload
  $('reloadBtn').addEventListener('click',()=>loadData(true));

  // Banner dismissal
  $('offX').addEventListener('click',()=>el.offBanner.classList.add('hidden'));
  $('errX').addEventListener('click',()=>el.errBanner.classList.add('hidden'));

  // Export sheet
  $('sheetClose').addEventListener('click',hideExport);
  el.sheetBg.addEventListener('click',e=>{ if(e.target===el.sheetBg) hideExport(); });
  $('exportJSON').addEventListener('click',()=>{ exportJSON(); hideExport(); });
  $('exportCSV').addEventListener('click', ()=>{ exportCSV();  hideExport(); });
  $('copyLinks').addEventListener('click',async()=>{
    const links=filtered.map(x=>getPlayback(x)||x.url||'').filter(Boolean).join('\n');
    await copyText(links,$('copyLinks'));
    hideExport();
  });
}

/* ── SERVICE WORKER ─────────────────────────── */
function regSW(){ if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{}); }

/* ── INIT ──────────────────────────────────── */
wire();
syncHeaderH();
regSW();
loadData(false);
