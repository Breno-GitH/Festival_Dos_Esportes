/* Canvas architecture and readable match UI, specific to the ping-pong arena. */
(function(global){
    'use strict';
    const box=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const text=(c,value,x,y,color='#e5ead9',scale=1,align='left')=>global.PingPongPixelFont.draw(c,value,x,y,{color,scale,align});
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function polygon(c,color,points){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
    function floor(c){
        box(c,'#22343d',-15,-15,480,330);
        // The entire competition floor is timber; there is no colored mat over it.
        box(c,'#8d6645',-15,76,480,240);
        const tones=['#956d49','#9b724c','#906642','#986e48'];
        for(let row=0,y=77;y<316;row++,y+=14){
            box(c,tones[row%tones.length],-15,y,480,13);box(c,'#77573c',-15,y+13,480,1);
            for(let x=-45+(row%3)*31;x<470;x+=94){
                box(c,'#805d40',x,y,1,13);
                box(c,'#906844',x+14,y+5,19,1);box(c,'#a07851',x+52,y+9,15,1);
            }
        }
        // Thin competition markings sit on top of the wood, below table/ball contrast.
        box(c,'#b49b6e',16,82,418,1);box(c,'#b49b6e',10,278,430,1);
        for(let y=83;y<278;y+=7){box(c,'#af9268',15-(y-83)/40,y,1,7);box(c,'#af9268',434+(y-83)/40,y,1,7);}
        for(const x of [24,404]){box(c,'#b0976c',x,104,23,1);box(c,'#b0976c',x,259,23,1);}
        // Broad, restrained light on timber, drawn with hard pixel steps instead of a gradient.
        c.save();c.globalAlpha=.055;box(c,'#ffe0a3',29,87,391,179);c.restore();
    }
    function racket(c,x,y,color,direction){
        box(c,'#142b34',x-5,y-6,10,12);box(c,'#d9caa0',x-5,y-4,10,8);
        box(c,color,x-4,y-5,8,10);box(c,color,x-5,y-3,10,6);box(c,'#8a6648',x-1,y+5,3,6);
        for(let i=0;i<7;i++)box(c,'#ab8b61',x+direction*i,y+8+i,3,2);
        box(c,'#b8b59a',x-2,y-4,2,1);
    }
    function crest(c,x,y){
        polygon(c,'#b39962',[[x-9,y-7],[x+9,y-7],[x+8,y+5],[x,y+10],[x-8,y+5]]);
        polygon(c,'#234d57',[[x-7,y-5],[x+7,y-5],[x+6,y+4],[x,y+8],[x-6,y+4]]);
        polygon(c,'#78977b',[[x-6,y+1],[x-2,y-3],[x+1,y-1],[x+4,y-4],[x+6,y+2]]);
        box(c,'#b8ad7c',x-5,y+2,10,1);box(c,'#6dabb2',x-5,y+4,4,1);box(c,'#6dabb2',x+1,y+5,4,1);
    }
    function architecture(c){
        box(c,'#243942',0,0,450,78);box(c,'#344a50',0,76,450,3);
        for(const x of [4,341]){
            box(c,'#1b303a',x,1,105,71);
            for(const y of [29,50,71]){box(c,'#415357',x,y,105,3);box(c,'#172d36',x+2,y+3,101,4);}
            box(c,'#597475',x,74,105,2);box(c,'#1d3640',x,76,105,3);
        }
        // Physical board frame, suspension rails and brass fasteners.
        for(const x of [122,324]){box(c,'#142a34',x,0,5,56);box(c,'#60787a',x,0,1,56);}
        box(c,'#11232d',112,3,226,47);box(c,'#6b8587',112,3,226,2);
        box(c,'#617a7d',112,5,2,43);box(c,'#344c56',336,5,2,43);box(c,'#091d28',115,6,220,41);
        for(const x of [116,332])for(const y of [7,44])box(c,'#b99b62',x,y,2,2);
        // A tournament trophy plaque between the stands: recognizable paddles, island and pennants.
        box(c,'#112a35',156,53,138,24);box(c,'#8e7c54',157,53,136,1);box(c,'#46544b',158,55,134,20);
        box(c,'#293f42',160,56,130,18);racket(c,249,60,'#8d655f',1);racket(c,273,60,'#587f89',-1);crest(c,190,63);
        for(const x of [166,282]){box(c,'#b49b65',x,61,1,5);box(c,'#b49b65',x-2,63,5,1);}
        for(const [x,color]of [[131,'#467b7a'],[301,'#8b6d59']]){
            box(c,'#a18a5d',x-2,48,20,2);polygon(c,color,[[x,50],[x+15,50],[x+15,70],[x+7,76],[x,70]]);
            box(c,'#b5b18d',x+6,54,3,9);box(c,'#b5b18d',x+3,57,9,2);
        }
        // Front spectators occupy protected galleries outside the shot area.
        for(const x of [144,241]){box(c,'#1a3039',x,278,65,22);box(c,'#496367',x,296,65,2);}
        for(const x of [5,431]){
            box(c,'#21323a',x+4,24,3,54);box(c,'#6c807c',x+4,24,1,54);
            box(c,'#182c35',x-1,20,13,9);box(c,'#c9cfac',x+1,22,9,3);
        }
    }
    function panel(c,x,y,w,h){box(c,'#6d7a6b',x,y,w,h);box(c,'#132c35',x+1,y+1,w-2,h-2);}
    function matchPoint(game){return game.gameState!=='GAMEOVER'&&(game.playerScore===game.maxScore-1||game.opponentScore===game.maxScore-1);}
    function hud(c,game,now){
        c.save();c.imageSmoothingEnabled=false;
        box(c,'#0d2530',119,8,212,32);box(c,'#18313b',189,9,72,29);
        text(c,'ZORP',145,11,'#a5d9ce',1,'center');text(c,'MESTRE',305,11,'#e0bb91',1,'center');
        text(c,String(game.playerScore).padStart(2,'0'),145,23,'#f3eedb',2,'center');
        text(c,String(game.opponentScore).padStart(2,'0'),305,23,'#f3eedb',2,'center');
        text(c,'PING-PONG',225,11,'#b4c6be',1,'center');text(c,'ATE '+game.maxScore,225,28,'#b6a779',1,'center');
        box(c,'#102630',119,40,212,8);
        if(matchPoint(game)){
            const bright=Math.floor(now/500)%2===0;box(c,bright?'#594b32':'#3d3e32',179,40,92,9);
            text(c,'MATCH POINT',225,41,'#e8cf8b',1,'center');
            if(game.playerScore===game.maxScore-1)box(c,'#d5c47f',120,40,13,2);
            if(game.opponentScore===game.maxScore-1)box(c,'#d5c47f',317,40,13,2);
        }
        // Special and live-ball telemetry live in small fixtures at the lower corners.
        panel(c,8,275,133,23);panel(c,309,275,133,23);
        const ratio=clamp(game.power/game.maxPower,0,1),cool=game.globalReturnCooldown>0,ready=ratio>=1&&!cool;
        text(c,cool?'RECARGA':'ESPECIAL',14,279,'#c1cbb9');text(c,'[SPACE]',133,279,ready?'#bfe7c9':'#90a7a4',1,'right');
        box(c,'#365158',14,291,120,3);box(c,ready?'#a2d4b5':cool?'#687f80':'#6ea8ab',14,291,Math.round(120*ratio),3);
        if(ready){c.globalAlpha=Math.floor(now/450)%2?.45:.8;box(c,'#c5dfae',10,290,2,5);box(c,'#c5dfae',136,290,2,5);c.globalAlpha=1;}
        const live=game.balls.filter(b=>b.state!=='MISSED').length;
        text(c,'BOLAS '+String(live).padStart(2,'0'),316,279,'#d8decd');text(c,'MULTIBALL',316,289,'#a8bcb3');
        const prep=game.multiball.phase==='PREPARING_MULTIBALL',active=game.multiball.phase==='MULTIBALL_ACTIVE';
        for(let i=0;i<3;i++)box(c,active||prep&&i<Math.ceil(game.multiball.age/8)?'#dfc187':'#3b565d',418+i*6,290,3,3);
        c.restore();
    }
    function badge(c,label,color='#e6d5a4'){
        const w=global.PingPongPixelFont.measure(label)+18,x=Math.round(225-w/2);
        panel(c,x,51,w,13);text(c,label,225,54,color,1,'center');
    }
    function intro(c,elapsed){
        // Reuses the existing 1.63s countdown; no extra simulation delay is added.
        if(elapsed<.4)return;
        c.save();c.imageSmoothingEnabled=false;
        c.globalAlpha=.22;box(c,'#0a1f2c',0,80,450,195);c.globalAlpha=1;
        if(elapsed<1.35){
            panel(c,108,104,234,89);text(c,'ZORP',225,113,'#a6dbbf',2,'center');text(c,'VS',225,135,'#c5b88e',1,'center');
            text(c,'MESTRE',225,149,'#e2b58a',2,'center');text(c,'DO PING-PONG',225,173,'#c7d0bf',1,'center');
        }else{
            panel(c,162,126,126,38);text(c,'START!',225,135,'#dcebb2',3,'center');
        }
        c.restore();
    }
    function result(c,game){
        if((game.resultTicks||0)<66)return;
        c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.45;box(c,'#10232e',0,80,450,195);c.globalAlpha=1;
        panel(c,91,103,268,100);text(c,game.win?'VITORIA!':'DERROTA',225,113,game.win?'#d8c68b':'#cfb49a',2,'center');
        text(c,game.playerScore+' - '+game.opponentScore,225,139,'#e4ead9',2,'center');
        text(c,game.win?(game.medalAwarded?'INSIGNIA CONQUISTADA':'DESAFIO CONCLUIDO'):'O MESTRE VENCEU',225,163,'#a8c4b4',1,'center');
        if((game.resultTicks||0)>=90)text(c,'[SPACE] VOLTAR',225,187,'#d9dfcb',1,'center');
        c.restore();
    }
    global.PingPongArenaArt=Object.freeze({floor,architecture,hud,badge,intro,result,matchPoint});
})(window);
