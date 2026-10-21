/* Oferta e pagamento preservados; viagem e descanso são somente apresentação Canvas. */
(function (global) {
    'use strict';
    const wallet = global.FestivalWallet;
    const monologue='Acho que vou ficar aqui por mais um tempo... eles não vão se importar hahaha';
    const clamp=n=>Math.max(0,Math.min(1,n));
    const ease=n=>{const p=clamp(n);return p*p*(3-2*p);};
    const route = {
        active:false, state:'IDLE', config:null, elapsed:0, lastTime:0, pose:null,
        scene:'IDLE',sceneTime:0,transitionFrame:null,
        init(config) { this.config = config; },
        hasAllMedals() { return global.MedalCompletion.hasAllMedals(); },
        interact(npc) {
            if (npc.id !== 'capitao') return null;
            if (!this.hasAllMedals()) {
                return wallet.coins < 100 ? npc.msg : '> CAPITÃO: Você já tem as 100 moedas! Mas sua jornada ainda não terminou. Conquiste as oito medalhas e volte para embarcar.';
            }
            if (wallet.pagouCapitao) {
                this.active = true; this.state = 'FERIAS_MERECIDAS'; this.elapsed = 0;
                this.scene='TRANSITION';this.sceneTime=0;this.captureTransition();
                this.lastTime = performance.now(); this.config.clearInput(); this.config.hideUI();
                this.config.enterEnding();
                return '> CAPITÃO: Passagem paga. Hora das suas férias merecidas!';
            }
            if (wallet.coins < 100) return npc.msg;
            this.active = true; this.state = 'OFFER'; this.config.clearInput();
            this.config.offerHint();
            return '> CAPITÃO: Oito medalhas! Você merece férias. Quer pagar 100 moedas para garantir sua viagem no iate?';
        },
        captureTransition(){
            if(!this.transitionFrame){this.transitionFrame=document.createElement('canvas');this.transitionFrame.width=450;this.transitionFrame.height=300;}
            const paint=this.transitionFrame.getContext('2d');paint.clearRect(0,0,450,300);
            // Sem leitura de pixels: também funciona ao abrir o jogo por file://.
            paint.drawImage(document.getElementById('gameCanvas'),0,0,450,300);
        },
        closeOffer(text) {
            this.active = false; this.state = wallet.pagouCapitao ? 'PAID' : 'IDLE';
            this.config.clearInput(); this.config.showMessage(text);
        },
        showEndingCard() {
            if (this.state !== 'FERIAS_MERECIDAS'||this.scene!=='MONOLOGUE') return;
            this.state = 'ENDING_CARD';wallet.completeVacation();this.config.clearInput();
            this.transitionFrame=null;this.scene='ENDING_CARD';this.sceneTime=0;
            global.EndingCard.show({
                id:'ferias_merecidas',theme:'vacation',label:'FINAL SECRETO',title:'FÉRIAS MERECIDAS',
                text:'Depois de conquistar todas as medalhas, Zorpzin decidiu aproveitar a Terra por mais um tempo antes de voltar para casa.',
                portrait:() => this.preparePose(),
                onClose:() => {
                    this.active=false;this.state='COMPLETE';this.scene='COMPLETE';
                    this.config.clearInput();this.config.returnToMenu();
                }
            });
        },
        handleKeyDown(e) {
            if (!this.active) return false;
            if(e.ctrlKey||e.metaKey||e.altKey)return true;
            if (this.state === 'ENDING_CARD') return global.EndingCard.handleKeyDown(e);
            const key = e.key.toLowerCase();
            if (!e.ctrlKey && !e.metaKey && [' ','e','enter','escape','w','a','s','d','arrowup','arrowdown'].includes(key)) e.preventDefault();
            if (e.repeat) return true;
            if (this.state === 'OFFER') {
                if (key === 'escape') this.closeOffer('> CAPITÃO: Sem pressa. Volte quando quiser reservar a viagem.');
                else if (key === ' ' || key === 'e' || key === 'enter') {
                    const result = wallet.payCaptain();
                    this.closeOffer(result === 'paid'
                        ? '> CAPITÃO: Passagem paga! Sua reserva está garantida. Fale comigo novamente quando quiser embarcar. (-100 moedas)'
                        : result === 'already_paid' ? '> CAPITÃO: Sua passagem já está paga. Fale comigo novamente para embarcar.'
                        : result === 'missing_medals'
                            ? '> CAPITÃO: Termine sua jornada e conquiste as oito medalhas antes de embarcar.'
                            : '> CAPITÃO: Você precisa de 100 moedas para reservar a viagem.');
                }
            } else if (this.state === 'FERIAS_MERECIDAS' && this.scene === 'MONOLOGUE' && [' ','e','enter'].includes(key)) {
                this.showEndingCard();
            }
            return true;
        },
        update() {
            const now = performance.now();
            if (this.state === 'FERIAS_MERECIDAS' && !document.hidden){
                const dt=Math.max(0,Math.min(.1,(now-this.lastTime)/1000));this.elapsed+=dt;this.sceneTime+=dt;
                if(this.scene==='TRANSITION'&&this.sceneTime>=.7){this.scene='YACHT_SAIL';this.sceneTime=0;this.transitionFrame=null;}
                else if(this.scene==='YACHT_SAIL'&&this.sceneTime>=7.5){this.captureTransition();this.scene='DECK_REST';this.sceneTime=0;}
                else if(this.scene==='DECK_REST'&&this.sceneTime>=1.65){this.scene='MONOLOGUE';this.sceneTime=0;this.transitionFrame=null;}
            }
            this.lastTime = now;
        },
        wrap(ctx,text,x,y,width,lineHeight) {
            let row = '';
            for (const word of text.split(' ')) {
                const candidate = row ? row+' '+word : word;
                if (row && ctx.measureText(candidate).width > width) { ctx.fillText(row,x,y); y+=lineHeight; row=word; }
                else row=candidate;
            }
            ctx.fillText(row,x,y);
        },
        preparePose() {
            if (this.pose) return this.pose;
            const image = global.FestivalAssets.images.zorpzinFerias;
            if (!image.complete || !image.naturalWidth) return null;
            const [x,y,w,h] = global.VACATION_SPRITE.crop;
            const surface = document.createElement('canvas');surface.width=w;surface.height=h;
            const paint=surface.getContext('2d');paint.drawImage(image,x,y,w,h,0,0,w,h);
            // Máscara offline: nenhuma leitura de pixels, compatível também com file://.
            for (const [row,height,right] of global.VACATION_SPRITE.rightBands) paint.clearRect(right,row,w-right,height);
            this.pose=surface;return surface;
        },
        yachtPosition(){
            const p=this.scene==='YACHT_SAIL'?ease(this.sceneTime/7.5):0;
            return {x:70+280*p,y:187+Math.sin(this.elapsed*1.65)*1.2,angle:Math.sin(this.elapsed*1.3)*.009};
        },
        drawSea(ctx){
            const t=this.elapsed;
            const sky=ctx.createLinearGradient(0,0,0,132);sky.addColorStop(0,'#76c6df');sky.addColorStop(1,'#e1efda');ctx.fillStyle=sky;ctx.fillRect(0,0,450,300);
            const glow=ctx.createRadialGradient(350,57,10,350,57,75);glow.addColorStop(0,'rgba(255,236,163,.55)');glow.addColorStop(1,'rgba(255,236,163,0)');ctx.fillStyle=glow;ctx.fillRect(270,0,170,140);
            ctx.fillStyle='#fff0b6';ctx.beginPath();ctx.arc(350,57,21,0,Math.PI*2);ctx.fill();
            for(let i=0;i<5;i++){const x=((i*133-t*3)%580+580)%580-65,y=42+(i*23)%48;ctx.fillStyle='rgba(247,254,242,.55)';ctx.beginPath();ctx.ellipse(x,y,31,5,0,0,Math.PI*2);ctx.ellipse(x+17,y-4,18,7,0,0,Math.PI*2);ctx.fill();}
            for(let i=0;i<3;i++){const x=((i*213-t*1.5)%650+650)%650-90;ctx.fillStyle=i%2?'#79b5ad':'#85bfb3';ctx.beginPath();ctx.moveTo(x-60,125);ctx.quadraticCurveTo(x-25,105,x,117);ctx.quadraticCurveTo(x+26,110,x+62,125);ctx.closePath();ctx.fill();}
            // Dois pássaros distantes e reflexos dão vida ao horizonte, sem novas entidades.
            ctx.strokeStyle='rgba(36,85,104,.45)';ctx.lineWidth=1;
            for(let i=0;i<2;i++){const x=70+((t*7+i*26)%300),y=77+i*9,w=4+Math.sin(t*1.6+i)*1.2;ctx.beginPath();ctx.moveTo(x-w,y+1);ctx.quadraticCurveTo(x-2,y-2,x,y);ctx.quadraticCurveTo(x+2,y-2,x+w,y+1);ctx.stroke();}
            const sea=ctx.createLinearGradient(0,124,0,300);sea.addColorStop(0,'#5aafc0');sea.addColorStop(.4,'#308fa8');sea.addColorStop(1,'#155c7c');ctx.fillStyle=sea;ctx.fillRect(0,124,450,176);
            ctx.fillStyle='rgba(251,242,188,.13)';for(let i=0;i<13;i++)ctx.fillRect(350-i*2+Math.sin(t+i)*6,130+i*11,12+i*4,1.5);
            for(let i=0;i<60;i++){const depth=(i*37)%166,x=((i*83-t*(12+depth*.13))%510+510)%510-30;ctx.fillStyle=i%4?'rgba(207,247,237,.29)':'rgba(10,75,109,.22)';ctx.fillRect(x,129+depth,9+depth*.16,1+depth*.002);}
            ctx.strokeStyle='rgba(164,227,224,.24)';ctx.lineWidth=1.5;
            for(let j=0;j<3;j++){ctx.beginPath();for(let x=-20;x<=470;x+=10){const y=240+j*25+Math.sin(x*.027+t*.7+j)*3;if(x===-20)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
        },
        drawYacht(ctx,x,y,angle){
            const t=this.elapsed;
            ctx.fillStyle='rgba(10,56,82,.19)';ctx.beginPath();ctx.ellipse(x-4,y+22,88,7,0,0,Math.PI*2);ctx.fill();
            ctx.save();ctx.translate(x,y);ctx.rotate(angle);
            // A esteira sai da popa e fica para trás; não há objetos de partículas acumulados.
            for(let j=0;j<3;j++){ctx.strokeStyle=`rgba(223,252,239,${.4-j*.1})`;ctx.lineWidth=2-j*.4;ctx.beginPath();ctx.moveTo(-82,16+j*3);ctx.quadraticCurveTo(-119,13+j*9,-165-j*9,24+j*7);ctx.stroke();}
            for(let i=0;i<18;i++){const p=(t*.8+i/18)%1;ctx.globalAlpha=(1-p)*.65;ctx.fillStyle='#ddfff3';ctx.fillRect(-84-p*90,15+(i%4)*3+Math.sin(p*7+i)*2,3,1);}ctx.globalAlpha=1;
            ctx.strokeStyle='#678d99';ctx.lineWidth=1.5;ctx.fillStyle='#f1f1df';
            ctx.beginPath();ctx.moveTo(-99,-3);ctx.lineTo(105,-3);ctx.lineTo(88,16);ctx.quadraticCurveTo(1,35,-85,17);ctx.closePath();ctx.fill();ctx.stroke();
            ctx.fillStyle='#254e6c';ctx.beginPath();ctx.moveTo(-89,12);ctx.lineTo(92,9);ctx.lineTo(88,14);ctx.quadraticCurveTo(1,28,-84,17);ctx.closePath();ctx.fill();
            ctx.fillStyle='#c69d68';ctx.fillRect(-87,-8,175,5);ctx.strokeStyle='#fbfff0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-88,-17);ctx.lineTo(90,-17);ctx.stroke();
            for(let i=0;i<10;i++){const rx=-87+i*19;ctx.beginPath();ctx.moveTo(rx,-17);ctx.lineTo(rx,-4);ctx.stroke();}
            ctx.fillStyle='#e4e9dc';ctx.beginPath();ctx.moveTo(-36,-41);ctx.lineTo(34,-41);ctx.lineTo(59,-10);ctx.lineTo(-40,-10);ctx.closePath();ctx.fill();ctx.strokeStyle='#8daeb2';ctx.lineWidth=1;ctx.stroke();
            ctx.fillStyle='#285d78';for(let i=0;i<3;i++)ctx.fillRect(-27+i*24,-34,19,17);ctx.fillStyle='#91c9cf';ctx.fillRect(-24,-32,61,2);
            ctx.fillStyle='#fcf8e6';ctx.fillRect(-40,-44,82,4);ctx.fillRect(-18,-57,48,13);ctx.fillStyle='#356a80';ctx.fillRect(-11,-54,31,7);ctx.fillStyle='#f4efd9';ctx.fillRect(-23,-60,58,3);
            ctx.strokeStyle='#d8eee6';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(5,-60);ctx.lineTo(5,-77);ctx.stroke();ctx.fillStyle='#e9c265';ctx.beginPath();ctx.moveTo(6,-76);ctx.lineTo(22,-72+Math.sin(t*2));ctx.lineTo(6,-66);ctx.fill();
            ctx.fillStyle='#547b85';for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(-48+i*29,7,4,2,0,0,Math.PI*2);ctx.fill();}
            ctx.restore();
        },
        drawSailing(ctx){
            this.drawSea(ctx);const p=this.yachtPosition();this.drawYacht(ctx,p.x,p.y,p.angle);
            ctx.textAlign='center';ctx.font='bold 11px monospace';ctx.fillStyle='#194d62';ctx.fillText('FÉRIAS MERECIDAS',225,32);
            ctx.font='8px monospace';ctx.fillStyle='#356a77';ctx.fillText('UM DESCANSO À ALTURA DA CONQUISTA',225,47);
        },
        drawRest(ctx){
            this.drawSea(ctx);
            // O piso, o guarda-corpo e a cabine estabelecem que a espreguiçadeira está no iate.
            ctx.fillStyle='#c2a175';ctx.fillRect(0,181,450,119);
            ctx.strokeStyle='rgba(108,77,49,.3)';ctx.lineWidth=1;
            for(let i=-2;i<13;i++){const x=i*45;ctx.beginPath();ctx.moveTo(x,181);ctx.lineTo(225+(x-225)*1.45,300);ctx.stroke();}
            for(const y of [203,229,260,294]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(450,y);ctx.stroke();}
            ctx.fillStyle='#b29264';ctx.fillRect(0,181,450,4);ctx.strokeStyle='#f4f8e9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,164);ctx.lineTo(450,164);ctx.moveTo(0,177);ctx.lineTo(450,177);ctx.stroke();
            for(let x=0;x<451;x+=45){ctx.beginPath();ctx.moveTo(x,164);ctx.lineTo(x,192);ctx.stroke();}
            ctx.fillStyle='#eff1df';ctx.beginPath();ctx.moveTo(397,137);ctx.lineTo(450,119);ctx.lineTo(450,193);ctx.lineTo(397,193);ctx.closePath();ctx.fill();ctx.fillStyle='#3e839a';ctx.fillRect(407,143,43,35);ctx.fillStyle='#9bcfd4';ctx.fillRect(410,145,40,3);
            ctx.strokeStyle='#8b7963';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(55,222);ctx.lineTo(55,91);ctx.stroke();ctx.fillStyle='#e9e7ce';ctx.beginPath();ctx.moveTo(-8,118);ctx.quadraticCurveTo(17,85,55,87);ctx.quadraticCurveTo(94,84,118,118);ctx.quadraticCurveTo(88,108,70,118);ctx.quadraticCurveTo(39,108,28,118);ctx.closePath();ctx.fill();
            ctx.fillStyle='#d77768';ctx.beginPath();ctx.moveTo(55,88);ctx.quadraticCurveTo(33,95,28,118);ctx.lineTo(7,116);ctx.quadraticCurveTo(25,91,55,88);ctx.fill();ctx.beginPath();ctx.moveTo(55,88);ctx.quadraticCurveTo(82,94,94,114);ctx.lineTo(71,118);ctx.quadraticCurveTo(66,95,55,88);ctx.fill();
            ctx.strokeStyle='#e7edde';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(352,198);ctx.lineTo(352,221);ctx.moveTo(340,223);ctx.lineTo(365,223);ctx.stroke();ctx.fillStyle='#e6dfc4';ctx.beginPath();ctx.ellipse(352,197,23,6,0,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#f5ca6f';ctx.fillRect(346,183,8,11);ctx.strokeStyle='#d3f3e9';ctx.lineWidth=1;ctx.strokeRect(346.5,182.5,7,11);ctx.strokeStyle='#c96e63';ctx.beginPath();ctx.moveTo(350,185);ctx.lineTo(354,177);ctx.lineTo(359,177);ctx.stroke();
            const bob=Math.sin(this.elapsed*1.4)*.5;ctx.fillStyle='rgba(56,54,43,.18)';ctx.beginPath();ctx.ellipse(225,213+bob,72,4,0,0,Math.PI*2);ctx.fill();
            const pose=this.preparePose();if(pose){ctx.imageSmoothingEnabled=true;ctx.drawImage(pose,143,47+bob,164,164*pose.height/pose.width);}
            ctx.fillStyle='#194d62';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('FÉRIAS MERECIDAS',225,30);
            if(this.scene==='DECK_REST'){ctx.fillStyle='rgba(7,28,43,.78)';ctx.fillRect(115,244,220,24);ctx.font='9px monospace';ctx.fillStyle='#f2e7c8';ctx.fillText('O MUNDO PODE ESPERAR.',225,260);}
            if(this.scene==='MONOLOGUE'){
                ctx.save();ctx.globalAlpha=ease(this.sceneTime/.35);
                ctx.fillStyle='rgba(7,28,43,.96)';ctx.fillRect(18,225,414,62);ctx.strokeStyle='#b8dace';ctx.lineWidth=1;ctx.strokeRect(18.5,225.5,413,61);
                ctx.textAlign='left';ctx.fillStyle='#a4e4ca';ctx.font='bold 8px monospace';ctx.fillText('ZORPZIN NONARIS',29,238);ctx.fillStyle='#f2f1db';ctx.font='10px monospace';this.wrap(ctx,monologue,29,252,386,13);
                ctx.textAlign='right';ctx.fillStyle='#a8c7ce';ctx.font='7px monospace';ctx.fillText('[ESPAÇO / E / ENTER] CONTINUAR',419,280);
                ctx.restore();
            }
        },
        draw(ctx) {
            if (!this.active) return;
            if (this.state === 'ENDING_CARD') { global.EndingCard.draw(ctx); return; }
            ctx.save();ctx.textBaseline='alphabetic';
            if (this.state === 'OFFER') {
                ctx.fillStyle='rgba(4,16,30,.35)';ctx.fillRect(0,0,450,300);
                ctx.fillStyle='#0b2035';ctx.fillRect(25,188,400,99);
                ctx.strokeStyle='#efcf79';ctx.lineWidth=1;ctx.strokeRect(25.5,188.5,399,98);
                ctx.textAlign='left';ctx.font='bold 10px monospace';ctx.fillStyle='#efcf79';ctx.fillText('CAPITÃO · PASSAGEM: 100 MOEDAS',37,206);
                ctx.font='10px monospace';ctx.fillStyle='#ecf5ed';
                this.wrap(ctx,'Oito medalhas! Você merece férias. Quer pagar 100 moedas para garantir sua viagem no iate?',37,224,375,13);
                ctx.font='8px monospace';ctx.fillStyle='#a7c9cb';ctx.fillText('[ESPAÇO / E] CONFIRMAR    [ESC] CANCELAR',37,274);
            } else {
                if(this.scene==='TRANSITION'||this.scene==='YACHT_SAIL')this.drawSailing(ctx);else this.drawRest(ctx);
                const duration=this.scene==='TRANSITION'?.7:.9;
                if(this.transitionFrame&&this.sceneTime<duration){ctx.save();ctx.globalAlpha=1-ease(this.sceneTime/duration);ctx.drawImage(this.transitionFrame,0,0);ctx.restore();}
                ctx.fillStyle='#0a293c';ctx.fillRect(0,0,450,10);ctx.fillRect(0,290,450,10);
            }
            ctx.restore();
        },
        snapshot() { return {active:this.active,state:this.state,pagouCapitao:wallet.pagouCapitao,
            feriasDesbloqueadas:wallet.feriasDesbloqueadas,feriasVistas:wallet.feriasVistas,elapsed:this.elapsed,
            scene:this.scene,sceneTime:this.sceneTime,yacht:this.yachtPosition(),
            waitingForText:this.state==='FERIAS_MERECIDAS'&&this.scene==='MONOLOGUE',
            message:this.scene==='MONOLOGUE'?monologue:null}; }
    };
    global.CaptainRoute = route;
})(window);
