(function () {
    'use strict';
    const CONFIG=Object.freeze({cooldown:30,raise:4,draw:5,release:5,recovery:8,inputBuffer:6});
    let held=false;
    function press(repeat=false) {
        if(repeat||held)return false;
        held=true;return true;
    }
    // Release our latch before any menu handler can consume keyup. No other
    // minigame's input state is touched by these listeners.
    window.addEventListener('keyup',event=>{if(event.key===' ')held=false;});
    window.addEventListener('blur',()=>{held=false;});
    function create() {
        return {state:'IDLE',age:0,cooldown:0,buffer:0,accepted:0,rejected:0,buffered:0,shots:0,
            lastPressFrame:null,lastReleaseFrame:null,aim:{x:0,y:-1,angle:0}};
    }
    function aim(x,y,area) {
        const centre=(area.left+area.right)/2,half=(area.right-area.left)/2;
        const depth=Math.max(0,Math.min(1,(y-area.front)/(area.back-area.front)));
        const slope=Math.max(-.12,Math.min(.12,(centre-x)/half*(.08+depth*.04)));
        const length=Math.hypot(1,slope);
        return {x:slope/length,y:-1/length,angle:Math.atan(slope)};
    }
    function start(control,frame) {
        control.state='RAISE_BOW';control.age=0;control.cooldown=CONFIG.cooldown;
        control.buffer=0;control.accepted++;control.lastPressFrame=frame;
    }
    function step(control,context) {
        control.age++;
        if(control.cooldown>0)control.cooldown--;
        if(control.buffer>0)control.buffer--;
        control.aim=aim(context.x,context.y,context.area);
        let accepted=false,fire=null;
        if(context.pressed){
            if(control.cooldown===0&&control.state==='IDLE'){start(control,context.frame);accepted=true;}
            else if(control.cooldown>0&&control.cooldown<=CONFIG.inputBuffer){
                // One brief early tap can be remembered. Never queue a stream
                // of arrows, and never regenerate this from the held key.
                control.buffer=CONFIG.inputBuffer+1;control.buffered++;
            }else control.rejected++;
        }
        if(control.buffer>0&&control.cooldown===0&&control.state==='IDLE'){
            start(control,context.frame);accepted=true;
        }
        if(control.state==='RAISE_BOW'&&control.age>=CONFIG.raise){control.state='DRAW_BOWSTRING';control.age=0;}
        else if(control.state==='DRAW_BOWSTRING'&&control.age>=CONFIG.draw){
            control.state='RELEASE_SHOT';control.age=0;control.shots++;control.lastReleaseFrame=context.frame;
            fire={direction:{...control.aim}};
        }else if(control.state==='RELEASE_SHOT'&&control.age>=CONFIG.release){control.state='RECOVERY';control.age=0;}
        else if(control.state==='RECOVERY'&&control.age>=CONFIG.recovery){control.state='IDLE';control.age=0;}
        return {state:control.state,accepted,fire,cooldown:control.cooldown};
    }
    function drawGuide(ctx,origin,control) {
        const d=control.aim;
        ctx.save();ctx.fillStyle='#a8edf2';ctx.globalAlpha=control.cooldown>0&&control.state==='IDLE'?.20:.48;
        for(const distance of [8,15,22])ctx.fillRect(Math.round(origin.x+d.x*distance),Math.round(origin.y+d.y*distance),1,2);
        ctx.restore();
    }
    window.ArcheryPlayerControl=Object.freeze({CONFIG,create,aim,press,step,drawGuide,
        diagnostics:control=>({...control,config:CONFIG,held,model:'POSITIONAL_UPWARD_SHOT',maxAngleDegrees:Math.atan(.12)*180/Math.PI})});
})();
