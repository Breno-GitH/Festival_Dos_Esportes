/* Ordered physical timing gates shared by every marathon runner. */
(function(){
 'use strict';
 const TOTAL_LAPS=3,EPS=1e-7;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class RaceLapSystem {
  constructor(track){
   this.track=track;this.events=[];
   const s=track.straight,c=track.curveLength;
   this.gates=[this.makeGate('FINISH',0),this.makeGate('CP1',s+c*.5),
    this.makeGate('CP2',s+c+s*.5),this.makeGate('CP3',s*2+c*1.5)];
  }
  makeGate(id,progress){
   const t=this.track,p=t.point(progress,3.5),forward=t.tangent(progress);
   return {id,progress,x:p.x,y:p.y,forward,normal:{x:-forward.y,y:forward.x},halfWidth:t.halfTrackWidth+5};
  }
  attach(runner){
   runner.validatedLaps=0;runner.checkpointProgress=0;runner.nextGate=1;
   runner.lapStarted=false;runner.finishTime=null;runner.finished=false;runner.finishOrder=0;
   runner.segmentProgress=0;runner.progress=0;
   runner.prevX=runner.x;runner.prevY=runner.y;
   runner.lapCrossings=[];runner.checkpointCrossings=[];
  }
  crossing(previous,current,gate){
   const ax=previous.x-gate.x,ay=previous.y-gate.y,bx=current.x-gate.x,by=current.y-gate.y;
   const before=ax*gate.forward.x+ay*gate.forward.y,after=bx*gate.forward.x+by*gate.forward.y;
   const advance=after-before;
   if(advance<=EPS||!((before<-EPS&&after>=-EPS)||(Math.abs(before)<=EPS&&after>EPS)))return null;
   const t=clamp(-before/advance,0,1),x=previous.x+(current.x-previous.x)*t,y=previous.y+(current.y-previous.y)*t;
   const lateral=(x-gate.x)*gate.normal.x+(y-gate.y)*gate.normal.y;
   return Math.abs(lateral)<=gate.halfWidth&&this.track.project(x,y).onTrack?{t,x,y,lateral}:null;
  }
  log(runner,type,time,data={}){
   const event={runnerId:runner.id,type,time,...data};this.events.push(event);
   if(this.events.length>240)this.events.shift();return event;
  }
  physicalStep(runner,previous,current,dt){
   // Reject discontinuous jumps, without prescribing a place to re-enter.
   // Grass is freely traversable; only physical gate contacts on track count.
   const distance=Math.hypot(current.x-previous.x,current.y-previous.y);
   return Number.isFinite(distance)&&distance<=Math.max(60,(runner.maxSpeed||340)*dt*2+27);
  }
  fraction(runner,projection){
   if(!runner.lapStarted)return clamp(this.track.circularDistance(projection.progress,0)/this.gates[1].progress,-1,0);
   const cp=runner.checkpointProgress,start=cp?this.gates[cp].progress:0;
   const end=cp===3?this.track.length:this.gates[cp+1].progress;
   return clamp((projection.progress-start)/(end-start),0,1);
  }
  step(runner,previous,current,startTime,dt){
   if(runner.finished)return [];
   const projection=this.track.project(current.x,current.y);runner.trackProjection=projection;
   const allowed=this.physicalStep(runner,previous,current,dt),events=[];
   if(allowed){
    if(!runner.lapStarted){
     const contact=this.crossing(previous,current,this.gates[0]);
     if(contact){runner.lapStarted=true;events.push(this.log(runner,'START',startTime+contact.t*dt));}
    }else{
     const next=runner.checkpointProgress===3?this.gates[0]:this.gates[runner.checkpointProgress+1];
     const contact=this.crossing(previous,current,next);
     if(contact){
      const time=startTime+contact.t*dt;
      if(next.id==='FINISH'){
       runner.validatedLaps++;runner.checkpointProgress=0;runner.nextGate=1;runner.lapCrossings.push(time);
       events.push(this.log(runner,'LAP',time,{lap:runner.validatedLaps}));
       if(runner.validatedLaps===TOTAL_LAPS){
        runner.finished=true;runner.finishTime=time;runner.progress=TOTAL_LAPS*this.track.length;runner.segmentProgress=1;
        runner.setInput?.(0,0);events.push(this.log(runner,'FINISH',time,{lap:TOTAL_LAPS}));
       }
      }else{
       runner.checkpointProgress++;runner.nextGate=runner.checkpointProgress+1;
       runner.checkpointCrossings.push({checkpoint:runner.checkpointProgress,time,lap:runner.validatedLaps+1});
       events.push(this.log(runner,'CHECKPOINT',time,{checkpoint:runner.checkpointProgress,lap:runner.validatedLaps+1}));
      }
     }
    }
    if(!runner.finished&&projection.onTrack)runner.segmentProgress=this.fraction(runner,projection);
   }
   if(!runner.finished){
    const cp=runner.checkpointProgress,start=cp?this.gates[cp].progress:0;
    const end=cp===3?this.track.length:this.gates[cp+1].progress;
    runner.progress=runner.validatedLaps*this.track.length+start+runner.segmentProgress*(end-start);
   }
   return events;
  }
  compare(a,b){
   if(a.finished&&b.finished)return a.finishTime-b.finishTime;
   if(a.finished)return -1;if(b.finished)return 1;
   return b.validatedLaps-a.validatedLaps||b.checkpointProgress-a.checkpointProgress||b.segmentProgress-a.segmentProgress;
  }
  diagnostics(){return {totalLaps:TOTAL_LAPS,checkpointCount:3,gates:this.gates,events:this.events,
   model:'swept directed track crossings + ordered checkpoints + free terrain re-entry'};}
 }
 RaceLapSystem.TOTAL_LAPS=TOTAL_LAPS;window.RaceLapSystem=RaceLapSystem;
})();
