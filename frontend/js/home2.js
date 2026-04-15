// home2.js — updated to use CampusConnect frontend auth keys and API
const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('cc_token');
    if (!token) {
        // If this page should be protected, redirect to login. Otherwise remove this redirect.
        window.location.href = 'login.html';
        return;
    }
    loadUserInfo();
});

async function loadUserInfo() {
    const token = localStorage.getItem('cc_token');
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE}/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        const user = data.user || data;
        const welcomeEl = document.getElementById('welcomeName');
        if (welcomeEl && user && user.name) welcomeEl.textContent = user.name;
        const pointsEl = document.getElementById('userPoints');
        if (pointsEl && user.points !== undefined) pointsEl.textContent = user.points;
        const streakEl = document.getElementById('userStreak');
        if (streakEl && user.streak !== undefined) streakEl.textContent = user.streak;
    } catch (err) {
        console.error('Failed to load user info:', err);
        // token might be invalid — clear and redirect to login
        localStorage.removeItem('cc_token');
        localStorage.removeItem('cc_user');
        window.location.href = 'login.html';
    }
}
