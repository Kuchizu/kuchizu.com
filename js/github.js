async function loadGitHubData() {
    try {
        const res = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
        if (!res.ok) throw new Error('No data');
        const data = await res.json();
        renderUpdated(data.updated_at);
        renderAll(data.github || data);
        renderSteam(data.steam);
        renderSpotify(data.spotify);
        renderShikimori(data.shikimori);
        renderServers(data.servers);
    } catch {
        loadFromAPI();
    }
}

function renderUpdated(date) {
    const el = document.getElementById('updated');
    if (!el || !date) return;
    el.textContent = timeAgo(date);
}

async function loadFromAPI() {
    try {
        const [userRes, reposRes, eventsRes, contribRes] = await Promise.all([
            fetch(`https://api.github.com/users/${CONFIG.username}`),
            fetch(`https://api.github.com/users/${CONFIG.username}/repos?per_page=100&sort=pushed`),
            fetch(`https://api.github.com/users/${CONFIG.username}/events/public?per_page=10`),
            fetch(`https://github-contributions-api.jogruber.de/v4/${CONFIG.username}?y=last`)
        ]);

        const user = await userRes.json();
        const repos = await reposRes.json();
        const events = await eventsRes.json();
        const contribData = await contribRes.json();

        if (user.message || repos.message) throw new Error(user.message || repos.message);

        const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
        const langBytes = {};
        for (const r of repos) {
            if (r.fork || !r.language) continue;
            langBytes[r.language] = (langBytes[r.language] || 0) + (r.size || 1);
        }
        const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);

        renderAll({
            stats: { repos: user.public_repos, stars: totalStars, followers: user.followers, following: user.following },
            languages: Object.entries(langBytes)
                .map(([name, bytes]) => ({ name, percent: parseFloat((bytes / totalBytes * 100).toFixed(1)) }))
                .sort((a, b) => b.percent - a.percent).slice(0, 4),
            pinned: repos.filter(r => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 2)
                .map(r => ({ name: r.name, description: r.description, url: r.html_url, language: r.language, stars: r.stargazers_count })),
            activity: events.filter(e => ['PushEvent', 'CreateEvent', 'IssuesEvent', 'PullRequestEvent', 'WatchEvent'].includes(e.type)).slice(0, 3)
                .map(e => ({ type: e.type, repo: e.repo.name, payload: { action: e.payload.action, ref_type: e.payload.ref_type, commits: e.payload.commits?.length || 0 }, created_at: e.created_at })),
            contributions: (contribData.contributions || []).slice(-49)
        });
        renderSteam(null);
        renderSpotify(null);
        renderShikimori(null);
        renderServers(null);
    } catch (err) {
        console.error('API error:', err);
        showError();
    }
}

function showError() {
    ['github-graph', 'languages-list', 'pinned-list', 'activity-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span style="color:var(--fg-muted);font-size:0.6rem">Failed to load</span>';
    });
    renderSteam(null);
    renderSpotify(null);
    renderShikimori(null);
    renderServers(null);
}

function renderAll(data) {
    renderContributions(data.contributions);
    renderStats(data.stats);
    renderLanguages(data.languages);
    renderPinnedRepos(data.pinned);
    renderActivity(data.activity);
}

function renderContributions(c) {
    const el = document.getElementById('github-graph');
    if (!el || !c) return;
    const weeks = [];
    for (let i = 0; i < c.length; i += 7) weeks.push(c.slice(i, i + 7));
    el.innerHTML = weeks.map(w => `<div class="week">${w.map(d => `<div class="day level-${d.level || 0}"></div>`).join('')}</div>`).join('');
}

function renderStats(s) {
    if (!s) return;
    ['stat-repos', 'stat-stars', 'stat-followers', 'stat-following'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = [s.repos, s.stars, s.followers, s.following][i] || 0;
    });
}

function renderLanguages(langs) {
    const bar = document.getElementById('languages-bar');
    const list = document.getElementById('languages-list');
    if (!bar || !list || !langs?.length) return;

    const top = langs.slice(0, 4);
    bar.innerHTML = top.map(l => `<span style="width:${l.percent}%;background:${LANG_COLORS[l.name] || '#8b8b8b'}"></span>`).join('');
    list.innerHTML = top.map(l => `<div class="lang"><span class="lang-dot" style="background:${LANG_COLORS[l.name] || '#8b8b8b'}"></span><span class="lang-name">${l.name}</span><span class="lang-percent">${l.percent}%</span></div>`).join('');
}

function renderPinnedRepos(pinned) {
    const el = document.getElementById('pinned-list');
    if (!el) return;
    if (!pinned?.length) { el.innerHTML = '<span style="color:var(--fg-muted);font-size:0.6rem">No repos</span>'; return; }

    el.innerHTML = pinned.slice(0, 2).map(r => `
        <a href="${r.url}" target="_blank" rel="noopener" class="pinned-repo">
            <div class="pinned-repo-name"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>${r.name}</div>
            ${r.description ? `<p class="pinned-repo-desc">${r.description}</p>` : ''}
            <div class="pinned-repo-meta">
                ${r.language ? `<span><span class="pinned-repo-lang" style="background:${LANG_COLORS[r.language] || '#8b8b8b'}"></span>${r.language}</span>` : ''}
                ${r.stars > 0 ? `<span><svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>${r.stars}</span>` : ''}
            </div>
        </a>
    `).join('');
}

function renderActivity(activity) {
    const el = document.getElementById('activity-list');
    if (!el) return;
    if (!activity?.length) { el.innerHTML = '<span style="color:var(--fg-muted);font-size:0.6rem">No activity</span>'; return; }

    const icons = {
        PushEvent: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 7.75a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm1.43.75a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.001 4.001 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Z"/></svg>',
        CreateEvent: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Z"/></svg>',
        WatchEvent: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>',
        IssuesEvent: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/></svg>',
        PullRequestEvent: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Z"/></svg>'
    };

    el.innerHTML = activity.slice(0, 3).map(e => {
        const name = e.repo.split('/')[1];
        const url = `https://github.com/${e.repo}`;
        let text = e.type === 'PushEvent' ? `Pushed ${e.payload.commits} commit${e.payload.commits !== 1 ? 's' : ''} to`
            : e.type === 'CreateEvent' ? `Created ${e.payload.ref_type} in`
            : e.type === 'WatchEvent' ? 'Starred'
            : e.type === 'IssuesEvent' ? `${e.payload.action} issue in`
            : e.type === 'PullRequestEvent' ? `${e.payload.action} PR in` : 'Activity in';

        return `<div class="activity-item"><span class="activity-icon">${icons[e.type] || ''}</span><span>${text} <a href="${url}" target="_blank" rel="noopener">${name}</a> <span class="activity-time">· ${timeAgo(e.created_at)}</span></span></div>`;
    }).join('');
}
