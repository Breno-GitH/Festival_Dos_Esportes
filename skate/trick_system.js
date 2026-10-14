(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateTricks = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
    const frameSequence = (row, count, order = null) =>
        (order || Array.from({ length: count }, (_, index) => index + 1))
            .map(index => `zorp_skate_pro3_${row}_${String(index).padStart(2, "0")}.png`);

    const TRICKS = Object.freeze({
        kickflip: Object.freeze({
            id: "kickflip", name: "KICKFLIP", sequence: "T", durationMs: 150, baseScore: 320,
            frames: Object.freeze(frameSequence("row04", 5)), mirror: false
        }),
        heelflip: Object.freeze({
            id: "heelflip", name: "HEELFLIP", sequence: "TT", durationMs: 160, baseScore: 360,
            frames: Object.freeze(frameSequence("row04", 5, [1, 4, 3, 2, 5])), mirror: true
        }),
        spin: Object.freeze({
            id: "spin", name: "360 SPIN", sequence: "H", durationMs: 240, baseScore: 460,
            frames: Object.freeze(frameSequence("row03", 5)), mirror: false
        }),
        grab: Object.freeze({
            id: "grab", name: "INDY GRAB", sequence: "TH", durationMs: 180, baseScore: 350,
            frames: Object.freeze(frameSequence("row05", 4)), mirror: false
        }),
        varial: Object.freeze({
            id: "varial", name: "VARIAL KICKFLIP", sequence: "TTH", durationMs: 210, baseScore: 430,
            frames: Object.freeze(frameSequence("row04", 5)), mirror: true
        }),
        hardflip: Object.freeze({
            id: "hardflip", name: "HARD FLIP", sequence: "TTT", durationMs: 230, baseScore: 490,
            frames: Object.freeze(frameSequence("row04", 5, [1, 4, 3, 2, 5])), mirror: true
        })
    });

    const SEQUENCE_TO_TRICK = Object.freeze(Object.fromEntries(
        Object.values(TRICKS).map(trick => [trick.sequence, trick.id])
    ));

    const SETTINGS = Object.freeze({
        holdTokenMs: 140,
        sequenceWindowMs: 90,
        sequenceCooldownMs: 30,
        landingReserveMs: 65,
        maxTricksPerAir: 2,
        repeatScale: 0.70,
        minimumRepetitionPenalty: 0.25,
        varietyBonusRate: 0.20
    });

    function createController() {
        const controller = {
            airborne: false,
            sequenceTokens: [],
            sequenceTimerMs: 0,
            pressStartedAt: null,
            pendingTrick: null,
            trickActive: false,
            activeTrick: null,
            trickDuration: 0,
            trickElapsedMs: 0,
            completedAirTricks: 0,
            sequenceCooldownMs: 0,
            repetitionCounts: Object.create(null),
            seenThisAir: new Set(),
            score: 0,
            lastResult: null,
            reset() {
                this.airborne = false;
                this.sequenceTokens = [];
                this.sequenceTimerMs = 0;
                this.pressStartedAt = null;
                this.pendingTrick = null;
                this.trickActive = false;
                this.activeTrick = null;
                this.trickDuration = 0;
                this.trickElapsedMs = 0;
                this.completedAirTricks = 0;
                this.sequenceCooldownMs = 0;
                this.repetitionCounts = Object.create(null);
                this.seenThisAir = new Set();
                this.score = 0;
                this.lastResult = null;
                return this;
            },
            beginAir() {
                this.airborne = true;
                this.sequenceTokens = [];
                this.sequenceTimerMs = 0;
                this.pressStartedAt = null;
                this.pendingTrick = null;
                this.completedAirTricks = 0;
                this.sequenceCooldownMs = 0;
                this.trickActive = false;
                this.activeTrick = null;
                this.trickDuration = 0;
                this.trickElapsedMs = 0;
                this.seenThisAir = new Set();
            },
            endAir() {
                if (this.trickActive) {
                    this.lastResult = { status: "INTERRUPTED", trick: this.activeTrick.name };
                }
                this.airborne = false;
                this.sequenceTokens = [];
                this.sequenceTimerMs = 0;
                this.pressStartedAt = null;
                this.pendingTrick = null;
                this.trickActive = false;
                this.activeTrick = null;
                this.trickDuration = 0;
                this.trickElapsedMs = 0;
                this.completedAirTricks = 0;
                this.sequenceCooldownMs = 0;
            },
            press(nowMs, player) {
                if (!this.airborne || player.grounded || this.trickActive || this.pendingTrick || this.pressStartedAt !== null) return false;
                if (this.sequenceCooldownMs > 0 || this.completedAirTricks >= SETTINGS.maxTricksPerAir) return false;
                this.pressStartedAt = nowMs;
                return true;
            },
            release(nowMs) {
                if (this.pressStartedAt === null) return false;
                const heldMs = Math.max(0, nowMs - this.pressStartedAt);
                this.pressStartedAt = null;
                if (this.sequenceTokens.length >= 3) return false;
                this.sequenceTokens.push(heldMs >= SETTINGS.holdTokenMs ? "H" : "T");
                this.sequenceTimerMs = SETTINGS.sequenceWindowMs;
                const sequence = this.sequenceTokens.join("");
                if (sequence === "H" || sequence === "TH" || sequence === "TTH" || sequence === "TTT") {
                    this.queueSequence(sequence);
                }
                return true;
            },
            cancelInput() {
                this.sequenceTokens = [];
                this.sequenceTimerMs = 0;
                this.pressStartedAt = null;
                if (this.pendingTrick) this.pendingTrick = null;
            },
            queueSequence(sequence) {
                const trickId = SEQUENCE_TO_TRICK[sequence];
                if (!trickId) {
                    this.lastResult = { status: "UNMAPPED_SEQUENCE", sequence };
                    this.sequenceTokens = [];
                    this.sequenceTimerMs = 0;
                    return false;
                }
                this.pendingTrick = TRICKS[trickId];
                this.sequenceTokens = [];
                this.sequenceTimerMs = 0;
                return true;
            },
            startPending(remainingAirMs) {
                const trick = this.pendingTrick;
                if (!trick) return false;
                if (this.completedAirTricks >= SETTINGS.maxTricksPerAir) {
                    this.lastResult = { status: "AIR_TRICK_LIMIT", trick: trick.name };
                    this.pendingTrick = null;
                    return false;
                }
                const requiredMs = trick.durationMs + SETTINGS.landingReserveMs;
                if (remainingAirMs < requiredMs) {
                    this.lastResult = {
                        status: "NOT_ENOUGH_AIRTIME",
                        trick: trick.name,
                        availableMs: Math.max(0, Math.round(remainingAirMs)),
                        requiredMs
                    };
                    this.pendingTrick = null;
                    return false;
                }
                this.activeTrick = trick;
                this.trickActive = true;
                this.trickDuration = trick.durationMs;
                this.trickElapsedMs = 0;
                this.completedAirTricks++;
                this.pendingTrick = null;
                this.lastResult = { status: "STARTED", trick: trick.name, sequence: trick.sequence };
                return true;
            },
            completeActive() {
                const trick = this.activeTrick;
                if (!trick) return;
                const repetitions = this.repetitionCounts[trick.id] || 0;
                const repetitionPenalty = Math.max(
                    SETTINGS.minimumRepetitionPenalty,
                    Math.pow(SETTINGS.repeatScale, repetitions)
                );
                const earnsVariety = this.seenThisAir.size > 0 && !this.seenThisAir.has(trick.id);
                const varietyBonus = earnsVariety ? Math.round(trick.baseScore * SETTINGS.varietyBonusRate) : 0;
                const score = Math.floor(trick.baseScore * repetitionPenalty + varietyBonus);
                this.repetitionCounts[trick.id] = repetitions + 1;
                this.seenThisAir.add(trick.id);
                this.score += score;
                this.lastResult = {
                    status: "COMPLETED",
                    trick: trick.name,
                    baseScore: trick.baseScore,
                    repetitionPenalty: Number(repetitionPenalty.toFixed(3)),
                    varietyBonus,
                    score,
                    totalScore: this.score
                };
                this.trickActive = false;
                this.activeTrick = null;
                this.trickDuration = 0;
                this.trickElapsedMs = 0;
                this.sequenceCooldownMs = SETTINGS.sequenceCooldownMs;
            },
            update(player, dtSeconds, remainingAirMs) {
                const dtMs = Math.max(0, dtSeconds * 1000);
                if (player.grounded) {
                    if (this.airborne) this.endAir();
                    return this.lastResult;
                }
                if (!this.airborne) this.beginAir();

                if (this.sequenceCooldownMs > 0) {
                    this.sequenceCooldownMs = Math.max(0, this.sequenceCooldownMs - dtMs);
                }

                if (this.trickActive) {
                    this.trickElapsedMs += dtMs;
                    if (this.trickElapsedMs >= this.trickDuration) this.completeActive();
                }

                if (this.pendingTrick && !this.trickActive && this.sequenceCooldownMs <= 0) {
                    this.startPending(remainingAirMs);
                }

                if (this.sequenceTimerMs > 0 && this.pressStartedAt === null && !this.pendingTrick && !this.trickActive) {
                    this.sequenceTimerMs = Math.max(0, this.sequenceTimerMs - dtMs);
                    if (this.sequenceTimerMs <= 0 && this.sequenceTokens.length > 0) {
                        this.queueSequence(this.sequenceTokens.join(""));
                        if (this.pendingTrick) this.startPending(remainingAirMs);
                    }
                }
                return this.lastResult;
            },
            getAnimationFrameIndex() {
                if (!this.activeTrick || !this.activeTrick.frames.length) return 0;
                return Math.min(
                    this.activeTrick.frames.length - 1,
                    Math.floor(this.trickElapsedMs / this.trickDuration * this.activeTrick.frames.length)
                );
            }
        };
        return controller.reset();
    }

    function remainingAirTimeMs(player, gravity, groundY) {
        if (player.grounded || !Number.isFinite(gravity) || gravity <= 0) return 0;
        const heightToGround = Math.max(0, groundY - player.y);
        const discriminant = player.verticalVelocity * player.verticalVelocity + 2 * gravity * heightToGround;
        const seconds = (-player.verticalVelocity + Math.sqrt(discriminant)) / gravity;
        return Math.max(0, seconds * 1000);
    }

    return Object.freeze({
        TRICKS,
        SEQUENCE_TO_TRICK,
        SETTINGS,
        createController,
        remainingAirTimeMs
    });
});
