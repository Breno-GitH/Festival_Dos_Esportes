"use strict";

// Overworld scenery only. No arena targets, match state, rewards or save access.
window.ArcheryIsland = (() => {
    const outline = [[52,27],[96,20],[145,27],[184,25],[205,32],[245,32],
        [268,24],[316,20],[355,30],[388,30],[415,49],[426,90],[418,122],
        [426,130],[426,170],[416,182],[425,218],[411,251],[380,266],
        [335,262],[302,274],[251,272],[225,278],[182,268],[142,276],
        [102,267],[65,271],[38,253],[30,219],[36,188],[26,154],[32,120],
        [26,86],[35,52]];
    const stream = [[108,98,9],[114,120,9],[132,146,10],[128,169,10],
        [110,190,9],[98,216,9],[101,243,10],[87,273,11]];
    const bridge = { x:104, y:146, w:52, h:24 };
    const palette = { rim:'#62d7df', foundation:'#14314f', rock:'#536c69',
        grass:'#658957', lightGrass:'#80a160', shadeGrass:'#456e50',
        path:'#bdba8e', pathEdge:'#8f986f', water:'#428f9c', deep:'#326e83',
        foam:'#c8eee1', wood:'#8b6347', woodLight:'#c7a477' };
    // Only footprints are solid: canopies and target faces never make giant PNG boxes.
    const obstacles = Object.freeze([
        {x:62,y:48,w:86,h:47,type:'archery_cliff'},
        {x:178,y:80,w:20,h:8,type:'archery_target'},
        {x:270,y:80,w:20,h:8,type:'archery_target'},
        {x:327,y:92,w:34,h:10,type:'archery_bow_rack'},
        {x:305,y:207,w:26,h:14,type:'archery_equipment'},
        {x:46,y:182,w:12,h:10,type:'archery_tree'},
        {x:382,y:214,w:12,h:10,type:'archery_tree'},
        {x:373,y:62,w:12,h:10,type:'archery_tree'}
    ].map(o => Object.freeze({...o,solid:true,renderByIsland:true})));
    let terrain = null, details = null;

    function polygon(g, points, fill) {
        g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
        g.closePath();if(fill){g.fillStyle=fill;g.fill();}
    }
    function inRect(x,y,r) { return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h; }
    function containsLand(x,y) {
        // The original north/east connections remain the same width and coordinates.
        if((x>=205&&x<=245&&y<=45)||(x>=412&&y>=130&&y<=170))return true;
        let inside=false;
        for(let i=0,j=outline.length-1;i<outline.length;j=i++) {
            const [xi,yi]=outline[i],[xj,yj]=outline[j];
            if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
        }
        return inside;
    }
    function waterAt(x,y) {
        if(inRect(x,y,bridge))return false;
        // Pool at the foot of the cliff, followed by a narrow continuous creek.
        if(((x-108)/18)**2+((y-103)/12)**2<1)return true;
        for(let i=1;i<stream.length;i++) {
            const [ax,ay,ar]=stream[i-1],[bx,by,br]=stream[i];
            const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));
            if(Math.hypot(x-ax-(bx-ax)*t,y-ay-(by-ay)*t)<ar+(br-ar)*t)return true;
        }
        return false;
    }
    function blocks(box) {
        // Shared movement code supplies the existing 20x10 foot rectangle.
        for(const x of [box.x,box.x+box.w/2,box.x+box.w])
            for(const y of [box.y,box.y+box.h/2,box.y+box.h])
                if(!containsLand(x,y)||waterAt(x,y))return true;
        return false;
    }
    function streamPath(g,width,color) {
        g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.lineCap='round';
        g.beginPath();stream.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
    }
    function rock(g,x,y,w=16,h=10) {
        g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+1,y+h-1,w-1,3);
        polygon(g,[[x+3,y],[x+w-4,y-2],[x+w,y+3],[x+w-2,y+h],[x+2,y+h],[x,y+4]],'#405851');
        polygon(g,[[x+3,y],[x+w-4,y-2],[x+w-1,y+3],[x+3,y+5],[x,y+4]],'#8b9d7b');
        g.fillStyle='#637b67';g.fillRect(x+4,y+5,w-7,3);
    }
    function grass(g,x,y) {
        g.fillStyle=palette.shadeGrass;g.fillRect(x,y,2,4);g.fillRect(x+4,y+2,2,3);
        g.fillStyle='#9cb979';g.fillRect(x+2,y-1,2,4);
    }
    function tree(g,x,y,scale=1) {
        g.save();g.translate(x,y);g.scale(scale,scale);
        g.fillStyle='rgba(0,0,0,.22)';g.fillRect(-16,-3,32,7);
        g.fillStyle='#594f39';g.fillRect(-4,-17,8,18);
        g.fillStyle='#a18556';g.fillRect(-2,-15,3,16);
        polygon(g,[[-22,-25],[-20,-37],[-12,-37],[-12,-44],[2,-48],[13,-43],[13,-38],
            [22,-36],[24,-24],[17,-17],[-15,-16]],'#315b45');
        polygon(g,[[-20,-30],[-16,-38],[-8,-38],[-8,-44],[4,-46],[13,-39],
            [20,-34],[18,-27],[8,-25],[4,-21],[-12,-22]],'#527f4c');
        g.fillStyle='#82a95f';g.fillRect(-12,-37,10,3);g.fillRect(2,-40,7,3);g.fillRect(9,-31,8,3);
        g.restore();
    }
    function target(g,x,y) {
        g.fillStyle='rgba(25,42,35,.2)';g.fillRect(x-14,y+1,28,5);
        g.fillStyle='#654f39';g.fillRect(x-9,y-12,4,15);g.fillRect(x+5,y-12,4,15);
        g.fillStyle='#ad8960';g.fillRect(x-11,y-8,22,3);
        // Pixel-stepped circular target, with a fixed arrow embedded in the center.
        polygon(g,[[x-8,y-29],[x+8,y-29],[x+14,y-23],[x+14,y-11],
            [x+8,y-5],[x-8,y-5],[x-14,y-11],[x-14,y-23]],'#3c5145');
        polygon(g,[[x-7,y-27],[x+7,y-27],[x+12,y-22],[x+12,y-12],
            [x+7,y-7],[x-7,y-7],[x-12,y-12],[x-12,y-22]],'#eddfb1');
        g.fillStyle='#b95044';g.fillRect(x-7,y-23,14,13);
        g.fillStyle='#efe8c8';g.fillRect(x-4,y-21,8,9);
        g.fillStyle='#d8b459';g.fillRect(x-2,y-19,4,5);
        g.fillStyle='#403f34';g.fillRect(x,y-18,13,1);
        g.fillStyle='#e9dfb8';g.fillRect(x+11,y-20,3,2);g.fillRect(x+11,y-17,3,2);
    }
    function flag(g,x,y) {
        g.fillStyle='#6a634a';g.fillRect(x,y-28,2,29);
        g.fillStyle='#dbc99c';g.fillRect(x-3,y,8,3);
        polygon(g,[[x+2,y-27],[x+17,y-27],[x+13,y-19],[x+2,y-19]],'#bd5146');
        g.fillStyle='#ede2b7';g.fillRect(x+3,y-27,4,8);
    }
    function buildTerrain(g) {
        // Same footprint, dark foundation, cyan trim and warm festival accents as basketball.
        g.save();g.translate(0,5);polygon(g,outline,'#183b47');g.restore();
        polygon(g,outline,palette.foundation);g.strokeStyle=palette.rim;g.lineWidth=3;g.stroke();
        g.save();polygon(g,outline);g.clip();
        g.fillStyle=palette.grass;g.fillRect(26,27,405,249);
        g.strokeStyle='#365b4b';g.lineWidth=12;polygon(g,outline);g.stroke();
        g.strokeStyle='#88a777';g.lineWidth=3;polygon(g,outline);g.stroke();
        // Broad open turf; planting stays at the edges rather than across the route.
        polygon(g,[[34,49],[144,33],[167,62],[147,134],[63,151],[32,128]],'#70945e');
        polygon(g,[[281,186],[412,183],[417,239],[373,259],[281,254]],'#71915c');
        for(let i=0;i<82;i++) {
            const x=40+(i*71)%370,y=47+(i*43)%210;
            g.fillStyle=i%3?'#72945d':'#587e51';g.fillRect(x,y,3+(i%3),1);
        }
        // Arrival -> host -> mountain. No tiny corridors or extra bridges.
        g.fillStyle=palette.pathEdge;g.fillRect(198,25,54,149);g.fillRect(199,128,238,45);
        g.fillStyle=palette.path;g.fillRect(205,25,40,143);g.fillRect(205,130,232,40);
        polygon(g,[[168,87],[295,87],[301,118],[290,139],[170,139],[160,120]],palette.pathEdge);
        polygon(g,[[173,91],[291,91],[295,118],[286,134],[174,134],[165,119]],'#c8c69a');
        g.fillStyle='#ded7ac';g.fillRect(207,48,3,82);g.fillRect(259,138,147,2);
        // Short loop to the creek bank and equipment area, leaving the lower lawn open.
        g.strokeStyle='#a8ae80';g.lineWidth=24;g.lineCap='round';g.lineJoin='round';
        g.beginPath();g.moveTo(222,154);g.lineTo(158,158);g.lineTo(65,158);g.stroke();
        g.beginPath();g.moveTo(225,163);g.lineTo(225,219);g.lineTo(343,219);g.stroke();
        g.fillStyle='#d3cda0';for(const [x,y]of [[185,158],[165,158],[225,184],[225,201],[258,219],[278,219]])g.fillRect(x-4,y-1,8,2);
        streamPath(g,28,'#4c7058');streamPath(g,24,'#a7b283');
        streamPath(g,19,palette.deep);streamPath(g,13,palette.water);
        g.fillStyle=palette.water;g.beginPath();g.ellipse(108,103,18,12,0,0,Math.PI*2);g.fill();
        // Dry training apron with distance ticks; targets are scenery, never game entities.
        g.fillStyle='#89946a';g.fillRect(167,67,132,26);
        g.fillStyle='#a9ad80';g.fillRect(171,68,124,23);
        g.fillStyle='#dfd5a5';
        for(const x of [175,197,263,285])g.fillRect(x,127,9,2);
        g.restore();
        for(const [x,y]of [[52,39],[178,35],[324,32],[408,111],[414,231],[167,267],[350,258]]) {
            g.fillStyle=palette.foundation;g.fillRect(x-2,y-1,11,5);
            g.fillStyle='#edc66d';g.fillRect(x,y,7,2);
        }
    }
    function buildDetails(g) {
        // Small rock face is present from frame one. Water will be drawn through its gap.
        polygon(g,[[64,88],[69,58],[83,51],[99,54],[106,44],[127,48],[134,58],
            [146,62],[151,87],[136,96],[78,95]],'#3d5b53');
        polygon(g,[[69,58],[83,51],[99,54],[106,44],[127,48],[134,58],[146,62],
            [142,71],[125,68],[99,63],[86,70],[69,70]],'#87987b');
        polygon(g,[[69,73],[89,68],[99,73],[95,88],[79,90],[67,86]],'#5c7966');
        polygon(g,[[126,72],[143,74],[148,87],[132,91],[125,83]],'#67826d');
        g.fillStyle='#8baf72';g.fillRect(76,57,20,3);g.fillRect(115,51,10,3);
        g.fillStyle='#3c604c';g.fillRect(87,72,2,10);g.fillRect(136,77,2,7);
        g.clearRect(99,58,23,42); // Water channel through the cached cliff face.
        // Permanent, broad crossing. The walkway and collision exemption share one rectangle.
        g.fillStyle='rgba(25,43,36,.3)';g.fillRect(bridge.x,bridge.y+3,bridge.w,bridge.h);
        g.fillStyle='#654f3a';g.fillRect(bridge.x,bridge.y,bridge.w,bridge.h);
        for(let x=bridge.x+2;x<bridge.x+bridge.w-1;x+=5) {
            g.fillStyle=palette.woodLight;g.fillRect(x,bridge.y+2,4,bridge.h-4);
            g.fillStyle='#a18459';g.fillRect(x,bridge.y+17,4,2);
        }
        g.fillStyle='#574d39';g.fillRect(bridge.x-1,bridge.y-2,bridge.w+2,3);g.fillRect(bridge.x-1,bridge.y+23,bridge.w+2,3);
        target(g,188,84);target(g,280,84);
        flag(g,158,103);flag(g,307,104);
        // A bow/quiver rack beside the training area, using the same wood values as the bridge.
        g.fillStyle='#604e37';g.fillRect(327,76,4,26);g.fillRect(356,76,4,26);g.fillRect(325,80,37,4);
        for(const x of [335,346]) {
            g.strokeStyle='#b49161';g.lineWidth=2;g.beginPath();g.moveTo(x,66);g.lineTo(x+4,70);g.lineTo(x+6,78);g.lineTo(x+4,86);g.lineTo(x,90);g.stroke();
            g.strokeStyle='#eee2bb';g.lineWidth=1;g.beginPath();g.moveTo(x,66);g.lineTo(x,90);g.stroke();
        }
        g.fillStyle='#765840';g.fillRect(305,207,26,14);g.fillStyle='#b18d5d';g.fillRect(307,209,22,4);
        g.fillStyle='#dcc89a';g.fillRect(310,209,2,11);g.fillRect(324,209,2,11);
        for(const [x,y]of [[311,192],[318,189],[325,194]]) {
            g.fillStyle='#d8d2ac';g.fillRect(x,y,1,18);g.fillStyle='#b95145';g.fillRect(x-2,y,5,3);
        }
        tree(g,52,188,1.05);tree(g,388,220,1);tree(g,379,68,.8);
        for(const [x,y,w,h]of [[57,117,16,9],[87,135,10,7],[152,111,13,8],
            [89,184,12,7],[125,210,13,8],[69,248,16,9],[349,248,20,10],[404,190,11,7]])rock(g,x,y,w,h);
        for(const [x,y]of [[47,100],[77,105],[150,96],[150,119],[151,193],[76,225],
            [124,242],[333,67],[352,115],[369,235],[287,247],[177,237],[52,238]])grass(g,x,y);
        // One perched ordinary bird. No target, flight loop, spawn or gameplay animation.
        g.fillStyle='#e4dfbb';g.fillRect(145,66,6,4);g.fillRect(149,64,4,4);
        g.fillStyle='#40594b';g.fillRect(146,67,4,2);g.fillRect(151,65,1,1);
        g.fillStyle='#d3ac57';g.fillRect(153,66,2,1);
        // Small archery pictogram on the arrival side; no giant extra text panel.
        g.fillStyle='#66523c';g.fillRect(369,183,3,12);g.fillRect(359,175,25,13);
        g.fillStyle='#b79966';g.fillRect(361,177,21,9);
        g.strokeStyle='#efe1b0';g.lineWidth=1;g.beginPath();g.arc(369,181,3,0,Math.PI*2);g.stroke();
        g.fillStyle='#b75042';g.fillRect(368,180,2,2);g.fillStyle='#efe1b0';g.fillRect(373,181,6,1);
    }
    function drawWater(g,time) {
        g.save();polygon(g,outline);g.clip();
        // Only water is animated. Every target, flag, arrow and bird stays fixed.
        g.fillStyle='rgba(191,233,216,.65)';
        for(let i=0;i<17;i++) {
            const f=(i/17+time*.055)%1,segment=f*(stream.length-1),j=Math.min(stream.length-2,Math.floor(segment)),t=segment-j;
            const x=Math.round(stream[j][0]+(stream[j+1][0]-stream[j][0])*t),y=Math.round(stream[j][1]+(stream[j+1][1]-stream[j][1])*t);
            g.fillRect(x-3+(i%3-1)*3,y,5,1);
        }
        g.restore();
        g.fillStyle='#3c7785';g.fillRect(99,59,23,40);
        g.fillStyle='#80bdba';g.fillRect(102,61,17,38);
        g.fillStyle='#c4e3d2';g.fillRect(104,61,4,38);g.fillRect(114,61,3,38);
        g.fillStyle='#e4f1d8';g.fillRect(101,58,20,3);
        for(let i=0;i<6;i++) {
            g.fillStyle=i%2?'#e4f1df':'#a6d5c6';
            g.fillRect(103+(i%4)*4,63+Math.floor((time*24+i*9)%34),2,5);
        }
        g.fillStyle='#d7edda';g.fillRect(97,97,29,3);g.fillRect(94,101,17,2);g.fillRect(113,104,12,2);
    }
    function ensureCache() {
        if(terrain)return;
        terrain=document.createElement('canvas');details=document.createElement('canvas');
        for(const layer of [terrain,details]){layer.width=450;layer.height=300;layer.getContext('2d').imageSmoothingEnabled=false;}
        buildTerrain(terrain.getContext('2d'));buildDetails(details.getContext('2d'));
    }
    function draw(g,time=performance.now()/1000) {
        ensureCache();g.save();g.imageSmoothingEnabled=false;
        g.drawImage(terrain,0,0);drawWater(g,time);g.drawImage(details,0,0);g.restore();
    }
    return Object.freeze({draw,blocks,containsLand,waterAt,obstacles,
        diagnostics:()=>({scene:'ILHA_ARCO',theme:'VALE DA ARQUEARIA',size:[450,300],
            master:[225,118],bridge:{...bridge},targets:2,decorativeBirds:1,
            animated:['waterfall','creek'],gameplayEntities:0,cachedLayers:terrain?2:0,
            obstacleCount:obstacles.length,outline:outline.map(p=>[...p])})});
})();
