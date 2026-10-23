/* One presentation, input gate and transition sequence for all three official endings. */
(function(global){
    'use strict';
    const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
    const timing=Object.freeze({fadeToBlack:.45,blackPause:.25,background:.3,reveal:1.1,inputLock:.7,fadeOut:.8});
    const layout=Object.freeze({width:450,height:300,titleY:35,portrait:Object.freeze({x:139,y:66,width:172,height:156}),textY:236,textWidth:374,lineHeight:11,promptY:280});
    const presets=Object.freeze({
        true_ending:Object.freeze({
            source:'zorp_finalpadrao.png?v=1.1.0_transparent_mission_card',crop:Object.freeze([0,0,1254,1254]),
            title:'DE VOLTA PARA CASA',label:'FINAL PADRÃO',theme:'champion',
            text:'Zorpzin conquistou as oito medalhas da Ilha dos Campeões.\nCom sua missão concluída, chegou a hora de voltar para casa.',
            portraitBox:Object.freeze({x:133,y:58,width:184,height:172}),
            palette:Object.freeze({background:'#08172a',band:'#0b1d32',border:'#30445c',accent:'#e6c47a',ink:'#f4e6ba',text:'#e0e6e8',muted:'#97adc6',mat:'#08172a'})
        }),
        ferias_merecidas:Object.freeze({
            source:'zorp_feriasmerecidas.png?v=1.0.0_official_ending_card',crop:Object.freeze([256,42,1007,1007]),
            title:'FÉRIAS MERECIDAS',label:'FINAL SECRETO',theme:'vacation',
            text:'Depois de tantos desafios, Zorpzin decidiu\nque a Terra ainda tinha algo a oferecer.',
            quote:'Acho que vou ficar aqui por mais um tempo... eles não vão se importar hahaha',
            portraitBox:Object.freeze({x:139,y:57,width:172,height:156}),textY:228,
            palette:Object.freeze({background:'#8bc7da',band:'#f7dfad',border:'#568899',accent:'#fff0b5',ink:'#163b51',text:'#244c5b',muted:'#245a70',mat:'#e7d6a3'})
        }),
        ravok_maior_conquista:Object.freeze({
            source:'card_zorp_MaiorConquista.png?v=1.0.0_official_secret_card',crop:Object.freeze([892,141,179,217]),
            title:'A MAIOR CONQUISTA',label:'FINAL SECRETO',theme:'secret',
            text:'Zorpzin conquistou todas as medalhas da Terra.\nMas, ao lado de Ravok, decidiu buscar algo que nenhuma medalha poderia representar.\nDepois disso, os dois desapareceram no espaço.',
            portraitBox:Object.freeze({x:139,y:57,width:172,height:164}),textY:230,textWidth:252,
            palette:Object.freeze({background:'#06050b',band:'#090710',border:'#282331',accent:'#63313d',ink:'#e1d9e1',text:'#b7adba',muted:'#85758a',mat:'#06050b'})
        })
    });
    const loaded={},held=new Set();
    const assetsReady=Promise.all(Object.entries(presets).map(([id,definition])=>new Promise(resolve=>{
        const entry=loaded[id]={image:new Image(),status:'loading',surface:null,lastDraw:null};
        entry.image.onload=()=>{entry.status='ready';resolve(true);};
        entry.image.onerror=()=>{entry.status='error';console.error('[EndingCard] Não foi possível carregar '+definition.source);resolve(false);};
        entry.image.src=definition.source;
    })));
    function portrait(id){
        const entry=loaded[id];if(!entry||entry.status!=='ready')return null;
        if(!entry.surface){
            const [x,y,w,h]=presets[id].crop;
            entry.surface=document.createElement('canvas');entry.surface.width=w;entry.surface.height=h;
            const g=entry.surface.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(entry.image,x,y,w,h,0,0,w,h);
        }return entry.surface;
    }
    function fit(id,offset=0){
        const def=presets[id];if(!def)return null;
        const [, ,w,h]=def.crop,box=def.portraitBox||layout.portrait,scale=Math.min(box.width/w,box.height/h);
        return {x:box.x+(box.width-w*scale)/2,y:box.y+(box.height-h*scale)/2+offset,width:w*scale,height:h*scale,scale};
    }
    function portraitInfo(id){
        const definition=presets[id],entry=loaded[id];if(!definition)return null;
        return {source:definition.source,sourceRect:[...definition.crop],status:entry.status,cached:!!entry.surface,
            destination:entry.lastDraw?{...entry.lastDraw}:fit(id)};
    }
    const glyphs={
        A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],
        C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],
        E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],
        G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],
        I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],
        K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],
        M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],
        O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],
        Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],
        S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],
        U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],
        W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],
        Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111']
    };
    const titleCache=new Map();
    function titlePixels(text){
        if(titleCache.has(text))return titleCache.get(text);
        const chars=Array.from(text.toUpperCase()),width=(chars.length*6-1)*2,left=Math.round((450-width)/2),pixels=[];
        chars.forEach((char,i)=>{
            const glyph=glyphs[char.normalize('NFD').replace(/[\u0300-\u036f]/g,'')];
            (glyph||[]).forEach((row,y)=>Array.from(row).forEach((bit,x)=>{if(bit==='1')pixels.push([left+i*12+x*2,layout.titleY+y*2]);}));
            if(char==='É')pixels.push([left+i*12+6,layout.titleY-4],[left+i*12+4,layout.titleY-2]);
        });titleCache.set(text,pixels);return pixels;
    }
    function rect(g,color,x,y,w,h){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
    const missionStars=Object.freeze([[47,66],[108,78],[27,198],[100,208],[363,70],[405,143],[373,187],[347,213],[327,82],[396,201],[58,210],[32,91]].map(([x,y],i)=>Object.freeze({x,y,phase:i*1.79})));
    let missionEarth=null,missionShip=null;
    function insideLand(x,y,outline){
        let inside=false;
        for(let i=0,j=outline.length-1;i<outline.length;j=i++){
            const [ax,ay]=outline[i],[bx,by]=outline[j];
            if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
        }return inside;
    }
    function missionArtwork(){
        if(missionEarth)return;
        // Rasterize the planet once at the game's own pixel size, including its stepped limb.
        missionEarth=document.createElement('canvas');missionEarth.width=90;missionEarth.height=90;
        const g=missionEarth.getContext('2d');g.imageSmoothingEnabled=false;
        const continents=[
            [[-.87,-.40],[-.66,-.65],[-.40,-.70],[-.22,-.52],[-.30,-.27],[-.14,-.13],[-.23,.01],[-.40,-.02],[-.47,-.20],[-.67,-.23]],
            [[-.32,.02],[-.13,.08],[.01,.24],[-.06,.47],[-.23,.76],[-.34,.55],[-.36,.31],[-.43,.15]],
            [[-.15,-.83],[.03,-.87],[.11,-.72],[-.07,-.60]],
            [[.06,-.45],[.25,-.68],[.64,-.64],[.88,-.37],[.91,-.12],[.64,.01],[.50,.18],[.35,.10],[.29,-.10],[.09,-.15]],
            [[.13,-.09],[.41,-.09],[.56,.13],[.42,.44],[.22,.50],[.10,.24]],
            [[.65,.43],[.84,.37],[.93,.55],[.83,.69],[.67,.63]]
        ];
        const ocean=['#579eb5','#347fa4','#25628e','#1d4974','#173553'];
        const land=['#89ae88','#6a9d7b','#52866d','#3e6b5d','#30514e'];
        for(let py=0;py<90;py++)for(let px=0;px<90;px++){
            const x=(px-44.5)/42,y=(py-44.5)/42,r2=x*x+y*y;
            if(r2>1){
                if(r2<1.09){g.fillStyle=r2<1.045?'#416983':'#1b334d';g.fillRect(px,py,1,1);}continue;
            }
            const band=Math.max(0,Math.min(4,Math.floor((x+y*.55+1.15)*1.9)));
            const ground=continents.some(outline=>insideLand(x,y,outline));
            let color=(ground?land:ocean)[band];
            if(y<-.84&&Math.abs(x)<.47)color=['#c2d9d8','#b4cccc','#95b6be','#6b93a5','#547889'][band];
            // Short cloud ribbons preserve the continents' silhouettes and the spherical shading.
            const cloud=(y>-.45&&y<-.39&&x>-.75&&x<-.36)||
                (y>-.22&&y<-.16&&x>.22&&x<.76)||
                (y>.27&&y<.33&&x>-.73&&x<-.35)||
                (y>.58&&y<.62&&x>.05&&x<.47);
            if(cloud)color=['#b0cdd0','#9ebec7','#87aab9','#678b9f','#4e708b'][band];
            g.fillStyle=color;g.fillRect(px,py,1,1);
        }
        // Miniature of Zorp's silver saucer: cyan canopy, central hatch and warm navigation lights.
        missionShip=document.createElement('canvas');missionShip.width=38;missionShip.height=26;
        const s=missionShip.getContext('2d');s.imageSmoothingEnabled=false;
        for(const [color,x,y,w,h]of [
            ['#213b54',8,18,3,5],['#213b54',27,18,3,5],['#547c91',5,22,6,1],['#547c91',27,22,6,1],
            ['#263d55',6,12,26,9],['#263d55',2,14,34,5],['#263d55',0,16,38,2],
            ['#789aaa',6,12,26,3],['#789aaa',2,15,34,3],['#a3bdc5',8,12,22,1],
            ['#345b73',9,9,20,5],['#345b73',11,6,16,4],['#345b73',14,4,10,3],
            ['#78c5cb',12,7,14,4],['#78c5cb',15,5,8,2],['#b0d9d4',15,6,3,1],
            ['#487e96',12,10,14,3],['#273d53',15,15,8,7],['#6c8d9b',16,15,6,5],
            ['#b9a67a',7,17,2,1],['#71b8b5',11,17,2,1],['#71b8b5',25,17,2,1],['#b9a67a',29,17,2,1]
        ])rect(s,color,x,y,w,h);
    }
    function missionBackground(g,t){
        missionArtwork();
        g.save();g.imageSmoothingEnabled=false;
        // Both motifs stay in the side gutters, clear of the portrait, title and narrative.
        g.drawImage(missionEarth,35,101);
        const travel=1-Math.exp(-Math.max(0,t)/55),x=340+Math.round(travel*25),y=110-Math.round(travel*21);
        // Sparse, fading engine trace indicates departure without crossing the central card.
        const alpha=g.globalAlpha;
        for(let i=4;i>=1;i--){
            g.globalAlpha=alpha*(.07+(4-i)*.025);
            rect(g,'#79bec9',x+13-i*5,y+27+i*5,4,1);
        }
        g.globalAlpha=alpha*(.42+.08*Math.sin(t*1.2));
        rect(g,'#609fae',x+15,y+23,8,2);rect(g,'#86bdc5',x+17,y+23,4,1);
        g.globalAlpha=alpha;g.drawImage(missionShip,x,y);g.restore();
    }
    const vacationClouds=Object.freeze([{x:51,y:76,phase:0},{x:350,y:59,phase:2.2}].map(Object.freeze));
    const vacationRipples=Object.freeze([[31,157,26],[71,180,22],[98,201,32],[330,159,35],[367,183,29],[321,204,21]].map(Object.freeze));
    const consequenceStars=Object.freeze([[44,75],[27,181],[333,64],[418,153],[359,207]].map(Object.freeze));
    const consequenceChunks=Object.freeze([
        {outline:[[0,0],[43,0],[40,18],[31,27],[35,34],[24,40],[0,34]],dx:-4,dy:-5,phase:0,edge:[[31,27,2,6],[26,35,4,1],[25,37,2,2]]},
        {outline:[[51,0],[90,0],[90,40],[67,38],[61,30],[47,24],[52,17]],dx:6,dy:-4,phase:1.5,edge:[[49,22,2,3],[58,29,3,1],[66,36,4,1]]},
        {outline:[[0,45],[20,48],[29,43],[39,52],[36,69],[43,90],[0,90]],dx:-5,dy:5,phase:3,edge:[[27,46,3,1],[35,51,2,4],[35,64,1,4]]},
        {outline:[[56,45],[70,49],[90,44],[90,90],[51,90],[53,70],[47,59]],dx:5,dy:8,phase:4.5,edge:[[55,46,3,2],[49,58,2,4],[52,69,1,4]]}
    ].map(Object.freeze));
    const consequenceFragments=Object.freeze([
        {x:48,y:94,w:3,h:2,phase:0},{x:119,y:91,w:4,h:2,phase:1.2},
        {x:36,y:201,w:3,h:2,phase:2.4},{x:121,y:200,w:4,h:2,phase:3.6},
        {x:80,y:143,w:4,h:3,phase:4.8},{x:91,y:153,w:2,h:2,phase:6}
    ].map(Object.freeze));
    let consequenceSurfaces=null,consequenceShip=null;
    function consequenceArtwork(){
        if(consequenceSurfaces)return;
        missionArtwork();
        // Use the exact intact Earth map, fractured into pixel masks, to mirror the standard card.
        consequenceSurfaces=consequenceChunks.map(chunk=>{
            const surface=document.createElement('canvas');surface.width=90;surface.height=90;
            const g=surface.getContext('2d');g.imageSmoothingEnabled=false;
            for(let y=0;y<90;y++)for(let x=0;x<90;x++){
                if(insideLand(x+.5,y+.5,chunk.outline))rect(g,'#fff',x,y,1,1);
            }
            g.globalCompositeOperation='source-in';g.drawImage(missionEarth,0,0);
            g.globalCompositeOperation='source-atop';rect(g,'rgba(25,12,33,.50)',0,0,90,90);
            // Faint exposed rock, not an ongoing explosion or a pulse of light.
            for(const [x,y,w,h]of chunk.edge){rect(g,'#63414b',x,y,w,h);rect(g,'#8b5852',x,y,1,1);}
            g.globalCompositeOperation='source-over';return surface;
        });
        // Ravok's familiar stepped scout hull, purple cockpit, red ports and closed central hatch.
        consequenceShip=document.createElement('canvas');consequenceShip.width=64;consequenceShip.height=42;
        const s=consequenceShip.getContext('2d');s.imageSmoothingEnabled=false;
        for(const [color,x,y,w,h]of [
            ['#201f31',13,10,38,21],['#201f31',7,18,50,15],['#201f31',1,24,62,9],['#201f31',7,33,50,4],
            ['#514858',17,10,30,2],['#423c50',12,13,40,14],['#353346',8,21,48,10],
            ['#494253',9,32,46,2],['#65535f',12,32,40,1],
            ['#2a2c3f',2,23,14,7],['#75616d',5,22,11,1],['#2a2c3f',48,23,14,7],['#75616d',48,22,11,1],
            ['#151b29',19,6,26,15],['#74717a',22,5,20,1],['#4c475c',19,7,26,2],
            ['#38283f',21,10,22,8],['#654362',23,10,18,6],['#98627d',24,11,6,1],['#262335',31,9,2,10],
            ['#181924',5,25,6,3],['#a75a75',6,25,4,1],['#181924',53,25,6,3],['#a75a75',54,25,4,1],
            ['#1b1e2d',25,23,15,13],['#6b5b66',26,23,13,1],['#42404f',27,25,11,10],
            ['#292736',31,26,1,9],['#7d958c',35,29,1,1]
        ])rect(s,color,x,y,w,h);
    }
    function consequenceBackground(g,t){
        consequenceArtwork();g.save();g.imageSmoothingEnabled=false;
        const alpha=g.globalAlpha,drift=1-Math.exp(-Math.max(0,t)/80);
        consequenceChunks.forEach((chunk,i)=>{
            const x=35+chunk.dx+Math.round(chunk.dx*drift*.35),y=101+chunk.dy+Math.round(chunk.dy*drift*.35);
            g.drawImage(consequenceSurfaces[i],x,y);
        });
        g.globalAlpha=alpha*.65;
        for(const fragment of consequenceFragments){
            const x=fragment.x+Math.round(Math.sin(t*.035+fragment.phase)*2);
            const y=fragment.y+Math.round(Math.sin(t*.025+fragment.phase));
            rect(g,'#41303e',x,y,fragment.w,fragment.h);rect(g,'#72504d',x,y,1,1);
        }
        const travel=1-Math.exp(-Math.max(0,t)/55);
        const zx=328+Math.round(travel*25),zy=119-Math.round(travel*21);
        const rx=351+Math.round(travel*12),ry=78-Math.round(travel*16);
        g.globalAlpha=alpha*.2;
        for(let i=3;i>=1;i--){
            rect(g,'#5c7c8c',zx+14-i*4,zy+26+i*4,3,1);
            rect(g,'#71506d',rx+29-i*4,ry+38+i*4,4,1);
        }
        g.globalAlpha=alpha*(.30+.035*Math.sin(t*.8));
        rect(g,'#7c526d',rx+26,ry+36,11,2);rect(g,'#5c8391',zx+16,zy+23,6,1);
        g.globalAlpha=alpha*.82;g.drawImage(missionShip,zx,zy);
        g.globalAlpha=alpha;g.drawImage(consequenceShip,rx,ry);g.restore();
    }
    function vacationBackground(g,t){
        // Small stepped color fields keep the tropical postcard simple and pixel aligned.
        for(const [y,h,color]of [[0,38,'#78b6d0'],[38,35,'#8bc7da'],[73,27,'#a6d7df'],[100,16,'#c7dfd5'],[116,14,'#e3dcb4'],[130,14,'#f4cf98']])rect(g,color,0,y,450,h);
        const sun=332;
        for(const [y,w,h]of [[109,20,4],[113,34,5],[118,42,7],[125,46,9],[134,46,10]])rect(g,'#ffe2a2',sun-w/2,y,w,h);
        rect(g,'#f6bb80',sun-23,134,46,10);
        for(const cloud of vacationClouds){
            const x=cloud.x+Math.round(Math.sin(t*.065+cloud.phase)*4);
            rect(g,'#deeee7',x+8,cloud.y-3,19,3);rect(g,'#deeee7',x,cloud.y,38,4);rect(g,'#cce5e1',x+4,cloud.y+4,30,2);
        }
        rect(g,'#6cb7c9',0,144,450,12);rect(g,'#55a8bf',0,156,450,22);
        rect(g,'#489db9',0,178,450,21);rect(g,'#3d94b2',0,199,450,16);
        g.save();g.globalAlpha*=.25;
        for(const [x,y,w]of [[323,150,18],[318,162,27],[315,175,33]])rect(g,'#ffe4b4',x+Math.round(Math.sin(t*.2+y)*2),y,w,1);
        g.restore();
        vacationRipples.forEach(([x,y,w],i)=>rect(g,i%2?'#81c3d0':'#a4d3d6',x+Math.round(Math.sin(t*.55+i)*3),y,w,1));
        // A quiet sand-colored footer separates all reading from the water.
        rect(g,'#edbe8c',0,215,450,4);rect(g,'#f7dfad',0,219,450,81);
    }
    function background(g,id,ambientTime=0){
        const def=presets[id],p=def.palette;
        if(def.theme==='vacation')vacationBackground(g,ambientTime);
        else{
            rect(g,p.background,0,0,450,300);rect(g,p.band,0,208,450,92);
            rect(g,p.background,22,211,406,73);
        }
        if(def.theme==='champion')missionBackground(g,ambientTime);
        else if(def.theme==='secret')consequenceBackground(g,ambientTime);
        // Shared stepped frame; decorative motifs remain behind the portrait and the reading.
        for(const [x,y,w,h] of [[20,12,410,1],[20,287,410,1],[14,18,1,264],[435,18,1,264],[16,15,4,1],[430,15,4,1],[16,284,4,1],[430,284,4,1]])rect(g,p.border,x,y,w,h);
        for(const x of [23,409]){rect(g,p.accent,x,17,18,2);rect(g,p.accent,x,281,18,2);}
        if(def.theme==='champion'){
            // Fixed stars, independent phases: travel atmosphere without extra medals or particles.
            g.save();
            const backgroundAlpha=g.globalAlpha;
            missionStars.forEach((star,i)=>{
                g.globalAlpha=backgroundAlpha*(.3+.28*(1+Math.sin(ambientTime*.9+star.phase))/2);
                rect(g,i%3?p.muted:p.accent,star.x,star.y,1,1);
                if(i===1||i===4){rect(g,p.accent,star.x-1,star.y+1,3,1);rect(g,p.accent,star.x,star.y,1,3);}
            });g.restore();
        }else if(def.theme==='secret'){
            // Quiet aftermath: broken Earth and fleeing ships, never a repeated destruction shot.
            g.save();const backgroundAlpha=g.globalAlpha;
            consequenceStars.forEach(([x,y],i)=>{
                g.globalAlpha=backgroundAlpha*(i===0?.25+.07*Math.sin(ambientTime*.22):.16);
                rect(g,p.muted,x,y,1,1);
            });g.restore();
        }
    }
    function rows(g,text,width=layout.textWidth){
        const result=[];
        for(const paragraph of text.split('\n')){
            let row='';for(const word of paragraph.split(/\s+/)){
                const next=row?row+' '+word:word;
                if(row&&g.measureText(next).width>width){result.push(row);row=word;}else row=next;
            }if(row)result.push(row);
        }return result;
    }
    function render(g,content,t,ready=false,error=null,ambientTime=0){
        const id=content.id,def=presets[id],p=def.palette;
        g.save();g.imageSmoothingEnabled=false;g.textAlign='center';g.textBaseline='alphabetic';background(g,id,ambientTime);
        g.font='7px monospace';g.fillStyle=p.muted;g.fillText('ILHA DOS CAMPEÕES / '+content.label,225,24);
        const image=portrait(id);
        if(image){
            g.save();g.globalAlpha=ease(t/.45);const d=fit(id,Math.round(6*(1-ease(t/.45))));
            g.drawImage(image,d.x,d.y,d.width,d.height);loaded[id].lastDraw=d;g.restore();
        }else{
            g.font='8px monospace';g.fillStyle=p.text;
            g.fillText(loaded[id].status==='error'?'[SPACE] RECARREGAR CARD':'Carregando card oficial...',225,147);
        }
        g.save();g.globalAlpha=ease((t-.3)/.35);
        for(const [x,y]of titlePixels(content.title))rect(g,p.mat,x,y+2,2,2);
        for(const [x,y]of titlePixels(content.title))rect(g,p.ink,x,y,2,2);g.restore();
        g.save();g.globalAlpha=ease((t-.65)/.4);g.font='9px monospace';g.fillStyle=p.text;
        const textRows=rows(g,content.text,def.textWidth||layout.textWidth),textY=def.textY||layout.textY;
        textRows.forEach((row,i)=>g.fillText(row,225,textY+i*layout.lineHeight));
        if(content.quote){
            g.fillStyle=p.ink;const quoteY=textY+textRows.length*layout.lineHeight+4;
            rows(g,'“'+content.quote.replace('... ','...\n')+'”').forEach((row,i)=>g.fillText(row,225,quoteY+i*layout.lineHeight));
        }g.restore();
        if(ready){
            g.font='8px monospace';g.fillStyle=error?p.accent:p.muted;
            g.fillText(error?'[SPACE] TENTAR NOVAMENTE':'[SPACE] CONTINUAR',225,layout.promptY);
            if(error){g.font='7px monospace';g.fillText(error,225,def.theme==='secret'?271:268);}
        }g.restore();return !!image;
    }
    let active=false,content=null,state='INACTIVE',elapsed=0,totalTime=0,last=0,transitionFrame=null,presented=false,error=null,firstPortraitAt=null;
    function show(options){
        if(active||!presets[options.id])return false;
        const def=presets[options.id];content=Object.freeze({...def,...options});
        titlePixels(content.title);const canvas=document.getElementById?.('gameCanvas');transitionFrame=null;
        if(canvas){transitionFrame=document.createElement('canvas');transitionFrame.width=450;transitionFrame.height=300;const g=transitionFrame.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(canvas,0,0);}
        active=true;state='FADE_TO_BLACK';elapsed=0;totalTime=0;presented=false;error=null;firstPortraitAt=null;last=performance.now();return true;
    }
    function update(){
        if(!active)return;
        const now=performance.now(),dt=document.hidden?0:Math.max(0,Math.min(.1,(now-last)/1000));last=now;totalTime+=dt;
        if(state!=='REVEAL'||loaded[content.id].status==='ready')elapsed+=dt;
        const duration={FADE_TO_BLACK:timing.fadeToBlack,BLACK_PAUSE:timing.blackPause,BACKGROUND:timing.background,REVEAL:timing.reveal,FADE_OUT:timing.fadeOut}[state];
        if(duration!==undefined&&elapsed>=duration){
            const next={FADE_TO_BLACK:'BLACK_PAUSE',BLACK_PAUSE:'BACKGROUND',BACKGROUND:'REVEAL',REVEAL:'READY'}[state];
            if(next){state=next;elapsed=0;if(state==='BACKGROUND')transitionFrame=null;}
            else{const close=content.onClose;active=false;state='INACTIVE';content=null;transitionFrame=null;if(typeof close==='function')close();}
        }
    }
    function draw(g){
        if(!active)return;update();if(!active)return;
        g.save();g.imageSmoothingEnabled=false;
        if(state==='FADE_TO_BLACK'){
            rect(g,'#000',0,0,450,300);if(transitionFrame)g.drawImage(transitionFrame,0,0);
            rect(g,'rgba(0,0,0,'+ease(elapsed/timing.fadeToBlack)+')',0,0,450,300);
        }else if(state==='BLACK_PAUSE')rect(g,'#000',0,0,450,300);
        else if(state==='BACKGROUND'){
            rect(g,'#000',0,0,450,300);g.save();g.globalAlpha=ease(elapsed/timing.background);background(g,content.id,totalTime);g.restore();
        }else{
            const t=state==='REVEAL'?elapsed:timing.reveal,visible=render(g,content,t,state==='READY'||state==='FADE_OUT',error,totalTime);
            if(visible&&t>0&&firstPortraitAt===null)firstPortraitAt=totalTime;
            if(state==='READY'&&visible&&totalTime-firstPortraitAt>=timing.inputLock)presented=true;
            if(state==='FADE_OUT')rect(g,'rgba(0,0,0,'+ease(elapsed/timing.fadeOut)+')',0,0,450,300);
        }g.restore();
    }
    function handleKeyDown(e){
        const key=String(e.key).toLowerCase(),wasHeld=held.has(key);held.add(key);if(!active)return false;
        if(e.ctrlKey||e.metaKey||e.altKey)return false;
        e.preventDefault?.();e.stopImmediatePropagation?.();
        if(key!==' '||wasHeld||e.repeat||document.hidden)return true;
        if(state==='REVEAL'&&loaded[content.id].status==='error'){retryAsset(content.id);return true;}
        if(state!=='READY'||!presented||totalTime<timing.inputLock)return true;
        if(content.onContinue?.()===false){error='Não foi possível salvar.';return true;}
        error=null;state='FADE_OUT';elapsed=0;return true;
    }
    function handleKeyUp(e){held.delete(String(e.key).toLowerCase());if(!active)return false;e.preventDefault?.();e.stopImmediatePropagation?.();return true;}
    function retryAsset(id){const entry=loaded[id];if(entry?.status==='error'){entry.status='loading';entry.image.src=presets[id].source;}}
    global.addEventListener?.('keydown',handleKeyDown,true);global.addEventListener?.('keyup',handleKeyUp,true);
    global.addEventListener?.('blur',()=>held.clear());
    document.addEventListener?.('visibilitychange',()=>{last=performance.now();});
    global.EndingCard=Object.freeze({assetsReady,presets,timing,layout,portraitInfo,retryAsset,
        show,update,draw,drawContent:draw,handleKeyDown,handleKeyUp,
        get active(){return active;},get content(){return content;},
        preview(g,id,t=timing.reveal){if(presets[id])return render(g,{id,...presets[id]},t,t>=timing.reveal);return false;},
        snapshot:()=>({active,id:content?.id||null,title:content?.title||null,text:content?.text||null,state,elapsed,totalTime,presented,error,
            titleFont:'LOCAL_BITMAP_5x7',portrait:portraitInfo(content?.id),inputLock:timing.inputLock,fadeOutDuration:timing.fadeOut,layout})
    });
})(window);
