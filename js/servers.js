function renderServers(servers) {
    const section = document.getElementById('servers');
    if (!section) return;

    if (!servers?.length) {
        section.style.display = 'none';
        return;
    }

    const listEl = document.getElementById('servers-list');
    if (!listEl) return;

    const onlineServers = servers.filter(s => s.status !== 'offline').length;
    const totalProcesses = servers.reduce((sum, s) => sum + (s.processes?.total || 0), 0);
    const onlineProcesses = servers.reduce((sum, s) => sum + (s.processes?.online || 0), 0);

    listEl.innerHTML = servers.map(s => {
        const isOffline = s.status === 'offline';
        const p = s.processes || {};
        return `
            <div class="server ${isOffline ? 'offline' : ''}">
                <div class="server-main">
                    <span class="server-status"></span>
                    <span class="server-name">${s.name}</span>
                    <span class="server-uptime">${isOffline ? 'offline' : `${s.uptime}d`}</span>
                </div>
                ${!isOffline ? `
                <div class="server-stats">
                    <span>${p.online}/${p.total} proc</span>
                    <span>${s.memory}% ram</span>
                    <span>${p.cpu}% cpu</span>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');

    const footerEl = document.getElementById('servers-footer');
    if (footerEl) {
        footerEl.textContent = `${onlineServers}/${servers.length} servers, ${onlineProcesses}/${totalProcesses} processes`;
    }
}
