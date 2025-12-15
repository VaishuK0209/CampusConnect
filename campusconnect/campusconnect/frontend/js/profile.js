const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

async function getProfile() {
  const token = localStorage.getItem('cc_token');
  if (!token) { window.location.href = 'login.html'; return; }
  try {
    const res = await fetch(`${API_BASE}/profile`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Unauthorized');
    const data = await res.json();
    const user = data.user;
    if (user) {
      const el = document.getElementById('profileName');
      if (el) el.textContent = user.name ? ` — ${user.name}` : '';
      const bioText = document.getElementById('bioText');
      const bioInput = document.getElementById('bioInput');
      if (bioText) bioText.textContent = user.bio || 'You haven\'t added a bio yet.';
      if (bioInput) bioInput.value = user.bio || '';
      // save for other functions
      window.cc_user_profile = user;
      updateProfileCompletion(user, []);
    }
  } catch (err) {
    console.error(err);
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user');
    window.location.href = 'login.html';
  }
}

async function loadMyPosts() {
  const token = localStorage.getItem('cc_token');
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/myblogs`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    const container = document.getElementById('myPostsList');
    if (!container) return;
    container.innerHTML = '';
    if (!data || !data.length) { container.innerHTML = '<p class="text-muted">You have not posted any blogs yet.</p>'; updateProfileCompletion(window.cc_user_profile || null, []); updateStreak(0); return; }
    const ul = document.createElement('ul'); ul.className = 'list-group';
    data.forEach(b => {
      const li = document.createElement('li'); li.className = 'list-group-item d-flex justify-content-between align-items-center';
      const left = document.createElement('div'); left.innerHTML = `<div><strong>${escapeHtml(b.title)}</strong><div class="small text-muted">${new Date(b.createdAt).toLocaleString()}</div></div>`;
      const right = document.createElement('div');
      const view = document.createElement('a'); view.href = `blog.html#${b.id || b._id}`; view.className = 'btn btn-sm btn-outline-primary me-2'; view.textContent = 'View';
      const edit = document.createElement('a'); edit.href = `blog.html#${b.id || b._id}`; edit.className = 'btn btn-sm btn-outline-secondary'; edit.textContent = 'Edit';
      right.appendChild(view); right.appendChild(edit);
      li.appendChild(left); li.appendChild(right); ul.appendChild(li);
    });
    container.appendChild(ul);
    // update completion and streak
    updateProfileCompletion(window.cc_user_profile || null, data);
    updateStreak(computeStreak(data));
  } catch (e) { console.error(e); }
}

function computeStreak(posts) {
  if (!posts || !posts.length) return 0;
  const dates = new Set(posts.map(p => (new Date(p.createdAt)).toISOString().slice(0,10)));
  let latest = new Date(Math.max(...posts.map(p => new Date(p.createdAt).getTime())));
  let streak = 0;
  while (true) {
    const dstr = latest.toISOString().slice(0,10);
    if (dates.has(dstr)) { streak++; latest.setDate(latest.getDate() - 1); } else break;
  }
  return streak;
}

function updateStreak(n) { const el = document.getElementById('streakDays'); if (el) el.textContent = String(n); }

function updateProfileCompletion(user, posts) {
  const nameOk = !!(user && user.name && user.name.trim().length > 2);
  const bioOk = !!(user && user.bio && user.bio.trim().length >= 20);
  const postOk = !!(posts && posts.length > 0);
  const bookmarkOk = !!(user && user.bookmarks && user.bookmarks.length > 0);
  const total = [nameOk, bioOk, postOk, bookmarkOk].filter(Boolean).length;
  const pct = Math.round((total / 4) * 100);
  const bar = document.getElementById('profileCompletionBar'); if (bar) { bar.style.width = pct + '%'; bar.setAttribute('aria-valuenow', String(pct)); }
  const txt = document.getElementById('profileCompletionText'); if (txt) txt.textContent = `${pct}% complete`;
  const map = { c_name: nameOk, c_bio: bioOk, c_post: postOk, c_bookmarks: bookmarkOk };
  Object.keys(map).forEach(k => { const cb = document.getElementById(k); if (cb) cb.checked = !!map[k]; });
}

document.addEventListener('DOMContentLoaded', () => {
  getProfile();
  // load user's posts
  loadMyPosts();
  // refresh my posts after blogs change elsewhere
  document.addEventListener('cc:blogs-loaded', loadMyPosts);
  const logout = document.getElementById('logoutBtn');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('cc_token');
      localStorage.removeItem('cc_user');
      window.location.href = 'login.html';
    });
  }
  // Bio editing
  const editBtn = document.getElementById('editBioBtn');
  const saveBtn = document.getElementById('saveBioBtn');
  const cancelBtn = document.getElementById('cancelBioBtn');
  const bioEditor = document.getElementById('bioEditor');
  const bioText = document.getElementById('bioText');
  const bioInput = document.getElementById('bioInput');
  const bioStatus = document.getElementById('bioStatus');
  const bioCounter = document.getElementById('bioCounter');
  const togglePreview = document.getElementById('togglePreview');
  const bioPreview = document.getElementById('bioPreview');
  const bioDraftStatus = document.getElementById('bioDraftStatus');
  const MAX_BIO = 500;
  let draftTimer = null;

  if (editBtn && bioEditor) {
    editBtn.addEventListener('click', () => {
      bioEditor.style.display = 'block';
      editBtn.style.display = 'none';
      if (bioInput) bioInput.focus();
      // Load draft if available
      try {
        const user = JSON.parse(localStorage.getItem('cc_user') || 'null');
        const key = `bio_draft_${user && user.id ? user.id : 'anon'}`;
        const draft = localStorage.getItem(key);
        if (draft && bioInput && draft !== bioInput.value) {
          bioInput.value = draft;
          if (bioDraftStatus) {
            bioDraftStatus.style.display = 'inline';
            setTimeout(() => bioDraftStatus.style.display = 'none', 2500);
          }
        }
      } catch (e) { /* ignore */ }
      updateCounter();
    });
  }

  if (cancelBtn && bioEditor && editBtn) {
    cancelBtn.addEventListener('click', () => {
      bioEditor.style.display = 'none';
      editBtn.style.display = 'inline-block';
      if (bioInput) {
        bioInput.value = bioText ? bioText.textContent : '';
        updateCounter();
        // hide preview when cancelling
        if (bioPreview) bioPreview.style.display = 'none';
        if (togglePreview) togglePreview.textContent = 'Preview';
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!bioInput) return;
      const newBio = bioInput.value;
      bioStatus.style.display = 'inline-block';
      try {
        const token = localStorage.getItem('cc_token');
        const res = await fetch(`${API_BASE}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bio: newBio })
        });
        if (!res.ok) throw new Error('Failed to save');
        const data = await res.json();
        const user = data.user;
        if (user) {
          if (bioText) bioText.textContent = user.bio || 'You haven\'t added a bio yet.';
          bioEditor.style.display = 'none';
          editBtn.style.display = 'inline-block';
          // clear draft on save
          try {
            const userObj = JSON.parse(localStorage.getItem('cc_user') || 'null');
            const key = `bio_draft_${userObj && userObj.id ? userObj.id : 'anon'}`;
            localStorage.removeItem(key);
          } catch(e) {}
        }
      } catch (err) {
        console.error(err);
        alert('Could not save bio.');
      } finally {
        bioStatus.style.display = 'none';
      }
    });
  }

  // Bio input events: counter, autosave, preview toggle
  function updateCounter() {
    if (!bioInput || !bioCounter) return;
    let val = bioInput.value || '';
    if (val.length > MAX_BIO) {
      val = val.slice(0, MAX_BIO);
      bioInput.value = val;
    }
    bioCounter.textContent = `${val.length}/${MAX_BIO}`;
  }

  function renderMarkdown(md) {
    if (!md) return '<p class="text-muted">You haven\'t added a bio yet.</p>';
    // Escape HTML
    const esc = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Simple replacements: headings, bold, italic, links, line breaks
    let html = esc
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n{2,}/gim, '</p><p>')
      .replace(/\n/gim, '<br/>');
    return `<p>${html}</p>`;
  }

  if (bioInput) {
    bioInput.addEventListener('input', () => {
      updateCounter();
      // autosave draft (debounced)
      try {
        const user = JSON.parse(localStorage.getItem('cc_user') || 'null');
        const key = `bio_draft_${user && user.id ? user.id : 'anon'}`;
        if (draftTimer) clearTimeout(draftTimer);
        draftTimer = setTimeout(() => {
          localStorage.setItem(key, bioInput.value);
        }, 800);
      } catch(e) {}
    });
  }

  if (togglePreview && bioInput && bioPreview) {
    togglePreview.addEventListener('click', () => {
      if (bioPreview.style.display === 'block') {
        // switch to edit
        bioPreview.style.display = 'none';
        bioInput.style.display = 'block';
        togglePreview.textContent = 'Preview';
      } else {
        // render preview
        bioPreview.innerHTML = renderMarkdown(bioInput.value);
        bioPreview.style.display = 'block';
        bioInput.style.display = 'none';
        togglePreview.textContent = 'Edit';
      }
    });
  }

  // initialize counter on load
  updateCounter();
});


