/* Observes completed game steps. All clocks, particles and frame holds below are presentation-only. */
(function (global) {
    'use strict';
    const LIMITS = Object.freeze({ contacts: 24, hits: 12, exits: 10, particles: 48,
        regularHoldMs: 18, globalHoldMs: 28, holdSpacingMs: 100, pointMs: 430 });
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const pixel = (c, color, x, y, w = 1, h = 1) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
    let state = null, holdCanvas = null, holdContext = null, audio = null, voices = 0, lastCue = -Infinity;
    function fresh(game, now) {
        return { game, session: game.masterAI, now, records: new Map(), contacts: [], hits: [], exits: [], particles: [],
            playerScore: game.playerScore, masterScore: game.opponentScore, globalRef: null, globalAt: -Infinity,
            phase: game.multiball.phase, point: null, tier: 0, energyUntil: 0,
            holdUntil: 0, capturePending: false, lastHold: -Infinity, shakeAt: -Infinity, shakePower: 0,
            lastMasterHit: -Infinity, reaction: null, reactionTotals: {}, lastLeader: Math.sign(game.playerScore-game.opponentScore),
            matchKey: '', victorySeen: false, totals: { bounces: 0, hits: 0, globals: 0, emissions: 0, points: 0, holds: 0 } };
    }
    function unlockAudio() {
        try {
            const Context = global.AudioContext || global.webkitAudioContext;
            if (!Context) return;
            if (!audio || audio.state === 'closed') audio = new Context();
            if (audio.state === 'suspended') audio.resume().catch(() => {});
        } catch (_) { /* Silent mode never changes a rally. */ }
    }
    // Original ball/table/racket/global sounds stay at their physical event sites.
    // This small independent voice only accents an actual point, tension or a very strong contact.
    function cue(kind, now) {
        if (!audio || audio.state !== 'running' || voices >= 2 || now - lastCue < 100) return;
        try {
            const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
            const n = kind === 'climax' ? [590, 980, .13, .019] : kind === 'point' ? [560, 760, .09, .014] :
                kind === 'tension' ? [190, 260, .12, .009] : [150, 90, .045, .01];
            o.type = 'triangle'; o.frequency.setValueAtTime(n[0], t); o.frequency.exponentialRampToValueAtTime(n[1], t + n[2]);
            g.gain.setValueAtTime(n[3], t); g.gain.exponentialRampToValueAtTime(.0001, t + n[2]);
            o.connect(g); g.connect(audio.destination); voices++; lastCue = now;
            o.onended = () => { voices--; o.disconnect(); g.disconnect(); }; o.start(t); o.stop(t + n[2] + .01);
        } catch (_) { /* Audio is optional. */ }
    }
    global.addEventListener?.('keydown', () => {
        if (typeof currentScene !== 'undefined' && currentScene === 'JOGO_PINGPONG') unlockAudio();
    }, true);
    function add(list, value, limit) { if (list.length >= limit) list.shift(); list.push(value); }
    function react(kind, side, strength, duration, now) {
        const priority={RALLY:1,DEFENSE:2,MULTIBALL:3,GLOBAL:4,POINT:3,COMEBACK:5,MATCH_POINT:6,VICTORY:7};
        state.reactionTotals[kind]=(state.reactionTotals[kind]||0)+1;
        if(state.reaction&&now<state.reaction.until&&priority[state.reaction.kind]>priority[kind])return;
        state.reaction={kind,side,strength,born:now,until:now+duration};
    }
    function particles(x, y, count, color, born, key, direction = 0) {
        for (let i = 0; i < count; i++) {
            const side = ((key + i) % 2 ? 1 : -1);
            add(state.particles, { x, y, vx: direction ? direction * (24 + i * 11) : side * (15 + i * 8),
                vy: -22 - i * 9, color, born, life: 100 + i * 25 }, LIMITS.particles);
        }
    }
    function hold(now, globalHit) {
        if (!globalHit && now - state.lastHold < LIMITS.holdSpacingMs) return;
        state.holdUntil = now + (globalHit ? LIMITS.globalHoldMs : LIMITS.regularHoldMs);
        state.capturePending = true; state.lastHold = now; state.totals.holds++;
    }
    function racket(game, ball, now, emission) {
        const role = ball.lastHitter, left = role === 'PLAYER';
        const x = left ? game.playerX + 38 : game.opponentX - 3;
        const y = (left ? game.playerY : game.opponentY) + 24;
        const strong = (ball.attackSpeed || 0) >= 7.5;
        add(state.hits, { x, y, direction: left ? 1 : -1, born: now, life: strong ? 120 : 85, strong,
            global: false, color: left ? '#a6e8dc' : '#f0dbac' }, LIMITS.hits);
        state.totals.hits++; if (!left) state.lastMasterHit = now;
        if (!emission) hold(now, false);
        if (strong && !emission) {
            // Normal fast rallies stay stable; only extreme speed may shake the view.
            if ((ball.attackSpeed || 0) >= 8.6) { state.shakeAt = now; state.shakePower = .65; }
            cue('strong', now);
            particles(x, y, 2, '#e9dfbb', now, ball.id, left ? 1 : -1);
        }
    }
    function observe(game, now) {
        if (!Number.isFinite(now)) now = 0;
        if (!state || state.game !== game || state.session !== game.masterAI || now < state.now) state = fresh(game, now);
        state.now = now;
        for (const key of ['contacts', 'hits', 'particles', 'exits']) state[key] = state[key].filter(e => now - e.born < e.life);
        if (state.point && now >= state.point.until) state.point = null;
        if (game.gameState === 'PRE_GAME') {
            state.records.clear(); state.holdUntil = 0; state.capturePending = false; return;
        }
        const fx = game.specialEffects?.[0];
        const globalHit = !!fx && fx !== state.globalRef;
        if (globalHit) {
            state.globalAt = now; state.totals.globals++; state.energyUntil = now + 260;
            hold(now, true); state.shakeAt = now; state.shakePower = .9;
            add(state.hits, { x: game.playerX + 38, y: game.playerY + 24, direction: 1, born: now,
                life: 180, strong: true, global: true, color: '#c2fcf0' }, LIMITS.hits);
            react('GLOBAL','zorp',.95,1500,now);
        }
        if (game.multiball.phase==='PREPARING_MULTIBALL' && state.phase!=='PREPARING_MULTIBALL') react('MULTIBALL','master',.72,1500,now);
        state.globalRef = fx || null;
        const live = new Set();
        for (const b of game.balls) {
            live.add(b.id); const old = state.records.get(b.id);
            const changed = old && old.shot !== b.shotId;
            const emitted = !old && !b.isServe && game.multiball.phase === 'MULTIBALL_ACTIVE';
            if (emitted) { state.totals.emissions++; racket(game, b, now, true); }
            if (changed && !b.isServe && !globalHit) {
                racket(game, b, now, false);
                const paddleY=(b.lastHitter==='PLAYER'?game.playerY:game.opponentY)+24;
                const edge=Math.abs((b.origin?.y??b.y)-paddleY)>18;
                if ((old.speed||0)>=7.2 && (edge || b.lastHitter==='OPPONENT'&&game.masterAI.struggling)) {
                    react('DEFENSE',b.lastHitter==='PLAYER'?'zorp':'master',.65,850,now);
                }
            }
            const contacts = b.tableContacts || 0;
            if (old && old.shot === b.shotId && contacts > old.contacts) {
                const color = b.isSuper ? '#b1eee3' : '#e2e7c9';
                add(state.contacts, { x: b.x, y: b.y, born: now, life: 130, color }, LIMITS.contacts);
                particles(b.x, b.y, b.isSuper ? 3 : (b.attackSpeed || 0) >= 7.5 ? 2 : 1, color, now, b.id + b.shotId);
                state.totals.bounces++;
            }
            if (old && b.state === 'MISSED' && old.state !== 'MISSED') {
                add(state.exits, { x: b.x, y: b.y - b.z, vx: Math.sign(old.vx || b.direction || 1) * 125,
                    vy: clamp(old.vy || 0, -2, 2) * 20, born: now, life: 125 }, LIMITS.exits);
            }
            state.records.set(b.id, { shot: b.shotId, contacts, state: b.state, vx: b.speedX, vy: b.speedY,
                speed: Math.hypot(b.speedX||0,b.speedY||0),
                born: old?.born ?? now, squishAt: old && old.shot === b.shotId && contacts > old.contacts ? now : old?.squishAt ?? -Infinity });
        }
        for (const id of state.records.keys()) if (!live.has(id)) state.records.delete(id);
        if (game.playerScore > state.playerScore || game.opponentScore > state.masterScore) {
            const player = game.playerScore > state.playerScore;
            state.point = { label: player ? 'POINT ZORP' : 'POINT MASTER', player, until: now + LIMITS.pointMs, born: now };
            state.totals.points++; state.energyUntil = now + 430; state.holdUntil = 0; state.capturePending = false;
            const closeFinish = Math.max(game.playerScore, game.opponentScore) >= game.maxScore - 5 && Math.abs(game.playerScore - game.opponentScore) <= 3;
            cue(closeFinish ? 'climax' : 'point', now);
            const leader=Math.sign(game.playerScore-game.opponentScore),comeback=leader&&state.lastLeader&&leader!==state.lastLeader;
            react(comeback?'COMEBACK':'POINT',player?'zorp':'master',(closeFinish||comeback) ? .95 : .52,comeback?1800:900,now);
            if(leader)state.lastLeader=leader;
        }
        state.playerScore = game.playerScore; state.masterScore = game.opponentScore;
        const tier = game.rallyHits >= 15 ? 3 : game.rallyHits >= 10 ? 2 : game.rallyHits >= 5 ? 1 : 0;
        if (tier>state.tier) { react('RALLY',null,.30+tier*.18,800,now); if(tier===3)cue('tension',now); }
        state.tier = tier; state.phase = game.multiball.phase;
        const matchKey=game.gameState==='PLAYING'?[(game.playerScore===game.maxScore-1?'P':''),(game.opponentScore===game.maxScore-1?'M':'')].join(''):'';
        if(matchKey&&matchKey!==state.matchKey)react('MATCH_POINT',matchKey==='P'?'zorp':matchKey==='M'?'master':null,.95,1600,now);
        state.matchKey=matchKey;
        if (game.gameState === 'GAMEOVER') {
            state.holdUntil = 0; state.capturePending = false;
            if(!state.victorySeen){state.victorySeen=true;react('VICTORY',game.win?'zorp':'master',1,4000,now);state.shakeAt=now;state.shakePower=.8;}
        }
    }
    function heldFrame(c, now) {
        if (!state || !holdCanvas || state.capturePending || now >= state.holdUntil) return false;
        c.save(); c.imageSmoothingEnabled = false;
        c.drawImage(holdCanvas, 0, 0); c.restore(); return true;
    }
    function capture(c, canvas, now) {
        if (!state?.capturePending) return;
        if (!holdCanvas) { holdCanvas = global.document.createElement('canvas'); holdCanvas.width = 450; holdCanvas.height = 300; holdContext = holdCanvas.getContext('2d'); }
        holdContext.imageSmoothingEnabled = false; holdContext.clearRect(0, 0, 450, 300); holdContext.drawImage(canvas, 0, 0);
        state.capturePending = false;
    }
    function shake(now) {
        if (!state) return { x: 0, y: 0 };
        const age = now - state.shakeAt;
        if (age < 0 || age > 65) return { x: 0, y: 0 };
        const amount = state.shakePower * (1 - age / 65);
        return { x: Math.round(amount * (Math.floor(age / 17) % 2 ? -1 : 1)), y: 0 };
    }
    function ballStyle(ball, now) {
        const rec = state?.records.get(ball.id);
        return { squash: ball.state === 'TABLE_BOUNCE' || ball.state === 'SERVE_OWN_BOUNCE' || !!rec && now - rec.squishAt < 35,
            fresh: !!rec && now - rec.born < 85 && !ball.isServe,
            globalPulse: !!state && now - state.globalAt < 100 && ball.lastHitter === 'PLAYER' && ball.isSuper };
    }
    function crowd(game, now) {
        const tier = game.rallyHits >= 15 ? 3 : game.rallyHits >= 10 ? 2 : game.rallyHits >= 5 ? 1 : 0;
        const close = Math.abs(game.playerScore - game.opponentScore) <= 3;
        const climax = Math.max(game.playerScore, game.opponentScore) >= game.maxScore - 5 && close;
        const r=state?.reaction,active=r&&now<r.until;
        return { tier, climax, energy: state && now < state.energyUntil ? 1 : 0,
            event:active?r.kind:null,side:active?r.side:null,eventStrength:active?r.strength*Math.min(1,(r.until-now)/250):0,
            victory:game.gameState==='GAMEOVER',matchPoint:game.gameState==='PLAYING'&&(game.playerScore===game.maxScore-1||game.opponentScore===game.maxScore-1) };
    }
    function masterAction(game, action, now) {
        return state && action === 'IDLE' && game.masterAI.fatigue >= .65 && game.masterAI.mode === 'RECOVER' && now - state.lastMasterHit < 260 ? 'HIT' : action;
    }
    function afterimages(c, image, game, now, presentation) {
        const age = state ? now - state.globalAt : Infinity;
        if (age < 0 || age > 150 || !image?.complete || !image.naturalWidth) return;
        const d = presentation.spriteLayout('PLAYER', 'HIT', game.playerX, game.playerY);
        c.save(); c.imageSmoothingEnabled = false;
        for (let i = 2; i >= 1; i--) {
            c.globalAlpha = (1 - age / 150) * (.16 / i);
            c.drawImage(image, ...d.source, Math.round(d.x - i * 4), d.y, d.w, d.h);
        }
        c.restore();
    }
    function world(c, game, now) {
        if (!state) return;
        c.save(); c.imageSmoothingEnabled = false;
        for (const e of state.contacts) {
            const t = (now - e.born) / e.life, r = 2 + t * 4;
            c.globalAlpha = (1 - t) * .7;
            pixel(c, e.color, e.x - r, e.y, 3, 1); pixel(c, e.color, e.x + r - 2, e.y, 3, 1);
            pixel(c, e.color, e.x - 1, e.y - 2, 2, 1);
        }
        for (const e of state.particles) {
            const t = (now - e.born) / 1000, life = (now - e.born) / e.life;
            c.globalAlpha = (1 - life) * .7; pixel(c, e.color, e.x + e.vx * t, e.y + e.vy * t + 80 * t * t);
        }
        for (const e of state.hits) {
            const t = (now - e.born) / e.life, d = e.direction;
            c.globalAlpha = (1 - t) * .85;
            // An open racket arc, never a circular blast.
            for (let i = -2; i <= 2; i++) pixel(c, e.color, e.x + d * (5 + t * 5 - Math.abs(i)), e.y + i * 3, 2, 2);
            for (let i = 0; i < (e.strong ? 3 : 2); i++) pixel(c, e.color, e.x + d * (8 + t * 7), e.y - 4 + i * 4, 3, 1);
            if (t < .25) { pixel(c, '#f4fff2', e.x - 1, e.y - 3, 2, 6); pixel(c, '#f4fff2', e.x - 3, e.y - 1, 6, 2); }
        }
        for (const e of state.exits) {
            const t = (now - e.born) / 1000, a = (now - e.born) / e.life;
            c.globalAlpha = (1 - a) * .65;
            pixel(c, '#acbdbb', e.x + e.vx * t - 2, e.y + e.vy * t - 2, 4, 4);
            pixel(c, '#d7ded1', e.x + e.vx * t - 1, e.y + e.vy * t - 2, 2, 1);
        }
        c.globalAlpha = 1;
        const event = game.multiball;
        if (event.phase === 'PREPARING_MULTIBALL') {
            const charge = clamp(event.age / 24, 0, 1), x = game.opponentX - 3, y = game.opponentY + 24;
            c.globalAlpha = .4 + charge * .4;
            for (let i = -2; i <= 2; i++) pixel(c, '#e4d7aa', x - 4 + Math.abs(i), y + i * 3, 2, 2);
            pixel(c, '#fff5d1', x - 1, y - 2, 2, 4);
            // Four small filling marks read as a wind-up, not an extra meter to play.
            for (let i = 0; i < Math.ceil(charge * 4); i++) pixel(c, '#c5b87c', x + 6, y - 6 + i * 4, 2, 1);
        }
        if (game.masterAI.fatigue > .55 || game.masterAI.struggling) {
            const phase = (now / 480) % 1, x = game.opponentX + 8, y = game.opponentY + 4;
            c.globalAlpha = (.45 + Math.min(.3, game.masterAI.fatigue * .3)) * (1 - phase);
            pixel(c, '#82c5cd', x, y + phase * 4, 1, 2);
            if (game.masterAI.fatigue > .75) pixel(c, '#82c5cd', x - 3, y + 2 + phase * 3, 1, 2);
        }
        c.restore();
    }
    function screen(c, game, now) {
        if (!state) return;
        c.save(); c.imageSmoothingEnabled = false;
        if (game.multiball.banner > 0 && ['PREPARING_MULTIBALL', 'MULTIBALL_ACTIVE'].includes(game.multiball.phase)) {
            c.globalAlpha = Math.min(1, game.multiball.banner / 25);
            global.PingPongArenaArt.badge(c,game.multiball.phase === 'PREPARING_MULTIBALL' ? 'MULTIBALL...' : 'MULTIBALL x' + game.multiball.total);
        }
        const p = state.point;
        if (p && game.gameState !== 'GAMEOVER') {
            c.globalAlpha = Math.min(1, (p.until - now) / 90);
            global.PingPongArenaArt.badge(c,p.player?'PONTO ZORP':'PONTO MESTRE',p.player?'#b3e6d5':'#e6cfad');
        }
        c.restore();
    }
    function snapshot() {
        if (!state) return { ready: false };
        return { ready: true, now: state.now, tier: state.tier, point: state.point?.label || null,
            phase: state.phase, contacts: state.contacts.length, particles: state.particles.length, hits: state.hits.length,
            exits: state.exits.length, records: state.records.size, holdMs: Math.max(0, state.holdUntil - state.now),
            event:state.reaction?.kind||null,reactions:{...state.reactionTotals},totals: { ...state.totals } };
    }
    global.PingPongFeedback = Object.freeze({ LIMITS, observe, heldFrame, capture, shake, ballStyle, crowd,
        masterAction, afterimages, world, screen, snapshot, unlockAudio });
})(window);
