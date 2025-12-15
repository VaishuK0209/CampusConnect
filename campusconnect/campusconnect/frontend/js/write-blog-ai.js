const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Store last grammar matches for applyAll
let _lastGrammarMatches = [];

async function doGrammar() {
  const ta = document.getElementById('blogContent');
  const txt = ta ? ta.value : '';
  const resEl = document.getElementById('aiResult');
  if (!resEl) return;
  resEl.innerHTML = 'Checking...';
  try {
    const resp = await fetch(`${API_BASE}/ai/grammar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt }) });
    if (!resp.ok) throw new Error('Grammar API failed');
    const data = await resp.json();
    if (!data || !data.matches || !data.matches.length) { resEl.innerHTML = '<div class="text-success">No issues found.</div>'; _lastGrammarMatches = []; return; }
    const matches = data.matches.slice(0, 50);
    _lastGrammarMatches = matches;
    const ul = document.createElement('ul'); ul.className = 'small';
    matches.forEach((m, idx) => {
      const li = document.createElement('li');
      const ctx = m.context && m.context.text ? escapeHtml(m.context.text) : '';
      const msg = escapeHtml(m.message || '');
      const repl = (m.replacements && m.replacements[0] && m.replacements[0].value) ? m.replacements[0].value : '';
      li.innerHTML = `<div><strong>${msg}</strong>${repl ? ` — suggestion: <em>${escapeHtml(repl)}</em>` : ''}</div><div class="text-muted">...${ctx}...</div>`;
      const btn = document.createElement('button'); btn.className = 'btn btn-sm btn-outline-primary ms-2'; btn.textContent = 'Apply';
      btn.addEventListener('click', () => applyGrammarSuggestion(m));
      li.appendChild(btn);
      ul.appendChild(li);
    });
    const applyAllBtn = document.createElement('button'); applyAllBtn.className = 'btn btn-sm btn-primary mt-2'; applyAllBtn.textContent = 'Apply All Suggestions';
    applyAllBtn.addEventListener('click', () => applyAllGrammarSuggestions(matches));
    resEl.innerHTML = ''; resEl.appendChild(ul); resEl.appendChild(applyAllBtn);
  } catch (err) { console.error(err); resEl.innerHTML = `<div class="text-danger">${escapeHtml(err.message || 'Error')}</div>`; }
}

function applyGrammarSuggestion(match) {
  try {
    const ta = document.getElementById('blogContent'); if (!ta) return;
    let text = ta.value || '';
    const off = typeof match.offset === 'number' ? match.offset : (match.context && match.context.offset ? match.context.offset : null);
    const len = typeof match.length === 'number' ? match.length : (match.context && match.context.length ? match.context.length : null);
    const replacement = (match.replacements && match.replacements[0] && match.replacements[0].value) ? match.replacements[0].value : '';
    if (off === null || len === null) return;
    const safeOff = Math.max(0, Math.min(text.length, off));
    const safeLen = Math.max(0, Math.min(text.length - safeOff, len));
    text = text.slice(0, safeOff) + replacement + text.slice(safeOff + safeLen);
    ta.value = text;
  } catch (e) { console.error('applyGrammarSuggestion', e); }
}

function applyAllGrammarSuggestions(matches) {
  try {
    const ta = document.getElementById('blogContent'); if (!ta) return;
    let text = ta.value || '';
    const withOffsets = matches.map(m => ({ m, off: typeof m.offset === 'number' ? m.offset : (m.context && m.context.offset ? m.context.offset : 0), len: typeof m.length === 'number' ? m.length : (m.context && m.context.length ? m.context.length : 0) }));
    withOffsets.sort((a,b) => b.off - a.off);
    for (const item of withOffsets) {
      const m = item.m; const off = item.off; const len = item.len;
      const repl = (m.replacements && m.replacements[0] && m.replacements[0].value) ? m.replacements[0].value : '';
      const safeOff = Math.max(0, Math.min(text.length, off));
      const safeLen = Math.max(0, Math.min(text.length - safeOff, len));
      text = text.slice(0, safeOff) + repl + text.slice(safeOff + safeLen);
    }
    ta.value = text;
  } catch (e) { console.error('applyAllGrammarSuggestions', e); }
}

async function doSummary() {
  const ta = document.getElementById('blogContent'); const txt = ta ? ta.value : '';
  const resEl = document.getElementById('aiResult'); if (!resEl) return;
  resEl.innerHTML = 'Summarizing...';
  try {
    const resp = await fetch(`${API_BASE}/ai/summary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt }) });
    if (!resp.ok) throw new Error('Summary API failed');
    const data = await resp.json();
    const s = data.summary || '';
    const card = document.createElement('div'); card.className = 'card p-2';
    const title = document.createElement('strong'); title.textContent = 'Summary';
    const p = document.createElement('p'); p.className = 'mb-0'; p.textContent = s;
    const insertBtn = document.createElement('button'); insertBtn.className = 'btn btn-sm btn-outline-primary mt-2 me-2'; insertBtn.textContent = 'Insert Summary';
    insertBtn.addEventListener('click', () => {
      if (!ta) return; ta.value = ta.value + '\n\n' + s;
    });
    const replaceBtn = document.createElement('button'); replaceBtn.className = 'btn btn-sm btn-primary mt-2'; replaceBtn.textContent = 'Replace Content with Summary';
    replaceBtn.addEventListener('click', () => { if (!ta) return; ta.value = s; });
    card.appendChild(title); card.appendChild(p); card.appendChild(insertBtn); card.appendChild(replaceBtn);
    resEl.innerHTML = ''; resEl.appendChild(card);
  } catch (err) { console.error(err); resEl.innerHTML = `<div class="text-danger">${escapeHtml(err.message || 'Error')}</div>`; }
}

async function doDetect() {
  const ta = document.getElementById('blogContent'); const txt = ta ? ta.value : '';
  const resEl = document.getElementById('aiResult'); if (!resEl) return;
  resEl.innerHTML = 'Analyzing...';
  try {
    const resp = await fetch(`${API_BASE}/ai/detect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt }) });
    if (!resp.ok) throw new Error('Detection API failed');
    const data = await resp.json();
    const r = data.result || data;
    const verdict = r.verdict || 'unknown';
    const conf = (typeof r.confidence === 'number') ? r.confidence : (r.confidence ? Number(r.confidence) : 0);
    const pct = Math.round(conf * 100);
    const card = document.createElement('div'); card.className = 'card p-2';
    const h = document.createElement('strong'); h.textContent = `Verdict: ${verdict} · Confidence: ${pct}%`;
    const pre = document.createElement('pre'); pre.className = 'small mt-2'; pre.style.whiteSpace = 'pre-wrap'; pre.textContent = JSON.stringify(r, null, 2);
    card.appendChild(h); card.appendChild(pre);
    resEl.innerHTML = ''; resEl.appendChild(card);
  } catch (err) { console.error(err); resEl.innerHTML = `<div class="text-danger">${escapeHtml(err.message || 'Error')}</div>`; }
}

// expose for debugging
window.doGrammar = doGrammar; window.doSummary = doSummary; window.doDetect = doDetect;

function attachHandlers() {
  const g = document.getElementById('grammarBtn');
  const s = document.getElementById('summaryBtn');
  const d = document.getElementById('detectBtn');
  if (g) { g.removeEventListener('click', doGrammar); g.addEventListener('click', doGrammar); }
  if (s) { s.removeEventListener('click', doSummary); s.addEventListener('click', doSummary); }
  if (d) { d.removeEventListener('click', doDetect); d.addEventListener('click', doDetect); }
}

// delegate clicks as backup
document.addEventListener('click', (ev) => {
  const t = ev.target; if (!t) return;
  if (t.id === 'grammarBtn' || t.closest && t.closest('#grammarBtn')) { ev.preventDefault(); doGrammar(); }
  if (t.id === 'summaryBtn' || t.closest && t.closest('#summaryBtn')) { ev.preventDefault(); doSummary(); }
  if (t.id === 'detectBtn' || t.closest && t.closest('#detectBtn')) { ev.preventDefault(); doDetect(); }
});

document.addEventListener('DOMContentLoaded', () => { attachHandlers(); setTimeout(attachHandlers, 300); setTimeout(attachHandlers, 900); });
setTimeout(attachHandlers, 50);
