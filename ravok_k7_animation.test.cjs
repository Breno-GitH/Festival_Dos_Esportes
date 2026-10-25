const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const draws=[],labels=[],images=[];
 const env={console,DEBUG_RAVOK_K7_ANIMATION:false,Image:class{constructor(){images.push(this);this.complete=true;this.naturalWidth=1024;}},};
 env.window=env;vm.createContext(env);
 for(const file of ['ravok_walk_atlas.js','ravok_k7_animation.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),env);
 const context=new Proxy({drawImage(...args){draws.push(args);},fillText(...a){labels.push(a);}},{get:(o,k)=>k in o?o[k]:(()=>{})});
 return {env,animation:env.RavokK7Animation,atlas:env.RAVOK_K7_WALK_ATLAS,context,draws,labels,images};
}
for(const id of ['ravok','k7']){
 test(id+': four real directional idle/walk sequences and measured original rectangles',()=>{
  const {atlas,animation:a}=setup(),data=atlas.characters[id];
  assert.equal(data.frames.length,id==='ravok'?40:28);
  for(const dir of ['up','down','left','right']){
   assert.ok(data.animations['idle_'+dir].length>=3);assert.ok(data.animations['walk_'+dir].length>=4);
   assert.ok(a.animations[id.toUpperCase()+'_WALK_'+dir.toUpperCase()]);
  }
  for(const f of data.frames){const [x,y,w,h]=f.sourceRect;assert.ok(x>=0&&y>=0&&x+w<=1254&&y+h<=1254);assert.ok(f.normalization>0);}
 });
 test(id+': all directions move physically, advance frames and idle in last direction',()=>{
  const {animation:a}=setup();
  for(const [dir,vx,vy]of [['left',-16,0],['right',16,0],['up',0,-16],['down',0,16]]){
   const actor=a.create(id,100,100),frames=new Set();
   for(let n=0;n<60;n++){a.update(actor,vx,vy,1/60);frames.add(actor.frame);assert.equal(actor.state,'WALK');assert.equal(actor.direction,dir);}
   assert.ok(frames.size>=4);a.update(actor,0,0,1/60);assert.equal(actor.state,'IDLE');assert.equal(actor.direction,dir);
   assert.ok(Math.abs(actor.x-(100+vx))<1e-9);assert.ok(Math.abs(actor.y-(100+vy))<1e-9);
  }
 });
 test(id+': destination dimensions, uniform scale and feet anchor remain constant in every frame',()=>{
  const {animation:a,atlas,context:g,draws}=setup(),data=atlas.characters[id],scale=a.settings[id].scale;
  for(const dir of ['up','down','left','right'])for(let i=0;i<120;i++){
   const actor=a.path(id,[100,150],[dir==='left'?60:dir==='right'?140:100,dir==='up'?110:dir==='down'?190:150],3,i/40);
   a.draw(g,actor);const d=draws.at(-1);
   assert.equal(d[3],128);assert.equal(d[4],176);assert.equal(d[7],128*scale);assert.equal(d[8],176*scale);
   assert.equal(d[7]/d[3],d[8]/d[4]);assert.equal(d[5],Math.round(actor.x-data.anchor[0]*scale));assert.equal(d[6],Math.round(actor.y-data.anchor[1]*scale));
   assert.equal(actor.scaleX,scale);assert.equal(actor.scaleY,scale);
  }
 });
 test(id+': movement and step phase match at 30, 60 and 144 FPS',()=>{
  const {animation:a}=setup(),results=[];
  for(const fps of [30,60,144]){const p=a.create(id,100,100);for(let n=0;n<fps*3;n++)a.update(p,10,-8,1/fps);results.push(p);}
  for(const p of results){assert.ok(Math.abs(p.x-130)<1e-8);assert.ok(Math.abs(p.y-76)<1e-8);assert.equal(p.direction,'right');assert.equal(p.frame,results[0].frame);}
 });
 test(id+': fixed footprint ignores limbs and frame dimensions',()=>{
  const {animation:a}=setup(),p=a.create(id,100,150),before=a.collider(p);
  a.update(p,0,0,2);p.frame=3;assert.deepEqual(a.collider(p),before);assert.equal(before.w,18);assert.equal(before.h,8);
 });
 test(id+': no animation/position drift when paused or repeatedly rendered',()=>{
  const {animation:a,context:g}=setup(),p=a.path(id,[350,114],[368,89],2,1),before=JSON.stringify(p);
  for(let n=0;n<500;n++)a.draw(g,p);assert.equal(JSON.stringify(p),before);
  assert.deepEqual(a.path(id,[350,114],[368,89],2,1),p);
 });
}
test('predominant direction handles diagonals and preserves direction when stopped',()=>{
 const a=setup().animation;assert.equal(a.direction(10,-5),'right');assert.equal(a.direction(-5,-10),'up');assert.equal(a.direction(5,5),'down');assert.equal(a.direction(0,0,'left'),'left');
});
test('paths start idle, decelerate and reach exact door before disappearing',()=>{
 const a=setup().animation;
 for(const [id,start,end,duration] of [['ravok',[350,114],[368,89],2],['k7',[396,113],[368,89],2.1]]){
  assert.equal(a.path(id,start,end,duration,-1).state,'IDLE');
  const early=a.path(id,start,end,duration,duration*.5),late=a.path(id,start,end,duration,duration*.95);
  assert.equal(early.state,'WALK');assert.ok(late.speed<early.speed);
  const last=a.path(id,start,end,duration,duration);assert.equal(last.state,'IDLE');assert.equal(last.x,end[0]);assert.equal(last.y,end[1]);assert.equal(last.speed,0);
 }
});
test('Ravok right walk excludes the two incompatible left-facing poses',()=>{
 const data=setup().atlas.characters.ravok;assert.equal(data.excludedIncompatiblePoses.length,2);
 for(const id of data.excludedIncompatiblePoses)assert.ok(!data.animations.walk_right.includes(id));
});
test('debug is off by default and reports fixed scales only when enabled',()=>{
 const {animation:a,env,context:g,labels}=setup();a.draw(g,a.idle('ravok',100,150));assert.equal(labels.length,0);
 env.DEBUG_RAVOK_K7_ANIMATION=true;a.draw(g,a.path('ravok',[100,150],[130,150],2,.4));
 assert.ok(labels.some(l=>l[0].includes('WALK right')));assert.ok(labels.some(l=>l[0].includes('scaleX=0.3333 scaleY=0.3333')));
});
test('renderer ignores attempted pose scale overrides',()=>{
 const {animation:a,context:g,draws}=setup(),p=a.idle('k7',100,150);p.scaleX=9;p.scaleY=.01;a.draw(g,p);
 assert.equal(draws.at(-1)[7],128*a.settings.k7.scale);assert.equal(draws.at(-1)[8],176*a.settings.k7.scale);
});
test('both route films use walking poses and never resize actors for boarding or escort',()=>{
 const {env,animation:a,context:g}=setup(),poses=[];
 env.RavokEvent={drawShip(){}};env.EndingCard={preview(){},timing:{reveal:2}};
 env.document={createElement:()=>({width:0,height:0,getContext:()=>g})};
 for(const file of ['ravok_bad_ending.js','ravok_arrest.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),env);
 const options={island:{},clearedIsland:{},home:{},origin:{x:373,y:137},drawZorp(){},caption(){},drawNpc(g,id,p){poses.push(p);a.draw(g,p);}};
 env.RavokBadEnding.prepare(options);env.RavokArrest.prepare(options);
 for(let i=0;i<100;i++){
  env.RavokBadEnding.draw(g,'RAVOK_BOARD',i/99,i/99*3.4);
  env.RavokArrest.draw(g,'K7_EVIDENCE',i/99,i/99*2.5);
  env.RavokArrest.draw(g,'RAVOK_ESCORT',i/99,i/99*2.8);
 }
 for(const id of ['ravok','k7']){const actorPoses=poses.filter(p=>p.id===id);assert.ok(actorPoses.some(p=>p.state==='WALK'));assert.ok(actorPoses.some(p=>p.state==='IDLE'&&p.x===368&&p.y===89));for(const p of actorPoses)assert.equal(p.scaleX,a.settings[id].scale);}
});
