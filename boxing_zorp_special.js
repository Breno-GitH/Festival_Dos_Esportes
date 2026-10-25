/* Rush Overdrive modifies player-requested punches. It never schedules attacks or evades. */
(function(global){
    'use strict';
    const cfg=Object.freeze({maxCharge:100,passive:.035,cooldown:3,duration:360,charges:4,
        moves:Object.freeze({
            RUSH_JAB:Object.freeze({damage:7,startup:5,linkStartup:3,active:3,recovery:11,whiff:9,
                range:50,depthTolerance:10,hitstun:14,push:2,lunge:18,guardPressure:20}),
            RUSH_STRAIGHT:Object.freeze({damage:16,startup:9,linkStartup:5,active:3,recovery:20,whiff:16,
                range:60,depthTolerance:9,hitstun:21,push:12,lunge:38,guardPressure:38}),
            METEOR_STRAIGHT:Object.freeze({damage:22,startup:12,linkStartup:7,active:4,recovery:28,whiff:22,
                range:64,depthTolerance:9,hitstun:24,finisherStun:20,push:42,lunge:72,guardPressure:58})
        })});
    const atlas=BOXING_ZORP_SPECIAL_ATLAS,cache=new Map(),sheet=new Image();
    let status='loading',failed=false,serial=0;
    function buildFrames(){
        for(const [name,frame]of Object.entries(atlas.frames)){
            const [sx,sy,w,h]=frame.sourceRect,cut=document.createElement('canvas');cut.width=w;cut.height=h;
            const c=cut.getContext('2d');c.imageSmoothingEnabled=false;
            for(const [x,y,width,height]of frame.strips)c.drawImage(sheet,x,y,width,height,x-sx,y-sy,width,height);
            const canvas=document.createElement('canvas');canvas.width=atlas.canvas[0];canvas.height=atlas.canvas[1];
            const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;
            const dx=atlas.anchor[0]-(frame.sourceAnchor[0]-sx)*frame.scale;
            const dy=atlas.anchor[1]-(frame.sourceAnchor[1]-sy)*frame.scale;
            g.drawImage(cut,0,0,w,h,dx,dy,w*frame.scale,h*frame.scale);
            Object.assign(canvas,{boxingAnchorX:160,boxingFootY:209,boxingFrameId:name,complete:true,naturalWidth:320});cache.set(name,canvas);
        }status='ready';
    }
    sheet.onload=buildFrames;
    sheet.onerror=()=>{failed=true;status='error';console.error('[Boxe] Falha ao carregar '+atlas.source);};
    sheet.src=atlas.source;
    function isOverdrive(f){return f.role==='zorp'&&f.special?.mode==='RUSH_OVERDRIVE';}
    function charge(f,amount){
        if(f.role==='zorp'&&!isOverdrive(f)&&!f.attack?.rush)
            f.specialCharge=Math.min(cfg.maxCharge,(f.specialCharge||0)+amount);
    }
    function canActivateDuringAttack(f,target){
        const a=f.attack;
        return boxingIsNormal(a?.kind)&&a.landed&&!a.blocked&&!a.dodged&&!a.finisher&&
            f.comboCount<BOXING_CONFIG.combo.maxHits&&target.hitstun>0&&target.lastHitBy===f.role;
    }
    function activate(f){
        if(f.role!=='zorp'||f.special||status!=='ready'||(f.specialCharge||0)<cfg.maxCharge)return false;
        f.specialCharge=0;f.special={id:++serial,mode:'RUSH_OVERDRIVE',phase:'ACTIVE',remaining:cfg.duration,
            charges:cfg.charges,spent:0,hits:0,blocked:0,connected:false,history:[],ended:false,reason:null};
        // Keep an existing hit-confirm, counter window and buffered J/K. Activation itself has no attack or movement.
        boxingAddEffect(f.x,f.y-74,'RUSH OVERDRIVE','#9eeacb');boxingShowEvent('overdrive',f);return true;
    }
    function finish(f,reason){
        if(!isOverdrive(f))return;
        const s=f.special;s.ended=true;s.reason=reason;f.lastSpecial=s;f.special=null;
    }
    function stop(f){finish(f,'ROUND_END');f.rushGhosts=[];}
    function mark(a,outcome){
        if(a?.rush&&a.rush.record.outcome==='PENDING')a.rush.record.outcome=outcome;
    }
    function onInterrupted(f,reason){
        mark(f.attack,reason==='PARRY'?'PARRIED':'INTERRUPTED');f.rushGhosts=[];
        // Taking a hit interrupts the current punch normally, but does not erase unused Overdrive charges.
    }
    function clock(){
        if(boxeGame.phase!=='FIGHTING')return;
        const f=boxeGame.player;
        for(const ghost of f.rushGhosts)ghost.life--;
        f.rushGhosts=f.rushGhosts.filter(g=>g.life>0);
        if(isOverdrive(f)&&--f.special.remaining<=0)finish(f,'TIMEOUT');
    }
    function tick(){
        const f=boxeGame.player,target=boxeGame.mestre;
        if(boxeGame.phase==='FIGHTING'&&boxingDistance(f,target)<140)charge(f,cfg.passive);
    }
    function typeFor(f,kind){
        if(!isOverdrive(f)||f.special.charges<=0||f.special.remaining<=0||!boxingIsNormal(kind))return null;
        return kind==='jab'?'RUSH_JAB':f.special.charges===1?'METEOR_STRAIGHT':'RUSH_STRAIGHT';
    }
    function profile(f,base,kind){
        const type=typeFor(f,kind);return type?{...base,...cfg.moves[type],rush:type,variant:type,body:false,staminaDamage:0}:base;
    }
    function linkStartup(f,kind){const type=typeFor(f,kind);return type?cfg.moves[type].linkStartup:null;}
    function onAttackStarted(f,a){
        if(!a.profile?.rush||!isOverdrive(f))return;
        const s=f.special;s.charges--;s.spent++;
        const record={index:s.spent,type:a.profile.rush,kind:a.kind,frame:boxeGame.fightFrames,
            facing:a.facing,lineY:a.originY,outcome:'PENDING'};
        s.history.push(record);a.rush={type:a.profile.rush,id:s.id,record};
        boxingShowEvent(a.rush.type==='METEOR_STRAIGHT'?'meteorWindup':'rush',f,a.facing);
        if(s.charges===0)finish(f,a.rush.type==='METEOR_STRAIGHT'?'METEOR':'CHARGES_SPENT');
    }
    function visualName(f){
        const a=f.attack;if(!a?.rush)return null;
        const p=boxingAttackSpec(a),startup=boxingAttackStartup(a,p);
        const poses=atlas.actions[a.rush.type.toLowerCase()];
        if(a.frame<startup*.35)return poses[0];
        if(a.frame<startup)return poses[1];
        if(a.frame<startup+p.active)return poses[2];
        return a.frame<startup+p.active+p.recovery*.55?poses[1]:poses[3];
    }
    function onAttackStep(f,a,moved){
        if(!a.rush||moved<.25||a.frame%2!==0)return;
        f.rushGhosts.push({name:visualName(f),x:f.x,y:f.y,facing:a.facing,life:6});
        if(f.rushGhosts.length>3)f.rushGhosts.shift();
    }
    function onAttackEnded(f,a,reason){mark(a,reason==='FEINT'?'FEINT':a.dodged?'DODGED':'WHIFF');}
    function onDodged(f){mark(f.attack,'DODGED');}
    function onContact(a,b,attack,hit){
        if(!attack.rush)return;
        mark(attack,hit.blocked?'BLOCKED':'HIT');
        const s=isOverdrive(a)&&a.special.id===attack.rush.id?a.special:a.lastSpecial?.id===attack.rush.id?a.lastSpecial:null;
        if(!s)return;
        s.connected=true;if(hit.blocked)s.blocked++;else s.hits++;
    }
    function exchange(a,b,attack,hit){
        if(attack.rush)return; // Rush cannot refill the meter that paid for it.
        charge(a,hit.blocked?4:attack.kind==='jab'?8:12);charge(b,hit.blocked?3:hit.damage*.65+3);
    }
    function whiff(f,target){if(!f.attack?.rush&&boxingDistance(f,target)<100)charge(f,1.5);}
    function drawGhosts(g,f,scale){
        if(!f.rushGhosts.length)return;
        g.save();g.imageSmoothingEnabled=false;
        for(const ghost of f.rushGhosts){
            const image=cache.get(ghost.name);if(!image)continue;
            g.save();g.globalAlpha=.13*ghost.life/6;g.translate(Math.round(ghost.x),Math.round(ghost.y));g.scale(ghost.facing,1);
            g.drawImage(image,-160*scale,-210*scale,320*scale,224*scale);g.restore();
        }g.restore();
    }
    global.BoxingZorpSpecial=Object.freeze({cfg,tick,clock,isOverdrive,canActivateDuringAttack,profile,linkStartup,
        onAttackStarted,onAttackStep,onAttackEnded,onInterrupted,onDodged,onContact,exchange,whiff,stop,drawGhosts,
        update:()=>false,assetStatus:()=>status,visual:f=>cache.get(visualName(f))||null,
        snapshot:()=>({status,failed,frames:cache.size,source:atlas.source,charge:boxeGame.player.specialCharge||0,
            active:isOverdrive(boxeGame.player)?{...boxeGame.player.special,history:boxeGame.player.special.history.map(h=>({...h}))}:null,
            rush:boxeGame.player.attack?.rush?.type||null,last:boxeGame.player.lastSpecial||null})});
    global.BoxingSpecials.register('zorp',activate,cfg.cooldown);
})(window);
