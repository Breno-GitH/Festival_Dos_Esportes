// Authoring validation; this module is never loaded by the game.
const { COURSE } = require('./course.js');
const traversal = require('./traversal_system.js');
const physics = require('./ollie_physics.js');
function transferWindow(transfer, exitOffsetPx = 0) {
 const from=COURSE.rails.find(r=>r.id===transfer.from),to=COURSE.rails.find(r=>r.id===transfer.to);
 const startX=from.grindPath.at(-1).x-transfer.exitOffset+exitOffsetPx;
 const contact=traversal.sampleRail(from,startX),speed=COURSE.forwardSpeedAt(startX),hits=[];
 if(!contact)return {from:from.id,to:to.id,captureWindowMs:0,firstCaptureMs:null,lastCaptureMs:null};
 // Use the actual release impulse and momentum decay, never the removed hold upgrade.
 const simulation=physics.createSimulation({startX,forwardSpeed:speed,obstacle:null,groundSegments:[]});
 Object.assign(simulation.state.player,{y:contact.y,grounded:false,forwardSpeed:speed*traversal.SETTINGS.grindSpeedScale});
 simulation.launchFromGrind(contact.slope);
 for(let t=0;t<1.6;t+=1/240){
  const p=simulation.state.player;
  if(traversal.findCaptureCandidate(p,[to],p.forwardSpeed)?.withinCaptureZone)hits.push(t);
  simulation.step({},1/240);
 }
 return {from:from.id,to:to.id,jump:transfer.jump,exitOffsetPx,forwardSpeed:speed,
  gapPx:+(to.grindPath[0].x-from.grindPath.at(-1).x).toFixed(1),heightDeltaPx:+(from.grindPath.at(-1).y-to.grindPath[0].y).toFixed(1),
  firstCaptureMs:hits.length?Math.round(hits[0]*1000):null,lastCaptureMs:hits.length?Math.round(hits.at(-1)*1000):null,captureWindowMs:Math.round(hits.length/240*1000)};
}
function quietGroundIntervals(){
 const spans=[...COURSE.ramps.map(r=>[r.startX,r.endX]),...COURSE.rails.map(r=>[r.grindPath[0].x,r.grindPath.at(-1).x]),...COURSE.decor.map(p=>[p.x,p.x+p.width]),...COURSE.gaps.map(g=>[g.startX,g.endX])].sort((a,b)=>a[0]-b[0]);
 const quiet=[];let end=COURSE.spawnX;
 for(const[start,finish]of spans){if(start>end)quiet.push({startX:end,endX:start,seconds:COURSE.estimateDurationSeconds(end,start)});end=Math.max(end,finish)}
 if(end<COURSE.finish.x)quiet.push({startX:end,endX:COURSE.finish.x,seconds:COURSE.estimateDurationSeconds(end,COURSE.finish.x)});
 return quiet;
}
module.exports={transferWindow,quietGroundIntervals};
