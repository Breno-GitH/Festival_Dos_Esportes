const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('./procedural_gameplay_course.js');
const physics = require('./ollie_physics.js');
const input = require('./space_input_parser.js');
const traversal = require('./traversal_system.js');
const { run } = require('./level_playtest.cjs');

const FIXED = 1 / 120;

function jumpHeight(kind, upgradeAtMs = 0) {
    const simulation = physics.createSimulation({ obstacle: null });
    simulation.step({ spacePressed: true }, FIXED);
    for (let elapsed = 0; elapsed < upgradeAtMs; elapsed += FIXED * 1000) simulation.step({}, FIXED);
    if (kind === 'ollie') simulation.step({ ollieUpgrade: true }, FIXED);
    if (kind === 'super') simulation.step({ superJumpUpgrade: true }, FIXED);
    const startY = simulation.state.player.y;
    let peakY = startY;
    for (let frame = 0; frame < 240 && !simulation.state.player.grounded; frame++) {
        simulation.step({}, FIXED);
        peakY = Math.min(peakY, simulation.state.player.y);
    }
    return startY - peakY;
}

test('SPACE keeps immediate Normal, double Ollie and hold Grind intent distinct', () => {
    const parser = input.createParser();
    assert.equal(parser.keyDown(0, 'GROUND')[0].type, 'NORMAL_JUMP');
    parser.keyUp(45);
    assert.equal(parser.keyDown(160, 'AIR')[0].type, 'OLLIE_UPGRADE');

    parser.reset();
    parser.keyDown(0, 'GROUND');
    assert.equal(parser.update(299, 'AIR').length, 0);
    assert.deepEqual(parser.update(300, 'AIR'), []);

    const normal = jumpHeight('normal');
    const ollie = jumpHeight('ollie', 100);
    const held = jumpHeight('super');
    assert.ok(normal < ollie);
    assert.ok(Math.abs(held-normal) < 3, 'obsolete hold upgrade cannot increase height');
});

test('procedural validation course contains only code geometry and explicit collision roles', () => {
    assert.equal(course.procedural, true);
    assert.ok([...course.visuals, ...course.ramps, ...course.rails].every(item => !item.asset && !item.assetId));
    assert.ok(course.groundSegments.every(item => item.collisionRegions.SAFE_TOP.length));
    assert.ok(course.rails.every(item => item.collisionRegions.GRINDABLE === item.grindPath));
    assert.ok(course.gaps.every(item => item.collisionRegions.FATAL_AREA));
    const stairs = course.decor.find(item => item.id === 'validation-stairs');
    assert.ok(stairs.collisionObject.collisionRegions.FATAL_AREA);
    assert.ok(course.ramps.every(item => item.collisionRegions.DANGEROUS_SIDE));
});

test('without held SPACE the first rail does not capture automatically', () => {
    const result = run({ course, profile: 'zero', endX: 700 });
    assert.equal(result.phase, 'FAILED');
    assert.equal(result.failureReason, 'FELL_IN_GAP');
    assert.deepEqual(result.enteredRails, []);
});

test('held SPACE keeps a captured Grind until release or rail end', () => {
    const rail = course.rails[0];
    const controller = traversal.createController();
    const simulation = physics.createSimulation({ startX: 510, groundSegments: [], obstacle: null });
    const player = simulation.state.player;
    Object.assign(player, { x: 510, y: 169, verticalVelocity: 50, grounded: false, forwardSpeed: 230 });
    controller.mode = 'AIR';
    controller.update({ player, previousGrounded: false, previousX: 506,
        input: { pressed: true, held: true }, rails: [rail], forwardSpeed: 230,
        groundY: null, dtSeconds: FIXED, simulation });
    assert.equal(controller.mode, 'GRIND');
    for (let frame = 0; frame < 20; frame++) {
        const previousX = player.x;
        player.x += 230 * FIXED;
        controller.update({ player, previousGrounded: false, previousX,
            input: { held: true }, rails: [rail], forwardSpeed: 230,
            groundY: null, dtSeconds: FIXED, simulation });
        assert.equal(controller.mode, 'GRIND');
    }
});

test('four-rail chain completes without touching ground and uses Super for the high rail', () => {
    const result = run({ course, endX: 1500 });
    assert.equal(result.phase, 'PLAYING');
    assert.deepEqual(result.enteredRails.slice(0, 4), [
        'validation-rail-1', 'validation-rail-2', 'validation-rail-3', 'validation-rail-4-high'
    ]);
    const chainTransitions = result.transitions.filter(item => item.x >= 500 && item.x <= 1410);
    assert.ok(chainTransitions.every(item => item.mode === 'AIR' || item.mode === 'GRIND'));
    assert.ok(result.trace.some(item => item.x > 1100 && item.x < 1245 && item.tier === 'super'));
});

test('complete gameplay line reaches the stair handrail and finishes', () => {
    const result = run({ course, endX: course.finish.x + 10 });
    assert.equal(result.phase, 'COMPLETED', `${result.failureReason} em x=${result.x}`);
    assert.ok(result.enteredRails.includes('validation-stairs-handrail'));
    assert.ok(result.physicsSeconds > 10 && result.physicsSeconds < 12);
});

test('hold forever and mash do not clear the validation course', () => {
    for (const profile of ['hold', 'mash']) {
        const result = run({ course, profile, endX: course.finish.x + 10 });
        assert.equal(result.phase, 'FAILED', profile);
        assert.ok(result.x < course.finish.x, profile);
    }
});
