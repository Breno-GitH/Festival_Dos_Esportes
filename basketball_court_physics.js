/* Court borders and last-resort loose-ball recovery. Velocities use 60 Hz ticks;
 * recovery timers use seconds. No possession, score or match-clock changes. */
(function (root, factory) {
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    if(root)root.BasketballCourtPhysics=api;
})(typeof globalThis==='object'?globalThis:this,function () {
    'use strict';
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function createCourt() {
        // Insets follow the playable floor. Lower bevels guide a resting ball
        // into the same area the actors can reach, instead of a square pocket.
        const vertices=[[42,42],[408,42],[432,66],[432,229],
            [402,259],[48,259],[18,229],[18,66]];
        const kinds=['CEILING','CORNER','WALL','CORNER','FLOOR','CORNER','WALL','CORNER'];
        const edges=vertices.map(([x,y],i)=>{
            const [bx,by]=vertices[(i+1)%vertices.length];
            const dx=bx-x,dy=by-y,length=Math.hypot(dx,dy);
            const kind=kinds[i];
            return {id:'court-'+i,a:{x,y},b:{x:bx,y:by},nx:-dy/length,ny:dx/length,
                kind,restitution:kind==='FLOOR'?.58:.65,
                friction:kind==='FLOOR'?.86:.995,
                minRebound:kind==='WALL'||kind==='CORNER'?1.25:0};
        });
        return {edges,left:54,right:396,groundY:259,centerX:225,
            handY:229,jumpHeight:5.75**2/(2*.38),groundReach:28,airReach:40};
    }
    function gap(ball,edge) {
        return (ball.x-edge.a.x)*edge.nx+(ball.y-edge.a.y)*edge.ny-(ball.radius??8.8);
    }
    function boundaryHit(p,d,edge,radius) {
        const distance=(p.x-edge.a.x)*edge.nx+(p.y-edge.a.y)*edge.ny-radius;
        const along=d.x*edge.nx+d.y*edge.ny;
        if(distance< -1e-7)return {t:0,nx:edge.nx,ny:edge.ny,depth:-distance};
        if(along>=-1e-9)return null;
        const t=-distance/along;
        return t>=0&&t<=1?{t,nx:edge.nx,ny:edge.ny,depth:0}:null;
    }
    function reachable(ball,court) {
        // Can either actor WALK/JUMP there? Current distance is not evidence
        // of being stuck: an ordinary loose ball may simply be far away.
        const dx=ball.x-clamp(ball.x,court.left,court.right);
        if(Math.hypot(dx,ball.y-court.handY)<court.groundReach)return true;
        const closestY=clamp(ball.y,court.handY-court.jumpHeight,court.handY);
        return Math.hypot(dx,ball.y-closestY)<court.airReach;
    }
    function nearObstacle(ball,court,hoops) {
        if(court.edges.some(e=>gap(ball,e)<12))return true;
        for(const hoop of Object.values(hoops)) {
            const {a,b,radius}=hoop.backboard,dx=b.x-a.x,dy=b.y-a.y;
            const t=clamp(((ball.x-a.x)*dx+(ball.y-a.y)*dy)/(dx*dx+dy*dy),0,1);
            if(Math.hypot(ball.x-a.x-t*dx,ball.y-a.y-t*dy)<(ball.radius??8.8)+radius+10)return true;
            if([hoop.rimLeft,hoop.rimRight].some(r=>Math.hypot(ball.x-r.x,ball.y-r.y)<(ball.radius??8.8)+r.radius+10))return true;
        }
        return false;
    }
    function createRecovery(settings={}) {
        const config={suspectSeconds:2,retrySeconds:3,blinkSeconds:.24,nudgeX:1.65,nudgeY:1.4,...settings};
        const state={stage:'NORMAL',suspect:0,blocked:0,blink:0,nudges:0,neutralResets:0,lastAction:null};
        function clearAttempt() {
            state.stage='NORMAL';state.suspect=state.blocked=state.blink=0;
        }
        function blockScore(ball) {
            // A rescue impulse must never turn a miss into a free basket.
            ball.recoveryScoringBlocked=true;ball.pendingBasket=null;
        }
        return {
            clearAttempt,
            snapshot:()=>({...state}),
            alpha:()=>state.stage==='BLINK'?(Math.floor(state.blink/.045)%2?.22:1):1,
            update(ball,seconds,court,hoops) {
                if(ball.owner!=null||ball.scoreResetTimer>0||ball.basketScored) {clearAttempt();return null;}
                const inaccessible=!reachable(ball,court);
                const speed=Math.hypot(ball.vx,ball.vy);
                const displacement=Math.hypot(ball.x-ball.previousX,ball.y-ball.previousY)/Math.max(seconds*60,.0001);
                const stalled=speed<.55&&displacement<.55;
                const suspect=inaccessible&&stalled&&nearObstacle(ball,court,hoops);
                if(!inaccessible) {clearAttempt();return null;}
                if(state.stage==='BLINK') {
                    // Cancel recovery if ordinary physics resumes meanwhile.
                    if(!stalled) {state.stage='NUDGED';state.blink=0;return null;}
                    state.blink+=seconds;
                    if(state.blink<config.blinkSeconds)return null;
                    blockScore(ball);
                    Object.assign(ball,{x:court.centerX,y:court.groundY-36,
                        previousX:court.centerX,previousY:court.groundY-36,
                        vx:0,vy:-.8,owner:null,state:'FREE',pickupLock:36});
                    state.neutralResets++;state.lastAction='NEUTRAL_RESET';clearAttempt();
                    return 'NEUTRAL_RESET';
                }
                if(state.stage==='NUDGED') {
                    state.blocked=suspect?state.blocked+seconds:0;
                    if(state.blocked>=config.retrySeconds) {state.stage='BLINK';state.blink=0;}
                    return null;
                }
                state.suspect=suspect?state.suspect+seconds:0;
                state.stage=state.suspect>0?'SUSPECT':'NORMAL';
                if(state.suspect<config.suspectSeconds)return null;
                blockScore(ball);
                ball.vx+=(Math.sign(court.centerX-ball.x)||1)*config.nudgeX;
                ball.vy-=config.nudgeY;ball.state='REBOUND';
                state.nudges++;state.lastAction='NUDGE';state.stage='NUDGED';state.suspect=0;
                return 'NUDGE';
            }
        };
    }
    function drawDebug(ctx,court) {
        ctx.save();ctx.strokeStyle='#e4a5ff';ctx.lineWidth=1;
        for(const edge of court.edges) {ctx.beginPath();ctx.moveTo(edge.a.x,edge.a.y);ctx.lineTo(edge.b.x,edge.b.y);ctx.stroke();}
        ctx.strokeStyle='#83ff9b';ctx.setLineDash([3,3]);
        for(const x of [court.left,court.right]) {ctx.beginPath();ctx.moveTo(x,210);ctx.lineTo(x,court.groundY);ctx.stroke();}
        ctx.restore();
    }
    return Object.freeze({createCourt,boundaryHit,gap,reachable,nearObstacle,createRecovery,drawDebug});
});
