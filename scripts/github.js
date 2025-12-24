const config = require('./config');

async function fetchGitHub(url) {
    const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'kuchizu.com' };
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
    return res.json();
}

async function getGitHubData() {
    const [user, repos, events, contribRes] = await Promise.all([
        fetchGitHub(`https://api.github.com/users/${config.GITHUB_USERNAME}`),
        fetchGitHub(`https://api.github.com/users/${config.GITHUB_USERNAME}/repos?per_page=100&sort=pushed`),
        fetchGitHub(`https://api.github.com/users/${config.GITHUB_USERNAME}/events/public?per_page=30`),
        fetch(`https://github-contributions-api.jogruber.de/v4/${config.GITHUB_USERNAME}?y=last`).then(r => r.json())
    ]);

    const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);

    const langBytes = {};
    for (const r of repos) {
        if (r.fork || !r.language) continue;
        langBytes[r.language] = (langBytes[r.language] || 0) + (r.size || 1);
    }
    const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);

    return {
        stats: { repos: user.public_repos, stars: totalStars, followers: user.followers, following: user.following },
        languages: Object.entries(langBytes)
            .map(([name, bytes]) => ({ name, percent: totalBytes > 0 ? parseFloat((bytes / totalBytes * 100).toFixed(1)) : 0 }))
            .sort((a, b) => b.percent - a.percent).slice(0, 6),
        pinned: repos.filter(r => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 4)
            .map(r => ({ name: r.name, description: r.description, url: r.html_url, language: r.language, stars: r.stargazers_count, forks: r.forks_count })),
        activity: events.filter(e => ['PushEvent', 'CreateEvent', 'IssuesEvent', 'PullRequestEvent', 'WatchEvent'].includes(e.type)).slice(0, 5)
            .map(e => ({ type: e.type, repo: e.repo.name, payload: { action: e.payload.action, ref_type: e.payload.ref_type, commits: e.payload.commits?.length || 0 }, created_at: e.created_at })),
        contributions: (contribRes.contributions || []).slice(-49).map(c => ({ date: c.date, count: c.count, level: c.level }))
    };
}

module.exports = { getGitHubData };
