/**
 * TIKTOK STASH — stash.js
 * Ground-up rewrite. No legacy code.
 *
 * Feed architecture:
 *  - #view-feed IS the scroll container (not a nested div)
 *  - Virtual window: only 5-7 cards in DOM at once
 *  - IntersectionObserver root = #view-feed (the scroller)
 *  - Video lifecycle: IDLE → SRC_LOADED → PLAYING → PAUSED
 *  - Progress bar driven by requestAnimationFrame
 */
'use strict';

/* ── CONSTANTS ────────────────────────────────────── */
const DATA_URL   = '../archive/search/search_index.json';
const SW_URL     = './sw.js';
const CACHE_NAME = 'stash-v6';
const LS_IDX     = 'stash.index.v1';
const LS_RECENT  = 'stash.recent.v1';
const LS_MUTE    = 'stash.mute.v1';
const LS_MODE    = 'stash.mode.v1';
const LS_ANOPEN  = 'stash.analytics.open.v1';

const GRID_BATCH    = 48;    // cards per infinite-scroll chunk
const FEED_OVERSCAN = 2;     // cards to render above/below visible
const FEED_CARD_H   = () => window.innerHeight; // each card = 100dvh

/* ── SVG ICON LIBRARY (inline, no system emoji) ───── */
const SVG = {
  search:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
  heart:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  comment:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>`,
  share:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>`,
  copy:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
  music:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
  mute:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
  unmute:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  back:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`,
  pause:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  play:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  check:    `<svg viewBox="0 0 24 24" fill="currentColor" style="color:#20d080"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
  warn_tri: `<svg viewBox="0 0 24 24" fill="currentColor" style="color:#ffb800"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  tiktok:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.87a8.27 8.27 0 004.84 1.55V7A4.85 4.85 0 0119.59 6.69z"/></svg>`,
  export:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
  shuffle:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>`,
  up:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`,
  grid:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zm0 10h8v8H3zm10-10h8v8h-8zm0 10h8v8h-8z"/></svg>`,
  home:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
  plus_ico: `<svg viewBox="0 0 24 24" fill="#000"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
  down_icon:`<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
  json_ico: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>`,
  csv_ico:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 2H8.6L7 3.6V10h2V4h5v4h4v12H7v-2H5v4h14V5.5L15.5 2zM5 11.5l-2.5 3 2.5 3v-2H9v-2H5v-2zm4.5 4l2.5-3-2.5-3v2H6v2h3.5v2z"/></svg>`,
  link_ico: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`,
};

function icon(name, size = 22) {
  return `<svg width="${size}" height="${size}" style="display:block">${SVG[name].match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] || ''}</svg>`;
}

/* ── STATE ───────────────────────────────────────── */
let all = [], filtered = [];
let mode = localStorage.getItem(LS_MODE) || 'grid';
let isMuted = localStorage.getItem(LS_MUTE) !== 'false';
let activeTag = '';
let gridCount = 0;
let gridObs = null;        // IntersectionObserver for grid sentinel
let feedObs = null;        // IntersectionObserver for feed videos
let activeVid = null;      // currently playing <video>
let activeVidIdx = -1;     // index in filtered[] of active video
let progRaf = 0;           // rAF handle for progress bar
let feedVirtStart = 0;     // first rendered index in virtual feed
let searchDebTimer = null;
let toastTimer = null;
let lastScrollY = 0;
let headerHidden = false;

/* ── DOM refs ─────────────────────────────────────── */
const $ = id => document.getElementById(id);
const Q = (sel, ctx = document) => ctx.querySelector(sel);
const QA = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const D = {
  viewGrid:   $('view-grid'),
  viewFeed:   $('view-feed'),
  gh:         $('gh'),               // grid header
  searchInp:  $('search-inp'),
  searchClear:$('search-clear'),
  filterRow:  $('filter-row'),
  authorSel:  $('author-sel'),
  sortSel:    $('sort-sel'),
  dateSel:    $('date-sel'),
  tagArea:    $('tag-area'),
  gStatus:    $('g-status'),
  gCount:     $('g-count'),
  netDot:     $('net-dot'),
  netLbl:     $('net-lbl'),
  analytics:  $('analytics'),
  anBody:     $('an-body'),
  anChevron:  $('an-chevron'),
  anMetrics:  $('an-metrics'),
  topTags:    $('top-tags'),
  recentSect: $('recent-sect'),
  recentChips:$('recent-chips'),
  skelWrap:   $('skel-wrap'),
  videoGrid:  $('video-grid'),
  feedItems:  $('feed-items'),
  feedSpTop:  $('feed-sp-top'),
  feedSpBot:  $('feed-sp-bot'),
  offBanner:  $('off-banner'),
  errBanner:  $('err-banner'),
  errMsg:     $('err-msg'),
  progress:   $('progress'),
  toast:      $('toast'),
  btnTop:     $('btn-top'),
  exportSheet:$('export-sheet'),
  navFeed:    $('nav-feed'),
  navBrowse:  $('nav-browse'),
  navShuffle: $('nav-shuffle'),
  navExport:  $('nav-export'),
  gridScroll: $('grid-scroll'),
};

/* ── UTILS ───────────────────────────────────────── */
function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function ea(v) { return esc(v).replace(/`/g,'&#96;'); }

function fmt(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return '—';
  if (x >= 1e6) return (x/1e6).toFixed(1).replace(/\.0$/,'') + 'M';
  if (x >= 1e3) return (x/1e3).toFixed(1).replace(/\.0$/,'') + 'K';
  return String(x);
}

function fmtDur(s) {
  s = Math.round(Number(s) || 0);
  if (!s) return '';
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
  catch { return ''; }
}

function initials(n) { return String(n||'?').slice(0,2).toUpperCase(); }
function isUrl(v) { return typeof v==='string' && /^https?:\/\//i.test(v); }

function normList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(x => {
    if (typeof x === 'string') return x.trim();
    if (x && typeof x === 'object') return (x.name||x.title||x.text||x.username||x.id||'').toString().trim();
    return '';
  }).filter(Boolean);
  if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
  return [];
}

function hl(text, q) {
  const safe = esc(text||'');
  if (!q) return safe;
  const eq = esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  try { return safe.replace(new RegExp(`(${eq})`,'gi'),'<mark>$1</mark>'); }
  catch { return safe; }
}

function getStat(item, key) {
  const d = item?.[key]; if (d!=null&&Number.isFinite(Number(d))) return Number(d);
  const s = item?.stats || {};
  const map = {
    likes:['likes','diggCount','digg'],
    views:['views','playCount'],
    comments:['comments','commentCount'],
    shares:['shares','shareCount'],
    favorites:['favorites','collectCount'],
    reposts:['reposts','repostCount'],
  };
  for (const k of (map[key]||[key])) if (s[k]!=null&&Number.isFinite(Number(s[k]))) return Number(s[k]);
  return 0;
}

// Data accessors — handle both enriched_archive and search_index schemas
function getPlayback(it)    { return isUrl(it?.public_link_url)?it.public_link_url:isUrl(it?.video_storage_url)?it.video_storage_url:''; }
function getPoster(it)      { return it?.video_cover_url||it?.video?.cover_url||it?.music_cover||it?.music?.cover_medium_url||''; }
function getAvatar(it)      { return it?.author_avatar||''; }
function getAuthorUrl(it)   { return it?.author_profile||`https://www.tiktok.com/@${encodeURIComponent(it?.author||'')}`; }
function getDuration(it)    { return it?.video?.duration||it?.video_duration||0; }
function getMusicTitle(it)  { return it?.music_name||it?.music?.title||''; }
function getMusicAuthor(it) { return it?.music_author||it?.music?.author||''; }
function getMusicCover(it)  { return it?.music?.cover_medium_url||it?.music_cover||getPoster(it); }
function getTags(it)        { return normList(it?.hashtags); }

/* ── DEBOUNCE ─────────────────────────────────────── */
function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(searchDebTimer);
    searchDebTimer = setTimeout(() => fn(...args), ms);
  };
}

/* ── TOAST ───────────────────────────────────────── */
function toast(msg, dur = 2000) {
  D.toast.textContent = msg;
  D.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => D.toast.classList.remove('show'), dur);
}

/* ── PROGRESS BAR ────────────────────────────────── */
function setProgress(pct) {
  if (pct <= 0) {
    D.progress.style.transform = 'scaleX(1)';
    D.progress.style.transition = 'transform .2s';
    setTimeout(() => {
      D.progress.classList.remove('active');
      D.progress.style.transform = 'scaleX(0)';
      D.progress.style.transition = 'none';
    }, 220);
  } else {
    D.progress.classList.add('active');
    D.progress.style.transition = 'transform .3s';
    D.progress.style.transform = `scaleX(${pct/100})`;
  }
}

/* ── CACHE ───────────────────────────────────────── */
async function readCache() {
  if ('caches' in window) {
    try {
      const c = await caches.open(CACHE_NAME);
      const r = await c.match(DATA_URL);
      if (r) { const d = await r.json(); if (Array.isArray(d)) return d; }
    } catch {}
  }
  try {
    const raw = localStorage.getItem(LS_IDX);
    if (raw) { const d = JSON.parse(raw); if (Array.isArray(d)) return d; }
  } catch {}
  return null;
}

async function writeCache(items) {
  try { localStorage.setItem(LS_IDX, JSON.stringify(items)); } catch {}
  if (!('caches' in window)) return;
  try {
    const c = await caches.open(CACHE_NAME);
    await c.put(DATA_URL, new Response(JSON.stringify(items), {headers:{'Content-Type':'application/json'}}));
  } catch {}
}

/* ── RECENT SEARCHES ──────────────────────────────── */
function loadRecent() {
  try { return JSON.parse(localStorage.getItem(LS_RECENT)||'[]'); } catch { return []; }
}

function saveRecent(q) {
  q = String(q||'').trim(); if (!q) return;
  const list = loadRecent().filter(x => x !== q);
  list.unshift(q);
  localStorage.setItem(LS_RECENT, JSON.stringify(list.slice(0,8)));
  renderRecent();
}

function renderRecent() {
  const list = loadRecent();
  if (!list.length) { D.recentSect.classList.add('u-hide'); return; }
  D.recentSect.classList.remove('u-hide');
  D.recentChips.innerHTML = list.map(q =>
    `<button class="rs-chip" data-q="${ea(q)}">${icon('search',13)} ${esc(q)}</button>`
  ).join('');
  QA('[data-q]', D.recentChips).forEach(b => b.onclick = () => {
    D.searchInp.value = b.dataset.q;
    D.searchClear.classList.add('vis');
    doRender();
  });
}

/* ── URL STATE ───────────────────────────────────── */
function pushState() {
  const p = new URLSearchParams();
  const q = D.searchInp.value.trim();
  if (q)               p.set('q',q);
  if (D.authorSel.value)  p.set('a',D.authorSel.value);
  if (D.sortSel.value !== 'likes') p.set('s',D.sortSel.value);
  if (D.dateSel.value) p.set('d',D.dateSel.value);
  if (activeTag)       p.set('t',activeTag);
  p.set('m', mode);
  const str = p.toString();
  history.replaceState(null,'',str ? `#${str}` : location.pathname+location.search);
}

function restoreState() {
  const h = location.hash.replace(/^#/,''); if (!h) return;
  const p = new URLSearchParams(h);
  if (p.has('q')) { D.searchInp.value = p.get('q'); D.searchClear.classList.add('vis'); }
  if (p.has('a')) D.authorSel.value = p.get('a');
  if (p.has('s')) D.sortSel.value = p.get('s');
  if (p.has('d')) D.dateSel.value = p.get('d');
  if (p.has('t')) activeTag = p.get('t');
  if (p.has('m')) mode = p.get('m') === 'feed' ? 'feed' : 'grid';
}

/* ── AUTHORS ─────────────────────────────────────── */
function populateAuthors() {
  const prev = D.authorSel.value;
  const authors = [...new Set(all.map(x=>x.author).filter(Boolean))].sort();
  D.authorSel.innerHTML = '<option value="">All authors</option>' +
    authors.map(a => `<option value="${ea(a)}">@${esc(a)}</option>`).join('');
  if (authors.includes(prev)) D.authorSel.value = prev;
}

/* ── FILTER LOGIC ────────────────────────────────── */
function applyFilters() {
  const q = D.searchInp.value.trim().toLowerCase();
  const a = D.authorSel.value;
  const s = D.sortSel.value;
  const days = parseInt(D.dateSel.value,10)||0;

  let items = all.slice();
  if (q) items = items.filter(x => (x.search_text||'').includes(q));
  if (a) items = items.filter(x => x.author === a);
  if (activeTag) {
    const t = activeTag.toLowerCase().replace(/^#/,'');
    items = items.filter(x => getTags(x).some(h => h.toLowerCase().replace(/^#/,'') === t));
  }
  if (days) {
    const cut = Date.now() - days*86400000;
    items = items.filter(x => {
      const ts = new Date(x.created_at||0).getTime();
      return Number.isFinite(ts) && ts >= cut;
    });
  }
  items.sort((a,b) => {
    if (s==='date_desc') return new Date(b.created_at||0)-new Date(a.created_at||0);
    if (s==='date_asc')  return new Date(a.created_at||0)-new Date(b.created_at||0);
    return getStat(b,s)-getStat(a,s);
  });
  filtered = items;
}

/* ── TAG BAR ─────────────────────────────────────── */
function renderTagBar() {
  if (!activeTag) { D.tagArea.innerHTML = ''; return; }
  const t = activeTag.replace(/^#/,'');
  D.tagArea.innerHTML = `<button class="active-tag-pill" id="rm-tag">#${esc(t)} ×</button>`;
  $('rm-tag').onclick = () => { activeTag = ''; renderTagBar(); doRender(); };
}

/* ── ANALYTICS ───────────────────────────────────── */
function renderAnalytics(items) {
  if (!items.length) { D.analytics.classList.add('u-hide'); return; }

  const authors = new Set(items.map(x=>x.author).filter(Boolean));
  let likes=0,views=0,faves=0,playable=0,totalDur=0,durCount=0;
  const tagMap = new Map();

  items.forEach(x => {
    likes    += getStat(x,'likes');
    views    += getStat(x,'views');
    faves    += getStat(x,'favorites');
    if (isUrl(x.public_link_url)||isUrl(x.video_storage_url)) playable++;
    const d = getDuration(x);
    if (d>0) { totalDur+=d; durCount++; }
    getTags(x).forEach(h => { h=h.replace(/^#/,''); tagMap.set(h,(tagMap.get(h)||0)+1); });
  });

  const avgDur = durCount ? Math.round(totalDur/durCount) : 0;
  const topTags = [...tagMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);

  D.anMetrics.innerHTML = [
    aMetric(fmt(items.length), 'Videos'),
    aMetric(authors.size,      'Authors'),
    aMetric(fmt(likes),        'Likes'),
    aMetric(fmt(views),        'Views'),
    aMetric(fmt(faves),        'Saved'),
    aMetric(fmt(playable),     'Playable'),
    aMetric(avgDur?fmtDur(avgDur):'—', 'Avg length'),
    aMetric(fmt(items.filter(x=>x.download_status==='completed').length), 'Archived'),
    aMetric(fmt(items.filter(x=>x.download_status==='failed').length), 'Failed'),
  ].join('');

  D.topTags.innerHTML = topTags.map(([t,n]) =>
    `<button class="tt-chip" data-tag="${ea(t)}">#${esc(t)} <span style="color:var(--c-muted);font-size:10px">${n}</span></button>`
  ).join('');

  QA('[data-tag]',D.topTags).forEach(b => b.onclick = () => {
    activeTag = b.dataset.tag;
    renderTagBar();
    doRender();
  });

  D.analytics.classList.remove('u-hide');
}

function aMetric(val, lbl) {
  return `<div class="a-metric"><div class="a-val">${esc(String(val))}</div><div class="a-lbl">${esc(lbl)}</div></div>`;
}

/* ── GRID ────────────────────────────────────────── */
function buildGridCard(item) {
  const poster  = getPoster(item);
  const dur     = getDuration(item);
  const likes   = getStat(item,'likes');
  const hasLink = isUrl(item.public_link_url)||isUrl(item.video_storage_url);
  const arcBadge = hasLink
    ? `<div class="g-arc ok">${icon('check',9)}</div>`
    : item.download_status==='failed'
      ? `<div class="g-arc warn">${icon('warn_tri',9)}</div>`
      : '';

  return `<div class="g-card" data-id="${ea(item.id||'')}">
    <div class="g-thumb" ${poster?`style="background-image:url('${ea(poster)}')"` : ''}></div>
    <div class="g-scrim"></div>
    ${dur?`<div class="g-dur">${esc(fmtDur(dur))}</div>`:''}
    ${arcBadge}
    <div class="g-overlay">
      <div class="g-likes">${icon('heart',12)} ${fmt(likes)}</div>
      <div class="g-cap">${hl(item.caption||'', D.searchInp.value.trim())}</div>
    </div>
  </div>`;
}

function renderGridBatch() {
  if (mode !== 'grid') return;
  const slice = filtered.slice(gridCount, gridCount + GRID_BATCH);
  if (!slice.length) return;

  D.videoGrid.insertAdjacentHTML('beforeend', slice.map(buildGridCard).join(''));
  gridCount += slice.length;

  // Wire click on newly added cards
  QA('.g-card:not([data-wired])', D.videoGrid).forEach(card => {
    card.dataset.wired = '1';
    card.onclick = () => {
    const idx = filtered.findIndex(x => String(x.id||'') === card.dataset.id);
      if (idx >= 0) openFeed(idx);
    };
  });

  // Remove old sentinel, add new one if more to load
  $('g-sentinel')?.remove();
  if (gridCount < filtered.length) {
    D.videoGrid.insertAdjacentHTML('beforeend', '<div id="g-sentinel" style="height:1px"></div>');
    watchSentinel();
  }
}

function watchSentinel() {
  if (gridObs) { gridObs.disconnect(); gridObs = null; }
  const s = $('g-sentinel'); if (!s) return;
  gridObs = new IntersectionObserver(([e]) => { if (e.isIntersecting) renderGridBatch(); }, {rootMargin:'400px 0px'});
  gridObs.observe(s);
}

/* ── FEED — THE KEY PART ─────────────────────────── */

// Compute which slice of filtered[] is in the virtual window
function feedWindow() {
  const cardH = FEED_CARD_H();
  const scrollTop = D.viewFeed.scrollTop;
  const start = Math.max(0, Math.floor(scrollTop / cardH) - FEED_OVERSCAN);
  const visible = Math.ceil(D.viewFeed.clientHeight / cardH) + FEED_OVERSCAN * 2;
  const end = Math.min(filtered.length, start + visible);
  return { start, end, cardH };
}

function buildFeedCard(item, globalIdx) {
  const pb       = getPlayback(item);
  const poster   = getPoster(item);
  const avatar   = getAvatar(item);
  const musicCvr = getMusicCover(item);
  const tags     = getTags(item).slice(0,6);
  const dur      = getDuration(item);
  const hasLink  = isUrl(item.public_link_url)||isUrl(item.video_storage_url);
  const arcCls   = hasLink ? 'ok' : item.download_status==='failed' ? 'warn' : 'none';
  const arcTxt   = hasLink ? 'Archived' : item.download_status==='failed' ? 'Download failed' : 'Not stored';
  const arcIcon  = arcCls==='ok'?icon('check',12):arcCls==='warn'?icon('warn_tri',12):'';
  const tiktokUrl= item.url||`https://www.tiktok.com/@${encodeURIComponent(item.author||'')}`;
  const q        = D.searchInp.value.trim();

  return `<div class="f-card" data-idx="${globalIdx}" data-id="${ea(item.id||'')}">

    ${poster?`<div class="f-bg" style="background-image:url('${ea(poster)}')"></div>
    <div class="f-bg-blur" style="background-image:url('${ea(poster)}')"></div>`:''} 

    ${pb?`<video class="f-video"
      preload="none"
      playsinline
      loop
      ${isMuted?'muted':''}
      poster="${ea(poster)}"
      data-src="${ea(pb)}"
    ></video>`:''}

    <div class="f-gradient"></div>
    <div class="f-tap-zone"></div>
    <div class="f-pause-flash"><div class="flash-icon" style="width:70px;height:70px"></div></div>
    <div class="f-progress"><div class="f-progress-fill"></div></div>

    <!-- Top bar -->
    <div class="f-top">
      <button class="f-back" aria-label="Back to grid">${icon('back',20)}</button>
      <div class="f-top-right">
        <button class="f-mute" aria-label="Toggle mute">${icon(isMuted?'mute':'unmute',18)}</button>
        <a class="f-open-tt" href="${ea(tiktokUrl)}" target="_blank" rel="noopener" aria-label="Open on TikTok">${icon('tiktok',18)}</a>
      </div>
    </div>

    <!-- Right sidebar -->
    <div class="f-sidebar">
      <button class="f-action f-like-btn" aria-label="Likes">
        <div class="f-action-icon">${icon('heart',24)}</div>
        <span class="f-action-label">${fmt(getStat(item,'likes'))}</span>
      </button>
      <button class="f-action f-comment-btn" aria-label="Comments">
        <div class="f-action-icon">${icon('comment',22)}</div>
        <span class="f-action-label">${fmt(getStat(item,'comments'))}</span>
      </button>
      <button class="f-action f-share-btn" aria-label="Share">
        <div class="f-action-icon">${icon('share',22)}</div>
        <span class="f-action-label">${fmt(getStat(item,'shares'))}</span>
      </button>
      ${pb?`<button class="f-action f-copy-btn" data-url="${ea(pb)}" aria-label="Copy link">
        <div class="f-action-icon">${icon('copy',20)}</div>
        <span class="f-action-label">Copy</span>
      </button>`:''}
      <div class="f-disc-wrap">
        <div class="f-disc">
          ${musicCvr?`<img src="${ea(musicCvr)}" alt="music" loading="lazy">`:
            `<div class="f-disc-fallback">${icon('music',18)}</div>`}
        </div>
      </div>
    </div>

    <!-- Bottom info -->
    <div class="f-info">
      <div class="f-author-row">
        <a class="f-avatar" href="${ea(getAuthorUrl(item))}" target="_blank" rel="noopener">
          ${avatar?`<img src="${ea(avatar)}" alt="${ea(item.author||'')}" loading="lazy">`:esc(initials(item.author))}
        </a>
        <div class="f-author-text">
          <span class="f-author-name">@${esc(item.author||'unknown')}</span>
          <span class="f-author-date">${esc(fmtDate(item.created_at))}${dur?` · ${esc(fmtDur(dur))}`:''}</span>
        </div>
      </div>
      ${item.caption?`
      <div class="f-caption" data-full="${ea(item.caption)}">${esc(item.caption.slice(0,140))}${item.caption.length>140?'<span class="f-caption-more"> …more</span>':''}</div>`:''}
      ${tags.length?`<div class="f-tags">${tags.map(t=>`<button class="f-tag" data-tag="${ea(t.replace(/^#/,''))}">#${esc(t.replace(/^#/,''))}</button>`).join(' ')}</div>`:''}
      ${getMusicTitle(item)?`<div class="f-music">
        <div class="f-music-note">${icon('music',11)}</div>
        <span class="f-music-text">${esc(getMusicTitle(item))}${getMusicAuthor(item)?' · '+esc(getMusicAuthor(item)):''}</span>
      </div>`:''}
      <div class="f-arc ${arcCls}">${arcIcon} ${arcTxt}</div>
    </div>
  </div>`;
}

function renderFeedWindow() {
  if (mode !== 'feed') return;
  const { start, end, cardH } = feedWindow();
  feedVirtStart = start;

  D.feedSpTop.style.height = `${start * cardH}px`;
  D.feedSpBot.style.height = `${Math.max(0, filtered.length - end) * cardH}px`;
  D.feedItems.innerHTML = filtered.slice(start, end).map((item,i) => buildFeedCard(item, start+i)).join('');

  // Wire interactive elements on new cards
  wireFeedInteractions();
  // Attach observer AFTER DOM update
  requestAnimationFrame(() => attachFeedObserver());
}

let feedScrollRaf = 0;
function onFeedScroll() {
  if (feedScrollRaf) return;
  feedScrollRaf = requestAnimationFrame(() => {
    feedScrollRaf = 0;
    renderFeedWindow();
  });
}

/* ── FEED INTERSECTION OBSERVER ──────────────────────
   THE FIX: root = D.viewFeed (the scroll container itself)
   NOT root: null (the viewport).
   Without this, the observer never fires correctly because
   the feed is a fixed-position element doing its own scroll.
   ─────────────────────────────────────────────────── */
function attachFeedObserver() {
  if (feedObs) { feedObs.disconnect(); feedObs = null; }

  const videos = QA('.f-video', D.feedItems);
  if (!videos.length) return;

  feedObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const vid = entry.target;
      const src = vid.dataset.src;

      // Phase 1: Load src when card is within 1 screen of viewport
      if (entry.isIntersecting && src) {
        vid.src = src;
        delete vid.dataset.src;
        vid.load();
      }

      // Phase 2: Play when ≥55% visible, pause when <30%
      if (entry.intersectionRatio >= 0.55) {
        if (activeVid && activeVid !== vid) {
          activeVid.pause();
          stopDisc(activeVid);
          stopProgressBar();
        }
        activeVid = vid;
        activeVidIdx = parseInt(vid.closest('.f-card')?.dataset.idx||'-1',10);
        vid.muted = isMuted;
        vid.play().catch(() => {}); // suppress autoplay policy errors
        startDisc(vid);
        startProgressBar(vid);
      } else if (entry.intersectionRatio < 0.3) {
        if (activeVid === vid) {
          vid.pause();
          stopDisc(vid);
          stopProgressBar();
          activeVid = null;
          activeVidIdx = -1;
        }
      }
    });
  }, {
    root: D.viewFeed,                  // ← CRITICAL: the scrolling element
    threshold: [0, 0.3, 0.55, 0.9],
    rootMargin: '100% 0px',            // pre-load src 1 full screen ahead
  });

  videos.forEach(v => {
    v.addEventListener('error', () => { v.style.display = 'none'; }, { once: true });
    feedObs.observe(v);
  });
}

/* ── VIDEO PROGRESS BAR ──────────────────────────── */
function startProgressBar(vid) {
  stopProgressBar();
  const fill = vid.closest('.f-card')?.querySelector('.f-progress-fill');
  if (!fill) return;
  function tick() {
    if (!vid || vid.paused || vid.ended || !vid.duration) {
      progRaf = requestAnimationFrame(tick); return;
    }
    fill.style.width = (vid.currentTime / vid.duration * 100) + '%';
    progRaf = requestAnimationFrame(tick);
  }
  progRaf = requestAnimationFrame(tick);
}

function stopProgressBar() {
  if (progRaf) { cancelAnimationFrame(progRaf); progRaf = 0; }
}

/* ── SPINNING DISC ───────────────────────────────── */
function spinnerFrom(vid, fn) {
  const disc = vid?.closest('.f-card')?.querySelector('.f-disc');
  const note = vid?.closest('.f-card')?.querySelector('.f-music-note');
  if (disc) fn(disc);
  if (note) fn(note);
}

function startDisc(vid) {
  spinnerFrom(vid, el => {
    el.classList.add('f-disc' in el.classList ? 'spinning' : 'playing');
  });
  // More targeted
  const card = vid?.closest('.f-card');
  card?.querySelector('.f-disc')?.classList.add('spinning');
  card?.querySelector('.f-music-note')?.classList.add('playing');
}

function stopDisc(vid) {
  const card = vid?.closest('.f-card');
  card?.querySelector('.f-disc')?.classList.remove('spinning');
  card?.querySelector('.f-music-note')?.classList.remove('playing');
}

/* ── FEED CARD INTERACTIONS ──────────────────────── */
function wireFeedInteractions() {
  QA('.f-tap-zone', D.feedItems).forEach(zone => {
    zone.onclick = () => {
      const vid = zone.closest('.f-card')?.querySelector('.f-video');
      const flash = zone.closest('.f-card')?.querySelector('.f-pause-flash');
      if (!vid) return;

      if (vid.paused) {
        vid.play().catch(()=>{});
        startDisc(vid); startProgressBar(vid);
        flash?.classList.remove('show');
      } else {
        vid.pause();
        stopDisc(vid); stopProgressBar();
        // Show flash then fade
        if (flash) {
          flash.classList.remove('hide');
          flash.classList.add('show');
          setTimeout(() => { flash.classList.remove('show'); flash.classList.add('hide'); }, 600);
        }
      }
    };
  });

  // Back button
  QA('.f-back', D.feedItems).forEach(b => b.onclick = () => exitFeed());

  // Mute toggle
  QA('.f-mute', D.feedItems).forEach(b => b.onclick = () => toggleMute());

  // Copy link
  QA('.f-copy-btn', D.feedItems).forEach(b => b.onclick = async () => {
    await clip(b.dataset.url);
    toast('Link copied');
    const ico = b.querySelector('.f-action-icon');
    if (ico) { const p=ico.innerHTML; ico.innerHTML=icon('check',22); setTimeout(()=>{ico.innerHTML=p;},1200); }
  });

  // Hashtag filter
  QA('.f-tag', D.feedItems).forEach(b => b.onclick = () => {
    activeTag = activeTag === b.dataset.tag ? '' : b.dataset.tag;
    renderTagBar();
    // Switch to grid to see filtered results
    if (activeTag) exitFeed();
  });

  // Caption expand
  QA('.f-caption-more', D.feedItems).forEach(span => span.onclick = e => {
    e.stopPropagation();
    const cap = span.closest('.f-caption');
    if (cap) { cap.textContent = cap.dataset.full; cap.classList.add('expanded'); }
  });
}

/* ── FEED OPEN / EXIT ────────────────────────────── */
function openFeed(idx) {
  mode = 'feed';
  localStorage.setItem(LS_MODE, 'feed');
  D.viewGrid.classList.add('leaving');
  D.viewFeed.classList.remove('u-hide');
  document.body.style.overflow = 'hidden';

  // Position feed then render
  requestAnimationFrame(() => {
    const cardH = FEED_CARD_H();
    D.viewFeed.scrollTo({ top: idx * cardH, behavior: 'instant' });
    renderFeedWindow();
    D.navFeed.classList.add('active');
    D.navBrowse.classList.remove('active');
    setTimeout(() => D.viewGrid.classList.add('u-hide'), 200);
  });
  pushState();
}

function exitFeed() {
  if (activeVid) { activeVid.pause(); stopDisc(activeVid); stopProgressBar(); activeVid = null; }
  if (feedObs)   { feedObs.disconnect(); feedObs = null; }
  mode = 'grid';
  localStorage.setItem(LS_MODE, 'grid');
  D.viewFeed.classList.add('u-hide');
  D.viewGrid.classList.remove('u-hide', 'leaving');
  document.body.style.overflow = '';
  D.navFeed.classList.remove('active');
  D.navBrowse.classList.add('active');
  doRender();
  pushState();
}

/* ── MUTE TOGGLE ─────────────────────────────────── */
function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem(LS_MUTE, isMuted);
  QA('.f-video').forEach(v => { v.muted = isMuted; });
  QA('.f-mute').forEach(b => { b.innerHTML = icon(isMuted?'mute':'unmute',18); });
}

/* ── CLIPBOARD ───────────────────────────────────── */
async function clip(text) {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); return; } catch {}
  const t = document.createElement('textarea');
  t.value = text; t.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(t); t.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(t);
}

/* ── EXPORT ──────────────────────────────────────── */
function exportJSON() {
  const data = JSON.stringify(filtered.map(x => ({
    id: x.id, author: x.author, caption: x.caption, created_at: x.created_at,
    url: x.url, public_link_url: x.public_link_url,
    stats: x.stats, hashtags: x.hashtags, music: x.music, video: x.video,
    download_status: x.download_status,
  })), null, 2);
  dl('stash-export.json', 'application/json', data);
}

function exportCSV() {
  const cols = ['id','author','caption','created_at','url','likes','views','comments','shares','favorites'];
  const rows = [
    cols.join(','),
    ...filtered.map(x => [
      x.id, x.author,
      `"${(x.caption||'').replace(/"/g,'""')}"`,
      x.created_at, x.url,
      getStat(x,'likes'), getStat(x,'views'), getStat(x,'comments'),
      getStat(x,'shares'), getStat(x,'favorites'),
    ].join(',')),
  ];
  dl('stash-export.csv', 'text/csv', rows.join('\n'));
}

function exportLinks() {
  const links = filtered.map(x => getPlayback(x)||x.url||'').filter(Boolean).join('\n');
  clip(links);
  toast(`${filtered.length} links copied`);
}

function dl(name, mime, content) {
  const a = document.createElement('a');
  a.href = `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
  a.download = name; a.click();
}

/* ── SHUFFLE / SURPRISE ME ───────────────────────── */
function shuffle() {
  if (!filtered.length) return;
  openFeed(Math.floor(Math.random() * filtered.length));
}

/* ── MAIN RENDER ─────────────────────────────────── */
function resetGrid() {
  gridCount = 0;
  if (gridObs) { gridObs.disconnect(); gridObs = null; }
  D.videoGrid.innerHTML = '';
}

function doRender() {
  applyFilters();
  renderTagBar();
  pushState();

  const n = filtered.length, tot = all.length;
  D.gCount.textContent = n === tot ? `${fmt(n)} videos` : `${fmt(n)} of ${fmt(tot)}`;

  renderAnalytics(filtered);
  renderRecent();

  if (mode === 'grid') {
    resetGrid();
    if (!n) {
      D.videoGrid.innerHTML = `<div class="empty-state"><h2>No results</h2><p>Try clearing filters or searching something else.</p></div>`;
    } else {
      renderGridBatch();
    }
  } else {
    renderFeedWindow();
  }
}

const debouncedRender = debounce(doRender, 200);

/* ── LOAD DATA ───────────────────────────────────── */
async function loadData(force = false) {
  setProgress(15);
  D.errBanner.classList.add('u-hide');
  D.offBanner.classList.add('u-hide');
  D.skelWrap.classList.remove('u-hide');
  D.videoGrid.classList.add('u-hide');

  try {
    setProgress(50);
    const r = await fetch(DATA_URL, force ? {cache:'no-store'} : {});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Not an array');
    all = data;
    await writeCache(data);
    D.netDot.className = 'net-dot live';
    D.netLbl.textContent = 'Live';
  } catch (err) {
    const cached = await readCache();
    if (cached?.length) {
      all = cached;
      D.netDot.className = 'net-dot cache';
      D.netLbl.textContent = 'Cached';
      D.offBanner.classList.remove('u-hide');
    } else {
      D.errMsg.innerHTML = `<strong>Could not load archive.</strong> ${esc(err.message)} — make sure <code>archive/search/search_index.json</code> exists.`;
      D.errBanner.classList.remove('u-hide');
      D.skelWrap.classList.add('u-hide');
      setProgress(0);
      return;
    }
  }

  setProgress(85);
  populateAuthors();
  restoreState();
  renderRecent();

  D.skelWrap.classList.add('u-hide');
  D.videoGrid.classList.remove('u-hide');

  if (mode === 'feed') openFeed(0);
  else doRender();

  setProgress(0);
}

/* ── EVENTS ──────────────────────────────────────── */
function wire() {
  // Search input
  D.searchInp.addEventListener('input', () => {
    D.searchClear.classList.toggle('vis', !!D.searchInp.value);
    debouncedRender();
  });
  D.searchInp.addEventListener('keydown', e => {
    if (e.key==='Enter') { saveRecent(D.searchInp.value); doRender(); }
    if (e.key==='Escape') { D.searchInp.value=''; D.searchClear.classList.remove('vis'); doRender(); }
  });
  D.searchClear.onclick = () => {
    D.searchInp.value=''; D.searchClear.classList.remove('vis');
    doRender(); D.searchInp.focus();
  };

  // Filters
  D.authorSel.onchange = doRender;
  D.sortSel.onchange   = doRender;
  D.dateSel.onchange   = doRender;

  // Mode nav
  D.navFeed.onclick   = () => { if(mode!=='feed'&&filtered.length) openFeed(activeVidIdx>=0?activeVidIdx:0); };
  D.navBrowse.onclick = () => { if(mode==='feed') exitFeed(); else doRender(); };
  D.navShuffle.onclick = shuffle;
  D.navExport.onclick  = () => D.exportSheet.classList.add('open');

  // Export sheet
  D.exportSheet.onclick = e => { if(e.target===D.exportSheet) D.exportSheet.classList.remove('open'); };
  $('ex-json').onclick  = () => { exportJSON(); D.exportSheet.classList.remove('open'); };
  $('ex-csv').onclick   = () => { exportCSV(); D.exportSheet.classList.remove('open'); };
  $('ex-links').onclick = () => { exportLinks(); D.exportSheet.classList.remove('open'); };
  $('ex-cancel').onclick= () => D.exportSheet.classList.remove('open');

  // Reload
  $('btn-reload').onclick = () => loadData(true);

  // Banner dismiss
  $('off-dismiss').onclick = () => D.offBanner.classList.add('u-hide');
  $('err-dismiss').onclick = () => D.errBanner.classList.add('u-hide');

  // Analytics expand/collapse
  D.analytics.querySelector('.analytics-header').onclick = () => {
    const open = !D.anBody.classList.contains('collapsed');
    D.anBody.classList.toggle('collapsed', open);
    D.anChevron.classList.toggle('open', !open);
    localStorage.setItem(LS_ANOPEN, String(!open));
  };
  // Restore analytics state
  if (localStorage.getItem(LS_ANOPEN) !== 'false') {
    D.anBody.classList.remove('collapsed');
    D.anChevron.classList.add('open');
  }

  // Feed scroll → virtual render
  D.viewFeed.addEventListener('scroll', onFeedScroll, { passive: true });

  // Grid scroll → back-to-top button
  D.gridScroll.addEventListener('scroll', () => {
    D.btnTop.classList.toggle('show', D.gridScroll.scrollTop > 500);
  }, { passive: true });
  D.btnTop.onclick = () => D.gridScroll.scrollTo({top:0,behavior:'smooth'});

  // Online/offline
  window.addEventListener('online', () => {
    D.offBanner.classList.add('u-hide');
    D.netDot.className = 'net-dot live';
    D.netLbl.textContent = 'Online';
  });
  window.addEventListener('offline', () => {
    D.offBanner.classList.remove('u-hide');
    D.netDot.className = 'net-dot dead';
    D.netLbl.textContent = 'Offline';
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key==='/' && document.activeElement!==D.searchInp) {
      e.preventDefault(); D.searchInp.focus(); D.searchInp.select();
    }
    if (e.key==='Escape' && mode==='feed') exitFeed();
  });
}

/* ── SERVICE WORKER ────────────────────────────
 
