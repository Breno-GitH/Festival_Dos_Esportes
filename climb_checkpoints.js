/* Physical checkpoint platforms. The rest of the climbing air physics is unchanged. */
window.ClimbCheckpoints = (() => {
    'use strict';
    const contexts = new WeakMap();
    const timing = Object.freeze({ hang: .16, pull: .66, preparation: .09, walkSpeed: 100 });
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const ease = n => { n = clamp(n, 0, 1); return n*n*(3-2*n); };
    function context(g) {
        if (!contexts.has(g)) contexts.set(g, { saved: new Map(), view: null, lastWalk: 0 });
        return contexts.get(g);
    }
    function bounds(h) {
        const p = h.platform;
        return { left: (p?.left ?? h.baseX-41) + (p?.footInset ?? 12),
            right: (p?.right ?? h.baseX+43) - (p?.footInset ?? 12) };
    }
    function contact(g, h) {
        if (h?.tipo !== 'checkpoint' || g.playerState !== 'AIRBORNE') return null;
        const b = bounds(h);
        if (g.playerX < b.left-6 || g.playerX > b.right+6) return null;
        const feet = g.playerY-h.y;
        if (feet >= 20 && Math.abs(feet-44) <= 11) return 'edge';
        // Descending from above the surface, rather than merely brushing its side.
        if (g.vy >= 0 && Math.abs(feet) <= 9 && feet-g.vy <= 2) return 'landing';
        return null;
    }
    function reset(g) {
        contexts.delete(g); g.checkpointEntry = null; g.checkpointJump = null;
    }
    function begin(g, h, now = performance.now()) {
        const mode = contact(g,h);
        if (!mode) return false;
        const c = context(g), b = bounds(h);
        c.view = { holdId:h.id, altitude:g.alturaAtual, cameraX:g.cameraX };
        c.lastWalk = now;
        g.checkpointEntry = { holdId:h.id, phase:'HANG', elapsed:0, lastNow:now,
            startX:g.playerX, endX:clamp(g.playerX,b.left,b.right), startY:g.playerY,
            edgeY:h.y+(mode==='edge'?44:6), surfaceY:h.y, progress:0, mode };
        g.checkpointJump=null; g.pedraAtual=h; g.grabTarget=null;
        g.playerState='CHECKPOINT_HANG'; g.vx=0; g.vy=0;
        g.jumpBufferTimer=0; g.gripTimer=0; g.shakeTimer=0;
        ClimbSprites.notify(g,'checkpoint_begin');
        return true;
    }
    function active(g) { return !!(g.checkpointEntry || g.checkpointJump); }
    function locked(g) {
        return active(g) || (g.playerState==='STANDING' && g.pedraAtual?.tipo==='checkpoint');
    }
    function lockCamera(g) {
        const c=context(g);
        if (!locked(g) || !c.view) return false;
        g.alturaAtual=c.view.altitude; g.cameraX=c.view.cameraX; return true;
    }
    function update(g, now = performance.now()) {
        const s = g.checkpointEntry || g.checkpointJump;
        if (!s) return null;
        s.elapsed += Math.max(0,(now-s.lastNow)/1000); s.lastNow=now;
        lockCamera(g);
        if (g.checkpointJump) {
            if (s.elapsed < timing.preparation) return null;
            g.checkpointJump=null; return { type:'LAUNCH', direction:s.direction };
        }
        const h=g.pedraAtual;
        if (s.elapsed < timing.hang) {
            s.phase='HANG'; s.progress=s.elapsed/timing.hang;
            g.playerY=s.startY+(s.edgeY-s.startY)*ease(s.progress);
            g.playerX=s.startX+(s.endX-s.startX)*ease(s.progress);
        } else {
            s.phase='PULL_UP'; s.progress=clamp((s.elapsed-timing.hang)/timing.pull,0,1);
            g.playerState='CHECKPOINT_PULL_UP';
            g.playerY=s.edgeY+(s.surfaceY-s.edgeY)*ease(s.progress);
            g.playerX=s.endX;
        }
        if (s.elapsed < timing.hang+timing.pull) return null;
        g.playerX=s.endX; g.playerY=h.y; g.playerState='STANDING';
        g.checkpointEntry=null; g.airFrames=0; g.vx=0; g.vy=0;
        g.settleTimer=0; g.fallFrames=0; g.slipTimer=0; g.nextJumpControl=1;
        context(g).lastWalk=now;
        ClimbSprites.notify(g,'checkpoint_stand');
        return { type:'STOOD', hold:h };
    }
    function walk(g, input, now = performance.now()) {
        const c=context(g), b=bounds(g.pedraAtual);
        const dt=clamp((now-c.lastWalk)/1000,0,.05); c.lastWalk=now;
        const before=g.playerX, direction=(input.d?1:0)-(input.a?1:0);
        g.playerX=clamp(before+direction*timing.walkSpeed*dt,b.left,b.right);
        g.vx=dt>0?(g.playerX-before)/dt/60:0; g.vy=0;
        g.playerY=g.pedraAtual.y; lockCamera(g);
    }
    function prepareJump(g,direction,now=performance.now()) {
        if (g.playerState!=='STANDING' || g.pedraAtual?.tipo!=='checkpoint') return false;
        g.checkpointJump={direction,elapsed:0,lastNow:now};
        g.playerState='CHECKPOINT_JUMP_READY'; g.vx=0; g.vy=0;
        return true;
    }
    function confirm(g,h) {
        const b=bounds(h);
        if (g.playerState!=='STANDING' || g.pedraAtual!==h || g.playerY!==h.y || g.playerX<b.left || g.playerX>b.right) return false;
        const c=context(g);
        c.saved.set(h.id,{...c.view,spawnX:g.playerX}); return true;
    }
    function restore(g,h) {
        g.checkpointEntry=null; g.checkpointJump=null;
        const c=context(g), saved=c.saved.get(h.id);
        c.view=null;
        if (h.tipo!=='checkpoint' || !saved) return;
        g.alturaAtual=saved.altitude; g.cameraX=saved.cameraX;
        h.y=220-h.climbY+g.alturaAtual;
        g.playerX=clamp(saved.spawnX,bounds(h).left,bounds(h).right); g.playerY=h.y;
        c.view={...saved}; c.lastWalk=performance.now();
    }
    return Object.freeze({timing,bounds,canGrip:(g,h)=>!!contact(g,h),begin,reset,
        active,locked,lockCamera,update,walk,prepareJump,confirm,restore});
})();
