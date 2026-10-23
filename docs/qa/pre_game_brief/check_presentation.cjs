const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.BRIEF_QA_OUTPUT||__dirname,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9284/json')).json(),page=pages.find(p=>p.type==='page');
 const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
 let id=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const job=pending.get(m.id);pending.delete(m.id);m.error?job.reject(m.error):job.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const tap=async(key,code,vk)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk});await sleep(25);await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});};
 await send('Page.enable');await send('Runtime.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
  window.briefAudioQa={contexts:[],tones:[]};window.briefTextQa={};
  const Native=window.AudioContext;
  if(Native)window.AudioContext=new Proxy(Native,{construct(Target,args){const c=Reflect.construct(Target,args);briefAudioQa.contexts.push(c);const create=c.createOscillator.bind(c);c.createOscillator=()=>{const o=create(),set=o.frequency.setValueAtTime.bind(o.frequency);o.frequency.setValueAtTime=(f,t)=>{briefAudioQa.tones.push(f);return set(f,t);};return o;};return c;}});
  const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){
   if(window.PreGameBrief?.active&&PreGameBrief.state!=='COUNTDOWN'&&this.canvas.id==='gameCanvas'){
    const width=this.measureText(text).width,left=this.textAlign==='center'?x-width/2:x;
    briefTextQa[String(text)]={text:String(text),left,right:left+width,y,font:this.font};
   }return fill.call(this,text,x,y,...args);
  };
 })();`});
 await send('Page.navigate',{url:'http://127.0.0.1:8804/index.html'});
 for(let i=0;i<150;i++){await sleep(100);if(await evaluate("typeof openMinigameBrief==='function'&&typeof surfEndlessGame!=='undefined'"))break;}
 await evaluate("TitleScreen.active=false;currentScene='ILHA_PINGPONG';const npc=npcs.find(n=>n.isMaster==='JOGO_PINGPONG');player.x=npc.x-18;player.y=npc.y+4;for(const key of Object.keys(keys))keys[key]=false;");
 await tap('e','KeyE',69);await sleep(400);
 const opening=await evaluate('({states:briefAudioQa.contexts.map(c=>c.state),tones:briefAudioQa.tones.slice()})');
 assert.ok(opening.states.includes('running'),'audio not unlocked by interaction');assert.ok(opening.tones.includes(430),'opening note missing');
 const textResults=[];
 for(const sport of ['pingpong','basketball','marathon','skate','archery','climbing','boxing','surf']){
  for(const [width,height] of [[900,600],[390,844]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   const result=await evaluate(`(()=>{briefTextQa={};PreGameBrief.state='CLOSED';PreGameBrief.open(PreGameBriefConfigs['${sport}'],{onCancel(){}});PreGameBrief.update(.2);PreGameBrief.draw(ctx,canvas);const text=Object.values(briefTextQa);return {sport:'${sport}',width:${width},height:${height},overflow:text.filter(t=>t.left<34||t.right>416||t.y<12||t.y>=288||t.text.includes('…'))};})()`);
   assert.equal(result.overflow.length,0,JSON.stringify(result));textResults.push(result);
  }
 }
 await send('Emulation.setDeviceMetricsOverride',{width:900,height:600,deviceScaleFactor:1,mobile:false});
 await evaluate("PreGameBrief.state='CLOSED';resetPingPong(true);");await sleep(250);await tap('Enter','Enter',13);await sleep(240);
 assert.equal(await evaluate('PreGameBrief.state'),'COUNTDOWN');
 await sleep(1700);
 assert.equal(await evaluate('PreGameBrief.active'),false);assert.equal(await evaluate('pingPong.gameState'),'PLAYING');
 const audio=await evaluate('({states:briefAudioQa.contexts.map(c=>c.state),tones:briefAudioQa.tones.slice()})');
 assert.ok(audio.tones.includes(660),'confirmation note missing');assert.ok(audio.tones.includes(480),'countdown note missing');assert.ok(audio.tones.includes(880),'go note missing');
 await evaluate("PreGameBrief.state='CLOSED';resetPingPong(true);");await sleep(250);await tap('Escape','Escape',27);await sleep(200);
 assert.equal(await evaluate('currentScene'),'ILHA_PINGPONG');assert.equal(await evaluate('PreGameBrief.active'),false);
 const report={audioPolicy:'Chrome default autoplay policy',opening,audio,textResults,enterStarts:true,escapeReturns:true,errors};
 fs.writeFileSync(out+'/presentation-results.json',JSON.stringify(report,null,2));assert.equal(errors.length,0);console.log(JSON.stringify({layouts:textResults.length,audio:true,enter:true,cancel:true,errors:errors.length}));ws.close();
})().catch(error=>{console.error(error);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
