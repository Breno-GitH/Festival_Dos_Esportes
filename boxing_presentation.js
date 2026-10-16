"use strict";

// Presentation only: no attack clocks, positions, targets or damage are changed here.
const BOXING_SHOW_CONFIG = Object.freeze({ particleLimit: 128, crowdCount: 64,
    arenaScale: 0.344, shakeLimit: 4, palette: ["#f6cd70", "#92dce8", "#e880a6", "#eee9d9"] });
const boxingShow = {
    frame: 0, seed: 2718, energy: 0, flash: 0, celebration: 0, celebrationAge: 0,
    count: 0, countPulse: 0, peakParticles: 0, events: {},
    particles: Array.from({ length: BOXING_SHOW_CONFIG.particleLimit }, () => ({ life: 0 })),
    recoil: { zorp: { life: 0 }, master: { life: 0 } },
    crowd: Array.from({ length: BOXING_SHOW_CONFIG.crowdCount }, (_, i) => {
        const row = Math.floor(i / 32), slot = i % 32;
        const x = 5 + slot * 14.2;
        return { x, y: row ? 102 + (i % 3) : 77 + (i % 3),
            size: row ? 1.65 : 1.1, phase: i * 1.73, group: Math.floor(slot / 4),
            // Keep the central stairs/entrance unobstructed.
            visible: x < 181 || x > 270 };
    })
};
function boxingShowRandom() {
    boxingShow.seed = (Math.imul(boxingShow.seed, 1664525) + 1013904223) >>> 0;
    return boxingShow.seed / 4294967296;
}
function resetBoxingPresentation() {
    const s = boxingShow;
    s.frame = 0; s.seed = 2718; s.energy = 0; s.flash = 0;
    s.celebration = 0; s.celebrationAge = 0; s.count = 0; s.countPulse = 0;
    s.peakParticles = 0; s.events = {};
    for (const p of s.particles) p.life = 0;
    for (const r of Object.values(s.recoil)) r.life = 0;
}
function boxingShowConfetti(amount) {
    // A fixed pool; spent pieces are reused. No new images or persistent particles.
    for (const p of boxingShow.particles) {
        if (amount <= 0) break;
        if (p.life > 0) continue;
        const left = boxingShowRandom() < .5;
        Object.assign(p, { kind: "confetti", x: left ? 22 : 428,
            y: 72 + boxingShowRandom() * 24,
            vx: (left ? 1 : -1) * (0.4 + boxingShowRandom() * 1.4),
            vy: -1.8 - boxingShowRandom() * 1.6,
            life: 130 + boxingShowRandom() * 60, maxLife: 190,
            angle: boxingShowRandom() * 6.28, spin: .06 + boxingShowRandom() * .09,
            color: BOXING_SHOW_CONFIG.palette[Math.floor(boxingShowRandom() * 4)] });
        amount--;
    }
}
function boxingShowEvent(kind, actor, direction = 1) {
    const s = boxingShow;
    s.events[kind] = (s.events[kind] || 0) + 1;
    const power = { intro: .22, jab: .18, block: .1, dodge: .16, cross: .4,
        hook: .56, dash: .66, charged: .7, counter: .82,
        guardBreak: .82, knockdown: 1, finisher: 1, victory: 1 }[kind] || .25;
    s.energy = Math.min(1, Math.max(s.energy, power));
    if (["counter", "guardBreak", "knockdown", "finisher", "victory"].includes(kind))
        s.flash = Math.max(s.flash, kind === "finisher" ? .085 : .045);
    if (kind === "finisher" || kind === "victory") {
        // Confetti cannons are reserved for the decisive finish, never ordinary hits.
        s.celebration = kind === "victory" ? 270 : 210;
        boxingShowConfetti(kind === "victory" ? 36 : 24);
    }
    if (!actor || actor.role === "judge") return;
    const r = s.recoil[actor.role];
    if (r && !["intro", "victory", "finisher"].includes(kind)) {
        r.life = kind === "block" ? 5 : kind === "jab" ? 5 : 8;
        r.maxLife = r.life; r.direction = direction;
        r.strength = kind === "block" ? .35 : Math.min(1, power + .25);
        // Two render frames of contact emphasis; simulation keeps running normally.
        r.hold = power >= .4 ? 2 : 0; r.poseFrame = actor.stateFrame;
    }
    if (["dodge", "guardBreak", "counter", "hook", "dash", "charged"].includes(kind)) {
        let remaining = kind === "guardBreak" ? 9 : 5;
        for (const p of s.particles) {
            if (!remaining) break;
            if (p.life > 0) continue;
            Object.assign(p, { kind: kind === "guardBreak" ? "guard" : "contact",
                x: actor.x - direction * 9, y: actor.y - 49,
                vx: direction * (.4 + boxingShowRandom() * 1.5),
                vy: -1.5 + boxingShowRandom() * 2,
                life: 9 + boxingShowRandom() * 7, maxLife: 16,
                color: kind === "guardBreak" ? "#a5dded" : "#f7e6bb" });
            remaining--;
        }
    }
}
function updateBoxingPresentation() {
    const s = boxingShow;
    s.frame++; s.energy *= .975; s.flash *= .68;
    s.countPulse *= .86;
    for (const r of Object.values(s.recoil)) {
        if (r.life > 0) r.life--;
        if (r.hold > 0) r.hold--;
    }
    if (boxeGame.phase === "KNOCKDOWN") {
        const count = boxeGame.knockdown?.count || 0;
        if (count !== s.count) { s.count = count; s.countPulse = 1; s.energy = Math.max(s.energy, .35); }
    } else { s.count = 0; }
    if (s.celebration > 0) {
        s.celebration--; s.celebrationAge++;
        if (s.celebrationAge % 22 === 0) boxingShowConfetti(8);
    }
    let active = 0;
    for (const p of s.particles) {
        if (p.life <= 0) continue;
        p.life--; active++;
        p.x += p.vx; p.y += p.vy;
        p.vy += p.kind === "confetti" ? .026 : .07;
        if (p.kind === "confetti") { p.vx *= .995; p.angle += p.spin; }
        if (p.y > 294) p.life = 0;
    }
    s.peakParticles = Math.max(s.peakParticles, active);
}
function boxingArenaFraming() {
    const scale = BOXING_SHOW_CONFIG.arenaScale;
    return { scale, x: (450 - imgBoxeArenaBg.naturalWidth * scale) / 2, y: -20 };
}
function drawBoxingOfficialArena() {
    const bg = imgBoxeArenaBg;
    ctx.fillStyle = "#11151e"; ctx.fillRect(0, 0, 450, 300);
    if (!bg.complete || !bg.naturalWidth) return;
    const f = boxingArenaFraming();
    ctx.save(); ctx.imageSmoothingEnabled = true;
    // One uniform scale: the real mat spans y166..252, matching the existing ring.
    ctx.drawImage(bg, f.x, f.y, bg.naturalWidth * f.scale, bg.naturalHeight * f.scale);
    ctx.restore();
}
function drawBoxingCrowd() {
    const s = boxingShow;
    ctx.save();
    for (const person of s.crowd) {
        if (!person.visible) continue;
        const wave = Math.sin(s.frame * .09 - person.group * .63);
        const enthusiasm = s.energy * (.6 + wave * .4);
        const idle = Math.sin(s.frame * .025 + person.phase);
        const arm = enthusiasm > .28 || Math.sin(s.frame * .014 + person.phase) > .98;
        const lift = enthusiasm * 1.8;
        ctx.save(); ctx.translate(person.x + idle * .35, person.y - lift);
        ctx.scale(person.size, person.size);
        ctx.fillStyle = person.size > 1.5 ? "#151c29" : "#1c2431";
        ctx.beginPath(); ctx.arc(0, -4.8, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-2.5, -2.7, 5, 6, 1.7); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(-4, arm ? -6 - enthusiasm * 2 : 2);
        ctx.moveTo(2, -1); ctx.lineTo(4, arm ? -5 - enthusiasm * 2 : 2); ctx.stroke();
        ctx.restore();
    }
    // Sparse camera flashes stay in the spectator area, never across the fighters.
    if (s.energy > .5 && s.frame % 19 < 2) {
        const x = 35 + ((Math.floor(s.frame / 19) * 83) % 375);
        ctx.fillStyle = "rgba(218,234,255,.65)";
        ctx.fillRect(x - 2, 88, 4, 1); ctx.fillRect(x, 86, 1, 5);
    }
    ctx.restore();
}
function drawBoxingEventLighting() {
    const s = boxingShow;
    ctx.save();
    if (s.flash > .002) {
        ctx.fillStyle = `rgba(246,228,191,${s.flash})`; ctx.fillRect(0, 0, 450, 270);
    }
    if (boxeGame.phase === "KNOCKDOWN" || boxeGame.phase === "GETUP") {
        const judge = boxeGame.juiz;
        const beam = ctx.createLinearGradient(judge.x, 74, judge.x, judge.y + 6);
        beam.addColorStop(0, "rgba(255,229,163,0)");
        beam.addColorStop(1, "rgba(255,229,163,.1)");
        ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(judge.x - 8, 74);
        ctx.lineTo(judge.x + 29, judge.y + 5); ctx.lineTo(judge.x - 29, judge.y + 5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = `rgba(255,222,142,${.22 + s.countPulse * .4})`;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(judge.x, judge.y + 3, 18 + s.countPulse * 4, 5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Celebration is behind the combatants and below the HUD's draw order.
    for (const p of s.particles) {
        if (p.life <= 0 || p.kind !== "confetti") continue;
        ctx.save(); ctx.globalAlpha = Math.min(.75, p.life / 30);
        ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = p.color;
        ctx.fillRect(-1.3, -.6, 2.6 * Math.max(.2, Math.abs(Math.cos(p.angle))), 1.2);
        ctx.restore();
    }
    ctx.restore();
}
function drawBoxingContactParticles() {
    ctx.save();
    for (const p of boxingShow.particles) {
        if (p.life <= 0 || p.kind === "confetti") continue;
        ctx.globalAlpha = p.life / p.maxLife; ctx.strokeStyle = p.color;
        ctx.lineWidth = p.kind === "guard" ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); ctx.stroke();
    }
    ctx.restore();
}
function drawBoxingOfficialFrontRopes() {
    if (!imgBoxeArenaBg.complete || !imgBoxeArenaBg.naturalWidth) return;
    const f = boxingArenaFraming();
    // Reuse the photographed/pixel-art ropes, not a second procedural ring.
    // Narrow transparent occlusion keeps depth while preserving punch silhouettes.
    ctx.save(); ctx.globalAlpha = .62;
    ctx.beginPath();
    for (const [y, height] of [[528, 12], [608, 10], [689, 14]]) {
        ctx.rect(0, f.y + y * f.scale, 450, height * f.scale);
    }
    ctx.clip(); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(imgBoxeArenaBg, f.x, f.y,
        imgBoxeArenaBg.naturalWidth * f.scale, imgBoxeArenaBg.naturalHeight * f.scale);
    ctx.restore();
}
function boxingPresentationSnapshot() {
    return { arena: "arena_boxe3.0.png", uniformScale: BOXING_SHOW_CONFIG.arenaScale,
        crowd: boxingShow.crowd.filter(p => p.visible).length, energy: boxingShow.energy,
        activeParticles: boxingShow.particles.filter(p => p.life > 0).length,
        peakParticles: boxingShow.peakParticles, particleLimit: BOXING_SHOW_CONFIG.particleLimit,
        celebrationFrames: boxingShow.celebration, events: { ...boxingShow.events } };
}
