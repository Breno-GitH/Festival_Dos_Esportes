const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{setup}=require('./archery_wide_harness.cjs');
function fixture(seed=1){
 const g=setup(seed),AI=g.env.ArcheryMasterAI,ai=AI.create({random:g.env.Math.random});
 const target={id:1,x:500,y:170,radius:18,basePoints:10,active:true,visible:true,hit:false};
 const context={frame:0,totalFrames:3600,x:500,y:326,area:g.config.masterArea,targets:[target],arrowSpeed:12.15,explosionRadius:62};
 const step=()=>{const r=AI.step(ai,context);context.x=r.x;context.y=r.y;context.frame++;return r;};
 return {g,AI,ai,target,context,step};
}
test('NORMAL profile has mild progress and permanent imperfection floors',()=>{
 const {AI}=fixture(),start=AI.profileAt(0),end=AI.profileAt(3600);
 assert.equal(AI.CONFIG.difficulty,'NORMAL');assert.equal(start.masterSkill,.5);assert.equal(end.masterSkill,.6);
 for(let frame=0;frame<=4000;frame+=25){const p=AI.profileAt(frame);assert.ok(p.accuracy>=.70&&p.accuracy<=.74);assert.ok(p.aimError>=3.5);assert.ok(p.predictionError>=.055);assert.ok(p.reactionDelay>=21);assert.ok(p.prediction<1);}
 assert.ok(end.reactionDelay>=start.reactionDelay-3);assert.ok(end.decisionDelay>=start.decisionDelay-2);
});
test('new targets require delayed observation and decision, then the full animation',()=>{
 const f=fixture();let fired=null;
 for(let n=0;n<220&&!fired;n++)fired=f.step().fire;
 assert.ok(fired);const events=f.ai.events,selected=events.find(e=>e.type==='SELECT');
 assert.ok(selected.frame>=selected.reactionDelay+selected.decisionDelay);
 const states=events.filter(e=>e.type==='STATE').map(e=>e.state);
 assert.deepEqual(Array.from(states.slice(0,6)),['DECIDING','READY','RAISE_BOW','DRAW_BOWSTRING','AIM','RELEASE_SHOT']);
 assert.ok(fired.commitFrame<events.find(e=>e.type==='SHOT').frame);assert.ok(fired.observedFrame<fired.commitFrame);
});
test('reaction, decision and cooldown vary between attempts and stay within human bounds',()=>{
 const f=fixture(18);
 for(let n=0;n<3400;n++)f.step();
 const choices=f.ai.events.filter(e=>e.type==='SELECT');assert.ok(choices.length>10);
 assert.ok(new Set(choices.map(e=>e.reactionDelay)).size>5);
 assert.ok(new Set(choices.map(e=>e.decisionDelay)).size>2);
 assert.ok(new Set(choices.map(e=>e.shotCooldown)).size>3);
 for(const e of choices){assert.ok(e.reactionDelay>=21&&e.reactionDelay<=39);assert.ok(Math.abs(e.reactionDelay-f.AI.profileAt(e.frame).reactionBase)<=8.5,'reaction must not drift between attempts');assert.ok(e.decisionDelay>0);assert.ok(e.shotCooldown>0);}
});
test('no route oracle: only visible delayed samples are retained',()=>{
 const f=fixture();
 for(const key of ['route','progress','futurePosition','pathType','velocity'])Object.defineProperty(f.target,key,{get(){throw Error('future/route read '+key);}});
 f.context.targets.push({id:2,active:false,visible:true},{id:3,active:true,visible:false});
 for(let n=0;n<150;n++)f.step();
 assert.equal(f.ai.memory.has(2),false);assert.equal(f.ai.memory.has(3),false);assert.ok(f.ai.shots>0);
 assert.ok(f.ai.events.filter(e=>e.type==='LOCK').every(e=>e.observedFrame<e.commitFrame));
});
test('committed aim never follows a target or switches on the release frame',()=>{
 const f=fixture();while(f.ai.state!=='AIM'&&f.context.frame<200)f.step();
 const locked={...f.ai.lockedAim};f.target.x=800;f.target.active=false;
 let fire;for(let i=0;i<40&&!fire;i++)fire=f.step().fire;
 assert.equal(fire.x,locked.x);assert.equal(fire.y,locked.y);assert.equal(f.ai.targetId,1);
});
test('lost targets cancel with a fresh decision instead of an instant replacement',()=>{
 const f=fixture();while(f.ai.state!=='READY'&&f.context.frame<200)f.step();
 f.target.active=false;f.context.targets.push({...f.target,id:2,active:true,x:510});
 const disappearance=f.context.frame;while(!f.ai.cancellations&&f.context.frame<300)f.step();
 assert.ok(f.ai.cancellations);assert.equal(f.ai.targetId,null);assert.ok(f.context.frame>disappearance+10);
 const next=f.ai.events.filter(e=>e.type==='SELECT'&&e.id===2);assert.equal(next.length,0);
});
test('small, fast, curved, distant, bird and gold targets increase physical dispersion',()=>{
 const {AI,context}=fixture(),p=AI.profileAt(1800),noise={x:1,y:.5,velocity:.7,face:.3};
 const t={id:1,frame:1750,x:500,y:170,vx:0,vy:0,speed:0,turn:0,radius:18,bird:false,golden:false};
 const c={...context,frame:1800,profile:p},base=AI.project(t,c,15,0,noise);
 for(const change of [{radius:8},{vx:2,speed:2},{turn:.15},{x:800},{bird:true},{golden:true},{y:85}])assert.ok(AI.project({...t,...change},c,15,0,noise).spread>base.spread);
 const a=AI.project(t,c,15,0,{...noise,x:0,face:.4}),b=AI.project(t,c,15,0,{...noise,x:0,face:-.4});assert.notEqual(a.x,b.x);
});
test('selection considers only observed explosive neighbours and soft player contention',()=>{
 const {AI,context}=fixture(),p=AI.profileAt(1000),c={...context,frame:1000,profile:p};
 const t={id:1,frame:970,x:500,y:170,vx:.4,vy:0,speed:.4,turn:0,radius:13,value:24,explosive:true};
 const neighbours=[{...t,id:2,x:520,value:16},{...t,id:3,x:490,value:26},{...t,id:4,x:510,value:1000}];
 const single=AI.evaluate(t,[t],c),group=AI.evaluate(t,[t,...neighbours],c);
 assert.equal(group.nearbyCount,2);assert.ok(group.nearbyValue<1042);assert.ok(group.score>single.score);
 const contested=AI.evaluate(t,[t],{...c,opponent:{x:500,shooting:true}});assert.ok(contested.score<single.score);assert.ok(contested.score>single.score*.5);
});
test('score and player HP/medals never rubber-band the AI',()=>{
 const {AI,context}=fixture(),p=AI.profileAt(2500),t={id:1,frame:2470,x:500,y:170,vx:.4,vy:0,speed:.4,turn:0,radius:14,value:16};
 const c={...context,frame:2500,profile:p};
 assert.deepEqual(AI.evaluate(t,[t],{...c,playerScore:0,masterScore:999}),AI.evaluate(t,[t],{...c,playerScore:999,masterScore:0}));
});
test('ordinary arrows retain fixed physical velocities after firing',()=>{
 const g=setup(2),shot={x:600,y:150,lockedAim:true};g.env.fireArcoArrow('MESTRE',shot);
 const a=g.game.arrows.at(-1),vx=a.speedX,vy=a.speedY;shot.x=-1000;
 for(let i=0;i<4;i++){g.env.updateArcoArrows();assert.equal(a.speedX,vx);assert.equal(a.speedY,vy);}
});

test('two readable candidates can both be chosen; there is no always-best solver',()=>{
 const selections=new Set();
 for(let seed=1;seed<=40;seed++){
  const f=fixture(seed);f.target.basePoints=16;f.context.targets.push({...f.target,id:2,x:510,basePoints:17});
  for(let n=0;n<120&&f.ai.targetId===null;n++)f.step();
  if(f.ai.targetId!==null)selections.add(f.ai.targetId);
 }
 assert.equal(selections.size,2);
});
