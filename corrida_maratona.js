/*
 * Corrida/Maratona 1.0
 * Módulo independente: pista, sprites, corredores, IA, obstáculos, HUD e fluxo.
 * A integração com o projeto principal se limita às três funções exportadas no fim.
 */
(function () {
    'use strict';

    const TAU = Math.PI * 2;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const lerp = (a, b, t) => a + (b - a) * t;
    const wrap = (value, length) => ((value % length) + length) % length;

    function rect(x, y, w, h, flipX = false) {
        return { x, y, w, h, flipX };
    }

    class SpriteAtlas {
        constructor() {
            this.images = {};
            this.loaded = 0;
            this.failed = 0;
            this.invalidDrawCalls = 0;
            this.sources = {
                zorp: 'Zorp_Corrida.png',
                mestre: 'Mestre_Corrida.png',
                competitors: 'Competidores_Corrida.png',
                obstacles: 'Obstaculos_Corrida.png'
            };
            Object.entries(this.sources).forEach(([key, src]) => {
                const image = new Image();
                image.addEventListener('load', () => { this.loaded++; });
                image.addEventListener('error', () => { this.failed++; });
                image.src = src;
                this.images[key] = image;
            });
            this.characters = {
                zorp: this.makeHeroFrames(),
                mestre: this.makeHeroFrames()
            };
            this.obstacles = this.makeObstacleFrames();
        }

        get ready() {
            return this.loaded + this.failed === Object.keys(this.sources).length;
        }

        makeHeroFrames() {
            const xs = [548, 660, 772, 884, 996, 1108];
            const row = (y) => xs.map((x) => rect(x, y, 110, 150));
            return {
                idle: {
                    RIGHT: [rect(43, 60, 95, 155), rect(137, 60, 95, 155)],
                    LEFT: [rect(265, 60, 95, 155), rect(354, 60, 95, 155)],
                    UP: [rect(45, 245, 100, 165), rect(140, 245, 100, 165)],
                    DOWN: [rect(267, 245, 100, 165), rect(357, 245, 100, 165)]
                },
                run: {
                    RIGHT: row(57),
                    LEFT: row(207),
                    UP: row(350),
                    DOWN: row(498)
                },
                sidestepIn: [rect(15, 770, 95, 160), rect(100, 770, 95, 160), rect(190, 770, 95, 160)],
                sidestepOut: [rect(295, 770, 95, 160), rect(385, 770, 95, 160), rect(475, 770, 95, 160)],
                jump: {
                    RIGHT: [rect(545, 742, 105, 135), rect(642, 742, 105, 135), rect(739, 742, 105, 135), rect(836, 742, 105, 135)],
                    LEFT: [rect(907, 742, 82, 135), rect(985, 742, 82, 135), rect(1063, 742, 82, 135), rect(1141, 742, 82, 135)],
                    UP: [rect(550, 888, 105, 150), rect(655, 888, 105, 150), rect(760, 888, 105, 150)],
                    DOWN: [rect(920, 888, 98, 150), rect(1018, 888, 98, 150), rect(1116, 888, 98, 150)]
                },
                stumble: [rect(18, 1080, 112, 164), rect(128, 1080, 112, 164), rect(238, 1080, 112, 164), rect(348, 1080, 112, 164)],
                victory: [rect(470, 1080, 100, 164), rect(570, 1080, 100, 164), rect(670, 1080, 100, 164), rect(770, 1080, 100, 164)],
                defeated: [rect(920, 1080, 100, 164), rect(1020, 1080, 100, 164), rect(1120, 1080, 100, 164)]
            };
        }

        makeObstacleFrames() {
            return {
                hurdle: rect(25, 78, 125, 115),
                puddle: rect(480, 78, 205, 142),
                cone: rect(930, 72, 92, 125),
                barricade: rect(24, 1110, 132, 125),
                startingBlock: rect(687, 1110, 118, 120),
                backmarker: rect(24, 386, 100, 165),
                zigzag: rect(512, 386, 100, 165),
                cart: rect(894, 384, 118, 150),
                judge: rect(20, 760, 115, 165),
                rolling: rect(370, 1110, 130, 125),
                robot: rect(970, 1110, 105, 120),
                bottle: rect(604, 775, 95, 130),
                sponge: rect(985, 785, 90, 115),
                pigeon: rect(25, 940, 92, 130),
                tape: rect(648, 930, 185, 135)
            };
        }

        safeDraw(context, imageKey, source, x, y, width, height, alpha = 1) {
            const image = this.images[imageKey];
            if (!image || !image.complete || !image.naturalWidth) return false;
            const valid = source && source.w > 0 && source.h > 0 &&
                source.x >= 0 && source.y >= 0 &&
                source.x + source.w <= image.naturalWidth &&
                source.y + source.h <= image.naturalHeight;
            if (!valid) {
                this.invalidDrawCalls++;
                return false;
            }
            context.save();
            context.globalAlpha = alpha;
            if (source.flipX) {
                context.translate(x + width, y);
                context.scale(-1, 1);
                context.drawImage(image, source.x, source.y, source.w, source.h, 0, 0, width, height);
            } else {
                context.drawImage(image, source.x, source.y, source.w, source.h, x, y, width, height);
            }
            context.restore();
            return true;
        }

        drawHero(context, kind, action, direction, frameIndex, x, y, width, height) {
            const frames = this.characters[kind];
            let sequence;
            if (action === 'JUMP') sequence = frames.jump[direction] || frames.jump.RIGHT;
            else if (action === 'STUMBLE') sequence = frames.stumble;
            else if (action === 'VICTORY') sequence = frames.victory;
            else if (action === 'DEFEATED') sequence = frames.defeated;
            else if (action === 'SIDESTEP_IN') sequence = frames.sidestepIn;
            else if (action === 'SIDESTEP_OUT') sequence = frames.sidestepOut;
            else if (action === 'READY') sequence = frames.idle[direction] || frames.idle.RIGHT;
            else sequence = frames.run[direction] || frames.run.RIGHT;
            const source = sequence[Math.floor(frameIndex) % sequence.length];
            return this.safeDraw(context, kind, source, x - width / 2, y - height, width, height);
        }

        competitorFrame(group, direction, frameIndex) {
            const columnOrigins = [8, 318, 628, 938];
            const bands = {
                robot: { top: 28, run: 169, up: 265 },
                human: { top: 474, run: 597, up: 700 },
                monster: { top: 892, run: 1011, up: 1100 }
            };
            const band = bands[group.band];
            const origin = columnOrigins[group.column];
            if (direction === 'UP') {
                return rect(origin + (Math.floor(frameIndex) % 4) * 75, band.up, 74, 105);
            }
            if (direction === 'DOWN') {
                return rect(origin, band.top, 77, 138);
            }
            const source = rect(origin + (Math.floor(frameIndex) % 6) * 50, band.run, 55, 98, direction === 'LEFT');
            return source;
        }

        drawCompetitor(context, group, direction, frameIndex, x, y, width, height, state) {
            let source = this.competitorFrame(group, direction, frameIndex);
            if (state === 'STUMBLE') {
                const fallY = group.band === 'robot' ? 354 : group.band === 'human' ? 793 : 1175;
                const origin = [8, 318, 628, 938][group.column];
                source = rect(origin + 150, fallY, 145, Math.min(78, 1254 - fallY));
            }
            return this.safeDraw(context, 'competitors', source, x - width / 2, y - height, width, height);
        }

        drawObstacle(context, type, x, y, width, height, alpha = 1) {
            const source = this.obstacles[type];
            return this.safeDraw(context, 'obstacles', source, x - width / 2, y - height, width, height, alpha);
        }
    }

    class RaceTrack {
        constructor() {
            this.straight = 760;
            this.innerRadius = 150;
            this.laneWidth = 18;
            this.lanes = 8;
            this.referenceRadius = this.innerRadius + this.laneWidth * 3.5;
            this.curveLength = Math.PI * this.referenceRadius;
            this.length = this.straight * 2 + this.curveLength * 2;
            this.halfStraight = this.straight / 2;
        }

        point(progress, lane = 0) {
            const s = wrap(progress, this.length);
            const r = this.innerRadius + (lane + 0.5) * this.laneWidth;
            let x, y, direction, segment, curveT = 0;
            if (s < this.straight) {
                x = -this.halfStraight + s;
                y = r;
                direction = 'RIGHT';
                segment = 'LOWER_STRAIGHT';
            } else if (s < this.straight + this.curveLength) {
                curveT = (s - this.straight) / this.curveLength;
                const angle = Math.PI / 2 - curveT * Math.PI;
                x = this.halfStraight + Math.cos(angle) * r;
                y = Math.sin(angle) * r;
                direction = 'UP';
                segment = 'RIGHT_CURVE';
            } else if (s < this.straight * 2 + this.curveLength) {
                const local = s - this.straight - this.curveLength;
                x = this.halfStraight - local;
                y = -r;
                direction = 'LEFT';
                segment = 'UPPER_STRAIGHT';
            } else {
                curveT = (s - this.straight * 2 - this.curveLength) / this.curveLength;
                const angle = -Math.PI / 2 - curveT * Math.PI;
                x = -this.halfStraight + Math.cos(angle) * r;
                y = Math.sin(angle) * r;
                direction = 'DOWN';
                segment = 'LEFT_CURVE';
            }
            return { x, y, direction, segment, curveT, onCurve: segment.includes('CURVE') };
        }

        drawPath(context, lane, color, width) {
            context.beginPath();
            const samples = 220;
            for (let i = 0; i <= samples; i++) {
                const p = this.point(this.length * i / samples, lane);
                if (i === 0) context.moveTo(p.x, p.y);
                else context.lineTo(p.x, p.y);
            }
            context.closePath();
            context.strokeStyle = color;
            context.lineWidth = width;
            context.stroke();
        }

        draw(context, pulse) {
            context.save();
            context.fillStyle = '#155c38';
            context.fillRect(-760, -430, 1520, 860);

            context.fillStyle = '#1f7044';
            for (let x = -730; x < 730; x += 55) {
                for (let y = -400; y < 400; y += 55) {
                    if (((x + y) / 55) % 2 === 0) context.fillRect(x, y, 55, 55);
                }
            }

            this.drawPath(context, 3.5, '#5d241d', this.laneWidth * this.lanes + 12);
            this.drawPath(context, 3.5, '#c9573f', this.laneWidth * this.lanes + 4);

            for (let lane = -0.5; lane < this.lanes; lane++) {
                this.drawPath(context, lane, 'rgba(255,245,220,.78)', 1.4);
            }

            // Linha de largada/chegada no começo da reta inferior.
            const inner = this.point(0, -0.35);
            const outer = this.point(0, this.lanes - 0.15);
            context.lineWidth = 7;
            context.strokeStyle = '#f7f2df';
            context.beginPath();
            context.moveTo(inner.x, inner.y);
            context.lineTo(outer.x, outer.y);
            context.stroke();
            context.lineWidth = 3;
            context.strokeStyle = '#151a28';
            for (let i = 0; i < this.lanes * 2; i += 2) {
                const t0 = i / (this.lanes * 2);
                const t1 = (i + 1) / (this.lanes * 2);
                context.beginPath();
                context.moveTo(lerp(inner.x, outer.x, t0), lerp(inner.y, outer.y, t0));
                context.lineTo(lerp(inner.x, outer.x, t1), lerp(inner.y, outer.y, t1));
                context.stroke();
            }

            // Miolo e leitura de estádio sem competir com a pista.
            context.fillStyle = 'rgba(9,38,27,.35)';
            context.fillRect(-250, -58, 500, 116);
            context.fillStyle = '#d8f2dd';
            context.font = 'bold 24px monospace';
            context.textAlign = 'center';
            context.globalAlpha = 0.45 + Math.sin(pulse * 0.03) * 0.08;
            context.fillText('FESTIVAL GALÁCTICO', 0, 8);
            context.globalAlpha = 1;

            // Arquibancadas simples fora da pista.
            context.fillStyle = '#263449';
            context.fillRect(-330, -355, 660, 55);
            context.fillRect(-330, 300, 660, 55);
            context.fillStyle = '#88a4bb';
            for (let x = -315; x < 315; x += 24) {
                context.fillRect(x, -340, 12, 5);
                context.fillRect(x + 9, 322, 12, 5);
            }
            context.restore();
        }
    }

    class Runner {
        constructor(options) {
            Object.assign(this, options);
            this.laneVisual = this.lane;
            this.targetLane = this.lane;
            this.progress = options.progress || 0;
            this.speed = 0;
            this.z = 0;
            this.vz = 0;
            this.state = 'READY';
            this.stateTimer = 0;
            this.animTime = 0;
            this.finished = false;
            this.finishOrder = 0;
            this.laneChangeCooldown = 0;
            this.curvePenalty = 0;
            this.hitObstacles = new Set();
            this.lastDirection = 'RIGHT';
        }

        get lap() {
            return Math.min(2, Math.floor(Math.max(0, this.progress) / this.trackLength) + 1);
        }

        jump() {
            if (this.finished || this.state === 'STUMBLE' || this.z > 0.5) return false;
            this.vz = 7.9;
            this.z = 0.1;
            this.state = 'JUMP';
            this.stateTimer = 0;
            return true;
        }

        changeLane(delta, onCurve) {
            if (this.finished || this.state === 'STUMBLE' || this.laneChangeCooldown > 0) return false;
            const next = clamp(this.targetLane + delta, 0, this.totalLanes - 1);
            if (next === this.targetLane) return false;
            this.targetLane = next;
            this.laneChangeCooldown = 9;
            this.state = delta < 0 ? 'SIDESTEP_IN' : 'SIDESTEP_OUT';
            this.stateTimer = 14;
            if (onCurve) {
                this.speed = Math.max(this.minSpeed, this.speed - 0.34);
                this.curvePenalty = Math.min(1.25, this.curvePenalty + 0.28);
            }
            return true;
        }

        stumble(strength = 0.52) {
            if (this.state === 'STUMBLE' && this.stateTimer > 12) return;
            this.speed = Math.max(this.minSpeed * 0.55, this.speed * strength);
            this.state = 'STUMBLE';
            this.stateTimer = 48;
            this.z = 0;
            this.vz = 0;
        }

        updatePhysics(dt, point, raceRunning) {
            const step = dt * 60;
            this.animTime += step * (0.12 + this.speed * 0.035);
            this.laneChangeCooldown = Math.max(0, this.laneChangeCooldown - step);
            this.curvePenalty = Math.max(0, this.curvePenalty - dt * 0.22);

            if (this.stateTimer > 0) {
                this.stateTimer = Math.max(0, this.stateTimer - step);
                if (this.stateTimer === 0 && this.state !== 'JUMP') this.state = raceRunning ? 'RUN' : 'READY';
            }

            if (this.z > 0 || this.vz > 0) {
                this.z += this.vz * step * 0.24;
                this.vz -= 0.58 * step;
                if (this.z <= 0) {
                    this.z = 0;
                    this.vz = 0;
                    if (this.state === 'JUMP') this.state = 'RUN';
                }
            }

            this.laneVisual = lerp(this.laneVisual, this.targetLane, clamp(dt * 8.5, 0, 1));
            if (!raceRunning || this.finished) {
                this.speed = Math.max(0, this.speed - dt * 3);
                return;
            }

            let curveFactor = 1;
            if (point.onCurve) {
                const laneEfficiency = 1 - this.laneVisual * 0.006;
                curveFactor = laneEfficiency - this.curvePenalty * 0.06;
            }
            const target = this.maxSpeed * curveFactor;
            const acceleration = this.state === 'STUMBLE' ? this.acceleration * 0.25 : this.acceleration;
            this.speed = lerp(this.speed, target, clamp(acceleration * dt, 0, 1));
            this.speed = clamp(this.speed, 0, this.maxSpeed * 1.02);
            this.progress += this.speed * step;
            this.lastDirection = point.direction;
        }
    }

    class ObstacleDirector {
        constructor(track, atlas) {
            this.track = track;
            this.atlas = atlas;
            this.items = [];
            this.typesSeen = new Set();
            this.hitCount = 0;
            this.playerHitCount = 0;
            this.mobileSeen = false;
            this.buildCourse();
        }

        add(type, lap, s, lane, options = {}) {
            this.items.push({
                id: `${type}-${lap}-${s}-${lane}-${this.items.length}`,
                type, lap, baseS: s, lane, laneVisual: lane,
                absProgress: (lap - 1) * this.track.length + s,
                mobile: false, jumpable: false, strength: 0.65,
                size: [40, 42], active: true, triggered: false,
                ...options
            });
        }

        buildCourse() {
            const L = this.track.length;
            // Volta 1: leitura e apresentação gradual dos perigos.
            this.add('startingBlock', 1, 250, 6, { strength: 0.8, size: [34, 26] });
            this.add('cone', 1, 430, 3, { strength: 0.58, size: [32, 38] });
            this.add('hurdle', 1, 610, 1, { jumpable: true, strength: 0.46, size: [54, 42] });
            this.add('hurdle', 1, 610, 2, { jumpable: true, strength: 0.46, size: [54, 42] });
            this.add('puddle', 1, 930, 5, { jumpable: true, strength: 0.48, size: [72, 36] });
            this.add('bottle', 1, 1180, 2, { strength: 0.78, size: [28, 24] });
            this.add('backmarker', 1, 1450, 4, { mobile: true, mobileSpeed: 2.35, strength: 0.72, size: [36, 48] });
            this.add('barricade', 1, 1860, 6, { strength: 0.42, size: [58, 40] });
            this.add('judge', 1, 2200, 1, { mobile: true, mobileSpeed: 2.15, strength: 0.58, size: [38, 50] });
            this.add('pigeon', 1, L - 330, 4, { scenic: true, strength: 0.88, size: [32, 30] });

            // Volta 2: tráfego maior, combinações e mudanças de decisão.
            this.add('cone', 2, 240, 1, { strength: 0.58, size: [32, 38] });
            this.add('cone', 2, 240, 2, { strength: 0.58, size: [32, 38] });
            this.add('hurdle', 2, 470, 4, { jumpable: true, strength: 0.44, size: [54, 42] });
            this.add('hurdle', 2, 470, 5, { jumpable: true, strength: 0.44, size: [54, 42] });
            this.add('cart', 2, 760, 3, { mobile: true, crossing: true, strength: 0.42, size: [52, 42] });
            this.add('sponge', 2, 1030, 6, { strength: 0.72, size: [30, 23] });
            this.add('zigzag', 2, 1280, 2, { mobile: true, mobileSpeed: 3.15, zigzag: true, strength: 0.6, size: [36, 48] });
            this.add('rolling', 2, 1570, 5, { mobile: true, mobileSpeed: 1.65, strength: 0.38, size: [56, 42] });
            this.add('tape', 2, 1810, 3, { scenic: true, strength: 0.9, size: [70, 36] });
            this.add('puddle', 2, 2030, 0, { jumpable: true, strength: 0.45, size: [72, 36] });
            this.add('puddle', 2, 2030, 1, { jumpable: true, strength: 0.45, size: [72, 36] });
            this.add('robot', 2, 2320, 4, { mobile: true, mobileSpeed: 2.0, crossing: true, strength: 0.5, size: [42, 40] });
            this.add('barricade', 2, 2540, 6, { strength: 0.4, size: [58, 40] });
            this.add('barricade', 2, 2540, 7, { strength: 0.4, size: [58, 40] });
            this.add('pigeon', 2, L - 250, 2, { scenic: true, strength: 0.88, size: [32, 30] });
        }

        update(dt, game) {
            const step = dt * 60;
            for (const item of this.items) {
                const playerDistance = Math.abs(item.absProgress - game.player.progress);
                // Obstáculos móveis entram em ação quando o pelotão se aproxima;
                // assim itens da volta 2 não atravessam a pista antes de serem vistos.
                if (item.mobile && item.mobileSpeed && playerDistance < 720) item.absProgress += item.mobileSpeed * step;
                if (item.zigzag) {
                    item.laneVisual = clamp(item.lane + Math.sin(game.clock * 2.4 + item.baseS) * 1.35, 0, this.track.lanes - 1);
                } else if (item.crossing) {
                    item.laneVisual = clamp(item.lane + Math.sin(game.clock * 1.35 + item.baseS) * 2.2, 0, this.track.lanes - 1);
                } else {
                    item.laneVisual = item.lane;
                }
                if (Math.abs(item.absProgress - game.player.progress) < 360) {
                    this.typesSeen.add(item.type);
                    if (item.mobile) this.mobileSeen = true;
                }
            }
        }

        nearestThreat(runner, distance = 115) {
            let result = null;
            let nearest = distance;
            for (const item of this.items) {
                const ahead = item.absProgress - runner.progress;
                if (ahead > 0 && ahead < nearest && Math.abs(item.laneVisual - runner.targetLane) < 0.6) {
                    nearest = ahead;
                    result = item;
                }
            }
            return result;
        }

        collideRunner(runner, game) {
            for (const item of this.items) {
                if (runner.hitObstacles.has(item.id)) continue;
                const along = Math.abs(item.absProgress - runner.progress);
                if (along > 19 || Math.abs(item.laneVisual - runner.laneVisual) > 0.48) continue;
                runner.hitObstacles.add(item.id);
                if (item.jumpable && runner.z > 19) {
                    if (runner.isPlayer) game.score += 120;
                    continue;
                }
                if (item.type === 'pigeon') {
                    if (runner.isPlayer) game.distractionTimer = 54;
                    continue;
                }
                if (item.type === 'tape') {
                    if (runner.isPlayer) game.distractionTimer = 36;
                    continue;
                }
                runner.stumble(item.strength);
                this.hitCount++;
                if (runner.isPlayer) {
                    this.playerHitCount++;
                    game.score = Math.max(0, game.score - 80);
                    game.impactFlash = 12;
                }
            }
        }

        draw(context, game) {
            for (const item of this.items) {
                if (Math.abs(item.absProgress - game.player.progress) > 540) continue;
                const localProgress = wrap(item.absProgress, this.track.length);
                const point = this.track.point(localProgress, item.laneVisual);
                const [width, height] = item.size;
                this.atlas.drawObstacle(context, item.type, point.x, point.y + 4, width, height);
            }
        }
    }

    class CorridaMaratonaGame {
        constructor() {
            this.qaMode = new URLSearchParams(window.location.search).get('raceqa') || '';
            this.qaPrepared = false;
            this.atlas = new SpriteAtlas();
            this.track = new RaceTrack();
            this.totalLaps = 2;
            this.runners = [];
            this.player = null;
            this.obstacles = null;
            this.phase = 'LOADING';
            this.clock = 0;
            this.lastTime = performance.now();
            this.countdown = 3;
            this.countdownGoTimer = 0;
            this.score = 0;
            this.distractionTimer = 0;
            this.impactFlash = 0;
            this.camera = { x: 0, y: 0 };
            this.finishers = [];
            this.finalRanking = [];
            this.directionHistory = new Set();
            this.laneChanges = 0;
            this.jumps = 0;
            this.restartCount = 0;
            this.assetsReported = false;
            this.setupInput();
            this.reset();
        }

        setupInput() {
            window.addEventListener('keydown', (event) => {
                if (typeof currentScene === 'undefined' || currentScene !== 'JOGO_CORRIDA') return;
                const key = event.key.toLowerCase();
                if ([' ', 'arrowleft', 'arrowright', 'a', 'd', 'escape', 'r'].includes(key)) event.preventDefault();
                if (event.repeat && key !== ' ') return;
                if (key === 'escape') {
                    currentScene = 'ILHA_CORRIDA';
                    this.phase = 'PAUSED';
                    this.setPresentation(false);
                    return;
                }
                if (this.phase === 'READY' && (key === ' ' || key === 'enter')) {
                    this.startCountdown();
                    return;
                }
                if (this.phase === 'RESULT' && (key === ' ' || key === 'r')) {
                    this.restartCount++;
                    this.reset();
                    this.startCountdown();
                    return;
                }
                if (this.phase !== 'RACING') return;
                const point = this.track.point(this.player.progress, this.player.laneVisual);
                if (key === 'a' || key === 'arrowleft') {
                    if (this.player.changeLane(-1, point.onCurve)) this.laneChanges++;
                } else if (key === 'd' || key === 'arrowright') {
                    if (this.player.changeLane(1, point.onCurve)) this.laneChanges++;
                } else if (key === ' ') {
                    if (this.player.jump()) this.jumps++;
                }
            }, { passive: false });
        }

        makeRunners() {
            const shared = { trackLength: this.track.length, totalLanes: this.track.lanes, acceleration: 1.25, minSpeed: 1.4 };
            this.player = new Runner({
                ...shared, id: 'zorp', name: 'ZORP', kind: 'zorp', isPlayer: true,
                lane: 3, progress: 0, maxSpeed: 5.65, color: '#7cff55'
            });
            const rivals = [
                { id: 'mestre', name: 'MESTRE', kind: 'mestre', lane: 2, maxSpeed: 5.5, skill: 0.94, color: '#ff8b32' },
                { id: 'cobalto', name: 'COBALTO', kind: 'competitor', group: { band: 'robot', column: 0 }, lane: 0, maxSpeed: 5.12, skill: 0.82 },
                { id: 'ferrugem', name: 'FERRUGEM', kind: 'competitor', group: { band: 'robot', column: 1 }, lane: 5, maxSpeed: 5.25, skill: 0.76 },
                { id: 'lina', name: 'LINA', kind: 'competitor', group: { band: 'human', column: 1 }, lane: 1, maxSpeed: 5.05, skill: 0.86 },
                { id: 'kai', name: 'KAI', kind: 'competitor', group: { band: 'human', column: 2 }, lane: 6, maxSpeed: 5.32, skill: 0.79 },
                { id: 'axol', name: 'AXOL', kind: 'competitor', group: { band: 'monster', column: 1 }, lane: 4, maxSpeed: 4.96, skill: 0.72 },
                { id: 'nox', name: 'NOX', kind: 'competitor', group: { band: 'monster', column: 2 }, lane: 7, maxSpeed: 5.18, skill: 0.75 }
            ].map((data, index) => new Runner({
                ...shared, ...data, progress: -index * 2.5, isPlayer: false,
                acceleration: 0.9 + data.skill * 0.35, minSpeed: 1.35,
                aiThink: 0.2 + index * 0.07, aiBias: index % 2 ? 1 : -1
            }));
            this.runners = [this.player, ...rivals];
        }

        reset() {
            this.makeRunners();
            this.obstacles = new ObstacleDirector(this.track, this.atlas);
            this.phase = this.atlas.ready ? 'READY' : 'LOADING';
            this.clock = 0;
            this.lastTime = performance.now();
            this.countdown = 3;
            this.countdownGoTimer = 0;
            this.score = 0;
            this.distractionTimer = 0;
            this.impactFlash = 0;
            this.finishers = [];
            this.finalRanking = [];
            this.directionHistory = new Set();
            this.laneChanges = 0;
            this.jumps = 0;
            const start = this.track.point(30, this.player.lane);
            this.camera.x = start.x;
            this.camera.y = start.y;
            if (typeof dialogBox !== 'undefined') dialogBox.classList.remove('show');
        }

        setPresentation(active) {
            const header = document.getElementById('header-ui');
            if (header) header.style.display = active ? 'none' : '';
        }

        startCountdown() {
            if (!this.atlas.ready || this.atlas.failed > 0) return;
            this.phase = 'COUNTDOWN';
            this.countdown = 3;
            this.countdownGoTimer = 0;
            for (const runner of this.runners) runner.state = 'READY';
        }

        updateAI(runner, dt) {
            runner.aiThink -= dt;
            if (runner.aiThink > 0 || runner.finished) return;
            runner.aiThink = 0.18 + Math.random() * 0.18;
            const point = this.track.point(runner.progress, runner.laneVisual);
            const threat = this.obstacles.nearestThreat(runner, 105 + runner.skill * 35);
            if (threat) {
                const reacts = Math.random() < runner.skill;
                if (reacts && threat.jumpable && threat.absProgress - runner.progress < 65) {
                    runner.jump();
                } else if (reacts) {
                    const inwardFree = runner.targetLane > 0 && !this.laneThreatened(runner, runner.targetLane - 1, 80);
                    const outwardFree = runner.targetLane < this.track.lanes - 1 && !this.laneThreatened(runner, runner.targetLane + 1, 80);
                    if (inwardFree) runner.changeLane(-1, point.onCurve);
                    else if (outwardFree) runner.changeLane(1, point.onCurve);
                }
            } else if (!point.onCurve && Math.random() < 0.08) {
                runner.changeLane(runner.aiBias, false);
                runner.aiBias *= -1;
            } else if (point.onCurve && runner.targetLane > 1 && Math.random() < 0.22) {
                runner.changeLane(-1, true);
            }
        }

        laneThreatened(runner, lane, range) {
            return this.obstacles.items.some((item) => {
                const ahead = item.absProgress - runner.progress;
                return ahead > 0 && ahead < range && Math.abs(item.laneVisual - lane) < 0.55;
            });
        }

        update() {
            const now = performance.now();
            const dt = clamp((now - this.lastTime) / 1000, 0, 1 / 20);
            this.lastTime = now;
            this.clock += dt;
            this.setPresentation(true);

            if (this.phase === 'LOADING' && this.atlas.ready) {
                this.phase = this.atlas.failed ? 'ASSET_ERROR' : 'READY';
            }

            if (typeof hintText !== 'undefined') {
                hintText.innerText = this.phase === 'RACING'
                    ? '[A/D ou ←/→] TROCAR RAIA  |  [ESPAÇO] PULAR  |  [ESC] SAIR'
                    : '[ESPAÇO] COMEÇAR / REINICIAR  |  [ESC] SAIR';
            }

            if (this.phase === 'COUNTDOWN') {
                this.countdown -= dt;
                if (this.countdown <= 0) {
                    this.phase = 'RACING';
                    this.countdownGoTimer = 50;
                    for (const runner of this.runners) runner.state = 'RUN';
                }
            }

            const raceRunning = this.phase === 'RACING';
            if (raceRunning) {
                this.countdownGoTimer = Math.max(0, this.countdownGoTimer - dt * 60);
                this.obstacles.update(dt, this);
                for (const runner of this.runners) {
                    const pointBefore = this.track.point(runner.progress, runner.laneVisual);
                    if (!runner.isPlayer) this.updateAI(runner, dt);
                    runner.updatePhysics(dt, pointBefore, true);
                    this.obstacles.collideRunner(runner, this);
                    if (!runner.finished && runner.progress >= this.totalLaps * this.track.length) {
                        runner.finished = true;
                        runner.finishOrder = this.finishers.length + 1;
                        runner.state = runner.isPlayer ? 'RUN' : 'RUN';
                        this.finishers.push(runner);
                        if (runner.isPlayer) this.finishRace();
                    }
                }
                this.score += dt * 4;
            } else {
                for (const runner of this.runners) {
                    const point = this.track.point(runner.progress, runner.laneVisual);
                    runner.updatePhysics(dt, point, false);
                }
            }

            const playerPoint = this.track.point(this.player.progress, this.player.laneVisual);
            this.directionHistory.add(playerPoint.direction);
            const aheadPoint = this.track.point(this.player.progress + 115, this.player.laneVisual);
            const targetX = lerp(playerPoint.x, aheadPoint.x, 0.38);
            const targetY = lerp(playerPoint.y, aheadPoint.y, 0.38);
            this.camera.x = lerp(this.camera.x, targetX, clamp(dt * 4.5, 0, 1));
            this.camera.y = lerp(this.camera.y, targetY, clamp(dt * 4.5, 0, 1));
            this.distractionTimer = Math.max(0, this.distractionTimer - dt * 60);
            this.impactFlash = Math.max(0, this.impactFlash - dt * 60);

            const scoreElement = document.getElementById('score-val');
            if (scoreElement) scoreElement.textContent = String(Math.floor(this.score));

            if (this.qaMode === 'autoplay') this.qaAutopilotStep();
            if (this.qaMode === 'defeat') {
                this.player.maxSpeed = 4.35;
                if (this.phase === 'READY') this.startCountdown();
                if (this.phase === 'COUNTDOWN') this.countdown = 0;
            }
            if (this.qaMode === 'curve' && !this.qaPrepared && this.phase === 'READY') {
                this.qaPrepared = true;
                this.phase = 'RACING';
                this.player.progress = this.track.straight + this.track.curveLength * 0.42;
                this.player.speed = this.player.maxSpeed;
                this.runners.forEach((runner, index) => {
                    runner.state = 'RUN';
                    if (!runner.isPlayer) runner.progress = this.player.progress - 35 - index * 12;
                });
            }
            canvas.dataset.raceDiagnostics = JSON.stringify(this.diagnostics());
        }

        finishRace() {
            const unfinished = this.runners.filter((runner) => !runner.finished)
                .sort((a, b) => b.progress - a.progress);
            this.finalRanking = [...this.finishers, ...unfinished];
            this.phase = 'RESULT';
            const won = this.player.finishOrder === 1;
            this.player.state = won ? 'VICTORY' : 'DEFEATED';
            this.player.stateTimer = Infinity;
            const mestre = this.runners.find((runner) => runner.kind === 'mestre');
            mestre.state = won ? 'DEFEATED' : (mestre.finishOrder === 1 ? 'VICTORY' : 'DEFEATED');
            mestre.stateTimer = Infinity;
            if (won && typeof insignias !== 'undefined') insignias.corrida = true;
        }

        currentRanking() {
            return [...this.runners].sort((a, b) => {
                if (a.finished && b.finished) return a.finishOrder - b.finishOrder;
                if (a.finished) return -1;
                if (b.finished) return 1;
                return b.progress - a.progress;
            });
        }

        drawRunner(context, runner) {
            const point = this.track.point(runner.progress, runner.laneVisual);
            const shadowScale = 1 - clamp(runner.z / 75, 0, 0.45);
            context.save();
            context.fillStyle = 'rgba(0,0,0,.28)';
            context.beginPath();
            context.ellipse(point.x, point.y + 3, 14 * shadowScale, 5 * shadowScale, 0, 0, TAU);
            context.fill();

            const action = runner.state;
            const direction = point.direction;
            const size = runner.kind === 'mestre' ? [48, 57] : runner.kind === 'zorp' ? [45, 54] : [39, 49];
            const drawY = point.y - runner.z;
            let drawn = false;
            if (runner.kind === 'zorp' || runner.kind === 'mestre') {
                drawn = this.atlas.drawHero(context, runner.kind, action, direction, runner.animTime, point.x, drawY, size[0], size[1]);
            } else {
                drawn = this.atlas.drawCompetitor(context, runner.group, direction, runner.animTime, point.x, drawY, size[0], size[1], action);
            }
            if (!drawn) {
                context.fillStyle = runner.color || '#dcecff';
                context.beginPath();
                context.arc(point.x, drawY - 18, 13, 0, TAU);
                context.fill();
            }
            if (runner.isPlayer) {
                context.fillStyle = '#7cff55';
                context.beginPath();
                context.moveTo(point.x, drawY - size[1] - 9);
                context.lineTo(point.x - 6, drawY - size[1] - 18);
                context.lineTo(point.x + 6, drawY - size[1] - 18);
                context.closePath();
                context.fill();
            }
            context.restore();
        }

        drawWorld() {
            ctx.save();
            ctx.translate(canvas.width / 2 - this.camera.x, canvas.height / 2 - this.camera.y);
            this.track.draw(ctx, this.clock * 60);
            this.obstacles.draw(ctx, this);
            const sorted = [...this.runners].sort((a, b) => {
                const pa = this.track.point(a.progress, a.laneVisual);
                const pb = this.track.point(b.progress, b.laneVisual);
                return pa.y - pb.y;
            });
            for (const runner of sorted) this.drawRunner(ctx, runner);
            ctx.restore();
        }

        drawHud() {
            const ranking = this.currentRanking();
            const place = ranking.indexOf(this.player) + 1;
            const progress = clamp(this.player.progress / (this.totalLaps * this.track.length), 0, 1);
            const lap = Math.min(this.totalLaps, Math.floor(Math.max(0, this.player.progress) / this.track.length) + 1);

            ctx.save();
            ctx.fillStyle = 'rgba(5,12,24,.82)';
            ctx.fillRect(8, 8, 132, 54);
            ctx.strokeStyle = '#6de6ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(8, 8, 132, 54);
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(`${place}º / ${this.runners.length}`, 17, 28);
            ctx.fillText(`VOLTA ${lap}/${this.totalLaps}`, 17, 48);

            ctx.fillStyle = 'rgba(5,12,24,.82)';
            ctx.fillRect(151, 8, 291, 26);
            ctx.fillStyle = '#26384f';
            ctx.fillRect(160, 17, 271, 8);
            const gradient = ctx.createLinearGradient(160, 0, 431, 0);
            gradient.addColorStop(0, '#69ff8f');
            gradient.addColorStop(1, '#ffe65c');
            ctx.fillStyle = gradient;
            ctx.fillRect(160, 17, 271 * progress, 8);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(160, 17, 271, 8);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PROGRESSO', 296, 14);

            ctx.fillStyle = 'rgba(5,12,24,.78)';
            ctx.fillRect(333, 42, 109, 20);
            ctx.fillStyle = '#9eeaff';
            ctx.textAlign = 'right';
            ctx.fillText(`RITMO ${Math.round(this.player.speed / this.player.maxSpeed * 100)}%`, 433, 56);
            ctx.restore();
        }

        drawOverlay() {
            ctx.save();
            ctx.textAlign = 'center';
            if (this.phase === 'LOADING') {
                ctx.fillStyle = 'rgba(2,8,18,.78)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px monospace';
                ctx.fillText('PREPARANDO A PISTA...', canvas.width / 2, 145);
            } else if (this.phase === 'ASSET_ERROR') {
                ctx.fillStyle = 'rgba(42,5,5,.9)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ff9b9b';
                ctx.font = 'bold 13px monospace';
                ctx.fillText('ERRO AO CARREGAR SPRITES DA CORRIDA', canvas.width / 2, 140);
            } else if (this.phase === 'READY') {
                ctx.fillStyle = 'rgba(2,8,18,.72)';
                ctx.fillRect(32, 72, canvas.width - 64, 152);
                ctx.strokeStyle = '#65e7ff';
                ctx.lineWidth = 3;
                ctx.strokeRect(32, 72, canvas.width - 64, 152);
                ctx.fillStyle = '#ffe56c';
                ctx.font = 'bold 22px monospace';
                ctx.fillText('MARATONA GALÁCTICA', canvas.width / 2, 106);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px monospace';
                ctx.fillText('2 VOLTAS • 8 CORREDORES • 1 CAMPEÃO', canvas.width / 2, 133);
                ctx.fillText('[A/D ou ←/→] TROCAR RAIA', canvas.width / 2, 160);
                ctx.fillText('[ESPAÇO] PULAR BARREIRAS', canvas.width / 2, 179);
                ctx.fillStyle = '#7cff8a';
                ctx.fillText('PRESSIONE [ESPAÇO] PARA LARGAR', canvas.width / 2, 207);
            } else if (this.phase === 'COUNTDOWN') {
                const value = Math.max(1, Math.ceil(this.countdown));
                ctx.fillStyle = 'rgba(0,0,0,.36)';
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, 44, 0, TAU);
                ctx.fill();
                ctx.fillStyle = '#fff36a';
                ctx.font = 'bold 48px monospace';
                ctx.fillText(String(value), canvas.width / 2, canvas.height / 2 + 17);
            } else if (this.phase === 'RACING' && this.countdownGoTimer > 0) {
                ctx.fillStyle = '#7cff8a';
                ctx.font = 'bold 34px monospace';
                ctx.fillText('VAI!', canvas.width / 2, 92);
            } else if (this.phase === 'RESULT') {
                const won = this.player.finishOrder === 1;
                ctx.fillStyle = 'rgba(2,8,18,.88)';
                ctx.fillRect(24, 34, canvas.width - 48, 236);
                ctx.strokeStyle = won ? '#ffe45e' : '#ff758a';
                ctx.lineWidth = 3;
                ctx.strokeRect(24, 34, canvas.width - 48, 236);
                ctx.fillStyle = won ? '#ffe45e' : '#ff8da0';
                ctx.font = 'bold 24px monospace';
                ctx.fillText(won ? 'VITÓRIA!' : `${this.player.finishOrder}º LUGAR`, canvas.width / 2, 70);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px monospace';
                const top = this.finalRanking.slice(0, 5);
                top.forEach((runner, index) => {
                    const marker = runner.isPlayer ? '  ◀ ZORP' : `  ${runner.name}`;
                    ctx.fillStyle = index === 0 ? '#ffe45e' : runner.isPlayer ? '#7cff8a' : '#dcecff';
                    ctx.fillText(`${index + 1}º${marker}`, canvas.width / 2, 99 + index * 22);
                });
                ctx.fillStyle = '#9eeaff';
                ctx.fillText(`[ESPAÇO/R] REINICIAR  •  [ESC] SAIR`, canvas.width / 2, 245);
            }

            if (this.distractionTimer > 0) {
                ctx.globalAlpha = clamp(this.distractionTimer / 30, 0.25, 0.8);
                for (let i = 0; i < 4; i++) {
                    const x = 80 + ((i * 113 + this.clock * 180) % 360);
                    const y = 65 + Math.sin(this.clock * 5 + i) * 30 + i * 27;
                    this.atlas.drawObstacle(ctx, 'pigeon', x, y, 45, 38, 0.72);
                }
                ctx.globalAlpha = 1;
            }
            if (this.impactFlash > 0) {
                ctx.fillStyle = `rgba(255,80,65,${this.impactFlash / 60})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.restore();
        }

        draw() {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#0d402b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            this.drawWorld();
            if (this.phase !== 'LOADING' && this.phase !== 'ASSET_ERROR') this.drawHud();
            this.drawOverlay();
            ctx.restore();
        }

        diagnostics() {
            const playerPoint = this.track.point(this.player.progress, this.player.laneVisual);
            return {
                phase: this.phase,
                assetsLoaded: this.atlas.loaded,
                assetFailures: this.atlas.failed,
                invalidDrawCalls: this.atlas.invalidDrawCalls,
                runners: this.runners.length,
                commonOpponents: this.runners.filter((runner) => runner.kind === 'competitor').length,
                obstacleCount: this.obstacles.items.length,
                obstacleTypes: [...new Set(this.obstacles.items.map((item) => item.type))],
                obstacleTypesSeen: [...this.obstacles.typesSeen],
                mobileObstacleSeen: this.obstacles.mobileSeen,
                playerHits: this.obstacles.playerHitCount,
                totalObstacleCollisions: this.obstacles.hitCount,
                directionsSeen: [...this.directionHistory],
                laneChanges: this.laneChanges,
                jumps: this.jumps,
                restartCount: this.restartCount,
                currentLap: this.player.lap,
                place: this.currentRanking().indexOf(this.player) + 1,
                finishOrder: this.player.finishOrder,
                playerSpeed: Number(this.player.speed.toFixed(3)),
                playerMaxSpeed: this.player.maxSpeed,
                playerLane: Number(this.player.laneVisual.toFixed(2)),
                trackSegment: playerPoint.segment,
                curvePenalty: Number(this.player.curvePenalty.toFixed(3)),
                trackDirection: 'COUNTER_CLOCKWISE',
                curveModel: 'inner-lane efficiency + lane-change rhythm penalty'
            };
        }

        // Gancho de QA: acelera a simulação sem alterar as regras usadas no jogo.
        qaAutopilotStep() {
            if (this.phase === 'READY') this.startCountdown();
            if (this.phase === 'COUNTDOWN') this.countdown = 0;
            if (this.phase !== 'RACING') return;
            const point = this.track.point(this.player.progress, this.player.laneVisual);
            const threat = this.obstacles.nearestThreat(this.player, 125);
            if (threat) {
                if (threat.jumpable && threat.absProgress - this.player.progress < 68) {
                    if (this.player.jump()) this.jumps++;
                }
                else {
                    const inward = this.player.targetLane > 0 && !this.laneThreatened(this.player, this.player.targetLane - 1, 90);
                    const outward = this.player.targetLane < this.track.lanes - 1 && !this.laneThreatened(this.player, this.player.targetLane + 1, 90);
                    if (inward) {
                        if (this.player.changeLane(-1, point.onCurve)) this.laneChanges++;
                    } else if (outward) {
                        if (this.player.changeLane(1, point.onCurve)) this.laneChanges++;
                    } else if (threat.jumpable && this.player.jump()) this.jumps++;
                }
            }
        }
    }

    const corridaMaratona = new CorridaMaratonaGame();
    window.corridaMaratona = corridaMaratona;
    window.resetCorridaMaratona = function () { corridaMaratona.reset(); corridaMaratona.setPresentation(true); };
    window.updateCorridaMaratona = function () { corridaMaratona.update(); };
    window.drawCorridaMaratona = function () { corridaMaratona.draw(); };
    window.getCorridaMaratonaDiagnostics = function () { return corridaMaratona.diagnostics(); };
    // Entrada isolada para a página de QA local; não interfere no fluxo normal da ilha.
    if (corridaMaratona.qaMode && typeof currentScene !== 'undefined') {
        currentScene = 'JOGO_CORRIDA';
        corridaMaratona.reset();
    }
})();
