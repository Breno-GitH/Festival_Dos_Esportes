(function () {
    'use strict';
    const RADIUS=62, FIRST_FRAME=720, PATTERN_INTERVAL=960, DURATION=28;
    function valid(target) {
        return !!target&&(target.carrier==='RIVER'||target.carrier==='BIRD')
            &&target.visible&&target.active&&!target.hit&&(!target.isExplosive||!target.detonated)
            &&Number.isFinite(target.x)&&Number.isFinite(target.y)&&Number.isFinite(target.radius)&&target.radius>0;
    }
    function comboBonus(count) {return count>=6?80:(count>=4?40:(count>=2?15:0));}
    function resolve(seed,targets) {
        if(!valid(seed)||!seed.isExplosive||seed.detonated)return {hits:[],blasts:[],bonus:0};
        const seen=new Set([seed]),hits=[{target:seed,source:null}],queue=[{target:seed,depth:0}],blasts=[];
        // Breadth first, bounded by the live target set. Reserve each explosive
        // before scanning neighbours: A -> B -> A cannot recurse or pay twice.
        for(let index=0;index<queue.length;index++){
            const {target,depth}=queue[index];
            if(target.detonated)continue;
            target.detonated=true;
            const blast={x:target.x,y:target.y,radius:RADIUS,depth,id:target.id};blasts.push(blast);
            for(const candidate of targets){
                if(seen.has(candidate)||!valid(candidate))continue;
                const dx=candidate.x-blast.x,dy=candidate.y-blast.y;
                if(dx*dx+dy*dy>(RADIUS+candidate.radius)**2)continue;
                seen.add(candidate);hits.push({target:candidate,source:blast});
                if(candidate.isExplosive&&!candidate.detonated)queue.push({target:candidate,depth:depth+1});
            }
        }
        return {hits,blasts,bonus:comboBonus(hits.length)};
    }
    function drawBadge(ctx,target) {
        if(!target.isExplosive||target.hit||!target.visible)return;
        const {x,y,radius:r}=target,pulse=(Math.sin(target.age*.13)+1)*.5;
        ctx.save();ctx.imageSmoothingEnabled=false;
        if(target.entry==='TOP'){ctx.beginPath();ctx.rect(0,window.ArcheryField.SOURCE_LIP,window.ArcheryField.WIDTH,window.ArcheryField.SOURCE_BOTTOM-window.ArcheryField.SOURCE_LIP);ctx.clip();}
        ctx.strokeStyle=`rgba(255,171,74,${.35+pulse*.4})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(x,y,r+3+pulse*1.5,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#ef8344';ctx.beginPath();ctx.arc(x,y,r+.7,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#472e3b';ctx.beginPath();ctx.arc(x,y,r*.76,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ffce69';ctx.beginPath();
        for(let n=0;n<16;n++){const a=n*Math.PI/8-Math.PI/2,d=n%2?3:7;
            const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;if(n===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
        ctx.closePath();ctx.fill();ctx.fillStyle='#fff0be';ctx.fillRect(x-1,y-1,3,3);
        ctx.strokeStyle='#ffe0a1';ctx.beginPath();ctx.moveTo(x+4,y-6);ctx.lineTo(x+7,y-10);ctx.stroke();
        ctx.restore();
    }
    function drawShock(ctx,effect,concurrent=1) {
        const age=effect.duration-effect.timer-(effect.delay||0);
        if(age<0||age>DURATION)return;
        const p=age/DURATION,alpha=(1-p)/Math.sqrt(Math.max(1,concurrent));
        const r=effect.radius*(1-(1-p)**3);
        ctx.save();ctx.globalAlpha=alpha*.75;ctx.strokeStyle='#ffd17e';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(effect.x,effect.y,r,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=alpha*.27;ctx.strokeStyle='#fff5cf';ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(effect.x,effect.y,r*.76,0,Math.PI*2);ctx.stroke();
        if(age<5){ctx.globalAlpha=(1-age/5)*.20;ctx.fillStyle='#fff0b7';
            ctx.beginPath();ctx.arc(effect.x,effect.y,5+age*2,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=alpha*.85;
        for(let n=0;n<8;n++){const a=n*Math.PI/4+effect.depth*.17,d=5+p*(16+(n%3)*4);
            ctx.fillStyle=n%2?'#f1a859':'#fff0bc';ctx.fillRect(effect.x+Math.cos(a)*d,effect.y+Math.sin(a)*d,2,1);}
        ctx.restore();
    }
    window.ArcheryExplosiveTargets=Object.freeze({RADIUS,FIRST_FRAME,PATTERN_INTERVAL,DURATION,valid,resolve,
        comboBonus,drawBadge,drawShock,diagnostics:()=>({radius:RADIUS,bonus:{twoToThree:15,fourToFive:40,sixPlus:80},
            collision:'CIRCLE_VS_TARGET_DISK',chain:'BOUNDED_BREADTH_FIRST',damagesActors:false,damagesBirds:false})});
})();
