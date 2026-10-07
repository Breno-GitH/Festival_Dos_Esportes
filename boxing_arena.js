"use strict";

// Boxe arcade 2D de arena. Este é o único runtime oficial do minigame.
// Não há rounds, contagem de dez, agarrões, throws, armas ou golpes de wrestling.
const BOXING_CONFIG = Object.freeze({
    hp: 200,
    ring: Object.freeze({ left: 58, right: 392, top: 174, bottom: 226 }),
    body: Object.freeze({ radiusX: 20, radiusY: 9, minSeparation: 39 }),
    movement: Object.freeze({ playerX: 2.45, playerY: 1.70, masterX: 2.05, masterY: 1.42, attackDrift: 0.18 }),
    dodge: Object.freeze({ duration: 16, invulnerableStart: 3, invulnerableEnd: 11, cooldown: 34, distanceX: 39, distanceY: 25 }),
    block: Object.freeze({ damageMultiplier: 0.25, knockbackMultiplier: 0.42, movementMultiplier: 0.35 }),
    combo: Object.freeze({ window: 54, maxCleanHits: 3, recoveryImmunity: 17, spamWindow: 48, spamThreshold: 4 }),
    ai: Object.freeze({ minAttackPause: 56, maxAttackPause: 88 }),
    ko: Object.freeze({ victoryDelay: 42, resultDelay: 155 }),
    attacks: Object.freeze({
        jab: Object.freeze({ damage: 8, range: 66, yTolerance: 20, startup: 5, active: 4, recovery: 9, knockback: 4.5, hitstun: 8, guardStun: 5, hitstop: 2 }),
        cross: Object.freeze({ damage: 12, range: 78, yTolerance: 19, startup: 8, active: 4, recovery: 13, knockback: 7, hitstun: 10, guardStun: 7, hitstop: 3 }),
        hook: Object.freeze({ damage: 16, range: 59, yTolerance: 22, startup: 10, active: 5, recovery: 17, knockback: 10, hitstun: 12, guardStun: 9, hitstop: 4 }),
        uppercut: Object.freeze({ damage: 22, range: 50, yTolerance: 17, startup: 13, active: 5, recovery: 22, knockback: 12, hitstun: 16, guardStun: 11, hitstop: 5 })
    })
});

const BOXING_RING_BOUNDS = BOXING_CONFIG.ring;
const boxingInputPress = { jab: false, power: false, dodge: false };
const boxingTapMovement = { x: 0, y: 0, frames: 0 };
let boxingAudioContext = null;
let boxingAttackId = 0;

function makeBoxingFighter(role, x, y) {
    return {
        role,
        name: role === "zorp" ? "ZORP" : "MESTRE",
        x,
        y,
        facing: role === "zorp" ? 1 : -1,
        hp: BOXING_CONFIG.hp,
        maxHp: BOXING_CONFIG.hp,
        state: "idle",
        animation: "idle",
        stateFrame: 0,
        attack: null,
        hurtTimer: 0,
        guardStun: 0,
        dodgeTimer: 0,
        dodgeFrame: 0,
        dodgeCooldown: 0,
        dodgeVx: 0,
        dodgeVy: 0,
        knockbackX: 0,
        knockbackY: 0,
        comboHits: 0,
        comboTimer: 0,
        comboImmunity: 0,
        counterWindow: 0,
        flashTimer: 0,
        lastMoveX: 0,
        lastMoveY: 0,
        aiState: role === "master" ? "APPROACH" : "PLAYER",
        aiTimer: 0,
        aiDecisionTimer: 12,
        aiCircleDirection: Math.random() < 0.5 ? -1 : 1,
        aiReactionTimer: 0,
        aiReactionChoice: "",
        aiObservedAttackId: -1,
        aiQueuedAttack: "",
        aiComboDelay: 0,
        aiAttackCooldown: 0,
        aiBlockTimer: 0,
        aiRetreatTimer: 0
    };
}

const boxeGame = {
    phase: "READY", // READY, FIGHTING, KO, RESULT
    player: makeBoxingFighter("zorp", 150, 216),
    mestre: makeBoxingFighter("master", 300, 193),
    fightFrames: 0,
    koFrames: 0,
    hitStop: 0,
    cameraShake: 0,
    crowdPulse: 0,
    announcement: "BOXE DE ARENA",
    announcementTimer: 0,
    winner: null,
    loser: null,
    lastHit: null,
    effects: [],
    playerSpam: 0,
    playerLastAttackFrame: -999,
    qaMode: false,
    qaFreezeAi: false,
    qaScenario: "",
    qaMove: "",
    qaAutoAttack: "",
    qaMasterAutoAttack: "",
    qaAutoPlayer: false,
    qaSpamPlayer: false,
    qaAutoCooldown: 0,
    qaEvents: [],
    qaFps: 60,
    fpsFrames: 0,
    fpsLastTime: performance.now(),
    visualDiagnostics: null
};

function logBoxingEvent(type, data = {}) {
    boxeGame.qaEvents.push({ frame: boxeGame.fightFrames, type, ...data });
    if (boxeGame.qaEvents.length > 40) boxeGame.qaEvents.shift();
}

function clearBoxingInputPresses() {
    const pressed = { ...boxingInputPress };
    boxingInputPress.jab = false;
    boxingInputPress.power = false;
    boxingInputPress.dodge = false;
    return pressed;
}

function queueBoxingMoveTap(key) {
    const directions = {
        a: [-1, 0],
        d: [1, 0],
        w: [0, -1],
        s: [0, 1]
    };
    const direction = directions[key];
    if (!direction) return;
    boxingTapMovement.x = direction[0];
    boxingTapMovement.y = direction[1];
    boxingTapMovement.frames = 7;
}

function prepareBoxingAudio() {
    try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        if (!boxingAudioContext) boxingAudioContext = new AudioCtor();
        if (boxingAudioContext.state === "suspended") boxingAudioContext.resume().catch(() => {});
    } catch (_) {
        boxingAudioContext = null;
    }
}

function playBoxingTone(kind) {
    if (!boxingAudioContext || boxingAudioContext.state !== "running") return;
    try {
        const now = boxingAudioContext.currentTime;
        const oscillator = boxingAudioContext.createOscillator();
        const gain = boxingAudioContext.createGain();
        const strong = kind === "strong" || kind === "ko";
        oscillator.type = strong ? "sawtooth" : "square";
        oscillator.frequency.setValueAtTime(kind === "ko" ? 54 : strong ? 72 : 105, now);
        oscillator.frequency.exponentialRampToValueAtTime(42, now + (kind === "ko" ? 0.18 : 0.07));
        gain.gain.setValueAtTime(kind === "ko" ? 0.12 : 0.055, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === "ko" ? 0.22 : 0.09));
        oscillator.connect(gain).connect(boxingAudioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + (kind === "ko" ? 0.23 : 0.1));
    } catch (_) {
        // O áudio é feedback opcional; uma falha nunca interrompe a luta.
    }
}

function resetBoxe(startImmediately = false) {
    boxeGame.phase = startImmediately ? "FIGHTING" : "READY";
    boxeGame.player = makeBoxingFighter("zorp", 150, 216);
    boxeGame.mestre = makeBoxingFighter("master", 300, 193);
    boxeGame.fightFrames = 0;
    boxeGame.koFrames = 0;
    boxeGame.hitStop = 0;
    boxeGame.cameraShake = 0;
    boxeGame.crowdPulse = 0;
    boxeGame.announcement = startImmediately ? "LUTE!" : "BOXE DE ARENA";
    boxeGame.announcementTimer = startImmediately ? 50 : 0;
    boxeGame.winner = null;
    boxeGame.loser = null;
    boxeGame.lastHit = null;
    boxeGame.effects.length = 0;
    boxeGame.playerSpam = 0;
    boxeGame.playerLastAttackFrame = -999;
    boxeGame.qaMode = false;
    boxeGame.qaFreezeAi = false;
    boxeGame.qaScenario = "";
    boxeGame.qaMove = "";
    boxeGame.qaAutoAttack = "";
    boxeGame.qaMasterAutoAttack = "";
    boxeGame.qaAutoPlayer = false;
    boxeGame.qaSpamPlayer = false;
    boxeGame.qaAutoCooldown = 0;
    boxeGame.qaEvents.length = 0;
    boxeGame.fpsFrames = 0;
    boxeGame.fpsLastTime = performance.now();
    boxingInputPress.jab = false;
    boxingInputPress.power = false;
    boxingInputPress.dodge = false;
    boxingTapMovement.x = 0;
    boxingTapMovement.y = 0;
    boxingTapMovement.frames = 0;
    if (typeof keys !== "undefined") {
        keys.w = false; keys.a = false; keys.s = false; keys.d = false;
        keys.j = false; keys.k = false; keys.l = false; keys.space = false;
    }
}

function startBoxingFight() {
    if (boxeGame.phase !== "READY") return;
    prepareBoxingAudio();
    boxeGame.phase = "FIGHTING";
    boxeGame.announcement = "LUTE!";
    boxeGame.announcementTimer = 50;
    logBoxingEvent("fight_start");
}

function clampBoxingActorToRing(actor) {
    actor.x = Math.max(BOXING_RING_BOUNDS.left, Math.min(BOXING_RING_BOUNDS.right, actor.x));
    actor.y = Math.max(BOXING_RING_BOUNDS.top, Math.min(BOXING_RING_BOUNDS.bottom, actor.y));
}

function updateBoxingFacing() {
    const p = boxeGame.player;
    const m = boxeGame.mestre;
    if (m.x > p.x + 1) {
        p.facing = 1;
        m.facing = -1;
    } else if (m.x < p.x - 1) {
        p.facing = -1;
        m.facing = 1;
    }
}

function getBoxingDistance(a, b) {
    return {
        dx: b.x - a.x,
        dy: b.y - a.y,
        horizontal: Math.abs(b.x - a.x),
        vertical: Math.abs(b.y - a.y),
        arena: Math.hypot(b.x - a.x, (b.y - a.y) * 1.75)
    };
}

function isBoxingNeutral(fighter) {
    return fighter.state === "idle" || fighter.state === "walk" || fighter.state === "step_back" || fighter.state === "block";
}

function setBoxingNeutral(fighter) {
    fighter.state = "idle";
    fighter.animation = "idle";
    fighter.stateFrame = 0;
    fighter.attack = null;
}

function moveBoxingFighter(fighter, moveX, moveY, speedScale = 1) {
    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 1) {
        moveX /= magnitude;
        moveY /= magnitude;
    }
    const isMaster = fighter.role === "master";
    const speedX = (isMaster ? BOXING_CONFIG.movement.masterX : BOXING_CONFIG.movement.playerX) * speedScale;
    const speedY = (isMaster ? BOXING_CONFIG.movement.masterY : BOXING_CONFIG.movement.playerY) * speedScale;
    fighter.x += moveX * speedX;
    fighter.y += moveY * speedY;
    fighter.lastMoveX = moveX;
    fighter.lastMoveY = moveY;
    if (Math.abs(moveX) + Math.abs(moveY) > 0.05 && isBoxingNeutral(fighter) && fighter.state !== "block") {
        const backingAway = moveX * fighter.facing < -0.15;
        fighter.state = backingAway ? "step_back" : "walk";
        fighter.animation = backingAway ? "step_back" : "walk";
        fighter.stateFrame++;
    } else if (fighter.state === "walk" || fighter.state === "step_back") {
        setBoxingNeutral(fighter);
    }
    clampBoxingActorToRing(fighter);
}

function resolveBoxingBodyCollision() {
    const p = boxeGame.player;
    const m = boxeGame.mestre;
    const dx = m.x - p.x;
    const dy = (m.y - p.y) * 1.8;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const minimum = BOXING_CONFIG.body.minSeparation;
    if (distance >= minimum) return;
    const overlap = minimum - distance;
    const nx = dx / distance;
    const ny = dy / distance / 1.8;
    const playerPinned = (p.x <= BOXING_RING_BOUNDS.left + 0.5 && nx > 0)
        || (p.x >= BOXING_RING_BOUNDS.right - 0.5 && nx < 0)
        || (p.y <= BOXING_RING_BOUNDS.top + 0.5 && ny > 0)
        || (p.y >= BOXING_RING_BOUNDS.bottom - 0.5 && ny < 0);
    const masterPinned = (m.x <= BOXING_RING_BOUNDS.left + 0.5 && nx < 0)
        || (m.x >= BOXING_RING_BOUNDS.right - 0.5 && nx > 0)
        || (m.y <= BOXING_RING_BOUNDS.top + 0.5 && ny < 0)
        || (m.y >= BOXING_RING_BOUNDS.bottom - 0.5 && ny > 0);
    const playerShare = masterPinned ? 1 : playerPinned ? 0 : 0.5;
    const masterShare = playerPinned ? 1 : masterPinned ? 0 : 0.5;
    const playerSoftness = p.state === "dodge" ? 0.62 : 1;
    const masterSoftness = m.state === "dodge" ? 0.62 : 1;
    p.x -= nx * overlap * playerShare * playerSoftness;
    p.y -= ny * overlap * playerShare * playerSoftness;
    m.x += nx * overlap * masterShare * masterSoftness;
    m.y += ny * overlap * masterShare * masterSoftness;
    clampBoxingActorToRing(p);
    clampBoxingActorToRing(m);
}

function startBoxingAttack(fighter, type) {
    const config = BOXING_CONFIG.attacks[type];
    if (!config || !isBoxingNeutral(fighter) || fighter.guardStun > 0 || fighter.comboImmunity > 0) return false;
    fighter.state = "attack";
    fighter.animation = type;
    fighter.stateFrame = 0;
    fighter.attack = {
        id: ++boxingAttackId,
        type,
        elapsed: 0,
        didConnect: false,
        didHit: false,
        checkedActiveFrames: 0,
        phase: "startup"
    };
    if (fighter.role === "master") {
        const pauseRange = BOXING_CONFIG.ai.maxAttackPause - BOXING_CONFIG.ai.minAttackPause;
        fighter.aiAttackCooldown = BOXING_CONFIG.ai.minAttackPause + Math.floor(Math.random() * (pauseRange + 1));
    }
    if (fighter.role === "zorp") {
        const sinceLast = boxeGame.fightFrames - boxeGame.playerLastAttackFrame;
        boxeGame.playerSpam = Math.min(8, boxeGame.playerSpam + (sinceLast <= BOXING_CONFIG.combo.spamWindow ? 1.35 : 0.6));
        boxeGame.playerLastAttackFrame = boxeGame.fightFrames;
    }
    logBoxingEvent("attack_start", { actor: fighter.role, attack: type });
    return true;
}

function startBoxingBlock(fighter, duration = 0) {
    if (!isBoxingNeutral(fighter) || fighter.guardStun > 0) return false;
    fighter.state = "block";
    fighter.animation = "block";
    fighter.stateFrame = 0;
    if (fighter.role === "master") fighter.aiBlockTimer = duration || 15;
    return true;
}

function startBoxingDodge(fighter, moveX, moveY) {
    if (!isBoxingNeutral(fighter) || fighter.dodgeCooldown > 0 || fighter.guardStun > 0) return false;
    let magnitude = Math.hypot(moveX, moveY);
    if (magnitude < 0.1) {
        moveX = -fighter.facing;
        moveY = 0;
        magnitude = 1;
    }
    moveX /= magnitude;
    moveY /= magnitude;
    fighter.state = "dodge";
    fighter.animation = "dodge";
    fighter.stateFrame = 0;
    fighter.dodgeTimer = BOXING_CONFIG.dodge.duration;
    fighter.dodgeFrame = 0;
    fighter.dodgeCooldown = BOXING_CONFIG.dodge.cooldown;
    fighter.dodgeVx = moveX * BOXING_CONFIG.dodge.distanceX / BOXING_CONFIG.dodge.duration;
    fighter.dodgeVy = moveY * BOXING_CONFIG.dodge.distanceY / BOXING_CONFIG.dodge.duration;
    logBoxingEvent("dodge_start", { actor: fighter.role });
    return true;
}

function isBoxingDodgeInvulnerable(fighter) {
    return fighter.state === "dodge" && fighter.dodgeFrame >= BOXING_CONFIG.dodge.invulnerableStart && fighter.dodgeFrame <= BOXING_CONFIG.dodge.invulnerableEnd;
}

function isBoxingFrontBlock(target, attacker) {
    if (target.state !== "block") return false;
    return (attacker.x - target.x) * target.facing > -4;
}

function isBoxingAttackInRange(attacker, target, attackConfig) {
    const forward = (target.x - attacker.x) * attacker.facing;
    const yDifference = Math.abs(target.y - attacker.y);
    return forward >= 5 && forward <= attackConfig.range && yDifference <= attackConfig.yTolerance;
}

function spawnBoxingImpact(x, y, type, facing = 1) {
    boxeGame.effects.push({ x, y, type, facing, life: type === "ko" ? 28 : 15, maxLife: type === "ko" ? 28 : 15 });
    if (boxeGame.effects.length > 24) boxeGame.effects.shift();
}

function triggerBoxingKO(attacker, target, attackType) {
    target.hp = 0;
    target.state = "knockdown";
    target.animation = "knockdown";
    target.stateFrame = 0;
    target.attack = null;
    attacker.state = "idle";
    attacker.animation = "idle";
    attacker.attack = null;
    boxeGame.phase = "KO";
    boxeGame.koFrames = 0;
    boxeGame.winner = attacker;
    boxeGame.loser = target;
    if (attacker === boxeGame.player || (attacker && attacker.role === "player")) {
        if (typeof window !== "undefined" && typeof window.desbloquearMedalha === "function") {
            window.desbloquearMedalha("boxe");
        } else if (typeof insignias !== "undefined") {
            insignias.esqui = true;
            insignias.boxe = true;
        }
    }
    boxeGame.announcement = "K.O.!";
    boxeGame.announcementTimer = BOXING_CONFIG.ko.resultDelay;
    boxeGame.cameraShake = 15;
    boxeGame.crowdPulse = 1;
    spawnBoxingImpact(target.x, target.y - 48, "ko", attacker.facing);
    playBoxingTone("ko");
    logBoxingEvent("knockout", { winner: attacker.role, loser: target.role, attack: attackType, durationFrames: boxeGame.fightFrames });
}

function applyBoxingHit(attacker, target, attackConfig, attackType) {
    if (target.comboImmunity > 0) {
        logBoxingEvent("recovery_immunity", { actor: target.role, attack: attackType });
        return false;
    }
    if (isBoxingDodgeInvulnerable(target)) {
        target.counterWindow = 32;
        spawnBoxingImpact(target.x, target.y - 42, "evade", -attacker.facing);
        logBoxingEvent("evade", { actor: target.role, attack: attackType });
        return false;
    }

    const blocked = isBoxingFrontBlock(target, attacker);
    const counterMultiplier = attacker.counterWindow > 0 ? 1.20 : 1;
    const rawDamage = attackConfig.damage * counterMultiplier;
    const damage = Math.max(1, Math.round(rawDamage * (blocked ? BOXING_CONFIG.block.damageMultiplier : 1)));
    const knockback = attackConfig.knockback * (blocked ? BOXING_CONFIG.block.knockbackMultiplier : 1);
    attacker.counterWindow = 0;
    target.hp = Math.max(0, target.hp - damage);
    target.flashTimer = blocked ? 3 : 6;
    target.knockbackX = attacker.facing * knockback;
    target.knockbackY = Math.sign(target.y - attacker.y || 1) * Math.min(2.3, knockback * 0.15);

    if (blocked) {
        target.guardStun = attackConfig.guardStun;
        target.state = "block";
        target.animation = "block";
        target.stateFrame = 0;
        spawnBoxingImpact(target.x - attacker.facing * 13, target.y - 47, "block", attacker.facing);
        playBoxingTone("light");
        logBoxingEvent("blocked_hit", { attacker: attacker.role, target: target.role, attack: attackType, damage });
    } else {
        target.comboHits = target.comboTimer > 0 ? target.comboHits + 1 : 1;
        target.comboTimer = BOXING_CONFIG.combo.window;
        let hitstun = attackConfig.hitstun;
        if (target.comboHits >= BOXING_CONFIG.combo.maxCleanHits) {
            hitstun += 5;
            target.comboImmunity = BOXING_CONFIG.combo.recoveryImmunity;
            target.comboHits = 0;
            target.knockbackX *= 1.35;
            attacker.x -= attacker.facing * 4;
            spawnBoxingImpact(target.x, target.y - 56, "stagger", attacker.facing);
            logBoxingEvent("stagger", { actor: target.role });
        }
        target.hurtTimer = hitstun;
        target.state = "hurt";
        target.animation = "hurt";
        target.stateFrame = 0;
        target.attack = null;
        spawnBoxingImpact(target.x - attacker.facing * 10, target.y - 48, attackType, attacker.facing);
        boxeGame.hitStop = Math.max(boxeGame.hitStop, attackConfig.hitstop);
        boxeGame.cameraShake = Math.max(boxeGame.cameraShake, attackType === "jab" ? 2 : attackType === "cross" ? 4 : 6);
        boxeGame.crowdPulse = Math.max(boxeGame.crowdPulse, attackType === "uppercut" ? 0.65 : 0.35);
        playBoxingTone(attackType === "jab" ? "light" : "strong");
        logBoxingEvent("hit", { attacker: attacker.role, target: target.role, attack: attackType, damage, targetHp: target.hp });
    }

    boxeGame.lastHit = { attacker: attacker.role, target: target.role, attack: attackType, damage, blocked, frame: boxeGame.fightFrames };
    clampBoxingActorToRing(attacker);
    if (target.hp <= 0) triggerBoxingKO(attacker, target, attackType);
    return true;
}

function updateBoxingAttack(attacker, target) {
    const attack = attacker.attack;
    if (!attack) {
        setBoxingNeutral(attacker);
        return;
    }
    const config = BOXING_CONFIG.attacks[attack.type];
    attack.elapsed++;
    attacker.stateFrame++;
    if (attack.elapsed <= config.startup) {
        attack.phase = "startup";
    } else if (attack.elapsed <= config.startup + config.active) {
        attack.phase = "active";
        if (!attack.didConnect) {
            attack.didConnect = true;
            if (isBoxingAttackInRange(attacker, target, config)) {
                attack.didHit = applyBoxingHit(attacker, target, config, attack.type);
            } else {
                logBoxingEvent("whiff", {
                    actor: attacker.role,
                    attack: attack.type,
                    horizontal: Math.round(Math.abs(target.x - attacker.x)),
                    vertical: Math.round(Math.abs(target.y - attacker.y))
                });
            }
        }
    } else {
        attack.phase = "recovery";
    }
    const total = config.startup + config.active + config.recovery;
    if (attack.elapsed >= total) {
        const didHit = attack.didHit;
        const attackType = attack.type;
        setBoxingNeutral(attacker);
        if (!didHit && attacker.role === "zorp") {
            boxeGame.mestre.aiState = "PUNISH";
            boxeGame.mestre.aiTimer = attackType === "uppercut" ? 32 : 20;
        }
    }
}

function updateBoxingDodge(fighter) {
    fighter.dodgeFrame++;
    fighter.dodgeTimer--;
    fighter.stateFrame++;
    const easing = 0.55 + 0.45 * Math.sin((fighter.dodgeFrame / BOXING_CONFIG.dodge.duration) * Math.PI);
    fighter.x += fighter.dodgeVx * easing;
    fighter.y += fighter.dodgeVy * easing;
    clampBoxingActorToRing(fighter);
    if (fighter.dodgeTimer <= 0) setBoxingNeutral(fighter);
}

function updateBoxingHurt(fighter) {
    fighter.hurtTimer--;
    fighter.stateFrame++;
    fighter.x += fighter.knockbackX * 0.28;
    fighter.y += fighter.knockbackY * 0.22;
    fighter.knockbackX *= 0.72;
    fighter.knockbackY *= 0.72;
    clampBoxingActorToRing(fighter);
    if (fighter.hurtTimer <= 0) setBoxingNeutral(fighter);
}

function tickBoxingFighterTimers(fighter) {
    if (fighter.dodgeCooldown > 0) fighter.dodgeCooldown--;
    if (fighter.guardStun > 0) fighter.guardStun--;
    if (fighter.comboTimer > 0) fighter.comboTimer--;
    else fighter.comboHits = 0;
    if (fighter.comboImmunity > 0) fighter.comboImmunity--;
    if (fighter.counterWindow > 0) fighter.counterWindow--;
    if (fighter.flashTimer > 0) fighter.flashTimer--;
    if (fighter.aiAttackCooldown > 0) fighter.aiAttackCooldown--;
}

function updateBoxingPlayer(pressed) {
    const p = boxeGame.player;
    const m = boxeGame.mestre;
    tickBoxingFighterTimers(p);
    if (p.state === "attack") return updateBoxingAttack(p, m);
    if (p.state === "hurt") return updateBoxingHurt(p);
    if (p.state === "dodge") return updateBoxingDodge(p);
    if (p.state === "knockdown" || p.state === "victory") {
        p.stateFrame++;
        return;
    }

    let moveX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let moveY = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    if (moveX === 0 && moveY === 0 && boxingTapMovement.frames > 0) {
        moveX = boxingTapMovement.x;
        moveY = boxingTapMovement.y;
    }
    if (boxingTapMovement.frames > 0) boxingTapMovement.frames--;
    if (pressed.dodge) {
        startBoxingDodge(p, moveX, moveY);
        return;
    }
    if (keys.l) {
        if (p.state !== "block") startBoxingBlock(p);
        p.state = "block";
        p.animation = "block";
        p.stateFrame++;
        moveBoxingFighter(p, moveX, moveY, BOXING_CONFIG.block.movementMultiplier);
        return;
    }
    if (p.state === "block") setBoxingNeutral(p);
    if (pressed.jab && startBoxingAttack(p, "jab")) return;
    if (pressed.power) {
        const attackType = keys.w ? "uppercut" : keys.s ? "hook" : "cross";
        if (startBoxingAttack(p, attackType)) return;
    }
    moveBoxingFighter(p, moveX, moveY);
}

function chooseMasterAttack(distance) {
    const roll = Math.random();
    if (distance.horizontal < 47 && distance.vertical <= 16) {
        return roll < 0.34 ? "uppercut" : roll < 0.72 ? "hook" : "jab";
    }
    if (distance.horizontal < 64) return roll < 0.45 ? "jab" : roll < 0.78 ? "cross" : "hook";
    return roll < 0.58 ? "cross" : "jab";
}

function setMasterAiState(state, duration) {
    const m = boxeGame.mestre;
    m.aiState = state;
    m.aiTimer = duration;
    logBoxingEvent("ai_state", { state });
}

function updateMasterReaction() {
    const p = boxeGame.player;
    const m = boxeGame.mestre;
    if (p.state === "attack" && p.attack && p.attack.id !== m.aiObservedAttackId) {
        const distance = getBoxingDistance(m, p);
        if (distance.horizontal <= 95 && distance.vertical <= 25) {
            m.aiObservedAttackId = p.attack.id;
            const strongAttack = p.attack.type === "hook" || p.attack.type === "uppercut";
            m.aiReactionTimer = strongAttack ? 6 + Math.floor(Math.random() * 5) : 9 + Math.floor(Math.random() * 7);
            const spamBonus = boxeGame.playerSpam >= BOXING_CONFIG.combo.spamThreshold ? 0.18 : 0;
            const roll = Math.random();
            m.aiReactionChoice = roll < 0.48 + spamBonus ? "BLOCK" : roll < 0.70 + spamBonus ? "DODGE" : "NONE";
        }
    }
    if (m.aiReactionTimer > 0) {
        m.aiReactionTimer--;
        if (m.aiReactionTimer === 0 && p.state === "attack" && isBoxingNeutral(m)) {
            if (m.aiReactionChoice === "BLOCK") {
                startBoxingBlock(m, 14 + Math.floor(Math.random() * 8));
                setMasterAiState("BLOCK", m.aiBlockTimer);
                return true;
            }
            if (m.aiReactionChoice === "DODGE") {
                const verticalEscape = Math.random() < 0.55 ? m.aiCircleDirection : -m.aiCircleDirection;
                startBoxingDodge(m, -m.facing * 0.35, verticalEscape);
                setMasterAiState("DODGE", BOXING_CONFIG.dodge.duration);
                return true;
            }
        }
    }
    return false;
}

function decideMasterAiState() {
    const p = boxeGame.player;
    const m = boxeGame.mestre;
    const distance = getBoxingDistance(m, p);
    const lowHp = m.hp / m.maxHp < 0.30;
    const playerWhiffing = p.state === "attack" && p.attack && p.attack.phase === "recovery" && !p.attack.didHit;

    if (playerWhiffing && distance.horizontal < 105 && distance.vertical < 27) {
        setMasterAiState("PUNISH", 28);
    } else if (boxeGame.playerSpam >= BOXING_CONFIG.combo.spamThreshold && distance.horizontal < 85) {
        setMasterAiState(Math.random() < 0.58 ? "BLOCK" : "RETREAT", 22 + Math.floor(Math.random() * 14));
    } else if (lowHp && distance.horizontal < 68 && Math.random() < 0.58) {
        setMasterAiState("RETREAT", 26 + Math.floor(Math.random() * 18));
    } else if (distance.horizontal > 92 || distance.vertical > 25) {
        setMasterAiState("APPROACH", 28 + Math.floor(Math.random() * 22));
    } else if (distance.horizontal < 42) {
        setMasterAiState(Math.random() < 0.42 ? "RETREAT" : "PRESSURE", 18 + Math.floor(Math.random() * 16));
    } else if (Math.random() < 0.34) {
        m.aiCircleDirection *= Math.random() < 0.35 ? -1 : 1;
        setMasterAiState("CIRCLE", 30 + Math.floor(Math.random() * 30));
    } else {
        setMasterAiState("PRESSURE", 22 + Math.floor(Math.random() * 22));
    }
    m.aiDecisionTimer = 18 + Math.floor(Math.random() * 20);
}

function updateBoxingMaster() {
    const m = boxeGame.mestre;
    const p = boxeGame.player;
    tickBoxingFighterTimers(m);
    if (m.state === "attack") return updateBoxingAttack(m, p);
    if (m.state === "hurt") return updateBoxingHurt(m);
    if (m.state === "dodge") return updateBoxingDodge(m);
    if (m.state === "knockdown" || m.state === "victory") {
        m.stateFrame++;
        return;
    }
    if (boxeGame.qaFreezeAi) {
        if (m.state === "block") {
            m.stateFrame++;
            if (m.aiBlockTimer > 0) m.aiBlockTimer--;
        } else {
            setBoxingNeutral(m);
        }
        return;
    }

    if (updateMasterReaction()) return;
    if (m.state === "block") {
        m.stateFrame++;
        m.aiBlockTimer--;
        if (m.aiBlockTimer <= 0) setBoxingNeutral(m);
        return;
    }
    if (m.aiComboDelay > 0) {
        m.aiComboDelay--;
        if (m.aiComboDelay === 0 && m.aiQueuedAttack) {
            const queued = m.aiQueuedAttack;
            m.aiQueuedAttack = "";
            if (isBoxingAttackInRange(m, p, BOXING_CONFIG.attacks[queued])) startBoxingAttack(m, queued);
        }
    }

    m.aiTimer--;
    m.aiDecisionTimer--;
    if (m.aiDecisionTimer <= 0 || m.aiTimer <= 0) decideMasterAiState();
    const distance = getBoxingDistance(m, p);
    let moveX = 0;
    let moveY = 0;

    if (m.aiState === "APPROACH") {
        if (distance.horizontal > 54) moveX = Math.sign(p.x - m.x);
        moveY = Math.abs(p.y - m.y) > 5 ? Math.sign(p.y - m.y) : 0;
        if (m.aiAttackCooldown <= 0 && distance.horizontal <= 76 && distance.vertical <= 20 && Math.random() < 0.045) {
            startBoxingAttack(m, chooseMasterAttack(distance));
            return;
        }
    } else if (m.aiState === "CIRCLE") {
        moveY = m.aiCircleDirection;
        if ((m.y <= BOXING_RING_BOUNDS.top + 5 && moveY < 0) || (m.y >= BOXING_RING_BOUNDS.bottom - 5 && moveY > 0)) {
            m.aiCircleDirection *= -1;
            moveY = m.aiCircleDirection;
        }
        moveX = distance.horizontal > 76 ? Math.sign(p.x - m.x) * 0.45 : distance.horizontal < 50 ? -Math.sign(p.x - m.x) * 0.35 : 0;
    } else if (m.aiState === "RETREAT") {
        moveX = -Math.sign(p.x - m.x);
        moveY = m.aiCircleDirection * 0.55;
        if ((m.x <= BOXING_RING_BOUNDS.left + 12 && moveX < 0) || (m.x >= BOXING_RING_BOUNDS.right - 12 && moveX > 0)) {
            moveX = 0;
            moveY = m.y < (BOXING_RING_BOUNDS.top + BOXING_RING_BOUNDS.bottom) / 2 ? 1 : -1;
        }
    } else if (m.aiState === "BLOCK") {
        startBoxingBlock(m, Math.max(12, m.aiTimer));
        return;
    } else if (m.aiState === "PUNISH") {
        moveY = Math.abs(p.y - m.y) > 5 ? Math.sign(p.y - m.y) : 0;
        if (distance.horizontal > 70) moveX = Math.sign(p.x - m.x);
        else if (distance.vertical <= 20 && m.aiAttackCooldown <= 12) {
            const punish = distance.horizontal < 50 ? (Math.random() < 0.5 ? "hook" : "uppercut") : "cross";
            startBoxingAttack(m, punish);
            m.aiQueuedAttack = Math.random() < 0.35 ? "jab" : "";
            m.aiComboDelay = m.aiQueuedAttack ? 8 : 0;
            return;
        }
    } else {
        // PRESSURE / ATTACK: encurta a distância e usa sequências de no máximo dois golpes.
        moveY = Math.abs(p.y - m.y) > 4 ? Math.sign(p.y - m.y) : 0;
        if (distance.horizontal > 63) moveX = Math.sign(p.x - m.x);
        else if (distance.horizontal < 39) moveX = -Math.sign(p.x - m.x) * 0.28;
        if (m.aiAttackCooldown <= 0 && distance.horizontal <= 78 && distance.vertical <= 21 && Math.random() < 0.075) {
            const attack = chooseMasterAttack(distance);
            if (startBoxingAttack(m, attack)) {
                if (Math.random() < 0.38 && attack !== "uppercut") {
                    m.aiQueuedAttack = attack === "jab" ? "cross" : "jab";
                    m.aiComboDelay = 9;
                }
            }
            return;
        }
    }
    moveBoxingFighter(m, moveX, moveY, m.aiState === "PRESSURE" ? 1.08 : 1);
}

function updateBoxingEffects() {
    for (let index = boxeGame.effects.length - 1; index >= 0; index--) {
        boxeGame.effects[index].life--;
        if (boxeGame.effects[index].life <= 0) boxeGame.effects.splice(index, 1);
    }
    if (boxeGame.cameraShake > 0) boxeGame.cameraShake--;
    if (boxeGame.crowdPulse > 0) boxeGame.crowdPulse = Math.max(0, boxeGame.crowdPulse - 0.025);
    if (boxeGame.announcementTimer > 0) boxeGame.announcementTimer--;
}

function updateBoxingFps() {
    boxeGame.fpsFrames++;
    const now = performance.now();
    if (now - boxeGame.fpsLastTime >= 500) {
        boxeGame.qaFps = Math.round(boxeGame.fpsFrames * 1000 / (now - boxeGame.fpsLastTime));
        boxeGame.fpsFrames = 0;
        boxeGame.fpsLastTime = now;
    }
}

function applyBoxingQaAutomation(pressed) {
    if (!boxeGame.qaMode) return;
    if (boxeGame.qaMove) {
        keys.w = boxeGame.qaMove === "w";
        keys.a = boxeGame.qaMove === "a";
        keys.s = boxeGame.qaMove === "s";
        keys.d = boxeGame.qaMove === "d";
    }
    if (boxeGame.qaAutoAttack && isBoxingNeutral(boxeGame.player)) {
        const requestedAttack = boxeGame.qaAutoAttack;
        boxeGame.qaAutoAttack = "";
        startBoxingAttack(boxeGame.player, requestedAttack);
    }
    if (boxeGame.qaMasterAutoAttack && isBoxingNeutral(boxeGame.mestre)) {
        const requestedAttack = boxeGame.qaMasterAutoAttack;
        boxeGame.qaMasterAutoAttack = "";
        startBoxingAttack(boxeGame.mestre, requestedAttack);
    }
    if (!boxeGame.qaAutoPlayer && !boxeGame.qaSpamPlayer) return;

    keys.w = false; keys.a = false; keys.s = false; keys.d = false; keys.l = false;
    const p = boxeGame.player;
    const m = boxeGame.mestre;
    const distance = getBoxingDistance(p, m);
    if (!boxeGame.qaSpamPlayer && m.state === "attack" && m.attack && m.attack.phase !== "recovery" && distance.horizontal < 86 && distance.vertical < 25) {
        const responseRoll = (boxeGame.fightFrames + m.attack.id * 7) % 10;
        if (responseRoll < 3 && p.dodgeCooldown === 0) pressed.dodge = true;
        else if (responseRoll < 7) keys.l = true;
    } else if (distance.vertical > 7) {
        if (m.y < p.y) keys.w = true;
        else keys.s = true;
    } else if (distance.horizontal > 66) {
        if (m.x > p.x) keys.d = true;
        else keys.a = true;
    } else if (distance.horizontal < 38) {
        if (m.x > p.x) keys.a = true;
        else keys.d = true;
    }
    if (boxeGame.qaAutoCooldown > 0) boxeGame.qaAutoCooldown--;
    if (boxeGame.qaAutoCooldown <= 0 && isBoxingNeutral(p) && distance.horizontal <= 78 && distance.vertical <= 20 && !keys.l) {
        if (boxeGame.qaSpamPlayer) {
            pressed.jab = true;
            boxeGame.qaAutoCooldown = 2;
            return;
        }
        const cycle = Math.floor(boxeGame.fightFrames / 31) % 6;
        if (cycle <= 2) pressed.jab = true;
        else {
            pressed.power = true;
            if (cycle === 4) keys.s = true;
            if (cycle === 5) keys.w = true;
        }
        // Ritmo de jogador normal: observa, reposiciona e então golpeia.
        boxeGame.qaAutoCooldown = 42 + (cycle % 3) * 8;
    }
}

function updateBoxeGame() {
    updateBoxingFps();
    updateBoxingEffects();
    const pressed = clearBoxingInputPresses();

    if (boxeGame.phase === "READY") {
        hintText.innerText = "[ESPAÇO] LUTAR | WASD MOVER | J JAB | K DIRETO | S+K HOOK | W+K UPPERCUT | L BLOCK";
        if (pressed.dodge || pressed.jab || pressed.power) startBoxingFight();
        return;
    }
    if (boxeGame.phase === "RESULT") {
        hintText.innerText = "[ESPAÇO] RETORNAR AO CLUBE DE BOXE";
        if (pressed.dodge) {
            currentScene = "ILHA_ESQUI";
            keys.space = false;
            dialogBox.classList.add("show");
        }
        return;
    }
    if (boxeGame.phase === "KO") {
        hintText.innerText = "KNOCKOUT!";
        boxeGame.koFrames++;
        if (boxeGame.koFrames === BOXING_CONFIG.ko.victoryDelay && boxeGame.winner) {
            boxeGame.winner.state = "victory";
            boxeGame.winner.animation = "victory";
            boxeGame.winner.stateFrame = 0;
        }
        if (boxeGame.winner) boxeGame.winner.stateFrame++;
        if (boxeGame.loser) boxeGame.loser.stateFrame++;
        if (boxeGame.koFrames >= BOXING_CONFIG.ko.resultDelay) boxeGame.phase = "RESULT";
        return;
    }

    hintText.innerText = "WASD MOVER | J JAB | K DIRETO | S+K HOOK | W+K UPPERCUT | L BLOCK | ESPAÇO DODGE";
    boxeGame.fightFrames++;
    if (boxeGame.playerSpam > 0 && boxeGame.fightFrames % 28 === 0) boxeGame.playerSpam = Math.max(0, boxeGame.playerSpam - 0.45);
    if (boxeGame.hitStop > 0) {
        boxeGame.hitStop--;
        return;
    }
    applyBoxingQaAutomation(pressed);
    updateBoxingFacing();
    updateBoxingPlayer(pressed);
    if (boxeGame.phase === "FIGHTING") updateBoxingMaster();
    if (boxeGame.phase === "FIGHTING") {
        resolveBoxingBodyCollision();
        updateBoxingFacing();
    }
}

function getBoxingAnimationFrame(role, fighter) {
    const animation = fighter.animation || "idle";
    const frames = BOXING_SPRITES[role][animation] || BOXING_SPRITES[role].idle;
    const durationMs = BOXING_FRAME_DURATIONS[animation] || 120;
    const framesPerSprite = Math.max(1, Math.round(durationMs / (1000 / 60)));
    const shouldLoop = animation === "idle" || animation === "walk" || animation === "step_back" || animation === "block" || animation === "victory";
    const rawIndex = Math.floor(fighter.stateFrame / framesPerSprite);
    const frameIndex = shouldLoop ? rawIndex % frames.length : Math.min(frames.length - 1, rawIndex);
    return { image: frames[frameIndex], frameIndex, frameCount: frames.length, animation };
}

function drawBoxingArenaCover() {
    if (!(imgBoxeArenaBg.complete && imgBoxeArenaBg.naturalWidth > 0)) {
        ctx.fillStyle = "#161633";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }
    const sourceRatio = imgBoxeArenaBg.naturalWidth / imgBoxeArenaBg.naturalHeight;
    const canvasRatio = canvas.width / canvas.height;
    let sx = 0;
    let sy = 0;
    let sw = imgBoxeArenaBg.naturalWidth;
    let sh = imgBoxeArenaBg.naturalHeight;
    if (sourceRatio > canvasRatio) {
        sw = sh * canvasRatio;
        sx = (imgBoxeArenaBg.naturalWidth - sw) / 2;
    } else if (sourceRatio < canvasRatio) {
        sh = sw / canvasRatio;
        sy = (imgBoxeArenaBg.naturalHeight - sh) / 2;
    }
    ctx.drawImage(imgBoxeArenaBg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    if (boxeGame.crowdPulse > 0) {
        ctx.save();
        ctx.globalAlpha = boxeGame.crowdPulse * 0.20;
        ctx.fillStyle = "#fff1a8";
        ctx.fillRect(0, 42, canvas.width, 124);
        ctx.restore();
    }
}

function drawBoxingActor(fighter, role) {
    const selected = getBoxingAnimationFrame(role, fighter);
    const image = selected.image;
    const scale = role === "master" ? 0.74 : 0.72;
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = "#080b20";
    ctx.beginPath();
    ctx.ellipse(fighter.x, fighter.y + 1, fighter.animation === "knockdown" ? 39 : 25, fighter.animation === "knockdown" ? 9 : 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (image && image.complete && image.naturalWidth > 0) {
        ctx.save();
        ctx.translate(Math.round(fighter.x), Math.round(fighter.y));
        ctx.scale(fighter.facing, 1);
        ctx.imageSmoothingEnabled = false;
        if (fighter.flashTimer > 0 && fighter.flashTimer % 2 === 0) ctx.globalAlpha = 0.55;
        ctx.drawImage(image, -BOXING_FRAME_CANVAS.anchorX * scale, -BOXING_FRAME_CANVAS.anchorY * scale, BOXING_FRAME_CANVAS.width * scale, BOXING_FRAME_CANVAS.height * scale);
        ctx.restore();
    }
    return selected;
}

function drawBoxingEffects() {
    for (const effect of boxeGame.effects) {
        const progress = 1 - effect.life / effect.maxLife;
        const alpha = Math.max(0, effect.life / effect.maxLife);
        const strong = effect.type === "hook" || effect.type === "uppercut" || effect.type === "ko" || effect.type === "stagger";
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.scale(effect.facing, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = effect.type === "block" ? "#7de4ff" : effect.type === "evade" ? "#b6f4ff" : strong ? "#ffe26d" : "#ffffff";
        const radius = effect.type === "ko" ? 22 : strong ? 13 : 8;
        for (let ray = 0; ray < 7; ray++) {
            ctx.rotate(Math.PI * 2 / 7);
            ctx.fillRect(radius * (0.25 + progress * 0.4), -1.5, radius * (0.8 + progress), 3);
        }
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(2, radius * (0.38 - progress * 0.18)), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawBoxingHudPanel(x, y, width, fighter, color, alignRight = false) {
    ctx.save();
    ctx.fillStyle = "rgba(9, 12, 31, 0.90)";
    ctx.fillRect(x, y, width, 33);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 32);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(`${fighter.name}  ${Math.ceil(fighter.hp)}`, alignRight ? x + width - 7 : x + 7, y + 12);
    const barX = x + 7;
    const barY = y + 19;
    const barWidth = width - 14;
    const ratio = Math.max(0, Math.min(1, fighter.hp / fighter.maxHp));
    ctx.fillStyle = "#20243e";
    ctx.fillRect(barX, barY, barWidth, 8);
    ctx.fillStyle = ratio < 0.25 ? "#ffb13b" : color;
    ctx.fillRect(alignRight ? barX + barWidth * (1 - ratio) : barX, barY, barWidth * ratio, 8);
    ctx.restore();
}

function drawBoxingCenterHud() {
    const seconds = boxeGame.fightFrames / 60;
    ctx.save();
    ctx.fillStyle = "rgba(9, 12, 31, 0.90)";
    ctx.fillRect(canvas.width / 2 - 35, 7, 70, 33);
    ctx.strokeStyle = "#eac44f";
    ctx.strokeRect(canvas.width / 2 - 34.5, 7.5, 69, 32);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f9d65c";
    ctx.font = "bold 8px monospace";
    ctx.fillText("TEMPO", canvas.width / 2, 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`, canvas.width / 2, 33);
    ctx.restore();
}

function drawBoxingOverlay() {
    if (boxeGame.phase === "READY") {
        ctx.save();
        ctx.fillStyle = "rgba(9, 12, 31, 0.88)";
        ctx.fillRect(58, 51, canvas.width - 116, 68);
        ctx.strokeStyle = "#f9d65c";
        ctx.lineWidth = 2;
        ctx.strokeRect(58, 51, canvas.width - 116, 68);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px monospace";
        ctx.fillText("BOXE ARCADE DE ARENA", canvas.width / 2, 73);
        ctx.fillStyle = "#bdeeff";
        ctx.font = "8px monospace";
        ctx.fillText("WASD MOVE  •  J JAB  •  K DIRETO", canvas.width / 2, 92);
        ctx.fillText("S+K HOOK  •  W+K UPPERCUT  •  L BLOCK", canvas.width / 2, 104);
        ctx.fillStyle = (Date.now() % 700 < 350) ? "#f9d65c" : "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.fillText("[ESPAÇO] COMEÇAR", canvas.width / 2, 115);
        ctx.restore();
    }
    if (boxeGame.phase === "KO") {
        const scale = 1 + Math.sin(Math.min(1, boxeGame.koFrames / 14) * Math.PI) * 0.28;
        ctx.save();
        ctx.translate(canvas.width / 2, 86);
        ctx.scale(scale, scale);
        ctx.textAlign = "center";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#20122f";
        ctx.font = "bold 34px monospace";
        ctx.strokeText("K.O.!", 0, 0);
        ctx.fillStyle = "#ffe067";
        ctx.fillText("K.O.!", 0, 0);
        ctx.restore();
    }
    if (boxeGame.phase === "RESULT") {
        const playerWon = boxeGame.winner === boxeGame.player;
        ctx.save();
        ctx.fillStyle = "rgba(8, 11, 28, 0.92)";
        ctx.fillRect(48, 210, canvas.width - 96, 72);
        ctx.strokeStyle = playerWon ? "#f9d65c" : "#ef625f";
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 210, canvas.width - 96, 72);
        ctx.textAlign = "center";
        ctx.fillStyle = playerWon ? "#f9d65c" : "#ff8580";
        ctx.font = "bold 15px monospace";
        ctx.fillText(playerWon ? "ZORP VENCEU POR K.O.!" : "MESTRE VENCEU POR K.O.", canvas.width / 2, 234);
        ctx.fillStyle = "#ffffff";
        ctx.font = "9px monospace";
        ctx.fillText(`DURAÇÃO ${Math.floor(boxeGame.fightFrames / 60)}s`, canvas.width / 2, 252);
        ctx.fillStyle = (Date.now() % 700 < 350) ? "#7df9ff" : "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText("[ESPAÇO] RETORNAR AO CLUBE", canvas.width / 2, 270);
        ctx.restore();
    }
}

function drawBoxingDebug(drawOrder) {
    if (!new URLSearchParams(window.location.search).has("boxeDebug")) return;
    ctx.save();
    ctx.strokeStyle = "#5dff8b";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(BOXING_RING_BOUNDS.left, BOXING_RING_BOUNDS.top, BOXING_RING_BOUNDS.right - BOXING_RING_BOUNDS.left, BOXING_RING_BOUNDS.bottom - BOXING_RING_BOUNDS.top);
    ctx.setLineDash([]);
    for (const fighter of [boxeGame.player, boxeGame.mestre]) {
        ctx.strokeStyle = fighter.role === "zorp" ? "#55d8ff" : "#ff776e";
        ctx.beginPath();
        ctx.ellipse(fighter.x, fighter.y, BOXING_CONFIG.body.radiusX, BOXING_CONFIG.body.radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (fighter.attack) {
            const attack = BOXING_CONFIG.attacks[fighter.attack.type];
            ctx.strokeStyle = "#ffe26d";
            ctx.strokeRect(fighter.facing > 0 ? fighter.x : fighter.x - attack.range, fighter.y - attack.yTolerance, attack.range, attack.yTolerance * 2);
        }
    }
    ctx.fillStyle = "rgba(6, 18, 34, 0.86)";
    ctx.fillRect(5, canvas.height - 24, 382, 18);
    ctx.fillStyle = "#8dffad";
    ctx.font = "7px monospace";
    ctx.fillText(`${boxeGame.phase} | IA ${boxeGame.mestre.aiState} | SORT ${drawOrder.map(item => item.role).join(">") } | ${boxeGame.qaFps} FPS`, 9, canvas.height - 12);
    ctx.restore();
}

function drawBoxeGame() {
    const shakeX = boxeGame.cameraShake > 0 ? (Math.random() - 0.5) * Math.min(6, boxeGame.cameraShake) : 0;
    const shakeY = boxeGame.cameraShake > 0 ? (Math.random() - 0.5) * Math.min(4, boxeGame.cameraShake) : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBoxingArenaCover();
    const drawOrder = [
        { fighter: boxeGame.player, role: "zorp" },
        { fighter: boxeGame.mestre, role: "master" }
    ].sort((a, b) => a.fighter.y - b.fighter.y);
    const rendered = {};
    for (const entry of drawOrder) rendered[entry.role] = drawBoxingActor(entry.fighter, entry.role);
    drawBoxingEffects();
    drawBoxingHudPanel(9, 7, 146, boxeGame.player, "#34c7ff");
    drawBoxingHudPanel(canvas.width - 155, 7, 146, boxeGame.mestre, "#f05a55", true);
    drawBoxingCenterHud();
    drawBoxingOverlay();
    drawBoxingDebug(drawOrder);
    ctx.restore();

    const diagnostics = {
        runtime: "boxing_arena_v1",
        phase: boxeGame.phase,
        ringBounds: BOXING_RING_BOUNDS,
        assets: typeof boxingAssetStatus !== "undefined" ? { ...boxingAssetStatus } : null,
        fightSeconds: Number((boxeGame.fightFrames / 60).toFixed(2)),
        fps: boxeGame.qaFps,
        playerSpam: Number(boxeGame.playerSpam.toFixed(2)),
        lastHit: boxeGame.lastHit,
        player: {
            x: Number(boxeGame.player.x.toFixed(1)), y: Number(boxeGame.player.y.toFixed(1)), hp: boxeGame.player.hp,
            facing: boxeGame.player.facing, state: boxeGame.player.state, animation: boxeGame.player.animation,
            frame: rendered.zorp.frameIndex, dodgeCooldown: boxeGame.player.dodgeCooldown
        },
        master: {
            x: Number(boxeGame.mestre.x.toFixed(1)), y: Number(boxeGame.mestre.y.toFixed(1)), hp: boxeGame.mestre.hp,
            facing: boxeGame.mestre.facing, state: boxeGame.mestre.state, animation: boxeGame.mestre.animation,
            frame: rendered.master.frameIndex, aiState: boxeGame.mestre.aiState
        },
        ySortOrder: drawOrder.map(item => item.role),
        recentEvents: boxeGame.qaEvents.slice(-12)
    };
    boxeGame.visualDiagnostics = diagnostics;
    canvas.dataset.boxeDiagnostics = JSON.stringify(diagnostics);
}

function configureBoxingQaFromQuery(params) {
    const scenario = params.get("boxeQaScenario") || "";
    boxeGame.qaMode = true;
    boxeGame.qaScenario = scenario;
    boxeGame.qaFreezeAi = scenario !== "ai" && scenario !== "spam" && scenario !== "duration";
    boxeGame.qaMove = ["w", "a", "s", "d"].includes(params.get("boxeQaMove")) ? params.get("boxeQaMove") : "";
    boxeGame.qaAutoAttack = BOXING_CONFIG.attacks[params.get("boxeQaAttack")] ? params.get("boxeQaAttack") : "";
    boxeGame.qaMasterAutoAttack = BOXING_CONFIG.attacks[params.get("boxeQaMasterAttack")] ? params.get("boxeQaMasterAttack") : "";
    boxeGame.qaAutoPlayer = scenario === "duration";
    boxeGame.qaSpamPlayer = scenario === "spam";
    if (params.get("boxeQaPlay") === "1" || scenario) {
        boxeGame.phase = "FIGHTING";
        boxeGame.announcementTimer = 0;
    }
    const p = boxeGame.player;
    const m = boxeGame.mestre;
    if (scenario === "range_miss") {
        p.x = 100; p.y = 210; m.x = 320; m.y = 210;
    } else if (scenario === "range_hit") {
        p.x = 180; p.y = 208; m.x = 222; m.y = 208;
    } else if (scenario === "y_miss") {
        p.x = 180; p.y = 180; m.x = 235; m.y = 224;
    } else if (scenario === "block") {
        p.x = 180; p.y = 208; m.x = 222; m.y = 208; startBoxingBlock(m, 9999); m.aiBlockTimer = 9999;
    } else if (scenario === "dodge") {
        p.x = 180; p.y = 208; m.x = 222; m.y = 208; startBoxingDodge(m, 0, -1);
    } else if (scenario === "corner") {
        p.x = 315; p.y = 210; m.x = 378; m.y = 210;
    } else if (scenario === "crossed") {
        p.x = 285; p.y = 218; m.x = 165; m.y = 190;
    } else if (scenario === "ko_master") {
        p.x = 180; p.y = 208; m.x = 222; m.y = 208; m.hp = 8;
    } else if (scenario === "ko_player") {
        p.x = 220; p.y = 208; m.x = 262; m.y = 208; p.hp = 8;
        boxeGame.qaFreezeAi = params.get("boxeQaMasterAttack") ? true : false;
        setMasterAiState("PRESSURE", 999);
    } else if (scenario === "ai" || scenario === "spam" || scenario === "duration") {
        p.x = 145; p.y = 216; m.x = 305; m.y = 192; boxeGame.qaFreezeAi = false;
    }
    const playerHp = Number(params.get("boxeQaPlayerHp"));
    const masterHp = Number(params.get("boxeQaMasterHp"));
    if (Number.isFinite(playerHp) && playerHp > 0) p.hp = Math.min(p.maxHp, playerHp);
    if (Number.isFinite(masterHp) && masterHp > 0) m.hp = Math.min(m.maxHp, masterHp);
    updateBoxingFacing();
}

window.getBoxeQaSnapshot = () => ({ ...boxeGame.visualDiagnostics, allEvents: [...boxeGame.qaEvents] });
window.setBoxeQaActors = (playerX, playerY, masterX, masterY) => {
    boxeGame.player.x = Number(playerX); boxeGame.player.y = Number(playerY);
    boxeGame.mestre.x = Number(masterX); boxeGame.mestre.y = Number(masterY);
    updateBoxingFacing();
};
window.setBoxeQaHp = (playerHp, masterHp) => {
    boxeGame.player.hp = Math.max(1, Math.min(boxeGame.player.maxHp, Number(playerHp)));
    boxeGame.mestre.hp = Math.max(1, Math.min(boxeGame.mestre.maxHp, Number(masterHp)));
};
