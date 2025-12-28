'use strict';

initTime();
initEmail();
loadGitHubData();
loadPodInfo();

async function loadPodInfo() {
    try {
        const [podRes, commitRes] = await Promise.all([
            fetch('/api/pod'),
            fetch('/api/commit')
        ]);
        const podData = await podRes.json();
        const commit = (await commitRes.text()).trim();
        const el = document.getElementById('pod-info');
        if (el && podData.pod) {
            const commitLink = commit ? `<a href="https://github.com/Kuchizu/kuchizu.com/commit/${commit}" target="_blank" class="commit-link">${commit}</a>` : '';
            el.innerHTML = '<svg class="pod-icon" viewBox="0 0 32 32"><path fill="currentColor" d="M16 2.13l-12 6v15.74l12 6 12-6V8.13l-12-6zm0 2.3l9.26 4.63L16 13.69 6.74 9.06 16 4.43zM5 10.61l10 5v11.96l-10-5V10.61zm22 11.96l-10 5V15.61l10-5v11.96z"/></svg>' + podData.pod.slice(-5) + (commitLink ? ' · ' + commitLink : '');
            el.title = 'Pod: ' + podData.pod;
        }
    } catch (e) {
        // Not running in Kubernetes
    }
}
