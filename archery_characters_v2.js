(function () {
    'use strict';
    // Presentation only. Projectile creation, controls, collisions and scoring
    // remain owned by the existing archery simulation in script.js.
    const manifest = window.ARCHERY_CHARACTER_V2_MANIFEST;
    if (!manifest) throw new Error('Atlas de personagens da Arquearia 2.0 ausente.');
    const base = new URL('.', document.currentScript.src);
    const images = new Map();
    const groups = new Map();
    let loaded = 0;
    let failed = 0;
    const ready = Promise.all(Object.entries(manifest.characters).map(([name, character]) => {
        for (const state of Object.keys(manifest.states)) {
            groups.set(name + ':' + state, character.frames.filter(frame => frame.state === state));
        }
        return new Promise(resolve => {
            const image = new Image();
            images.set(name, image);
            image.onload = () => { loaded++; resolve(true); };
            image.onerror = () => { failed++; resolve(false); };
            image.src = new URL(character.image + '?v=' + manifest.version, base).href;
        });
    }));
    const now = () => performance.now() / 1000;
    const records = new Map();
    function record(owner) {
        if (!records.has(owner)) records.set(owner, {
            state: 'IDLE', since: now(), restSince: now(), shot: -Infinity,
            hit: -Infinity, frame: null, pendingReaction:null, reaction:null, cue:null,
            reactions:{HIT_REACTION:0,MISS_REACTION:0,GOLDEN_LOST:0},shown:{HIT_REACTION:0,MISS_REACTION:0,GOLDEN_LOST:0}
        });
        return records.get(owner);
    }
    function reset() { records.clear(); record('PLAYER'); record('MESTRE'); }
    function shoot(owner) { record(owner).shot = now(); record(owner).hit = -Infinity; }
    const priority={HIT_REACTION:1,MISS_REACTION:2,GOLDEN_LOST:3};
    function react(owner,kind) {
        const r=record(owner),time=now();r.reactions[kind]++;
        if(!r.pendingReaction||time-r.pendingReaction.queuedAt>2||priority[kind]>=priority[r.pendingReaction.kind])
            r.pendingReaction={kind,queuedAt:time};
        if(!r.cue||r.cue.until<time||priority[kind]>=priority[r.cue.kind])r.cue={kind,until:time+.65};
    }
    function hit(owner) { record(owner).hit = now();react(owner,'HIT_REACTION'); }
    function miss(owner) { react(owner,'MISS_REACTION'); }
    function goldenLost(owner) { react(owner,'GOLDEN_LOST'); }
    function reactionPose(r,time) {
        if(r.pendingReaction&&time-r.pendingReaction.queuedAt>2)r.pendingReaction=null;
        const active=r.reaction&&time-r.reaction.since<.64;
        if(r.pendingReaction&&(!active||priority[r.pendingReaction.kind]>priority[r.reaction.kind])){
            r.reaction={kind:r.pendingReaction.kind,since:time};r.pendingReaction=null;r.shown[r.reaction.kind]++;
        }
        return r.reaction&&time-r.reaction.since<.64?r.reaction:null;
    }

    function resolve(owner, game, time = now()) {
        const r = record(owner);
        const player = owner === 'PLAYER';
        const logic = player ? game.playerState : game.mestreState;
        const masterLogic=!player&&game.masterAI?game.masterAI.state:logic;
        const shotAge = time - r.shot;
        const playerBusy=player&&game.playerControl&&['RAISE_BOW','DRAW_BOWSTRING','RELEASE_SHOT','RECOVERY'].includes(logic);
        const masterBusy=!player&&game.masterAI&&['READY','RAISE_BOW','DRAW_BOWSTRING','AIM','RELEASE_SHOT','RECOVERY'].includes(masterLogic);
        // Reactions never skip a real draw/release/recovery or replace walking
        // with stationary feet. A single pending reaction is held until readable.
        const reaction=!playerBusy&&!masterBusy&&logic!=='MOVE'&&(player||shotAge>=.40)
            &&!['TUTORIAL','GAMEOVER'].includes(game.gameState)?reactionPose(r,time):null;
        let state = 'IDLE';
        let elapsed;
        let fps;
        if (game.gameState === 'GAMEOVER') {
            const won = !game.tie && (player ? game.win : !game.win);
            state = won ? 'VICTORY' : (game.tie ? 'IDLE' : 'MISS_REACTION');
        } else if (game.gameState === 'TUTORIAL') {
            state = 'IDLE';
        } else if (playerBusy) {
            const timing={RAISE_BOW:'raise',DRAW_BOWSTRING:'draw',RELEASE_SHOT:'release',RECOVERY:'recovery'};
            state=logic;elapsed=game.playerControl.age/60;
            fps=manifest.states[state].count*60/window.ArcheryPlayerControl.CONFIG[timing[state]];
        } else if (masterBusy) {
            // These poses follow the actual AI simulation, including the moment
            // the projectile is released. Scoring feedback never skips a draw.
            const timing={READY:'ready',RAISE_BOW:'raise',DRAW_BOWSTRING:'draw',AIM:'aim',RELEASE_SHOT:'release',RECOVERY:'recovery'};
            state=masterLogic;elapsed=game.masterAI.age/60;
            fps=manifest.states[state].count*60/(game.masterAI.timing||window.ArcheryMasterAI.CONFIG)[timing[state]];
        } else if (!player && shotAge < 0.16) {
            state = 'RELEASE_SHOT'; elapsed = shotAge; fps = 25;
        } else if (!player && shotAge < 0.40) {
            state = 'RECOVERY'; elapsed = shotAge - 0.16; fps = 4 / 0.24;
        } else if (reaction) {
            // The authored HIT_REACTION raises a fist: reaction to scoring a hit.
            // This sport has no incoming damage or hurt mechanic.
            state = reaction.kind==='GOLDEN_LOST'?'MISS_REACTION':reaction.kind;
            elapsed=Math.max(0,time-reaction.since);fps=8;
        } else if (logic === 'MISS') {
            state = 'MISS_REACTION';
        } else {
            if (!player && game.masterAI) {
                state = logic==='MOVE'?'WALK_UP':'IDLE';
            } else if (logic === 'MOVE') {
                // The sheet supplies back/up positioning steps, not side aiming.
                state = 'WALK_UP'; r.restSince = time;
            } else if(player&&game.playerControl){
                state='READY';
            } else {
                const age = time - r.restSince;
                state = age < 0.30 ? 'IDLE' : age < 0.55 ? 'READY' : age < 0.80 ? 'RAISE_BOW' : age < 1.05 ? 'DRAW_BOWSTRING' : 'AIM';
            }
        }
        if (state !== r.state) { r.state = state; r.since = time; }
        return { state, elapsed: elapsed === undefined ? time - r.since : elapsed, fps };
    }

    function drawState(ctx, name, state, seconds, x, feetY, options = {}) {
        const frames = groups.get(name + ':' + state);
        const image = images.get(name);
        if (!frames || !frames.length || !image || !image.complete || !image.naturalWidth) return null;
        const config = manifest.states[state];
        const position = options.frame === undefined
            ? Math.floor(Math.max(0, seconds) * (options.fps || config.fps)) : options.frame;
        const index = config.loop && options.frame === undefined
            ? position % frames.length : Math.max(0, Math.min(frames.length - 1, position));
        const frame = frames[index];
        const scale = options.scale === undefined ? manifest.scale : options.scale;
        const [sx, sy, w, h] = frame.atlasRect;
        const [ax, ay] = frame.anchor;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        // One uniform scale and one foot anchor for every pose; no mirroring.
        ctx.drawImage(image, sx, sy, w, h, x - ax * scale, feetY - ay * scale, w * scale, h * scale);
        if (options.debug) {
            ctx.strokeStyle = '#5df5f0'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x - 7, feetY); ctx.lineTo(x + 7, feetY);
            ctx.moveTo(x, feetY - 5); ctx.lineTo(x, feetY + 5); ctx.stroke();
        }
        ctx.restore();
        return frame;
    }
    function draw(ctx, owner, game, x, feetY) {
        const visual = resolve(owner, game);
        const frame = drawState(ctx, owner === 'PLAYER' ? 'zorp' : 'master', visual.state, visual.elapsed, x, feetY, { fps: visual.fps });
        record(owner).frame = frame ? frame.id : null;
        if(owner==='MESTRE'&&visual.state==='AIM'){
            ctx.save();ctx.globalAlpha=.45+.2*Math.sin(game.masterAI.age*.6);ctx.fillStyle='#f5dab1';
            ctx.fillRect(x-2,feetY-88,5,1);ctx.fillRect(x,feetY-90,1,5);ctx.restore();
        }
        const r=record(owner);
        if(game.gameState!=='GAMEOVER'&&game.gameState!=='TUTORIAL'&&r.cue&&r.cue.until>now()){
            const alpha=Math.min(1,(r.cue.until-now())*5),cx=Math.max(12,Math.min(438,x+20)),cy=feetY-72;
            ctx.save();ctx.globalAlpha=alpha;ctx.lineWidth=1;
            if(r.cue.kind==='GOLDEN_LOST'){
                ctx.fillStyle='#33443a';ctx.fillRect(cx-7,cy-9,15,14);ctx.strokeStyle='#d2a651';
                ctx.beginPath();ctx.arc(cx,cy-2,4,0,Math.PI*2);ctx.stroke();
                ctx.strokeStyle='#e9d7ab';ctx.beginPath();ctx.moveTo(cx-5,cy+3);ctx.lineTo(cx+5,cy-7);ctx.stroke();
            }else if(r.cue.kind==='HIT_REACTION'){
                ctx.fillStyle='#d9edbd';ctx.fillRect(cx-1,cy-5,2,8);ctx.fillRect(cx-4,cy-2,8,2);
            }else{
                ctx.fillStyle='#d5d9c0';for(let n=0;n<3;n++)ctx.fillRect(cx-4+n*3,cy,1,2);
            }
            ctx.restore();
        }
        return visual.state;
    }
    function diagnostics() {
        return {
            version: manifest.version, loaded, failed, ready: loaded === 2 && failed === 0,
            frames: Object.fromEntries(Object.entries(manifest.characters).map(([key, value]) => [key, value.frames.length])),
            canvas: manifest.canvas, anchor: manifest.anchor, scale: manifest.scale,
            orientation: manifest.orientation, mirrored: false,
            actors: Object.fromEntries([...records].map(([key, r]) => [key, {state:r.state,frame:r.frame,
                pending:r.pendingReaction?.kind||null,reaction:r.reaction?.kind||null,reactions:{...r.reactions},shown:{...r.shown}}]))
        };
    }
    window.archeryCharactersV2 = { manifest, ready, reset, shoot, hit, miss, goldenLost, resolve, draw, drawState, diagnostics };
    reset();
})();
