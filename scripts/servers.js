const SERVERS = (process.env.SERVERS || '').split(',').filter(Boolean);

async function getServersData() {
    if (!SERVERS.length) return null;

    return Promise.all(SERVERS.map(async (url) => {
        try {
            const res = await fetch(url.trim(), { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error();
            return await res.json();
        } catch {
            return { name: new URL(url).hostname.split('.')[0], status: 'offline', processes: [] };
        }
    }));
}

module.exports = { getServersData };
