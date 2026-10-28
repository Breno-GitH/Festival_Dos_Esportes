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
    const blankVisited=()=>({central:true,pingpong:false,basketball:false,running:false,skate:false,archery:false,climbing:false,boxing:false,surf:false});
    const blankInventory=()=>({islandMap:false,teleporter:false,questScanner:false,recordsModule:false,finalDestinationsChart:false,jukebox:false,shipCustomizer:false});
    const tutorialFlags=['skateTutorialJumpSeen','skateTutorialRampSeen','skateTutorialGrindSeen','skateTutorialGrindExitSeen','skateTutorialMegaSeen'];
    const blankTutorial=()=>({...Object.fromEntries(tutorialFlags.map(k=>[k,false])),attempts:0,lastFailure:'',sameFailureCount:0});
    const blankCommerce=()=>({merchantArrivalSeen:false,merchantUnlocked:false,islandVisited:blankVisited(),inventory:blankInventory(),skateTutorial:blankTutorial(),playedSports:{},records:{},heardTracks:{},shipStyle:'ORIGINAL',firstPurchaseSeen:false});
    let commerce=blankCommerce();
    function cleanCommerce(raw) {
        const out=blankCommerce();if(!raw||typeof raw!=='object')return out;
        out.merchantArrivalSeen=raw.merchantArrivalSeen===true;
        out.merchantUnlocked=out.merchantArrivalSeen;
        out.firstPurchaseSeen=raw.firstPurchaseSeen===true;
        const tutorial=raw.skateTutorial||{};
        for(const key of tutorialFlags)out.skateTutorial[key]=tutorial[key]===true;
        for(const key of ['attempts','sameFailureCount'])if(Number.isSafeInteger(tutorial[key])&&tutorial[key]>=0)out.skateTutorial[key]=Math.min(tutorial[key],1000000);
        if(['jump','ramp','grind','exit','mega','unknown'].includes(tutorial.lastFailure))out.skateTutorial.lastFailure=tutorial.lastFailure;

        for(const item of global.MerchantCatalog?.items||[])if(raw.inventory?.[item.inventoryKey]===true||raw.purchasedItems?.[item.id]===true)out.inventory[item.inventoryKey]=true;
        for(const region of global.MerchantCatalog?.regions||[])if(raw.islandVisited?.[region.visitKey]===true||raw.visitedIslands?.[region.id]===true)out.islandVisited[region.visitKey]=true;
        for(const id of Object.values(global.MerchantCatalog?.sports||{})){
            if(raw.playedSports?.[id]===true)out.playedSports[id]=true;
            const r=raw.records?.[id];if(r&&typeof r==='object'&&Number.isFinite(r.best)&&r.best>=0)
                out.records[id]={best:r.best,label:String(r.label||'').slice(0,48),unit:String(r.unit||'').slice(0,12),lowerIsBetter:r.lowerIsBetter===true};
        }
        for(const id of ['festival','market','ocean','mountain'])if(raw.heardTracks?.[id]===true)out.heardTracks[id]=true;
        if((global.MerchantCatalog?.styles||[]).includes(raw.shipStyle))out.shipStyle=raw.shipStyle;
        return out;
    }
    const validId = id => typeof id === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(id);
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved && valid(saved.coins)) coins = saved.coins;
        commerce=cleanCommerce(saved?.commerce);
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
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:5, coins, challenges, commerce,
            pagouCapitao, feriasDesbloqueadas:pagouCapitao, feriasVistas})); return true; }
        catch (_) { return false; /* Purchases roll back if this atomic save fails. */ }
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
        get commerce(){
            const copy=JSON.parse(JSON.stringify(commerce));
            // Compatibility views are derived only; they are never a second saved authority.
            copy.purchasedItems={};copy.visitedIslands={};
            for(const item of global.MerchantCatalog?.items||[])if(copy.inventory[item.inventoryKey])copy.purchasedItems[item.id]=true;
            for(const region of global.MerchantCatalog?.regions||[])if(copy.islandVisited[region.visitKey])copy.visitedIslands[region.id]=true;
            return copy;
        },
        get islandVisited(){return {...commerce.islandVisited};},
        get inventory(){return {...commerce.inventory};},
        campaignState(){return JSON.parse(JSON.stringify({version:5,coins,challenges,commerce,pagouCapitao,feriasVistas}));},
        updateCommerce(patch){
            patch=patch&&typeof patch==='object'?patch:{};
            const old=commerce,merged={...commerce,...patch};
            merged.islandVisited={...commerce.islandVisited};merged.inventory={...commerce.inventory};
            merged.skateTutorial={...commerce.skateTutorial,...(patch.skateTutorial||{})};
            for(const key of tutorialFlags)if(commerce.skateTutorial[key])merged.skateTutorial[key]=true;

            for(const [key,value]of Object.entries(patch.islandVisited||{}))if(value===true)merged.islandVisited[key]=true;
            for(const [key,value]of Object.entries(patch.inventory||{}))if(value===true)merged.inventory[key]=true;
            for(const key of ['playedSports','records','heardTracks'])merged[key]={...commerce[key],...(patch[key]||{})};
            merged.merchantArrivalSeen=commerce.merchantArrivalSeen||patch.merchantArrivalSeen===true;
            merged.firstPurchaseSeen=commerce.firstPurchaseSeen||patch.firstPurchaseSeen===true;
            commerce=cleanCommerce(merged);
            if(!persist()){commerce=old;return false;}return true;
        },
        unlockMerchant(){
            const count=(global.MEDALHAS_REGISTRY||[]).filter(m=>global.isMedalhaDesbloqueada(m.id)).length;
            if(count<1)return false;
            const old=commerce;commerce=cleanCommerce({...commerce,merchantArrivalSeen:true,merchantUnlocked:true});
            if(!persist()){commerce=old;return false;}return true;
        },
        purchaseItem(id){
            const item=global.MerchantCatalog?.items.find(item=>item.id===id);
            if(!item||!valid(item.price)||item.price===0)return 'invalid_item';
            if(!commerce.merchantUnlocked)return 'locked';
            if(commerce.inventory[item.inventoryKey])return 'already_owned';
            if(coins<item.price)return 'insufficient_coins';
            const old=commerce,oldCoins=coins;
            coins-=item.price;commerce=cleanCommerce({...commerce,firstPurchaseSeen:true,inventory:{...commerce.inventory,[item.inventoryKey]:true}});
            if(!persist()){coins=oldCoins;commerce=old;return 'save_failed';}
            render();return 'purchased';
        },
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
