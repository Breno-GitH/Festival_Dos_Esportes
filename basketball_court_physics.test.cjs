const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const H=require('./basketball_hoop_physics.js'),C=require('./basketball_court_physics.js');
const court=C.createCourt(),hoops=[H.createHoop('left',60),H.createHoop('right',390)];
function ball(x,y,vx=0,vy=0) {
    const b={x,y,vx,vy,owner:null,shooter:null,state:'FREE',shotId:7,pickupLock:0};
    H.resetShot(b);return b;
}
function run(b,seconds,hz=60,recovery=C.createRecovery()) {
    const actions=[];
    for(let i=0;i<Math.ceil(seconds*hz);i++) {
        H.advance(b,hoops,60/hz,{court,boundaryHit:C.boundaryHit});
        const before={x:b.x,y:b.y};
        const action=recovery.update(b,1/hz,court,hoops);
        if(action)actions.push({action,seconds:(i+1)/hz,before,after:{x:b.x,y:b.y}});
        assert.ok([b.x,b.y,b.vx,b.vy].every(Number.isFinite));
    }
    return {actions,state:recovery.snapshot()};
}
for(const hz of [30,60,120,144]) {
    for(const [name,x,y,vx,vy] of [
        ['lower-left',32,225,-4,4],['lower-right',418,225,4,4],
        ['upper-left',45,60,-4,-4],['upper-right',405,60,4,-4],
        ['legacy-left-pocket',9,250.2,0,0],['legacy-right-pocket',441,250.2,0,0],
        ['behind-left',33,202,-1,0],['behind-right',417,202,1,0]]) {
        test(`${name} escapes physically at ${hz} Hz`,()=>{
            const b=ball(x,y,vx,vy),r=run(b,10,hz);
            assert.ok(C.reachable(b,court),JSON.stringify(b));
            assert.equal(r.state.neutralResets,0);assert.equal(r.state.nudges,0);
            assert.ok(court.edges.every(e=>C.gap(b,e)>-.002));
        });
    }
    for(const [side,x] of [['left',69.6],['right',376.4]]) {
        test(`${side} balanced board cap gets a nudge after 2 s at ${hz} Hz`,()=>{
            const b=ball(x,140.3),r=run(b,10,hz);
            assert.equal(r.actions.length,1);assert.equal(r.actions[0].action,'NUDGE');
            assert.ok(Math.abs(r.actions[0].seconds-2)<.05);
            assert.deepEqual(r.actions[0].before,r.actions[0].after,'nudge changes only velocity');
            assert.ok(C.reachable(b,court));assert.equal(r.state.neutralResets,0);
            assert.equal(b.recoveryScoringBlocked,true);
        });
    }
}
test('a normal resting floor ball remains still: distance from current players is not a trap',()=>{
    const b=ball(225,250.2),r=run(b,12);
    assert.equal(r.actions.length,0);assert.ok(Math.abs(b.x-225)<.001);
    assert.ok(Math.abs(b.y-250.2)<.001);assert.equal(b.vx,0);assert.equal(b.vy,0);
});
test('wall minimum restitution acts only on contact, not proximity',()=>{
    const b=ball(26.8,120,-.01,0);
    H.advance(b,[],1,{court,boundaryHit:C.boundaryHit});
    assert.ok(b.vx>=1.24);
    const near=ball(29,120,0,0),r=run(near,.1);
    assert.equal(r.actions.length,0);assert.equal(near.x,29);
});
test('failsafe requires failed nudge, another 3 s stalled and blink, and restores a neutral loose ball',()=>{
    const b=ball(69.6,140.3);b.points=3;b.pickupLock=0;
    // Fault injection: simulate a failed rescue, keeping normal board physics.
    const r=C.createRecovery({nudgeX:0,nudgeY:0});
    const first=run(b,4.9,60,r);assert.equal(first.state.neutralResets,0);
    assert.equal(b.owner,null);assert.ok(Math.abs(b.x-69.6)<.01);
    const last=run(b,.6,60,r);
    assert.equal(last.state.neutralResets,1);assert.equal(b.owner,null);
    assert.equal(b.x,225);assert.equal(b.shotId,7);assert.equal(b.points,3);
    assert.equal(b.basketScored,false);assert.equal(b.pickupLock,36);
    assert.ok(last.actions.some(a=>a.action==='NEUTRAL_RESET'));
});
test('moving/possessed balls and post-basket reset never trigger recovery',()=>{
    for(const kind of ['moving','owned','scored']) {
        const b=ball(69.6,140.3),r=C.createRecovery();
        if(kind==='owned')b.owner='master';
        if(kind==='scored'){b.basketScored=true;b.scoreResetTimer=48;}
        if(kind==='moving'){b.vx=3;b.previousX=b.x-3;}
        for(let i=0;i<600;i++)r.update(b,1/60,court,hoops);
        assert.equal(r.snapshot().nudges,0);assert.equal(r.snapshot().neutralResets,0);
    }
});
test('rescue cannot manufacture a basket; a real new play clears the safety scoring block',()=>{
    const h=hoops[1],b=ball(h.rimX,145,0,1);
    Object.assign(b,{shooter:'zorp',target:'right',state:'SHOT',recoveryScoringBlocked:true});
    let scores=0;
    for(let i=0;i<40;i++)H.advance(b,hoops,1,{onScore:()=>scores++});
    assert.equal(scores,0);H.resetShot(b);assert.equal(b.recoveryScoringBlocked,false);
});
function runtime() {
    class Image {
        constructor(){this.complete=true;this.naturalWidth=this.naturalHeight=100;this.listeners={};}
        addEventListener(t,f){this.listeners[t]=f;}
        set src(v){queueMicrotask(()=>this.listeners.load?.());}
    }
    const path='basketball_assets/exported/basketball_assets_manifest.json';
    const window={BasketballHoopPhysics:H,BasketballCourtPhysics:C,BasketballCrowd:require('./basketball_crowd.js'),BasketballScoreboard:require('./basketball_scoreboard.js'),location:{search:''},addEventListener(){},
        FESTIVAL_LOCAL_MANIFESTS:{[path]:JSON.parse(fs.readFileSync(path,'utf8').replace(/^\uFEFF/,''))}};
    const context=vm.createContext({window,location:{protocol:'file:'},Image,URLSearchParams,performance:{now:()=>0},
        currentScene:'JOGO_BASQUETE',canvas:{width:450,height:300},console,keys:{}});
    vm.runInContext(fs.readFileSync('basketball_1v1.js','utf8'),context);
    return window.basketball1v1;
}
for(const [role,x] of [['player',54],['master',396]]) {
    test(`actual runtime: ${role} retrieves the ball at the outermost playable floor`,()=>{
        const g=runtime();g.player.x=150;g.master.x=300;g[role].x=x;
        Object.assign(g.ball,ball(x<225?51.7:398.3,250.2));
        g.updateFreeBall(1);assert.equal(g.ball.owner,g[role].id);
    });
}
test('actual runtime: safety does not reset score, clock, positions or special',()=>{
    const g=runtime();g.score.zorp=11;g.score.master=7;g.clock=38;
    g.player.special=63;g.master.special=28;const positions=[g.player.x,g.master.x];
    Object.assign(g.ball,ball(69.6,140.3));g.ball.pickupLock=600;
    g.ballRecovery=C.createRecovery({nudgeX:0,nudgeY:0});
    for(let i=0;i<330;i++)g.updateFreeBall(1);
    assert.equal(g.ballRecovery.snapshot().neutralResets,1);assert.equal(g.ball.owner,null);
    assert.equal(g.score.zorp,11);assert.equal(g.score.master,7);assert.equal(g.clock,38);
    assert.deepEqual([g.player.x,g.master.x],positions);
    assert.deepEqual([g.player.special,g.master.special],[63,28]);
});
test('actual runtime: master uses an ordinary jump to retrieve a reachable high loose ball',()=>{
    const g=runtime();g.master.x=200;
    Object.assign(g.ball,ball(200,170));g.master.decisionTimer=0;
    g.updateAI(1);assert.equal(g.master.grounded,false);assert.equal(g.master.vz,5.75);
});
test('286 resting initial positions around the court and both baskets all become reachable without a reset',()=>{
    for(let x=28;x<=422;x+=18)for(let y=56;y<=248;y+=16) {
        const b=ball(x,y),result=run(b,10);
        assert.ok(C.reachable(b,court),`unreachable from ${x},${y}`);
        assert.equal(result.state.neutralResets,0,`unexpected reset from ${x},${y}`);
    }
});
