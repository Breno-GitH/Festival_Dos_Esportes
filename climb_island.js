"use strict";

// Mountain facade and base camp for ILHA_ESCALADA only. This never runs climbing physics.
window.ClimbIsland = (() => {
    const outline=[[50,24],[109,21],[151,26],[197,23],[244,25],[292,20],[342,26],
        [394,25],[417,46],[425,88],[416,124],[427,164],[420,209],[405,250],
        [379,268],[330,263],[293,273],[247,268],[246,282],[204,282],[202,270],
        [155,273],[109,266],[68,270],[43,250],[31,220],[35,184],[25,145],
        [33,110],[26,81],[37,43]];
    const mountain=[[75,145],[91,128],[102,114],[97,103],[124,90],[135,70],
        [157,66],[174,43],[190,45],[213,22],[223,18],[242,35],[249,50],
        [266,45],[278,65],[295,70],[311,95],[306,103],[329,114],[344,119],
        [355,135],[375,145],[358,152],[321,151],[285,149],[251,154],
        [210,149],[170,153],[132,148],[107,153]];
    const obstacles=Object.freeze([
        {x:50,y:214,w:31,h:14,type:'climb_camp_tent'},
        {x:315,y:216,w:37,h:12,type:'climb_camp_bench'},
        {x:322,y:159,w:28,h:13,type:'climb_equipment'},
        {x:151,y:177,w:11,h:9,type:'climb_trail_sign'},
        {x:47,y:184,w:12,h:9,type:'climb_tree'},
        {x:386,y:211,w:12,h:9,type:'climb_tree'},
        {x:402,y:122,w:10,h:8,type:'climb_tree'}
    ].map(o=>Object.freeze({...o,solid:true,renderByIsland:true})));
    let cached=null,cachedScenery=null;
    function polygon(g,points,fill) {
        g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
        if(fill){g.fillStyle=fill;g.fill();}
    }
    function inside(x,y,points) {
        let yes=false;
        for(let i=0,j=points.length-1;i<points.length;j=i++) {
            const [xi,yi]=points[i],[xj,yj]=points[j];
            if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;
        }
        return yes;
    }
    function containsLand(x,y) {
        if(x>=205&&x<=245&&y>=260)return true; // Existing south bridge to archery.
        return inside(x,y,outline);
    }
    function blocks(box) {
        for(const x of [box.x,box.x+box.w/2,box.x+box.w])
            for(const y of [box.y,box.y+box.h/2,box.y+box.h])
                if(!containsLand(x,y)||inside(x,y,mountain))return true;
        return false;
    }
    function rock(g,x,y,w=15,h=9) {
        g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+1,y+h-1,w-1,3);
        polygon(g,[[x+3,y],[x+w-4,y-2],[x+w,y+3],[x+w-2,y+h],[x+1,y+h],[x,y+4]],'#4e6157');
        polygon(g,[[x+3,y],[x+w-4,y-2],[x+w-1,y+3],[x+4,y+5],[x,y+4]],'#a1aa8b');
        g.fillStyle='#7c8d74';g.fillRect(x+4,y+5,w-7,2);
    }
    function tree(g,x,y,s=1) {
        g.save();g.translate(x,y);g.scale(s,s);
        g.fillStyle='rgba(0,0,0,.22)';g.fillRect(-17,-2,34,7);
        g.fillStyle='#64533c';g.fillRect(-4,-20,8,22);
        g.fillStyle='#a58a58';g.fillRect(-2,-18,3,18);
        // Broad mountain conifer, rather than a tall column competing with the peak.
        polygon(g,[[0,-49],[7,-38],[13,-36],[9,-32],[19,-21],[13,-20],[24,-11],
            [12,-8],[-16,-9],[-22,-13],[-12,-23],[-18,-23],[-7,-36],[-11,-36]],'#315b48');
        polygon(g,[[0,-46],[6,-35],[1,-33],[12,-23],[5,-21],[16,-13],
            [-9,-13],[-16,-15],[-5,-25],[-10,-25],[-2,-36]],'#5c8653');
        g.fillStyle='#8eac65';g.fillRect(-2,-37,5,2);g.fillRect(-8,-26,8,2);g.fillRect(-12,-16,10,2);
        g.restore();
    }
    function grass(g,x,y) {
        g.fillStyle='#426d4e';g.fillRect(x,y,2,4);g.fillRect(x+4,y+1,2,4);
        g.fillStyle='#a4b777';g.fillRect(x+2,y-1,2,4);
    }
    function terrain(g) {
        // The basketball island's footprint, cyan edging and warm guide lights are the reference.
        g.save();g.translate(0,5);polygon(g,outline,'#183b47');g.restore();
        polygon(g,outline,'#14314f');g.strokeStyle='#62d7df';g.lineWidth=3;g.stroke();
        g.save();polygon(g,outline);g.clip();
        g.fillStyle='#6b8958';g.fillRect(25,20,405,265);
        g.strokeStyle='#375b4c';g.lineWidth=12;polygon(g,outline);g.stroke();
        g.strokeStyle='#8da677';g.lineWidth=3;polygon(g,outline);g.stroke();
        // Terraced foothills merge the mountain into the island instead of sitting on a flat lawn.
        polygon(g,[[36,151],[45,112],[78,94],[112,71],[162,53],[254,49],[331,71],
            [392,108],[414,144],[406,169],[354,185],[309,180],[256,191],[195,184],
            [145,191],[96,182],[48,177]],'#7c8e68');
        polygon(g,[[57,135],[78,110],[124,89],[167,70],[251,65],[312,83],[369,111],
            [395,144],[366,162],[320,163],[267,175],[210,165],[151,177],[100,164]],'#919b7b');
        g.fillStyle='#5e7958';g.fillRect(45,173,37,3);g.fillRect(126,189,43,2);g.fillRect(282,187,39,2);
        for(let i=0;i<72;i++) {
            const x=39+(i*67)%367,y=154+(i*41)%105;
            g.fillStyle=i%3?'#78945e':'#587a51';g.fillRect(x,y,3+(i%3),1);
        }
        // A wide, uninterrupted main trail from the original south connection to the host.
        polygon(g,[[196,281],[195,233],[199,195],[196,167],[204,143],[247,143],
            [255,168],[250,196],[256,236],[254,281]],'#8f9675');
        polygon(g,[[205,281],[205,234],[205,194],[205,168],[211,149],[240,149],
            [245,168],[245,195],[245,236],[245,281]],'#c2be94');
        g.strokeStyle='#a6aa7d';g.lineWidth=24;g.lineCap='round';g.lineJoin='round';
        g.beginPath();g.moveTo(224,200);g.lineTo(150,202);g.lineTo(111,223);g.lineTo(91,223);g.stroke();
        g.beginPath();g.moveTo(225,202);g.lineTo(297,202);g.lineTo(365,186);g.stroke();
        g.fillStyle='#dfd5a7';for(const [x,y]of [[214,261],[229,243],[214,224],[229,205],
            [214,185],[269,202],[292,201],[164,203]])g.fillRect(x,y,5,2);
        g.restore();
        for(const [x,y]of [[55,35],[119,31],[329,33],[406,104],[413,193],[350,260],[165,265],[43,229]]) {
            g.fillStyle='#14314f';g.fillRect(x-2,y-1,11,5);g.fillStyle='#f3ca63';g.fillRect(x,y,7,2);
        }
    }
    function mountainFacade(g) {
        g.fillStyle='rgba(33,53,49,.22)';g.beginPath();g.ellipse(226,147,151,13,0,0,Math.PI*2);g.fill();
        polygon(g,mountain,'#64766f');
        polygon(g,[[75,145],[91,128],[102,114],[97,103],[124,90],[135,70],[157,66],
            [174,43],[190,45],[213,22],[223,18],[207,64],[184,94],[176,120],[170,153],
            [132,148],[107,153]],'#778777');
        polygon(g,[[223,18],[242,35],[249,50],[266,45],[278,65],[295,70],
            [311,95],[306,103],[329,114],[344,119],[355,135],[375,145],[358,152],
            [321,151],[285,149],[264,111],[252,89],[245,62]],'#536b70');
        polygon(g,[[223,18],[230,51],[221,75],[239,103],[251,154],[210,149],
            [195,119],[207,91],[199,78],[210,55]],'#a2aa96');
        polygon(g,[[174,43],[183,64],[162,86],[152,113],[132,148],[107,153],
            [124,119],[139,94],[135,70],[157,66]],'#5b7065');
        polygon(g,[[266,45],[264,74],[283,100],[294,123],[321,151],[285,149],
            [264,111],[252,89],[245,62]],'#82969a');
        // Cold upper ridges, warm broken slabs below: different planes describe real volume.
        polygon(g,[[213,22],[223,18],[242,35],[249,50],[234,44],[225,53],[217,39],
            [203,48],[210,34]],'#e5eddb');
        polygon(g,[[223,18],[230,36],[225,53],[217,39],[210,42]],'#f6f3d6');
        polygon(g,[[174,43],[190,45],[183,54],[178,51],[165,59]],'#b9cdc0');
        polygon(g,[[266,45],[278,65],[266,59],[259,66],[260,52]],'#c5d8d0');
        polygon(g,[[97,124],[129,111],[154,120],[146,138],[132,148],[107,153]],'#8d9279');
        polygon(g,[[274,129],[307,122],[342,135],[358,152],[321,151]],'#6a7b6e');
        g.strokeStyle='#425b58';g.lineWidth=2;
        for(const points of [[[157,78],[151,91],[138,99],[133,110]],[[207,64],[199,80],[207,91],[195,113]],
            [[267,78],[276,93],[271,103],[289,117]],[[322,119],[317,127],[328,137]]]) {
            g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
        }
        // Three readable, decorative routes. Every hold is fixed and has no gameplay entity.
        for(const [x,y]of [[112,136],[130,124],[147,109],[153,94],[173,81],
            [205,139],[216,126],[211,112],[224,97],[219,83],
            [321,139],[302,127],[291,115],[275,102],[272,86]]) {
            g.fillStyle='#435b55';g.fillRect(x-1,y+2,8,3);
            g.fillStyle='#b9b895';g.fillRect(x,y,6,3);g.fillStyle='#d1c9a6';g.fillRect(x+1,y,3,1);
        }
        // A little intermediate ledge suggests the real checkpoints without creating one here.
        polygon(g,[[279,99],[302,99],[309,103],[303,108],[278,108],[273,104]],'#435c62');
        g.fillStyle='#bcc3a1';g.fillRect(278,99,24,3);
        g.strokeStyle='#c4aa6d';g.lineWidth=1;g.beginPath();g.moveTo(286,105);g.lineTo(283,119);g.lineTo(286,133);g.stroke();
        g.fillStyle='#e8d9a6';g.fillRect(292,83,1,17);
        // Trail entrance: a few low stones and guide pennants, never a dark tunnel/portal.
        rock(g,180,146,14,9);rock(g,256,145,15,10);
        for(const x of [193,255]) {
            g.fillStyle='#6e6045';g.fillRect(x,133,2,20);
            g.fillStyle='#d3bd7f';g.fillRect(x-2,151,7,2);
            g.fillStyle='#b76048';g.fillRect(x+2,134,9,5);
        }
    }
    function baseCamp(g) {
        // A compact tent and rest area, scaled as props rather than extra buildings.
        g.fillStyle='rgba(32,51,41,.22)';g.fillRect(44,222,44,7);
        polygon(g,[[45,223],[58,197],[72,197],[89,223]],'#465f54');
        polygon(g,[[45,223],[58,197],[66,199],[57,223]],'#b9a66d');
        polygon(g,[[57,223],[66,199],[89,223]],'#e0c58c');
        polygon(g,[[64,222],[69,207],[80,222]],'#44574c');
        g.fillStyle='#7a6648';g.fillRect(45,223,44,3);
        g.fillStyle='#5d4f3b';g.fillRect(315,215,37,7);g.fillRect(319,221,4,7);g.fillRect(344,221,4,7);
        g.fillStyle='#c5a678';g.fillRect(315,215,37,2);
        // Equipment crate, backpack, a coil of rope and two carabiners.
        g.fillStyle='#735b40';g.fillRect(322,159,28,13);g.fillStyle='#baa075';g.fillRect(324,161,24,3);
        g.fillStyle='#d5c18c';g.fillRect(327,160,2,11);g.fillRect(343,160,2,11);
        g.fillStyle='#536a60';g.fillRect(359,211,13,17);g.fillStyle='#91a178';g.fillRect(361,209,9,5);
        g.fillStyle='#c3b77c';g.fillRect(364,216,3,7);
        g.strokeStyle='#d5b775';g.lineWidth=2;g.beginPath();g.ellipse(294,228,10,4,0,0,Math.PI*2);g.stroke();
        g.beginPath();g.ellipse(294,228,5,2,0,0,Math.PI*2);g.stroke();
        g.strokeStyle='#d9e1cb';g.lineWidth=1;g.strokeRect(331,150,4,6);g.strokeRect(340,150,4,6);
        // No life/checkpoint UI: a pictogram only, in the standard warm wood palette.
        g.fillStyle='#6d5b42';g.fillRect(153,165,3,21);g.fillRect(142,157,29,13);
        g.fillStyle='#b59b70';g.fillRect(144,159,25,9);
        polygon(g,[[149,166],[155,160],[160,166]],'#eee7be');
        g.fillStyle='#eee7be';g.fillRect(163,162,4,1);g.fillRect(164,160,1,5);
        tree(g,53,190,.9);tree(g,392,217,1);tree(g,407,128,.7);
        for(const [x,y,w,h]of [[46,179,13,8],[127,239,14,8],[175,246,11,7],[370,243,17,10],
            [398,170,11,8],[302,180,13,8]])rock(g,x,y,w,h);
        for(const [x,y]of [[38,190],[76,247],[144,223],[171,222],[280,246],[345,246],
            [401,237],[401,186],[103,187],[349,192]])grass(g,x,y);
        g.fillStyle='#8fa865';g.fillRect(40,238,12,5);g.fillRect(46,235,9,4);g.fillRect(282,253,16,4);
        // Label is below the scene so it cannot cover the mountain's summit/silhouette.
        g.fillStyle='#14314f';g.fillRect(269,247,133,14);
        g.fillStyle='#f3ca63';g.fillRect(269,247,3,14);
        g.fillStyle='#f8e8aa';g.font='bold 8px monospace';g.textAlign='center';
        g.fillText('BASE DO MONTE ZORP',337,257);
    }
    function ensureCache() {
        if(cached)return;
        cached=document.createElement('canvas');cached.width=450;cached.height=300;
        const g=cached.getContext('2d');g.imageSmoothingEnabled=false;
        terrain(g);
        // Keep ground decals behind the mountain, trees and camp equipment.
        cachedScenery=document.createElement('canvas');cachedScenery.width=450;cachedScenery.height=300;
        const scenery=cachedScenery.getContext('2d');scenery.imageSmoothingEnabled=false;
        mountainFacade(scenery);baseCamp(scenery);
    }
    function draw(g,time=performance.now()/1000,drawGround=null) {
        ensureCache();g.save();g.imageSmoothingEnabled=false;g.drawImage(cached,0,0);
        if(drawGround)drawGround(g);
        g.drawImage(cachedScenery,0,0);
        // One-pixel pennant motion and six small wind/snow flecks near the summit only.
        const flutter=Math.floor(time*3)%2;
        polygon(g,[[293,84],[302,84+flutter],[300,89],[293,89]],'#c77554');
        g.fillStyle='rgba(226,239,225,.7)';
        for(let i=0;i<6;i++) {
            const x=Math.round(179+(i*23+time*7)%102),y=21+(i*13)%35;
            g.fillRect(x,y,i%2?2:1,1);
        }
        g.restore();
    }
    return Object.freeze({draw,blocks,containsLand,obstacles,
        diagnostics:()=>({scene:'ILHA_ESCALADA',theme:'BASE DO MONTE ZORP',size:[450,300],
            master:[225,168],mountain:{baseWidth:300,middleWidth:180,summitWidth:33,
                bounds:[75,18,300,136],outline:mountain.map(p=>[...p])},
            visualRoutes:3,decorativeLedges:1,animated:['pennant','summit-wind'],
            gameplayEntities:0,cachedLayers:cached?2:0,obstacleCount:obstacles.length})});
})();
