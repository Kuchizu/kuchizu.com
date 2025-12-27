function updateCornerTime() {
    const el = document.getElementById('corner-time');
    if (!el) return;

    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
}

function updateResolution() {
    const el = document.getElementById('corner-resolution');
    if (!el) return;

    el.textContent = `${window.innerWidth}x${window.innerHeight}`;
}

function updateLoadTime() {
    const el = document.getElementById('corner-load');
    if (!el) return;

    const perf = performance.getEntriesByType('navigation')[0];
    if (perf) {
        const loadTime = (perf.loadEventEnd - perf.startTime) / 1000;
        el.textContent = `Load: ${loadTime.toFixed(2)}s`;
    }
}

async function updatePing() {
    const el = document.getElementById('corner-ping');
    if (!el) return;

    try {
        const start = performance.now();
        await fetch('/api/data', { method: 'HEAD', cache: 'no-store' });
        const ping = Math.round(performance.now() - start);
        el.textContent = `${ping}ms`;
    } catch {
        el.textContent = '--ms';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateCornerTime();
    updateResolution();

    setInterval(updateCornerTime, 1000);
    window.addEventListener('resize', updateResolution);

    // Load time after page fully loads
    if (document.readyState === 'complete') {
        updateLoadTime();
    } else {
        window.addEventListener('load', () => setTimeout(updateLoadTime, 0));
    }

    // Ping every 3 seconds
    updatePing();
    setInterval(updatePing, 3000);
});
