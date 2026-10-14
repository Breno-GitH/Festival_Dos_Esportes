const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('./ollie_physics.js');
const traversal = require('./traversal_system.js');
const { COURSE } = require('./course.js');
const { run } = require('./level_playtest.cjs');

test('release launches once immediately with strong impulse, tangent and preserved momentum', () => {
    for (const slope of [-0.5, 0, 0.6]) {
        const sim = physics.createSimulation({ obstacle: null, startX: 20 });
        const p = sim.state.player;
        Object.assign(p, { y: 100 + slope * 20, grounded: false, forwardSpeed: 280 });
        const rail = { id: 'release-test', points: [{x:0,y:100},{x:300,y:100+slope*300}] };
        const controller = traversal.createController();
        controller.update({player:p, input:{held:true}, rails:[rail], forwardSpeed:280});
        const takeoffs = p.takeoffs;
        const events = controller.update({player:p,input:{held:false,released:true},rails:[rail],forwardSpeed:280,simulation:sim});
        assert.equal(events[0].type, 'GRIND_OLLIE_OUT');
        assert.equal(p.jumpTier, 'super');
        assert.equal(p.forwardSpeed, 280 + Math.max(0, Math.min(8, slope*280*.035)));
        assert.equal(p.verticalVelocity, -650 + Math.max(-100, Math.min(100, slope*280*.35)));
        controller.update({player:p,input:{held:false},rails:[rail],forwardSpeed:280,simulation:sim});
        assert.equal(p.takeoffs, takeoffs + 1);
    }
});

test('huge stair exit repeats ten times; early release and no release fail', () => {
    for (let attempt = 0; attempt < 10; attempt++) {
        const r = run({startX:16400, endX:17980, exitOffsetPx: [-20,-10,0,5,8][attempt%5]});
        assert.equal(r.phase, 'PLAYING', `attempt ${attempt}`);
        assert.ok(r.enteredRails.includes('grand-stair-handrail'));
    }
    for (const exitOffsetPx of [-80, 20]) {
        const r = run({startX:16400,endX:17980,exitOffsetPx});
        assert.equal(r.phase, 'FAILED');
        assert.equal(r.failureReason, 'FELL_IN_GAP');
    }
});

test('Mega Air needs only SPACE and finite sustained execution', () => {
    const good = run({startX:23620});
    assert.equal(good.phase, 'COMPLETED');
    assert.equal(run({startX:23620,specialMode:'space-only'}).phase, 'COMPLETED');
    assert.ok(good.inputs.every(i=>i.code!=='KeyD')); 
    for (const specialMode of ['none','d-only']) {
        const r = run({startX:23620,specialMode});
        assert.equal(r.phase, 'FAILED', specialMode);
        assert.ok(r.x < 25179);
    }
    assert.equal(run({startX:23620,specialReleaseMs:1000}).phase, 'FAILED');
    const ramp = COURSE.ramps.find(r => r.specialAir);
    assert.equal(ramp.specialAir.maxControlledMs, 3400);
    assert.ok(good.inputs.some(i=>i.action==='special-release'));
});

test('full line survives frame scheduling at 30, 60, 90 and 120 Hz', () => {
    for (const frameRate of [30,60,90,120]) {
        const r = run({frameRate});
        assert.equal(r.phase, 'COMPLETED', `${frameRate} Hz: ${r.hit}`);
        assert.ok(r.physicsSeconds>=90 && r.physicsSeconds<=130);
        assert.ok(r.enteredRails.includes('void-e'));
        assert.ok(r.enteredRails.includes('finish-rail'));
        assert.ok(r.landings < 80, 'rail contact is not a new landing every frame');
        const stairs = r.trace.filter(p=>p.x>16800 && p.x<17580);
        assert.ok(stairs.every(p=>p.screenX+(17820-p.x)*p.zoom<445),
            'the stair exit landing is visible while planning the release');
        assert.ok(stairs.every(p=>p.screenY+(250-p.y)*p.zoom<280),
            'the stair landing remains below the rider and above the viewport bottom');
        const mega = r.trace.filter(p=>p.x>24030 && p.x<24630);
        assert.ok(mega.every(p=>p.zoom < .38));
        assert.ok(mega.every(p=>p.screenY > 68 && p.screenY < 260), 'rider remains below HUD and above landing');
        const gap = COURSE.gaps.find(g=>g.id==='final-launch-gap');
        const crossing = r.trace.filter(p=>p.x>gap.startX-120&&p.x<gap.endX);
        assert.ok(crossing.every(p=>p.screenY+(250-p.y)*p.zoom<280),
            'the enlarged Mega Gap still shows the landing height and depth beneath it');
        assert.ok(crossing.every(p=>p.screenX+(gap.endX-p.x)*p.zoom<445),
            'the far landing remains inside the horizontal view during the crossing');
    }
});
