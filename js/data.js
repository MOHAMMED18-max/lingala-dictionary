// data.js
// Pure helper functions for the Lingala Dictionary website.
// These work on the JSON loaded from /data/processed/dictionary.json.
// Exposed globally as `LD` so app.js can use them.

const LD = (function () {
  // Remove accents/diacritics (so "motó" and "moto" match) and lower-case.
  function normalize(s) {
    return (s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  // Wikipedia "maintenance" categories are noise; hidden from the UI but
  // the raw data still contains them. We never invent categories.
  const META = /^(Pages with |Lingala entries with incorrect language header)/;
  function isMeta(c) {
    return META.test(c || '');
  }

  // One lower-cased string used for fast accent-insensitive search.
  function searchText(w) {
    return (
      normalize(w.lingala) + ' ' +
      normalize((w.english || []).join(' ')) + ' ' +
      normalize((w.french || []).join(' '))
    );
  }

  // Rank how well a word matches a normalized query (higher = better).
  // Exact Lingala match > prefix > substring; English meanings also ranked.
  function score(w, qn) {
    const ln = w.lingala_normalized || normalize(w.lingala);
    let s = 0;
    if (ln === qn) s = 100;
    else if (ln.startsWith(qn)) s = 85;
    else if (ln.includes(qn)) s = 55;

    for (const e of (w.english || [])) {
      const en = normalize(e);
      if (en === qn) s = Math.max(s, 92);
      else if (en.startsWith(qn)) s = Math.max(s, 72);
      else if (en.includes(qn)) s = Math.max(s, 48);
    }
    for (const f of (w.french || [])) {
      const fn = normalize(f);
      if (fn.startsWith(qn)) s = Math.max(s, 70);
      else if (fn.includes(qn)) s = Math.max(s, 46);
    }
    return s;
  }

  // Ranked search within an optional base list.
  function searchWords(list, q) {
    const qn = normalize(q);
    if (!qn) return list.slice();
    const out = list.filter(w => w._search.indexOf(qn) !== -1);
    out.sort(
      (a, b) =>
        score(b, qn) - score(a, qn) ||
        a.lingala_normalized.localeCompare(b.lingala_normalized)
    );
    return out;
  }

  // Filter by starting letter and optional query. Returns a render-ready list.
  function filterList(list, opts) {
    opts = opts || {};
    const L = opts.letter && opts.letter !== 'all' ? opts.letter.toLowerCase() : null;
    let out = L
      ? list.filter(w => (w.lingala_normalized || normalize(w.lingala))[0] === L)
      : list.slice();
    if (opts.q) out = searchWords(out, opts.q);
    else out.sort((a, b) => a.lingala_normalized.localeCompare(b.lingala_normalized));
    return out;
  }

  // Count how many words belong to each (non-meta) category.
  function getCategories(list) {
    const m = new Map();
    for (const w of list) {
      for (const c of w.categories || []) {
        if (isMeta(c)) continue;
        m.set(c, (m.get(c) || 0) + 1);
      }
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  function getWordsByCategory(list, name) {
    return list.filter(w => (w.categories || []).includes(name));
  }

  return { normalize, isMeta, searchText, score, searchWords, filterList, getCategories, getWordsByCategory };
})();
