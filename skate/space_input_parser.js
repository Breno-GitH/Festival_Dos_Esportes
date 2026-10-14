(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateSpaceInput = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
    const SETTINGS = Object.freeze({ doubleTapWindowMs: 220 });

    function createParser(settings = {}) {
        const config = { ...SETTINGS, ...settings };
        return {
            down: null,
            lastGroundJumpAt: null,
            reset() {
                this.down = null;
                this.lastGroundJumpAt = null;
                return this;
            },
            consumeJumpIntent() {
                // Rail capture consumes the airborne intent. Keeping the same key
                // down through the end of a rail must never upgrade a stale jump.
                this.lastGroundJumpAt = null;
            },
            keyDown(nowMs, mode, context = {}) {
                if (this.down) return [];
                const events = [];
                if (mode === "MEGA_AIR") {
                    this.lastGroundJumpAt = null;
                    events.push({type:"MEGA_HOLD",at:nowMs});
                } else if (mode === "GROUND") {
                    this.lastGroundJumpAt = nowMs;
                    events.push({ type: "NORMAL_JUMP", at: nowMs });
                } else if (mode === "AIR") {
                    // Airborne hold is rail intent; it never adds jump energy.
                    if (context.grindCapturable) {
                        this.lastGroundJumpAt = null;
                        events.push({ type: "GRIND_CAPTURE_PRESS", at: nowMs });
                    } else if (this.lastGroundJumpAt !== null
                        && nowMs - this.lastGroundJumpAt <= config.doubleTapWindowMs) {
                        events.push({ type: "OLLIE_UPGRADE", at: nowMs });
                        this.lastGroundJumpAt = null;
                    } else {
                        events.push({ type: "AIR_PRESS", at: nowMs });
                    }
                } else if (mode === "GRIND") {
                    this.lastGroundJumpAt = null;
                    events.push({ type: "GRIND_PRESS", at: nowMs });
                }
                this.down = { mode, at: nowMs };
                return events;
            },
            keyUp(nowMs) {
                if (!this.down) return [];
                const { mode, at } = this.down;
                this.down = null;
                const holdMs = Math.max(0, nowMs - at);
                if (mode === "GROUND") return [{ type: "GROUND_RELEASE", holdMs }];
                if (mode === "AIR" || mode === "MEGA_AIR") return [{ type: "AIR_RELEASE", holdMs }];
                if (mode === "MANUAL") return [{ type: "MANUAL_RELEASE", holdMs }];
                if (mode === "GRIND") return [{ type: "GRIND_RELEASE", holdMs }];
                return [];
            },
            // Holding means rail intent only. Momentum launches belong to ramps/traversal.
            update() { return []; }
        };
    }

    return Object.freeze({ SETTINGS, createParser });
});
