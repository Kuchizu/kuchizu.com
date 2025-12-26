let lastTrackUrl = null;
let lastImageUrl = null;

function renderSpotify(spotify) {
    const section = document.getElementById('spotify');
    if (!section) return;

    if (!spotify) {
        section.style.display = 'none';
        return;
    }

    renderNowPlaying(spotify.currentlyPlaying);
    renderRecentTracks(spotify.recentTracks);

    // Start real-time polling
    startSpotifyPolling();
}

let progressInterval = null;
let progressStart = 0;
let progressTimestamp = 0;
let currentDuration = 0;
let isPlaying = false;

function renderNowPlaying(cp) {
    const el = document.getElementById('spotify-now-playing');
    if (!el) return;

    if (cp && cp.track) {
        const isNewTrack = lastTrackUrl !== cp.url;
        const isNewImage = lastImageUrl !== cp.image;
        lastTrackUrl = cp.url;
        lastImageUrl = cp.image;

        // Sync progress with server response time
        progressStart = cp.progress || 0;
        progressTimestamp = Date.now();
        currentDuration = cp.duration || 1;
        isPlaying = cp.playing;

        // Only rebuild if new track, otherwise update in place
        if (isNewTrack || !el.querySelector('.spotify-current')) {
            const progressPercent = (progressStart / currentDuration) * 100;
            el.innerHTML = `
                <a href="${cp.url}" target="_blank" rel="noopener" class="spotify-current${isNewTrack ? ' fade-in' : ''}${cp.playing ? '' : ' paused'}">
                    <img class="spotify-current-img" src="${cp.image}" alt="${cp.album || cp.track}" loading="lazy">
                    <div class="spotify-current-info">
                        <div class="spotify-current-label">${cp.playing ? 'Now Playing' : 'Paused'}</div>
                        <div class="spotify-current-name">${cp.name || cp.track}</div>
                        <div class="spotify-current-artist">${cp.artist}</div>
                        <div class="spotify-progress">
                            <div class="spotify-progress-bar" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="spotify-time">
                            <span>${formatTime(progressStart)}</span>
                            <span>${formatTime(currentDuration)}</span>
                        </div>
                    </div>
                </a>
            `;
        } else {
            // Update only changed elements
            const current = el.querySelector('.spotify-current');
            const label = el.querySelector('.spotify-current-label');
            const img = el.querySelector('.spotify-current-img');

            if (label) label.textContent = cp.playing ? 'Now Playing' : 'Paused';
            current.classList.toggle('paused', !cp.playing);

            // Only update image if URL changed
            if (isNewImage && img) {
                img.src = cp.image;
                img.alt = cp.album || cp.track;
            }
        }
        el.classList.add('active');

        startProgressAnimation();
    } else {
        el.classList.remove('active');
        lastTrackUrl = null;
        lastImageUrl = null;
        stopProgressAnimation();
    }
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function getCurrentProgress() {
    if (!isPlaying) return progressStart;
    const elapsed = Date.now() - progressTimestamp;
    return Math.min(progressStart + elapsed, currentDuration);
}

function startProgressAnimation() {
    stopProgressAnimation();
    if (!isPlaying) return;

    function update() {
        const current = getCurrentProgress();
        const bar = document.querySelector('.spotify-progress-bar');
        const timeEl = document.querySelector('.spotify-time span:first-child');
        if (bar) bar.style.width = `${(current / currentDuration) * 100}%`;
        if (timeEl) timeEl.textContent = formatTime(current);
    }

    update();
    progressInterval = setInterval(update, 1000);
}

function stopProgressAnimation() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function renderRecentTracks(tracks) {
    const el = document.getElementById('spotify-list');
    if (!el) return;

    if (tracks?.length) {
        el.innerHTML = tracks.map(t => `
            <a href="${t.url}" target="_blank" rel="noopener" class="spotify-track">
                <img class="spotify-track-img" src="${t.image}" alt="${t.name}" loading="lazy">
                <div class="spotify-track-info">
                    <div class="spotify-track-name">${t.name}</div>
                    <div class="spotify-track-artist">${t.artist}</div>
                </div>
            </a>
        `).join('');
    } else {
        el.innerHTML = '<span style="color:var(--fg-muted);font-size:0.6rem">No recent tracks</span>';
    }
}

let pollingInterval = null;

function startSpotifyPolling() {
    if (pollingInterval) return;

    async function poll() {
        try {
            const res = await fetch('/api/spotify/now-playing');
            if (res.ok) {
                const data = await res.json();
                if (!data.error) {
                    renderNowPlaying(data);
                }
            }
        } catch {}
    }

    poll();
    pollingInterval = setInterval(poll, 5000);
}
