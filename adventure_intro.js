/* Abertura narrativa. A nave e a chegada compartilham o mesmo desenho Canvas. */
(function (global) {
    'use strict';
    const SAVE_KEY = 'zorp_festival_story';
    const clamp = n => Math.max(0, Math.min(1, n));
    const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
    const reaction = ['Então essa é a Terra...', 'Meu próximo desafio.'];
    const lines = [
        'Finalmente... Terra.',
        'Ouvi dizer que este planeta leva seus esportes bem a sério.',
        'Perfeito.',
        'Essa deve ser a tal Ilha dos Campeões.',
        'Se eu voltar para casa sem nada para mostrar, nunca vão me deixar esquecer.',
        'Então está decidido.',
        'Vou enfrentar todos os Mestres...',
        '...e conseguir as oito medalhas.',
        'Só depois disso eu volto para casa.'
    ];
    // Falas não possuem duração: somente um novo SPACE encerra cada mensagem.
    const stages = [
        ['SPACE_TRAVEL',3.6],['SEARCH',2],['EARTH_FOUND',1],['REACTION',null],
        ['EARTH_APPROACH',3],['ATMOSPHERE',3],['OCEAN',2],['ISLAND_SCAN',1.4],
        ['ISLAND_ZOOM',3],['DESCENT',2.8],['LANDING',0.8],['DOOR_OPEN',0.9],
        ['EXIT',1.5],['MONOLOGUE',null],['MISSION',3]
    ];
    const islands = [['HUB',0,0],['ILHA_ESQUI',0,-1],['ILHA_PINGPONG',1,0],
        ['ILHA_SURF',1,-1],['ILHA_SKATE',0,1],['ILHA_BASQUETE',1,1],
        ['ILHA_CORRIDA',-1,1],['ILHA_ARCO',-1,0],['ILHA_ESCALADA',-1,-1]];
    // Pools determinísticos e limitados; nada é alocado a cada estrela/partícula por frame.
    const stars = Array.from({length:112},(_,i)=>({x:(i*113.7)%450,y:(i*67.3)%300,z:1+i%3}));
    const story = {
        active: false, state: 'INACTIVE', elapsed: 0, line: 0,
        introSeen: false, allMedalsComplete: false, homeCallSeen: false,
        mastersFarewellStarted: false, mastersFarewellSeen: false, endingSeen: false,
        // Permissão derivada do registro real; uma flag antiga do save não concede medalhas.
        get canStartStandardEnding() { return global.MedalCompletion?.hasAllMedals() === true; },
        lastTime: 0, conversation: false, config: null,
        stageIndex: 0, stageTime: 0, islandImages: null,
        init(config) {
            this.config = config;
            try {
                const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
                this.introSeen = saved?.introSeen === true;
                this.allMedalsComplete = saved?.allMedalsComplete === true;
                this.homeCallSeen = saved?.homeCallSeen === true;
                this.mastersFarewellStarted = saved?.mastersFarewellStarted === true;
                this.mastersFarewellSeen = saved?.mastersFarewellSeen === true;
                this.endingSeen = saved?.endingSeen === true;
                if (this.endingSeen) {
                    this.introSeen = this.homeCallSeen = this.mastersFarewellSeen = true;
                    this.allMedalsComplete = config.medalCount() === 8;
                }
                // A migração não obriga quem já conquistou medalhas a repetir a chegada.
                const legacy = JSON.parse(localStorage.getItem('zorp_esportes_medalhas') || 'null');
                const existingSave = legacy && typeof legacy === 'object' && !Array.isArray(legacy);
                if (!saved && (existingSave || config.medalCount() > 0)) { this.introSeen = true; this.persist(); }
            } catch (_) { this.introSeen = config.medalCount() > 0; }
        },
        persist() {
            try { localStorage.setItem(SAVE_KEY, JSON.stringify({version: 5, introSeen: this.introSeen,
                allMedalsComplete: this.allMedalsComplete, homeCallSeen: this.homeCallSeen,
                mastersFarewellStarted: this.mastersFarewellStarted,
                mastersFarewellSeen: this.mastersFarewellSeen, endingSeen: this.endingSeen})); }
            catch (_) { /* Continua jogável se armazenamento local estiver indisponível. */ }
        },
        start() {
            this.active = true; this.stageIndex = 0; this.state = stages[0][0];
            this.elapsed = 0; this.stageTime = 0; this.line = 0; this.islandImages = null;
            this.conversation = false; this.lastTime = performance.now(); this.config.clearInput();
        },
        nextStage() {
            this.stageIndex++; this.stageTime = 0; this.line = 0;
            if (this.stageIndex < stages.length) { this.state = stages[this.stageIndex][0]; return; }
            // O último cartão já desapareceu; o mesmo frame libera o HUB e grava a chegada.
            this.config.clearInput(); this.config.complete();
            this.active = false; this.state = 'COMPLETE'; this.introSeen = true;
            this.persist(); this.islandImages = null;
        },
        handleKeyDown(e) {
            if (!this.active) return false;
            if (!e.ctrlKey && !e.metaKey && [' ', 'w', 'a', 's', 'd', 'e', 'Enter', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
            if (e.key === ' ' && !e.repeat && ['REACTION','MONOLOGUE'].includes(this.state)) {
                if (++this.line >= (this.state === 'REACTION' ? reaction.length : lines.length)) this.nextStage();
            }
            return true;
        },
        update() {
            const now = performance.now();
            const dt = document.hidden ? 0 : Math.max(0, Math.min(0.05, (now-this.lastTime)/1000));
            this.lastTime = now; this.elapsed += dt; this.stageTime += dt;
            // Espalha as nove capturas durante o sobrevoo, evitando um pico no início do zoom.
            if (this.state === 'OCEAN') {
                if (!this.islandImages) this.islandImages = [];
                if (this.islandImages.length < islands.length) {
                    this.islandImages.push(this.config.captureIsland(islands[this.islandImages.length][0]));
                }
            }
            const duration = stages[this.stageIndex][1];
            if (duration !== null && this.stageTime >= duration) this.nextStage();
        },
        drawShip(ctx, x, y, scale = 1, door = 0, airborne = false, castShadow = true) {
            ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
            if (castShadow) {ctx.fillStyle = 'rgba(7,25,42,.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 45, 10, 0, 0, Math.PI*2); ctx.fill();}
            if (airborne) {
                ctx.fillStyle = 'rgba(105,242,232,.18)'; ctx.beginPath();
                ctx.moveTo(-24,0); ctx.lineTo(-36,28); ctx.lineTo(36,28); ctx.lineTo(24,0); ctx.fill();
            }
            ctx.strokeStyle = '#344c63'; ctx.lineWidth = 4;
            for (const s of [-1,1]) { ctx.beginPath();ctx.moveTo(s*23,-4);ctx.lineTo(s*32,7);ctx.lineTo(s*39,7);ctx.stroke(); }
            ctx.fillStyle = '#253f59'; ctx.strokeStyle = '#91b7c9'; ctx.lineWidth = 2;
            ctx.beginPath();ctx.ellipse(0,-10,43,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.fillStyle = '#93b6c7';ctx.beginPath();ctx.ellipse(0,-15,40,10,0,0,Math.PI*2);ctx.fill();
            const glass = ctx.createLinearGradient(0,-40,0,-15);glass.addColorStop(0,'#8ce5e1');glass.addColorStop(1,'#234a73');
            ctx.fillStyle=glass;ctx.beginPath();ctx.ellipse(0,-22,22,16,0,Math.PI,Math.PI*2);ctx.lineTo(22,-18);ctx.lineTo(-22,-18);ctx.closePath();ctx.fill();
            ctx.strokeStyle='#b5eeee';ctx.lineWidth=1;ctx.stroke();
            for (let i=-2;i<=2;i++) {ctx.fillStyle=i%2?'#f9d17b':'#7bf3da';ctx.fillRect(i*14-2,-10,4,3);}
            ctx.fillStyle='#1b2c42';ctx.fillRect(-9,-12,18,16);
            ctx.fillStyle='#648397';ctx.fillRect(-8,-12,16,16*(1-clamp(door)));
            if (door>0) {ctx.fillStyle='#b4a68b';ctx.beginPath();ctx.moveTo(-9,1);ctx.lineTo(9,1);ctx.lineTo(13,14*door);ctx.lineTo(-13,14*door);ctx.fill();}
            ctx.restore();
        },
        gradient(ctx,top,bottom) {
            const g=ctx.createLinearGradient(0,0,0,300);g.addColorStop(0,top);g.addColorStop(1,bottom);
            ctx.fillStyle=g;ctx.fillRect(0,0,450,300);
        },
        space(ctx,speed=1) {
            this.gradient(ctx,'#030a1b','#172342');
            const glow=ctx.createRadialGradient(100,80,4,100,80,210);
            glow.addColorStop(0,'rgba(65,61,115,.24)');glow.addColorStop(1,'rgba(25,45,70,0)');
            ctx.fillStyle=glow;ctx.fillRect(0,0,450,300);
            for (let i=0;i<stars.length;i++) {
                const s=stars[i],x=((s.x-this.elapsed*s.z*speed*4)%450+450)%450;
                ctx.fillStyle=`rgba(215,236,255,${0.35+0.17*s.z})`;
                ctx.fillRect(x,s.y,s.z===3?1.5:1,s.z===3?1.5:1);
                if (i%23===0) {ctx.fillRect(x-2,s.y+.5,5,.6);ctx.fillRect(x+.5,s.y-2,.6,5);}
                if (speed>3) {ctx.fillStyle='rgba(150,206,251,.22)';ctx.fillRect(x,s.y,speed*s.z,0.7);}
            }
            ctx.fillStyle='#404161';ctx.beginPath();ctx.arc(60,65,13,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#68718b';ctx.lineWidth=2;
            ctx.beginPath();ctx.ellipse(60,65,22,4,-.3,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle='#6f7080';ctx.beginPath();ctx.arc(386,46,4,0,Math.PI*2);ctx.fill();
        },
        earth(ctx,x,y,r) {
            const halo=ctx.createRadialGradient(x,y,r*.94,x,y,r*1.13);
            halo.addColorStop(0,'rgba(107,212,255,.4)');halo.addColorStop(1,'rgba(107,212,255,0)');
            ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*1.13,0,Math.PI*2);ctx.fill();
            ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
            const sea=ctx.createLinearGradient(x-r,y-r,x+r,y+r);
            sea.addColorStop(0,'#61cadb');sea.addColorStop(.5,'#247aa9');sea.addColorStop(1,'#0b2d61');
            ctx.fillStyle=sea;ctx.fillRect(x-r,y-r,r*2,r*2);
            ctx.translate(x,y);ctx.scale(r/90,r/90);ctx.fillStyle='#579c8d';
            ctx.beginPath();ctx.moveTo(-72,-35);ctx.lineTo(-44,-61);ctx.lineTo(-17,-54);
            ctx.lineTo(-22,-29);ctx.lineTo(-5,-8);ctx.lineTo(-25,8);ctx.lineTo(-40,-2);ctx.lineTo(-47,-24);ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(-20,10);ctx.lineTo(4,18);ctx.lineTo(12,35);ctx.lineTo(-8,66);ctx.lineTo(-23,39);ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(20,-56);ctx.lineTo(61,-44);ctx.lineTo(80,-13);ctx.lineTo(53,2);ctx.lineTo(42,29);ctx.lineTo(20,13);ctx.lineTo(31,-10);ctx.lineTo(11,-28);ctx.closePath();ctx.fill();
            ctx.strokeStyle='rgba(235,250,255,.52)';ctx.lineWidth=5;
            for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(-28+i*20,-46+i*33,63,8,-.12,0,Math.PI*1.4);ctx.stroke();}
            ctx.restore();
            const shade=ctx.createLinearGradient(x-r,y-r,x+r,y+r);
            shade.addColorStop(.25,'rgba(0,7,25,0)');shade.addColorStop(1,'rgba(0,7,25,.65)');
            ctx.fillStyle=shade;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
        },
        telemetry(ctx,title,status,confirmed=false) {
            ctx.save();ctx.fillStyle='rgba(4,17,34,.85)';ctx.fillRect(19,28,248,45);
            ctx.fillStyle=confirmed?'#a7f0ba':'#70d4df';ctx.fillRect(19,28,2,45);
            ctx.textAlign='left';ctx.textBaseline='top';ctx.font='8px monospace';ctx.fillText(title,29,37);
            ctx.fillStyle='#edf5ed';ctx.font='9px monospace';ctx.fillText(status,29,53);ctx.restore();
        },
        ocean(ctx,time) {
            this.gradient(ctx,'#4b9fc5','#226f9f');
            ctx.fillStyle='rgba(48,109,112,.35)';ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(80,0);
            ctx.lineTo(124,18);ctx.lineTo(98,37);ctx.lineTo(44,43);ctx.lineTo(0,61);ctx.fill();
            for(let i=0;i<17;i++) {
                const x=(i*83+time*7)%510-30,y=35+(i*53)%265;
                ctx.fillStyle='rgba(170,235,240,.15)';ctx.fillRect(x,y,16+i%5*5,1);
            }
            for(const [x,y,s] of [[70,110,1],[370,65,.65],[340,240,.8]]){
                ctx.fillStyle='#8ab6a2';ctx.beginPath();ctx.ellipse(x,y,22*s,10*s,-.2,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#4f8776';ctx.beginPath();ctx.ellipse(x-2,y-2,17*s,7*s,-.2,0,Math.PI*2);ctx.fill();
            }
        },
        clouds(ctx,time,alpha=1) {
            ctx.save();ctx.globalAlpha*=alpha;
            for(let i=0;i<7;i++) {
                const x=((i*97+time*47)%620)-85,y=(i*63)%350-25;
                ctx.fillStyle='rgba(241,253,255,.55)';ctx.beginPath();ctx.ellipse(x,y,70+i%3*18,13+i%2*6,-.12,0,Math.PI*2);ctx.fill();
            }ctx.restore();
        },
        archipelago(ctx,zoom) {
            if(!this.islandImages || this.islandImages.length<islands.length) {
                this.islandImages=islands.map(([scene])=>this.config.captureIsland(scene));
            }
            ctx.save();ctx.translate(225,150);ctx.scale(zoom,zoom);ctx.translate(-225,-150);
            islands.forEach(([,gx,gy],i)=>ctx.drawImage(this.islandImages[i],gx*450,gy*300));ctx.restore();
        },
        thrust(ctx,x,y,scale,amount=1) {
            ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha*=amount;
            const glow=ctx.createRadialGradient(0,8,1,0,8,35);
            glow.addColorStop(0,'rgba(142,255,233,.5)');glow.addColorStop(1,'rgba(87,234,237,0)');
            ctx.fillStyle=glow;ctx.fillRect(-36,-24,72,72);
            for(let i=0;i<20;i++) {
                const a=i*2.4,p=(this.elapsed*1.5+i/20)%1;
                ctx.fillStyle=`rgba(170,246,222,${(1-p)*.65})`;
                ctx.fillRect(Math.cos(a)*p*44,7+p*20+Math.sin(a)*p*7,2,1);
            }ctx.restore();
        },
        draw(ctx) {
            const t=this.stageTime, state=this.state, idx=this.stageIndex;
            const duration=stages[idx]?.[1], p=duration ? ease(t/duration) : 1;
            ctx.save();ctx.textBaseline='alphabetic';
            if(idx<=4) {
                this.space(ctx,state==='EARTH_APPROACH'?1+10*p:1);
                if(state!=='SPACE_TRAVEL') {
                    const r=state==='SEARCH'?8+26*p:state==='EARTH_APPROACH'?34+330*p:34;
                    const x=state==='EARTH_APPROACH'?346-121*p:346;
                    this.earth(ctx,x,134,r);
                    if(state==='EARTH_FOUND'||state==='REACTION') {
                        ctx.strokeStyle=`rgba(120,244,219,${.5+.25*Math.sin(this.elapsed*3)})`;ctx.lineWidth=1;
                        ctx.strokeRect(300,88,92,92);ctx.font='8px monospace';ctx.fillStyle='#a7f0ba';ctx.textAlign='center';ctx.fillText('TERRA',346,194);
                    }
                }
                const sx=state==='SPACE_TRAVEL'?65+110*p:state==='EARTH_APPROACH'?175+57*p:175;
                const sy=state==='EARTH_APPROACH'?183-35*p:183+Math.sin(this.elapsed*1.3)*2;
                const ss=state==='EARTH_APPROACH'?.72*(1-.72*p):.72;
                this.thrust(ctx,sx,sy,ss,.45);this.drawShip(ctx,sx,sy,ss,0,false,false);
                if(state==='SPACE_TRAVEL'||state==='SEARCH') this.telemetry(ctx,'DESTINO: TERRA','STATUS: PROCURANDO'+'.'.repeat(1+Math.floor(this.elapsed*2)%3));
                else this.telemetry(ctx,'ALVO LOCALIZADO','TERRA · ROTA CONFIRMADA',true);
                if(state==='EARTH_APPROACH') {
                    ctx.fillStyle=`rgba(97,186,221,${ease((p-.65)/.35)})`;ctx.fillRect(0,0,450,300);
                }
            } else if(state==='ATMOSPHERE') {
                this.gradient(ctx,'#61badd','#5ba6c7');this.ocean(ctx,t);
                ctx.fillStyle=`rgba(97,186,221,${1-p})`;ctx.fillRect(0,0,450,300);
                this.clouds(ctx,t,Math.sin(Math.PI*p)*.8+p*.3);
                const sx=225+Math.sin(t*32)*1.2,sy=112+Math.sin(t*25)*.7;
                this.thrust(ctx,sx,sy,.42,.6);
                ctx.strokeStyle=`rgba(255,197,141,${Math.sin(Math.PI*p)*.5})`;ctx.lineWidth=2;
                ctx.beginPath();ctx.ellipse(sx,sy-5,26,11,0,0,Math.PI);ctx.stroke();
                this.drawShip(ctx,sx,sy,.42,0,false,false);
                for(let i=0;i<13;i++) {const y=(i*29+t*150)%330-15;ctx.fillStyle='rgba(228,248,255,.35)';ctx.fillRect((i*79)%450,y,1,7);}
            } else if(state==='OCEAN') {
                this.ocean(ctx,t);this.clouds(ctx,t+3,.3*(1-p));
                this.drawShip(ctx,225+55*p,112-52*p,.42-.34*p,0,false,false);
            } else if(state==='ISLAND_SCAN'||state==='ISLAND_ZOOM') {
                this.ocean(ctx,t+5);
                ctx.save();if(state==='ISLAND_SCAN')ctx.globalAlpha=ease(t/.9);
                this.archipelago(ctx,state==='ISLAND_ZOOM'?.3+.7*p:.3);ctx.restore();
                if(state==='ISLAND_SCAN') {
                    ctx.strokeStyle='#b6f4dc';ctx.lineWidth=1;ctx.strokeRect(206,133,38,33);
                    this.telemetry(ctx,'ILHA DOS CAMPEÕES','LOCAL DE COMPETIÇÃO DETECTADO',true);
                    this.drawShip(ctx,280,60,.08,0,false,false);
                } else {
                    if(p<.5) {ctx.save();ctx.globalAlpha=1-p*2;this.telemetry(ctx,'ILHA DOS CAMPEÕES','DESTINO CONFIRMADO',true);ctx.restore();}
                    this.drawShip(ctx,280-55*p,60,.08+.64*p,0,false,false);
                }
            } else {
                // Ao fim do zoom a matriz é identidade. A descida já usa o HUB verdadeiro.
                if(state==='DESCENT') {
                    // Os NPCs surgem na aproximação sem substituir o cenário capturado por um corte.
                    ctx.drawImage(this.islandImages[0],0,0);
                    ctx.save();ctx.globalAlpha=ease(t/.5);this.config.drawHub();ctx.restore();
                } else this.config.drawHub();
                if(state==='LANDING')ctx.translate(Math.sin(t*43)*(1-p)*.8,Math.sin(t*32)*(1-p)*.5);
                const descent=state==='DESCENT'?p:1;
                ctx.fillStyle=`rgba(7,25,42,${.08+.22*descent})`;ctx.beginPath();ctx.ellipse(225,154,15+30*descent,4+6*descent,0,0,Math.PI*2);ctx.fill();
                const door=state==='DOOR_OPEN'?p:state==='EXIT'?1-.7*ease((p-.7)/.3):idx>12?.3:0;
                if(state==='DESCENT'||state==='LANDING')this.thrust(ctx,225,60+90*descent,.72+.28*descent,state==='LANDING'?1-p:.75);
                this.drawShip(ctx,225,60+90*descent,.72+.28*descent,door,false,false);
                if(state==='LANDING') {
                    ctx.strokeStyle=`rgba(196,229,194,${(1-p)*.6})`;ctx.lineWidth=2;
                    ctx.beginPath();ctx.ellipse(225,155,42+p*24,9+p*7,0,0,Math.PI*2);ctx.stroke();
                }
                // Mesma ordem por profundidade do gameplay: NPCs à frente cobrem a nave.
                ctx.save();if(state==='DESCENT')ctx.globalAlpha=ease(t/.5);
                this.config.drawHubForeground();ctx.restore();
                if(idx>=12) {
                    ctx.save();if(state==='EXIT')ctx.globalAlpha=ease(t/.45);
                    this.config.drawActor(225,state==='EXIT'?158+36*p:194,state==='EXIT'&&p<1);ctx.restore();
                    if(state==='EXIT'||(state==='MONOLOGUE'&&t<2)) {
                        ctx.save();ctx.globalAlpha=state==='EXIT'?ease(t/.7):1-ease(t/2);
                        ctx.fillStyle='rgba(6,21,35,.88)';ctx.fillRect(154,202,142,15);
                        ctx.fillStyle='#b8f2d1';ctx.textAlign='center';ctx.font='8px monospace';ctx.fillText('ZORPZIN NONARIS',225,212);ctx.restore();
                    }
                }
                if(state==='MISSION') {
                    ctx.save();ctx.globalAlpha=ease(t/.4)*(1-ease((t-2)/.8));
                    ctx.fillStyle='rgba(6,21,35,.94)';ctx.fillRect(74,230,302,44);
                    ctx.fillStyle='#b8f2d1';ctx.textAlign='center';ctx.font='8px monospace';ctx.fillText('MISSÃO',225,244);
                    ctx.fillStyle='#eef1dc';ctx.font='bold 11px monospace';ctx.fillText('CONQUISTE AS 8 MEDALHAS',225,262);ctx.restore();
                }
            }
            const bars=state==='MISSION'?1-ease(t/.8):1;
            ctx.fillStyle=`rgba(4,13,28,${bars})`;ctx.fillRect(0,0,450,12);ctx.fillRect(0,288,450,12);
            if(this.elapsed<.65) {ctx.fillStyle=`rgba(3,10,27,${1-ease(this.elapsed/.65)})`;ctx.fillRect(0,0,450,300);}
            if(state==='REACTION'||state==='MONOLOGUE')this.drawMonologue(ctx);
            ctx.restore();
        },
        drawMonologue(ctx) {
            ctx.fillStyle='rgba(6,20,36,.96)';ctx.fillRect(18,220,414,67);
            ctx.strokeStyle='#7accca';ctx.lineWidth=1;ctx.strokeRect(18.5,220.5,413,66);
            ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#a2f0bd';ctx.font='bold 9px monospace';
            ctx.fillText('ZORPZIN NONARIS',29,229);
            ctx.fillStyle='#eef4ec';ctx.font='10px monospace';
            let row='',y=245;
            const text=(this.state==='REACTION'?reaction:lines)[this.line];
            for(const word of text.split(' ')) {
                const candidate=row?row+' '+word:word;
                if(ctx.measureText(candidate).width>388 && row) {ctx.fillText(row,29,y);y+=13;row=word;} else row=candidate;
            }
            ctx.fillText(row,29,y);ctx.font='8px monospace';ctx.fillStyle='#a7bac6';
            ctx.textAlign='right';ctx.fillText('[SPACE] CONTINUAR',419,275);
        },
        drawParked(ctx, door = 0.3) { this.drawShip(ctx,225,150,1,door,false); },
        collides(x,y) {
            return this.introSeen && x+10>184 && x-10<266 && y+2>129 && y-8<158;
        },
        updateShipInteraction(pressed, npcNearby, shipPressed = false) {
            const c=this.config, near=Math.hypot(c.player.x-225,(c.player.y-157)*0.8)<57;
            if(!near || npcNearby) {this.conversation=false;return;}
            if (global.MastersFarewell?.offerBoarding(shipPressed)) return;
            if(pressed) this.conversation=!this.conversation;
            const count=c.medalCount();
            const thought=count<4?'Ainda preciso conquistar as oito medalhas antes de voltar para casa.'
                :count<8?'Falta pouco. Preciso das oito medalhas antes de voltar para casa.':'Oito medalhas. Que aventura para contar!';
            c.dialogText.textContent=this.conversation
                ? `ZORPZIN NONARIS: ${thought} — Medalhas: ${count} / 8`
                : `NAVE · Medalhas: ${count} / 8 · [E] EXAMINAR`;
            c.dialogBox.classList.add('show');
        },
        snapshot() {return {active:this.active,state:this.state,introSeen:this.introSeen,line:this.line,
            elapsed:this.elapsed,stageTime:this.stageTime,controlEnabled:!this.active,
            canStartStandardEnding:this.canStartStandardEnding,mastersFarewellStarted:this.mastersFarewellStarted,
            message:(this.state==='REACTION'?reaction:this.state==='MONOLOGUE'?lines:[])[this.line]||null,
            automaticDuration:stages.reduce((sum,s)=>sum+(s[1]||0),0),ship:{x:225,y:150}};}
    };
    global.AdventureIntro=story;
})(window);
