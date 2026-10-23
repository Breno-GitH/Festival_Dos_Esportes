const test=require('node:test'),assert=require('node:assert/strict');
const {Controller}=require('./pre_game_brief.js'),configs=require('./pre_game_brief_configs.js');
const key=(value,repeat=false)=>({key:value,repeat,preventDefault(){this.prevented=true;}});
function setup(heldKeys=[]){
    const b=new Controller(()=>0),calls={start:0,cancel:0,clear:0};
    b.open(configs.pingpong,{heldKeys,onStart:()=>calls.start++,onCancel:()=>calls.cancel++,clearInput:()=>calls.clear++});
    return {b,calls};
}
test('all eight sports share one short configuration contract',()=>{
    assert.deepEqual(Object.keys(configs),['pingpong','basketball','marathon','skate','archery','climbing','boxing','surf']);
    for(const [id,config] of Object.entries(configs)){
        assert.equal(config.id,id);
        assert.ok(config.title&&config.subtitle&&config.objective&&config.tip);
        assert.ok(config.controls.length>=2&&config.controls.length<=3);
        assert.ok(config.controls.every(control=>control.keys&&control.action));
    }
    const b=new Controller(()=>0);assert.ok(b.open({title:'Outra competição',objective:'Objetivo curto',controls:[],accent:'#ffcc77'}));
    assert.equal(b.config.icon,'medal');assert.equal(b.config.accent,'#ffcc77');
});
test('inactive controller does not intercept normal gameplay',()=>{
    const b=new Controller(()=>0);assert.equal(b.handleKeyDown(key('w')),false);assert.equal(b.active,false);
});
test('briefing remains open indefinitely and never starts from its animation clock',()=>{
    const {b,calls}=setup();b.update(.18);assert.equal(b.state,'READY');
    b.update(120);assert.equal(b.active,true);assert.equal(calls.start,0);assert.equal(calls.cancel,0);
});
for(const button of [' ','Enter'])test(`${button===' '?'Space':'Enter'} confirms once after the short exit transition`,()=>{
    const {b,calls}=setup();b.update(.18);assert.ok(b.handleKeyDown(key(button)));assert.equal(b.state,'CLOSING');
    assert.equal(calls.start,0);b.update(.1);assert.equal(calls.start,0);
    b.update(.02);assert.equal(calls.start,1);assert.equal(b.active,false);b.update(20);assert.equal(calls.start,1);
});
test('Escape cancels without triggering the start callback',()=>{
    const {b,calls}=setup();b.update(.2);b.handleKeyDown(key('Escape'));b.update(.13);
    assert.equal(calls.cancel,1);assert.equal(calls.start,0);assert.equal(b.active,false);
});
test('opening with the NPC interaction key held cannot confirm until release and a fresh press',()=>{
    const {b,calls}=setup(['space']);b.update(.2);
    b.handleKeyDown(key(' ',true));b.handleKeyDown(key(' '));b.update(1);
    assert.equal(b.state,'READY');assert.equal(calls.start,0);
    b.handleKeyUp(key(' '));b.handleKeyDown(key(' '));b.update(.13);assert.equal(calls.start,1);
});
test('repeated keydown never confirms',()=>{
    const {b,calls}=setup();b.update(.2);b.handleKeyDown(key('Enter',true));b.update(1);
    assert.equal(calls.start,0);assert.equal(b.state,'READY');
});
test('confirming and movement keys do not leak into gameplay while held',()=>{
    const {b}=setup();b.update(.2);b.handleKeyDown(key('w'));b.handleKeyDown(key(' '));b.update(.13);
    assert.ok(b.handleKeyDown(key(' ',true)));assert.ok(b.handleKeyDown(key('w',true)));
    b.handleKeyUp(key(' '));b.handleKeyUp(key('w'));
    assert.equal(b.handleKeyDown(key(' ')),false);assert.equal(b.handleKeyDown(key('w')),false);
});
test('lost focus releases stale held-key guards',()=>{
    const {b}=setup();b.update(.2);b.handleKeyDown(key(' '));b.update(.13);b.releaseAll();
    assert.equal(b.handleKeyDown(key('w')),false);assert.equal(b.handleKeyDown(key(' ')),false);
});
test('all inputs are consumed while a briefing is open',()=>{
    const {b}=setup();for(const name of ['w','a','s','d','j','k','l','e']){
        const e=key(name);assert.ok(b.handleKeyDown(e));assert.ok(e.prevented);
    }
});
test('active briefing stops propagation to minigame-specific listeners',()=>{
    const {b}=setup();b.update(.2);
    const event=key(' ');event.stopImmediatePropagation=()=>event.stopped=true;
    assert.ok(b.handleKeyDown(event));assert.ok(event.prevented);assert.ok(event.stopped);
    const release=key(' ');release.stopImmediatePropagation=()=>release.stopped=true;
    assert.ok(b.handleKeyUp(release));assert.ok(release.prevented);assert.ok(release.stopped);
});
test('opening another briefing cannot silently replace an active one',()=>{
    const {b}=setup();assert.equal(b.open({title:'Other',objective:'X',controls:[]}),false);
    assert.equal(b.config.id,'pingpong');
});
test('cancel is optional for sports without a return route',()=>{
    const b=new Controller(()=>0);b.open(configs.pingpong,{onStart(){}});b.update(.2);
    b.handleKeyDown(key('Escape'));assert.equal(b.state,'READY');
});
test('fade, layout, essential controls and icon render through the same Canvas component',()=>{
    const text=[],rects=[],ctx={save(){},restore(){},fillRect(...a){rects.push(a);},
        fillText(t,x,y){text.push({t,x,y,font:this.font});},measureText(t){return {width:t.length*6};}};
    const {b}=setup();b.update(.18);b.draw(ctx);
    assert.equal(ctx.imageSmoothingEnabled,false);assert.ok(rects.every(a=>a.every(Number.isInteger)));
    for(const item of ['PING-PONG','OBJETIVO','CONTROLES','DICA','[ESPAÇO / ENTER]  COMEÇAR'])assert.ok(text.some(v=>v.t===item),item);
    assert.ok(text.some(v=>v.t==='W / S'));assert.ok(text.some(v=>v.t==='A / D'));
    assert.ok(text.every(v=>v.x>=34&&v.x<=416&&v.y>=12&&v.y<288));
});
test('every sport renders inside the same fixed card without truncated instructional text',()=>{
    for(const config of Object.values(configs)){
        const text=[],ctx={save(){},restore(){},fillRect(){},beginPath(){},arc(){},ellipse(){},stroke(){},
            fillText(t,x,y){text.push({t,x,y});},measureText(t){return {width:t.length*5};}};
        const b=new Controller(()=>0);b.open(config,{});b.update(.18);b.draw(ctx);
        assert.ok(text.some(item=>item.t===config.title.toUpperCase()),config.id);
        assert.ok(text.every(item=>!item.t.endsWith('…')),config.id+' truncated');
        assert.ok(text.every(item=>item.x>=34&&item.x<=416&&item.y>=12&&item.y<288),config.id+' bounds');
    }
});
test('configuration validates essentials and bounds tutorial size',()=>{
    const b=new Controller(()=>0);assert.throws(()=>b.open({}),TypeError);
    assert.throws(()=>b.open({title:'X',objective:'X',controls:[1,2,3,4]}),TypeError);
});
for(const hz of [30,60,144])test(`animation uses deltaTime at ${hz} Hz`,()=>{
    const {b,calls}=setup();for(let i=0;i<Math.ceil(.2*hz);i++)b.update(1/hz);assert.equal(b.state,'READY');
    b.handleKeyDown(key('Enter'));for(let i=0;i<Math.ceil(.14*hz);i++)b.update(1/hz);
    assert.equal(calls.start,1);assert.equal(b.active,false);
});
for(const hz of [30,60,144])test(`countdown keeps simulation/input gated until VAI finishes at ${hz} Hz`,()=>{
    const b=new Controller(()=>0);let starts=0;
    b.open(configs.pingpong,{countdown:true,onStart:()=>starts++});b.update(.2);
    b.handleKeyDown(key(' '));b.handleKeyUp(key(' '));b.update(.12);
    assert.equal(b.state,'COUNTDOWN');assert.equal(b.snapshot().countdown,'3');
    const seen=new Set(['3']);
    for(let i=0;i<Math.floor(1.6*hz);i++){
        b.handleKeyDown(key('Enter'));b.handleKeyUp(key('Enter'));
        b.update(1/hz);if(b.snapshot().countdown)seen.add(b.snapshot().countdown);
        assert.equal(starts,0);assert.equal(b.active,true);
    }
    assert.deepEqual([...seen],['3','2','1','VAI!']);
    b.update(.1);assert.equal(starts,1);assert.equal(b.active,false);b.update(3);assert.equal(starts,1);
});
test('countdown is optional so Marathon can retain its own native countdown',()=>{
    const b=new Controller(()=>0);let starts=0;b.open(configs.marathon,{countdown:false,onStart:()=>starts++});
    b.update(.2);b.handleKeyDown(key('Enter'));b.update(.12);assert.equal(starts,1);assert.equal(b.active,false);
});
