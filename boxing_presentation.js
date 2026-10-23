"use strict";

// Presentation only: no attack clocks, positions, targets or damage are changed here.
const BOXING_SHOW_CONFIG = Object.freeze({ particleLimit: 128, crowdCount: 64,
    arenaScale: 0.344, shakeLimit: 4, palette: ["#f6cd70", "#92dce8", "#e880a6", "#eee9d9"] });
const boxingShow = {
    camera:{x:0,y:0},meters:{zorp:boxingMakeVisualReadout(),master:boxingMakeVisualReadout()},
    frame: 0, seed: 2718, energy: 0, flash: 0, celebration: 0, celebrationAge: 0,
    count: 0, countPulse: 0, peakParticles: 0, events: {},
    particles: Array.from({ length: BOXING_SHOW_CONFIG.particleLimit }, () => ({ life: 0 })),
    recoil: { zorp: { life: 0 }, master: { life: 0 } },
    crowd: Array.from({ length: BOXING_SHOW_CONFIG.crowdCount }, (_, i) => {
        const row = Math.floor(i / 32), slot = i % 32;
        const x = 5 + slot * 14.2;
        return { x, y: row ? 102 + (i % 3) : 77 + (i % 3),
            size: row ? 1.65 : 1.1, phase: i * 1.73, group: Math.floor(slot / 4),
            // Keep the central stairs/entrance unobstructed.
            visible: x < 181 || x > 270 };
    })
};
// Small native Web Audio cues; bounded voices, no external files or persistent sound loops.
const boxingAudio={context:null,noise:null,voices:new Set(),played:0,peak:0,lastTime:-1};
function boxingUnlockAudio(){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    try{
        if(!boxingAudio.context){
            const audio=boxingAudio.context=new Audio();
            boxingAudio.noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.12),audio.sampleRate);
            const samples=boxingAudio.noise.getChannelData(0);let seed=9713;
            for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
        }
        if(boxingAudio.context.state==='suspended')boxingAudio.context.resume().catch(()=>{});
    }catch(_){/* A blocked audio device does not affect combat. */}
}
window.addEventListener('keydown',e=>{
    if(typeof currentScene!=='undefined'&&currentScene==='JOGO_BOXE'&&!e.repeat&&['j','k','l','i','o',' '].includes(e.key.toLowerCase()))boxingUnlockAudio();
});
function boxingSound(kind){
    const audio=boxingAudio.context;
    const cue={jab:[.045,850,.055],cross:[.065,480,.08],block:[.035,1900,.035],
        dodge:[.055,3100,.018],counter:[.075,680,.085],guardBreak:[.09,2300,.06],special:[.10,390,.09]}[kind];
    if(!cue||!audio||audio.state!=='running'||boxingAudio.voices.size>=4||audio.currentTime-boxingAudio.lastTime<.018)return;
    const [duration,cutoff,volume]=cue,now=audio.currentTime;
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    source.buffer=boxingAudio.noise;filter.type=kind==='block'||kind==='guardBreak'?'bandpass':'lowpass';filter.frequency.value=cutoff;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.003);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(audio.destination);
    boxingAudio.voices.add(source);boxingAudio.peak=Math.max(boxingAudio.peak,boxingAudio.voices.size);boxingAudio.played++;boxingAudio.lastTime=now;
    source.onended=()=>{boxingAudio.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
    source.start(now);source.stop(now+duration+.006);
}
function boxingShowRandom() {
    boxingShow.seed = (Math.imul(boxingShow.seed, 1664525) + 1013904223) >>> 0;
    return boxingShow.seed / 4294967296;
}
function resetBoxingPresentation() {
    const s = boxingShow;
    s.camera.x=0;s.camera.y=0;s.meters.zorp=boxingMakeVisualReadout();s.meters.master=boxingMakeVisualReadout();
    s.frame = 0; s.seed = 2718; s.energy = 0; s.flash = 0;
    s.celebration = 0; s.celebrationAge = 0; s.count = 0; s.countPulse = 0;
    s.peakParticles = 0; s.events = {};
    for (const p of s.particles) p.life = 0;
    for (const r of Object.values(s.recoil)) r.life = 0;
}
function boxingShowConfetti(amount) {
    // A fixed pool; spent pieces are reused. No new images or persistent particles.
    for (const p of boxingShow.particles) {
        if (amount <= 0) break;
        if (p.life > 0) continue;
        const left = boxingShowRandom() < .5;
        Object.assign(p, { kind: "confetti", x: left ? 22 : 428,
            y: 72 + boxingShowRandom() * 24,
            vx: (left ? 1 : -1) * (0.4 + boxingShowRandom() * 1.4),
            vy: -1.8 - boxingShowRandom() * 1.6,
            life: 130 + boxingShowRandom() * 60, maxLife: 190,
            angle: boxingShowRandom() * 6.28, spin: .06 + boxingShowRandom() * .09,
            color: BOXING_SHOW_CONFIG.palette[Math.floor(boxingShowRandom() * 4)] });
        amount--;
    }
}
function boxingShowEvent(kind, actor, direction = 1) {
    const s = boxingShow;
    boxingSound(kind);
    s.events[kind] = (s.events[kind] || 0) + 1;
    const power = { intro: .22, jab: .18, block: .1, dodge: .16, cross: .4,
        hook: .56, dash: .66, charged: .7, counter: .82,
        guardBreak: .82, special:.8, knockdown: 1, finisher: 1, victory: 1 }[kind] || .25;
    s.energy = Math.min(1, Math.max(s.energy, power));
    if (["counter", "guardBreak", "knockdown", "finisher", "victory"].includes(kind))
        s.flash = Math.max(s.flash, kind === "finisher" ? .085 : .045);
    if (kind === "finisher" || kind === "victory") {
        // Confetti cannons are reserved for the decisive finish, never ordinary hits.
        s.celebration = kind === "victory" ? 270 : 210;
        boxingShowConfetti(kind === "victory" ? 36 : 24);
    }
    if (!actor || actor.role === "judge") return;
    const r = s.recoil[actor.role];
    if (r && !["intro", "victory", "finisher"].includes(kind)) {
        r.life = kind === "block" ? 5 : kind === "jab" ? 5 : 8;
        r.maxLife = r.life; r.direction = direction;
        r.strength = kind === "block" ? .35 : Math.min(1, power + .25);
        // The shared simulation owns the 1–3 contact steps, so no second pose freeze is added here.
        r.hold = 0; r.poseFrame = actor.stateFrame;
    }
    if (["dodge", "guardBreak", "counter", "hook", "dash", "charged"].includes(kind)) {
        let remaining = kind === "guardBreak" ? 9 : 5;
        for (const p of s.particles) {
            if (!remaining) break;
            if (p.life > 0) continue;
            Object.assign(p, { kind: kind === "guardBreak" ? "guard" : "contact",
                x: actor.x - direction * 9, y: actor.y - 49,
                vx: direction * (.4 + boxingShowRandom() * 1.5),
                vy: -1.5 + boxingShowRandom() * 2,
                life: 9 + boxingShowRandom() * 7, maxLife: 16,
                color: kind === "guardBreak" ? "#a5dded" : "#f7e6bb" });
            remaining--;
        }
    }
}
function updateBoxingPresentation() {
    const s = boxingShow;
    updateBoxingVisualReadouts();
    s.frame++; s.energy *= .975; s.flash *= .68;
    s.countPulse *= .86;
    for (const r of Object.values(s.recoil)) {
        if (r.life > 0) r.life--;
        if (r.hold > 0) r.hold--;
    }
    if (boxeGame.phase === "KNOCKDOWN") {
        const count = boxeGame.knockdown?.count || 0;
        if (count !== s.count) { s.count = count; s.countPulse = 1; s.energy = Math.max(s.energy, .35); }
    } else { s.count = 0; }
    if (s.celebration > 0) {
        s.celebration--; s.celebrationAge++;
        if (s.celebrationAge % 22 === 0) boxingShowConfetti(8);
    }
    let active = 0;
    for (const p of s.particles) {
        if (p.life <= 0) continue;
        p.life--; active++;
        p.x += p.vx; p.y += p.vy;
        p.vy += p.kind === "confetti" ? .026 : .07;
        if (p.kind === "confetti") { p.vx *= .995; p.angle += p.spin; }
        if (p.y > 294) p.life = 0;
    }
    s.peakParticles = Math.max(s.peakParticles, active);
}
function boxingArenaFraming() {
    const scale = BOXING_SHOW_CONFIG.arenaScale;
    return { scale, x: (450 - imgBoxeArenaBg.naturalWidth * scale) / 2, y: -20 };
}
function drawBoxingOfficialArena() {
    const bg = imgBoxeArenaBg;
    ctx.fillStyle = "#11151e"; ctx.fillRect(0, 0, 450, 300);
    if (!bg.complete || !bg.naturalWidth) return;
    const f = boxingArenaFraming();
    ctx.save(); ctx.imageSmoothingEnabled = false;
    // One uniform scale: the real mat spans y166..252, matching the existing ring.
    ctx.drawImage(bg, f.x, f.y, bg.naturalWidth * f.scale, bg.naturalHeight * f.scale);
    ctx.restore();
}
function drawBoxingCrowd() {
    const s = boxingShow;
    ctx.save();
    for (const person of s.crowd) {
        if (!person.visible) continue;
        const wave = Math.sin(s.frame * .09 - person.group * .63);
        const enthusiasm = s.energy * (.6 + wave * .4);
        const idle = Math.sin(s.frame * .025 + person.phase);
        const arm = enthusiasm > .28 || Math.sin(s.frame * .014 + person.phase) > .98;
        const lift = enthusiasm * 1.8;
        ctx.save(); ctx.translate(person.x + idle * .35, person.y - lift);
        ctx.scale(person.size, person.size);
        ctx.fillStyle = person.size > 1.5 ? "#151c29" : "#1c2431";
        ctx.beginPath(); ctx.arc(0, -4.8, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-2.5, -2.7, 5, 6, 1.7); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(-4, arm ? -6 - enthusiasm * 2 : 2);
        ctx.moveTo(2, -1); ctx.lineTo(4, arm ? -5 - enthusiasm * 2 : 2); ctx.stroke();
        ctx.restore();
    }
    // Sparse camera flashes stay in the spectator area, never across the fighters.
    if (s.energy > .5 && s.frame % 19 < 2) {
        const x = 35 + ((Math.floor(s.frame / 19) * 83) % 375);
        ctx.fillStyle = "rgba(218,234,255,.65)";
        ctx.fillRect(x - 2, 88, 4, 1); ctx.fillRect(x, 86, 1, 5);
    }
    ctx.restore();
}
function drawBoxingEventLighting() {
    const s = boxingShow;
    ctx.save();
    if (s.flash > .002) {
        ctx.fillStyle = `rgba(246,228,191,${s.flash})`; ctx.fillRect(0, 0, 450, 270);
    }
    if (boxeGame.phase === "KNOCKDOWN" || boxeGame.phase === "GETUP") {
        const judge = boxeGame.juiz;
        const beam = ctx.createLinearGradient(judge.x, 74, judge.x, judge.y + 6);
        beam.addColorStop(0, "rgba(255,229,163,0)");
        beam.addColorStop(1, "rgba(255,229,163,.1)");
        ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(judge.x - 8, 74);
        ctx.lineTo(judge.x + 29, judge.y + 5); ctx.lineTo(judge.x - 29, judge.y + 5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = `rgba(255,222,142,${.22 + s.countPulse * .4})`;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(judge.x, judge.y + 3, 18 + s.countPulse * 4, 5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Celebration is behind the combatants and below the HUD's draw order.
    for (const p of s.particles) {
        if (p.life <= 0 || p.kind !== "confetti") continue;
        ctx.save(); ctx.globalAlpha = Math.min(.75, p.life / 30);
        ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = p.color;
        ctx.fillRect(-1.3, -.6, 2.6 * Math.max(.2, Math.abs(Math.cos(p.angle))), 1.2);
        ctx.restore();
    }
    ctx.restore();
}
function drawBoxingContactParticles() {
    ctx.save();
    for (const p of boxingShow.particles) {
        if (p.life <= 0 || p.kind === "confetti") continue;
        ctx.globalAlpha = p.life / p.maxLife; ctx.strokeStyle = p.color;
        ctx.lineWidth = p.kind === "guard" ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); ctx.stroke();
    }
    ctx.restore();
}
function drawBoxingOfficialFrontRopes() {
    if (!imgBoxeArenaBg.complete || !imgBoxeArenaBg.naturalWidth) return;
    const f = boxingArenaFraming();
    // Reuse the photographed/pixel-art ropes, not a second procedural ring.
    // Narrow transparent occlusion keeps depth while preserving punch silhouettes.
    ctx.save(); ctx.globalAlpha = .62;
    ctx.beginPath();
    for (const [y, height] of [[528, 12], [608, 10], [689, 14]]) {
        ctx.rect(0, f.y + y * f.scale, 450, height * f.scale);
    }
    ctx.clip(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(imgBoxeArenaBg, f.x, f.y,
        imgBoxeArenaBg.naturalWidth * f.scale, imgBoxeArenaBg.naturalHeight * f.scale);
    ctx.restore();
}
function boxingPresentationSnapshot() {
    return { arena: "arena_boxe3.0.png", uniformScale: BOXING_SHOW_CONFIG.arenaScale,
        crowd: boxingShow.crowd.filter(p => p.visible).length, energy: boxingShow.energy,
        activeParticles: boxingShow.particles.filter(p => p.life > 0).length,
        peakParticles: boxingShow.peakParticles, particleLimit: BOXING_SHOW_CONFIG.particleLimit,
        camera:{...boxingShow.camera},visualStates:{zorp:boxingVisualState(boxeGame.player),master:boxingVisualState(boxeGame.mestre)},
        celebrationFrames: boxingShow.celebration, events: { ...boxingShow.events },
        audio:{state:boxingAudio.context?.state||'idle',activeVoices:boxingAudio.voices.size,peakVoices:boxingAudio.peak,played:boxingAudio.played} };
}

// All meter interpolation, indicators and camera offsets are presentation state only.
function boxingMakeVisualReadout(){return {hp:100,trail:100,hold:0,combo:0,comboPulse:0};}
function boxingVisualAssetReady(f){return boxingSpecialController(f)?.assetStatus?.()==='ready';}
function boxingVisualSpecialReady(f){return boxeGame.phase==='FIGHTING'&&f.hp>0&&boxingVisualAssetReady(f)&&f.specialCharge>=100&&!f.specialCooldown&&!f.special;}
function boxingVisualState(f){
    if(f.hp<=0)return {label:'NOCAUTE',color:'#ff8799',kind:'ko'};
    if(boxeGame.phase==='RESULT')return {label:'VENCEDOR',color:'#ffe093',kind:'winner'};
    if(f.guardBreakTimer)return {label:'GUARDA QUEBRADA',color:'#ff91b4',kind:'break'};
    if(f.hitstun||f.counterStun)return {label:'STUN',color:'#ffe093',kind:'stun'};
    if(f.special){
        const s=f.special;
        if(s.phase==='RECOVERY')return {label:'RECUPERANDO',color:'#b7b5ce',kind:'recovery'};
        if(f.role==='master')return {label:s.phase==='CHARGE'?'CARGA / SAIA DA LINHA':'DASH PUNCH',color:'#ffb184',kind:'special'};
        return {label:s.mode==='counter'?(s.phase==='EVADE'?'COUNTER / LEITURA':s.hits+' DE 6 SOCOS'):'WEAVE / PRESSÃO',color:'#a9ecba',kind:'special'};
    }
    if(f.dodgeFrames)return {label:'ESQUIVA',color:'#b9e7fb',kind:'dodge'};
    if(f.guard)return {label:'DEFENDENDO',color:'#95d8fa',kind:'guard'};
    if(f.whiffFrames)return {label:'RECUPERANDO',color:'#c4bfd3',kind:'recovery'};
    if(f.counterWindow)return {label:'CONTRA-ATAQUE',color:'#ffe093',kind:'counter'};
    if(boxingVisualSpecialReady(f))return {label:'ESPECIAL PRONTO',color:'#ffe093',kind:'ready'};
    return {label:boxeGame.phase==='INTRO'||boxeGame.phase==='READY'?'PREPARE-SE':'EM COMBATE',color:'#9cadbb',kind:'normal'};
}
function updateBoxingVisualReadouts(){
    for(const f of [boxeGame.player,boxeGame.mestre]){
        const v=boxingShow.meters[f.role];
        if(f.hp<v.hp)v.hold=12;
        if(f.hp>v.hp)v.trail=f.hp;
        v.hp=f.hp;
        if(v.hold)v.hold--;else v.trail=Math.max(f.hp,v.trail-1.25);
        if(f.comboCount>v.combo&&f.comboTimer>0)v.comboPulse=8;
        v.combo=f.comboCount;if(v.comboPulse)v.comboPulse--;
    }
    const c=boxingShow.camera,p=boxeGame.player,m=boxeGame.mestre;
    const x=boxingClamp((225-(p.x+m.x)/2)*.035,-3,3),y=boxingClamp((209-(p.y+m.y)/2)*.03,-1,1);
    c.x+=(x-c.x)*.075;c.y+=(y-c.y)*.075;
}
function boxingHudShield(g,x,y,color,broken=false){
    g.fillStyle=color;
    if(broken){g.fillRect(x,y,3,5);g.fillRect(x+5,y+2,3,5);g.fillRect(x+1,y+6,2,2);return;}
    g.fillRect(x,y,8,2);g.fillRect(x,y+2,2,3);g.fillRect(x+6,y+2,2,3);g.fillRect(x+2,y+5,4,2);g.fillRect(x+3,y+7,2,1);
}
function drawBoxingFighterState(f){
    if(f.role==='judge'||f.hp<=0)return;
    const state=boxingVisualState(f),x=Math.round(f.x+f.facing*26),y=Math.round(f.y-54);
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(state.kind==='guard'||f.guardFlash>0){
        boxingHudShield(ctx,x-4,y-4,f.guardPressure>70?'#ffb184':'#97ddfa');
        if(f.guardFlash){ctx.fillStyle='#edf9ff';ctx.fillRect(x-8,y-1,3,2);ctx.fillRect(x+6,y-1,3,2);}
    }
    if(state.kind==='break')boxingHudShield(ctx,x-4,y-3,'#ff91b4',true);
    if(state.kind==='stun'||state.kind==='break'){
        ctx.fillStyle=state.color;
        for(let i=0;i<3;i++){
            const a=boxingShow.frame*.16+i*Math.PI*2/3;
            ctx.fillRect(Math.round(f.x+Math.cos(a)*11)-1,Math.round(f.y-79+Math.sin(a)*3),3,2);
        }
    }
    if(state.kind==='counter'){ctx.fillStyle=state.color;ctx.fillRect(x-2,y-2,4,4);ctx.fillRect(x-5,y+4,2,2);}
    if(state.kind==='special'&&f.role==='master'&&f.special.phase==='CHARGE'){
        const sides=boxingRingSides(f.special.lineY);ctx.globalAlpha=.55;ctx.fillStyle='#e9a079';
        for(const d of [38,57,76]){
            const fx=Math.round(f.x+f.special.facing*d),fy=Math.round(f.special.lineY+2);
            if(fx<sides.left+10||fx>sides.right-10)continue;
            ctx.fillRect(fx-2,fy,5,1);ctx.fillRect(fx+f.special.facing*2,fy-1,1,3);
        }
    }
    ctx.restore();
}
function drawBoxingPunchTrace(f){
    if(!f.attack)return;
    const a=f.attack,spec=BOXING_CONFIG.attacks[a.kind],age=a.frame-boxingAttackStartup(a,spec);
    if(age< -1||age>spec.active+1)return;
    const light=a.kind==='jab'||a.kind==='weave_rush',special=a.kind.startsWith('weave_')||a.kind==='dash_punch';
    const color=special?(f.role==='zorp'?'#a8ecd5':'#ffc186'):light?'#d8edeb':'#ffe2ac';
    const x=Math.round(f.x+a.facing*17),y=Math.round(f.y-51),length=light?12:21;
    ctx.save();ctx.globalAlpha=age<0?.35:.75;ctx.fillStyle=color;
    ctx.fillRect(a.facing>0?x:x-length,y,length,light?1:2);
    if(!light)ctx.fillRect(a.facing>0?x+5:x-length,y+4,length-5,1);
    ctx.restore();
}
function drawBoxingFightHud(g){
    g.save();g.imageSmoothingEnabled=false;g.lineWidth=1;
    for(const f of [boxeGame.player,boxeGame.mestre]){
        const left=f.role==='zorp',x=left?8:258,w=184,accent=left?'#9ae77b':'#ef7e88';
        const state=boxingVisualState(f),v=boxingShow.meters[f.role],ready=boxingVisualSpecialReady(f),active=state.kind==='special';
        const edge=state.kind==='break'?'#f08db5':active||ready?state.color:'#526472';
        g.fillStyle='rgba(2,7,16,.55)';g.fillRect(x+2,10,w,78);
        g.fillStyle='#101d2a';g.fillRect(x,8,w,77);g.strokeStyle=edge;g.strokeRect(x+.5,8.5,w-1,76);
        g.fillStyle=accent;g.fillRect(left?x:x+w-3,9,3,25);g.fillRect(x+6,9,w-12,1);
        g.font='bold 10px monospace';g.textAlign='left';g.fillStyle='#f4f5ed';g.fillText(left?'ZORP':'MESTRE',x+10,21);
        g.textAlign='right';g.fillStyle=f.hp<=30?'#ffb5a3':'#dbe8e9';g.fillText(f.hp+' / '+f.maxHp,x+w-10,21);
        const bx=x+10,bw=w-20;
        g.fillStyle='#060d18';g.fillRect(bx-1,26,bw+2,12);
        const width=Math.floor((bw-2)*boxingClamp(f.hp/f.maxHp,0,1)),trail=Math.floor((bw-2)*boxingClamp(v.trail/f.maxHp,0,1));
        g.fillStyle='#bc8e73';g.fillRect(left?bx+1:bx+bw-1-trail,28,trail,8);g.fillStyle=f.hp<=30?'#e78673':accent;
        g.fillRect(left?bx+1:bx+bw-1-width,28,width,8);
        g.fillStyle=left?'#cdf2ae':'#f4abb0';g.fillRect(left?bx+1:bx+bw-1-width,28,width,2);
        for(let i=1;i<5;i++){g.fillStyle='#17222c';g.fillRect(bx+Math.floor(bw*i/5),28,1,8);}
        g.font='8px monospace';g.textAlign='left';g.fillStyle='#a3b8c5';g.fillText('GUARDA',bx,47);
        const gx=bx+40,gw=bw-40;g.fillStyle='#09121e';g.fillRect(gx,42,gw,4);
        const guard=f.guardBreakTimer?0:boxingClamp(1-f.guardPressure/BOXING_CONFIG.guard.max,0,1);
        g.fillStyle=f.guardPressure>70?'#ffac86':'#7ab5d6';g.fillRect(gx,42,Math.floor(gw*guard),4);
        g.fillStyle=ready?'#ffe093':active?state.color:'#a3b8c5';g.fillText('ESPECIAL',bx,58);
        g.textAlign='right';
        const status=boxingSpecialController(f)?.assetStatus?.();
        const label=status==='error'?'ASSET INDISPONÍVEL':status!=='ready'?'CARREGANDO':f.special?'ATIVO':
            f.specialCooldown?'RECARGA '+Math.ceil(f.specialCooldown/60)+'s':ready?(left?'[O] PRONTO':'PRONTO'):Math.floor(f.specialCharge||0)+'%';
        g.fillText(label,bx+bw,58);
        g.fillStyle='#060d18';g.fillRect(bx-1,61,bw+2,7);
        g.fillStyle=ready?'#ffe093':left?'#73c4bc':'#cf9a87';
        const charge=Math.floor(bw*boxingClamp((f.specialCharge||0)/100,0,1));g.fillRect(left?bx:bx+bw-charge,62,charge,5);
        if(ready){g.fillStyle=boxingShow.frame%48<30?'#fff4be':'#c09d58';g.fillRect(x+w-5,63,2,3);}
        if(active){g.fillStyle=state.color;const stripe=Math.floor((boxingShow.frame%32)/32*(bw-12));g.fillRect(bx+stripe,64,12,1);}
        g.fillStyle='#0b1521';g.fillRect(bx-1,72,bw+2,10);g.textAlign='left';g.font='bold 8px monospace';g.fillStyle=state.color;
        g.fillRect(bx,75,3,3);g.fillText(state.label,bx+7,80);
        if(f.comboCount>1&&f.comboTimer>0){
            const cx=left?10:346,pulse=v.comboPulse>4?1:0;
            g.fillStyle='rgba(5,12,23,.92)';g.fillRect(cx,263,94,27);g.fillStyle=accent;g.fillRect(cx,263,94,2);
            g.textAlign='left';g.font='6px monospace';g.fillStyle='#aec3cb';g.fillText('COMBO',cx+7,273);
            g.font='bold '+(12+pulse)+'px monospace';g.fillStyle='#ffe093';g.fillText(f.comboCount+' HITS',cx+7,286);
        }
    }
    // The fight has no time limit: the central plate describes the real KO condition.
    g.fillStyle='#111b27';g.fillRect(198,9,54,53);g.strokeStyle='#627482';g.strokeRect(198.5,9.5,53,52);
    g.textAlign='center';g.font='bold 8px monospace';g.fillStyle='#e5e8df';g.fillText('BOXE',225,22);
    g.fillStyle='#dca66d';g.fillRect(208,29,9,8);g.fillRect(233,29,9,8);g.fillRect(216,33,5,3);g.fillRect(229,33,5,3);
    g.fillStyle='#263643';g.fillRect(205,42,40,1);g.font='7px monospace';g.fillStyle='#bdd0d7';g.fillText('ATÉ O KO',225,55);
    g.restore();
}
function drawBoxingReadableEffects(){
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const burst of boxeGame.impactBursts){
        const t=1-burst.life/13,light=burst.strength<=5,heavy=burst.strength>=9,maxAge=light?.48:heavy?1:.7;
        if(t>maxAge)continue;
        const r=Math.round((light?3:5)+t*(heavy?15:8)),x=Math.round(burst.x),y=Math.round(burst.y);
        ctx.globalAlpha=(1-t/maxAge)*.9;ctx.fillStyle=burst.color;
        const rays=heavy?8:4;
        for(let i=0;i<rays;i++){
            const a=i*Math.PI*2/rays,dx=Math.round(Math.cos(a)*r),dy=Math.round(Math.sin(a)*r);
            ctx.fillRect(x+dx-(Math.abs(dx)>Math.abs(dy)?0:1),y+dy,Math.abs(dx)>Math.abs(dy)?4:2,Math.abs(dx)>Math.abs(dy)?2:4);
        }
        ctx.fillStyle='#fff3d3';if(t<.18)ctx.fillRect(x-2,y-2,4,4);
    }
    for(const e of boxeGame.effects){
        // The fixed HUD owns combo counting; no second counter is drawn over a fighter's face.
        if(/^\d+( HITS|\/6)$/.test(e.text))continue;
        const t=1-e.life/24;ctx.globalAlpha=Math.min(1,e.life/9);ctx.font='bold 9px monospace';ctx.textAlign='center';
        const x=boxingClamp(Math.round(e.x),38,412),y=Math.round(e.y-14-t*11);
        ctx.strokeStyle='#09111b';ctx.lineWidth=3;ctx.strokeText(e.text,x,y);ctx.fillStyle=e.color;ctx.fillText(e.text,x,y);
    }ctx.restore();
}
