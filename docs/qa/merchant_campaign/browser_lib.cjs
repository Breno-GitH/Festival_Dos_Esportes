const fs=require('node:fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9350/json')).json(),ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let serial=0;const pending=new Map(),requests=new Map(),errors=[],http=[],failed=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Network.requestWillBeSent')requests.set(m.params.requestId,m.params.request.url);else if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(m.params.type))errors.push(m.params);else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)http.push(m.params.response);else if(m.method==='Network.loadingFailed'&&!m.params.canceled)failed.push({...m.params,url:requests.get(m.params.requestId)});};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const key=(type,k)=>send('Input.dispatchKeyEvent',{type,key:k,code:k===' '?'Space':k==='Escape'?'Escape':'Key'+k.toUpperCase(),windowsVirtualKeyCode:k===' '?32:k==='Escape'?27:k.toUpperCase().charCodeAt(0)});
 const tap=async k=>{await key('keyDown',k);await ev('qaOriginalUpdate()');await key('keyUp',k);};
 const ready=async()=>{for(let i=0;i<100;i++){if(await ev("document.readyState==='complete'&&typeof NormalIslandNpcs!=='undefined'&&typeof surfEndlessGame!=='undefined'&&npcs.every(n=>n.img.complete&&n.img.naturalWidth>0)"))return;await sleep(100);}throw Error('load timeout');};
 const init=async(clear=false)=>{
  await send('Page.navigate',{url:(process.env.NPC_QA_BASE||'http://127.0.0.1:8870')+'/index.html'});await ready();
  if(clear){await ev('localStorage.clear()');await send('Page.reload');await ready();}
  await ev(`TitleScreen.active=false;AdventureIntro.active=false;MedalCompletion.active=false;PreGameBrief.state='CLOSED';currentScene='HUB';player.x=225;player.y=245;window.qaOriginalUpdate=update;window.qaPaused=true;update=function(){if(!qaPaused)qaOriginalUpdate();};`);
 };
 const shot=async name=>{await ev('draw()');fs.writeFileSync(__dirname+'/'+name+'.png',Buffer.from(await ev("canvas.toDataURL('image/png').split(',')[1]"),'base64'));};
 await send('Runtime.enable');await send('Network.enable');await send('Page.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 return {ws,send,ev,key,tap,init,ready,shot,sleep,errors,http,failed};
};
