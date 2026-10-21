/* The master charges his racket in his normal lane. The rally never pauses. */
(function (global) {
    'use strict';
    const STATES = Object.freeze({ NORMAL: 'NORMAL', PREPARING_MULTIBALL: 'PREPARING_MULTIBALL',
        MULTIBALL_ACTIVE: 'MULTIBALL_ACTIVE', RECOVERY: 'RECOVERY' });
    const TUNING = Object.freeze({ preparation: 24, recovery: 24, minInterval: 5, intervalRange: 6 });
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    function create() {
        return { phase: STATES.NORMAL, age: 0, cooldown: 1080 + Math.floor(Math.random() * 600),
            total: 1, remaining: 0, emitted: 0, interval: 0, banner: 0, flash: 0 };
    }
    function chooseCount(score, rally, random = Math.random) {
        const cap = score < 20 ? 4 : score < 50 ? 6 : score < 75 && rally < 18 ? 8 : 10;
        const weights = [35, 30, 16, 10, 5, 2.5, 1, 0.4, 0.1].slice(0, cap - 1);
        let value = random() * weights.reduce((a, b) => a + b, 0);
        for (let i = 0; i < weights.length; i++) { value -= weights[i]; if (value < 0) return i + 2; }
        return cap;
    }
    function start(event, game, count) {
        if (event.phase !== STATES.NORMAL || game.pendingPoints.length || game.balls.filter(b => b.state !== 'MISSED').length !== 1) return false;
        event.total = clamp(Math.round(count), 2, 10);
        event.phase = STATES.PREPARING_MULTIBALL; event.age = 0;
        event.banner = 100; event.flash = 0.4;
        PingPongBall.playAlarm();
        return true;
    }
    function update(event, game, emit) {
        if (event.banner > 0) event.banner--;
        event.flash *= 0.88;
        const live = game.balls.filter(b => b.state !== 'MISSED').length;
        if (event.phase === STATES.NORMAL) {
            if (event.cooldown > 0) event.cooldown--;
            if (event.cooldown <= 0) start(event, game, chooseCount(game.playerScore + game.opponentScore, game.rallyHits));
        } else if (event.phase === STATES.PREPARING_MULTIBALL) {
            if (++event.age >= TUNING.preparation) {
                event.phase = STATES.MULTIBALL_ACTIVE; event.age = 0;
                event.remaining = Math.max(0, event.total - live); event.emitted = 0; event.interval = 1;
                event.banner = 120; event.flash = 1;
            }
        } else if (event.phase === STATES.MULTIBALL_ACTIVE) {
            if (event.remaining > 0 && --event.interval <= 0 && live < 10) {
                emit(event.emitted++); event.remaining--;
                event.interval = TUNING.minInterval + Math.floor(Math.random() * TUNING.intervalRange);
            }
            if (!event.remaining && game.balls.filter(b => b.state !== 'MISSED').length <= 1) {
                event.phase = STATES.RECOVERY; event.age = 0;
            }
        } else if (event.phase === STATES.RECOVERY && ++event.age >= TUNING.recovery) {
            event.phase = STATES.NORMAL; event.cooldown = 1080 + Math.floor(Math.random() * 600);
        }
        // No movement, invulnerability, AI reset, or simulation pause here.
    }
    function draw(ctx, event, game) {
        ctx.save();
        if (event.phase === STATES.PREPARING_MULTIBALL || event.flash > 0.04) {
            const charge = event.phase === STATES.PREPARING_MULTIBALL ? event.age / TUNING.preparation : event.flash;
            ctx.globalAlpha = 0.25 + charge * 0.45;
            ctx.strokeStyle = '#ffe588'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(game.opponentX + 3, game.opponentY + 24, 7 + charge * 8, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#fff4ba'; ctx.fillRect(game.opponentX, game.opponentY + 21, 3, 3);
        }
        if (event.banner > 0) {
            ctx.globalAlpha = Math.min(1, event.banner / 25);
            ctx.fillStyle = '#122334'; ctx.fillRect(148, 55, 154, 19);
            ctx.fillStyle = '#ffdc61'; ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace';
            ctx.fillText(`MULTIBALL x${event.total}`, 225, 69);
        }
        ctx.restore();
    }
    global.PingPongMultiball = Object.freeze({ STATES, TUNING, create, chooseCount, start, update, draw });
})(window);
