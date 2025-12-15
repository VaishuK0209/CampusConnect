const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    const list = document.getElementById('leaderboardList');
    const empty = document.getElementById('lbEmpty');
    if (!res.ok) {
      list.innerHTML = '';
      empty.style.display = 'block';
      empty.textContent = 'Could not load leaderboard.';
      return;
    }
    const data = await res.json();
    if (!data || !data.length) {
      list.innerHTML = '';
      empty.style.display = 'block';
      empty.textContent = 'No entries yet.';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = '';
    // show top 50
    data.slice(0,50).forEach((e, idx) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      const percent = Math.round((e.score || 0) * 10000) / 100; // show as percent with 2 dec
      const pts = Math.round((e.score || 0) * 1000);
      li.innerHTML = `<div><strong>${escapeHtml(e.name || e.id)}</strong><div class="small text-muted">Words: ${e.words || 0} · Score: ${percent}%</div></div><span>${pts} pts</span>`;
      list.appendChild(li);
    });
  } catch (err) { console.error('lb', err); const empty = document.getElementById('lbEmpty'); if (empty) { empty.style.display = 'block'; empty.textContent = 'Could not load leaderboard.'; } }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
});
