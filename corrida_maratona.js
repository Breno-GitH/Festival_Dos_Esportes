/*
 * Corrida/Maratona 3.0 — official three-lap athletics event
 * Módulo independente: pista, sprites, corredores, IA, obstáculos, HUD e fluxo.
 * A integração com o projeto principal se limita às três funções exportadas no fim.
 */
(function () {
    'use strict';

    const TAU = Math.PI * 2;
    // Contact remains tied to the runner's feet, never to transparent pixels
    // or to the source animation's dimensions. Two radii equal the old 27 px.
    const RUNNER_BODY_RADIUS = 13.5;
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
                runners: 'corrida_sprites/runtime/corrida_runners_atlas.png?v=3',
                obstacles: 'Obstaculos_Corrida.png'
            };
            Object.entries(this.sources).forEach(([key, src]) => {
                const image = new Image();
                image.addEventListener('load', () => { this.loaded++; });
                image.addEventListener('error', () => { this.failed++; });
                image.src = src;
                this.images[key] = image;
            });
            this.characters = window.CorridaSpriteManifest;
            this.obstacles = this.makeObstacleFrames();
        }

        get ready() {
            return this.loaded + this.failed === Object.keys(this.sources).length;
        }

        runnerSequence(id, action, direction) {
            const atlas = this.characters;
            if (!atlas) return null;
            const key = `${id}/${action}/${direction}`;
            const alias = atlas.aliases[key];
            const sequence = atlas.frames[alias ? alias.key : key] || atlas.frames[`${id}/RUN/RIGHT`];
            return sequence ? { sequence, flipX: !!alias?.flipX } : null;
        }

        runnerFrame(id, action, direction, frameIndex) {
            const resolved = this.runnerSequence(id, action, direction);
            if (!resolved) return null;
            const source = resolved.sequence[Math.floor(frameIndex) % resolved.sequence.length];
            return { ...source, flipX: resolved.flipX };
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
            const directional = action === 'RUN' || action === 'READY' || action === 'JUMP';
            const source = this.runnerFrame(kind, action, directional ? direction : '', frameIndex);
            if(!source)return false;
            const scale=Math.min(width/source.w,height/source.h),w=source.w*scale,h=source.h*scale;
            return this.safeDraw(context,'runners',source,Math.round(x-w/2),Math.round(y-h+7*scale),w,h);
        }

        competitorId(group) {
            const ids = {
                robot: ['robot_blue', 'robot_orange', 'robot_pink', 'robot_green'],
                human: ['human_01', 'human_02', 'human_03', 'human_04'],
                monster: ['monster_red', 'monster_blue', 'monster_purple', 'monster_ram']
            };
            return ids[group.band]?.[group.column];
        }

        drawCompetitor(context, group, direction, frameIndex, x, y, width, height, state) {
            const id = this.competitorId(group);
            const action = state === 'STUMBLE' ? 'STUMBLE' : state === 'READY' ? 'READY' : 'RUN';
            const source = this.runnerFrame(id, action, action === 'STUMBLE' ? '' : direction, frameIndex);
            if(!source)return false;
            const scale=Math.min(width/source.w,height/source.h),w=source.w*scale,h=source.h*scale;
            return this.safeDraw(context,'runners',source,Math.round(x-w/2),Math.round(y-h+7*scale),w,h);
        }

        drawObstacle(context, type, x, y, width, height, alpha = 1) {
            const mobileRunner = {
                backmarker: 'mobile_backmarker',
                zigzag: 'mobile_zigzag',
                judge: 'mobile_judge',
                robot: 'mobile_maintenance_robot'
            }[type];
            if (mobileRunner) {
                const source = this.runnerFrame(mobileRunner, 'RUN', 'RIGHT', 0);
                return this.safeDraw(context, 'runners', source, x - width / 2, y - height, width, height, alpha);
            }
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
            this.gateCount = 4;
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
            // Exact capsule projection: no sampled jumps at straight/curve seams.
            const centerRadius=this.innerRadius+this.laneWidth*this.lanes/2;
            const dx=x-clamp(x,-this.halfStraight,this.halfStraight);
            let progress;
            if(x>this.halfStraight){
                progress=this.straight+(Math.PI/2-Math.atan2(y,dx))*this.referenceRadius;
            }else if(x<-this.halfStraight){
                let angle=Math.atan2(y,dx);if(angle>Math.PI/2)angle-=TAU;
                progress=this.straight*2+this.curveLength+(-Math.PI/2-angle)*this.referenceRadius;
            }else progress=y>=0?x+this.halfStraight:this.straight+this.curveLength+this.halfStraight-x;
            progress=wrap(progress,this.length);
            const lateral=Math.hypot(dx,y)-centerRadius,distance=Math.abs(lateral);
            return {progress,distance,lateral,tangent:this.tangent(progress),
                onTrack:distance<=this.halfTrackWidth+7,onGrass:lateral<-this.halfTrackWidth,outside:lateral>this.halfTrackWidth};
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

        draw(context) {
            this.presentation.drawGround(context);
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
            this.collider = { anchor: 'feet', radius: RUNNER_BODY_RADIUS };
        }

        get lap() {
            return Math.min(window.RaceLapSystem.TOTAL_LAPS, this.validatedLaps + 1);
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
            if(item.mobile&&item.patrolSpan)item.progress=wrap(item.baseProgress+Math.sin(clock*item.pathSpeed/item.patrolSpan+item.phase)*item.patrolSpan,this.track.length);
            if (item.crossing) lateral += Math.sin(clock * 1.15 + item.phase) * 112;
            if (item.zigzag) lateral += Math.sin(clock * 2.05 + item.phase) * 78;
            item.lateral = item.type==='pigeon'?lateral:clamp(lateral, -this.track.halfTrackWidth + 16, this.track.halfTrackWidth - 16);
            const point = this.track.pointOffset(item.progress, item.lateral);
            item.x = point.x;
            item.y = point.y;
            item.direction = point.direction;
        }

        buildCourse() {
            const L=this.track.length;
            for(let lap=1;lap<=3;lap++){
                // Four readable districts. Every pattern leaves several lanes clear.
                if(lap===1)this.add('startingBlock',lap,L*.06,76,{lightHazard:true,strength:.82,size:[34,26]});
                this.add('hurdle',lap,L*.12,-58,{jumpable:true,strength:.5,size:[62,43]});
                if(lap>=2)this.add('hurdle',lap,L*.17,54,{jumpable:true,strength:.5,size:[62,43]});
                this.add('cone',lap,L*.34,-65,{strength:.62,size:[30,36]});
                if(lap>=2)this.add('cone',lap,L*.37,62,{strength:.62,size:[30,36]});
                if(lap===3)this.add('barricade',lap,L*.41,8,{jumpable:true,strength:.52,size:[58,40]});
                this.add('puddle',lap,L*.55,52,{jumpable:true,lightHazard:true,strength:.7,size:[76,36]});
                this.add(lap===2?'sponge':'bottle',lap,L*.59,-48,{lightHazard:true,strength:.82,size:[26,23]});
                if(lap===3)this.add('puddle',lap,L*.62,-62,{jumpable:true,lightHazard:true,strength:.7,size:[72,35]});
                this.add(lap===1?'backmarker':lap===2?'zigzag':'cart',lap,L*.77,25,
                    {mobile:true,pathSpeed:lap===1?165:lap===2?200:42,patrolSpan:165,crossing:lap===3,zigzag:lap===2,strength:.72,size:lap===3?[52,40]:[37,49]});
                this.add(lap===1?'judge':lap===2?'rolling':'robot',lap,L*.84,-52,
                    {mobile:true,pathSpeed:lap===1?58:72,patrolSpan:125,crossing:lap===3,strength:.66,size:lap===2?[52,40]:[38,49]});
                if(lap===2)this.add('tape',lap,L*.65,-92,{scenic:true,lightHazard:true,strength:.86,size:[58,28]});
            }
            // Ambient pigeons live beside the course in every lap; never collide.
            for(let i=0;i<12;i++)this.add('pigeon',0,L*(i+.35)/12,i%2?-163:154,{scenic:true,size:[19,27]});
        }

        update(dt, game) {
            const visibleLap = Math.min(game.totalLaps, game.player.validatedLaps + 1);
            for (const item of this.items) {
                if (item.mobile && item.pathSpeed&&!item.patrolSpan) item.progress = wrap(item.progress + item.pathSpeed * dt, this.track.length);
                this.updateWorldPosition(item, game.clock);
                if (item.type === 'pigeon') {
                    const nearest = game.runners.reduce((distance, runner) =>
                        Math.min(distance, Math.hypot(item.x - runner.x, item.y - runner.y)), Infinity);
                    if (!item.flying && (item.lap===0||item.lap===visibleLap)&&nearest<125) {
                        item.flying = true;
                        item.flightTimer = 1.55;
                    }
                    if (item.flying) item.flightTimer = Math.max(0, item.flightTimer - dt);
                }
                if ((item.lap===0||item.lap===visibleLap)&&Math.hypot(item.x - game.player.x, item.y - game.player.y) < 470) {
                    this.typesSeen.add(item.type);
                    if (item.mobile) this.mobileSeen = true;
                }
            }
        }

        nearbyThreats(runner, forwardRange = 210) {
            const projection = runner.trackProjection || this.track.project(runner.x, runner.y);
            const currentLap = runner.lap;
            const forward = runner.speed > 30
                ? { x: runner.vx / runner.speed, y: runner.vy / runner.speed }
                : projection.tangent;
            const side = { x: -forward.y, y: forward.x };
            const threats = [];
            for (const item of this.items) {
                if(item.lap!==currentLap||item.type==='pigeon')continue;
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
                if(item.type==='pigeon')continue;
                const collisionRadius = Math.max(18, item.size[0] * 0.4);
                if (distance > collisionRadius) continue;
                runner.hitObstacles.add(item.id);
                if (item.jumpable && runner.z > 19) {
                    if (runner.isPlayer) game.score += 120;
                    continue;
                }
                if (runner.isPlayer) window.FestivalChallenges?.onRunning({type:'OBSTACLE',obstacle:item.type});
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
                if ((item.lap!==0&&item.lap!==visibleLap)||Math.hypot(item.x - game.camera.x, item.y - game.camera.y) > 820) continue;
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
            this.totalLaps = window.RaceLapSystem.TOTAL_LAPS;
            this.eventView=new window.RaceEventPresentation(this.track);
            this.track.presentation=this.eventView;
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
            this.pendingBriefStart = false;
            this.assetsReported = false;
            this.setupInput();
            this.reset();
        }

        setupInput() {
            window.addEventListener('keydown', (event) => {
                if (typeof currentScene === 'undefined' || currentScene !== 'JOGO_CORRIDA') return;
                if(window.PreGameBrief?.active)return;
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
                if (this.phase === 'RESULT' && !event.repeat && (key === ' ' || key === 'r')) {
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
            for (let index=0;index<this.runners.length;index++) {
                const runner=this.runners[index];
                // Two rows, every runner physically behind the same start plane.
                runner.progress=-44-Math.floor(index/4)*38;
                const gridOffset=[-27,27,-86,86][index%4];
                const start = this.track.pointOffset(runner.progress, gridOffset);
                runner.x = start.x;
                runner.y = start.y;
                runner.trackProjection = this.track.project(start.x, start.y);
            }
        }

        reset() {
            window.FestivalChallenges?.start('running');
            this.makeRunners();
            this.lapSystem=new window.RaceLapSystem(this.track);
            for(const runner of this.runners)this.lapSystem.attach(runner);
            this.rivalEvents=new window.RaceRivalEvents();
            this.eventView.reset(2026+this.restartCount);
            this.raceTime=0;this.finishWindow=0;this.simulationAccumulator=0;this.qaPrepared=false;
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
            this.pendingBriefStart = false;
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
            if (header) header.style.display = active ? 'none' : 'flex';
        }

        startCountdown() {
            if (!this.atlas.ready || this.atlas.failed > 0) return;
            this.phase = 'COUNTDOWN';
            this.countdown = 3;
            this.countdownGoTimer = 0;
            for (const runner of this.runners) runner.state = 'READY';
            this.eventView.cue('start');this.lastTime=performance.now();this.simulationAccumulator=0;
        }

        clearBriefingInput() {
            this.inputKeys.clear();
        }

        startFromBriefing() {
            this.clearBriefingInput();
            this.pendingBriefStart = true;
            if (this.atlas.ready && this.atlas.failed === 0) {
                this.pendingBriefStart = false;
                this.startCountdown();
            }
        }

        updateAI(runner, dt) {
            if (runner.finished) {
                runner.setInput(0, 0);
                return;
            }
            const projection = runner.trackProjection || this.track.project(runner.x, runner.y);
            if(!projection.onTrack){
                // Rejoin the nearest edge under the same grass physics as Zorp.
                // This target is recomputed from current position, never a saved recovery point.
                const lateral=clamp(projection.lateral,-this.track.halfTrackWidth+14,this.track.halfTrackWidth-14);
                const edge=this.track.pointOffset(projection.progress,lateral);
                runner.setInput(edge.x-runner.x,edge.y-runner.y);return;
            }
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
            const threat = [...this.obstacles.nearbyThreats(runner, vision),...this.rivalEvents.nearbyThreats(runner)]
                .sort((a,b)=>a.distance-b.distance)[0];
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

        updateRunnerProgress(runner,startTime=0,dt=1/60) {
            const events=this.lapSystem.step(runner,{x:runner.prevX,y:runner.prevY},runner,startTime,dt);
            for(const event of events){
                if(runner.isPlayer)window.FestivalChallenges?.onRunning(event);
                if(runner.isPlayer&&(event.type==='CHECKPOINT'||event.type==='LAP'))this.gatesPassed++;
                if(event.type==='LAP'&&runner.isPlayer&&event.lap<3){
                    const last=event.lap===2;
                    this.eventView.announce(last?'ÚLTIMA VOLTA!':'VOLTA 2/3',last?'#ffe195':'#a6e4c9',2.2);
                    this.eventView.react(last?'lastLap':'lap',runner,this.raceTime);
                }
                if(event.type==='FINISH'){
                    runner.state='READY';runner.stateTimer=Infinity;this.finishers.push(runner);
                    if(runner.isPlayer){this.eventView.react('finish',runner,this.raceTime);this.eventView.announce('CHEGADA REGISTRADA','#ffe195');}
                }
            }
        }

        resolveRunnerContacts() {
            for (let i = 0; i < this.runners.length; i++) {
                for (let j = i + 1; j < this.runners.length; j++) {
                    const a = this.runners[i];
                    const b = this.runners[j];
                    if(a.finished||b.finished||a.z>18||b.z>18)continue;
                    const pa = this.runnerWorldPoint(a);
                    const pb = this.runnerWorldPoint(b);
                    const dx = pa.x - pb.x;
                    const dy = pa.y - pb.y;
                    const distance = Math.hypot(dx, dy);
                    const minimum = a.collider.radius + b.collider.radius;
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
            const now=performance.now(),elapsed=clamp((now-this.lastTime)/1000,0,.15);
            this.lastTime=now;
            this.simulationAccumulator+=elapsed*(this.qaMode==='autoplay'?3:1);
            while(this.simulationAccumulator>=1/60-1e-9){
                this.simulationAccumulator=Math.max(0,this.simulationAccumulator-1/60);this.advance(1/60);
            }
        }

        advance(dt=1/60) {
            this.clock += dt;
            this.setPresentation(true);

            if (this.phase === 'LOADING' && this.atlas.ready) {
                this.phase = this.atlas.failed ? 'ASSET_ERROR' : 'READY';
            }
            if (this.pendingBriefStart && this.phase === 'READY') {
                this.pendingBriefStart = false;
                this.startCountdown();
            }

            if (typeof hintText !== 'undefined') {
                hintText.innerText = this.phase==='FINISHING'?'CHEGADA REGISTRADA • APURANDO POSIÇÕES':this.phase === 'RACING'
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

            const raceRunning = this.phase === 'RACING'||this.phase==='FINISHING';
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
                this.player.setInput(this.player.finished?0:input.x,this.player.finished?0:input.y);
                if (this.qaMode === 'autoplay'&&!this.player.finished) this.qaAutopilotStep();
                const startTime=this.raceTime;this.raceTime+=dt;
                this.obstacles.update(dt, this);
                for (const runner of this.runners) {
                    runner.prevX=runner.x;runner.prevY=runner.y;
                }
                for (const runner of this.runners) {
                    if (!runner.isPlayer) this.updateAI(runner, dt);
                    runner.updateFreePhysics(dt, this.track, true);
                    this.obstacles.collideRunner(runner, this);
                }
                this.resolveRunnerContacts();
                const questObstacleHits=this.obstacles.playerHitCount;
                this.rivalEvents.update(dt,this);
                if(this.obstacles.playerHitCount>questObstacleHits)window.FestivalChallenges?.onRunning({type:'OBSTACLE',obstacle:'thrown_object'});
                for (const runner of this.runners) this.updateRunnerProgress(runner,startTime,dt);
                // Sort sub-frame finish times after processing everyone: array order cannot decide a photo finish.
                this.finishers.sort((a,b)=>a.finishTime-b.finishTime);
                this.finishers.forEach((runner,index)=>runner.finishOrder=index+1);
                const playerPlace = this.currentRanking().indexOf(this.player) + 1;
                if(playerPlace<this.lastPlayerPlace){
                    this.overtakes+=this.lastPlayerPlace-playerPlace;
                    this.eventView.react(playerPlace===1?'lead':'overtake',this.player,this.raceTime);
                }
                this.lastPlayerPlace=playerPlace;
                if(this.player.finished){
                    this.phase='FINISHING';this.finishWindow+=dt;
                    if(this.finishers.length>=3||this.finishWindow>=8)this.finishRace();
                }
                this.score += dt * 4;
            } else {
                for (const runner of this.runners) runner.updateFreePhysics(dt, this.track, false);
            }

            this.directionHistory.add(this.player.lastDirection);
            const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
            const lookAhead=clamp(playerSpeed*.52,65,195),projection=this.player.trackProjection;
            const directionX=playerSpeed>1?this.player.vx/playerSpeed:projection.tangent.x;
            const directionY=playerSpeed>1?this.player.vy/playerSpeed:projection.tangent.y;
            const forward=directionX*projection.tangent.x+directionY*projection.tangent.y;
            const bend=this.track.pointOffset(projection.progress+lookAhead,projection.lateral*.5);
            const curveWeight=projection.onTrack&&forward>.2?.55:0;
            const targetX=lerp(this.player.x+directionX*lookAhead,bend.x,curveWeight)-projection.tangent.y*18;
            const targetY=lerp(this.player.y+directionY*lookAhead,bend.y,curveWeight)+projection.tangent.x*18;
            const blend=1-Math.exp(-dt*4.2);
            this.camera.x=lerp(this.camera.x,targetX,blend);this.camera.y=lerp(this.camera.y,targetY,blend);
            this.eventView.update(dt,this);

            this.distractionTimer = Math.max(0, this.distractionTimer - dt * 60);
            this.impactFlash = Math.max(0, this.impactFlash - dt * 60);

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
            if(this.clock>=(this.nextDiagnostics||0)){
                this.nextDiagnostics=this.clock+.2;canvas.dataset.raceDiagnostics=JSON.stringify(this.diagnostics());
            }
        }

        finishRace() {
            const unfinished = this.runners.filter((runner) => !runner.finished)
                .sort((a,b)=>this.lapSystem.compare(a,b));
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
            return [...this.runners].sort((a,b)=>this.lapSystem.compare(a,b));
        }

        drawRunner(context, runner) {
            const point = { x: runner.x, y: runner.y };
            const shadowScale = 1 - clamp(runner.z / 75, 0, 0.45);
            context.save();
            context.fillStyle = 'rgba(0,0,0,.28)';
            context.fillRect(Math.round(point.x-13*shadowScale),Math.round(point.y+1),Math.round(26*shadowScale),4);
            context.fillRect(Math.round(point.x-9*shadowScale),Math.round(point.y-1),Math.round(18*shadowScale),7);

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
            ctx.save();ctx.imageSmoothingEnabled=false;
            ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(this.eventView.zoom,this.eventView.zoom);
            ctx.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
            this.track.draw(ctx);this.eventView.drawCrowd(ctx,this);this.eventView.drawStructures(ctx,this);
            this.obstacles.draw(ctx,this);
            const sorted=[...this.runners].sort((a,b)=>a.y-b.y);
            for(const runner of sorted)this.drawRunner(ctx,runner);
            this.rivalEvents.draw(ctx,this);
            ctx.restore();
        }

        drawHud() {this.eventView.drawHud(ctx,this);}

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
            } else if (this.phase === 'READY' && !window.PreGameBrief?.active) {
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
                ctx.fillText('3 VOLTAS • 8 CORREDORES • 1 CAMPEÃO', canvas.width / 2, 133);
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
                    const time=runner.finishTime===null?'EM PISTA':`${runner.finishTime.toFixed(2)}s`;
                    ctx.fillText(`${index+1}º${marker}  ${time}`,canvas.width/2,99+index*22);
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
                        nextGate: runner.nextGate,checkpointProgress:runner.checkpointProgress,finishTime:runner.finishTime,
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
                rankingModel:'completed laps, ordered physical checkpoints, validated sector fraction; sub-frame finish times',
                totalLaps:this.totalLaps,checkpointProgress:this.player.checkpointProgress,finishTime:this.player.finishTime,
                lapValidation:this.lapSystem.diagnostics(),presentation:this.eventView.diagnostics(),rivalEvents:this.rivalEvents.diagnostics(),
                raceTime:this.raceTime,
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
    window.startCorridaMaratonaFromBrief = function () { corridaMaratona.startFromBriefing(); };
    window.updateCorridaMaratona = function () { corridaMaratona.update(); };
    window.drawCorridaMaratona = function () { corridaMaratona.draw(); };
    window.getCorridaMaratonaDiagnostics = function () { return corridaMaratona.diagnostics(); };
    // Entrada isolada para a página de QA local; não interfere no fluxo normal da ilha.
    if (corridaMaratona.qaMode && typeof currentScene !== 'undefined') {
        currentScene = 'JOGO_CORRIDA';
        corridaMaratona.reset();
    }
})();
