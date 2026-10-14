const test = require("node:test");
const assert = require("node:assert/strict");
const physics = require("./ollie_physics.js");
const { COURSE } = require("./course.js");

const DT = 1 / 120;

function courseSimulation() {
    return physics.createSimulation({
        startX: COURSE.spawnX,
        distanceOriginX: COURSE.spawnX,
        groundSegments: COURSE.groundSegments,
        ramps: COURSE.ramps,
        obstacles: COURSE.obstacles,
        obstacle: null,
        failY: 520
    });
}

test("ZERO INPUT falha no primeiro gap da rota", () => {
    const simulation = courseSimulation();
    let frames = 0;
    while (simulation.state.phase === "PLAYING" && frames++ < 2000) simulation.step({}, DT);
    assert.equal(simulation.state.phase, "FAILED");
    assert.equal(simulation.state.failureReason, "FELL_IN_GAP");
});

test("HOLD SPACE vira um único Super Jump e não completa automaticamente", () => {
    const simulation = courseSimulation();
    let frames = 0;
    while (simulation.state.phase === "PLAYING" && frames++ < 2000) {
        simulation.step(frames === 1
            ? { spacePressed: true, spaceHeld: true }
            : frames === 37
            ? { spaceHeld: true, superJumpUpgrade: true }
            : { spaceHeld: true }, DT);
    }
    assert.equal(simulation.state.phase, "FAILED");
    assert.equal(simulation.state.player.takeoffs, 1);
    assert.equal(simulation.state.player.jumpTier === "super" || simulation.state.player.jumpTier === "", true);
    assert.ok(simulation.state.player.holdMs <= physics.DEFAULTS.holdThresholdsMs.maximum);
});

test("MASH SPACE em ciclos de 100 ms não limpa a pista", () => {
    const simulation = courseSimulation();
    let frames = 0;
    while (simulation.state.phase === "PLAYING" && frames < 30000) {
        const phase = frames % 12;
        if (phase === 0) simulation.step({ spacePressed: true, spaceHeld: true }, DT);
        else if (phase >= 1 && phase <= 4) simulation.step({ spaceHeld: true }, DT);
        else if (phase === 5) simulation.step({ spaceReleased: true, holdDurationMs: 40 }, DT);
        else simulation.step({}, DT);
        frames++;
        simulation.config.forwardSpeed = COURSE.forwardSpeedAt(simulation.state.player.x);
    }
    assert.equal(simulation.state.phase, "FAILED", `phase=${simulation.state.phase} x=${simulation.state.player.x}`);
    assert.ok(simulation.state.player.x < COURSE.finish.x);
});
