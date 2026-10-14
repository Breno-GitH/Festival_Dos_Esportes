const test = require("node:test");
const assert = require("node:assert/strict");
const traversalApi = require("./traversal_system.js");
const comboApi = require("./combo_system.js");
const physics = require("./ollie_physics.js");

const flatRail = { id: "flat", points: [{ x: 100, y: 100 }, { x: 120, y: 100 }] };
const player = (overrides = {}) => ({
    x: 105,
    y: 98,
    verticalVelocity: 40,
    grounded: false,
    takeoffs: 0,
    ...overrides
});

function dispatchCombo(combo, transitions) {
    for (const event of transitions) {
        if (event.type === "GRIND_ENTER") combo.beginGrind();
        else if (event.type === "GRIND_DISTANCE") combo.addGrindDistance(event.distance);
        else if (event.type === "MANUAL_ENTER") combo.enterManual();
        else if (event.type === "MANUAL_OLLIE") combo.registerOllie("manual");
        else if (["NORMAL_LANDING", "MANUAL_TIMEOUT"].includes(event.type)) combo.startBankWindow();
    }
}

function enterGrind(traversal, rider, input = { held: true, pressed: true, pressId: 1 }) {
    const transitions = traversal.update({
        player: rider,
        previousGrounded: false,
        previousX: rider.x,
        input,
        rails: [flatRail],
        forwardSpeed: 230,
        groundY: 250,
        tricks: { trickActive: false, cancelInput() {} }
    });
    return transitions;
}

test("trick → grind inicia blend sem snap e soma pontos por distância", () => {
    const traversal = traversalApi.createController();
    traversal.mode = "AIR";
    const combo = comboApi.createController();
    combo.registerTrick({ status: "COMPLETED", trick: "Kickflip", score: 300 });

    const rider = player();
    const entered = enterGrind(traversal, rider);
    dispatchCombo(combo, entered);
    assert.equal(entered[0].type, "GRIND_ENTER");
    assert.equal(entered[0].snapPx, 2);
    assert.equal(traversal.mode, "GRIND");
    assert.equal(rider.y, 98);

    rider.x = 111;
    const distance = traversal.update({
        player: rider,
        previousGrounded: false,
        previousX: 105,
        input: { held: true },
        rails: [flatRail],
        forwardSpeed: 230,
        groundY: 250
    });
    dispatchCombo(combo, distance);
    assert.ok(distance.find(event => event.type === "GRIND_DISTANCE").distance > 0);
    assert.ok(combo.activeScore > 300);
});

test("snap não captura Zorp que esteja longe do rail", () => {
    const traversal = traversalApi.createController();
    const rider = player({ y: 50 });
    const result = enterGrind(traversal, rider);
    assert.equal(result.length, 0);
    assert.equal(traversal.mode, "AIR");
});

test("Grind exige SPACE segurado; aproximação sem hold não captura", () => {
    const controller = traversalApi.createController();
    controller.mode = "AIR";
    const rider = player();
    const noHold = enterGrind(controller, rider, { held: false, pressed: true, pressId: 1 });
    assert.equal(noHold.some(event => event.type === "GRIND_ENTER"), false);
    assert.equal(controller.mode, "AIR");
    const held = enterGrind(controller, rider, { held: true, pressId: 2 });
    assert.equal(held[0].type, "GRIND_ENTER");
});

test("buffer de 130 ms captura um rail logo após um Space antecipado", () => {
    const controller = traversalApi.createController();
    controller.mode = "AIR";
    const rail = { id: "buffered", points: [{ x: 100, y: 100 }, { x: 180, y: 100 }] };
    const rider = player({ x: 70, y: 82, verticalVelocity: 0 });
    assert.ok(traversalApi.findCaptureCandidate(rider, [rail], 230, { lookAheadMs: 130 }));
    const earlyPress = controller.update({
        player: rider, input: { pressed: true, held: true, pressId: 1 }, rails: [rail],
        forwardSpeed: 230, dtSeconds: 1 / 120
    });
    assert.equal(earlyPress.some(event => event.type === "GRIND_ENTER"), false);
    assert.equal(controller.pendingCaptureMs > 0, true);
    let captured = false;
    for (let frame = 0; frame < 12 && !captured; frame++) {
        rider.x += 230 / 120;
        rider.y += rider.verticalVelocity / 120 + 0.5 * 1650 / (120 * 120);
        rider.verticalVelocity += 1650 / 120;
        captured = controller.update({
            player: rider, input: { held: true, pressId: 1 }, rails: [rail],
            forwardSpeed: 230, dtSeconds: 1 / 120
        }).some(event => event.type === "GRIND_ENTER");
    }
    assert.equal(captured, true);
});

test("SPACE segurado cedo continua válido ao entrar na zona depois do buffer", () => {
    const controller = traversalApi.createController();
    const rail = { id: "held-early", points: [{ x: 100, y: 100 }, { x: 200, y: 100 }] };
    const rider = player({ x: 0, y: 100, verticalVelocity: 0 });
    let enteredAt = -1;
    for (let frame = 0; frame < 70; frame++) {
        rider.x += 230 / 120;
        const transitions = controller.update({ player: rider, input: { held: true,
            pressed: frame === 0 }, rails: [rail], forwardSpeed: 230, dtSeconds: 1 / 120 });
        if (transitions.some(event => event.type === "GRIND_ENTER")) {
            enteredAt = frame;
            break;
        }
    }
    assert.ok(enteredAt > 130 / (1000 / 120), "the initial press buffer has expired");
    assert.equal(controller.mode, "GRIND");
});

test("release lança no primeiro frame, sem repressão", () => {
    const rail = { id: "hold-test", points: [{ x: 100, y: 100 }, { x: 300, y: 100 }] };
    const rider = player({x:120,y:100,verticalVelocity:0});
    const controller=traversalApi.createController();
    controller.update({player:rider,input:{held:true},rails:[rail],forwardSpeed:230});
    let launches=0;
    const simulation={launchFromGrind(){launches++;rider.verticalVelocity=-650;return true;}};
    const events=controller.update({player:rider,input:{held:false,released:true},rails:[rail],forwardSpeed:230,simulation,dtSeconds:1/120});
    assert.equal(events[0].type,"GRIND_OLLIE_OUT");
    assert.equal(controller.mode,"AIR");
    assert.equal(rider.verticalVelocity,-650);
    controller.update({player:rider,input:{held:false},rails:[rail],forwardSpeed:230,simulation});
    assert.equal(launches,1);
});

test("Space depois do fim do grindPath não captura rail tarde demais", () => {
    const controller = traversalApi.createController();
    controller.mode = "AIR";
    const rail = { id: "late", points: [{ x: 100, y: 100 }, { x: 180, y: 100 }] };
    const rider = player({ x: 205, y: 100, verticalVelocity: 0 });
    const events = controller.update({
        player: rider, input: { pressed: true, held: true, pressId: 1 }, rails: [rail],
        forwardSpeed: 230
    });
    assert.equal(events.some(event => event.type === "GRIND_ENTER"), false);
});

test("trick → manual preserva o combo ao tocar o chão segurando SPACE", () => {
    const traversal = traversalApi.createController();
    traversal.mode = "AIR";
    const combo = comboApi.createController();
    combo.registerTrick({ status: "COMPLETED", trick: "Kickflip", score: 300 });
    const rider = player({ x: 200, y: 250, grounded: true });
    const result = traversal.update({
        player: rider,
        previousGrounded: false,
        input: { held: true },
        groundY: 250,
        dtSeconds: 1 / 120
    });
    dispatchCombo(combo, result);
    assert.equal(result[0].type, "MANUAL_ENTER");
    assert.equal(traversal.mode, "MANUAL");
    assert.equal(rider.grounded, true);
    assert.equal(combo.active, true);
    assert.equal(combo.bankTimerMs, 0);
});

test("grind → manual conecta no pouso seguinte", () => {
    const traversal = traversalApi.createController();
    traversal.mode = "AIR";
    const combo = comboApi.createController();
    const rider = player();
    dispatchCombo(combo, enterGrind(traversal, rider));
    rider.x = 121;
    const exit = traversal.update({
        player: rider,
        previousGrounded: false,
        previousX: 119,
        input: { held: true },
        rails: [flatRail],
        forwardSpeed: 230,
        groundY: 250
    });
    dispatchCombo(combo, exit);
    assert.ok(exit.some(event => event.type === "GRIND_EXIT"));

    rider.grounded = true;
    rider.y = 250;
    const manual = traversal.update({
        player: rider,
        previousGrounded: false,
        input: { held: true },
        groundY: 250,
        dtSeconds: 1 / 120
    });
    dispatchCombo(combo, manual);
    assert.equal(manual[0].type, "MANUAL_ENTER");
    assert.equal(combo.active, true);
});

test("manual → Ollie usa a soltura para lançar sem input ambíguo", () => {
    const traversal = traversalApi.createController();
    traversal.mode = "AIR";
    const combo = comboApi.createController();
    combo.registerTrick({ status: "COMPLETED", trick: "Kickflip", score: 300 });
    const rider = player({ x: 180, y: 250, grounded: true });
    dispatchCombo(combo, traversal.update({
        player: rider,
        previousGrounded: false,
        input: { held: true },
        groundY: 250,
        dtSeconds: 1 / 120
    }));

    const simulation = {
        launch(holdMs) {
            if (!rider.grounded) return false;
            rider.grounded = false;
            rider.verticalVelocity = -460;
            rider.takeoffs++;
            this.lastHoldMs = holdMs;
            return true;
        }
    };
    const result = traversal.update({
        player: rider,
        previousGrounded: false,
        input: { held: false, released: true, releaseHoldMs: 190 },
        groundY: 250,
        simulation,
        dtSeconds: 1 / 120
    });
    dispatchCombo(combo, result);
    assert.equal(result[0].type, "MANUAL_OLLIE");
    assert.equal(simulation.lastHoldMs, 190);
    assert.equal(rider.takeoffs, 1);
    assert.equal(traversal.mode, "AIR");
    assert.equal(combo.active, true);
});

test("trick → grind → manual → Ollie → trick mantém a linha ativa", () => {
    const traversal = traversalApi.createController();
    const combo = comboApi.createController();
    combo.registerTrick({ status: "COMPLETED", trick: "Kickflip", score: 300 });
    const rider = player();
    dispatchCombo(combo, enterGrind(traversal, rider));
    rider.x = 121;
    dispatchCombo(combo, traversal.update({
        player: rider,
        previousGrounded: false,
        previousX: 119,
        input: { held: true },
        rails: [flatRail],
        forwardSpeed: 230,
        groundY: 250
    }));
    rider.grounded = true;
    rider.y = 250;
    dispatchCombo(combo, traversal.update({
        player: rider,
        previousGrounded: false,
        input: { held: true },
        groundY: 250
    }));
    const simulation = { launch() { rider.grounded = false; rider.takeoffs++; return true; } };
    dispatchCombo(combo, traversal.update({
        player: rider,
        previousGrounded: false,
        input: { held: false, released: true, releaseHoldMs: 200 },
        groundY: 250,
        simulation
    }));
    combo.registerTrick({ status: "COMPLETED", trick: "Heelflip", score: 360 });
    assert.equal(traversal.mode, "AIR");
    assert.equal(combo.active, true);
    assert.ok(combo.multiplier > 1);
    assert.ok(combo.activeScore > 300);
});

test("pouso normal abre janela e faz bank quando nada conecta", () => {
    const traversal = traversalApi.createController();
    traversal.mode = "AIR";
    const combo = comboApi.createController();
    combo.registerTrick({ status: "COMPLETED", trick: "Kickflip", score: 300 });
    const result = traversal.update({
        player: player({ grounded: true, y: 250 }),
        previousGrounded: false,
        input: { held: false },
        groundY: 250
    });
    dispatchCombo(combo, result);
    assert.equal(result[0].type, "NORMAL_LANDING");
    assert.equal(combo.bankTimerMs, comboApi.SETTINGS.bankWindowMs);
    combo.update(0.449);
    assert.equal(combo.bankedScore, 0);
    combo.update(0.002);
    assert.equal(combo.active, false);
    assert.equal(combo.bankedScore, 330);
});

test("crash descarta combo ativo e conserva score já banked", () => {
    const combo = comboApi.createController();
    combo.registerTrick({ status: "COMPLETED", trick: "Kickflip", score: 100 });
    combo.bank();
    combo.registerTrick({ status: "COMPLETED", trick: "Heelflip", score: 250 });
    const lost = combo.breakCombo();
    assert.equal(lost, 275);
    assert.equal(combo.activeScore, 0);
    assert.equal(combo.active, false);
    assert.equal(combo.bankedScore, 110);
});

test("bônus de execução são centralizados para high rail, bench trick e Special Air", () => {
    const combo = comboApi.createController();
    assert.equal(combo.registerContextBonus("unknown"), 0);
    assert.equal(combo.registerContextBonus("highRail"), 154);
    assert.equal(combo.registerContextBonus("benchTrick"), 156);
    assert.equal(combo.registerContextBonus("specialAir"), 450);
    assert.equal(combo.snapshot().activeScore, 760);
});

test("manual tem duração máxima e rail aceita geometria inclinada", () => {
    const traversal = traversalApi.createController();
    traversal.mode = "AIR";
    const rider = player({ grounded: true, y: 250 });
    traversal.update({ player: rider, previousGrounded: false, input: { held: true }, groundY: 250 });
    const timedOut = traversal.update({ player: rider, previousGrounded: false, input: { held: true }, groundY: 250, dtSeconds: 0.86 });
    assert.equal(timedOut[0].type, "MANUAL_TIMEOUT");
    assert.equal(traversal.mode, "GROUND");

    const incline = { points: [{ x: 0, y: 10 }, { x: 10, y: 20 }] };
    assert.ok(traversalApi.railLength(incline) > 10);
    assert.ok(traversalApi.sampleRail(incline, 5).slope > 0);
    assert.ok(traversalApi.distanceAlongRail(incline, 0, 10) > 10);
});

test("a pista provisória permite alcançar o rail com Ollie e manter Grind até a saída", () => {
    const simulation = physics.createSimulation({ obstacle: null });
    const traversal = traversalApi.createController();
    const rider = simulation.state.player;
    const fixed = 1 / 120;
    const step = (action = {}, held = false, extraInput = {}) => {
        const previousGrounded = rider.grounded;
        const previousX = rider.x;
        simulation.step(action, fixed);
        const groundY = physics.groundHeightAt(rider.x, simulation.config);
        const events = traversal.update({
            player: rider,
            previousGrounded,
            previousX,
            input: { held, ...extraInput },
            rails: traversalApi.TEST_RAILS,
            forwardSpeed: simulation.config.forwardSpeed,
            groundY,
            dtSeconds: fixed,
            simulation,
            tricks: { trickActive: false, cancelInput() {} }
        });
        return events;
    };

    while (rider.x < 320) step();
    step({ spacePressed: true, spaceHeld: true }, true);
    for (let frame = 0; frame < 12; frame++) step({ spaceHeld: true }, true);
    step({ ollieUpgrade: true, spaceHeld: true }, true);
    while (rider.x < 420 && !rider.grounded) step();

    let entered = false;
    let capturePressId = 10;
    for (let frame = 0; frame < 90 && !entered; frame++) {
        const candidate = traversalApi.findCaptureCandidate(rider, traversalApi.TEST_RAILS,
            simulation.config.forwardSpeed, { lookAheadMs: traversalApi.SETTINGS.grindInputBufferMs,
                gravity: simulation.config.gravity });
        const events = step({}, Boolean(candidate), candidate ? { pressed: true, pressId: ++capturePressId } : {});
        entered = events.some(event => event.type === "GRIND_ENTER");
    }
    assert.equal(entered, true, `Zorp deve alcançar o rail; x=${rider.x.toFixed(1)}, y=${rider.y.toFixed(1)}`);
    assert.equal(traversal.mode, "GRIND");

    let exited = false;
    for (let frame = 0; frame < 120 && !exited; frame++) {
        const events = step({}, true);
        exited = events.some(event => event.type === "GRIND_EXIT");
    }
    assert.equal(exited, true);
    assert.equal(traversal.mode, "AIR");

    for (let frame = 0; frame < 80 && traversal.mode !== "MANUAL"; frame++) step({}, true);
    assert.equal(traversal.mode, "MANUAL", "manter SPACE no pouso entra em Manual");
    step({}, false, { released: true, releaseHoldMs: 190 });
    assert.equal(rider.takeoffs, 2, "soltar SPACE no Manual usa o Ollie existente");
    assert.equal(rider.grounded, false);
    assert.equal(traversal.mode, "AIR");
});
