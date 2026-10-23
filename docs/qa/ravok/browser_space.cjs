const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9285/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const job=pending.get(m.id);pending.delete(m.id);m.error?job.reject(m.error):job.resolve(m.result);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 await ev("currentScene='ILHA_ESCALADA';player.x=368;player.y=128;for(const k of Object.keys(keys))keys[k]=false;");await wait(100);
 const before=await ev('({coins:FestivalWallet.coins,event:RavokEvent.snapshot()})');
 for(let i=0;i<3;i++){await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await wait(30);await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await wait(80);assert.equal(await ev('RavokEvent.dialogue().index'),i);}
 const after=await ev('({scene:currentScene,coins:FestivalWallet.coins,event:RavokEvent.snapshot(),ending:EndingCinematic.active,vacation:CaptainRoute.active})');
 assert.equal(after.scene,'ILHA_ESCALADA');assert.equal(after.coins,before.coins);assert.equal(after.ending,false);assert.equal(after.vacation,false);
 fs.writeFileSync(__dirname+'/browser-ravok-space-results.json',JSON.stringify({repeatedSpaceInteractions:3,before,after},null,2));
 const screenshot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(__dirname+'/ravok-browser-conversation.png',Buffer.from(screenshot.data,'base64'));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 console.log('Space: 3 etapas de conversa aprovadas; moedas e rotas finais preservadas.');ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
