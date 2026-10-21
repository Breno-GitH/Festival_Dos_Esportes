/* Escalada: authored mountain geometry. No input, save or other sport logic. */
window.ClimbCourse = (() => {
    const worldWidth = 6400;
    const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
    const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
    // One world-space mountain, shared by the contour, routes and lateral limits.
    const widths=[[0,4400],[.18,3840],[.38,3000],[.58,2280],[.76,1570],[.88,990],[.96,410],[1,200]];
    function shoulder(p,at,span,size){
        const t=(p-at)/span+.5;
        if(t<=0||t>=1)return 0;
        return size*(t<.25?t*4:t<.6?1:(1-t)/.4);
    }
    function profile(height,totalHeight) {
        const p=clamp(height/totalHeight),fade=1-smooth(.91,1,p);
        let i=0;while(i<widths.length-2&&p>widths[i+1][0])i++;
        const t=(p-widths[i][0])/(widths[i+1][0]-widths[i][0]);
        const width=widths[i][1]+(widths[i+1][1]-widths[i][1])*t;
        const center=3200+18*smooth(.9,1,p),apron=clamp(-height/220)*240;
        const west=shoulder(p,.19,.12,-110)+shoulder(p,.55,.075,-180)+shoulder(p,.83,.08,-60);
        const east=shoulder(p,.36,.21,260)+shoulder(p,.73,.1,100);
        return {left:center-width/2+(Math.sin(height/310)*24+Math.sin(height/670)*35)*fade+west-apron,
            right:center+width/2+(Math.sin(height/480+2)*45+Math.sin(height/235)*15)*fade+east+apron,
            spine:1300+1900*p,width,progress:p};
    }
    const totalHeight = 10400;
    const sections = [
        {id:'base',name:'BASE • VALE DOS CAMINHOS',start:0,end:1100,width:4200,throws:[],cooldown:360},
        {id:'wall',name:'PAREDE • TRAVESSIAS',start:1100,end:3400,width:3400,throws:['single'],cooldown:330},
        {id:'cliffs',name:'PENHASCOS • ROTAS CRUZADAS',start:3400,end:6100,width:2500,throws:['single','force_left','single','force_right'],cooldown:290},
        {id:'snow',name:'ALTA MONTANHA • GELO',start:6100,end:8800,width:1500,throws:['single','force_right','single','force_left'],cooldown:265},
        {id:'ascent',name:'ARESTA FINAL • O CUME',start:8800,end:totalHeight,width:600,throws:['single','force_left','single','force_right'],cooldown:245}
    ];
    const blockPlans = [{start:190,end:3400},{start:3400,end:7100},{start:7100,end:10180}];
    function build(configure) {
        const holds=[],main=[],branches=[];
        const sectionAt=h=>Math.max(0,sections.findIndex(s=>h<=s.end));
        const centerAt=h=>{const e=profile(h,totalHeight);return (e.left+e.right)/2;};
        function add(x,height,type,extra={}) {
            const sectionIndex=sectionAt(height);
            const h={id:holds.length,x,baseX:x,y:220-height,baseY:220-height,climbY:height,
                tipo:type,sectionIndex,levelStep:0,r:type==='checkpoint'?22:sectionIndex?15:19,
                coletado:false,routeTag:'center',lane:'center',...extra};
            holds.push(h);return h;
        }
        function centerType(height,i,block) {
            if(height<1100)return i%11===8?'moss':'normal';
            if(i%12===7)return 'brittle';
            if(height>6100&&i%7===4)return 'ice';
            if(i%15===9)return ['moving_horizontal','moving_vertical','moving_arc'][block];
            if(height<6100&&i%13===3)return 'moss';
            return 'normal';
        }
        function sideType(height,i,lane) {
            if(height<1100)return 'normal';
            if(lane==='left')return i%17===8?'bonus':i%19===12?'moss':'normal';
            if(i%5===2)return ['moving_horizontal','moving_diagonal_low','moving_vertical','moving_arc','moving_diagonal_steep','moving_pendulum','moving_elliptical_wide'][Math.floor(i/5)%7];
            if(height>6100&&i%4===1)return 'ice';
            if(i%9===6)return 'brittle';
            return i%17===9?'bonus':'normal';
        }
        const start=add(centerAt(0),0,'normal');main.push(start);
        for(const [i,height] of [60,124,190].entries())main.push(add(centerAt(height)+[31,-27,0][i],height,'normal'));
        for(const [block,plan] of blockPlans.entries()) {
            const entry=main.at(-1),span=plan.end-plan.start;
            // Each block has three genuine paths, with a quiet shared landing at its end.
            const count=Math.ceil(span/67),route=[entry];
            for(let i=1;i<count;i++) {
                const height=plan.start+Math.round(i/count*(span-16));
                if(plan.end-height<85)continue;
                const t=(height-plan.start)/span,e=profile(height,totalHeight);
                const weave=(52*Math.sin(i*1.47+block*.5)+22*Math.sin(i*.48))*Math.sin(Math.PI*t)**.35;
                const x=centerAt(height)+weave;
                const h=add(clamp(x,e.left+52,e.right-52),height,centerType(height,i,block),{blockIndex:block});
                route.push(h);main.push(h);
            }
            const approachHeight=plan.end-86;
            if(route.at(-1).climbY<approachHeight-18){
                const h=add(centerAt(approachHeight)-24,approachHeight,'normal',{blockIndex:block});
                route.push(h);main.push(h);
            }
            const exit=add(block===2?3200:centerAt(plan.end),plan.end,block===2?'normal':'checkpoint',{blockIndex:block});
            if(exit.tipo==='checkpoint')exit.platform={left:exit.baseX-41,right:exit.baseX+43,footInset:12};
            route.push(exit);main.push(exit);
            for(const lane of ['left','right']) {
                const side=lane==='left'?-1:1,spacing=lane==='left'?53:76;
                const sideCount=Math.ceil(span/spacing),candidates=[];
                for(let i=1;i<sideCount;i++) {
                    const height=plan.start+Math.round(i/sideCount*span),t=(height-plan.start)/span;
                    const e=profile(height,totalHeight),spread=(e.right-e.left)*.40*Math.sin(Math.PI*t)**1.5;
                    if(spread<86||plan.end-height<180)continue;
                    const x=centerAt(height)+side*spread+12*Math.sin(i*1.61+block);
                    candidates.push({x,height,type:sideType(height,i,lane)});
                }
                const first=candidates[0],last=candidates.at(-1);
                const from=route.filter(h=>h.climbY<first.height-50).at(-1)||entry;
                const to=route.find(h=>h.climbY>last.height+50)||exit;
                const tag=`${lane}_block_${block+1}`,path=[from];
                function leg(x,height,type,finalHold=null) {
                    const a=path.at(-1),pieces=Math.ceil(Math.max(Math.abs(x-a.baseX)/112,(height-a.climbY)/82));
                    for(let j=1;j<pieces;j++)path.push(add(a.baseX+(x-a.baseX)*j/pieces,a.climbY+(height-a.climbY)*j/pieces,'normal',
                        {optionalRoute:true,routeTag:tag,lane,blockIndex:block,forkEntry:from.id,forkExit:to.id}));
                    if(finalHold)path.push(finalHold);
                    else path.push(add(x,height,type,{optionalRoute:true,routeTag:tag,lane,blockIndex:block,forkEntry:from.id,forkExit:to.id}));
                }
                for(const c of candidates)leg(c.x,c.height,c.type);
                leg(to.baseX,to.climbY,'normal',to);
                branches.push({tag,lane,block,from,to,path});
            }
            const left=branches.find(b=>b.block===block&&b.lane==='left');
            const right=branches.find(b=>b.block===block&&b.lane==='right');
            // Rising crossovers allow a change of route instead of three isolated ladders.
            for(const [index,[source,target,t]] of [[left.path,route,.27],[route,left.path,.38],[right.path,route,.31],[route,right.path,.48]].entries()) {
                const from=source.reduce((a,b)=>Math.abs(a.climbY-(plan.start+span*t))<Math.abs(b.climbY-(plan.start+span*t))?a:b);
                const desired=from.climbY+Math.min(730,span*.23);
                const to=target.filter(h=>h.climbY>from.climbY+120).reduce((a,b)=>Math.abs(a.climbY-desired)<Math.abs(b.climbY-desired)?a:b);
                const pieces=Math.max(2,Math.ceil(Math.max(Math.abs(to.baseX-from.baseX)/92,(to.climbY-from.climbY)/60)));
                const tag=`crossover_${block+1}_${index+1}`,path=[from];
                from.tipo='normal';to.tipo='normal';
                for(let j=1;j<pieces;j++) {
                    const u=j/pieces;
                    path.push(add(from.baseX+(to.baseX-from.baseX)*u,from.climbY+(to.climbY-from.climbY)*u,
                        'normal',{optionalRoute:true,routeTag:tag,lane:'connection',blockIndex:block,forkEntry:from.id,forkExit:to.id}));
                }
                path.push(to);branches.push({tag,lane:'connection',block,from,to,path});
            }
        }
        // The last four contacts converge on the real summit, not on a height trigger.
        main.push(add(3180,10250,'ice'),add(3214,10320,'moving_horizontal'));
        const finish=add(3200,totalHeight,'summit');finish.isFinish=true;
        finish.surface={left:finish.baseX-82,right:finish.baseX+118};main.push(finish);
        main.forEach((h,i)=>h.levelStep=i);
        for(const h of holds.filter(h=>h.optionalRoute)) {
            const upper=main.findIndex(a=>a.climbY>=h.climbY),a=main[Math.max(0,upper-1)],b=main[upper];
            h.levelStep=a.levelStep+(h.climbY-a.climbY)/(b.climbY-a.climbY);
        }
        // Damage spurs never replace the safe continuation, and are far apart vertically.
        for(const [index,height] of [1870,2810,4650,5810,7760,9350].entries()) {
            const near=holds.filter(h=>h.lane==='right').reduce((a,b)=>Math.abs(a.climbY-height)<Math.abs(b.climbY-height)?a:b);
            const e=profile(near.climbY,totalHeight),x=Math.min(e.right-65,near.baseX+92);
            add(x,near.climbY,'spike',{optionalRoute:true,routeTag:'hazard_spur',lane:'danger',levelStep:near.levelStep});
        }
        // At a crossover two paths can nearly touch. Keep the individual rocks
        // readable instead of stacking two collision targets on one silhouette.
        for(let pass=0;pass<3;pass++)for(let i=0;i<holds.length;i++)for(let j=i+1;j<holds.length;j++){
            const a=holds[i],b=holds[j],dy=b.climbY-a.climbY;
            if(Math.abs(dy)>=36||!b.optionalRoute||b.tipo==='spike'||a.tipo==='spike')continue;
            const dx=b.baseX-a.baseX;
            if(Math.hypot(dx,dy)>=36)continue;
            const sign=Math.sign(dx)||(b.lane==='left'?-1:1),e=profile(b.climbY,totalHeight);
            b.baseX=clamp(b.baseX+sign*(Math.sqrt(38*38-dy*dy)-Math.abs(dx)),e.left+52,e.right-52);b.x=b.baseX;
        }
        for(const h of holds) {
            configure(h,h.levelStep*.73+(h.optionalRoute?.37:0));
            if(h.speed) {
                h.amplitude=h.tipo==='moving_vertical'?0:h.tipo==='moving_circular'?10:14;
                h.verticalAmplitude=h.tipo==='moving_circular'?10:6;
                h.speed=1.05+h.sectionIndex*.14;
            }
            h.grabRadius=h.sectionIndex===0?27:h.sectionIndex<3?25:23;
        }
        // Intersections use fixed footholds; moving mechanisms have room to operate.
        for(const h of holds.filter(h=>h.speed))if(holds.some(b=>b!==h&&Math.hypot(b.baseX-h.baseX,b.climbY-h.climbY)<55)) {
            h.tipo='normal';h.speed=0;h.amplitude=0;h.verticalAmplitude=0;
        }
        const ranges=sections.map((s,sectionIndex)=>({sectionIndex,id:s.id,name:s.name,
            startHeight:s.start,endHeight:s.end,startStep:main.find(h=>h.climbY>s.start)?.levelStep||0,
            endStep:main.filter(h=>h.climbY<=s.end).at(-1).levelStep,width:s.width}));
        return {holds,ranges,totalHeight,finishId:finish.id,worldWidth,
            routePlan:{lanes:['left','center','right'],blocks:blockPlans,crossovers:branches.filter(b=>b.lane==='connection').length,
                paths:[{tag:'center',lane:'center',holds:main.map(h=>h.id)},...branches.map(b=>({tag:b.tag,lane:b.lane,holds:b.path.map(h=>h.id)}))]}};
    }


    const mix = (a,b,t) => a.map((v,i)=>Math.round(v+(b[i]-v)*t));
    const rgb = a => `rgb(${a.join(',')})`;
    function background(ctx, game, canvas) {
        const altitude = Math.max(0,220-game.playerY+game.alturaAtual), p=altitude/game.alturaTotal;
        const stops = [[0,[74,116,100],[99,91,63]],[.12,[95,121,117],[111,87,66]],
            [.4,[105,143,166],[85,95,105]],[.65,[133,175,196],[94,117,135]],[1,[56,86,132],[103,128,156]]];
        let i=0;while(i<stops.length-2&&p>stops[i+1][0])i++;
        const t=Math.max(0,Math.min(1,(p-stops[i][0])/(stops[i+1][0]-stops[i][0])));
        const sky=mix(stops[i][1],stops[i+1][1],t), rock=mix(stops[i][2],stops[i+1][2],t);
        const gradient=ctx.createLinearGradient(0,0,0,canvas.height);
        gradient.addColorStop(0,rgb(sky));gradient.addColorStop(1,rgb(mix(sky,[211,226,216],.5)));
        ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
        // Distant ridgelines provide depth, with no collision or decorative holds.
        for(let layer=0;layer<2;layer++){
            ctx.fillStyle=layer?'rgba(49,78,94,.27)':'rgba(210,224,218,.35)';
            ctx.beginPath();ctx.moveTo(0,canvas.height);
            for(let x=-60;x<=canvas.width+60;x+=60)ctx.lineTo(x,125+layer*56+Math.sin((x+game.cameraX*.2)/95+layer)*38+game.alturaAtual*.015%35);
            ctx.lineTo(canvas.width,canvas.height);ctx.fill();
        }
        if(p>.76){
            const reveal=Math.min(1,(p-.76)/.09), x=canvas.width-57;
            // The upper ridge appears in the distance before the final traverse.
            ctx.save();ctx.globalAlpha=reveal;
            ctx.fillStyle='#bcd7e1';ctx.beginPath();ctx.moveTo(x-115,210);ctx.lineTo(x-24,68);ctx.lineTo(x+3,54);ctx.lineTo(x+87,198);ctx.fill();
            ctx.fillStyle='#edf8f7';ctx.beginPath();ctx.moveTo(x-52,111);ctx.lineTo(x-24,68);ctx.lineTo(x+3,54);ctx.lineTo(x+33,106);ctx.lineTo(x+3,95);ctx.lineTo(x-15,115);ctx.lineTo(x-29,98);ctx.fill();
            ctx.restore();
        }
        // World-fixed silhouette narrows toward the summit; rock layers do not swim with the camera.
        const worldTop=game.alturaTotal, yTop=220-worldTop+game.alturaAtual;
        const center=768-game.cameraX;
        const halfAt = h => 210+Math.max(0,1-h/game.alturaTotal)*210-110*Math.max(0,Math.min(1,(h-game.alturaTotal+200)/200));
        ctx.beginPath();ctx.moveTo(center,yTop);
        for(let y=Math.max(yTop, -140);y<canvas.height+160;y+=50){const h=220-y+game.alturaAtual;ctx.lineTo(center+halfAt(h)+Math.sin(h*.011)*19,y);}
        ctx.lineTo(center-halfAt(altitude),canvas.height+160);
        for(let y=canvas.height+150;y>=Math.max(yTop,-140);y-=50){const h=220-y+game.alturaAtual;ctx.lineTo(center-halfAt(h)+Math.sin(h*.009+1)*21,y);}
        ctx.closePath();ctx.fillStyle=rgb(rock);ctx.fill();
        ctx.save();ctx.clip();
        const first=Math.floor((game.alturaAtual-180)/100)*100;
        for(let h=first;h<game.alturaAtual+420;h+=100){
            const y=220-h+game.alturaAtual,half=halfAt(h);
            ctx.fillStyle='rgba(24,35,40,.20)';ctx.beginPath();ctx.moveTo(center-half,y);ctx.lineTo(center-35,y+21);ctx.lineTo(center+half,y-7);ctx.lineTo(center+half,y+17);ctx.lineTo(center-22,y+43);ctx.lineTo(center-half,y+19);ctx.fill();
            ctx.strokeStyle='rgba(237,221,187,.16)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(center-half,y);ctx.lineTo(center-40,y+20);ctx.lineTo(center+half,y-7);ctx.stroke();
            for(let j=0;j<3;j++){const x=center-155+j*135+Math.sin(h*.03+j)*30;
                ctx.strokeStyle='rgba(15,25,32,.22)';ctx.beginPath();ctx.moveTo(x,y+35);ctx.lineTo(x-12,y+61);ctx.lineTo(x+9,y+80);ctx.stroke();}
            if(h<1100){ctx.fillStyle='#355b44';for(const side of [-1,1]){const x=center+side*(half-30);ctx.beginPath();ctx.ellipse(x,y,26,11,side*.4,0,Math.PI*2);ctx.fill();}}
            if(h>game.alturaTotal*.61){ctx.fillStyle='rgba(224,241,244,.68)';for(const side of [-1,1]){const x=center+side*(half-22);ctx.beginPath();ctx.moveTo(x-35,y);ctx.lineTo(x+20,y-5);ctx.lineTo(x+35,y+9);ctx.lineTo(x-14,y+15);ctx.fill();}}
        }
        ctx.restore();
        // Ground is visible at the trailhead. Above the cliffs, clouds pass behind the climbing face.
        const groundY=244+game.alturaAtual;
        if(groundY<canvas.height){ctx.fillStyle='#334b32';ctx.fillRect(0,groundY,canvas.width,canvas.height-groundY);ctx.fillStyle='#6f8b4c';ctx.fillRect(0,groundY,canvas.width,7);}
        if(p>.28){ctx.fillStyle='rgba(230,245,250,.17)';for(let j=0;j<4;j++){const x=((j*163-game.cameraX*.15+performance.now()*.002)%(canvas.width+220))-100;
            const y=75+j*57+Math.sin(game.alturaAtual*.001+j)*20;ctx.beginPath();ctx.ellipse(x,y,70,13,0,0,Math.PI*2);ctx.fill();}}
    }

    function summit(ctx, game, cameraX, masterSprite) {
        const h=game.pedrasGeradas.find(h=>h.isFinish);if(!h)return;
        const y=220-h.climbY+game.alturaAtual;
        if(y < -110 || y>350)return;
        const x=h.surface.left-cameraX,w=h.surface.right-h.surface.left;
        ctx.fillStyle='#647b8d';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w+40,y+110);ctx.lineTo(x-45,y+110);ctx.fill();
        ctx.fillStyle='#ebf6f6';ctx.fillRect(x,y,w,7);ctx.fillStyle='#a9cbd5';ctx.fillRect(x,y+7,w,7);
        ctx.fillStyle='#e6c56e';ctx.fillRect(x+w-37,y-63,3,63);ctx.fillStyle='#f2c95d';ctx.beginPath();ctx.moveTo(x+w-34,y-63);ctx.lineTo(x+w-5,y-53);ctx.lineTo(x+w-34,y-42);ctx.fill();
        if(masterSprite.complete&&masterSprite.naturalWidth)ctx.drawImage(masterSprite,x+w-73,y-54,36,54);
    }
    return Object.freeze({sections,build,profile,worldWidth,background,summit});
})();
