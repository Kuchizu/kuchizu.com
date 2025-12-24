const config = require('./config');

async function fetchSteam(endpoint) {
    if (!process.env.STEAM_API_KEY) return null;
    const url = `https://api.steampowered.com/${endpoint}&key=${process.env.STEAM_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam API: ${res.status}`);
    return res.json();
}

async function resolveSteamId(username) {
    if (/^\d{17}$/.test(username)) return username;
    const res = await fetchSteam(`ISteamUser/ResolveVanityURL/v1/?vanityurl=${username}`);
    if (res?.response?.success === 1) return res.response.steamid;
    throw new Error(`Could not resolve Steam username: ${username}`);
}

async function getSteamData() {
    if (!process.env.STEAM_API_KEY) return null;

    try {
        const steamId = await resolveSteamId(config.STEAM_USERNAME);
        const [playerRes, recentRes, ownedRes] = await Promise.all([
            fetchSteam(`ISteamUser/GetPlayerSummaries/v2/?steamids=${steamId}`),
            fetchSteam(`IPlayerService/GetRecentlyPlayedGames/v1/?steamid=${steamId}&count=4`),
            fetchSteam(`IPlayerService/GetOwnedGames/v1/?steamid=${steamId}&include_played_free_games=1`)
        ]);

        const player = playerRes?.response?.players?.[0];
        if (!player) return null;

        const personaStates = ['Offline', 'Online', 'Busy', 'Away', 'Snooze', 'Looking to trade', 'Looking to play'];

        const recentGames = (recentRes?.response?.games || []).map(g => ({
            appid: g.appid,
            name: g.name,
            playtime_2weeks: Math.round(g.playtime_2weeks / 60),
            playtime_forever: Math.round(g.playtime_forever / 60),
            icon: `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
        }));

        return {
            personaname: player.personaname,
            avatar: player.avatarmedium,
            profileurl: player.profileurl,
            status: personaStates[player.personastate] || 'Offline',
            isOnline: player.personastate > 0,
            inGame: player.gameextrainfo || null,
            gameId: player.gameid || null,
            recentGames,
            totalGames: ownedRes?.response?.game_count || 0
        };
    } catch (err) {
        console.error('Steam API error:', err.message);
        return null;
    }
}

module.exports = { getSteamData };
