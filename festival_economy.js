/* Assets da futura rota alternativa e carteira compartilhada do save atual. */
(function (global) {
    'use strict';
    const STORAGE_KEY = 'zorp_festival_wallet';
    const coinFrame = Object.freeze({x:78, y:96, width:546, height:550});
    const images = {};
    const sources = {coin:'moeda.png', zorpzinFerias:'zorpzin_ferias.png', capitao:'capitao.png'};
    const ready = Promise.all(Object.entries(sources).map(([name, src]) => new Promise(resolve => {
        const image = images[name] = new Image();
        image.onload = () => { if (name === 'coin') render(); resolve(true); };
        image.onerror = () => { console.error('[FestivalAssets] Não foi possível carregar '+src); resolve(false); };
        image.src = src;
    })));
    global.FestivalAssets = Object.freeze({images:Object.freeze(images), coinFrame, ready});

    const valid = value => Number.isSafeInteger(value) && value >= 0;
    let coins = 0;
    let pagouCapitao = false, feriasVistas = false;
    const challenges = Object.create(null);
    const validId = id => typeof id === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(id);
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved && valid(saved.coins)) coins = saved.coins;
        pagouCapitao = saved?.pagouCapitao === true;
        feriasVistas = pagouCapitao && saved?.feriasVistas === true;
        for (const [id, state] of Object.entries(saved?.challenges || {})) {
            if (!validId(id) || !state || typeof state !== 'object') continue;
            const accepted = state.accepted === true, completed = accepted && state.completed === true;
            challenges[id] = {accepted, completed, claimed:completed && state.claimed === true,
                evidence:state.evidence && typeof state.evidence === 'object' ? state.evidence : null};
        }
    } catch (_) { /* Sem armazenamento, a carteira continua disponível nesta sessão. */ }

    function persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:3, coins, challenges,
            pagouCapitao, feriasDesbloqueadas:pagouCapitao, feriasVistas})); }
        catch (_) { /* Mantém o saldo da sessão sem interromper o jogo. */ }
    }

    function render() {
        const value = document.getElementById('coin-value');
        const tag = document.getElementById('coin-counter');
        if (value) value.textContent = String(coins);
        if (tag) tag.setAttribute('aria-label', 'Moedas: '+coins);
        const icon = document.getElementById('coin-icon'), image = images.coin;
        if (icon && image.complete && image.naturalWidth > 0) {
            const context = icon.getContext('2d');
            context.clearRect(0, 0, icon.width, icon.height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            // Uma única moeda da folha original, sem animação ou alteração do PNG.
            context.drawImage(image, coinFrame.x, coinFrame.y, coinFrame.width, coinFrame.height,
                0, 0, icon.width, icon.height);
        }
    }

    global.FestivalWallet = Object.freeze({
        storageKey:STORAGE_KEY,
        get coins() { return coins; },
        get pagouCapitao() { return pagouCapitao; },
        get feriasDesbloqueadas() { return pagouCapitao; },
        get feriasVistas() { return feriasVistas; },
        payCaptain() {
            if (pagouCapitao) return 'already_paid';
            const allMedals = global.MEDALHAS_REGISTRY?.length === 8 &&
                global.MEDALHAS_REGISTRY.every(m => global.isMedalhaDesbloqueada(m.id));
            if (!allMedals) return 'missing_medals';
            if (coins < 100) return 'insufficient_coins';
            coins -= 100; pagouCapitao = true;
            persist(); render();
            return 'paid';
        },
        completeVacation() {
            if (!pagouCapitao) return false;
            feriasVistas = true; persist(); return true;
        },
        setBalance(value) {
            if (!valid(value)) return false;
            coins = value; persist(); render();
            return true;
        },
        getChallenge(id) {
            const state = challenges[id];
            return state ? JSON.parse(JSON.stringify(state)) : {accepted:false, completed:false, claimed:false, evidence:null};
        },
        acceptChallenge(id) {
            if (!validId(id)) return false;
            if (!challenges[id]) challenges[id] = {accepted:true, completed:false, claimed:false, evidence:null};
            else challenges[id].accepted = true;
            persist(); return true;
        },
        recordChallenge(id, completed, evidence) {
            const state = challenges[id];
            if (!state?.accepted || state.completed) return false;
            state.completed = completed === true; state.evidence = evidence;
            persist(); return true;
        },
        claimChallenge(id, amount) {
            const state = challenges[id];
            if (!state?.completed || state.claimed || !valid(amount) || amount === 0 || !valid(coins+amount)) return 0;
            // Pagamento e flag viajam no mesmo registro: reload nunca separa os dois.
            coins += amount; state.claimed = true; persist(); render();
            const feedback = document.getElementById('coin-feedback');
            if (feedback) {
                feedback.textContent = '+'+amount+' moedas';
                feedback.classList.remove('show');
                void feedback.offsetWidth;
                feedback.classList.add('show');
            }
            return amount;
        }
    });
    // Saldo separado dos placares esportivos e das flags narrativas existentes.
    // O reset atual já remove todas as chaves do Festival com prefixo "zorp".
    persist(); render();
})(window);
