async function getSpotifyAccessToken() {
    const basic = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: process.env.SPOTIFY_REFRESH_TOKEN
        })
    });

    if (!res.ok) throw new Error('Failed to get Spotify token');
    const data = await res.json();
    return data.access_token;
}

async function getSpotifyData() {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REFRESH_TOKEN) {
        return null;
    }

    try {
        const token = await getSpotifyAccessToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        const [currentRes, recentRes] = await Promise.all([
            fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers }),
            fetch('https://api.spotify.com/v1/me/player/recently-played?limit=3', { headers })
        ]);

        let currentlyPlaying = null;
        if (currentRes.ok && currentRes.status !== 204) {
            const current = await currentRes.json();
            if (current?.is_playing && current?.item) {
                currentlyPlaying = {
                    name: current.item.name,
                    artist: current.item.artists.map(a => a.name).join(', '),
                    album: current.item.album.name,
                    image: current.item.album.images[1]?.url || current.item.album.images[0]?.url,
                    url: current.item.external_urls.spotify
                };
            }
        }

        let recentTracks = [];
        if (recentRes.ok) {
            const recent = await recentRes.json();
            recentTracks = (recent.items || []).slice(0, 3).map(item => ({
                name: item.track.name,
                artist: item.track.artists.map(a => a.name).join(', '),
                image: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
                url: item.track.external_urls.spotify
            }));
        }

        return {
            currentlyPlaying,
            recentTracks
        };
    } catch (err) {
        console.error('Spotify API error:', err.message);
        return null;
    }
}

module.exports = { getSpotifyData };
