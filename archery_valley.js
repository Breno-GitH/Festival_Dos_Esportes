(function () {
    'use strict';
    // Visual environment only. No target, arrow, movement or scoring state.
    const W = 450, H = 300;
    const terrain = document.createElement('canvas');
    terrain.width = W; terrain.height = H;
    const land = terrain.getContext('2d');
    const river = new Path2D();
    river.moveTo(202, 105); river.lineTo(250, 105);
    river.bezierCurveTo(264, 128, 292, 146, 316, 163);
    river.bezierCurveTo(345, 181, 408, 188, 450, 190);
    river.lineTo(450, 224);river.lineTo(0, 224);river.lineTo(0,190);
    river.bezierCurveTo(40, 188, 105, 179, 132, 155);
    river.bezierCurveTo(160, 139, 185, 120, 202, 105);
    river.closePath();
    // Two shallow tributaries are visible all the way to the upper side edges.
    // Downstream the river also reaches both lower edges, above the dry terrace.
    function tributary(right) {
        const p=new Path2D(),x=v=>right?W-v:v;
        // Reversing the mirrored contour preserves winding, so overlapping
        // channels form a union instead of punching a dry hole in the river.
        if(right){
            p.moveTo(x(-4),131);p.lineTo(x(-4),147);
            p.bezierCurveTo(x(45),148,x(92),146,x(134),151);
            p.bezierCurveTo(x(155),154,x(176),158,x(207),168);p.lineTo(x(210),154);
            p.bezierCurveTo(x(185),145,x(169),140,x(143),137);
            p.bezierCurveTo(x(100),133,x(50),129,x(-4),131);p.closePath();return p;
        }
        p.moveTo(x(-4),131);p.bezierCurveTo(x(50),129,x(100),133,x(143),137);
        p.bezierCurveTo(x(169),140,x(185),145,x(210),154);p.lineTo(x(207),168);
        p.bezierCurveTo(x(176),158,x(155),154,x(134),151);
        p.bezierCurveTo(x(92),146,x(45),148,x(-4),147);p.closePath();return p;
    }
    const riverWater=new Path2D(river);riverWater.addPath(tributary(false));riverWater.addPath(tributary(true));
    // Paint-only exclusion mask: highlights cannot flow over the cached rocks
    // or the two little islands. The existing water/target geometry is intact.
    const motionMask=new Path2D();motionMask.rect(0,0,W,H);
    for(const [x,y,rx,ry]of [[128,165,22,9],[331,174,18,9],[274,139,11,6],[180,136,7,4],
        [113,165,15,7],[82,182,16,7],[24,181,20,9],[342,174,18,8],[401,176,20,9]]){
        motionMask.moveTo(x+rx,y);motionMask.ellipse(x,y,rx,ry,0,0,Math.PI*2,true);
    }
    const wetArea = new Path2D();
    wetArea.moveTo(0,0);wetArea.lineTo(W,0);wetArea.lineTo(W,215);
    for(const [x,y] of [[418,208],[366,211],[302,209],[241,212],[170,209],[111,212],[55,208],[0,215]])wetArea.lineTo(x,y);
    wetArea.closePath();
    const curtain = new Path2D();
    curtain.moveTo(205, 51); curtain.lineTo(246, 51);
    curtain.lineTo(249, 82); curtain.lineTo(255, 113);
    curtain.lineTo(244, 120); curtain.lineTo(204, 119);
    curtain.lineTo(196, 111); curtain.lineTo(201, 79); curtain.closePath();
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

    function buildTerrain() {
        const c = land; c.imageSmoothingEnabled = false;
        const sky = c.createLinearGradient(0,0,0,160);
        sky.addColorStop(0,'#83bcb7'); sky.addColorStop(.62,'#d9e0b1'); sky.addColorStop(1,'#b6d1a0');
        c.fillStyle = sky; c.fillRect(0,0,W,H);
        c.fillStyle = '#ebecd0';
        for (const [x,y,w] of [[33,23,48],[95,38,24],[303,24,51],[358,43,39]]) {
            c.fillRect(x,y,w,4); c.fillRect(x+8,y-3,w*.55,4); c.fillRect(x-5,y+4,w+12,3);
        }
        // Distant ridges, then the two irregular shoulders of the valley.
        polygon(c,'#7cafa0',[[0,67],[29,46],[47,52],[88,18],[112,43],[144,14],[181,51],[214,35],[247,53],[290,23],[320,43],[356,12],[389,48],[418,36],[450,61],[450,155],[0,155]]);
        polygon(c,'#64958c',[[0,90],[45,66],[75,83],[112,48],[140,68],[176,44],[208,73],[244,69],[278,45],[311,63],[336,40],[364,66],[409,50],[450,78],[450,168],[0,168]]);
        polygon(c,'#436e60',[[0,17],[51,25],[85,43],[124,36],[157,49],[188,48],[211,54],[203,79],[184,99],[166,128],[122,151],[84,178],[0,201]]);
        polygon(c,'#5f8264',[[0,18],[44,25],[76,47],[120,42],[157,54],[186,53],[172,81],[138,88],[116,114],[64,128],[0,151]]);
        polygon(c,'#7b9667',[[0,36],[36,38],[73,59],[111,56],[137,65],[151,57],[160,66],[132,81],[114,85],[91,109],[42,115],[0,137]]);
        polygon(c,'#426d5a',[[245,51],[271,43],[292,48],[320,43],[359,46],[391,27],[450,22],[450,202],[379,181],[332,160],[286,132],[263,94]]);
        polygon(c,'#6e8c65',[[270,47],[295,55],[322,46],[359,51],[396,35],[450,32],[450,139],[415,113],[366,122],[332,87],[301,91],[285,69]]);
        polygon(c,'#91a46e',[[322,47],[361,53],[399,37],[450,37],[450,67],[420,76],[402,61],[373,79],[353,62],[336,68],[319,58]]);
        // The dark cut in the rock makes a broad waterfall read as a single landmark.
        polygon(c,'#294f4c',[[191,48],[205,45],[218,47],[239,43],[252,49],[266,72],[265,104],[282,122],[245,138],[192,131],[179,108],[190,78]]);
        polygon(c,'#55796b',[[185,51],[200,48],[193,79],[185,103],[192,114],[178,121],[172,104],[181,80]]);
        polygon(c,'#68846a',[[248,50],[260,60],[263,91],[278,115],[265,122],[251,101]]);
        // Cached, restrained strata and lichen: depth without busy target-sized shapes.
        c.save();
        for (let n=0;n<135;n++) {
            const y=34+random()*110, left=random()<.5;
            const edge=left ? 175-y*.33 : 270+y*.33;
            const x=left ? random()*edge : edge+random()*(450-edge);
            c.fillStyle=n%3===0?'#a3b07a':'#486e57';
            c.globalAlpha=.22; c.fillRect(x|0,y|0,3+random()*16,1+random()*2);
        }
        for(let n=0;n<1100;n++) {
            const y=35+random()*100,left=random()<.5,edge=left?177-y*.33:270+y*.33;
            const x=left?random()*edge:edge+random()*(450-edge);
            c.fillStyle=n%3===0?'#c0c38c':'#355d48';c.globalAlpha=.12;
            c.fillRect(x|0,y|0,1+n%2,1);
        }
        c.globalAlpha=.22;c.strokeStyle='#264e46';c.lineWidth=1;
        for(const [x,y,d]of [[35,51,1],[106,75,-1],[160,67,-1],[316,65,1],[372,93,1],[424,54,-1]]){
            c.beginPath();c.moveTo(x,y);c.lineTo(x+d*8,y+7);c.lineTo(x+d*5,y+18);c.lineTo(x+d*13,y+25);c.stroke();
        }
        c.restore();
        // Forest occupies the shoulders and banks, never the open central channel.
        for (let n=0;n<40;n++) {
            const side=n%2, depth=n/40;
            const x=side ? 300+random()*152 : random()*149;
            const y=70+depth*63+random()*15;
            tree(c,x,y,9+depth*9,n%3===0);
        }
        polygon(c,'#517d44',[[0,138],[73,127],[120,135],[172,122],[166,144],[135,163],[111,181],[57,200],[0,224]]);
        polygon(c,'#75984d',[[0,149],[71,139],[117,144],[148,136],[139,154],[113,168],[95,184],[42,201],[0,213]]);
        polygon(c,'#467646',[[278,123],[320,133],[365,126],[407,141],[450,139],[450,225],[400,204],[352,186],[314,165],[290,148]]);
        polygon(c,'#7d9e50',[[301,138],[326,142],[365,136],[405,150],[450,150],[450,210],[407,192],[351,179],[320,158]]);
        const water=c.createLinearGradient(0,104,0,225);
        water.addColorStop(0,'#529c9c'); water.addColorStop(.30,'#388d96'); water.addColorStop(1,'#287b8c');
        c.fillStyle=water; c.fill(riverWater);
        c.save(); c.clip(riverWater);
        c.fillStyle='#76b5a0'; c.globalAlpha=.18;
        c.beginPath();c.moveTo(220,115);c.bezierCurveTo(171,155,282,165,331,216);c.lineTo(209,225);c.bezierCurveTo(231,177,149,169,215,113);c.fill();
        c.restore();
        // Short shelves / shoreline stones soften the boundary of the water.
        for (const [x,y,s] of [[153,128,14],[128,162,17],[113,169,21],[82,187,22],[24,186,26],[284,131,12],[315,165,17],[342,179,24],[401,181,27]]) rock(c,x,y,s);
        island(c,128,171,29); island(c,331,179,24); rock(c,274,143,15); rock(c,180,139,9);
        for (let n=0;n<35;n++) {
            const left=n%2===0, y=145+random()*63;
            const limit=Math.max(13,140-(y-145)*1.7);
            const x=left ? random()*limit : 450-random()*limit;
            grass(c,x,y,3+random()*6,n%5===0);
            if(n%5===0) { c.fillStyle='#d6d3a0';c.fillRect(x+3,y-2,2,2); }
        }
        polygon(c,'#85bbb0',[[216,43],[231,44],[237,48],[244,52],[204,52],[209,47]]);
        const fall=c.createLinearGradient(0,51,0,120);
        fall.addColorStop(0,'#d1ebd7');fall.addColorStop(.4,'#b1e0cf');fall.addColorStop(.85,'#a4dace');fall.addColorStop(1,'#e0f0dc');
        c.fillStyle=fall; c.fill(curtain);
        c.save(); c.clip(curtain);
        for(let n=0;n<12;n++) {
            c.fillStyle=n%3===0?'#f1f6dc':'#79c2b8';c.globalAlpha=.26;
            c.fillRect(199+n*4,48+n%3*4,2+n%3,65-n%4*5);
            c.fillRect(201+n*4,90+n%3*3,1,24);
        }
        c.restore();
        c.fillStyle='#dfefce'; c.fillRect(204,50,42,3);
        rock(c,193,58,10);rock(c,258,61,12);
        for(const [x,y,s]of [[174,57,15],[275,64,15],[162,105,17],[293,116,15]])tree(c,x,y,s,true);
        c.fillStyle='#83c5bb';c.beginPath();c.ellipse(225,121,36,7,0,0,Math.PI*2);c.fill();
        c.fillStyle='#d6ede0';c.beginPath();c.ellipse(225,118,31,4,0,0,Math.PI*2);c.fill();
        for(let n=0;n<35;n++){
            const angle=random()*Math.PI*2,x=225+Math.cos(angle)*(19+random()*14),y=119+Math.sin(angle)*4;
            c.fillStyle=n%3?'#dcefd9':'#a4d6c9';c.fillRect(x|0,y|0,2+random()*3,1);
        }
        // A full-width dry terrace contains the existing physical shooting bounds.
        polygon(c,'#334f46',[[0,215],[55,208],[111,212],[170,209],[241,212],[302,209],[366,211],[418,208],[450,215],[450,300],[0,300]]);
        polygon(c,'#7b7d59',[[0,221],[47,214],[108,218],[169,215],[241,218],[300,215],[370,217],[423,214],[450,220],[450,300],[0,300]]);
        const floor=c.createLinearGradient(0,218,0,300);
        floor.addColorStop(0,'#b9ad7a');floor.addColorStop(1,'#9e946c');
        c.fillStyle=floor;c.fillRect(25,220,400,80);
        c.fillStyle='#c9bb86';c.fillRect(32,220,386,3);
        c.strokeStyle='#827e5c';c.lineWidth=1;
        for(let y=236;y<300;y+=22){c.beginPath();c.moveTo(25,y);c.lineTo(425,y);c.stroke();
            for(let x=28+((y/22|0)%2)*30;x<425;x+=62){c.beginPath();c.moveTo(x,y-15);c.lineTo(x,y);c.stroke();}}
        for(let n=0;n<80;n++) {
            c.fillStyle=n%2?'#c9bc88':'#8c8762';c.globalAlpha=.32;
            c.fillRect(28+random()*392,225+random()*72,1+random()*3,1);
        }
        c.globalAlpha=1;
        c.fillStyle='#d5c492';c.fillRect(31,290,388,2);c.fillStyle='#777450';c.fillRect(31,292,388,2);
        // Foreground frames the arena at the extreme edges, outside body footprints.
        for(const [x,y,s]of [[3,258,19],[447,249,19],[6,294,23],[444,295,22]]) {
            rock(c,x,y,s);grass(c,x,y-4,15,true);grass(c,x+5,y-2,11);
        }
        for(const x of [22,428]) {
            c.fillStyle='#405d47';c.fillRect(x,191,2,37);
            c.fillStyle='#d8c58c';c.fillRect(x,190,2,3);
            polygon(c,'#377d7c',[[x+2,193],[x+14*(x<225?1:-1),196],[x+2,202]]);
            c.fillStyle='#a6c2a2';c.fillRect(x+(x<225?5:-6),196,3,2);
        }
    }
    buildTerrain();
    const flow = Array.from({length:38},()=>({p:random(),u:random()-.5,size:3+random()*9,phase:random()*7}));
    const spray = Array.from({length:10},()=>({p:random(),x:random()-.5,size:1+random()*2}));
    let draws=0;
    function draw(ctx, seconds) {
        const t=Number.isFinite(seconds)?seconds:performance.now()/1000;
        ctx.save(); ctx.imageSmoothingEnabled=false;
        ctx.drawImage(terrain,0,0);
        ctx.save();ctx.clip(riverWater);ctx.clip(wetArea);ctx.clip(motionMask);
        for(let n=0;n<6;n++){
            const p=(t*.10+n/6)%1,x=p*170,y=140+p*p*8;
            ctx.globalAlpha=.20;ctx.fillStyle='#b3ddcb';ctx.fillRect(x|0,y|0,4,1);ctx.fillRect((450-x)|0,y|0,4,1);
        }
        for(const f of flow) {
            const p=(f.p+t*.10)%1,y=120+p*103;
            const width=70+Math.pow(p,1.1)*365;
            const center=225+Math.sin(p*5)*8;
            const x=center+f.u*width+Math.sin(t*.4+f.phase)*2;
            ctx.globalAlpha=.10+Math.sin(p*Math.PI)*.16;ctx.fillStyle='#b3ddcb';
            ctx.fillRect(Math.round(x),Math.round(y),Math.round(f.size*(.5+p)),1);
            if(p>.45)ctx.fillRect(Math.round(x+3),Math.round(y+2),Math.round(f.size*.45),1);
        }
        // Broken reflections from the bright curtain, distorted downstream.
        for(let n=0;n<8;n++){
            const y=128+n*9+Math.sin(t*.8+n)*1.2;
            const x=225+Math.sin(t*.65+n*.85)*(2+n*.7);
            const width=7+n*1.8+Math.sin(t*1.1+n)*3;
            ctx.globalAlpha=.045+(7-n)*.009;ctx.fillStyle='#e2f4d5';
            ctx.fillRect(Math.round(x-width/2),Math.round(y),Math.round(width),1);
        }
        // Longitudinal strands make the current read as water moving toward us.
        for(let n=0;n<12;n++){
            const p=(t*.075+n*.083333)%1,side=Math.sin(n*2.4),y=124+p*91;
            const x=225+side*(12+p*p*190)+Math.sin(p*4+n)*4;
            ctx.globalAlpha=Math.sin(p*Math.PI)*.11;ctx.strokeStyle=n%3?'#c1e2cf':'#205d72';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+side*2,y+4,x+side*(3+p*4),y+6+p*6);ctx.stroke();
        }
        for(const [x,y]of [[153,132],[274,147],[128,176],[331,184],[82,191],[401,185]]){
            const p=(t*.32+x*.013)%1;ctx.globalAlpha=(1-p)*.18;ctx.strokeStyle='#d3e8cf';ctx.lineWidth=1;
            ctx.beginPath();ctx.ellipse(x,y+p*5,5+p*8,1+p*1.7,0,0,Math.PI);ctx.stroke();
        }
        ctx.globalAlpha=.20;ctx.strokeStyle='#cee9d5';ctx.lineWidth=1;
        for(let n=0;n<4;n++) {
            const p=(t*.38+n*.25)%1;ctx.globalAlpha=(1-p)*.22;
            ctx.beginPath();ctx.ellipse(225+Math.sin(n*2),121+p*13,20+p*25,2+p*2,0,0,Math.PI);ctx.stroke();
        }
        ctx.restore();
        ctx.save();ctx.clip(curtain);
        for(let n=0;n<16;n++) {
            const y=52+((t*(36+n%4*4)+n*11)%65);
            ctx.fillStyle=n%3===0?'#f2f9e6':'#b9e7d6';ctx.globalAlpha=.38+n%3*.12;
            ctx.fillRect(201+n*3,Math.floor(y),2,5+n%4*2);
        }
        for(let n=0;n<8;n++){
            const y=51+(t*(44+n%3*6)+n*9)%69;
            ctx.globalAlpha=.12;ctx.fillStyle=n%2?'#f5f8df':'#70b5af';
            ctx.fillRect(203+n*5,Math.round(y),1+n%2,15+n%3*3);
        }
        ctx.restore();
        // Small, fixed budgets: ten spray flecks and six low-opacity mist lobes.
        for(const s of spray) {
            const p=(s.p+t*.6)%1;
            const x=225+s.x*(35+p*35),y=118-Math.sin(p*Math.PI)*(3+s.size*2)+p*4;
            ctx.globalAlpha=(1-p)*.5;ctx.fillStyle='#e1f6df';ctx.fillRect(x|0,y|0,s.size|0,1);
        }
        for(let n=0;n<6;n++) {
            const p=(t*.12+n/6)%1;
            ctx.globalAlpha=Math.sin(p*Math.PI)*.10;ctx.fillStyle='#e2f4d9';
            ctx.beginPath();ctx.ellipse(204+n*7+Math.sin(t*.4+n)*5,117-p*8,12+p*9,3+p*3,0,0,Math.PI*2);ctx.fill();
        }
        for(let n=0;n<2;n++){
            const p=(t*.09+n*.5)%1;ctx.globalAlpha=Math.sin(p*Math.PI)*.055;ctx.fillStyle='#edf4db';
            ctx.beginPath();ctx.ellipse(207+n*29+Math.sin(t*.23+n)*9,106-p*7,17+p*12,2+p*3,0,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=.45;
        // Distant birds have no targets; they are tiny, desaturated silhouettes.
        ctx.strokeStyle='#d2e2c4';ctx.lineWidth=1;
        for(let n=0;n<3;n++) {
            const x=40+(t*4+n*53)%370,y=41+n%2*7+Math.sin(t*.17+n)*.7;
            const wing=Math.sin(t*2+n)*1.2;
            ctx.beginPath();ctx.moveTo(x-2,y-wing);ctx.lineTo(x,y+1);ctx.lineTo(x+2,y-wing);ctx.stroke();
        }
        for(let n=0;n<6;n++) {
            const left=n%2===0,p=(t*.06+n*.27)%1;
            const x=left?9+n*3+p*9:440-n*2-p*9,y=n<4?150+p*53:113+p*14;
            ctx.fillStyle='#b1bd74';ctx.globalAlpha=Math.sin(p*Math.PI)*.45;
            ctx.fillRect(Math.round(x+Math.sin(p*8)*3),Math.round(y),2,1);
        }
        for(const [x,y,phase]of [[25,179,0],[424,169,2]]) {
            const xx=x+Math.sin(t*.9+phase)*3,yy=y+Math.cos(t*.7+phase)*2;
            ctx.globalAlpha=.5;ctx.fillStyle='#b7c8b0';const wing=1+Math.abs(Math.sin(t*5+phase))*2;
            ctx.fillRect(xx-wing,yy,wing,2);ctx.fillRect(xx+1,yy,wing,2);
        }
        ctx.restore();draws++;
    }
    window.ArcheryValley = Object.freeze({
        draw,
        containsWater:(x,y)=>land.isPointInPath(riverWater,x,y)&&land.isPointInPath(wetArea,x,y),
        drawSourceLip:ctx=>{const t=performance.now()/1000;ctx.save();ctx.fillStyle='rgba(224,243,222,.50)';
            ctx.beginPath();ctx.ellipse(225,118,31,2,0,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(241,249,221,.64)';for(let n=0;n<8;n++){
                const x=198+n*7+Math.sin(t*1.5+n)*1.5,y=117+Math.sin(t*2+n*.8)*.7;
                ctx.fillRect(Math.round(x),Math.round(y),3+n%3,1);
            }ctx.restore();},
        diagnostics:()=>({name:'VALE DA CACHOEIRA',canvas:[W,H],camera:'FIXED',cachedTerrain:true,
            waterfall:[196,50,59,70],riverMouth:[0,224,450],dryPlatform:[25,220,400,80],
            animatedElements:127,sourceFoamFlecks:8,waterMotionMask:true,reflections:8,currentStrands:12,rockEddies:6,
            mistLobes:8,distantBirds:3,draws,gameplayObjects:0})
    });
})();
