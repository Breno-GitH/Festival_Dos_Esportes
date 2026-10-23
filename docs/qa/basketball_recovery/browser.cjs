// Initial-condition fixtures, real Chrome RAF loop and genuine keyboard input.
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.cwd()+'/docs/qa/basketball_recovery',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const scenarios=[
 ['upper-left',45,60,-4,-4,5],['upper-right',405,60,4,-4,5],
 ['lower-left',32,225,-4,4,4],['lower-right',418,225,4,4,4],
 ['behind-left',33,202,-1,0,4],['behind-right',417,202,1,0,4],
 ['board-side-left',90,160,-2.5,0,4],['board-side-right',356,160,2.5,0,4],
 ['board-cap-left',69.6,140.3,0,0,6],['board-cap-right',376.4,140.3,0,0,6],
 ['fallback-fault',69.6,140.3,0,0,5.5],['reachable-floor',55,250.2,0,0,3],
 ['keyboard-left',55,250.2,0,0,2],['keyboard-right',395,250.2,0,0,2],
 ['master-pickup',395,250.2,0,0,3],['master-jump',300,170,0,0,2]];
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9280/json')).json();
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map(),errors=[],http=[],failed=[],urls=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);
  if(m.method==='Network.requestWillBeSent')urls.set(m.params.requestId,m.params.request.url);
  if(m.method==='Network.responseReceived'&&m.params.response.status>=400)http.push(m.params.response);
  if(m.method==='Network.loadingFailed'&&!m.params.canceled)failed.push({...m.params,url:urls.get(m.params.requestId)});
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{const serial=++id;pending.set(serial,{resolve,reject});ws.send(JSON.stringify({id:serial,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const key=(type,key,code,vk)=>send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:vk});
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8800/index.html?basketballQa=1'});
 for(let i=0;i<150;i++){await sleep(100);if(await ev('!!window.basketball1v1?.assets.ready'))break;}
 assert.equal(await ev('basketball1v1.assets.ready'),true);
 await ev(`(()=>{window.recoveryCase=null;
 const capture=()=>{const c=window.recoveryCase,g=basketball1v1;
  if(c){const d=g.diagnostics(),stage=d.recovery.stage;
   c.frames.push({clock:d.clock,score:d.score,ball:d.ball,recovery:d.recovery,player:d.player,master:d.master});
   if(!c.stages.includes(stage))c.stages.push(stage);
   if(d.ball.owner&&!c.owners.includes(d.ball.owner))c.owners.push(d.ball.owner);
   if(d.recovery.lastAction==='NEUTRAL_RESET'&&!c.resetSnapshot)c.resetSnapshot=d;
   if(d.recovery.nudges&&!c.nudgeSnapshot)c.nudgeSnapshot=d;
   if(stage==='BLINK'&&!c.blinkImage)c.blinkImage=canvas.toDataURL('image/png').split(',')[1];
  }requestAnimationFrame(capture)};requestAnimationFrame(capture)})()`);
 const results=[],filter=process.env.BASKET_QA_FILTER;
 for(const [name,x,y,vx,vy,seconds] of scenarios.filter(s=>!filter||s[0].includes(filter))) {
  await ev(`(()=>{const g=basketball1v1;g.reset(false);g.score={zorp:11,master:7};g.clock=60;
   g.player.x=150;g.master.x=300;g.player.special=63;g.master.special=28;g.qaLockFrames=1200;
   for(const k of Object.keys(keys))keys[k]=false;g.inputBuffer.clear();g.releaseBall(g.player,'FREE');
   Object.assign(g.ball,{x:${x},y:${y},vx:${vx},vy:${vy},shooter:null,state:'FREE',pickupLock:1200});
   BasketballHoopPhysics.resetShot(g.ball);
   if('${name}'==='fallback-fault')g.ballRecovery=BasketballCourtPhysics.createRecovery({nudgeX:0,nudgeY:0});
   if('${name}'.startsWith('keyboard-')){g.player.x='${name}'==='keyboard-left'?150:300;g.master.x=225;g.ball.pickupLock=0;}
   if('${name}'==='master-pickup'){g.ball.pickupLock=0;g.qaLockFrames=0;}
   if('${name}'==='master-jump'){g.ball.pickupLock=0;g.qaLockFrames=0;g.master.decisionTimer=0;}
   window.recoveryCase={name:'${name}',frames:[],stages:[],owners:[],resetSnapshot:null,nudgeSnapshot:null};})()`);
  await sleep(50);
  fs.writeFileSync(`${out}/${name}-start.png`,Buffer.from(await ev("canvas.toDataURL('image/png').split(',')[1]"),'base64'));
  if(name.startsWith('keyboard-')){const left=name.endsWith('left');
   await key('keyDown',left?'a':'d',left?'KeyA':'KeyD',left?65:68);await sleep(seconds*1000);
   await key('keyUp',left?'a':'d',left?'KeyA':'KeyD',left?65:68);
  }else await sleep(seconds*1000);
  const result=await ev('({case:window.recoveryCase,final:basketball1v1.diagnostics(),reachable:BasketballCourtPhysics.reachable(basketball1v1.ball,basketball1v1.court)})');
  await ev('window.recoveryCase=null');
  fs.writeFileSync(`${out}/${name}-end.png`,Buffer.from(await ev("canvas.toDataURL('image/png').split(',')[1]"),'base64'));
  if(result.case.blinkImage){fs.writeFileSync(`${out}/${name}-blink.png`,Buffer.from(result.case.blinkImage,'base64'));delete result.case.blinkImage;}
  fs.writeFileSync(`${out}/${name}.json`,JSON.stringify(result,null,2));
  const d=result.final;
  assert.ok(result.case.frames.length>20,name+' loop');assert.ok(d.clock<59&&d.clock>60-seconds-2,name+' clock continues');
  if(!name.startsWith('master-'))assert.deepEqual(d.score,{zorp:11,master:7},name+' score');
  assert.equal(d.stats.nonFinitePhysics,0,name+' finite');
  if(name==='fallback-fault'){
   assert.equal(d.recovery.neutralResets,1);assert.ok(result.case.stages.includes('BLINK'));
   assert.equal(result.case.resetSnapshot.ball.owner,null);assert.equal(result.case.resetSnapshot.ball.x,225);
   assert.deepEqual([d.player.special,d.master.special],[63,28]);
  }else if(name.startsWith('board-cap')){
   assert.equal(d.recovery.nudges,1);assert.equal(d.recovery.neutralResets,0);assert.ok(result.reachable);
  }else if(name.startsWith('keyboard-'))assert.ok(result.case.owners.includes('zorp'),name+' keyboard pickup');
  else if(name.startsWith('master-')){
   assert.ok(result.case.owners.includes('master'),name+' AI pickup');
   if(name==='master-jump')assert.ok(result.case.frames.some(f=>f.master.z>0));
  }else{assert.ok(result.reachable,name+' reachable');assert.equal(d.recovery.neutralResets,0);assert.equal(d.recovery.nudges,0);}
  results.push({name,passed:true,frames:result.case.frames.length,score:d.score,clock:d.clock,ball:d.ball,recovery:d.recovery,stages:result.case.stages,owners:result.case.owners,reachable:result.reachable});
  fs.writeFileSync(`${out}/browser-results${filter?'-'+filter:''}.json`,JSON.stringify({results,errors,http,failed},null,2));
  console.log(JSON.stringify(results.at(-1)));
 }
 await ev('basketball1v1.reset(false);basketball1v1.qaLockFrames=600;window.BASKET_COLLISION_DEBUG=true');
 await sleep(60);fs.writeFileSync(`${out}/court-debug.png`,Buffer.from(await ev("canvas.toDataURL('image/png').split(',')[1]"),'base64'));
 await ev('window.BASKET_COLLISION_DEBUG=false');
 assert.equal(errors.length,0,'runtime/console errors');assert.equal(http.length,0,'HTTP errors');assert.equal(failed.length,0,'failed requests');
 console.log(JSON.stringify({passed:results.length,errors:errors.length,httpErrors:http.length,failed:failed.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),1000);});
