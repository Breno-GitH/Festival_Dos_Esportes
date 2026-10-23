const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./basketball_hoop_physics.js');
const hoops={left:p.createHoop('left',60),right:p.createHoop('right',390)};
function ball(seed={},side='right') {
    const h=hoops[side];
    const b={x:h.rimX,y:h.rimY-43.4,vx:0,vy:1,owner:null,state:'SHOT',
        target:side,shooter:side==='right'?'zorp':'master',shotId:1,angularVelocity:.3,...seed};
    p.resetShot(b);return b;
}
function simulate(b,{fps=60,seconds=3,untilScore=false}={}) {
    const hits=[],scores=[];
    for(let n=0;n<fps*seconds;n++){
        p.advance(b,hoops,60/fps,{onContact:e=>{hits.push(e);b.state='REBOUND'},onScore:e=>scores.push(e)});
        assert.ok([b.x,b.y,b.vx,b.vy].every(Number.isFinite));
        if(untilScore&&b.basketScored)break;
    }
    return {b,hits,scores};
}
for(const side of ['left','right']) for(const fps of [30,60,120,144]) {
    test(`${side}: real downward Swoosh at ${fps} Hz, with no double score`,()=>{
        const r=simulate(ball({},side),{fps});
        assert.equal(r.scores.length,1);assert.equal(r.scores[0].kind,'SWOOSH');
        assert.equal(r.hits.length,0);assert.equal(r.b.wasAboveRim,true);
        assert.equal(r.b.crossedRimPlane,true);assert.equal(r.b.basketScored,true);
        assert.equal(r.b.scoreCrossing.y,hoops[side].rimY);
        assert.ok(r.b.scoreCrossing.vy>0);
    });
}
const h=hoops.right;
for(const [name,offset,seed] of [['rim',43,{y:108,vx:-1,vy:-2}],['board',40,{y:105,vx:-1.5,vy:0}]]) {
    test(`left hoop: ${name} contact can still produce a normal basket`,()=>{
        const r=simulate(ball({x:hoops.left.rimX+offset,...seed},'left'),{untilScore:true});
        assert.equal(r.scores.length,1);assert.equal(r.b.scoreKind,'NORMAL');
        assert.equal(name==='rim'?r.b.rimTouched:r.b.backboardTouched,true);
    });
}
for(const fps of [30,60,120,144]) {
    test(`rim-in and bank-in remain normal baskets at ${fps} Hz`,()=>{
        const rim=simulate(ball({x:h.rimX-43,y:108,vx:1,vy:-2}),{fps,untilScore:true});
        assert.equal(rim.scores.length,1);assert.equal(rim.b.scoreKind,'NORMAL');assert.equal(rim.b.rimTouched,true);
        const bank=simulate(ball({x:h.rimX-40,y:105,vx:1.5,vy:0}),{fps,untilScore:true});
        assert.equal(bank.scores.length,1);assert.equal(bank.b.scoreKind,'NORMAL');assert.equal(bank.b.backboardTouched,true);
    });
}
for(const [name,seed] of Object.entries({
    'rim out':{x:h.rimX-45,y:100,vx:.5,vy:-2},
    'wide of hoop':{x:h.rimX-45,y:160,vx:0,vy:2},
    'up through hoop then down':{x:h.rimX,y:220,vx:0,vy:-6},
    'net only':{x:h.rimX,y:216,vx:0,vy:2},
    'external side':{x:h.rimX-25,y:h.rimY,vx:3,vy:0},
    'starts at plane with no above history':{x:h.rimX,y:h.rimY,vx:0,vy:2}
})) test(`${name}: no score`,()=>{
    const r=simulate(ball(seed));assert.equal(r.scores.length,0,name);assert.equal(r.b.basketScored,false);
    if(name.startsWith('up'))assert.equal(r.b.enteredRimFromBelow,true);
});
test('crossing X, not the frame-end X, decides a fast diagonal shot',()=>{
    const valid=ball({x:h.rimX-12,y:h.rimY-20,vx:24,vy:40});
    const r=simulate(valid,{fps:30,seconds:1/30});
    assert.equal(r.scores.length,1);
    assert.ok(Math.abs(r.b.scoreCrossing.x-h.rimX)<.1);
    const opening=p.validOpening(h,r.b);
    assert.ok(r.b.x<opening.left || r.b.x>opening.right);
    const invalid=ball({x:h.rimX-40,y:h.rimY-8,vx:40,vy:16});
    const miss=simulate(invalid,{fps:60,seconds:1/60});
    assert.equal(miss.scores.length,0);
});
test('continuous circles/capsule collide even at high speed',()=>{
    const rim=p.circleHit({x:300,y:188.4},{x:100,y:0},h.rimLeft,10.4);
    assert.ok(rim&&rim.t>0&&rim.t<1);
    const board=p.capsuleHit({x:330,y:160},{x:80,y:0},h.backboard.a,h.backboard.b,10.1);
    assert.ok(board&&board.t>0&&board.t<1);
});
test('overlap at the metal center resolves to a finite physical position',()=>{
    const b=ball({x:h.rimLeft.x,y:h.rimY,vx:0,vy:0});
    const r=simulate(b,{seconds:.1});
    assert.ok(Math.hypot(b.x-h.rimLeft.x,b.y-h.rimY)>=10.39);
    assert.equal(r.scores.length,0);
});
test('repeated rim/board bounces can score only once; reset requires a new play',()=>{
    const b=ball({x:h.rimX-45,y:100,vx:1,vy:-2});const r=simulate(b,{seconds:5});
    assert.ok(r.hits.length>=2);assert.equal(r.scores.length,1);assert.equal(b.scoreKind,'NORMAL');
    const again=simulate(b,{seconds:1});assert.equal(again.scores.length,0);
    b.shotId++;p.resetShot(b);assert.equal(b.basketScored,false);assert.equal(b.crossedRimPlane,false);
});
test('a score sensor does not alter physical velocity or angular velocity',()=>{
    const b=ball({y:145,vx:0,vy:1});let velocityAtScore;
    for(let n=0;n<200&&!b.basketScored;n++){
        const vy=b.vy;
        p.advance(b,hoops,.25,{onScore:()=>{velocityAtScore=b.vy}});
        assert.ok(Math.abs(b.vy-(vy+.21*.25))<1e-8);
    }
    assert.ok(velocityAtScore>0);assert.equal(b.angularVelocity,.3);
});
test('possession, unowned loose balls and the wrong basket cannot manufacture points',()=>{
    for(const seed of [{owner:'zorp'},{shooter:null},{state:'FREE'},{target:'left'}]){
        const r=simulate(ball(seed));assert.equal(r.scores.length,0);
    }
});
test('restitution reflects the normal velocity without generating kinetic energy',()=>{
    const b=ball({x:h.rimLeft.x,y:150,vx:0,vy:20});
    p.advance(b,hoops,2,{gravity:0});
    assert.ok(Math.abs(b.vy+13)<1e-5);assert.equal(b.vx,0);
    assert.ok(b.angularVelocity>0&&b.angularVelocity<=.3);
    const bank=ball({x:330,y:160,vx:30,vy:0});
    p.advance(bank,hoops,2,{gravity:0});
    assert.ok(bank.backboardTouched);assert.ok(Math.hypot(bank.vx,bank.vy)<=30);
});
test('500 varied physical flights: finite results and every score has a valid downward crossing',()=>{
    let randomState=7218;
    const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
    for(let k=0;k<500;k++){
        const b=ball({x:310+random()*80,y:100+random()*130,vx:(random()-.5)*40,vy:(random()-.5)*40});
        const r=simulate(b,{fps:[30,60,120,144][k%4],seconds:1.5});
        assert.ok(r.scores.length<=1);
        for(const event of r.scores){
            const opening=p.validOpening(event.hoop,b);
            assert.ok(event.crossing.vy>0);
            assert.ok(event.crossing.x>opening.left&&event.crossing.x<opening.right);
            assert.equal(b.enteredRimFromBelow,false);
        }
    }
});
