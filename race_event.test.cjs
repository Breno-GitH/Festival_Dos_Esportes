const test=require('node:test'),assert=require('node:assert/strict'),{setup}=require('./race_test_harness.cjs');
function walk(g,r,start,end,step=10){
 const t=g.game.track,system=g.game.lapSystem;let prev=t.pointOffset(start,0),time=0;const direction=Math.sign(end-start)||1;
 for(let s=start+direction*step;direction>0?s<end:s>end;s+=direction*step){const next=t.pointOffset(s,0);system.step(r,prev,next,time,.05);prev=next;time+=.05;}
 const next=t.pointOffset(end,0);system.step(r,prev,next,time,.05);return next;
}
function lapRunner(){const g=setup(),r=g.game.player;return {g,r,t:g.game.track,system:g.game.lapSystem};}
test('official field is eight runners and exactly three laps, with three intermediate gates',()=>{
 const {g,t,system}=lapRunner();assert.equal(g.game.totalLaps,3);assert.equal(g.game.runners.length,8);assert.equal(system.gates.length,4);assert.equal(system.gates[0].id,'FINISH');
 assert.ok(g.game.runners.every(r=>t.circularDistance(t.project(r.x,r.y).progress,0)<0));
});
test('analytic projection is continuous at every straight/curve seam and lateral offset',()=>{
 const {t}=lapRunner();for(let s=-10;s<=t.length+10;s+=7.3)for(const lateral of [-105,0,105]){
  const p=t.pointOffset(s,lateral),q=t.project(p.x,p.y);assert.ok(Math.abs(t.circularDistance(q.progress,s))<.01);assert.ok(Math.abs(q.lateral-lateral)<.01);assert.ok(q.onTrack);
 }
});
test('initial start crossing is not a completed lap',()=>{
 const {g,r}=lapRunner();walk(g,r,-40,30);assert.equal(r.lapStarted,true);assert.equal(r.validatedLaps,0);assert.equal(r.checkpointProgress,0);
});
test('A/B: repeated forward/backward line crossings and loitering do not award laps',()=>{
 const {g,r}=lapRunner();for(let n=0;n<12;n++){walk(g,r,-20,20,2);walk(g,r,20,-20,2);}
 assert.equal(r.validatedLaps,0);assert.equal(r.checkpointProgress,0);
});
test('wrong direction is rejected, including at the physical finish sensor',()=>{
 const {r,t,system}=lapRunner();r.lapStarted=true;r.checkpointProgress=3;
 walk({game:{track:t,lapSystem:system}},r,20,-20,2);assert.equal(r.validatedLaps,0);
});
test('C: cutting through half the oval cannot award a checkpoint or a lap',()=>{
 const {g,r,t,system}=lapRunner();walk(g,r,-40,t.straight*.5);const before=t.pointOffset(t.straight*.5,0),across={x:before.x,y:-before.y};
 system.step(r,before,across,4,.05);assert.ok(r.routeRecovery);assert.equal(r.checkpointProgress,0);assert.equal(r.validatedLaps,0);
 const finish=t.pointOffset(-10,0),after=t.pointOffset(10,0);system.step(r,finish,after,6,.05);assert.equal(r.validatedLaps,0);
});
test('D: CP1 then return towards start cannot count a lap',()=>{
 const {g,r,system}=lapRunner();walk(g,r,-40,system.gates[1].progress+10);assert.equal(r.checkpointProgress,1);
 walk(g,r,system.gates[1].progress+10,-20);walk(g,r,-20,20);assert.equal(r.validatedLaps,0);assert.equal(r.checkpointProgress,1);
});
test('CP3 then finish cannot substitute CP1 and CP2',()=>{
 const {g,r,t,system}=lapRunner();r.lapStarted=true;
 const cp=system.gates[3].progress;walk(g,r,cp-20,t.length+20);assert.equal(r.validatedLaps,0);assert.equal(r.checkpointProgress,0);
});
test('E: ordered physical crossings count exactly one lap, and never count twice',()=>{
 const {g,r,t,system}=lapRunner();walk(g,r,-40,t.length+20);assert.equal(r.validatedLaps,1);assert.equal(r.checkpointProgress,0);
 assert.deepEqual(Array.from(r.checkpointCrossings,c=>c.checkpoint),[1,2,3]);
 const p=t.pointOffset(20,0);for(let n=0;n<30;n++)system.step(r,p,p,30,.05);assert.equal(r.validatedLaps,1);
});
test('each of all eight runners uses the same three physical lap sequences',()=>{
 const g=setup(),t=g.game.track;
 for(const r of g.game.runners){walk(g,r,-40,t.length*3+20);assert.equal(r.validatedLaps,3,r.id);assert.equal(r.finished,true);assert.equal(r.lapCrossings.length,3);assert.equal(r.checkpointCrossings.length,9);assert.ok(r.finishTime>0);}
});
test('a wide step detects the exact forward crossing fraction inside the painted opening',()=>{
 const {t,system}=lapRunner(),gate=system.gates[0],a={x:gate.x-15,y:gate.y},b={x:gate.x+45,y:gate.y};
 const hit=system.crossing(a,b,gate);assert.equal(hit.t,.25);assert.equal(hit.x,gate.x);
 assert.equal(system.crossing({...a,y:gate.y+180},{...b,y:gate.y+180},gate),null);
});
test('ranking is lexicographic by laps, checkpoint and sector before finish time',()=>{
 const {system}=lapRunner();const a={finished:false,validatedLaps:2,checkpointProgress:0,segmentProgress:0},b={...a,validatedLaps:1,checkpointProgress:3,segmentProgress:1};assert.ok(system.compare(a,b)<0);
 assert.ok(system.compare({...a,checkpointProgress:2},{...a,checkpointProgress:1,segmentProgress:1})<0);
 assert.ok(system.compare({...a,segmentProgress:.8},{...a,segmentProgress:.2})<0);
 assert.ok(system.compare({finished:true,finishTime:10.001},{finished:true,finishTime:10.002})<0);
});
test('photo finish processes every runner before ordering; array order does not award victory',()=>{
 const g=setup(),game=g.game,t=game.track,line=game.lapSystem.gates[0];game.phase='RACING';game.obstacles.items=[];game.rivalEvents.update=()=>{};
 for(const [i,r] of game.runners.entries()){
  r.lapStarted=true;r.validatedLaps=2;r.checkpointProgress=3;r.x=line.x-20-i*2;r.y=line.y-90+i*25;
  r.updateFreePhysics=function(){this.x=line.x+10;};
 }
 // Player is first in the array, but a rival crosses earlier within this step.
 const rival=game.runners[1];rival.x=line.x-1;
 game.updateAI=()=>{};game.resolveRunnerContacts=()=>{};g.step(1);
 assert.equal(game.finishers[0].id,rival.id);assert.equal(game.player.finishOrder,2);assert.ok(rival.finishTime<game.player.finishTime);
 assert.equal(g.env.insignias.corrida,false);
});
test('all three obstacle patterns have four districts, patrol bounds and clear final stretch',()=>{
 const g=setup(),items=g.game.obstacles.items,L=g.game.track.length;
 for(let lap=1;lap<=3;lap++){
  const active=items.filter(i=>i.lap===lap);assert.ok(active.some(i=>i.type==='hurdle'));assert.ok(active.some(i=>i.type==='cone'));assert.ok(active.some(i=>i.type==='puddle'));assert.ok(active.some(i=>i.mobile));assert.ok(active.every(i=>i.baseProgress/L<.9));
 }
 for(const item of items.filter(i=>i.mobile))for(let clock=0;clock<100;clock+=.5){g.game.obstacles.updateWorldPosition(item,clock);assert.ok(Math.abs(g.game.track.circularDistance(item.progress,item.baseProgress))<=item.patrolSpan+.001);}
});
test('pigeons are non-colliding ambience and fly away near every runner',()=>{
 const g=setup(),game=g.game,pigeon=game.obstacles.items.find(i=>i.type==='pigeon');assert.equal(pigeon.lap,0);
 game.player.x=pigeon.x;game.player.y=pigeon.y;const before=game.obstacles.hitCount;game.obstacles.update(.1,game);game.obstacles.collideRunner(game.player,game);
 assert.equal(pigeon.flying,true);assert.equal(game.obstacles.hitCount,before);assert.equal(game.player.state,'READY');
});
test('crowd keeps fixed human/alien identities in four rows and reacts locally',()=>{
 const g=setup(),game=g.game,view=game.eventView;assert.equal(view.people.length,512);assert.ok(view.people.every(p=>['HUMAN','ALIEN'].includes(p.species)));
 const identity=JSON.stringify(view.people),section=view.sections[0];game.player.x=section.x;game.player.y=section.y;game.player.speed=200;
 for(let i=0;i<20;i++){game.clock+=.1;view.update(.1,game);}
 assert.equal(JSON.stringify(view.people),identity);assert.ok(view.sections[0].energy>0);view.react('lastLap',game.player,30);assert.equal(view.lastLap,true);
});
test('grass preserves the existing slowdown and cannot boost a shortcut',()=>{
 const g=setup(),r=g.game.player,t=g.game.track;r.x=0;r.y=0;r.setInput(1,0);
 for(let i=0;i<100;i++)r.updateFreePhysics(1/60,t,true);
 assert.ok(r.offTrack);assert.ok(r.speed<r.maxSpeed*.56);
});
test('master throws and bumps target other rivals as well, with real cooldowns',()=>{
 const g=setup('?raceqa=autoplay');g.game.startCountdown();g.game.countdown=0;
 while(g.game.phase!=='RESULT'&&g.game.raceTime<90)g.step(1);
 const e=g.game.rivalEvents;assert.ok(e.throws>0);assert.ok(e.events.some(e=>e.type==='THROW'&&e.target!=='zorp'));
 const times=e.events.filter(e=>e.type==='THROW').map(e=>e.time);for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=6.49);
 assert.equal(g.game.player.validatedLaps,3);assert.equal(g.env.insignias.corrida,g.game.player.finishOrder===1);assert.equal(g.game.phase,'RESULT');
});
let referenceFinish=null;
function fixedRaceFinish(){if(referenceFinish!==null)return referenceFinish;const g=setup('?raceqa=autoplay');g.game.startCountdown();g.game.countdown=0;while(g.game.phase!=='RESULT'&&g.game.raceTime<100)g.step(1);return referenceFinish=g.game.player.finishTime;}
for(const fps of [30,60,144])test(`complete physical race stays consistent with ${fps} FPS updates`,()=>{
 const g=setup('?raceqa=autoplay'),game=g.game;game.startCountdown();game.countdown=0;let n=0;
 // QA autoplay uses x3 playback; the internal physics stays at 60 Hz.
 while(game.phase!=='RESULT'&&n++<fps*45)g.tick(1/fps);
 assert.equal(game.phase,'RESULT');assert.equal(game.player.validatedLaps,3);assert.ok(Math.abs(game.player.finishTime-fixedRaceFinish())<.002);
 assert.equal(game.player.checkpointCrossings.length,9);assert.equal(game.player.lapCrossings.length,3);
});
test('drawing uses cached ground and a single, uniform camera zoom',()=>{
 const g=setup(),game=g.game;game.draw();game.draw();assert.equal(game.eventView.groundBuilds,1);assert.equal(game.eventView.zoom,.72);assert.equal(game.atlas.invalidDrawCalls,0);
});

test('return to the marked track point unlocks validation without granting a gate on that frame',()=>{
 const {g,r,t,system}=lapRunner();walk(g,r,-40,300);const a=t.pointOffset(300,0),grass={x:a.x,y:0};
 system.step(r,a,grass,1,.05);const anchor={...r.routeRecovery};assert.ok(anchor);
 const count=system.events.length;system.step(r,grass,anchor,2,.05);assert.equal(r.routeRecovery,null);assert.equal(system.events.length,count);
 walk(g,r,anchor.progress,t.length+20);assert.equal(r.validatedLaps,1);
});

test('every AI can physically complete all three laps using the shared validator',()=>{
 const g=setup('?raceqa=autoplay'),game=g.game;game.startCountdown();game.countdown=0;
 // Keep the simulation open after the podium solely to audit every finisher.
 game.finishRace=function(){this.phase='FINISHING';};
 while(game.runners.some(r=>!r.finished)&&game.raceTime<100)g.step(1);
 for(const r of game.runners){assert.equal(r.validatedLaps,3,r.id);assert.equal(r.finished,true,r.id);assert.equal(r.checkpointCrossings.length,9,r.id);assert.equal(r.lapCrossings.length,3,r.id);assert.ok(r.finishTime>0,r.id);}
 assert.equal(game.finishers.length,8);
});

test('a master projectile physically hits another rival, not only Zorp',()=>{
 const g=setup(),game=g.game,master=game.runners.find(r=>r.kind==='mestre'),rival=game.runners.find(r=>r.id==='cobalto');
 const p=game.track.pointOffset(200,0);master.x=p.x;master.y=p.y;master.trackProjection=game.track.project(master.x,master.y);
 rival.x=p.x+110;rival.y=p.y;rival.prevX=rival.x;rival.prevY=rival.y;master.prevX=master.x;master.prevY=master.y;
 game.runners=[master,rival];game.rivalEvents.throwCooldown=0;
 for(let n=0;n<50;n++){game.raceTime+=1/60;game.rivalEvents.update(1/60,game);}
 assert.equal(game.rivalEvents.throws,1);assert.equal(game.rivalEvents.hits,1);assert.ok(game.rivalEvents.events.some(e=>e.type==='OBJECT_HIT'&&e.victim==='cobalto'));
});
