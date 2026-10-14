const test = require("node:test");
const assert = require("node:assert/strict");
const physics = require("./ollie_physics.js");
const traversal = require("./traversal_system.js");
const course = require("./mechanics_test_course.js");
const assets = require("../skate_new/asset_catalog.js");
const geometry = require("../skate_new/collision_geometry.js");
const { run: runKeyboardReplay } = require("./level_playtest.cjs");

function makeMechanicsSimulation(startX, overrides = {}) {
    const platformAsset = assets.props.gameplay.find(item => item.id === "platform-wide");
    const landingPlatform = geometry.createPlatformGeometry(platformAsset, {
        id: "test-special-air-landing", x: 2770, bottomY: 250, width: 230, height: 60
    });
    return physics.createSimulation({
        startX,
        distanceOriginX: course.spawnX,
        forwardSpeed: 230,
        groundSegments: course.groundSegments,
        ramps: course.ramps,
        collisionObjects: [landingPlatform],
        obstacles: [],
        obstacle: null,
        failY: 520,
        ...overrides
    });
}

function runSpecialAir(spaceHeld, dHeld, releaseAfterMs = Infinity) {
    const specialRamp = course.ramps.find(item => item.specialAir);
    const simulation = makeMechanicsSimulation(specialRamp.endX - 0.2);
    let launched = false;
    let slowMotionWindowObserved = false;
    for (let step = 0; step < 900 && simulation.state.phase === "PLAYING"; step++) {
        const special = simulation.state.player.specialRampAir;
        const elapsedMs = special?.elapsedMs || 0;
        launched ||= special?.active === true || special?.landed === true;
        const keepControls = elapsedMs < releaseAfterMs;
        simulation.step({ spaceHeld: spaceHeld && keepControls, dHeld: dHeld && keepControls }, 1 / 120);
        const current = simulation.state.player.specialRampAir;
        slowMotionWindowObserved ||= Boolean(current?.active && current.elapsedMs < current.slowMotionMs);
        if (simulation.state.player.landings > 0 || simulation.state.phase === "FAILED") break;
    }
    return { simulation, launched, slowMotionWindowObserved };
}

test("dedicated mechanics course authors a four-rail no-ground chain and one special ramp", () => {
    assert.equal(course.isMechanicsTestCourse, true);
    assert.equal(course.rails.length, 4);
    assert.deepEqual(course.rails.map(rail => rail.type), ["horizontal", "horizontal", "descending", "horizontal"]);
    assert.ok(course.rails[3].points[0].y < course.rails[0].points[0].y - 100);
    assert.equal(course.ramps.filter(ramp => ramp.specialAir).length, 1);
    assert.equal(course.ramps.find(ramp => ramp.specialAir).autoLaunch, true);
    assert.ok(course.decor.some(item => item.id === "controls-bench" && item.trickable),
        "the short mechanics course includes a safe-top/dangerous-side bench after the rail chain");
});

test("Rail → Jump → Rail → Jump → Rail chain reaches all four rails before any landing", () => {
    const simulation = makeMechanicsSimulation(course.spawnX);
    const controller = traversal.createController();
    let held = false;
    let pressId = 0;
    let stage = "approach";
    let targetRailIndex = -1;
    let holdFrames = 0;
    let capturePressId = 0;
    let enteredRails = [];
    const entryTiers = [];
    let chainCleared = false;

    for (let frame = 0; frame < 1000 && simulation.state.phase === "PLAYING" && !chainCleared; frame++) {
        const player = simulation.state.player;
        let pressed = false;
        if (stage === "grind" && controller.activeRail
            && player.x >= controller.activeRail.points.at(-1).x - 5) {
            held = false;
            stage = "release-exit";
        } else if (stage === "release-exit") {
            held = true;
            pressId++;
            pressed = true;
            stage = "after-exit";
        } else if (stage === "after-exit") {
            held = false;
            stage = "fresh-release";
        } else if (stage === "charge-super") {
            held = true;
            holdFrames++;
            if (holdFrames >= 42) stage = "release-super";
        } else if (stage === "release-super") {
            held = false;
            stage = "fresh-release";
        } else if (stage === "fresh-release") {
            const candidate = traversal.findCaptureCandidate(player, course.rails,
                player.forwardSpeed || 230, { lookAheadMs: traversal.SETTINGS.grindInputBufferMs, gravity: simulation.config.gravity,
                    excludeRailIds: controller.lastExitedRailId ? [controller.lastExitedRailId] : [] });
            if (candidate) {
                held = true;
                pressed = true;
                pressId++;
                capturePressId = pressId;
                stage = "await-grind";
            }
        } else if (stage === "approach") {
            const candidate = traversal.findCaptureCandidate(player, course.rails,
                player.forwardSpeed || 230, { lookAheadMs: traversal.SETTINGS.grindInputBufferMs, gravity: simulation.config.gravity,
                    excludeRailIds: controller.lastExitedRailId ? [controller.lastExitedRailId] : [] });
            if (candidate) {
                held = true;
                pressed = true;
                pressId++;
                capturePressId = pressId;
                stage = "await-grind";
            }
        }

        const superJumpUpgrade = stage === "charge-super" && holdFrames === 40;
        const previousGrounded = player.grounded;
        const previousX = player.x;
        simulation.step({ spacePressed: pressed, spaceHeld: held, superJumpUpgrade }, 1 / 120);
        const events = controller.update({
            player,
            previousGrounded,
            previousX,
            input: { held, pressed, pressId },
            rails: course.rails,
            forwardSpeed: player.forwardSpeed || 230,
            groundY: physics.groundHeightAt(player.x, simulation.config),
            dtSeconds: 1 / 120,
            simulation
        });
        for (const event of events) {
            if (event.type === "GRIND_ENTER") {
                enteredRails.push(event.railId);
                entryTiers.push(player.jumpTier);
                targetRailIndex = course.rails.findIndex(rail => rail.id === event.railId);
                stage = "grind";
                assert.equal(player.landings, 0, "chain entries happen without touching the ground");
            } else if (event.type === "GRIND_OLLIE_OUT") {
                if (targetRailIndex === 3) chainCleared = true;
                stage = "after-exit";
            }
        }
    }
    assert.deepEqual(enteredRails, course.rails.map(rail => rail.id));
    assert.equal(chainCleared, true, "the final rail can also be exited without landing");
    assert.equal(simulation.state.phase, "PLAYING");
    assert.equal(simulation.state.player.landings, 0);
    assert.equal(entryTiers.at(-1), "super", "the final high rail uses the Super Jump upgrade");
});

test("real SPACE key events clear the short course and capture four rails without ground contact", () => {
    const replay = runKeyboardReplay({ course });
    assert.equal(replay.phase, "COMPLETED", `failed at ${replay.x}: ${replay.failureReason}`);
    assert.deepEqual(replay.enteredRails.slice(0, 4), course.rails.map(rail => rail.id));
    const firstRail = replay.transitions.findIndex(event => event.rail === course.rails[0].id);
    const fourthRail = replay.transitions.findIndex(event => event.rail === course.rails[3].id);
    assert.ok(firstRail >= 0 && fourthRail > firstRail);
    assert.equal(replay.transitions.slice(firstRail, fourthRail).some(event => event.mode === "GROUND"), false);
    assert.ok(replay.trace.some(item => item.mode === "GRIND" && item.tier === "super"
        && item.x >= course.rails[3].points[0].x && item.x <= course.rails[3].points.at(-1).x),
    "a held Grind Jump reaches the high fourth rail as Super Jump");
    assert.ok(replay.inputs.some(event => event.action === "normal" && event.x > 1700 && event.x < 1840),
        "the test bench has an actual jump setup");
});

test("errar o segundo rail sem manter SPACE causa queda, sem captura automática", () => {
    const replay = runKeyboardReplay({ course, skipRail: course.rails[1].id });
    assert.equal(replay.phase, "FAILED");
    assert.equal(replay.failureReason, "FELL_IN_GAP");
    assert.deepEqual(replay.enteredRails, [course.rails[0].id]);
});

test("soltar o Grind lança imediatamente; novo hold captura o próximo rail", () => {
    const controller = traversal.createController();
    const rail = { id: "A", points: [{ x: 0, y: 100 }, { x: 100, y: 100 }] };
    const nextRail = { id: "B", points: [{ x: 120, y: 100 }, { x: 200, y: 100 }] };
    const player = { x: 20, y: 100, verticalVelocity: 0, grounded: false };
    const simulation = { launchFromGrind() { player.verticalVelocity = -390; return true; } };
    controller.update({ player, input: { pressed: true, held: true, pressId: 1 }, rails: [rail], forwardSpeed: 230 });
    const released = controller.update({ player, input: { held: false, released: true, pressId: 1 },
        rails: [rail], forwardSpeed: 230, dtSeconds: 1 / 120, simulation });
    assert.equal(released.some(event => event.type === "GRIND_OLLIE_OUT"), true);
    const jumped = controller.update({ player, input: { held: true, pressed: true, pressId: 2 },
        rails: [rail], forwardSpeed: 230, simulation });
    assert.equal(jumped.length, 0);
    player.x = 130;
    player.y = 100;
    player.verticalVelocity = -100;
    const sameHold = controller.update({ player, input: { held: true, pressId: 2 }, rails: [nextRail], forwardSpeed: 230 });
    assert.equal(sameHold.some(event => event.type === "GRIND_ENTER"), true);
});

test("test bench accepts a normal jump on top and crashes on a direct side impact", () => {
    const bench = course.decor.find(item => item.id === "controls-bench");
    const asset = assets.props.gameplay.find(item => item.id === bench.assetId);
    const collider = geometry.createPlatformGeometry(asset, {
        id: bench.id, x: bench.x, bottomY: 250, width: bench.width, height: bench.height
    });
    function approach(jump) {
        const simulation = makeMechanicsSimulation(1790, { collisionObjects: [collider] });
        for (let step = 0; step < 180; step++) {
            simulation.step({ spacePressed: jump && step === 0 }, 1 / 120);
            if (simulation.state.phase === "FAILED"
                || simulation.state.player.lastLandingPlatformId === bench.id) break;
        }
        return simulation.state;
    }
    const top = approach(true);
    assert.equal(top.phase, "PLAYING");
    assert.equal(top.player.lastLandingPlatformId, bench.id);
    assert.equal(top.player.grounded, true);
    const side = approach(false);
    assert.equal(side.phase, "FAILED");
    assert.equal(side.player.hitObstacleId, bench.id);
});

test("Mega Air launches from ramp and SPACE alone carries Zorp to landing", () => {
    const noInput = runSpecialAir(false, false);
    const spaceOnly = runSpecialAir(true, false);
    const dOnly = runSpecialAir(false, true);
    const correct = runSpecialAir(true, true);

    for (const result of [noInput, spaceOnly, dOnly, correct]) {
        assert.equal(result.launched, true, "the special ramp launches automatically");
        assert.equal(result.slowMotionWindowObserved, true, "the launch starts a short slow-motion window");
    }
    for (const result of [noInput, dOnly]) {
        assert.equal(result.simulation.state.phase, "FAILED", "incomplete controls do not cross the special gap");
        assert.equal(result.simulation.state.player.landings, 0);
    }
    assert.equal(correct.simulation.state.phase, "PLAYING");
    assert.equal(spaceOnly.simulation.state.phase,"PLAYING");
    assert.equal(spaceOnly.simulation.state.player.specialRampAir.state,"MEGA_AIR");
    assert.equal(correct.simulation.state.player.landings, 1);
    assert.equal(correct.simulation.state.player.specialRampAir.landed, true);
    assert.ok(correct.simulation.state.player.specialRampAir.controlledMs <= 1460,
        "SPACE support ends at its configured maximum instead of granting flight");
});

test("soltar SPACE cedo remove sustentação e causa queda", () => {
    const earlyRelease = runSpecialAir(true, true, 250);
    assert.equal(earlyRelease.simulation.state.phase, "FAILED");
    assert.equal(earlyRelease.simulation.state.failureReason, "FELL_IN_GAP");
    assert.equal(earlyRelease.simulation.state.player.specialRampAir.releasedEarly, true);
});
