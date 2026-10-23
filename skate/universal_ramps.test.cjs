const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('./ollie_physics.js');
const input = require('./space_input_parser.js');
const kit = require('./procedural_track.js');
const { COURSE } = require('./course.js');
const { runRamp } = require('./ramp_validation.cjs');
const { run } = require('./level_playtest.cjs');

test('RAMP input holds without jumping, charging or leaving a double-tap pending',()=>{
    const parser=input.createParser();
    parser.keyDown(0,'GROUND');parser.keyUp(40);
    assert.deepEqual(parser.keyDown(100,'RAMP'),[{type:'RAMP_HOLD',at:100}]);
    assert.equal(parser.lastGroundJumpAt,null);
    assert.deepEqual(parser.update(1000,'RAMP'),[]);
    assert.deepEqual(parser.keyUp(1100),[{type:'RAMP_RELEASE',holdMs:1000}]);
    assert.deepEqual(parser.keyDown(1150,'AIR'),[{type:'AIR_PRESS',at:1150}]);
});

for (const ramp of COURSE.ramps) test(`${ramp.id}: follow surface, lip launch, planned landing, weaker early release`,()=>{
    const good=runRamp(ramp),early=runRamp(ramp,{early:true});
    assert.ok(good.launch?.held,ramp.id);
    assert.equal(good.launch.x,ramp.surfacePoints.at(-1).x);
    assert.equal(good.launch.y,ramp.surfacePoints.at(-1).y);
    assert.ok(good.surfaceError<.001);
    assert.ok(good.landing,JSON.stringify(good));
    assert.equal(good.phase,'PLAYING');
    assert.ok(good.landing.x>=ramp.landingZone.startX-24 && good.landing.x<=ramp.landingZone.endX+24);
    assert.ok(early.launch && !early.launch.held && early.launch.releasedEarly);
    assert.ok(early.launch.vy>good.launch.vy, 'release cannot be stronger than holding');
    const highRate=runRamp(ramp,{frameRate:144});
    const lowRate=runRamp(ramp,{frameRate:30});
    assert.equal(highRate.launch.held,true); assert.equal(lowRate.launch.held,true);
    assert.ok(Math.abs(highRate.landing.x-good.landing.x)<3);
    assert.ok(Math.abs(lowRate.landing.x-good.landing.x)<3);
});

test('press/double press on a ramp cannot bypass riding to its physical lip',()=>{
    const ramp=COURSE.ramps[0];
    const sim=physics.createSimulation({startX:ramp.startX,ramps:[ramp],obstacle:null});
    assert.equal(sim.launchImmediate('normal'),false);
    assert.equal(sim.launchImmediate('ollie'),false);
    assert.equal(sim.launchFromRamp(ramp,true),false);
    for(let n=0;sim.state.player.x<ramp.endX-4;n++) {
        sim.step({spacePressed:n===0,ollieUpgrade:n===2,spaceHeld:true},1/120);
        assert.equal(sim.state.player.grounded,true);
        assert.equal(sim.state.player.takeoffs,0);
    }
    const atLip=physics.createSimulation({startX:ramp.endX,ramps:[ramp],obstacle:null});
    atLip.step({spaceHeld:true},1/120);
    assert.equal(atLip.state.rampLaunches.length,1,'starting exactly at the lip still uses the universal launcher');
});

test('ramp impulse uses current rider speed and multiplier, not configured cruise speed',()=>{
    const sim=physics.createSimulation({obstacle:null});
    const ramp={launchStrength:100,launchMultiplier:1.2};
    sim.state.player.forwardSpeed=115;assert.equal(sim.rampImpulse(ramp),60);
    sim.state.player.forwardSpeed=230;assert.equal(sim.rampImpulse(ramp),120);
    sim.config.forwardSpeed=999;assert.equal(sim.rampImpulse(ramp),120);
});

test('authored quarter-pipe uses the same surface/hold/lip pipeline',()=>{
    const builder=kit.createBuilder();
    builder.addGround({id:'floor',x:0,length:1000,y:250});
    const ramp=builder.addRamp({id:'quarter',type:'QUARTER_PIPE',surfacePoints:[[100,250],[150,245],[190,220],[220,160]],launchStrength:80});
    const sim=physics.createSimulation({startX:100,groundSegments:builder.build().groundSegments,ramps:[ramp],obstacle:null});
    while(!sim.state.rampLaunches.length) sim.step({spaceHeld:true},1/120);
    assert.equal(sim.state.rampLaunches[0].held,true);
    assert.equal(sim.state.rampLaunches[0].x,220);
});

test('complete keyboard line preserves grind, Super Jump Out, Mega Air and finish at 30/60/144 Hz',()=>{
    for(const frameRate of [30,60,144]) {
        const r=run({frameRate});
        assert.equal(r.phase,'COMPLETED',`${frameRate}: ${r.hit} ${r.failureReason}`);
        assert.ok(r.enteredRails.includes('bench-exit'));
        assert.ok(r.enteredRails.includes('void-e'));
        assert.ok(r.enteredRails.includes('grand-stair-handrail'));
        assert.ok(r.inputs.some(i=>i.action==='release-super-out'));
        assert.equal(r.presentation.landedMega,true);
        assert.ok(r.rampLaunches.every(l=>l.held));
    }
    const none=run({startX:23620,specialMode:'none'});
    assert.equal(none.phase,'FAILED');
    const early=run({startX:23620,specialReleaseMs:1000});
    assert.equal(early.phase,'FAILED');
});
