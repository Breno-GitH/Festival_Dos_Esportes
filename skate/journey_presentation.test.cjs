const test=require('node:test'),assert=require('node:assert/strict');
const journey=require('./journey_presentation.js');
const {COURSE}=require('./course.js'),{run}=require('./level_playtest.cjs');

test('daylight interpolates through four periods and Mega Ramp is fully night',()=>{
    assert.deepEqual([0,.3,.6,.9].map(p=>journey.lighting(p).period),['morning','afternoon','sunset','night']);
    for(const p of [.25,.5,.75]){
        const a=journey.lighting(p-.001),b=journey.lighting(p+.001);
        assert.ok(Math.abs(a.neon-b.neon)<.01,'no abrupt lighting switch');
    }
    const ramp=COURSE.ramps.find(r=>r.specialAir);
    const p=(ramp.startX-COURSE.spawnX)/(COURSE.finish.x-COURSE.spawnX);
    assert.equal(journey.lighting(p).neon,1);
});

test('rider follows slope with bounded rotation and compresses around contact at landing',()=>{
    const flat=journey.riderFeedback({slope:0});
    assert.equal(flat.angle,0);
    const up=journey.riderFeedback({slope:-.6,grinding:true});
    const down=journey.riderFeedback({slope:.6,grinding:true});
    assert.ok(up.angle<0&&down.angle>0);
    assert.ok(Math.abs(up.angle)<.5&&Math.abs(down.angle)<.5);
    assert.ok(up.sparks>down.sparks);
    assert.ok(down.trail>up.trail);
    assert.ok(journey.riderFeedback({landingAge:.11,impact:700}).scaleY<1);
    assert.equal(journey.riderFeedback({landingAge:1,impact:700}).scaleY,1);
});

test('celebration follows air, landing and finish within a fixed particle pool',()=>{
    const fx=journey.createController();
    const state={phase:'PLAYING',player:{x:24060,y:120,landings:0,jumpTier:'mega-air',verticalVelocity:-600,specialRampAir:{active:true}}};
    fx.observe(state,false);fx.update(.05);assert.equal(fx.snapshot().launched,0);
    fx.observe(state,true);
    for(let i=0;i<70;i++)fx.update(.05);
    assert.equal(fx.snapshot().stage,'air');assert.ok(fx.snapshot().bursts>0);
    Object.assign(state.player,{landings:1,jumpTier:'',y:250,specialRampAir:{active:false,landed:true}});
    fx.observe(state,false);assert.equal(fx.snapshot().stage,'landing');
    assert.ok(fx.snapshot().lastLanding.strong);
    const launches=fx.snapshot().launched;
    for(let i=0;i<20;i++)fx.update(.05);
    assert.ok(fx.snapshot().launched>launches,'celebration continues without Hold after landing');
    state.phase='COMPLETED';fx.observe(state,false);
    for(let i=0;i<120;i++){fx.update(.05);assert.ok(fx.snapshot().particles<=journey.PARTICLE_LIMIT);}
    assert.ok(fx.snapshot().finished);
});

test('release and crash stop launching fireworks; remaining particles expire',()=>{
    const fx=journey.createController(),state={phase:'PLAYING',player:{landings:0,jumpTier:'mega-air',verticalVelocity:-200,specialRampAir:{active:true}}};
    fx.observe(state,true);for(let i=0;i<20;i++)fx.update(.05);
    fx.observe(state,false);const launched=fx.snapshot().launched;
    for(let i=0;i<20;i++)fx.update(.05);
    assert.equal(fx.snapshot().launched,launched);
    state.phase='FAILED';fx.observe(state,true);
    const bursts=fx.snapshot().bursts;
    for(let i=0;i<100;i++)fx.update(.05);
    assert.equal(fx.snapshot().launched,launched);assert.equal(fx.snapshot().particles,0);
    assert.equal(fx.snapshot().bursts,bursts,'Fail never creates another burst');
    assert.equal(fx.snapshot().stage,'failed');
});

test('full course clears with SPACE only and Mega fail cancels celebration',()=>{
    const good=run({specialMode:'space-only'});
    assert.equal(good.phase,'COMPLETED');assert.ok(good.presentation.finished);
    assert.deepEqual(good.keysUsed,['Space']);
    assert.ok(good.presentation.landedMega);
    for(const options of [{specialMode:'none'},{specialReleaseMs:1000}]){
        const bad=run({startX:23620,...options});
        assert.equal(bad.phase,'FAILED');assert.equal(bad.presentation.stage,'failed');
        assert.equal(bad.presentation.finished,false);
    }
});
