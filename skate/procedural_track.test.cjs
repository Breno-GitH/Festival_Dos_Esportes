const test = require('node:test');
const assert = require('node:assert/strict');
const kit = require('./procedural_track.js');
const course = require('./procedural_sandbox.js');
const geometry = require('../skate_new/collision_geometry.js');
const { run } = require('./level_playtest.cjs');

function samplePath(path, x) {
    for (let index = 1; index < path.length; index++) {
        const a = path[index - 1], b = path[index];
        if (x < a.x || x > b.x) continue;
        const t = (x - a.x) / (b.x - a.x);
        return a.y + (b.y - a.y) * t;
    }
    return null;
}

test('sandbox uses the same procedural geometry vocabulary as the official course', () => {
    assert.equal(course.procedural, true);
    assert.equal(course.isProceduralSandbox, true);
    assert.equal(course.obstacles.length, 0);
    assert.ok(course.visuals.length >= 15);
    assert.ok(course.visuals.every(item => !item.asset && !item.assetId));
    assert.ok(course.ramps.every(item => !item.asset && !item.assetId));
    assert.ok(course.rails.every(item => !item.asset && !item.assetId));
});

test('ramp drawing, collision and physics all share the same sampled surface', () => {
    assert.deepEqual(course.ramps.map(ramp => ramp.id),
        ['small-kicker', 'long-bank', 'medium-kicker', 'big-launch']);
    for (const ramp of course.ramps) {
        assert.strictEqual(ramp.surfacePoints, ramp.collisionSurface);
        assert.strictEqual(ramp.collisionRegions.SAFE_TOP, ramp.surfacePoints);
        for (const point of ramp.surfacePoints) {
            const hit = geometry.rampSurfaceAt([ramp], point.x);
            assert.ok(hit, `${ramp.id} sem superfície em ${point.x}`);
            assert.ok(Math.abs(hit.y - point.y) < 0.001, `${ramp.id} divergente em ${point.x}`);
        }
        assert.ok(ramp.launchStrength >= 0);
    }
});

test('every rail uses its visual path for Grind and has grounded supports', () => {
    assert.ok(course.rails.length >= 7);
    for (const rail of course.rails) {
        assert.strictEqual(rail.points, rail.grindPath);
        assert.strictEqual(rail.collisionRegions.GRINDABLE_TOP, rail.grindPath);
        assert.ok(rail.supports.length > 0, `${rail.id} flutuando`);
        for (const support of rail.supports) {
            const pathY = samplePath(rail.grindPath, support.x);
            assert.ok(Number.isFinite(pathY));
            assert.ok(Math.abs(pathY - support.topY) < 0.01, `${rail.id} suporte fora da barra`);
            assert.ok(support.bottomY > support.topY + 5, `${rail.id} suporte sem base`);
        }
    }
});

test('bench and ledge separate safe top, grind edge and dangerous side', () => {
    for (const id of ['sandbox-bench', 'sandbox-ledge']) {
        const item = course.decor.find(entry => entry.id === id);
        assert.ok(item, id);
        assert.ok(item.collisionObject.collisionRegions.SAFE_TOP.length);
        assert.ok(item.collisionObject.collisionRegions.GRINDABLE_TOP.length);
        assert.ok(item.collisionObject.collisionRegions.DANGEROUS_SIDE);
        assert.ok(course.rails.some(rail => rail.id === `${id}-${id.includes('bench') ? 'top' : 'edge'}`));
    }
    assert.equal(course.decor.find(item => item.id === 'sandbox-bench').primitiveType, 'bench');
    assert.equal(course.decor.find(item => item.id === 'sandbox-ledge').primitiveType, 'ledge');
});

test('stairs are generated step by step and their handrail follows the structure', () => {
    const stairs = course.decor.find(item => item.id === 'sandbox-stairs');
    const handrail = course.rails.find(item => item.id === 'sandbox-stairs-handrail');
    assert.equal(stairs.treads.length, stairs.steps);
    assert.ok(handrail.grindPath[0].x < stairs.x);
    assert.ok(handrail.grindPath.at(-1).y > handrail.grindPath[0].y);
    assert.ok(handrail.supports.length >= 3);
});

test('gaps are real breaks in ground with visible shores', () => {
    for (const gap of course.gaps) {
        const middle = (gap.startX + gap.endX) / 2;
        assert.equal(course.groundHeightAt(middle), null, `${gap.id} possui chão invisível`);
        assert.ok(Number.isFinite(course.groundHeightForAir(middle)));
        const leftSurface = course.groundHeightAt(gap.startX - 1);
        const rightSurface = course.groundHeightAt(gap.endX + 1);
        assert.ok(Number.isFinite(leftSurface), `${gap.id} sem borda de saída`);
        assert.ok(Number.isFinite(rightSurface), `${gap.id} sem borda de chegada`);
    }
});

test('builder exposes the complete reusable authoring vocabulary', () => {
    const builder = kit.createBuilder();
    for (const method of ['addGround', 'addRamp', 'addRail', 'addStairs', 'addBench',
        'addLedge', 'addPlatform', 'addGap', 'addSupport']) assert.equal(typeof builder[method], 'function');
});

test('the short sandbox can be played from spawn to finish with the current physics', () => {
    const result = run({ course, endX: course.finish.x + 10 });
    assert.equal(result.phase, 'COMPLETED', `${result.failureReason} em x=${result.x}`);
    assert.ok(result.physicsSeconds > 13 && result.physicsSeconds < 16);
    for (const railId of ['low-rail', 'sandbox-bench-top', 'sandbox-ledge-edge',
        'upper-platform-edge', 'sandbox-stairs-handrail']) {
        assert.ok(result.enteredRails.includes(railId), `não entrou em ${railId}`);
    }
    assert.ok(result.rampLaunches.some(launch => launch.held && launch.x > 2200));
});
