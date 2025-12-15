const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

document.addEventListener('DOMContentLoaded', () => {
  // allow page to load for drafting and AI tools even when not logged in
  const form = document.getElementById('writeBlogForm');
  const err = document.getElementById('wbError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.style.display = 'none';
    const token = localStorage.getItem('cc_token');
    if (!token) {
      err.textContent = 'You must be logged in to publish. Redirecting to login...';
      err.style.display = 'block';
      setTimeout(() => window.location.href = 'login.html', 900);
      return;
    }
    const title = document.getElementById('blogTitle').value.trim();
    const content = document.getElementById('blogContent').value.trim();
    if (!title || !content) {
      err.textContent = 'Title and content are required.';
      err.style.display = 'block';
      return;
    }
    try {
      const essential = !!document.getElementById('writeEssential').checked;
      const mood = (document.getElementById('writeMood') && document.getElementById('writeMood').value) || '';
      const res = await fetch(`${API_BASE}/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content, essential, mood })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      // success — go to blog listing
      window.location.href = 'blog.html';
    } catch (err2) {
      console.error(err2);
      err.textContent = err2.message || 'Failed to publish blog';
      err.style.display = 'block';
    }
  });
});
