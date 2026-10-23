(function (root, factory) {
    const api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateOlliePhysics = api;
})(typeof globalThis === "object" ? globalThis : this, function (root) {
    const geometry = root && root.SkateCollisionGeometry
        ? root.SkateCollisionGeometry
        : typeof require === "function" ? require("../skate_new/collision_geometry.js") : null;
    const DEFAULTS = Object.freeze({
        forwardSpeed: 230,
        gravity: 1650,
        jumpVelocities: Object.freeze({ normal: -350, ollie: -485 }),
        // Duration is retained for input telemetry/manual context, never for jump power.
        holdThresholdsMs: Object.freeze({ maximum: 420 }),
        terrainSpeedSlopeScale: 0.035,
        terrainSpeedMinScale: 0.92,
        terrainSpeedMaxScale: 1.08,
        grindOllieImpulse: 650,
        startX: 150,
        groundY: 250,
        playerHeight: 54,
        playerWidth: 36,
        riderCollider: geometry ? geometry.DEFAULT_RIDER_COLLIDER : Object.freeze({ width: 30, height: 44, offsetX: 0, offsetY: 0 }),
        obstacle: Object.freeze({ x: 1020, width: 48, height: 46 })
    });

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function groundHeightAt(x, config = DEFAULTS) {
        const rampSurface = geometry && geometry.rampSurfaceAt(config.ramps, x);
        if (rampSurface) return rampSurface.y;
        if (Array.isArray(config.groundSegments)) {
            const segment = config.groundSegments.find(item => x >= item.startX && x <= item.endX);
            if (!segment) return null;
            const width = segment.endX - segment.startX;
            const ratio = width > 0 ? (x - segment.startX) / width : 0;
            return segment.startY + (segment.endY - segment.startY) * ratio;
        }
        const y = config.groundY;
        if (x < 430) return y;
        if (x < 610) return y - 30 * ((x - 430) / 180);
        if (x < 760) return y - 30;
        if (x < 940) return y - 30 + 30 * ((x - 760) / 180);
        return y;
    }

    function safePlatformSurfaceAt(objects, x) {
        let found = null;
        for (const object of objects || []) {
            for (const [a, b] of object.collisionRegions?.SAFE_TOP || []) {
                if (!a || !b || x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x) || b.x === a.x) continue;
                const t = (x - a.x) / (b.x - a.x);
                const y = a.y + (b.y - a.y) * t;
                if (!found || y < found.y) found = { y, object };
            }
        }
        return found;
    }

    // Input and physics share one approach/surface/lip contract.
    function rampIntentAt(x, config) {
        return (config.ramps || []).find(ramp => ramp.collisionEnabled !== false
            && x >= (ramp.zones?.APPROACH.startX ?? ramp.startX - 70)
            && x <= ramp.endX) || null;
    }

    function createSimulation(overrides = {}) {
        const config = {
            ...DEFAULTS,
            ...overrides,
            jumpVelocities: { ...DEFAULTS.jumpVelocities, ...(overrides.jumpVelocities || {}) },
            holdThresholdsMs: { ...DEFAULTS.holdThresholdsMs, ...(overrides.holdThresholdsMs || {}) },
            riderCollider: { ...DEFAULTS.riderCollider, ...(overrides.riderCollider || {}) },
            obstacle: overrides.obstacle === null
                ? null
                : { ...DEFAULTS.obstacle, ...(overrides.obstacle || {}) }
        };
        config.obstacles = Array.isArray(overrides.obstacles)
            ? overrides.obstacles
            : config.obstacle ? [config.obstacle] : [];
        config.ramps = Array.isArray(overrides.ramps) ? overrides.ramps : [];
        config.collisionObjects = Array.isArray(overrides.collisionObjects) ? overrides.collisionObjects : [];

        const simulation = {
            config,
            state: null,
            reset() {
                const spawnGround = groundHeightAt(config.startX, config);
                const spawnPlatform = safePlatformSurfaceAt(config.collisionObjects, config.startX);
                const player = {
                    x: config.startX,
                    y: spawnPlatform && (!Number.isFinite(spawnGround) || spawnPlatform.y < spawnGround)
                        ? spawnPlatform.y : spawnGround,
                    verticalVelocity: 0,
                    grounded: true,
                    charging: false,
                    holdMs: 0,
                    jumpTier: "",
                    jumpUpgradeCount: 0,
                    takeoffs: 0,
                    landings: 0,
                    obstacleHit: false,
                    hitObstacleId: "",
                    failureReason: "",
                    airTrick: "",
                    airTrickRemainingMs: 0,
                    specialRampAir: null,
                    rampRide: null,
                    forwardSpeed: config.forwardSpeed
                };
                for (const alias of ["groundContactY", "boardY", "feetY"]) {
                    Object.defineProperty(player, alias, {
                        enumerable: true,
                        get() { return this.y; },
                        set(value) { this.y = value; }
                    });
                }
                this.state = {
                    phase: "PLAYING",
                    elapsed: 0,
                    distance: 0,
                    player,
                    rampLaunches: [],
                    lastEvent: ""
                };
                return this.state;
            },
            step(action = {}, dtSeconds = 1 / 120) {
                const s = this.state || this.reset();
                const dt = clamp(Number(dtSeconds) || 0, 0, 1 / 30);
                const p = s.player;
                if (dt <= 0 || s.phase === "FAILED") return s;

                s.elapsed += dt;
                if (p.airTrickRemainingMs > 0) {
                    p.airTrickRemainingMs = Math.max(0, p.airTrickRemainingMs - dt * 1000);
                    if (!p.airTrickRemainingMs) p.airTrick = "";
                }
                const rampIntent = p.grounded && !p.grindingRailId && rampIntentAt(p.x, config);
                if (action.spacePressed && p.grounded && !rampIntent) this.launchImmediate("normal");
                if (action.ollieUpgrade && !p.rampRide) this.upgradeJump("ollie");

                // Ordinary ground uses presses; ramps own held SPACE until the lip.
                p.charging = false;
                if (action.spaceHeld) p.holdMs = Math.min(config.holdThresholdsMs.maximum, p.holdMs + dt * 1000);

                const previousX = p.x;
                const previousY = p.y;
                const wasGrounded = p.grounded;
                const previousPlatform = wasGrounded ? safePlatformSurfaceAt(config.collisionObjects, previousX) : null;
                const previousGroundY = previousPlatform?.y ?? groundHeightAt(previousX, config);
                const previousRamp = geometry && geometry.rampSurfaceAt(config.ramps, previousX);
                if (wasGrounded && previousRamp && !p.grindingRailId) {
                    if (!p.rampRide || p.rampRide.rampId !== previousRamp.ramp.id) p.rampRide = {
                        rampId: previousRamp.ramp.id, phase: "RAMP_SURFACE",
                        entrySpeed: p.forwardSpeed, heldDistance: 0, distance: 0,
                        prepared: false, releasedEarly: false
                    };
                    p.rampRide.prepared = action.spaceHeld === true;
                    p.rampRide.releasedEarly ||= !action.spaceHeld && p.rampRide.heldDistance > 0;
                } else if (!wasGrounded || !rampIntent) p.rampRide = null;
                const terrainSlope = previousRamp?.slope || 0;
                const speedScale = clamp(
                    1 + terrainSlope * config.terrainSpeedSlopeScale,
                    config.terrainSpeedMinScale,
                    config.terrainSpeedMaxScale
                );
                const forwardSpeed = p.grindingRailId && Number.isFinite(p.grindForwardSpeed)
                    ? p.grindForwardSpeed : config.forwardSpeed * speedScale + (p.momentumOffset || 0);
                p.momentumOffset = (p.momentumOffset || 0) * Math.exp(-dt*2);
                p.forwardSpeed = forwardSpeed;
                p.x += forwardSpeed * dt;
                if (p.rampRide && previousRamp) {
                    const traveled = Math.max(0, Math.min(p.x, previousRamp.ramp.endX) - previousX);
                    p.rampRide.distance += traveled;
                    if (action.spaceHeld) p.rampRide.heldDistance += traveled;
                }
                const takeoffRamp = wasGrounded && !p.grindingRailId && previousRamp
                    && previousX <= previousRamp.ramp.endX && p.x >= previousRamp.ramp.endX
                    ? previousRamp.ramp : null;
                let flightDt = dt;
                if (takeoffRamp) {
                    p.y = takeoffRamp.surfacePoints.at(-1).y;
                    flightDt = Math.max(0, (p.x - takeoffRamp.endX) / forwardSpeed);
                    this.launchFromRamp(takeoffRamp, action.spaceHeld === true);
                }
                const followingGround = wasGrounded && p.grounded && !takeoffRamp;
                let gravityScale = 1;
                if (p.specialRampAir?.active) {
                    const special = p.specialRampAir;
                    special.elapsedMs += dt * 1000;
                    const controlsHeld = action.spaceHeld === true;
                    const withinLimit = special.controlledMs < special.maxControlledMs;
                    if (controlsHeld && withinLimit) {
                        special.controlledMs = Math.min(special.maxControlledMs, special.controlledMs + dt * 1000);
                        gravityScale = special.sustainGravityScale;
                        p.verticalVelocity = Math.min(p.verticalVelocity, -special.sustainVelocityFloor);
                        special.releasedEarly = false;
                    } else {
                        gravityScale = special.fallGravityScale;
                        if (!controlsHeld && special.elapsedMs > special.graceMs) special.releasedEarly = true;
                    }
                    if (special.controlledMs >= special.maxControlledMs) special.limitReached = true;
                }
                if (!p.grindingRailId) p.verticalVelocity += config.gravity * gravityScale * flightDt;
                p.y += p.verticalVelocity * flightDt;
                s.distance = p.x - (Number.isFinite(config.distanceOriginX) ? config.distanceOriginX : config.startX);

                // Traversal owns rail contact; never register repeated floor landings
                // when a grindable ledge shares its top with a standing surface.
                let groundY = p.grindingRailId ? null : groundHeightAt(p.x, config);
                let platformLanding = null;
                if (!p.grindingRailId && p.verticalVelocity >= 0) {
                    for (const object of config.collisionObjects) {
                        const regions = object.collisionRegions || {};
                        const segments = regions.SAFE_TOP || [];
                        for (const segment of segments) {
                            const [a, b] = segment;
                            if (!a || !b || p.x < a.x || p.x > b.x || b.x === a.x) continue;
                            const t = (p.x - a.x) / (b.x - a.x);
                            const y = a.y + (b.y - a.y) * t;
                            if (previousY <= y + 2 && p.y >= y && (!Number.isFinite(groundY) || y < groundY)) {
                                platformLanding = { y, object };
                            }
                        }
                    }
                }
                if (platformLanding) groundY = platformLanding.y;
                const currentRamp = geometry && geometry.rampSurfaceAt(config.ramps, p.x);
                const ridingContinuousSurface = followingGround
                    && Number.isFinite(previousGroundY)
                    && Number.isFinite(groundY)
                    && (!previousPlatform || platformLanding?.object === previousPlatform.object);
                const approachedGroundFromAbove = Number.isFinite(groundY)
                    && Number.isFinite(previousGroundY)
                    && previousY <= previousGroundY + 2;
                if (ridingContinuousSurface) {
                    // Ground follows authored slopes each fixed step; this prevents
                    // downhill terrain from turning into repeated fake landings.
                    p.y = groundY;
                    p.verticalVelocity = currentRamp ? currentRamp.slope * forwardSpeed : 0;
                    p.grounded = true;
                } else if (Number.isFinite(groundY)
                    && p.verticalVelocity >= 0
                    && p.y >= groundY
                    && approachedGroundFromAbove) {
                    const wasAirborne = !p.grounded;
                    p.y = groundY;
                    p.verticalVelocity = 0;
                    p.grounded = true;
                    if (wasAirborne) {
                        p.landings++;
                        p.jumpTier = "";
                        p.lastLandingPlatformId = platformLanding?.object?.id || "";
                        if (p.specialRampAir?.active) {
                            p.specialRampAir.active = false;
                            p.specialRampAir.landed = true;
                        }
                        s.lastEvent = "LAND";
                    }
                    if (currentRamp) p.verticalVelocity = currentRamp.slope * forwardSpeed;
                } else {
                    p.grounded = false;
                }

                for (const obstacle of config.obstacles) {
                    if (!this.crossesObstacle(previousX, previousY, obstacle)) continue;
                    p.obstacleHit = true;
                    p.hitObstacleId = obstacle.id || obstacle.name || "obstacle";
                    s.phase = "FAILED";
                    s.failureReason = "OBSTACLE";
                    s.lastEvent = "OBSTACLE_HIT";
                    break;
                }

                if (s.phase === "PLAYING") {
                    const bounds = geometry
                        ? geometry.riderColliderBounds(p, config.riderCollider)
                        : { left: p.x - config.riderCollider.width / 2, right: p.x + config.riderCollider.width / 2,
                            top: p.y - config.riderCollider.height, bottom: p.y };
                    for (const object of [...config.collisionObjects, ...config.ramps]) {
                        const regions = object.collisionRegions || {};
                        const dangerous = regions.DANGEROUS_SIDE || regions.DANGEROUS_STAIR_FALL;
                        if (!dangerous) continue;
                        if (dangerous.type === "STAIR_SEGMENTS") {
                            if (object.safeGrindRailId && p.grindingRailId === object.safeGrindRailId) continue;
                            const hitStep = (dangerous.segments || []).some(step =>
                                bounds.right >= step.left
                                && previousX + config.riderCollider.width / 2 <= step.right
                                && bounds.bottom > step.top + 2
                                && bounds.top < step.bottom
                            );
                            if (!hitStep) continue;
                            p.obstacleHit = true;
                            p.hitObstacleId = object.id || "stairs";
                            s.phase = "FAILED";
                            s.failureReason = "DANGEROUS_STAIR_FALL";
                            s.lastEvent = "COLLISION_REGION_HIT";
                            break;
                        }
                        if (!Number.isFinite(dangerous.left) || !Number.isFinite(dangerous.right)) continue;
                        if (dangerous.type === "RAMP_BODY") {
                            const sample = geometry && geometry.rampSurfaceAt([object], p.x);
                            const intersectsBody = sample && bounds.bottom > sample.y + 2 && bounds.top < dangerous.bottom;
                            const ridingRampTop = sample && p.grounded && Math.abs(p.y - sample.y) <= 4;
                            if (intersectsBody && !ridingRampTop) {
                                p.obstacleHit = true;
                                p.hitObstacleId = object.id || object.type || "ramp";
                                s.phase = "FAILED";
                                s.failureReason = "DANGEROUS_SIDE";
                                s.lastEvent = "COLLISION_REGION_HIT";
                                break;
                            }
                            continue;
                        }
                        const entered = bounds.right >= dangerous.left && previousX + config.riderCollider.width / 2 <= dangerous.right;
                        const standingOnTop = p.grounded && Number.isFinite(groundY)
                            && Math.abs(p.y - groundY) < 1 && groundY <= dangerous.top + 2;
                        if (!entered || standingOnTop || bounds.bottom <= dangerous.top + 2 || bounds.top >= dangerous.bottom) continue;
                        p.obstacleHit = true;
                        p.hitObstacleId = object.id || "collision-object";
                        s.phase = "FAILED";
                        s.failureReason = regions.DANGEROUS_STAIR_FALL ? "DANGEROUS_STAIR_FALL" : "DANGEROUS_SIDE";
                        s.lastEvent = "COLLISION_REGION_HIT";
                        break;
                    }
                }

                if (config.failY && p.y > config.failY) {
                    s.phase = "FAILED";
                    s.failureReason = "FELL_IN_GAP";
                    s.lastEvent = "FELL_IN_GAP";
                    if (p.specialRampAir?.active) p.specialRampAir.active = false;
                }

                return s;
            },
            launch(holdMs, ramp = null) {
                return this.launchImmediate("normal", ramp);
            },
            launchImmediate(kind = "normal", ramp = null) {
                const s = this.state;
                const p = s.player;
                if (!p.grounded || s.phase !== "PLAYING") return false;
                if (rampIntentAt(p.x, config)) return false;
                const tier = ["normal", "ollie"].includes(kind) ? kind : "normal";
                p.jumpTier = tier;
                p.holdMs = 0;
                p.jumpUpgradeCount = 0;
                p.verticalVelocity = config.jumpVelocities[tier];
                p.grounded = false;
                p.charging = false;
                p.takeoffs++;
                s.lastEvent = `${tier.toUpperCase()}_JUMP`;
                return true;
            },
            upgradeJump(kind) {
                const p = this.state.player;
                if (this.state.phase !== "PLAYING" || p.grounded
                    || !["normal", "ollie", "grind-hop"].includes(p.jumpTier)
                    || kind !== "ollie") return false;
                if (kind === "ollie" && !["normal", "grind-hop"].includes(p.jumpTier)) return false;
                p.jumpTier = kind;
                p.jumpUpgradeCount++;
                p.verticalVelocity = Math.min(p.verticalVelocity, config.jumpVelocities[kind]);
                if (kind === "ollie") {
                    p.airTrick = "kickflip";
                    p.airTrickRemainingMs = 300;
                }
                this.state.lastEvent = `${kind.toUpperCase()}_UPGRADE`;
                return true;
            },
            rampImpulse(ramp) {
                const speedScale = Math.max(0, this.state.player.forwardSpeed) / DEFAULTS.forwardSpeed;
                const strength = Number(ramp && (ramp.launchStrength ?? ramp.launchImpulse)) || 0;
                return Math.max(0, strength) * speedScale * (ramp.launchMultiplier ?? 1);
            },
            launchFromRamp(ramp, held = false) {
                const p = this.state.player;
                if (Number.isFinite(ramp)) ramp = { launchImpulse: ramp };
                if (!p.grounded || !ramp || p.grindingRailId || this.state.phase !== "PLAYING") return false;
                if (ramp.surfacePoints?.length && p.x < ramp.endX) return false;
                const impulse = this.rampImpulse(ramp);
                const rampSample = geometry && geometry.rampSurfaceAt([ramp], ramp.endX ?? p.x);
                const tangent = rampSample ? rampSample.slope * p.forwardSpeed : 0;
                const quality = held ? 1 : p.rampRide?.heldDistance > 0 ? 0.40 : 0.18;
                p.verticalVelocity = tangent - impulse * quality;
                p.grounded = false;
                p.charging = false;
                p.jumpTier = "ramp";
                if (ramp.specialAir && held) {
                    p.specialRampAir = {
                        state: "MEGA_AIR",
                        active: true,
                        landed: false,
                        elapsedMs: 0,
                        controlledMs: 0,
                        graceMs: Number(ramp.specialAir.graceMs) || 90,
                        maxControlledMs: Number(ramp.specialAir.maxControlledMs) || 1450,
                        sustainGravityScale: Number(ramp.specialAir.sustainGravityScale) || 0.58,
                        fallGravityScale: Number(ramp.specialAir.fallGravityScale) || 1.75,
                        sustainVelocityFloor: Number(ramp.specialAir.sustainVelocityFloor) || 260,
                        slowMotionMs: Number(ramp.specialAir.slowMotionMs) || 800,
                        releasedEarly: false,
                        limitReached: false
                    };
                    p.jumpTier = "mega-air";
                }
                p.takeoffs++;
                const launches = this.state.rampLaunches;
                launches.push({ rampId: ramp.id, x: ramp.endX ?? p.x, y: p.y,
                    entrySpeed: p.rampRide?.entrySpeed ?? p.forwardSpeed, speed: p.forwardSpeed,
                    angle: Math.atan(rampSample?.slope || 0) * 180 / Math.PI,
                    impulse: impulse * quality, vy: p.verticalVelocity, held, quality,
                    releasedEarly: p.rampRide?.releasedEarly || false, at: this.state.elapsed });
                if (launches.length > 64) launches.shift();
                p.rampRide = null;
                this.state.lastEvent = ramp.specialAir && held ? "SPECIAL_RAMP_LAUNCH" : "RAMP_LAUNCH";
                // Launch energy comes from the surface tangent and speed-scaled lip.
                return true;
            },
            launchFromGrind(slope = 0) {
                const p = this.state.player;
                if (this.state.phase !== "PLAYING") return false;
                p.grounded = false;
                p.charging = false;
                // Strong vertical launch plus a restrained share of the rail tangent.
                // Horizontal velocity remains the actual approach momentum.
                p.verticalVelocity = -config.grindOllieImpulse
                    + clamp(slope * p.forwardSpeed * 0.35, -100, 100);
                p.forwardSpeed += clamp(slope*p.forwardSpeed*.035, 0, 8);
                p.momentumOffset = p.forwardSpeed-config.forwardSpeed;
                p.jumpTier = "super";
                p.airTrick = null;
                p.grindLaunchTakeoff = p.takeoffs + 1;
                p.takeoffs++;
                this.state.lastEvent = "GRIND_OLLIE_OUT";
                return true;
            },
            crossesObstacle(previousX, previousY, obstacle = config.obstacle) {
                if (!obstacle) return false;
                const p = this.state.player;
                const collider = config.riderCollider;
                const halfWidth = collider.width / 2;
                const entered = p.x + (collider.offsetX || 0) + halfWidth >= obstacle.x
                    && previousX + (collider.offsetX || 0) - halfWidth <= obstacle.x + obstacle.width;
                if (!entered) return false;
                const groundY = groundHeightAt(obstacle.x + obstacle.width / 2, config);
                if (!Number.isFinite(groundY)) return false;
                const obstacleTop = groundY - obstacle.height;
                const bounds = geometry
                    ? geometry.riderColliderBounds(p, collider)
                    : { top: p.y - collider.height, bottom: p.y + (collider.offsetY || 0) };
                return bounds.bottom > obstacleTop + 3 && bounds.top < groundY;
            }
        };
        simulation.reset();
        return simulation;
    }

    function createCamera(viewWidth = 450, viewHeight = 300, followRatio = 0.32) {
        return {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            screenX: viewWidth * followRatio,
            screenY: viewHeight * 0.78,
            horizontalSmoothing: 0.14,
            verticalSmoothing: 0.10,
            followRatio
        };
    }

    function updateCamera(camera, player, groundY, dtSeconds) {
        const stepScale = clamp(dtSeconds * 60, 0, 2);
        camera.targetX = player.x - camera.screenX;
        camera.targetY = (player.grounded ? groundY : player.y) - camera.screenY;
        camera.x += (camera.targetX - camera.x) * (1 - Math.pow(1 - camera.horizontalSmoothing, stepScale));
        camera.y += (camera.targetY - camera.y) * (1 - Math.pow(1 - camera.verticalSmoothing, stepScale));
        camera.x = Math.max(0, camera.x);
        return camera;
    }

    return Object.freeze({
        DEFAULTS,
        RIDER_COLLIDER: DEFAULTS.riderCollider,
        clamp,
        groundHeightAt,
        rampIntentAt,
        rampSurfaceAt: geometry ? geometry.rampSurfaceAt : () => null,
        riderColliderBounds: geometry && geometry.riderColliderBounds,
        createSimulation,
        createCamera,
        updateCamera
    });
});
