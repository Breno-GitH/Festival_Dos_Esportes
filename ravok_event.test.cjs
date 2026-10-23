const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(saved=null,n=0){
 const store=new Map(saved?[['zorp_ravok_event',JSON.stringify(saved)]]:[]),owned=new Set(),listeners=new Map(),writes=[],outcomes=[];
 let clock=0,scene='ILHA_ESCALADA',fail=false;const player={x:373,y:137},shown=[],heldKeys=[];
 const env={console,Image:class{},performance:{now:()=>clock},document:{hidden:false},
  addEventListener:(name,fn)=>listeners.set(name,fn),localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('quota');writes.push(k);store.set(k,v);}},
  MEDALHAS_REGISTRY:Array.from({length:8},(_,i)=>({id:'m'+i})),isMedalhaDesbloqueada:id=>owned.has(id)};
 env.window=env;vm.createContext(env);
 for(const file of ['ravok_npc_geometry.js','ravok_event.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),env);
 const event=env.RavokEvent,medals=n=>{owned.clear();for(let i=0;i<n;i++)owned.add('m'+i);event.sync();};
 event.init({player,scene:()=>scene,busy:()=>false,heldKeys:()=>heldKeys,clearInput(){},showDialogue:d=>shown.push(d),closeDialogue(){},startOutcome:r=>outcomes.push(r)});medals(n);
 const tick=(ms=100)=>{clock+=ms;return event.updateConversation(scene);};
 return {env,event,medals,store,owned,listeners,writes,outcomes,player,shown,heldKeys,tick,setScene:s=>scene=s,setFail:v=>fail=v};
}
const arrived={version:5,arrived:true,ravokArrivalSeen:true},exited={...arrived,ravokExited:true};
const key=(key,repeat=false)=>({key,repeat,preventDefault(){},stopImmediatePropagation(){}});
const press=(e,k)=>{e.handleKeyDown(key(k));e.handleKeyUp(key(k));};
const open=g=>g.event.interact(g.event.npcs[1]);
const read=g=>{for(let i=0;i<29;i++)press(g.event,' ');assert.equal(g.event.dialogue().type,'CHOICE');};
test('0–3 medals hide the ship, both event NPCs and all event colliders',()=>{
 const g=setup();for(let n=0;n<4;n++){g.medals(n);assert.equal(g.event.arrived,false);assert.equal(g.event.blocks({x:350,y:75,w:10,h:10}),false);for(const npc of g.event.npcs){assert.equal(g.event.isNpcVisible(npc),false);assert.equal(g.event.interact(npc),null);}}
});
test('fourth medal persists arrival once, through the official award hook',()=>{
 const g=setup();for(let i=0;i<3;i++){g.owned.add('m'+i);g.listeners.get('festival:medal-unlocked')();}assert.equal(g.writes.length,0);
 g.owned.add('m3');g.listeners.get('festival:medal-unlocked')();assert.equal(g.event.arrived,true);assert.equal(g.writes.length,1);
 g.event.sync();assert.equal(g.writes.length,1);assert.equal(g.event.isNpcVisible(g.event.npcs[1]),false);
});
test('four through seven medals preserve K7, short lines and the central path',()=>{
 const g=setup(arrived,4),lines=[];for(let i=0;i<4;i++)lines.push(g.event.interact(g.event.npcs[0]));assert.equal(new Set(lines).size,4);assert.ok(lines.every(s=>!s.includes('Ravok')));
 for(let n=4;n<8;n++){g.medals(n);assert.equal(g.event.isNpcVisible(g.event.npcs[0]),true);assert.equal(g.event.isNpcVisible(g.event.npcs[1]),false);assert.equal(g.tick(),false);for(let y=155;y<280;y+=5)assert.equal(g.event.blocks({x:215,y,w:20,h:10}),false);}
 assert.equal(g.event.interact({id:'other'}),null);
});
test('eight medals without the completed arrival cannot reveal Ravok or his proposal',()=>{
 const g=setup({arrived:true,ravokExited:true},8);assert.equal(g.event.eligible,false);assert.equal(g.event.isNpcVisible(g.event.npcs[1]),false);assert.equal(open(g),null);assert.equal(g.tick(),false);
});
test('Ravok exits physically only on approach; seven medals cannot trigger it',()=>{
 const g=setup(arrived,7);assert.equal(g.tick(),false);g.medals(8);g.player.x=225;g.player.y=194;assert.equal(g.tick(),false);
 g.player.x=373;g.player.y=137;assert.equal(g.tick(),true);assert.equal(g.event.snapshot().exit.phase,'DOOR');assert.equal(g.event.ravokExited,false);assert.equal(g.event.isNpcVisible(g.event.npcs[1]),false);
 let moving=false;for(let i=0;i<45;i++){g.tick();const pose=g.event.snapshot().exit?.pose;if(pose&&pose.p>0&&pose.p<1){moving=true;assert.ok(pose.x>350&&pose.x<368);assert.ok(pose.y>89&&pose.y<114);}}
 assert.equal(moving,true);assert.equal(g.event.ravokExited,true);assert.equal(g.event.isNpcVisible(g.event.npcs[1]),true);
 const reload=setup(JSON.parse(g.store.get(g.event.storageKey)),8);assert.equal(reload.tick(),false);assert.equal(reload.event.isNpcVisible(reload.event.npcs[1]),true);
});
test('exit and narrative pause when the document is hidden; leaving closes safely',()=>{
 const g=setup(arrived,8);g.tick();const t=g.event.snapshot().exit.time;g.env.document.hidden=true;for(let i=0;i<20;i++)g.tick();assert.equal(g.event.snapshot().exit.time,t);
 g.env.document.hidden=false;g.setScene('HUB');assert.equal(g.tick(),false);assert.equal(g.event.exitActive,false);assert.equal(g.event.ravokExited,false);
});
test('all 29 lines require distinct Space presses, including the full law; old prelude does not skip them',()=>{
 const g=setup({...exited,preludeSeen:true,metRavok:true},8);g.heldKeys.push('e');open(g);assert.equal(g.event.dialogue().index,0);
 g.event.handleKeyDown(key('e',true));g.event.handleKeyDown(key('e'));assert.equal(g.event.dialogue().index,0);g.event.handleKeyUp(key('e'));
 const lines=[];for(let i=0;i<29;i++){const d=g.event.dialogue();assert.equal(d.index,i);lines.push(d.text);g.event.handleKeyDown(key(' '));g.event.handleKeyDown(key(' ',true));g.event.handleKeyUp(key(' '));}
 assert.ok(lines.some(s=>s.includes('leis fundamentais')));assert.equal(lines[28],'PROTOCOLO DISPONÍVEL.');
 assert.equal(g.event.dialogue().type,'CHOICE');assert.equal(g.event.dialogue().selected,1);assert.equal(g.event.ravokChoice,null);assert.equal(g.event.endingCompleted,false);
});
test('NO commits refusal directly once and never marks the ending complete',()=>{
 const g=setup(exited,8);open(g);read(g);press(g.event,' ');assert.equal(g.event.ravokChoice,'refuse');assert.deepEqual(g.outcomes,['refuse']);
 g.event.handleKeyDown(key(' ',true));assert.deepEqual(g.outcomes,['refuse']);const saved=JSON.parse(g.store.get(g.event.storageKey));assert.equal(saved.ravokChoice,'refuse');assert.equal(saved.ravokEndingCompleted,false);
});
test('YES opens a second confirmation defaulted to NO; held Space cannot confirm it',()=>{
 const g=setup(exited,8);open(g);read(g);press(g.event,'ArrowUp');g.event.handleKeyDown(key(' '));assert.equal(g.event.dialogue().type,'CONFIRM');assert.equal(g.event.dialogue().selected,1);
 g.event.handleKeyDown(key(' ',true));assert.equal(g.event.ravokChoice,null);g.event.handleKeyUp(key(' '));press(g.event,' ');
 assert.equal(g.event.dialogue().type,'CHOICE');assert.equal(g.event.ravokChoice,null);assert.equal(g.outcomes.length,0);
 press(g.event,'e');assert.equal(g.event.dialogue().type,'CONFIRM');press(g.event,'Escape');assert.equal(g.event.dialogue().type,'CHOICE');
 press(g.event,' ');press(g.event,'w');press(g.event,'e');assert.equal(g.event.ravokChoice,'accept');assert.deepEqual(g.outcomes,['accept']);assert.equal(g.event.endingCompleted,false);
});
test('Escape before deciding closes the menu and reopens it without recording a route',()=>{
 const g=setup(exited,8);open(g);read(g);press(g.event,'Escape');assert.equal(g.event.conversationActive,false);assert.equal(g.event.ravokChoice,null);
 open(g);assert.equal(g.event.dialogue().type,'CHOICE');assert.equal(g.event.dialogue().selected,1);
});
test('a failed choice save keeps the choice open and does not dispatch a cutscene',()=>{
 const g=setup(exited,8);open(g);read(g);g.setFail(true);press(g.event,' ');assert.equal(g.event.ravokChoice,null);assert.equal(g.outcomes.length,0);assert.match(g.event.dialogue().error,/salvar/);
 g.setFail(false);press(g.event,' ');assert.equal(g.event.ravokChoice,'refuse');
});
test('choice and completion survive reload independently; an opposite route cannot complete',()=>{
 const g=setup({...exited,ravokProposalSeen:true},8);open(g);press(g.event,' ');const saved=JSON.parse(g.store.get(g.event.storageKey));const reload=setup(saved,8);
 assert.equal(reload.event.ravokChoice,'refuse');assert.equal(reload.event.endingCompleted,false);assert.equal(reload.event.completeEnding('accept'),false);
 assert.equal(reload.event.completeEnding('refuse'),false);assert.equal(reload.event.completeArrest(),true);assert.equal(reload.event.completeArrest(),false);
 assert.equal(JSON.parse(reload.store.get(reload.event.storageKey)).ravokArrested,true);assert.equal(reload.event.endingCompleted,false);
});
test('landing ground is absent before arrival and uses one static cached surface',()=>{
 const g=setup(),created=[],drawn=[];g.env.document.createElement=()=>{const c={getContext:()=>({translate(){},fillRect(){}})};created.push(c);return c;};
 const ctx={save(){},restore(){},drawImage:(...a)=>drawn.push(a)};
 g.medals(3);g.event.drawGround(ctx);assert.equal(created.length,0);g.medals(4);g.event.drawGround(ctx);for(let i=0;i<60;i++)g.event.drawGround(ctx);
 assert.equal(created.length,1);assert.ok(drawn.every(call=>call[0]===created[0]));assert.equal(ctx.imageSmoothingEnabled,false);
});

test('arrest removes ship, both NPCs, prompts and physical colliders after save/load',()=>{
 const save={...exited,version:7,ravokChoice:'refuse',ravokArrested:true},g=setup(save,8);
 assert.equal(g.event.snapshot().state,'ARRESTED');assert.equal(g.event.ravokArrested,true);assert.equal(g.event.endingCompleted,false);
 assert.equal(g.event.arrived,false);assert.equal(g.event.eligible,false);assert.equal(g.event.blocks({x:350,y:75,w:10,h:10}),false);
 assert.equal(g.event.snapshot().npcs.length,0);for(const n of g.event.npcs){assert.equal(g.event.isNpcVisible(n),false);assert.equal(g.event.interact(n),null);}assert.equal(g.tick(),false);
});
test('failed arrest save rolls back removal, and old refusal completion never closes the campaign',()=>{
 const g=setup({...exited,version:6,ravokChoice:'refuse',ravokEndingCompleted:true},8);
 assert.equal(g.event.endingCompleted,false);assert.equal(g.event.ravokArrested,false);g.setFail(true);assert.equal(g.event.completeArrest(),false);
 assert.equal(g.event.ravokArrested,false);assert.equal(g.event.arrived,true);g.setFail(false);assert.equal(g.event.completeArrest(),true);assert.equal(g.event.endingCompleted,false);
});
