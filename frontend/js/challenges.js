// challenges.js
const API_BASE = (window.API_BASE || 'http://localhost:4000') + '/api';

document.addEventListener("DOMContentLoaded", () => {
    loadChallenges();
});

async function loadChallenges() {
    const token = localStorage.getItem("cc_token");

    const res = await fetch(`${API_BASE}/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const challenges = await res.json();

    const container = document.getElementById("challengeContainer");
    container.innerHTML = "";

    challenges.forEach(ch => {
        container.innerHTML += `
            <div class="challenge-card">
                <h3>${ch.title}</h3>
                <p>${ch.description}</p>
                <button onclick="joinChallenge('${ch._id}')">Join Challenge</button>
            </div>
        `;
    });
}

async function joinChallenge(id) {
    const token = localStorage.getItem("cc_token");

    const res = await fetch(`${API_BASE}/challenges/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    alert(data.message);
}
