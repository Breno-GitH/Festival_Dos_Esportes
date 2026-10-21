/* Physical rim contact -> climb-up -> summit reveal -> dialogue -> celebration.
 * This module never grants medals or changes the authored mountain geometry. */
window.ClimbSummit = (() => {
    'use strict';
    const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
    const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
    const lerp=(a,b,t)=>a+(b-a)*t;
    const duration=Object.freeze({HANG:18,PULL_UP:66,STAND:24,REVEAL:180,MEDAL:42,CELEBRATE:150});
    const presentationSeconds=Object.freeze({MEDAL:.7,CELEBRATE:2.5});
    const lines=Object.freeze([
        'Você conseguiu chegar até aqui.',
        'Não foi a montanha que ficou mais fácil.',
        'Foi você que aprendeu a subir.'
    ]);
    function reset(g){g.summitSequence=null;g.summitClimbSeconds=0;g.win=false;}
    function active(g){return !!g.summitSequence&&g.summitSequence.phase!=='COMPLETE';}
    function canGrip(g,h){
        if(!h?.isFinish||!h.surface||g.finishStarted||g.vida<=0||g.gameState!=='PLAYING'||g.playerState!=='AIRBORNE'||g.airFrames<4)return false;
        const edgeY=220-h.climbY+g.alturaAtual,handY=g.playerY-44;
        return g.playerX>=h.surface.left+16&&g.playerX<=h.surface.right-16&&Math.abs(handY-edgeY)<=8;
    }
    function begin(g,h){
        if(!canGrip(g,h))return false;
        const startHeight=220-g.playerY+g.alturaAtual;
        g.summitSequence={phase:'HANG',phaseAt:performance.now(),frame:0,totalFrames:0,line:0,stood:false,dialogueComplete:false,medalAwarded:false,holdId:h.id,
            startHeight,startX:g.playerX,standX:clamp(g.playerX-18,h.surface.left+32,h.surface.right-96),
            cameraStart:g.alturaAtual,cameraXStart:g.cameraX,zoom:1,standingFrame:0};
        g.finishStarted=true;g.gameState='SUMMIT';g.playerState='LEDGE_HANG';
        g.vx=0;g.vy=0;g.grabTarget=null;g.pedraAtual=null;g.jumpBufferTimer=0;
        g.invulTimer=0;g.fallFrames=0;g.slipTimer=0;g.shakeTimer=0;g.mensagemTimer=0;
        g.objetosCaindo.length=0;g.hazardQueue.length=0;
        return true;
    }
    function advancePhase(s,phase){s.phase=phase;s.phaseAt=performance.now();s.frame=0;}
    function update(g,advance){
        const s=g.summitSequence;if(!s||s.phase==='COMPLETE')return null;
        const h=g.pedrasGeradas.find(h=>h.id===s.holdId);
        if(!h?.isFinish)return null;
        s.frame++;s.totalFrames++;g.motionClock+=1/60;
        let height=s.startHeight,event=null;
        if(s.phase==='HANG'){
            height=lerp(s.startHeight,h.climbY-44,ease(s.frame/duration.HANG));
            if(s.frame>=duration.HANG)advancePhase(s,'PULL_UP');
        }else if(s.phase==='PULL_UP'){
            const t=ease(s.frame/duration.PULL_UP);
            height=lerp(h.climbY-44,h.climbY,t);
            g.playerX=lerp(s.startX,s.standX,ease(clamp((s.frame/duration.PULL_UP-.18)/.82)));
            g.playerState='CLIMB_UP';
            if(s.frame>=duration.PULL_UP){
                height=h.climbY;g.playerX=s.standX;s.stood=true;s.standingFrame=s.totalFrames;
                g.playerState='SUMMIT_STANDING';g.pedraAtual=h;g.summitContactX=s.standX;
                g.currentStep=h.levelStep;g.summitClimbSeconds=(performance.now()-g.startTime)/1000;
                g.score+=2000+g.vida*500;advancePhase(s,'STAND');event='STOOD';
            }
        }else{
            height=h.climbY;g.playerX=s.standX;g.playerState='SUMMIT_STANDING';
            if(s.phase==='STAND'&&s.frame>=duration.STAND)advancePhase(s,'REVEAL');
            else if(s.phase==='REVEAL'){
                const t=ease(s.frame/duration.REVEAL);
                g.alturaAtual=lerp(s.cameraStart,h.climbY+16,t);
                const masterX=h.surface.right-55;
                g.cameraX=lerp(s.cameraXStart,(s.standX+masterX)/2-225,t);
                s.zoom=lerp(1,.8,t);
                if(s.frame>=duration.REVEAL)advancePhase(s,'DIALOGUE');
            }else if(s.phase==='DIALOGUE'&&advance&&s.frame>=10){
                if(s.line<lines.length-1){s.line++;s.frame=0;}
                else {s.dialogueComplete=true;advancePhase(s,'MEDAL');event='MEDAL';}
            }else if(s.phase==='MEDAL'&&s.medalAwarded&&performance.now()-s.phaseAt>=presentationSeconds.MEDAL*1000){
                advancePhase(s,'CELEBRATE');event='CELEBRATE';
            }else if(s.phase==='CELEBRATE'&&performance.now()-s.phaseAt>=presentationSeconds.CELEBRATE*1000){advancePhase(s,'COMPLETE');event='COMPLETE';}
        }
        g.playerY=220-height+g.alturaAtual;
        return event;
    }
    function standingAtSummit(g){
        const s=g.summitSequence,h=g.pedraAtual;
        return !!s&&s.stood&&g.vida>0&&g.playerState==='SUMMIT_STANDING'&&h?.isFinish&&h.surface&&h.id===s.holdId&&
            g.playerX>=h.surface.left&&g.playerX<=h.surface.right&&Math.abs((220-g.playerY+g.alturaAtual)-h.climbY)<.01;
    }
    function canAward(g){
        return standingAtSummit(g)&&g.summitSequence.dialogueComplete&&
            ['MEDAL','CELEBRATE','COMPLETE'].includes(g.summitSequence.phase);
    }
    function canCelebrate(g){return canAward(g)&&g.summitSequence.medalAwarded&&g.summitSequence.phase==='CELEBRATE';}
    function canFinish(g){return canAward(g)&&g.summitSequence.medalAwarded&&g.summitSequence.phase==='COMPLETE';}
    function view(g){return {zoom:g.summitSequence?.zoom||1};}
    function pose(g,assets){
        if(!g.summitSequence)return null;
        // Legacy callers share the same deltaTime presentation state machine.
        const p=ClimbSprites.pose(g);
        return {image:assets.zorp.images[p.id],blend:p.blend,
            previous:p.previous?assets.zorp.images[p.previous.id]:null};
    }
    function drawWorld(ctx,g){
        const s=g.summitSequence;if(!s)return;
        const h=g.pedrasGeradas.find(h=>h.id===s.holdId),x=g.playerX-g.cameraX,y=220-h.climbY+g.alturaAtual;
        ctx.save();
        if(!s.stood){
            const contactX=lerp(s.startX,g.playerX,.4)-g.cameraX;
            ctx.fillStyle='#263e60';
            for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(contactX+side*11,y+1,3.2,2.5,0,0,Math.PI*2);ctx.fill();}
        }
        if(s.phase==='CELEBRATE'){
            const t=clamp((performance.now()-s.phaseAt)/(presentationSeconds.CELEBRATE*1000));
            ctx.strokeStyle=`rgba(244,222,147,${Math.sin(Math.PI*t)*.45})`;ctx.lineWidth=1;
            ctx.beginPath();ctx.ellipse(x,g.playerY+4,24+t*14,5+t*2,0,0,Math.PI*2);ctx.stroke();
            for(let i=0;i<10;i++){
                const a=i*Math.PI*.2+t*.5,r=22+t*22;
                ctx.globalAlpha=Math.sin(Math.PI*t)*.7;ctx.fillStyle=i%2?'#d8edf3':'#f2d48a';
                ctx.fillRect(x+Math.cos(a)*r,g.playerY-32+Math.sin(a)*r*.7,1.5,1.5);
            }
        }
        ctx.restore();
    }
    function drawOverlay(ctx,g,c){
        const s=g.summitSequence;if(!s||s.phase==='COMPLETE')return;
        ctx.save();ctx.textBaseline='alphabetic';
        if(s.phase==='REVEAL'||s.phase==='STAND'){
            const a=s.phase==='REVEAL'?Math.sin(Math.PI*clamp(s.frame/180)):.25;
            ctx.globalAlpha=a;ctx.fillStyle='#e3f2ed';ctx.textAlign='center';ctx.font='bold 12px monospace';
            ctx.fillText('CUME DO MONTE ZORP',c.width/2,38);ctx.font='9px monospace';ctx.fillStyle='#c0d6e3';
            ctx.fillText('Toda montanha começa com um salto.',c.width/2,54);
        }else if(s.phase==='DIALOGUE'){
            ctx.fillStyle='rgba(12,31,46,.95)';ctx.fillRect(18,232,414,56);
            ctx.strokeStyle='#91bdcb';ctx.lineWidth=1;ctx.strokeRect(18.5,232.5,413,55);
            ctx.textAlign='left';ctx.font='bold 9px monospace';ctx.fillStyle='#e8cf8d';ctx.fillText('MESTRE DA ESCALADA',29,247);
            ctx.fillStyle='#eef5ed';ctx.font='11px monospace';ctx.fillText(lines[s.line],29,263);
            ctx.fillStyle='#a8c1cb';ctx.font='8px monospace';ctx.textAlign='right';ctx.fillText('[ESPAÇO] CONTINUAR',420,280);
        }else if(s.phase==='MEDAL'){
            // The award is a Canvas effect, never baked into the actor PNG.
            const t=ease((performance.now()-s.phaseAt)/(presentationSeconds.MEDAL*1000)),x=c.width/2,y=55-t*3;
            ctx.fillStyle='#759ed1';ctx.beginPath();ctx.moveTo(x-8,y-17);ctx.lineTo(x-3,y+3);ctx.lineTo(x+3,y+3);ctx.lineTo(x+8,y-17);ctx.fill();
            ctx.fillStyle='#edcc75';ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#b58a42';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle='#fff0b3';ctx.beginPath();ctx.moveTo(x-4,y+3);ctx.lineTo(x,y-4);ctx.lineTo(x+4,y+3);ctx.closePath();ctx.fill();
            ctx.textAlign='center';ctx.fillStyle='#e4f0ef';ctx.font='10px monospace';ctx.fillText('MEDALHA DA ESCALADA',x,82);
        }else if(s.phase==='CELEBRATE'){
            ctx.textAlign='center';ctx.fillStyle='#f3d78f';ctx.font='bold 12px monospace';ctx.fillText('CUME CONQUISTADO',225,45);
            ctx.fillStyle='#e4f0ef';ctx.font='10px monospace';ctx.fillText('Você aprendeu a subir.',225,62);
        }
        ctx.restore();
    }
    return Object.freeze({reset,active,canGrip,begin,update,canAward,canCelebrate,canFinish,view,pose,drawWorld,drawOverlay,lines,duration,presentationSeconds});
})();
