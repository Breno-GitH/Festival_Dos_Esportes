const test=require('node:test'),assert=require('node:assert/strict');
const {Scoreboard}=require('./basketball_scoreboard.js');
const match=()=>({clock:60,score:{zorp:0,master:0},phase:'PLAYING',overtime:false});
test('panel reads the actual match values, rounding only the displayed seconds',()=>{
    const m=match(),b=new Scoreboard();m.score={zorp:8,master:6};m.clock=36.2;b.update(.016,m);
    assert.deepEqual([b.snapshot(m).zorp,b.snapshot(m).master,b.snapshot(m).timeText],[8,6,'37']);
    m.clock=35.9;m.score.master=9;
    assert.equal(b.snapshot(m).timeText,'36');assert.equal(b.snapshot(m).master,9);
});
test('presentation timers cannot run a second clock, change score or mutate the match',()=>{
    const m=match(),before=JSON.stringify(m),b=new Scoreboard();
    for(let i=0;i<600;i++)b.update(1/60,m);
    assert.equal(JSON.stringify(m),before);assert.equal(b.snapshot(m).timeText,'60');
});
test('timer freezes at 00 after the real match reaches RESULT',()=>{
    const m=match(),b=new Scoreboard();m.clock=0;m.phase='RESULT';b.update(.01,m);
    for(let i=0;i<600;i++)b.update(1/60,m);
    assert.equal(b.snapshot(m).timeText,'00');assert.equal(b.snapshot(m).frozen,true);
    assert.equal(b.snapshot(m).message,'FIM');assert.equal(m.clock,0);
});
test('10–6 pulse, 5–1 attention flash and result state are separated',()=>{
    const m=match(),b=new Scoreboard();
    for(const [clock,warning] of [[10.1,'NORMAL'],[10,'PULSE'],[6,'PULSE'],[5,'FLASH'],[1,'FLASH']]){
        m.clock=clock;b.update(.1,m);assert.equal(b.snapshot(m).warning,warning);
    }
    m.clock=0;m.phase='RESULT';assert.equal(b.snapshot(m).warning,'FINAL');
});
test('event message expires while the actual score/time remain available',()=>{
    const m=match(),b=new Scoreboard();m.score.zorp=3;
    const event={kind:'THREE',side:'zorp'};b.update(.01,m,event);
    assert.equal(b.snapshot(m).message,'3 PONTOS');assert.equal(b.snapshot(m).zorp,3);
    b.update(2,m,event);assert.equal(b.snapshot(m).message,'ILHA DOS CAMPEOES');
    assert.equal(b.snapshot(m).timeText,'60');
});
test('each crowd event is consumed once, and lower priority messages cannot hide a basket',()=>{
    const m=match(),b=new Scoreboard(),e={kind:'SWOOSH',side:'master'};
    b.update(.01,m,e);b.update(.2,m,e);assert.equal(b.message.until,1.91);
    m.clock=10;b.update(.01,m,e);assert.equal(b.snapshot(m).message,'SWOOSH!');
    b.update(.01,m,{kind:'STEAL',side:'zorp'});assert.equal(b.snapshot(m).message,'SWOOSH!');
});
test('scores briefly pop on the correct side without modifying the other side',()=>{
    const m=match(),b=new Scoreboard();b.update(.01,m);m.score.master=2;b.update(.01,m);
    assert.equal(b.pop.master,.24);assert.equal(b.pop.zorp,0);
    b.update(.3,m);assert.equal(b.pop.master,0);m.score.zorp=3;b.update(.01,m);assert.equal(b.pop.zorp,.24);
});
test('overtime uses the existing new match-clock value and can warn again',()=>{
    const m=match(),b=new Scoreboard();m.clock=9;b.update(.1,m);assert.equal(b.alertedTen,true);
    m.overtime=true;m.clock=15;b.update(.1,m);assert.equal(b.alertedTen,false);assert.equal(b.snapshot(m).timeText,'15');
    b.update(2,m);m.clock=10;b.update(.1,m);assert.equal(b.snapshot(m).message,'ULTIMOS 10');
});
test('reset clears visual timers and notifications only',()=>{
    const m=match(),b=new Scoreboard();b.update(.1,m,{kind:'VICTORY',side:'zorp'});b.reset();
    assert.equal(b.time,0);assert.equal(b.message,null);assert.equal(b.consumedEvent,null);
    assert.equal(b.snapshot(m).timeText,'60');
});
test('all scoreboard drawing is integer pixel geometry and timer digits never blink off',()=>{
    const m=match(),b=new Scoreboard();m.clock=3;
    const samples=[];
    for(const time of [0,.2,.5]){
        const fills=[],ctx={save(){},restore(){},fillRect(...args){fills.push({args,color:this.fillStyle});}};
        b.time=time;b.draw(ctx,m);
        assert.equal(ctx.imageSmoothingEnabled,false);
        assert.ok(fills.every(r=>r.args.every(Number.isInteger)));
        assert.ok(fills.every(r=>r.args[0]>=0&&r.args[1]>=0&&r.args[0]+r.args[2]<=450&&r.args[1]+r.args[3]<=95));
        samples.push(fills.filter(r=>r.color==='#f3d29a').length);
    }
    assert.ok(samples[0]>20);assert.equal(samples[0],samples[1]);assert.equal(samples[1],samples[2]);
});
