/* Shared feet-anchored animation for Ravok and K7. No per-pose runtime resizing. */
(function(global){
    'use strict';
    const atlas=global.RAVOK_K7_WALK_ATLAS;
    const settings=Object.freeze({
        ravok:Object.freeze({scale:44/132,speed:16,fps:7.5,footprint:Object.freeze({width:18,height:8})}),
        k7:Object.freeze({scale:44/168,speed:18,fps:8,footprint:Object.freeze({width:18,height:8})})
    });
    const sheet=new Image(),errors=[],drawn={};
    sheet.onerror=()=>{errors.push(atlas.image);console.error('[Ravok/K7] Atlas indisponível: '+atlas.image);};
    sheet.src=atlas.image+'?v=1.0.0_measured_walk';
    if(typeof global.DEBUG_RAVOK_K7_ANIMATION!=='boolean')global.DEBUG_RAVOK_K7_ANIMATION=false;
    const direction=(dx,dy,last='down')=>Math.abs(dx)+Math.abs(dy)<1e-7?last:
        Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
    function pose(id,x,y,dir='down',distance=0,moving=false,speed=0){
        const data=atlas.characters[id],cfg=settings[id];
        if(!data||!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError('Invalid Ravok/K7 actor pose');
        if(!['up','down','left','right'].includes(dir))dir='down';
        const state=moving?'WALK':'IDLE',name=(moving?'walk_':'idle_')+dir,sequence=data.animations[name];
        // Phase follows distance travelled; slower motion produces slower steps.
        const animationTime=distance/cfg.speed;
        const frame=moving?Math.floor(animationTime*cfg.fps+1e-8)%sequence.length:0;
        return {id,x,y,direction:dir,state,frame,frameId:sequence[frame],animation:name,
            animationTime,distance,speed,scaleX:cfg.scale,scaleY:cfg.scale};
    }
    function idle(id,x,y,dir='down'){return pose(id,x,y,dir);}
    // Constant travel, then a short deceleration. Position and animation use the
    // cutscene's accumulated seconds, not number of draws or display FPS.
    function path(id,from,to,duration,time,last){
        const dx=to[0]-from[0],dy=to[1]-from[1],length=Math.hypot(dx,dy);
        const u=Math.max(0,Math.min(1,time/Math.max(duration,.001)));
        const tail=Math.max(0,u-.7),p=(u-tail*tail/.6)/.85;
        const rate=time<=0||u>=1?0:(1-tail/.3)/.85;
        return pose(id,from[0]+dx*p,from[1]+dy*p,time<=0?(last||'down'):direction(dx,dy,last),
            length*p,time>0&&u<1&&length>0,length/duration*rate);
    }
    function create(id,x,y,dir='down'){
        const actor={...idle(id,x,y,dir),vx:0,vy:0};
        // Physical footprint and scale are character constants, never sprite bounds.
        return actor;
    }
    function update(actor,vx,vy,deltaTime){
        const dt=Math.max(0,Number.isFinite(deltaTime)?deltaTime:0),speed=Math.hypot(vx,vy);
        const x=actor.x+vx*dt,y=actor.y+vy*dt,dir=direction(vx,vy,actor.direction);
        const distance=(actor.distance||0)+speed*dt;
        Object.assign(actor,pose(actor.id,x,y,dir,distance,speed>1e-7,speed),{vx,vy});return actor;
    }
    function collider(actor){const f=settings[actor.id].footprint;return {x:actor.x-f.width/2,y:actor.y-f.height+2,w:f.width,h:f.height};}
    function draw(g,actor,options={}){
        if(!sheet.complete||!sheet.naturalWidth)return false;
        const data=atlas.characters[actor.id],cfg=settings[actor.id],frame=data.frames[actor.frameId];
        const [sx,sy,w,h]=frame.atlasRect,s=cfg.scale;
        const x=Math.round(actor.x-data.anchor[0]*s),y=Math.round(actor.y-data.anchor[1]*s);
        g.save();g.imageSmoothingEnabled=false;
        if(options.shadow!==false){
            g.fillStyle='rgba(13,28,31,.25)';g.beginPath();g.ellipse(Math.round(actor.x),Math.round(actor.y)-1,9,4,0,0,Math.PI*2);g.fill();
        }
        if(options.focused){g.strokeStyle='#a3e8df';g.lineWidth=1;g.beginPath();g.ellipse(Math.round(actor.x),Math.round(actor.y)-1,12,5,0,0,Math.PI*2);g.stroke();}
        // Same source cell, destination width/height and uniform scale in every frame.
        g.drawImage(sheet,sx,sy,w,h,x,y,w*s,h*s);
        const diagnostic={...actor,scaleX:s,scaleY:s,rect:{x,y,w:w*s,h:h*s},sourceRect:frame.sourceRect,atlasRect:frame.atlasRect};
        drawn[actor.id]=diagnostic;
        if(global.DEBUG_RAVOK_K7_ANIMATION){
            g.strokeStyle='#92e9d7';g.lineWidth=.5;const b=collider(actor);g.strokeRect(b.x,b.y,b.w,b.h);
            g.fillStyle='#b6ede4';g.fillRect(Math.round(actor.x)-2,Math.round(actor.y),5,1);
            g.font='5px monospace';g.textAlign='left';g.fillStyle='#f0edc6';
            const label=`${actor.id} ${actor.state} ${actor.direction} f${actor.frame} (${actor.x.toFixed(1)},${actor.y.toFixed(1)})`;
            g.fillText(label,actor.x-35,actor.y-49);
            g.fillText(`scaleX=${s.toFixed(4)} scaleY=${s.toFixed(4)}`,actor.x-35,actor.y-43);
        }
        g.restore();return true;
    }
    const aliases={};
    for(const id of ['ravok','k7'])for(const dir of ['down','up','left','right'])
        aliases[id.toUpperCase()+'_WALK_'+dir.toUpperCase()]=Object.freeze([...atlas.characters[id].animations['walk_'+dir]]);
    global.RavokK7Animation=Object.freeze({settings,animations:Object.freeze(aliases),direction,idle,path,create,update,collider,draw,
        snapshot:()=>({ready:!!sheet.complete&&sheet.naturalWidth>0,source:atlas.image,errors:[...errors],actors:JSON.parse(JSON.stringify(drawn))})});
})(window);
