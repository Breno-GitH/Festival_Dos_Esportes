const test = require("node:test");
const assert = require("node:assert/strict");
const tricks = require("./trick_system.js");

function airbornePlayer(overrides = {}) {
    return { grounded: false, x: 150, y: 100, verticalVelocity: -180, ...overrides };
}

function commitSequence(sequence, player = airbornePlayer()) {
    const controller = tricks.createController();
    controller.update(player, 1 / 120, 900);
    let now = 0;
    for (const token of sequence) {
        controller.press(now, player);
        now += token === "H" ? tricks.SETTINGS.holdTokenMs + 5 : 35;
        controller.release(now);
        now += 10;
    }
    for (let frame = 0; frame < 12 && !controller.trickActive && controller.lastResult?.status !== "NOT_ENOUGH_AIRTIME"; frame++) {
        controller.update(player, 1 / 60, 900);
    }
    return controller;
}

test("TAP reconhece Kickflip com os frames Pro3 row04", () => {
    const controller = commitSequence(["T"]);
    assert.equal(controller.activeTrick.id, "kickflip");
    assert.ok(controller.activeTrick.frames.every(file => file.includes("pro3_row04")));
});

test("DOUBLE TAP reconhece Heelflip com a sequência existente invertida", () => {
    const controller = commitSequence(["T", "T"]);
    assert.equal(controller.activeTrick.id, "heelflip");
    assert.equal(controller.activeTrick.frames.length, 5);
    assert.equal(controller.activeTrick.mirror, true);
});

test("HOLD curto reconhece Spin com os frames Pro3 row03", () => {
    const controller = commitSequence(["H"]);
    assert.equal(controller.activeTrick.id, "spin");
    assert.ok(controller.activeTrick.frames.every(file => file.includes("pro3_row03")));
});

test("TAP + HOLD reconhece Grab", () => {
    const controller = commitSequence(["T", "H"]);
    assert.equal(controller.activeTrick.id, "grab");
    assert.ok(controller.activeTrick.frames.every(file => file.includes("pro3_row05")));
});

test("DOUBLE TAP + HOLD reconhece Varial com frames de flip existentes", () => {
    const controller = commitSequence(["T", "T", "H"]);
    assert.equal(controller.activeTrick.id, "varial");
    assert.ok(controller.activeTrick.frames.every(file => file.includes("pro3_row04")));
});

test("TRIPLE TAP é jogável e vira Hard Flip com o flip invertido existente", () => {
    const controller = commitSequence(["T", "T", "T"]);
    assert.equal(controller.activeTrick.id, "hardflip");
    assert.equal(controller.activeTrick.mirror, true);
});

test("spam não cria cinco tricks e mantém limite de dois por salto", () => {
    const player = airbornePlayer();
    const controller = tricks.createController();
    controller.update(player, 1 / 120, 1200);
    let now = 0;
    for (let index = 0; index < 5; index++) {
        controller.press(now, player);
        now += 30;
        controller.release(now);
        now += 10;
    }
    controller.update(player, 1 / 60, 1200);
    assert.equal(controller.activeTrick.id, "hardflip");
    assert.equal(controller.completedAirTricks, 1);
    for (let frame = 0; frame < 20; frame++) controller.update(player, 1 / 60, 800);
    assert.equal(controller.completedAirTricks, 1);
    assert.equal(controller.press(now, player), true);
    controller.release(now + 30);
    for (let frame = 0; frame < 20; frame++) controller.update(player, 1 / 60, 800);
    assert.ok(controller.completedAirTricks <= tricks.SETTINGS.maxTricksPerAir);
    assert.equal(controller.press(now + 1000, player), false);
});

test("trick perto do chão é recusado se a animação não cabe no airtime", () => {
    const player = airbornePlayer({ verticalVelocity: 90, y: 240 });
    const controller = tricks.createController();
    const remaining = tricks.remainingAirTimeMs(player, 1650, 250);
    controller.update(player, 1 / 120, remaining);
    controller.press(0, player);
    controller.release(tricks.SETTINGS.holdTokenMs + 5);
    controller.update(player, 1 / 60, remaining);
    assert.equal(controller.trickActive, false);
    assert.equal(controller.lastResult.status, "NOT_ENOUGH_AIRTIME");
    assert.equal(controller.score, 0);
});

test("dois tricks conectam somente no salto alto com tempo restante", () => {
    const player = airbornePlayer();
    const controller = tricks.createController();
    controller.update(player, 1 / 120, 680);
    let now = 0;
    controller.press(now, player); now += 35; controller.release(now);
    for (let frame = 0; frame < 8; frame++) controller.update(player, 1 / 60, 680 - frame * 17);
    assert.equal(controller.activeTrick.id, "kickflip");
    for (let frame = 0; frame < 10; frame++) controller.update(player, 1 / 60, 544 - frame * 17);
    assert.equal(controller.activeTrick, null);
    for (let frame = 0; frame < 2; frame++) controller.update(player, 1 / 60, 374 - frame * 17);
    now += 280;
    controller.press(now, player); now += 35; controller.release(now);
    for (let frame = 0; frame < 8; frame++) controller.update(player, 1 / 60, 340 - frame * 17);
    assert.equal(controller.activeTrick.id, "kickflip");
    assert.equal(controller.completedAirTricks, 2);
});

test("repetição reduz score e a variedade premia um trick novo", () => {
    const player = airbornePlayer();
    const controller = tricks.createController();
    const perform = (id, remaining = 900) => {
        controller.pendingTrick = tricks.TRICKS[id];
        controller.startPending(remaining);
        for (let frame = 0; frame < Math.ceil(controller.trickDuration / (1000 / 60)); frame++) {
            controller.update(player, 1 / 60, remaining);
        }
    };
    controller.beginAir();
    perform("kickflip");
    const firstKick = controller.lastResult.score;
    const firstVariety = controller.lastResult.varietyBonus;
    assert.equal(firstVariety, 0, "o primeiro trick da linha não tem variedade");
    controller.endAir();
    controller.beginAir();
    perform("kickflip");
    const repeatedKick = controller.lastResult.score;
    assert.ok(repeatedKick < firstKick);

    const variedLine = tricks.createController();
    variedLine.beginAir();
    const performInLine = id => {
        variedLine.pendingTrick = tricks.TRICKS[id];
        variedLine.startPending(900);
        for (let frame = 0; frame < Math.ceil(variedLine.trickDuration / (1000 / 60)); frame++) {
            variedLine.update(player, 1 / 60, 900);
        }
    };
    performInLine("kickflip");
    performInLine("grab");
    assert.equal(
        variedLine.lastResult.varietyBonus,
        Math.round(tricks.TRICKS.grab.baseScore * tricks.SETTINGS.varietyBonusRate)
    );
});

test("as durações reais e a checagem de airtime ficam centralizadas", () => {
    assert.equal(tricks.TRICKS.kickflip.durationMs, 150);
    assert.equal(tricks.TRICKS.heelflip.durationMs, 160);
    assert.equal(tricks.TRICKS.spin.durationMs, 240);
    const lowAirMs = tricks.remainingAirTimeMs({ grounded: false, y: 200, verticalVelocity: 0 }, 1650, 250);
    assert.ok(lowAirMs > 0);
});
