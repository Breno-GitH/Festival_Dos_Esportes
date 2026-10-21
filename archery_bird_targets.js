(function () {
    'use strict';
    // Coordinates always describe the hanging disk. The bird has no hurtbox.
    const WIDTH=450, MARGIN=40, BODY_OFFSET=25, RADIUS=8;
    const FIRST_FRAME=540, INTERVAL=420, MAX_PER_ROUND=10;
    const FLIGHTS=Object.freeze([
        Object.freeze({entry:'LEFT',path:'HORIZONTAL',y:98,rise:0,arc:0,speed:1.55}),
        Object.freeze({entry:'RIGHT',path:'DIAGONAL',y:104,rise:18,arc:0,speed:1.60}),
        Object.freeze({entry:'LEFT',path:'ARC',y:116,rise:0,arc:-17,speed:1.60}),
        Object.freeze({entry:'RIGHT',path:'ARC',y:108,rise:-10,arc:-12,speed:1.65})
    ]);
    function position(target,progress) {
        const p=Math.max(0,Math.min(1,progress)),f=target.flight;
        const x=f.entry==='LEFT'?-MARGIN+(WIDTH+MARGIN*2)*p:WIDTH+MARGIN-(WIDTH+MARGIN*2)*p;
        const y=f.y+f.rise*p+f.arc*Math.sin(Math.PI*p);
        return {x,y,waterY:y}; // waterY is a shared diagnostic field, never a water contact.
    }
    function visibility(target) {
        // Keep the carrier alive until its whole silhouette has crossed the edge.
        target.visible=target.x+21>0&&target.x-21<WIDTH;
        target.active=!target.hit&&target.x-target.radius>=0&&target.x+target.radius<=WIDTH;
        target.flowState=target.progress<.1?'ENTERING':(target.progress>.9?'EXITING':'FLYING');
        target.state=target.hit?(target.hitAge<24?'BIRD_REACTION':'FLYING_EMPTY'):target.flowState;
    }
    function create(index=0,golden=false) {
        const flight=FLIGHTS[index%FLIGHTS.length];
        const target={carrier:'BIRD',flight,route:null,pathType:flight.path,entry:flight.entry,
            entryPoint:flight.entry,exitPoint:flight.entry==='LEFT'?'RIGHT':'LEFT',
            radius:RADIUS,basePoints:48,speedTier:'BIRD',speed:flight.speed,sizeTier:'SMALL',isGolden:false,isExplosive:false,detonated:false,
            pathLength:WIDTH+MARGIN*2,margin:MARGIN,progress:0,age:0,hit:false,hitBy:null,
            hitAge:0,hitOffsetX:0,hitOffsetY:0,speedX:0,speedY:0,retireAfterCollision:false,qaStatic:false};
        target.goldenVariant=golden?'SKY':null;
        if(golden)Object.assign(target,{radius:7,basePoints:180,speed:2.40,speedTier:'GOLD',isGolden:true});
        Object.assign(target,position(target,0));target.previousX=target.x;target.previousY=target.y;
        target.prevX=target.previousX;target.prevY=target.previousY;
        visibility(target);return target;
    }
    function step(target,deltaSeconds=1/60) {
        const frames=deltaSeconds*60;
        target.age+=frames;if(target.hit)target.hitAge+=frames;
        target.prevX=target.previousX=target.x;target.prevY=target.previousY=target.y;
        target.progress=Math.min(1,target.progress+target.speed*frames/target.pathLength);
        Object.assign(target,position(target,target.progress));
        target.speedX=target.x-target.previousX;target.speedY=target.y-target.previousY;
        visibility(target);return target.progress>=1&&!target.visible;
    }
    function markHit(target,owner,impact) {
        target.hit=true;target.hitBy=owner;target.hitAge=0;target.active=false;target.state='BIRD_REACTION';
        target.hitOffsetX=impact?impact.offsetX:0;target.hitOffsetY=impact?impact.offsetY:0;
        // Only the carried disk breaks. Flight position and velocity are untouched.
    }
    function draw(ctx,target) {
        if(!target.visible)return;
        const {x,y,radius:r}=target,bodyY=y-BODY_OFFSET;
        const reacting=target.hit&&target.hitAge<24;
        const flap=Math.sin(target.age*(reacting?.72:.34));
        ctx.save();ctx.imageSmoothingEnabled=false;ctx.lineWidth=1;
        if(!target.hit){
            ctx.strokeStyle='#253e3e';ctx.beginPath();ctx.moveTo(x-3,bodyY+4);ctx.lineTo(x-3,y-r-1);
            ctx.moveTo(x+3,bodyY+4);ctx.lineTo(x+3,y-r-1);ctx.stroke();
            ctx.strokeStyle='#e8dbab';ctx.beginPath();ctx.moveTo(x-2,bodyY+5);ctx.lineTo(x-2,y-r-1);ctx.stroke();
            // Strong contrasting rim separates the precision target from the sky and foliage.
            if(target.isGolden)window.ArcheryGoldenTargets.drawFace(ctx,target);
            else for(const [scale,color]of [[1.28,'#24393e'],[1.12,'#ffc75d'],[1,'#fff4df'],[.70,'#2877ac'],[.35,'#df594a'],[.12,'#ffe07d']]){
                ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r*scale,0,Math.PI*2);ctx.fill();
            }
            ctx.fillStyle='#fff8d3';ctx.fillRect(x-r-1,y-3,1,3);
        }else if(target.hitAge<20){
            // A few wooden target fragments, never pieces of the bird.
            const t=target.hitAge;ctx.globalAlpha=1-t/20;
            for(let n=0;n<4;n++){
                const side=n%2?-1:1,dx=side*(3+t*.40),dy=(n<2?-3:2)+t*.2+t*t*.025;
                ctx.fillStyle=n<2?'#eed5a1':'#b75645';ctx.fillRect(x+dx-2,y+dy-1,4,2);
            }
            ctx.globalAlpha=1;
        }
        // A compact river bird, distinct from the tiny distant background silhouettes.
        ctx.translate(x,bodyY);ctx.scale(target.flight.entry==='LEFT'?1:-1,1);
        ctx.fillStyle='#28434b';ctx.beginPath();
        ctx.moveTo(-3,0);ctx.lineTo(-19,-4-flap*7);ctx.lineTo(-13,3);ctx.lineTo(-4,5);
        ctx.lineTo(5,4);ctx.lineTo(16,-3-flap*6);ctx.lineTo(10,3);ctx.lineTo(3,6);ctx.closePath();ctx.fill();
        ctx.strokeStyle=target.isGolden?'#f1d17c':'#84b3af';ctx.beginPath();ctx.moveTo(-15,-2-flap*6);ctx.lineTo(-4,2);
        ctx.moveTo(5,2);ctx.lineTo(12,-1-flap*5);ctx.stroke();
        ctx.fillStyle=target.isGolden?'#7c789f':'#6c9fa3';ctx.fillRect(-5,-2,10,7);
        ctx.fillStyle='#e5e8ce';ctx.fillRect(-3,2,7,3);
        ctx.fillStyle='#29494f';ctx.fillRect(3,-5-(reacting?1:0),6,6);
        ctx.fillStyle='#edb95a';ctx.fillRect(9,-3-(reacting?1:0),4,2);
        ctx.fillStyle='#f7f5df';ctx.fillRect(6,-4-(reacting?1:0),2,2);
        ctx.fillStyle='#142d34';ctx.fillRect(7,-4-(reacting?1:0),1,1);
        ctx.fillStyle='#385967';ctx.fillRect(-9,2,5,2);
        if(reacting){ctx.fillStyle='#fff3bd';ctx.fillRect(12,-10,1,4);ctx.fillRect(12,-5,1,1);}
        ctx.restore();
    }
    window.ArcheryBirdTargets=Object.freeze({FLIGHTS,FIRST_FRAME,INTERVAL,MAX_PER_ROUND,
        create,position,step,markHit,draw,diagnostics:()=>({radius:RADIUS,basePoints:48,bodyOffset:BODY_OFFSET,
            firstSeconds:FIRST_FRAME/60,plannedSeconds:window.ArcheryMatchPacing.BIRD_FRAMES.map(f=>f/60),
            maxPerRound:MAX_PER_ROUND,maxSimultaneous:1,
            flights:FLIGHTS,collision:'HANGING_DISK_ONLY'})});
})();
