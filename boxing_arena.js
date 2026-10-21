"use strict";

// Boxe arcade 2.5D: deslocamento em X e profundidade, ataques direcionais e leitura visual.
const BOXING_CONFIG = Object.freeze({
    ring: Object.freeze({ top: 166, bottom: 252, backLeft: 62, backRight: 388, frontLeft: 31, frontRight: 419 }),
    body: Object.freeze({ radiusX: 14, radiusY: 7, depthScale: 1.65, minSeparation: 30 }),
    movement: Object.freeze({ playerX: 2.35, playerY: 1.52, masterX: 1.76, masterY: 1.15 }),
    maxHp: 100,
    knockdown: Object.freeze({ countFrames: 42, riseCount: 5, getupFrames: 44,
        recoveryHp: 30, heavyHpThreshold: 28, maxRecoveries: 1 }),
    guardDamageScale: 0.3,
    counter: Object.freeze({ window: 42, stun: 105, damageBonus: 3 }),
    guard: Object.freeze({ max: 100, decay: 0.55, breakFrames: 95, pressure: Object.freeze({ jab: 16, cross: 30, hook: 37, dash: 105, charged: 105 }) }),
    specials: Object.freeze({ dashCooldown: 480, chargedCooldown: 510, burstCooldown: 570, burstPressure: 3, burstWindow: 150 }),
    dodge: Object.freeze({ duration: 14, invulnerableFrom: 3, invulnerableTo: 11, cooldown: 30, speedX: 4, speedY: 2.55 }),
    attacks: Object.freeze({
        jab: Object.freeze({ damage: 6, range: 54, depthTolerance: 13, startup: 4, active: 3, recovery: 9, hitstun: 9, push: 5 }),
        cross: Object.freeze({ damage: 12, range: 68, depthTolerance: 10, startup: 8, active: 4, recovery: 15, hitstun: 14, push: 9 }),
        hook: Object.freeze({ damage: 17, range: 48, depthTolerance: 19, startup: 11, active: 5, recovery: 19, hitstun: 18, push: 12 }),
        dash: Object.freeze({ damage: 24, range: 51, depthTolerance: 14, startup: 13, active: 5, recovery: 22, hitstun: 24, push: 25 }),
        charged: Object.freeze({ damage: 27, range: 65, depthTolerance: 13, startup: 30, active: 6, recovery: 26, hitstun: 26, push: 19 })
    })
});
const BOXING_RING_BOUNDS = BOXING_CONFIG.ring;
const boxingInputPress = { start: false, jab: false, cross: false, hook: false, special: false, dodge: false, guard: false, restart: false };
const boxingTapMovement = { x: 0, y: 0, frames: 0 };

function makeBoxingFighter(role, x, y) {
    return {
        role, x, y, facing: role === "zorp" ? 1 : -1,
        state: "idle", animation: "idle", stateFrame: 0,
        lastMoveX: 0, lastMoveY: 0,
        hp: BOXING_CONFIG.maxHp, maxHp: BOXING_CONFIG.maxHp,
        attack: null, hitstun: 0, whiffFrames: 0, guard: false, guardFlash: 0,
        dodgeFrames: 0, dodgeAge: 0, dodgeCooldown: 0, dodgeX: 0, dodgeY: 0,
        counterWindow: 0, counterTarget: null, counterStun: 0,
        guardPressure: 0, guardBreakTimer: 0, pressureHits: 0, pressureWindow: 0,
        dashCooldown: 0, chargedCooldown: 0, burstCooldown: 0, burstFrames: 0,
        knockdowns: 0, damageFlash: 0,
        aiAttackCooldown: 0, aiAttackCount: 0, aiDecisionTimer: 0,
        aiGuardFrames: 0, aiCircleSign: 1
    };
}
const boxeGame = {
    phase: "READY",
    player: makeBoxingFighter("zorp", 145, 218),
    mestre: makeBoxingFighter("master", 302, 198),
    // Observador: sem HP, hurtbox, colisão de corpo ou entrada na lista de alvos.
    juiz: { role: "judge", x: 76, y: 172, animation: "idle", stateFrame: 0, facing: 1 },
    fightFrames: 0, effects: [], winner: null, qaFreezeAi: false,
    introFrames: 0, knockdown: null, getupFrames: 0,
    finisher: null, impactBursts: [], cameraShake: 0
};

function boxingClamp(value, lo, hi) { return Math.max(lo, Math.min(hi, value)); }
function boxingRingSides(y) {
    const ring = BOXING_CONFIG.ring;
    const t = boxingClamp((y - ring.top) / (ring.bottom - ring.top), 0, 1);
    return {
        left: ring.backLeft + (ring.frontLeft - ring.backLeft) * t,
        right: ring.backRight + (ring.frontRight - ring.backRight) * t
    };
}
function boxingConstrain(fighter) {
    const ring = BOXING_CONFIG.ring, body = BOXING_CONFIG.body;
    fighter.y = boxingClamp(fighter.y, ring.top + body.radiusY, ring.bottom - body.radiusY);
    const sides = boxingRingSides(fighter.y);
    fighter.x = boxingClamp(fighter.x, sides.left + body.radiusX, sides.right - body.radiusX);
}
function queueBoxingMoveTap(key) {
    const directions = { a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    if (!directions[key]) return;
    boxingTapMovement.x = directions[key][0];
    boxingTapMovement.y = directions[key][1];
    boxingTapMovement.frames = 2;
}
function boxingClearPresses() {
    boxingInputPress.jab = false;
    boxingInputPress.cross = false;
    boxingInputPress.hook = false;
    boxingInputPress.special = false;
    boxingInputPress.dodge = false;
    boxingInputPress.restart = false;
}
function resetBoxe(startImmediately = false) {
    boxeGame.phase = startImmediately ? "FIGHTING" : "READY";
    boxeGame.player = makeBoxingFighter("zorp", 145, 218);
    boxeGame.mestre = makeBoxingFighter("master", 302, 198);
    window.FestivalChallenges.onBoxingStart();
    boxeGame.juiz = { role: "judge", x: 76, y: 172, animation: "idle", stateFrame: 0, facing: 1 };
    boxeGame.fightFrames = 0;
    boxeGame.effects.length = 0;
    boxeGame.winner = null;
    boxeGame.introFrames = 0;
    boxeGame.knockdown = null;
    boxeGame.getupFrames = 0;
    boxeGame.finisher = null;
    boxeGame.impactBursts.length = 0;
    boxeGame.cameraShake = 0;
    resetBoxingPresentation();
    boxeGame.qaFreezeAi = false;
    boxingInputPress.start = false;
    boxingInputPress.guard = false;
    boxingClearPresses();
    boxingTapMovement.frames = 0;
    if (typeof dialogBox !== "undefined") dialogBox.classList.remove("show");
}
function startBoxingFight() {
    boxingShowEvent("intro");
    boxeGame.phase = "INTRO";
    boxeGame.introFrames = 48;
    boxeGame.juiz.animation = "start";
    boxeGame.juiz.stateFrame = 0;
    boxingInputPress.start = false;
    boxingInputPress.dodge = false;
}
function boxingSetAnimation(fighter, animation) {
    if (fighter.animation !== animation) {
        fighter.animation = animation;
        fighter.stateFrame = 0;
    } else fighter.stateFrame++;
    fighter.state = animation;
}
function boxingMove(fighter, inputX, inputY, speedX, speedY) {
    const magnitude = Math.hypot(inputX, inputY);
    const oldX = fighter.x, oldY = fighter.y;
    if (magnitude > 0) {
        fighter.x += inputX / magnitude * speedX;
        fighter.y += inputY / magnitude * speedY;
    }
    boxingConstrain(fighter);
    fighter.lastMoveX = fighter.x - oldX;
    fighter.lastMoveY = fighter.y - oldY;
    return Math.abs(fighter.lastMoveX) + Math.abs(fighter.lastMoveY) > 0.08;
}
function boxingSeparateFighters(a, b) {
    const body = BOXING_CONFIG.body;
    const dx = b.x - a.x, dy = (b.y - a.y) * body.depthScale;
    const distance = Math.hypot(dx, dy);
    if (distance >= body.minSeparation) return;
    const angleX = distance > 0.001 ? dx / distance : 1;
    const angleY = distance > 0.001 ? dy / distance : 0;
    const correction = (body.minSeparation - distance) * 0.5;
    a.x -= angleX * correction; b.x += angleX * correction;
    a.y -= angleY * correction / body.depthScale;
    b.y += angleY * correction / body.depthScale;
    boxingConstrain(a); boxingConstrain(b);
}
function boxingDistance(a, b) {
    return Math.hypot(b.x - a.x, (b.y - a.y) * BOXING_CONFIG.body.depthScale);
}
function boxingStartAttack(fighter, kind) {
    if (boxeGame.phase !== "FIGHTING" || !BOXING_CONFIG.attacks[kind] ||
        fighter.attack || fighter.hitstun > 0 || fighter.counterStun > 0 ||
        fighter.guardBreakTimer > 0 || fighter.burstFrames > 0 ||
        fighter.dodgeFrames > 0 || fighter.whiffFrames > 0 ||
        (kind === "dash" && (fighter.role !== "zorp" || fighter.dashCooldown > 0)) ||
        (kind === "charged" && (fighter.role !== "master" || fighter.chargedCooldown > 0))) return false;
    fighter.guard = false;
    const counter = kind === "jab" && fighter.counterWindow > 0 &&
        fighter.counterTarget === (fighter.role === "zorp" ? "master" : "zorp");
    fighter.attack = { kind, frame: 0, facing: fighter.facing, landed: false, dodged: false, counter };
    if (counter) fighter.counterWindow = 0;
    if (kind === "dash") fighter.dashCooldown = BOXING_CONFIG.specials.dashCooldown;
    if (kind === "charged") {
        fighter.chargedCooldown = BOXING_CONFIG.specials.chargedCooldown;
        fighter.aiAttackCount = 0;
    } else if (fighter.role === "master") fighter.aiAttackCount++;
    boxingSetAnimation(fighter, kind);
    return true;
}
function boxingStartDodge(fighter, inputX, inputY, opponent) {
    if (fighter.dodgeCooldown > 0 || fighter.attack || fighter.hitstun > 0 ||
        fighter.counterStun > 0 || fighter.guardBreakTimer > 0 || fighter.burstFrames > 0) return false;
    let dx = inputX, dy = inputY;
    if (Math.hypot(dx, dy) < 0.1) {
        dx = fighter.x < opponent.x ? -1 : 1;
        dy = fighter.y > (BOXING_CONFIG.ring.top + BOXING_CONFIG.ring.bottom) / 2 ? -0.5 : 0.5;
    }
    const length = Math.hypot(dx, dy);
    fighter.dodgeX = dx / length; fighter.dodgeY = dy / length;
    fighter.dodgeFrames = BOXING_CONFIG.dodge.duration;
    fighter.dodgeAge = 0;
    fighter.dodgeCooldown = BOXING_CONFIG.dodge.cooldown;
    fighter.guard = false;
    boxingSetAnimation(fighter, "dodge");
    return true;
}
function boxingAddEffect(x, y, text, color) {
    boxeGame.effects.push({ x, y, text, color, life: 16 });
    if (boxeGame.effects.length > 14) boxeGame.effects.shift();
}
function boxingImpact(x, y, strength, color) {
    boxeGame.impactBursts.push({ x, y, strength, color, life: 13 });
    if (boxeGame.impactBursts.length > 8) boxeGame.impactBursts.shift();
    // Short, graded shake; the HUD remains steady and the ring stays readable.
    boxeGame.cameraShake = Math.max(boxeGame.cameraShake,
        Math.min(BOXING_SHOW_CONFIG.shakeLimit, strength * strength * .014));
}
function boxingEnterKnockdown(target, attacker, cause) {
    if (boxeGame.phase !== "FIGHTING") return;
    target.knockdowns++;
    target.guard = false;
    target.attack = null;
    target.hitstun = 0;
    target.counterStun = 0;
    target.guardBreakTimer = 0;
    target.dodgeFrames = 0;
    attacker.attack = null;
    boxeGame.phase = "KNOCKDOWN";
    boxeGame.knockdown = { role: target.role, attacker: attacker.role,
        cause, frames: 0, count: 0 };
    boxeGame.juiz.animation = "step";
    boxeGame.juiz.stateFrame = 0;
    boxingSetAnimation(target, "knockdown");
    boxingSetAnimation(attacker, "idle");
    boxingAddEffect(target.x, target.y - 53, "DOWN!", "#ffe178");
    boxingShowEvent("knockdown", target, attacker.facing);
    boxeGame.cameraShake = Math.max(boxeGame.cameraShake, 3);
}
function boxingFinishKo() {
    const down = boxeGame.knockdown;
    if (!down) return;
    if (down.attacker === "zorp") {
        boxingStartFinisher();
        return;
    }
    boxingCompleteKo();
}
function boxingCompleteKo() {
    const down = boxeGame.knockdown;
    if (!down || boxeGame.phase === "RESULT") return;
    boxeGame.phase = "RESULT";
    boxeGame.winner = down.attacker;
    window.FestivalChallenges.onBoxingResult(boxeGame.winner, boxeGame.player.knockdowns);
    boxeGame.finisher = null;
    boxeGame.juiz.animation = "ko";
    boxeGame.juiz.stateFrame = 0;
    const loser = down.role === "zorp" ? boxeGame.player : boxeGame.mestre;
    const winner = down.attacker === "zorp" ? boxeGame.player : boxeGame.mestre;
    boxingSetAnimation(loser, "defeat");
    boxingSetAnimation(winner, "victory");
    boxingAddEffect(loser.x, loser.y - 60, "KO!", "#ff8196");
    boxingShowEvent("victory");
    if (down.attacker === "zorp" && typeof window.desbloquearMedalha === "function")
        window.desbloquearMedalha("boxe");
}
function boxingStartFinisher() {
    const master = boxeGame.mestre;
    boxeGame.phase = "FINISHER";
    boxeGame.winner = "zorp";
    boxeGame.finisher = {
        frame: 0, centerX: boxingClamp(master.x, 145, 285),
        floorY: boxingClamp(master.y, 186, 236),
        startZorpX: boxeGame.player.x, startMasterX: master.x,
        startZorpY: boxeGame.player.y, startMasterY: master.y
    };
    boxeGame.juiz.animation = "step";
    boxeGame.juiz.stateFrame = 0;
    boxingAddEffect(master.x, master.y - 63, "10!", "#ffe178");
}
function boxingUpdateFinisher() {
    const scene = boxeGame.finisher;
    if (!scene) return;
    const f = ++scene.frame, zorp = boxeGame.player, master = boxeGame.mestre;
    const approach = boxingClamp(f / 25, 0, 1);
    const ease = approach * approach * (3 - 2 * approach);
    const zx = scene.startZorpX + (scene.centerX - 48 - scene.startZorpX) * ease;
    const mx = scene.startMasterX + (scene.centerX + 29 - scene.startMasterX) * ease;
    const zy = scene.startZorpY + (scene.floorY - scene.startZorpY) * ease;
    const my = scene.startMasterY + (scene.floorY - scene.startMasterY) * ease;
    zorp.cinematicPose = { x: zx, y: zy, rotation: 0 };
    master.cinematicPose = { x: mx, y: my, rotation: 0 };
    zorp.facing = 1;
    master.facing = -1;
    const judge = boxeGame.juiz;
    judge.x += boxingClamp(76 - judge.x, -7.5, 7.5);
    judge.y += boxingClamp(173 - judge.y, -3, 3);
    if (f < 19) {
        boxingSetAnimation(master, "getup");
        boxingSetAnimation(zorp, "walk");
    } else if (f < 30) {
        boxingSetAnimation(master, "hurt");
        boxingSetAnimation(zorp, "idle");
    } else if (f < 53) {
        boxingSetAnimation(master, "hurt");
        boxingSetAnimation(zorp, "hook");
    } else if (f < 81) {
        boxingSetAnimation(master, "hurt");
        boxingSetAnimation(zorp, "idle");
    } else if (f < 95) {
        boxingSetAnimation(master, "hurt");
        boxingSetAnimation(zorp, "walk");
    } else if (f < 118) {
        boxingSetAnimation(master, "hurt");
        boxingSetAnimation(zorp, "cross");
    } else {
        boxingSetAnimation(master, "defeat");
        boxingSetAnimation(zorp, "victory");
    }
    if (f === 46) {
        boxingImpact(mx - 12, my - 57, 13, "#ffe178");
        boxingAddEffect(mx, my - 86, "GANCHO!", "#ffe178");
    }
    if (f > 46 && f < 105) {
        const lift = Math.min(1, (f - 46) / 20) * 60;
        master.cinematicPose.y -= lift - Math.max(0, f - 78) * 0.53;
        master.cinematicPose.rotation = boxingClamp((f - 46) * 0.008, 0, 0.27);
    }
    if (f >= 81 && f < 118) {
        zorp.cinematicPose.x += boxingClamp((f - 81) / 17, 0, 1) * 59;
        zorp.cinematicPose.rotation = -0.09;
    }
    if (f === 104) {
        boxingShowEvent("finisher");
        boxingImpact(mx + 8, my - 48, 19, "#84efff");
        boxingAddEffect(mx + 12, my - 82, "SUPER SOCO!", "#84efff");
        boxeGame.juiz.animation = "ko";
        boxeGame.juiz.stateFrame = 0;
    }
    if (f >= 105) {
        const fly = f - 104;
        master.cinematicPose.x += fly * 8.3;
        master.cinematicPose.y -= 45 + fly * 1.55 - fly * fly * 0.038;
        master.cinematicPose.rotation = boxingClamp(fly * 0.07, 0, 1.5);
    }
    boxeGame.juiz.stateFrame++;
    if (f >= 155) boxingCompleteKo();
}
function boxingUpdateKnockdown() {
    const down = boxeGame.knockdown;
    if (!down) return;
    const fighter = down.role === "zorp" ? boxeGame.player : boxeGame.mestre;
    const opponent = down.attacker === "zorp" ? boxeGame.player : boxeGame.mestre;
    down.frames++;
    down.count = Math.min(10, Math.floor(down.frames / BOXING_CONFIG.knockdown.countFrames));
    boxingSetAnimation(fighter, "knockdown");
    boxingSetAnimation(opponent, "idle");
    const judge = boxeGame.juiz;
    const destinationX = boxingClamp(fighter.x + (fighter.x < 225 ? -38 : 38), 65, 385);
    const destinationY = boxingClamp(fighter.y - 12, 174, 235);
    judge.x += boxingClamp(destinationX - judge.x, -5.5, 5.5);
    judge.y += boxingClamp(destinationY - judge.y, -2.5, 2.5);
    judge.countNumber = down.count;
    boxingSetAnimation(judge, Math.abs(destinationX - judge.x) > 5 ? "step" : "count");
    if (down.count >= BOXING_CONFIG.knockdown.riseCount &&
        fighter.knockdowns <= BOXING_CONFIG.knockdown.maxRecoveries) {
        boxeGame.phase = "GETUP";
        boxeGame.getupFrames = 0;
        boxingSetAnimation(fighter, "getup");
        judge.animation = "continue";
        judge.stateFrame = 0;
    } else if (down.count >= 10) boxingFinishKo();
}
function boxingUpdateGetup() {
    const down = boxeGame.knockdown;
    const fighter = down.role === "zorp" ? boxeGame.player : boxeGame.mestre;
    boxeGame.getupFrames++;
    boxingSetAnimation(fighter, "getup");
    boxeGame.juiz.stateFrame++;
    if (boxeGame.getupFrames < BOXING_CONFIG.knockdown.getupFrames) return;
    fighter.hp = Math.max(fighter.hp, BOXING_CONFIG.knockdown.recoveryHp);
    fighter.hitstun = 0;
    fighter.pressureHits = 0;
    fighter.pressureWindow = 0;
    boxeGame.knockdown = null;
    boxeGame.phase = "FIGHTING";
    boxingSetAnimation(fighter, "idle");
    boxeGame.juiz.animation = "idle";
    boxeGame.juiz.stateFrame = 0;
    boxingAddEffect(fighter.x, fighter.y - 64, "FIGHT!", "#9eeaff");
}
function boxingAttackCanHit(attacker, target, attack, spec) {
    const forward = (target.x - attacker.x) * attack.facing;
    return forward >= 3 && forward <= spec.range &&
        Math.abs(target.y - attacker.y) <= spec.depthTolerance;
}
function boxingBreakGuard(target) {
    target.guard = false;
    target.guardPressure = 0;
    target.guardBreakTimer = BOXING_CONFIG.guard.breakFrames;
    target.attack = null;
    target.hitstun = 0;
    boxingSetAnimation(target, "hurt");
    boxingAddEffect(target.x, target.y - 68, "BREAK!", "#ffe178");
    boxingShowEvent("guardBreak", target, -target.facing);
}
function boxingStartBurst(master, zorp) {
    if (master.role !== "master" || master.burstCooldown > 0 || master.hp <= 0) return false;
    master.burstCooldown = BOXING_CONFIG.specials.burstCooldown;
    master.burstFrames = 24;
    master.pressureHits = 0;
    master.pressureWindow = 0;
    master.hitstun = 0;
    master.counterStun = 0;
    master.attack = null;
    master.guard = false;
    master.guardBreakTimer = 0;
    zorp.attack = null;
    zorp.whiffFrames = Math.max(zorp.whiffFrames, 9);
    const direction = Math.sign(zorp.x - master.x) || master.facing;
    zorp.x += direction * 24;
    zorp.y += Math.sign(zorp.y - master.y) * 4;
    boxingConstrain(zorp);
    boxingSetAnimation(master, "burst");
    boxingAddEffect(master.x, master.y - 61, "BURST!", "#b5a0ff");
    return true;
}
function boxingResolveAttack(attacker, target) {
    const attack = attacker.attack, spec = BOXING_CONFIG.attacks[attack.kind];
    if (attack.frame < spec.startup || attack.frame >= spec.startup + spec.active ||
        attack.landed || attack.dodged) return;
    // A esquiva só habilita counter quando um golpe teria passado perto do corpo.
    if (target.dodgeFrames > 0 &&
        target.dodgeAge >= BOXING_CONFIG.dodge.invulnerableFrom &&
        target.dodgeAge <= BOXING_CONFIG.dodge.invulnerableTo &&
        (target.x - attacker.x) * attack.facing >= 0 &&
        (target.x - attacker.x) * attack.facing <= spec.range + 16 &&
        Math.abs(target.y - attacker.y) <= spec.depthTolerance + 12) {
        attack.dodged = true;
        target.counterWindow = BOXING_CONFIG.counter.window;
        target.counterTarget = attacker.role;
        boxingAddEffect(target.x, target.y - 49, "DODGE", "#9eeaff");
        boxingShowEvent("dodge", target, attack.facing);
        return;
    }
    if (!boxingAttackCanHit(attacker, target, attack, spec) || target.burstFrames > 0) return;
    const blocked = target.guard && target.hitstun <= 0 &&
        target.counterStun <= 0 && target.guardBreakTimer <= 0 &&
        (attacker.x - target.x) * target.facing >= 0;
    const damage = blocked ? Math.max(1, Math.round(spec.damage * BOXING_CONFIG.guardDamageScale)) :
        spec.damage + (attack.counter ? BOXING_CONFIG.counter.damageBonus : 0);
    target.hp = Math.max(0, target.hp - damage);
    target.damageFlash = 10;
    target.guardFlash = blocked ? 9 : 0;
    if (blocked) {
        target.guardPressure += BOXING_CONFIG.guard.pressure[attack.kind];
        if (target.guardPressure >= BOXING_CONFIG.guard.max) boxingBreakGuard(target);
    } else {
        target.attack = null;
        target.hitstun = attack.counter ? 0 : spec.hitstun;
        if (attack.counter) target.counterStun = BOXING_CONFIG.counter.stun;
        target.dodgeFrames = 0;
        target.guard = false;
        boxingSetAnimation(target, "hurt");
        if (target.role === "master" && target.hp > 0 && target.counterStun === 0) {
            if (target.pressureWindow === 0) target.pressureHits = 0;
            target.pressureHits++;
            target.pressureWindow = BOXING_CONFIG.specials.burstWindow;
            if (target.pressureHits === 2 && target.burstCooldown === 0)
                boxingAddEffect(target.x, target.y - 68, "ESCAPE!", "#b5a0ff");
        }
    }
    target.x += attack.facing * spec.push * (blocked ? 0.4 : 1);
    target.y += Math.sign(target.y - attacker.y) * (blocked ? 0.7 : 1.8);
    boxingConstrain(target);
    const guardCollapsed = blocked && target.guardBreakTimer > 0;
    if (!guardCollapsed) boxingAddEffect(target.x, target.y - 54,
        blocked ? "BLOCK" : attack.counter ? "COUNTER!" : "-" + damage,
        blocked ? "#9eeaff" : attack.counter ? "#ffe178" :
            attack.kind === "hook" || attack.kind === "dash" ? "#ffb256" : "#ff6972");
    boxingImpact(target.x - attack.facing * 8, target.y - 48,
        blocked ? 3 : attack.counter ? 13 : attack.kind === "jab" ? 5 : attack.kind === "cross" ? 8 : 11,
        blocked ? "#9eeaff" : attack.counter ? "#ffe178" : "#ffab72");
    if (!guardCollapsed)
        boxingShowEvent(blocked ? "block" : attack.counter ? "counter" : attack.kind, target, attack.facing);
    attack.landed = true;
    if (target.hp === 0 || (!blocked &&
        (attack.kind === "dash" || attack.kind === "charged") &&
        target.hp <= BOXING_CONFIG.knockdown.heavyHpThreshold))
        boxingEnterKnockdown(target, attacker, attack.kind);
}
function boxingUpdateAttack(fighter, target) {
    const attack = fighter.attack;
    attack.frame++;
    if (attack.kind === "dash" && attack.frame >= 4 && attack.frame <= 19 &&
        (target.x - fighter.x) * attack.facing > 27) {
        const previousX = fighter.x;
        fighter.x += attack.facing * 8.3;
        boxingConstrain(fighter);
        if (Math.abs(fighter.x - previousX) > 0.1 && attack.frame % 3 === 0)
            boxingAddEffect(fighter.x - attack.facing * 16, fighter.y - 40, "•", "#85f6ff");
    }
    if (attack.kind === "charged" && attack.frame === 1)
        boxingAddEffect(fighter.x, fighter.y - 68, "CHARGE!", "#ffc56b");
    boxingSetAnimation(fighter, attack.kind);
    boxingResolveAttack(fighter, target);
    const spec = BOXING_CONFIG.attacks[attack.kind];
    if (attack.frame >= spec.startup + spec.active + spec.recovery) {
        if (!attack.landed) fighter.whiffFrames = 5;
        fighter.attack = null;
    }
}
function boxingUpdateFighter(fighter, target, intent, speedX, speedY) {
    if (fighter.dodgeCooldown > 0) fighter.dodgeCooldown--;
    if (fighter.guardFlash > 0) fighter.guardFlash--;
    if (fighter.counterWindow > 0) fighter.counterWindow--;
    if (fighter.pressureWindow > 0) fighter.pressureWindow--;
    else fighter.pressureHits = 0;
    if (fighter.dashCooldown > 0) fighter.dashCooldown--;
    if (fighter.chargedCooldown > 0) fighter.chargedCooldown--;
    if (fighter.burstCooldown > 0) fighter.burstCooldown--;
    if (!fighter.guard) fighter.guardPressure = Math.max(0,
        fighter.guardPressure - BOXING_CONFIG.guard.decay);
    if (fighter.role === "master" && fighter.counterStun === 0 &&
        fighter.guardBreakTimer === 0 &&
        fighter.pressureHits >= BOXING_CONFIG.specials.burstPressure &&
        boxingDistance(fighter, target) < 85 && boxingStartBurst(fighter, target)) return;
    if (fighter.burstFrames > 0) {
        fighter.burstFrames--;
        boxingSetAnimation(fighter, "burst");
        return;
    }
    if (fighter.counterStun > 0) {
        fighter.counterStun--;
        fighter.guard = false;
        boxingSetAnimation(fighter, "hurt");
        return;
    }
    if (fighter.guardBreakTimer > 0) {
        fighter.guardBreakTimer--;
        fighter.guard = false;
        boxingSetAnimation(fighter, "hurt");
        return;
    }
    if (fighter.hitstun > 0) {
        fighter.hitstun--;
        fighter.guard = false;
        boxingSetAnimation(fighter, "hurt");
        return;
    }
    if (fighter.dodgeFrames > 0) {
        fighter.dodgeAge++;
        fighter.dodgeFrames--;
        boxingMove(fighter, fighter.dodgeX, fighter.dodgeY,
            BOXING_CONFIG.dodge.speedX, BOXING_CONFIG.dodge.speedY);
        boxingSetAnimation(fighter, "dodge");
        return;
    }
    if (fighter.attack) {
        boxingUpdateAttack(fighter, target);
        return;
    }
    if (fighter.whiffFrames > 0) {
        fighter.whiffFrames--;
        fighter.guard = false;
        boxingSetAnimation(fighter, "idle");
        return;
    }
    if (intent.dodge && boxingStartDodge(fighter, intent.x, intent.y, target)) return;
    if (intent.attack === "dash" || intent.attack === "charged") {
        if (boxingStartAttack(fighter, intent.attack)) return;
    }
    fighter.guard = !!intent.guard;
    if (fighter.guard) {
        boxingMove(fighter, intent.x, intent.y, speedX * 0.4, speedY * 0.4);
        boxingSetAnimation(fighter, "guard");
        return;
    }
    if (intent.attack && boxingStartAttack(fighter, intent.attack)) return;
    const moved = boxingMove(fighter, intent.x, intent.y, speedX, speedY);
    boxingSetAnimation(fighter, moved ? "walk" : "idle");
}
function boxingMasterIntent() {
    const master = boxeGame.mestre, zorp = boxeGame.player;
    const dx = zorp.x - master.x, dy = zorp.y - master.y;
    const distance = boxingDistance(master, zorp);
    if (master.aiAttackCooldown > 0) master.aiAttackCooldown--;
    if (master.aiGuardFrames > 0) master.aiGuardFrames--;
    if (--master.aiDecisionTimer <= 0) {
        master.aiDecisionTimer = 12 + Math.floor(Math.random() * 14);
        master.aiCircleSign = Math.random() < 0.5 ? -1 : 1;
        if (zorp.attack && distance < 80 && Math.abs(dy) < 19 && Math.random() < 0.42)
            master.aiGuardFrames = 17;
    }
    let x = 0, y = 0;
    if (distance > 72) {
        x = Math.sign(dx); y = Math.sign(dy) * 0.6;
    } else if (distance < 39) {
        x = -Math.sign(dx) * 0.85; y = master.aiCircleSign * 0.72;
    } else {
        x = Math.sign(dx) * 0.18; y = master.aiCircleSign * 0.85;
    }
    const intent = { x, y, guard: master.aiGuardFrames > 0, attack: null, dodge: false };
    // A IA esquiva golpes comprometidos ocasionalmente para poder responder com jab.
    if (zorp.attack && zorp.attack.frame < BOXING_CONFIG.attacks[zorp.attack.kind].startup &&
        distance < 67 && Math.abs(dy) < 15 && master.dodgeCooldown === 0 &&
        !master.hitstun && !master.attack && Math.random() < 0.035) {
        intent.dodge = true;
        intent.x = -Math.sign(dx) * 0.35;
        intent.y = dy >= 0 ? -1 : 1;
        intent.guard = false;
    }
    if (master.counterWindow > 0 && !master.attack && !master.hitstun && distance < 57 &&
        Math.abs(dy) < 14) {
        intent.attack = "jab";
        intent.guard = false;
        return intent;
    }
    // Golpe carregado exige distância e linha de ataque; o cooldown impede repetição.
    if (!intent.guard && !intent.dodge && !master.attack && !master.hitstun &&
        master.chargedCooldown === 0 && master.aiAttackCooldown === 0 &&
        distance > 30 && distance < 75 && Math.abs(dy) < 14 &&
        (zorp.whiffFrames > 0 || zorp.guard || master.aiAttackCount >= 3)) {
        intent.attack = "charged";
        master.aiAttackCooldown = 74;
        return intent;
    }
    if (!intent.guard && !intent.dodge && !master.attack && !master.hitstun && !master.dodgeFrames &&
        master.aiAttackCooldown === 0 && distance < 67 && Math.abs(dy) < 17) {
        intent.attack = distance < 42 && Math.random() < 0.35 ? "hook" :
            distance > 50 && Math.random() < 0.5 ? "cross" : "jab";
        master.aiAttackCooldown = 35 + Math.floor(Math.random() * 29);
    }
    return intent;
}
function updateBoxeGame() {
    updateBoxingPresentation();
    hintText.innerText = boxeGame.phase === "READY"
        ? "ESPAÇO OU WASD: ENTRAR NO RINGUE"
        : boxeGame.phase === "INTRO" ? "O JUIZ VAI INICIAR A LUTA"
        : boxeGame.phase === "KNOCKDOWN" ? "CONTAGEM DO JUIZ"
        : boxeGame.phase === "GETUP" ? "LUTADOR SE LEVANTANDO"
        : boxeGame.phase === "FINISHER" ? "FINALIZAÇÃO DE ZORP!"
        : boxeGame.phase === "RESULT"
            ? "R: REINICIAR | ESC: SAIR"
            : "WASD MOVER | J/K/L GOLPES | Q DASH | SHIFT DEFESA | ESPAÇO ESQUIVA";
    if (boxeGame.phase === "READY") {
        boxeGame.player.stateFrame++;
        boxeGame.mestre.stateFrame++;
        boxeGame.juiz.stateFrame++;
        if (boxingInputPress.start || keys.space || keys.w || keys.a || keys.s || keys.d) startBoxingFight();
        else return;
    }
    for (const effect of boxeGame.effects) effect.life--;
    boxeGame.effects = boxeGame.effects.filter(effect => effect.life > 0);
    for (const burst of boxeGame.impactBursts) burst.life--;
    boxeGame.impactBursts = boxeGame.impactBursts.filter(burst => burst.life > 0);
    boxeGame.cameraShake *= 0.78;
    if (boxeGame.cameraShake < 0.15) boxeGame.cameraShake = 0;
    if (boxeGame.player.damageFlash > 0) boxeGame.player.damageFlash--;
    if (boxeGame.mestre.damageFlash > 0) boxeGame.mestre.damageFlash--;
    if (boxeGame.phase === "INTRO") {
        boxeGame.introFrames--;
        boxeGame.juiz.stateFrame++;
        boxeGame.player.stateFrame++;
        boxeGame.mestre.stateFrame++;
        if (boxeGame.introFrames <= 0) {
            boxeGame.phase = "FIGHTING";
            boxeGame.juiz.animation = "idle";
            boxeGame.juiz.stateFrame = 0;
            boxingAddEffect(225, 118, "FIGHT!", "#ffe178");
        }
        boxingClearPresses();
        return;
    }
    if (boxeGame.phase === "KNOCKDOWN") {
        boxingUpdateKnockdown();
        boxingClearPresses();
        return;
    }
    if (boxeGame.phase === "GETUP") {
        boxingUpdateGetup();
        boxingClearPresses();
        return;
    }
    if (boxeGame.phase === "FINISHER") {
        boxingUpdateFinisher();
        boxingClearPresses();
        return;
    }
    if (boxeGame.phase === "RESULT") {
        if (boxingInputPress.restart) resetBoxe(true);
        boxeGame.player.stateFrame++;
        boxeGame.mestre.stateFrame++;
        boxeGame.juiz.stateFrame++;
        boxingClearPresses();
        return;
    }
    boxeGame.fightFrames++;
    const tapX = boxingTapMovement.frames > 0 ? boxingTapMovement.x : 0;
    const tapY = boxingTapMovement.frames > 0 ? boxingTapMovement.y : 0;
    const inputX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) || tapX;
    const inputY = (keys.s ? 1 : 0) - (keys.w ? 1 : 0) || tapY;
    const playerIntent = {
        x: inputX, y: inputY, guard: boxingInputPress.guard,
        dodge: boxingInputPress.dodge,
        attack: boxingInputPress.special ? "dash" : boxingInputPress.jab ? "jab" : boxingInputPress.cross ? "cross" :
            boxingInputPress.hook ? "hook" : null
    };
    // Primeiro o jogador, depois a IA; quem receber hitstun perde a ação pendente.
    boxingUpdateFighter(boxeGame.player, boxeGame.mestre, playerIntent,
        BOXING_CONFIG.movement.playerX, BOXING_CONFIG.movement.playerY);
    if (boxeGame.phase === "FIGHTING") {
        const masterIntent = boxeGame.qaFreezeAi
            ? { x: 0, y: 0, guard: false, attack: null, dodge: false }
            : boxingMasterIntent();
        boxingUpdateFighter(boxeGame.mestre, boxeGame.player, masterIntent,
            BOXING_CONFIG.movement.masterX, BOXING_CONFIG.movement.masterY);
    }
    if (boxeGame.phase === "FIGHTING") {
        boxingSeparateFighters(boxeGame.player, boxeGame.mestre);
        if (!boxeGame.player.attack)
            boxeGame.player.facing = boxeGame.mestre.x >= boxeGame.player.x ? 1 : -1;
        if (!boxeGame.mestre.attack)
            boxeGame.mestre.facing = boxeGame.player.x >= boxeGame.mestre.x ? 1 : -1;
        const judge = boxeGame.juiz;
        judge.x += boxingClamp(76 - judge.x, -2.2, 2.2);
        judge.y += boxingClamp(172 - judge.y, -1.5, 1.5);
        boxingSetAnimation(judge, Math.abs(76 - judge.x) > 3 ? "step" : "idle");
    }
    if (boxingTapMovement.frames > 0) boxingTapMovement.frames--;
    boxingClearPresses();
}
function drawBoxingArenaCover() {
    drawBoxingOfficialArena();
    drawBoxingCrowd();
    drawBoxingEventLighting();
}
// Presentation selects actual 3.0 damage/stun poses without changing combat state.
function boxingPresentationAnimation(actor) {
    if (actor.role === "judge") {
        if (actor.animation === "count" && actor.stateFrame < 18) return "count_start";
        if (actor.animation === "ko" && boxeGame.phase === "RESULT" && boxeGame.winner === "zorp" && actor.stateFrame > 28) return "victory";
        return actor.animation;
    }
    if (actor.animation === "hurt" && (actor.counterStun > 0 || actor.guardBreakTimer > 0 ||
        (actor.role === "master" && boxeGame.phase === "FINISHER" && boxeGame.finisher.frame < 46))) return "stun";
    if (actor.animation === "idle") {
        const health = actor.hp / actor.maxHp;
        if (health <= .34) return "idle_heavy";
        if (health <= .67) return "idle_damaged";
    }
    return actor.animation;
}
function drawBoxingActor(actor) {
    const role = actor.role, spriteSet = BOXING_SPRITES[role];
    const animation = boxingPresentationAnimation(actor);
    const frames = spriteSet && spriteSet[animation];
    if (!frames || !frames.length) return;
    const duration = BOXING_FRAME_DURATIONS[animation] || 7;
    const recoil = boxingShow.recoil[role];
    const visualFrame = recoil?.hold > 0 && !actor.cinematicPose ? recoil.poseFrame : actor.stateFrame;
    const frameNumber = Math.floor(visualFrame / duration);
    const looping = ["idle", "idle_damaged", "idle_heavy", "walk", "guard", "stun", "count", "observe"].includes(animation);
    // The new judge observes the downed boxer; the existing HUD counts 1–10.
    // No finger-number poses are inferred from unrelated gestures.
    const index = looping ? frameNumber % frames.length : Math.min(frames.length - 1, frameNumber);
    const sprite = frames[index];
    const near = boxingClamp((actor.y - BOXING_CONFIG.ring.top) /
        (BOXING_CONFIG.ring.bottom - BOXING_CONFIG.ring.top), 0, 1);
    const scale = (role === "judge" ? 0.47 : 0.53) * (0.91 + near * 0.16);
    ctx.fillStyle = "rgba(4,7,17,.4)";
    ctx.beginPath(); ctx.ellipse(actor.x, actor.y + 2, role === "judge" ? 13 : 19, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (!sprite.complete || !sprite.naturalWidth) return;
    if (actor.attack?.kind === "charged") {
        const charge = boxingClamp(actor.attack.frame / BOXING_CONFIG.attacks.charged.startup, 0, 1);
        ctx.strokeStyle = `rgba(255,187,90,${0.25 + charge * 0.65})`;
        ctx.lineWidth = 2 + charge * 2;
        ctx.beginPath(); ctx.arc(actor.x, actor.y - 42, 17 + charge * 10, 0, Math.PI * 2); ctx.stroke();
    }
    if (actor.burstFrames > 0) {
        ctx.strokeStyle = `rgba(179,149,255,${actor.burstFrames / 24})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(actor.x, actor.y - 38, 52 - actor.burstFrames, 0, Math.PI * 2); ctx.stroke();
    }
    if (actor.role === "master" && actor.pressureHits >= 2 && actor.burstCooldown === 0) {
        ctx.strokeStyle = "rgba(181,160,255,.78)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(actor.x, actor.y - 42, 22, -1.2, 1.2); ctx.stroke();
    }
    ctx.save(); ctx.translate(Math.round(actor.x), Math.round(actor.y));
    if (recoil?.life > 0 && !actor.cinematicPose && actor.animation !== "knockdown") {
        const weight = recoil.life / recoil.maxLife * recoil.strength;
        ctx.translate(recoil.direction * weight * 1.2, 0);
        ctx.rotate(recoil.direction * weight * .045);
    }
    if (actor.cinematicPose?.rotation) ctx.rotate(actor.cinematicPose.rotation);
    if (role !== "judge" && actor.hp < actor.maxHp * 0.35 && animation === "idle")
        ctx.rotate(actor.facing * 0.035);
    let visualFacing = actor.facing;
    if (role === "judge") {
        const observed = boxeGame.knockdown && (boxeGame.phase === "KNOCKDOWN" || boxeGame.phase === "GETUP")
            ? (boxeGame.knockdown.role === "zorp" ? boxeGame.player : boxeGame.mestre).x
            : (boxeGame.player.x + boxeGame.mestre.x) / 2;
        visualFacing = observed >= actor.x ? 1 : -1;
    }
    if (visualFacing < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -sprite.boxingAnchorX * scale,
        -(sprite.boxingFootY + 1) * scale,
        BOXING_FRAME_CANVAS.width * scale, BOXING_FRAME_CANVAS.height * scale);
    ctx.restore();
    if (actor.attack) {
        const spec = BOXING_CONFIG.attacks[actor.attack.kind];
        const age = actor.attack.frame - spec.startup;
        if (age >= -2 && age < spec.active + 2) {
            const power = boxingClamp(1 - Math.abs(age - 1) / (spec.active + 2), 0, 1);
            const direction = actor.attack.facing;
            const reach = actor.attack.kind === "jab" ? 28 : actor.attack.kind === "hook" ? 22 : 34;
            ctx.save();
            ctx.globalAlpha = power * 0.78;
            ctx.strokeStyle = actor.attack.kind === "jab" ? "#9eeaff" :
                actor.attack.kind === "hook" ? "#ffb256" : "#ffe178";
            ctx.lineWidth = actor.attack.kind === "jab" ? 2 : 3;
            ctx.beginPath();
            if (actor.attack.kind === "hook") {
                ctx.arc(actor.x + direction * 11, actor.y - 49, 18,
                    direction > 0 ? -1.2 : 1.9, direction > 0 ? 0.9 : 4.1);
            } else {
                ctx.moveTo(actor.x + direction * 13, actor.y - 52);
                ctx.lineTo(actor.x + direction * reach, actor.y - 51);
            }
            ctx.stroke();
            ctx.restore();
        }
    }
    if (role !== "judge" && actor.damageFlash > 0) {
        ctx.strokeStyle = `rgba(255,102,125,${actor.damageFlash / 15})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(actor.x, actor.y - 37, 19, 31, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (role !== "judge") {
        const wear = 1 - actor.hp / actor.maxHp;
        if (wear > 0.32 && animation !== "knockdown" && animation !== "defeat") {
            ctx.fillStyle = `rgba(106,32,62,${boxingClamp((wear - 0.25) * 0.9, 0, 0.48)})`;
            ctx.beginPath(); ctx.ellipse(actor.x + actor.facing * 8, actor.y - 52, 5, 3, -0.2, 0, Math.PI * 2); ctx.fill();
            if (wear > 0.62) {
                ctx.strokeStyle = "rgba(145,47,64,.75)"; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(actor.x - actor.facing * 5, actor.y - 60);
                ctx.lineTo(actor.x - actor.facing * 1, actor.y - 55); ctx.stroke();
                ctx.fillStyle = "rgba(180,231,255,.72)";
                ctx.beginPath(); ctx.arc(actor.x + actor.facing * 12, actor.y - 43, 1.8, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
    if (actor.guardFlash > 0) {
        ctx.strokeStyle = "rgba(142,236,255,.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(actor.x, actor.y - 45, 19, -1.3, 1.3); ctx.stroke();
    }
    if (actor.counterStun > 0 || actor.guardBreakTimer > 0) {
        ctx.strokeStyle = actor.counterStun > 0 ? "#ffe178" : "#ff879e";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(actor.x, actor.y - 88, 17, 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "bold 8px Arial"; ctx.textAlign = "center";
        ctx.fillText(actor.counterStun > 0 ? "COUNTER" : "GUARDA QUEBRADA", actor.x, actor.y - 99);
    }
    if (actor.counterWindow > 0) {
        ctx.fillStyle = "#ffe178"; ctx.font = "bold 8px Arial"; ctx.textAlign = "center";
        ctx.fillText("JAB COUNTER", actor.x, actor.y - 90);
    }
}
function drawBoxingFrontRopes() {
    drawBoxingOfficialFrontRopes();
}
function drawBoxingHud() {
    for (const [fighter, x, color] of [
        [boxeGame.player, 18, "#8bf266"], [boxeGame.mestre, 272, "#ff696a"]
    ]) {
        ctx.fillStyle = "rgba(6,11,28,.8)"; ctx.fillRect(x - 3, 33, 163, 28);
        ctx.strokeStyle = "#d5e1eb"; ctx.lineWidth = 1; ctx.strokeRect(x, 46, 156, 9);
        ctx.fillStyle = "#171b2b"; ctx.fillRect(x + 1, 47, 154, 7);
        ctx.fillStyle = color; ctx.fillRect(x + 1, 47, 154 * fighter.hp / fighter.maxHp, 7);
        ctx.fillStyle = "#22283b"; ctx.fillRect(x, 57, 156, 3);
        ctx.fillStyle = fighter.guardPressure > 70 ? "#ff8d75" : "#a6dbff";
        ctx.fillRect(x, 57, 156 * fighter.guardPressure / BOXING_CONFIG.guard.max, 3);
        ctx.fillStyle = "#fff"; ctx.font = "bold 9px Arial"; ctx.textAlign = "left";
        ctx.fillText(fighter.role === "zorp" ? "ZORP" : "MESTRE", x, 42);
        ctx.textAlign = "right"; ctx.fillText(String(fighter.hp), x + 155, 42);
    }
    ctx.textAlign = "left"; ctx.font = "bold 8px Arial";
    ctx.fillStyle = boxeGame.player.dashCooldown === 0 ? "#8df5ff" : "#8996a3";
    ctx.fillText(boxeGame.player.dashCooldown === 0 ? "Q DASH PRONTO" :
        `Q DASH ${(boxeGame.player.dashCooldown / 60).toFixed(1)}s`, 18, 72);
}
function drawBoxingEffects() {
    for (const burst of boxeGame.impactBursts) {
        const t = 1 - burst.life / 13;
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = burst.color;
        ctx.lineWidth = Math.max(1, burst.strength / 5 * (1 - t));
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, 5 + t * burst.strength * 2.3, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4 + burst.strength * 0.1;
            const inner = 8 + t * burst.strength;
            const outer = inner + burst.strength * (1 - t);
            ctx.beginPath();
            ctx.moveTo(burst.x + Math.cos(angle) * inner, burst.y + Math.sin(angle) * inner);
            ctx.lineTo(burst.x + Math.cos(angle) * outer, burst.y + Math.sin(angle) * outer);
            ctx.stroke();
        }
        ctx.restore();
    }
    for (const effect of boxeGame.effects) {
        const opacity = effect.life / 16;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = effect.color;
        // Keep feedback above the contact: opaque bubbles used to hide the face/gloves.
        ctx.font = "bold 9px Arial"; ctx.textAlign = "center";
        const textY = effect.y - 15 - 8 * (1 - opacity);
        ctx.strokeStyle = "rgba(8,12,22,.9)"; ctx.lineWidth = 2;
        ctx.strokeText(effect.text, effect.x, textY);
        ctx.fillText(effect.text, effect.x, textY);
    }
    ctx.globalAlpha = 1;
}
function drawBoxingFinisherStreaks() {
    const scene = boxeGame.finisher;
    if (!scene || scene.frame < 81 || scene.frame > 139) return;
    const f = scene.frame;
    ctx.save();
    ctx.globalAlpha = f < 98 ? 0.22 : Math.max(0, (139 - f) / 41) * 0.4;
    ctx.strokeStyle = f < 98 ? "#84efff" : "#ffe178";
    for (let i = 0; i < 7; i++) {
        const y = 112 + i * 19;
        const x = (f * 19 + i * 63) % 480 - 80;
        ctx.lineWidth = i % 2 ? 1 : 2;
        ctx.beginPath(); ctx.moveTo(x - 65, y); ctx.lineTo(x, y - 3); ctx.stroke();
    }
    ctx.restore();
}
function drawBoxeGame() {
    ctx.save();
    if (boxeGame.cameraShake > 0) {
        const n = boxeGame.fightFrames + (boxeGame.finisher?.frame || 0);
        ctx.translate(Math.sin(n * 2.4) * boxeGame.cameraShake,
            Math.cos(n * 3.1) * boxeGame.cameraShake * 0.55);
    }
    drawBoxingArenaCover();
    drawBoxingFinisherStreaks();
    if (boxeGame.finisher) {
        const pose = boxeGame.mestre.cinematicPose;
        if (pose && boxeGame.finisher.frame > 46) {
            ctx.fillStyle = "rgba(5,8,22,.44)";
            ctx.beginPath(); ctx.ellipse(pose.x, boxeGame.finisher.floorY + 2,
                18, 4, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
    [boxeGame.juiz, boxeGame.player, boxeGame.mestre]
        .map(actor => actor.cinematicPose
            ? { ...actor, x: actor.cinematicPose.x, y: actor.cinematicPose.y }
            : actor)
        .sort((a, b) => a.y - b.y).forEach(drawBoxingActor);
    drawBoxingEffects();
    drawBoxingContactParticles();
    drawBoxingFrontRopes();
    ctx.restore();
    drawBoxingHud();
    if (boxeGame.phase === "FINISHER") {
        ctx.fillStyle = "rgba(6,11,28,.76)"; ctx.fillRect(135, 76, 180, 22);
        ctx.strokeStyle = "#ffe178"; ctx.strokeRect(135, 76, 180, 22);
        ctx.fillStyle = "#fff6d1"; ctx.textAlign = "center";
        ctx.font = "bold 11px Arial"; ctx.fillText("FINALIZAÇÃO!", 225, 91);
    }
    if (boxeGame.phase === "KNOCKDOWN" || boxeGame.phase === "GETUP") {
        const count = boxeGame.knockdown?.count || 0;
        ctx.fillStyle = "rgba(8,12,30,.88)"; ctx.fillRect(187, 80, 76, 45);
        ctx.strokeStyle = "#ffe178"; ctx.lineWidth = 2; ctx.strokeRect(187, 80, 76, 45);
        ctx.textAlign = "center"; ctx.fillStyle = "#ffe178";
        ctx.font = "bold 25px Arial"; ctx.fillText(count ? String(count) : "↓", 225, 112);
    }
    if (boxeGame.phase === "READY" || boxeGame.phase === "RESULT") {
        const result = boxeGame.phase === "RESULT";
        const panelX = result ? 76 : 66, panelY = result ? 77 : 104;
        const panelWidth = result ? 298 : 318, panelHeight = result ? 38 : 54;
        ctx.fillStyle = "rgba(5,10,25,.83)";
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = "#ef485a";
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        ctx.textAlign = "center"; ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Arial";
        ctx.fillText(boxeGame.phase === "READY" ? "ENTRE NO RINGUE" :
            boxeGame.winner === "zorp" ? "ZORP VENCE POR KO!" : "MESTRE VENCE POR KO!",
            225, result ? 94 : 124);
        ctx.font = "9px Arial";
        ctx.fillText(boxeGame.phase === "READY" ? "ESPAÇO OU WASD" : "R PARA REINICIAR",
            225, result ? 108 : 142);
    }
    if (new URLSearchParams(location.search).has("boxeDebug")) {
        ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(4, 269, 442, 26);
        ctx.fillStyle = "#aef3ff"; ctx.font = "8px monospace"; ctx.textAlign = "left";
        const p = boxeGame.player, m = boxeGame.mestre;
        ctx.fillText(`Z ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.animation} HP${p.hp} | M ${m.x.toFixed(0)},${m.y.toFixed(0)} ${m.animation} HP${m.hp}`, 9, 280);
        ctx.fillText(`assets ${boxingAssetStatus.loaded}/${boxingAssetStatus.requested} | d ${boxingDistance(p, m).toFixed(1)} | IA ${boxeGame.qaFreezeAi ? "OFF" : "ON"}`, 9, 290);
    }
}
window.getBoxeQaSnapshot = () => ({
    phase: boxeGame.phase, winner: boxeGame.winner,
    finisherFrame: boxeGame.finisher?.frame ?? null,
    knockdown: boxeGame.knockdown ? { ...boxeGame.knockdown } : null,
    player: { x: boxeGame.player.x, y: boxeGame.player.y, hp: boxeGame.player.hp,
        animation: boxeGame.player.animation, attack: boxeGame.player.attack?.kind || null,
        guard: boxeGame.player.guard, dodgeAge: boxeGame.player.dodgeAge,
        knockdowns: boxeGame.player.knockdowns },
    mestre: { x: boxeGame.mestre.x, y: boxeGame.mestre.y, hp: boxeGame.mestre.hp,
        animation: boxeGame.mestre.animation, attack: boxeGame.mestre.attack?.kind || null,
        guard: boxeGame.mestre.guard, dodgeAge: boxeGame.mestre.dodgeAge,
        knockdowns: boxeGame.mestre.knockdowns },
    juiz: { x: boxeGame.juiz.x, y: boxeGame.juiz.y,
        animation: boxeGame.juiz.animation, count: boxeGame.juiz.countNumber || 0 },
    distance: boxingDistance(boxeGame.player, boxeGame.mestre),
    assets: { ...boxingAssetStatus },
    presentation: boxingPresentationSnapshot()
});

