const test = require("node:test");
const assert = require("node:assert/strict");
const parser = require("./space_input_parser.js");
const physics = require("./ollie_physics.js");
const traversal = require("./traversal_system.js");
const course = require("./test_course.js");

test("SPACE pula imediatamente, diferencia double-tap e hold sem upgrade", () => {
    const input = parser.createParser();
    assert.deepEqual(input.keyDown(0, "GROUND"), [{ type: "NORMAL_JUMP", at: 0 }]);
    assert.deepEqual(input.keyUp(40), [{ type: "GROUND_RELEASE", holdMs: 40 }]);
    assert.deepEqual(input.keyDown(150, "AIR"), [{ type: "OLLIE_UPGRADE", at: 150 }]);
    assert.deepEqual(input.keyUp(190), [{ type: "AIR_RELEASE", holdMs: 40 }]);

    input.keyDown(500, "GROUND");
    assert.deepEqual(input.update(799, "AIR"), []);
    assert.deepEqual(input.update(800, "AIR"), []);
    assert.deepEqual(input.update(900, "AIR"), []);
});

test("rampas de teste usam hold até a borda e preservam impulsos proporcionais", () => {
    const maxHeights = [];
    for (const ramp of course.ramps) {
        const simulation = physics.createSimulation({
            startX: ramp.startX - 10, groundY: 250,
            groundSegments: course.groundSegments, ramps: [ramp],
            obstacles: [], obstacle: null, failY: 600
        });
        let launched = false;
        let maxHeight = 0;
        for (let step = 0; step < 1200; step++) {
            simulation.step({spaceHeld:true}, 1 / 120);
            launched ||= simulation.state.rampLaunches.length > 0;
            maxHeight = Math.max(maxHeight, 250 - simulation.state.player.y);
            if (launched && simulation.state.player.landings > 0) break;
        }
        assert.equal(launched, true, `${ramp.kind} launches with held SPACE`);
        assert.equal(simulation.state.player.landings, 1, `${ramp.kind} returns to the track`);
        maxHeights.push(maxHeight);
    }
    assert.ok(maxHeights[0] < maxHeights[1] && maxHeights[1] < maxHeights[2], maxHeights.join(", "));

    const ramp = course.ramps[1];
    const simulation = physics.createSimulation({ startX: ramp.startX + 10, groundY: 250, ramps: [ramp], obstacle: null });
    assert.equal(simulation.launch(100, ramp), false, 'a tap cannot jump away from the ramp surface');
    while(!simulation.state.rampLaunches.length) simulation.step({spaceHeld:true},1/120);
    assert.equal(simulation.state.rampLaunches[0].held,true);
});

test("Grind usa release imediato para Super Out e hold captura o segundo rail", () => {
    const controller = traversal.createController();
    const railA = { id: "A", points: [{ x: 0, y: 180 }, { x: 100, y: 180 }] };
    const railB = { id: "B", grindPath: [{ x: 120, y: 184 }, { x: 160, y: 160 }, { x: 200, y: 178 }] };
    const player = { x: 20, y: 182, verticalVelocity: -40, grounded: false };
    const simulation = { launchFromGrind() { player.verticalVelocity = -390; return true; } };
    const enteredA = controller.update({ player, previousGrounded: false, previousX: 20, input: { held: true, pressed: true, pressId: 1 }, rails: [railA], forwardSpeed: 230 });
    assert.equal(enteredA[0].type, "GRIND_ENTER");
    const exited = controller.update({ player, previousGrounded: false, previousX: 20,
        input: { held: false, released: true, pressId: 1 }, rails: [railA], forwardSpeed: 230,
        dtSeconds: 1 / 120, simulation });
    assert.equal(exited[0].type, "GRIND_OLLIE_OUT");
    assert.equal(player.verticalVelocity, -390);

    player.x = 140;
    player.y = traversal.sampleRail(railB, player.x).y + 3;
    player.verticalVelocity = -220;
    const enteredB = controller.update({ player, previousGrounded: false, previousX: 138,
        input: { held: true, pressId: 2 }, rails: [railB], forwardSpeed: 230 });
    assert.equal(enteredB[0].type, "GRIND_ENTER");
    assert.equal(controller.activeRail.id, "B");
});

test("Ollie out preserva o avanço e aterrissa na rampa grande seguinte", () => {
    const simulation = physics.createSimulation({
        startX: course.spawnX, groundY: 250,
        groundSegments: course.groundSegments, ramps: course.ramps,
        obstacles: [], obstacle: null, failY: 800
    });
    const rail = course.rails.find(item => item.type === "curved");
    const exitX = 1490;
    const sample = traversal.sampleRail(rail, exitX);
    Object.assign(simulation.state.player, {
        x: exitX, y: sample.y, verticalVelocity: sample.slope * 230, grounded: false
    });
    assert.equal(simulation.launchFromGrind(), true);
    const startX = simulation.state.player.x;
    for (let step = 0; step < 360 && !simulation.state.player.grounded; step++) {
        simulation.step({}, 1 / 120);
    }
    assert.equal(simulation.state.player.landings, 1);
    assert.ok(simulation.state.player.x > startX);
    assert.ok(simulation.state.player.x >= course.ramps[2].startX
        && simulation.state.player.x <= course.ramps[2].endX,
    `landed at x=${simulation.state.player.x}`);
});

test("rails horizontais, inclinados e curvos são seguidos até a saída natural", () => {
    const paths = [
        [{ x: 0, y: 180 }, { x: 80, y: 180 }],
        [{ x: 0, y: 170 }, { x: 40, y: 190 }, { x: 80, y: 210 }],
        [{ x: 0, y: 210 }, { x: 40, y: 190 }, { x: 80, y: 170 }],
        [{ x: 0, y: 180 }, { x: 20, y: 205 }, { x: 50, y: 212 }, { x: 80, y: 180 }]
    ];
    for (const [index, points] of paths.entries()) {
        const rail = { id: `path-${index}`, grindPath: points };
        const controller = traversal.createController();
        const entry = traversal.sampleRail(rail, 10);
        const player = { x: 10, y: entry.y, verticalVelocity: entry.slope * 230, grounded: false };
        controller.update({ player, previousGrounded: false, input: { held: true, pressed: true, pressId: 1 }, rails: [rail], forwardSpeed: 230 });
        assert.equal(controller.mode, "GRIND");
        player.x = 100;
        const exits = controller.update({ player, previousGrounded: false, previousX: 75, input: { held: true }, rails: [rail], forwardSpeed: 230 });
        assert.ok(exits.some(event => event.type === "GRIND_EXIT"));
        assert.equal(controller.mode, "AIR");
    }
});

test("snap não captura quem está próximo mas se afasta do grindPath", () => {
    const controller = traversal.createController();
    const rail = { points: [{ x: 0, y: 180 }, { x: 100, y: 180 }] };
    const player = { x: 30, y: 178, verticalVelocity: -120, grounded: false };
    const transitions = controller.update({ player, input: { held: true }, rails: [rail], forwardSpeed: 230 });
    assert.equal(transitions.some(event => event.type === "GRIND_ENTER"), false);
    assert.equal(controller.mode, "AIR");
});

test("pista curta contém small → landing → medium → rails → big e mantém velocidade lateral", () => {
    assert.deepEqual(course.ramps.map(ramp => ramp.kind), ["small", "medium", "big"]);
    assert.equal(course.rails.length, 4);
    assert.equal(course.forwardSpeedAt(200), 230);
    assert.equal(course.isTestCourse, true);
    assert.ok(course.finish.x < 2000);
});
