const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { COURSE } = require('./course.js');
const { run } = require('./level_playtest.cjs');

const allGameplayGeometry = () => [
    ...COURSE.groundSegments, ...COURSE.ramps, ...COURSE.rails,
    ...COURSE.decor, ...COURSE.gaps
];

test('official Skate is backed only by procedural course geometry', () => {
    assert.equal(COURSE.official, true);
    assert.equal(COURSE.procedural, true);
    assert.equal(COURSE.id, 'official-procedural-skate');
    assert.ok(allGameplayGeometry().every(item => !item.asset && !item.assetId && !item.file));
    assert.deepEqual({ ground: COURSE.groundSegments.length, ramps: COURSE.ramps.length,
        rails: COURSE.rails.length, gaps: COURSE.gaps.length },
    { ground: 30, ramps: 22, rails: 29, gaps: 14 });
});

test('official rails, ramps and structures share visual and gameplay geometry', () => {
    for (const ramp of COURSE.ramps) {
        assert.strictEqual(ramp.surfacePoints, ramp.collisionSurface);
        assert.strictEqual(ramp.surfacePoints, ramp.collisionRegions.SAFE_TOP);
    }
    for (const rail of COURSE.rails) {
        assert.strictEqual(rail.points, rail.grindPath);
        assert.strictEqual(rail.grindPath, rail.collisionRegions.GRINDABLE_TOP);
        assert.ok(rail.supports.length, `${rail.id} is missing supports`);
        assert.ok(rail.supports.every(support => support.bottomY > support.topY));
    }
    const bench = COURSE.decor.find(item => item.id === 'main-bench').collisionObject.collisionRegions;
    assert.ok(bench.SAFE_TOP.length && bench.DANGEROUS_SIDE);
    const stairs = COURSE.decor.find(item => item.id === 'fatal-stairs').collisionObject;
    assert.equal(stairs.safeGrindRailId, 'stair-handrail');
    assert.ok(stairs.collisionRegions.DANGEROUS_STAIR_FALL.segments.length);
});

test('official browser flow loads procedural track without scene sprite catalogs', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, 'skate_ollie_runtime.js'), 'utf8');
    for (const obsolete of ['skate_new/asset_catalog.js', 'skate/first_half.js',
        'skate_v2/assembly_rules.js', 'skate/test_course.js', 'skate/mechanics_test_course.js']) {
        assert.equal(html.includes(obsolete), false, obsolete);
    }
    const kit = html.indexOf('skate/procedural_track.js');
    const official = html.indexOf('skate/official_procedural_course.js');
    const course = html.indexOf('skate/course.js');
    const runtime = html.indexOf('skate/skate_ollie_runtime.js');
    assert.ok(kit >= 0 && kit < official && official < course && course < runtime);
    assert.doesNotMatch(renderer, /background_skate\.png|rampas\.png|grids\.png|assets_skate\.png|skate_assets2\.0\.png/);
});

test('official run completes with procedural collisions, Grind capture and Jump Out', () => {
    const result = run({ profile: 'full' });
    assert.equal(result.phase, 'COMPLETED');
    assert.equal(result.x, COURSE.finish.x);
    assert.ok(result.enteredRails.includes('stair-handrail'));
    assert.ok(result.enteredRails.includes('danger-c'));
    assert.ok(result.enteredRails.includes('finish-rail'));
    assert.ok(result.inputs.some(input => input.action === 'release-super-out'));
});

test('five supported rails form a fatal no-floor line with a required Super transfer', () => {
    const ids = ['void-a', 'void-b', 'void-c', 'void-d', 'void-e'];
    const rails = ids.map(id => COURSE.rails.find(rail => rail.id === id));
    assert.deepEqual(rails.map(rail => rail.type),
        ['horizontal', 'ascending', 'descending', 'curved', 'horizontal']);
    assert.ok(rails.every(rail => rail.required && rail.supports.length >= 3));
    assert.ok(rails.every(rail => rail.supports.every(support => support.bottomY > support.topY)));
    for (const x of [14650, 14980, 15300, 15650, 16000, 16200])
        assert.equal(COURSE.groundHeightAt(x), null);
    assert.equal(COURSE.transfers.find(transfer => transfer.from === 'void-d').jump, 'super');
    const clear = run({ startX: 13800, endX: 16350 });
    assert.equal(clear.phase, 'PLAYING');
    assert.deepEqual(clear.enteredRails, ids);
    const first = clear.transitions.find(t => t.rail === 'void-a');
    const last = clear.transitions.find(t => t.rail === 'void-e');
    assert.ok(clear.transitions.filter(t => t.x >= first.x && t.x <= last.x)
        .every(t => t.mode !== 'GROUND' && t.mode !== 'MANUAL'));
    for (const skipRail of ids.slice(1)) {
        const miss = run({ startX: 13800, endX: 16350, skipRail });
        assert.equal(miss.phase, 'FAILED', skipRail);
        assert.equal(miss.failureReason, 'FELL_IN_GAP', skipRail);
    }
    // Every rail release now produces Super; height is no longer a pilot tier choice.
    assert.ok(clear.trace.some(point => point.tier === 'super'));
    for (const captureDelayMs of [10, 30, 50]) {
        const varied = run({ startX: 13800, endX: 17980, captureDelayMs });
        assert.equal(varied.phase, 'PLAYING', String(captureDelayMs));
        assert.ok(ids.every(id => varied.enteredRails.includes(id)), String(captureDelayMs));
    }
});

test('grand stair rail starts before twenty-four fatal steps and needs a timed exit', () => {
    const stairs = COURSE.decor.find(item => item.id === 'grand-fatal-stairs');
    const rail = COURSE.rails.find(item => item.id === 'grand-stair-handrail');
    const exitGap = COURSE.gaps.find(item => item.id === 'grand-stair-exit');
    assert.equal(stairs.steps, 24);
    assert.equal(stairs.collisionObject.safeGrindRailId, rail.id);
    assert.ok(rail.startX < stairs.x);
    assert.ok(rail.endX > stairs.x + stairs.width - 25);
    assert.equal(exitGap.startX, stairs.x + stairs.width);
    assert.equal(COURSE.groundHeightAt(17360), null);
    assert.ok(COURSE.decor.some(item => item.id === 'grand-stair-landing'));
    const clear = run({ startX: 16400, endX: 17980 });
    assert.equal(clear.phase, 'PLAYING');
    assert.ok(clear.enteredRails.includes(rail.id));
    assert.ok(clear.transitions.some(t => t.mode === 'GROUND' && t.x >= exitGap.endX));
    const missedRail = run({ startX: 16400, endX: 17980, skipRail: rail.id });
    assert.equal(missedRail.failureReason, 'DANGEROUS_STAIR_FALL');
    assert.equal(missedRail.hit, stairs.id);
    for (const offset of [-80, 20]) {
        const miss = run({ startX: 16400, endX: 17980, exitOffsetPx: offset });
        assert.equal(miss.phase, 'FAILED', String(offset));
        assert.equal(miss.failureReason, 'FELL_IN_GAP', String(offset));
    }
    for (const offset of [-25, -10, 0, 5])
        assert.equal(run({ startX: 16400, endX: 17980, exitOffsetPx: offset }).phase,
            'PLAYING', String(offset));
});

test('last third connects ramp, bench, ledge and three launch surfaces without scenery sprites', () => {
    const bench = COURSE.decor.find(item => item.id === 'advanced-bench');
    const ledge = COURSE.decor.find(item => item.id === 'advanced-ledge');
    for (const item of [bench, ledge]) {
        assert.ok(item.collisionObject.collisionRegions.SAFE_TOP.length);
        assert.ok(item.collisionObject.collisionRegions.DANGEROUS_SIDE);
    }
    assert.ok(COURSE.rails.some(rail => rail.id === 'advanced-bench-top'));
    assert.ok(COURSE.rails.some(rail => rail.id === 'advanced-ledge-edge'));
    const rampIds = ['release-small', 'release-medium', 'release-curve', 'final-medium-kicker'];
    const ramps = rampIds.map(id => COURSE.ramps.find(ramp => ramp.id === id));
    assert.deepEqual(ramps.map(ramp => ramp.kind),
        ['small_kicker', 'medium_kicker', 'curved_ramp', 'medium_kicker']);
    const clear = run({ profile: 'full' });
    assert.equal(clear.phase, 'COMPLETED');
    for (const ramp of ramps)
        assert.ok(clear.trace.some(point => point.x >= ramp.startX && point.x <= ramp.endX
            && point.mode === 'GROUND'), ramp.id);
    assert.ok(clear.enteredRails.includes('advanced-ledge-edge'));
    assert.ok(clear.enteredRails.includes('final-descending'));
    const side = run({ profile: 'zero', startX: 18230, endX: 18530 });
    assert.equal(side.failureReason, 'DANGEROUS_SIDE');
    assert.equal(side.hit, 'advanced-bench');
    const onTop = require('./ramp_validation.cjs').runRamp(
        COURSE.ramps.find(r=>r.id==='advanced-launch'),{early:true});
    assert.equal(onTop.landing.surface,'advanced-bench');
    assert.equal(onTop.landing.y,bench.y);
    assert.equal(onTop.phase,'PLAYING');
});

test('final gauntlet has four required fast transfers, fatal stair miss and clean finish', () => {
    const ids = ['final-descending', 'final-transfer', 'final-high', 'final-curved'];
    const stair = COURSE.decor.find(item => item.id === 'final-stairs');
    assert.equal(stair.collisionObject.safeGrindRailId, ids[0]);
    assert.ok(stair.fatalStairs);
    assert.equal(COURSE.transfers.find(transfer => transfer.from === ids[1]).jump, 'super');
    const good = run({ startX: 20730, endX: 22630 });
    assert.equal(good.phase, 'PLAYING');
    assert.deepEqual(good.enteredRails.filter(id => ids.includes(id)), ids);
    assert.ok(good.transitions.filter(t => t.x >= 21150 && t.x <= 22550)
        .every(t => t.mode !== 'GROUND' && t.mode !== 'MANUAL'));
    for (const skipRail of ids) {
        const missed = run({ startX: 20730, endX: 22630, skipRail });
        assert.equal(missed.phase, 'FAILED', skipRail);
    }
    const whole = run({ profile: 'survival' });
    assert.equal(whole.phase, 'COMPLETED');
    assert.ok(whole.physicsSeconds >= 90 && whole.physicsSeconds <= 130);
    assert.ok(run({startX:23620}).enteredRails.includes('finish-rail'));
    assert.ok(whole.transitions.some(t => t.mode === 'GROUND' && t.x >= 25179));
    assert.ok(whole.trace.some(t => t.x >= 25780 && t.mode === 'GROUND'));
    assert.ok(COURSE.estimateDurationSeconds(21150) >= 15);
    assert.ok(COURSE.estimateDurationSeconds(21150) <= 20);
});

test('zero, permanent hold and mash cannot clear the procedural official course', () => {
    for (const profile of ['zero', 'hold', 'mash']) {
        const result = run({ profile });
        assert.equal(result.phase, 'FAILED', profile);
        assert.ok(result.x < COURSE.finish.x, profile);
    }
});
