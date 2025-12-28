const fs = require('fs');
const path = require('path');
const { getGitHubData } = require('./github');
const { getSteamData } = require('./steam');
const { getShikimoriData } = require('./shikimori');
const { getSpotifyData } = require('./spotify');
const { getServersData } = require('./servers');
const { processImages } = require('./images');

async function main() {
    console.log('Fetching data...');

    const [github, steam, shikimori, spotify, servers] = await Promise.all([
        getGitHubData(),
        getSteamData(),
        getShikimoriData(),
        getSpotifyData(),
        getServersData()
    ]);

    let data = {
        updated_at: new Date().toISOString(),
        github,
        steam,
        shikimori,
        spotify,
        servers
    };

    console.log('Downloading images...');
    data = await processImages(data);

    const outputPath = path.join(__dirname, '..', 'public', 'data', 'github.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log('Done:', outputPath);
    console.log('  GitHub: ✓');
    console.log('  Steam:', steam ? '✓' : 'skipped (no API key)');
    console.log('  Shikimori:', shikimori ? '✓' : 'skipped');
    console.log('  Spotify:', spotify ? '✓' : 'skipped (no credentials)');
    console.log('  Servers:', servers ? `✓ (${servers.length})` : 'skipped (no SERVERS)');
}

main().catch(e => { console.error(e); process.exit(1); });
