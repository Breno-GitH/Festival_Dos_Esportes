/* Physical hoops. Time/velocity use the game's existing 60 Hz tick units. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.BasketballHoopPhysics = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';
    const BALL_RADIUS = 8.8, RIM_RADIUS = 1.6, EPS = 1e-7, SKIN = 0.0001;
    const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

    function createHoop(side, x, groundY = 259) {
        // Pixel landmarks on the exported 601x621 PNG, transformed exactly as
        // drawHoop (scale .2, foot anchor 300,613). No transparent image bounds.
        const source = side === 'left'
            ? { rim:[406,550], board:[[348,70],[416,300]] }
            : { rim:[34,180], board:[[232,70],[166,300]] };
        const transform = (sx,sy) => ({x:x+(sx-300)*.2,y:groundY+(sy-613)*.2});
        const a=transform(source.rim[0],260),b=transform(source.rim[1],260);
        return {side,x,rimX:(a.x+b.x)/2,rimY:a.y,netTimer:0,
            rimLeft:{...a,radius:RIM_RADIUS,id:side+'-rim-left'},
            rimRight:{...b,radius:RIM_RADIUS,id:side+'-rim-right'},
            opening:{left:a.x+RIM_RADIUS,right:b.x-RIM_RADIUS},
            backboard:{a:transform(...source.board[0]),b:transform(...source.board[1]),
                radius:1.3,id:side+'-backboard'} };
    }

    function resetShot(ball) {
        Object.assign(ball,{previousX:ball.x,previousY:ball.y,
            radius:BALL_RADIUS,wasAboveRim:false,crossedRimPlane:false,basketScored:false,
            enteredRimFromBelow:false,rimTouched:false,backboardTouched:false,
            pendingBasket:null,scoreKind:null,scoreCrossing:null,scoredShotId:-1,awardedShotId:-1,
            hoopPhysicsTime:0,contactTimes:{},recoveryScoringBlocked:false});
    }

    function circleHit(p,d,center,radius) {
        const ox=p.x-center.x,oy=p.y-center.y,c=ox*ox+oy*oy-radius*radius;
        if(c<=EPS) {
            const length=Math.hypot(ox,oy);
            const speed=Math.hypot(d.x,d.y);
            const nx=length>EPS?ox/length:speed>EPS?-d.x/speed:0;
            const ny=length>EPS?oy/length:speed>EPS?-d.y/speed:-1;
            if(c< -EPS || d.x*nx+d.y*ny< -EPS) return {t:0,nx,ny,depth:Math.max(0,radius-length)};
            return null;
        }
        const aa=d.x*d.x+d.y*d.y;
        if(aa<EPS)return null;
        const bb=2*(ox*d.x+oy*d.y),discriminant=bb*bb-4*aa*c;
        if(discriminant<0)return null;
        const t=(-bb-Math.sqrt(discriminant))/(2*aa);
        if(t< -EPS || t>1+EPS)return null;
        const nx=(ox+d.x*t)/radius,ny=(oy+d.y*t)/radius;
        return {t:clamp(t,0,1),nx,ny,depth:0};
    }

    function capsuleHit(p,d,a,b,radius) {
        const sx=b.x-a.x,sy=b.y-a.y,length=Math.hypot(sx,sy);
        if(length<EPS)return circleHit(p,d,a,radius);
        const tx=sx/length,ty=sy/length,nx=-ty,ny=tx;
        const u=(p.x-a.x)*tx+(p.y-a.y)*ty;
        const offset=(p.x-a.x)*nx+(p.y-a.y)*ny;
        const dn=d.x*nx+d.y*ny;
        let best=null;
        const choose=hit=>{if(hit&&(!best||hit.t<best.t))best=hit;};
        if(u>=0&&u<=length&&Math.abs(offset)<=radius+EPS) {
            const sign=Math.abs(offset)>EPS?Math.sign(offset):(dn>0?-1:1);
            if(Math.abs(offset)<radius-EPS || dn*sign< -EPS)
                choose({t:0,nx:nx*sign,ny:ny*sign,depth:Math.max(0,radius-Math.abs(offset))});
        }
        if(Math.abs(dn)>EPS) for(const sign of [-1,1]) {
            const t=(sign*radius-offset)/dn;
            const atU=u+(d.x*tx+d.y*ty)*t;
            if(t>=0&&t<=1&&atU>=0&&atU<=length&&dn*sign< -EPS)
                choose({t,nx:nx*sign,ny:ny*sign,depth:0});
        }
        choose(circleHit(p,d,a,radius));choose(circleHit(p,d,b,radius));
        return best;
    }

    function validOpening(hoop,ball) {
        const radius=ball.radius??BALL_RADIUS;
        return {left:hoop.opening.left+radius,right:hoop.opening.right-radius};
    }

    function observeFlight(ball,hoop,start,velocity,dt,gravity) {
        if(!hoop || ball.basketScored || ball.recoveryScoringBlocked || ball.owner!=null || ball.shooter==null
            || !['SHOT','REBOUND'].includes(ball.state))return;
        if(start.y<hoop.rimY-EPS)ball.wasAboveRim=true;
        const endY=start.y+velocity.vy*dt+.5*gravity*dt*dt;
        // Solve the actual accelerated flight at the rim plane. Interpolating X
        // at the end of a frame is insufficient for fast diagonal shots.
        const roots=[];
        if(Math.abs(gravity)>EPS) {
            const disc=velocity.vy**2-2*gravity*(start.y-hoop.rimY);
            if(disc>=0) {
                const root=Math.sqrt(disc);
                roots.push((-velocity.vy-root)/gravity,(-velocity.vy+root)/gravity);
            }
        } else if(Math.abs(velocity.vy)>EPS)roots.push((hoop.rimY-start.y)/velocity.vy);
        const opening=validOpening(hoop,ball);
        for(const t of roots.sort((a,b)=>a-b)) {
            if(t< -EPS||t>dt+EPS)continue;
            const x=start.x+velocity.vx*t,vy=velocity.vy+gravity*t;
            const inside=x>opening.left+EPS && x<opening.right-EPS;
            if(vy< -EPS && inside) {
                ball.enteredRimFromBelow=true;ball.pendingBasket=null;
            }
            if(vy>EPS && inside && ball.wasAboveRim && !ball.enteredRimFromBelow
                && start.y<=hoop.rimY+EPS && endY>=hoop.rimY-EPS) {
                ball.crossedRimPlane=true;
                ball.scoreCrossing={x,y:hoop.rimY,vy,hoop:hoop.side,shotId:ball.shotId};
                ball.pendingBasket={...ball.scoreCrossing};
            }
        }
        if(endY<hoop.rimY-EPS)ball.wasAboveRim=true;
    }

    function confirmBasket(ball,hoop,onScore) {
        const pending=ball.pendingBasket;
        if(!pending||ball.basketScored||ball.recoveryScoringBlocked||!hoop||pending.shotId!==ball.shotId)return;
        if(ball.vy<=0||ball.enteredRimFromBelow) {ball.pendingBasket=null;return;}
        // Finish clearing the metal before confirming: a rim-out may reverse
        // the descent immediately after a candidate crossing.
        if(ball.y<hoop.rimY+(ball.radius??BALL_RADIUS)+RIM_RADIUS+.1)return;
        ball.basketScored=true;ball.scoredShotId=ball.shotId;
        ball.scoreKind=ball.rimTouched||ball.backboardTouched?'NORMAL':'SWOOSH';
        ball.pendingBasket=null;
        if(onScore)onScore({hoop,kind:ball.scoreKind,crossing:ball.scoreCrossing});
    }

    function advance(ball,hoops,dt,options={}) {
        if(!(dt>0)||!Number.isFinite(dt))return;
        const gravity=options.gravity??.21;
        const list=Array.isArray(hoops)?hoops:Object.values(hoops);
        const target=list.find(h=>h.side===ball.target);
        const edges=options.court?.edges??[];
        const floor=edges.find(e=>e.kind==='FLOOR');
        if(!ball.contactTimes)resetShot(ball);
        ball.previousX=ball.x;ball.previousY=ball.y;
        const slices=Math.max(1,Math.ceil(dt/.25)),slice=dt/slices;
        for(let i=0;i<slices;i++) {
            let remaining=slice;
            for(let contact=0;contact<8&&remaining>EPS;contact++) {
                const supported=floor&&Math.abs((ball.x-floor.a.x)*floor.nx+(ball.y-floor.a.y)*floor.ny-(ball.radius??BALL_RADIUS))<.001
                    &&ball.vy>=0&&ball.vy<1.15;
                const flightGravity=supported?0:gravity;
                if(supported)ball.vy=0;
                const start={x:ball.x,y:ball.y},velocity={vx:ball.vx,vy:ball.vy};
                const d={x:ball.vx*remaining,y:ball.vy*remaining+.5*flightGravity*remaining*remaining};
                let earliest=null;
                const consider=(hit,shape,hoop,kind)=>{
                    if(hit&&(!earliest||hit.t<earliest.t))earliest={...hit,shape,hoop,kind};
                };
                for(const hoop of list) {
                    for(const rim of [hoop.rimLeft,hoop.rimRight])
                        consider(circleHit(start,d,rim,(ball.radius??BALL_RADIUS)+rim.radius),rim,hoop,'RIM');
                    const board=hoop.backboard;
                    consider(capsuleHit(start,d,board.a,board.b,(ball.radius??BALL_RADIUS)+board.radius),board,hoop,'BACKBOARD');
                }
                for(const edge of edges)
                    consider(options.boundaryHit(start,d,edge,ball.radius??BALL_RADIUS),edge,null,'BOUNDARY');
                const traveled=remaining*(earliest?.t??1);
                observeFlight(ball,target,start,velocity,traveled,flightGravity);
                ball.x=start.x+velocity.vx*traveled;
                ball.y=start.y+velocity.vy*traveled+.5*flightGravity*traveled*traveled;
                ball.vy=velocity.vy+flightGravity*traveled;
                if(supported)ball.vx*=Math.pow(.88,traveled);
                ball.hoopPhysicsTime+=traveled;
                remaining-=traveled;
                if(earliest) {
                    const {nx,ny,depth,kind,shape,hoop}=earliest;
                    const normalVelocity=ball.vx*nx+ball.vy*ny;
                    if(kind==='RIM')ball.rimTouched=true;
                    else if(kind==='BACKBOARD')ball.backboardTouched=true;
                    ball.x+=nx*(depth+SKIN);ball.y+=ny*(depth+SKIN);
                    if(normalVelocity<0) {
                        const boundary=kind==='BOUNDARY';
                        const resting=boundary&&shape.kind==='FLOOR'&&-normalVelocity<1.15;
                        const restitution=boundary?shape.restitution:kind==='RIM'?.65:.74;
                        const friction=boundary?(resting?1:shape.friction):kind==='RIM'?.985:.995;
                        const tangentX=ball.vx-normalVelocity*nx,tangentY=ball.vy-normalVelocity*ny;
                        const rebound=resting?0:Math.max(-normalVelocity*restitution,boundary?shape.minRebound:0);
                        ball.vx=tangentX*friction+rebound*nx;
                        ball.vy=tangentY*friction+rebound*ny;
                        ball.angularVelocity=(ball.angularVelocity||0)*.99;
                    }
                    if(ball.vy<=0)ball.pendingBasket=null;
                    if(normalVelocity<-.04 && ball.hoopPhysicsTime-(ball.contactTimes[shape.id]??-Infinity)>2) {
                        ball.contactTimes[shape.id]=ball.hoopPhysicsTime;
                        const callback=kind==='BOUNDARY'?options.onBoundary:options.onContact;
                        if(callback)callback({kind,hoop,shape,x:ball.x,y:ball.y,nx,ny,normalVelocity});
                    }
                }
                confirmBasket(ball,target,options.onScore);
                if(!earliest)break;
                // A zero-time resting contact consumes only a tiny physical step;
                // the bounded loop avoids hanging between two colliders.
                if(traveled<EPS)remaining=Math.max(0,remaining-.00001);
            }
        }
    }

    function drawDebug(ctx,ball,hoops) {
        ctx.save();ctx.lineWidth=1;ctx.font='7px monospace';
        for(const hoop of Object.values(hoops)) {
            ctx.strokeStyle='#ff826b';
            for(const rim of [hoop.rimLeft,hoop.rimRight]) {
                ctx.beginPath();ctx.arc(rim.x,rim.y,rim.radius,0,Math.PI*2);ctx.stroke();
            }
            const board=hoop.backboard;ctx.strokeStyle='#ffd65b';ctx.lineWidth=board.radius*2;
            ctx.lineCap='round';ctx.beginPath();ctx.moveTo(board.a.x,board.a.y);ctx.lineTo(board.b.x,board.b.y);ctx.stroke();
            ctx.lineWidth=1;ctx.strokeStyle='#9dfaca';
            ctx.beginPath();ctx.moveTo(hoop.opening.left,hoop.rimY);ctx.lineTo(hoop.opening.right,hoop.rimY);ctx.stroke();
            const opening=validOpening(hoop,ball);
            ctx.fillStyle='rgba(67,255,150,.18)';ctx.fillRect(opening.left,hoop.rimY-12,opening.right-opening.left,25);
        }
        ctx.strokeStyle='#61e7ff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.radius??BALL_RADIUS,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ball.x,ball.y);ctx.lineTo(ball.x+ball.vx*6,ball.y+ball.vy*6);ctx.stroke();
        ctx.fillStyle='#fff';ctx.fillText(`v ${ball.vx.toFixed(1)},${ball.vy.toFixed(1)}`,ball.x-22,ball.y-14);
        if(ball.scoreCrossing) {
            ctx.fillStyle='#7dffae';ctx.beginPath();ctx.arc(ball.scoreCrossing.x,ball.scoreCrossing.y,2,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
    }
    return Object.freeze({BALL_RADIUS,RIM_RADIUS,createHoop,resetShot,advance,validOpening,drawDebug,circleHit,capsuleHit});
});
