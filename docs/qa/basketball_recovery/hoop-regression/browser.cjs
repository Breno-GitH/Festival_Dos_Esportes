const fs=require('node:fs');const assert=require('node:assert/strict');
const out='C:/xampp/htdocs/2025/Festival_Dos_Esportes/docs/qa/basketball_recovery/hoop-regression';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9280/json')).json();
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map(),errors=[],http=[],failed=[],requests=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);
  if(m.id){const cb=pending.get(m.id);pending.delete(m.id);m.error?cb.reject(m.error):cb.resolve(m.result);}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);
  if(m.method==='Network.requestWillBeSent')requests.set(m.params.requestId,m.params.request.url);
  if(m.method==='Network.responseReceived'&&m.params.response.status>=400)http.push(m.params.response);
  if(m.method==='Network.loadingFailed'&&!m.params.canceled)failed.push({...m.params,url:requests.get(m.params.requestId)});
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{const serial=++id;pending.set(serial,{resolve,reject});ws.send(JSON.stringify({id:serial,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const key=async (name,code,vk)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code,windowsVirtualKeyCode:vk});await sleep(50);await send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code,windowsVirtualKeyCode:vk});};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8800/index.html?basketballQa=1'});
 for(let i=0;i<150;i++){await sleep(100);if(await ev('!!window.basketball1v1?.assets.ready'))break;}
 const initial=await ev('({ready:basketball1v1.assets.ready,failures:basketball1v1.assets.failed,debug:window.BASKET_COLLISION_DEBUG,hoops:basketball1v1.hoops})');
 if(!initial.ready)throw Error('Assets not ready');
 await key(' ','Space',32);
 await ev(`(()=>{
 const g=basketball1v1,original=g.playBallSound;
 g.playBallSound=function(kind){if(window.basketCase)window.basketCase.sounds.push(kind);return original.call(this,kind)};
 window.basketCase=null;
 const capture=()=>{const c=window.basketCase;
 if(c){const d=g.diagnostics();c.frames.push({ball:d.ball,score:d.score,rimHits:d.stats.rimHits,boardHits:d.stats.backboardHits});
 if(!c.scoreSnapshot&&d.ball.basketScored)c.scoreSnapshot=d;
 if(!c.hitImage&&(d.stats.rimHits||d.stats.backboardHits)){c.hitImage=canvas.toDataURL('image/png').split(',')[1]}
 if(!c.scoreImage&&d.ball.basketScored)c.scoreImage=canvas.toDataURL('image/png').split(',')[1];}
 requestAnimationFrame(capture)};requestAnimationFrame(capture);
 })()`);
 const scenarios=['physics-swoosh','physics-rim-in','physics-board-in','physics-rim-out',
  'physics-outside','physics-under','physics-net','physics-lateral','physics-repeated','keyboard-two','keyboard-three','dunk',
  'master-swoosh','master-board-in'];
 const results=[];
 for(const name of scenarios){
  await ev(`(()=>{const g=basketball1v1;g.reset(false);for(const k of Object.keys(keys))keys[k]=false;
  g.inputBuffer.clear();g.random=()=>.5;
  window.basketCase={name:'${name}',frames:[],sounds:[],scoreSnapshot:null,hitImage:null,scoreImage:null};
  if('${name}'.startsWith('keyboard-')){g.player.x='${name}'==='keyboard-two'?250:205;g.master.x=115;
  g.setOwner(g.player,true);g.qaLockFrames=600;}
  else if('${name}'.startsWith('master-')){const h=g.hoops.left;g.player.x=220;g.master.x=150;
   g.releaseBall(g.master,'SHOT');const bank='${name}'==='master-board-in';
   Object.assign(g.ball,{x:h.rimX+(bank?40:0),y:bank?105:145,vx:bank?-1.5:0,vy:bank?0:1,target:'left',points:bank?2:3,pickupLock:600});
   BasketballHoopPhysics.resetShot(g.ball);g.qaLockFrames=600;g.stats.shots++;
  }else g.qaScenario('${name}');})()`);
  if(name.startsWith('keyboard-'))await key('j','KeyJ',74);
  await sleep(name==='physics-under'?3600:3000);
  const result=await ev('({case:window.basketCase,final:basketball1v1.diagnostics(),audio:basketball1v1.audio?.state})');
  await ev('window.basketCase=null');
  if(result.case.hitImage)fs.writeFileSync(`${out}/${name}-contact.png`,Buffer.from(result.case.hitImage,'base64'));
  if(result.case.scoreImage)fs.writeFileSync(`${out}/${name}-score.png`,Buffer.from(result.case.scoreImage,'base64'));
  delete result.case.hitImage;delete result.case.scoreImage;
  fs.writeFileSync(`${out}/${name}.json`,JSON.stringify(result,null,2));
  results.push({name,score:result.final.score,baskets:result.final.stats.baskets,
   rimHits:result.final.stats.rimHits,boardHits:result.final.stats.backboardHits,
   sounds:[...new Set(result.case.sounds)],flagsAtScore:result.case.scoreSnapshot?.ball||null,
   underSeen:result.case.frames.some(f=>f.ball.enteredRimFromBelow),audio:result.audio});
  const misses=['physics-rim-out','physics-outside','physics-under','physics-net','physics-lateral'];
  const expected=misses.includes(name)?0:['keyboard-three','master-swoosh'].includes(name)?3:2;
  const owner=name.startsWith('master-')?'master':'zorp';
  assert.equal(result.final.score[owner],expected,name);
  assert.equal(result.final.score[owner==='master'?'zorp':'master'],0,name);
  assert.equal(result.final.stats.baskets.length,expected?1:0,name+' duplicate');
  if(expected){assert.equal(result.case.scoreSnapshot.ball.basketScored,true);assert.ok(result.case.scoreSnapshot.ball.scoreCrossing.vy>0);}
  console.log(JSON.stringify(results.at(-1)));
 }
 await ev("basketball1v1.reset(false);window.BASKET_COLLISION_DEBUG=true;basketball1v1.qaScenario('physics-swoosh')");
 await sleep(50);
 const image=await ev("canvas.toDataURL('image/png').split(',')[1]");
 fs.writeFileSync(`${out}/hoops-debug.png`,Buffer.from(image,'base64'));
 await ev('window.BASKET_COLLISION_DEBUG=false');
 const final={initial,results,errors,http,failed};
 fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(final,null,2));
 assert.equal(errors.length,0);assert.equal(http.length,0);assert.equal(failed.length,0);
 console.log(JSON.stringify({tests:results.length,errors:errors.length,http:http.length,failed:failed.length}));
 ws.close();
})().catch(e=>{console.error(e);process.exit(1)});

