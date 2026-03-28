'use strict';

const DATA_URL = '../archive/search/search_index.json';
const CACHE_NAME = 'tiktok-stash-ui-v6';
const MODE_KEY = 'stash-mode-v2';
const RECENT_KEY = 'stash-recent-v2';
const INDEX_CACHE_KEY = 'stash-index-cache-v2';

const GRID_BATCH = 36;
const FEED_OVERSCAN = 2;

let allItems = [];
let filteredItems = [];
let currentMode = localStorage.getItem(MODE_KEY) || 'grid';
let activeTag = '';
let activeVideoId = '';
let pendingHashVideo = '';
let gridRendered = 0;
let gridObserver = null;
let feedObserver = null;
let activeVideo = null;
let feedRaf = 0;
let searchTimer = 0;
let headerResizeObserver = null;

const $ = id => document.getElementById(id);

const els = {
  searchInput: $('searchInput'),
  searchClear: $('searchClear'),
  authorFilter: $('authorFilter'),
  sortSelect: $('sortSelect'),
  dateFilter: $('dateFilter'),
  gridModeTab: $('gridModeTab'),
  feedModeTab: $('feedModeTab'),
  reloadBtn: $('reloadBtn'),
  clearBtn: $('clearBtn'),
  resultsMeta: $('resultsMeta'),
  cacheStatus: $('cacheStatus'),
  liveDot: $('liveDot'),
  progressFill: $('progressFill'),
  progressRail: $('progressRail'),
  offlineBanner: $('offlineBanner'),
  errorBanner: $('errorBanner'),
  errorMsg: $('errorMsg'),
  tagStrip: $('tagStrip'),
  skeletonWrap: $('skeletonWrap'),
  gridView: $('gridView'),
  videoGrid: $('videoGrid'),
  feedView: $('feedView'),
  feedSpacerTop: $('feedSpacerTop'),
  feedItems: $('feedItems'),
  feedSpacerBot: $('feedSpacerBot'),
  analyticsWrap: $('analyticsWrap'),
  recentPanel: $('recentPanel'),
  recentChips: $('recentChips'),
  backTop: $('backTop'),
  surpriseBtn: $('surpriseBtn'),
};

function escHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(v) {
  return escHtml(v).replace(/`/g, '&#96;');
}

function fmt(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 0) return '—';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return String(num);
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function initials(name) {
  const s = String(name || '?').trim();
  return s.slice(0, 2).toUpperCase();
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(v => {
      if (typeof v === 'string') return v.trim();
      if (v && typeof v === 'object') {
        return (v.name || v.title || v.text || v.username || v.id || '').toString().trim();
      }
      return '';
    }).filter(Boolean);
  }
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (value && typeof value === 'object') {
    const c = value.name || value.title || value.text || value.username || value.id;
    return c ? [String(c)] : [];
  }
  return [];
}

function highlight(text, query) {
  const safe = escHtml(text || '');
  const q = String(query || '').trim();
  if (!q) return safe;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return safe.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  } catch {
    return safe;
  }
}

function isUrl(v) {
  return typeof v === 'string' && /^https?:\/\//i.test(v);
}

function getStat(item, key) {
  const direct = item?.[key];
  if (direct != null && Number.isFinite(Number(direct))) return Number(direct);

  const stats = item?.stats || {};
  const map = {
    likes: ['likes', 'diggCount', 'digg'],
    views: ['views', 'playCount'],
    comments: ['comments', 'commentCount'],
    shares: ['shares', 'shareCount'],
    favorites: ['favorites', 'collectCount'],
    reposts: ['reposts', 'repostCount'],
  };

  for (const k of (map[key] || [key])) {
    if (stats[k] != null && Number.isFinite(Number(stats[k]))) return Number(stats[k]);
  }
  return 0;
}

function getPlayback(item) {
  if (isUrl(item?.public_link_url)) return item.public_link_url;
  if (isUrl(item?.video_storage_url)) return item.video_storage_url;
  return '';
}

function getPoster(item) {
  return item?.video_cover_url || item?.music_cover || '';
}

function getAvatar(item) {
  return item?.author_avatar || '';
}

function getMusicUrl(item) {
  return item?.music_url || '';
}

function getAuthorUrl(item) {
  if (item?.author_profile) return item.author_profile;
  const a = item?.author || '';
  return a ? `https://www.tiktok.com/@${encodeURIComponent(a)}` : '#';
}

function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fn(...args), ms);
  };
}

const ICONS = {
  heart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  eye: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
  music: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
  share: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>`,
  comment: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>`,
  link: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`,
  copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
  up: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>`,
  dice: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-5 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-5 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>`,
  play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  mute: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
  unmute: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
};

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(q) {
  q = String(q || '').trim();
  if (!q) return;
  const list = loadRecent().filter(x => x !== q);
  list.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  renderRecent();
}

function renderRecent() {
  const list = loadRecent();
  if (!list.length) {
    els.recentPanel.classList.add('hidden');
    els.recentChips.innerHTML = '';
    return;
  }

  els.recentPanel.classList.remove('hidden');
  els.recentChips.innerHTML = list.map(q =>
    `<button class="recent-chip" type="button" data-q="${escAttr(q)}">${escHtml(q)}</button>`
  ).join('');

  els.recentChips.querySelectorAll('[data-q]').forEach(btn => {
    btn.addEventListener('click', () => {
      els.searchInput.value = btn.dataset.q;
      els.searchClear.classList.add('show');
      resetRender();
      doRender();
    });
  });
}

function loadIndexCache() {
  try {
    const raw = localStorage.getItem(INDEX_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function cacheIndex(items) {
  try {
    localStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(items));
  } catch {}

  if (!('caches' in window)) return;
  try {
    const c = await caches.open(CACHE_NAME);
    await c.put(DATA_URL, new Response(JSON.stringify(items), {
      headers: { 'Content-Type': 'application/json' }
    }));
  } catch {}
}

async function readIndexCache() {
  if ('caches' in window) {
    try {
      const c = await caches.open(CACHE_NAME);
      const r = await c.match(DATA_URL);
      if (r) {
        const d = await r.json();
        if (Array.isArray(d)) return d;
      }
    } catch {}
  }

  return loadIndexCache();
}

function setProgress(pct) {
  if (pct > 0) {
    els.progressRail.classList.add('visible');
    els.progressFill.style.width = `${pct}%`;
  } else {
    els.progressFill.style.width = '100%';
    setTimeout(() => {
      els.progressRail.classList.remove('visible');
      els.progressFill.style.width = '0%';
    }, 250);
  }
}

function updateHeaderHeight() {
  const header = document.querySelector('.header');
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-h', `${h}px`);
}

function attachHeaderObserver() {
  updateHeaderHeight();
  if ('ResizeObserver' in window) {
    headerResizeObserver = new ResizeObserver(() => updateHeaderHeight());
    headerResizeObserver.observe(document.querySelector('.header'));
  } else {
    window.addEventListener('resize', updateHeaderHeight, { passive: true });
  }
}

function pushState() {
  const p = new URLSearchParams();
  const q = els.searchInput.value.trim();

  if (q) p.set('q', q);
  if (els.authorFilter.value) p.set('author', els.authorFilter.value);
  if (els.sortSelect.value !== 'likes') p.set('sort', els.sortSelect.value);
  if (els.dateFilter.value) p.set('date', els.dateFilter.value);
  if (activeTag) p.set('tag', activeTag);
  p.set('mode', currentMode);
  if (currentMode === 'feed' && activeVideoId) p.set('video', activeVideoId);

  const s = p.toString();
  history.replaceState(null, '', s ? `#${s}` : location.pathname + location.search);
}

function restoreState() {
  const hash = location.hash.replace(/^#/, '');
  if (!hash) return;

  const p = new URLSearchParams(hash);
  if (p.has('q')) {
    els.searchInput.value = p.get('q') || '';
    els.searchClear.classList.toggle('show', !!els.searchInput.value.trim());
  }
  if (p.has('author')) els.authorFilter.value = p.get('author') || '';
  if (p.has('sort')) els.sortSelect.value = p.get('sort') || 'likes';
  if (p.has('date')) els.dateFilter.value = p.get('date') || '';
  if (p.has('tag')) activeTag = p.get('tag') || '';
  if (p.has('mode')) currentMode = p.get('mode') === 'feed' ? 'feed' : 'grid';
  if (p.has('video')) pendingHashVideo = p.get('video') || '';
}

function populateAuthors() {
  const saved = els.authorFilter.value;
  const authors = [...new Set(allItems.map(x => x.author).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  els.authorFilter.innerHTML = '<option value="">All authors</option>' + authors.map(a =>
    `<option value="${escAttr(a)}">@${escHtml(a)}</option>`
  ).join('');

  if (authors.includes(saved)) els.authorFilter.value = saved;
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();
  const author = els.authorFilter.value;
  const sort = els.sortSelect.value;
  const days = parseInt(els.dateFilter.value, 10) || 0;

  let items = allItems.slice();

  if (query) items = items.filter(x => (x.search_text || '').includes(query));
  if (author) items = items.filter(x => x.author === author);
  if (activeTag) {
    const t = activeTag.toLowerCase().replace(/^#/, '');
    items = items.filter(x => normalizeList(x.hashtags).some(h => h.toLowerCase().replace(/^#/, '') === t));
  }

  if (days) {
    const cutoff = Date.now() - days * 86400000;
    items = items.filter(x => {
      const ts = new Date(x.created_at || 0).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    });
  }

  items.sort((a, b) => {
    if (sort === 'date_desc') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (sort === 'date_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    return getStat(b, sort) - getStat(a, sort);
  });

  filteredItems = items;
  return items;
}

function hasFilters() {
  return !!(els.searchInput.value.trim() || els.authorFilter.value || els.dateFilter.value || activeTag);
}

function updateFilterStates() {
  els.clearBtn.style.display = hasFilters() ? '' : 'none';
  els.authorFilter.classList.toggle('active-filter', !!els.authorFilter.value);
  els.dateFilter.classList.toggle('active-filter', !!els.dateFilter.value);
}

function renderTagStrip() {
  if (!activeTag) {
    els.tagStrip.innerHTML = '';
    return;
  }

  const tag = activeTag.replace(/^#/, '');
  els.tagStrip.innerHTML = `<button class="active-tag" id="removeTag" type="button">#${escHtml(tag)} ×</button>`;
  $('removeTag').addEventListener('click', () => {
    activeTag = '';
    renderTagStrip();
    updateFilterStates();
    resetRender();
    doRender();
  });
}

function metric(label, value, sub) {
  return `<div class="metric-card">
    <div class="metric-label">${escHtml(label)}</div>
    <div class="metric-value">${escHtml(String(value))}</div>
    <div class="metric-sub">${escHtml(sub)}</div>
  </div>`;
}

function renderAnalytics(items) {
  if (!items.length) {
    els.analyticsWrap.classList.add('hidden');
    els.analyticsWrap.innerHTML = '';
    return;
  }

  const authors = new Set(items.map(x => x.author).filter(Boolean));
  let likes = 0;
  let views = 0;
  let favorites = 0;
  let playable = 0;
  let avgDurationTotal = 0;
  let avgDurationCount = 0;
  const tagCounts = new Map();
  const authorCounts = new Map();
  const musicCounts = new Map();

  items.forEach(x => {
    likes += getStat(x, 'likes');
    views += getStat(x, 'views');
    favorites += getStat(x, 'favorites');
    if (isUrl(x.public_link_url) || isUrl(x.video_storage_url)) playable += 1;

    const d = Number(x.video_duration);
    if (Number.isFinite(d) && d > 0) {
      avgDurationTotal += d;
      avgDurationCount += 1;
    }

    if (x.author) authorCounts.set(x.author, (authorCounts.get(x.author) || 0) + 1);
    normalizeList(x.hashtags).forEach(tag => {
      const clean = String(tag).replace(/^#/, '').trim();
      if (!clean) return;
      tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
    });
    if (x.music_name) musicCounts.set(x.music_name, (musicCounts.get(x.music_name) || 0) + 1);
  });

  const topAuthors = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMusic = [...musicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const avgDuration = avgDurationCount ? Math.round(avgDurationTotal / avgDurationCount) : 0;

  els.analyticsWrap.innerHTML = `
    <div class="analytics-grid">
      ${metric('Videos', items.length, 'in archive')}
      ${metric('Authors', authors.size, 'unique creators')}
      ${metric('Likes', fmt(likes), 'total engagement')}
      ${metric('Views', fmt(views), 'total plays')}
      ${metric('Favorites', fmt(favorites), 'saved')}
      ${metric('Playable', fmt(playable), 'with playback links')}
      ${metric('Average duration', avgDuration ? `${avgDuration}s` : '—', 'from available metadata')}
      ${metric('Top music', topMusic.length ? fmt(topMusic[0][1]) : '—', topMusic.length ? topMusic[0][0] : 'no music data')}
    </div>
    <div class="analytics-columns">
      <div class="analytics-list">
        <h3>Top authors</h3>
        ${topAuthors.length ? topAuthors.map(([name, count]) => `<div class="top-item"><span>@${escHtml(name)}</span><strong>${fmt(count)}</strong></div>`).join('') : '<div class="top-item"><span>No authors</span><strong>—</strong></div>'}
      </div>
      <div class="analytics-list">
        <h3>Top hashtags</h3>
        ${topTags.length ? topTags.map(([name, count]) => `<div class="top-item"><span>#${escHtml(name)}</span><strong>${fmt(count)}</strong></div>`).join('') : '<div class="top-item"><span>No hashtags</span><strong>—</strong></div>'}
      </div>
      <div class="analytics-list">
        <h3>Coverage</h3>
        <div class="top-item"><span>Public links</span><strong>${fmt(items.filter(x => isUrl(x.public_link_url)).length)}</strong></div>
        <div class="top-item"><span>Storage URLs</span><strong>${fmt(items.filter(x => isUrl(x.video_storage_url)).length)}</strong></div>
        <div class="top-item"><span>Unavailable</span><strong>${fmt(items.filter(x => x.is_available === false).length)}</strong></div>
        ${topMusic.length ? topMusic.map(([name, count]) => `<div class="top-item"><span>${escHtml(name)}</span><strong>${fmt(count)}</strong></div>`).join('') : '<div class="top-item"><span>No music data</span><strong>—</strong></div>'}
      </div>
    </div>
  `;
  els.analyticsWrap.classList.remove('hidden');
}

function tagChips(item) {
  const hashtags = normalizeList(item.hashtags);
  const mentions = normalizeList(item.mentions);
  const detailedMentions = Array.isArray(item.detailed_mentions) ? item.detailed_mentions : [];
  const musicUrl = getMusicUrl(item);

  const output = [];

  hashtags.forEach(h => {
    output.push(`<span class="chip cyan">#${escHtml(String(h).replace(/^#/, ''))}</span>`);
  });

  mentions.forEach(m => {
    const clean = String(m).replace(/^@/, '').trim();
    if (clean) output.push(`<a class="chip pink" href="https://www.tiktok.com/@${encodeURIComponent(clean)}" target="_blank" rel="noopener">@${escHtml(clean)}</a>`);
  });

  detailedMentions.forEach(m => {
    if (!m || typeof m !== 'object') return;
    const user = m.username || m.userUniqueId || m.unique_id || m.name || '';
    const clean = String(user).replace(/^@/, '').trim();
    if (clean) output.push(`<a class="chip" href="https://www.tiktok.com/@${encodeURIComponent(clean)}" target="_blank" rel="noopener">@${escHtml(clean)}</a>`);
  });

  if (musicUrl) output.push(`<a class="chip" href="${escAttr(musicUrl)}" target="_blank" rel="noopener">Music</a>`);
  return output.join('');
}

function buildGridCard(item, query) {
  const poster = getPoster(item);
  const avatarUrl = getAvatar(item);
  const authorUrl = getAuthorUrl(item);
  const likes = getStat(item, 'views');
  const playback = getPlayback(item);

  return `<div class="grid-card" data-id="${escAttr(item.id || '')}">
    <div class="grid-thumb" ${poster ? `style="background-image:url('${escAttr(poster)}')"` : ''}></div>
    <div class="grid-scrim"></div>
    <div class="grid-info">
      <div class="grid-stat">${ICONS.heart} ${fmt(likes)}</div>
      <div class="grid-caption">${highlight(item.caption || '', query)}</div>
      <div class="grid-author">@${escHtml(item.author || 'unknown')}</div>
    </div>
    <div class="grid-hover">
      <div class="grid-play-icon">${ICONS.play}</div>
    </div>
  </div>`;
}

function renderGridBatch() {
  if (currentMode !== 'grid') return;
  const slice = filteredItems.slice(gridRendered, gridRendered + GRID_BATCH);
  if (!slice.length) return;

  const query = els.searchInput.value.trim();
  els.videoGrid.insertAdjacentHTML('beforeend', slice.map(x => buildGridCard(x, query)).join(''));
  gridRendered += slice.length;

  $('gridSentinel')?.remove();
  if (gridRendered < filteredItems.length) {
    els.videoGrid.insertAdjacentHTML('beforeend', '<div id="gridSentinel" style="height:1px"></div>');
    watchGridSentinel();
  }

  // Grid card click → open feed at that index
  els.videoGrid.querySelectorAll('.grid-card:not([data-wired])').forEach(card => {
    card.setAttribute('data-wired', '1');
    card.addEventListener('click', () => {
      const id  = card.dataset.id;
      const idx = filteredItems.findIndex(x => String(x.id || '') === id);
      if (idx >= 0) openFeedAt(idx);
    });
  });
}

function watchGridSentinel() {
  if (gridObserver) { gridObserver.disconnect(); gridObserver = null; }
  const sentinel = $('gridSentinel');
  if (!sentinel) return;
  gridObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) renderGridBatch();
  }, { rootMargin: '800px 0px' });
  gridObserver.observe(sentinel);
}

// ── FEED VIRTUAL RENDERING ────────────────────────────────────────────────────
function buildFeedCard(item) {
  const playback   = getPlayback(item);
  const poster     = getPoster(item);
  const avatarUrl  = getAvatar(item);
  const authorUrl  = getAuthorUrl(item);
  const musicUrl   = getMusicUrl(item);
  const musicTitle = item.music_name  || '';
  const musicAuth  = item.music_author || '';
  const likes      = getStat(item, 'likes');
  const comments   = getStat(item, 'comments');
  const shares     = getStat(item, 'shares');
  const hashtags   = normalizeList(item.hashtags);
  const tiktokUrl  = item.url || '#';
  const storePath  = item.video_storage_path || item.metadata_storage_path || '';

  const tagHtml = hashtags.slice(0, 6).map(h =>
    `<button class="feed-tag" data-tag="${escAttr(h.replace(/^#/,''))}" type="button">#${escHtml(h.replace(/^#/,''))}</button>`
  ).join(' ');

  const musicCover = item.music_cover || poster;

  return `<div class="feed-card" data-id="${escAttr(item.id || '')}">
    ${poster ? `<div class="feed-poster" style="background-image:url('${escAttr(poster)}')"></div>` : ''}
    ${playback ? `<video class="feed-video-el"
      preload="none"
      playsinline
      loop
      ${isMuted ? 'muted' : ''}
      poster="${escAttr(poster)}"
      data-src="${escAttr(playback)}"
    ></video>` : ''}
    <div class="feed-overlay"></div>
    <div class="tap-pause"></div>

    <button class="mute-btn" type="button" aria-label="Toggle mute">
      ${isMuted ? ICONS.mute : ICONS.unmute}
    </button>

    <!-- Right actions -->
    <div class="feed-actions">
      <button class="feed-action-btn" type="button" aria-label="Like">
        <div class="feed-action-icon">${ICONS.heart}</div>
        <span class="feed-action-count">${fmt(likes)}</span>
      </button>
      <button class="feed-action-btn" type="button" aria-label="Comment">
        <div class="feed-action-icon">${ICONS.comment}</div>
        <span class="feed-action-count">${fmt(comments)}</span>
      </button>
      <button class="feed-action-btn" type="button" aria-label="Share">
        <div class="feed-action-icon">${ICONS.share}</div>
        <span class="feed-action-count">${fmt(shares)}</span>
      </button>
      ${playback ? `<button class="feed-action-btn copy-video-link" type="button" data-copy="${escAttr(playback)}" aria-label="Copy link">
        <div class="feed-action-icon">${ICONS.copy}</div>
        <span class="feed-action-count">Copy</span>
      </button>` : ''}
      <div class="music-disc${playback ? '' : ''}">
        <div class="music-disc-inner" style="${musicCover ? `background-image:url('${escAttr(musicCover)}');background-size:cover;background-position:center` : ''}">
          ${!musicCover ? ICONS.music : ''}
        </div>
      </div>
    </div>

    <!-- Bottom info -->
    <div class="feed-info">
      <div class="feed-author-row">
        <div class="feed-avatar">
          ${avatarUrl ? `<img src="${escAttr(avatarUrl)}" alt="${escAttr(item.author || '')}" loading="lazy">` : escHtml(initials(item.author))}
        </div>
        <div>
          <a class="feed-author-name" href="${escAttr(authorUrl)}" target="_blank" rel="noopener">@${escHtml(item.author || 'unknown')}</a>
          <div class="feed-date">${escHtml(fmtDate(item.created_at))}</div>
        </div>
      </div>

      <div class="feed-caption" data-full="${escAttr(item.caption || '')}">${escHtml((item.caption || '').slice(0, 120))}${(item.caption || '').length > 120 ? '… <span style="opacity:.6;cursor:pointer" data-expand>more</span>' : ''}</div>

      ${tagHtml ? `<div class="feed-tags">${tagHtml}</div>` : ''}

      ${musicTitle ? `<div class="feed-music">
        ${ICONS.music}
        <span class="feed-music-text">${escHtml(musicTitle)}${musicAuth ? ' · ' + escHtml(musicAuth) : ''}</span>
      </div>` : ''}
    </div>
  </div>`;
}

function renderFeedWindow() {
  if (currentMode !== 'feed') return;

  const feedEl   = els.feedView;
  const scrollTop = feedEl.scrollTop;
  const viewH    = feedEl.clientHeight;
  const start    = Math.max(0, Math.floor(scrollTop / FEED_ESTIMATE) - FEED_OVERSCAN);
  const visible  = Math.ceil(viewH / FEED_ESTIMATE) + FEED_OVERSCAN * 2;
  const end      = Math.min(filteredItems.length, start + visible);

  els.feedSpacerTop.style.height = `${start * FEED_ESTIMATE}px`;
  els.feedSpacerBot.style.height = `${Math.max(0, filteredItems.length - end) * FEED_ESTIMATE}px`;
  els.feedItems.innerHTML = filteredItems.slice(start, end).map(buildFeedCard).join('');

  attachFeedObserver();
  wireFeedCards();
}

function scheduleFeedRender() {
  if (feedRaf) return;
  feedRaf = requestAnimationFrame(() => { feedRaf = 0; renderFeedWindow(); });
}

function attachFeedObserver() {
  if (feedObserver) { feedObserver.disconnect(); feedObserver = null; }

  const videos = [...els.feedItems.querySelectorAll('.feed-video-el')];
  if (!videos.length) return;

  feedObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      const src = video.getAttribute('data-src');

      // Step 1: lazy-load src as soon as card is within 1 screen
      if (entry.isIntersecting && src && !video.getAttribute('src')) {
        video.removeAttribute('data-src');
        video.src = src;
        video.load();
      }

      // Step 2: play/pause based on 60%+ visibility
      if (entry.intersectionRatio >= 0.6) {
        if (activeVideo && activeVideo !== video) {
          try { activeVideo.pause(); } catch {}
          stopMusicDisc(activeVideo);
        }
        activeVideo = video;
        video.muted = isMuted;
        video.play().catch(() => {
          // Autoplay blocked — show poster, don't crash
        });
        spinMusicDisc(video, true);
      } else if (entry.intersectionRatio < 0.3) {
        try { video.pause(); } catch {}
        spinMusicDisc(video, false);
      }
    });
  }, {
    root: els.feedView,           // observe within the feed scroll container
    threshold: [0.1, 0.3, 0.6, 0.9],
    rootMargin: '100% 0px',       // pre-load src 1 screen ahead
  });

  videos.forEach(video => {
    video.addEventListener('error', () => {
      video.style.display = 'none';
    }, { once: true });
    feedObserver.observe(video);
  });
}

function spinMusicDisc(video, playing) {
  const card = video.closest('.feed-card');
  const disc = card?.querySelector('.music-disc');
  if (disc) disc.classList.toggle('playing', playing);
}

function stopMusicDisc(video) {
  spinMusicDisc(video, false);
}

function wireFeedCards() {
  // Tap-to-pause
  els.feedItems.querySelectorAll('.tap-pause').forEach(area => {
    area.addEventListener('click', () => {
      const video = area.closest('.feed-card')?.querySelector('.feed-video-el');
      if (!video) return;
      if (video.paused) { video.play().catch(() => {}); }
      else              { video.pause(); }
    });
  });

  // Mute toggles
  els.feedItems.querySelectorAll('.mute-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      isMuted = !isMuted;
      localStorage.setItem(MUTE_KEY, isMuted);
      // Update all visible videos
      document.querySelectorAll('.feed-video-el').forEach(v => { v.muted = isMuted; });
      // Update all mute button icons
      document.querySelectorAll('.mute-btn').forEach(b => {
        b.innerHTML = isMuted ? ICONS.mute : ICONS.unmute;
      });
    });
  });

  // Hashtag filter buttons
  els.feedItems.querySelectorAll('.feed-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      activeHashtag = activeHashtag === tag ? '' : tag;
      renderTagStrip();
      updateFilterStates();
      doRender();
    });
  });

  // Caption expand
  els.feedItems.querySelectorAll('[data-expand]').forEach(span => {
    span.addEventListener('click', e => {
      e.stopPropagation();
      const cap = span.closest('.feed-caption');
      if (cap) {
        cap.textContent = cap.dataset.full;
        cap.classList.add('expanded');
      }
    });
  });

  // Copy link buttons
  els.feedItems.querySelectorAll('.copy-video-link').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.copy, btn));
  });
}

// ── COPY ─────────────────────────────────────────────────────────────────────
async function copyToClipboard(value, btn) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }
  if (btn) {
    const icon = btn.querySelector('.feed-action-icon');
    if (icon) {
      const prev = icon.innerHTML;
      icon.innerHTML = '✓';
      icon.style.color = 'var(--good)';
      setTimeout(() => { icon.innerHTML = prev; icon.style.color = ''; }, 1200);
    }
  }
}

// ── OPEN FEED AT INDEX (from grid click) ──────────────────────────────────────
function openFeedAt(idx) {
  setMode('feed', true);
  // Scroll feed to that card
  requestAnimationFrame(() => {
    els.feedView.scrollTop = idx * FEED_ESTIMATE;
    renderFeedWindow();
  });
}

// ── SURPRISE ME ───────────────────────────────────────────────────────────────
function surpriseMe() {
  if (!filteredItems.length) return;
  const idx = Math.floor(Math.random() * filteredItems.length);
  openFeedAt(idx);
}

// ── RENDER ORCHESTRATION ─────────────────────────────────────────────────────
function resetRender() {
  gridRendered = 0;
  if (gridObserver) { gridObserver.disconnect(); gridObserver = null; }
  if (feedObserver) { feedObserver.disconnect(); feedObserver = null; }
  if (activeVideo)  { try { activeVideo.pause(); } catch {} activeVideo = null; }
  els.videoGrid.innerHTML = '';
  els.feedItems.innerHTML = '';
  els.feedSpacerTop.style.height = '0px';
  els.feedSpacerBot.style.height = '0px';
}

function doRender() {
  applyFilters();
  updateFilterStates();
  renderTagStrip();
  pushState();

  const count = filteredItems.length;
  const total = allItems.length;
  els.resultsMeta.textContent = count === total
    ? `${fmt(count)} videos`
    : `${fmt(count)} of ${fmt(total)}`;

  renderAnalytics(filteredItems);
  resetRender();

  if (!count) {
    if (currentMode === 'grid') {
      els.videoGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <h2>No results</h2>
        <p>Try clearing filters or searching something else.</p>
      </div>`;
    } else {
      els.feedItems.innerHTML = `<div class="empty-state" style="height:calc(100dvh - var(--header-h));display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <h2>No results</h2><p>Try clearing filters.</p>
      </div>`;
    }
    return;
  }

  if (currentMode === 'grid') renderGridBatch();
  else                        renderFeedWindow();
}

const debouncedRender = debounce(() => doRender(), 200);

// ── MODE ─────────────────────────────────────────────────────────────────────
function setMode(mode, skipRender = false) {
  currentMode = mode === 'feed' ? 'feed' : 'grid';
  localStorage.setItem(MODE_KEY, currentMode);

  els.gridModeTab.classList.toggle('active', currentMode === 'grid');
  els.feedModeTab.classList.toggle('active', currentMode === 'feed');

  // Grid: normal document flow. Feed: fixed full-viewport overlay.
  if (currentMode === 'feed') {
    els.feedView.classList.remove('hidden');
    els.gridView.classList.add('hidden');
    document.body.style.overflow = 'hidden'; // prevent body scroll in feed
  } else {
    els.feedView.classList.add('hidden');
    els.gridView.classList.remove('hidden');
    document.body.style.overflow = '';
  }

  if (!skipRender) doRender();
}

// ── DATA LOADING ──────────────────────────────────────────────────────────────
async function fetchData(force = false) {
  setProgress(20);
  els.errorBanner.classList.add('hidden');
  els.offlineBanner.classList.add('hidden');
  els.skeletonWrap.classList.remove('hidden');
  els.gridView.classList.add('hidden');
  els.feedView.classList.add('hidden');

  const fetchOpts = force ? { cache: 'no-store' } : {};

  try {
    setProgress(50);
    const resp = await fetch(DATA_URL, fetchOpts);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('search_index.json is not an array');
    allItems = data;
    await writeCache(data);
    els.liveDot.className = 'live-dot';
    els.cacheStatus.textContent = 'Live';
    els.offlineBanner.classList.add('hidden');
  } catch (err) {
    const cached = await readCache();
    if (cached && cached.length) {
      allItems = cached;
      els.liveDot.className = 'live-dot warn';
      els.cacheStatus.textContent = 'Cached';
      els.offlineBanner.classList.remove('hidden');
    } else {
      els.errorMsg.innerHTML = `<strong>Could not load archive.</strong> ${escHtml(err.message)}<br>
        Make sure <code>archive/search/search_index.json</code> exists and GitHub Pages is active.`;
      els.errorBanner.classList.remove('hidden');
      els.skeletonWrap.classList.add('hidden');
      setProgress(0);
      return;
    }
  }

  setProgress(80);
  populateAuthors();
  restoreState();
  renderRecent();
  setMode(currentMode, false);

  els.skeletonWrap.classList.add('hidden');
  if (currentMode === 'grid') els.gridView.classList.remove('hidden');
  else                        els.feedView.classList.remove('hidden');

  setProgress(0);
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
function wireEvents() {
  els.searchInput.addEventListener('input', () => {
    els.searchClear.classList.toggle('show', !!els.searchInput.value);
    debouncedRender();
  });

  els.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      saveRecent(els.searchInput.value);
      doRender();
    }
    if (e.key === 'Escape') {
      els.searchInput.value = '';
      els.searchClear.classList.remove('show');
      doRender();
    }
  });

  els.searchClear.addEventListener('click', () => {
    els.searchInput.value = '';
    els.searchClear.classList.remove('show');
    doRender();
    els.searchInput.focus();
  });

  els.authorFilter.addEventListener('change', () => doRender());
  els.sortSelect.addEventListener('change',   () => doRender());
  els.dateFilter.addEventListener('change',   () => doRender());

  els.gridModeTab.addEventListener('click', () => setMode('grid'));
  els.feedModeTab.addEventListener('click', () => setMode('feed'));

  els.reloadBtn.addEventListener('click', () => fetchData(true));
  els.clearBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    els.searchClear.classList.remove('show');
    els.authorFilter.value = '';
    els.sortSelect.value = 'likes';
    els.dateFilter.value = '';
    activeHashtag = '';
    doRender();
  });

  // Feed scroll → virtual render
  els.feedView.addEventListener('scroll', scheduleFeedRender, { passive: true });
  els.feedView.addEventListener('resize', scheduleFeedRender, { passive: true });

  // Grid scroll → back-to-top
  window.addEventListener('scroll', () => {
    $('backTop').classList.toggle('hidden', window.scrollY < 600);
  }, { passive: true });

  $('backTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  $('surpriseBtn').addEventListener('click', surpriseMe);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== els.searchInput) {
      e.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
    }
  });

  // Online/offline
  window.addEventListener('online',  () => {
    els.offlineBanner.classList.add('hidden');
    els.liveDot.className = 'live-dot';
    els.cacheStatus.textContent = 'Online';
  });
  window.addEventListener('offline', () => {
    els.offlineBanner.classList.remove('hidden');
    els.liveDot.className = 'live-dot warn';
    els.cacheStatus.textContent = 'Offline';
  });
}

// ── SERVICE WORKER ────────────────────────────────────────────────────────────
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ── INIT ─────────────────────────────────────────────────────────────────────
wireEvents();
registerSW();
fetchData(false);
