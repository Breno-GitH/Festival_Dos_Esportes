/* Shared 450x300 sports briefing. Owns presentation/input only, never gameplay. */
(function(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    if(root){root.PreGameBrief=api;root.showPreGameBrief=(config,options)=>api.open(config,options);}
})(typeof globalThis==='object'?globalThis:this,function(){
    'use strict';
    const normalize=key=>key===' '||key==='Spacebar'||key==='space'?'space':String(key).toLowerCase();
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    let audio=null;
    function cue(kind){
        // The project already uses native Web Audio. These quiet UI notes need no files.
        const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
        if(!Context)return;
        try{
            if(!audio||audio.state==='closed')audio=new Context();
            const play=()=>{
                if(audio.state!=='running')return;
                const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
                const notes={open:[430,620,.075],confirm:[660,990,.13],tick:[480,420,.045],go:[880,1175,.12]};
                const [from,to,duration]=notes[kind]||notes.tick;
                o.type='triangle';o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(to,t+duration);
                g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.018,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
                o.connect(g);g.connect(audio.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
            };
            if(audio.state==='suspended')audio.resume().then(play).catch(()=>{});else play();
        }catch(_){/* Unavailable audio must never prevent entry into a competition. */}
    }
    function configuration(data){
        if(!data||!data.title||!data.objective)throw new TypeError('Briefing requer título e objetivo.');
        if(!Array.isArray(data.controls)||data.controls.length>3)throw new TypeError('Use até três controles essenciais.');
        return Object.freeze({id:data.id||'competition',title:String(data.title),subtitle:String(data.subtitle||''),
            objective:String(data.objective),tip:String(data.tip||''),controlGuide:data.controlGuide==='skate'?'skate':null,accent:data.accent||'#69d9d2',icon:data.icon||'medal',
            controls:Object.freeze(data.controls.map(c=>Object.freeze({keys:String(c.keys),action:String(c.action)})))});
    }
    function lines(ctx,value,width,max=2){
        const words=value.split(/\s+/),result=[];let current='';
        for(const word of words){
            const candidate=current?current+' '+word:word;
            if(ctx.measureText(candidate).width>width&&current){result.push(current);current=word;}else current=candidate;
        }
        if(current)result.push(current);
        const overflow=result.length>max;
        result.length=Math.min(result.length,max);
        for(let i=0;i<result.length;i++){
            let text=result[i],cut=false;
            while(text&&ctx.measureText(text+(cut||overflow&&i===max-1?'…':'')).width>width){text=text.slice(0,-1);cut=true;}
            result[i]=text+(cut||overflow&&i===max-1?'…':'');
        }
        return result;
    }
    function label(ctx,value,x,y,color){ctx.font='bold 7px monospace';ctx.fillStyle=color;ctx.fillText(value,x,y);}
    // Miniature competition postcards: integer pixels, no external assets or smoothing.
    function icon(ctx,type,x,y,accent){
        const r=(color,a,b,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x+Math.round(a),y+Math.round(b),Math.round(w),Math.round(h));};
        const ln=(color,a,b,c,d,weight=1)=>{
            a=Math.round(a);b=Math.round(b);c=Math.round(c);d=Math.round(d);
            const dx=Math.abs(c-a),sx=a<c?1:-1,dy=-Math.abs(d-b),sy=b<d?1:-1;let e=dx+dy;
            for(;;){r(color,a,b,weight,weight);if(a===c&&b===d)break;const e2=2*e;if(e2>=dy){e+=dy;a+=sx;}if(e2<=dx){e+=dx;b+=sy;}}
        };
        const disc=(color,cx,cy,rx,ry=rx)=>{
            for(let row=-ry;row<=ry;row++){const half=Math.floor(rx*Math.sqrt(Math.max(0,1-row*row/(ry*ry))));r(color,cx-half,cy+row,half*2+1,1);}
        };
        const poly=(color,points)=>{
            const ys=points.map(p=>p[1]),lo=Math.min(...ys),hi=Math.max(...ys);
            for(let row=lo;row<hi;row++){
                const hits=[];
                for(let i=0,j=points.length-1;i<points.length;j=i++){
                    const a=points[j],b=points[i];if((a[1]<=row&&b[1]>row)||(b[1]<=row&&a[1]>row))hits.push(a[0]+(row-a[1])*(b[0]-a[0])/(b[1]-a[1]));
                }
                hits.sort((a,b)=>a-b);for(let i=0;i+1<hits.length;i+=2)r(color,Math.ceil(hits[i]),row,Math.floor(hits[i+1])-Math.ceil(hits[i])+1,1);
            }
        };
        const ink='#0b1828',light='#e9ead1',gold='#ecc778';
        r(ink,0,0,82,56);r('#4a6472',1,0,80,1);r('#314c5a',1,1,80,54);r('#142b3b',3,3,76,50);
        r(accent,1,12,1,13);r(gold,78,2,2,2);r('#0a1724',5,51,72,2);
        if(typeof type==='function'){ctx.save();type(ctx,{x:x+5,y:y+6,size:46,accent});ctx.restore();return;}
        if(type==='pingpong'){
            r('#1c3546',4,4,74,46);r('#294554',4,41,74,9);
            ln('#5c7377',12,44,70,44);r('#101d2b',19,35,3,10);r('#101d2b',61,35,3,10);
            poly(ink,[[20,16],[63,16],[74,36],[8,36]]);
            poly('#267a78',[[21,18],[62,18],[70,33],[12,33]]);
            ln('#b0d7c7',21,18,62,18);ln('#b0d7c7',21,18,12,33);ln('#b0d7c7',62,18,70,33);ln('#b0d7c7',12,33,70,33);ln('#a4d1be',41,18,41,33);
            r('#cadfd2',15,23,53,1);r('#0e3544',15,20,53,3);
            for(let a=17;a<68;a+=4)r('#82aaa7',a,20,1,3);
            r('#e8d6b0',14,19,2,8);r('#e8d6b0',67,19,2,8);
            ln('#91674a',26,38,21,46,4);disc(ink,30,34,9,8);disc('#dc6657',30,33,7,6);r('#f79e79',26,29,4,2);
            disc('#fff4cf',58,11,3);r('#deae63',58,13,2,1);ln('#6d9497',52,9,47,8);r('#6d9497',48,13,3,1);
        }else if(type==='basketball'){
            r('#27354c',4,4,74,46);r('#79503d',4,30,74,20);r('#906042',4,32,74,1);
            poly('#b77b4e',[[17,29],[64,29],[75,48],[7,48]]);
            ln('#ead6a7',17,29,64,29);ln('#ead6a7',17,29,7,48);ln('#ead6a7',64,29,75,48);
            ln('#ead6a7',34,31,29,45);ln('#ead6a7',48,31,54,45);ln('#ead6a7',29,45,54,45);
            r(ink,56,7,3,34);r('#6b8a9a',57,8,1,32);r(ink,44,5,28,18);r('#d1d7c3',46,7,24,13);r('#eff0d6',48,8,20,1);
            r('#b95945',53,11,10,7);r('#d1d7c3',55,13,6,3);disc('#ef8349',58,21,9,2);disc(ink,58,21,6,1);
            ln('#d6e4df',51,23,54,31);ln('#d6e4df',65,23,62,31);ln('#8ba6aa',55,23,61,30);ln('#8ba6aa',61,23,55,30);ln('#d6e4df',54,31,62,31);
            disc(ink,26,25,12);disc('#e78b3b',26,24,10);ln('#753f2e',16,24,36,24);ln('#753f2e',26,14,26,34);
            ln('#753f2e',19,16,22,23);ln('#753f2e',22,23,20,31);ln('#753f2e',33,17,30,23);ln('#753f2e',30,23,32,31);r('#ffc16a',20,18,4,2);
        }else if(type==='marathon'){
            r('#294d49',4,4,74,46);poly('#9e5145',[[4,50],[23,20],[78,20],[78,50]]);
            for(let a=10;a<72;a+=14)ln('#e7cf9f',a,49,a+17,22);
            poly('#f0ddae',[[25,49],[31,40],[78,40],[78,44],[34,44],[31,49]]);
            for(let a=33;a<78;a+=8)r('#2b3940',a,40,4,4);
            r('#d0caa2',54,5,2,28);r('#edf1d6',56,5,18,11);
            for(let a=0;a<4;a++)for(let b=0;b<2;b++)if((a+b)%2===0)r('#193746',56+a*4,6+b*4,4,4);
            poly(ink,[[10,29],[15,19],[26,21],[30,31],[42,34],[44,40],[12,40],[8,36]]);
            poly(accent,[[12,29],[17,21],[24,23],[28,33],[40,36],[41,37],[12,37],[10,35]]);
            ln('#ecf0cf',14,38,42,38,2);ln('#d9e8d9',22,26,28,26);ln('#d9e8d9',23,29,29,29);r('#21798d',14,30,7,4);r('#a7d4c5',8,45,3,1);
        }else if(type==='skate'){
            r('#283851',4,4,74,46);r('#474f61',4,42,74,8);
            poly('#111f31',[[48,43],[48,34],[56,31],[62,25],[67,16],[77,16],[77,43]]);
            poly('#697589',[[50,41],[50,35],[58,32],[64,26],[69,18],[76,18],[76,41]]);
            ln('#b9c6c4',50,34,58,31);ln('#b9c6c4',58,31,64,25);ln('#b9c6c4',64,25,69,17);r('#ddd3b0',69,16,8,2);
            ln('#152137',10,35,46,29,3);ln('#afc4c7',10,34,46,28,2);ln('#6b8b97',17,35,17,43,2);ln('#6b8b97',39,31,39,43,2);
            ln(ink,16,15,48,21,7);ln('#d466bc',14,14,46,20,5);ln('#f7a6db',16,13,46,19);r('#f5d0df',12,12,4,3);r('#f5d0df',46,19,4,3);
            disc(ink,20,22,4);disc('#e3d5b6',20,22,2);disc(ink,42,26,4);disc('#e3d5b6',42,26,2);r('#98729f',25,45,15,1);
        }else if(type==='archery'){
            r('#244c47',4,4,74,46);poly('#3c6653',[[4,30],[12,12],[24,25],[36,9],[48,28],[63,17],[78,30],[78,50],[4,50]]);
            poly('#347f91',[[39,21],[46,21],[51,35],[63,50],[32,50],[40,35]]);r('#a0d9cf',41,22,3,12);r('#80c6c5',44,34,6,1);r('#80c6c5',39,44,14,1);
            r('#8d6946',58,32,3,16);ln('#8d6946',59,35,50,48,2);ln('#8d6946',59,35,69,48,2);
            disc(ink,59,24,13);disc('#e6dfb6',59,23,11);disc('#cf6554',59,23,8);disc('#ece2b4',59,23,5);disc('#d3a545',59,23,3);r('#8e452f',58,22,2,2);
            ln('#b98a50',15,8,23,13,2);ln('#b98a50',23,13,27,24,2);ln('#b98a50',27,24,23,35,2);ln('#b98a50',23,35,15,41,2);ln('#f2d8a3',15,9,15,40);
            ln('#e9d7a6',9,25,38,25);poly('#d9e5d1',[[38,22],[43,25],[38,28]]);ln('#dc6d58',8,22,12,25);ln('#dc6d58',8,28,12,25);r('#7aae69',6,44,14,3);
        }else if(type==='climbing'){
            r('#244052',4,4,74,46);r('#65818c',8,39,13,2);r('#65818c',61,36,15,2);
            poly('#3f5262',[[4,49],[18,30],[24,33],[40,7],[48,18],[52,17],[76,49]]);
            poly('#74848c',[[9,49],[24,34],[40,7],[43,27],[37,39],[41,49]]);
            poly('#526779',[[41,49],[37,39],[43,27],[40,7],[48,18],[52,17],[70,49]]);
            poly('#e0e8dc',[[31,23],[40,7],[48,18],[50,23],[43,20],[40,23],[37,19]]);
            ln('#344858',24,35,34,29);ln('#344858',34,29,30,39);ln('#9baba6',47,30,54,36);
            ln('#deb96e',43,18,47,24);ln('#deb96e',47,24,45,35);ln('#deb96e',45,35,51,42);r('#e7d092',47,28,2,3);
            r('#d86757',53,43,12,2);r('#a3c9c7',58,37,1,7);poly('#ea9b68',[[59,37],[66,39],[59,41]]);
            // Visible carabiner in front of the rock face.
            poly(ink,[[10,18],[16,15],[23,18],[24,29],[20,35],[12,34],[8,29]]);
            ln('#cfb778',12,19,17,17,3);ln('#cfb778',17,17,22,20,3);ln('#cfb778',22,20,22,28,3);ln('#cfb778',22,28,18,32,3);ln('#cfb778',18,32,12,31,3);ln('#cfb778',12,31,10,27,3);ln('#afcbd1',10,26,12,20,2);
            r('#67885e',7,47,14,3);
        }else if(type==='boxing'){
            r('#2e3148',4,4,74,46);poly('#536b7b',[[15,33],[65,33],[76,49],[5,49]]);
            for(const yy of [15,23,31]){ln('#283040',9,yy+1,73,yy+1,2);ln(yy===23?'#e1d7c3':'#b65d5f',9,yy,73,yy);}
            r('#c3c9bd',8,10,3,33);r('#c3c9bd',72,10,3,33);r('#a54950',7,13,5,6);r('#a54950',71,13,5,6);
            disc(ink,29,25,11,13);disc('#d9635f',29,24,9,11);r('#a3434f',21,25,5,9);r('#f58f78',25,16,6,2);disc('#d9635f',39,29,5,6);r('#e7dfc5',23,35,15,7);r('#536877',25,37,11,2);
            disc(ink,55,27,10,12);disc('#6aaab1',55,26,8,10);disc('#6aaab1',46,30,4,5);r('#8fd0cc',55,19,4,2);r('#e7dfc5',48,36,14,6);r('#536877',50,38,10,2);
        }else if(type==='surf'){
            r('#346275',4,4,74,46);r('#b6d4b3',10,9,15,2);r('#b6d4b3',15,7,7,2);disc('#ecc778',65,11,4);
            r('#256981',4,27,74,23);poly('#218f9c',[[7,43],[23,36],[35,25],[44,16],[56,15],[64,20],[66,28],[59,33],[53,31],[55,25],[51,22],[46,25],[42,36],[32,45],[4,50]]);
            ln('#9de1cd',12,41,25,35,2);ln('#9de1cd',25,35,38,22,2);ln('#dbe9c8',38,22,46,16,2);ln('#dbe9c8',46,16,56,16,2);ln('#dbe9c8',56,16,62,21,2);ln('#dbe9c8',62,21,63,28,2);ln('#dbe9c8',63,28,57,31,2);
            ln('#66c3bd',9,47,28,44);ln('#66c3bd',47,44,72,42);r('#bddece',14,46,5,1);r('#bddece',67,36,7,1);
            poly(ink,[[17,33],[22,29],[47,33],[52,37],[46,40],[23,36]]);poly('#edc278',[[19,33],[23,31],[46,35],[49,37],[45,38],[24,34]]);ln('#cf7159',28,33,41,36);r('#f5e1a6',23,32,8,1);
        }else{
            r(accent,28,10,9,20);r(accent,46,10,9,20);disc(gold,41,34,12);disc('#8e704b',41,34,8);r(light,39,28,4,12);
        }
        r('#6a8490',4,4,12,1);r(accent,66,52,11,1);
    }
    class Controller{
        constructor(now=()=>performance.now()){
            this.now=now;this.state='CLOSED';this.config=null;this.options={};
            this.elapsed=0;this.progress=0;this.swallowed=new Set();this.outcome=null;this.lastTime=0;this.clock=0;this.countdownLabel=null;
        }
        get active(){return this.state!=='CLOSED';}
        open(data,options={}){
            if(this.active)return false;
            this.config=configuration(data);this.options=options;this.elapsed=0;this.progress=0;
            this.state='OPENING';this.outcome=null;this.lastTime=this.now();
            this.clock=0;this.countdownLabel=null;
            for(const key of options.heldKeys||[])this.swallowed.add(normalize(key));
            options.clearInput?.();cue('open');return true;
        }
        close(outcome='cancel'){
            if(!this.active||this.state==='CLOSING')return false;
            if(outcome==='cancel'&&!this.options.onCancel)return false;
            this.state='CLOSING';this.elapsed=0;this.outcome=outcome;this.exitFrom=this.progress;
            this.options.clearInput?.();return true;
        }
        handleKeyDown(event){
            const key=normalize(event.key),held=this.swallowed.has(key);
            if(!this.active&&!held)return false;
            event.preventDefault?.();event.stopImmediatePropagation?.();
            if(this.active){
                this.swallowed.add(key);
                if(!event.repeat&&!held&&!['CLOSING','COUNTDOWN'].includes(this.state)){
                    if(key==='space'||key==='enter'){cue('confirm');this.options.onConfirm?.();this.close('start');}
                    else if(key==='escape')this.close('cancel');
                }
            }
            return true;
        }
        handleKeyUp(event){
            const key=normalize(event.key),handled=this.active||this.swallowed.has(key);
            if(handled){event.preventDefault?.();event.stopImmediatePropagation?.();}
            this.swallowed.delete(key);return handled;
        }
        releaseAll(){this.swallowed.clear();if(this.active)this.options.clearInput?.();}
        update(seconds){
            if(!this.active)return;
            const now=this.now(),dt=seconds===undefined?clamp((now-this.lastTime)/1000,0,.1):Math.max(0,seconds);
            this.lastTime=now;this.elapsed+=dt;this.clock+=dt;
            if(this.state==='OPENING'){
                this.progress=clamp(this.elapsed/.18,0,1);if(this.progress===1)this.state='READY';
            }else if(this.state==='CLOSING'){
                this.progress=this.exitFrom*(1-clamp(this.elapsed/.12,0,1));
                if(this.elapsed>=.12){
                    if(this.outcome==='start'&&this.options.countdown){
                        this.state='COUNTDOWN';this.elapsed=0;this.progress=0;this.countdownLabel='3';cue('tick');
                    }else this.finish();
                }
            }else if(this.state==='COUNTDOWN'){
                const next=this.elapsed<1.35?String(3-Math.floor(this.elapsed/.45)):'VAI!';
                if(next!==this.countdownLabel){this.countdownLabel=next;cue(next==='VAI!'?'go':'tick');}
                if(this.elapsed>=1.63)this.finish();
            }
        }
        finish(){
            const options=this.options,outcome=this.outcome;
            this.state='CLOSED';this.progress=0;this.options={};this.countdownLabel=null;options.clearInput?.();
            if(outcome==='start')options.onStart?.();else options.onCancel?.();
        }
        draw(ctx,canvas={width:450,height:300}){
            if(!this.active||!this.config)return;
            const c=this.config;
            if(this.state==='COUNTDOWN'){
                if(typeof this.options.drawCountdown==='function'){this.options.drawCountdown(ctx,canvas,this.elapsed);return;}
                const cx=Math.round(canvas.width/2),cy=Math.round(canvas.height/2),go=this.countdownLabel==='VAI!';
                ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.32;ctx.fillStyle='#071525';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;
                ctx.fillStyle='#0c1d2b';ctx.fillRect(cx-43,cy-39,86,76);ctx.fillStyle='#496474';ctx.fillRect(cx-41,cy-37,82,72);
                ctx.fillStyle='#142c3a';ctx.fillRect(cx-39,cy-35,78,68);ctx.fillStyle=c.accent;ctx.fillRect(cx-39,cy-35,78,2);
                ctx.textAlign='center';ctx.font='bold 7px monospace';ctx.fillStyle='#a7c1c5';ctx.fillText('PREPARE-SE',cx,cy-20);
                ctx.font=go?'bold 25px monospace':'bold 36px monospace';ctx.fillStyle=go?c.accent:'#f0e9ce';ctx.fillText(this.countdownLabel,cx,cy+16);
                ctx.fillStyle=c.accent;for(let i=0;i<3;i++)if(go||i>=3-Number(this.countdownLabel))ctx.fillRect(cx-17+i*14,cy+25,6,2);
                ctx.restore();return;
            }
            const p=this.progress,offset=Math.round((1-p)*6),x=Math.round((canvas.width-382)/2),y=Math.round((canvas.height-276)/2)+offset,w=382,h=276;
            ctx.save();ctx.imageSmoothingEnabled=false;ctx.textAlign='left';ctx.textBaseline='alphabetic';
            ctx.globalAlpha=p*.57;ctx.fillStyle='#06101d';ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.globalAlpha=p;
            ctx.fillStyle='#07111b';ctx.fillRect(x+5,y+7,w,h-3);
            ctx.fillStyle='#344d5e';ctx.fillRect(x+3,y,w-6,h);ctx.fillRect(x,y+3,w,h-6);
            ctx.fillStyle='#101f2e';ctx.fillRect(x+2,y+4,w-4,h-8);
            // Brass corner fasteners and ticket perforations echo the island festival.
            ctx.fillStyle='#bba16a';for(const dx of [8,w-10]){ctx.fillRect(x+dx,y+3,2,2);ctx.fillRect(x+dx,y+h-5,2,2);}
            ctx.fillStyle='#172c3b';ctx.fillRect(x+6,y+7,w-12,62);
            ctx.fillStyle=c.accent;ctx.fillRect(x+6,y+7,3,62);ctx.fillRect(x+17,y+71,65,1);
            ctx.fillStyle='#2a4352';ctx.fillRect(x+82,y+71,w-100,1);
            const left=x+19,top=y;
            label(ctx,'ILHA DOS CAMPEÕES  /  COMPETIÇÃO',left,top+20,'#8da5ae');
            ctx.font='bold 18px monospace';ctx.fillStyle='#e1ede7';
            ctx.fillText(lines(ctx,c.title.toUpperCase(),247,1)[0]||'',left,top+43);
            ctx.font='8px monospace';ctx.fillStyle='#a1b9c1';
            ctx.fillText(lines(ctx,c.subtitle,247,1)[0]||'',left,top+57);
            icon(ctx,c.icon,x+w-101,top+11,c.accent);
            // A quiet title glint on entry; no continuous sweep over the instructions.
            if(this.clock<.7){ctx.globalAlpha=p*.35*(1-this.clock/.7);ctx.fillStyle='#eff5d7';ctx.fillRect(left,top+46,Math.round(46+this.clock*180),1);ctx.globalAlpha=p;}
            if(c.controlGuide==='skate'&&globalThis.SkateControlCoach){
                globalThis.SkateControlCoach.drawGuide(ctx,left,top+84,w-38);
            }else{
            label(ctx,'OBJETIVO',left,top+85,c.accent);
            ctx.font='9px monospace';ctx.fillStyle='#d1dde0';
            lines(ctx,c.objective,w-38,2).forEach((line,i)=>ctx.fillText(line,left,top+100+i*12));
            ctx.font='9px monospace';
            const actions=c.controls.map(control=>lines(ctx,control.action,w-117,2));
            const rowHeights=actions.map(action=>action.length>1?26:18),controlsHeight=rowHeights.reduce((sum,height)=>sum+height,0);
            // Real data stays compact. Extra wrapped lines grow the body upward into its spare gap.
            let cursor=top+134-Math.max(0,controlsHeight-66);
            label(ctx,'CONTROLES',left,Math.min(top+125,cursor-9),c.accent);
            for(let i=0;i<c.controls.length;i++){
                const row=cursor,control=c.controls[i];cursor+=rowHeights[i];
                ctx.fillStyle='#081521';ctx.fillRect(left,row+2,65,16);
                ctx.fillStyle='#476171';ctx.fillRect(left,row,65,16);
                ctx.fillStyle='#203744';ctx.fillRect(left+1,row+1,63,13);
                ctx.font='bold 8px monospace';ctx.fillStyle='#e1e5d5';ctx.textAlign='center';
                ctx.fillText(lines(ctx,control.keys,59,1)[0]||'',left+32,row+10);
                ctx.textAlign='left';ctx.font='9px monospace';ctx.fillStyle='#c7d6db';
                actions[i].forEach((text,index)=>ctx.fillText(text,left+76,row+11+index*10));
            }
            ctx.fillStyle='#1a303d';ctx.fillRect(left-2,top+203,w-34,30);
            label(ctx,'DICA',left+5,top+213,'#cbb783');ctx.font='8px monospace';ctx.fillStyle='#a6bfc5';
            lines(ctx,c.tip,w-49,2).forEach((text,index)=>ctx.fillText(text,left+5,top+223+index*8));
            }
            const pulse=this.state==='READY'?(Math.sin(this.clock*3)+1)/2:0;
            ctx.fillStyle=pulse>.65?'#52737b':'#365963';ctx.fillRect(left-1,top+237,w-36,22);
            ctx.fillStyle='#203e49';ctx.fillRect(left,top+238,w-38,19);
            ctx.fillStyle=c.accent;ctx.fillRect(left+7,top+245,3,6);ctx.fillRect(left+w-49,top+245,3,6);
            ctx.textAlign='center';ctx.font='bold 10px monospace';ctx.fillStyle='#e2ece1';
            ctx.fillText('[ESPAÇO / ENTER]  COMEÇAR',x+w/2,top+251);
            if(this.options.onCancel){ctx.font='7px monospace';ctx.fillStyle='#839ba7';ctx.fillText('ESC  /  VOLTAR À ILHA',x+w/2,top+269);}
            ctx.restore();
        }
        snapshot(){return{active:this.active,state:this.state,id:this.config?.id||null,progress:this.progress,outcome:this.outcome,countdown:this.countdownLabel};}
    }
    const instance=new Controller();instance.Controller=Controller;
    return instance;
});
