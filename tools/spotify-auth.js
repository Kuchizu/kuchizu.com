const http = require('http');
const { URL } = require('url');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first');
    process.exit(1);
}

const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'user-read-currently-playing user-read-recently-played'
})}`;

console.log('Add Redirect URI:', REDIRECT_URI);
console.log('Open:', authUrl);

http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:8888');
    const code = url.searchParams.get('code');
    if (!code) return;

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI })
    });

    const data = await tokenRes.json();
    res.end(data.refresh_token ? 'Done. Check terminal.' : 'Error: ' + JSON.stringify(data));
    console.log(data.refresh_token ? '\nSPOTIFY_REFRESH_TOKEN=' + data.refresh_token : data);
    process.exit(0);
}).listen(8888, '127.0.0.1');
