(function(){
    'use strict';
    const {WIDTH:W,HEIGHT:H}=window.ArcheryField;
    const terrain=document.createElement('canvas');terrain.width=W;terrain.height=H;
    const land=terrain.getContext('2d');land.imageSmoothingEnabled=false;
    const riverWater=new Path2D();
    riverWater.moveTo(427,123);riverWater.lineTo(473,123);
    riverWater.bezierCurveTo(510,145,654,149,900,151);riverWater.lineTo(900,270);
    riverWater.bezierCurveTo(740,261,623,275,450,268);riverWater.bezierCurveTo(275,273,122,263,0,270);
    riverWater.lineTo(0,151);riverWater.bezierCurveTo(231,149,391,145,427,123);riverWater.closePath();
    const curtain=new Path2D();curtain.moveTo(430,53);curtain.lineTo(470,53);
    curtain.lineTo(477,126);curtain.lineTo(423,126);curtain.closePath();
    let seed = 92471;
    function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    function polygon(c, color, points) {
        c.fillStyle = color; c.beginPath(); c.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
        c.closePath(); c.fill();
    }
    function rock(c, x, y, size, moss = true) {
        x = Math.round(x); y = Math.round(y);
        c.fillStyle = '#275d58'; c.beginPath(); c.ellipse(x, y + size * .2, size * .75, size * .2, 0, 0, Math.PI * 2); c.fill();
        polygon(c, '#526f64', [[x-size*.7,y],[x-size*.4,y-size*.5],[x+size*.2,y-size*.64],[x+size*.65,y-size*.18],[x+size*.5,y+size*.12],[x-size*.4,y+size*.16]]);
        polygon(c, '#839a79', [[x-size*.7,y],[x-size*.4,y-size*.5],[x+size*.2,y-size*.64],[x,y-size*.2],[x-size*.12,y+size*.1]]);
        polygon(c, '#a7b58b', [[x-size*.39,y-size*.5],[x+size*.2,y-size*.64],[x+size*.43,y-size*.38],[x-size*.02,y-size*.31]]);
        if (moss) {
            c.fillStyle = '#769b48'; c.fillRect(x-size*.42,y-size*.52,size*.5,2);
            c.fillStyle = '#527c3d'; c.fillRect(x-size*.52,y-size*.4,size*.23,3);
        }
    }
    function tree(c, x, y, size, light = false) {
        x = Math.round(x); y = Math.round(y);
        c.fillStyle='#254f3e';c.beginPath();c.ellipse(x,y+1,size*.55,size*.13,0,0,Math.PI*2);c.fill();
        c.fillStyle = '#4f6444'; c.fillRect(x-1,y-size*.7,2,size*.7);
        const colors = light ? ['#326c48','#4a8549','#79a452'] : ['#245a43','#367343','#589149'];
        polygon(c, colors[0], [[x-size*.58,y-size*.3],[x-size*.68,y-size*.65],[x-size*.3,y-size*.8],[x-size*.18,y-size],[x+size*.3,y-size*1.05],[x+size*.62,y-size*.78],[x+size*.7,y-size*.4],[x+size*.36,y-size*.18]]);
        polygon(c, colors[1], [[x-size*.56,y-size*.65],[x-size*.27,y-size*.83],[x-size*.1,y-size],[x+size*.3,y-size*1.05],[x+size*.5,y-size*.8],[x+size*.23,y-size*.66],[x+size*.08,y-size*.43],[x-size*.3,y-size*.43]]);
        c.fillStyle = colors[2]; c.fillRect(x-size*.12,y-size*.94,size*.27,2); c.fillRect(x-size*.47,y-size*.64,size*.23,2);
        c.fillStyle=colors[0];c.fillRect(x-size*.68,y-size*.57,size*.22,size*.18);c.fillRect(x+size*.43,y-size*.61,size*.28,size*.18);
        c.fillStyle=colors[1];c.fillRect(x-size*.57,y-size*.73,size*.21,size*.14);c.fillRect(x+size*.37,y-size*.8,size*.24,size*.15);
        c.fillStyle=colors[2];c.fillRect(x+size*.26,y-size*.77,2,1);c.fillRect(x-size*.33,y-size*.63,2,1);
    }
    function grass(c, x, y, size, light = false) {
        c.strokeStyle = light ? '#b5bc65' : '#729b49'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x-3,y); c.lineTo(x-6,y-size*.65); c.lineTo(x-2,y-2);
        c.lineTo(x-1,y-size); c.moveTo(x,y); c.lineTo(x+3,y-size*.7); c.lineTo(x+3,y-2); c.lineTo(x+6,y-size*.4); c.stroke();
    }
    function island(c, x, y, size) {
        c.fillStyle = '#1d747d'; c.beginPath(); c.ellipse(x,y+3,size*.72,size*.2,0,0,Math.PI*2); c.fill();
        polygon(c, '#5b7757', [[x-size*.7,y],[x-size*.5,y-5],[x+size*.15,y-7],[x+size*.7,y-1],[x+size*.44,y+3],[x-size*.35,y+3]]);
        polygon(c, '#81a351', [[x-size*.67,y-2],[x-size*.39,y-8],[x+size*.22,y-8],[x+size*.61,y-2],[x,y]]);
        rock(c,x-2,y-5,size*.34); grass(c,x+size*.25,y-3,6);
    }

    function buildTerrain(){
        const c=land,sky=c.createLinearGradient(0,0,0,180);
        sky.addColorStop(0,'#76aaa9');sky.addColorStop(1,'#d3dfb2');c.fillStyle=sky;c.fillRect(0,0,W,H);
        for(const [x,y,w]of [[55,55,90],[270,39,64],[610,47,90],[786,65,54]]){
            c.fillStyle='#dce4c4';c.fillRect(x,y,w,3);c.fillRect(x+13,y-4,w*.55,4);
        }
        // Newly composed ridges: no resampling or stretching of the old arena.
        polygon(c,'#8fb9aa',[[0,95],[47,65],[93,77],[160,35],[214,72],[281,43],[337,77],[403,47],[450,69],[495,45],[560,77],[624,40],[686,74],[745,36],[817,73],[865,52],[900,86],[900,171],[0,171]]);
        polygon(c,'#6b9d90',[[0,105],[59,79],[124,92],[208,56],[275,90],[350,59],[414,81],[450,61],[493,80],[552,58],[616,91],[694,58],[764,92],[842,66],[900,100],[900,164],[0,164]]);
        polygon(c,'#496f60',[[0,48],[80,61],[135,83],[216,77],[288,102],[367,109],[428,53],[423,128],[365,150],[266,153],[190,163],[100,170],[0,174]]);
        polygon(c,'#4c7563',[[472,53],[530,108],[618,98],[698,76],[771,85],[850,60],[900,48],[900,174],[803,165],[712,158],[618,151],[536,149],[477,128]]);
        polygon(c,'#73916e',[[10,65],[88,76],[148,101],[220,94],[292,116],[355,123],[385,120],[355,139],[265,143],[190,150],[87,158],[0,153]]);
        polygon(c,'#789571',[[520,123],[554,119],[623,114],[697,94],[770,102],[845,77],[900,64],[900,154],[811,155],[716,145],[622,140],[554,137]]);
        c.save();c.globalAlpha=.16;
        for(let n=0;n<36;n++){
            const side=n%2,x=side?531+(n*61)%341:12+(n*67)%337,y=83+(n*17)%48;
            c.strokeStyle=n%3?'#334f46':'#c4c495';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+10,y+2);c.lineTo(x+15,y+7);c.lineTo(x+28,y+8);c.stroke();
        }
        for(let n=0;n<220;n++){
            const x=n%2?528+(n*71)%361:9+(n*53)%355,y=84+(n*19)%57;
            c.fillStyle=n%3?'#365e4c':'#bac08b';c.fillRect(x,y,1+n%3,1);
        }c.restore();
        for(let n=0;n<55;n++){
            const side=n%2,x=side?512+random()*382:random()*387,y=106+random()*42;
            tree(c,x,y,9+random()*13,n%3===0);
        }
        for(const [x,y,s]of [[205,141,23],[690,139,24],[358,137,12],[545,137,13]])rock(c,x,y,s);
        const water=c.createLinearGradient(0,130,0,272);water.addColorStop(0,'#589e9e');water.addColorStop(.55,'#398e99');water.addColorStop(1,'#287c8a');
        c.fillStyle=water;c.fill(riverWater);
        c.save();c.clip(riverWater);
        for(let n=0;n<14;n++){
            c.strokeStyle=n%2?'rgba(122,185,174,.12)':'rgba(28,105,119,.13)';c.lineWidth=7+n%4;
            c.beginPath();c.moveTo(n*74-50,165);c.bezierCurveTo(n*74+10,195,n*74-25,230,n*74+35,267);c.stroke();
        }c.restore();
        const fall=c.createLinearGradient(0,53,0,130);fall.addColorStop(0,'#e0eed8');fall.addColorStop(.5,'#acd7ca');fall.addColorStop(1,'#d3e9d5');
        c.fillStyle=fall;c.fill(curtain);c.fillStyle='#e6eed5';c.fillRect(429,52,42,3);
        c.save();c.clip(curtain);c.globalAlpha=.26;
        for(let n=0;n<13;n++){c.fillStyle=n%3?'#89beb6':'#f1f4df';c.fillRect(427+n*4,57+n%4*5,1+n%2,61-n%3*7);}c.restore();
        rock(c,417,63,12);rock(c,484,66,12);
        for(const [x,y,s]of [[389,93,17],[512,92,15],[412,117,10],[493,122,10]])tree(c,x,y,s,true);
        c.fillStyle='#9dcdc2';c.beginPath();c.ellipse(450,132,35,7,0,0,Math.PI*2);c.fill();
        c.fillStyle='#d6ebe0';c.beginPath();c.ellipse(450,130,30,4,0,0,Math.PI*2);c.fill();
        // Two dry, broad shooting terraces, separated by a low spectator walkway.
        polygon(c,'#395d4c',[[0,269],[100,264],[207,272],[315,266],[450,271],[583,266],[710,271],[815,265],[900,269],[900,480],[0,480]]);
        polygon(c,'#7d855d',[[0,279],[99,273],[214,279],[322,274],[452,279],[585,274],[712,278],[815,273],[900,279],[900,480],[0,480]]);
        const floor=c.createLinearGradient(0,280,0,H);floor.addColorStop(0,'#b6ab7c');floor.addColorStop(1,'#a89b6b');c.fillStyle=floor;c.fillRect(34,283,832,H-283);
        c.fillStyle='#d0c18e';c.fillRect(40,285,820,3);c.fillRect(40,364,820,2);c.fillRect(40,476,820,2);
        c.fillStyle='#85815c';c.fillRect(40,367,820,3);
        for(let y=304;y<H;y+=25){c.strokeStyle='rgba(113,110,75,.24)';c.lineWidth=1;c.beginPath();c.moveTo(36,y);c.lineTo(864,y);c.stroke();}
        for(let n=0;n<180;n++){c.fillStyle=n%2?'rgba(214,201,145,.32)':'rgba(113,112,77,.18)';c.fillRect(40+Math.floor(random()*820),287+Math.floor(random()*190),2,1);}
        for(const [x,y,s]of [[15,286,20],[885,286,20],[11,397,23],[888,406,24],[15,473,19],[888,473,20]]){rock(c,x,y,s);grass(c,x,y-3,11,true);}
        for(const [x,sign]of [[25,1],[875,-1]]){
            c.fillStyle='#4c684e';c.fillRect(x,266,2,46);polygon(c,'#a45c52',[[x+2,269],[x+sign*15,272],[x+2,279]]);
        }
        // Islands stay upstream, away from the three traversable target bands.
        island(c,261,142,22);island(c,637,142,20);
    }
    buildTerrain();
    const flow=Array.from({length:72},(_,i)=>({x:(i*127+31)%900,y:153+(i*37)%113,phase:random()*6,size:3+i%7}));
    let draws=0;
    function draw(ctx,seconds){
        const t=Number.isFinite(seconds)?seconds:performance.now()/1000;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(terrain,0,0);
        ctx.save();ctx.clip(riverWater);
        for(const f of flow){
            const x=(f.x+t*(7+(f.y-150)*.04))%940-20,y=f.y+Math.sin(t*.9+f.phase)*1.2;
            ctx.globalAlpha=.16+Math.sin(t*.7+f.phase)*.06;ctx.fillStyle='#c8ead5';ctx.fillRect(Math.round(x),Math.round(y),f.size,1);
            if(f.size>7){ctx.globalAlpha=.09;ctx.fillRect(Math.round(x+2),Math.round(y+3),f.size+5,1);}
        }
        for(let n=0;n<12;n++){
            const p=(t*.08+n/12)%1,x=n*79+Math.sin(t*.4+n)*6;
            ctx.strokeStyle='#bde0cb';ctx.globalAlpha=Math.sin(p*Math.PI)*.14;ctx.lineWidth=1;
            ctx.beginPath();ctx.ellipse(x,178+(n%3)*32,7+p*19,1+p*2,0,0,Math.PI);ctx.stroke();
        }ctx.restore();
        ctx.save();ctx.clip(curtain);
        for(let n=0;n<17;n++){ctx.globalAlpha=.35;ctx.fillStyle=n%3?'#c9e9d5':'#f0f5e0';ctx.fillRect(428+n*3,54+Math.floor((t*(36+n%4*5)+n*11)%75),1+n%2,8+n%5);}
        ctx.restore();
        for(let n=0;n<10;n++){const p=(t*.5+n/10)%1;ctx.globalAlpha=(1-p)*.35;ctx.fillStyle='#e4f3dd';ctx.fillRect(Math.round(450+Math.sin(n*7)*(20+p*24)),Math.round(130-Math.sin(p*Math.PI)*5),2,1);}
        for(let n=0;n<6;n++){const p=(t*.10+n/6)%1;ctx.globalAlpha=Math.sin(p*Math.PI)*.12;ctx.fillStyle='#eef5dc';ctx.beginPath();ctx.ellipse(427+n*8+Math.sin(t*.3+n)*4,131-p*8,12+p*11,3+p*2,0,0,Math.PI*2);ctx.fill();}
        // Tiny distant silhouettes have no carried disks and cannot resemble targets.
        ctx.globalAlpha=.35;ctx.strokeStyle='#496e65';ctx.lineWidth=1;
        for(let n=0;n<3;n++){const x=210+n*225+Math.sin(t*.08+n)*20,y=61+n%2*14,wing=1+Math.abs(Math.sin(t*2+n))*2;ctx.beginPath();ctx.moveTo(x-3,y-wing);ctx.lineTo(x,y);ctx.lineTo(x+3,y-wing);ctx.stroke();}
        for(let n=0;n<7;n++){const p=(t*.06+n/7)%1;ctx.globalAlpha=Math.sin(p*Math.PI)*.3;ctx.fillStyle='#b6bf7b';ctx.fillRect(Math.round(n%2?886-p*6:10+p*8),Math.round(281+n*23+p*6),2,1);}
        ctx.restore();draws++;
    }
    function drawSourceLip(ctx){ctx.save();ctx.fillStyle='rgba(232,246,225,.55)';ctx.beginPath();ctx.ellipse(450,130,30,2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
    window.ArcheryValley=Object.freeze({draw,drawSourceLip,containsWater:(x,y)=>land.isPointInPath(riverWater,x,y),
        diagnostics:()=>({name:'VALE DA CACHOEIRA',canvas:[W,H],camera:'FIXED_FULL_FIELD',cachedTerrain:true,
            waterfall:[423,52,54,80],riverMouth:[0,270,900],dryPlatform:[34,283,832,197],animatedElements:110,
            distantBirds:3,draws,gameplayObjects:0})});
})();
