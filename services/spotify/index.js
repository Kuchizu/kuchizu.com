const http = require('http');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

let accessToken = null;
let tokenExpiry = 0;
let currentData = null;
let userProfile = null;
let cachedRecentTracks = [];
let lastRecentFetch = 0;
const sseClients = new Set();

const metrics = {
    startedAt: Date.now(),
    requests: { stream: 0, nowPlaying: 0, health: 0, metrics: 0 },
    errors: 0,
    polls: 0,
    lastPollAt: null
};

// Intervals
const POLL_INTERVAL = 3000;           // Now playing: 3 seconds
const RECENT_INTERVAL = 30000;        // Recent tracks: 30 seconds
const PROFILE_INTERVAL = 600000;      // Profile: 10 minutes
const PROFILE_RETRY_INTERVAL = 30000; // Retry on failure: 30 seconds

async function refreshAccessToken() {
    if (accessToken && Date.now() < tokenExpiry - 60000) {
        return accessToken;
    }

    try {
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: REFRESH_TOKEN
            })
        });

        const data = await res.json();
        if (data.access_token) {
            accessToken = data.access_token;
            tokenExpiry = Date.now() + (data.expires_in * 1000);
        }
    } catch (e) {
        console.error('Token refresh error:', e.message);
    }
    return accessToken;
}

// Fetch profile separately with its own interval
async function fetchAndCacheProfile() {
    const token = await refreshAccessToken();
    if (!token) {
        scheduleProfileRefresh(PROFILE_RETRY_INTERVAL);
        return;
    }

    try {
        const res = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10) * 1000;
            console.log(`Profile rate limited, retry in ${retryAfter / 1000}s`);
            scheduleProfileRefresh(retryAfter);
            return;
        }

        if (res.ok) {
            const data = await res.json();
            userProfile = {
                userName: data.display_name,
                avatar: data.images?.[0]?.url || null,
                profileUrl: data.external_urls?.spotify,
                likedSongs: 56 // TODO: fetch dynamically
            };
            console.log('Profile loaded:', userProfile.userName);
            scheduleProfileRefresh(PROFILE_INTERVAL);
        } else {
            console.error('Profile fetch failed:', res.status);
            scheduleProfileRefresh(PROFILE_RETRY_INTERVAL);
        }
    } catch (e) {
        console.error('Profile fetch error:', e.message);
        scheduleProfileRefresh(PROFILE_RETRY_INTERVAL);
    }
}

function scheduleProfileRefresh(interval) {
    setTimeout(fetchAndCacheProfile, interval);
}

async function fetchRecentlyPlayed(token) {
    // Cache recent tracks, update every 30 seconds
    if (Date.now() - lastRecentFetch < RECENT_INTERVAL && cachedRecentTracks.length > 0) {
        return cachedRecentTracks;
    }

    try {
        const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=3', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 429) {
            console.log('Recent tracks rate limited');
            return cachedRecentTracks;
        }

        if (!res.ok) return cachedRecentTracks;

        const data = await res.json();
        cachedRecentTracks = (data.items || []).map(item => ({
            name: item.track.name,
            artist: item.track.artists.map(a => a.name).join(', '),
            image: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
            url: item.track.external_urls.spotify
        }));
        lastRecentFetch = Date.now();
    } catch (e) {
        console.error('Recent tracks error:', e.message);
    }
    return cachedRecentTracks;
}

async function fetchNowPlaying() {
    const token = await refreshAccessToken();
    if (!token) return null;

    const recentTracks = await fetchRecentlyPlayed(token);
    const profile = userProfile || {};

    try {
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 429) {
            console.log('Now playing rate limited');
            return currentData; // Return cached data
        }

        if (res.status === 204 || res.status === 202) {
            return { playing: false, online: false, recentTracks, ...profile };
        }

        if (!res.ok) {
            return { playing: false, online: false, recentTracks, ...profile };
        }

        const data = await res.json();
        if (!data.item) {
            return { playing: false, online: true, recentTracks, ...profile };
        }

        return {
            playing: data.is_playing,
            online: true,
            name: data.item.name,
            artist: data.item.artists.map(a => a.name).join(', '),
            album: data.item.album.name,
            image: data.item.album.images[1]?.url || data.item.album.images[0]?.url,
            url: data.item.external_urls.spotify,
            progress: data.progress_ms,
            duration: data.item.duration_ms,
            recentTracks,
            ...profile
        };
    } catch (e) {
        console.error('Now playing error:', e.message);
        return currentData;
    }
}

function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        client.write(message);
    }
}

async function pollLoop() {
    metrics.polls++;
    metrics.lastPollAt = new Date().toISOString();
    try {
        const data = await fetchNowPlaying();
        if (data) {
            currentData = data;
            broadcast(data);
        }
    } catch (e) {
        metrics.errors++;
        console.error('Poll error:', e.message);
    }
    setTimeout(pollLoop, POLL_INTERVAL);
}

// Start profile fetch immediately, then poll loop
fetchAndCacheProfile();
setTimeout(pollLoop, 2000); // Wait 2s for profile to load first

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url === '/health') {
        metrics.requests.health++;
        res.setHeader('Content-Type', 'text/plain');
        return res.end('ok');
    }

    if (req.url === '/metrics') {
        metrics.requests.metrics++;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
            uptime: Math.floor((Date.now() - metrics.startedAt) / 1000),
            connections: sseClients.size,
            requests: metrics.requests,
            errors: metrics.errors,
            polls: metrics.polls,
            lastPollAt: metrics.lastPollAt
        }));
    }

    if (req.url === '/stream' || req.url === '/api/spotify/stream') {
        metrics.requests.stream++;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (currentData) {
            res.write(`data: ${JSON.stringify(currentData)}\n\n`);
        }

        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
    }

    if (req.url === '/now-playing' || req.url === '/api/spotify/now-playing') {
        metrics.requests.nowPlaying++;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(currentData || { error: 'unavailable' }));
        return;
    }

    res.statusCode = 404;
    res.end('{}');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Spotify service on :${PORT}`));
