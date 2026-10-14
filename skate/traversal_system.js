(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateTraversal = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
    const SETTINGS = Object.freeze({
        railSnapTolerancePx: 24,
        grindCaptureRadiusPx: 24,
        grindInputBufferMs: 130,
        grindCaptureBlendMs: 100,
        trajectoryTolerance: 600,
        grindSpeedScale: 0.96,
        manualMaxDurationMs: 850
    });

    // A short authoring fixture for mechanics validation, not the definitive course.
    const TEST_RAILS = Object.freeze([
        Object.freeze({
            id: "test-rail",
            points: Object.freeze([
                Object.freeze({ x: 430, y: 175 }),
                Object.freeze({ x: 530, y: 175 }),
                Object.freeze({ x: 590, y: 190 })
            ])
        })
    ]);

    function getRailBounds(rail) {
        const path = rail.grindPath || rail.points;
        const xs = path.map(point => point.x);
        return { minX: Math.min(...xs), maxX: Math.max(...xs) };
    }

    function sampleRail(rail, x) {
        const points = rail.grindPath || rail.points;
        if (!points || points.length < 2) return null;
        if (x < points[0].x || x > points[points.length - 1].x) return null;
        for (let index = 0; index < points.length - 1; index++) {
            const start = points[index];
            const end = points[index + 1];
            if (x > end.x && index < points.length - 2) continue;
            const spanX = end.x - start.x;
            if (spanX <= 0) continue;
            const ratio = Math.max(0, Math.min(1, (x - start.x) / spanX));
            return {
                y: start.y + (end.y - start.y) * ratio,
                slope: (end.y - start.y) / spanX,
                segmentIndex: index
            };
        }
        return null;
    }

    function nearestRailPoint(rail, x, y) {
        const path = rail.grindPath || rail.points;
        if (!Array.isArray(path) || path.length < 2) return null;
        let best = null;
        for (let index = 0; index < path.length - 1; index++) {
            const a = path[index], b = path[index + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const lengthSquared = dx * dx + dy * dy;
            if (!lengthSquared) continue;
            const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
            const point = { x: a.x + dx * t, y: a.y + dy * t };
            const distance = Math.hypot(x - point.x, y - point.y);
            if (!best || distance < best.distance) {
                best = { ...point, distance, slope: dy / dx, segmentIndex: index };
            }
        }
        return best;
    }

    function findCaptureCandidate(player, rails, forwardSpeed, options = {}) {
        if (!player || player.grounded || !(forwardSpeed > 0)) return null;
        const lookAheadMs = Math.max(0, Number(options.lookAheadMs) || 0);
        const gravity = Math.max(0, Number(options.gravity) || 1650);
        const excludedRails = new Set(options.excludeRailIds || []);
        const samples = lookAheadMs > 0 ? 5 : 1;
        let best = null;
        for (const rail of rails || []) {
            if (excludedRails.has(rail.id)) continue;
            const bounds = getRailBounds(rail);
            if (player.x + forwardSpeed / 60 > bounds.maxX) continue;
            for (let sampleIndex = 0; sampleIndex <= samples; sampleIndex++) {
                const time = samples ? (lookAheadMs / 1000) * sampleIndex / samples : 0;
                const x = player.x + forwardSpeed * time;
                if (x > bounds.maxX) continue;
                const y = player.y + player.verticalVelocity * time + 0.5 * gravity * time * time;
                const point = nearestRailPoint(rail, x, y);
                if (!point) continue;
                if (point.x < player.x - 6 || point.x > x + SETTINGS.grindCaptureRadiusPx) continue;
                if (point.distance > SETTINGS.grindCaptureRadiusPx) continue;
                const relativeVelocity = player.verticalVelocity + gravity * time - point.slope * forwardSpeed;
                const relativeVerticalSpeed = Math.abs(relativeVelocity);
                if (relativeVerticalSpeed > SETTINGS.trajectoryTolerance) continue;
                const verticalGap = point.y - y;
                if (verticalGap > 1 && relativeVelocity < -90) continue;
                if (verticalGap < -12 && relativeVelocity > 90) continue;
                const candidate = {
                    rail, ...point, relativeVerticalSpeed,
                    predictedInMs: time * 1000,
                    withinCaptureZone: point.distance <= SETTINGS.grindCaptureRadiusPx
                };
                if (!best || candidate.distance < best.distance || (candidate.withinCaptureZone && !best.withinCaptureZone)) {
                    best = candidate;
                }
            }
        }
        return best;
    }

    function railLength(rail) {
        let length = 0;
        const path = rail.grindPath || rail.points;
        for (let index = 0; index < path.length - 1; index++) {
            const a = path[index];
            const b = path[index + 1];
            length += Math.hypot(b.x - a.x, b.y - a.y);
        }
        return length;
    }

    function distanceAlongRail(rail, fromX, toX) {
        const path = rail.grindPath || rail.points;
        const startX = Math.min(fromX, toX);
        const endX = Math.max(fromX, toX);
        let distance = 0;
        for (let index = 0; index < path.length - 1; index++) {
            const a = path[index];
            const b = path[index + 1];
            const left = Math.max(startX, a.x);
            const right = Math.min(endX, b.x);
            if (right <= left) continue;
            const leftY = a.y + (b.y - a.y) * ((left - a.x) / (b.x - a.x));
            const rightY = a.y + (b.y - a.y) * ((right - a.x) / (b.x - a.x));
            distance += Math.hypot(right - left, rightY - leftY);
        }
        return distance;
    }

    function createController() {
        const controller = {
            mode: "GROUND",
            activeRail: null,
            manualElapsedMs: 0,
            grindDistance: 0,
            lastX: null,
            pendingCaptureMs: 0,
            lastExitedRailId: null,
            lastExitedRailMaxX: -Infinity,
            captureDebug: null,
            lastTransition: null,
            captureBlend: null,
            reset() {
                this.mode = "GROUND";
                this.activeRail = null;
                this.manualElapsedMs = 0;
                this.grindDistance = 0;
                this.lastX = null;
                this.pendingCaptureMs = 0;
                this.lastExitedRailId = null;
                this.lastExitedRailMaxX = -Infinity;
                this.captureDebug = null;
                this.lastTransition = null;
                this.captureBlend = null;
                return this;
            },
            transition(type, details = {}) {
                this.lastTransition = { type, ...details };
                return this.lastTransition;
            },
            update(options) {
                const {
                    player,
                    previousGrounded,
                    previousX = player.x,
                    input = {},
                    rails = [],
                    forwardSpeed = 0,
                    targetForwardSpeed = forwardSpeed,
                    groundY,
                    dtSeconds = 1 / 120,
                    simulation,
                    tricks
                } = options;
                const dtMs = Math.max(0, dtSeconds * 1000);
                const transitions = [];
                const emit = (type, details) => transitions.push(this.transition(type, details));

                if (this.mode === "GROUND" && !player.grounded) this.mode = "AIR";

                if (this.mode === "GRIND") {
                    const rail = this.activeRail;
                    // The falling edge launches immediately; holding never launches at the endpoint.
                    if (!input.held || input.released) {
                        const tangent = sampleRail(rail, player.x)?.slope || 0;
                        const launched = simulation && simulation.launchFromGrind
                            ? simulation.launchFromGrind(tangent)
                            : false;
                        player.grindingRailId = null;
                        player.grindForwardSpeed = null;
                        player.grindCaptureProgress = 0;
                        this.captureBlend = null;
                        this.mode = "AIR";
                        this.activeRail = null;
                        this.lastX = null;
                        this.grindDistance = 0;
                        this.lastExitedRailId = rail.id;
                        this.lastExitedRailMaxX = getRailBounds(rail).maxX;
                        this.pendingCaptureMs = 0;
                        emit(launched ? "GRIND_OLLIE_OUT" : "GRIND_EXIT", { railId: rail.id });
                        return transitions;
                    }
                    const bounds = getRailBounds(rail);
                    const fromX = Math.max(bounds.minX, Math.min(bounds.maxX, this.lastX ?? previousX));
                    const toX = Math.max(fromX, Math.min(bounds.maxX, player.x));
                    const distance = distanceAlongRail(rail, fromX, toX);
                    if (distance > 0) {
                        this.grindDistance += distance;
                        emit("GRIND_DISTANCE", { distance, totalDistance: this.grindDistance, railId: rail.id });
                    }

                    const finished = player.x >= bounds.maxX;
                    const sampleX = Math.max(bounds.minX, Math.min(bounds.maxX, player.x));
                    const sample = sampleRail(rail, sampleX);
                    if (sample) {
                        sample.y += (player.x-sampleX)*sample.slope;
                        player.grindingRailId = rail.id;
                        const blend = this.captureBlend;
                        let offset = 0, offsetVelocity = 0;
                        if (blend) {
                            blend.elapsedMs = Math.min(SETTINGS.grindCaptureBlendMs, blend.elapsedMs + dtMs);
                            const u = blend.elapsedMs / SETTINGS.grindCaptureBlendMs;
                            const duration = SETTINGS.grindCaptureBlendMs / 1000;
                            // Hermite contact correction preserves the incoming velocity at u=0,
                            // and arrives at the rail with matching tangent velocity at u=1.
                            offset = (2*u*u*u-3*u*u+1)*blend.offset
                                + (u*u*u-2*u*u+u)*duration*blend.normalVelocity;
                            offsetVelocity = (6*u*u-6*u)*blend.offset/duration
                                + (3*u*u-4*u+1)*blend.normalVelocity;
                            const eased = u*u*(3-2*u);
                            player.grindForwardSpeed = blend.entryVx + (blend.projectedVx-blend.entryVx)*eased;
                            player.grindCaptureProgress = u;
                            if (u === 1) this.captureBlend = null;
                        } else {
                            player.grindForwardSpeed += (targetForwardSpeed*SETTINGS.grindSpeedScale-player.grindForwardSpeed)
                                * (1-Math.exp(-dtSeconds*2));
                        }
                        player.y = sample.y + offset;
                        player.verticalVelocity = sample.slope * player.grindForwardSpeed + offsetVelocity;
                        player.grounded = false;
                    }
                    this.lastX = player.x;

                    if (finished) {
                        player.grindingRailId = null;
                        player.grindForwardSpeed = null;
                        player.grindCaptureProgress = 0;
                        this.captureBlend = null;
                        const length = railLength(rail);
                        this.lastExitedRailId = rail.id;
                        this.lastExitedRailMaxX = bounds.maxX;
                        this.mode = "AIR";
                        this.activeRail = null;
                        this.lastX = null;
                        emit("GRIND_EXIT", { railId: rail.id, distance: this.grindDistance, railLength: length });
                        this.grindDistance = 0;
                    }
                    return transitions;
                }

                if (this.mode === "MANUAL") {
                    if (!Number.isFinite(groundY)) {
                        this.mode = "AIR";
                        this.manualElapsedMs = 0;
                        player.grounded = false;
                        emit("MANUAL_EXIT", { reason: "NO_GROUND" });
                        return transitions;
                    }
                    this.manualElapsedMs += dtMs;
                    player.y = groundY;
                    player.verticalVelocity = 0;
                    player.grounded = true;
                    if (input.released) {
                        player.grounded = true;
                        this.mode = "AIR";
                        this.manualElapsedMs = 0;
                        const holdMs = Number.isFinite(input.releaseHoldMs) ? input.releaseHoldMs : 0;
                        const launched = simulation && simulation.launch(holdMs);
                        emit(launched ? "MANUAL_OLLIE" : "MANUAL_EXIT", { holdMs });
                        return transitions;
                    }
                    if (this.manualElapsedMs >= SETTINGS.manualMaxDurationMs) {
                        player.grounded = true;
                        this.mode = "GROUND";
                        this.manualElapsedMs = 0;
                        emit("MANUAL_TIMEOUT");
                    }
                    return transitions;
                }

                if (this.mode === "AIR" && player.grounded && !previousGrounded) {
                    this.pendingCaptureMs = 0;
                    if (input.held) {
                        this.mode = "MANUAL";
                        this.manualElapsedMs = 0;
                        player.y = groundY;
                        player.verticalVelocity = 0;
                        player.grounded = true;
                        if (tricks && typeof tricks.cancelInput === "function") tricks.cancelInput();
                        emit("MANUAL_ENTER");
                    } else {
                        this.mode = "GROUND";
                        emit("NORMAL_LANDING");
                    }
                    return transitions;
                }

                if (this.mode === "AIR" && !player.grounded) {
                    if (player.x > this.lastExitedRailMaxX + SETTINGS.grindCaptureRadiusPx) {
                        this.lastExitedRailId = null;
                        this.lastExitedRailMaxX = -Infinity;
                    }
                    if (input.pressed && input.held) {
                        this.pendingCaptureMs = SETTINGS.grindInputBufferMs;
                    } else if (!input.held) {
                        this.pendingCaptureMs = 0;
                    } else if (this.pendingCaptureMs > 0) {
                        this.pendingCaptureMs = Math.max(0, this.pendingCaptureMs - dtMs);
                    }
                    const captureRails = this.lastExitedRailId
                        ? rails.filter(rail => rail.id !== this.lastExitedRailId)
                        : rails;
                    const nearest = findCaptureCandidate(player, captureRails, forwardSpeed);
                    this.captureDebug = nearest ? {
                        railId: nearest.rail.id, x: nearest.x, y: nearest.y,
                        distance: nearest.distance,
                        capturable: nearest.withinCaptureZone,
                        buffered: this.pendingCaptureMs > 0
                    } : {
                        railId: "", x: player.x, y: player.y, distance: Infinity,
                        capturable: false, buffered: this.pendingCaptureMs > 0
                    };
                    if (input.held && nearest?.withinCaptureZone) {
                        const bounds = getRailBounds(nearest.rail);
                        if (nearest.x < bounds.minX - SETTINGS.grindCaptureRadiusPx
                            || nearest.x > bounds.maxX + SETTINGS.grindCaptureRadiusPx) return transitions;
                        const snapDistance = Math.hypot(nearest.x - player.x, nearest.y - player.y);
                        if (snapDistance > SETTINGS.grindCaptureRadiusPx) return transitions;
                        this.mode = "GRIND";
                        this.activeRail = nearest.rail;
                        player.grindingRailId = nearest.rail.id;
                        this.manualElapsedMs = 0;
                        this.grindDistance = 0;
                        this.lastX = player.x;
                        const slope = nearest.slope;
                        const entryVx = player.forwardSpeed || forwardSpeed;
                        const projectedVx = (entryVx + player.verticalVelocity*slope)/(1+slope*slope);
                        const railYAtPlayer = nearest.y + (player.x-nearest.x)*slope;
                        this.captureBlend = {
                            elapsedMs: 0, entryVx,
                            projectedVx: Math.max(entryVx*.96, Math.min(entryVx*1.04, projectedVx)),
                            offset: player.y-railYAtPlayer,
                            normalVelocity: player.verticalVelocity-slope*entryVx
                        };
                        player.grindForwardSpeed = entryVx;
                        player.grindCaptureProgress = 0;
                        player.grounded = false;
                        this.pendingCaptureMs = 0;
                        if (tricks && typeof tricks.cancelInput === "function") tricks.cancelInput();
                        emit("GRIND_ENTER", {
                            railId: nearest.rail.id,
                            snapPx: snapDistance,
                            railLength: railLength(nearest.rail)
                        });
                    }
                    return transitions;
                }

                return transitions;
            }
        };
        return controller.reset();
    }

    return Object.freeze({
        SETTINGS,
        TEST_RAILS,
        getRailBounds,
        getGrindPath: rail => rail.grindPath || rail.points,
        sampleRail,
        nearestRailPoint,
        findCaptureCandidate,
        railLength,
        distanceAlongRail,
        createController
    });
});
