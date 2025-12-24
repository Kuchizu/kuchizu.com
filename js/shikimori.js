function renderShikimori(shikimori) {
    const section = document.getElementById('shikimori');
    if (!section) return;

    if (!shikimori) {
        section.style.display = 'none';
        return;
    }

    const avatarEl = document.getElementById('shikimori-avatar');
    const nameEl = document.getElementById('shikimori-name');
    const statsEl = document.getElementById('shikimori-stats');
    const listEl = document.getElementById('shikimori-list');
    const footerEl = document.getElementById('shikimori-footer');

    if (avatarEl && shikimori.avatar) {
        avatarEl.src = shikimori.avatar;
        avatarEl.alt = shikimori.nickname;
    }
    if (nameEl) nameEl.textContent = shikimori.nickname;
    if (statsEl) statsEl.textContent = `${shikimori.watching} watching`;

    if (listEl) {
        if (shikimori.current?.length) {
            listEl.innerHTML = shikimori.current.map(a => `
                <a href="${a.url}" target="_blank" rel="noopener" class="shikimori-anime">
                    <img class="shikimori-anime-img" src="${a.image}" alt="${a.name}" loading="lazy">
                    <div class="shikimori-anime-info">
                        <div class="shikimori-anime-name">${a.name}</div>
                        <div class="shikimori-anime-eps">${a.episodes} ep</div>
                    </div>
                </a>
            `).join('');
        } else {
            listEl.innerHTML = '<span style="color:var(--fg-muted);font-size:0.6rem">Nothing watching</span>';
        }
    }

    if (footerEl) {
        footerEl.innerHTML = `<a href="${shikimori.url}" target="_blank" rel="noopener" style="color:var(--fg-muted);text-decoration:none;">${shikimori.completed} completed</a>`;
    }
}
