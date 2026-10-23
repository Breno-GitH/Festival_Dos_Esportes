const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.cwd()+'/docs/qa/basketball_crowd',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cases=[['idle',7],['normal-two',3],['three',3.5],['swoosh',3],['master-score',3],
 ['close-game',5],['late-score',3],['comeback',3],['rim-out',3],['steal',2],['block',2],
 ['victory-zorp',3.5],['victory-master',3.5]];
function metrics(values){
 const a=values.slice().sort((x,y)=>x-y);return{samples:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,
  median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};
}
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9281/json')).json();
 const ws=new WebSocket(pages.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map(),errors=[],http=[],failed=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);
  if(m.method==='Network.responseReceived'&&m.params.response.status>=400)http.push(m.params.response);
  if(m.method==='Network.loadingFailed'&&!m.params.canceled)failed.push(m.params);
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{const serial=++id;pending.set(serial,{resolve,reject});ws.send(JSON.stringify({id:serial,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8801/index.html?basketballQa=1'});
 for(let i=0;i<150;i++){await sleep(100);if(await ev('!!window.basketball1v1?.assets.ready'))break;}
 assert.equal(await ev('basketball1v1.assets.ready'),true);
 await ev(`(()=>{const g=basketball1v1;
  window.crowdCase=null;window.arenaSamples=[];
  const draw=g.crowd.draw;g.crowd.draw=function(ctx){const start=performance.now();const r=draw.call(this,ctx);
   if(window.crowdCase)window.crowdCase.drawTimes.push(performance.now()-start);return r;};
  const original=ctx.drawImage.bind(ctx);ctx.drawImage=function(...a){
   if(window.crowdCase&&a[0].src?.includes('arena_basketball_background')&&window.arenaSamples.length<10)
    window.arenaSamples.push(a.slice(1));return original(...a);};
  let previous=0;
  const capture=now=>{const c=window.crowdCase;
   if(c){if(previous&&now-previous<200)c.frameTimes.push(now-previous);
    const d=g.crowd.snapshot();c.frames.push({time:d.time,state:d.state,tension:d.tension,counts:d.counts,confetti:d.confetti,score:{...g.score},phase:g.phase});
    const e=d.lastReaction;
    if(e&&!c.peakImage&&d.time-e.at>.5&&d.time-e.at<1.5){
     c.peakImage=canvas.toDataURL('image/png').split(',')[1];
     c.powers={};for(const side of ['zorp','master','neutral']){const people=g.crowd.people.filter(p=>p.affiliation===side);
      c.powers[side]=people.reduce((s,p)=>s+g.crowd.poseFor(p).power,0)/people.length;}
    }
    if(!c.startImage&&c.frames.length>3)c.startImage=canvas.toDataURL('image/png').split(',')[1];
   }previous=c?now:0;requestAnimationFrame(capture);};requestAnimationFrame(capture);
 })()`);
 const results=[];
 for(const [name,seconds] of cases){
  await ev(`(()=>{const g=basketball1v1;g.reset(false);g.qaLockFrames=3600;g.random=()=>.5;
   for(const k of Object.keys(keys))keys[k]=false;g.inputBuffer.clear();
   window.arenaSamples=[];window.crowdCase={name:'${name}',frames:[],frameTimes:[],drawTimes:[],powers:null};
   if('${name}'==='normal-two'||'${name}'==='comeback'){
    g.qaScenario('physics-board-in');if('${name}'==='comeback')g.score={zorp:4,master:5};
   }else if('${name}'==='three'){
    g.player.x=205;g.master.x=115;g.setOwner(g.player,true);
   }else if('${name}'==='swoosh'||'${name}'==='late-score'){
    g.qaScenario('physics-swoosh');if('${name}'==='late-score'){g.clock=7;g.score={zorp:11,master:11};}
   }else if('${name}'==='master-score'){
    g.player.x=220;g.master.x=150;g.releaseBall(g.master,'SHOT');
    Object.assign(g.ball,{x:135.6,y:105,vx:-1.5,vy:0,target:'left',points:2,pickupLock:600});
    BasketballHoopPhysics.resetShot(g.ball);
   }else if('${name}'==='close-game'){g.clock=9;g.score={zorp:14,master:13};}
   else if('${name}'==='rim-out')g.qaScenario('physics-rim-out');
   else if('${name}'==='steal'||'${name}'==='block')g.qaScenario('${name}');
   else if('${name}'==='victory-zorp')g.qaScenario('victory');
   else if('${name}'==='victory-master')g.qaScenario('defeat');
   g.qaLockFrames=3600;
  })()`);
  if(name==='three'){
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'j',code:'KeyJ',windowsVirtualKeyCode:74});await sleep(50);
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'j',code:'KeyJ',windowsVirtualKeyCode:74});
  }
  await sleep(seconds*1000);
  const r=await ev('({case:window.crowdCase,final:basketball1v1.diagnostics(),samples:window.arenaSamples})');
  await ev('window.crowdCase=null');
  for(const [prop,suffix] of [['startImage','start'],['peakImage','reaction']])if(r.case[prop]){
   fs.writeFileSync(`${out}/${name}-${suffix}.png`,Buffer.from(r.case[prop],'base64'));delete r.case[prop];}
  fs.writeFileSync(`${out}/${name}-end.png`,Buffer.from(await ev("canvas.toDataURL('image/png').split(',')[1]"),'base64'));
  const timings=metrics(r.case.frameTimes.slice(2)),drawing=metrics(r.case.drawTimes.slice(2));
  const d=r.final,c=d.crowd;
  assert.equal(c.spectators,66);assert.equal(c.rows,3);assert.ok(r.case.frames.length>50);
  assert.ok(r.samples.length&&r.samples.every(a=>a.length===8),'arena never drawn as a full background');
  for(const a of r.samples)assert.ok(a[1]+a[3]<=941*95/300+.0001||a[1]>=941*186/300-.0001,'old crowd pixels excluded');
  const expected={'normal-two':'BASKET',three:'THREE',swoosh:'SWOOSH','master-score':'BASKET',
   'late-score':'CLUTCH',comeback:'COMEBACK','rim-out':'RIM',steal:'STEAL',block:'BLOCK',
   'victory-zorp':'VICTORY','victory-master':'VICTORY'}[name];
  if(expected)assert.ok(c.counts[expected]>=1,`${name}: ${JSON.stringify(c)}`);
  if(name==='close-game')assert.ok(c.tension>.6);
  if(['idle','close-game'].includes(name))assert.ok(1000/timings.mean>=50,'FPS target');
  if(name==='normal-two')assert.equal(d.score.zorp,2);
  if(name==='three')assert.equal(d.score.zorp,3);
  if(name==='swoosh')assert.equal(d.stats.swooshes,1);
  if(name==='master-score'){assert.equal(d.score.master,2);assert.ok(r.case.powers.master>r.case.powers.zorp);}
  if(name==='swoosh')assert.ok(r.case.powers.zorp>r.case.powers.master);
  if(name.startsWith('victory-')){
   assert.equal(d.phase,'RESULT');assert.equal(d.winner,name.endsWith('zorp')?'zorp':'master');
   assert.ok(r.case.frames.some(f=>f.confetti===28));assert.ok(c.time>3,'result crowd animation advances');
  }
  if(name==='idle')assert.equal(c.lastReaction,null);
  r.performance={fps:1000/timings.mean,frameMs:timings,crowdDrawMs:drawing};
  fs.writeFileSync(`${out}/${name}.json`,JSON.stringify(r,null,2));
  results.push({name,passed:true,score:d.score,crowd:c,sidePower:r.case.powers,performance:r.performance});
  fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify({results,errors,http,failed},null,2));
  console.log(JSON.stringify({name,passed:true,score:d.score,state:c.lastReaction?.kind||c.state,fps:r.performance.fps,crowdDrawMs:drawing.mean}));
 }
 assert.equal(errors.length,0);assert.equal(http.length,0);assert.equal(failed.length,0);
 console.log(JSON.stringify({passed:results.length,errors:errors.length,httpErrors:http.length,failedRequests:failed.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),1000);});
