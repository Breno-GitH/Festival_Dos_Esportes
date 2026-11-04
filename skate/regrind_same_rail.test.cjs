const test = require("node:test");
const assert = require("node:assert/strict");
const traversal = require("./traversal_system.js");

const dt = 1 / 120;

function advanceAir(player, seconds, gravity = 1650) {
    const steps = Math.ceil(seconds / dt);
    for (let i = 0; i < steps; i++) {
        player.x += 230 * dt;
        player.y += player.verticalVelocity * dt + 0.5 * gravity * dt * dt;
        player.verticalVelocity += gravity * dt;
    }
}

function capture(controller, player, rail) {
    return controller.update({
        player, input: { held: true, pressed: true }, rails: [rail],
        forwardSpeed: 230, dtSeconds: dt
    });
}

function leave(controller, player, rail) {
    const simulation = { launchFromGrind() { player.verticalVelocity = -400; return true; } };
    return controller.update({
        player, input: { held: false, released: true }, rails: [rail],
        forwardSpeed: 230, dtSeconds: dt, simulation
    });
}

test("same rail can be entered, exited, and re-entered three times without landing", () => {
    const rail = { id: "same", grindPath: [{ x: 0, y: 100 }, { x: 500, y: 100 }] };
    const controller = traversal.createController();
    const player = { x: 50, y: 100, verticalVelocity: 0, grounded: false, forwardSpeed: 230 };
    let entered = 0;

    assert.ok(capture(controller, player, rail).some(item => item.type === "GRIND_ENTER"));
    entered++;
    for (let attempt = 0; attempt < 3; attempt++) {
        assert.equal(controller.activeRail.id, rail.id);
        const exit = leave(controller, player, rail);
        assert.ok(exit.some(item => item.type === "GRIND_OLLIE_OUT"));
        assert.equal(player.grounded, false, "all exits remain airborne");
        assert.equal(controller.lastExitedRailId, rail.id, "history is retained for debug only");

        let recaptureEvent = [];
        for (let frame = 0; frame < 90 && !recaptureEvent.some(item => item.type === "GRIND_ENTER"); frame++) {
            advanceAir(player, dt);
            recaptureEvent = controller.update({
                player, input: { held: true }, rails: [rail], forwardSpeed: 230,
                dtSeconds: dt
            });
        }
        if (attempt < 2) {
            assert.ok(recaptureEvent.some(item => item.type === "GRIND_ENTER"), `regrind ${attempt + 1} succeeds in the same rail`);
            entered++;
        }
    }
    assert.equal(entered, 3);
    assert.equal(player.grounded, false);
});

test("re-entry has no rail identity lock and lastRailId does not invalidate a physically valid candidate", () => {
    const rail = { id: "same", points: [{ x: 0, y: 100 }, { x: 300, y: 100 }] };
    const controller = traversal.createController();
    const player = { x: 80, y: 100, verticalVelocity: 0, grounded: false, forwardSpeed: 230 };
    capture(controller, player, rail);
    leave(controller, player, rail);
    assert.equal(controller.reentryCooldownMs, traversal.SETTINGS.grindReentryCooldownMs);
    assert.equal(controller.reentryCooldownMs, 0);
    assert.equal(controller.findCandidate(player, [rail], 230)?.rail.id, rail.id, "history never excludes the rail");
    for (let i = 0; i < 12; i++) {
        advanceAir(player, dt);
        controller.update({ player, input: { held: true }, rails: [rail], forwardSpeed: 230, dtSeconds: dt });
    }
    player.x = 100;
    player.y = 100;
    player.verticalVelocity = 0;
    assert.equal(controller.lastExitedRailId, rail.id);
    assert.equal(controller.findCandidate(player, [rail], 230)?.rail.id, rail.id);
});

test("a short same-rail regrind remains playable but does not farm combo credit", () => {
    const rail = { id: "same", points: [{ x: 0, y: 100 }, { x: 300, y: 100 }] };
    const controller = traversal.createController();
    const player = { x: 60, y: 100, verticalVelocity: 0, grounded: false, forwardSpeed: 230 };
    capture(controller, player, rail);
    controller.update({
        player, input: { held: false, released: true }, rails: [rail], forwardSpeed: 230,
        dtSeconds: dt, simulation: { launchFromGrind() { player.verticalVelocity = -20; return true; } }
    });
    let entry = [];
    for (let frame = 0; frame < 20 && !entry.some(item => item.type === "GRIND_ENTER"); frame++) {
        advanceAir(player, dt);
        entry = controller.update({ player, input: { held: true }, rails: [rail], forwardSpeed: 230, dtSeconds: dt });
    }
    const reconnect = entry.find(item => item.type === "GRIND_ENTER");
    assert.ok(reconnect, "valid movement is never blocked for score reasons");
    assert.equal(reconnect.comboEligible, false, "less than the score anti-farm movement threshold");
    assert.equal(controller.mode, "GRIND");
});

test("inclined segment capture/regrind uses real point-to-segment distance and keeps momentum", () => {
    const rail = { id: "inclined", grindPath: [{ x: 0, y: 190 }, { x: 120, y: 130 }, { x: 250, y: 165 }] };
    const target = traversal.nearestRailPoint(rail, 75, 0);
    const player = {
        x: target.x - target.tangentY * 14,
        y: target.y + target.tangentX * 14,
        verticalVelocity: -230 * target.tangentY / target.tangentX,
        grounded: false,
        forwardSpeed: 230
    };
    const controller = traversal.createController();
    const before = { x: player.x, y: player.y, speed: player.forwardSpeed };
    const event = capture(controller, player, rail);
    assert.ok(event.some(item => item.type === "GRIND_ENTER"));
    assert.equal(player.x, before.x, "capture does not teleport horizontally");
    assert.equal(player.y, before.y, "capture correction is blended rather than snapped");
    assert.equal(player.forwardSpeed, before.speed, "incoming momentum is preserved");
    leave(controller, player, rail);
    for (let i = 0; i < 12; i++) {
        advanceAir(player, dt);
        controller.update({ player, input: { held: true }, rails: [rail], forwardSpeed: 230, dtSeconds: dt });
    }
    // Put the airborne skater back into the valid corridor of this same inclined segment.
    const returnPoint = traversal.nearestRailPoint(rail, player.x, player.y);
    player.x = returnPoint.x - returnPoint.tangentY * 12;
    player.y = returnPoint.y + returnPoint.tangentX * 12;
    player.verticalVelocity = -230 * returnPoint.tangentY / returnPoint.tangentX;
    const recapture = capture(controller, player, rail);
    assert.ok(recapture.some(item => item.type === "GRIND_ENTER") || controller.mode === "GRIND");
    assert.equal(controller.activeRail.id, rail.id);
});

test("grounded, below-range, beyond-end and unheld states do not capture", () => {
    const rail = { id: "bounds", grindPath: [{ x: 0, y: 100 }, { x: 100, y: 60 }] };
    const controller = traversal.createController();
    const cases = [
        { label: "grounded", p: { x: 50, y: 80, verticalVelocity: 0, grounded: true } },
        { label: "below", p: { x: 50, y: 125, verticalVelocity: 0, grounded: false } },
        { label: "too far from the segment", p: { x: 50, y: 145, verticalVelocity: 0, grounded: false } },
        { label: "beyond endpoint", p: { x: 145, y: 42, verticalVelocity: 0, grounded: false } }
    ];
    for (const entry of cases) {
        const events = controller.update({ player: entry.p, input: { held: true }, rails: [rail], forwardSpeed: 230 });
        assert.equal(events.some(item => item.type === "GRIND_ENTER"), false, entry.label);
    }
    const airborne = { x: 50, y: 80, verticalVelocity: 0, grounded: false };
    const events = controller.update({ player: airborne, input: { held: false }, rails: [rail], forwardSpeed: 230 });
    assert.equal(events.some(item => item.type === "GRIND_ENTER"), false, "SPACE must be held");
});
