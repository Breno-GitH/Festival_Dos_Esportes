const test=require('node:test'),assert=require('node:assert/strict');
const {setup,freeze}=require('./pingpong_test_harness.cjs');
test('drawing a frozen playing match does not mutate physics, scoring, AI or special state, or consume game RNG',()=>{
 const g=setup();g.a.game.gameState='PLAYING';g.a.spawn();g.a.game.playerScore=17;g.a.game.opponentScore=15;
 g.a.game.rallyHits=16;g.a.game.power=100;g.a.game.specialEffects.push({age:3,lifetime:16});g.a.game.bounceEffects.push({x:280,y:170,radius:5,alpha:.6});
 const before=JSON.stringify(g.a.game),rng=g.randoms();freeze(g.a.game);g.a.draw();g.tick();g.a.draw();
 assert.equal(JSON.stringify(g.a.game),before);assert.equal(g.randoms(),rng);assert.equal(g.c.depth,0);assert.equal(g.p.snapshot().backgroundBuilds,1);
});
test('the arena background is cached, and rendering owns no new collision or physics objects',()=>{
 const g=setup();for(let i=0;i<120;i++)g.p.drawArena(g.c,g.a.court,i*16.67);
 assert.equal(g.layers.length,2);assert.equal(g.env.PingPongCrowd.snapshot().atlasBuilds,1);assert.equal(g.p.snapshot().backgroundBuilds,1);assert.equal(g.p.snapshot().audience,60);
 assert.equal(g.a.court.table.left,90);assert.equal(g.a.court.table.right,360);assert.equal(g.a.court.net.collisionEnabled,false);
 assert.ok(!g.c.calls.some(v=>/Gradient|filter|shadowBlur/.test(v.method)));
});
test('surface, targets, net, players and ball use one uniform view; the full table and both players remain in frame',()=>{
 const g=setup(),c=g.a.court,l=g.p.project(c.table.left,c.table.back),r=g.p.project(c.table.right,c.table.front);
 assert.ok(Math.abs((r.x-l.x)-297)<.001);assert.ok(l.y>70&&r.y<250);assert.ok(l.x>70&&r.x<380);
 for(const x of [c.player.minX,c.player.maxX,c.opponent.homeX])for(const y of [c.table.back-20,c.table.front-20]){
  for(const role of ['PLAYER','OPPONENT']){
   const d=g.p.spriteLayout(role,'IDLE',x,y),a=g.p.project(d.x,d.y),b=g.p.project(d.x+d.w,d.y+d.h);
   assert.ok(a.x>=0&&b.x<=450);assert.ok(a.y>40&&b.y<280);
  }
 }
 g.a.game.gameState='PLAYING';g.a.draw();const scales=g.c.calls.filter(v=>v.method==='scale');assert.ok(scales.length>=1);
 for(const s of scales)assert.equal(s.args[0],s.args[1]);
});
test('all eight sprite poses preserve source ratio, fixed scale and a stable foot anchor',()=>{
 const g=setup(),dims={PLAYER:{IDLE:[62,71],MOVE_UP:[51,74],MOVE_DOWN:[57,72],HIT:[70,74]},OPPONENT:{IDLE:[64,70],MOVE_UP:[53,68],MOVE_DOWN:[54,68],HIT:[77,73]}};
 for(const role of ['PLAYER','OPPONENT'])for(const action of Object.keys(dims[role])){
  const d=g.p.spriteLayout(role,action,44,130),[sx,sy,sw,sh]=d.source,[w,h]=dims[role][action];
  assert.ok(sx>=0&&sy>=0&&sx+sw<=w&&sy+sh<=h);assert.equal(d.scale,.66);
  assert.ok(Math.abs(d.w/sw-d.h/sh)<1e-12);assert.ok(Math.abs(d.y+d.h-d.footY)<=.5);
  g.p.drawFighter(g.c,{complete:true,naturalWidth:w},role,action,44,130);
  assert.equal(g.c.calls.at(-1).smoothing,false);
 }
});
test('missing or unloaded sprites do not create an invalid drawImage call',()=>{
 const g=setup();g.p.drawFighter(g.c,{complete:true,naturalWidth:0},'PLAYER','IDLE',44,130);
 assert.equal(g.c.calls.filter(v=>v.method==='drawImage').length,0);
});
test('ball altitude changes only the displayed ball/shadow relationship; bounce keeps a circular readable ball',()=>{
 const g=setup(),ball={x:280,y:160,z:32,radius:4,state:'FLY_TO_TABLE',trail:[],attackSpeed:8};
 const before=JSON.stringify(ball);g.p.drawBallShadow(g.c,ball,g.a.court);g.p.drawBall(g.c,ball);assert.equal(JSON.stringify(ball),before);
 assert.ok(g.c.calls.some(v=>v.method==='fillRect'&&v.args[1]<132));
 g.c.calls.length=0;ball.z=0;ball.state='TABLE_BOUNCE';g.p.drawBall(g.c,ball);
 const pixels=g.c.calls.filter(v=>v.method==='fillRect');const ys=pixels.map(v=>v.args[1]);assert.ok(Math.max(...ys)-Math.min(...ys)>=8);
});
test('18,000 simulation steps with and without drawing produce identical physical states and RNG use, including both specials',()=>{
 const plain=setup(),drawn=setup();for(const g of [plain,drawn]){g.c.record=false;g.a.game.gameState='PLAYING';g.a.spawn();}
 let multiballs=0,globals=0,bounces=0,fast=0;const states=new Set();
 for(let frame=0;frame<18000;frame++){
  for(const g of [plain,drawn]){
   const a=g.a.game;const b=a.balls.find(b=>b.receiver==='PLAYER'&&b.state!=='MISSED');
   const aim=b?b.receive.y-24:137;g.env.keys.w=aim<a.playerY-3;g.env.keys.s=aim>a.playerY+3;
   g.env.keys.d=frame%400<200;g.env.keys.a=!g.env.keys.d;
   if(frame%360===0)g.env.PingPongMultiball.start(a.multiball,a,frame%720===0?10:6);
   g.env.keys.space=a.power>=a.maxPower;
   if(a.gameState==='GAMEOVER'){a.gameState='PLAYING';a.playerScore=0;a.opponentScore=0;}
   g.a.update();g.tick();
  }
  drawn.a.draw();
  assert.equal(JSON.stringify(drawn.a.game),JSON.stringify(plain.a.game),'physical divergence at '+frame);assert.equal(drawn.randoms(),plain.randoms());
  const a=drawn.a.game;if(a.multiball.phase==='MULTIBALL_ACTIVE')multiballs++;
  globals+=a.specialEffects.length>0?1:0;
  for(const b of a.balls){states.add(b.state);bounces+=b.bounceCount===1?1:0;fast+=b.attackSpeed>=6.3?1:0;}
 }
 assert.ok(multiballs>0&&globals>0&&bounces>0&&fast>0);assert.ok(states.has('ATTACK_RECEIVER')&&states.has('TABLE_BOUNCE'));
 assert.equal(drawn.p.snapshot().backgroundBuilds,1);
});
