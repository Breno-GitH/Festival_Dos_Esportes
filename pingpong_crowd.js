/* Fixed human/alien identities and cached poses, following the basketball crowd's local-RNG model. */
(function(global){
    'use strict';
    const CELL_W=16,CELL_H=24,POSES=6;
    let value=0x715ac01,atlas=null,builds=0;
    const random=()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/4294967296;};
    const pick=a=>a[Math.floor(random()*a.length)];
    const humans=['#d7ad8a','#bd8f6b','#a87858','#875e49','#664a3b','#e0bda1'];
    const aliens=['#82b58b','#7eafb1','#b58fae','#9b96bf','#b8ad79','#779fb7'];
    const clothes=['#678fa4','#b37e56','#856ba1','#6d977e','#a16d83','#9a985f','#63858d','#b28e7c'];
    const hair=['#35343b','#5b4234','#776148','#b4a080','#70534e'];
    const people=Object.freeze(Array.from({length:60},(_,i)=>{
        const front=i>=48,row=front?2:Math.floor(i%24/8),col=front?i%6:i%8,bank=front?Math.floor((i-48)/6):Math.floor(i/24);
        const species=i%5<3?'HUMAN':'ALIEN',affiliation=pick(['zorp','master','neutral','zorp','master']);
        return Object.freeze({id:i,species,row,front,x:front?(bank?249:153)+col*9:(bank?351:15)+col*12,
            footY:front?298:[28,49,70][row],skin:pick(species==='HUMAN'?humans:aliens),shirt:pick(clothes),hair:pick(hair),
            hairStyle:Math.floor(random()*5),accessory:Math.floor(random()*6),antennae:1+Math.floor(random()*2),
            headShape:Math.floor(random()*3),eyes:Math.floor(random()*3),outfit:Math.floor(random()*3),
            stature:Math.floor(random()*2),phase:random()*9000,tempo:.8+random()*.5,affiliation});
    }));
    function box(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
    function tone(hex,m){const n=parseInt(hex.slice(1),16);return '#'+[n>>16&255,n>>8&255,n&255].map(v=>Math.round(v*m).toString(16).padStart(2,'0')).join('');}
    function person(c,p,pose,ox,oy){
        const factor=p.front ? .92 : [.68,.78,.88][p.row],skin=tone(p.skin,factor),shirt=tone(p.shirt,factor),shade=tone(p.shirt,factor*.7);
        const hw=p.row===0?5:p.row===1?6:7,hh=p.species==='ALIEN'&&p.headShape===1?8:p.row===0?5:7;
        const bodyH=5+p.row+p.stature,bodyW=6+p.row,feet=oy+22,bodyY=feet-2-bodyH;
        const lean=pose===5?(p.id%2?1:-1):0,cx=ox+8+lean,headX=cx-Math.floor(hw/2),headY=bodyY-hh;
        box(c,'#172a32',ox+4,feet-1,4,2);box(c,'#172a32',ox+9,feet-1,4,2);
        box(c,'#182b34',cx-Math.floor(bodyW/2)-1,bodyY-1,bodyW+2,bodyH+2);
        box(c,shirt,cx-Math.floor(bodyW/2),bodyY,bodyW,bodyH);
        box(c,shade,cx-Math.floor(bodyW/2),bodyY,2,bodyH);
        if(p.outfit===1){box(c,tone(p.shirt,Math.min(1,factor+.12)),cx-2,bodyY+2,bodyW-2,1);box(c,shade,cx,bodyY,1,bodyH);}
        else if(p.outfit===2)box(c,'#81908a',cx,bodyY,1,2);
        box(c,'#1b2a33',headX-1,headY-1,hw+2,hh+2);box(c,skin,headX,headY,hw,hh);
        if(p.species==='ALIEN'){
            if(p.headShape===2){box(c,skin,headX-1,headY+2,1,3);box(c,skin,headX+hw,headY+2,1,3);}
            const a1=p.antennae===1?cx:headX+1;
            box(c,skin,a1,headY-3,1,3);box(c,tone(p.skin,factor*.85),a1-1,headY-3,2,1);
            if(p.antennae===2)box(c,skin,headX+hw-2,headY-3,1,3);
        }else{
            const hc=tone(p.hair,factor);
            box(c,hc,headX,headY,hw,2);
            if(p.hairStyle===1)box(c,hc,headX-1,headY+1,2,hh-1);
            if(p.hairStyle===2){box(c,hc,headX+hw-1,headY+1,2,hh);box(c,hc,headX,headY-1,2,1);}
            if(p.hairStyle===3){box(c,hc,headX,headY-1,1,2);box(c,hc,headX+3,headY-2,1,3);}
            if(p.hairStyle===4)box(c,hc,headX+hw-1,headY,1,3);
            if(p.accessory===1){box(c,tone(p.shirt,.9),headX-1,headY-1,hw+2,2);box(c,tone(p.shirt,.9),headX+hw,headY+1,2,1);}
            if(p.accessory===2)box(c,'#b9a784',headX,headY+2,hw,1);
        }
        const look=pose===4?(p.id%2?1:-1):0,eyeY=headY+Math.min(hh-2,3),eyeW=p.species==='ALIEN'&&p.eyes===1?2:1;
        box(c,'#1a2930',headX+1+look,eyeY,eyeW,1);box(c,'#1a2930',headX+hw-2+look,eyeY,1,p.species==='ALIEN'&&p.eyes===2?2:1);
        if(p.species==='HUMAN'&&p.accessory===3)box(c,'#5d7780',headX,eyeY-1,hw,1);
        box(c,tone(p.skin,factor*.65),cx,headY+hh-1,1,1);
        if(pose===1||pose===2){
            box(c,skin,cx-(pose===1?1:3),bodyY+2,2,2);box(c,skin,cx+(pose===1?1:2),bodyY+2,2,2);
        }else if(pose===3){
            box(c,shirt,cx-Math.floor(bodyW/2)-2,bodyY-3,2,5);box(c,skin,cx-Math.floor(bodyW/2)-2,bodyY-5,2,2);
            box(c,shirt,cx+Math.floor(bodyW/2),bodyY-3,2,5);box(c,skin,cx+Math.floor(bodyW/2),bodyY-5,2,2);
        }else{
            box(c,shirt,cx-Math.floor(bodyW/2)-2,bodyY+1,2,3);box(c,skin,cx-Math.floor(bodyW/2)-2,bodyY+4,2,2);
            box(c,shirt,cx+Math.floor(bodyW/2),bodyY+1,2,3);box(c,skin,cx+Math.floor(bodyW/2),bodyY+(pose===4?1:4),2,2);
        }
    }
    function ensure(){
        if(atlas)return;
        atlas=global.document.createElement('canvas');atlas.width=CELL_W*people.length;atlas.height=CELL_H*POSES;
        const c=atlas.getContext('2d');c.imageSmoothingEnabled=false;
        for(const p of people)for(let pose=0;pose<POSES;pose++)person(c,p,pose,p.id*CELL_W,pose*CELL_H);
        builds++;
    }
    function poseAt(p,now,reaction={}){
        const cycle=((now*p.tempo+p.phase)%7200)/7200;
        const support=!reaction.side||p.affiliation==='neutral'||p.affiliation===reaction.side?1:.30;
        const excitement=Math.max((reaction.tier||0)/3,reaction.eventStrength||0,reaction.climax ? .65 : 0,reaction.victory?1:0)*support;
        if(excitement>.7&&cycle<.72)return cycle<.36?3:(Math.floor((now+p.phase)/180)%2?1:2);
        if(excitement>.35&&cycle<.48)return Math.floor((now+p.phase)/220)%2?1:2;
        if(cycle<.045)return 1;
        if(cycle<.09)return 2;
        if(cycle>.31&&cycle<.40)return 4;
        if(cycle>.69&&cycle<.73)return 3;
        if(cycle>.85&&cycle<.90)return 5;
        return 0;
    }
    function draw(c,now,reaction={}){
        ensure();c.save();c.imageSmoothingEnabled=false;
        for(const p of people){const pose=poseAt(p,now,reaction);c.drawImage(atlas,p.id*CELL_W,pose*CELL_H,CELL_W,CELL_H,
            Math.round(p.x-8),p.footY-CELL_H,CELL_W,CELL_H);}
        // Rails mask the feet consistently and keep the foreground spectators outside the court.
        for(const x of [144,241]){box(c,'#506870',x,296,65,2);box(c,'#223b43',x,298,65,2);}
        c.restore();
    }
    const snapshot=()=>({count:people.length,humans:people.filter(p=>p.species==='HUMAN').length,aliens:people.filter(p=>p.species==='ALIEN').length,
        poses:POSES,atlasBuilds:builds,signature:people.map(p=>p.species[0]+p.skin+p.hairStyle+p.accessory+p.headShape).join('|')});
    global.PingPongCrowd=Object.freeze({people,draw,poseAt,snapshot});
})(window);
