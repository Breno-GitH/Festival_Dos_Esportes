const test=require('node:test'),assert=require('node:assert/strict'),{setup}=require('./race_test_harness.cjs');
const dt=1/60;
function drive(game,r,target,limit=1600){const t=game.track;let n=0;
 while(Math.hypot(r.x-target.x,r.y-target.y)>6&&n++<limit){const previous={x:r.x,y:r.y};r.setInput(target.x-r.x,target.y-r.y);r.updateFreePhysics(dt,t,true);game.lapSystem.step(r,previous,r,n*dt,dt);assert.ok(Math.hypot(r.x-previous.x,r.y-previous.y)<=r.maxSpeed*dt+1e-7,'no positional jump');}
 assert.ok(n<limit,'reachable without a recovery point');
}
function follow(game,r,start,end){let p=game.track.pointOffset(start,0);for(let s=start+8;s<end;s+=8){const q=game.track.pointOffset(s,0);game.lapSystem.step(r,p,q,s/100,dt);p=q;}game.lapSystem.step(r,p,game.track.pointOffset(end,0),end/100,dt);}

for(const side of [-1,1])for(const later of [false,true])test(`${side<0?'inner':'outer'} curve edge: leave, ${later?'re-enter farther ahead':'return through same edge'}, then keep running`,()=>{
 const {game}=setup(),r=game.player,t=game.track,s=t.straight+t.curveLength*.24;
 Object.assign(r,t.pointOffset(s,0),{vx:0,vy:0,speed:0,state:'RUN'});
 drive(game,r,t.pointOffset(s,side*190));assert.equal(t.project(r.x,r.y).onTrack,false);
 if(later)drive(game,r,t.pointOffset(s+130,side*190));
 drive(game,r,t.pointOffset(s+(later?130:0),0));assert.equal(t.project(r.x,r.y).onTrack,true);assert.equal(r.routeRecovery,undefined);assert.equal(r.checkpointProgress,0);assert.equal(r.validatedLaps,0);
 const p={x:r.x,y:r.y};r.setInput(t.tangent(s).x,t.tangent(s).y);r.updateFreePhysics(dt,t,true);assert.ok(Math.hypot(r.x-p.x,r.y-p.y)>0);
});

test('straight edges and both oval curves have no physical wall for any runner',()=>{
 const {game}=setup(),t=game.track;
 for(const r of game.runners)for(const [s,side]of [[700,-1],[t.straight+t.curveLength*.7,1],[t.straight+t.curveLength+600,1],[t.straight*2+t.curveLength*1.4,-1]]){
  Object.assign(r,t.pointOffset(s,0),{vx:0,vy:0,speed:0,state:'RUN'});drive(game,r,t.pointOffset(s,side*175));assert.equal(t.project(r.x,r.y).onTrack,false);drive(game,r,t.pointOffset(s+50,0));assert.equal(t.project(r.x,r.y).onTrack,true);assert.equal(r.routeRecovery,undefined);
 }
});

test('grass slows acceleration/momentum and track speed returns gradually without a special event',()=>{
 const {game}=setup(),r=game.player,t=game.track;r.x=0;r.y=0;r.setInput(1,0);
 for(let n=0;n<90;n++)r.updateFreePhysics(dt,t,true);const slow=r.speed;assert.ok(slow<r.maxSpeed*.5);
 Object.assign(r,t.pointOffset(600,0));r.updateFreePhysics(dt,t,true);assert.ok(r.speed>slow);assert.ok(r.speed<r.maxSpeed*.8,'no immediate full-speed snap');
 for(let n=0;n<120;n++)r.updateFreePhysics(dt,t,true);assert.ok(r.speed>r.maxSpeed*.95);assert.equal(r.offTrack,false);
});

test('grass can cross half the oval and return freely, but missing ordered checkpoints still blocks finish',()=>{
 const {game}=setup(),r=game.player,t=game.track;follow(game,r,-40,700);const lower=t.pointOffset(700,0),upper={x:lower.x,y:-lower.y};
 let prev=lower;for(let n=1;n<=120;n++){const p={x:lower.x,y:lower.y+(upper.y-lower.y)*n/120};game.lapSystem.step(r,prev,p,n/10,.1);prev=p;}
 assert.equal(r.checkpointProgress,0);assert.equal(r.validatedLaps,0);assert.equal(r.routeRecovery,undefined);
 // Re-entry after CP2, then CP3 and finish are physical but cannot fill CP1/CP2.
 const upperProgress=t.project(upper.x,upper.y).progress;follow(game,r,upperProgress,t.length+20);assert.equal(r.validatedLaps,0);assert.equal(r.finished,false);
});

test('a checkpoint physically crossed on the track during the re-entry frame is accepted',()=>{
 const {game}=setup(),r=game.player,t=game.track,gate=game.lapSystem.gates[1];r.lapStarted=true;
 const point=(along,lateral)=>({x:gate.x+gate.forward.x*along+gate.normal.x*lateral,y:gate.y+gate.forward.y*along+gate.normal.y*lateral});
 const a=point(-3,130),b=point(3,120);assert.equal(t.project(a.x,a.y).onTrack,false);assert.equal(t.project(b.x,b.y).onTrack,true);
 const events=game.lapSystem.step(r,a,b,10,dt);assert.equal(events[0]?.type,'CHECKPOINT');assert.equal(r.checkpointProgress,1);assert.equal(r.routeRecovery,undefined);
});

test('crossing checkpoint planes on grass does not validate them',()=>{
 const {game}=setup(),r=game.player,gate=game.lapSystem.gates[1];r.lapStarted=true;
 const p=n=>({x:gate.x+gate.forward.x*n+gate.normal.x*190,y:gate.y+gate.forward.y*n+gate.normal.y*190});
 assert.equal(game.lapSystem.step(r,p(-5),p(5),1,dt).length,0);assert.equal(r.checkpointProgress,0);
});

test('all seven AIs steer to their current nearest edge and physically re-enter without teleport',()=>{
 const {game}=setup(),t=game.track;
 for(const r of game.runners.filter(r=>!r.isPlayer))for(const side of [-1,1]){
  const s=t.straight+t.curveLength*.36;Object.assign(r,t.pointOffset(s,side*195),{vx:0,vy:0,speed:0,state:'RUN',trackProjection:null});
  const first=t.project(r.x,r.y);game.updateAI(r,dt);const direction=r.inputX*first.tangent.y-r.inputY*first.tangent.x;assert.ok(direction*side>0,'AI initially heads in toward nearest border');
  let frames=0;while(!t.project(r.x,r.y).onTrack&&frames++<1200){const before={x:r.x,y:r.y};game.updateAI(r,dt);r.updateFreePhysics(dt,t,true);game.lapSystem.step(r,before,r,frames*dt,dt);assert.ok(Math.hypot(r.x-before.x,r.y-before.y)<=r.maxSpeed*dt+1e-7);}
  assert.ok(frames<1200);assert.equal(r.routeRecovery,undefined);assert.equal(r.validatedLaps,0);
 }
});

test('HUD has only off-track feedback and no yellow recovery marker or instruction',()=>{
 const g=setup(),texts=[];g.env.ctx.fillText=s=>texts.push(s);g.game.phase='RACING';g.game.player.offTrack=true;g.game.eventView.drawHud(g.env.ctx,g.game);
 assert.ok(texts.includes('FORA DA PISTA'));assert.ok(!texts.some(s=>/RETORNE|AMARELA|RECUPERA/i.test(s)));assert.equal(g.game.eventView.drawRecovery,undefined);
});
