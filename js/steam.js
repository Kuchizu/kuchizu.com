function renderSteam(steam) {
    const section = document.getElementById('steam');
    if (!section) return;

    if (!steam) {
        section.style.display = 'none';
        return;
    }

    const avatarEl = document.getElementById('steam-avatar');
    const nameEl = document.getElementById('steam-name');
    const stateEl = document.getElementById('steam-state');
    const playingEl = document.getElementById('steam-playing');
    const gamesEl = document.getElementById('steam-games');
    const footerEl = document.getElementById('steam-footer');

    if (avatarEl && steam.avatar) {
        avatarEl.src = steam.avatar;
        avatarEl.alt = steam.personaname;
        avatarEl.classList.remove('skeleton');
    }
    nameEl.textContent = steam.personaname;

    if (steam.inGame) {
        stateEl.textContent = 'In-Game';
        stateEl.className = 'steam-state in-game';
        playingEl.innerHTML = `
            <div class="steam-playing-label">Now Playing</div>
            <div class="steam-playing-game">${steam.inGame}</div>
        `;
        playingEl.classList.add('active');
    } else {
        stateEl.textContent = steam.status;
        stateEl.className = 'steam-state' + (steam.isOnline ? ' online' : '');
        playingEl.classList.remove('active');
    }

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
}
