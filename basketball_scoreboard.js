/* Arena-mounted pixel display. Reads the game's score/clock; never runs a clock. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
    if(root)root.BasketballScoreboard=api;
})(typeof globalThis==='object'?globalThis:this,function(){
    'use strict';
    const FONT={
        '0':['01110','10001','10011','10101','11001','10001','01110'],
        '1':['00100','01100','00100','00100','00100','00100','01110'],
        '2':['01110','10001','00001','00010','00100','01000','11111'],
        '3':['11110','00001','00001','01110','00001','00001','11110'],
        '4':['00010','00110','01010','10010','11111','00010','00010'],
        '5':['11111','10000','10000','11110','00001','00001','11110'],
        '6':['01110','10000','10000','11110','10001','10001','01110'],
        '7':['11111','00001','00010','00100','01000','01000','01000'],
        '8':['01110','10001','10001','01110','10001','10001','01110'],
        '9':['01110','10001','10001','01111','00001','00001','01110'],
        A:['01110','10001','10001','11111','10001','10001','10001'],
        B:['11110','10001','10001','11110','10001','10001','11110'],
        C:['01111','10000','10000','10000','10000','10000','01111'],
        D:['11110','10001','10001','10001','10001','10001','11110'],
        E:['11111','10000','10000','11110','10000','10000','11111'],
        F:['11111','10000','10000','11110','10000','10000','10000'],
        G:['01111','10000','10000','10111','10001','10001','01110'],
        H:['10001','10001','10001','11111','10001','10001','10001'],
        I:['11111','00100','00100','00100','00100','00100','11111'],
        J:['00111','00010','00010','00010','10010','10010','01100'],
        K:['10001','10010','10100','11000','10100','10010','10001'],
        L:['10000','10000','10000','10000','10000','10000','11111'],
        M:['10001','11011','10101','10101','10001','10001','10001'],
        N:['10001','11001','10101','10011','10001','10001','10001'],
        O:['01110','10001','10001','10001','10001','10001','01110'],
        P:['11110','10001','10001','11110','10000','10000','10000'],
        Q:['01110','10001','10001','10001','10101','10010','01101'],
        R:['11110','10001','10001','11110','10100','10010','10001'],
        S:['01111','10000','10000','01110','00001','00001','11110'],
        T:['11111','00100','00100','00100','00100','00100','00100'],
        U:['10001','10001','10001','10001','10001','10001','01110'],
        V:['10001','10001','10001','10001','10001','01010','00100'],
        W:['10001','10001','10001','10101','10101','11011','10001'],
        X:['10001','10001','01010','00100','01010','10001','10001'],
        Y:['10001','10001','01010','00100','00100','00100','00100'],
        Z:['11111','00001','00010','00100','01000','10000','11111'],
        '!':['00100','00100','00100','00100','00100','00000','00100'],
        ':':['00000','00100','00100','00000','00100','00100','00000'],
        ' ':['00000','00000','00000','00000','00000','00000','00000']
    };
    // Compile glyph pixels once. Every draw thereafter uses shared integer data.
    const glyphs={};
    for(const [character,rows] of Object.entries(FONT)){
        glyphs[character]=[];
        rows.forEach((row,y)=>{for(let x=0;x<5;x++)if(row[x]==='1')glyphs[character].push([x,y]);});
    }
    function text(ctx,value,cx,y,scale,color){
        const string=String(value).toUpperCase(),left=Math.round(cx-(string.length*6-1)*scale/2);
        ctx.fillStyle=color;
        for(let i=0;i<string.length;i++)for(const [x,dy] of glyphs[string[i]]||glyphs[' '])
            ctx.fillRect(left+(i*6+x)*scale,y+dy*scale,scale,scale);
    }
    const descriptors={RIM:['QUASE!',.8,1],STEAL:['ROUBO!',1.25,2],BLOCK:['TOCO!',1.1,2],
        BASKET:['CESTA!',1.5,3],THREE:['3 PONTOS',1.8,3],SWOOSH:['SWOOSH!',1.9,3],
        COMEBACK:['VIRADA!',2,3],CLUTCH:['CESTA DECISIVA!',2,3],VICTORY:['FIM',Infinity,5]};
    class Scoreboard{
        constructor(){
            this.geometry=[
                ['#10162b',161,0,7,20],['#10162b',282,0,7,20],
                ['#79719a',163,0,2,19],['#79719a',284,0,2,19],
                ['#15172c',137,12,176,5],['#4d4469',140,12,170,2],
                ['#0d1023',126,20,198,65],['#0d1023',132,15,186,75],
                ['#57436d',129,21,192,62],['#897595',134,18,182,2],
                ['#26263f',132,23,186,60],['#080f20',136,25,178,42],
                ['#182f45',138,35,50,28],['#080f20',140,37,46,24],
                ['#253447',197,35,56,28],['#080f20',199,37,52,24],
                ['#413044',262,35,50,28],['#080f20',264,37,46,24],
                ['#171b32',136,69,178,12],['#4f466b',136,82,178,1]
            ];
            this.reset();
        }
        reset(){
            this.time=0;this.message=null;this.consumedEvent=null;
            this.previousZorp=null;this.previousMaster=null;this.previousPhase=null;
            this.previousOvertime=false;this.alertedTen=false;this.pop={zorp:0,master:0};
            this.flash=0;this.flashColor='#869abb';
        }
        notify(label,duration,priority=1,color='#d6e6e4'){
            if(this.message&&this.message.until>this.time&&this.message.priority>priority)return;
            this.message={label,until:this.time+duration,priority,color};
        }
        update(seconds,match,event){
            if(Number.isFinite(seconds)&&seconds>0)this.time+=seconds;
            const dt=Math.max(0,Number.isFinite(seconds)?seconds:0);
            this.pop.zorp=Math.max(0,this.pop.zorp-dt);this.pop.master=Math.max(0,this.pop.master-dt);
            this.flash=Math.max(0,this.flash-dt);
            if(match.score.zorp!==this.previousZorp&&this.previousZorp!==null)this.pop.zorp=.24;
            if(match.score.master!==this.previousMaster&&this.previousMaster!==null)this.pop.master=.24;
            this.previousZorp=match.score.zorp;this.previousMaster=match.score.master;
            if(match.overtime!==this.previousOvertime){
                this.alertedTen=false;this.previousOvertime=match.overtime;
                if(match.overtime)this.notify('PRORROGACAO',1.8,2,'#f1d18a');
            }
            if(match.phase==='PLAYING'&&this.previousPhase==='READY')this.notify('VALENDO!',1,1);
            if(match.phase==='PLAYING'&&match.clock<=10&&!this.alertedTen){this.alertedTen=true;this.notify('ULTIMOS 10',1.4,1,'#f1ce81');}
            if(event&&event!==this.consumedEvent){
                this.consumedEvent=event;const d=descriptors[event.kind];
                if(d){
                    const color=event.side==='zorp'?'#78d4dd':event.side==='master'?'#e4b17a':'#d8daba';
                    this.notify(d[0],d[1],d[2],color);
                    if(['THREE','SWOOSH','CLUTCH','COMEBACK','VICTORY'].includes(event.kind)){
                        this.flash=event.kind==='VICTORY'?1.6:.55;this.flashColor=color;
                    }
                }
            }
            if(match.phase==='RESULT'&&this.previousPhase!=='RESULT')this.notify('FIM',Infinity,5);
            this.previousPhase=match.phase;
            if(this.message&&this.message.until<=this.time)this.message=null;
        }
        snapshot(match){
            const seconds=Math.max(0,Math.ceil(match.clock));
            return {zorp:match.score.zorp,master:match.score.master,clock:match.clock,
                timeText:String(seconds).padStart(2,'0'),
                warning:match.phase==='RESULT'?'FINAL':match.phase==='PLAYING'&&seconds<=5?'FLASH':match.phase==='PLAYING'&&seconds<=10?'PULSE':'NORMAL',
                message:this.message?.label||(match.phase==='READY'?'PRONTO':match.overtime?'PRORROGACAO':'ILHA DOS CAMPEOES'),
                frozen:match.phase==='RESULT'};
        }
        draw(ctx,match){
            const view=this.snapshot(match);
            ctx.save();ctx.imageSmoothingEnabled=false;
            for(const [color,x,y,w,h] of this.geometry){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
            const attention=view.warning==='FLASH'||view.warning==='PULSE';
            // LEDs and frame pulse, never the visibility of the timer digits.
            const pulse=attention&&Math.sin(this.time*(view.warning==='FLASH'?10:4))>0;
            const led=this.flash>0&&Math.sin(this.time*13)>-.3?this.flashColor:pulse?'#dab579':'#526384';
            ctx.fillStyle=led;
            for(let x=140;x<=310;x+=17)ctx.fillRect(x,86,3,1);
            ctx.fillRect(128,28,1,40);ctx.fillRect(321,28,1,40);
            ctx.fillRect(158,92,134,1);
            text(ctx,'ZORP',163,26,1,'#75bac9');text(ctx,'TEMPO',225,26,1,'#b4bece');text(ctx,'MESTRE',287,26,1,'#d6a074');
            const zorp=String(view.zorp).padStart(2,'0'),master=String(view.master).padStart(2,'0');
            const a=zorp.length>4?1:this.pop.zorp>.12&&zorp.length<=2?3:2;
            const b=master.length>4?1:this.pop.master>.12&&master.length<=2?3:2;
            text(ctx,zorp,163,49-Math.floor(7*a/2),a,'#74d8e2');
            text(ctx,master,287,49-Math.floor(7*b/2),b,'#ecb176');
            text(ctx,view.timeText,225,38,3,attention?'#f3d29a':'#e4eac9');
            text(ctx,view.message,225,71,1,this.message?.color||'#8e9bb6');
            ctx.restore();
        }
    }
    return Object.freeze({Scoreboard,text});
});
