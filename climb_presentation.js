/* Presentation only: world coordinates, collisions, motion and controls belong to ClimbCourse. */
window.ClimbPresentation = (() => {
    'use strict';
    const tracks = new WeakMap();
    const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
    const smooth = (a,b,v) => { const t=clamp((v-a)/(b-a));return t*t*(3-2*t); };
    const mix = (a,b,t) => a.map((v,i)=>Math.round(v+(b[i]-v)*t));
    const rgb = a => `rgb(${a.join(',')})`;
    const noise = n => {const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    const worldY = (h,g) => 220-h+g.alturaAtual;
    const progress = g => clamp((220-g.playerY+g.alturaAtual)/g.alturaTotal);
    function palette(p) {
        const stops=[ [0,[110,185,210],[139,116,83]], [.13,[116,184,205],[137,112,87]],
            [.34,[113,172,202],[119,114,108]], [.55,[102,151,191],[102,118,133]],
            [.78,[75,118,170],[110,134,154]], [1,[48,91,150],[130,157,179]] ];
        let i=0;while(i<stops.length-2&&p>stops[i+1][0])i++;
        const t=smooth(stops[i][0],stops[i+1][0],p);
        return {sky:mix(stops[i][1],stops[i+1][1],t),rock:mix(stops[i][2],stops[i+1][2],t),
            light:mix([245,213,153],[232,249,255],smooth(.2,.9,p))};
    }
    function polygon(ctx,points,color) {
        ctx.fillStyle=color;ctx.beginPath();
        points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fill();
    }
    function edges(h,g) { return ClimbCourse.profile(h,g.alturaTotal); }
    function view(g) {
        const reveal=clamp((1-(g.summitSequence?.zoom||1))/.2);
        return {zoom:.74-.08*reveal,pivotY:207-57*reveal};
    }
    function crown(g) {
        const top=g.alturaTotal,e=edges(top,g);
        return [[e.left,top],[e.left+19,top+30],[e.left+49,top+26],
            [e.spine-10,top+106],[e.spine+19,top+62],[e.right-31,top+47],[e.right,top]];
    }
    function contour(g,lowest,highest,step=45) {
        const points=[];
        for(let h=lowest;h<highest;h+=step)points.push([edges(h,g).left,h]);
        points.push([edges(highest,g).left,highest]);
        if(highest>=g.alturaTotal)points.push(...crown(g).slice(1));
        else points.push([edges(highest,g).right,highest]);
        for(let h=highest-step;h>lowest;h-=step)points.push([edges(h,g).right,h]);
        points.push([edges(lowest,g).right,lowest]);return points;
    }
    function ridge(ctx,g,c,layer,p) {
        const parallax=layer===0?.08:.21,spacing=layer===0?100:86;
        const offset=g.cameraX*parallax,start=Math.floor(offset/spacing)-1;
        const horizon=(layer===0?140:192)+g.alturaAtual*(layer===0?.008:.014);
        const baseline=Math.min(layer===0?226:282,horizon);
        const peaks=[];
        for(let j=start;j<start+Math.ceil(c.width/spacing)+3;j++){
            const x=j*spacing-offset, y=baseline-(layer===0?42:55)-noise(j+layer*15)*(layer===0?53:76);
            peaks.push([x,y]);
        }
        polygon(ctx,[[peaks[0][0]-60,(c.height+100)],...peaks,[peaks.at(-1)[0]+70,(c.height+100)]],
            rgb(mix(layer===0?[138,173,186]:[88,127,142],[131,164,190],p*.6)));
        for(let j=0;j<peaks.length-1;j++){
            const [x,y]=peaks[j],next=peaks[j+1];
            polygon(ctx,[[x,y],[next[0],next[1]],[x+spacing*.4,(c.height+100)]],layer===0?'rgba(224,239,237,.11)':'rgba(28,65,88,.16)');
            if(p>.26){const snow=smooth(.26,.67,p);ctx.save();ctx.globalAlpha=snow*.72;
                polygon(ctx,[[x-19,y+24],[x,y],[x+25,y+29],[x+7,y+20],[x-1,y+29],[x-8,y+17]],'#e2edf0');ctx.restore();}
        }
        if(layer===1&&p>.13&&p<.62){
            const alpha=smooth(.13,.26,p)*(1-smooth(.48,.62,p));ctx.save();ctx.globalAlpha=alpha*.62;
            const x=102-g.cameraX*.09,y=baseline-63;
            ctx.strokeStyle='#b8e5e6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3,y+31);ctx.lineTo(x-4,y+58);ctx.lineTo(x+9,y+88);ctx.stroke();
            ctx.strokeStyle='rgba(207,240,237,.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+1,y);ctx.lineTo(x+5,y+34);ctx.lineTo(x-1,y+59);ctx.stroke();ctx.restore();
        }
    }
    function cloudBank(ctx,x,y,size,alpha) {
        ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#e6f0ef';
        for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(x+(i-1.5)*size*.4,y-Math.sin(i*1.7)*size*.07,size*.48,size*.13,0,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    function tree(ctx,x,y,size,seed,front=false) {
        ctx.fillStyle=front?'#3e4632':'#536651';ctx.fillRect(Math.round(x-size*.05),y-size*.64,size*.1,size*.64);
        ctx.strokeStyle=front?'#4c5035':'#536651';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-size*.25);ctx.lineTo(x-size*.21,y-size*.64);ctx.moveTo(x,y-size*.4);ctx.lineTo(x+size*.21,y-size*.76);ctx.stroke();
        for(let i=0;i<5;i++){
            const a=i*1.4+seed,px=x+Math.cos(a)*size*.24,py=y-size*.7+Math.sin(a)*size*.14;
            polygon(ctx,[[px-size*.26,py],[px-size*.14,py-size*.23],[px+size*.12,py-size*.2],[px+size*.29,py+size*.05],[px,py+size*.16]],i%2?'#56774c':'#678954');
        }
    }
    function background(ctx,g,c) {
        const p=progress(g),colors=palette(p),time=performance.now()/1000;
        const sky=ctx.createLinearGradient(0,0,0,c.height);sky.addColorStop(0,rgb(colors.sky));sky.addColorStop(1,rgb(mix(colors.sky,[229,236,214],.5)));
        ctx.fillStyle=sky;ctx.fillRect(-180,-160,c.width+360,c.height+320);
        const sunX=c.width-49-g.cameraX*.025,sunY=62+p*12;
        const glow=ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,71);glow.addColorStop(0,'rgba(255,246,207,.46)');glow.addColorStop(1,'rgba(255,248,225,0)');ctx.fillStyle=glow;ctx.fillRect(sunX-71,sunY-71,142,142);
        ctx.fillStyle=rgb(mix([255,238,184],[238,249,255],p));ctx.beginPath();ctx.arc(sunX,sunY,10-p*2,0,Math.PI*2);ctx.fill();
        ridge(ctx,g,c,0,p);ridge(ctx,g,c,1,p);
        for(let i=0;i<3;i++){
            const x=((i*193-g.cameraX*.12+time*1.5)%(c.width+230)+c.width+230)%(c.width+230)-110;
            cloudBank(ctx,x,73+i*58+smooth(.45,1,p)*110,76+i*10,.19+smooth(.6,1,p)*.28);
        }
        const ground=worldY(-24,g);
        if(ground<400){for(let j=0;j<6;j++)tree(ctx,j*106-g.cameraX*.18+15,ground+8,64+noise(j)*33,j);}
        // Front face with a darker side wall: fixed world strata, not scrolling wallpaper.
        const highest=Math.min(g.alturaTotal,Math.ceil((g.alturaAtual+330)/45)*45);
        const bottom=g.alturaAtual-220;
        const points=contour(g,bottom,highest).map(([x,h])=>[x-g.cameraX,worldY(h,g)]);
        ctx.save();ctx.translate(-17,9);polygon(ctx,points,rgb(mix(colors.rock,[25,45,57],.45)));ctx.restore();
        polygon(ctx,points,rgb(colors.rock));ctx.save();ctx.clip();
        const light=ctx.createLinearGradient(-100,0,c.width+100,c.height);light.addColorStop(0,'rgba(255,238,200,.16)');light.addColorStop(.5,'rgba(0,0,0,0)');light.addColorStop(1,'rgba(15,31,46,.24)');ctx.fillStyle=light;ctx.fillRect(-150,-150,c.width+300,c.height+300);
        // Broad inclined faces and projecting shoulders replace the old repeated vertical ribs.
        const buttressStart=Math.floor((g.alturaAtual-550)/610)*610;
        for(let h=buttressStart;h<g.alturaAtual+700;h+=610){
            const upper=edges(h+290,g),lower=edges(h-370,g),middle=edges(h,g);
            const ridge=middle.left+190+noise(h*.01)*190;
            polygon(ctx,[[upper.left-g.cameraX,worldY(h+290,g)],[ridge-g.cameraX,worldY(h+185,g)],
                [ridge+160-g.cameraX,worldY(h-150,g)],[lower.left+65-g.cameraX,worldY(h-370,g)]],'rgba(35,48,60,.18)');
            polygon(ctx,[[ridge-g.cameraX,worldY(h+185,g)],[ridge+290-g.cameraX,worldY(h-270,g)],
                [ridge+160-g.cameraX,worldY(h-150,g)]],'rgba(247,236,211,.12)');
        }
        const first=Math.floor((g.alturaAtual-160)/105)*105;
        for(let h=first;h<g.alturaAtual+300;h+=105){
            const e=edges(h,g),left=e.left-g.cameraX,right=e.right-g.cameraX,y=worldY(h,g),seed=h/105;
            const mid=left+(right-left)*(.28+noise(seed)*.4);
            polygon(ctx,[[left-12,y+34],[mid-31,y+12],[mid+50,y+82],[left+12,y+112]],'rgba(31,39,44,.14)');
            polygon(ctx,[[mid-31,y+12],[right+14,y-13],[right+10,y+59],[mid+50,y+82]],'rgba(245,228,204,.07)');
            ctx.strokeStyle='rgba(244,228,207,.13)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y+34);ctx.lineTo(mid-31,y+12);ctx.lineTo(right,y-13);ctx.stroke();
            for(let j=0;j<4;j++){
                const x=left+18+noise(seed*9+j)*(right-left-36),cy=y+noise(seed+j*2)*55;
                ctx.strokeStyle='rgba(30,38,44,.24)';ctx.beginPath();ctx.moveTo(x,cy);ctx.lineTo(x-9,cy+15);ctx.lineTo(x-4,cy+31);ctx.lineTo(x-15,cy+47);ctx.stroke();
            }
            if(h<1900){
                ctx.save();ctx.globalAlpha=1-smooth(800,1900,h);
                for(let j=0;j<2;j++){const x=j?right-18:left+12;polygon(ctx,[[x-15,y+7],[x+16,y-2],[x+27,y+16],[x+10,y+26],[x-22,y+20]],'#5c6d43');
                    ctx.strokeStyle='#46583c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+21);ctx.quadraticCurveTo(x+13,y+45,x-4,y+70);ctx.stroke();}
                ctx.restore();
            }
            if(h>g.alturaTotal*.54){
                ctx.save();ctx.globalAlpha=smooth(g.alturaTotal*.54,g.alturaTotal*.75,h)*.85;
                for(let j=0;j<2;j++){const x=j?right-8:left+9;polygon(ctx,[[x-32,y+5],[x+12,y-1],[x+28,y+10],[x-7,y+18],[x-27,y+13]],'#dfedf0');}
                ctx.restore();
            }
        }
        ctx.restore();
        if(ground<c.height){
            polygon(ctx,[[-150,ground+5],[c.width+150,ground-2],[c.width+150,c.height+150],[-150,c.height+150]],'#526449');
            ctx.fillStyle='#809259';ctx.fillRect(-150,ground,c.width+300,5);
            for(let j=0;j<18;j++){const x=j*29-g.cameraX*.14%29;ctx.strokeStyle='#819755';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,ground+4);ctx.lineTo(x-4,ground-5-noise(j)*8);ctx.moveTo(x+2,ground+4);ctx.lineTo(x+6,ground-3);ctx.stroke();}
            for(const x of [30,c.width-31])polygon(ctx,[[x-22,ground+8],[x-17,ground-10],[x+4,ground-20],[x+23,ground-5],[x+19,ground+11]],'#6e7261');
        }
    }
    function foundation(ctx,g,h) {
        const x=h.x-g.cameraX,y=h.y,p=h.climbY/g.alturaTotal,rock=palette(p).rock;
        if(h.tipo==='checkpoint')return;
        if(!h.speed){
            polygon(ctx,[[x-27,y-5],[x-16,y-18],[x+15,y-12],[x+30,y+10],[x+16,y+29],[x-22,y+21]],rgb(mix(rock,[50,54,54],.12)));
            ctx.strokeStyle='rgba(35,39,39,.32)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-15,y-16);ctx.lineTo(x-27,y-27);ctx.lineTo(x-24,y-35);ctx.moveTo(x+23,y+21);ctx.lineTo(x+35,y+27);ctx.stroke();
        }
        if(h.quebrada){ctx.fillStyle='rgba(28,30,29,.5)';ctx.beginPath();ctx.ellipse(x,y+8,13,5,0,0,Math.PI*2);ctx.fill();}
    }
    function mechanism(ctx,g,h,sample) {
        const x=h.baseX-g.cameraX,y=worldY(h.climbY,g);
        ctx.save();
        if(h.tipo==='moving_arc'||h.tipo==='moving_pendulum'){
            const cold=h.sectionIndex>=3,anchorY=y-52,actualX=h.x-g.cameraX;
            polygon(ctx,[[x-12,anchorY-6],[x+13,anchorY-5],[x+18,anchorY+8],[x-12,anchorY+10]],cold?'#81969e':'#73694b');
            ctx.strokeStyle=cold?'#b4c8ce':'#4c5540';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,anchorY);ctx.quadraticCurveTo((x+actualX)/2-6,anchorY+30,actualX,h.y+7);ctx.stroke();
            ctx.strokeStyle=cold?'#d0e3e6':'#8b8759';ctx.lineWidth=1;ctx.stroke();
            ctx.fillStyle='#3b4a4c';ctx.beginPath();ctx.arc(x,anchorY,3,0,Math.PI*2);ctx.fill();
        }else{
            let track=tracks.get(h);
            if(!track){
                track=new Path2D();for(let i=0;i<=40;i++){const m=sample(h,i/40*Math.PI*2);if(!i)track.moveTo(m.x,m.y);else track.lineTo(m.x,m.y);}tracks.set(h,track);
            }
            ctx.translate(x,y);
            ctx.strokeStyle='rgba(30,39,43,.48)';ctx.lineWidth=5;ctx.stroke(track);
            ctx.strokeStyle=h.sectionIndex<3?'#8a8270':'#94a9af';ctx.lineWidth=2;ctx.stroke(track);
            for(const a of [0,Math.PI*.7,Math.PI*1.4]){
                const m=sample(h,a);ctx.fillStyle='#4d5e61';ctx.fillRect(m.x-2,m.y-2,4,4);ctx.fillStyle='#bbc4b2';ctx.fillRect(m.x-1,m.y-1,1,1);
            }
            ctx.fillStyle='#697b7b';ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#c2c5a8';ctx.fillRect(-1,-1,2,2);
        }
        ctx.restore();
    }
    function formation(ctx,g,h) {
        const x=h.x-g.cameraX,y=h.y,p=h.climbY/g.alturaTotal,colors=palette(p);
        const variation=noise(h.id*3.17),size=(h.sectionIndex===0?22:h.sectionIndex===4?16:19)+(variation-.5)*3;
        const facet=noise(h.id*5.13)*5,offset=noise(h.id*9.47)*4;
        if(h.tipo==='checkpoint'){
            polygon(ctx,[[x-51,y+6],[x+53,y+6],[x+44,y+24],[x+12,y+40],[x-24,y+35],[x-48,y+21]],rgb(mix(colors.rock,[49,57,60],.25)));
            polygon(ctx,[[x-53,y+5],[x-41,y-2],[x+43,y-1],[x+55,y+6],[x+44,y+11],[x-45,y+11]],h.sectionIndex>=3?'#d4e5e8':'#c2af85');
            ctx.strokeStyle='#d0ba78';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+39,y+5);ctx.lineTo(x+39,y-31);ctx.stroke();
            polygon(ctx,[[x+40,y-30],[x+59,y-25],[x+40,y-20]],h.coletado?'#e8ca69':'#a8b5a0');
            ctx.fillStyle='#a68c56';ctx.beginPath();ctx.arc(x,y+16,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eadb9b';ctx.fillRect(x-1,y+13,2,5);return;
        }
        const danger=h.tipo==='spike'||h.tipo==='danger',ice=h.tipo==='ice'||h.tipo==='moving_ice';
        const base=danger?[91,73,73]:ice?[120,175,188]:mix(colors.rock,[160,149,122],.25);
        ctx.fillStyle='rgba(21,30,33,.39)';ctx.beginPath();ctx.ellipse(x+3,y+19,size+3,6,0,0,Math.PI*2);ctx.fill();
        polygon(ctx,[[x-size-2,y+7],[x-size+5+facet,y-3-offset],[x+size-4,y-2+offset],[x+size+2,y+9],[x+size-5-facet,y+21],[x-8+facet,y+27-offset],[x-size+2,y+17]],rgb(mix(base,[43,52,55],.28)));
        polygon(ctx,[[x-size-2,y+7],[x-size+5+facet,y-3-offset],[x+size-4,y-2+offset],[x+size+2,y+9],[x+1+facet,y+12]],rgb(base));
        polygon(ctx,[[x+1+facet,y+12],[x+size+2,y+9],[x+size-5-facet,y+21],[x-8+facet,y+27-offset]],rgb(mix(base,[30,42,51],.2)));
        ctx.strokeStyle=danger?'#d37b6e':ice?'#e4fbfa':rgb(mix(base,colors.light,.55));ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x-size+3,y+5);ctx.lineTo(x-2,y+4+offset*.3);ctx.lineTo(x+size-5,y+5);ctx.stroke();
        if(h.speed){ctx.fillStyle='#718b90';ctx.fillRect(x-5,y+14,10,4);ctx.fillStyle='#c6d8cf';ctx.fillRect(x-1,y+14,2,2);}
        if(h.tipo==='moss'){
            polygon(ctx,[[x-size,y+3],[x-7,y-6],[x+10,y-3],[x+size,y+5],[x+9,y+9],[x-12,y+8]],'#658346');
            ctx.strokeStyle='#99ac62';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-size+3,y+3);ctx.lineTo(x+7,y);ctx.stroke();
            ctx.strokeStyle='#537341';for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(x-12+j*11,y+7);ctx.quadraticCurveTo(x-7+j*10,y+19,x-13+j*10,y+26+j*3);ctx.stroke();}
        }else if(ice){
            polygon(ctx,[[x-size+1,y+2],[x-10,y-6],[x+size-5,y-3],[x+size,y+8],[x+3,y+10],[x-8,y+6]],'#c6eff0');
            ctx.strokeStyle='#f3ffff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-9,y-1);ctx.lineTo(x+9,y+3);ctx.moveTo(x+3,y+13);ctx.lineTo(x+13,y+9);ctx.stroke();
            for(let j=0;j<3;j++)polygon(ctx,[[x-11+j*10,y+18],[x-5+j*10,y+17],[x-8+j*10,y+30+(j%2)*4]],j%2?'#afdae3':'#d9f7f5');
        }else if(h.tipo==='brittle'){
            const urgent=h.quebrando&&h.tempoRestante/h.breakMax<.4;
            ctx.strokeStyle=urgent?'#e5b177':'#55483e';ctx.lineWidth=urgent?2:1.5;ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x+3,y+9);ctx.lineTo(x-5,y+14);ctx.lineTo(x+1,y+25);ctx.moveTo(x+3,y+9);ctx.lineTo(x+12,y+6);ctx.moveTo(x-5,y+14);ctx.lineTo(x-14,y+11);ctx.stroke();
        }else if(h.tipo==='bonus'){
            const glow=h.coletado?.25:.8;ctx.save();ctx.globalAlpha=glow;
            ctx.strokeStyle='#d3bd77';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-10,y+10);ctx.lineTo(x-3,y+16);ctx.lineTo(x+9,y+12);ctx.stroke();
            ctx.fillStyle='#fff1ad';ctx.fillRect(x-4,y+13,2,2);ctx.fillRect(x+7,y+9,2,2);
            if(!h.coletado){const t=performance.now()/1000+h.id;ctx.globalAlpha=.35+Math.sin(t*2)*.2;ctx.fillRect(x+5,y-9,1,5);ctx.fillRect(x+3,y-7,5,1);}ctx.restore();
        }
        if(danger){
            for(let j=0;j<4;j++){const px=x-18+j*11;polygon(ctx,[[px-5,y+8],[px-3,y-10-(j%2)*8],[px+6,y+8]],'#3f3e43');
                ctx.strokeStyle='#cf7b70';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px-3,y-10-(j%2)*8);ctx.lineTo(px+6,y+8);ctx.stroke();}
            ctx.fillStyle='#e29b81';ctx.fillRect(x-3,y+15,6,2);
        }else if(h.sectionIndex>=3&&!ice){
            polygon(ctx,[[x-size+1,y+3],[x-size+7,y-2],[x+size-4,y-1],[x+size,y+5],[x+5,y+8],[x-2,y+4],[x-9,y+7]],'#dcebed');
        }
    }
    function holds(ctx,g,c,sample) {
        const margin=(1/view(g).zoom-1)*c.width/2+65;
        const visible=g.pedrasGeradas.filter(h=>!h.isFinish&&h.x-g.cameraX>-margin&&h.x-g.cameraX<c.width+margin&&h.y>-160&&h.y<c.height+140);
        for(const h of visible){foundation(ctx,g,h);if(h.speed)mechanism(ctx,g,h,sample);}
        for(const h of visible)if(!h.quebrada)formation(ctx,g,h);
    }
    function atmosphere(ctx,g,c) {
        const p=progress(g),time=performance.now()/1000,wind=g.ventoDuracao>0?g.ventoDirecao:1;
        const playerX=g.playerX-g.cameraX;
        function clear(x,y){return !(Math.abs(x-playerX)<32&&Math.abs(y-(g.playerY-30))<48);}
        function field(count,alpha,color,speed,leaf=false){
            if(alpha<.01)return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;
            for(let i=0;i<count;i++){
                const x=((noise(i+8)*700+time*speed*wind-g.cameraX*.13)%(c.width+60)+c.width+60)%(c.width+60)-30;
                const y=((noise(i+20)*410+time*(leaf?8:13)+g.alturaAtual*.07)%(c.height+60)+c.height+60)%(c.height+60)-30;
                if(!clear(x,y))continue;
                if(leaf){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time+i)*.7);ctx.fillRect(-2,-1,4,2);ctx.restore();}
                else ctx.fillRect(Math.round(x),Math.round(y),i%3?1:2,1);
            }ctx.restore();
        }
        field(7,(1-smooth(.14,.3,p))*.6,'#bec78b',12,true);
        field(8,smooth(.1,.3,p)*(1-smooth(.65,.78,p))*.28,'#e5d9b8',9);
        field(22,smooth(.55,.73,p)*.65,'#e3f4f6',g.ventoDuracao>0?29:10);
        if(p>.4||g.ventoDuracao>0){
            ctx.save();ctx.strokeStyle='rgba(224,244,249,.2)';ctx.lineWidth=1;
            for(let i=0;i<5;i++){const x=((i*137+time*33*wind)%(c.width+100)+c.width+100)%(c.width+100)-50,y=70+noise(i+36)*200;
                if(!clear(x,y))continue;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+9*wind,y-3,x+18*wind,y-1);ctx.stroke();}ctx.restore();
        }
    }
    function foreground(ctx,g,c) {
        const p=progress(g),first=Math.floor((g.alturaAtual-210)/290)*290;
        for(let h=first;h<g.alturaAtual+350;h+=290){
            const e=edges(h,g),y=worldY(h,g);
            for(const side of [-1,1]){
                const x=(side<0?e.left:e.right)-g.cameraX;
                if(x<-100||x>c.width+100||Math.abs(x-(g.playerX-g.cameraX))<80)continue;
                polygon(ctx,[[x+side*9,y-32],[x-side*14,y-9],[x-side*6,y+20],[x+side*18,y+53]],p>.6?'#627b88':'#666754');
                if(p>.6)polygon(ctx,[[x+side*9,y-32],[x-side*14,y-9],[x-side*8,y-3],[x+side*12,y-24]],'#d5e7e9');
            }
        }
        const ground=worldY(-24,g);
        if(ground<c.height+75){tree(ctx,83,ground+9,96,1,true);tree(ctx,c.width-49,ground+12,87,3,true);}
    }
    function summit(ctx,g,cameraX,master) {
        const h=g.pedrasGeradas.find(h=>h.isFinish);if(!h)return;
        const y=worldY(h.climbY,g);if(y<-110||y>350)return;
        const left=h.surface.left-cameraX,right=h.surface.right-cameraX;
        const lower=edges(h.climbY-115,g),middle=edges(h.climbY-52,g);
        polygon(ctx,[[left,y],[right,y],[middle.right-cameraX,y+52],[lower.right-cameraX,y+115],
            [lower.left-cameraX,y+115],[middle.left-cameraX,y+52]],'#718c9e');
        polygon(ctx,[[left,y+6],[left+53,y+16],[left+70,y+71],[lower.left-cameraX,y+115],[middle.left-cameraX,y+52]],'#566d81');
        polygon(ctx,[[left-3,y],[right+2,y],[right+5,y+7],[right-13,y+11],[right-23,y+8],[left+36,y+9],[left+12,y+6],[left-5,y+10]],'#e8f5f5');
        ctx.strokeStyle='#b4d9e1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left,y+11);ctx.lineTo(left+41,y+14);ctx.moveTo(right-8,y+19);ctx.lineTo(right-28,y+32);ctx.stroke();
        const pole=right-35;ctx.fillStyle='#b7a77c';ctx.fillRect(pole,y-62,3,62);
        const wave=Math.sin((g.motionClock||0)*3)*2;
        polygon(ctx,[[pole+3,y-62],[pole+31,y-55+wave],[pole+24,y-41+wave],[pole+3,y-46]],'#e9c869');
        if(master.complete&&master.naturalWidth)ctx.drawImage(master,right-73,y-54,36,54);
    }
    function overview(ctx,g,c,options={}) {
        const base=edges(-160,g),width=base.right-base.left,top=g.alturaTotal+130;
        const margin=options.mini?3:30,scale=Math.min((c.width-margin*2)/width,(c.height-margin*2)/(top+160));
        const ox=c.width/2-(base.left+base.right)/2*scale,oy=c.height-margin-160*scale;
        const project=([x,h])=>[ox+x*scale,oy-h*scale];
        const points=contour(g,-160,g.alturaTotal,50).map(project);
        ctx.save();
        if(!options.mini){ctx.fillStyle=options.silhouette?'#edf2f1':'#b5d4df';ctx.fillRect(0,0,c.width,c.height);}
        polygon(ctx,points,options.silhouette?'#172c37':'#7b8b91');
        if(!options.silhouette){
            ctx.save();ctx.clip();
            for(const range of g.sectionRanges){const a=project([0,range.endHeight])[1],b=project([0,range.startHeight])[1];ctx.fillStyle=rgb(palette((range.startHeight+range.endHeight)/2/g.alturaTotal).rock);ctx.fillRect(0,a,c.width,b-a+1);}
            const peak=project([3200,g.alturaTotal+106]);
            polygon(ctx,[peak,project([2300,4200]),project([base.left,-160])],'rgba(31,48,61,.26)');
            polygon(ctx,[peak,project([4220,3500]),project([base.right,-160])],'rgba(234,242,234,.16)');
            polygon(ctx,[peak,project([2860,g.alturaTotal-700]),project([3100,g.alturaTotal-480]),project([3350,g.alturaTotal-830]),project([3590,g.alturaTotal-610])],'#e0eef0');
            ctx.restore();
            if(options.routes){
                ctx.strokeStyle=options.mini?'rgba(234,224,178,.75)':'#e8d28b';ctx.lineWidth=options.mini?.8:1.8;ctx.beginPath();
                g.pedrasGeradas.filter(h=>!h.optionalRoute).forEach((h,i)=>{const v=project([h.baseX,h.climbY]);i?ctx.lineTo(...v):ctx.moveTo(...v);});ctx.stroke();
            }
        }
        if(options.mini){
            for(const h of g.pedrasGeradas.filter(h=>h.tipo==='checkpoint')){const [x,y]=project([h.baseX,h.climbY]);ctx.fillStyle='#e0c379';ctx.fillRect(x-2,y-1,4,2);}
            const [x,y]=project([g.playerX,220-g.playerY+g.alturaAtual]);ctx.fillStyle='#65d996';ctx.beginPath();ctx.arc(x,y,2.3,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();return {scale,baseWidth:width};
    }
    return Object.freeze({background,holds,atmosphere,foreground,summit,view,overview,
        diagnostics:Object.freeze({layers:5,parallax:{farX:.08,midX:.21,wall:1,foreground:1},maxAmbientParticles:35,geometryChanges:true,normalZoom:.74})});
})();
