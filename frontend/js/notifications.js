const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('cc_token');
  if (!token) return window.location.href = 'login.html';

  const res = await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return console.error('Failed to load notifications');
  const data = await res.json();
  const list = document.getElementById('notificationsList');
  if (!list) return;
  if (!data.notifications || !data.notifications.length) {
    list.innerHTML = '<p class="text-muted">No notifications.</p>';
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'list-group';
  data.notifications.forEach(n => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-start';
    const left = document.createElement('div');
    left.innerHTML = `<div><strong>${escapeHtml(n.message)}</strong><div class="small text-muted">${new Date(n.createdAt).toLocaleString()}</div></div>`;
    const right = document.createElement('div');
    const view = document.createElement('a');
    view.href = n.url || '#';
    view.textContent = 'View';
    view.className = 'btn btn-sm btn-primary me-2';
    const del = document.createElement('button');
    del.className = 'btn btn-sm btn-outline-danger';
    del.textContent = 'Dismiss';
    del.addEventListener('click', async () => {
      await fetch(`${API_BASE}/notifications/${encodeURIComponent(n._id || n.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      li.remove();
    });
    right.appendChild(view);
    right.appendChild(del);
    li.appendChild(left);
    li.appendChild(right);
    ul.appendChild(li);
  });
  list.appendChild(ul);
});

function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
