(function () {
    'use strict';
    const MAX_PER_ROUND=2, MIN_INTERVAL=900, CENTER_BONUS=90;
    const specs={
        GOLD_SMALL:{radius:8,basePoints:145,travelSpeed:2.20},
        GOLD_FAST:{radius:8,basePoints:155,travelSpeed:2.35},
        GOLD_WAVE:{radius:9,basePoints:150,travelSpeed:2.20},
        GOLD_S_CURVE:{radius:8,basePoints:160,travelSpeed:2.20},
        GOLD_ELLIPSE:{radius:8,basePoints:165,travelSpeed:2.25},
        GOLD_ARC:{radius:8,basePoints:160,travelSpeed:2.30},
        GOLD_CURVE:{radius:7.5,basePoints:175,travelSpeed:2.35}
    };
    const SPECS=Object.freeze(Object.fromEntries(Object.entries(specs).map(([name,spec])=>
        [name,Object.freeze({...spec,sizeTier:'SMALL',golden:true})])));
    function plan(random=Math.random) {
        return window.ArcheryMatchPacing.planGolden(random);
    }
    function precisionBonus(target,normalized) {
        return normalized<=.35?(target.isGolden?CENTER_BONUS:30):(normalized<=.70?15:0);
    }
    function drawFace(ctx,target,x=target.x,y=target.y) {
        const r=target.radius,spent=target.hit;
        ctx.save();ctx.translate(x,y);ctx.imageSmoothingEnabled=false;
        // A bevelled sun medallion with an engraved centre, rather than normal
        // blue/red rings recoloured yellow. All decoration stays outside physics.
        const rim=ctx.createLinearGradient(-r,-r,r,r);
        rim.addColorStop(0,spent?'#bba66a':'#fff3b2');rim.addColorStop(.45,spent?'#9d8752':'#f6c448');
        rim.addColorStop(.7,spent?'#816d44':'#a96a25');rim.addColorStop(1,spent?'#bba66a':'#ffe292');
        ctx.fillStyle='#5e442e';ctx.beginPath();ctx.arc(0,0,r+1.8,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=rim;ctx.beginPath();
        for(let n=0;n<24;n++){const a=n*Math.PI/12,d=r+(n%2?.25:1.2);
            if(n===0)ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);else ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);}
        ctx.closePath();ctx.fill();
        ctx.strokeStyle=spent?'#766744':'#ad722b';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r*.76,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle=spent?'#93805a':'#725132';ctx.beginPath();
        for(let n=0;n<8;n++){const a=n*Math.PI/4-Math.PI/2,d=n%2?r*.23:r*.58;
            if(n===0)ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);else ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);}
        ctx.closePath();ctx.fill();ctx.fillStyle=spent?'#c0ac74':'#fff2a0';
        ctx.beginPath();ctx.arc(0,0,r*.20,0,Math.PI*2);ctx.fill();
        if(!spent){
            ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
            const sweep=((target.age%64)/64*2.8-1.4)*r;
            ctx.strokeStyle='rgba(255,255,230,.70)';ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(sweep-r*.4,-r);ctx.lineTo(sweep+r*.4,r);ctx.stroke();ctx.restore();
            for(let n=0;n<4;n++){
                const a=n*Math.PI/2+target.age*.025,d=r+4+Math.sin(target.age*.09+n)*1.5;
                const px=Math.cos(a)*d,py=Math.sin(a)*d;
                ctx.globalAlpha=.4+.5*(Math.sin(target.age*.17+n)+1)/2;ctx.fillStyle='#fff1a3';
                ctx.fillRect(px,py,1,1);if(n===(Math.floor(target.age/12)%4)){ctx.fillRect(px-1,py,3,1);ctx.fillRect(px,py-1,1,3);}
            }
        }
        ctx.restore();
    }
    function drawNotice(ctx,effect) {
        const p=1-effect.timer/effect.duration;
        ctx.save();ctx.globalAlpha=Math.min(1,(1-p)*5,p*10);ctx.font='bold 8px monospace';ctx.textAlign='center';
        ctx.strokeStyle='#263e36';ctx.lineWidth=2.5;ctx.strokeText('ALVO DOURADO!',window.ArcheryField.WIDTH/2,45);
        ctx.fillStyle='#ffe59a';ctx.fillText('ALVO DOURADO!',window.ArcheryField.WIDTH/2,45);ctx.restore();
    }
    window.ArcheryGoldenTargets=Object.freeze({SPECS,MAX_PER_ROUND,MIN_INTERVAL,CENTER_BONUS,plan,precisionBonus,drawFace,drawNotice,
        diagnostics:()=>({maxPerRound:MAX_PER_ROUND,minIntervalSeconds:MIN_INTERVAL/60,centerBonus:CENTER_BONUS,
            variants:['RAPIDS','ARC','SKY'],phaseChances:[0,0,.65,.90],phaseWindows:[[32,35],[51,54]],
            bird:{radius:7,basePoints:180,speed:2.40},visual:'BEVELLED_SUN_MEDALLION'})});
})();
