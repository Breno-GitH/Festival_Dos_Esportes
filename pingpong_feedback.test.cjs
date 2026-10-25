const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){
 const calls=[],c=new Proxy({calls,save(){},restore(){}},{get(o,k){if(k in o)return o[k];return(...args)=>calls.push({op:k,args,color:o.fillStyle,alpha:o.globalAlpha});}});
 const math=Object.create(Math);math.random=()=>{throw Error('presentation consumed game RNG');};
 const env={Math:math,document:{createElement:()=>({getContext:()=>c})}};env.window=env;vm.createContext(env);for(const name of ['pingpong_pixel_font.js','pingpong_arena_art.js','pingpong_feedback.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),env);
 const g={masterAI:{fatigue:0,mode:'TRACK',struggling:false},playerScore:0,opponentScore:0,maxScore:50,gameState:'PLAYING',rallyHits:0,
  playerX:44,playerY:137,opponentX:366,opponentY:137,specialEffects:[],balls:[],multiball:{phase:'NORMAL',age:0,banner:0,total:1}};
 const b={id:1,shotId:1,tableContacts:0,state:'FLY_TO_TABLE',lastHitter:'OPPONENT',isServe:false,isSuper:false,x:200,y:160,z:24,speedX:-6,speedY:0,attackSpeed:8};g.balls.push(b);
 return {f:env.PingPongFeedback,g,b,c};
}
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}
test('observer, frame holds and effects never write into frozen match data or consume game RNG',()=>{
 const {f,g,c}=setup();g.specialEffects.push({age:0,lifetime:16});freeze(g);const s=JSON.stringify(g);
 f.observe(g,0);f.world(c,g,0);f.screen(c,g,0);f.capture(c,{width:450,height:300},0);assert.equal(f.heldFrame(c,16),true);
 f.observe(g,17);f.world(c,g,17);assert.equal(JSON.stringify(g),s);
});
test('one real table contact creates one micro impact and 1–3 particles, with no repeats over bounce frames',()=>{
 const {f,g,b}=setup();f.observe(g,0);b.tableContacts=1;b.state='TABLE_BOUNCE';b.z=0;f.observe(g,16);
 assert.equal(f.snapshot().totals.bounces,1);assert.equal(f.snapshot().contacts,1);assert.equal(f.snapshot().particles,2);assert.equal(f.ballStyle(b,16).squash,true);
 f.observe(g,32);assert.equal(f.snapshot().totals.bounces,1);assert.equal(f.snapshot().particles,2);f.observe(g,180);assert.equal(f.snapshot().contacts,0);assert.equal(f.snapshot().particles,0);
});
test('real racket return produces an 18ms rendering hold while physical coordinates can keep moving',()=>{
 const {f,g,b,c}=setup();f.observe(g,0);b.shotId++;b.lastHitter='PLAYER';f.observe(g,16);assert.equal(f.snapshot().totals.hits,1);assert.equal(f.snapshot().holdMs,18);
 f.capture(c,{width:450,height:300},16);b.x+=8;f.observe(g,25);assert.equal(f.heldFrame(c,25),true);assert.equal(b.x,208);assert.equal(f.heldFrame(c,35),false);
});
test('global return changes every participating ball style, creates one racket event and never invents a point',()=>{
 const {f,g,b,c}=setup();g.balls.push({...b,id:2,x:300});f.observe(g,0);g.specialEffects.push({age:0,lifetime:16});
 for(const ball of g.balls){ball.shotId++;ball.lastHitter='PLAYER';ball.isSuper=true;ball.direction=1;}
 f.observe(g,16);assert.equal(f.snapshot().totals.globals,1);assert.equal(f.snapshot().hits,1);assert.equal(f.snapshot().totals.points,0);assert.equal(f.snapshot().holdMs,28);
 for(const ball of g.balls)assert.equal(f.ballStyle(ball,16).globalPulse,true);
 f.screen(c,g,16);assert.equal(c.calls.filter(v=>v.op==='fillText'&&/POINT|KO|HIT/.test(v.args[0])).length,0);
 f.observe(g,32);assert.equal(f.snapshot().totals.globals,1);
});
test('rapid multiball contacts cannot extend ordinary visual holds indefinitely',()=>{
 const {f,g,b}=setup();f.observe(g,0);b.shotId++;f.observe(g,10);assert.equal(f.snapshot().totals.holds,1);
 for(let n=1;n<=8;n++){b.shotId++;f.observe(g,10+n*8);}assert.equal(f.snapshot().totals.holds,1);assert.equal(f.snapshot().holdMs,0);
 b.shotId++;f.observe(g,120);assert.equal(f.snapshot().totals.holds,2);
});
test('new multiball balls flash only when emitted; renderer does not spawn or schedule balls',()=>{
 const {f,g,b}=setup();f.observe(g,0);g.multiball.phase='PREPARING_MULTIBALL';g.multiball.age=12;f.observe(g,16);assert.equal(g.balls.length,1);assert.equal(f.snapshot().totals.emissions,0);
 g.multiball.phase='MULTIBALL_ACTIVE';g.balls.push({...b,id:2});f.observe(g,32);assert.equal(f.snapshot().totals.emissions,1);f.observe(g,48);assert.equal(f.snapshot().totals.emissions,1);assert.equal(g.balls.length,2);
});
test('POINT appears only after the real scoreboard increases, then expires without extending the game pause',()=>{
 const {f,g,b}=setup();f.observe(g,0);b.state='MISSED';f.observe(g,16);assert.equal(f.snapshot().point,null);
 g.playerScore=1;f.observe(g,32);assert.equal(f.snapshot().point,'POINT ZORP');assert.equal(f.snapshot().holdMs,0);
 f.observe(g,400);assert.equal(f.snapshot().point,'POINT ZORP');f.observe(g,463);assert.equal(f.snapshot().point,null);
 g.playerScore=0;f.observe(g,470);assert.equal(f.snapshot().totals.points,1);g.opponentScore=1;f.observe(g,480);assert.equal(f.snapshot().point,'POINT MASTER');
});
test('missed balls use a brief outward visual exit, without moving the physical stopped ball or granting points',()=>{
 const {f,g,b,c}=setup();f.observe(g,0);b.state='MISSED';b.speedX=0;b.speedY=0;f.observe(g,16);const s=JSON.stringify(b);assert.equal(f.snapshot().exits,1);
 f.world(c,g,70);assert.equal(JSON.stringify(b),s);assert.ok(c.calls.some(v=>v.op==='fillRect'&&v.color==='#acbdbb'&&v.args[0]<b.x));assert.equal(f.snapshot().totals.points,0);
 f.observe(g,150);assert.equal(f.snapshot().exits,0);
});
test('crowd has explicit 5/10/15 rally tiers and a close-score climax, with no attribute changes',()=>{
 const {f,g}=setup();for(const [rally,tier]of [[0,0],[4,0],[5,1],[9,1],[10,2],[14,2],[15,3],[30,3]]){g.rallyHits=rally;assert.equal(f.crowd(g,0).tier,tier);}
 g.playerScore=45;g.opponentScore=44;assert.equal(f.crowd(g,0).climax,true);g.opponentScore=20;assert.equal(f.crowd(g,0).climax,false);assert.equal(g.masterAI.fatigue,0);
});
test('sweat and extended follow-through require actual fatigue/struggling and recovery state',()=>{
 const {f,g,b,c}=setup();f.observe(g,0);b.shotId++;f.observe(g,16);g.masterAI.mode='RECOVER';assert.equal(f.masterAction(g,'IDLE',32),'IDLE');
 g.masterAI.fatigue=.7;assert.equal(f.masterAction(g,'IDLE',32),'HIT');assert.equal(f.masterAction(g,'MOVE_UP',32),'MOVE_UP');assert.equal(f.masterAction(g,'IDLE',300),'IDLE');
 f.world(c,g,40);assert.ok(c.calls.some(v=>v.color==='#82c5cd'));c.calls.length=0;g.masterAI.fatigue=0;f.world(c,g,40);assert.ok(!c.calls.some(v=>v.color==='#82c5cd'));
});
test('effects and observation records remain bounded under sustained ten-ball stress',()=>{
 const {f,g,b}=setup();g.balls=Array.from({length:10},(_,i)=>({...b,id:i+1}));f.observe(g,0);
 for(let n=1;n<100;n++){
  for(const ball of g.balls){ball.tableContacts++;}f.observe(g,n*2);
  for(const ball of g.balls){ball.shotId++;ball.tableContacts=0;}f.observe(g,n*2+1);
  const s=f.snapshot();assert.ok(s.particles<=48&&s.contacts<=24&&s.hits<=12&&s.exits<=10&&s.records<=10);
 }
});
test('new match/briefing clears old point labels, holds and observation records',()=>{
 const {f,g,b,c}=setup();f.observe(g,0);b.shotId++;f.observe(g,16);f.capture(c,{},16);g.masterAI={fatigue:0};g.gameState='PRE_GAME';g.balls=[];f.observe(g,20);
 const s=f.snapshot();assert.equal(s.records,0);assert.equal(s.holdMs,0);assert.equal(s.point,null);assert.equal(f.heldFrame(c,21),false);
});
for(const fps of [30,60,144])test(`feedback expires by elapsed milliseconds at ${fps} FPS; bounce is not repeated`,()=>{
 const {f,g,b}=setup();f.observe(g,0);b.tableContacts=1;b.state='TABLE_BOUNCE';g.playerScore=1;f.observe(g,1);
 for(let t=1+1000/fps;t<470;t+=1000/fps)f.observe(g,t);
 assert.equal(f.snapshot().totals.bounces,1);assert.equal(f.snapshot().totals.points,1);assert.equal(f.snapshot().point,null);assert.equal(f.snapshot().particles,0);
});
