const test = require('node:test');
const assert = require('node:assert/strict');
const { COURSE } = require('./course.js');
const { run } = require('./level_playtest.cjs');
const { quietGroundIntervals } = require('./level_validation.cjs');

const END = COURSE.sections.find(section => section.id === 'huge-ramp-gap').endX;
const first = items => items.filter(item => (item.x ?? item.startX) < END);

test('primeira metade: pista contínua e checkpoints em 35% e 70%', () => {
    assert.equal(END, 13900);
    assert.deepEqual(COURSE.sections.slice(0, 8).map(s => s.id), [
        'immediate-start', 'first-transfer', 'three-rail-chain', 'street-objects',
        'bench-precision', 'stair-rail', 'danger-chain', 'huge-ramp-gap'
    ]);
    assert.ok(COURSE.sections.every((s, i, all) => !i || all[i - 1].endX === s.startX));
    assert.deepEqual(first(COURSE.gaps).map(g => g.id),
        ['first-hop', 'street-hop', 'first-transfer-risk', 'intro-long-risk', 'stair-drop', 'three-rail-void', 'huge-launch-gap']);
    assert.equal(COURSE.checkpoints[0].x, 8750);
    assert.equal(COURSE.checkpoints[1].x, 17980);
    assert.ok(COURSE.checkpoints[0].x > COURSE.rails.find(r => r.id === 'stair-handrail').grindPath.at(-1).x);
    assert.ok(Math.abs((COURSE.checkpoints[0].x - COURSE.spawnX) / COURSE.projectedFullLength - .35) < .02);
    assert.ok(Math.abs((COURSE.checkpoints[1].x - COURSE.spawnX) / COURSE.projectedFullLength - .70) < .02);
    assert.ok(COURSE.estimateDurationSeconds(150, END) > 57);
    assert.ok(COURSE.estimateDurationSeconds(150, END) < 61);
    // Removing redundant rails leaves one recovery after the two risky transfers.
    assert.ok(quietGroundIntervals().filter(s => s.startX < END).every(s => s.seconds < 4));
});

test('pista oficial usa somente geometria procedural e nenhum objeto de rua arbitrário', () => {
    const ramps = first(COURSE.ramps), rails = first(COURSE.rails), props = first(COURSE.decor);
    assert.equal(ramps.length, 14);
    assert.equal(rails.length, 12);
    assert.equal(props.length, 9);
    assert.equal(COURSE.obstacles.length, 0);
    assert.equal(COURSE.procedural, true);
    assert.ok([...ramps, ...rails, ...props].every(item => item.procedural || item.type === 'procedural'));
    assert.ok([...ramps, ...rails, ...props].every(item => !item.asset && !item.assetId));
    assert.ok(ramps.every(r => r.surfacePoints.length >= 2 && r.collisionRegions.SAFE_TOP.length >= 2));
    assert.ok(rails.every(r => r.grindPath.length >= 2 && r.supports.length >= 1));
    assert.equal(props.filter(p => p.id.startsWith('danger-pillar-')).length, 3);
    assert.ok(props.some(p => p.id === 'huge-landing-structure'));
});

test('sobrevivência e Grind atravessam a primeira metade e entram na continuação', () => {
    for (const profile of ['survival', 'full']) {
        const r = run({ profile, endX: 14500 });
        assert.equal(r.phase, 'PLAYING', profile + ': ' + r.failureReason + ' x=' + r.x);
        assert.ok(r.timeSeconds > 60 && r.timeSeconds < 65);
        for (const id of ['stair-handrail', 'danger-a', 'danger-b', 'danger-c', 'huge-exit-rail'])
            assert.ok(r.enteredRails.includes(id), profile + ' perdeu ' + id);
        assert.ok(r.rampLaunches.some(i => i.rampId === 'huge-launch' && i.held));
        assert.ok(r.inputs.some(i => i.action === 'release-super-out' && i.rail === 'huge-exit-rail'));
    }
});

test('salto da rua tolera doze pixels de antecipação ou atraso', () => {
    for (const offset of [-12, -8, -4, 0, 4, 8, 12]) {
        const r = run({ endX: 6300, groundOffsetPx: offset });
        assert.equal(r.phase, 'PLAYING', offset + ': ' + r.failureReason + ' x=' + r.x);
    }
});

test('banco: topo seguro; impacto de frente causa Fail', () => {
    const bench = COURSE.decor.find(p => p.id === 'main-bench');
    assert.ok(bench.collisionObject.collisionRegions.SAFE_TOP.length);
    assert.ok(bench.collisionObject.collisionRegions.DANGEROUS_SIDE);
    const top = run({ startX: 6450, endX: 7000 });
    assert.equal(top.phase, 'PLAYING');
    assert.ok(top.trace.some(p => p.x > 6750 && p.x < 6910 && p.mode === 'GROUND' && p.y < 200));
    const side = run({ profile: 'zero', startX: 6500, endX: 7000 });
    assert.equal(side.phase, 'FAILED');
    assert.equal(side.failureReason, 'DANGEROUS_SIDE');
    assert.equal(side.hit, 'main-bench');
});

test('dez capturas do Stair Rail funcionam; dez erros atingem a escada', () => {
    const rail = COURSE.rails.find(r => r.id === 'stair-handrail');
    const stairs = COURSE.decor.find(p => p.id === 'fatal-stairs');
    assert.ok(rail.grindPath[0].x < stairs.x);
    assert.ok(rail.supports.every(s => s.bottomY > s.topY));
    assert.ok(rail.supports.filter(s => s.x >= stairs.x).every(s => s.bottomY <= 235));
    for (let i = 0; i < 10; i++) {
        const options = { startX: 7600 + i, endX: 8790,
            groundOffsetPx: (i % 5 - 2) * 4, captureDelayMs: i % 3 * 20 };
        const caught = run(options);
        assert.equal(caught.phase, 'PLAYING', 'captura ' + i);
        assert.ok(caught.enteredRails.includes(rail.id));
        const missed = run({ ...options, skipRail: rail.id });
        assert.equal(missed.phase, 'FAILED');
        assert.equal(missed.failureReason, 'DANGEROUS_STAIR_FALL');
        assert.equal(missed.hit, stairs.id);
    }
});

test('primeira transferência permite erro; o chain fatal exige a captura', () => {
    const tutorial = run({ endX: 2400, skipRail: 'first-link' });
    assert.equal(tutorial.phase, 'PLAYING');
    const risk = run({ startX: 8750, endX: 10300, skipRail: 'danger-b' });
    assert.equal(risk.phase, 'FAILED');
    assert.equal(risk.failureReason, 'FELL_IN_GAP');
});

test('três Grinds cruzam o vazio sem chão; perder B ou C causa queda', () => {
    const r = run({ startX: 8750, endX: 10300 });
    assert.equal(r.phase, 'PLAYING');
    assert.deepEqual(r.enteredRails.filter(id => id.startsWith('danger-')),
        ['danger-a', 'danger-b', 'danger-c']);
    const a = r.transitions.find(p => p.rail === 'danger-a');
    const c = r.transitions.find(p => p.rail === 'danger-c');
    assert.ok(r.transitions.filter(p => p.x >= a.x && p.x <= c.x)
        .every(p => p.mode !== 'GROUND' && p.mode !== 'MANUAL'));
    for (const x of [9320, 9500, 9750, 10000]) assert.equal(COURSE.groundHeightAt(x), null);
    for (const skipRail of ['danger-b', 'danger-c']) {
        const miss = run({ startX: 8750, endX: 10300, skipRail });
        assert.equal(miss.phase, 'FAILED', skipRail);
        assert.equal(miss.failureReason, 'FELL_IN_GAP');
    }
});

test('energia da rampa permite Normal e Ollie cruzarem o rooftop gap', () => {
    const ramp = COURSE.ramps.find(r => r.id === 'huge-launch');
    const gap = COURSE.gaps.find(g => g.id === 'huge-launch-gap');
    assert.equal(ramp.primitiveType, 'ramp');
    assert.equal(ramp.procedural, true);
    assert.equal(ramp.autoLaunch, true);
    assert.ok(gap.startX >= ramp.takeoffX && gap.startX - ramp.takeoffX < 20);
    for (const action of ['normal', 'ollie']) {
        const course = { ...COURSE, playLine: COURSE.playLine.map(input =>
            input.x === 12860 ? { ...input, action } : input) };
        const r = run({ course, startX: 12300, endX: END });
        assert.equal(r.phase, 'PLAYING', action);
        assert.ok(r.enteredRails.includes('huge-exit-rail'));
    }
});

test('Huge Gap aceita uma faixa de timing, com pouso antes do rail de saída', () => {
    const gap = COURSE.gaps.find(g => g.id === 'huge-launch-gap');
    assert.equal(gap.width, 260);
    for (const delta of [-30, -20, 0, 5]) {
        const course = { ...COURSE, playLine: COURSE.playLine.map(input =>
            input.x === 12860 ? { ...input, x: input.x + delta } : input) };
        const result = run({ course, startX: 12300, endX: END });
        const landing = result.transitions.find(t => t.mode === 'GROUND' && t.x > gap.endX);
        assert.equal(result.phase, 'PLAYING', String(delta));
        assert.ok(landing && landing.x >= gap.endX + 20, String(delta));
        assert.ok(result.enteredRails.includes('huge-exit-rail'), String(delta));
    }
});

test('zero input, hold permanente e mash não vencem a primeira metade', () => {
    for (const profile of ['zero', 'hold', 'mash']) {
        const r = run({ profile, endX: END });
        assert.equal(r.phase, 'FAILED', profile);
        assert.ok(r.x < END);
    }
});
