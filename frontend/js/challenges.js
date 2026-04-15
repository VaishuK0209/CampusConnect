// challenges.js
const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

document.addEventListener("DOMContentLoaded", () => {
    loadChallenges();
});

async function loadChallenges() {
    const token = localStorage.getItem("cc_token");

    let challenges = [];
    try {
        const res = await fetch(`${API_BASE}/challenges`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) challenges = await res.json();
    } catch (err) {
        console.warn('Failed to fetch challenges, using defaults', err);
    }

    // Fallback defaults if API not available or returned nothing
    if (!challenges || challenges.length === 0) {
        challenges = [
            { id: 'c1', title: 'Web Development Challenge', description: 'Build a responsive website for a campus event using HTML, CSS and JS.' },
            { id: 'c2', title: 'Cybersecurity Challenge', description: 'Complete tasks related to ethical hacking and web security scenarios.' },
            { id: 'c3', title: 'AI & Robotics Challenge', description: 'Create a small AI or robotics project and showcase it.' }
        ];
    }

    const container = document.getElementById("challengeContainer");
    container.innerHTML = "";

        const currentUser = JSON.parse(localStorage.getItem('cc_user') || 'null');
        const currentUserId = currentUser && currentUser.id;

        challenges.forEach(ch => {
                const id = ch.id || ch._id || '';
                const participants = ch.participants || [];
                const joined = currentUserId && participants.includes(currentUserId);
                container.innerHTML += `
                        <div class="col-md-4 d-flex">
                            <div class="dashboard-card w-100 text-center p-4">
                                <button class="btn btn-sm bookmark-btn" data-id="${id}" data-title="${escapeHtml(ch.title)}" data-href="challenges.html#${id}" title="Save bookmark"><i class="bi bi-bookmark"></i></button>
                                <h5>${escapeHtml(ch.title)}</h5>
                                <p>${escapeHtml(ch.description)}</p>
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <button id="join-btn-${id}" class="btn ${joined ? 'btn-secondary' : 'btn-primary'} btn-sm" ${joined ? 'disabled' : ''} onclick="joinChallenge('${id}')">${joined ? 'Joined' : 'Participate'}</button>
                                    <small id="participants-${id}" class="text-muted">${participants.length} participants</small>
                                </div>
                            </div>
                        </div>
                `;
        });
}

async function joinChallenge(id) {
    if (!id) { alert('Invalid challenge'); return; }
    const token = localStorage.getItem('cc_token');
    try {
        const res = await fetch(`${API_BASE}/challenges/${id}/join`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to join');
        if (data.joined) {
            const btn = document.getElementById(`join-btn-${id}`);
            if (btn) { btn.textContent = 'Joined'; btn.className = 'btn btn-secondary btn-sm'; btn.disabled = true; }
            const pEl = document.getElementById(`participants-${id}`);
            if (pEl) pEl.textContent = `${data.participants} participants`;
            alert('You joined the challenge!');
        } else {
            alert(data.message || 'Already joined');
        }
    } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to join challenge');
    }
}

// Small helper to avoid injecting raw HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Create challenge modal handlers
function showCreateModal() {
    const modalEl = document.getElementById('createChallengeModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    const submit = document.getElementById('createSubmit');
    if (submit) submit.addEventListener('click', async () => {
        const title = document.getElementById('createTitle').value.trim();
        const description = document.getElementById('createDescription').value.trim();
        const errEl = document.getElementById('createError');
        errEl.style.display = 'none';
        if (!title || !description) { errEl.textContent = 'Title and description required'; errEl.style.display = 'block'; return; }
        const token = localStorage.getItem('cc_token');
        try {
            const res = await fetch(`${API_BASE}/challenges`, {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
                body: JSON.stringify({ title, description })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create');
            // close modal and reload list
            const modalEl = document.getElementById('createChallengeModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            loadChallenges();
        } catch (err) {
            errEl.textContent = err.message || 'Failed to create challenge';
            errEl.style.display = 'block';
        }
    });
});
