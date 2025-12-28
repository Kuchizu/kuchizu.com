let lastGameName = null;

function renderSteam(steam) {
    const section = document.getElementById('steam');
    if (!section) return;

    if (!steam) {
        section.style.display = 'none';
        return;
    }

    const avatarEl = document.getElementById('steam-avatar');
    const nameEl = document.getElementById('steam-name');
    const gamesEl = document.getElementById('steam-games');
    const footerEl = document.getElementById('steam-footer');

    if (avatarEl && steam.avatar) {
        avatarEl.src = steam.avatar;
        avatarEl.alt = steam.personaname;
        avatarEl.classList.remove('skeleton');
    }
    nameEl.textContent = steam.personaname;

    updateSteamStatus(steam);

    if (steam.recentGames?.length) {
        gamesEl.innerHTML = steam.recentGames.slice(0, 3).map(g => `
            <div class="steam-game">
                <img class="steam-game-icon" src="${g.icon}" alt="${g.name}" loading="lazy">
                <div class="steam-game-info">
                    <div class="steam-game-name">${g.name}</div>
                    <div class="steam-game-time">${g.playtime_forever}h total</div>
                </div>
            </div>
        `).join('');
    } else {
        document.getElementById('steam-recent').style.display = 'none';
    }

    footerEl.innerHTML = `<a href="${steam.profileurl}" target="_blank" rel="noopener" style="color:var(--fg-muted);text-decoration:none;">${steam.totalGames} games</a>`;

    // Start real-time polling
    startSteamPolling();
}

function updateSteamStatus(data) {
    const stateEl = document.getElementById('steam-state');
    const playingEl = document.getElementById('steam-playing');
    if (!stateEl || !playingEl) return;

    const inGame = data.inGame;
    const isNew = lastGameName !== inGame;
    lastGameName = inGame;

    if (inGame) {
        stateEl.textContent = 'In-Game';
        stateEl.className = 'steam-state in-game';
        playingEl.innerHTML = `
            <div class="steam-playing-inner${isNew ? ' fade-in' : ''}">
                <div class="steam-playing-label">Now Playing</div>
                <div class="steam-playing-game">${inGame}</div>
            </div>
        `;
        playingEl.classList.add('active');
    } else {
        stateEl.textContent = data.status || (data.online ? 'Online' : 'Offline');
        stateEl.className = 'steam-state' + (data.online || data.isOnline ? ' online' : '');
        playingEl.classList.remove('active');
        lastGameName = null;
    }
}

let steamEventSource = null;

function startSteamPolling() {
    if (steamEventSource) return;

    steamEventSource = new EventSource('/api/steam/stream');

    steamEventSource.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (!data.error) {
                updateSteamStatus(data);
            }
        } catch {}
    };

    steamEventSource.onerror = () => {
        steamEventSource.close();
        steamEventSource = null;
        setTimeout(startSteamPolling, 5000);
    };
}
