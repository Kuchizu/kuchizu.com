const http = require('http');

const API_KEY = process.env.STEAM_API_KEY;
const USERNAME = process.env.STEAM_USERNAME || 'Kuchizu';

let cachedData = null;
let cacheExpiry = 0;
let steamId = null;

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

async function getStatus() {
    // Return cached data if fresh (10 seconds cache)
    if (cachedData && Date.now() < cacheExpiry) {
        return cachedData;
    }

    if (!API_KEY) return { error: 'No API key' };

    try {
        const id = await resolveSteamId();
        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?steamids=${id}&key=${API_KEY}`);
        const data = await res.json();
        const player = data?.response?.players?.[0];

        if (!player) {
            cachedData = { online: false };
        } else {
            const states = ['Offline', 'Online', 'Busy', 'Away', 'Snooze', 'Looking to trade', 'Looking to play'];
            cachedData = {
                online: player.personastate > 0,
                status: states[player.personastate] || 'Offline',
                inGame: player.gameextrainfo || null,
                gameId: player.gameid || null,
                avatar: player.avatarmedium,
                name: player.personaname
            };
        }

        cacheExpiry = Date.now() + 10000; // 10 seconds
        return cachedData;
    } catch (e) {
        return { error: e.message };
    }
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/health') {
        return res.end('ok');
    }

    if (req.url === '/status' || req.url === '/api/steam/status') {
        const data = await getStatus();
        return res.end(JSON.stringify(data));
    }

    res.statusCode = 404;
    res.end('{}');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Steam service on :${PORT}`));
