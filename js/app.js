// ============ 流璃 FlowGlass — 主程式 ============
import { t, setLang, getLang, detectLang, applyI18n } from './i18n.js';
import { putWallpaper, getWallpaper, getAllWallpapers, deleteWallpaper } from './db.js';
import { lunarInfo } from './lunar.js';
import { PRESETS, getPreset } from './presets.js';

/* ---------- 常數 ---------- */
const LS_SETTINGS = 'fg.settings.v1';
const LS_DOCK = 'fg.dock.v1';
const LS_NOTES = 'fg.notes.v1';
const LS_HISTORY = 'fg.history.v1';
const LS_SS_INDEX = 'fg.ssIndex';

const ENGINES = {
  google:     { name: 'Google',     badge: 'G',  url: 'https://www.google.com/search?q=' },
  bing:       { name: 'Bing',       badge: 'B',  url: 'https://www.bing.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', badge: 'D',  url: 'https://duckduckgo.com/?q=' },
  yahoo:      { name: 'Yahoo',      badge: 'Y!', url: 'https://search.yahoo.com/search?p=' },
  youtube:    { name: 'YouTube',    badge: '▶',  url: 'https://www.youtube.com/results?search_query=' },
  wikipedia:  { name: 'Wikipedia',  badge: 'W',  url: null }, // 依語言決定
};

const DEFAULT_DOCK = [
  { id: 'd1', title: 'YouTube',  url: 'https://www.youtube.com' },
  { id: 'd2', title: 'GitHub',   url: 'https://github.com' },
  { id: 'd3', title: 'Gmail',    url: 'https://mail.google.com' },
  { id: 'd4', title: '維基百科', url: 'https://zh.wikipedia.org' },
];

// 「新增捷徑」視窗裡的常用服務清單(點一下加入,自己選)
const PRESET_SITES = [
  { title: '雲端硬碟',    url: 'https://drive.google.com' },
  { title: 'Google 地圖', url: 'https://maps.google.com' },
  { title: 'Google 翻譯', url: 'https://translate.google.com' },
  { title: 'Google 日曆', url: 'https://calendar.google.com' },
  { title: 'Google 相簿', url: 'https://photos.google.com' },
  { title: 'Google 文件', url: 'https://docs.google.com' },
  { title: 'Google Keep', url: 'https://keep.google.com' },
  { title: 'Google Meet', url: 'https://meet.google.com' },
  { title: 'Gmail',       url: 'https://mail.google.com' },
  { title: 'YouTube',     url: 'https://www.youtube.com' },
  { title: 'GitHub',      url: 'https://github.com' },
  { title: '維基百科',    url: 'https://zh.wikipedia.org' },
];

const DEFAULTS = {
  lang: null,
  glass: { blur: 18, opacity: 14, refract: 60, edge: true, parallax: true, entrance: true },
  theme: { auto: true, accent: '#7ab8ff' },
  wallpaper: {
    kind: 'preset', presetId: 'aurora', customId: null, dim: 18,
    slideshow: { on: false, mode: 'newtab', minutes: 10 },
  },
  widgets: {
    clock:    { on: true, seconds: false, h24: true, lunar: true },
    greeting: { on: true, name: '大和' },
    search:   { on: true, engine: 'google', history: true },
    dock:     { on: true },
    notes:    { on: false },
    pomo:     { on: true, work: 25, rest: 5 },
  },
  layout: {},
};

/* ---------- 工具 ---------- */
const $ = id => document.getElementById(id);

function deepMerge(base, over) {
  if (over === undefined || over === null) return structuredClone(base);
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return over;
  const out = {};
  for (const k of new Set([...Object.keys(base), ...Object.keys(over)])) {
    out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

const saveJSON = (key, v) => localStorage.setItem(key, JSON.stringify(v));

let saveTimer = null;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveJSON(LS_SETTINGS, S), 250);
}

function debounce(fn, ms) {
  let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); };
}

function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [122, 184, 255];
}

/* ---------- 狀態 ---------- */
const S = deepMerge(DEFAULTS, loadJSON(LS_SETTINGS, {}));
let dock = loadJSON(LS_DOCK, null) ?? structuredClone(DEFAULT_DOCK);
// v1.1 曾自動補入 Google 服務,現改為自選制:把當時自動加的項目收回
if (localStorage.getItem('fg.dockDefaultsV2')) {
  dock = dock.filter(x => !String(x.id).startsWith('v2d'));
  localStorage.removeItem('fg.dockDefaultsV2');
  saveJSON(LS_DOCK, dock);
}
let history = loadJSON(LS_HISTORY, []);
let library = [];           // IndexedDB 桌布清單
let currentObjectUrl = null;
let ssTimer = null;

/* ============================================================
   玻璃 / 主題
   ============================================================ */
function applyGlass() {
  const g = S.glass;
  const root = document.documentElement.style;
  root.setProperty('--blur', g.blur + 'px');
  root.setProperty('--glass-a', (g.opacity / 100).toFixed(3));
  document.body.classList.toggle('edge', g.edge);
  document.body.classList.toggle('no-parallax', !g.parallax);
  document.body.classList.toggle('entrance', g.entrance);
  // 折射:0 = 關閉 SVG 鏈,退回純 CSS blur
  document.body.classList.toggle('refract', g.refract > 0);
  $('fg-disp').setAttribute('scale', String(g.refract));
  $('fg-blur').setAttribute('stdDeviation', String(Math.max(0.01, g.blur * 0.75)));
}

function applyAccent(hex) {
  const [r, g, b] = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty('--accent', hex);
  root.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, .35)`);
}

function setTextTone(bright) {
  document.body.classList.toggle('dark-text', !!bright);
}

// 從畫面元素取主色與亮度
function sampleColor(el) {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(el, 0, 0, 48, 48);
    const { data } = ctx.getImageData(0, 0, 48, 48);
    const buckets = new Array(24).fill(0);
    const bucketRGB = Array.from({ length: 24 }, () => [0, 0, 0, 0]);
    let luma = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      if (sat < 0.18 || mx < 40 || mx > 245) continue;
      let h;
      const d = mx - mn;
      if (d === 0) h = 0;
      else if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = Math.round(((h * 60) + 360) % 360);
      const bi = Math.floor(h / 15);
      const w = sat * sat;
      buckets[bi] += w;
      bucketRGB[bi][0] += r * w; bucketRGB[bi][1] += g * w;
      bucketRGB[bi][2] += b * w; bucketRGB[bi][3] += w;
    }
    luma /= data.length / 4;
    let best = -1, bi = 0;
    buckets.forEach((v, i) => { if (v > best) { best = v; bi = i; } });
    let accent = null;
    if (best > 0.5) {
      const [r, g, b, w] = bucketRGB[bi];
      // 拉高亮度做成柔和主題色
      const rr = Math.min(255, Math.round(r / w * 0.6 + 110));
      const gg = Math.min(255, Math.round(g / w * 0.6 + 110));
      const bb = Math.min(255, Math.round(b / w * 0.6 + 110));
      accent = '#' + [rr, gg, bb].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    return { accent, bright: luma > 165 };
  } catch {
    return { accent: null, bright: false };
  }
}

function autoColorFromCurrent() {
  const wp = S.wallpaper;
  if (wp.kind === 'preset') {
    const p = getPreset(wp.presetId);
    if (S.theme.auto) applyAccent(p.accent);
    setTextTone(p.bright);
    return;
  }
  const img = $('wp-img'), vid = $('wp-video');
  const el = !img.hidden ? img : (!vid.hidden ? vid : null);
  if (!el) return;
  const run = () => {
    const { accent, bright } = sampleColor(el);
    if (S.theme.auto && accent) applyAccent(accent);
    setTextTone(bright);
  };
  if (el === img) { img.complete ? run() : (img.onload = run); }
  else { vid.readyState >= 2 ? run() : vid.addEventListener('loadeddata', run, { once: true }); }
}

function applyTheme() {
  if (!S.theme.auto) applyAccent(S.theme.accent);
  autoColorFromCurrent();
}

/* ============================================================
   桌布
   ============================================================ */
async function showWallpaper(fade = false) {
  const layer = $('wp-layer');
  const doSwap = async () => {
    const wp = S.wallpaper;
    const img = $('wp-img'), vid = $('wp-video'), pre = $('wp-preset');
    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
    vid.pause(); vid.removeAttribute('src'); vid.load();
    if (wp.kind === 'preset') {
      pre.style.background = getPreset(wp.presetId).css;
      pre.hidden = false; img.hidden = true; vid.hidden = true;
    } else {
      const rec = await getWallpaper(wp.customId);
      if (!rec) { // 桌布遺失 → 退回預設
        S.wallpaper.kind = 'preset'; saveSettings();
        return doSwap();
      }
      currentObjectUrl = URL.createObjectURL(rec.blob);
      if (rec.type.startsWith('video')) {
        vid.src = currentObjectUrl; vid.hidden = false; img.hidden = true; pre.hidden = true;
        vid.play().catch(() => {});
      } else {
        img.src = currentObjectUrl; img.hidden = false; vid.hidden = true; pre.hidden = true;
      }
    }
    applyTheme();
    markSelectedThumbs();
  };
  if (fade) {
    layer.classList.add('fading');
    setTimeout(async () => { await doSwap(); layer.classList.remove('fading'); }, 420);
  } else {
    await doSwap();
  }
}

function applyDim() {
  $('wp-dim').style.opacity = (S.wallpaper.dim / 100).toFixed(2);
}

/* ---- 上傳 ---- */
function makeImageThumb(blob) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = 280; c.height = 175;
      const s = Math.max(280 / im.width, 175 / im.height);
      const w = im.width * s, h = im.height * s;
      c.getContext('2d').drawImage(im, (280 - w) / 2, (175 - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    im.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    im.src = url;
  });
}

function makeVideoThumb(blob) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.muted = true; v.src = url;
    v.addEventListener('loadeddata', () => { v.currentTime = Math.min(0.5, v.duration / 2 || 0); });
    v.addEventListener('seeked', () => {
      const c = document.createElement('canvas');
      c.width = 280; c.height = 175;
      const s = Math.max(280 / v.videoWidth, 175 / v.videoHeight);
      const w = v.videoWidth * s, h = v.videoHeight * s;
      c.getContext('2d').drawImage(v, (280 - w) / 2, (175 - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    });
    v.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(null); });
  });
}

async function handleUpload(file) {
  if (!file) return;
  const isVideo = file.type.startsWith('video');
  const thumb = isVideo ? await makeVideoThumb(file) : await makeImageThumb(file);
  const rec = {
    id: Date.now().toString(36),
    name: file.name,
    type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    blob: file,
    thumb,
    added: Date.now(),
  };
  await putWallpaper(rec);
  library = await getAllWallpapers();
  S.wallpaper.kind = 'custom';
  S.wallpaper.customId = rec.id;
  saveSettings();
  renderLibrary();
  showWallpaper(true);
}

/* ---- 縮圖庫 ---- */
function renderPresets() {
  const grid = $('presetGrid');
  grid.textContent = '';
  for (const p of PRESETS) {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.dataset.preset = p.id;
    d.style.background = p.css;
    d.title = p.name;
    const nm = document.createElement('span');
    nm.className = 'th-name'; nm.textContent = p.name;
    d.appendChild(nm);
    d.addEventListener('click', () => {
      S.wallpaper.kind = 'preset';
      S.wallpaper.presetId = p.id;
      saveSettings();
      showWallpaper(true);
    });
    grid.appendChild(d);
  }
}

function renderLibrary() {
  const grid = $('libGrid');
  grid.textContent = '';
  for (const rec of library) {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.dataset.custom = rec.id;
    d.title = rec.name;
    if (rec.thumb) {
      const im = document.createElement('img');
      im.src = rec.thumb; d.appendChild(im);
    }
    if (rec.type.startsWith('video')) {
      const v = document.createElement('span');
      v.className = 'th-vid'; v.textContent = '▶';
      d.appendChild(v);
    }
    const del = document.createElement('button');
    del.className = 'th-del'; del.textContent = '✕';
    del.addEventListener('click', async e => {
      e.stopPropagation();
      await deleteWallpaper(rec.id);
      library = await getAllWallpapers();
      if (S.wallpaper.customId === rec.id) {
        S.wallpaper.kind = 'preset'; S.wallpaper.customId = null;
        saveSettings(); showWallpaper(true);
      }
      renderLibrary();
    });
    d.appendChild(del);
    d.addEventListener('click', () => {
      S.wallpaper.kind = 'custom';
      S.wallpaper.customId = rec.id;
      saveSettings();
      showWallpaper(true);
    });
    grid.appendChild(d);
  }
  markSelectedThumbs();
}

function markSelectedThumbs() {
  const wp = S.wallpaper;
  document.querySelectorAll('.thumb').forEach(el => {
    const sel = wp.kind === 'preset'
      ? el.dataset.preset === wp.presetId
      : el.dataset.custom === wp.customId;
    el.classList.toggle('selected', sel);
  });
}

/* ---- 輪播 ---- */
function slideshowPool() { return library.map(r => r.id); }

function advanceSlideshow(fade) {
  const pool = slideshowPool();
  if (pool.length < 1) return;
  let idx = parseInt(localStorage.getItem(LS_SS_INDEX) || '-1', 10);
  idx = (idx + 1) % pool.length;
  localStorage.setItem(LS_SS_INDEX, String(idx));
  S.wallpaper.kind = 'custom';
  S.wallpaper.customId = pool[idx];
  saveSettings();
  showWallpaper(fade);
}

function setupSlideshow(initial = false) {
  clearInterval(ssTimer); ssTimer = null;
  const ss = S.wallpaper.slideshow;
  if (!ss.on) return;
  if (ss.mode === 'newtab') {
    if (initial && slideshowPool().length > 0) advanceSlideshow(false);
  } else {
    ssTimer = setInterval(() => advanceSlideshow(true), Math.max(1, ss.minutes) * 60000);
  }
}

/* ============================================================
   視差
   ============================================================ */
function initParallax() {
  let raf = null;
  window.addEventListener('mousemove', e => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const px = (e.clientX / innerWidth - 0.5) * 2;
      const py = (e.clientY / innerHeight - 0.5) * 2;
      const root = document.documentElement.style;
      root.setProperty('--px', px.toFixed(3));
      root.setProperty('--py', py.toFixed(3));
    });
  });
}

/* ============================================================
   拖拉佈局
   ============================================================ */
function applyLayout() {
  for (const [id, pos] of Object.entries(S.layout)) {
    const w = $(id);
    if (!w) continue;
    w.classList.add('placed');
    w.style.left = pos.x + '%';
    w.style.top = pos.y + '%';
    w.style.right = 'auto';
  }
}

function initDrag() {
  document.querySelectorAll('.drag-handle').forEach(handle => {
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      const w = handle.closest('.widget');
      const rect = w.getBoundingClientRect();
      w.classList.add('placed');
      w.style.right = 'auto';
      w.style.left = rect.left + 'px';
      w.style.top = rect.top + 'px';
      document.body.classList.add('dragging');
      const ox = e.clientX - rect.left, oy = e.clientY - rect.top;

      const move = ev => {
        const x = Math.min(Math.max(ev.clientX - ox, 4), innerWidth - rect.width - 4);
        const y = Math.min(Math.max(ev.clientY - oy, 4), innerHeight - rect.height - 4);
        w.style.left = x + 'px';
        w.style.top = y + 'px';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.classList.remove('dragging');
        const r = w.getBoundingClientRect();
        S.layout[w.id] = {
          x: +(r.left / innerWidth * 100).toFixed(2),
          y: +(r.top / innerHeight * 100).toFixed(2),
        };
        w.style.left = S.layout[w.id].x + '%';
        w.style.top = S.layout[w.id].y + '%';
        saveSettings();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  });
}

function resetLayout() {
  S.layout = {};
  saveSettings();
  document.querySelectorAll('.widget').forEach(w => {
    w.classList.remove('placed');
    w.style.left = w.style.top = w.style.right = '';
  });
}

/* ============================================================
   時鐘 / 問候
   ============================================================ */
let lastLunarDay = null;

function tickClock() {
  const now = new Date();
  const c = S.widgets.clock;
  const locale = getLang() === 'zh_TW' ? 'zh-Hant-TW' : 'en-US';
  const opts = { hour: '2-digit', minute: '2-digit', hour12: !c.h24 };
  if (c.seconds) opts.second = '2-digit';
  $('clockTime').textContent = new Intl.DateTimeFormat(locale, opts).format(now);
  $('clockDate').textContent = new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(now);

  const lunarEl = $('clockLunar');
  if (c.lunar) {
    if (lastLunarDay !== now.getDate() || !lunarEl.textContent) {
      lastLunarDay = now.getDate();
      const { text, festival } = lunarInfo(now);
      lunarEl.textContent = text;
      if (festival) {
        const f = document.createElement('span');
        f.className = 'festival'; f.textContent = festival;
        lunarEl.appendChild(f);
      }
    }
  } else {
    lunarEl.textContent = '';
    lastLunarDay = null;
  }
}

function updateGreeting() {
  const h = new Date().getHours();
  const key = h >= 5 && h < 11 ? 'greet.morning'
            : h >= 11 && h < 18 ? 'greet.noon'
            : h >= 18 && h < 23 ? 'greet.evening'
            : 'greet.night';
  const name = (S.widgets.greeting.name || '').trim();
  const sep = getLang() === 'zh_TW' ? ',' : ', ';
  $('greetingText').textContent = name ? t(key) + sep + name : t(key);
}

/* ============================================================
   搜尋
   ============================================================ */
let activeSuggest = -1;

function engineUrl() {
  const id = S.widgets.search.engine;
  if (id === 'wikipedia') {
    return getLang() === 'zh_TW'
      ? 'https://zh.wikipedia.org/w/index.php?search='
      : 'https://en.wikipedia.org/w/index.php?search=';
  }
  return ENGINES[id]?.url || ENGINES.google.url;
}

function updateEngineBtn() {
  const e = ENGINES[S.widgets.search.engine] || ENGINES.google;
  const btn = $('engineBtn');
  btn.textContent = e.badge;
  btn.title = e.name;
}

function renderEngineMenu() {
  const ul = $('engineMenu');
  ul.textContent = '';
  for (const [id, e] of Object.entries(ENGINES)) {
    const li = document.createElement('li');
    const b = document.createElement('span');
    b.className = 'badge'; b.textContent = e.badge;
    li.appendChild(b);
    li.appendChild(document.createTextNode(e.name));
    li.addEventListener('click', () => {
      S.widgets.search.engine = id;
      saveSettings();
      updateEngineBtn();
      ul.classList.add('hidden');
      $('searchInput').focus();
    });
    ul.appendChild(li);
  }
}

function doSearch(q) {
  q = q.trim();
  if (!q) return;
  if (S.widgets.search.history) {
    history = [q, ...history.filter(x => x !== q)].slice(0, 60);
    saveJSON(LS_HISTORY, history);
  }
  location.href = engineUrl() + encodeURIComponent(q);
}

function renderSuggests() {
  const ul = $('suggestList');
  const q = $('searchInput').value.trim().toLowerCase();
  if (!S.widgets.search.history || history.length === 0) {
    ul.classList.add('hidden'); return;
  }
  let items;
  if (!q) {
    items = history.slice(0, 8);
  } else {
    const starts = history.filter(h => h.toLowerCase().startsWith(q));
    const incl = history.filter(h => !h.toLowerCase().startsWith(q) && h.toLowerCase().includes(q));
    items = [...starts, ...incl].slice(0, 8);
  }
  ul.textContent = '';
  activeSuggest = -1;
  if (items.length === 0) { ul.classList.add('hidden'); return; }
  items.forEach(text => {
    const li = document.createElement('li');
    const ico = document.createElement('span');
    ico.className = 'hist-ico'; ico.textContent = '↻';
    li.appendChild(ico);
    li.appendChild(document.createTextNode(text));
    li.addEventListener('mousedown', e => { e.preventDefault(); doSearch(text); });
    ul.appendChild(li);
  });
  ul.classList.remove('hidden');
}

function initSearch() {
  const input = $('searchInput');
  const ul = $('suggestList');
  renderEngineMenu();
  updateEngineBtn();

  $('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const lis = ul.querySelectorAll('li');
    if (activeSuggest >= 0 && lis[activeSuggest]) {
      doSearch(lis[activeSuggest].textContent.slice(1));
    } else {
      doSearch(input.value);
    }
  });

  $('engineBtn').addEventListener('click', e => {
    e.stopPropagation();
    $('engineMenu').classList.toggle('hidden');
    ul.classList.add('hidden');
  });

  input.addEventListener('input', renderSuggests);
  input.addEventListener('focus', renderSuggests);
  input.addEventListener('blur', () => setTimeout(() => ul.classList.add('hidden'), 140));
  input.addEventListener('keydown', e => {
    const lis = ul.querySelectorAll('li');
    if (ul.classList.contains('hidden') || lis.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      activeSuggest = e.key === 'ArrowDown'
        ? (activeSuggest + 1) % lis.length
        : (activeSuggest - 1 + lis.length) % lis.length;
      lis.forEach((li, i) => li.classList.toggle('active', i === activeSuggest));
    } else if (e.key === 'Escape') {
      ul.classList.add('hidden');
      activeSuggest = -1;
    }
  });

  document.addEventListener('click', () => {
    $('engineMenu').classList.add('hidden');
  });
}

/* ============================================================
   Dock
   ============================================================ */
let modalEditId = null;

function faviconUrl(u) {
  return '/_favicon/?pageUrl=' + encodeURIComponent(u) + '&size=64';
}

function renderDock() {
  const grid = $('dockGrid');
  grid.textContent = '';
  for (const item of dock) {
    const d = document.createElement('div');
    d.className = 'dock-item';
    d.title = item.url;

    const ico = document.createElement('div');
    ico.className = 'dock-ico';
    const im = document.createElement('img');
    im.src = faviconUrl(item.url);
    im.alt = '';
    im.addEventListener('error', () => {
      const mono = document.createElement('div');
      mono.className = 'mono';
      mono.textContent = (item.title || '?').slice(0, 1).toUpperCase();
      ico.textContent = '';
      ico.appendChild(mono);
    });
    ico.appendChild(im);

    const label = document.createElement('div');
    label.className = 'dock-label';
    label.textContent = item.title;

    const del = document.createElement('button');
    del.className = 'it-btn it-del'; del.textContent = '✕';
    del.addEventListener('click', e => {
      e.stopPropagation();
      dock = dock.filter(x => x.id !== item.id);
      saveJSON(LS_DOCK, dock);
      renderDock();
    });

    const edit = document.createElement('button');
    edit.className = 'it-btn it-edit'; edit.textContent = '✎';
    edit.addEventListener('click', e => {
      e.stopPropagation();
      openModal(item);
    });

    d.append(ico, label, del, edit);
    d.addEventListener('click', () => { location.href = item.url; });
    grid.appendChild(d);
  }
  // 新增鈕
  const add = document.createElement('div');
  add.className = 'dock-item dock-add';
  add.title = t('dock.add');
  const ico = document.createElement('div');
  ico.className = 'dock-ico'; ico.textContent = '+';
  const label = document.createElement('div');
  label.className = 'dock-label'; label.textContent = t('dock.add');
  add.append(ico, label);
  add.addEventListener('click', () => openModal(null));
  grid.appendChild(add);
}

const normUrl = u => u.replace(/\/+$/, '').toLowerCase();

function renderSuggestChips() {
  const wrap = $('suggestGrid');
  wrap.textContent = '';
  const have = new Set(dock.map(x => normUrl(x.url)));
  for (const p of PRESET_SITES) {
    if (have.has(normUrl(p.url))) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sug-chip';
    const im = document.createElement('img');
    im.src = faviconUrl(p.url);
    im.alt = '';
    im.addEventListener('error', () => im.remove());
    b.appendChild(im);
    b.appendChild(document.createTextNode(p.title));
    b.addEventListener('click', () => {
      dock.push({ id: Date.now().toString(36), title: p.title, url: p.url });
      saveJSON(LS_DOCK, dock);
      renderDock();
      renderSuggestChips();
    });
    wrap.appendChild(b);
  }
  // 編輯模式或全數已加入時隱藏
  $('suggestWrap').classList.toggle('hidden', modalEditId !== null || wrap.children.length === 0);
}

function openModal(item) {
  modalEditId = item ? item.id : null;
  $('modalTitle').textContent = t(item ? 'dock.edit' : 'dock.add');
  $('modalName').value = item ? item.title : '';
  $('modalUrl').value = item ? item.url : '';
  renderSuggestChips();
  $('modalBackdrop').classList.remove('hidden');
  $('modalName').focus();
}

function closeModal() {
  $('modalBackdrop').classList.add('hidden');
}

function initModal() {
  $('modalCancel').addEventListener('click', closeModal);
  $('modalBackdrop').addEventListener('click', e => {
    if (e.target === $('modalBackdrop')) closeModal();
  });
  $('modalOk').addEventListener('click', () => {
    const title = $('modalName').value.trim();
    let url = $('modalUrl').value.trim();
    if (!url) return;
    if (!/^[a-z]+:\/\//i.test(url)) url = 'https://' + url;
    if (modalEditId) {
      const it = dock.find(x => x.id === modalEditId);
      if (it) { it.title = title || new URL(url).hostname; it.url = url; }
    } else {
      dock.push({ id: Date.now().toString(36), title: title || new URL(url).hostname, url });
    }
    saveJSON(LS_DOCK, dock);
    renderDock();
    closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('modalBackdrop').classList.contains('hidden')) closeModal();
  });
}

/* ============================================================
   筆記
   ============================================================ */
function initNotes() {
  const area = $('notesArea');
  area.value = localStorage.getItem(LS_NOTES) || '';
  area.addEventListener('input', debounce(() => {
    localStorage.setItem(LS_NOTES, area.value);
  }, 400));
}

/* ============================================================
   番茄鐘
   ============================================================ */
const RING_C = 2 * Math.PI * 52;
const pomo = { phase: 'work', running: false, remaining: 0, total: 0, timer: null };

function pomoDuration(phase) {
  const w = S.widgets.pomo;
  return (phase === 'work' ? w.work : w.rest) * 60;
}

function pomoRender() {
  const m = Math.floor(pomo.remaining / 60);
  const s = Math.floor(pomo.remaining % 60);
  $('pomoTime').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  $('pomoPhase').textContent = t(pomo.phase === 'work' ? 'pomo.work' : 'pomo.rest');
  const ratio = pomo.total > 0 ? pomo.remaining / pomo.total : 1;
  $('pomoRing').style.strokeDashoffset = String(RING_C * (1 - ratio));
  $('pomoStart').textContent = t(pomo.running ? 'pomo.pause' : 'pomo.start');
}

function pomoBeep() {
  try {
    const ctx = new AudioContext();
    [880, 660].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.16);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* 忽略 */ }
}

function pomoTick() {
  pomo.remaining = Math.max(0, (pomo.endAt - Date.now()) / 1000);
  if (pomo.remaining <= 0) {
    pomoBeep();
    pomo.phase = pomo.phase === 'work' ? 'rest' : 'work';
    pomo.total = pomo.remaining = pomoDuration(pomo.phase);
    pomo.endAt = Date.now() + pomo.remaining * 1000;
  }
  pomoRender();
}

function pomoReset() {
  clearInterval(pomo.timer); pomo.timer = null;
  pomo.running = false;
  pomo.phase = 'work';
  pomo.total = pomo.remaining = pomoDuration('work');
  pomoRender();
}

function initPomo() {
  $('pomoWork').value = S.widgets.pomo.work;
  $('pomoRest').value = S.widgets.pomo.rest;
  pomoReset();

  $('pomoStart').addEventListener('click', () => {
    if (pomo.running) {
      clearInterval(pomo.timer); pomo.timer = null;
      pomo.running = false;
    } else {
      pomo.running = true;
      pomo.endAt = Date.now() + pomo.remaining * 1000;
      pomo.timer = setInterval(pomoTick, 250);
    }
    pomoRender();
  });

  $('pomoReset').addEventListener('click', pomoReset);

  const onConf = () => {
    S.widgets.pomo.work = Math.max(1, parseInt($('pomoWork').value, 10) || 25);
    S.widgets.pomo.rest = Math.max(1, parseInt($('pomoRest').value, 10) || 5);
    saveSettings();
    if (!pomo.running) pomoReset();
  };
  $('pomoWork').addEventListener('change', onConf);
  $('pomoRest').addEventListener('change', onConf);
}

/* ============================================================
   元件顯示開關
   ============================================================ */
const WIDGET_EL = {
  clock: 'w-clock', greeting: 'w-greeting', search: 'w-search',
  dock: 'w-dock', notes: 'w-notes', pomo: 'w-pomo',
};

function applyWidgetVisibility() {
  for (const [key, id] of Object.entries(WIDGET_EL)) {
    $(id).classList.toggle('hidden-w', !S.widgets[key].on);
  }
}

/* ============================================================
   設定面板
   ============================================================ */
function reflectSettings() {
  $('blurSlider').value = S.glass.blur;
  $('opacitySlider').value = S.glass.opacity;
  $('refractSlider').value = S.glass.refract;
  $('edgeToggle').checked = S.glass.edge;
  $('parallaxToggle').checked = S.glass.parallax;
  $('entranceToggle').checked = S.glass.entrance;
  $('autoColorToggle').checked = S.theme.auto;
  $('accentPicker').value = S.theme.accent;
  $('dimSlider').value = S.wallpaper.dim;
  $('ssOn').checked = S.wallpaper.slideshow.on;
  $('ssMode').value = S.wallpaper.slideshow.mode;
  $('ssMinutes').value = S.wallpaper.slideshow.minutes;
  $('tglClock').checked = S.widgets.clock.on;
  $('tglSeconds').checked = S.widgets.clock.seconds;
  $('tglH24').checked = S.widgets.clock.h24;
  $('tglLunar').checked = S.widgets.clock.lunar;
  $('tglGreeting').checked = S.widgets.greeting.on;
  $('nameInput').value = S.widgets.greeting.name;
  $('tglSearch').checked = S.widgets.search.on;
  $('tglHistory').checked = S.widgets.search.history;
  $('tglDock').checked = S.widgets.dock.on;
  $('tglNotes').checked = S.widgets.notes.on;
  $('tglPomo').checked = S.widgets.pomo.on;
  $('langSelect').value = getLang();
}

function bind(id, event, fn) { $(id).addEventListener(event, fn); }

function initSettingsPanel() {
  bind('settingsBtn', 'click', () => {
    $('settingsPanel').classList.toggle('hidden');
  });
  bind('settingsClose', 'click', () => $('settingsPanel').classList.add('hidden'));

  // 玻璃
  bind('blurSlider', 'input', e => { S.glass.blur = +e.target.value; applyGlass(); saveSettings(); });
  bind('opacitySlider', 'input', e => { S.glass.opacity = +e.target.value; applyGlass(); saveSettings(); });
  bind('refractSlider', 'input', e => { S.glass.refract = +e.target.value; applyGlass(); saveSettings(); });
  bind('edgeToggle', 'change', e => { S.glass.edge = e.target.checked; applyGlass(); saveSettings(); });
  bind('parallaxToggle', 'change', e => { S.glass.parallax = e.target.checked; applyGlass(); saveSettings(); });
  bind('entranceToggle', 'change', e => { S.glass.entrance = e.target.checked; applyGlass(); saveSettings(); });

  // 主題
  bind('autoColorToggle', 'change', e => {
    S.theme.auto = e.target.checked;
    if (!S.theme.auto) applyAccent(S.theme.accent);
    else autoColorFromCurrent();
    saveSettings();
  });
  bind('accentPicker', 'input', e => {
    S.theme.accent = e.target.value;
    if (!S.theme.auto) applyAccent(S.theme.accent);
    saveSettings();
  });

  // 桌布
  bind('wpUpload', 'change', e => {
    handleUpload(e.target.files[0]);
    e.target.value = '';
  });
  bind('dimSlider', 'input', e => { S.wallpaper.dim = +e.target.value; applyDim(); saveSettings(); });
  bind('ssOn', 'change', e => {
    S.wallpaper.slideshow.on = e.target.checked;
    saveSettings(); setupSlideshow(false);
  });
  bind('ssMode', 'change', e => {
    S.wallpaper.slideshow.mode = e.target.value;
    saveSettings(); setupSlideshow(false);
  });
  bind('ssMinutes', 'change', e => {
    S.wallpaper.slideshow.minutes = Math.max(1, parseInt(e.target.value, 10) || 10);
    saveSettings(); setupSlideshow(false);
  });

  // 元件開關
  const wtoggle = (id, key, sub) => bind(id, 'change', e => {
    if (sub) S.widgets[key][sub] = e.target.checked;
    else S.widgets[key].on = e.target.checked;
    applyWidgetVisibility(); tickClock(); saveSettings();
  });
  wtoggle('tglClock', 'clock');
  wtoggle('tglSeconds', 'clock', 'seconds');
  wtoggle('tglH24', 'clock', 'h24');
  wtoggle('tglLunar', 'clock', 'lunar');
  wtoggle('tglGreeting', 'greeting');
  wtoggle('tglSearch', 'search');
  wtoggle('tglHistory', 'search', 'history');
  wtoggle('tglDock', 'dock');
  wtoggle('tglNotes', 'notes');
  wtoggle('tglPomo', 'pomo');

  bind('nameInput', 'input', e => {
    S.widgets.greeting.name = e.target.value;
    updateGreeting(); saveSettings();
  });
  bind('clearHistoryBtn', 'click', () => {
    history = []; saveJSON(LS_HISTORY, history);
  });

  // 版面 / 語言
  bind('resetLayoutBtn', 'click', resetLayout);
  bind('langSelect', 'change', e => {
    S.lang = e.target.value;
    setLang(S.lang);
    applyI18n();
    tickClock(); updateGreeting(); renderDock(); pomoRender();
    saveSettings();
  });
}

/* ============================================================
   啟動
   ============================================================ */
async function main() {
  // 語言
  setLang(S.lang || detectLang());
  S.lang = getLang();
  applyI18n();

  // 玻璃 / 主題 / 桌布
  applyGlass();
  if (!S.theme.auto) applyAccent(S.theme.accent);
  applyDim();
  library = await getAllWallpapers();
  setupSlideshow(true);      // newtab 模式會先轉一張
  await showWallpaper(false);

  // 元件
  applyWidgetVisibility();
  tickClock();
  setInterval(tickClock, 1000);
  updateGreeting();
  setInterval(updateGreeting, 60000);
  initSearch();
  renderDock();
  initModal();
  initNotes();
  initPomo();

  // 佈局 / 視差 / 面板
  applyLayout();
  initDrag();
  initParallax();
  renderPresets();
  renderLibrary();
  reflectSettings();
  initSettingsPanel();
}

main();
