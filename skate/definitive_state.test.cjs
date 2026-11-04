const test=require('node:test'),assert=require('node:assert/strict');
const physics=require('./ollie_physics.js'),traversal=require('./traversal_system.js'),parser=require('./space_input_parser.js');
const {COURSE}=require('./course.js');const dt=1/120;
function rig(rail){const sim=physics.createSimulation({obstacle:null,obstacles:[],ramps:[],groundSegments:[],startX:rail.grindPath[0].x+25,failY:2000});const p=sim.state.player,c=traversal.createController();Object.assign(p,{grounded:false,y:traversal.sampleRail(rail,p.x).y-2,verticalVelocity:0,airJumpsUsed:0});
 return {sim,p,c,rail,step(held,airJump=false){const prev=p.x,ground=p.grounded;sim.step({spaceHeld:held,airJump},dt);return c.update({player:p,previousX:prev,previousGrounded:ground,input:{held,released:!held},rails:[rail],forwardSpeed:p.forwardSpeed,dtSeconds:dt,simulation:sim});}};}
test('1: ground -> first jump -> new press after 400ms -> double jump -> landing resets allowance',()=>{
 const s=physics.createSimulation({obstacle:null,obstacles:[]});s.step({spacePressed:true},dt);for(let i=0;i<48;i++)s.step({spaceHeld:true},dt);
 assert.equal(s.state.player.airJumpsUsed,0);assert.equal(s.doubleJump(),true);assert.equal(s.state.player.airJumpsUsed,1);assert.equal(s.doubleJump(),false);
 for(let i=0;i<500&&!s.state.player.grounded;i++)s.step({},dt);assert.equal(s.state.player.grounded,true);assert.equal(s.state.player.airJumpsUsed,0);
});
for(const id of ['first-rail','stair-handrail'])test('2/4: actual '+id+' -> exit -> regrind same rail four times without ground',()=>{
 const rail=COURSE.rails.find(r=>r.id===id);assert.ok(rail);const r=rig(rail);assert.ok(r.step(true).some(e=>e.type==='GRIND_ENTER'));
 for(let n=0;n<3;n++){for(let settle=0;settle<14;settle++)r.step(true);assert.ok(r.step(false).some(e=>e.type==='GRIND_OLLIE_OUT'));assert.equal(r.c.mode,'AIR');assert.ok(r.step(true).some(e=>e.type==='GRIND_ENTER'));assert.equal(r.c.activeRail.id,id);assert.equal(r.p.grounded,false);assert.equal(r.p.airJumpsUsed,0);}
});
test('3: grind -> exit -> double jump -> same rail recapture; air jump remains used',()=>{
 const r=rig({id:'long',grindPath:[{x:0,y:150},{x:2000,y:150}]});r.step(true);r.step(false);for(let i=0;i<20;i++)r.step(false);
 r.step(true,true);assert.equal(r.p.airJumpsUsed,1);let entry=false;for(let i=0;i<300&&!entry;i++)entry=r.step(true).some(e=>e.type==='GRIND_ENTER');assert.ok(entry);assert.equal(r.c.activeRail.id,'long');assert.equal(r.p.airJumpsUsed,1);
});
test('5: beyond the rail endpoint cannot capture; no held input and ground cannot capture',()=>{
 const rail={id:'A',grindPath:[{x:0,y:150},{x:100,y:110}]};for(const p of [{x:135,y:96,grounded:false,verticalVelocity:0},{x:50,y:130,grounded:true,verticalVelocity:0}])assert.equal(traversal.canStartGrind(p,rail,{held:true},230),false);
 assert.equal(traversal.canStartGrind({x:50,y:130,grounded:false,verticalVelocity:0},rail,{held:false},230),false);
});
test('new press is distinct from hold; rail capture preserves the available air jump',()=>{
 const p=parser.createParser();p.keyDown(0,'GROUND');assert.deepEqual(p.keyDown(400,'AIR'),[]);p.keyUp(410);assert.equal(p.keyDown(700,'AIR',{airJumpsUsed:0})[0].type,'DOUBLE_JUMP');p.keyUp(720);assert.equal(p.keyDown(800,'AIR',{airJumpsUsed:1,grindCapturable:true})[0].type,'GRIND_CAPTURE_PRESS');
});
