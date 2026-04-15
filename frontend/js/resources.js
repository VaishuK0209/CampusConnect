const RES_API = (window.API_BASE || 'http://localhost:4000') + '/api/resources';

document.addEventListener('DOMContentLoaded', () => {
  loadResources();
  document.getElementById('resSearch').addEventListener('input', () => filterResources());
  document.getElementById('resSort').addEventListener('change', () => loadResources());
});

const DEMO_RESOURCES = [
  { id: 'r1', title: 'Interview Prep Guide', description: 'A curated interview preparation checklist for CS students.', url: '#', tags: ['Interview','Guide'], author: 'Campus Team', createdAt: new Date().toISOString() },
  { id: 'r2', title: 'Free Course: Intro to ML', description: 'Beginner-friendly ML course materials and exercises.', url: '#', tags: ['AI','Course'], author: 'OpenCourse', createdAt: new Date().toISOString() },
  { id: 'r3', title: 'Internship Tips', description: 'How to find and ace internships.', url: '#', tags: ['Internship','Career'], author: 'Alumni', createdAt: new Date().toISOString() }
];

let allResources = [];

async function loadResources() {
  const container = document.getElementById('resourcesList');
  container.innerHTML = '';
  try {
    const res = await fetch(RES_API);
    if (res.ok) allResources = await res.json();
    else throw new Error('API error');
  } catch (e) {
    console.warn('Resources API unavailable, using demo data.');
    allResources = DEMO_RESOURCES.slice();
  }
  renderResources(allResources);
  renderTagFilters(allResources);
}

function renderResources(list) {
  const container = document.getElementById('resourcesList');
  container.innerHTML = '';
  if (!list.length) { container.innerHTML = '<p class="text-muted">No resources found.</p>'; return; }
  // switch container to grid layout
  container.classList.add('resources-grid');
  list.forEach(r => {
    const el = document.createElement('a');
    el.className = 'resource-card list-group-item list-group-item-action';
    el.href = r.url || '#';
    el.target = '_blank';
    el.innerHTML = `
      ${r.image ? `<img src="${r.image}" alt="" class="blog-thumb"/>` : ''}
      <div class="body">
        <h5>${escapeHtml(r.title)}</h5>
        <p class="mb-1">${escapeHtml(r.description)}</p>
        <div>${(r.tags||[]).map(t=>`<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
      <div class="meta">By ${escapeHtml(r.author || 'Unknown')} <small>${new Date(r.createdAt).toLocaleDateString()}</small></div>
    `;
    container.appendChild(el);
  });
}

function renderTagFilters(list) {
  const tags = Array.from(new Set(list.flatMap(r => r.tags || [])));
  const container = document.getElementById('tagFilters');
  container.innerHTML = '';
  tags.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-secondary btn-sm';
    btn.textContent = t;
    btn.onclick = () => {
      const filtered = allResources.filter(r => (r.tags || []).includes(t));
      renderResources(filtered);
    };
    container.appendChild(btn);
  });
}

function filterResources() {
  const q = (document.getElementById('resSearch').value || '').toLowerCase();
  const sort = document.getElementById('resSort').value;
  let list = allResources.filter(r => (r.title + ' ' + r.description + ' ' + (r.tags||[]).join(' ')).toLowerCase().includes(q));
  if (sort === 'oldest') list = list.slice().reverse();
  renderResources(list);
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
