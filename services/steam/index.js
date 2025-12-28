const http = require('http');

const API_KEY = process.env.STEAM_API_KEY;
const USERNAME = process.env.STEAM_USERNAME || 'Kuchizu';

let currentData = null;
let steamId = null;
const sseClients = new Set();

async function resolveSteamId() {
    if (steamId) return steamId;
    if (/^\d{17}$/.test(USERNAME)) {
        steamId = USERNAME;
        return steamId;
    }

    const res = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?vanityurl=${USERNAME}&key=${API_KEY}`);
    const data = await res.json();
    if (data?.response?.success === 1) {
        steamId = data.response.steamid;
        return steamId;
    }
    throw new Error('Could not resolve Steam ID');
}

async function fetchStatus() {
    if (!API_KEY) return { error: 'No API key' };

    try {
        const id = await resolveSteamId();
        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?steamids=${id}&key=${API_KEY}`);
        const data = await res.json();
        const player = data?.response?.players?.[0];

        if (!player) {
            return { online: false };
        }

        const states = ['Offline', 'Online', 'Busy', 'Away', 'Snooze', 'Looking to trade', 'Looking to play'];
        return {
            online: player.personastate > 0,
            status: states[player.personastate] || 'Offline',
            inGame: player.gameextrainfo || null,
            gameId: player.gameid || null,
            avatar: player.avatarmedium,
            name: player.personaname
        };
    } catch (e) {
        return { error: e.message };
    }
}

function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        client.write(message);
    }
}

// Poll Steam every 10 seconds and broadcast to all SSE clients
async function pollLoop() {
    try {
        const data = await fetchStatus();
        if (data && !data.error) {
            currentData = data;
            broadcast(data);
        }
    } catch (e) {
        console.error('Poll error:', e.message);
    }
    setTimeout(pollLoop, 10000);
}

pollLoop();

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url === '/health') {
        res.setHeader('Content-Type', 'text/plain');
        return res.end('ok');
    }

    // SSE endpoint
    if (req.url === '/stream' || req.url === '/api/steam/stream') {
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
    if (req.url === '/status' || req.url === '/api/steam/status') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(currentData || { error: 'unavailable' }));
        return;
    }

    res.statusCode = 404;
    res.end('{}');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Steam service on :${PORT} (SSE enabled)`));
