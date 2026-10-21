/* Arcade table tennis: two contacts on serve, one on a return, then reception. */
(function (global) {
    'use strict';
    const STATES = Object.freeze({ SERVE: 'SERVE', RETURNED: 'RETURNED',
        SERVE_OWN_FLIGHT: 'SERVE_OWN_FLIGHT', SERVE_OWN_BOUNCE: 'SERVE_OWN_BOUNCE',
        SERVE_CROSS_FLIGHT: 'SERVE_CROSS_FLIGHT',
        FLY_TO_TABLE: 'FLY_TO_TABLE', TABLE_BOUNCE: 'TABLE_BOUNCE',
        ATTACK_RECEIVER: 'ATTACK_RECEIVER', MISSED: 'MISSED' });
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const lerp = (a, b, t) => a + (b - a) * t;
    // Speeds are pixels per existing 60 Hz game tick, never unbounded by rally.
    const TUNING = Object.freeze({ flightMin: 3.2, flightMax: 4.8,
        attackMin: 5.4, attackMax: 8.0, superMax: 8.8,
        reactionTicks: 12, superReactionTicks: 11, rallyCap: 16, rallyStep: 0.20,
        globalReturnMultiplier: 1.30, globalFlightMax: 5.2, globalTrailTicks: 36 });
    let audio = null, lastSound = -Infinity, voices = 0;

    function unlockAudio() {
        try {
            const Context = global.AudioContext || global.webkitAudioContext;
            if (!Context) return;
            if (!audio) audio = new Context();
            if (audio.state === 'suspended') audio.resume().catch(() => {});
        } catch (_) { /* Audio unavailable: the match remains playable. */ }
    }
    function sound(kind) {
        if (!audio || audio.state !== 'running' || voices >= 4 || audio.currentTime - lastSound < 0.018) return;
        lastSound = audio.currentTime;
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        const alarm = kind === 'alarm', paddle = kind === 'paddle', globalHit = kind === 'globalHit';
        const duration = alarm ? 0.30 : globalHit ? 0.12 : 0.055;
        oscillator.type = alarm ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(alarm ? 440 : globalHit ? 280 : paddle ? 380 : 960, lastSound);
        oscillator.frequency.exponentialRampToValueAtTime(alarm ? 880 : globalHit ? 110 : paddle ? 180 : 520, lastSound + duration * 0.8);
        gain.gain.setValueAtTime((alarm ? 0.045 : 0.025) / Math.sqrt(voices + 1), lastSound);
        gain.gain.exponentialRampToValueAtTime(0.0001, lastSound + duration);
        oscillator.connect(gain); gain.connect(audio.destination);
        voices++; oscillator.start(lastSound); oscillator.stop(lastSound + duration + 0.01);
        oscillator.onended = () => { voices--; oscillator.disconnect(); gain.disconnect(); };
    }
    const playBounce = () => sound('table');
    const playPaddle = () => sound('paddle');
    const playAlarm = () => sound('alarm');
    const playGlobalReturn = () => sound('globalHit');

    function arcFor(origin, target, loft, net, radius) {
        let height = loft;
        if ((origin.x - net.x) * (target.x - net.x) < 0) {
            const t = (net.x - origin.x) / (target.x - origin.x);
            height = Math.max(height, ((net.height || 20.3) + radius + 3 - origin.z * (1 - t)) /
                (4 * t * (1 - t)));
        }
        return height;
    }

    function startCrossServe(ball) {
        ball.origin = { x: ball.x, y: ball.y, z: 0 };
        ball.target = { ...ball.serveReceiverTarget };
        ball.age = 0; ball.bounceTicks = 0;
        ball.flightTicks = ball.serveCrossTicks;
        ball.arcHeight = arcFor(ball.origin, ball.target, 25, ball.serveNet, ball.radius);
        ball.flightSpeed = Math.hypot(ball.target.x - ball.x, ball.target.y - ball.y) / ball.flightTicks;
        ball.speedX = (ball.target.x - ball.x) / ball.flightTicks;
        ball.speedY = (ball.target.y - ball.y) / ball.flightTicks;
        ball.speedZ = 0;
        ball.state = STATES.SERVE_CROSS_FLIGHT;
    }

    function launch(ball, shot, court) {
        const table = court.table, direction = shot.hitter === 'PLAYER' ? 1 : -1;
        const rally = clamp(shot.rally || 0, 0, TUNING.rallyCap);
        const powerBias = clamp((Math.abs(shot.speed) - 4.2) * 0.045, -0.15, 0.25);
        // Some extra pace survives a real return, including a return to Zorp.
        const specialPace = shot.serve ? 0 : (ball.specialPace || 0) * 0.82;
        const charged = specialPace > 0.04;
        const attackSpeed = clamp(TUNING.attackMin + rally * TUNING.rallyStep + powerBias +
            (shot.isSuper ? 1.6 : 0) + specialPace, TUNING.attackMin,
            shot.isSuper || charged ? TUNING.superMax : TUNING.attackMax);
        const reactionTicks = shot.isSuper || charged ? TUNING.superReactionTicks : TUNING.reactionTicks;
        // Put the bounce far enough from the earliest possible paddle contact.
        // This guarantees a real post-bounce window even at the speed cap.
        const defenseFrontX = direction > 0 ? court.opponent.homeX - 8 : court.player.maxX + 40;
        const runway = attackSpeed * reactionTicks;
        const minX = direction > 0 ? court.net.x + 22 : defenseFrontX + runway;
        const maxX = direction > 0 ? defenseFrontX - runway : court.net.x - 22;
        const targetX = clamp(shot.targetX, minX, maxX);
        // The paddle selects ONE planar ray. The table changes its speed and
        // vertical motion only; it never chooses a second aim at the defender.
        const receiveX = direction > 0 ? table.right + 4 : table.left - 20;
        const centerY = (table.back + table.front) / 2;
        const impulse = clamp(shot.contact || 0, -1, 1) * 16 + clamp(shot.paddleVelocity || 0, -4, 4) * 2;
        let receiveY = clamp((Number.isFinite(shot.targetY) ? shot.targetY : centerY) + impulse,
            table.back + 8, table.front - 8);
        const fraction = (targetX - ball.x) / (receiveX - ball.x);
        // Restrict the chosen ray at contact so its one bounce is on the table.
        const lowY = ball.y + (table.back + 10 - ball.y) / fraction;
        const highY = ball.y + (table.front - 10 - ball.y) / fraction;
        receiveY = clamp(receiveY, Math.max(table.back + 8, Math.min(lowY, highY)),
            Math.min(table.front - 8, Math.max(lowY, highY)));
        const targetY = lerp(ball.y, receiveY, fraction);
        const distance = Math.hypot(targetX - ball.x, targetY - ball.y);
        const flightLimit = Math.min(TUNING.flightMax, attackSpeed / 1.5);
        const readableSpeed = clamp(3.5 + rally * 0.035 + powerBias, TUNING.flightMin, flightLimit);
        const duration = Math.max(shot.isSuper ? 26 : 30, Math.ceil(distance / readableSpeed));
        const style = shot.style || 'straight';
        const flightSpeed = distance / duration;
        const startZ = clamp(ball.z, 0, 48);
        const arcHeight = arcFor({ x: ball.x, y: ball.y, z: startZ },
            { x: targetX, y: targetY }, shot.loft || 25, court.net, ball.radius);
        Object.assign(ball, {
            state: shot.serve ? STATES.SERVE : STATES.RETURNED,
            lastHitter: shot.hitter, receiver: direction > 0 ? 'OPPONENT' : 'PLAYER',
            isSuper: Boolean(shot.isSuper), isServe: Boolean(shot.serve),
            ownBounceCount: 0, bounceCount: 0, tableContacts: 0,
            shotId: (ball.shotId || 0) + 1, age: 0, bounceTicks: 0, attackTicks: 0,
            origin: { x: ball.x, y: ball.y, z: startZ },
            target: { x: targetX, y: targetY }, receive: { x: receiveX, y: receiveY },
            flightTicks: duration, arcHeight,
            attackSpeed, flightSpeed, direction, style, reactionTicks, defenseFrontX, rallyAtLaunch: rally,
            specialPace, curve: null,
            speedX: (targetX - ball.x) / duration, speedY: (targetY - ball.y) / duration,
            speedZ: 0, trail: []
        });
        if (shot.serve) {
            ball.serveReceiverTarget = { x: targetX, y: targetY };
            ball.serveNet = { x: court.net.x, height: court.net.height };
            const ownX = direction > 0 ? lerp(table.left, court.net.x, 0.5) : lerp(court.net.x, table.right, 0.5);
            const ownY = lerp(ball.y, receiveY, (ownX - ball.x) / (receiveX - ball.x));
            ball.target = { x: ownX, y: ownY };
            ball.serveCrossTicks = Math.max(30, Math.ceil(Math.hypot(targetX - ownX, targetY - ownY) / readableSpeed));
            ball.flightTicks = Math.max(18, Math.ceil(Math.hypot(ownX - ball.x, ownY - ball.y) / readableSpeed));
            ball.arcHeight = 12;
            ball.flightSpeed = Math.hypot(ownX - ball.x, ownY - ball.y) / ball.flightTicks;
            ball.speedX = (ownX - ball.x) / ball.flightTicks;
            ball.speedY = (ownY - ball.y) / ball.flightTicks;
        }
        return ball;
    }

    function step(ball) {
        if (ball.specialTicks > 0) ball.specialTicks--;
        ball.prevX = ball.x; ball.prevY = ball.y; ball.prevZ = ball.z;
        if (ball.state === STATES.MISSED) return null;
        if (ball.state === STATES.SERVE) ball.state = STATES.SERVE_OWN_FLIGHT;
        if (ball.state === STATES.RETURNED) ball.state = STATES.FLY_TO_TABLE;
        if (ball.state === STATES.FLY_TO_TABLE || ball.state === STATES.SERVE_OWN_FLIGHT ||
            ball.state === STATES.SERVE_CROSS_FLIGHT) {
            const u = Math.min(1, ++ball.age / ball.flightTicks);
            const point = ball.curve ? curvePoint(ball.origin, ball.curve, ball.target, u) :
                { x: lerp(ball.origin.x, ball.target.x, u), y: lerp(ball.origin.y, ball.target.y, u) };
            ball.x = point.x; ball.y = point.y;
            if (ball.curve) { ball.speedX = ball.x - ball.prevX; ball.speedY = ball.y - ball.prevY; }
            ball.z = ball.origin.z * (1 - u) + 4 * ball.arcHeight * u * (1 - u);
            ball.speedZ = ball.z - ball.prevZ;
            if (u === 1) {
                // Exact contact, never a gravity integration below/outside the table.
                ball.x = ball.target.x; ball.y = ball.target.y; ball.z = 0;
                ball.tableContacts++;
                const ownContact = ball.state === STATES.SERVE_OWN_FLIGHT;
                if (ownContact) { ball.ownBounceCount = 1; ball.state = STATES.SERVE_OWN_BOUNCE; }
                else { ball.bounceCount = 1; ball.state = STATES.TABLE_BOUNCE; }
                ball.speedX = 0; ball.speedY = 0; ball.speedZ = 0;
                return ownContact ? 'SERVE_BOUNCE' : 'BOUNCE';
            }
        } else if (ball.state === STATES.SERVE_OWN_BOUNCE) {
            if (++ball.bounceTicks >= 2) startCrossServe(ball);
        } else if (ball.state === STATES.TABLE_BOUNCE) {
            // Two visible contact frames (33 ms at the game's 60 Hz update).
            if (++ball.bounceTicks >= 2) {
                ball.state = STATES.ATTACK_RECEIVER;
                const dx = ball.receive.x - ball.target.x;
                const dy = ball.receive.y - ball.target.y;
                const length = Math.hypot(dx, dy);
                ball.speedX = dx / length * ball.attackSpeed;
                ball.speedY = dy / length * ball.attackSpeed;
            }
        } else if (ball.state === STATES.ATTACK_RECEIVER) {
            ball.attackTicks++;
            ball.x += ball.speedX; ball.y += ball.speedY;
            const progress = clamp(Math.abs((ball.x - ball.target.x) / (ball.receive.x - ball.target.x)), 0, 1);
            ball.z = 24 * Math.sin(progress * Math.PI / 2);
            ball.speedZ = ball.z - ball.prevZ;
            // No floor bounce or arena-wall ricochet after the single table bounce.
        }
        return null;
    }

    function curvePoint(origin, curve, target, t) {
        const v = 1 - t;
        return { x: v*v*v*origin.x + 3*v*v*t*curve.p1.x + 3*v*t*t*curve.p2.x + t*t*t*target.x,
            y: v*v*v*origin.y + 3*v*v*t*curve.p1.y + 3*v*t*t*curve.p2.y + t*t*t*target.y };
    }

    function canGlobalReturn(ball, court) {
        const live = [STATES.RETURNED, STATES.FLY_TO_TABLE, STATES.SERVE_OWN_FLIGHT,
            STATES.SERVE_OWN_BOUNCE, STATES.SERVE_CROSS_FLIGHT, STATES.TABLE_BOUNCE, STATES.ATTACK_RECEIVER];
        return live.includes(ball.state) && !ball.destroyed && !ball.respawning && ball.active !== false &&
            [ball.x, ball.y, ball.z].every(Number.isFinite) && ball.z >= 0 && ball.z <= 100 &&
            ball.x >= court.player.minX - 2 && ball.x <= court.opponent.homeX + 32 &&
            ball.y >= court.table.back - 32 && ball.y <= court.table.front + 32;
    }

    function returnGlobally(ball, index, count, rally, court) {
        if (!canGlobalReturn(ball, court)) return false;
        const table = court.table, centerY = (table.back + table.front) / 2;
        const lanes = [0.50, 0.22, 0.78, 0.36, 0.64, 0.12, 0.88, 0.43, 0.57, 0.30];
        const lane = count === 1 ? clamp((ball.y - table.back) / (table.front - table.back), 0.18, 0.82) : lanes[index % lanes.length];
        const base = clamp(TUNING.attackMin + clamp(rally || 0, 0, TUNING.rallyCap) * TUNING.rallyStep + 0.1,
            TUNING.attackMin, TUNING.attackMax);
        const attackSpeed = Math.min(TUNING.superMax, base * TUNING.globalReturnMultiplier);
        const defenseFrontX = court.opponent.homeX - 8;
        const target = { x: lerp(court.net.x + 22, defenseFrontX - attackSpeed * TUNING.superReactionTicks,
            [0.2, 0.65, 0.4, 0.85, 0.5][index % 5]),
            y: centerY + (lane - 0.5) * (table.front - table.back - 32) * 0.95 };
        const endOffsets = [0, -14, 14, 8, -8, 12, -12, 6, -6, 10];
        const receive = { x: table.right + 4,
            y: clamp(target.y + endOffsets[index % endOffsets.length], table.back + 12, table.front - 12) };
        const origin = { x: ball.x, y: ball.y, z: ball.z };
        const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
        const endHandle = clamp(distance * 0.24, 20, 46);
        const slope = (receive.y - target.y) / (receive.x - target.x);
        let p1;
        if (origin.x < target.x - 18) {
            const length = Math.max(1, distance), previousSpeed = Math.hypot(ball.speedX, ball.speedY) || 1;
            const dx = (target.x - origin.x) / length + Math.max(0, (ball.speedX || 0) / previousSpeed) * 0.12;
            const dy = (target.y - origin.y) / length + (ball.speedY || 0) / previousSpeed * 0.12;
            const handle = clamp(distance * 0.35, 14, 48) / Math.hypot(dx, dy);
            p1 = { x: origin.x + dx * handle, y: origin.y + dy * handle };
        } else {
            // Balls already near/beyond the master's end describe a short loop
            // before the bounce. No relocation or 180-degree turn at the table.
            p1 = { x: Math.min(court.opponent.homeX + 32, origin.x + 10),
                y: clamp(origin.y + (ball.speedY || 0) * 2, table.back - 24, table.front + 24) };
        }
        const curve = { p1, p2: { x: target.x - endHandle, y: target.y - slope * endHandle } };
        let maxDerivative = 0, arcHeight = 30;
        let previous = origin;
        for (let sample = 0; sample <= 64; sample++) {
            const t = sample / 64, v = 1 - t;
            const dx = 3*v*v*(p1.x-origin.x) + 6*v*t*(curve.p2.x-p1.x) + 3*t*t*(target.x-curve.p2.x);
            const dy = 3*v*v*(p1.y-origin.y) + 6*v*t*(curve.p2.y-p1.y) + 3*t*t*(target.y-curve.p2.y);
            maxDerivative = Math.max(maxDerivative, Math.hypot(dx, dy));
            const point = curvePoint(origin, curve, target, t);
            if (sample && (previous.x - court.net.x) * (point.x - court.net.x) <= 0 && Math.abs(point.x - previous.x) > 0.001) {
                const crossing = (sample - 1 + (court.net.x - previous.x) / (point.x - previous.x)) / 64;
                if (crossing > 0.005 && crossing < 0.995) {
                    arcHeight = Math.max(arcHeight, ((court.net.height || 20.3) + ball.radius + 3 - origin.z * (1-crossing)) /
                        (4 * crossing * (1-crossing)));
                }
            }
            previous = point;
        }
        const duration = Math.max(32, Math.ceil(maxDerivative * 1.02 / TUNING.globalFlightMax)) + index * 2;
        Object.assign(ball, {
            state: STATES.RETURNED, lastHitter: 'PLAYER', receiver: 'OPPONENT', direction: 1,
            isSuper: true, isServe: false, ownBounceCount: 0, bounceCount: 0, tableContacts: 0,
            shotId: (ball.shotId || 0) + 1, age: 0, bounceTicks: 0, attackTicks: 0,
            origin, target, receive, curve, flightTicks: duration, arcHeight: Math.min(90, arcHeight),
            attackSpeed, flightSpeed: maxDerivative / duration, reactionTicks: TUNING.superReactionTicks,
            defenseFrontX, rallyAtLaunch: rally, style: 'GLOBAL_RETURN',
            specialPace: Math.min(1.6, attackSpeed - base), specialTicks: TUNING.globalTrailTicks,
            speedX: 3 * (p1.x - origin.x) / duration, speedY: 3 * (p1.y - origin.y) / duration,
            speedZ: (-origin.z + 4 * Math.min(90, arcHeight)) / duration, trail: []
        });
        delete ball.serveReceiverTarget; delete ball.serveCrossTicks; delete ball.serveNet;
        return true;
    }

    function canReturn(ball, receiver) {
        return ball.state === STATES.ATTACK_RECEIVER && ball.receiver === receiver && ball.bounceCount === 1 &&
            (!ball.isServe || ball.ownBounceCount === 1);
    }
    function paddleContact(ball, rect) {
        // Sweep the segment through the paddle rectangle; fast balls cannot tunnel.
        let entry = 0, exit = 1;
        for (const [a, b, low, high] of [[ball.prevX, ball.x, rect.left, rect.right],
            [ball.prevY, ball.y, rect.top, rect.bottom], [ball.prevZ, ball.z, -6, 48]]) {
            const delta = b - a;
            if (Math.abs(delta) < 0.00001) { if (a < low || a > high) return null; }
            else {
                const t1 = (low - a) / delta, t2 = (high - a) / delta;
                entry = Math.max(entry, Math.min(t1, t2)); exit = Math.min(exit, Math.max(t1, t2));
                if (entry > exit) return null;
            }
        }
        return { x: lerp(ball.prevX, ball.x, entry), y: lerp(ball.prevY, ball.y, entry),
            z: lerp(ball.prevZ, ball.z, entry) };
    }
    function missed(ball, rect) {
        if (!canReturn(ball, ball.receiver)) return false;
        return ball.direction > 0 ? ball.x > rect.right : ball.x < rect.left;
    }
    function markMissed(ball, rect) {
        if (!missed(ball, rect)) return false;
        const x = ball.direction > 0 ? rect.right : rect.left;
        const t = clamp((x - ball.prevX) / (ball.x - ball.prevX), 0, 1);
        ball.y = lerp(ball.prevY, ball.y, t); ball.z = lerp(ball.prevZ, ball.z, t); ball.x = x;
        ball.state = STATES.MISSED;
        ball.speedX = 0; ball.speedY = 0; ball.speedZ = 0; ball.trail = [];
        return true;
    }
    function timeToReceiver(ball, receiverX) {
        if (ball.state === STATES.MISSED) return Infinity;
        if (ball.state === STATES.ATTACK_RECEIVER) return (receiverX - ball.x) / ball.speedX;
        const target = ball.isServe ? ball.serveReceiverTarget : ball.target;
        const attack = Math.hypot(ball.receive.x - target.x, ball.receive.y - target.y) / ball.attackSpeed;
        if (ball.state === STATES.TABLE_BOUNCE) return Math.max(0, 2 - ball.bounceTicks) + attack;
        const own = ball.state === STATES.SERVE || ball.state === STATES.SERVE_OWN_FLIGHT;
        const ownBounce = ball.state === STATES.SERVE_OWN_BOUNCE;
        const remaining = ownBounce ? Math.max(0, 2 - ball.bounceTicks) : Math.max(0, ball.flightTicks - ball.age);
        return remaining + (own || ownBounce ? ball.serveCrossTicks + (own ? 2 : 0) : 0) + 2 + attack;
    }
    function drawTelegraph(ctx, ball) {
        if (![STATES.SERVE, STATES.RETURNED, STATES.FLY_TO_TABLE, STATES.SERVE_OWN_FLIGHT,
            STATES.SERVE_CROSS_FLIGHT].includes(ball.state)) return;
        const progress = clamp(ball.age / ball.flightTicks, 0, 1);
        const radius = lerp(10, 4, progress);
        ctx.save();
        ctx.globalAlpha = 0.16 + progress * 0.26;
        ctx.strokeStyle = ball.isSuper ? '#8cebf0' : '#fff4c7';
        ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(ball.target.x, ball.target.y, radius, radius * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillRect(ball.target.x - 1, ball.target.y - 0.5, 2, 1);
        ctx.restore();
    }
    global.PingPongBall = Object.freeze({ STATES, TUNING, launch, step, canReturn, paddleContact, missed, markMissed,
        timeToReceiver, drawTelegraph, canGlobalReturn, returnGlobally,
        unlockAudio, playBounce, playPaddle, playAlarm, playGlobalReturn });
})(window);
