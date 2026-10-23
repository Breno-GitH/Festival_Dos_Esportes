// Full real-time game driven exclusively by browser keyboard after a fresh
// normal match reset. No clock acceleration, score injection or player warps.
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.cwd()+'/docs/qa/basketball_crowd_polish',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const metrics=v=>{const a=v.slice().sort((x,y)=>x-y);return{samples:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9282/json')).json();const ws=new WebSocket(pages.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],http=[],failed=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);
  if(m.method==='Network.responseReceived'&&m.params.response.status>=400)http.push(m.params.response);
  if(m.method==='Network.loadingFailed'&&!m.params.canceled)failed.push(m.params);
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Runtime.enable');await send('Network.enable');await send('Page.enable');
 await send('Page.navigate',{url:'http://127.0.0.1:8802/index.html?basketballQa=1'});
 for(let i=0;i<150;i++){await sleep(100);if(await ev('!!window.basketball1v1?.assets.ready'))break;}
 assert.equal(await ev('basketball1v1.assets.ready'),true);
 await ev(`(()=>{const g=basketball1v1;g.reset(true);g.qaLockFrames=0;g.random=Math.random;
  for(const k of Object.keys(keys))keys[k]=false;g.inputBuffer.clear();
  window.fullAudit={frames:[],crowdMs:[],boardMs:[],badValues:0,badHud:[],badSources:0,warning:new Set(),events:new Set(),trace:[]};
  window.savedPeople=g.crowd.people.slice();window.savedGeometry=g.crowd.standGeometry;
  window.savedAppearance=JSON.stringify(g.crowd.people.map(({motion,...p})=>p));
  const f=ctx.fillText.bind(ctx);ctx.fillText=function(t,x,y,...a){
   if(g.phase==='PLAYING'&&y<=34&&(/^(ZORP )?\\d+( MESTRE)?$/.test(String(t))||/^OT \\d+$/.test(String(t))))window.fullAudit.badHud.push(String(t));
   return f(t,x,y,...a);};
  const img=ctx.drawImage.bind(ctx);ctx.drawImage=function(...a){
   if(a[0].src?.includes('arena_basketball_background')){
    const [im,sx,sy,sw,sh]=a;
    const noCrowd=a.length===9&&(sy+sh<=941*95/300+.0001||sy>=941*186/300-.0001);
    const noPanel=a.length===9&&(sx+sw<=1672*.3+.0001||sx>=1672*.7-.0001||sy>=941*78/300-.0001);
    if(!noCrowd||!noPanel)window.fullAudit.badSources++;
   }return img(...a);};
  for(const [obj,key,label] of [[g.crowd,'draw','CROWD'],[g.scoreboard,'draw','PANEL'],[g,'drawHoop','HOOP'],[g,'drawActor','ACTOR'],[g,'drawBall','BALL']]){
   const fn=obj[key];obj[key]=function(...args){
    const t=performance.now(),r=fn.apply(this,args),audit=window.fullAudit;
    if(g.phase==='PLAYING'&&audit.trace.length<7)audit.trace.push(label);
    if(label==='CROWD')audit.crowdMs.push(performance.now()-t);
    if(label==='PANEL')audit.boardMs.push(performance.now()-t);return r;
   };
  }
  let previous=0;const capture=now=>{
   const a=window.fullAudit,b=g.scoreboard.snapshot(g);
   if(previous&&now-previous<200)a.frames.push(now-previous);previous=now;
   if(b.zorp!==g.score.zorp||b.master!==g.score.master||b.timeText!==String(Math.max(0,Math.ceil(g.clock))).padStart(2,'0'))a.badValues++;
   a.warning.add(b.warning);if(g.crowd.lastReaction)a.events.add(g.crowd.lastReaction.kind);
   requestAnimationFrame(capture);
  };requestAnimationFrame(capture);
 })()`);
 const key=async(type,key,code,vk)=>send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:vk});
 const tap=async(k,code,vk)=>{await key('keyDown',k,code,vk);await sleep(24);await key('keyUp',k,code,vk);};
 await tap(' ','Space',32);const start=Date.now(),records=[],screens=new Set();let held='',lastJ=0,lastK=0,lastW=0,lastLog=-1;
 const movement=async next=>{if(next===held)return;
  if(held)await key('keyUp',held,held==='a'?'KeyA':'KeyD',held==='a'?65:68);
  held=next;if(held)await key('keyDown',held,held==='a'?'KeyA':'KeyD',held==='a'?65:68);
 };
 let final;
 while(Date.now()-start<110000){
  const d=await ev('basketball1v1.diagnostics()');records.push(d);final=d;
  const second=Math.ceil(d.clock);
  if(second<=10&&!screens.has(second)||d.phase==='RESULT'&&!screens.has('result')){
   const tag=d.phase==='RESULT'?'result':String(second);screens.add(tag);
   fs.writeFileSync(out+'/full-'+tag+'.png',Buffer.from(await ev("canvas.toDataURL('image/png').split(',')[1]"),'base64'));
  }
  if(d.phase==='RESULT')break;
  let target=d.ball.owner==='zorp'?245:d.ball.owner==='master'?d.master.x:d.ball.x;
  const dx=target-d.player.x;await movement(Math.abs(dx)>10?(dx<0?'a':'d'):'');
  const now=Date.now();
  if(now-lastJ>650&&(d.ball.owner!=='zorp'||Math.abs(dx)<20)){await tap('j','KeyJ',74);lastJ=now;}
  if(now-lastK>950&&d.ball.owner!=='zorp'&&Math.abs(d.master.x-d.player.x)<65){await tap('k','KeyK',75);lastK=now;}
  if(now-lastW>1000&&!d.ball.owner&&d.ball.y<200&&Math.abs(dx)<35){await tap('w','KeyW',87);lastW=now;}
  const elapsed=Math.floor((now-start)/1000);if(elapsed%15===0&&elapsed!==lastLog){lastLog=elapsed;console.log(JSON.stringify({elapsed,clock:d.clock,score:d.score,events:d.crowd.counts}));}
  await sleep(100);
 }
 await movement('');assert.equal(final.phase,'RESULT','whole match completes');
 const endedClock=final.clock,endedScore={...final.score};await sleep(2000);
 const after=await ev(`({final:basketball1v1.diagnostics(),audit:{...window.fullAudit,warning:[...fullAudit.warning],events:[...fullAudit.events]},samePeople:basketball1v1.crowd.people.every((p,i)=>p===savedPeople[i]),sameGeometry:basketball1v1.crowd.standGeometry===savedGeometry,sameAppearance:JSON.stringify(basketball1v1.crowd.people.map(({motion,...p})=>p))===savedAppearance})`);
 assert.equal(after.final.clock,endedClock);assert.deepEqual(after.final.score,endedScore);assert.equal(after.final.scoreboard.timeText,'00');
 assert.equal(after.audit.badValues,0);assert.equal(after.audit.badHud.length,0);assert.equal(after.audit.badSources,0);
 assert.ok(after.audit.warning.includes('PULSE')&&after.audit.warning.includes('FLASH')&&after.audit.warning.includes('FINAL'));
 assert.ok(after.samePeople&&after.sameGeometry&&after.sameAppearance);
 assert.ok(after.audit.trace.indexOf('PANEL')<after.audit.trace.indexOf('BALL'));
 const frame=metrics(after.audit.frames.slice(5)),crowd=metrics(after.audit.crowdMs.slice(5)),board=metrics(after.audit.boardMs.slice(5));
 const result={durationWallSeconds:(Date.now()-start)/1000,final:after.final,records,audit:{...after.audit,frames:undefined,crowdMs:undefined,boardMs:undefined},identityStable:after.samePeople&&after.sameAppearance,geometryStable:after.sameGeometry,performance:{fps:1000/frame.mean,frameMs:frame,crowdMs:crowd,scoreboardMs:board},errors,http,failed};
 fs.writeFileSync(out+'/full-match.json',JSON.stringify(result,null,2));
 assert.equal(errors.length,0);assert.equal(http.length,0);assert.equal(failed.length,0);
 console.log(JSON.stringify({passed:true,wallSeconds:result.durationWallSeconds,score:result.final.score,clock:result.final.clock,events:result.final.crowd.counts,performance:result.performance,errors:errors.length,http:http.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),1000);});
