/* Skate rider presentation. Reads physical state; never writes to the player. */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateRiderPresentation = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
    const ANIMATIONS = Object.freeze({
        RIDING: "ride_idle",
        PUSH: "push_accelerate",
        NORMAL_JUMP: "normal_jump",
        OLLIE: "ollie_board_flip",
        SUPER_JUMP: "super_jump",
        GRINDING: "grind_stance",
        RAMP_PREP: "grind_stance",
        GRIND_JUMP_OUT: "grind_jump_out",
        AIRBORNE: "air_catch_landing",
        LANDING: "air_catch_landing",
        BENCH_TRICK: "bench_trick_slide",
        STUMBLE: "stumble_near_fail",
        CRASH: "crash_fall_off_board"
    });
    const DURATION_MS = Object.freeze({
        NORMAL_JUMP: 190, OLLIE: 300, SUPER_JUMP: 320,
        GRIND_JUMP_OUT: 180, AIRBORNE: 240, LANDING: 180,
        STUMBLE: 250, CRASH: 450
    });
    const LOOP_INTERVAL_MS = Object.freeze({
        RIDING: 120, PUSH: 95, GRINDING: 105, RAMP_PREP:105, BENCH_TRICK: 115
    });

    function placement(frame, x, boardContactY, scale) {
        return {
            x: x + frame.drawOffsetPx[0] * scale,
            y: boardContactY + frame.drawOffsetPx[1] * scale,
            width: frame.size[0] * scale,
            height: frame.size[1] * scale
        };
    }

    function createPresenter(catalog) {
        if (!catalog?.zorp?.animations) throw new Error("SkateAssetsV2.zorp.animations is required");
        const framesByState = Object.fromEntries(Object.entries(ANIMATIONS).map(([state, group]) => [
            state,
            catalog.zorp.animations[group].filter(frame => frame.gameplayRecommended && (
                state === "CRASH" ? frame.characterVisible === true : frame.boardAttached === true
            ))
        ]));
        for (const [state, frames] of Object.entries(framesByState)) {
            if (!frames.length) throw new Error(`No usable Skate 2.0 frames for ${state}`);
        }
        let previousPlayer = null;
        let previousMode = "";
        let previousLandings = 0;
        let previousTakeoffs = 0;
        let previousPhase = "";
        let visualState = "";
        let stateStartedAt = 0;
        let landingAt = -Infinity;
        let grindOutAt = -Infinity;

        function reset() {
            previousPlayer = null;
            previousMode = "";
            previousLandings = 0;
            previousTakeoffs = 0;
            previousPhase = "";
            visualState = "";
            stateStartedAt = 0;
            landingAt = -Infinity;
            grindOutAt = -Infinity;
        }

        function select({ player, phase, mode, nowMs, elapsedSec = 0,
            benchActive = false, stumble = false, activeTrick = null, groundY = null }) {
            if (!player) return null;
            if (player !== previousPlayer) {
                reset();
                previousPlayer = player;
                previousLandings = player.landings || 0;
                previousTakeoffs = player.takeoffs || 0;
            }
            const now = Number.isFinite(nowMs) ? nowMs : 0;
            if ((player.landings || 0) > previousLandings) landingAt = now;
            const grindLaunch = player.jumpTier === "grind-hop"
                || (player.grindLaunchTakeoff > 0 && player.grindLaunchTakeoff === player.takeoffs);
            if (grindLaunch && (
                (player.takeoffs || 0) > previousTakeoffs || previousMode === "GRIND"
            )) grindOutAt = now;

            let state;
            if (phase === "FAILED" || mode === "CRASH") state = "CRASH";
            else if (stumble || player.stumble || player.nearFail) state = "STUMBLE";
            else if (mode === "GRIND") state = "GRINDING";
            else if (player.grounded && player.rampRide?.prepared) state = "RAMP_PREP";
            else if (!player.grounded && grindLaunch
                && now - grindOutAt < DURATION_MS.GRIND_JUMP_OUT) state = "GRIND_JUMP_OUT";
            else if (player.grounded && benchActive) state = "BENCH_TRICK";
            else if (player.grounded && now - landingAt < DURATION_MS.LANDING) state = "LANDING";
            else if (!player.grounded) {
                const tier = player.jumpTier || "";
                const distanceToGround = Number.isFinite(groundY) ? groundY - player.y : Infinity;
                if (player.verticalVelocity > 0 && distanceToGround >= 0 && distanceToGround < 34) {
                    state = "AIRBORNE";
                } else if (tier === "super" || tier === "ramp-high" || tier === "mega-air") {
                    state = "SUPER_JUMP";
                } else if (tier === "ollie" || tier === "ramp-medium"
                    || player.airTrick === "kickflip"
                    || ["kickflip", "heelflip", "varial", "hardflip"].includes(activeTrick?.id)) {
                    state = "OLLIE";
                } else if (tier === "normal" || tier === "ramp-low") {
                    state = "NORMAL_JUMP";
                } else state = "AIRBORNE";
            } else if (elapsedSec < 0.55 && !player.takeoffs) state = "PUSH";
            else state = "RIDING";

            if (state !== visualState || phase !== previousPhase) {
                visualState = state;
                stateStartedAt = now;
            }
            const frames = framesByState[state];
            const interval = LOOP_INTERVAL_MS[state];
            const age = Math.max(0, now - stateStartedAt);
            const index = interval
                ? Math.floor(age / interval) % frames.length
                : Math.min(frames.length - 1,
                    Math.floor(age / (DURATION_MS[state] || 240) * frames.length));
            previousMode = mode;
            previousLandings = player.landings || 0;
            previousTakeoffs = player.takeoffs || 0;
            previousPhase = phase;
            return { state, frame: frames[index], frameIndex: index };
        }

        return { select, reset, framesByState };
    }

    return Object.freeze({ ANIMATIONS, createPresenter, placement });
});
