/* Mestre's committed charge/dash: readable windup, physical travel, no tracking. */
(function(global){
    'use strict';
    const cfg=Object.freeze({chargeFrames:36,dashFrames:24,distance:220,speed:10,hitRecovery:20,whiffRecovery:36,passive:.045,cooldown:12});
    const atlas=BOXING_MASTER_SPECIAL_ATLAS,cache=new Map(),sheet=new Image();
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

    function charge(f,amount){if(f.role==='master'&&!f.special)f.specialCharge=Math.min(100,(f.specialCharge||0)+amount);}
    function activate(f,target){
        if(f.role!=='master'||f.special||status!=='ready'||f.specialCharge<100)return false;
        boxingFaceOpponent(f,target);
        f.specialCharge=0;
        f.special={id:++serial,phase:'CHARGE',age:0,total:0,facing:f.facing,lineY:f.y,originX:f.x,
            connected:false,blocked:false,dodged:false,travel:0,ghosts:[]};
        f.attack={kind:'dash_punch',frame:0,startup:cfg.chargeFrames,facing:f.facing,originY:f.y,
            landed:false,dodged:false,blocked:false,counter:false,stage:1,linked:false,specialId:f.special.id,sweepFromX:f.x};
        f.guard=false;f.bufferedAttack=null;f.bufferFrames=0;f.counterWindow=0;f.comboCount=0;f.comboTimer=0;
        boxingSetAnimation(f,'special');boxingShowEvent('dodge',f);return true;
    }
    function shouldUse(f,target){
        if(status!=='ready'||f.special||f.specialCharge<100||f.specialCooldown||!boxingCanAct(f)||f.attack)return false;
        const dx=Math.abs(f.aiTargetX-f.x),dy=Math.abs(f.aiTargetY-f.y);
        // Only the last observation is used. The committed line is never updated during charge/dash.
        const pressure=f.hp<=65||target.guard||target.attack||boxeGame.fightFrames>=600;
        const reversal=f.hp<=35&&f.ai?.pressure>=1&&dx>=58&&dx<=130;
        return boxeGame.fightFrames>=180&&(dx>=90&&dx<=205||reversal)&&dy<=9&&!target.dodgeFrames&&pressure;
    }
    function positionIntent(f,target){
        if(status!=='ready'||f.special||f.attack||f.specialCharge<100||f.specialCooldown||!boxingCanAct(f))return null;
        const dx=f.aiTargetX-f.x,dy=f.aiTargetY-f.y;
        if(boxeGame.fightFrames<600&&f.hp>65||Math.abs(dx)<36||Math.abs(dx)>=90||Math.abs(dy)>14)return null;
        const sides=boxingRingSides(f.y),back=-Math.sign(dx),room=back<0?f.x-sides.left-14:sides.right-14-f.x;
        // A short physical backstep creates the preferred mid-range; never teleport to a launch point.
        return room>22?{x:back,y:Math.abs(dy)>6?Math.sign(dy):0,guard:false,attack:null,dodge:false}:null;
    }
    function tick(){
        const f=boxeGame.mestre;
        if(boxeGame.phase==='FIGHTING'&&!f.special&&boxingDistance(f,boxeGame.player)<200)charge(f,cfg.passive);
    }
    function recovery(f){
        const s=f.special;if(!s)return;s.phase='RECOVERY';s.age=0;f.attack=null;f.bufferedAttack=null;f.bufferFrames=0;
        if(!s.connected)boxingAddEffect(f.x,f.y-66,'ABERTO!','#ffe178');
    }
    function finish(f,interrupted=false){
        if(f.role!=='master'||!f.special)return;
        const s=f.special;
        f.lastSpecial={connected:s.connected,blocked:s.blocked,dodged:s.dodged,interrupted,
            travel:s.travel,lineY:s.lineY,facing:s.facing,total:s.total};
        f.special=null;f.attack=null;boxingSetAnimation(f,'idle');
    }
    function stop(f){finish(f,true);}
    function update(f){
        const s=f.special;if(f.role!=='master'||!s)return false;
        s.age++;s.total++;boxingSetAnimation(f,'special');
        for(const ghost of s.ghosts)ghost.life--;s.ghosts=s.ghosts.filter(g=>g.life>0);
        if(s.phase==='CHARGE'){
            f.attack.frame=s.age;
            // Keep the last charge frame inactive: contact begins only after physical advance.
            if(s.age>=cfg.chargeFrames){s.phase='DASH';s.age=0;f.attack.frame=cfg.chargeFrames-1;}
        }else if(s.phase==='DASH'){
            const old=f.x;f.attack.sweepFromX=old;f.attack.frame=cfg.chargeFrames+s.age-1;
            boxingMove(f,s.facing,0,Math.min(cfg.speed,cfg.distance-s.travel),0);
            s.travel+=Math.abs(f.x-old);
            if(s.age%2===0){s.ghosts.push({x:f.x,y:f.y,name:visualName(f),facing:s.facing,life:7});if(s.ghosts.length>3)s.ghosts.shift();}
            if(s.age>=cfg.dashFrames||s.travel>=cfg.distance||Math.abs(f.x-old)<.05)recovery(f);
        }else if(s.age>=(s.connected?cfg.hitRecovery:cfg.whiffRecovery))finish(f);
        return true;
    }
    function onContact(a,b,attack,hit){
        if(a.role!=='master'||attack.kind!=='dash_punch'||!a.special)return;
        a.special.connected=true;a.special.blocked=!!hit.blocked;recovery(a);
    }
    function onDodged(a){
        if(a.role==='master'&&a.special?.phase==='DASH'){a.special.dodged=true;}
        // Continue the committed dash: a successful dodge cannot make it home back onto the player.
    }
    function exchange(a,b,attack,hit){
        if(attack.kind!=='dash_punch')charge(a,hit.blocked?4:attack.kind==='jab'?8:12);
        charge(b,hit.blocked?4:hit.damage*.7+4);
    }
    function visualName(f){
        const s=f.special;if(!s)return null;
        if(s.phase==='CHARGE')return s.age<10?'charge_stance':s.age<20?'charge_low':'charge_arm';
        if(s.phase==='DASH')return s.age<3?'dash_drive':'dash_punch';
        const duration=s.connected?cfg.hitRecovery:cfg.whiffRecovery;
        return s.age<duration*.45?'recover_low':s.age<duration*.8?'recover_knee':'recover_ready';
    }
    function drawGhosts(g,f,scale){
        const s=f.special;if(!s)return;
        g.save();g.imageSmoothingEnabled=false;
        for(const ghost of s.ghosts){const image=cache.get(ghost.name);if(!image)continue;
            g.save();g.globalAlpha=.14*ghost.life/7;g.translate(Math.round(ghost.x),Math.round(ghost.y));g.scale(ghost.facing,1);
            g.drawImage(image,-160*scale,-210*scale,320*scale,224*scale);g.restore();}
        if(s.phase==='CHARGE'){
            const q=s.age/cfg.chargeFrames,back=s.age>=20?-26:9;
            const x=Math.round(f.x+s.facing*back),y=Math.round(f.y-(s.age<10?49:s.age<20?38:49));
            g.fillStyle='rgba(244,89,58,.18)';g.fillRect(x-7,y-7,14,14);
            g.fillStyle=s.age%6<3?'#ffd383':'#ff7971';g.fillRect(x-3,y-3,6,6);
            const r=6+Math.floor(q*5);g.fillStyle='#e99b8f';
            g.fillRect(x-r,y-1,3,2);g.fillRect(x+r-2,y-1,3,2);g.fillRect(x-1,y-r,2,3);
        }g.restore();
    }
    global.BoxingMasterSpecial=Object.freeze({cfg,shouldUse,positionIntent,tick,update,stop,onContact,onDodged,exchange,drawGhosts,assetStatus:()=>status,
        visual:f=>f.role==='master'&&f.special?cache.get(visualName(f))||null:null,
        snapshot:()=>({status,failed,frames:cache.size,source:atlas.source,charge:boxeGame.mestre.specialCharge||0,
            cooldown:boxeGame.mestre.specialCooldown,active:boxeGame.mestre.special?{...boxeGame.mestre.special,ghosts:undefined}:null,
            last:boxeGame.mestre.lastSpecial||null})});
    global.BoxingSpecials.register('master',activate,cfg.cooldown);
})(window);
