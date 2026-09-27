/*
 * Basquete 1v1 — versão 1.0
 * Módulo independente. Usa exclusivamente os assets exportados e o manifesto
 * em basketball_assets/exported/. A integração com script.js é limitada às
 * funções reset/update/draw expostas no final deste arquivo.
 */
(function () {
    'use strict';

    const SCENE = 'JOGO_BASQUETE';
    const MATCH_SECONDS = 60;
    const OVERTIME_SECONDS = 15;
    const GROUND_Y = 259;
    const LEFT_BOUND = 54;
    const RIGHT_BOUND = 396;
    const GRAVITY = 0.38;
    const BALL_GRAVITY = 0.21;
    const CHARACTER_SCALE = 0.36;
    const BALL_DRAW_SIZE = 20;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const lerp = (a, b, amount) => a + (b - a) * amount;
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const actionStates = new Set(['SHOOT', 'PUMP_FAKE', 'LAYUP', 'DUNK', 'STEAL', 'BLOCK', 'HIT']);

    // Asset loading ---------------------------------------------------------
    class BasketballAssets {
        constructor() {
            this.base = 'basketball_assets/exported/';
            this.manifestUrl = `${this.base}basketball_assets_manifest.json?v=1.0.1_visual_fix`;
            this.entries = [];
            this.frames = new Map();
            this.images = new Map();
            this.ready = false;
            this.failed = 0;
            this.invalidDrawCalls = 0;
            this.promise = this.load();
        }

        async load() {
            try {
                const response = await fetch(this.manifestUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
                const manifest = await response.json();
                this.entries = manifest.assets || [];
                const loaders = this.entries.map((entry) => new Promise((resolve) => {
                    const image = new Image();
                    image.addEventListener('load', () => {
                        this.images.set(entry.file, image);
                        resolve();
                    }, { once: true });
                    image.addEventListener('error', () => {
                        this.failed++;
                        console.error(`[Basquete] Falha ao carregar asset: ${entry.file}`);
                        resolve();
                    }, { once: true });
                    image.src = `${this.base}${entry.file}?v=1.0.1_visual_fix`;
                }));
                await Promise.all(loaders);
                for (const entry of this.entries) {
                    if (!entry.character) continue;
                    const key = `${entry.character}:${entry.animation}`;
                    if (!this.frames.has(key)) this.frames.set(key, []);
                    this.frames.get(key).push(entry);
                }
                for (const sequence of this.frames.values()) sequence.sort((a, b) => a.frame - b.frame);
                this.ready = this.failed === 0;
            } catch (error) {
                this.failed++;
                console.error('[Basquete] Não foi possível preparar os assets.', error);
            }
        }

        getSequence(character, animation) {
            return this.frames.get(`${character}:${animation}`) || [];
        }

        getSingle(category, animation, direction = null) {
            return this.entries.find((entry) => entry.category === category && entry.animation === animation && (direction === null || entry.direction === direction));
        }

        getBallFrame(index) {
            const frames = this.entries.filter((entry) => entry.category === 'basketball' && entry.animation === 'spin');
            return frames.length ? frames[Math.floor(index) % frames.length] : null;
        }

        drawEntry(entry, draw) {
            if (!entry) return false;
            const image = this.images.get(entry.file);
            if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return false;
            const values = [draw.x, draw.y, draw.width, draw.height];
            if (values.some((value) => !Number.isFinite(value)) || draw.width <= 0 || draw.height <= 0) {
                this.invalidDrawCalls++;
                return false;
            }
            ctx.save();
            if (draw.alpha !== undefined) ctx.globalAlpha = draw.alpha;
            if (draw.flipX) {
                ctx.translate(draw.x + draw.width, draw.y);
                ctx.scale(-1, 1);
                ctx.drawImage(image, 0, 0, draw.width, draw.height);
            } else {
                ctx.drawImage(image, draw.x, draw.y, draw.width, draw.height);
            }
            ctx.restore();
            return true;
        }
    }

    // Actor/state model -----------------------------------------------------
    function makeActor(id, character, x, facing) {
        return {
            id,
            character,
            x,
            vx: 0,
            z: 0,
            vz: 0,
            facing,
            state: 'IDLE',
            stateTimer: 0,
            stateDuration: 0,
            animTick: 0,
            released: false,
            grounded: true,
            moveIntent: 0,
            dashCooldown: 0,
            stealCooldown: 0,
            blockCooldown: 0,
            special: 0,
            specialDrive: 0,
            specialShot: false,
            reactionTimer: 0,
            decisionTimer: 0,
            aiIntent: 0,
            renderEntry: null,
            renderFrameIndex: 0
        };
    }

    class BasketballGame {
        constructor() {
            this.assets = new BasketballAssets();
            this.qaMode = new URLSearchParams(window.location.search).has('basketballQa');
            this.pendingQaScenario = new URLSearchParams(window.location.search).get('basketballQaScenario');
            this.hoops = {
                left: {
                    side: 'left', x: 60, rimX: 84, rimY: 190,
                    backboard: { x: 63, y: 151, w: 6, h: 44 }, netTimer: 0
                },
                right: {
                    side: 'right', x: 390, rimX: 366, rimY: 190,
                    backboard: { x: 381, y: 151, w: 6, h: 44 }, netTimer: 0
                }
            };
            this.previousKeys = {};
            this.inputBuffer = new Set();
            this.qaLockFrames = 0;
            this.lastTap = { left: -999, right: -999 };
            this.frame = 0;
            this.qaLockFrames = 0;
            this.lastTime = performance.now();
            this.random = Math.random;
            window.addEventListener('keydown', (event) => {
                if (currentScene !== SCENE || event.repeat) return;
                const raw = event.key.toLowerCase();
                const input = raw === ' ' ? 'space'
                    : raw === 'arrowleft' ? 'left'
                    : raw === 'arrowright' ? 'right'
                    : raw === 'arrowup' || raw === 'w' ? 'jump'
                    : raw === 'a' ? 'left'
                    : raw === 'd' ? 'right'
                    : raw;
                this.inputBuffer.add(input);
                if ([' ', 'arrowleft', 'arrowright', 'arrowup'].includes(raw)) event.preventDefault();
            });
            this.reset(false);
        }

        reset(showReady = true) {
            this.phase = showReady ? 'READY' : 'PLAYING';
            this.clock = MATCH_SECONDS;
            this.overtime = false;
            this.winner = null;
            this.score = { zorp: 0, master: 0 };
            this.player = makeActor('zorp', 'zorp_basket', 142, 1);
            this.master = makeActor('master', 'master_basket', 308, -1);
            this.ball = {
                x: 225, y: GROUND_Y - 18, previousY: GROUND_Y - 18,
                vx: 0, vy: 0, angularVelocity: 0.2, rotation: 0,
                owner: 'zorp', state: 'POSSESSED_ZORP', shotId: 0,
                scoredShotId: -1, shooter: null, target: 'right', points: 2,
                pickupLock: 0, scoreResetTimer: 0, missRecordedShotId: -1
            };
            this.scoreResetOwner = null;
            this.announcement = showReady ? 'BASQUETE 1v1' : 'VALENDO!';
            this.announcementTimer = showReady ? 0 : 70;
            this.effects = [];
            this.lastTime = performance.now();
            this.frame = 0;
            this.previousKeys = {};
            this.lastTap = { left: -999, right: -999 };
            this.stats = {
                shots: 0, misses: 0, twoPointers: 0, threePointers: 0,
                dunks: 0, pumpFakes: 0, steals: 0, blocks: 0,
                rebounds: 0, dashes: 0, specials: 0, overtimes: 0,
                rimHits: 0, backboardHits: 0, floorBounces: 0,
                possessions: 1, nonFinitePhysics: 0,
                actionsSeen: new Set(['IDLE']),
                ballStatesSeen: new Set(['POSSESSED_ZORP']),
                resultsSeen: new Set()
            };
            this.setOwner(this.player, true);
        }

        keyDown(name) {
            if (name === 'left') return Boolean(keys.a || keys.arrowleft);
            if (name === 'right') return Boolean(keys.d || keys.arrowright);
            if (name === 'jump') return Boolean(keys.w || keys.arrowup);
            return Boolean(keys[name]);
        }

        pressed(name) {
            return this.inputBuffer.has(name) || (this.keyDown(name) && !this.previousKeys[name]);
        }

        finishInputFrame() {
            for (const name of ['left', 'right', 'jump', 'j', 'k', 'l', 'space', 'escape']) {
                this.previousKeys[name] = this.keyDown(name);
            }
            this.inputBuffer.clear();
        }

        // Possession and ball anchors --------------------------------------
        actorHasBall(actor) {
            return this.ball.owner === actor.id;
        }

        opponentOf(actor) {
            return actor === this.player ? this.master : this.player;
        }

        attackingHoop(actor) {
            return actor === this.player ? this.hoops.right : this.hoops.left;
        }

        isLocked(actor) {
            return actionStates.has(actor.state) || actor.state === 'VICTORY' || actor.state === 'DEFEATED';
        }

        beginAction(actor, state, duration) {
            if (actor.state === 'VICTORY' || actor.state === 'DEFEATED') return false;
            actor.state = state;
            actor.stateTimer = 0;
            actor.stateDuration = duration;
            actor.released = false;
            actor.moveIntent = 0;
            this.stats.actionsSeen.add(state);
            return true;
        }

        jump(actor) {
            if (!actor.grounded || this.isLocked(actor)) return false;
            actor.grounded = false;
            actor.vz = 5.75;
            actor.state = 'JUMP';
            actor.stateTimer = 0;
            this.stats.actionsSeen.add('JUMP');
            return true;
        }

        dash(actor, direction) {
            if (actor.dashCooldown > 0 || this.isLocked(actor)) return false;
            actor.vx = direction * 7.4;
            actor.facing = direction;
            actor.dashCooldown = 42;
            this.stats.dashes++;
            this.effects.push({ type: 'dash', x: actor.x, y: GROUND_Y - actor.z - 30, life: 18, color: actor === this.player ? '#39e7ff' : '#ff9d32' });
            return true;
        }

        setOwner(actor, silent = false) {
            this.ball.owner = actor.id;
            this.ball.state = actor === this.player ? 'POSSESSED_ZORP' : 'POSSESSED_MASTER';
            this.ball.vx = 0;
            this.ball.vy = 0;
            this.ball.pickupLock = 12;
            this.ball.shooter = null;
            this.stats.ballStatesSeen.add(this.ball.state);
            if (!silent) {
                this.stats.possessions++;
                this.stats.rebounds++;
                actor.special = clamp(actor.special + 4, 0, 100);
            }
        }

        releaseBall(actor, state = 'SHOT') {
            this.ball.owner = null;
            this.ball.state = state;
            this.ball.shooter = actor.id;
            this.ball.shotId++;
            this.ball.pickupLock = 16;
            this.stats.ballStatesSeen.add(state);
        }

        handPosition(actor, entry = actor.renderEntry) {
            const footY = GROUND_Y - actor.z;
            if (entry && entry.ballAnchor) {
                const sourceAnchor = entry.anchor || { x: entry.width / 2, y: entry.height - 8 };
                const localX = entry.ballAnchor.x - sourceAnchor.x;
                const localY = entry.ballAnchor.y - sourceAnchor.y;
                return {
                    x: actor.x + actor.facing * localX * CHARACTER_SCALE,
                    y: footY + localY * CHARACTER_SCALE
                };
            }
            return { x: actor.x + actor.facing * 16, y: footY - 43 };
        }

        updatePossessedBall() {
            const actor = this.ball.owner === 'zorp' ? this.player : this.master;
            if (!actor) return;
            const footY = GROUND_Y - actor.z;
            if (actor.state === 'SHOOT' || actor.state === 'PUMP_FAKE' || actor.state === 'LAYUP' || actor.state === 'DUNK') {
                const hand = this.handPosition(actor);
                this.ball.x = hand.x;
                this.ball.y = hand.y;
            } else if (Math.abs(actor.vx) > 0.25 && actor.grounded) {
                const phase = (actor.animTick % 30) / 30;
                const bounce = Math.sin(phase * Math.PI) ** 2;
                this.ball.x = actor.x + actor.facing * 16;
                this.ball.y = lerp(footY - 42, footY - 7, bounce);
            } else {
                this.ball.x = actor.x + actor.facing * 15;
                this.ball.y = footY - 39;
            }
            this.ball.previousY = this.ball.y;
            this.ball.rotation += 0.12;
        }

        // Offense and defense actions --------------------------------------
        startShot(actor, forced = null) {
            if (!this.actorHasBall(actor) || this.isLocked(actor)) return false;
            actor.specialShot = Boolean(forced && forced.special);
            actor.forcedShot = forced;
            this.beginAction(actor, 'SHOOT', 31);
            return true;
        }

        launchShot(actor, forced = null) {
            if (!this.actorHasBall(actor)) return;
            const hoop = this.attackingHoop(actor);
            const defender = this.opponentOf(actor);
            const hand = this.handPosition(actor);
            this.ball.x = hand.x;
            this.ball.y = hand.y;
            const shotDistance = Math.abs(hoop.rimX - actor.x);
            const pressureDistance = Math.abs(defender.x - actor.x);
            const pressure = pressureDistance < 48 ? (48 - pressureDistance) / 48 : 0;
            const movementPenalty = clamp(Math.abs(actor.vx) / 6, 0, 1) * 0.12;
            const apexBonus = !actor.grounded && Math.abs(actor.vz) < 1.2 ? 0.08 : 0;
            let accuracy = clamp(0.97 - shotDistance / 720 - pressure * 0.22 - movementPenalty + apexBonus, 0.48, 0.98);
            if (actor.specialShot) accuracy = 1;
            if (forced && forced.accuracy !== undefined) accuracy = forced.accuracy;
            const missRadius = (1 - accuracy) * 32;
            const error = forced && forced.error !== undefined ? forced.error : (this.random() * 2 - 1) * missRadius;
            const targetX = hoop.rimX + error;
            // Aim below the rim plane so a clean release crosses the scoring
            // sensor from above instead of dying on the front edge.
            const targetY = hoop.rimY + 4;
            const flight = clamp(37 + shotDistance * 0.08, 39, 58);
            this.releaseBall(actor, 'SHOT');
            this.ball.vx = (targetX - this.ball.x) / flight;
            this.ball.vy = (targetY - this.ball.y - 0.5 * BALL_GRAVITY * flight * flight) / flight;
            this.ball.angularVelocity = actor === this.player ? 0.35 : -0.35;
            this.ball.target = hoop.side;
            this.ball.points = shotDistance > 118 ? 3 : 2;
            this.stats.shots++;
            actor.specialShot = false;
            actor.forcedShot = null;
        }

        startDunkOrLayup(actor) {
            if (!this.actorHasBall(actor)) return false;
            const hoop = this.attackingHoop(actor);
            const dist = Math.abs(hoop.rimX - actor.x);
            if (dist > 92) return this.startShot(actor);
            const dunk = dist < 62 || actor.specialDrive > 0;
            actor.facing = Math.sign(hoop.rimX - actor.x) || actor.facing;
            if (actor.grounded) {
                actor.grounded = false;
                actor.vz = dunk ? 6.6 : 5.6;
            }
            this.beginAction(actor, dunk ? 'DUNK' : 'LAYUP', dunk ? 36 : 32);
            return true;
        }

        releaseFinish(actor, dunk) {
            if (!this.actorHasBall(actor)) return;
            const hoop = this.attackingHoop(actor);
            const defender = this.opponentOf(actor);
            if (defender.state === 'BLOCK' && defender.stateTimer >= 6 && defender.stateTimer <= 18 && Math.abs(defender.x - hoop.rimX) < 48 && Math.abs(defender.x - actor.x) < 38) {
                this.releaseBall(actor, 'FREE');
                this.ball.vx = -actor.facing * 3.8;
                this.ball.vy = -2.5;
                defender.special = clamp(defender.special + 24, 0, 100);
                this.stats.blocks++;
                this.announcement = 'TOCO!';
                this.announcementTimer = 45;
                return;
            }
            this.releaseBall(actor, 'SHOT');
            this.ball.x = hoop.rimX - actor.facing * (dunk ? 1 : 10);
            this.ball.y = hoop.rimY - (dunk ? 18 : 30);
            this.ball.vx = actor.facing * (dunk ? 0.05 : 0.45);
            this.ball.vy = dunk ? 4.4 : 2.6;
            this.ball.target = hoop.side;
            this.ball.points = 2;
            this.ball.angularVelocity = actor.facing * 0.45;
            if (dunk) {
                this.stats.dunks++;
                this.effects.push({ type: 'burst', x: hoop.rimX, y: hoop.rimY, life: 28, color: actor === this.player ? '#39e7ff' : '#ff9d32' });
            }
        }

        pumpFake(actor) {
            if (!this.actorHasBall(actor) || this.isLocked(actor)) return false;
            this.beginAction(actor, 'PUMP_FAKE', 24);
            this.stats.pumpFakes++;
            return true;
        }

        steal(actor) {
            if (this.actorHasBall(actor) || actor.stealCooldown > 0 || this.isLocked(actor)) return false;
            this.beginAction(actor, 'STEAL', 23);
            actor.stealCooldown = 56;
            return true;
        }

        block(actor) {
            if (this.actorHasBall(actor) || actor.blockCooldown > 0 || this.isLocked(actor)) return false;
            if (actor.grounded) {
                actor.grounded = false;
                actor.vz = 4.6;
            }
            this.beginAction(actor, 'BLOCK', 25);
            actor.blockCooldown = 45;
            return true;
        }

        activateSpecial(actor) {
            if (actor.special < 100 || !this.actorHasBall(actor) || this.isLocked(actor)) return false;
            actor.special = 0;
            actor.specialDrive = 110;
            actor.specialShot = true;
            this.stats.specials++;
            this.announcement = actor === this.player ? 'SUPER DRIVE!' : 'MASTER DRIVE!';
            this.announcementTimer = 70;
            this.effects.push({ type: 'burst', x: actor.x, y: GROUND_Y - 38, life: 42, color: actor === this.player ? '#39e7ff' : '#ff9d32' });
            return true;
        }

        // Human input and rival AI -----------------------------------------
        updatePlayerInput(step) {
            const actor = this.player;
            if (this.pressed('escape')) {
                currentScene = 'ILHA_BASQUETE';
                player.x = 225;
                player.y = 145;
                return;
            }
            if (this.isLocked(actor)) return;
            const left = this.keyDown('left');
            const right = this.keyDown('right');
            const leftPressed = this.pressed('left');
            const rightPressed = this.pressed('right');
            let direction = (right ? 1 : 0) - (left ? 1 : 0);
            // A very quick tap may begin and end between animation frames.
            // Preserve one frame of steering so taps still feel responsive.
            if (direction === 0) direction = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0);
            actor.moveIntent = direction;
            if (direction !== 0) actor.facing = direction;
            if (leftPressed) {
                if (this.frame - this.lastTap.left <= 15) this.dash(actor, -1);
                this.lastTap.left = this.frame;
            }
            if (rightPressed) {
                if (this.frame - this.lastTap.right <= 15) this.dash(actor, 1);
                this.lastTap.right = this.frame;
            }
            if (this.pressed('jump')) this.jump(actor);
            if (this.pressed('j')) {
                if (this.actorHasBall(actor)) {
                    const nearHoop = Math.abs(this.attackingHoop(actor).rimX - actor.x) < 92;
                    if (!actor.grounded || nearHoop) this.startDunkOrLayup(actor);
                    else this.startShot(actor);
                } else {
                    this.steal(actor);
                }
            }
            if (this.pressed('k')) {
                if (this.actorHasBall(actor)) this.pumpFake(actor);
                else this.block(actor);
            }
            if (this.pressed('l')) this.activateSpecial(actor);
            if (actor.specialDrive > 0 && this.actorHasBall(actor)) {
                const hoop = this.attackingHoop(actor);
                const toward = Math.sign(hoop.rimX - actor.x) || 1;
                actor.facing = toward;
                actor.vx = toward * 7.8;
                if (Math.abs(hoop.rimX - actor.x) < 66) this.startDunkOrLayup(actor);
            }
        }

        updateAI(step) {
            const actor = this.master;
            const foe = this.player;
            if (this.isLocked(actor)) return;
            if (actor.special >= 100 && this.actorHasBall(actor) && this.random() < 0.012 * step) {
                this.activateSpecial(actor);
            }
            actor.decisionTimer -= step;
            if (actor.decisionTimer <= 0) {
                actor.decisionTimer = 18 + this.random() * 24;
                if (this.actorHasBall(actor)) {
                    const hoop = this.attackingHoop(actor);
                    const dist = Math.abs(hoop.rimX - actor.x);
                    const pressure = Math.abs(foe.x - actor.x);
                    if (dist < 72 && this.random() < 0.72) {
                        this.startDunkOrLayup(actor);
                    } else if (dist < 180 && pressure > 40 && this.random() < 0.54) {
                        this.startShot(actor);
                    } else if (pressure < 34 && this.random() < 0.28) {
                        this.pumpFake(actor);
                    } else if (pressure < 42 && this.random() < 0.35) {
                        actor.aiIntent = 1;
                        this.dash(actor, 1);
                    } else {
                        actor.aiIntent = -1;
                    }
                } else if (this.ball.owner === null) {
                    actor.aiIntent = Math.sign(this.ball.x - actor.x);
                } else {
                    const defensiveTarget = clamp(foe.x + 30, 95, 355);
                    actor.aiIntent = Math.sign(defensiveTarget - actor.x);
                    const separation = Math.abs(foe.x - actor.x);
                    if (foe.state === 'SHOOT' || foe.state === 'DUNK' || foe.state === 'LAYUP') {
                        actor.reactionTimer = 7 + this.random() * 10;
                    } else if (separation < 31 && this.random() < 0.28) {
                        this.steal(actor);
                    }
                }
            }
            if (actor.reactionTimer > 0) {
                actor.reactionTimer -= step;
                if (actor.reactionTimer <= 0 && !this.actorHasBall(actor) && this.random() < 0.68) this.block(actor);
            }
            if (!this.isLocked(actor)) {
                actor.moveIntent = actor.aiIntent;
                if (actor.aiIntent !== 0) actor.facing = actor.aiIntent;
                if (actor.specialDrive > 0 && this.actorHasBall(actor)) {
                    const hoop = this.attackingHoop(actor);
                    actor.moveIntent = Math.sign(hoop.rimX - actor.x);
                    actor.vx = actor.moveIntent * 7.1;
                    if (Math.abs(hoop.rimX - actor.x) < 66) this.startDunkOrLayup(actor);
                }
            }
        }

        // Actor and ball physics -------------------------------------------
        updateActor(actor, step) {
            actor.animTick += step;
            actor.dashCooldown = Math.max(0, actor.dashCooldown - step);
            actor.stealCooldown = Math.max(0, actor.stealCooldown - step);
            actor.blockCooldown = Math.max(0, actor.blockCooldown - step);
            actor.specialDrive = Math.max(0, actor.specialDrive - step);
            if (!this.isLocked(actor)) {
                const acceleration = actor.grounded ? 0.62 : 0.28;
                const maxSpeed = actor.specialDrive > 0 ? 7.8 : 3.65;
                if (actor.moveIntent !== 0) actor.vx += actor.moveIntent * acceleration * step;
                else actor.vx *= Math.pow(0.76, step);
                actor.vx = clamp(actor.vx, -maxSpeed, maxSpeed);
            } else {
                actor.vx *= Math.pow(0.88, step);
                actor.stateTimer += step;
            }
            actor.x += actor.vx * step;
            actor.x = clamp(actor.x, LEFT_BOUND, RIGHT_BOUND);
            if (!actor.grounded) {
                actor.z += actor.vz * step;
                actor.vz -= GRAVITY * step;
                if (actor.z <= 0) {
                    actor.z = 0;
                    actor.vz = 0;
                    actor.grounded = true;
                    if (!this.isLocked(actor)) actor.state = 'IDLE';
                }
            }
            if (!this.isLocked(actor)) {
                if (!actor.grounded) actor.state = 'JUMP';
                else if (Math.abs(actor.vx) > 0.3) actor.state = this.actorHasBall(actor) ? 'DRIBBLE' : 'RUN';
                else actor.state = 'IDLE';
                this.stats.actionsSeen.add(actor.state);
            }
            this.handleActionTimeline(actor);
        }

        handleActionTimeline(actor) {
            if (actor.state === 'SHOOT' && !actor.released && actor.stateTimer >= 17) {
                actor.released = true;
                this.launchShot(actor, actor.forcedShot);
            }
            if (actor.state === 'LAYUP' && !actor.released && actor.stateTimer >= 20) {
                actor.released = true;
                this.releaseFinish(actor, false);
            }
            if (actor.state === 'DUNK' && !actor.released && actor.stateTimer >= 23) {
                actor.released = true;
                this.releaseFinish(actor, true);
                actor.specialDrive = 0;
            }
            if (actor.state === 'STEAL' && actor.stateTimer >= 7 && actor.stateTimer <= 13) this.resolveSteal(actor);
            if (actor.state === 'BLOCK' && actor.stateTimer >= 6 && actor.stateTimer <= 18) this.resolveBlock(actor);
            if (actionStates.has(actor.state) && actor.stateTimer >= actor.stateDuration) {
                actor.state = actor.grounded ? 'IDLE' : 'JUMP';
                actor.stateTimer = 0;
                actor.stateDuration = 0;
                actor.released = false;
            }
        }

        resolveSteal(actor) {
            const victim = this.opponentOf(actor);
            if (!this.actorHasBall(victim) || actor.released) return;
            const ballRange = Math.hypot(this.ball.x - (actor.x + actor.facing * 19), this.ball.y - (GROUND_Y - actor.z - 35));
            if (Math.abs(actor.x - victim.x) < 34 && ballRange < 40 && this.random() < 0.64) {
                actor.released = true;
                this.setOwner(actor);
                victim.state = 'HIT';
                victim.stateTimer = 0;
                victim.stateDuration = 18;
                victim.vx = actor.facing * 1.4;
                actor.special = clamp(actor.special + 25, 0, 100);
                this.stats.steals++;
                this.announcement = 'ROUBO!';
                this.announcementTimer = 38;
            }
        }

        resolveBlock(actor) {
            if (actor.released || this.ball.owner !== null || (this.ball.state !== 'SHOT' && this.ball.state !== 'FREE')) return;
            const hand = { x: actor.x + actor.facing * 12, y: GROUND_Y - actor.z - 55 };
            if (distance(hand, this.ball) < 17) {
                actor.released = true;
                this.ball.state = 'FREE';
                this.ball.vx = actor.facing * 4.3;
                this.ball.vy = -2.4;
                this.ball.pickupLock = 12;
                actor.special = clamp(actor.special + 24, 0, 100);
                this.stats.blocks++;
                this.stats.ballStatesSeen.add('FREE');
                this.announcement = 'TOCO!';
                this.announcementTimer = 42;
                this.effects.push({ type: 'burst', x: this.ball.x, y: this.ball.y, life: 20, color: '#ffffff' });
            }
        }

        resolveBodyCollision() {
            const a = this.player;
            const b = this.master;
            const overlap = 31 - Math.abs(a.x - b.x);
            if (overlap <= 0 || Math.abs(a.z - b.z) > 34) return;
            const direction = a.x <= b.x ? -1 : 1;
            a.x = clamp(a.x + direction * overlap * 0.46, LEFT_BOUND, RIGHT_BOUND);
            b.x = clamp(b.x - direction * overlap * 0.46, LEFT_BOUND, RIGHT_BOUND);
            const exchange = (a.vx - b.vx) * 0.18;
            a.vx -= exchange;
            b.vx += exchange;
        }

        collideBallWithRim(hoop, rimX) {
            const dx = this.ball.x - rimX;
            const dy = this.ball.y - hoop.rimY;
            const minDistance = 9;
            const length = Math.hypot(dx, dy);
            if (length >= minDistance || length < 0.001) return false;
            const nx = dx / length;
            const ny = dy / length;
            const dot = this.ball.vx * nx + this.ball.vy * ny;
            this.ball.x = rimX + nx * minDistance;
            this.ball.y = hoop.rimY + ny * minDistance;
            this.ball.vx -= 1.65 * dot * nx;
            this.ball.vy -= 1.65 * dot * ny;
            this.ball.vx *= 0.82;
            this.ball.vy *= 0.82;
            this.ball.state = 'REBOUND';
            this.stats.rimHits++;
            this.stats.ballStatesSeen.add('REBOUND');
            return true;
        }

        updateFreeBall(step) {
            const wasLiveShot = this.ball.state === 'SHOT' || this.ball.state === 'REBOUND';
            this.ball.previousY = this.ball.y;
            this.ball.x += this.ball.vx * step;
            this.ball.y += this.ball.vy * step;
            this.ball.vy += BALL_GRAVITY * step;
            this.ball.rotation += this.ball.angularVelocity * step;
            this.ball.pickupLock = Math.max(0, this.ball.pickupLock - step);

            for (const hoop of Object.values(this.hoops)) {
                const board = hoop.backboard;
                if (this.ball.x + 7 > board.x && this.ball.x - 7 < board.x + board.w && this.ball.y > board.y && this.ball.y < board.y + board.h) {
                    this.ball.x = this.ball.vx > 0 ? board.x - 7 : board.x + board.w + 7;
                    this.ball.vx *= -0.74;
                    this.ball.state = 'REBOUND';
                    this.stats.backboardHits++;
                    this.stats.ballStatesSeen.add('REBOUND');
                }
                this.checkScore(hoop);
                this.collideBallWithRim(hoop, hoop.rimX - 11);
                this.collideBallWithRim(hoop, hoop.rimX + 11);
            }

            if (this.ball.y >= GROUND_Y - 7) {
                this.ball.y = GROUND_Y - 7;
                if (wasLiveShot && this.ball.scoredShotId !== this.ball.shotId && this.ball.missRecordedShotId !== this.ball.shotId) {
                    this.ball.missRecordedShotId = this.ball.shotId;
                    this.stats.misses++;
                }
                if (Math.abs(this.ball.vy) > 1.15) {
                    this.ball.vy *= -0.58;
                    this.ball.vx *= 0.86;
                    this.ball.state = 'REBOUND';
                    this.stats.floorBounces++;
                    this.stats.ballStatesSeen.add('REBOUND');
                } else {
                    this.ball.vy = 0;
                    this.ball.vx *= Math.pow(0.88, step);
                    this.ball.state = 'FREE';
                    this.stats.ballStatesSeen.add('FREE');
                }
            }
            if (this.ball.x < 9 || this.ball.x > canvas.width - 9) {
                this.ball.x = clamp(this.ball.x, 9, canvas.width - 9);
                this.ball.vx *= -0.65;
                this.ball.state = 'REBOUND';
            }
            this.tryPickupBall();
        }

        checkScore(hoop) {
            if (this.ball.state !== 'SHOT' || this.ball.scoredShotId === this.ball.shotId) return;
            const descending = this.ball.previousY < hoop.rimY - 1 && this.ball.y >= hoop.rimY - 1 && this.ball.vy > 0;
            const centered = Math.abs(this.ball.x - hoop.rimX) < 9.5;
            if (!descending || !centered || this.ball.target !== hoop.side) return;
            this.ball.scoredShotId = this.ball.shotId;
            const scorer = this.ball.shooter === 'zorp' ? this.player : this.master;
            const points = this.ball.points;
            this.score[scorer.id] += points;
            scorer.special = clamp(scorer.special + (points === 3 ? 30 : 22), 0, 100);
            hoop.netTimer = 34;
            if (points === 3) this.stats.threePointers++;
            else this.stats.twoPointers++;
            this.announcement = `${points} PONTOS!`;
            this.announcementTimer = 55;
            this.ball.state = 'REBOUND';
            this.ball.vy = Math.max(2.2, this.ball.vy * 0.45);
            this.ball.vx *= 0.35;
            this.ball.scoreResetTimer = 48;
            this.scoreResetOwner = scorer === this.player ? this.master : this.player;
            this.effects.push({ type: 'score', x: hoop.rimX, y: hoop.rimY - 18, life: 42, color: scorer === this.player ? '#39e7ff' : '#ff9d32', text: `+${points}` });
        }

        tryPickupBall() {
            if (this.ball.owner !== null || this.ball.pickupLock > 0 || this.ball.scoreResetTimer > 0) return;
            const candidates = [this.player, this.master]
                .map((actor) => ({ actor, d: Math.hypot(this.ball.x - actor.x, this.ball.y - (GROUND_Y - actor.z - 30)) }))
                .sort((a, b) => a.d - b.d);
            const best = candidates[0];
            const reach = best.actor.grounded ? 28 : 40;
            if (best.d < reach) this.setOwner(best.actor);
        }

        updateBall(step) {
            if (this.ball.scoreResetTimer > 0) {
                this.ball.scoreResetTimer -= step;
                if (this.ball.scoreResetTimer <= 0 && this.scoreResetOwner) {
                    this.setOwner(this.scoreResetOwner, true);
                    this.player.x = 142;
                    this.master.x = 308;
                    this.player.vx = this.master.vx = 0;
                    this.scoreResetOwner = null;
                }
            }
            if (this.ball.owner !== null) this.updatePossessedBall();
            else this.updateFreeBall(step);
            const values = [this.ball.x, this.ball.y, this.ball.vx, this.ball.vy];
            if (values.some((value) => !Number.isFinite(value))) {
                this.stats.nonFinitePhysics++;
                this.ball.x = 225;
                this.ball.y = GROUND_Y - 20;
                this.ball.vx = this.ball.vy = 0;
                this.setOwner(this.player, true);
            }
        }

        // Match flow --------------------------------------------------------
        updateClock(deltaSeconds) {
            this.clock = Math.max(0, this.clock - deltaSeconds);
            if (this.clock > 0) return;
            if (this.score.zorp === this.score.master) {
                this.overtime = true;
                this.clock = OVERTIME_SECONDS;
                this.stats.overtimes++;
                this.announcement = 'OVERTIME!';
                this.announcementTimer = 90;
                return;
            }
            this.finishMatch(this.score.zorp > this.score.master ? 'zorp' : 'master');
        }

        finishMatch(winner) {
            this.phase = 'RESULT';
            this.winner = winner;
            this.stats.resultsSeen.add(winner);
            if (winner === 'zorp') {
                this.player.state = 'VICTORY';
                this.master.state = 'DEFEATED';
                insignias.basquete = true;
            } else {
                this.master.state = 'VICTORY';
                this.player.state = 'DEFEATED';
            }
            this.player.animTick = this.master.animTick = 0;
        }

        updateEffects(step) {
            for (const hoop of Object.values(this.hoops)) hoop.netTimer = Math.max(0, hoop.netTimer - step);
            this.announcementTimer = Math.max(0, this.announcementTimer - step);
            for (const effect of this.effects) effect.life -= step;
            this.effects = this.effects.filter((effect) => effect.life > 0);
        }

        updateQaBridge() {
            if (!this.qaMode) return;
            const root = document.documentElement;
            if (this.pendingQaScenario && this.assets.ready) {
                const pending = this.pendingQaScenario;
                this.pendingQaScenario = null;
                this.qaScenario(pending);
            }
            const command = root.dataset.basketballQaCommand;
            if (command) {
                this.qaScenario(command);
                delete root.dataset.basketballQaCommand;
            }
            root.dataset.basketballDiagnostics = JSON.stringify(this.diagnostics());
        }

        update() {
            const now = performance.now();
            const deltaSeconds = clamp((now - this.lastTime) / 1000, 0, 0.05);
            this.lastTime = now;
            const step = deltaSeconds * 60;
            this.frame += step;
            hintText.innerText = '[A/D] MOVER  [W] PULAR  [J] ARREMESSO/ROUBO  [K] FINTA/BLOQUEIO  [L] ESPECIAL';
            dialogBox.classList.remove('show');

            if (this.phase === 'READY') {
                if (this.pressed('space') || this.pressed('j')) {
                    this.phase = 'PLAYING';
                    this.clock = MATCH_SECONDS;
                    this.lastTime = now;
                    this.announcement = 'VALENDO!';
                    this.announcementTimer = 60;
                    keys.space = false;
                    keys.j = false;
                }
                this.updatePossessedBall();
                this.updateQaBridge();
                this.finishInputFrame();
                return;
            }
            if (this.phase === 'RESULT') {
                this.player.animTick += step;
                this.master.animTick += step;
                if (this.pressed('space') || this.pressed('j')) {
                    this.reset(true);
                    keys.space = false;
                    keys.j = false;
                } else if (this.pressed('escape')) {
                    currentScene = 'ILHA_BASQUETE';
                    player.x = 225;
                    player.y = 145;
                }
                this.updateQaBridge();
                this.finishInputFrame();
                return;
            }

            this.updatePlayerInput(step);
            if (currentScene !== SCENE) {
                this.finishInputFrame();
                return;
            }
            if (this.qaLockFrames > 0) {
                this.qaLockFrames = Math.max(0, this.qaLockFrames - step);
                this.master.vx *= Math.pow(0.72, step);
            } else {
                this.updateAI(step);
            }
            this.updateActor(this.player, step);
            this.updateActor(this.master, step);
            this.resolveBodyCollision();
            this.updateBall(step);
            this.updateClock(deltaSeconds);
            this.updateEffects(step);
            this.updateQaBridge();
            this.finishInputFrame();
        }

        // Animation and rendering ------------------------------------------
        animationFor(actor) {
            const mapping = {
                IDLE: 'idle', RUN: 'run', DRIBBLE: 'run', JUMP: 'jump', SHOOT: 'shoot',
                PUMP_FAKE: 'pump_fake', LAYUP: 'layup_dunk', DUNK: 'layup_dunk',
                STEAL: 'steal', BLOCK: 'block', HIT: 'hit', VICTORY: 'victory', DEFEATED: 'defeated'
            };
            return mapping[actor.state] || 'idle';
        }

        animationEntry(actor) {
            const animation = this.animationFor(actor);
            const sequence = this.assets.getSequence(actor.character, animation);
            if (!sequence.length) return null;
            let index = 0;
            if (actionStates.has(actor.state)) {
                const progress = clamp(actor.stateTimer / Math.max(1, actor.stateDuration), 0, 0.999);
                index = Math.floor(progress * sequence.length);
            } else if (actor.state === 'JUMP') {
                const progress = actor.vz > 1.2 ? 0.15 : actor.vz < -1.2 ? 0.82 : 0.5;
                index = Math.floor(progress * sequence.length);
            } else {
                const speed = actor.state === 'RUN' || actor.state === 'DRIBBLE' ? 5.5 : 15;
                index = Math.floor(actor.animTick / speed) % sequence.length;
            }
            actor.renderFrameIndex = index;
            actor.renderEntry = sequence[index];
            return actor.renderEntry;
        }

        drawActor(actor) {
            const entry = this.animationEntry(actor);
            if (!entry) return;
            const width = entry.width * CHARACTER_SCALE;
            const height = entry.height * CHARACTER_SCALE;
            const anchor = entry.anchor || { x: entry.width / 2, y: entry.height - 8 };
            const footY = GROUND_Y - actor.z;
            const shadowScale = clamp(1 - actor.z / 125, 0.35, 1);
            ctx.fillStyle = 'rgba(0,0,0,0.32)';
            ctx.beginPath();
            ctx.ellipse(actor.x, GROUND_Y + 1, 18 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
            const drawX = actor.facing === 1
                ? actor.x - anchor.x * CHARACTER_SCALE
                : actor.x - (entry.width - anchor.x) * CHARACTER_SCALE;
            const drawY = footY - anchor.y * CHARACTER_SCALE;
            if (actor.specialDrive > 0) {
                ctx.save();
                ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.frame * 0.3);
                ctx.fillStyle = actor === this.player ? '#39e7ff' : '#ff9d32';
                ctx.beginPath();
                ctx.arc(actor.x, footY - 33, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            this.assets.drawEntry(entry, { x: drawX, y: drawY, width, height, flipX: actor.facing < 0 });
        }

        drawHoop(hoop) {
            const animation = hoop.netTimer > 0 ? 'net_motion' : 'idle';
            const entry = this.assets.getSingle('hoop', animation, hoop.side);
            if (!entry) return;
            const scale = 0.2;
            const width = entry.width * scale;
            const height = entry.height * scale;
            const anchor = entry.anchor || { x: entry.width / 2, y: entry.height - 8 };
            const x = hoop.x - anchor.x * scale;
            const y = GROUND_Y - anchor.y * scale;
            this.assets.drawEntry(entry, { x, y, width, height });
        }

        drawBall() {
            const entry = this.assets.getBallFrame(Math.floor(this.ball.rotation));
            if (!entry) return;
            this.assets.drawEntry(entry, {
                x: this.ball.x - BALL_DRAW_SIZE / 2,
                y: this.ball.y - BALL_DRAW_SIZE / 2,
                width: BALL_DRAW_SIZE,
                height: BALL_DRAW_SIZE,
                flipX: this.ball.angularVelocity < 0
            });
        }

        drawHUD() {
            ctx.save();
            ctx.fillStyle = 'rgba(4, 8, 24, 0.86)';
            ctx.fillRect(0, 0, canvas.width, 34);
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#47e9ff';
            ctx.fillText(`ZORP ${this.score.zorp}`, 12, 15);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffae45';
            ctx.fillText(`${this.score.master} MESTRE`, canvas.width - 12, 15);
            ctx.textAlign = 'center';
            ctx.fillStyle = this.overtime ? '#ffeb3b' : '#ffffff';
            ctx.fillText(this.overtime ? `OT ${Math.ceil(this.clock)}` : `${Math.ceil(this.clock)}`, canvas.width / 2, 15);
            const barWidth = 112;
            const drawBar = (x, y, value, color, alignRight) => {
                ctx.fillStyle = '#18223e';
                ctx.fillRect(x, y, barWidth, 7);
                ctx.fillStyle = color;
                const fill = barWidth * clamp(value / 100, 0, 1);
                ctx.fillRect(alignRight ? x + barWidth - fill : x, y, fill, 7);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, barWidth, 7);
            };
            drawBar(12, 22, this.player.special, '#39e7ff', false);
            drawBar(canvas.width - 124, 22, this.master.special, '#ff9d32', true);
            ctx.font = '7px monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#d6fbff';
            ctx.fillText(this.player.special >= 100 ? 'SPECIAL [L]' : 'SPECIAL', 14, 29);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff0d5';
            ctx.fillText('MASTER SPECIAL', canvas.width - 14, 29);
            ctx.restore();
        }

        drawEffects() {
            ctx.save();
            for (const effect of this.effects) {
                const alpha = clamp(effect.life / 30, 0, 1);
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = effect.color;
                ctx.fillStyle = effect.color;
                if (effect.type === 'dash') {
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.moveTo(effect.x - 18 - i * 5, effect.y + i * 6);
                        ctx.lineTo(effect.x + 8, effect.y + i * 6);
                        ctx.stroke();
                    }
                } else if (effect.type === 'score') {
                    ctx.font = 'bold 18px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(effect.text, effect.x, effect.y - (42 - effect.life) * 0.45);
                } else {
                    const radius = 38 - effect.life;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, Math.max(4, radius), 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        drawReady() {
            ctx.fillStyle = 'rgba(2, 4, 18, 0.86)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f7c948';
            ctx.font = 'bold 24px monospace';
            ctx.fillText('BASQUETE 1v1', canvas.width / 2, 75);
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px monospace';
            const lines = [
                '[A/D] CORRER   [W/↑] PULAR',
                '[J] ARREMESSO / ROUBO',
                '[K] FINTA / BLOQUEIO',
                'DUPLO [A/D] DASH   [L] ESPECIAL',
                '60 SEGUNDOS — MAIOR PLACAR VENCE'
            ];
            lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, 115 + index * 20));
            ctx.fillStyle = (Date.now() % 900 < 450) ? '#39e7ff' : '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('[ESPAÇO OU J] COMEÇAR', canvas.width / 2, 245);
            ctx.textAlign = 'left';
        }

        drawResult() {
            ctx.fillStyle = 'rgba(2, 4, 18, 0.82)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            const won = this.winner === 'zorp';
            ctx.fillStyle = won ? '#39e7ff' : '#ff9d32';
            ctx.font = 'bold 24px monospace';
            ctx.fillText(won ? 'ZORP VENCEU!' : 'MESTRE VENCEU!', canvas.width / 2, 88);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.fillText(`${this.score.zorp}  x  ${this.score.master}`, canvas.width / 2, 128);
            ctx.font = '11px monospace';
            ctx.fillText('[ESPAÇO OU J] REVANCHE', canvas.width / 2, 190);
            ctx.fillText('[ESC] VOLTAR À ILHA', canvas.width / 2, 216);
            ctx.textAlign = 'left';
        }

        draw() {
            if (!this.assets.ready) {
                ctx.fillStyle = '#080d25';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = this.assets.failed ? '#ff6b6b' : '#ffffff';
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(this.assets.failed ? 'ERRO AO CARREGAR ASSETS' : 'CARREGANDO ARENA...', canvas.width / 2, canvas.height / 2);
                ctx.textAlign = 'left';
                return;
            }
            const arena = this.assets.getSingle('arena', 'background');
            this.assets.drawEntry(arena, { x: 0, y: 0, width: canvas.width, height: canvas.height });
            ctx.fillStyle = 'rgba(4, 6, 28, 0.09)';
            ctx.fillRect(0, 34, canvas.width, canvas.height - 34);
            this.drawHoop(this.hoops.left);
            this.drawHoop(this.hoops.right);
            this.drawActor(this.player);
            this.drawActor(this.master);
            this.drawBall();
            this.drawEffects();
            this.drawHUD();
            if (this.announcementTimer > 0 && this.phase === 'PLAYING') {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = 'bold 16px monospace';
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#07102d';
                ctx.lineWidth = 4;
                ctx.strokeText(this.announcement, canvas.width / 2, 57);
                ctx.fillText(this.announcement, canvas.width / 2, 57);
                ctx.restore();
            }
            if (this.phase === 'READY') this.drawReady();
            else if (this.phase === 'RESULT') this.drawResult();
        }

        // Runtime diagnostics and deterministic QA routes ------------------
        diagnostics() {
            const actorSnapshot = (actor) => ({
                state: actor.state, x: Number(actor.x.toFixed(2)), z: Number(actor.z.toFixed(2)),
                vx: Number(actor.vx.toFixed(2)), facing: actor.facing,
                special: Number(actor.special.toFixed(1)), frame: actor.renderFrameIndex
            });
            return {
                phase: this.phase,
                assetsReady: this.assets.ready,
                assetFailures: this.assets.failed,
                invalidDrawCalls: this.assets.invalidDrawCalls,
                manifestEntries: this.assets.entries.length,
                score: { ...this.score },
                clock: Number(this.clock.toFixed(2)),
                overtime: this.overtime,
                winner: this.winner,
                player: actorSnapshot(this.player),
                master: actorSnapshot(this.master),
                ball: {
                    state: this.ball.state, owner: this.ball.owner,
                    x: Number(this.ball.x.toFixed(2)), y: Number(this.ball.y.toFixed(2)),
                    vx: Number(this.ball.vx.toFixed(2)), vy: Number(this.ball.vy.toFixed(2)),
                    shotId: this.ball.shotId, scoredShotId: this.ball.scoredShotId
                },
                stats: {
                    ...this.stats,
                    actionsSeen: [...this.stats.actionsSeen],
                    ballStatesSeen: [...this.stats.ballStatesSeen],
                    resultsSeen: [...this.stats.resultsSeen]
                },
                colliders: {
                    left: { rimX: this.hoops.left.rimX, rimY: this.hoops.left.rimY, backboard: this.hoops.left.backboard },
                    right: { rimX: this.hoops.right.rimX, rimY: this.hoops.right.rimY, backboard: this.hoops.right.backboard }
                }
            };
        }

        qaScenario(name) {
            if (!this.qaMode) return false;
            this.phase = 'PLAYING';
            this.clock = Math.max(this.clock, 20);
            this.qaLockFrames = 180;
            if (name === 'two') {
                this.player.x = 295;
                this.master.x = 190;
                this.setOwner(this.player, true);
                this.startShot(this.player, { accuracy: 1 });
            } else if (name === 'three') {
                this.player.x = 205;
                this.master.x = 115;
                this.setOwner(this.player, true);
                this.player.specialShot = true;
                this.startShot(this.player, { accuracy: 1 });
            } else if (name === 'miss') {
                this.player.x = 245;
                this.setOwner(this.player, true);
                this.startShot(this.player, { error: 24, accuracy: 0.2 });
            } else if (name === 'dunk') {
                this.player.x = 322;
                this.master.x = 230;
                this.setOwner(this.player, true);
                this.player.grounded = false;
                this.player.z = 9;
                this.player.vz = 5;
                this.startDunkOrLayup(this.player);
            } else if (name === 'block') {
                this.master.x = 330;
                this.player.x = 285;
                this.setOwner(this.player, true);
                this.block(this.master);
                this.ball.owner = null;
                this.ball.state = 'SHOT';
                this.ball.shooter = 'zorp';
                this.ball.x = this.master.x - 10;
                this.ball.y = GROUND_Y - this.master.z - 55;
                this.ball.vx = 2.2;
                this.ball.vy = -1.4;
                this.master.stateTimer = 9;
                this.resolveBlock(this.master);
            } else if (name === 'steal') {
                this.player.x = 214;
                this.master.x = 238;
                this.player.facing = 1;
                this.master.facing = -1;
                this.setOwner(this.master, true);
                this.updatePossessedBall();
                this.steal(this.player);
                const savedRandom = this.random;
                this.random = () => 0;
                this.resolveSteal(this.player);
                this.random = savedRandom;
            } else if (name === 'pump') {
                this.setOwner(this.player, true);
                this.pumpFake(this.player);
            } else if (name === 'rebound') {
                this.ball.owner = null;
                this.ball.state = 'REBOUND';
                this.ball.x = this.player.x;
                this.ball.y = GROUND_Y - 35;
                this.ball.vx = 0;
                this.ball.vy = 0;
                this.ball.pickupLock = 0;
                this.tryPickupBall();
            } else if (name === 'dash') {
                this.dash(this.player, 1);
            } else if (name === 'jump') {
                this.jump(this.player);
            } else if (name === 'special') {
                this.setOwner(this.player, true);
                this.player.special = 100;
                this.activateSpecial(this.player);
            } else if (name === 'overtime') {
                this.score.zorp = 4;
                this.score.master = 4;
                this.clock = 0.01;
            } else if (name === 'victory') {
                this.score.zorp = 6;
                this.score.master = 4;
                this.clock = 0.01;
            } else if (name === 'defeat') {
                this.score.zorp = 2;
                this.score.master = 6;
                this.clock = 0.01;
            } else if (name === 'backboard') {
                this.ball.owner = null;
                this.ball.state = 'SHOT';
                this.ball.shooter = 'zorp';
                this.ball.target = 'right';
                this.ball.x = 350;
                this.ball.y = 165;
                this.ball.vx = 4.2;
                this.ball.vy = -0.2;
                this.ball.shotId++;
            } else if (name === 'rim') {
                this.ball.owner = null;
                this.ball.state = 'SHOT';
                this.ball.shooter = 'zorp';
                this.ball.target = 'right';
                this.ball.x = 340;
                this.ball.y = 176;
                this.ball.vx = 2.2;
                this.ball.vy = 1.1;
                this.ball.shotId++;
            } else return false;
            return true;
        }
    }

    const game = new BasketballGame();
    window.basketball1v1 = game;
    window.resetBasketball1v1 = function (showReady = true) { game.reset(showReady); };
    window.updateBasketball1v1 = function () { game.update(); };
    window.drawBasketball1v1 = function () { game.draw(); };
    window.getBasketball1v1Diagnostics = function () { return game.diagnostics(); };
    if (game.qaMode) {
        window.basketball1v1QA = {
            scenario: (name) => game.qaScenario(name),
            diagnostics: () => game.diagnostics()
        };
        currentScene = SCENE;
        game.reset(true);
    }
})();
