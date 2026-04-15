const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

// Demo fallback posts (used when backend is unavailable)
const DEMO_POSTS = [
  {
    id: 'demo1',
    title: 'Welcome to CampusConnect',
    content: 'This is a demo post shown because the backend is not reachable. Start the server to see real posts.',
    authorName: 'Campus Team',
    createdAt: new Date().toISOString(),
    essential: true,
    shareUrl: '/blog.html#demo1'
  },
  {
    id: 'demo2',
    title: 'Getting Started',
    content: 'Write your first blog by clicking the Write button. This demo post helps you preview the layout.',
    authorName: 'Admin',
    createdAt: new Date().toISOString(),
    essential: false,
    shareUrl: '/blog.html#demo2'
  },
  {
    id: 'demo3',
    title: 'Tips & Tricks',
    content: 'Use the search box, filters, and pagination to find posts. This is sample content only.',
    authorName: 'Guide',
    createdAt: new Date().toISOString(),
    essential: false,
    shareUrl: '/blog.html#demo3'
  }
];

// On DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  const hashId = location.hash ? location.hash.replace('#', '') : null;
  if (hashId) showBlogDetail(hashId);
  loadBlogs();

  window.addEventListener('hashchange', () => {
    const id = location.hash ? location.hash.replace('#', '') : null;
    if (id) showBlogDetail(id);
    else {
      document.getElementById('blogDetail').style.display = 'none';
      document.getElementById('blogContainer').style.display = '';
      loadBlogs();
    }
  });
});

// Show single blog detail
async function showBlogDetail(id) {
  const container = document.getElementById('blogDetail');
  const list = document.getElementById('blogContainer');
  if (!container) return;

  try {
    container.innerHTML = '<div class="blog-detail"><p class="text-muted">Loading...</p></div>';
    container.style.display = '';
    list.style.display = 'none';

    const res = await fetch(`${API_BASE}/blogs/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      container.innerHTML = `<div class="blog-detail">
        <p class="text-danger">${escapeHtml(err.error || 'Blog not found')}</p>
        <a href="blog.html" class="btn btn-sm btn-outline-primary mt-2">Back to list</a>
      </div>`;
      return;
    }

    const b = await res.json();
    const title = escapeHtml(b.title || 'Untitled');
    const author = escapeHtml(b.authorName || b.authorId || 'Unknown');
    const date = b.createdAt ? new Date(b.createdAt).toLocaleString() : '';
    const content = escapeHtml(b.content || '');

    container.innerHTML = `
      <div class="blog-detail">
        <div class="d-flex align-items-center justify-content-between">
          <h2>${title}</h2>
          ${b.essential ? '<div><span class="essential-badge">Essential</span></div>' : ''}
        </div>
        <div class="meta">By ${author} · ${date}</div>
        <div class="content">${content}</div>
        <div class="mt-3"><a href="blog.html" class="btn btn-sm btn-outline-primary">Back to list</a></div>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="blog-detail">
      <p class="text-danger">Could not load blog</p>
      <a href="blog.html" class="btn btn-sm btn-outline-primary mt-2">Back to list</a>
    </div>`;
  }
}

// Load list of blogs
async function loadBlogs() {
  const container = document.getElementById('blogContainer');
  if (!container) return;

  container.innerHTML = '';
  let blogs = [];

  try {
    const res = await fetch(`${API_BASE}/blogs`);
    if (res.ok) {
      blogs = await res.json();
      const demoBanner = document.getElementById('demoBanner');
      if (demoBanner) demoBanner.remove();
    } else throw new Error('Failed');
  } catch (err) {
    console.warn('Could not fetch blogs from API, falling back to demo posts.', err);
    blogs = DEMO_POSTS.slice();
    showDemoBanner();
  }

  const PAGE_SIZE = 12;
  let page = Number(sessionStorage.getItem('cc_blog_page') || '1');
  let showAll = sessionStorage.getItem('cc_blog_show_all') === '1';
  const total = blogs.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) page = totalPages;

  const currentUser = JSON.parse(localStorage.getItem('cc_user') || 'null');
  const uid = currentUser && currentUser.id;

  // Sort
  const sort = document.getElementById('sortSelect') ? document.getElementById('sortSelect').value : 'newest';
  if (sort === 'oldest') blogs.reverse();

  // Essential-only filter
  const essentialOnly = document.getElementById('essentialOnly') ? document.getElementById('essentialOnly').checked : false;
  let filtered = essentialOnly ? blogs.filter(b => b.essential) : blogs;

  // Render essential section
  const essentialContainer = document.getElementById('essentialList');
  if (essentialContainer) {
    const essentials = blogs.filter(b => b.essential).slice(0, 6);
    if (essentials.length) {
      essentialContainer.innerHTML = '<h5>Essential</h5><div class="d-flex gap-2 flex-wrap" id="essentialInner"></div>';
      const inner = document.getElementById('essentialInner');
      inner.innerHTML = '';
      essentials.forEach(e => {
        const a = document.createElement('a');
        a.className = 'btn btn-sm btn-outline-danger';
        a.href = `blog.html#${e.id || e._id}`;
        a.textContent = e.title.slice(0, 40) + (e.title.length > 40 ? '…' : '');
        inner.appendChild(a);
      });
    } else essentialContainer.innerHTML = '';
  }

  // Pagination
  let startIdx = 0;
  let pageBlogs = filtered;
  if (!showAll) {
    startIdx = (page - 1) * PAGE_SIZE;
    pageBlogs = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  }

  pageBlogs.forEach(b => {
    const id = b.id || b._id || '';
    const title = escapeHtml(b.title || '');
    const content = escapeHtml((b.content || '').slice(0, 220)) + (b.content && b.content.length > 220 ? '…' : '');
    const authorId = b.authorId || b.author || '';
    const canEdit = uid && authorId && uid === authorId;
    const img = b.image || b.imageUrl || 'images/blog1.png';

    const item = document.createElement('div');
    item.className = 'list-group-item blog-item';
    item.dataset.title = (b.title || '').toLowerCase();
    item.innerHTML = `
      <img src="${img}" class="blog-thumb" alt="">
      <div class="blog-body">
        <div style="position:relative">
          <div style="position:absolute;right:0;top:0">
            <button class="btn btn-sm action-btn bookmark-btn" data-id="${id}" data-title="${escapeHtml(b.title || '')}" title="Save bookmark">
              <i class="bi bi-bookmark"></i>
            </button>
            <button class="btn btn-sm action-btn btn-outline-secondary share-btn" data-id="${id}" data-url="${b.shareUrl || '/blog.html#' + id}" title="Share">
              <i class="bi bi-share-fill"></i>
            </button>
            ${canEdit ? `<button class="btn btn-sm action-btn btn-outline-primary edit-btn" data-id="${id}">Edit</button>` : ''}
          </div>
        </div>
        <div class="d-flex align-items-center justify-content-between">
          <div class="blog-title">${title}</div>
          <div>
            ${b.mood ? `<span class="tag-pill">${escapeHtml(b.mood)}</span>` : ''}
            ${b.essential ? '<span class="essential-badge" style="margin-left:8px">Essential</span>' : ''}
          </div>
        </div>
        <div class="blog-meta">By ${escapeHtml(b.authorName || authorId || 'Unknown')} · ${new Date(b.createdAt || Date.now()).toLocaleDateString()}</div>
        <p>${content}</p>
        <div class="blog-actions">
          <button class="btn btn-primary btn-sm read-btn" data-id="${id}">Read</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });

  // Pagination buttons
  const info = document.getElementById('paginationInfo');
  const prev = document.getElementById('prevPage');
  const next = document.getElementById('nextPage');
  if (info) info.textContent = showAll ? `Showing all ${total}` : `Showing ${Math.min(total, startIdx + 1)}-${Math.min(total, startIdx + PAGE_SIZE)} of ${total}`;
  if (prev) prev.disabled = showAll || page <= 1;
  if (next) next.disabled = showAll || page >= totalPages;

  const showAllBtn = document.getElementById('showAllBtn');
  if (showAllBtn) {
    showAllBtn.textContent = showAll ? 'Paginate' : 'Show all';
    showAllBtn.classList.toggle('active', showAll);
  }

  // Attach event handlers
  document.querySelectorAll('.read-btn').forEach(btn => btn.addEventListener('click', () => window.location.href = `blog.html#${btn.dataset.id}`));
  document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
  document.querySelectorAll('.bookmark-btn').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('bookmarked')));
  document.querySelectorAll('.share-btn').forEach(btn => btn.addEventListener('click', async (e) => {
    const url = btn.dataset.url;
    try {
      if (navigator.share) await navigator.share({ title: document.title, text: 'Check out this blog', url: location.origin + url });
      else { await navigator.clipboard.writeText(location.origin + url); showToast('Link copied to clipboard', 'success'); }
    } catch { showToast('Could not share', 'danger'); }
  }));

  // Reload on sort/filter change
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.addEventListener('change', loadBlogs);
  const essentialCheckbox = document.getElementById('essentialOnly');
  if (essentialCheckbox) essentialCheckbox.addEventListener('change', loadBlogs);

  document.dispatchEvent(new Event('cc:blogs-loaded'));
}

// Escape HTML
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Demo Banner
function showDemoBanner() {
  if (document.getElementById('demoBanner')) return;
  const c = document.createElement('div');
  c.id = 'demoBanner';
  c.className = 'alert alert-warning';
  c.style.margin = '12px 0';
  c.innerHTML = 'Showing demo posts because the backend is not reachable. Start the server to view live posts.';
  const container = document.querySelector('.container');
  if (container) container.insertBefore(c, container.firstChild);
}

// Toast messages
function showToast(msg, type='info') {
  let c = document.getElementById('cc_toast_container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'cc_toast_container';
    c.style.position = 'fixed';
    c.style.right = '16px';
    c.style.top = '16px';
    c.style.zIndex = '99999';
    document.body.appendChild(c);
  }
  const el = document.createElement('div');
  el.style.padding = '8px 12px';
  el.style.marginBottom = '8px';
  el.style.borderRadius = '8px';
  el.style.background = type === 'success' ? '#2e7d32' : type === 'danger' ? '#ff4d4f' : '#333';
  el.style.color = '#fff';
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(-6px)'; }, 2600);
  setTimeout(() => el.remove(), 3200);
}


//toggle mode
const toggleBtn = document.getElementById('themeToggle');
toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('mode', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Persist user preference
if (localStorage.getItem('mode') === 'dark') {
  document.body.classList.add('dark-mode');
}
