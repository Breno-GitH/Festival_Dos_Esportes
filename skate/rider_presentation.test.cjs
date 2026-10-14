const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const catalog = require("../skate_v2/catalog.js");
const presentation = require("./rider_presentation.js");

function rider(overrides = {}) {
    return {
        x: 100, y: 200, groundContactY: 200, verticalVelocity: 0,
        grounded: true, jumpTier: "", takeoffs: 0, landings: 0,
        airTrick: null, ...overrides
    };
}

function pose(presenter, player, nowMs, extra = {}) {
    return presenter.select({ player, phase: "PLAYING", mode: player.grounded ? "GROUND" : "AIR",
        nowMs, elapsedSec: 5, groundY: 250, ...extra });
}

test("every gameplay pose uses an existing Skate 2.0 frame with its board attached", () => {
    const presenter = presentation.createPresenter(catalog);
    for (const [state, frames] of Object.entries(presenter.framesByState)) {
        assert.ok(frames.length, state);
        for (const frame of frames) {
            assert.ok(fs.existsSync(path.join(__dirname, "..", frame.file)), frame.file);
            if (state !== "CRASH") assert.equal(frame.boardAttached, true, frame.id);
            else assert.equal(frame.characterVisible, true, frame.id);
            assert.equal(frame.source, "zorp_skate2.0.png", frame.id);
        }
    }
    assert.ok(presenter.framesByState.SUPER_JUMP.every(frame => frame.gameplayRecommended));
    assert.ok(!presenter.framesByState.SUPER_JUMP.some(frame => /_03$|_05$/.test(frame.id)));
});

test("ride, normal jump, Ollie, Super Jump, air catch and landing follow physical state", () => {
    const presenter = presentation.createPresenter(catalog);
    const p = rider();
    assert.equal(pose(presenter, p, 1000).state, "RIDING");
    Object.assign(p, { grounded: false, jumpTier: "normal", verticalVelocity: -180, takeoffs: 1 });
    assert.equal(pose(presenter, p, 1020).state, "NORMAL_JUMP");
    p.jumpTier = "ollie";
    assert.equal(pose(presenter, p, 1080).state, "OLLIE");
    p.jumpTier = "super";
    assert.equal(pose(presenter, p, 1140).state, "SUPER_JUMP");
    p.verticalVelocity = 90;
    p.y = 225;
    assert.equal(pose(presenter, p, 1200).state, "AIRBORNE");
    Object.assign(p, { grounded: true, y: 250, groundContactY: 250, landings: 1 });
    assert.equal(pose(presenter, p, 1220).state, "LANDING");
    assert.equal(pose(presenter, p, 1450).state, "RIDING");
});

test("grind, jump out, bench top, crash and respawn use their own poses", () => {
    const presenter = presentation.createPresenter(catalog);
    const p = rider({ grounded: false, jumpTier: "normal", takeoffs: 1 });
    assert.equal(pose(presenter, p, 1000, { mode: "GRIND" }).state, "GRINDING");
    p.jumpTier = "grind-hop";
    p.takeoffs = 2;
    assert.equal(pose(presenter, p, 1020).state, "GRIND_JUMP_OUT");
    assert.equal(pose(presenter, p, 1250).state, "AIRBORNE");
    p.grounded = true;
    p.landings = 1;
    assert.equal(pose(presenter, p, 1300, { benchActive: true }).state, "BENCH_TRICK");
    const crash = pose(presenter, p, 1320, { phase: "FAILED", mode: "CRASH" });
    assert.equal(crash.state, "CRASH");
    const next = rider();
    assert.equal(pose(presenter, next, 1400).state, "RIDING");
    assert.equal(pose(presenter, next, 1400).frame.boardAttached, true);
});

test("push, board flip trick and near-fail keep the board attached", () => {
    const presenter = presentation.createPresenter(catalog);
    const p = rider();
    assert.equal(pose(presenter, p, 1000, { elapsedSec: 0.1 }).state, "PUSH");
    Object.assign(p, { grounded: false, jumpTier: "normal", verticalVelocity: -100, takeoffs: 1 });
    assert.equal(pose(presenter, p, 1100, { activeTrick: { id: "kickflip" } }).state, "OLLIE");
    assert.equal(pose(presenter, p, 1150, { stumble: true }).state, "STUMBLE");
});

test("frame anchor keeps board contact fixed through every gameplay animation", () => {
    const presenter = presentation.createPresenter(catalog);
    for (const [state, frames] of Object.entries(presenter.framesByState)) {
        if (state === "CRASH") continue;
        for (const frame of frames) {
            const destination = presentation.placement(frame, 100, 240, 0.34);
            const boardX = destination.x + frame.boardContactPx[0] * 0.34;
            const boardY = destination.y + frame.boardContactPx[1] * 0.34;
            assert.ok(Math.abs(boardX - 100) < 0.001, `${frame.id} board x`);
            assert.ok(Math.abs(boardY - 240) < 0.001, `${frame.id} board y`);
        }
    }
});
