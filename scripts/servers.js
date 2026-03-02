const fs = require('fs');
const path = require('path');

const SERVERS = (process.env.SERVERS || '')
    .split(',')
    .map(url => url.trim())
    .filter(Boolean);

const OFFLINE_ALERT_THRESHOLD = Number.parseInt(process.env.SERVER_OFFLINE_ALERT_THRESHOLD || '10', 10);
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();
const ALERT_STATE_PATH = path.join(__dirname, '..', 'public', 'data', '.servers-alert-state.json');

function getAlertThreshold() {
    return Number.isFinite(OFFLINE_ALERT_THRESHOLD) && OFFLINE_ALERT_THRESHOLD > 0 ? OFFLINE_ALERT_THRESHOLD : 10;
}

function getServerName(url) {
    try {
        return new URL(url).hostname.split('.')[0];
    } catch {
        return url;
    }
}

function loadAlertState() {
    try {
        const data = fs.readFileSync(ALERT_STATE_PATH, 'utf8');
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function saveAlertState(state) {
    fs.mkdirSync(path.dirname(ALERT_STATE_PATH), { recursive: true });
    fs.writeFileSync(ALERT_STATE_PATH, JSON.stringify(state, null, 2));
}

async function sendTelegramMessage(text) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;

    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                disable_web_page_preview: true
            })
        });

        if (!res.ok) {
            console.error(`Telegram API error: ${res.status}`);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Telegram send error:', err.message);
        return false;
    }
}

async function getServersData() {
    if (!SERVERS.length) return null;

    const threshold = getAlertThreshold();
    const alertState = loadAlertState();

    const servers = await Promise.all(SERVERS.map(async (url) => {
        const current = alertState[url] || { consecutiveFailures: 0, alertSent: false };

        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const payload = await res.json();
            alertState[url] = { consecutiveFailures: 0, alertSent: false };
            return payload;
        } catch {
            const consecutiveFailures = (current.consecutiveFailures || 0) + 1;
            const shouldSendAlert = consecutiveFailures >= threshold && !current.alertSent;
            let alertSent = current.alertSent || false;

            if (shouldSendAlert) {
                const serverName = getServerName(url);
                const message = [
                    'Server monitor alert',
                    `Server: ${serverName}`,
                    `URL: ${url}`,
                    `Failed checks in a row: ${consecutiveFailures}`
                ].join('\n');

                alertSent = await sendTelegramMessage(message);
            }

            alertState[url] = { consecutiveFailures, alertSent };
            return { name: getServerName(url), status: 'offline', processes: [] };
        }
    }));

    for (const trackedUrl of Object.keys(alertState)) {
        if (!SERVERS.includes(trackedUrl)) delete alertState[trackedUrl];
    }

    saveAlertState(alertState);
    return servers;
}

module.exports = { getServersData };
