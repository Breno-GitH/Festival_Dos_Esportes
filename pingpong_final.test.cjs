const test=require('node:test'),assert=require('node:assert/strict');
const {setup,context,freeze}=require('./pingpong_test_harness.cjs');
const {Controller}=require('./pre_game_brief.js');

test('crowd contains 36 humans and 24 aliens with fixed, varied identities and no other species',()=>{
 const g=setup(),p=g.env.PingPongCrowd.people,s=g.env.PingPongCrowd.snapshot();
 assert.equal(s.count,60);assert.equal(s.humans,36);assert.equal(s.aliens,24);assert.ok(Object.isFrozen(p));assert.ok(p.every(Object.isFrozen));
 const h=p.filter(x=>x.species==='HUMAN'),a=p.filter(x=>x.species==='ALIEN');
 for(const key of ['skin','hair','hairStyle','accessory','outfit'])assert.ok(new Set(h.map(x=>x[key])).size>=3,key);
 for(const key of ['skin','headShape','eyes','outfit'])assert.ok(new Set(a.map(x=>x[key])).size>=3,key);
 assert.equal(new Set(a.map(x=>x.antennae)).size,2);
 assert.ok(p.every(x=>x.species==='HUMAN'||x.species==='ALIEN'));
});
test('six poses are baked once; 600 frames preserve identities and consume no game RNG',()=>{
 const g=setup(),crowd=g.env.PingPongCrowd,signature=crowd.snapshot().signature,rng=g.randoms();g.c.record=false;
 for(let i=0;i<600;i++)crowd.draw(g.c,i*16.67,{tier:i%4,eventStrength:.8,side:'zorp'});
 assert.equal(crowd.snapshot().atlasBuilds,1);assert.equal(crowd.snapshot().signature,signature);assert.equal(g.randoms(),rng);assert.equal(g.layers.length,1);
});
test('audience poses are asynchronous and galleries remain outside table and player travel',()=>{
 const g=setup(),crowd=g.env.PingPongCrowd;
 assert.ok(new Set(crowd.people.map(p=>crowd.poseAt(p,2000,{}))).size>=3);
 for(const p of crowd.people){assert.ok(p.x-8>=0&&p.x+8<=450);assert.ok(p.footY<=78||p.footY>=298);assert.ok(crowd.poseAt(p,1000,{victory:true,side:'zorp'})<6);}
});
test('bitmap lettering uses integer rectangles, supports Portuguese normalization and needs no font rendering',()=>{
 const g=setup(),font=g.env.PingPongPixelFont,c=context();font.draw(c,'Vitória! [Espaço]',225.4,10.2,{align:'center',scale:1});
 assert.equal(font.normalize('Vitória! [Espaço]'),'VITORIA! [ESPACO]');assert.ok(c.calls.length>0);assert.ok(!c.calls.some(x=>x.method==='fillText'));
 for(const call of c.calls)if(call.method==='fillRect')assert.ok(call.args.every(Number.isInteger));
 assert.ok(font.measure('MATCH POINT')<=92);assert.ok(font.measure('MESTRE DO PING-PONG')<220);
});
test('board uses real scores; match point is exactly one point from the current win target',()=>{
 const g=setup(),art=g.env.PingPongArenaArt,a=g.a.game;a.gameState='PLAYING';
 for(const [p,m,expected]of [[0,0,false],[48,48,false],[49,20,true],[20,49,true],[49,49,true]]){a.playerScore=p;a.opponentScore=m;assert.equal(art.matchPoint(a),expected);}
 a.gameState='GAMEOVER';assert.equal(art.matchPoint(a),false);const old=JSON.stringify(a);freeze(a);art.hud(g.c,a,1000);assert.equal(JSON.stringify(a),old);
});
test('all live arena text is bitmap based, leaving the table free of permanent labels',()=>{
 const g=setup();g.a.game.gameState='PLAYING';g.a.game.power=100;g.a.spawn();g.a.draw();
 assert.ok(!g.c.calls.some(c=>c.method==='fillText'));assert.equal(g.c.depth,0);assert.equal(g.a.game.balls.length,1);
});
test('optional sport intro reuses the existing countdown and does not start physics early',()=>{
 const calls=[],b=new Controller(()=>0);let started=0;
 b.open({title:'PING-PONG',objective:'50 pontos',controls:[]},{countdown:true,onStart:()=>started++,drawCountdown:(c,screen,t)=>calls.push(t)});
 b.update(.18);b.handleKeyDown({key:' ',preventDefault(){}});b.handleKeyUp({key:' ',preventDefault(){}});b.update(.12);
 assert.equal(b.state,'COUNTDOWN');b.draw({});assert.equal(calls[0],0);b.update(.5);b.draw({});assert.equal(started,0);assert.equal(calls[1],.5);
 b.update(1.13);assert.equal(started,1);assert.equal(b.state,'CLOSED');
});
test('establishing shot stays clear, then names and START render in the short countdown window',()=>{
 const g=setup(),c=context(),art=g.env.PingPongArenaArt;art.intro(c,.2);assert.equal(c.calls.length,0);
 art.intro(c,.7);assert.ok(c.calls.length>0);c.calls.length=0;art.intro(c,1.4);assert.ok(c.calls.some(v=>v.method==='fillRect'&&v.args[2]===3&&v.args[3]===3));
});
test('victory is decided at 50, but medal waits for celebration and held Space cannot dismiss it',()=>{
 const g=setup(),a=g.a.game;a.gameState='PLAYING';g.a.spawn();a.playerScore=50;g.a.finish();assert.equal(a.gameState,'GAMEOVER');assert.equal(a.win,true);assert.equal(g.env.insignias.pingpong,false);
 const balls=JSON.stringify(a.balls),coords=[a.playerX,a.playerY,a.opponentX,a.opponentY];g.env.keys.space=true;
 for(let i=0;i<89;i++)g.a.update();assert.equal(g.env.insignias.pingpong,false);assert.equal(a.resultTicks,89);
 g.a.update();assert.equal(g.env.insignias.pingpong,true);assert.equal(a.medalAwarded,true);assert.equal(g.env.currentScene,'JOGO_PINGPONG');
 assert.equal(JSON.stringify(a.balls),balls);assert.deepEqual([a.playerX,a.playerY,a.opponentX,a.opponentY],coords);
 g.a.finish();assert.equal(a.resultTicks,90);g.env.keys.space=false;g.a.update();g.env.keys.space=true;g.a.update();assert.equal(g.env.currentScene,'ILHA_PINGPONG');
});
test('defeat never grants a medal and match resources stay stopped during its presentation',()=>{
 const g=setup(),a=g.a.game;a.gameState='PLAYING';a.opponentScore=50;g.a.finish();const tick=a.masterAI.tick;
 for(let i=0;i<180;i++)g.a.update();assert.equal(a.win,false);assert.equal(g.env.insignias.pingpong,false);assert.equal(a.masterAI.tick,tick);assert.equal(a.opponentScore,50);
});
test('fresh match clears result presentation and passes the intro callback only to ping-pong',()=>{
 const g=setup(),a=g.a.game;g.env.PreGameBriefConfigs={pingpong:{id:'pingpong'}};g.env.showPreGameBrief=(config,options)=>{g.env.briefOptions=options;};
 a.resultTicks=200;a.medalAwarded=true;a.resultInputArmed=true;g.a.reset(true);
 assert.equal(a.resultTicks,0);assert.equal(a.medalAwarded,false);assert.equal(a.resultInputArmed,false);assert.equal(a.gameState,'PRE_GAME');assert.equal(a.balls.length,0);assert.equal(typeof g.env.briefOptions.drawCountdown,'function');
});
test('match-point and comeback reactions follow actual score changes and do not repeat each frame',()=>{
 const g=setup(),a=g.a.game,f=g.env.PingPongFeedback;a.gameState='PLAYING';a.playerScore=47;a.opponentScore=48;f.observe(a,0);
 a.playerScore=48;f.observe(a,10);a.playerScore=49;f.observe(a,20);assert.equal(f.snapshot().reactions.COMEBACK,1);assert.equal(f.snapshot().reactions.MATCH_POINT,1);assert.equal(f.snapshot().event,'MATCH_POINT');
 f.observe(a,30);assert.equal(f.snapshot().reactions.MATCH_POINT,1);a.playerScore=50;a.gameState='GAMEOVER';a.win=true;f.observe(a,40);
 assert.equal(f.snapshot().event,'VICTORY');assert.equal(f.crowd(a,40).side,'zorp');assert.equal(f.crowd(a,40).victory,true);
});
test('ordinary fast contacts do not shake; only extreme contact, global return or final point can',()=>{
 const g=setup(),a=g.a.game,f=g.env.PingPongFeedback;a.gameState='PLAYING';const b=g.a.spawn();b.isServe=false;b.attackSpeed=8;f.observe(a,0);b.shotId++;f.observe(a,16);assert.equal(f.shake(16).x,0);
 b.attackSpeed=8.8;b.shotId++;f.observe(a,150);assert.notEqual(f.shake(150).x,0);f.observe(a,300);assert.equal(f.shake(300).x,0);
});
test('difficult-defense reaction requires a real returned shot at high speed and an edge contact',()=>{
 const g=setup(),a=g.a.game,f=g.env.PingPongFeedback;a.gameState='PLAYING';const b=g.a.spawn();b.isServe=false;b.speedX=-8;b.speedY=0;f.observe(a,0);
 b.shotId++;b.lastHitter='PLAYER';b.origin.y=a.playerY+24;f.observe(a,16);assert.equal(f.snapshot().reactions.DEFENSE,undefined);
 b.shotId++;b.origin.y=a.playerY+50;f.observe(a,160);assert.equal(f.snapshot().reactions.DEFENSE,1);assert.equal(f.crowd(a,160).side,'zorp');
});
