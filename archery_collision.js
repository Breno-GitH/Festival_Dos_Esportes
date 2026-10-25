(function () {
    'use strict';
    const {WIDTH,HEIGHT,SOURCE_LIP,SOURCE_BOTTOM}=window.ArcheryField,EPS=1e-10;
    const records=[];
    let debugTime=0;
    if(typeof window.ARCHERY_COLLISION_DEBUG!=='boolean')window.ARCHERY_COLLISION_DEBUG=false;
    const previous=(object,axis)=>object['prev'+axis]??object['previous'+axis]??object[axis.toLowerCase()];
    function centerAt(target,t) {
        const x=previous(target,'X'),y=previous(target,'Y');
        return {x:x+(target.x-x)*t,y:y+(target.y-y)*t};
    }
    function valid(target) {
        return !!target&&!target.hit&&!target.detonated&&target.collisionEnabled!==false&&
            ['RIVER','BIRD'].includes(target.carrier)&&
            [target.x,target.y,previous(target,'X'),previous(target,'Y'),target.radius].every(Number.isFinite)&&target.radius>0;
    }
    function faceVisible(target) {
        const top=target.entry==='TOP'&&target.carrier==='RIVER'?SOURCE_LIP:0;
        const bottom=target.entry==='TOP'&&target.carrier==='RIVER'?SOURCE_BOTTOM:HEIGHT;
        return target.x+target.radius>=0&&target.x-target.radius<=WIDTH&&
            target.y+target.radius>=top&&target.y-target.radius<=bottom;
    }
    function clipAxis(interval,start,delta,low,high) {
        if(Math.abs(delta)<EPS)return start>=low-EPS&&start<=high+EPS;
        let a=(low-start)/delta,b=(high-start)/delta;
        if(a>b)[a,b]=[b,a];
        interval[0]=Math.max(interval[0],a);interval[1]=Math.min(interval[1],b);
        return interval[0]<=interval[1]+EPS;
    }
    function sweep(arrow,target) {
        if(!valid(target)||['HIT','REMOVED','RESPAWN'].includes(arrow.state))return null;
        const px=previous(arrow,'X'),py=previous(arrow,'Y');
        if(![px,py,arrow.x,arrow.y].every(Number.isFinite))return null;
        const tx=previous(target,'X'),ty=previous(target,'Y');
        const dx=arrow.x-px,dy=arrow.y-py;
        const rx=px-tx,ry=py-ty,vx=dx-(target.x-tx),vy=dy-(target.y-ty);
        const a=vx*vx+vy*vy,b=rx*vx+ry*vy,c=rx*rx+ry*ry-target.radius*target.radius;
        let interval;
        if(a<EPS) {
            // Equal velocities can still mean an arrow already inside the face.
            if(c>EPS)return null;
            interval=[0,1];
        } else {
            let discriminant=b*b-a*c;
            const tolerance=EPS*Math.max(1,b*b,Math.abs(a*c));
            if(discriminant < -tolerance)return null;
            discriminant=Math.max(0,discriminant);
            const root=Math.sqrt(discriminant),q=-b-(b>=0?root:-root);
            let first,last;
            if(Math.abs(q)<EPS){first=last=-b/a;}
            else {first=q/a;last=c/q;if(first>last)[first,last]=[last,first];}
            interval=[Math.max(0,first),Math.min(1,last)];
            if(interval[0]>interval[1]+EPS)return null;
        }
        // Clip the whole contact interval, not just its first (possibly hidden) point.
        const masked=target.entry==='TOP'&&target.carrier==='RIVER';
        if(!clipAxis(interval,px,dx,0,WIDTH)||
            !clipAxis(interval,py,dy,masked?SOURCE_LIP:0,masked?SOURCE_BOTTOM:HEIGHT))return null;
        const t=Math.max(0,Math.min(1,interval[0])),center=centerAt(target,t);
        const x=px+dx*t,y=py+dy*t;
        // Preserve the existing concentric-ring rule: the shot's relative line
        // determines its offset on the face. First rim contact orders collisions;
        // treating every rim entry as the scoring point would eliminate bullseyes.
        const closest=a<EPS?0:-b/a;
        let offsetX=rx+vx*closest,offsetY=ry+vy*closest;
        offsetX=Math.max(-center.x,Math.min(WIDTH-center.x,offsetX));
        offsetY=Math.max((masked?SOURCE_LIP:0)-center.y,
            Math.min((masked?SOURCE_BOTTOM:HEIGHT)-center.y,offsetY));
        if(offsetX*offsetX+offsetY*offsetY>target.radius*target.radius+EPS){offsetX=x-center.x;offsetY=y-center.y;}
        return {t,x,y,center,offsetX,offsetY,distance:Math.hypot(offsetX,offsetY),
            scoreX:center.x+offsetX,scoreY:center.y+offsetY,swept:true};
    }
    function atImpact(targets,t,callback) {
        const saved=targets.map(target=>({target,x:target.x,y:target.y,active:target.active,visible:target.visible}));
        try {
            for(const item of saved){const target=item.target;Object.assign(target,centerAt(target,t));
                target.visible=faceVisible(target);target.active=valid(target)&&target.visible;}
            return callback();
        } finally {
            for(const item of saved){item.target.x=item.x;item.target.y=item.y;item.target.visible=item.visible;
                item.target.active=item.target.hit?false:item.active;}
        }
    }
    function advanceDebug(deltaSeconds) {
        debugTime+=deltaSeconds;
        if(!window.ARCHERY_COLLISION_DEBUG){records.length=0;return;}
        while(records.length&&debugTime-records[0].time>.45)records.shift();
    }
    function trace(arrow,impact) {
        if(!window.ARCHERY_COLLISION_DEBUG)return;
        records.push({px:previous(arrow,'X'),py:previous(arrow,'Y'),x:arrow.x,y:arrow.y,
            hit:impact?{x:impact.x,y:impact.y,scoreX:impact.scoreX,scoreY:impact.scoreY}:null,time:debugTime});
        if(records.length>160)records.shift();
    }
    function drawDebug(ctx,targets) {
        if(!window.ARCHERY_COLLISION_DEBUG)return;
        ctx.save();ctx.lineWidth=.65;ctx.font='6px monospace';
        for(const target of targets){if(!valid(target))continue;
            ctx.strokeStyle='#ff68d4';ctx.beginPath();ctx.arc(target.x,target.y,target.radius,0,Math.PI*2);ctx.stroke();
            ctx.setLineDash([2,2]);ctx.strokeStyle='#a477b8';ctx.beginPath();
            ctx.arc(previous(target,'X'),previous(target,'Y'),target.radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
        for(const r of records){ctx.globalAlpha=Math.max(.15,1-(debugTime-r.time)/.45);
            ctx.strokeStyle='#7deeff';ctx.beginPath();ctx.moveTo(r.px,r.py);ctx.lineTo(r.x,r.y);ctx.stroke();
            ctx.fillStyle='#7deeff';ctx.fillRect(r.px-1,r.py-1,2,2);
            ctx.fillStyle='#ffe16b';ctx.fillRect(r.x-1,r.y-1,2,2);
            if(r.hit){ctx.fillStyle='#ff5656';ctx.beginPath();ctx.arc(r.hit.x,r.hit.y,2,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#92ff8c';ctx.fillRect(r.hit.scoreX-1,r.hit.scoreY-1,2,2);}}
        ctx.globalAlpha=1;ctx.fillStyle='#baf7ff';ctx.fillText('COLLISION: SEGMENTO / DISCO / CONTATO',7,40);ctx.restore();
    }
    window.ArcheryCollision=Object.freeze({sweep,valid,faceVisible,centerAt,atImpact,advanceDebug,trace,drawDebug,
        diagnostics:()=>({algorithm:'RELATIVE_SEGMENT_VS_CIRCLE',radiusPadding:0,debug:window.ARCHERY_COLLISION_DEBUG,records:records.length})});
})();
