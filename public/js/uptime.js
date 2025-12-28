async function checkUptime() {
    const badge = document.getElementById('uptime-badge');
    const text = badge?.querySelector('.uptime-text');
    if (!badge || !text) return;

    const endpoints = [
        '/api/data',
        '/api/spotify/now-playing',
        '/api/steam/status'
    ];

    try {
        const results = await Promise.allSettled(
            endpoints.map(url =>
                fetch(url, { method: 'HEAD', cache: 'no-store' })
                    .then(r => r.ok)
                    .catch(() => false)
            )
        );

        const passed = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const total = endpoints.length;

        badge.classList.remove('operational', 'degraded', 'down');

        if (passed === total) {
            badge.classList.add('operational');
            text.textContent = 'All Systems Operational';
        } else if (passed > 0) {
            badge.classList.add('degraded');
            text.textContent = `${passed}/${total} Services Up`;
        } else {
            badge.classList.add('down');
            text.textContent = 'Services Unavailable';
        }
    } catch {
        badge.classList.add('down');
        text.textContent = 'Status Unknown';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkUptime();
    setInterval(checkUptime, 30000);
});
