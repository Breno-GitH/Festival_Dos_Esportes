const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{setup}=require('./archery_wide_harness.cjs');
test('native 900x480 field restores 450x300 outside Archery; no scene scaling',()=>{
 const g=setup(),f=g.env.ArcheryField,c=g.env.canvas;assert.equal(f.player.right-f.player.left,804);assert.equal(f.master.right-f.master.left,804);
 assert.ok(f.player.front-f.master.back>=100);f.syncCanvas(c,'JOGO_ARCO');assert.equal(c.width,900);assert.equal(c.height,480);
 f.syncCanvas(c,'ILHA_ARCO');assert.equal(c.width,450);assert.equal(c.height,300);f.syncCanvas(c,'JOGO_BOXE');assert.equal(c.width,450);
});
test('both competitors stay in separate broad shooting bounds, including held directions',()=>{
 const g=setup();for(const key of ['a','d','w','s']){
  g.env.keys={};g.env.keys[key]=true;for(let n=0;n<300;n++){g.env.updateArcoPlayer();g.env.updateArcoMaster();}
  const p=g.game,m=g.config.masterArea,a=g.config.shooterArea;
  assert.ok(p.playerX>=a.left&&p.playerX<=a.right&&p.playerY>=a.front&&p.playerY<=a.back);
  assert.ok(p.mestreX>=m.left&&p.mestreX<=m.right&&p.mestreY>=m.front&&p.mestreY<=m.back);
 }
 assert.equal(g.game.stats.playerRange.minX,48);assert.equal(g.game.stats.playerRange.maxX,852);assert.equal(g.game.stats.boundsViolations,0);
});
test('three depth bands retain original target sizes and point values',()=>{
 const g=setup(),s=g.run('ARCHERY_TARGET_TYPES');assert.equal(s.NORMAL_LARGE.radius,18);assert.equal(s.NORMAL_MEDIUM.radius,14);assert.equal(s.NORMAL_SMALL.radius,10);
 assert.equal(s.NORMAL_LARGE.basePoints,10);assert.equal(s.NORMAL_MEDIUM.basePoints,16);assert.equal(s.NORMAL_SMALL.basePoints,26);
 const bands=g.env.ArcheryField.bands;assert.ok(bands.NEAR.waterY>bands.MID.waterY&&bands.MID.waterY>bands.FAR.waterY);
 assert.ok(g.env.ArcheryRiverTargets.SPEEDS.SLOW<g.env.ArcheryRiverTargets.SPEEDS.FAST);
});
test('all paths enter, move continuously and retire only outside the wide field',()=>{
 const g=setup(),river=g.env.ArcheryRiverTargets,s=g.run('ARCHERY_TARGET_TYPES');let count=0;
 for(const band of ['NEAR','MID','FAR'])for(const path of river.PATHS)for(const entry of ['LEFT','RIGHT','TOP']){
  const t=river.create(s.NORMAL_SMALL,{entry,exit:'RIGHT',path,band,speed:'FAST'});assert.equal(t.visible,false);let last=t.x,steps=0,retired=false;
  while(!retired&&steps++<1800){retired=river.step(t);assert.ok(Math.hypot(t.x-t.prevX,t.y-t.prevY)<3);if(entry==='LEFT')assert.ok(t.x>=last-1e-6);if(entry==='RIGHT')assert.ok(t.x<=last+1e-6);last=t.x;}
  assert.equal(retired,true);assert.equal(t.visible,false);count++;
 }assert.equal(count,63);
});
test('river route geometry is cached and reused without retaining target state',()=>{
 const g=setup(),r=g.env.ArcheryRiverTargets,s=g.run('ARCHERY_TARGET_TYPES.NORMAL_SMALL'),d={entry:'LEFT',path:'ARC',band:'FAR',speed:'FAST'};
 const a=r.create(s,d),b=r.create(s,d);assert.equal(a.route,b.route);r.step(a);assert.equal(b.progress,0);
});
test('authored waves have varied depth, speed, side and purposeful explosive groups',()=>{
 const g=setup(),p=g.env.ArcheryMatchPacing;assert.deepEqual(Array.from(p.PHASES,x=>x.capacity),[6,8,10,12]);
 assert.ok(p.PATTERNS.some(w=>w.targets.some(t=>t.carrier==='BIRD')));assert.ok(p.PATTERNS.some(w=>w.targets.filter(t=>t.kind==='EXPLOSIVE').length===2));
 const group=p.PATTERNS.find(w=>w.id==='EXPLOSIVE_CONFLUENCE');assert.equal(group.targets.length,4);assert.equal(group.targets.filter(t=>t.kind==='EXPLOSIVE').length,1);
 assert.equal(p.BIRD_FRAMES.length,0);
});
test('explosive confluence offers a real combo and chain wave detonates twice',()=>{
 const g=setup(),specs=g.run('ARCHERY_TARGET_TYPES'),r=g.env.ArcheryRiverTargets;
 for(const name of ['EXPLOSIVE_CONFLUENCE','EXPLOSIVE_CHAIN_CURRENT']){
  const wave=g.env.ArcheryMatchPacing.PATTERNS.find(w=>w.id===name),targets=wave.targets.map((d,i)=>{
   const t=r.create(specs[d.kind],d);t.id=i;for(let n=0;n<500-d.delay;n++)r.step(t);return t;
  });
  const seed=targets.find(t=>t.isExplosive),result=g.env.ArcheryExplosiveTargets.resolve(seed,targets);
  assert.ok(result.hits.length>=3,name);assert.ok(result.bonus>=15);if(name.includes('CHAIN'))assert.equal(result.blasts.length,2);
 }
});
for(const fps of [30,60,144])test('swept collision catches a small moving target at x820 at '+fps+' FPS',()=>{
 const g=setup(),c=g.env.ArcheryCollision;let hits=0;
 for(let i=0;i<500;i++){
  const y=130+i%100,t={carrier:i%2?'BIRD':'RIVER',entry:'LEFT',radius:7,x:823,y,prevX:817,prevY:y,hit:false};
  const arrow={prevX:820,prevY:y+11.8*60/fps*.7,x:820,y:y-11.8*60/fps*.3,state:'ACTIVE'};
  const impact=c.sweep(arrow,t);assert.ok(impact);assert.ok(impact.distance<=7);hits++;
 }assert.equal(hits,500);assert.equal(c.diagnostics().radiusPadding,0);
});
test('first contact wins and a normal arrow cannot hit twice or award an extra point',()=>{
 const g=setup();g.game.targets.length=0;g.run("spawnArcoTarget({kind:'NORMAL_SMALL',entry:'LEFT',qaStatic:true,x:810,y:180});spawnArcoTarget({kind:'NORMAL_SMALL',entry:'LEFT',qaStatic:true,x:810,y:140});");
 g.game.arrows.push({owner:'PLAYER',state:'ACTIVE',x:810,y:240,prevX:810,prevY:240,speedX:0,speedY:-180});g.env.updateArcoArrows();
 assert.equal(g.game.targets.filter(t=>t.hit).length,1);assert.equal(g.game.targets[0].hit,true);const points=g.game.playerScore;g.env.updateArcoArrows();assert.equal(g.game.playerScore,points);assert.equal(g.game.arrows.length,0);
});
test('bird body remains outside collision; only hanging disk registers',()=>{
 const g=setup(),t=g.env.ArcheryBirdTargets.create();t.x=t.prevX=700;t.y=t.prevY=150;t.entry='LEFT';
 assert.equal(g.env.ArcheryCollision.sweep({prevX:670,prevY:125,x:730,y:125,state:'ACTIVE'},t),null);
 assert.ok(g.env.ArcheryCollision.sweep({prevX:700,prevY:175,x:700,y:130,state:'ACTIVE'},t));
});
test('gold stays rare, retains reward and uses the same continuous geometry',()=>{
 const g=setup(),gold=g.env.ArcheryGoldenTargets;assert.equal(gold.MAX_PER_ROUND,2);assert.equal(gold.SPECS.GOLD_FAST.radius,8);assert.equal(gold.SPECS.GOLD_FAST.basePoints,155);assert.equal(gold.CENTER_BONUS,90);
 const t=g.env.ArcheryRiverTargets.create(gold.SPECS.GOLD_FAST,{entry:'RIGHT',band:'FAR',speed:'FAST'});for(let i=0;i<80;i++)g.env.ArcheryRiverTargets.step(t);assert.equal(t.band,'FAR');assert.ok(t.x>700);
});
test('full 60-second match uses all phases, respects caps and resolves arrows at buzzer',()=>{
 const g=setup(5,'?archeryQaAuto=1');let max=0;
 for(let n=0;n<3700&&g.game.gameState!=='GAMEOVER';n++){
  g.step(1);const active=g.game.targets.filter(t=>!t.hit).length;
  assert.ok(active<=g.env.ArcheryMatchPacing.PHASES[g.game.phase].capacity);max=Math.max(max,active);
  assert.ok(g.game.targets.length<=16);assert.ok(Number.isFinite(g.game.playerScore));
 }
 assert.equal(g.game.gameState,'GAMEOVER');assert.equal(g.game.roundFrame,3600);assert.equal(g.game.pacing.phaseEntries.length,4);assert.ok(max>=8);
 assert.ok(g.game.stats.playerShots>20);assert.ok(g.game.playerScore>0);assert.ok(g.game.mestreScore>0);assert.ok(g.game.pacing.settleFrames>=24);
 assert.equal(g.game.win,g.game.playerScore>g.game.mestreScore);
});
test('character atlas, scoring rules and relative sweep maths are preserved',()=>{
 const main=fs.readFileSync(__dirname+'/script.js','utf8');assert.ok(main.includes('window.archeryCharactersV2.draw(ctx, actor.type, arcoGame, actor.x, actor.y + 15)'));
 const c=fs.readFileSync(__dirname+'/archery_collision.js','utf8');assert.ok(c.includes('vx=dx-(target.x-tx),vy=dy-(target.y-ty)'));
 assert.ok(c.includes('target.radius*target.radius'));assert.ok(!c.includes('radius+10'));
});
test('all spawners enforce the active cap, including bird and rare gold opportunities',()=>{
 const g=setup();g.game.targets.length=0;
 for(let i=0;i<20;i++)g.env.spawnArcoTarget({entry:'LEFT',kind:'NORMAL_SMALL',band:'FAR'});
 assert.equal(g.game.targets.length,6);assert.equal(g.env.spawnArcoBirdTarget(),null);assert.equal(g.env.spawnArcoGoldenEvent({variant:'ARC',entry:'LEFT'}),null);
 g.game.phase=3;for(let i=0;i<20;i++)g.env.spawnArcoTarget({entry:'RIGHT',kind:'NORMAL_MEDIUM'});assert.equal(g.game.targets.length,12);
 g.game.targets.length=0;assert.ok(g.env.spawnArcoBirdTarget());assert.ok(g.env.spawnArcoBirdTarget());assert.equal(g.env.spawnArcoBirdTarget(),null);
});
test('a missed long-distance arrow remains physical until it exits the full field',()=>{
 const g=setup();g.game.targets.length=0;g.game.playerX=800;g.env.fireArcoArrow('PLAYER',{direction:{x:0,y:-1}});
 let seenAboveField=false,steps=0;while(g.game.arrows.length&&steps++<100){const a=g.game.arrows[0];if(a.y<100)seenAboveField=true;if(a.y>=-48)assert.equal(a.state,'ACTIVE');g.env.updateArcoArrows();}
 assert.equal(seenAboveField,true);assert.equal(g.game.arrows.length,0);assert.equal(g.game.stats.playerMisses,1);assert.equal(g.game.playerScore,0);
});
test('entire matches and moving collisions remain deterministic at 30, 60 and 144 FPS',()=>{
 const rows=[];for(const fps of [30,60,144]){
  const g=setup(4,'?archeryQaAuto=1');for(let n=0;n<fps*62&&g.game.gameState!=='GAMEOVER';n++)g.env.advanceArcoSimulation(1/fps);
  assert.equal(g.game.gameState,'GAMEOVER');rows.push(JSON.stringify({player:g.game.playerScore,master:g.game.mestreScore,frame:g.game.roundFrame,shots:g.game.stats.playerShots,waves:g.game.pacing.waves}));
 }assert.equal(rows[0],rows[1]);assert.equal(rows[1],rows[2]);
});
test('wide result captures preserve aspect ratio when a 450x300 cutscene begins',()=>{
 const g=setup(),draws=[],paint={imageSmoothingEnabled:true,fillRect(){},drawImage(...args){draws.push(args);}};
 g.env.document.createElement=()=>({width:0,height:0,getContext:()=>paint});
 const result=g.env.ArcheryField.transitionFrame(g.env.canvas),d=draws[0];
 assert.equal(result.width,450);assert.equal(result.height,300);assert.equal(d[1],0);assert.equal(d[2],30);assert.equal(d[3],450);assert.equal(d[4],240);assert.equal(paint.imageSmoothingEnabled,false);
});
test('a cutscene starting during draw restores its resolution in the same frame',()=>{
 const g=setup(),main=fs.readFileSync(__dirname+'/script.js','utf8'),vm=require('node:vm');let widthAtDraw=0;
 g.env.RavokArrival={active:true,tryStart(){g.env.currentScene='RAVOK_ARRIVAL';},draw(){widthAtDraw=g.env.canvas.width;}};
 vm.runInContext(main.slice(main.indexOf('function draw() {'),main.indexOf('function gameLoop()')),g.env);g.env.draw();assert.equal(widthAtDraw,450);assert.equal(g.env.canvas.height,300);
});
