const phrases = [
    'DevOps Engineer',
    'Programmer',
    'Linux Enthusiast',
    'K8s Enjoyer',
    'Self-Hoster',
    'Anime Watcher',
    'Makima One Love',
    'Cat Lover',
    'Coffee Addict',
    'Open Source Contributor'
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingTimeout = null;

function initTyping() {
    const el = document.querySelector('.bio-text');
    if (!el) return;

    function type() {
        const currentPhrase = phrases[phraseIndex];

        if (isDeleting) {
            charIndex--;
            el.textContent = currentPhrase.substring(0, charIndex);
        } else {
            charIndex++;
            el.textContent = currentPhrase.substring(0, charIndex);
        }

        let delay = isDeleting ? 50 : 100;

        if (!isDeleting && charIndex === currentPhrase.length) {
            delay = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            delay = 500;
        }

        typingTimeout = setTimeout(type, delay);
    }

    type();
}

document.addEventListener('DOMContentLoaded', initTyping);
