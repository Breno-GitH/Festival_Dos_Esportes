/* Bounded, physical rival events. No exclusive targeting of Zorp. */
(function(){
 'use strict';
 function contact(a,b,r){
  const dx=b.x-a.x,dy=b.y-a.y,A=dx*dx+dy*dy,C=a.x*a.x+a.y*a.y-r*r;
  if(C<=0)return 0;if(A<1e-10)return null;const B=2*(a.x*dx+a.y*dy),D=B*B-4*A*C;
  if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;
 }
 class RaceRivalEvents {
  constructor(){this.projectiles=[];this.pool=[];this.events=[];this.throwCooldown=4;this.bumpCooldown=3;this.throws=0;this.hits=0;this.bumps=0;}
  record(type,game,data){this.events.push({type,time:game.raceTime,...data});if(this.events.length>60)this.events.shift();}
  update(dt,game){
   this.throwCooldown=Math.max(0,this.throwCooldown-dt);this.bumpCooldown=Math.max(0,this.bumpCooldown-dt);
   const master=game.runners.find(r=>r.kind==='mestre');if(!master)return;
   if(!master.finished&&master.state!=='STUMBLE'){
    const tangent=game.track.tangent(master.trackProjection.progress);
    const nearby=game.runners.filter(r=>r!==master&&!r.finished).map(r=>{
     const dx=r.x-master.x,dy=r.y-master.y;return {r,ahead:dx*tangent.x+dy*tangent.y,side:dx*(-tangent.y)+dy*tangent.x,distance:Math.hypot(dx,dy)};
    });
    const throwAt=nearby.filter(t=>t.ahead>85&&t.ahead<245&&Math.abs(t.side)<48).sort((a,b)=>a.distance-b.distance)[0];
    if(throwAt&&this.throwCooldown<=0){
     const dx=throwAt.r.x-master.x,dy=throwAt.r.y-master.y,length=Math.hypot(dx,dy)||1,object=this.pool.pop()||{};
     Object.assign(object,{owner:master.id,x:master.x+dx/length*24,y:master.y+dy/length*24,z:24,vz:125,
      vx:dx/length*540+master.vx*.2,vy:dy/length*540+master.vy*.2,ttl:.85});
     this.projectiles.push(object);this.throwCooldown=6.5;this.throws++;this.record('THROW',game,{target:throwAt.r.id});
    }
    const bumpAt=nearby.filter(t=>t.distance<34&&t.ahead>-3&&t.ahead<33).sort((a,b)=>a.distance-b.distance)[0];
    if(bumpAt&&this.bumpCooldown<=0&&bumpAt.r.z<12){
     const victim=bumpAt.r;victim.lightSlip(.88);victim.vx+=tangent.x*16;victim.vy+=tangent.y*16;
     this.bumpCooldown=4.8;this.bumps++;this.record('BUMP',game,{victim:victim.id});
    }
   }
   for(let i=this.projectiles.length-1;i>=0;i--){
    const p=this.projectiles[i],old={x:p.x,y:p.y};p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=480*dt;p.ttl-=dt;
    let first=null;
    for(const r of game.runners){
     if(r.id===p.owner||r.finished||r.z>19||Math.abs(p.z-(r.z+20))>25)continue;
     const a={x:old.x-r.prevX,y:old.y-r.prevY},b={x:p.x-r.x,y:p.y-r.y},t=contact(a,b,r.collider.radius+6);
     if(t!==null&&(!first||t<first.t))first={t,r};
    }
    if(first){first.r.lightSlip(.78);this.hits++;this.record('OBJECT_HIT',game,{victim:first.r.id});p.ttl=0;
     if(first.r.isPlayer){game.impactFlash=5;game.obstacles.playerHitCount++;}game.obstacles.hitCount++;}
    if(p.ttl<=0||p.z<0){this.pool.push(this.projectiles.splice(i,1)[0]);}
   }
  }
  nearbyThreats(runner){
   if(runner.finished)return [];
   const forward=runner.trackProjection?.tangent||{x:1,y:0},side={x:-forward.y,y:forward.x};
   return this.projectiles.filter(p=>p.owner!==runner.id).map(p=>{
    const dx=p.x-runner.x,dy=p.y-runner.y;return {item:{...p,jumpable:true,size:[14,18]},ahead:Math.abs(dx*forward.x+dy*forward.y),lateral:dx*side.x+dy*side.y,distance:Math.hypot(dx,dy)};
   }).filter(t=>t.distance<160&&Math.abs(t.lateral)<42).sort((a,b)=>a.distance-b.distance);
  }
  draw(c,game){
   for(const p of this.projectiles){
    c.fillStyle='#28484066';c.fillRect(Math.round(p.x)-4,Math.round(p.y),8,2);
    game.atlas.drawObstacle(c,'bottle',Math.round(p.x),Math.round(p.y-p.z),13,18);
   }
  }
  diagnostics(){return {throws:this.throws,hits:this.hits,bumps:this.bumps,throwCooldown:this.throwCooldown,bumpCooldown:this.bumpCooldown,
   activeObjects:this.projectiles.length,events:this.events};}
 }
 window.RaceRivalEvents=RaceRivalEvents;
})();
