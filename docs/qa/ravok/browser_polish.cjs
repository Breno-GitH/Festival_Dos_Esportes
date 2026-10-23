const fs=require('node:fs'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),out=process.env.RAVOK_QA_OUTPUT||__dirname;
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9288/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const key=(type,k)=>send('Input.dispatchKeyEvent',{type,key:k==='space'?' ':k,code:k==='Escape'?'Escape':k==='space'?'Space':'Key'+k.toUpperCase(),windowsVirtualKeyCode:k==='Escape'?27:k==='space'?32:k.toUpperCase().charCodeAt(0)});
 const tap=async k=>{await key('keyDown',k);await sleep(35);await key('keyUp',k);await sleep(80);};
 const shot=async name=>{await sleep(60);const data=await ev("canvas.toDataURL('image/png').split(',')[1]");fs.writeFileSync(out+'/'+name+'.png',Buffer.from(data,'base64'));};
 const medals=async n=>ev(`(()=>{for(const id of Object.keys(rawInsignias))rawInsignias[id]=false;MEDALHAS_REGISTRY.slice(0,${n}).forEach(m=>rawInsignias[m.id]=true);RavokEvent.sync();return RavokEvent.snapshot();})()`);
 const ready=async()=>{for(let i=0;i<150;i++){await sleep(100);if(await ev("typeof RavokEvent!=='undefined'&&typeof currentScene!=='undefined'&&typeof surfEndlessGame!=='undefined'&&RavokEvent.npcs.every(n=>n.img.complete&&n.img.naturalWidth>0)"))return;}throw Error('load timeout');};
 const scene=()=>ev("TitleScreen.active=false;AdventureIntro.active=false;AdventureIntro.introSeen=true;AdventureIntro.homeCallSeen=true;MedalCompletion.active=false;currentScene='ILHA_ESCALADA';player.x=225;player.y=262;for(const k of Object.keys(keys))keys[k]=false;");
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:8808',storageTypes:'local_storage'});
 await send('Page.navigate',{url:'http://127.0.0.1:8808/index.html'});await ready();await scene();
 const result={states:[],navigation:[],errors,httpErrors,failedRequests};
 const ground=()=>ev(`(()=>{const c=document.createElement('canvas');c.width=450;c.height=300;RavokEvent.drawGround(c.getContext('2d'));const p=c.getContext('2d').getImageData(0,0,450,300).data;let pixels=0;for(let i=3;i<p.length;i+=4)if(p[i])pixels++;return pixels;})()`);
 result.states.push(await medals(0));assert.equal(result.states.at(-1).state,'DORMANT');await shot('ravok-A-before');
 await medals(3);assert.equal(await ev('RavokEvent.snapshot().state'),'DORMANT');
 assert.equal(await ground(),0);
 result.states.push(await medals(4));assert.equal(result.states.at(-1).state,'LANDED');assert.equal(result.states.at(-1).npcs.map(n=>n.id).join(','),'k7');await shot('ravok-B-landed');
 result.groundPixels=await ground();assert.ok(result.groundPixels>1000&&result.groundPixels<6000);
 // BFS uses the actual collision function; movement along its route uses keyboard events.
 const walk=async(tx,ty)=>{
  const path=await ev(`(()=>{const goal=[${tx},${ty}],step=1,start=[Math.round(player.x),Math.round(player.y)],q=[start],parents=new Map([[start.join(','),null]]);let end=null;
   for(let head=0;head<q.length;head++){const p=q[head];if(Math.abs(p[0]-goal[0])<=2&&Math.abs(p[1]-goal[1])<=2){end=p;break;}
    for(const [dx,dy]of [[0,-step],[step,0],[-step,0],[0,step]]){const x=p[0]+dx,y=p[1]+dy,k=x+','+y;if(x<25||x>425||y<20||y>282||parents.has(k)||[-1.2,1.2].some(ox=>[-1.2,1.2].some(oy=>checkObstacleCollision(x+ox,y+oy))))continue;parents.set(k,p);q.push([x,y]);}}
   if(!end)return null;const path=[];for(let p=end;parents.get(p.join(','));p=parents.get(p.join(',')))path.unshift(p);
   const turns=[];let prev=start,lastDir='';for(let i=0;i<path.length;i++){const p=path[i],dir=p[0]>prev[0]?'d':p[0]<prev[0]?'a':p[1]>prev[1]?'s':'w';if(lastDir&&lastDir!==dir)turns.push({k:lastDir,x:prev[0],y:prev[1]});lastDir=dir;prev=p;}if(lastDir)turns.push({k:lastDir,x:prev[0],y:prev[1]});return {turns,steps:path.length};})()`);
  assert.ok(path,'no accessible route to '+tx+','+ty);
  for(const turn of path.turns){
   if(await ev(`Math.abs(player.x-${turn.x})<=1.11&&Math.abs(player.y-${turn.y})<=1.11`))continue;
   const moving=ev(`new Promise(resolve=>{let frames=0;const tick=()=>{if(Math.abs(player.x-${turn.x})<=1.11&&Math.abs(player.y-${turn.y})<=1.11){keys['${turn.k}']=false;return resolve(true);}if(++frames>220){keys['${turn.k}']=false;return resolve(false);}requestAnimationFrame(tick);};requestAnimationFrame(tick);})`);
   await key('keyDown',turn.k);const reached=await moving;await key('keyUp',turn.k);assert.ok(reached,'movement blocked '+JSON.stringify(turn));
  }
  result.navigation.push({goal:[tx,ty],steps:path.steps,turns:path.turns.length});
 };
 await walk(382,129);await sleep(100);assert.equal(await ev('overworldFocusNpc?.id'),'k7');await tap('e');assert.match(await ev('dialogText.textContent'),/Não me atrapalhe/);assert.equal(await ev('RavokEvent.snapshot().metK7'),true);await shot('ravok-k7-conversation');
 await medals(7);assert.equal(await ev('RavokEvent.snapshot().state'),'LANDED');
 await walk(369,122);await key('keyDown','w');await sleep(600);await key('keyUp','w');
 result.shipCollision=await ev('({x:player.x,y:player.y,feetOverlap:RavokEvent.blocks({x:player.x-10,y:player.y-8,w:20,h:10}),nextStepBlocked:RavokEvent.blocks({x:player.x-10,y:player.y-10,w:20,h:10})})');assert.equal(result.shipCollision.feetOverlap,false);assert.equal(result.shipCollision.nextStepBlocked,true);assert.ok(result.shipCollision.y>=102);
 await shot('polish-ship-front');
 await walk(382,129);
 result.states.push(await medals(8));assert.equal(result.states.at(-1).state,'RAVOK_PRESENT');
 await walk(368,128);await sleep(100);assert.equal(await ev('overworldFocusNpc?.id'),'ravok');await tap('e');assert.match(await ev('dialogText.textContent'),/Oito insígnias/);assert.equal(await ev('RavokEvent.snapshot().metRavok'),true);await shot('ravok-C-conversation');
 await tap('Escape');assert.equal(await ev('RavokEvent.conversationActive'),false);
 await walk(373,113);await shot('polish-door-approach');
 await walk(382,140);await shot('polish-clearance');
 await walk(225,240);await shot('ravok-C-area');
 result.flicker=await ev(`new Promise(resolve=>{let previous=null,frames=0,mismatches=0;const sample=()=>{const data=ctx.getImageData(322,40,88,84).data;let hash=2166136261;for(const value of data)hash=Math.imul(hash^value,16777619)>>>0;if(previous!==null&&hash!==previous)mismatches++;previous=hash;if(++frames>=90)return resolve({frames,mismatches,hash});requestAnimationFrame(sample);};requestAnimationFrame(sample);})`);
 assert.equal(result.flicker.mismatches,0,'unstable pixels in the static secret clearing');
 result.layers=await ev(`(()=>{const c=document.createElement('canvas');c.width=450;c.height=300;const g=c.getContext('2d'),calls=[],draw=g.drawImage.bind(g);g.drawImage=(image,...args)=>{calls.push([image.width,image.height,...args]);return draw(image,...args);};ClimbIsland.draw(g,0,RavokEvent.drawGround);return calls;})()`);
 assert.deepEqual(result.layers.map(a=>a.slice(0,2)),[[450,300],[102,74],[450,300]]);
 result.fps=await ev(`new Promise(resolve=>{const times=[];let prev;function tick(t){if(prev)times.push(t-prev);prev=t;if(times.length>=120){const sorted=[...times].sort((a,b)=>a-b);resolve({frames:times.length,average:1000/(times.reduce((a,b)=>a+b,0)/times.length),p95ms:sorted[Math.floor(sorted.length*.95)]});}else requestAnimationFrame(tick);}requestAnimationFrame(tick);})`);
 await walk(225,194);await sleep(100);assert.equal(await ev("overworldFocusNpc?.isMaster"),'JOGO_ESCALADA');await tap('e');assert.equal(await ev('PreGameBrief.snapshot().id'),'climbing');await tap('Escape');
 // Escape code above is a logical key in this helper, but key string still maps correctly.
 await sleep(180);assert.equal(await ev('currentScene'),'ILHA_ESCALADA');
 result.geometry=await ev(`RavokEvent.npcs.map(n=>{const sprite=prepareOverworldNpc(n),b=overworldNpcDrawBounds(n,sprite.surface.width,sprite.surface.height,sprite.geometry),g=sprite.surface.getContext('2d'),p=g.getImageData(0,0,g.canvas.width,g.canvas.height).data;let opaque=0,dark=0,light=0;for(let i=0;i<p.length;i+=4)if(p[i+3]){opaque++;if(Math.max(p[i],p[i+1],p[i+2])<45)dark++;if(Math.min(p[i],p[i+1],p[i+2])>200)light++;}return {id:n.id,valid:validateOverworldNpcGeometry(sprite.geometry,n.img),scaleX:b.width/sprite.surface.width,scaleY:b.height/sprite.surface.height,corners:[p[3],p[(g.canvas.width-1)*4+3],p[p.length-1]],opaque,dark,light};})`);
 for(const g of result.geometry){assert.equal(g.valid.valid,true);assert.ok(Math.abs(g.scaleX-g.scaleY)<1e-12);assert.ok(g.corners.every(a=>a===0));assert.ok(g.dark>0);}
 assert.ok(result.geometry.find(g=>g.id==='k7').light>0,'K7 white body erased');
 result.beforeReload=await ev('RavokEvent.snapshot()');await ev("localStorage.setItem('zorpSurfCompleted','1');salvarMedalhas(rawInsignias)");
 await send('Page.reload',{ignoreCache:true});await ready();await scene();await ev('RavokEvent.sync()');result.afterReload=await ev('RavokEvent.snapshot()');
 assert.equal(result.afterReload.state,'RAVOK_PRESENT');assert.equal(result.afterReload.metRavok,true);assert.equal(result.afterReload.metK7,true);
 result.renderIssues=await ev('getOverworldDiagnostics().renderIssues');assert.equal(result.renderIssues.length,0);
 fs.writeFileSync(out+'/browser-polish-results.json',JSON.stringify(result,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({states:result.states.map(s=>s.state),routes:result.navigation.length,flicker:result.flicker,layers:result.layers,fps:result.fps,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
