const test=require('node:test'),assert=require('node:assert/strict');
const {Crowd,drawArchitecture,BAND_TOP,BAND_BOTTOM}=require('./basketball_crowd.js');
function tick(c,seconds,hz=60,match={phase:'PLAYING',clock:30,score:{zorp:0,master:0}}){
    for(let i=0;i<seconds*hz;i++)c.update(1/hz,match);
}
test('66 varied spectators in three rows, with independent phase and delay',()=>{
    const c=new Crowd();assert.equal(c.people.length,66);
    for(let r=0;r<3;r++)assert.equal(c.people.filter(p=>p.row===r).length,22);
    for(const key of ['height','hair','shirt','body','style'])assert.ok(new Set(c.people.map(p=>p[key])).size>=3,key);
    assert.deepEqual([...new Set(c.people.map(p=>p.species))].sort(),['ALIEN','HUMAN']);
    assert.equal(new Set(c.people.map(p=>p.phase)).size,66);
    assert.equal(new Set(c.people.map(p=>p.delay)).size,66);
    assert.ok(c.people.every(p=>p.footY<=180&&p.footY-p.height-5>BAND_TOP));
});
test('layout is deterministic without consuming gameplay randomness',()=>{
    const original=Math.random;Math.random=()=>{throw Error('crowd consumed match RNG');};
    try{assert.deepEqual(new Crowd().people,new Crowd().people);}finally{Math.random=original;}
});
test('ordinary basket, three and Swoosh have increasing physical celebration amplitude',()=>{
    const powers=[];
    for(const details of [{points:2},{points:3},{points:2,swoosh:true}]){
        const c=new Crowd();c.react('BASKET','zorp',details);tick(c,.5);
        powers.push(c.people.filter(p=>p.affiliation==='zorp').reduce((s,p)=>s+c.poseFor(p).power,0));
    }
    assert.ok(powers[0]<powers[1]&&powers[1]<powers[2]);
});
test('both sides celebrate their own scorer more strongly',()=>{
    for(const side of ['zorp','master']){
        const c=new Crowd();c.react('BASKET',side,{points:3});tick(c,.5);
        const average=group=>{const people=c.people.filter(p=>p.affiliation===group);return people.reduce((s,p)=>s+c.poseFor(p).power,0)/people.length;};
        assert.ok(average(side)>average(side==='zorp'?'master':'zorp')*2);
    }
});
test('all visual events are recognized; late baskets and lead changes carry stronger reactions',()=>{
    const c=new Crowd();for(const type of ['RIM','STEAL','BLOCK','VICTORY'])assert.equal(c.react(type,'master'),true);
    c.react('BASKET','zorp',{points:2,comeback:true});assert.equal(c.snapshot().state,'COMEBACK');
    c.react('BASKET','master',{points:3,swoosh:true,late:true});assert.equal(c.snapshot().state,'CLUTCH');
});
test('rim anticipation is throttled instead of retriggering every contact substep',()=>{
    const c=new Crowd();assert.ok(c.react('RIM'));assert.equal(c.react('RIM'),false);
    tick(c,.5);assert.ok(c.react('RIM'));assert.equal(c.snapshot().counts.RIM,2);
});
for(const hz of [30,60,120,144])test(`tension and reactions use seconds at ${hz} Hz`,()=>{
    const c=new Crowd();c.react('BASKET','zorp',{points:2});
    tick(c,1,hz,{phase:'PLAYING',clock:7,score:{zorp:13,master:11}});
    assert.ok(Math.abs(c.time-1)<1e-7);assert.ok(c.tension>.6&&c.tension<.63);
    assert.equal(c.snapshot().state,'BASKET');
    tick(c,3,hz,{phase:'RESULT',clock:0,score:{zorp:13,master:11}});
    assert.equal(c.events.length,0);assert.ok(c.tension<.001);
});
test('only close late games build tension',()=>{
    for(const match of [{phase:'PLAYING',clock:11,score:{zorp:0,master:1}},
        {phase:'PLAYING',clock:5,score:{zorp:10,master:1}},
        {phase:'READY',clock:5,score:{zorp:1,master:1}}]){
        const c=new Crowd();tick(c,2,60,match);assert.equal(c.tension,0);
    }
});
test('idle animation is subtle, varied, and changes without events',()=>{
    const c=new Crowd();const before=c.people.map(p=>({...c.poseFor(p)}));tick(c,.75);
    const after=c.people.map(p=>({...c.poseFor(p)}));assert.notDeepEqual(before,after);
    assert.ok(after.every(p=>Math.abs(p.sway)<=1&&p.bounce<=1));
    assert.ok(new Set(after.map(p=>p.pose)).size>1);
});
test('events and confetti are bounded and expire, including while on the result screen',()=>{
    const c=new Crowd();for(let i=0;i<40;i++)c.react('BLOCK','master');
    assert.equal(c.events.length,8);c.react('VICTORY','zorp');assert.equal(c.confetti.length,28);
    tick(c,6,60,{phase:'RESULT',clock:0,score:{zorp:3,master:0}});
    assert.equal(c.events.length,0);assert.equal(c.confetti.length,0);
});
test('reset clears the celebration without changing the spectator appearance',()=>{
    const identity=c=>JSON.stringify(c.people.map(({motion,...appearance})=>appearance));
    const c=new Crowd(),people=identity(c);c.react('VICTORY','master');tick(c,.5);c.reset();
    assert.equal(c.time,0);assert.equal(c.tension,0);assert.equal(c.snapshot().state,'IDLE');
    assert.equal(c.confetti.length,0);assert.deepEqual(c.counts,{});assert.equal(identity(c),people);
});
test('the old PNG audience band is never sampled; remaining court geometry keeps the original mapping',()=>{
    const calls=[],ctx={save(){},restore(){},fillRect(){},drawImage(...args){calls.push(args);}},image={naturalWidth:1672,naturalHeight:941};
    drawArchitecture(ctx,image);assert.equal(calls.length,4);assert.equal(ctx.imageSmoothingEnabled,false);
    const top=calls[0],bottom=calls[3];
    assert.equal(top.length,9);assert.equal(bottom.length,9);
    assert.ok(Math.abs(top[2]+top[4]-941*BAND_TOP/300)<1e-7);
    assert.ok(bottom[2]>=941*BAND_BOTTOM/300);
    assert.equal(top[6]+top[8],BAND_TOP);assert.equal(bottom[6],BAND_BOTTOM);
    assert.equal(bottom[6]+bottom[8],300);
    for(const call of calls){
        const [image,sx,sy,sw,sh]=call;
        assert.ok(sx+sw<=1672*.3+.0001||sx>=1672*.7-.0001||sy>=941*78/300-.0001,'old PNG scoreboard never sampled');
    }
});
test('spectators use integer rectangles under a stand-only clip, without images or changes to physics',()=>{
    const fills=[],clips=[],ctx={save(){},restore(){},beginPath(){},rect(...a){clips.push(a);},clip(){},
        fillRect(...a){fills.push(a);}};
    const c=new Crowd();c.react('VICTORY','zorp');tick(c,.5);c.draw(ctx);
    assert.equal(ctx.imageSmoothingEnabled,false);assert.deepEqual(clips,[[0,95,450,91]]);
    assert.ok(fills.length>500&&fills.length<2500);assert.ok(fills.every(a=>a.every(Number.isInteger)));
    assert.ok(c.people.every(p=>!('hitbox' in p)&&!('collider' in p)));
});
test('only humans and aliens, with distinct fixed visual identities and no animal/robot category',()=>{
    const c=new Crowd(),humans=c.people.filter(p=>p.species==='HUMAN'),aliens=c.people.filter(p=>p.species==='ALIEN');
    assert.equal(humans.length,30);assert.equal(aliens.length,36);
    assert.ok(humans.every(p=>p.antennae===0&&p.eyes==='HUMAN'));
    assert.ok(aliens.every(p=>p.antennae===1||p.antennae===2));
    assert.equal(new Set(humans.map(p=>p.hairStyle)).size,5);
    assert.ok(humans.some(p=>p.accessory==='CAP'));assert.ok(humans.some(p=>p.accessory==='HEADBAND'));
    assert.equal(new Set(aliens.map(p=>p.headShape)).size,3);assert.equal(new Set(aliens.map(p=>p.eyes)).size,3);
});
test('appearance, seats and geometry persist throughout a complete match simulation',()=>{
    const c=new Crowd(),identity=()=>JSON.stringify(c.people.map(({motion,...data})=>data));
    const before=identity(),geometry=c.standGeometry,people=c.people.slice(),motion=c.people.map(p=>p.motion);
    for(let i=0;i<3600;i++){
        c.update(1/60,{phase:'PLAYING',clock:60-i/60,score:{zorp:12,master:13}});
        for(const p of c.people)c.poseFor(p);
    }
    assert.equal(identity(),before);assert.equal(c.standGeometry,geometry);
    assert.ok(c.people.every((p,i)=>p===people[i]&&p.motion===motion[i]));
});
test('repeated rim contacts increase apprehension, not a premature celebration',()=>{
    const c=new Crowd();for(let i=0;i<4;i++){c.react('RIM','zorp');tick(c,.4);}
    assert.equal(c.rimStreak,4);
    assert.ok(c.people.filter(p=>p.affiliation==='zorp').some(p=>c.poseFor(p).pose==='LEAN'));
});
test('close final seconds make more fans stand; neutral fans favor spectacular plays',()=>{
    const c=new Crowd(),rest=c.snapshot().standing;
    tick(c,2,60,{phase:'PLAYING',clock:3,score:{zorp:12,master:13}});
    assert.ok(c.snapshot().standing>rest+20);
    const normal=new Crowd(),spectacular=new Crowd();normal.react('BASKET','zorp',{points:2});spectacular.react('BASKET','zorp',{points:2,swoosh:true});
    tick(normal,.5);tick(spectacular,.5);
    const sum=c=>c.people.filter(p=>p.affiliation==='neutral').reduce((n,p)=>n+c.poseFor(p).power,0);
    assert.ok(sum(spectacular)>sum(normal)*3);
});
test('a comfortable lead still makes more spectators stand near the end, with less agitation than a close match',()=>{
    const c=new Crowd(),rest=c.snapshot().standing;
    tick(c,2,60,{phase:'PLAYING',clock:2,score:{zorp:20,master:5}});
    assert.ok(c.snapshot().standing>rest+10);assert.equal(c.tension,0);
});
