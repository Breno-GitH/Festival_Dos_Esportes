/* Ending card reutilizável: conteúdo e retrato são fornecidos por cada final. */
(function (global) {
    'use strict';
    const card = {
        active:false, content:null, shownAt:0, transitionFrame:null,
        show(content) {
            const canvas=document.getElementById('gameCanvas');
            this.transitionFrame=null;
            if(canvas){this.transitionFrame=document.createElement('canvas');this.transitionFrame.width=450;this.transitionFrame.height=300;this.transitionFrame.getContext('2d').drawImage(canvas,0,0,450,300);}
            this.content = Object.freeze({...content}); this.active = true; this.shownAt=performance.now();
        },
        handleKeyDown(e) {
            if (!this.active) return false;
            if (!e.ctrlKey && !e.metaKey && [' ','w','a','s','d','e','Enter','Escape'].includes(e.key)) e.preventDefault();
            // Um toque que abriu a card não pode também fechá-la via repetição do teclado.
            if (e.key === ' ' && !e.repeat) {
                const close = this.content.onClose;
                this.active = false; this.content = null; this.transitionFrame=null;
                if (typeof close === 'function') close();
            }
            return true;
        },
        draw(ctx) {
            if(!this.active)return;
            this.drawContent(ctx);
            const p=Math.min(1,(performance.now()-this.shownAt)/650);
            if(this.transitionFrame&&p<1){ctx.save();ctx.globalAlpha=1-p*p*(3-2*p);ctx.drawImage(this.transitionFrame,0,0);ctx.restore();}
            else this.transitionFrame=null;
        },
        drawContent(ctx) {
            if (!this.active) return;
            const c=this.content, accent=c.accent || '#f0cf87';
            if(c.theme==='champion'){this.drawChampion(ctx,c,accent);return;}
            if(c.theme==='vacation'){this.drawVacation(ctx,c);return;}
            ctx.save();ctx.textBaseline='alphabetic';ctx.textAlign='center';
            const sky=ctx.createLinearGradient(0,0,0,300);sky.addColorStop(0,'#071221');sky.addColorStop(1,'#142e3c');
            ctx.fillStyle=sky;ctx.fillRect(0,0,450,300);
            ctx.strokeStyle='rgba(163,193,195,.3)';ctx.lineWidth=1;ctx.strokeRect(18.5,12.5,413,275);
            ctx.font='8px monospace';ctx.fillStyle='#a7c7cd';ctx.fillText(c.label || 'FINAL',225,29);
            const glow=ctx.createRadialGradient(225,102,4,225,102,83);
            glow.addColorStop(0,'rgba(108,175,169,.2)');glow.addColorStop(1,'rgba(108,175,169,0)');
            ctx.fillStyle=glow;ctx.fillRect(135,32,180,140);
            const image=typeof c.portrait==='function' ? c.portrait() : c.portrait;
            if (image && image.width && image.height) {
                const scale=Math.min(138/image.width,128/image.height),w=image.width*scale,h=image.height*scale;
                ctx.imageSmoothingEnabled=true;ctx.drawImage(image,225-w/2,36+(128-h)/2,w,h);
            }
            let size=20;ctx.font='bold '+size+'px monospace';
            while(size>12 && ctx.measureText(c.title).width>374) {size--;ctx.font='bold '+size+'px monospace';}
            ctx.fillStyle=accent;ctx.fillText(c.title,225,190);
            ctx.fillStyle='#e5eeeb';ctx.font='10px monospace';
            let row='',y=215;
            for(const word of c.text.split(' ')) {
                const candidate=row?row+' '+word:word;
                if(row && ctx.measureText(candidate).width>366) {ctx.fillText(row,225,y);y+=14;row=word;}
                else row=candidate;
            }
            ctx.fillText(row,225,y);
            ctx.fillStyle='#9dbbc4';ctx.font='8px monospace';ctx.fillText('[ESPAÇO] VOLTAR AO MENU',225,273);
            ctx.restore();
        },
        drawChampion(ctx,c,accent){
            const t=(performance.now()-this.shownAt)/1000;
            ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';
            const sky=ctx.createLinearGradient(0,0,450,300);sky.addColorStop(0,'#050c1e');sky.addColorStop(.6,'#102b3c');sky.addColorStop(1,'#153e49');ctx.fillStyle=sky;ctx.fillRect(0,0,450,300);
            const glow=ctx.createRadialGradient(225,96,5,225,96,150);glow.addColorStop(0,'rgba(224,184,96,.23)');glow.addColorStop(.5,'rgba(96,187,175,.08)');glow.addColorStop(1,'rgba(96,187,175,0)');ctx.fillStyle=glow;ctx.fillRect(50,0,350,265);
            for(let i=0;i<28;i++){ctx.globalAlpha=.18+.16*(1+Math.sin(t*.8+i*2.3))/2;ctx.fillStyle=i%3?'#9cddd1':accent;ctx.fillRect(31+(i*73)%390,38+(i*43)%216,1,1);}ctx.globalAlpha=1;
            ctx.strokeStyle='rgba(234,202,132,.55)';ctx.lineWidth=1;ctx.strokeRect(17.5,12.5,415,275);ctx.strokeStyle='rgba(128,187,190,.18)';ctx.strokeRect(21.5,16.5,407,267);
            for(const x of [18,432])for(const y of [13,287]){const sx=x<225?1:-1,sy=y<150?1:-1;ctx.strokeStyle=accent;ctx.beginPath();ctx.moveTo(x,y+sy*16);ctx.lineTo(x,y);ctx.lineTo(x+sx*22,y);ctx.stroke();}
            ctx.font='8px monospace';ctx.fillStyle='#a5dfd3';ctx.fillText(c.label,225,29);
            // Louros e aro ficam atrás da pose; nenhum detalhe cobre o personagem.
            ctx.strokeStyle='rgba(227,197,127,.33)';ctx.beginPath();ctx.ellipse(225,96,70,61,0,.18,Math.PI-.18);ctx.stroke();
            for(const side of [-1,1]){
                ctx.strokeStyle='rgba(227,197,127,.6)';ctx.beginPath();ctx.moveTo(225+side*19,151);ctx.quadraticCurveTo(225+side*88,117,225+side*59,54);ctx.stroke();
                for(let i=0;i<7;i++){const a=.2+i*.17,x=225+side*(63*Math.sin(a)+15),y=146-i*12;ctx.save();ctx.translate(x,y);ctx.rotate(side*(.55+i*.08));ctx.fillStyle=i%2?'#a38b58':'#ddc383';ctx.beginPath();ctx.ellipse(0,0,2.5,5.5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
            }
            const image=typeof c.portrait==='function'?c.portrait():c.portrait;
            if(image&&image.complete!==false&&image.width&&image.height){const scale=Math.min(136/image.width,118/image.height),w=image.width*scale,h=image.height*scale;ctx.imageSmoothingEnabled=true;ctx.drawImage(image,225-w/2,34+(118-h)/2,w,h);}
            for(let i=0;i<(c.badges||[]).length;i++){const badge=c.badges[i];if(badge.complete&&badge.naturalWidth)ctx.drawImage(badge,151.5+i*19,155,14,14);}
            let size=21;ctx.font='bold '+size+'px monospace';while(size>12&&ctx.measureText(c.title).width>374){size--;ctx.font='bold '+size+'px monospace';}ctx.fillStyle=accent;ctx.fillText(c.title,225,194);
            ctx.fillStyle='#e4eeeb';ctx.font='10px monospace';let row='',y=217;
            for(const word of c.text.split(' ')){const candidate=row?row+' '+word:word;if(row&&ctx.measureText(candidate).width>366){ctx.fillText(row,225,y);y+=14;row=word;}else row=candidate;}ctx.fillText(row,225,y);
            ctx.fillStyle='#abc9cc';ctx.font='8px monospace';ctx.fillText('[ESPAÇO] VOLTAR AO MENU',225,273);ctx.restore();
        },
        drawVacation(ctx,c){
            const t=(performance.now()-this.shownAt)/1000;
            ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';
            const sky=ctx.createLinearGradient(0,0,0,300);sky.addColorStop(0,'#112b3e');sky.addColorStop(.48,'#24616b');sky.addColorStop(1,'#081b2d');ctx.fillStyle=sky;ctx.fillRect(0,0,450,300);
            const halo=ctx.createRadialGradient(225,97,8,225,97,128);halo.addColorStop(0,'rgba(250,195,126,.35)');halo.addColorStop(1,'rgba(250,195,126,0)');ctx.fillStyle=halo;ctx.fillRect(80,0,290,225);
            ctx.fillStyle='rgba(246,197,141,.22)';ctx.beginPath();ctx.arc(225,96,57,0,Math.PI*2);ctx.fill();
            const water=ctx.createLinearGradient(0,131,0,180);water.addColorStop(0,'rgba(91,178,171,.35)');water.addColorStop(1,'rgba(8,29,44,0)');ctx.fillStyle=water;ctx.fillRect(25,131,400,50);
            for(let i=0;i<18;i++){const x=31+((i*47-t*3)%388+388)%388,y=136+(i*11)%38;ctx.fillStyle=i%3?'rgba(156,221,204,.17)':'rgba(244,207,158,.2)';ctx.fillRect(x,y,9+i%4*6,1);}
            // Silhuetas laterais mantêm o centro e toda a área de leitura livres.
            for(const [x,side]of [[54,1],[396,-1]]){
                ctx.save();ctx.translate(x,174);ctx.rotate(Math.sin(t*.5+side)*.008);
                ctx.strokeStyle='#224b54';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(8*side,-38,2*side,-70);ctx.stroke();ctx.strokeStyle='#31686a';ctx.lineWidth=4;
                for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(2*side,-70);ctx.quadraticCurveTo(i*10,-86,i*19,-66+Math.abs(i)*5);ctx.stroke();}ctx.restore();
            }
            for(let i=0;i<12;i++){ctx.globalAlpha=.12+.1*(1+Math.sin(t*.65+i))/2;ctx.fillStyle=i%2?'#ade3d5':'#f6d4a0';ctx.fillRect(40+(i*79)%370,44+(i*29)%99,1,1);}ctx.globalAlpha=1;
            ctx.strokeStyle='rgba(139,207,196,.54)';ctx.lineWidth=1;ctx.strokeRect(18.5,12.5,413,275);ctx.strokeStyle='rgba(139,207,196,.15)';ctx.strokeRect(22.5,16.5,405,267);
            for(const x of [19,431]){ctx.strokeStyle='#e5b99a';ctx.beginPath();ctx.moveTo(x,31);ctx.lineTo(x,13);ctx.lineTo(x+(x<225?22:-22),13);ctx.stroke();}
            ctx.fillStyle='#aedbcf';ctx.font='8px monospace';ctx.fillText(c.label,225,29);
            const image=typeof c.portrait==='function'?c.portrait():c.portrait;
            if(image&&image.width&&image.height){const scale=Math.min(148/image.width,126/image.height),w=image.width*scale,h=image.height*scale;ctx.imageSmoothingEnabled=true;ctx.drawImage(image,225-w/2,38+(126-h)/2+Math.sin(t*.8)*.55,w,h);}
            let size=22;ctx.font='bold '+size+'px monospace';while(size>12&&ctx.measureText(c.title).width>374){size--;ctx.font='bold '+size+'px monospace';}ctx.fillStyle='#f5d1a1';ctx.fillText(c.title,225,194);
            ctx.fillStyle='#e7f0e8';ctx.font='10px monospace';let row='',y=217;
            for(const word of c.text.split(' ')){const candidate=row?row+' '+word:word;if(row&&ctx.measureText(candidate).width>366){ctx.fillText(row,225,y);y+=14;row=word;}else row=candidate;}ctx.fillText(row,225,y);
            ctx.fillStyle='#b0d2ce';ctx.font='8px monospace';ctx.fillText('[ESPAÇO] VOLTAR AO MENU',225,273);ctx.restore();
        },
        snapshot() { return {active:this.active,id:this.content?.id || null,
            title:this.content?.title || null,text:this.content?.text || null}; }
    };
    global.EndingCard=card;
})(window);
