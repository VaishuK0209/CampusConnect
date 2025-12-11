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
    }
  } catch (err) {
    console.error(err);
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user');
    window.location.href = 'login.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  getProfile();
  const logout = document.getElementById('logoutBtn');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('cc_token');
      localStorage.removeItem('cc_user');
      window.location.href = 'login.html';
    });
  }
});
