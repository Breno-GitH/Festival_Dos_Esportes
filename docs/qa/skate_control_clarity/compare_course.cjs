const fs=require('node:fs'),crypto=require('node:crypto');
const ROOT='C:/xampp/htdocs/2025/Festival_Dos_Esportes';
const {COURSE:c}=require(ROOT+'/skate/course.js');
const geometry=Object.fromEntries(['spawnX','finish','groundSegments','gaps','ramps','rails','obstacles','decor','transfers','checkpoints','playLine'].map(k=>[k,c[k]]));
geometry.speedSamples=Array.from({length:300},(_,i)=>c.forwardSpeedAt(i*90));
const run=require(ROOT+'/skate/level_playtest.cjs').run();
const summary={geometryHash:crypto.createHash('sha256').update(JSON.stringify(geometry)).digest('hex'),phase:run.phase,x:run.x,timeSeconds:run.timeSeconds,physicsSeconds:run.physicsSeconds,score:run.score,jumps:run.jumps,landings:run.landings,railIds:run.enteredRails,rampLaunches:run.rampLaunches,traceHash:crypto.createHash('sha256').update(JSON.stringify(run.trace)).digest('hex')};
fs.writeFileSync(__dirname+'/'+(process.argv[2]||'baseline')+'.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({geometry:summary.geometryHash,phase:run.phase,time:run.physicsSeconds}));
