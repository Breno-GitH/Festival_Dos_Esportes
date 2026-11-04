const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(scene='JOGO_PINGPONG'){
 const handlers={},state={scene,t:1000,busy:false,exits:0,resumes:[],duck:[],fail:false};
 const w={addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn)};
 vm.runInNewContext(fs.readFileSync(__dirname+'/minigame_pause.js','utf8'),{window:w,performance:{now:()=>state.t}});
 const p=w.MinigamePause;p.init({scene:()=>state.scene,busy:()=>state.busy,capture:()=>({}),suspend:()=>({saved:true}),hideDialogue(){},
  resume:(token,held)=>{state.resumes.push([...held]);return state.scene==='JOGO_SKATE'&&held.has('space')?['space']:[];},
  abandon:()=>{if(state.fail)return false;state.exits++;state.scene='ILHA_TESTE';return true;},audio:value=>state.duck.push(value)});
 function send(type,k,repeat=false){const e={key:k,code:k===' '?'Space':'',repeat,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};for(const h of handlers[type]||[])h(e);return e;}
 const tap=k=>{send('keydown',k);send('keyup',k);};return {p,state,send,tap};
}
for(const scene of ['JOGO_PINGPONG','JOGO_BASQUETE','JOGO_CORRIDA','JOGO_SKATE','JOGO_ARCO','JOGO_ESCALADA','JOGO_BOXE','JOGO_SURF']){
 test(scene+': ESC pauses, exit needs explicit confirmation and safe default NO',()=>{
  const {p,state,tap}=setup(scene);tap('Escape');assert.equal(p.active,true);assert.equal(state.scene,scene);
  state.t+=250;tap('s');tap('e');assert.equal(p.snapshot().screen,'CONFIRM');assert.equal(p.snapshot().selected,1);assert.equal(state.exits,0);
  state.t+=250;tap('e');assert.equal(p.snapshot().screen,'MENU');assert.equal(state.exits,0);
  tap('s');state.t+=250;tap('e');tap('w');state.t+=250;tap('e');assert.equal(state.exits,1);assert.equal(p.active,false);
 });
}
test('game clock freezes across several long pauses and resumes without losing prior active elapsed time',()=>{
 const {p,state,tap}=setup();state.t+=50;tap('Escape');const frozen=p.now();state.t+=60000;assert.equal(p.now(),frozen);
 tap('Escape');assert.equal(p.now(),frozen);state.t+=33;assert.equal(p.now(),frozen+33);
 tap('Escape');state.t+=120000;tap('Escape');assert.equal(p.now(),frozen+33);state.t+=17;assert.equal(p.now(),frozen+50);
 assert.deepEqual(state.duck,[true,false,true,false]);
});
test('resume consumes menu Space and repeated keydown until keyup; next fresh press may play',()=>{
 const {p,state,tap,send}=setup();tap('Escape');state.t+=250;const confirm=send('keydown',' ');assert.equal(p.active,false);assert.equal(confirm.stopped,true);
 assert.equal(send('keydown',' ',true).stopped,true);assert.equal(send('keyup',' ').stopped,true);assert.equal(send('keydown',' ').stopped,undefined);
});
test('released and re-pressed Space in the pause menu is never mistaken for a continuous Skate hold',()=>{
 const {state,tap,send}=setup('JOGO_SKATE');send('keydown',' ');tap('Escape');send('keyup',' ');state.t+=250;send('keydown',' ');
 assert.deepEqual(state.resumes,[[]]);
});
test('a genuinely continuous Skate hold can survive pause without manufacturing a new press',()=>{
 const {state,tap,send}=setup('JOGO_SKATE');send('keydown',' ');tap('Escape');state.t+=250;tap('e');assert.deepEqual(state.resumes,[['space']]);
 assert.equal(send('keyup',' ').stopped,undefined);
});
test('failed safe-exit transaction leaves the game frozen and supports a single successful retry',()=>{
 const {p,state,tap}=setup('JOGO_SURF');tap('Escape');state.t+=250;tap('s');tap('e');tap('w');state.t+=250;state.fail=true;tap('e');
 assert.equal(p.active,true);assert.equal(state.exits,0);assert.match(p.snapshot().note,/salvar/);const frozen=p.now();state.t+=10000;assert.equal(p.now(),frozen);
 state.fail=false;tap('e');assert.equal(state.exits,1);assert.equal(p.active,false);
});
test('overworld, title and busy contexts cannot open the game pause',()=>{
 const {p,state,tap}=setup('HUB');tap('Escape');assert.equal(p.active,false);state.scene='TITLE_SCREEN';tap('Escape');assert.equal(p.active,false);
 state.scene='JOGO_BOXE';state.busy=true;tap('Escape');assert.equal(p.active,false);
});
