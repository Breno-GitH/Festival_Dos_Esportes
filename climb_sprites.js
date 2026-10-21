/* Zorp presentation only. State selection, anchors and debug never write to
 * the climbing physics, level, input state, camera, checkpoints or save. */
window.ClimbSprites = (() => {
    'use strict';
    const atlas = CLIMB_ZORP_V2_MANIFEST;
    const frames = new Map(atlas.frames.map(frame => [frame.id, frame]));
    const names = Object.keys(atlas.states);
    const scale = atlas.displayBodyHeight / atlas.bodyHeight;
    const clocks = new WeakMap();
    const debug = { enabled: new URLSearchParams(location.search).get('climbSpriteDebug') === '1',
        stateIndex: -1, frameIndex: 0 };
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const ease = n => { n=clamp(n,0,1);return n*n*(3-2*n); };
    const timing = Object.freeze({ recoveryHang:.14, grip:.18, edgeHold:.12, pullUp:.64, corner:.22, blend:.08 });

    function clockFor(g, now = performance.now()) {
        let clock=clocks.get(g);
        if(!clock){
            clock={time:0,lastNow:now,state:null,stateTime:0,previous:null,last:null,queue:null,
                forcedFall:false,recovering:false,hitTime:0,summit:null,summitPull:false,
                physical:g.playerState,lastX:g.playerX,lastY:g.playerY,deltaTime:0};
            clocks.set(g,clock);
        }
        return clock;
    }
    function tick(clock, deltaTime) {
        const dt=Number.isFinite(deltaTime)?Math.max(0,deltaTime):0;
        clock.deltaTime=dt;clock.time+=dt;clock.stateTime+=dt;
        clock.hitTime=Math.max(0,clock.hitTime-dt);
        if(clock.queue)clock.queue.elapsed+=dt;
    }
    function sync(g,now){
        const clock=clockFor(g,now);
        tick(clock,(now-clock.lastNow)/1000);clock.lastNow=now;return clock;
    }
    function sequence(clock,kind,holdId,clips){clock.queue={kind,holdId,clips,elapsed:0};}
    function reset(g,now=performance.now()){clocks.delete(g);return clockFor(g,now);}

    // Notifications occur after existing successful game actions. They never
    // authorize a jump/grab, block input, grant a checkpoint or move the body.
    function notify(g,event,data={},now=performance.now()){
        const c=sync(g,now);
        if(event==='jump'){
            c.queue=null;c.forcedFall=false;c.recovering=false;c.hitTime=0;c.jumpAt=c.time;
            c.checkpointLaunch=data.checkpoint===true;
        }else if(event==='checkpoint_begin'||event==='checkpoint_stand'){
            c.queue=null;c.forcedFall=false;c.recovering=false;c.hitTime=0;c.checkpointLaunch=false;
        }else if(event==='drop'){
            c.queue=null;c.forcedFall=true;c.recovering=true;
        }else if(event==='reach'){
            c.recovering=c.forcedFall||c.last?.state==='FALL'||data.descending===true;
            c.reachTarget=data.hold?.id;
        }else if(event==='grip'){
            const h=data.hold,recovered=c.recovering||data.descending===true||c.last?.state==='FALL';
            c.forcedFall=false;c.hitTime=0;c.recovering=false;
            const wide=h?.surface||h?.isLedge;
            if(wide){
                const clips=recovered?[['HANG',timing.recoveryHang]]:[];
                sequence(c,'ledge',h.id,[...clips,['CLIMB_HOLD',timing.edgeHold],
                    ['PULL_UP',timing.pullUp],['CLIMB_CORNER',timing.corner]]);
            }else sequence(c,'grip',h?.id,recovered
                ?[['HANG',timing.recoveryHang],['CLIMB_HOLD',timing.grip]]
                :[['CLIMB_HOLD',timing.grip]]);
        }else if(event==='hit')c.hitTime=.14;
        c.physical=g.playerState;
    }

    function createLibrary(load) {
        const images = Object.fromEntries(atlas.usedFrames.map(id => [id, load(id)]));
        const states = Object.fromEntries(names.map(name =>
            [name, atlas.states[name].frames.map(id => images[id])]));
        // Keep the existing summit/ending portrait API using this same atlas.
        return { images, states, idle: states.CLIMB_IDLE, climb: states.CLIMB_MOVE,
            pullUp: states.PULL_UP, reachLeft: states.CLIMB_SIDE[0], reachRight: states.CLIMB_SIDE[0],
            slip: states.HANG, pushUp: states.JUMP[1], pushLeft: states.JUMP[1], pushRight: states.JUMP[1],
            stun: states.HIT[0], fall: states.FALL[2], victory: [states.VICTORY[1], states.VICTORY[0]] };
    }

    function resolve(g, input = {}, c = clocks.get(g)) {
        const direction = (input.d ? 1 : 0) - (input.a ? 1 : 0);
        const facing = Math.sign(direction || g.jumpDir || g.vx || 1);
        const s = g.summitSequence;
        if(g.checkpointEntry){
            return {state:g.checkpointEntry.phase==='HANG'?'HANG':'PULL_UP',
                facing,progress:g.checkpointEntry.progress,kind:'checkpoint'};
        }
        if(g.checkpointJump)return {state:'JUMP',facing:g.checkpointJump.direction||facing,fixedFrame:0};
        if (s?.phase==='COMPLETE'&&ClimbSummit.canFinish(g))return {state:'VICTORY',facing,fixedFrame:0};
        if (s && s.phase !== 'COMPLETE') {
            if (s.phase === 'HANG'||s.phase === 'PULL_UP') return { state: 'CLIMB_HOLD', facing };
            return { state: ClimbSummit.canCelebrate(g) ? 'VICTORY' : 'CHECKPOINT_IDLE', facing };
        }
        if (g.playerState === 'FALLING') return { state: 'FALL', facing };
        if (g.playerState === 'HIT'||c?.hitTime>0) return { state: 'HIT', facing };
        // TIRED is a prepared animation, not a newly invented stamina rule.
        if (g.playerState === 'TIRED') return { state: 'TIRED', facing,
            fixedFrame: g.pedraAtual?.tipo === 'checkpoint' ? undefined : 1 };
        if (g.playerState === 'SUMMIT_STANDING') return { state: 'CHECKPOINT_IDLE', facing };
        if (g.playerState === 'STANDING') {
            // A/D alone does not move a grounded fighter in this minigame.
            // Only actual horizontal displacement can play a walking cycle.
            const movement=Math.abs(g.vx||0)>.1?Math.sign(g.vx):0;
            return { state: movement < 0 ? 'CHECKPOINT_WALK_LEFT' : movement > 0
                ? 'CHECKPOINT_WALK_RIGHT' : 'CHECKPOINT_IDLE', facing };
        }
        if (g.playerState === 'AIRBORNE') {
            if (c?.forcedFall||g.vy>3.5||g.fallFrames>0) return { state: 'FALL', facing };
            const sinceJump=c?.jumpAt===undefined?1:c.time-c.jumpAt;
            if(c?.checkpointLaunch&&sinceJump<.14)return {state:'CHECKPOINT_JUMP',facing};
            const fixedFrame = sinceJump < .065 ? 0 : g.vy < -1.2 ? 1 : g.vy <= 1.5 ? 2 : 3;
            return { state: 'JUMP', facing, fixedFrame };
        }
        if (g.playerState === 'GRABBING') return { state: c?.recovering?'HANG':'CLIMB_MOVE', facing };
        const slippery=['moss','ice','moving_ice'].includes(g.pedraAtual?.tipo);
        if (slippery&&g.slipTimer>0) return { state: 'HANG', facing };
        if (direction) return { state: 'CLIMB_SIDE', facing };
        const moving = g.pedraAtual && (Math.abs(g.pedraAtual.motionVX || 0) + Math.abs(g.pedraAtual.motionVY || 0) > .08);
        return { state: moving ? 'CLIMB_MOVE' : 'CLIMB_IDLE', facing };
    }

    function observe(g,c){
        const s=g.summitSequence;
        if(s&&s!==c.summit){c.summit=s;c.summitPull=false;c.queue=null;c.forcedFall=false;c.hitTime=0;}
        if(s&&!c.summitPull&&s.phase==='PULL_UP'){
            c.summitPull=true;
            sequence(c,'summit',s.holdId,[['PULL_UP',timing.pullUp],['CLIMB_CORNER',timing.corner]]);
        }
        if(!s&&c.summit){c.summit=null;c.summitPull=false;c.queue=null;}
        if(g.playerState==='AIRBORNE'&&['GRABBED','STANDING'].includes(c.physical)){
            c.queue=null;c.forcedFall=true;
        }
        if(c.queue?.kind!=='summit'&&c.queue&&
            (!['GRABBED','STANDING'].includes(g.playerState)||g.pedraAtual?.id!==c.queue.holdId))c.queue=null;
        c.physical=g.playerState;c.lastX=g.playerX;c.lastY=g.playerY;
    }
    function clipSelection(g,c){
        const q=c.queue;if(!q)return null;
        let elapsed=q.elapsed;
        for(const [state,duration] of q.clips){
            if(elapsed<duration)return {state,progress:clamp(elapsed/duration,0,.999),kind:q.kind};
            elapsed-=duration;
        }
        // Keep the final contact pose until the REAL summit body has stood up.
        // The animation itself still runs on seconds, not on s.frame counters.
        if(q.kind==='summit'&&!g.summitSequence?.stood)return {state:'CLIMB_CORNER',progress:.999,kind:'summit'};
        c.queue=null;return null;
    }

    function describe(state, index, facing = 1) {
        const config = atlas.states[state];
        if (!config) throw new Error(`Estado visual da Escalada desconhecido: ${state}`);
        index = clamp(Math.floor(index), 0, config.frames.length - 1);
        const id = config.frames[index], frame = frames.get(id);
        const flipX = config.mirror === true || config.mirror === 'left' && facing < 0
            || config.mirror === 'right' && facing > 0;
        return { state, index, id, frame, config, anchor: frame.anchors[config.anchor],
            offset: config.targetOffset, flipX, scale };
    }

    function sample(g,input,c){
        observe(g,c);
        let selected=resolve(g,input,c);
        const clip=clipSelection(g,c);
        if(clip)selected={...selected,...clip};
        const override = debug.enabled && debug.stateIndex >= 0;
        if (override) selected = { state: names[debug.stateIndex], facing: selected.facing, fixedFrame: debug.frameIndex };
        if(c.state!==selected.state||c.override!==override){
            c.previous=c.last?{...c.last,previous:null}:null;
            c.state=selected.state;c.stateTime=0;c.override=override;
        }
        const config = atlas.states[selected.state], count = config.frames.length;
        let index = selected.fixedFrame;
        if (index === undefined && selected.progress !== undefined) index = Math.floor(selected.progress * count);
        if (index === undefined) {
            const elapsedFrame = Math.floor(c.stateTime * config.fps + 1e-8);
            index = config.loop ? elapsedFrame % count : Math.min(count - 1, elapsedFrame);
        }
        const result = describe(selected.state, index, selected.facing);
        result.offset=[...result.offset];
        if(!override&&selected.kind==='ledge'){
            // Small visual hoist above the existing, already-valid platform.
            // No movement/collision/input delay is introduced by this animation.
            if(result.state==='CLIMB_HOLD'||result.state==='HANG')result.offset[1]+=10;
            else if(result.state==='PULL_UP')result.offset[1]+=(1-ease(selected.progress))*10;
        }
        if(!override&&result.state==='CLIMB_CORNER'&&selected.progress>.85){
            const t=ease((selected.progress-.85)/.15),feet=result.frame.anchors.feet;
            result.anchor=result.anchor.map((v,i)=>v+(feet[i]-v)*t);
            result.offset[1]+=(3-result.offset[1])*t;
        }
        if(!override&&selected.kind==='checkpoint'&&result.state==='PULL_UP'){
            // The physical body rises with the hoist. Settle the final pose on
            // its feet before entering the standing/walking animation family.
            const t=ease((selected.progress-.65)/.35),feet=result.frame.anchors.feet;
            result.anchor=result.anchor.map((v,i)=>v+(feet[i]-v)*t);
            result.offset[1]+=(3-result.offset[1])*t;
        }
        result.previous=override?null:c.previous;
        result.blend=override?1:clamp(c.stateTime/timing.blend,0,1);
        if(result.blend===1){result.previous=null;c.previous=null;}
        c.last=result;
        return result;
    }
    function pose(g,input={},now=performance.now()){return sample(g,input,sync(g,now));}
    // Explicit deltaTime entry point, also used to compare 30/60/144 Hz playback.
    function advance(g,input={},deltaTime=0){const c=clockFor(g);tick(c,deltaTime);return sample(g,input,c);}

    function drawPose(ctx, image, p, x, y) {
        if (!image?.complete || !image.naturalWidth) return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(x + p.offset[0], y + p.offset[1]);
        if (p.flipX) ctx.scale(-1, 1);
        ctx.drawImage(image, -p.anchor[0] * scale, -p.anchor[1] * scale,
            image.naturalWidth * scale, image.naturalHeight * scale);
        ctx.restore();
    }

    function draw(ctx, library, g, input, x, y, now = performance.now()) {
        const p = pose(g, input, now);
        ctx.save();
        if (p.previous && p.blend < 1) {
            ctx.globalAlpha = 1 - p.blend;
            drawPose(ctx, library.images[p.previous.id], p.previous, x, y);
        }
        ctx.globalAlpha = p.previous ? p.blend : 1;
        drawPose(ctx, library.images[p.id], p, x, y);
        ctx.restore();
        if (debug.enabled) drawGuides(ctx, p, x, y);
        return p;
    }

    function drawGuides(ctx, p, x, y) {
        ctx.save();
        const ax = x + p.offset[0], ay = y + p.offset[1], bounds = p.frame.visibleBounds;
        ctx.translate(ax, ay);
        if (p.flipX) ctx.scale(-1, 1);
        ctx.strokeStyle = '#54e7ff'; ctx.lineWidth = .8;
        ctx.strokeRect((bounds[0]-p.anchor[0])*scale, (bounds[1]-p.anchor[1])*scale,
            (bounds[2]-bounds[0])*scale, (bounds[3]-bounds[1])*scale);
        ctx.strokeStyle = '#ffe26b'; ctx.beginPath();
        ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();
        ctx.restore();
        ctx.save();ctx.lineWidth=.8;ctx.strokeStyle='#ff79d5';
        // Exact existing damage circle: obj.r + 16, centered at playerY - 14.
        ctx.beginPath();ctx.arc(x,y-14,atlas.collision.body.radius,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#83b7ff';ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.stroke();
        ctx.restore();
    }

    function drawOverlay(ctx, g, c) {
        if (!debug.enabled) return;
        const p = clocks.get(g)?.last;
        if (!p) return;
        // Put the inspector opposite the actor, so it cannot hide the pose
        // currently being checked. Its screen side is unchanged by the zoom.
        const actorX = g.playerX - g.cameraX;
        const x = actorX > c.width / 2 ? 6 : c.width - 200, y = 40;
        ctx.save();ctx.globalAlpha=1;ctx.fillStyle='rgba(8,18,31,.94)';ctx.fillRect(x,y,194,132);
        ctx.textAlign='left';ctx.font='8px monospace';
        const lines = [
            `${p.state}${debug.stateIndex >= 0 ? ' [PREVIEW]' : ' [AUTO]'}`,
            `${p.id}  ${p.index+1}/${p.config.frames.length}`,
            `sourceRect: ${p.frame.sourceRect.join(',')}`,
            `anchor ${p.config.anchor}: ${p.anchor.map(n=>n.toFixed(1)).join(',')}`,
            `body: (0,-14) R16 [physics]`,
            `scale: ${scale.toFixed(4)}  mirror: ${p.flipX}`,
            `game: ${g.playerState} (unchanged)`,
            'CYAN bounds / YELLOW anchor',
            'MAGENTA physical hitbox',
            'PgUp/PgDn: state  LEFT/RIGHT: frame',
            'HOME: AUTO  F8: close'
        ];
        lines.forEach((line,i)=>{ctx.fillStyle=i===0?'#ffe5a1':'#d5e6ef';ctx.fillText(line,x+6,y+12+i*11);});
        ctx.restore();
    }

    function handleKeyDown(event) {
        if (event.code === 'F8') {
            if (!event.repeat) debug.enabled = !debug.enabled;
            event.preventDefault();return true;
        }
        if (!debug.enabled) return false;
        if (!['PageDown','PageUp','ArrowLeft','ArrowRight','Home'].includes(event.code)) return false;
        event.preventDefault();
        if (event.repeat) return true;
        if (event.code === 'Home') { debug.stateIndex=-1;debug.frameIndex=0; }
        else if (event.code === 'PageDown' || event.code === 'PageUp') {
            debug.stateIndex=(debug.stateIndex+(event.code==='PageDown'?1:-1)+names.length)%names.length;
            debug.frameIndex=0;
        } else {
            if (debug.stateIndex < 0) debug.stateIndex=0;
            const length=atlas.states[names[debug.stateIndex]].frames.length;
            debug.frameIndex=(debug.frameIndex+(event.code==='ArrowRight'?1:-1)+length)%length;
        }
        return true;
    }

    function snapshot(g) {
        const p=clocks.get(g)?.last;
        return p ? { state:p.state,id:p.id,index:p.index,sourceRect:p.frame.sourceRect,
            anchor:p.anchor,anchorType:p.config.anchor,flipX:p.flipX,scale,
            debug:debug.enabled,preview:debug.enabled&&debug.stateIndex>=0,
            deltaTime:clocks.get(g).deltaTime,animationTime:clocks.get(g).stateTime,
            transition:clocks.get(g).queue?.kind||null } : null;
    }
    return Object.freeze({ createLibrary, resolve, describe, pose, draw, drawPose,
        drawGuides, drawOverlay, handleKeyDown, snapshot, names, debug, atlas,
        notify,reset,advance,timing });
})();
