const http = require('http');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

let accessToken = null;
let tokenExpiry = 0;
let currentData = null;
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

async function fetchNowPlaying() {
    const token = await refreshAccessToken();
    if (!token) return null;

    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 204 || res.status === 202) {
        return { playing: false };
    }

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.item) {
        return { playing: false };
    }

    return {
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
