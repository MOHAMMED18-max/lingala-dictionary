// app.js — Lingala Dictionary (Hippocrene source)
// GitHub Pages base path: must be /lingala-dictionary on GH Pages, "" on localhost
// This handles absolute paths for CSS/JS/data so the site works in both environments.
const BASE = (window.__BASE__ !== undefined) ? window.__BASE__ : (
  (location.hostname.endsWith('github.io') || location.pathname.startsWith('/lingala-dictionary')) ? '/lingala-dictionary' : ''
);
function withBase(p){ return BASE + p; }
function creditsHref(){ return withBase('/CREDITS.md'); }
const app = document.getElementById('app');
let DICT = [];
let SOURCES = [];

function esc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s){ return esc(s).replace(/'/g,'&#39;'); }

const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function initTheme(){
  const saved=localStorage.getItem('ld-theme');
  const prefersDark=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
}
function toggleTheme(){
  const next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ld-theme', next);
}
function closeMobileMenu(){ document.getElementById('navLinks').classList.remove('open'); }

function computeStats(){
  return {
    total: DICT.length,
    english: DICT.filter(w=>w.english && w.english.length).length,
    ipa: DICT.filter(w=>w.ipa).length,
    examples: DICT.filter(w=>w.examples && w.examples.length).length,
    categories: LD.getCategories(DICT).length,
  };
}
function wordOfTheDay(){
  const now=new Date();
  const start=new Date(now.getFullYear(),0,0);
  const dayOfYear=Math.floor((now-start)/86400000);
  return DICT[dayOfYear % DICT.length];
}
function getRandomWords(n){
  const out=[]; const used=new Set();
  if(!DICT.length) return out;
  let attempts=0;
  while(out.length<n && attempts<n*10){
    const idx=Math.floor(Math.random()*DICT.length);
    if(!used.has(idx)){ used.add(idx); out.push(DICT[idx]); }
    attempts++;
  }
  return out;
}
function highlight(text, query){
  if(!query) return esc(text);
  const q=LD.normalize(query);
  if(!q) return esc(text);
  const lower=text.toLowerCase();
  const norm=LD.normalize(text);
  // Simple case-insensitive highlight on original text
  const idx=lower.indexOf(q);
  // Use normalized for accent-insensitive
  const nIdx=norm.indexOf(q);
  const useIdx = nIdx!==-1 ? nIdx : idx;
  if(useIdx===-1) return esc(text);
  // For simplicity, highlight the exact query substring case-insensitive in original
  const re=new RegExp('('+query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');
  return esc(text).replace(re,'<span class="hl">$1</span>');
}

function buildCard(w, query){
  const showBadge = w.word_type && w.word_type !== 'unknown';
  const ling= query ? highlight(w.lingala, query) : esc(w.lingala);
  const meanText=(w.english||[]).join(' · ');
  const mean= query ? highlight(meanText, query) : esc(meanText);
  return `
    <a class="word-card" href="#/word/${escAttr(w.id)}">
      <div class="wc-top">
        <span class="wc-word">${ling}</span>
        ${showBadge ? `<span class="badge">${esc(w.word_type)}</span>` : ''}
      </div>
      <div class="wc-mean">${mean}</div>
      ${w.ipa ? `<div class="wc-foot"><span class="spk">🔊</span>${esc(w.ipa)}</div>` : ''}
    </a>`;
}
function buildAZ(active){
  const items=['all'].concat(LETTERS);
  return `<div class="az-bar">`+items.map(l=>{
    const label=l==='all'?'All':l;
    return `<button class="az-btn${l===active?' active':''}" data-letter="${l}">${label}</button>`;
  }).join('')+`</div>`;
}
function renderBrowse(target, opts){
  opts=opts||{};
  const CHUNK=60;
  const source=opts.baseList||DICT;
  const state={letter:opts.initialLetter||'all', q:'', rendered:0, list:[]};
  target.innerHTML=`
    ${opts.searchInputId ? '' : `
      <div class="search-wrap">
        <svg class="search-ic" viewBox="0 0 24 24" width="20" height="20"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/><line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="browseSearch" class="search-input" placeholder="Search Lingala words or English meanings..." />
      </div>`}
    <div id="azHost"></div>
    <div class="result-count" id="resultCount"></div>
    <div class="word-grid" id="wordGrid"></div>
    <div class="load-more-wrap"><button class="btn-load" id="loadMore">Load More</button></div>
  `;
  const grid=target.querySelector('#wordGrid');
  const countEl=target.querySelector('#resultCount');
  const loadMore=target.querySelector('#loadMore');
  const searchInput=opts.searchInputId ? document.getElementById(opts.searchInputId) : target.querySelector('#browseSearch');
  target.querySelector('#azHost').outerHTML=buildAZ(state.letter);
  const azBar=target.querySelector('.az-bar');
  azBar.querySelectorAll('.az-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.letter=btn.dataset.letter;
      azBar.querySelectorAll('.az-btn').forEach(x=>x.classList.toggle('active', x===btn));
      refresh();
    });
  });
  searchInput.addEventListener('input', ()=>{ state.q=searchInput.value; refresh(); });
  loadMore.addEventListener('click', ()=>{ state.rendered+=CHUNK; paintMore(); });
  function refresh(){
    state.list=LD.filterList(source, {q:state.q, letter:state.letter});
    state.rendered=CHUNK;
    countEl.textContent= state.list.length ? `${state.list.length.toLocaleString()} word${state.list.length===1?'':'s'}${state.q ? ` for “${state.q}”` : ''}` : 'No words found.';
    paintMore(true);
  }
  function paintMore(reset){
    if(reset) grid.innerHTML='';
    if(state.list.length===0){
      grid.innerHTML=`<div class="empty"><p>No words found for “${esc(state.q)}”.</p><p class="muted" style="margin-top:8px;font-weight:500">Try a different spelling, check A–Z, or browse all words.</p></div>`;
    } else {
      const slice=state.list.slice(state.rendered-CHUNK, state.rendered);
      grid.insertAdjacentHTML('beforeend', slice.map(w=>buildCard(w, state.q)).join(''));
    }
    loadMore.style.display= state.rendered < state.list.length ? 'inline-block' : 'none';
  }
  refresh();
}
function statCards(){
  const s=computeStats();
  const items=[
    [s.total,'Total words'],
    [s.english,'With English'],
    [s.ipa,'With pronunciation'],
    [s.examples,'With examples'],
  ];
  return `<div class="stats">`+items.map(([n,l])=>`
    <div class="stat-card">
      <div class="stat-num">${n.toLocaleString()}</div>
      <div class="stat-label">${l}</div>
    </div>`).join('')+`</div>`;
}
function renderHome(){
  const wotd=wordOfTheDay();
  const randoms=getRandomWords(6);
  app.innerHTML=`
    <section class="hero">
      <div class="hero-glow"></div>
      <div class="container hero-inner">
        <div class="hero-badge"><span></span> ${DICT.length.toLocaleString()} Lingala words • Live search</div>
        <h1 class="hero-title">Lingala Dictionary</h1>
        <p class="hero-sub">Discover Lingala words and their English meanings — fast, clean, and built from the complete Hippocrene Dictionary.</p>
        <div class="hero-search">
          <svg class="search-ic" viewBox="0 0 24 24" width="22" height="22"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/><line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input id="heroSearch" class="search-input" placeholder="Search Lingala or English — e.g., balabala, zamba, love" autocomplete="off" />
        </div>
        <div class="hero-hint">Search a <strong>Lingala</strong> word or <strong>English</strong> meaning — try “mbote”, “love”, or “kokoka”</div>
      </div>
    </section>
    <section class="container">
      ${statCards()}
      <p class="muted" style="text-align:center;margin-top:10px;font-size:13px;font-weight:600">Source: Hippocrene Lingala Dictionary & Phrasebook (2016) • ${DICT.length.toLocaleString()} entries • Phrasebook excluded</p>
    </section>
    <section class="container">
      <a class="wotd" href="#/word/${esc(wotd.id)}">
        <div class="wotd-tag">Word of the Day</div>
        <div class="wotd-word">${esc(wotd.lingala)}</div>
        <div class="wotd-mean">${esc((wotd.english||[]).join(' · '))}</div>
        ${wotd.word_type && wotd.word_type!=='unknown' ? `<div style="margin-top:8px"><span class="badge big">${esc(wotd.word_type)}</span></div>` : ''}
        ${wotd.ipa ? `<div class="wotd-ipa"><span class="spk">🔊</span>${esc(wotd.ipa)}</div>` : ''}
        ${(wotd.examples && wotd.examples.length) ? `<div class="wotd-ex">“${esc(wotd.examples[0].text)}” — ${esc(wotd.examples[0].translation)}</div>` : ''}
      </a>
    </section>
    <section class="container browse-section">
      <h2 class="section-title">Browse the Dictionary</h2>
      <div id="homeBrowse"></div>
    </section>
    <section class="container" style="padding-bottom:50px">
      <h2 class="section-title">Discover Random Words</h2>
      <div class="word-grid">
        ${randoms.map(w=>buildCard(w,'')).join('')}
      </div>
      <div style="text-align:center;margin-top:18px"><a href="#/dictionary" class="btn-load" style="text-decoration:none;display:inline-block">Explore all ${DICT.length.toLocaleString()} words →</a></div>
    </section>`;
  renderBrowse(document.getElementById('homeBrowse'), {searchInputId:'heroSearch'});
}
function renderDictionary(){
  app.innerHTML=`
    <section class="container page-head">
      <h1>Dictionary</h1>
      <p class="muted">${DICT.length.toLocaleString()} Lingala words from the complete Hippocrene Dictionary. Search or pick a letter.</p>
    </section>
    <section class="container">
      ${statCards()}
      <div id="dictBrowse"></div>
    </section>`;
  renderBrowse(document.getElementById('dictBrowse'), {});
}
function renderCategories(){
  const cats=LD.getCategories(DICT);
  app.innerHTML=`
    <section class="container page-head">
      <h1>A–Z & Categories</h1>
      <p class="muted">${cats.length} letter groups • ${DICT.length.toLocaleString()} words</p>
    </section>
    <section class="container">
      <div class="cat-grid">
        ${cats.map(c=>`
          <a class="cat-card" href="#/category/${encodeURIComponent(c.name)}">
            <span class="cat-name">${esc(c.name)}</span>
            <span class="cat-count">${c.count}</span>
          </a>`).join('')}
      </div>
    </section>`;
}
function renderCategory(name){
  const words=LD.getWordsByCategory(DICT, name);
  app.innerHTML=`
    <section class="container page-head">
      <a class="back" href="#/categories">← Categories</a>
      <h1>${esc(name)}</h1>
      <p class="muted">${words.length} word${words.length===1?'':'s'}</p>
    </section>
    <section class="container">
      <div id="catBrowse"></div>
    </section>`;
  renderBrowse(document.getElementById('catBrowse'), {baseList: words});
}
function renderAbout(){
  const src=SOURCES[0]||{};
  app.innerHTML=`
    <section class="container page-head"><h1>About</h1></section>
    <section class="container">
      <div class="about-card">
        <h2>What is Lingala Dictionary?</h2>
        <p>A premium, searchable Lingala–English dictionary built for students, travelers, and anyone learning Lingala. Every word is searchable, browsable A–Z, and linked to its correct detail page.</p>
        <h2>Where does the data come from?</h2>
        <p>From <strong>${esc(src.name || 'Mawadza & Matuka, Lingala Dictionary & Phrasebook, Hippocrene Books 2016')}</strong> via <code>lingen_djvu.txt</code>. This file is the <strong>only source of truth</strong>. Both <strong>Lingala–English</strong> (primary) and <strong>English–Lingala</strong> (inverted) sections were parsed — <strong>2336 unique headwords</strong> from <strong>3980 raw entries</strong>. Phrasebook was excluded. License: <strong>${esc(src.license || 'Copyrighted')}</strong>. See <a href="${creditsHref()}" target="_blank">CREDITS.md</a> for full attribution. Old Wiktionary data is no longer used and is kept only as backup.</p>
        <h2>How was it built?</h2>
        <p>OCR noise (page numbers, footers like “Lingala Dictionary & Phrasebook”, letter headers) was removed, wrapped lines were joined, entries were split by blank lines and by “/”, word types like <code>(n.)</code>, <code>(v.)</code> were extracted, and duplicates were merged by normalized Lingala + word type — preserving distinct meanings and distinct word types.</p>
        <h2>Search</h2>
        <p>Search works across <strong>Lingala</strong> and <strong>English</strong> at the same time. Try “balabala” (road), “zamba ya mokili” (nature), “asiranse ya bokonongonu bwa nzoto” (health insurance), or English “love”, “road”, “accelerator”. Matches are highlighted.</p>
        <h2>Principles</h2>
        <ul>
          <li>No translations are invented — everything comes from the book.</li>
          <li>Multi-word expressions like “bale ya kitunga” (basketball) are preserved.</li>
          <li>No old demo words remain — the site now shows 0% Wiktionary.</li>
          <li>Original <code>lingen_djvu.txt</code> is kept untouched in the project.</li>
        </ul>
      </div>
    </section>`;
}
function renderWord(id){
  const w=DICT.find(x=> String(x.id)===String(id));
  if(!w){
    app.innerHTML=`<section class="container"><p>Word not found.</p><a class="back" href="#/dictionary">← Dictionary</a></section>`;
    return;
  }
  const showBadge = w.word_type && w.word_type!=='unknown';
  const french = (w.french && w.french.length)
    ? `<div class="detail-block"><h3>French</h3><p>${w.french.map(esc).join(' · ')}</p></div>`
    : '';
  const examples = (w.examples && w.examples.length) ? `
    <div class="detail-block">
      <h3>Examples</h3>
      ${w.examples.map(e=>`<div class="example"><p class="ex-text">${esc(e.text)}</p><p class="ex-trans">${esc(e.translation)}</p></div>`).join('')}
    </div>` : '';
  const cats = (w.categories && w.categories.length)
    ? `<div class="detail-block"><h3>Categories</h3><div class="chips">${w.categories.filter(c=>!LD.isMeta(c)).map(c=>`<a class="chip" href="#/category/${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}</div></div>`
    : '';
  app.innerHTML=`
    <section class="container detail">
      <a class="back" href="#/dictionary">← Dictionary</a>
      <div class="detail-card">
        <div class="detail-head">
          <h1 class="detail-word">${esc(w.lingala)}</h1>
          ${showBadge ? `<span class="badge big">${esc(w.word_type)}</span>` : ''}
        </div>
        <p class="detail-mean">${esc((w.english||[]).join(' · '))}</p>
        ${w.ipa ? `<div class="detail-ipa"><span class="spk">🔊</span>${esc(w.ipa)}</div>` : ''}
        ${french}
        ${examples}
        ${cats}
        <div class="detail-block source">
          <h3>Source & License</h3>
          <p>${esc(w.source)}</p>
          <p class="muted">License: ${esc(w.source_license)}</p>
        </div>
      </div>
    </section>`;
}
function route(){
  const hash=location.hash||'#/';
  const parts=hash.replace(/^#\//,'').split('/');
  const base=parts[0]||'';
  closeMobileMenu();
  setActiveNav(base);
  if(base===''||base==='home') renderHome();
  else if(base==='dictionary') renderDictionary();
  else if(base==='categories') renderCategories();
  else if(base==='category') renderCategory(decodeURIComponent(parts[1]||''));
  else if(base==='about') renderAbout();
  else if(base==='word') renderWord(parts[1]);
  else renderHome();
  window.scrollTo(0,0);
  app.classList.remove('view-enter');
  void app.offsetWidth;
  app.classList.add('view-enter');
}
function setActiveNav(base){
  document.querySelectorAll('#navLinks a').forEach(a=>{
    const href=a.getAttribute('href')||'';
    const match=(base===''&&href==='#/')||(base!==''&&href==='#/'+base);
    a.classList.toggle('active', match);
  });
}
async function init(){
  initTheme();
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('navToggle').addEventListener('click', ()=>{
    document.getElementById('navLinks').classList.toggle('open');
  });
  app.innerHTML=`<div class="loading"><div class="spinner"></div><p>Loading dictionary…</p></div>`;
  try{
    const [dict, sources]=await Promise.all([
      fetch(withBase('/data/processed/dictionary.json')).then(r=>{ if(!r.ok) throw new Error('Failed to load '+r.url+' status '+r.status); return r.json(); }),
      fetch(withBase('/data/sources.json')).then(r=>{ if(!r.ok) throw new Error('Failed to load '+r.url+' status '+r.status); return r.json(); }),
    ]);
    DICT=dict;
    SOURCES=sources;
    DICT.forEach(w=>{ w._search=LD.searchText(w); });
  }catch(e){
    app.innerHTML=`<section class="container"><p>Could not load the dictionary data. Please run <code>npm start</code> and reload.</p><p class="muted">${esc(String(e))}</p></section>`;
    return;
  }
  window.addEventListener('hashchange', route);
  route();
}
init();
