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
    ILHA_ARCO: { title: "CAMPO DE ARCO", floor: "#63855d", exits: ["n","e"] },
    ILHA_CORRIDA: { title: "ESTÁDIO DE ATLETISMO", floor: "#42664f", exits: ["e"] },
    ILHA_ESCALADA: { title: "BASE DO MONTE ZORP", floor: "#596267", exits: ["s"] },
    ILHA_SURF: { title: "PRAIA DO SURF", floor: "#d9c58d", exits: ["s"] }
});
const overworldSpriteCache = new WeakMap();
let overworldConversationNpc = null;
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
    for(const x of [46,366]) {
        ctx.fillStyle="#26445c";ctx.fillRect(x,65,38,25);
        ctx.fillStyle="#66805a";ctx.fillRect(x+3,68,32,18);
        ctx.fillStyle="#dfc06d";ctx.fillRect(x+8,73,4,4);ctx.fillRect(x+25,78,4,4);
    }
    drawOverworldBench(68,211);drawOverworldBench(336,211);
    ctx.restore();finishOverworldIsland("HUB");
}
function overworldNpcGeometry(npc) {
    const path=decodeURIComponent(new URL(npc.img.src,location.href).pathname);
    return Object.values(OVERWORLD_NPC_GEOMETRY.sprites).find(e=>path.endsWith('/'+e.source));
}
function prepareOverworldNpc(npc) {
    if(!npc.img.complete||!npc.img.naturalWidth)return null;
    if(overworldSpriteCache.has(npc.img))return overworldSpriteCache.get(npc.img);
    const geometry=overworldNpcGeometry(npc);
    if(!geometry)return null;
    const [x,y,w,h]=geometry.crop,padding=geometry.padding;
    const surface=document.createElement('canvas');surface.width=w+padding*2;surface.height=h+padding*2;
    const paint=surface.getContext('2d');paint.imageSmoothingEnabled=false;
    paint.drawImage(npc.img,x,y,w,h,padding,padding,w,h);
    // Offline flood-fill spans: no getImageData, safe under HTTP and file://.
    // Eyes, clothes and interior black outlines are never blanket-keyed out.
    for(const rect of geometry.backgroundRectangles)paint.clearRect(...rect);
    const sprite={surface,geometry};overworldSpriteCache.set(npc.img,sprite);return sprite;
}
function drawUnifiedOverworldNpc(npc) {
    const sprite=prepareOverworldNpc(npc);if(!sprite)return;
    const {surface,geometry}=sprite;
    const scale=npc.tamanho/geometry.crop[3];
    drawShadow(npc.x,npc.y);
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(surface,npc.x-geometry.anchor[0]*scale,npc.y-geometry.anchor[1]*scale,
        surface.width*scale,surface.height*scale);ctx.restore();
}
function overworldNpcInteractionBox(npc) {
    const w=npc.interactionWidth||46,h=npc.interactionHeight||50;
    if(npc.interactionWidth||npc.interactionHeight)
        return {x:npc.x-w/2,y:npc.y-h+(npc.interactionOffsetY||0),width:w,height:h};
    return {x:npc.x-15,y:npc.y-15,width:46,height:50};
}
function configureOverworldPresentation() {
    for(const npc of npcs) {
        if(npc.scene==='ILHA_BASQUETE')continue;
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
        npcs:npcs.filter(n=>n.scene===currentScene).map(n=>({id:n.id||n.img.src.split('/').pop(),
            position:[n.x,n.y],height:n.tamanho,anchor:'bottom-center',
            source:overworldNpcGeometry(n)?.source||n.img.src,
            crop:overworldNpcGeometry(n)?.crop||null,footprint:n.footprint||null,
            interaction:overworldNpcInteractionBox(n),master:n.isMaster||null,
            ready:n.img.complete&&n.img.naturalWidth>0})),
        solidProps:(sceneObstacles[currentScene]||[]).filter(o=>o.solid).length};
}
