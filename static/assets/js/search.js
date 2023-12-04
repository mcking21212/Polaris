import { workerLoaded, loadWorker } from '/assets/js/wpm.js';

const load = () => {
    const xor = {
        encode: (str, key = 2) => {
            if (!str) return str;
            return encodeURIComponent(str.split('').map((e, i) => i % key ? String.fromCharCode(e.charCodeAt(0) ^ key) : e).join(''));
        },
        decode: (str, key = 2) => {
            if (!str) return str;
            return decodeURIComponent(str).split('').map((e, i) => i % key ? String.fromCharCode(e.charCodeAt(0) ^ key) : e).join('');
        }
    };

    const form = document.querySelector('#wpf');
    const query = document.querySelector('#query');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (typeof navigator.serviceWorker === 'undefined') new PolarisError('Failed to load Proxy');
        if (!workerLoaded) await loadWorker();

        const url = /^(http(s)?:\/\/)?([\w-]+\.)+[\w]{2,}(\/.*)?$/.test(query.value) ? ((!query.value.startsWith('http://') && !query.value.startsWith('https://')) ? 'https://' + query.value : query.value) : 'https://www.google.com/search?q=' + encodeURIComponent(query.value);

        const frameData = {
            type: 'proxy',
            source: `/uv/service/${xor.encode(url)}`
        };

        localStorage.setItem('frameData', JSON.stringify(frameData));
        location.href = '/view';
    });
}

export default { load };
