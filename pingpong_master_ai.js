/* The master reads only legal, observed post-bounce motion. No future shot data. */
(function (global) {
    'use strict';
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const approach = (value, target, step) => value + clamp(target - value, -step, step);

    function create() {
        return { tick: 0, fatigue: 0, work: 0, fastTicks: 0, pressure: 0, velocityY: 0, reads: Object.create(null),
            targetKey: null, targetY: null, lockUntil: 0, switchUntil: 0,
            mode: 'RECOVER', reactionDelay: 0, struggling: false };
    }

    function update(ai, scene) {
        ai.tick++;
        const observed = [];
        for (const ball of scene.balls) {
            // In particular: own serve bounce and the trip across the net are NOT reads.
            if (ball.receiver !== 'OPPONENT' || ball.bounceCount !== 1 ||
                (ball.isServe && ball.ownBounceCount !== 1) ||
                (ball.state !== 'TABLE_BOUNCE' && ball.state !== 'ATTACK_RECEIVER')) continue;
            observed.push({ key: ball.id + ':' + ball.shotId, state: ball.state,
                x: ball.x, y: ball.y, vx: ball.speedX, vy: ball.speedY });
        }

        const pace = observed.reduce((v, b) => Math.max(v, Math.hypot(b.vx, b.vy)), 0);
        const speedLoad = clamp((pace - 6) / 2, 0, 1);
        ai.fastTicks = clamp(ai.fastTicks + (speedLoad > 0 ? speedLoad : scene.rally === 0 ? -6 : -0.08), 0, 600);
        ai.pressure *= scene.rally === 0 ? 0.96 : 0.995;
        ai.work *= scene.rally === 0 ? 0.94 : 0.994;
        const demand = clamp(speedLoad * 0.30 + ai.fastTicks / 600 * 0.35 + ai.pressure + ai.work, 0, 1);
        ai.fatigue += (demand - ai.fatigue) * (demand > ai.fatigue ? 0.012 : 0.018);
        const active = new Set(observed.map(b => b.key));
        for (const key of Object.keys(ai.reads)) if (!active.has(key)) delete ai.reads[key];

        const ready = [];
        let waiting = false;
        for (const ball of observed) {
            let read = ai.reads[ball.key];
            if (!read) read = ai.reads[ball.key] = { bounceTick: ai.tick, reactionDelay: null, targetY: null };
            // Velocity is measured only after the bounce actually produces it.
            if (ball.state !== 'ATTACK_RECEIVER' || ball.vx <= 0) { waiting = true; continue; }
            // A visible pulse can change an already-read segment. Observe its
            // new velocity, then pay reaction time again; never read future aim.
            if (read.vx !== undefined && Math.hypot(ball.vx - read.vx, ball.vy - read.vy) > 0.05) {
                read.bounceTick = ai.tick; read.reactionDelay = null; read.targetY = null;
            }
            read.vx = ball.vx; read.vy = ball.vy;
            if (read.reactionDelay === null) {
                const pace = clamp((Math.hypot(ball.vx, ball.vy) - 5.4) / 2.6, 0, 1);
                read.reactionDelay = clamp(3 + Math.round(ai.fatigue * 7 + pace * 2), 3, 12);
                ai.pressure = clamp(ai.pressure + pace * 0.045, 0, 0.40);
            }
            const elapsed = ai.tick - read.bounceTick;
            if (elapsed < read.reactionDelay) {
                waiting = true; ai.reactionDelay = read.reactionDelay; continue;
            }
            if (read.targetY === null) {
                // Freeze one interception estimate from the observed segment.
                // Do not chase each new pixel or consult ball.receive / ball.target.
                const catchX = clamp(scene.paddleLeft + 10, ball.x, scene.paddleRight - 1);
                const travel = Math.max(0, (catchX - ball.x) / ball.vx);
                read.targetY = clamp(ball.y + ball.vy * travel - 24, scene.minY, scene.maxY);
                read.aimTick = ai.tick;
            }
            const remaining = (scene.paddleRight - ball.x) / ball.vx;
            if (remaining >= 0) ready.push({ ...ball, read, remaining });
        }
        ready.sort((a, b) => a.remaining - b.remaining || a.key.localeCompare(b.key));
        let chosen = ready[0] || null;
        const current = ready.find(b => b.key === ai.targetKey);
        if (current && (ai.tick < ai.lockUntil || current.remaining <= (chosen?.remaining || 0) + 5)) chosen = current;

        let targetY, moving = false, speed = scene.baseSpeed, struggling = false;
        if (chosen) {
            if (ai.targetKey && ai.targetKey !== chosen.key) ai.switchUntil = ai.tick + 2 + Math.round(ai.fatigue * 2);
            if (ai.targetKey !== chosen.key) ai.lockUntil = ai.tick + 6;
            ai.targetKey = chosen.key; ai.targetY = chosen.read.targetY;
            ai.reactionDelay = chosen.read.reactionDelay; targetY = ai.targetY;
            const distance = Math.abs(targetY - scene.y);
            const urgency = clamp((distance - 8) / Math.max(1, chosen.remaining * scene.baseSpeed), 0, 1);
            // More effort at medium pace; sustained fast rallies exhaust that sprint.
            const tempo = clamp(scene.rally / 12, 0, 1);
            speed *= (0.98 + tempo * 0.12) * (1 + urgency * 0.12) * (1 - ai.fatigue * 0.24);
            struggling = distance > chosen.remaining * speed + 26 ||
                (ai.fatigue > 0.65 && urgency > 0.65);
            moving = ai.tick >= ai.switchUntil;
            ai.mode = struggling ? 'LATE' : moving ? 'TRACK' : 'SWITCH';
        } else {
            ai.targetKey = null; ai.targetY = null;
            targetY = scene.holdPosition ? scene.y : scene.homeY; speed = Math.min(1.25, scene.baseSpeed);
            if (waiting) { ai.mode = 'REACTION'; moving = false; }
            else { ai.mode = 'RECOVER'; moving = !scene.holdPosition; }
            struggling = waiting && ai.fatigue > 0.7;
        }

        const delta = targetY - scene.y;
        const desired = moving && Math.abs(delta) > 6 ? Math.sign(delta) * Math.min(speed, Math.abs(delta) * 0.3) : 0;
        // Waiting for a read is a genuine pause; recovery/switches don't track pre-bounce balls.
        ai.velocityY = ai.mode === 'REACTION' || ai.mode === 'SWITCH' ? 0 : approach(ai.velocityY, desired, 0.58);
        const nextY = clamp(scene.y + ai.velocityY, scene.minY, scene.maxY);
        const movement = nextY - scene.y;
        if (nextY === scene.minY || nextY === scene.maxY) ai.velocityY = 0;
        if (chosen) ai.work = clamp(ai.work + Math.abs(movement) * 0.0007, 0, 0.18);
        ai.struggling = struggling;
        return { y: nextY, action: movement < -0.15 ? 'MOVE_UP' : movement > 0.15 ? 'MOVE_DOWN' : 'IDLE',
            struggling, fatigue: ai.fatigue, reactionDelay: ai.reactionDelay,
            mode: ai.mode, targetY: ai.targetY, targetKey: ai.targetKey };
    }

    global.PingPongMasterAI = Object.freeze({ create, update });
})(window);
