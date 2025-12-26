const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IMAGES_DIR = path.join(__dirname, '..', 'data', 'images');
const BASE_URL = '/data/images';

function getImageFilename(url) {
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
    const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
    return hash + ext;
}

async function downloadImage(url) {
    if (!url) return null;

    try {
        const filename = getImageFilename(url);
        const filepath = path.join(IMAGES_DIR, filename);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);

        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(filepath, buffer);

        return `${BASE_URL}/${filename}`;
    } catch (err) {
        console.error(`Image download failed: ${url}`, err.message);
        return url;
    }
}

async function processImages(data) {
    if (fs.existsSync(IMAGES_DIR)) {
        fs.rmSync(IMAGES_DIR, { recursive: true });
    }
    fs.mkdirSync(IMAGES_DIR, { recursive: true });

    if (data.steam) {
        if (data.steam.avatar) {
            data.steam.avatar = await downloadImage(data.steam.avatar);
        }
        if (data.steam.recentGames) {
            for (const game of data.steam.recentGames) {
                if (game.icon) {
                    game.icon = await downloadImage(game.icon);
                }
            }
        }
    }

    if (data.shikimori) {
        if (data.shikimori.avatar) {
            data.shikimori.avatar = await downloadImage(data.shikimori.avatar);
        }
        if (data.shikimori.current) {
            for (const anime of data.shikimori.current) {
                if (anime.image) {
                    anime.image = await downloadImage(anime.image);
                }
            }
        }
    }

    if (data.spotify) {
        if (data.spotify.currentlyPlaying?.image) {
            data.spotify.currentlyPlaying.image = await downloadImage(data.spotify.currentlyPlaying.image);
        }
        if (data.spotify.recentTracks) {
            for (const track of data.spotify.recentTracks) {
                if (track.image) {
                    track.image = await downloadImage(track.image);
                }
            }
        }
    }

    return data;
}

module.exports = { processImages };
