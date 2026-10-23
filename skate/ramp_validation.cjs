// QA only: integrates the real physics and traversal; no position edits after spawn.
const fs = require('node:fs');
const path = require('node:path');
const physics = require('./ollie_physics.js');
const traversal = require('./traversal_system.js');
const { COURSE } = require('./course.js');

function runRamp(ramp, { early = false, speedScale = 1, frameRate = 60 } = {}) {
    const startX = ramp.startX - 30;
    const sim = physics.createSimulation({ startX, groundSegments:COURSE.groundSegments,
        ramps:COURSE.ramps, collisionObjects:COURSE.decor.filter(d=>!d.collisionDisabled && d.collisionObject)
            .map(d=>d.collisionObject), obstacles:[], obstacle:null, failY:520,
        forwardSpeed:COURSE.forwardSpeedAt(startX)*speedScale });
    const travel = traversal.createController();
    let held = true, released = false, error = 0, frames = 0, accumulator = 0, landing = null;
    const transitions = [];
    const dt = 1/120;
    for (;frames < frameRate*15 && !landing && sim.state.phase === 'PLAYING';frames++) {
        accumulator += 1/frameRate;
        while (accumulator >= dt && !landing && sim.state.phase === 'PLAYING') {
            const p = sim.state.player;
            const previousX=p.x, previousGrounded=p.grounded;
            if (early && p.x >= ramp.startX + (ramp.endX-ramp.startX)*.5) {
                held=false; released=true;
            }
            if (p.specialRampAir?.controlledMs >= p.specialRampAir?.maxControlledMs) held=false;
            sim.config.forwardSpeed=COURSE.forwardSpeedAt(p.x)*speedScale;
            sim.step({spaceHeld:held},dt);
            const events = travel.update({player:p,previousX,previousGrounded,
                input:{held,released},rails:COURSE.rails,forwardSpeed:p.forwardSpeed,
                targetForwardSpeed:sim.config.forwardSpeed,groundY:p.grounded?p.y:physics.groundHeightAt(p.x,sim.config),
                dtSeconds:dt,simulation:sim});
            released=false;
            if (p.rampRide?.rampId === ramp.id && p.grounded) {
                error=Math.max(error,Math.abs(p.y-physics.rampSurfaceAt([ramp],p.x).y));
            }
            transitions.push(...events.filter(e=>e.type!=='GRIND_DISTANCE'));
            const launched=sim.state.rampLaunches.find(l=>l.rampId===ramp.id);
            if (launched && (travel.mode==='GRIND' || (p.grounded && p.landings>0))) {
                landing={x:p.x,y:p.y,mode:travel.mode,surface:travel.activeRail?.id||p.lastLandingPlatformId||'ground',at:sim.state.elapsed};
            }
            accumulator-=dt;
        }
    }
    const launch=sim.state.rampLaunches.find(l=>l.rampId===ramp.id);
    return {id:ramp.id,early,frameRate,speedScale,launch,landing,surfaceError:error,
        phase:sim.state.phase,failure:sim.state.failureReason||'',x:sim.state.player.x,
        planned:ramp.landingZone,purpose:ramp.purpose,transitions};
}
function validateAll() {
    return COURSE.ramps.map(ramp=>({id:ramp.id,hold:runRamp(ramp),early:runRamp(ramp,{early:true})}));
}
if (require.main===module) {
    const results=validateAll();
    fs.writeFileSync(path.join(__dirname,'qa','universal-ramps.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results.map(r=>({id:r.id,held:r.hold.launch?.held,vy:r.hold.launch?.vy,
        landing:r.hold.landing,earlyVy:r.early.launch?.vy,earlyLanding:r.early.landing,
        failure:r.hold.failure})),null,2));
}
module.exports={runRamp,validateAll};
