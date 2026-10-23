const test = require("node:test");
const assert = require("node:assert/strict");
const physics = require("./ollie_physics.js");

const FIXED = 1 / 120;

function jump(kind, upgradeAtMs = null) {
    const simulation = physics.createSimulation({ obstacle: null });
    simulation.step({ spacePressed: true }, FIXED);
    const steps = Math.round((upgradeAtMs ?? 0) / (FIXED * 1000));
    for (let index = 0; index < steps; index++) simulation.step({}, FIXED);
    if (kind !== "normal") simulation.step({ [kind === "ollie" ? "ollieUpgrade" : "superJumpUpgrade"]: true }, FIXED);
    return simulation;
}

function peakHeight(simulation) {
    const startY = simulation.state.player.y;
    let minimumY = startY;
    for (let frame = 0; frame < 180 && !simulation.state.player.grounded; frame++) {
        simulation.step({}, FIXED);
        minimumY = Math.min(minimumY, simulation.state.player.y);
    }
    return startY - minimumY;
}

test("SPACE inicia Normal Jump imediatamente, sem esperar o double tap", () => {
    const simulation = physics.createSimulation({ obstacle: null });
    simulation.step({ spacePressed: true }, FIXED);
    assert.equal(simulation.state.player.jumpTier, "normal");
    assert.equal(simulation.state.player.takeoffs, 1);
    assert.ok(simulation.state.player.verticalVelocity < 0);
});

test("Ollie atualiza o salto; a antiga ação de Super Jump é ignorada", () => {
    const ollie = jump("ollie", 100);
    const superJump = jump("super", 300);
    assert.equal(ollie.state.player.jumpTier, "ollie");
    assert.equal(ollie.state.player.takeoffs, 1);
    assert.equal(ollie.state.player.airTrick, "kickflip");
    assert.equal(superJump.state.player.jumpTier, "normal");
    assert.equal(superJump.upgradeJump("super"), false);
    assert.equal(superJump.state.player.takeoffs, 1);
});

test("Normal < Ollie < lançamento de Grind com momentum", () => {
    const normalHeight = peakHeight(jump("normal"));
    const ollieHeight = peakHeight(jump("ollie", 100));
    const grind = physics.createSimulation({ obstacle: null });
    grind.launchFromGrind(0);
    const superHeight = peakHeight(grind);
    assert.ok(normalHeight > 20, `${normalHeight}px`);
    assert.ok(ollieHeight - normalHeight > 20, `${normalHeight}px -> ${ollieHeight}px`);
    assert.ok(superHeight - ollieHeight > 20, `${ollieHeight}px -> ${superHeight}px`);
});

test("sem input avança até o obstáculo de teste e causa crash previsível", () => {
    const simulation = physics.createSimulation();
    for (let frame = 0; frame < 900 && simulation.state.phase !== "FAILED"; frame++) simulation.step({}, FIXED);
    assert.equal(simulation.state.phase, "FAILED");
    assert.equal(simulation.state.player.obstacleHit, true);
    assert.equal(simulation.state.failureReason, "OBSTACLE");
});

test("hold longo faz somente um salto, depois deixa Zorp aterrissar", () => {
    const simulation = physics.createSimulation({ obstacle: null });
    simulation.step({ spacePressed: true, spaceHeld: true }, FIXED);
    for (let frame = 0; frame < 600; frame++) simulation.step({ spaceHeld: true }, FIXED);
    assert.equal(simulation.state.player.takeoffs, 1);
    assert.ok(["", "normal"].includes(simulation.state.player.jumpTier));
    assert.ok(simulation.state.player.x > simulation.config.startX + 900);
});

test("câmera mantém Zorp perto de 32% e acompanha mudanças verticais com smoothing", () => {
    const camera = physics.createCamera(450, 300, 0.32);
    const player = { x: 600, y: 220, grounded: true };
    for (let frame = 0; frame < 120; frame++) physics.updateCamera(camera, player, 220, FIXED);
    assert.ok(Math.abs((player.x - camera.x) - 144) < 1);
    const oldY = camera.y;
    player.grounded = false;
    player.y = 120;
    physics.updateCamera(camera, player, 220, FIXED);
    assert.ok(camera.y < oldY && camera.y > 120 - camera.screenY);
});

test("descidas contínuas mantêm Zorp na superfície sem pousos repetidos", () => {
    const groundSegments = [{ startX: 0, endX: 1000, startY: 250, endY: 350 }];
    const simulation = physics.createSimulation({ startX: 150, groundSegments, obstacles: [], obstacle: null });
    for (let frame = 0; frame < 180; frame++) simulation.step({}, FIXED);
    assert.equal(simulation.state.player.grounded, true);
    assert.equal(simulation.state.player.landings, 0);
    assert.equal(simulation.state.player.y, physics.groundHeightAt(simulation.state.player.x, { groundSegments }));
});

test("topo do banco é SAFE_TOP; impacto na lateral causa crash", () => {
    const bank = {
        id: "bench",
        collisionRegions: {
            SAFE_TOP: [[{ x: 100, y: 210 }, { x: 160, y: 210 }]],
            DANGEROUS_SIDE: { left: 100, right: 160, top: 220, bottom: 250 }
        }
    };
    const landing = physics.createSimulation({ startX: 80, groundY: 250, collisionObjects: [bank], obstacle: null });
    Object.assign(landing.state.player, { x: 110, y: 190, verticalVelocity: 400, grounded: false });
    for (let frame = 0; frame < 10 && !landing.state.player.grounded; frame++) landing.step({}, FIXED);
    assert.equal(landing.state.phase, "PLAYING");
    assert.equal(landing.state.player.grounded, true);
    assert.equal(landing.state.player.y, 210);

    const side = physics.createSimulation({ startX: 80, groundY: 250, collisionObjects: [bank], obstacle: null });
    side.step({}, FIXED);
    side.state.player.x = 98;
    side.step({}, FIXED);
    assert.equal(side.state.phase, "FAILED");
    assert.equal(side.state.failureReason, "DANGEROUS_SIDE");
});

test("passar acima do banco é seguro e o topo permite um novo salto", () => {
    const bank = {
        id: "bench",
        collisionRegions: {
            SAFE_TOP: [[{ x: 100, y: 210 }, { x: 160, y: 210 }]],
            DANGEROUS_SIDE: { left: 100, right: 160, top: 210, bottom: 250 }
        }
    };
    const over = physics.createSimulation({ startX: 70, groundY: 250, collisionObjects: [bank], obstacle: null });
    Object.assign(over.state.player, { y: 140, verticalVelocity: -100, grounded: false });
    for (let frame = 0; frame < 24; frame++) over.step({}, FIXED);
    assert.equal(over.state.phase, "PLAYING");

    const top = physics.createSimulation({ startX: 110, groundY: 250, collisionObjects: [bank], obstacle: null });
    Object.assign(top.state.player, { y: 210, grounded: true });
    assert.equal(top.launchImmediate("normal"), true);
    assert.equal(top.state.player.takeoffs, 1);
});

test("escada não cria chão plano; colisão é classificada como stair fall", () => {
    const stairs = {
        id: "stairs",
        collisionRegions: { DANGEROUS_STAIR_FALL: { left: 100, right: 160, top: 190, bottom: 250 } }
    };
    const simulation = physics.createSimulation({ startX: 80, groundY: 250, collisionObjects: [stairs], obstacle: null });
    for (let frame = 0; frame < 10 && simulation.state.phase !== "FAILED"; frame++) simulation.step({}, FIXED);
    assert.equal(simulation.state.phase, "FAILED");
    assert.equal(simulation.state.failureReason, "DANGEROUS_STAIR_FALL");
});

test("impulso de rampa mantém avanço e superfície inclinada é amostrada", () => {
    const ramp = { startX: 400, endX: 520, launchImpulse: 160,
        surfacePoints: [{ x: 400, y: 250 }, { x: 520, y: 205 }], collisionEnabled: true };
    const simulation = physics.createSimulation({ startX: 410, ramps: [ramp], obstacle: null });
    const speed = simulation.config.forwardSpeed;
    assert.equal(simulation.launchImmediate("normal", ramp), false);
    while(!simulation.state.rampLaunches.length) simulation.step({spaceHeld:true},FIXED);
    assert.equal(simulation.state.player.jumpTier, "ramp");
    assert.equal(simulation.state.rampLaunches[0].x,520);
    assert.equal(simulation.config.forwardSpeed, speed);
    assert.ok(physics.rampSurfaceAt([ramp], 460));
});
