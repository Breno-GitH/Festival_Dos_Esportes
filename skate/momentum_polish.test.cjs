const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('./ollie_physics.js');
const traversal = require('./traversal_system.js');
const { COURSE } = require('./course.js');
const { run } = require('./level_playtest.cjs');
const dt = 1/120;

for (const [name, points] of [
    ['flat', [{x:0,y:100},{x:500,y:100}]],
    ['ascending', [{x:0,y:150},{x:500,y:50}]],
    ['descending', [{x:0,y:50},{x:500,y:150}]],
    ['curved', Array.from({length:21},(_,i)=>({x:i*25,y:100+30*Math.sin(i/20*Math.PI)}))]
]) test(`soft capture ${name}: no teleport, no frozen velocity, contact in 100ms`, () => {
    const rail = { id:name, grindPath:points };
    const sim = physics.createSimulation({obstacle:null,groundSegments:[],startX:90});
    const p = sim.state.player, controller = traversal.createController();
    Object.assign(p,{y:traversal.sampleRail(rail,p.x).y-14,forwardSpeed:230,verticalVelocity:80,grounded:false});
    const before = {x:p.x,y:p.y,vx:p.forwardSpeed,vy:p.verticalVelocity};
    controller.update({player:p,input:{held:true},rails:[rail],forwardSpeed:230,simulation:sim});
    assert.equal(controller.mode,'GRIND');
    assert.deepEqual({x:p.x,y:p.y,vx:p.forwardSpeed,vy:p.verticalVelocity},before);
    for(let i=0;i<13;i++) {
        const previousX=p.x, previousY=p.y;
        sim.step({spaceHeld:true},dt);
        controller.update({player:p,previousX,input:{held:true},rails:[rail],forwardSpeed:230,dtSeconds:dt,simulation:sim});
        assert.ok(p.x>previousX,'keeps forward momentum');
        assert.ok(Math.abs(p.y-previousY)<4,'contact correction is spread across frames');
        assert.ok(p.grindForwardSpeed>=230*.95 && p.grindForwardSpeed<=230*1.04);
    }
    const contact=traversal.sampleRail(rail,p.x);
    assert.ok(Math.abs(p.y-contact.y)<1e-6);
    assert.ok(Math.abs(p.verticalVelocity-contact.slope*p.grindForwardSpeed)<1e-6);
    assert.equal(p.grindCaptureProgress,1);
    const vx=p.forwardSpeed;
    controller.update({player:p,input:{released:true,held:false},rails:[rail],forwardSpeed:vx,simulation:sim});
    assert.equal(controller.mode,'AIR');
    assert.equal(p.jumpTier,'super');
    assert.ok(p.verticalVelocity < -550);
    sim.step({},dt);
    assert.ok(p.forwardSpeed>=vx-2,'no sudden horizontal reset after exit');
});

test('capture before first post leaves x unchanged; no hold never captures',()=>{
    const rail={id:'leading',points:[{x:100,y:100},{x:500,y:100}]};
    for(const held of [false,true]) {
        const p={x:90,y:94,forwardSpeed:230,verticalVelocity:80,grounded:false};
        const controller=traversal.createController();
        controller.update({player:p,input:{held},rails:[rail],forwardSpeed:230});
        assert.equal(controller.mode,held?'GRIND':'AIR');
        assert.equal(p.x,90);assert.equal(p.y,94);
    }
});

test('holding on flat ground gives exactly the same height and one takeoff as a tap',()=>{
    function flight(held){
        const sim=physics.createSimulation({obstacle:null});let minY=250;
        for(let i=0;i<240;i++) {
            sim.step({spacePressed:i===0,spaceHeld:held},dt);
            minY=Math.min(minY,sim.state.player.y);
        }
        return {height:250-minY,takeoffs:sim.state.player.takeoffs};
    }
    assert.deepEqual(flight(true),flight(false));
    assert.equal(flight(true).takeoffs,1);
});

test('intro has five distinct rails, safe first transfer and two real gaps',()=>{
    const rails=COURSE.rails.filter(r=>r.grindPath[0].x<4000);
    assert.equal(rails.length,5);
    assert.equal(new Set(rails.map(r=>Math.round(traversal.railLength(r)))).size,5);
    assert.ok(rails.some(r=>r.grindPath.length>2));
    assert.equal(COURSE.groundHeightAt(1800),250);
    for(const x of [2550,3500]) assert.equal(COURSE.groundHeightAt(x),null);
    const missed=run({endX:3000,skipRail:'three-a'});
    assert.equal(missed.phase,'FAILED');
    assert.equal(missed.failureReason,'FELL_IN_GAP');
});
