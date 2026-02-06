const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');

// Order matters — dependencies first
const files = [
    'js/config.js',
    'js/utils.js',
    'js/github.js',
    'js/steam.js',
    'js/spotify.js',
    'js/shikimori.js',
    'js/servers.js',
    'js/typing.js',
    'js/uptime.js',
    'js/corners.js',
    'js/main.js'
];

const bundle = files
    .map(f => {
        const content = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
        return `// --- ${f} ---\n${content}`;
    })
    .join('\n');

fs.writeFileSync(path.join(PUBLIC, 'js', 'bundle.js'), bundle);
console.log(`Bundled ${files.length} files -> js/bundle.js (${(bundle.length / 1024).toFixed(1)}KB)`);
