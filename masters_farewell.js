/* Despedida: referências aos oito NPCs oficiais, sem adicionar cópias ao cadastro. */
(function (global) {
    'use strict';
    const seats = [
        {scene:'ILHA_PINGPONG',x:100,y:120,name:'MESTRE DO PING-PONG',text:'Foi divertido, garoto. Continue treinando esse reflexo.'},
        {scene:'ILHA_BASQUETE',x:150,y:112,name:'MESTRE DO BASQUETE',text:'Você aprendeu rápido. Leve essa confiança para a próxima quadra.'},
        {scene:'ILHA_CORRIDA',x:310,y:112,name:'MESTRE DA CORRIDA',text:'A chegada de hoje é só a largada de amanhã.'},
        {scene:'ILHA_SKATE',x:350,y:120,name:'MESTRE DO SKATE',text:'Você caiu, levantou e continuou. É assim que se anda.'},
        {scene:'ILHA_ARCO',x:100,y:194,name:'MESTRE DO ARCO',text:'Mira firme, Zorpzin. Mesmo entre as estrelas.'},
        {scene:'ILHA_ESCALADA',x:150,y:210,name:'MESTRE DA ESCALADA',text:'Sempre existe outra montanha. Você já sabe como começar.'},
        {scene:'ILHA_ESQUI',x:300,y:210,name:'MESTRE DO BOXE',text:'Força não é só bater. Você aprendeu isso.'},
        {scene:'ILHA_SURF',x:350,y:194,name:'MESTRE DO SURF',text:'Não lute contra cada onda. Aprenda a seguir o movimento.'}
    ];
    const reply = ['Eu vim até aqui procurando medalhas...', '...mas vou levar muito mais que isso.', 'Obrigado, pessoal.'];
    const farewell = {
        active:false, state:'IDLE', line:0, selected:1, config:null, masters:[], path:[],
        lastTime:0, stateSince:0,
        init(config) {
            this.config=config;
            this.masters=seats.map(seat=>({...seat,npc:config.npcs.find(n=>n.scene===seat.scene&&n.isMaster)}));
            if(this.masters.some(m=>!m.npc)||new Set(this.masters.map(m=>m.npc)).size!==8) {
                throw new Error('A despedida precisa dos oito Mestres oficiais, sem repetições.');
            }
        },
        eligible() {
            return AdventureIntro.canStartStandardEnding;
        },
        gathered(scene) {
            return scene==='HUB' && this.eligible() && AdventureIntro.mastersFarewellStarted;
        },
        displayScene(scene) {return scene==='FINAL_CUTSCENE'?'HUB':scene;},
        setState(state) {this.state=state;this.stateSince=performance.now();},
        begin() {
            if (!this.eligible() || !AdventureIntro.mastersFarewellStarted) return false;
            this.active=true;this.line=0;this.setState('MASTERS_FAREWELL');
            this.config.clearInput();this.config.hideUI();this.lastTime=performance.now();
            this.planApproach();
            return true;
        },
        // Caminho curto no próprio HUB. Consulta as mesmas colisões usadas ao andar.
        planApproach() {
            const p=this.config.player, cols=91, start=Math.round(p.y/5)*cols+Math.round(p.x/5), goal=39*cols+45;
            if(Math.hypot(p.x-225,p.y-195)<3){this.path=[];this.config.face(0,0);return;}
            const queue=[start],previous=new Map([[start,null]]);let cursor=0;
            const free=(x,y)=>x>=20&&x<=430&&y>=15&&y<=275&&!this.config.blocked(x,y);
            while(cursor<queue.length&&!previous.has(goal)) {
                const node=queue[cursor++],x=(node%cols)*5,y=Math.floor(node/cols)*5;
                for(const [dx,dy] of [[0,5],[5,0],[-5,0],[0,-5],[5,5],[-5,5],[5,-5],[-5,-5]]) {
                    const nx=x+dx,ny=y+dy,next=(ny/5)*cols+nx/5;
                    if(previous.has(next)||!free(nx,ny)||(dx&&dy&&(!free(x+dx,y)||!free(x,y+dy))))continue;
                    previous.set(next,node);queue.push(next);
                }
            }
            this.path=[];
            if(previous.has(goal)) {
                let node=goal;
                while(node!==start){this.path.push({x:(node%cols)*5,y:Math.floor(node/cols)*5});node=previous.get(node);}
                this.path.reverse();
            }
        },
        walk(dt) {
            let distance=110*dt;
            while(this.path.length&&distance>0) {
                const p=this.config.player,target=this.path[0],dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
                if(d<.01){this.path.shift();continue;}
                const step=Math.min(d,distance);p.x+=dx/d*step;p.y+=dy/d*step;distance-=step;
                this.config.face(dx,dy,performance.now());
                if(step===d)this.path.shift();
            }
            if(!this.path.length)this.config.face(0,0);
        },
        update(scene) {
            if(!this.active) {
                // Só retoma uma sequência que já foi solicitada com E na nave.
                if(scene==='HUB'&&this.eligible()&&AdventureIntro.mastersFarewellStarted&&
                    AdventureIntro.homeCallSeen&&!MedalCompletion.active) {
                    if (!AdventureIntro.mastersFarewellSeen) return this.begin();
                    if (this.state==='WAITING_HOME_CALL') { this.openBoarding(); return true; }
                }
                return false;
            }
            const now=performance.now(),dt=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;
            this.walk(dt);return true;
        },
        openBoarding() {
            this.active=true;this.selected=1;this.setState('BOARDING_PROMPT');
            this.lastTime=performance.now();this.config.clearInput();this.config.hideUI();
            this.planApproach();
        },
        resume() {
            this.active=false;this.path=[];this.setState('COMPLETE');
            this.config.resume();this.config.clearInput();this.config.showUI();
        },
        handleKeyDown(e) {
            if(!this.active)return false;
            const k=e.key.toLowerCase();
            if(e.ctrlKey||e.metaKey||e.altKey)return true;
            if(!e.ctrlKey&&!e.metaKey&&[' ','w','a','s','d','e','enter','arrowleft','arrowright','arrowup','arrowdown'].includes(k))e.preventDefault();
            if(e.repeat)return true;
            const advance=k===' '||k==='e'||k==='enter';
            if(this.state==='MASTERS_FAREWELL'&&advance) {
                if(++this.line===seats.length+reply.length) {
                    AdventureIntro.mastersFarewellSeen=true;AdventureIntro.persist();this.openBoarding();
                }
            } else if(this.state==='BOARDING_PROMPT') {
                if(['a','w','arrowleft','arrowup'].includes(k))this.selected=0;
                if(['d','s','arrowright','arrowdown'].includes(k))this.selected=1;
                if(advance&&!this.path.length) {
                    if(this.selected===1)this.resume();
                    else {
                        if (this.config.enterFinal()) {
                            this.active=false;this.path=[];this.setState('COMPLETE');
                        }
                    }
                }
            }
            return true;
        },
        offerBoarding(shipPressed) {
            if(!this.eligible())return false;
            this.config.dialogText.textContent=AdventureIntro.endingSeen?'NAVE · [E] REVER FINAL'
                :AdventureIntro.mastersFarewellSeen?'NAVE · [E] ENTRAR NA NAVE':'NAVE · [E] INICIAR DESPEDIDA';
            this.config.dialogBox.classList.add('show');
            if(shipPressed) {
                AdventureIntro.mastersFarewellStarted=true;AdventureIntro.persist();
                if (!AdventureIntro.homeCallSeen) {
                    this.setState('WAITING_HOME_CALL');MedalCompletion.begin();
                } else if (!AdventureIntro.mastersFarewellSeen) this.begin();
                else this.openBoarding();
            }
            return true;
        },
        collides(x,y) {
            if(!this.gathered('HUB'))return false;
            return this.masters.some(m=>x+10>m.x-9&&x-10<m.x+9&&y+2>m.y-6&&y-8<m.y+2);
        },
        actors(scene) {
            if(!this.gathered(scene))return [];
            return this.masters.map((m,index)=>({y:m.y,draw:()=>this.drawMaster(m,index)}));
        },
        drawMaster(m,index) {
            const ctx=this.config.ctx, speaking=this.active&&this.state==='MASTERS_FAREWELL'&&this.line===index;
            ctx.save();
            if(speaking) {
                ctx.strokeStyle='#f0da92';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(m.x,m.y+1,18,5,0,0,Math.PI*2);ctx.stroke();
                ctx.fillStyle='#f0da92';ctx.beginPath();ctx.moveTo(m.x,m.y-m.npc.tamanho-9);ctx.lineTo(m.x-3,m.y-m.npc.tamanho-14);ctx.lineTo(m.x+3,m.y-m.npc.tamanho-14);ctx.fill();
            }
            // Mantém cena/origem, imagem, recorte e tamanho do NPC (inclusive o Basquete).
            this.config.drawNPC({...m.npc,x:m.x,y:m.y});
            if(this.active&&this.state==='MASTERS_FAREWELL'&&this.line>=8) {
                ctx.globalAlpha=.35+.25*Math.sin(performance.now()/350+index);
                ctx.fillStyle='#9ee7d0';ctx.fillRect(m.x+14,m.y-m.npc.tamanho+8,2,2);
            }
            ctx.restore();
        },
        message() {
            return this.line<8?[this.masters[this.line].name,this.masters[this.line].text]
                :['ZORPZIN NONARIS',reply[this.line-8]];
        },
        draw(ctx) {
            if(!this.active)return;
            ctx.save();ctx.fillStyle='rgba(5,17,30,.12)';ctx.fillRect(0,0,450,300);
            if(this.state==='MASTERS_FAREWELL'){
                const actor=this.line<8?this.masters[this.line]:this.config.player;
                const spotlight=ctx.createRadialGradient(actor.x,actor.y-20,18,actor.x,actor.y-20,220);
                spotlight.addColorStop(0,'rgba(4,13,27,0)');spotlight.addColorStop(1,'rgba(4,13,27,.22)');ctx.fillStyle=spotlight;ctx.fillRect(0,0,450,218);
                ctx.fillStyle='rgba(5,17,30,.86)';ctx.fillRect(132,7,186,19);
                ctx.fillStyle='#b7a579';ctx.fillRect(132,7,2,19);ctx.fillRect(316,7,2,19);
                ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='8px monospace';ctx.fillStyle='#e4d3a6';ctx.fillText('ATÉ A PRÓXIMA, CAMPEÃO',225,20);
            }
            if(this.state==='BOARDING_PROMPT') {
                ctx.fillStyle='rgba(6,20,36,.97)';ctx.fillRect(72,215,306,74);ctx.strokeStyle='#7accca';ctx.strokeRect(72.5,215.5,305,73);
                ctx.textAlign='center';ctx.fillStyle='#eef4ec';ctx.font='bold 12px monospace';ctx.fillText(AdventureIntro.endingSeen?'Rever o final?':'Entrar na nave?',225,235);
                for(let i=0;i<2;i++) {
                    const x=140+i*95;ctx.fillStyle=this.selected===i?'#225e66':'#172f43';ctx.fillRect(x,244,75,21);
                    ctx.strokeStyle=this.selected===i?'#e9d290':'#426778';ctx.strokeRect(x+.5,244.5,74,20);
                    ctx.fillStyle='#eef4ec';ctx.font='bold 10px monospace';ctx.fillText(i===0?'SIM':'NÃO',x+37,258);
                }
                ctx.fillStyle='#a7bac6';ctx.font='8px monospace';ctx.fillText(this.path.length?'APROXIMANDO-SE DA NAVE...':'[A/D] ESCOLHER · [ESPAÇO / E / ENTER] CONFIRMAR',225,279);
            } else {
                const [speaker,text]=this.message();
                ctx.fillStyle='rgba(6,20,36,.97)';ctx.fillRect(18,218,414,69);ctx.strokeStyle='#7accca';ctx.strokeRect(18.5,218.5,413,68);
                // Oito marcas acompanham as despedidas, sem exigir novas interações.
                for(let i=0;i<8;i++){ctx.fillStyle=i<=this.line?'#e4ce91':'#365565';ctx.fillRect(29+i*13,214,9,2);}
                ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#a2f0bd';ctx.font='bold 9px monospace';ctx.fillText(speaker,29,227);
                ctx.fillStyle='#eef4ec';ctx.font='10px monospace';let row='',y=244;
                for(const word of text.split(' ')) {
                    const candidate=row?row+' '+word:word;
                    if(ctx.measureText(candidate).width>386&&row){ctx.fillText(row,29,y);y+=13;row=word;}else row=candidate;
                }
                ctx.fillText(row,29,y);ctx.textAlign='right';ctx.fillStyle='#a7bac6';ctx.font='8px monospace';ctx.fillText('[ESPAÇO / E / ENTER] CONTINUAR',419,275);
            }
            ctx.restore();
        },
        snapshot() {
            return {active:this.active,state:this.state,line:this.line,selected:this.selected,walking:this.path.length>0,
                message:this.active&&this.state==='MASTERS_FAREWELL'?this.message():null,
                canStartStandardEnding:AdventureIntro.canStartStandardEnding,
                mastersFarewellStarted:AdventureIntro.mastersFarewellStarted,
                mastersFarewellSeen:AdventureIntro.mastersFarewellSeen,
                masters:this.masters.map(m=>({scene:m.scene,name:m.name,x:m.x,y:m.y,height:m.npc.tamanho,source:m.npc.img.src}))};
        }
    };
    global.MastersFarewell=farewell;
})(window);
