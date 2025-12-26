const http = require('http');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

let accessToken = null;
let tokenExpiry = 0;

// Cache for 5 seconds - all users see the same track
let cachedData = null;
let cacheExpiry = 0;

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

async function getNowPlaying() {
    // Return cached data if fresh
    if (cachedData && Date.now() < cacheExpiry) {
        return cachedData;
    }

    const token = await refreshAccessToken();
    if (!token) return null;

    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    let result;

    if (res.status === 204 || res.status === 202) {
        result = { playing: false };
    } else if (!res.ok) {
        result = null;
    } else {
        const data = await res.json();
        if (!data.item) {
            result = { playing: false };
        } else {
            result = {
                playing: data.is_playing,
                track: data.item.name,
                artist: data.item.artists.map(a => a.name).join(', '),
                album: data.item.album.name,
                image: data.item.album.images[1]?.url || data.item.album.images[0]?.url,
                url: data.item.external_urls.spotify,
                progress: data.progress_ms,
                duration: data.item.duration_ms
            };
        }
    }

    // Cache for 5 seconds
    cachedData = result;
    cacheExpiry = Date.now() + 5000;

    return result;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/health') {
        return res.end('ok');
    }

    if (req.url === '/now-playing' || req.url === '/api/spotify/now-playing') {
        try {
            const data = await getNowPlaying();
            res.end(JSON.stringify(data || { error: 'unavailable' }));
        } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    res.statusCode = 404;
    res.end('{}');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Spotify service on :${PORT}`));
