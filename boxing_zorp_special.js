/* Zorp's contextual weave: one resource, committed movement, real contacts, no teleport. */
(function(global){
    'use strict';
    const cfg=Object.freeze({maxCharge:100,passive:.035,cooldown:3,weaveFrames:42,evadeFrames:10,
        threatWindow:6,rushInterval:8,rushHits:6,recovery:12,missRecovery:12});
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
    function charge(f,amount){if(f.role==='zorp'&&!f.special)f.specialCharge=Math.min(cfg.maxCharge,(f.specialCharge||0)+amount);}
    function threat(f,target){
        const a=target.attack;if(!a||a.landed||a.dodged)return null;
        const spec=BOXING_CONFIG.attacks[a.kind];if(!spec)return null;
        const remaining=boxingAttackStartup(a,spec)-a.frame;
        return remaining<=cfg.threatWindow&&remaining>-spec.active&&boxingAttackCanHit(target,f,a,spec)?a:null;
    }
    function activate(f,target){
        if(f.role!=='zorp'||f.special||status!=='ready'||(f.specialCharge||0)<cfg.maxCharge)return false;
        const incoming=threat(f,target),mode=incoming?'counter':'normal';
        f.specialCharge=0;f.special={id:++serial,mode,phase:incoming?'EVADE':'WEAVE',age:0,total:0,hits:0,
            confirmed:false,connected:false,threat:incoming,target:target.role,ghosts:[],history:[],originX:f.x,originY:f.y};
        f.guard=false;f.bufferedAttack=null;f.bufferFrames=0;f.comboCount=0;f.comboTimer=0;f.counterWindow=0;
        boxingSetAnimation(f,'special');boxingShowEvent('dodge',f);return true;
    }
    function tick(){
        const f=boxeGame.player,target=boxeGame.mestre;
        if(boxeGame.phase==='FIGHTING'&&!f.special&&boxingDistance(f,target)<140)charge(f,cfg.passive);
    }
    function finish(f,miss=false){
        const s=f.special;if(!s)return;
        f.lastSpecial={mode:s.mode,hits:s.hits,confirmed:s.confirmed,connected:s.connected,history:[...s.history]};
        f.special=null;f.attack=null;f.whiffFrames=miss?cfg.missRecovery:0;boxingSetAnimation(f,'idle');
    }
    function stop(f){if(f.special)finish(f,true);}
    function beginAttack(f,kind,number=1){
        const target=f.role==='zorp'?boxeGame.mestre:boxeGame.player;boxingFaceOpponent(f,target);
        f.attack={kind,frame:0,startup:BOXING_CONFIG.attacks[kind].startup,facing:f.facing,originY:f.y,
            landed:false,dodged:false,blocked:false,counter:false,stage:1,linked:false,specialId:f.special.id,
            specialHit:number,damageOverride:kind==='weave_rush'&&number===6?9:undefined,
            pushOverride:kind==='weave_rush'?(number===6?18:2):undefined};
    }
    function advance(f,target,speed,gap){
        const distance=Math.abs(target.x-f.x);
        if(distance>gap)boxingMove(f,Math.sign(target.x-f.x),0,Math.min(speed,distance-gap),0);
    }
    function visualName(f){
        const s=f.special;if(!s)return null;
        if(s.phase==='WEAVE'||s.phase==='EVADE')return atlas.actions.weave[Math.floor(s.age/6)%atlas.actions.weave.length];
        if(s.phase==='FINISH')return s.age<5?'windup':s.age<10?'drive':'finish_right';
        if(s.phase==='RUSH'){
            const n=Math.max(1,Math.min(6,Math.floor((s.age-4)/cfg.rushInterval)+1)),phase=(s.age-4+cfg.rushInterval)%cfg.rushInterval;
            return atlas.actions[n%2?'right':'left'][phase>=2&&phase<=5?1:0];
        }
        return 'weave_high_a';
    }
    function update(f,target){
        const s=f.special;if(!s)return false;
        s.age++;s.total++;boxingSetAnimation(f,'special');
        for(const ghost of s.ghosts)ghost.life--;s.ghosts=s.ghosts.filter(g=>g.life>0);
        if(s.total%6===0&&s.phase!=='RECOVERY'){
            s.ghosts.push({name:visualName(f),x:f.x,y:f.y,facing:f.facing,life:12});if(s.ghosts.length>3)s.ghosts.shift();
        }
        if(s.phase==='WEAVE'){
            advance(f,target,1.15,34);
            if(s.age>=cfg.weaveFrames){s.phase='FINISH';s.age=0;beginAttack(f,'weave_finish');}
        }else if(s.phase==='EVADE'){
            if(s.age>=cfg.evadeFrames){
                s.phase=s.confirmed?'RUSH':'RECOVERY';s.age=0;
            }
        }else if(s.phase==='FINISH'){
            f.attack.frame++;
            const spec=BOXING_CONFIG.attacks.weave_finish;
            if(f.attack.frame>=spec.startup+spec.active+spec.recovery)finish(f,!s.connected);
        }else if(s.phase==='RUSH'){
            advance(f,target,2.4,40);
            if(s.age>=4&&(s.age-4)%cfg.rushInterval===0&&s.age<=44){
                if(f.attack&&!f.attack.landed){s.phase='RECOVERY';s.age=0;f.attack=null;return true;}
                beginAttack(f,'weave_rush',1+(s.age-4)/cfg.rushInterval);
            }else if(f.attack)f.attack.frame++;
            if(s.age>=48){s.phase='RECOVERY';s.age=0;f.attack=null;}
        }else if(s.age>=cfg.recovery)finish(f,!s.connected);
        return true;
    }
    function evades(f,a,attack,spec){
        const s=f.special;
        return !!(s&&s.phase==='EVADE'&&s.age<=cfg.evadeFrames&&attack===s.threat&&
            boxingAttackCanHit(a,{x:s.originX,y:s.originY},attack,spec));
    }
    function onEvaded(f){
        const s=f.special;if(!s)return;
        s.confirmed=true;boxingAddEffect(f.x,f.y-57,'LEITURA!','#9eeaff');boxingShowEvent('dodge',f);
    }
    function onContact(a,b,attack,hit){
        const s=a.special;
        if(!s||attack.specialId!==s.id)return;
        s.connected=true;
        if(s.mode==='normal'&&!hit.blocked)s.hits=1;
        if(s.mode==='counter'&&!hit.blocked){
            boxeGame.effects=boxeGame.effects.filter(effect=>effect.text!=='LEITURA!'&&!/^[1-6]\/6$/.test(effect.text));
            s.hits++;s.history.push(s.hits%2?'right':'left');
            a.comboCount=s.hits;a.comboTimer=42;
            b.hitstun=Math.max(b.hitstun,s.hits===6?22:11);
            boxingAddEffect(a.x,a.y-73,s.hits+'/6','#ffe178');
        }else if(s.mode==='counter'&&hit.blocked){s.phase='RECOVERY';s.age=0;a.attack=null;}
    }
    function exchange(a,b,attack,hit){
        if(attack.kind.startsWith('weave_'))return;
        charge(a,hit.blocked?4:attack.kind==='jab'?8:12);charge(b,hit.blocked?3:hit.damage*.65+3);
    }
    function whiff(f,target){if(boxingDistance(f,target)<100)charge(f,1.5);}
    function drawGhosts(g,f,scale){
        const s=f.special;if(!s)return;
        g.save();g.imageSmoothingEnabled=false;
        for(const ghost of s.ghosts){
            const image=cache.get(ghost.name);if(!image)continue;
            g.save();g.globalAlpha=.13*ghost.life/12;g.translate(Math.round(ghost.x),Math.round(ghost.y));g.scale(ghost.facing,1);
            g.drawImage(image,-160*scale,-210*scale,320*scale,224*scale);g.restore();
        }g.restore();
    }
    global.BoxingZorpSpecial=Object.freeze({cfg,tick,update,evades,onEvaded,onContact,exchange,whiff,stop,drawGhosts,assetStatus:()=>status,
        visual:f=>f.special?cache.get(visualName(f))||null:null,
        snapshot:()=>({status,failed,frames:cache.size,source:atlas.source,charge:boxeGame.player.specialCharge||0,
            active:boxeGame.player.special?{mode:boxeGame.player.special.mode,phase:boxeGame.player.special.phase,age:boxeGame.player.special.age,hits:boxeGame.player.special.hits,confirmed:boxeGame.player.special.confirmed}:null,
            last:boxeGame.player.lastSpecial||null})});
    global.BoxingSpecials.register('zorp',activate,cfg.cooldown);
})(window);
