const http = require('http');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

let accessToken = null;
let tokenExpiry = 0;
let currentData = null;
let userProfile = null;
const sseClients = new Set();

async function refreshAccessToken() {
    if (accessToken && Date.now() < tokenExpiry - 60000) {
        return accessToken;
    }

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
    return accessToken;
}

async function fetchUserProfile() {
    const token = await refreshAccessToken();
    if (!token) return {};

    if (!userProfile) {
        try {
            const profileRes = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (profileRes.ok) {
                const profileData = await profileRes.json();
                userProfile = {
                    userName: profileData.display_name,
                    avatar: profileData.images?.[0]?.url || null,
                    profileUrl: profileData.external_urls?.spotify
                };
            }
        } catch (e) {
            console.error('Profile fetch error:', e.message);
        }
    }

    if (!userProfile) return {};

    return { ...userProfile, likedSongs: 56 };
}

async function fetchRecentlyPlayed(token) {
    try {
        const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=3', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map(item => ({
            name: item.track.name,
            artist: item.track.artists.map(a => a.name).join(', '),
            image: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
            url: item.track.external_urls.spotify
        }));
    } catch {
        return [];
    }
}

async function fetchNowPlaying() {
    const token = await refreshAccessToken();
    if (!token) return null;

    const [profile, recentTracks] = await Promise.all([
        fetchUserProfile(),
        fetchRecentlyPlayed(token)
    ]);

    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 204 || res.status === 202) {
        return { playing: false, online: false, recentTracks, ...profile };
    }

    if (!res.ok) return { playing: false, online: false, recentTracks, ...profile };

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
}

function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        client.write(message);
    }
}

// Poll Spotify every 3 seconds and broadcast to all SSE clients
async function pollLoop() {
    try {
        const data = await fetchNowPlaying();
        if (data) {
            currentData = data;
            broadcast(data);
        }
    } catch (e) {
        console.error('Poll error:', e.message);
    }
    setTimeout(pollLoop, 3000);
}

pollLoop();

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url === '/health') {
        res.setHeader('Content-Type', 'text/plain');
        return res.end('ok');
    }

    // SSE endpoint
    if (req.url === '/stream' || req.url === '/api/spotify/stream') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send current data immediately
        if (currentData) {
            res.write(`data: ${JSON.stringify(currentData)}\n\n`);
        }

        sseClients.add(res);

        req.on('close', () => {
            sseClients.delete(res);
        });
        return;
    }

    // Legacy polling endpoint (fallback)
    if (req.url === '/now-playing' || req.url === '/api/spotify/now-playing') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(currentData || { error: 'unavailable' }));
        return;
    }

    res.statusCode = 404;
    res.end('{}');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Spotify service on :${PORT} (SSE enabled)`));
