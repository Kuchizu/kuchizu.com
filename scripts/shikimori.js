const config = require('./config');

async function getShikimoriData() {
    try {
        const userRes = await fetch(`https://shikimori.one/api/users/${config.SHIKIMORI_USERNAME}`, {
            headers: { 'User-Agent': 'kuchizu.com' }
        });
        if (!userRes.ok) throw new Error(`Shikimori: ${userRes.status}`);
        const user = await userRes.json();

        const ratesRes = await fetch(`https://shikimori.one/api/users/${user.id}/anime_rates?status=watching&limit=3`, {
            headers: { 'User-Agent': 'kuchizu.com' }
        });
        const watching = ratesRes.ok ? await ratesRes.json() : [];

        const stats = user.stats?.statuses?.anime || [];
        const getCount = name => stats.find(s => s.name === name)?.size || 0;

        return {
            nickname: user.nickname,
            avatar: user.image?.x160 || user.avatar || null,
            url: `https://shikimori.one/${user.nickname}`,
            watching: getCount('watching'),
            completed: getCount('completed'),
            total: stats.reduce((sum, s) => sum + (s.size || 0), 0),
            current: watching.slice(0, 3).map(r => {
                const img = r.anime?.image?.original || r.anime?.image?.x48;
                return {
                    name: r.anime?.russian || r.anime?.name || 'Unknown',
                    image: img ? `https://shikimori.one${img}` : null,
                    episodes: `${r.episodes || 0}/${r.anime?.episodes || '?'}`,
                    url: r.anime?.url ? `https://shikimori.one${r.anime.url}` : '#'
                };
            })
        };
    } catch (err) {
        console.error('Shikimori API error:', err.message);
        return null;
    }
}

module.exports = { getShikimoriData };
