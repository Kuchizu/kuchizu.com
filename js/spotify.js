function renderSpotify(spotify) {
    const section = document.getElementById('spotify');
    if (!section) return;

    if (!spotify) {
        section.style.display = 'none';
        return;
    }

    const nowPlayingEl = document.getElementById('spotify-now-playing');
    const listEl = document.getElementById('spotify-list');

    if (nowPlayingEl) {
        if (spotify.currentlyPlaying) {
            const cp = spotify.currentlyPlaying;
            nowPlayingEl.innerHTML = `
                <a href="${cp.url}" target="_blank" rel="noopener" class="spotify-current">
                    <img class="spotify-current-img" src="${cp.image}" alt="${cp.album}" loading="lazy">
                    <div class="spotify-current-info">
                        <div class="spotify-current-label">Now Playing</div>
                        <div class="spotify-current-name">${cp.name}</div>
                        <div class="spotify-current-artist">${cp.artist}</div>
                    </div>
                </a>
            `;
            nowPlayingEl.classList.add('active');
        } else {
            nowPlayingEl.classList.remove('active');
        }
    }

    if (listEl) {
        if (spotify.recentTracks?.length) {
            listEl.innerHTML = spotify.recentTracks.map(t => `
                <a href="${t.url}" target="_blank" rel="noopener" class="spotify-track">
                    <img class="spotify-track-img" src="${t.image}" alt="${t.name}" loading="lazy">
                    <div class="spotify-track-info">
                        <div class="spotify-track-name">${t.name}</div>
                        <div class="spotify-track-artist">${t.artist}</div>
                    </div>
                </a>
            `).join('');
        } else {
            listEl.innerHTML = '<span style="color:var(--fg-muted);font-size:0.6rem">No recent tracks</span>';
        }
    }
}
