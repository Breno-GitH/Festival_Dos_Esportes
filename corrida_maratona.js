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
            this.straight = 1900;
            this.innerRadius = 350;
            this.laneWidth = 30;
            this.lanes = 8;
            this.referenceRadius = this.innerRadius + this.laneWidth * 3.5;
            this.trackWidth = this.laneWidth * this.lanes;
            this.halfTrackWidth = this.trackWidth / 2;
            this.outerRadius = this.innerRadius + this.trackWidth;
            this.curveLength = Math.PI * this.referenceRadius;
            this.length = this.straight * 2 + this.curveLength * 2;
            this.halfStraight = this.straight / 2;
            this.gateCount = 8;
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

        tangent(progress) {
            const before = this.point(progress - 2, 3.5);
            const after = this.point(progress + 2, 3.5);
            const dx = after.x - before.x;
            const dy = after.y - before.y;
            const length = Math.hypot(dx, dy) || 1;
            return { x: dx / length, y: dy / length };
        }

        pointOffset(progress, lateral = 0) {
            const center = this.point(progress, 3.5);
            const tangent = this.tangent(progress);
            return {
                x: center.x - tangent.y * lateral,
                y: center.y + tangent.x * lateral,
                direction: center.direction,
                segment: center.segment,
                onCurve: center.onCurve,
                tangent
            };
        }

        project(x, y) {
            // A pista é uma cápsula. A busca amostrada é estável em todas as
            // junções reta/curva e barata o bastante para um corredor livre.
            const samples = 320;
            let bestProgress = 0;
            let bestDistanceSq = Infinity;
            for (let i = 0; i < samples; i++) {
                const progress = this.length * i / samples;
                const point = this.point(progress, 3.5);
                const dx = x - point.x;
                const dy = y - point.y;
                const distanceSq = dx * dx + dy * dy;
                if (distanceSq < bestDistanceSq) {
                    bestDistanceSq = distanceSq;
                    bestProgress = progress;
                }
            }
            // Refina localmente sem introduzir snapping na posição real.
            let stride = this.length / samples;
            for (let pass = 0; pass < 5; pass++) {
                let chosen = bestProgress;
                for (const candidate of [bestProgress - stride, bestProgress, bestProgress + stride]) {
                    const point = this.point(candidate, 3.5);
                    const dx = x - point.x;
                    const dy = y - point.y;
                    const distanceSq = dx * dx + dy * dy;
                    if (distanceSq < bestDistanceSq) {
                        bestDistanceSq = distanceSq;
                        chosen = wrap(candidate, this.length);
                    }
                }
                bestProgress = chosen;
                stride *= 0.5;
            }
            const center = this.point(bestProgress, 3.5);
            const tangent = this.tangent(bestProgress);
            const normal = { x: -tangent.y, y: tangent.x };
            const offsetX = x - center.x;
            const offsetY = y - center.y;
            const lateral = offsetX * normal.x + offsetY * normal.y;
            const distance = Math.sqrt(bestDistanceSq);
            return {
                progress: wrap(bestProgress, this.length),
                distance,
                lateral,
                tangent,
                onTrack: distance <= this.halfTrackWidth + 7,
                onGrass: lateral < -this.halfTrackWidth,
                outside: lateral > this.halfTrackWidth
            };
        }

        circularDistance(a, b) {
            let delta = wrap(a - b, this.length);
            if (delta > this.length / 2) delta -= this.length;
            return delta;
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
            const worldHalfWidth = this.halfStraight + this.outerRadius + 360;
            const worldHalfHeight = this.outerRadius + 360;
            context.fillStyle = '#155c38';
            context.fillRect(-worldHalfWidth, -worldHalfHeight, worldHalfWidth * 2, worldHalfHeight * 2);

            context.fillStyle = '#1f7044';
            for (let x = -worldHalfWidth; x < worldHalfWidth; x += 70) {
                for (let y = -worldHalfHeight; y < worldHalfHeight; y += 70) {
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
            context.fillRect(-650, -105, 1300, 210);
            context.fillStyle = '#d8f2dd';
            context.font = 'bold 24px monospace';
            context.textAlign = 'center';
            context.globalAlpha = 0.45 + Math.sin(pulse * 0.03) * 0.08;
            context.fillText('FESTIVAL GALÁCTICO', 0, 8);
            context.globalAlpha = 1;

            // Arquibancadas simples fora da pista.
            context.fillStyle = '#263449';
            context.fillRect(-760, -this.outerRadius - 125, 1520, 70);
            context.fillRect(-760, this.outerRadius + 55, 1520, 70);
            context.fillStyle = '#88a4bb';
            for (let x = -740; x < 740; x += 32) {
                context.fillRect(x, -this.outerRadius - 105, 16, 6);
                context.fillRect(x + 10, this.outerRadius + 82, 16, 6);
            }
            context.restore();
        }
    }

    class Runner {
        constructor(options) {
            Object.assign(this, options);
            this.progress = options.progress || 0;
            this.speed = 0;
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.vx = 0;
            this.vy = 0;
            this.inputX = 0;
            this.inputY = 0;
            this.z = 0;
            this.vz = 0;
            this.state = 'READY';
            this.stateTimer = 0;
            this.animTime = 0;
            this.finished = false;
            this.finishOrder = 0;
            this.hitObstacles = new Set();
            this.lastDirection = 'RIGHT';
            this.directionAxis = 'HORIZONTAL';
            this.validatedLaps = 0;
            this.nextGate = 1;
            this.trackProjection = null;
            this.offTrack = false;
            this.turnPenalty = 0;
            this.contactCooldown = 0;
            this.preferredOffset = options.preferredOffset || 0;
            this.targetOffset = this.preferredOffset;
            this.avoidanceX = 0;
            this.avoidanceY = 0;
            this.aiDecisionTimer = 0;
            this.overtakeIntent = 0;
        }

        get lap() {
            return Math.min(2, this.validatedLaps + 1);
        }

        jump() {
            if (this.finished || this.state === 'STUMBLE' || this.z > 0.5) return false;
            this.vz = 7.9;
            this.z = 0.1;
            this.state = 'JUMP';
            this.stateTimer = 0;
            return true;
        }

        setInput(x, y) {
            const magnitude = Math.hypot(x, y);
            this.inputX = magnitude > 1 ? x / magnitude : x;
            this.inputY = magnitude > 1 ? y / magnitude : y;
        }

        chooseDirection() {
            const absX = Math.abs(this.vx);
            const absY = Math.abs(this.vy);
            const magnitude = Math.hypot(this.vx, this.vy);
            if (magnitude < 12) return this.lastDirection;
            const hysteresis = Math.max(12, magnitude * 0.14);
            if (this.directionAxis === 'HORIZONTAL') {
                if (absY > absX + hysteresis) this.directionAxis = 'VERTICAL';
            } else if (absX > absY + hysteresis) {
                this.directionAxis = 'HORIZONTAL';
            }
            this.lastDirection = this.directionAxis === 'HORIZONTAL'
                ? (this.vx >= 0 ? 'RIGHT' : 'LEFT')
                : (this.vy >= 0 ? 'DOWN' : 'UP');
            return this.lastDirection;
        }

        stumble(strength = 0.52) {
            if (this.state === 'STUMBLE' && this.stateTimer > 12) return;
            this.speed = Math.max(this.minSpeed * 0.55, this.speed * strength);
            this.state = 'STUMBLE';
            this.stateTimer = 48;
            this.z = 0;
            this.vz = 0;
            this.vx *= strength;
            this.vy *= strength;
        }

        lightSlip(strength = 0.78) {
            this.vx *= strength;
            this.vy *= strength;
            this.speed = Math.hypot(this.vx, this.vy);
            this.state = 'STUMBLE';
            this.stateTimer = 9;
        }

        updateFreePhysics(dt, track, raceRunning) {
            const step = dt * 60;
            this.animTime += step * (0.12 + this.speed * 0.0018);
            this.contactCooldown = Math.max(0, this.contactCooldown - dt);
            this.turnPenalty = Math.max(0, this.turnPenalty - dt * 1.4);

            if (this.stateTimer > 0 && Number.isFinite(this.stateTimer)) {
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

            if (!raceRunning || this.finished) {
                const restDrag = Math.exp(-dt * 5.5);
                this.vx *= restDrag;
                this.vy *= restDrag;
                this.speed = Math.hypot(this.vx, this.vy);
                this.chooseDirection();
                return;
            }

            const projection = track.project(this.x, this.y);
            this.trackProjection = projection;
            this.offTrack = !projection.onTrack;
            const inputMagnitude = Math.hypot(this.inputX, this.inputY);
            const previousSpeed = Math.hypot(this.vx, this.vy);
            const previousDirectionX = previousSpeed > 0.01 ? this.vx / previousSpeed : 0;
            const previousDirectionY = previousSpeed > 0.01 ? this.vy / previousSpeed : 0;
            const terrainFactor = projection.onTrack ? 1 : projection.onGrass ? 0.42 : 0.55;
            const curveFactor = projection.onTrack && this.curveEfficiency &&
                track.point(projection.progress, 3.5).onCurve
                ? this.curveEfficiency
                : 1;
            const targetMax = this.maxSpeed * terrainFactor * curveFactor;

            if (inputMagnitude > 0.05 && this.state !== 'STUMBLE') {
                const desiredX = this.inputX * targetMax;
                const desiredY = this.inputY * targetMax;
                const steering = projection.onTrack ? (this.steeringResponse || 7.2) : 5.0;
                const blend = 1 - Math.exp(-steering * dt);
                this.vx = lerp(this.vx, desiredX, blend);
                this.vy = lerp(this.vy, desiredY, blend);

                const nextSpeed = Math.hypot(this.vx, this.vy);
                if (previousSpeed > 70 && nextSpeed > 1) {
                    const nextDirectionX = this.vx / nextSpeed;
                    const nextDirectionY = this.vy / nextSpeed;
                    const dot = clamp(previousDirectionX * nextDirectionX + previousDirectionY * nextDirectionY, -1, 1);
                    const turnAngle = Math.acos(dot);
                    const aggressiveTurn = clamp((turnAngle - 0.025) / 0.42, 0, 1);
                    if (aggressiveTurn > 0) {
                        const loss = aggressiveTurn * clamp(previousSpeed / this.maxSpeed, 0, 1) * 0.075;
                        this.vx *= 1 - loss;
                        this.vy *= 1 - loss;
                        this.turnPenalty = Math.max(this.turnPenalty, aggressiveTurn);
                    }
                }
            } else {
                // Soltar as teclas preserva um pouco de embalo, mas o corredor
                // desacelera naturalmente em vez de deslizar indefinidamente.
                const coastDrag = Math.exp(-dt * (projection.onTrack ? 1.8 : 3.6));
                this.vx *= coastDrag;
                this.vy *= coastDrag;
            }

            let speed = Math.hypot(this.vx, this.vy);
            if (speed > targetMax) {
                const reduction = Math.max(targetMax, speed - this.maxSpeed * dt * (projection.onTrack ? 0.9 : 3.2));
                const ratio = reduction / speed;
                this.vx *= ratio;
                this.vy *= ratio;
                speed = reduction;
            }
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.speed = speed;
            this.chooseDirection();
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

        add(type, lap, progress, lateral, options = {}) {
            const item = {
                id: `${type}-${lap}-${Math.round(progress)}-${Math.round(lateral)}-${this.items.length}`,
                type, lap, progress: wrap(progress, this.track.length), lateral,
                baseProgress: wrap(progress, this.track.length), baseLateral: lateral,
                x: 0, y: 0, mobile: false, pathSpeed: 0,
                crossing: false, zigzag: false, jumpable: false, lightHazard: false,
                strength: 0.65, size: [40, 42], active: true,
                flying: false, flightTimer: 0, playerScared: false,
                phase: this.items.length * 0.73,
                ...options
            };
            this.updateWorldPosition(item, 0);
            this.items.push(item);
        }

        updateWorldPosition(item, clock) {
            let lateral = item.baseLateral;
            if (item.crossing) lateral += Math.sin(clock * 1.15 + item.phase) * 112;
            if (item.zigzag) lateral += Math.sin(clock * 2.05 + item.phase) * 78;
            item.lateral = clamp(lateral, -this.track.halfTrackWidth + 16, this.track.halfTrackWidth - 16);
            const point = this.track.pointOffset(item.progress, item.lateral);
            item.x = point.x;
            item.y = point.y;
            item.direction = point.direction;
        }

        buildCourse() {
            const L = this.track.length;
            // Volta 1: hazards claros, espaçados e sempre contornáveis.
            this.add('startingBlock', 1, L * 0.08, 76, { lightHazard: true, strength: 0.82, size: [34, 26] });
            this.add('cone', 1, L * 0.15, -48, { strength: 0.62, size: [32, 38] });
            this.add('hurdle', 1, L * 0.24, -58, { jumpable: true, strength: 0.5, size: [62, 43] });
            this.add('puddle', 1, L * 0.34, 55, { jumpable: true, lightHazard: true, strength: 0.7, size: [78, 38] });
            this.add('bottle', 1, L * 0.45, -22, { lightHazard: true, strength: 0.8, size: [28, 24] });
            this.add('backmarker', 1, L * 0.57, 35, { mobile: true, pathSpeed: 165, strength: 0.78, size: [38, 50] });
            this.add('barricade', 1, L * 0.70, 68, { strength: 0.5, size: [64, 43] });
            this.add('judge', 1, L * 0.82, -62, { mobile: true, pathSpeed: 58, strength: 0.67, size: [40, 52] });
            this.add('pigeon', 1, L * 0.91, 15, { scenic: true, size: [34, 31] });

            // Volta 2: maior densidade e movimento. Os últimos 10% ficam livres
            // de bloqueios pesados para a disputa direta da reta final.
            this.add('cone', 2, L * 0.06, -72, { strength: 0.62, size: [32, 38] });
            this.add('cone', 2, L * 0.06, 4, { strength: 0.62, size: [32, 38] });
            this.add('hurdle', 2, L * 0.15, 50, { jumpable: true, strength: 0.48, size: [62, 43] });
            this.add('cart', 2, L * 0.25, 0, { mobile: true, crossing: true, pathSpeed: 42, strength: 0.48, size: [56, 44] });
            this.add('sponge', 2, L * 0.34, 72, { lightHazard: true, strength: 0.78, size: [30, 23] });
            this.add('zigzag', 2, L * 0.44, -24, { mobile: true, zigzag: true, pathSpeed: 225, strength: 0.7, size: [38, 50] });
            this.add('rolling', 2, L * 0.55, 58, { mobile: true, pathSpeed: 72, strength: 0.46, size: [60, 44] });
            this.add('tape', 2, L * 0.64, -55, { scenic: true, lightHazard: true, strength: 0.86, size: [72, 36] });
            this.add('puddle', 2, L * 0.72, 42, { jumpable: true, lightHazard: true, strength: 0.68, size: [78, 38] });
            this.add('robot', 2, L * 0.80, -18, { mobile: true, crossing: true, pathSpeed: 68, strength: 0.58, size: [44, 42] });
            this.add('pigeon', 2, L * 0.88, 38, { scenic: true, size: [34, 31] });
        }

        update(dt, game) {
            const visibleLap = Math.min(game.totalLaps, game.player.validatedLaps + 1);
            for (const item of this.items) {
                if (item.mobile && item.pathSpeed) item.progress = wrap(item.progress + item.pathSpeed * dt, this.track.length);
                this.updateWorldPosition(item, game.clock);
                if (item.type === 'pigeon') {
                    const nearest = game.runners.reduce((distance, runner) =>
                        Math.min(distance, Math.hypot(item.x - runner.x, item.y - runner.y)), Infinity);
                    if (!item.flying && item.lap === visibleLap && nearest < 125) {
                        item.flying = true;
                        item.flightTimer = 1.55;
                    }
                    if (item.flying) item.flightTimer = Math.max(0, item.flightTimer - dt);
                }
                if (item.lap === visibleLap && Math.hypot(item.x - game.player.x, item.y - game.player.y) < 470) {
                    this.typesSeen.add(item.type);
                    if (item.mobile) this.mobileSeen = true;
                }
            }
        }

        nearbyThreats(runner, forwardRange = 210) {
            const projection = runner.trackProjection || this.track.project(runner.x, runner.y);
            const currentLap = Math.min(2, runner.validatedLaps + 1);
            const forward = runner.speed > 30
                ? { x: runner.vx / runner.speed, y: runner.vy / runner.speed }
                : projection.tangent;
            const side = { x: -forward.y, y: forward.x };
            const threats = [];
            for (const item of this.items) {
                if (item.lap !== currentLap || item.type === 'pigeon') continue;
                const dx = item.x - runner.x;
                const dy = item.y - runner.y;
                const ahead = dx * forward.x + dy * forward.y;
                const lateral = dx * side.x + dy * side.y;
                if (ahead > 0 && ahead < forwardRange && Math.abs(lateral) < item.size[0] * 0.7 + 34) {
                    threats.push({ item, ahead, lateral, distance: Math.hypot(dx, dy) });
                }
            }
            return threats.sort((a, b) => a.ahead - b.ahead);
        }

        nearestThreat(runner, distance = 150) {
            return this.nearbyThreats(runner, distance)[0]?.item || null;
        }

        collideRunner(runner, game) {
            const runnerLap = Math.min(game.totalLaps, runner.validatedLaps + 1);
            for (const item of this.items) {
                if (item.lap !== runnerLap || runner.hitObstacles.has(item.id)) continue;
                const distance = Math.hypot(item.x - runner.x, item.y - runner.y);
                if (item.type === 'pigeon') {
                    if (distance < 115 && runner.isPlayer && !item.playerScared) {
                        item.playerScared = true;
                        game.distractionTimer = 32;
                    }
                    continue;
                }
                const collisionRadius = Math.max(18, item.size[0] * 0.4);
                if (distance > collisionRadius) continue;
                runner.hitObstacles.add(item.id);
                if (item.jumpable && runner.z > 19) {
                    if (runner.isPlayer) game.score += 120;
                    continue;
                }
                if (item.type === 'tape' && runner.isPlayer) game.distractionTimer = 24;
                if (item.lightHazard) runner.lightSlip(item.strength);
                else runner.stumble(item.strength);
                this.hitCount++;
                if (runner.isPlayer) {
                    this.playerHitCount++;
                    game.score = Math.max(0, game.score - (item.lightHazard ? 35 : 80));
                    game.impactFlash = item.lightHazard ? 5 : 12;
                }
            }
        }

        draw(context, game) {
            const visibleLap = Math.min(game.totalLaps, game.player.validatedLaps + 1);
            for (const item of this.items) {
                if (item.lap !== visibleLap || Math.hypot(item.x - game.camera.x, item.y - game.camera.y) > 820) continue;
                const [width, height] = item.size;
                let drawX = item.x;
                let drawY = item.y + 4;
                let alpha = 1;
                if (item.type === 'pigeon' && item.flying) {
                    const flightProgress = 1 - item.flightTimer / 1.55;
                    drawX += flightProgress * 70;
                    drawY -= Math.sin(clamp(flightProgress, 0, 1) * Math.PI) * 58 + flightProgress * 25;
                    alpha = clamp(item.flightTimer / 0.35, 0, 1);
                }
                this.atlas.drawObstacle(context, item.type, drawX, drawY, width, height, alpha);
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
            this.inputKeys = new Set();
            this.gatesPassed = 0;
            this.runnerContacts = 0;
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
                if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd', 'escape', 'r'].includes(key)) event.preventDefault();
                if (key === 'escape') {
                    currentScene = 'ILHA_CORRIDA';
                    this.phase = 'PAUSED';
                    this.inputKeys.clear();
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
                if (['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
                    this.inputKeys.add(key);
                } else if (key === ' ' && !event.repeat) {
                    if (this.player.jump()) this.jumps++;
                }
            }, { passive: false });
            window.addEventListener('keyup', (event) => {
                const key = event.key.toLowerCase();
                this.inputKeys.delete(key);
            });
            window.addEventListener('blur', () => this.inputKeys.clear());
        }

        readMovementInput() {
            const left = this.inputKeys.has('a') || this.inputKeys.has('arrowleft');
            const right = this.inputKeys.has('d') || this.inputKeys.has('arrowright');
            const up = this.inputKeys.has('w') || this.inputKeys.has('arrowup');
            const down = this.inputKeys.has('s') || this.inputKeys.has('arrowdown');
            const x = (right ? 1 : 0) - (left ? 1 : 0);
            const y = (down ? 1 : 0) - (up ? 1 : 0);
            const magnitude = Math.hypot(x, y);
            return magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
        }

        makeRunners() {
            const shared = {
                trackLength: this.track.length,
                acceleration: 1.25,
                minSpeed: 70,
                steeringResponse: 7.2,
                curveEfficiency: 0.95,
                avoidanceSkill: 0.8
            };
            this.player = new Runner({
                ...shared, id: 'zorp', name: 'ZORP', kind: 'zorp', isPlayer: true,
                progress: 38, preferredOffset: 0, maxSpeed: 340,
                curveEfficiency: 1, color: '#7cff55', profile: 'PLAYER'
            });
            const rivals = [
                { id: 'mestre', name: 'MESTRE', kind: 'mestre', profile: 'MASTER', preferredOffset: -18, maxSpeed: 334, skill: 0.94, steeringResponse: 8.15, curveEfficiency: 0.985, avoidanceSkill: 0.94, color: '#ff8b32' },
                { id: 'cobalto', name: 'COBALTO', kind: 'competitor', group: { band: 'robot', column: 0 }, profile: 'SPRINTER', preferredOffset: -82, maxSpeed: 348, skill: 0.81, steeringResponse: 6.15, curveEfficiency: 0.865, avoidanceSkill: 0.72 },
                { id: 'ferrugem', name: 'FERRUGEM', kind: 'competitor', group: { band: 'robot', column: 1 }, profile: 'AGGRESSIVE', preferredOffset: 74, maxSpeed: 331, skill: 0.78, steeringResponse: 7.25, curveEfficiency: 0.92, avoidanceSkill: 0.76 },
                { id: 'lina', name: 'LINA', kind: 'competitor', group: { band: 'human', column: 1 }, profile: 'TECHNICAL', preferredOffset: -48, maxSpeed: 319, skill: 0.87, steeringResponse: 8.35, curveEfficiency: 0.995, avoidanceSkill: 0.9 },
                { id: 'kai', name: 'KAI', kind: 'competitor', group: { band: 'human', column: 2 }, profile: 'SPRINTER', preferredOffset: 48, maxSpeed: 343, skill: 0.79, steeringResponse: 6.25, curveEfficiency: 0.87, avoidanceSkill: 0.7 },
                { id: 'axol', name: 'AXOL', kind: 'competitor', group: { band: 'monster', column: 1 }, profile: 'CAUTIOUS', preferredOffset: 12, maxSpeed: 311, skill: 0.84, steeringResponse: 7.8, curveEfficiency: 0.975, avoidanceSkill: 0.98 },
                { id: 'nox', name: 'NOX', kind: 'competitor', group: { band: 'monster', column: 2 }, profile: 'AGGRESSIVE', preferredOffset: 88, maxSpeed: 327, skill: 0.75, steeringResponse: 7.05, curveEfficiency: 0.91, avoidanceSkill: 0.74 }
            ].map((data, index) => new Runner({
                ...shared, ...data, progress: 34 - index * 4, isPlayer: false,
                acceleration: 0.9 + data.skill * 0.35,
                aiDecisionTimer: 0.08 + index * 0.035,
                phaseSeed: index * 1.37 + 0.4
            }));
            this.runners = [this.player, ...rivals];
            for (const runner of this.runners) {
                const start = this.track.pointOffset(runner.progress, runner.preferredOffset);
                runner.x = start.x;
                runner.y = start.y;
                runner.trackProjection = this.track.project(start.x, start.y);
            }
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
            this.inputKeys.clear();
            this.gatesPassed = 0;
            this.runnerContacts = 0;
            this.jumps = 0;
            this.overtakes = 0;
            this.lastPlayerPlace = this.currentRanking().indexOf(this.player) + 1;
            const start = { x: this.player.x, y: this.player.y };
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
            if (runner.finished) {
                runner.setInput(0, 0);
                return;
            }
            const projection = runner.trackProjection || this.track.project(runner.x, runner.y);
            runner.aiDecisionTimer -= dt;
            if (runner.aiDecisionTimer <= 0) {
                const decisionRate = runner.profile === 'AGGRESSIVE' ? 0.17 : runner.profile === 'CAUTIOUS' ? 0.32 : 0.24;
                runner.aiDecisionTimer = decisionRate + (1 - runner.skill) * 0.16;
                const drift = Math.sin(this.clock * (0.48 + runner.skill * 0.1) + runner.phaseSeed) *
                    (runner.profile === 'AGGRESSIVE' ? 34 : runner.profile === 'CAUTIOUS' ? 9 : 18);
                runner.targetOffset = clamp(runner.preferredOffset + drift, -98, 98);
                runner.overtakeIntent = 0;

                const nearby = this.runners.filter((other) => other !== runner && !other.finished).map((other) => {
                    const otherProjection = other.trackProjection || this.track.project(other.x, other.y);
                    return {
                        other,
                        ahead: wrap(otherProjection.progress - projection.progress, this.track.length),
                        lateralGap: otherProjection.lateral - projection.lateral,
                        distance: Math.hypot(other.x - runner.x, other.y - runner.y)
                    };
                }).filter((candidate) => candidate.ahead > 5 && candidate.ahead < 125 && candidate.distance < 145)
                    .sort((a, b) => a.ahead - b.ahead)[0];
                if (nearby) {
                    const passSide = nearby.lateralGap >= 0 ? -1 : 1;
                    const aggression = runner.profile === 'AGGRESSIVE' ? 78 : runner.profile === 'CAUTIOUS' ? 48 : 62;
                    runner.targetOffset = clamp(projection.lateral + passSide * aggression, -100, 100);
                    runner.overtakeIntent = passSide;
                }
            }

            const vision = runner.profile === 'CAUTIOUS' ? 255 : 175 + runner.avoidanceSkill * 65;
            const threat = this.obstacles.nearbyThreats(runner, vision)[0];
            let avoidance = 0;
            if (threat) {
                const reacts = Math.sin(this.clock * 2.7 + runner.phaseSeed) < runner.avoidanceSkill * 1.55 - 0.45;
                if (reacts && threat.item.jumpable && threat.ahead < 72 && runner.z <= 0.5) {
                    runner.jump();
                } else if (reacts) {
                    const side = threat.lateral >= 0 ? -1 : 1;
                    const urgency = 1 - clamp(threat.ahead / vision, 0, 1);
                    avoidance = side * (0.42 + urgency * 0.82);
                    runner.targetOffset = clamp(projection.lateral + side * (52 + urgency * 38), -101, 101);
                }
            }

            const lookAhead = clamp(86 + runner.speed * 0.28, 92, 168);
            const target = this.track.pointOffset(projection.progress + lookAhead, runner.targetOffset);
            let desiredX = target.x - runner.x;
            let desiredY = target.y - runner.y;
            const desiredLength = Math.hypot(desiredX, desiredY) || 1;
            desiredX /= desiredLength;
            desiredY /= desiredLength;
            const normal = { x: -projection.tangent.y, y: projection.tangent.x };
            desiredX += normal.x * avoidance;
            desiredY += normal.y * avoidance;

            // Separação suave: impede aglomeração sem transformar corredores em paredes.
            for (const other of this.runners) {
                if (other === runner || other.finished) continue;
                const dx = runner.x - other.x;
                const dy = runner.y - other.y;
                const distance = Math.hypot(dx, dy);
                if (distance > 0.01 && distance < 54) {
                    const strength = (54 - distance) / 54 * (runner.profile === 'AGGRESSIVE' ? 0.28 : 0.48);
                    desiredX += dx / distance * strength;
                    desiredY += dy / distance * strength;
                }
            }
            // O Mestre é eficiente, porém um pequeno erro periódico mantém a disputa justa.
            if (runner.profile === 'MASTER') {
                const imperfection = Math.sin(this.clock * 0.73 + runner.phaseSeed) * 0.045;
                desiredX += normal.x * imperfection;
                desiredY += normal.y * imperfection;
            }
            runner.setInput(desiredX, desiredY);
        }

        runnerWorldPoint(runner) {
            return { x: runner.x, y: runner.y };
        }

        updateRunnerProgress(runner) {
            if (runner.finished) return;
            const projection = this.track.project(runner.x, runner.y);
            runner.trackProjection = projection;
            const gateSpan = this.track.length / this.track.gateCount;
            const gateProgress = runner.nextGate === this.track.gateCount ? 0 : runner.nextGate * gateSpan;
            const forwardSpeed = runner.vx * projection.tangent.x + runner.vy * projection.tangent.y;
            const atExpectedGate = Math.abs(this.track.circularDistance(projection.progress, gateProgress)) < 105;
            if (projection.onTrack && forwardSpeed > 35 && atExpectedGate) {
                if (runner.isPlayer) this.gatesPassed++;
                if (runner.nextGate === this.track.gateCount) {
                    runner.validatedLaps++;
                    runner.nextGate = 1;
                    if (runner.validatedLaps >= this.totalLaps) {
                        runner.progress = this.totalLaps * this.track.length;
                        runner.finished = true;
                        runner.finishOrder = this.finishers.length + 1;
                        runner.setInput(0, 0);
                        this.finishers.push(runner);
                        if (runner.isPlayer) this.finishRace();
                        return;
                    }
                } else {
                    runner.nextGate++;
                }
            }
            const allowedLocal = runner.nextGate === this.track.gateCount
                ? this.track.length
                : runner.nextGate * gateSpan;
            // O ranking de todos usa a mesma sequência; cortar o gramado não
            // concede progresso nem volta a jogador ou adversários.
            runner.progress = runner.validatedLaps * this.track.length + Math.min(projection.progress, allowedLocal);
        }

        resolveRunnerContacts() {
            for (let i = 0; i < this.runners.length; i++) {
                for (let j = i + 1; j < this.runners.length; j++) {
                    const a = this.runners[i];
                    const b = this.runners[j];
                    if (a.z > 18 || b.z > 18) continue;
                    const pa = this.runnerWorldPoint(a);
                    const pb = this.runnerWorldPoint(b);
                    const dx = pa.x - pb.x;
                    const dy = pa.y - pb.y;
                    const distance = Math.hypot(dx, dy);
                    const minimum = 27;
                    if (distance <= 0.01 || distance >= minimum) continue;
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const overlap = minimum - distance;
                    a.x += nx * overlap * 0.52;
                    a.y += ny * overlap * 0.52;
                    b.x -= nx * overlap * 0.52;
                    b.y -= ny * overlap * 0.52;
                    a.vx *= 0.975;
                    a.vy *= 0.975;
                    b.vx *= 0.975;
                    b.vy *= 0.975;
                    if ((a.isPlayer && a.contactCooldown <= 0) || (b.isPlayer && b.contactCooldown <= 0)) {
                        this.runnerContacts++;
                        this.player.contactCooldown = 0.18;
                    }
                }
            }
        }

        update() {
            const now = performance.now();
            let dt = clamp((now - this.lastTime) / 1000, 0, 1 / 20);
            if (this.qaMode === 'autoplay') dt = Math.min(dt * 3, 1 / 12);
            this.lastTime = now;
            this.clock += dt;
            this.setPresentation(true);

            if (this.phase === 'LOADING' && this.atlas.ready) {
                this.phase = this.atlas.failed ? 'ASSET_ERROR' : 'READY';
            }

            if (typeof hintText !== 'undefined') {
                hintText.innerText = this.phase === 'RACING'
                    ? '[WASD / SETAS] CORRER LIVREMENTE  |  [ESPAÇO] PULAR  |  [ESC] SAIR'
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
            if (this.qaMode === 'autoplay' && this.phase !== 'RACING') this.qaAutopilotStep();

            const raceRunning = this.phase === 'RACING';
            if (raceRunning) {
                this.countdownGoTimer = Math.max(0, this.countdownGoTimer - dt * 60);
                let input = this.readMovementInput();
                if (this.qaMode === 'autoplay' || this.qaMode === 'contact') {
                    const projection = this.track.project(this.player.x, this.player.y);
                    const center = this.track.point(projection.progress, 3.5);
                    const correctionStrength = clamp(projection.distance / 85, 0, 1.35);
                    let autoX = projection.tangent.x + (center.x - this.player.x) / Math.max(1, projection.distance) * correctionStrength;
                    let autoY = projection.tangent.y + (center.y - this.player.y) / Math.max(1, projection.distance) * correctionStrength;
                    const autoLength = Math.hypot(autoX, autoY) || 1;
                    input = { x: autoX / autoLength, y: autoY / autoLength };
                } else if (this.qaMode === 'shortcut') {
                    input = { x: 0, y: -1 };
                }
                this.player.setInput(input.x, input.y);
                if (this.qaMode === 'autoplay') this.qaAutopilotStep();
                this.obstacles.update(dt, this);
                for (const runner of this.runners) {
                    if (!runner.isPlayer) this.updateAI(runner, dt);
                    runner.updateFreePhysics(dt, this.track, true);
                    this.obstacles.collideRunner(runner, this);
                }
                this.resolveRunnerContacts();
                for (const runner of this.runners) this.updateRunnerProgress(runner);
                const playerPlace = this.currentRanking().indexOf(this.player) + 1;
                if (playerPlace < this.lastPlayerPlace) this.overtakes += this.lastPlayerPlace - playerPlace;
                this.lastPlayerPlace = playerPlace;
                this.score += dt * 4;
            } else {
                for (const runner of this.runners) runner.updateFreePhysics(dt, this.track, false);
            }

            this.directionHistory.add(this.player.lastDirection);
            const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
            const lookAhead = clamp(playerSpeed * 0.42, 45, 150);
            const directionX = playerSpeed > 1 ? this.player.vx / playerSpeed : 1;
            const directionY = playerSpeed > 1 ? this.player.vy / playerSpeed : 0;
            const targetX = this.player.x + directionX * lookAhead;
            const targetY = this.player.y + directionY * lookAhead;
            this.camera.x = lerp(this.camera.x, targetX, clamp(dt * 3.8, 0, 1));
            this.camera.y = lerp(this.camera.y, targetY, clamp(dt * 3.8, 0, 1));
            this.distractionTimer = Math.max(0, this.distractionTimer - dt * 60);
            this.impactFlash = Math.max(0, this.impactFlash - dt * 60);

            const scoreElement = document.getElementById('score-val');
            if (scoreElement) scoreElement.textContent = String(Math.floor(this.score));

            if (this.qaMode === 'shortcut') {
                if (this.phase === 'READY') this.startCountdown();
                if (this.phase === 'COUNTDOWN') this.countdown = 0;
            }
            if (this.qaMode === 'contact' && !this.qaPrepared && this.phase === 'READY') {
                this.qaPrepared = true;
                this.phase = 'RACING';
                const rival = this.runners.find((runner) => !runner.isPlayer);
                rival.progress = 30;
                rival.preferredOffset = 0;
                rival.targetOffset = 0;
                rival.state = 'RUN';
                const contactPoint = this.track.pointOffset(30, 0);
                rival.x = contactPoint.x;
                rival.y = contactPoint.y;
                this.player.x = contactPoint.x + 4;
                this.player.y = contactPoint.y;
                this.player.state = 'RUN';
            }
            if (this.qaMode === 'defeat') {
                this.player.maxSpeed = 245;
                if (this.phase === 'READY') this.startCountdown();
                if (this.phase === 'COUNTDOWN') this.countdown = 0;
            }
            if (this.qaMode === 'curve' && !this.qaPrepared && this.phase === 'READY') {
                this.qaPrepared = true;
                this.phase = 'RACING';
                this.player.progress = this.track.straight + this.track.curveLength * 0.42;
                this.player.speed = this.player.maxSpeed;
                const curveStart = this.track.point(this.player.progress, 3);
                const curveTangent = this.track.tangent(this.player.progress);
                this.player.x = curveStart.x;
                this.player.y = curveStart.y;
                this.player.vx = curveTangent.x * this.player.maxSpeed;
                this.player.vy = curveTangent.y * this.player.maxSpeed;
                this.runners.forEach((runner, index) => {
                    runner.state = 'RUN';
                    if (!runner.isPlayer) {
                        runner.progress = this.player.progress - 35 - index * 12;
                        const point = this.track.pointOffset(runner.progress, runner.preferredOffset);
                        runner.x = point.x;
                        runner.y = point.y;
                    }
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
            const point = { x: runner.x, y: runner.y };
            const shadowScale = 1 - clamp(runner.z / 75, 0, 0.45);
            context.save();
            context.fillStyle = 'rgba(0,0,0,.28)';
            context.beginPath();
            context.ellipse(point.x, point.y + 3, 14 * shadowScale, 5 * shadowScale, 0, 0, TAU);
            context.fill();

            const action = runner.state;
            const direction = runner.chooseDirection();
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
            const sorted = [...this.runners].sort((a, b) => a.y - b.y);
            for (const runner of sorted) this.drawRunner(ctx, runner);
            ctx.restore();
        }

        drawHud() {
            const ranking = this.currentRanking();
            const place = ranking.indexOf(this.player) + 1;
            const progress = clamp(this.player.progress / (this.totalLaps * this.track.length), 0, 1);
            const lap = Math.min(this.totalLaps, this.player.validatedLaps + 1);

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
            ctx.fillText(`RITMO ${Math.round(clamp(this.player.speed / this.player.maxSpeed, 0, 1) * 100)}%`, 433, 56);
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
                ctx.fillText('[WASD / SETAS] MOVIMENTO LIVRE', canvas.width / 2, 160);
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
            const projection = this.player.trackProjection || this.track.project(this.player.x, this.player.y);
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
                freeMovement: true,
                aiFreeMovement: true,
                aiProfiles: this.runners.filter((runner) => !runner.isPlayer).map((runner) => `${runner.name}:${runner.profile}`),
                aiStatus: this.runners.filter((runner) => !runner.isPlayer).map((runner) => {
                    const runnerProjection = runner.trackProjection || this.track.project(runner.x, runner.y);
                    return {
                        name: runner.name,
                        profile: runner.profile,
                        x: Number(runner.x.toFixed(1)),
                        y: Number(runner.y.toFixed(1)),
                        lateral: Number(runnerProjection.lateral.toFixed(1)),
                        speed: Number(runner.speed.toFixed(1)),
                        validatedLaps: runner.validatedLaps,
                        nextGate: runner.nextGate,
                        finished: runner.finished
                    };
                }),
                playerX: Number(this.player.x.toFixed(2)),
                playerY: Number(this.player.y.toFixed(2)),
                playerVelocityX: Number(this.player.vx.toFixed(2)),
                playerVelocityY: Number(this.player.vy.toFixed(2)),
                jumps: this.jumps,
                gatesPassed: this.gatesPassed,
                nextGate: this.player.nextGate,
                validatedLaps: this.player.validatedLaps,
                runnerContacts: this.runnerContacts,
                overtakes: this.overtakes,
                restartCount: this.restartCount,
                currentLap: this.player.lap,
                place: this.currentRanking().indexOf(this.player) + 1,
                finishOrder: this.player.finishOrder,
                playerSpeed: Number(this.player.speed.toFixed(3)),
                playerMaxSpeed: this.player.maxSpeed,
                onTrack: projection.onTrack,
                onGrass: projection.onGrass,
                offTrack: this.player.offTrack,
                turnPenalty: Number(this.player.turnPenalty.toFixed(3)),
                trackDirection: 'COUNTER_CLOCKWISE',
                curveModel: 'continuous 2D steering with angular speed loss',
                cameraLookAhead: true,
                rankingModel: 'ordered lap gates plus between-gate oval progress',
                trackLength: Number(this.track.length.toFixed(1)),
                trackWidth: this.track.trackWidth
            };
        }

        // Gancho de QA: acelera a simulação sem alterar as regras usadas no jogo.
        qaAutopilotStep() {
            if (this.phase === 'READY') this.startCountdown();
            if (this.phase === 'COUNTDOWN') this.countdown = 0;
            if (this.phase !== 'RACING') return;
            const projection = this.track.project(this.player.x, this.player.y);
            const center = this.track.pointOffset(projection.progress, 0);
            const correction = clamp(projection.distance / 72, 0, 1.45);
            let desiredX = projection.tangent.x + (center.x - this.player.x) / Math.max(1, projection.distance) * correction;
            let desiredY = projection.tangent.y + (center.y - this.player.y) / Math.max(1, projection.distance) * correction;
            const threat = this.obstacles.nearbyThreats(this.player, 180)[0];
            if (threat) {
                if (threat.item.jumpable && threat.ahead < 72) {
                    if (this.player.jump()) this.jumps++;
                } else {
                    const normal = { x: -projection.tangent.y, y: projection.tangent.x };
                    const side = threat.lateral >= 0 ? -1 : 1;
                    desiredX += normal.x * side * 0.48;
                    desiredY += normal.y * side * 0.48;
                }
            }
            this.player.setInput(desiredX, desiredY);
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
