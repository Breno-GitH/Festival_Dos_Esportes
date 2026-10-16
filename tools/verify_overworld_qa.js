"use strict";
// Basketball is frozen; the other islands are intentionally updated. No Git required.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const baseline=JSON.parse(read('overworld_assets/baseline_reference.json'));
const qa=JSON.parse(read('overworld_assets/browser_qa.json'));
const metadata=JSON.parse(read('overworld_assets/npc_geometry.json'));
const source=read('script.js'),errors=[];
function body(name){
    const match=new RegExp('^function '+name+'\\([^\\n]*\\)[^\\n]*\\{','m').exec(source);
    if(!match)return null;
    let index=source.indexOf('{',match.index),depth=0,state='code';
    for(;index<source.length;index++){
        const c=source[index],next=source[index+1];
        if(state==='line'){if(c==='\n')state='code';}
        else if(state==='block'){if(c==='*'&&next==='/'){state='code';index++;}}
        else if(state!=='code'){if(c==='\\')index++;else if(c===state)state='code';}
        else if(c==='/'&&next==='/'){state='line';index++;}
        else if(c==='/'&&next==='*'){state='block';index++;}
        else if(['"',"'",'`'].includes(c))state=c;
        else if(c==='{')depth++;
        else if(c==='}'&&!--depth)return source.slice(match.index,index+1);
    }
    return null;
}
for(const [name,expected]of Object.entries(baseline.protectedFunctions))
    if(hash(body(name)||'')!==expected)errors.push('Protected function modified: '+name);
for(const [file,expected]of Object.entries(baseline.preservedMinigameFiles))
    if(hash(fs.readFileSync(path.join(root,file)))!==expected)errors.push('Minigame file modified: '+file);
const basketball=qa.islands.find(i=>i.scene==='ILHA_BASQUETE');
if(basketball.hash!==baseline.basketballScreenshotSha256)errors.push('Basketball pixels differ');
const referenceNpc={...basketball.npcs[0],source:basketball.npcs[0].source.split('/Festival_dos_Esportes/').pop().split('?')[0]};
if(JSON.stringify(referenceNpc)!==JSON.stringify(baseline.basketballNpc))errors.push('Basketball NPC differs');
for(const island of qa.islands)for(const npc of island.npcs){
    if(!npc.loaded)errors.push('Unloaded NPC in '+island.scene);
    if(island.scene!=='ILHA_BASQUETE'&&npc.height!==(npc.master?50:44))errors.push('Inconsistent scale in '+island.scene);
}
for(const island of qa.islands){
    if(island.scene==='ILHA_BASQUETE')continue;
    const boxes=island.navigation.npcs.map(n=>({x:n.position[0]-n.height*n.crop[2]/n.crop[3]/2,
        y:n.position[1]-n.height,w:n.height*n.crop[2]/n.crop[3],h:n.height}));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
        const a=boxes[i],b=boxes[j];
        if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)
            errors.push('Overlapping NPC silhouettes: '+island.scene);
    }
}
for(const test of qa.functional){
    if(test.before.x===test.after.x&&test.before.y===test.after.y)errors.push('No movement: '+test.scene);
    if(test.scene==='HUB')continue;
    if(!test.prompt.visible||test.entered!==test.target||test.returned!==test.scene)errors.push('Interaction failed: '+test.scene);
}
for(const test of qa.navigation)if(!test.reachable)errors.push('Blocked route: '+test.scene);
for(const test of qa.conversations||[])if(!test.readable||!test.visible)errors.push('Unreadable conversation: '+test.name);
for(const test of qa.connections)if(test.actual!==test.to)errors.push('Broken connection: '+test.from);
if(qa.errors.length||qa.warnings.length||qa.failures.length||qa.httpErrors.length)errors.push('Browser errors present');
for(const entry of Object.values(metadata.sprites)){
    if(!fs.existsSync(path.join(root,entry.source)))errors.push('Missing source: '+entry.source);
    const [x,y,w,h]=entry.crop,[sw,sh]=entry.sourceSize;
    if(x<0||y<0||w<=0||h<=0||x+w>sw||y+h>sh)errors.push('Invalid crop: '+entry.source);
    if(entry.anchor[0]!==w/2+2||entry.anchor[1]!==h+2)errors.push('Invalid anchor: '+entry.source);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(JSON.stringify({passed:true,protectedFunctions:Object.keys(baseline.protectedFunctions).length,
    basketball:'identical pixels / NPC / render',islands:qa.islands.length,
    participants:qa.islands.reduce((sum,i)=>sum+i.npcs.length,0),accessibleRoutes:qa.navigation.length,
    connections:qa.connections.length,minigames:qa.functional.length-1,fps:qa.fps,errors:0},null,2));
