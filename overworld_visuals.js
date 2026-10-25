"use strict";

// The basketball scene is the visual reference and never uses these overrides.
const OVERWORLD_STYLE = Object.freeze({
    border: "#62d7df", foundation: "#14314f", curb: "#26445c", light: "#f3ca63",
    text: "#f8e8aa", path: "#7895a6", pathTop: "#a9c6ce",
    masterHeight: 50, npcHeight: 44, bridgeWidth: 40
});
const OVERWORLD_ISLANDS = Object.freeze({
    HUB: { title: "PRAÇA DOS CAMPEÕES", floor: "#42636a", exits: ["n","s","w","e"] },
    ILHA_ESQUI: { title: "CLUBE DE BOXE", floor: "#344959", exits: ["s"] },
    ILHA_PINGPONG: { title: "ARENA DE PING-PONG", floor: "#356351", exits: ["w","n"] },
    ILHA_SKATE: { title: "SKATE PLAZA", floor: "#8296a0", exits: ["n","w","e"] },
    ILHA_ARCO: { title: "VALE DA ARQUEARIA", floor: "#63855d", exits: ["n","e"] },
    ILHA_CORRIDA: { title: "ESTÁDIO DE ATLETISMO", floor: "#42664f", exits: ["e"] },
    ILHA_ESCALADA: { title: "BASE DO MONTE ZORP", floor: "#596267", exits: ["s"] },
    ILHA_SURF: { title: "PRAIA DO SURF", floor: "#d9c58d", exits: ["s"] }
});
const overworldSpriteCache = new WeakMap();
const overworldNpcRenderIssues = new Map();
let overworldConversationNpc = null;
let overworldFocusNpc = null;
function overworldChamfer(x, y, w, h, cut = 18) {
    ctx.beginPath(); ctx.moveTo(x + cut, y); ctx.lineTo(x + w - cut, y);
    ctx.lineTo(x + w, y + cut); ctx.lineTo(x + w, y + h - cut);
    ctx.lineTo(x + w - cut, y + h); ctx.lineTo(x + cut, y + h);
    ctx.lineTo(x, y + h - cut); ctx.lineTo(x, y + cut); ctx.closePath();
}
function drawOverworldBase(scene) {
    const config = OVERWORLD_ISLANDS[scene];
    drawWater();
    ctx.save();
    // Same scale and rhythm of reflections as the untouched basketball platform.
    ctx.fillStyle = "rgba(16,42,85,.42)";
    for (let y = 12; y < 300; y += 24)
        for (let x = (y / 24) % 2 ? 8 : 26; x < 450; x += 58) ctx.fillRect(x,y,20,2);
    ctx.fillStyle = "rgba(102,220,236,.5)";
    for (let i=0;i<10;i++) ctx.fillRect((i*47+19)%438,20+(i*31)%258,9,2);
    overworldChamfer(16,22,418,264,20);
    ctx.fillStyle = "#10263e"; ctx.fill();
    overworldChamfer(16,18,418,264,20);
    ctx.fillStyle = OVERWORLD_STYLE.foundation; ctx.fill();
    ctx.strokeStyle = OVERWORLD_STYLE.border; ctx.lineWidth = 3; ctx.stroke();
    overworldChamfer(26,27,398,246,16);
    ctx.fillStyle = OVERWORLD_STYLE.curb; ctx.fill();
    overworldChamfer(34,35,382,230,12);
    ctx.fillStyle = config.floor; ctx.fill();
    ctx.save(); ctx.clip();
    if(['HUB','ILHA_ESQUI','ILHA_PINGPONG','ILHA_SKATE'].includes(scene)) {
        ctx.strokeStyle = "rgba(13,35,48,.13)"; ctx.lineWidth = 1;
        for(let x=36;x<420;x+=38){ctx.beginPath();ctx.moveTo(x,36);ctx.lineTo(x,264);ctx.stroke();}
        for(let y=39;y<264;y+=28){ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(415,y);ctx.stroke();}
    } else {
        // Outdoor materials keep their identity; sand and turf aren't tiled concrete.
        ctx.fillStyle=scene==='ILHA_SURF'?"rgba(255,245,207,.3)":"rgba(20,43,43,.12)";
        for(let i=0;i<36;i++) {
            const x=40+(i*67)%365,y=55+(i*43)%200;
            ctx.fillRect(x,y,scene==='ILHA_SURF'?10:5,1);
        }
    }
    ctx.restore();
    ctx.fillStyle = OVERWORLD_STYLE.light;
    for(const x of [60,130,200,270,340,390]){ctx.fillRect(x,29,8,3);ctx.fillRect(x,268,8,3);}
    for(const y of [70,230]){ctx.fillRect(29,y,3,8);ctx.fillRect(418,y,3,8);}
    ctx.restore();
}
function drawOverworldConnections(scene) {
    ctx.save();
    for(const side of OVERWORLD_ISLANDS[scene].exits) {
        const rect = {n:[205,0,40,36],s:[205,264,40,36],w:[0,130,34,40],e:[416,130,34,40]}[side];
        const [x,y,w,h]=rect;
        ctx.fillStyle=OVERWORLD_STYLE.path;ctx.fillRect(x,y,w,h);
        ctx.fillStyle=OVERWORLD_STYLE.pathTop;ctx.fillRect(x+4,y+4,w-8,h-8);
        ctx.fillStyle=OVERWORLD_STYLE.light;
        if(side==='n'||side==='s')ctx.fillRect(219,y+12,12,8);
        else ctx.fillRect(x+10,145,12,8);
    }
    ctx.restore();
}
function drawOverworldLabel(text) {
    ctx.save(); ctx.fillStyle="#14314f";
    const width=Math.max(110,text.length*5.5+18);
    ctx.fillRect(225-width/2,33,width,14);
    ctx.fillStyle=OVERWORLD_STYLE.light;ctx.fillRect(225-width/2,33,3,14);
    ctx.fillStyle=OVERWORLD_STYLE.text;ctx.font="bold 8px monospace";ctx.textAlign="center";
    ctx.fillText(text,225,43);ctx.restore();
}
function drawOverworldMasterMark(scene) {
    const npc=npcs.find(n=>n.scene===scene&&n.isMaster);
    if(!npc)return;
    ctx.save();ctx.fillStyle="rgba(64,205,215,.18)";
    ctx.beginPath();ctx.ellipse(npc.x,npc.y+2,27,9,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(98,215,223,.5)";ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(npc.x,npc.y+2,24,7,0,.2,Math.PI-.2);ctx.stroke();ctx.restore();
}
function finishOverworldIsland(scene) {
    drawOverworldConnections(scene);
    drawOverworldLabel(OVERWORLD_ISLANDS[scene].title);
    drawOverworldMasterMark(scene);
}
function drawOverworldBench(x,y,w=46) {
    ctx.save();ctx.fillStyle="rgba(8,25,38,.25)";ctx.fillRect(x+2,y+12,w,5);
    ctx.fillStyle="#203a4b";ctx.fillRect(x+5,y+6,4,10);ctx.fillRect(x+w-9,y+6,4,10);
    ctx.fillStyle="#a97d56";ctx.fillRect(x,y,w,8);
    ctx.fillStyle="#d8b183";ctx.fillRect(x,y,w,2);
    ctx.fillStyle="#775d4b";ctx.fillRect(x,y+4,w,1);ctx.restore();
}
function drawOverworldHub() {
    drawOverworldBase("HUB");ctx.save();
    ctx.fillStyle="#718b91";ctx.fillRect(205,36,40,228);ctx.fillRect(35,130,380,40);
    ctx.fillStyle="#adc2bd";ctx.fillRect(211,36,28,228);ctx.fillRect(35,136,380,28);
    ctx.fillStyle="#264c5a";ctx.beginPath();ctx.arc(225,150,43,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#62d7df";ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle="#f3ca63";ctx.lineWidth=2;ctx.beginPath();ctx.arc(225,150,28,0,Math.PI*2);ctx.stroke();
    // A modest festival emblem rather than a large obstructing monument.
    ctx.beginPath();ctx.moveTo(225,132);ctx.lineTo(230,145);ctx.lineTo(244,145);
    ctx.lineTo(233,154);ctx.lineTo(237,167);ctx.lineTo(225,159);ctx.lineTo(213,167);
    ctx.lineTo(217,154);ctx.lineTo(206,145);ctx.lineTo(220,145);ctx.closePath();ctx.stroke();
    for(const x of [46]) {
        ctx.fillStyle="#26445c";ctx.fillRect(x,65,38,25);
        ctx.fillStyle="#66805a";ctx.fillRect(x+3,68,32,18);
        ctx.fillStyle="#dfc06d";ctx.fillRect(x+8,73,4,4);ctx.fillRect(x+25,78,4,4);
    }
    drawOverworldBench(68,211);drawOverworldBench(336,240);
    ctx.restore();finishOverworldIsland("HUB");
}
function overworldNpcGeometry(npc) {
    if(!npc.img?.src)return null;
    const path=decodeURIComponent(new URL(npc.img.src,location.href).pathname);
    // Event NPCs supply a measured pose without changing the shared island atlas.
    if(npc.spriteGeometry)return path.endsWith('/'+npc.spriteGeometry.source)?npc.spriteGeometry:null;
    // Several different characters share the climbing sheet: select explicitly.
    if(npc.spriteKey) {
        const entry=OVERWORLD_NPC_GEOMETRY.sprites[npc.spriteKey];
        return entry&&path.endsWith('/'+entry.source)?entry:null;
    }
    const matches=Object.values(OVERWORLD_NPC_GEOMETRY.sprites).filter(e=>path.endsWith('/'+e.source));
    return matches.length===1?matches[0]:null;
}
function validateOverworldNpcGeometry(geometry,image) {
    const errors=[];
    if(!geometry)return {valid:false,errors:['missing-or-ambiguous-atlas-entry']};
    const ints=(a,length)=>Array.isArray(a)&&a.length===length&&a.every(Number.isInteger);
    const finite=(a,length)=>Array.isArray(a)&&a.length===length&&a.every(Number.isFinite);
    const size=geometry.sourceSize,crop=geometry.crop,padding=geometry.padding;
    if(!ints(size,2)||size.some(n=>n<=0)||size[0]!==image.naturalWidth||size[1]!==image.naturalHeight)
        errors.push('atlas-source-size-does-not-match-png');
    const cropValid=ints(crop,4)&&crop[0]>=0&&crop[1]>=0&&crop[2]>0&&crop[3]>0&&
        crop[0]+crop[2]<=image.naturalWidth&&crop[1]+crop[3]<=image.naturalHeight;
    if(!cropValid)errors.push('invalid-source-rectangle');
    if(!Number.isInteger(padding)||padding<0||padding>16)errors.push('invalid-padding');
    if(!Number.isInteger(geometry.visibleWidth)||!Number.isInteger(geometry.visibleHeight)||
        geometry.visibleWidth<=0||geometry.visibleHeight<=0||
        (cropValid&&(geometry.visibleWidth>crop[2]||geometry.visibleHeight>crop[3])))
        errors.push('invalid-visible-bounds');
    const width=cropValid?crop[2]+padding*2:0,height=cropValid?crop[3]+padding*2:0;
    if(!finite(geometry.anchor,2)||geometry.anchor[0]<0||geometry.anchor[1]<0||
        geometry.anchor[0]>width||geometry.anchor[1]>height)errors.push('invalid-feet-anchor');
    if(!Array.isArray(geometry.backgroundRectangles)||geometry.backgroundRectangles.some(r=>
        !ints(r,4)||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>width||r[1]+r[3]>height))
        errors.push('invalid-alpha-mask');
    return {valid:errors.length===0,errors};
}
function reportOverworldNpcRenderIssue(npc,errors) {
    const key=(npc.id||npc.spriteKey||npc.img?.src||'npc')+':'+errors.join(',');
    if(overworldNpcRenderIssues.has(key))return;
    const issue={id:npc.id||null,source:npc.img?.src||null,errors:[...errors]};
    overworldNpcRenderIssues.set(key,issue);
    console.warn('Overworld NPC sprite rejected:',issue);
}
function freezeOverworldNpcGeometry(geometry) {
    for(const key of ['sourceSize','crop','anchor'])Object.freeze(geometry[key]);
    for(const rect of geometry.backgroundRectangles)Object.freeze(rect);
    Object.freeze(geometry.backgroundRectangles);
    return Object.freeze(geometry);
}
function overworldNpcDrawBounds(npc,width,height,geometry,snapOrigin=false) {
    if(![npc.x,npc.y,npc.tamanho,width,height,geometry.visibleHeight].every(Number.isFinite)||
        npc.tamanho<=0||width<=0||height<=0||geometry.visibleHeight<=0)return null;
    // One scale, derived from useful character height; never fit into a fixed box.
    const scale=npc.tamanho/geometry.visibleHeight;
    let x=npc.x-geometry.anchor[0]*scale,y=npc.y-geometry.anchor[1]*scale;
    if(snapOrigin){x=Math.floor(x);y=Math.floor(y);}
    return {x,y,width:width*scale,height:height*scale,scale};
}
function prepareOverworldNpc(npc) {
    if(!npc.img?.complete||!npc.img.naturalWidth||!npc.img.naturalHeight)return null;
    const geometry=overworldNpcGeometry(npc);
    const source=npc.img.currentSrc||npc.img.src;
    let cache=overworldSpriteCache.get(npc.img);
    if(!cache||cache.source!==source||cache.width!==npc.img.naturalWidth||cache.height!==npc.img.naturalHeight) {
        cache={source,width:npc.img.naturalWidth,height:npc.img.naturalHeight,frames:new Map()};
        overworldSpriteCache.set(npc.img,cache);
    }
    // The same Image may legitimately supply several characters from one sheet.
    if(cache.frames.has(geometry))return cache.frames.get(geometry);
    const validation=validateOverworldNpcGeometry(geometry,npc.img);
    if(!validation.valid){reportOverworldNpcRenderIssue(npc,validation.errors);return null;}
    freezeOverworldNpcGeometry(geometry);
    const [x,y,w,h]=geometry.crop,padding=geometry.padding;
    const surface=document.createElement('canvas');surface.width=w+padding*2;surface.height=h+padding*2;
    const paint=surface.getContext('2d');paint.imageSmoothingEnabled=false;
    paint.drawImage(npc.img,x,y,w,h,padding,padding,w,h);
    // Offline flood-fill spans: no getImageData, safe under HTTP and file://.
    // Eyes, clothes and interior black outlines are never blanket-keyed out.
    for(const rect of geometry.backgroundRectangles)paint.clearRect(...rect);
    const sprite={surface,geometry};cache.frames.set(geometry,sprite);return sprite;
}
function drawUnifiedOverworldNpc(npc) {
    const sprite=prepareOverworldNpc(npc);if(!sprite)return;
    const {surface,geometry}=sprite;
    const bounds=overworldNpcDrawBounds(npc,surface.width,surface.height,geometry);
    if(!bounds)return;
    const radius=Math.max(8,Math.min(13,geometry.visibleWidth*bounds.scale*.48));
    const naturalIsland=npc.scene==='ILHA_ARCO'||npc.scene==='ILHA_ESCALADA';
    ctx.save();ctx.fillStyle=naturalIsland?'rgba(0,0,0,.28)':'rgba(0,0,0,.25)';ctx.beginPath();
    ctx.ellipse(npc.x,npc.y-1,radius,naturalIsland?5:4,0,0,Math.PI*2);ctx.fill();
    if(overworldFocusNpc===npc) {
        ctx.strokeStyle='#a3e8df';ctx.lineWidth=1;ctx.beginPath();
        ctx.ellipse(npc.x,npc.y-1,radius+3,5,0,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(surface,bounds.x,bounds.y,bounds.width,bounds.height);ctx.restore();
}
function drawBasketballOverworldNpc(npc) {
    // Keep the reference island's established framing, shadow and pixel positions.
    drawShadow(npc.x,npc.y);
    const image=npc.img;
    if(!image?.complete||!image.naturalWidth||!image.naturalHeight)return;
    const hasFrame=npc.sw!==undefined||npc.sh!==undefined;
    const crop=hasFrame?[npc.sx??0,npc.sy??0,npc.sw,npc.sh]:[0,0,image.naturalWidth,image.naturalHeight];
    const geometry={sourceSize:[image.naturalWidth,image.naturalHeight],crop,padding:0,
        anchor:[crop[2]/2,crop[3]],visibleWidth:crop[2],visibleHeight:crop[3],backgroundRectangles:[]};
    const validation=validateOverworldNpcGeometry(geometry,image);
    if(!validation.valid){reportOverworldNpcRenderIssue(npc,validation.errors);return;}
    const bounds=overworldNpcDrawBounds(npc,crop[2],crop[3],geometry,true);
    if(!bounds)return;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,...crop,bounds.x,bounds.y,bounds.width,bounds.height);ctx.restore();
}
function overworldNpcInteractionBox(npc) {
    const w=npc.interactionWidth||46,h=npc.interactionHeight||50;
    if(npc.interactionWidth||npc.interactionHeight)
        return {x:npc.x-w/2,y:npc.y-h+(npc.interactionOffsetY||0),width:w,height:h};
    return {x:npc.x-15,y:npc.y-15,width:46,height:50};
}
function configureOverworldPresentation() {
    for(const npc of npcs) {
        if(!npc.id) {
            const role=npc.msg.replace(/^>\s*/, '').split(':')[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'');
            npc.id=(npc.scene+'_'+role).toLowerCase().replace(/[^a-z0-9]+/g,'_');
        }
        if(npc.scene==='ILHA_BASQUETE'&&!npc.normalIslandNpc)continue;
        npc.tamanho=npc.isMaster?OVERWORLD_STYLE.masterHeight:OVERWORLD_STYLE.npcHeight;
        npc.interactionWidth=npc.isMaster?58:44;
        npc.interactionHeight=npc.isMaster?62:48;
        npc.interactionOffsetY=14;
        npc.footprint={width:18,height:8};
    }
    // Props already drawn by their island must not receive a second generic pass.
    for(const scene of ['HUB','ILHA_SKATE'])
        for(const obstacle of sceneObstacles[scene])obstacle.renderByIsland=true;
    for(const obstacle of sceneObstacles.ILHA_PINGPONG)
        if(obstacle.type==='scoreboard')obstacle.renderByIsland=true;
}
function getOverworldDiagnostics() {
    return {scene:currentScene,reference:'ILHA_BASQUETE',bounds:[16,18,418,264],bridgeWidth:40,
        npcs:npcs.filter(n=>n.scene===currentScene&&(RavokEvent.isNpcVisible(n)&&MerchantCampaign.isNpcVisible(n))).map(n=>({id:n.id||n.img.src.split('/').pop(),
            position:[n.x,n.y],height:n.tamanho,anchor:'bottom-center',
            source:overworldNpcGeometry(n)?.source||n.img.src,
            crop:overworldNpcGeometry(n)?.crop||null,footprint:n.footprint||null,
            interaction:overworldNpcInteractionBox(n),master:n.isMaster||null,
            ready:n.img.complete&&n.img.naturalWidth>0})),
        renderIssues:[...overworldNpcRenderIssues.values()],
        solidProps:(sceneObstacles[currentScene]||[]).filter(o=>o.solid).length};
}
