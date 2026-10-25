/* Presentation only: the court, ball, score, AI and special rules stay in script.js. */
(function (global) {
    'use strict';
    const VIEW = Object.freeze({ scale: 1.10, centerX: 225, centerY: 157, screenY: 160 });
    const SPRITE_SCALE = 0.66;
    // Measured alpha bounds and the center of the last six rows of feet. No sheet slicing.
    const POSES = Object.freeze({
        PLAYER: Object.freeze({
            IDLE: [13, 2, 43, 66, 29.5, 68], MOVE_UP: [6, 4, 45, 68, 20.5, 72],
            MOVE_DOWN: [4, 3, 48, 64, 23, 67], HIT: [4, 6, 66, 66, 23.5, 72]
        }),
        OPPONENT: Object.freeze({
            IDLE: [1, 2, 49, 64, 30, 66], MOVE_UP: [1, 1, 47, 67, 30.5, 68],
            MOVE_DOWN: [0, 0, 48, 68, 31, 68], HIT: [0, 4, 77, 69, 54, 73]
        })
    });
    let background = null, backgroundKey = '', builds = 0;
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const rect = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    function poly(c, color, points) {
        c.fillStyle = color; c.beginPath();
        points.forEach(([x, y], i) => i ? c.lineTo(Math.round(x), Math.round(y)) : c.moveTo(Math.round(x), Math.round(y)));
        c.closePath(); c.fill();
    }
    function pixelOval(c, color, x, y, rx, ry) {
        // Stepped silhouette: no blur, gradients or antialiased circular edges.
        for (let row = -Math.ceil(ry); row <= Math.ceil(ry); row++) {
            const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry))));
            if (half > 0) rect(c, color, x - half, y + row, half * 2, 1);
        }
    }
    function applyView(c) {
        c.translate(VIEW.centerX, VIEW.screenY); c.scale(VIEW.scale, VIEW.scale);
        c.translate(-VIEW.centerX, -VIEW.centerY);
    }
    function project(x, y) {
        return { x: VIEW.centerX + (x - VIEW.centerX) * VIEW.scale,
            y: VIEW.screenY + (y - VIEW.centerY) * VIEW.scale };
    }
    function spriteLayout(role, action, x, y) {
        const p = POSES[role][action] || POSES[role].IDLE;
        const footX = x + 18, footY = y + 45;
        return { source: p.slice(0, 4), x: Math.round(footX - (p[4] - p[0]) * SPRITE_SCALE),
            y: Math.round(footY - p[3] * SPRITE_SCALE), w: p[2] * SPRITE_SCALE, h: p[3] * SPRITE_SCALE,
            footX, footY, scale: SPRITE_SCALE };
    }
    function drawTable(c, court) {
        const t = court.table, l = Math.round(t.left), r = Math.round(t.right), b = Math.round(t.back), f = Math.round(t.front), mid = Math.round((b + f) / 2);
        // The surface stays exactly on the physical rectangle; perspective is in its extrusion.
        pixelOval(c, 'rgba(8,22,28,.20)', (l + r) / 2 + 3, f + 20, (r - l) / 2 + 15, 14);
        rect(c, 'rgba(7,20,27,.23)', l + 4, b + 14, r - l + 4, f - b + 5);
        for (const x of [l + 22, r - 29]) {
            rect(c, '#102c36', x, f + 5, 8, 23); rect(c, '#53767c', x, f + 5, 2, 20);
            rect(c, '#0d2530', x - 3, f + 25, 14, 3); rect(c, '#172e38', x + 8, f + 8, 32, 3);
        }
        poly(c, '#203f4e', [[l, b], [r, b], [r + 2, b + 7], [l - 2, b + 7]]);
        rect(c, '#0d2937', l - 2, b, r - l + 4, f - b + 10);
        rect(c, '#3d6978', l - 1, f + 3, r - l + 2, 3);
        rect(c, '#183746', l - 1, f + 6, r - l + 2, 4);
        rect(c, '#172f3d', l, b, r - l, f - b);
        rect(c, '#2a8092', l + 2, b + 2, r - l - 4, f - b - 4);
        rect(c, '#2e899a', l + 3, b + 3, (r - l) / 2 - 3, f - b - 6);
        rect(c, '#287e91', l + 3, mid + 2, r - l - 6, f - mid - 5);
        rect(c, '#3694a0', l + 4, b + 4, r - l - 8, 2);
        rect(c, '#d9e8dc', l, b, r - l, 2); rect(c, '#e4eee1', l, f - 2, r - l, 2);
        rect(c, '#d9e8dc', l, b, 2, f - b); rect(c, '#d9e8dc', r - 2, b, 2, f - b);
        rect(c, '#c4dcd6', l + 2, mid, r - l - 4, 1);
        rect(c, '#a9cbc9', Math.round(court.net.x), b + 2, 1, f - b - 4);
        // Small manufacturing marks are on the apron, never behind the ball.
        rect(c, '#6a8990', l + 9, f + 7, 12, 1); rect(c, '#6a8990', r - 21, f + 7, 12, 1);
        rect(c, '#b19b62', l + 23, f + 7, 3, 1); rect(c, '#b19b62', r - 26, f + 7, 3, 1);
    }
    function drawNet(c, court) {
        const n = court.net, x = Math.round(n.x), back = Math.round(n.back), front = Math.round(n.front), h = Math.round(n.height);
        poly(c, 'rgba(9,35,43,.17)', [[x + 1, back], [x + 8, back + 3], [x + 9, front + 3], [x + 1, front]]);
        poly(c, 'rgba(12,32,43,.56)', [[x - 3, back - h], [x + 3, back], [x + 3, front], [x - 3, front - h]]);
        // Oblique cross threads make the edge-on net read as a raised plane.
        for (let y = back; y <= front; y += 5) {
            for (let k = 0; k < 5; k++) rect(c, '#819eaa', x - 2 + k, y - h + k * h / 5, 1, 1);
        }
        rect(c, '#a8c1c8', x - 2, back - h, 1, front - back);
        rect(c, '#4d7887', x + 2, back, 1, front - back);
        rect(c, '#e5e9d9', x - 3, back - h, 2, front - back + 1);
        for (const y of [back, front]) {
            pixelOval(c, 'rgba(5,20,28,.25)', x + 4, y + 3, 7, 2);
            rect(c, '#0c2735', x - 3, y - h - 4, 5, h + 9);
            rect(c, '#658b96', x - 3, y - h - 3, 2, h + 6);
            rect(c, '#d1dbce', x - 4, y - h - 4, 7, 2);
            rect(c, '#1a3845', x - 5, y + 3, 10, 3);
        }
    }
    function drawArena(c, court, now = 0, reaction = { tier: 0, climax: false, energy: 0 }) {
        const key = [court.table.left, court.table.right, court.table.back, court.table.front, court.net.height].join(':');
        if (!background || key !== backgroundKey) {
            background = global.document.createElement('canvas'); background.width = 450; background.height = 300;
            const layer = background.getContext('2d'); layer.imageSmoothingEnabled = false;
            layer.save(); applyView(layer); global.PingPongArenaArt.floor(layer); layer.restore();
            global.PingPongArenaArt.architecture(layer);
            layer.save(); applyView(layer); drawTable(layer, court); drawNet(layer, court); layer.restore();
            backgroundKey = key; builds++;
        }
        c.save(); c.imageSmoothingEnabled = false; c.drawImage(background, 0, 0);
        global.PingPongCrowd.draw(c, now, reaction);
        const excitement = Math.max(reaction.tier || 0, reaction.climax ? 3 : 0);
        if (excitement || reaction.eventStrength || reaction.victory) {
            c.globalAlpha = .10 + excitement * .035 + (reaction.eventStrength || 0) * .12;
            for (const x of [5, 431]) rect(c, '#d5d1a3', x + 1, 22, 9, 3);
            c.globalAlpha = 1;
        }
        c.restore();
    }
    function drawFighter(c, image, role, action, x, y) {
        const d = spriteLayout(role, action, x, y);
        pixelOval(c, 'rgba(6,23,31,.25)', d.footX + 2, d.footY, 14, 4);
        pixelOval(c, 'rgba(6,23,31,.16)', d.footX, d.footY, 9, 2);
        if (image && image.complete && image.naturalWidth > 0) {
            c.imageSmoothingEnabled = false; c.drawImage(image, ...d.source, d.x, d.y, d.w, d.h);
        }
    }
    function drawBallShadow(c, ball, court) {
        if (ball.state === 'MISSED') return;
        const t = court.table, onTable = ball.x >= t.left && ball.x <= t.right && ball.y >= t.back && ball.y <= t.front;
        const height = Math.max(0, ball.z) + (onTable ? 0 : 24), radius = clamp(ball.radius * (1 - height / 110), 1.4, 4);
        const alpha = clamp(.40 - height / 230, .10, .40).toFixed(2);
        const offsetX = Math.min(3, height * .035), offsetY = Math.min(2, height * .025);
        pixelOval(c, `rgba(3,20,29,${alpha})`, ball.x + offsetX, ball.y + (onTable ? 0 : 24) + offsetY, radius * 1.45, Math.max(1, radius * .5));
    }
    function drawBall(c, ball, style = {}) {
        if (ball.state === 'MISSED') return; // The presentation observer draws the brief outward exit.
        const special = ball.isSuper || ball.specialTicks > 0;
        const speed = Math.max(Math.hypot(ball.speedX || 0, ball.speedY || 0), (ball.attackSpeed || 0) * .80);
        const level = special ? 2 : speed >= 7.1 ? 2 : speed >= 5.8 ? 1 : 0;
        const accent = special ? '#7be0dc' : level === 2 ? '#e4cd9e' : '#e1d7b5';
        const x = Math.round(ball.x), y = Math.round(ball.y - ball.z), r = Math.max(2, Math.round(ball.radius));
        const vx = ball.speedX || ball.direction || 1, vy = (ball.speedY || 0) - (ball.speedZ || 0), length = Math.hypot(vx, vy) || 1;
        const dx = vx / length, dy = vy / length;
        if (level) {
            c.save();
            let drawn = 0;
            for (let i = (ball.trail?.length || 0) - 2; i >= 0 && drawn < (level === 2 ? 4 : 2); i--) {
                const p = ball.trail[i];
                if (Math.hypot(p.x - x, p.y - y) > 14) break;
                const size = drawn === 0 ? 2 : 1;
                c.globalAlpha = (level === 2 ? .30 : .19) * (1 - drawn * .18);
                rect(c, accent, p.x - size / 2, p.y - size / 2, size, size); drawn++;
            }
            // Fresh global returns have no old trail. This cue follows the new physical tangent.
            if (!drawn && special) { c.globalAlpha = .30; rect(c, accent, x - dx * 6, y - dy * 6, 2, 1); }
            if (level === 2) {
                c.globalAlpha = .25;
                rect(c, accent, x - dx * 9 - dy * 3, y - dy * 9 + dx * 3, 2, 1);
                rect(c, accent, x - dx * 11 + dy * 3, y - dy * 11 - dx * 3, 2, 1);
            }
            c.restore();
        }
        const squash = !!style.squash;
        pixelOval(c, '#142e40', x, y, r + 1 + (squash ? .4 : 0), r + 1 - (squash ? .5 : 0));
        pixelOval(c, accent, x, y, r + (squash ? .3 : 0), r - (squash ? .4 : 0));
        pixelOval(c, '#fff9df', x, y - .5, r - 1, r - 1 - (squash ? .25 : 0));
        rect(c, '#ffffff', x - 1, y - 2, 2, 2);
        if (style.globalPulse || style.fresh) {
            c.save(); c.globalAlpha = style.globalPulse ? .65 : .35;
            rect(c, special ? '#b7f6e8' : '#e4e5c8', x - r - 2, y - 1, 1, 2);
            rect(c, special ? '#b7f6e8' : '#e4e5c8', x + r + 1, y, 1, 1); c.restore();
        }
    }
    function drawHUD(c, game, now) { global.PingPongArenaArt.hud(c, game, now); }
    global.PingPongPresentation = Object.freeze({ VIEW, applyView, project, spriteLayout,
        drawArena, drawFighter, drawBallShadow, drawBall, drawHUD,
        snapshot: () => ({ backgroundBuilds: builds, audience: global.PingPongCrowd.snapshot().count, scale: VIEW.scale, crowd: global.PingPongCrowd.snapshot() }) });
})(window);
