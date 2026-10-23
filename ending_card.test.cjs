const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(autoload=true){
 const images=[],copies=[],draws=[],errors=[],texts=[],listeners=new Map();let clock=0,closes=0;
 const stack=[],gradient={addColorStop(){}};
 const ctx=new Proxy({imageSmoothingEnabled:true,globalAlpha:1,
  save(){stack.push({alpha:this.globalAlpha});},restore(){this.globalAlpha=stack.pop().alpha;},
  measureText:t=>({width:t.length*5.4}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,
  fillText(text,x,y){texts.push({text,x,y,alpha:this.globalAlpha});},
  drawImage(...args){draws.push({args,smooth:this.imageSmoothingEnabled,alpha:this.globalAlpha});}},
  {get:(o,k)=>k in o?o[k]:(()=>{})});
 class TestImage{
  constructor(){images.push(this);this.complete=false;}
  set src(value){this._src=value;const vacation=value.includes('feriasmerecidas'),secret=value.includes('MaiorConquista');this.width=this.naturalWidth=secret?1536:vacation?1448:1254;this.height=this.naturalHeight=secret?1024:vacation?1086:1254;if(autoload)this.load();}
  get src(){return this._src;}load(){this.complete=true;this.onload?.();}
 }
 const env={window:null,Image:TestImage,console:{...console,error:(...a)=>errors.push(a)},performance:{now:()=>clock},document:{hidden:false,
  getElementById:()=>null,createElement:()=>({width:0,height:0,getContext:()=>({imageSmoothingEnabled:true,fillRect(){},drawImage(...args){if(args[0].src)copies.push({args,smooth:this.imageSmoothingEnabled});}})})},
  addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);}};
 env.window=env;vm.createContext(env);vm.runInContext(fs.readFileSync(__dirname+'/ending_card.js','utf8'),env);
 const advance=(ms=100,render=true)=>{for(let n=0;n<ms;n+=100){clock+=Math.min(100,ms-n);env.EndingCard.update();if(render)env.EndingCard.draw(ctx);}};
 const show=(id,options={})=>env.EndingCard.show({id,onClose:()=>closes++,...options});
 const key=(key=' ',repeat=false,type='keydown')=>{let stopped=false;const event={key,repeat,preventDefault(){},stopImmediatePropagation(){stopped=true;}};for(const fn of listeners.get(type)||[]){fn(event);if(stopped)break;}};
 const release=()=>key(' ',false,'keyup');
 return {env,images,ctx,copies,draws,errors,texts,advance,show,key,release,closes:()=>closes};
}
test('preload loads exactly the three official assets, with no old fallback',async()=>{
 const g=setup();assert.equal(g.images.length,3);assert.deepEqual(Array.from(await g.env.EndingCard.assetsReady),[true,true,true]);
 for(const name of ['zorp_finalpadrao.png','zorp_feriasmerecidas.png','card_zorp_MaiorConquista.png'])assert.equal(g.images.filter(i=>i.src.startsWith(name+'?')).length,1);
});
test('standard backdrop caches a pixel Earth and departing ship in the side gutters without changing the central card',()=>{
 const g=setup();g.show('true_ending');g.advance(3000);
 const earth=()=>g.draws.filter(d=>d.args[0].width===90&&d.args[0].height===90);
 const ship=()=>g.draws.filter(d=>d.args[0].width===38&&d.args[0].height===26);
 assert.ok(earth().length>0);assert.ok(ship().length>0);
 assert.deepEqual(earth().at(-1).args.slice(1),[35,101]);
 const originalEarth=earth().at(-1).args[0],originalShip=ship().at(-1).args[0],first=ship().at(-1).args.slice(1);
 g.advance(20000);
 assert.equal(earth().at(-1).args[0],originalEarth);assert.equal(ship().at(-1).args[0],originalShip);
 const last=ship().at(-1).args.slice(1);assert.ok(last[0]>first[0]);assert.ok(last[1]<first[1]);
 assert.ok(last[0]>=340&&last[0]<=365);assert.ok(last[1]>=89&&last[1]<=110);
 assert.equal(g.env.EndingCard.snapshot().title,'DE VOLTA PARA CASA');
 assert.ok(Math.abs(g.env.EndingCard.snapshot().portrait.destination.height-172)<1e-10);
});
test('vacation backdrop never draws the space endings Earth or ships',()=>{
 const g=setup();g.show('ferias_merecidas');g.advance(3000);
 assert.equal(g.draws.filter(d=>[90,38,64].includes(d.args[0].width)).length,0);
});
test('secret aftermath caches four separated Earth pieces and both departing hulls clear of the portrait and text',()=>{
 const g=setup();g.show('ravok_maior_conquista');g.advance(3000);
 const drawsOf=width=>g.draws.filter(d=>d.args[0].width===width);
 const pieces=()=>drawsOf(90),zorp=()=>drawsOf(38),ravok=()=>drawsOf(64);
 const chunks=[...new Set(pieces().map(d=>d.args[0]))];
 assert.equal(chunks.length,4);assert.ok(zorp().length);assert.ok(ravok().length);
 assert.ok(pieces().every(d=>d.args[1]<50&&d.args[2]>=90&&d.args[2]+90<214));
 const zorpHull=zorp().at(-1).args[0],ravokHull=ravok().at(-1).args[0];
 const zorpStart=zorp().at(-1).args.slice(1),ravokStart=ravok().at(-1).args.slice(1);
 g.advance(20000);
 assert.equal(zorp().at(-1).args[0],zorpHull);assert.equal(ravok().at(-1).args[0],ravokHull);
 assert.equal(new Set(pieces().map(d=>d.args[0])).size,4);
 for(const [last,first]of [[zorp().at(-1),zorpStart],[ravok().at(-1),ravokStart]]){
  assert.ok(last.args[1]>first[0]);assert.ok(last.args[2]<first[1]);
  assert.ok(last.args[1]>=328&&last.args[1]+last.args[0].width<=428);
 }
 assert.ok(g.draws.every(d=>!d.smooth));assert.equal(g.copies.length,1);
 assert.equal(g.env.EndingCard.snapshot().title,'A MAIOR CONQUISTA');
});
for(const [id,size,crop] of [['true_ending',172,[0,0,1254,1254]],['ferias_merecidas',156,[256,42,1007,1007]],['ravok_maior_conquista',164,[892,141,179,217]]]){
 test(id+': same layout, larger portrait, uniform scale, complete crop and nearest-neighbor drawing',()=>{
  const g=setup();g.show(id);g.advance(3000);const s=g.env.EndingCard.snapshot(),d=s.portrait.destination;
  assert.equal(s.state,'READY');assert.equal(s.presented,true);assert.equal(s.titleFont,'LOCAL_BITMAP_5x7');
  assert.deepEqual(Array.from(s.portrait.sourceRect),crop);assert.ok(Math.abs(d.height-size)<1e-10);assert.ok(Math.abs(d.width/crop[2]-d.height/crop[3])<1e-12);
  assert.ok(d.width<=172+1e-10);assert.ok(Math.abs(d.y-(id==='true_ending'?58:57))<1e-10);assert.ok(Math.abs(d.x+d.width/2-225)<1e-10);
  assert.equal(g.copies.length,1);assert.equal(g.copies[0].smooth,false);assert.ok(g.draws.every(d=>!d.smooth));
  assert.ok(g.texts.every(t=>t.y<=280));
 });
}
test('fade to black, black pause, background, portrait/title/text reveal and ready are distinct paced states',()=>{
 const g=setup();g.show('true_ending');const phases=new Set();
 for(let i=0;i<35;i++){phases.add(g.env.EndingCard.snapshot().state);g.advance();}
 assert.deepEqual([...phases],['FADE_TO_BLACK','BLACK_PAUSE','BACKGROUND','REVEAL','READY']);
 assert.equal(g.env.EndingCard.snapshot().inputLock,.7);
});
test('a held press from the last dialogue and repeats cannot skip any ending; fresh Space fades before closing once',()=>{
 const g=setup();g.key();g.show('ferias_merecidas');g.advance(3000);g.key(' ',true);g.key();
 assert.equal(g.env.EndingCard.snapshot().state,'READY');assert.equal(g.closes(),0);
 g.release();g.key();assert.equal(g.env.EndingCard.snapshot().state,'FADE_OUT');assert.equal(g.closes(),0);
 g.advance(400);assert.equal(g.closes(),0);g.release();g.key();g.advance(600);assert.equal(g.closes(),1);
 g.advance(2000);assert.equal(g.closes(),1);
});
test('unrendered cards never become eligible to continue, even after their clock reaches READY',()=>{
 const g=setup();g.show('true_ending');g.advance(4000,false);g.key();
 assert.equal(g.env.EndingCard.snapshot().state,'READY');assert.equal(g.env.EndingCard.snapshot().presented,false);assert.equal(g.closes(),0);
 g.release();g.env.EndingCard.draw(g.ctx);g.key();assert.equal(g.env.EndingCard.snapshot().state,'READY');
 g.release();g.advance(800);g.key();assert.equal(g.env.EndingCard.snapshot().state,'FADE_OUT');
});
test('missing assets hold the reveal and failed official PNGs retry without a substituted sprite',()=>{
 const g=setup(false);g.show('ravok_maior_conquista');g.advance(4000);
 assert.equal(g.env.EndingCard.snapshot().state,'REVEAL');assert.equal(g.copies.length,0);g.images[2].onerror();g.key();
 assert.equal(g.env.EndingCard.snapshot().state,'REVEAL');assert.equal(g.errors.length,1);assert.equal(g.env.EndingCard.portraitInfo('ravok_maior_conquista').status,'loading');
 g.images[2].load();g.advance(1600);assert.equal(g.env.EndingCard.snapshot().state,'READY');assert.equal(g.copies.length,1);
});
test('hidden tabs pause reveal and exit fade and cannot confirm',()=>{
 const g=setup();g.show('true_ending');g.env.document.hidden=true;g.advance(4000);assert.equal(g.env.EndingCard.snapshot().state,'FADE_TO_BLACK');
 g.env.document.hidden=false;g.advance(3000);g.env.document.hidden=true;g.key();assert.equal(g.env.EndingCard.snapshot().state,'READY');
 g.env.document.hidden=false;g.release();g.key();g.env.document.hidden=true;g.advance(3000);assert.equal(g.closes(),0);
 g.env.document.hidden=false;g.advance(900);assert.equal(g.closes(),1);
});
test('failed completion save retains the visible card and permits a fresh retry before the shared fade',()=>{
 const g=setup();let allow=false,attempts=0;g.show('ravok_maior_conquista',{onContinue(){attempts++;return allow;}});g.advance(3000);g.key();
 assert.equal(g.env.EndingCard.snapshot().state,'READY');assert.ok(g.env.EndingCard.snapshot().error);assert.equal(g.closes(),0);
 g.key(' ',true);assert.equal(attempts,1);g.release();allow=true;g.key();g.advance(900);assert.equal(attempts,2);assert.equal(g.closes(),1);
});
test('sequential endings have exclusive cached images and cannot replace an active card',()=>{
 const g=setup();g.show('true_ending');assert.equal(g.show('ferias_merecidas'),false);g.advance(3000);g.key();g.advance(900);g.release();
 g.show('ferias_merecidas');g.advance(3000);g.key();g.advance(900);g.release();g.show('ravok_maior_conquista');g.advance(3000);
 assert.equal(g.copies.length,3);assert.equal(new Set(g.copies.map(c=>c.args[0].src)).size,3);assert.equal(g.env.EndingCard.snapshot().id,'ravok_maior_conquista');
 assert.equal(g.show('unknown'),false);
});
test('standard and vacation controllers use shared presets while retaining their own completion callbacks',()=>{
 const g=setup();let persisted=0,vacations=0;g.env.AdventureIntro={endingSeen:false,persist(){persisted++;}};g.env.FestivalWallet={completeVacation(){vacations++;}};
 vm.runInContext(fs.readFileSync(__dirname+'/ending_cinematic.js','utf8'),g.env);
 g.env.EndingCinematic.config={clearInput(){},returnToMenu(){}};g.env.EndingCinematic.active=true;g.env.EndingCinematic.state='HOME_FADE';g.env.EndingCinematic.finish();
 assert.equal(persisted,1);assert.equal(g.env.EndingCard.snapshot().id,'true_ending');g.advance(3000);g.key();g.advance(900);g.release();assert.equal(g.env.EndingCinematic.state,'COMPLETE');
 vm.runInContext(fs.readFileSync(__dirname+'/captain_route.js','utf8'),g.env);g.env.CaptainRoute.state='FERIAS_MERECIDAS';g.env.CaptainRoute.scene='MONOLOGUE';g.env.CaptainRoute.config={clearInput(){},returnToMenu(){}};
 g.env.CaptainRoute.showEndingCard();assert.equal(vacations,1);assert.equal(g.env.EndingCard.snapshot().id,'ferias_merecidas');
});
test('preview uses the same renderer but cannot mark a live card presented',()=>{
 const g=setup();g.show('true_ending');g.advance(3000,false);g.env.EndingCard.preview(g.ctx,'true_ending',3);
 assert.equal(g.env.EndingCard.snapshot().presented,false);g.key();assert.equal(g.env.EndingCard.snapshot().state,'READY');
});
test('browser modifier shortcuts cannot confirm the card and are not prevented by its input gate',()=>{
 const g=setup();g.show('true_ending');g.advance(3000);let prevented=0;
 assert.equal(g.env.EndingCard.handleKeyDown({key:' ',ctrlKey:true,preventDefault(){prevented++;}}),false);
 assert.equal(prevented,0);assert.equal(g.env.EndingCard.snapshot().state,'READY');
});
