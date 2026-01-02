function timeAgo(date) {
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 5) return 'just now';
    if (s < 3600) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return sec > 0 ? `${m}m ${sec}s ago` : `${m}m ago`;
    }
    const i = { y: 31536000, mo: 2592000, d: 86400, h: 3600 };
    for (const [u, v] of Object.entries(i)) {
        const n = Math.floor(s / v);
        if (n >= 1) return `${n}${u} ago`;
    }
    return 'just now';
}

function updateTime() {
    const el = document.getElementById('time');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: CONFIG.timezone
    });
}

function initTime() {
    updateTime();
    setInterval(updateTime, 1000);
}

function initEmail() {
    const btn = document.getElementById('email-btn');
    const text = document.getElementById('email-text');
    if (!btn || !text) return;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = btn.dataset.email;
        try {
            await navigator.clipboard.writeText(email);
            text.textContent = 'Copied!';
            setTimeout(() => { text.textContent = 'Email'; }, 2000);
        } catch {
            window.location.href = 'mailto:' + email;
        }
    });
}
