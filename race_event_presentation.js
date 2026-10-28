/* Canvas athletics venue. Static floor and spectator identities are built once. */
(function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
 const SKIN=['#f1c39c','#d69a6b','#a96c49','#704635','#e7b18e'];
 const ALIEN=['#80d67e','#85cbd3','#ba9bd9','#c3d47e'];
 const SHIRTS=['#df6750','#5c9cd0','#e7c56a','#a283c1','#57ad8a','#e5dbc4'];
 const HAIR=['#3d2c2b','#734738','#b68b50','#222f39'];
 const integer=(c,x,y,w,h)=>c.fillRect(Math.round(x),Math.round(y),w,h);
 class RaceEventPresentation {
  constructor(track){
   this.track=track;this.zoom=.72;this.ground=null;this.groundBuilds=0;
   this.halfW=Math.ceil(track.halfStraight+track.outerRadius+250);this.halfH=track.outerRadius+240;
   this.audio=null;this.noise=null;this.sections=[];this.people=[];this.reactions=[];
  }
  reset(seed=2026){
   let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
   this.sections=[];this.people=[];this.reactions=[];this.burst=0;this.lastLap=false;this.visibleSpectators=0;
   for(let i=0;i<16;i++){
    const progress=this.track.length*(i+.25)/16,center=this.track.pointOffset(progress,180);
    const section={progress,x:center.x,y:center.y,energy:0,lastPass:-10,people:[]};
    for(let row=3;row>=0;row--)for(let col=0;col<8;col++){
     const along=(col-3.5)*17+(random()-.5)*3,lateral=151+row*18+(random()-.5)*2;
     const point=this.track.pointOffset(progress+along,lateral),alien=random()<.33;
     const person={x:Math.round(point.x),y:Math.round(point.y),row,col,species:alien?'ALIEN':'HUMAN',
      skin:(alien?ALIEN:SKIN)[Math.floor(random()*(alien?ALIEN.length:SKIN.length))],
      shirt:SHIRTS[Math.floor(random()*SHIRTS.length)],hair:HAIR[Math.floor(random()*HAIR.length)],
      style:Math.floor(random()*4),height:14+Math.floor(random()*4)+(3-row),phase:random()*TAU,
      rhythm:.8+random()*.7,pose:Math.floor(random()*5),flag:random()<.07,antennae:random()<.5?1:2};
     section.people.push(person);this.people.push(person);
    }
    this.sections.push(section);
   }
   this.lastUpdate=0;this.banner=null;
  }
  cue(type){
   try{
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
    if(!this.audio)this.audio=new Context();const a=this.audio;
    if(a.state==='suspended'){a.resume().catch(()=>{});return;}
    if(a.state!=='running')return;
    const frequencies=type==='finish'?[660,880,1047]:type==='lastLap'?[784,988]:[523,660];
    frequencies.forEach((frequency,index)=>{
     const o=a.createOscillator(),g=a.createGain(),time=a.currentTime+index*.09;
     o.type='triangle';o.frequency.value=frequency;g.gain.setValueAtTime(.028,time);g.gain.exponentialRampToValueAtTime(.001,time+.12);
     o.connect(g);g.connect(a.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(time);o.stop(time+.14);
    });
    if(type==='lastLap'||type==='finish'){
     if(!this.noise){this.noise=a.createBuffer(1,Math.floor(a.sampleRate*.28),a.sampleRate);let n=17;const data=this.noise.getChannelData(0);
      for(let i=0;i<data.length;i++){n=(Math.imul(n,1664525)+1013904223)>>>0;data[i]=(n/4294967296*2-1)*.12;}}
     const source=a.createBufferSource(),gain=a.createGain(),filter=a.createBiquadFilter();source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=950;
     gain.gain.setValueAtTime(.16,a.currentTime);gain.gain.exponentialRampToValueAtTime(.001,a.currentTime+.28);
     source.connect(filter);filter.connect(gain);gain.connect(a.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();
    }
   }catch(_){/* Audio availability never changes the race or its clock. */}
  }
  react(type,runner,time){
   const strength={overtake:.55,lead:.85,lap:.65,lastLap:1,finish:1.25,start:.5}[type]||.4;
   this.burst=Math.max(this.burst,strength);
   this.reactions.push({type,runner:runner?.id,time});if(this.reactions.length>80)this.reactions.shift();
   if(type==='lastLap')this.lastLap=true;
   if(['lap','lastLap','finish','start'].includes(type))this.cue(type);
  }
  announce(text,color='#ffe4a0',duration=2){this.banner={text,color,timer:duration};}
  update(dt,game){
   this.burst=Math.max(0,this.burst-dt*.48);if(this.banner)this.banner.timer=Math.max(0,this.banner.timer-dt);
   this.lastUpdate-=dt;
   for(const s of this.sections)s.energy=Math.max(0,s.energy-dt*.7);
   if(this.lastUpdate>0)return;this.lastUpdate=.12;
   for(const s of this.sections){
    if(game.clock-s.lastPass<1.8)continue;
    if(game.runners.some(r=>!r.finished&&r.speed>45&&Math.hypot(r.x-s.x,r.y-s.y)<265)){
     s.energy=Math.max(s.energy,.65);s.lastPass=game.clock;
    }
   }
  }
  buildGround(){
   const t=this.track,c=document.createElement('canvas');c.width=this.halfW*2;c.height=this.halfH*2;
   const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.translate(this.halfW,this.halfH);
   g.fillStyle='#397348';g.fillRect(-this.halfW,-this.halfH,c.width,c.height);
   for(let y=-this.halfH;y<this.halfH;y+=40)for(let x=-this.halfW;x<this.halfW;x+=40){
    g.fillStyle=((Math.floor(x/40)+Math.floor(y/40))&1)?'#3c784b':'#397348';g.fillRect(x,y,40,40);
   }
   // Broad apron, running surface and clean lane paint. Drawn once, never stretched.
   t.drawPath(g,3.5,'#6c8d74',t.trackWidth+42);t.drawPath(g,3.5,'#ede3c3',t.trackWidth+12);
   t.drawPath(g,3.5,'#aa4938',t.trackWidth+3);
   for(let lane=0;lane<8;lane++)t.drawPath(g,lane,lane%2?'#bd5b43':'#c66649',t.laneWidth-1);
   for(let lane=-.5;lane<8;lane++)t.drawPath(g,lane,'#f8e8c9',1.5);
   for(let s=210;s<t.length;s+=310){
    const p=t.pointOffset(s,-t.halfTrackWidth-12),v=t.tangent(s);
    g.strokeStyle='#d9d4ac';g.lineWidth=2;g.beginPath();g.moveTo(p.x-v.x*6,p.y-v.y*6);g.lineTo(p.x+v.x*6,p.y+v.y*6);g.stroke();
   }
   // One painted finish plane, shared with the physical timing gate at progress 0.
   const p=t.point(0,3.5);g.fillStyle='#fff1d4';g.fillRect(Math.round(p.x)-9,Math.round(p.y)-t.halfTrackWidth,18,t.trackWidth);
   for(let row=0;row<40;row++)for(let col=0;col<3;col++)if((row+col)%2===0){g.fillStyle='#293945';g.fillRect(Math.round(p.x)-9+col*6,Math.round(p.y)-120+row*6,6,6);}
   g.font='bold 12px monospace';g.textAlign='center';
   for(let lane=0;lane<8;lane++){
    const q=t.point(-24,lane);g.fillStyle='#fff1d4';g.fillText(String(lane+1),Math.round(q.x)-5,Math.round(q.y)+4);
    g.fillRect(Math.round(q.x)-36,Math.round(q.y)-12,21,2);
   }
   // Low-key infield facilities: relief, equipment, officials and festival branding.
   g.fillStyle='#2f6243';g.fillRect(-520,-88,1040,176);g.strokeStyle='#7eae75';g.lineWidth=2;g.strokeRect(-508,-76,1016,152);
   g.fillStyle='#c5d48b';g.font='bold 26px monospace';g.fillText('ILHA DOS CAMPEÕES',0,0);
   g.font='bold 13px monospace';g.fillStyle='#8ebd91';g.fillText('FESTIVAL DE ATLETISMO',0,28);
   for(const [progress,label]of [[t.length*.12,'BARREIRAS'],[t.length*.36,'CONES'],[t.length*.56,'ÁGUA'],[t.length*.80,'MOVIMENTO']]){
    const q=t.pointOffset(progress,-t.halfTrackWidth-34);g.fillStyle='#315741';g.fillRect(Math.round(q.x)-46,Math.round(q.y)-14,92,19);
    g.fillStyle='#d9d5a8';g.font='bold 9px monospace';g.fillText(label,Math.round(q.x),Math.round(q.y)-2);
   }
   // Sections have concrete terraces and banners; all remain outside the lanes.
   for(let index=0;index<this.sections.length;index++){
    const section=this.sections[index],v=t.tangent(section.progress),n={x:-v.y,y:v.x};
    for(let row=3;row>=0;row--){
     const q=t.pointOffset(section.progress,151+row*18);
     g.strokeStyle=row%2?'#40556b':'#4c6174';g.lineWidth=18;g.beginPath();g.moveTo(q.x-v.x*76,q.y-v.y*76);g.lineTo(q.x+v.x*76,q.y+v.y*76);g.stroke();
    }
    const q=t.pointOffset(section.progress,137);g.strokeStyle=index%2?'#dbb965':'#65b3b1';g.lineWidth=6;g.beginPath();g.moveTo(q.x-v.x*78,q.y-v.y*78);g.lineTo(q.x+v.x*78,q.y+v.y*78);g.stroke();
   }
   this.ground=c;this.groundBuilds++;
  }
  drawGround(c){
   if(!this.ground)this.buildGround();
   c.drawImage(this.ground,-this.halfW,-this.halfH);
  }
  person(c,p,energy,time){
   const wave=Math.sin(time*p.rhythm*2.4+p.phase),active=energy+(this.lastLap?.13:0);
   const cheering=Math.sin(p.phase*1.3+time*.9)>1-active*.9;
   const hop=cheering?Math.max(0,Math.round(wave*2)):0,x=p.x,y=p.y-hop;
   const body=p.height-7,headY=y-p.height;
   c.fillStyle='#243e40';integer(c,x-4,p.y,9,2);
   c.fillStyle='#253b49';integer(c,x-3,y-3,2,3);integer(c,x+1,y-3,2,3);
   c.fillStyle=p.shirt;integer(c,x-4,y-body,8,body-3);
   c.fillStyle=p.skin;integer(c,x-3,headY,6,6);
   if(p.species==='ALIEN'){
    if(p.style%2){integer(c,x-4,headY+1,8,4);}
    c.fillStyle=p.skin;
    for(let i=0;i<p.antennae;i++){const offset=p.antennae===1?0:(i?2:-2);integer(c,x+offset,headY-3,1,3);integer(c,x+offset-1,headY-4,2,1);}
    c.fillStyle='#203348';integer(c,x-2,headY+2,1,p.style===2?2:1);integer(c,x+1,headY+2,1,p.style===2?2:1);
   }else{
    c.fillStyle=p.hair;integer(c,x-3,headY,6,p.style===2?3:2);
    if(p.style===1)integer(c,x-4,headY+2,2,4);
    if(p.style===3){c.fillStyle='#e3bd72';integer(c,x-4,headY,8,2);integer(c,x+2,headY+2,4,1);}
    if(p.row<2){c.fillStyle='#293547';integer(c,x-2,headY+3,1,1);integer(c,x+1,headY+3,1,1);}
   }
   const raised=cheering||p.pose===1&&wave>.9;
   c.fillStyle=p.skin;
   if(raised){integer(c,x-6,y-body-3,2,5);integer(c,x+4,y-body-4+(wave>0?0:1),2,5);}
   else if(p.pose===0&&wave>.1){integer(c,x-1,y-body+2,2,2);integer(c,x+1,y-body+3,2,2);}
   else{integer(c,x-6,y-body+1,2,5);integer(c,x+4,y-body+1,2,5);}
   if(p.flag){c.fillStyle='#b0ad82';integer(c,x+6,y-body-7,1,10);c.fillStyle=p.shirt;integer(c,x+7,y-body-7,5,3);}
  }
  drawCrowd(c,game){
   const halfW=canvas.width/(this.zoom*2)+110,halfH=canvas.height/(this.zoom*2)+110;
   this.visibleSpectators=0;
   for(const section of this.sections){
    if(Math.abs(section.x-game.camera.x)>halfW||Math.abs(section.y-game.camera.y)>halfH)continue;
    const energy=Math.max(section.energy,this.burst*.8);
    for(const person of section.people){this.person(c,person,energy,game.clock);this.visibleSpectators++;}
   }
  }
  flag(c,x,y,time,color){
   c.fillStyle='#294452';integer(c,x-2,y-61,4,61);c.fillStyle='#c4c8ae';integer(c,x-1,y-59,1,56);
   c.fillStyle=color;integer(c,x+2,y-58,14,9);integer(c,x+16,y-57+Math.round(Math.sin(time*2+x)*1),4,7);
  }
  drawStructures(c,game){
   const track=this.track;
   for(let i=0;i<16;i++){
    const s=track.length*(i+.73)/16,p=track.pointOffset(s,165);
    if(Math.abs(p.x-game.camera.x)>450||Math.abs(p.y-game.camera.y)>330)continue;
    this.flag(c,Math.round(p.x),Math.round(p.y),game.clock,i%2?'#e9c96d':'#6ac0c0');
    const q=track.pointOffset(s+95,171);c.fillStyle='#2c414b';integer(c,q.x-3,q.y-56,6,56);
    c.fillStyle='#c8c5a3';integer(c,q.x-12,q.y-61,24,8);c.fillStyle='#e7dfa7';integer(c,q.x-10,q.y-59,6,3);integer(c,q.x+3,q.y-59,6,3);
   }
   for(let i=0;i<this.sections.length;i++){
    const section=this.sections[i],tangent=track.tangent(section.progress),q=track.pointOffset(section.progress,138);
    if(Math.abs(tangent.x)<.9||Math.abs(q.x-game.camera.x)>380||Math.abs(q.y-game.camera.y)>260)continue;
    c.fillStyle='#234452';integer(c,q.x-56,q.y-7,112,13);c.fillStyle=i%2?'#e3cc88':'#9ad0ba';c.font='bold 8px monospace';c.textAlign='center';
    c.fillText(i%2?'ILHA DOS CAMPEÕES':'ATLETISMO • FESTIVAL',Math.round(q.x),Math.round(q.y)+2);
   }
   const finish=track.point(0,3.5);
   if(Math.hypot(finish.x-game.camera.x,finish.y-game.camera.y)<650){
    const x=Math.round(finish.x),inner=finish.y-track.halfTrackWidth-25,outer=finish.y+track.halfTrackWidth+37;
    this.flag(c,x+20,inner,game.clock,'#efcf72');this.flag(c,x+20,outer,game.clock,'#ed7860');
    c.fillStyle='#1c3442';integer(c,x-74,outer-27,113,24);c.fillStyle='#e5c678';integer(c,x-74,outer-27,113,3);
    c.fillStyle='#fae9bd';c.textAlign='center';c.font='bold 10px monospace';c.fillText('LARGADA / CHEGADA',x-17,outer-12);
    // Officials table, equipment boxes and a camera kept on the infield apron.
    c.fillStyle='#9b7950';integer(c,x+48,inner-3,38,12);c.fillStyle='#dfc28b';integer(c,x+46,inner-8,42,7);
    c.fillStyle='#e3c5a0';integer(c,x+61,inner-24,7,7);c.fillStyle='#f0e4c8';integer(c,x+59,inner-17,11,10);
    c.fillStyle='#273e49';integer(c,x-70,inner-42,20,11);integer(c,x-61,inner-30,3,22);integer(c,x-69,inner-8,19,3);
    c.fillStyle='#5f8d9c';integer(c,x-68,inner-40,7,5);
    c.fillStyle='#66795f';integer(c,x+93,inner-8,25,16);c.fillStyle='#cbb987';integer(c,x+95,inner-7,21,3);
    c.fillStyle='#29404c';integer(c,x+128,inner-43,3,36);integer(c,x+194,inner-43,3,36);integer(c,x+119,inner-69,87,32);
    c.fillStyle='#e6c16d';integer(c,x+120,inner-68,85,2);c.font='bold 8px monospace';c.fillText('MARATONA • 3 VOLTAS',x+162,inner-56);
    c.fillStyle='#9cdbc0';c.font='bold 12px monospace';c.fillText((game.player.finishTime??game.raceTime).toFixed(2)+'s',x+162,inner-42);
   }
  }
  drawHud(c,game){
   const player=game.player,place=game.currentRanking().indexOf(player)+1,lap=Math.min(3,player.validatedLaps+1);
   c.save();c.textBaseline='alphabetic';c.fillStyle='#142f3ce8';c.fillRect(7,7,111,49);c.fillRect(canvas.width-112,7,105,49);
   c.fillStyle='#6eaaa8';c.fillRect(7,7,111,2);c.fillStyle='#edc16c';c.fillRect(canvas.width-112,7,105,2);
   c.textAlign='left';c.font='bold 15px monospace';c.fillStyle='#f4e8c9';c.fillText(`${place}º / ${game.runners.length}`,15,27);
   c.font='bold 10px monospace';c.fillStyle='#8ed0bd';c.fillText(`VOLTA ${lap}/3`,15,43);
   for(let cp=0;cp<3;cp++){c.fillStyle=player.checkpointProgress>cp?'#e9cb79':'#395660';c.fillRect(83+cp*8,37,5,5);}
   const time=player.finishTime??game.raceTime,minutes=Math.floor(time/60),seconds=(time%60).toFixed(2).padStart(5,'0');
   c.textAlign='center';c.font='bold 9px monospace';c.fillStyle='#adcec7';c.fillText('TEMPO DE CORRIDA',canvas.width-60,23);
   c.font='bold 14px monospace';c.fillStyle='#f4e8c9';c.fillText(`${minutes}:${seconds}`,canvas.width-60,43);
   // A small stadium map reads curves and progress without covering the running lane.
   const mx=134,my=14,mw=canvas.width-268,mh=28,sx=(mw-8)/(2*(game.track.halfStraight+game.track.outerRadius));
   const sy=(mh-6)/(game.track.outerRadius*2),convert=p=>({x:mx+mw/2+p.x*sx,y:my+mh/2+p.y*sy});
   c.fillStyle='#16383de3';c.fillRect(mx-4,7,mw+8,49);c.strokeStyle='#77998a';c.lineWidth=2;c.beginPath();
   for(let i=0;i<=60;i++){const q=convert(game.track.point(game.track.length*i/60,3.5));if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);}c.closePath();c.stroke();
   for(const r of game.runners){if(r.isPlayer)continue;const q=convert(r);c.fillStyle=r.kind==='mestre'?'#f39166':'#8da7ba';integer(c,q.x-1,q.y-1,3,3);}
   const q=convert(player);c.fillStyle='#aeef72';integer(c,q.x-2,q.y-2,4,4);
   const f=convert(game.track.point(0,3.5));c.fillStyle='#fff0be';integer(c,f.x-1,f.y-3,1,6);
   c.font='bold 8px monospace';c.fillStyle='#c6d5b9';c.fillText(game.phase==='FINISHING'?'CHEGADA REGISTRADA':'ILHA DOS CAMPEÕES',mx+mw/2,49);
   if(this.banner?.timer>0&&game.phase!=='RESULT'){
    c.font='bold 12px monospace';const width=Math.min(canvas.width-40,c.measureText(this.banner.text).width+28),x=(canvas.width-width)/2;
    c.fillStyle='#16343de8';c.fillRect(Math.round(x),66,Math.round(width),23);c.fillStyle=this.banner.color;c.fillText(this.banner.text,canvas.width/2,82);
   }
   if(player.offTrack&&game.phase==='RACING'){c.fillStyle='#16343de8';c.fillRect(73,canvas.height-26,304,19);c.font='bold 9px monospace';c.fillStyle='#ffe194';c.fillText('FORA DA PISTA',canvas.width/2,canvas.height-13);}
   c.restore();
  }
  diagnostics(){return {spectators:this.people.length,humans:this.people.filter(p=>p.species==='HUMAN').length,
   aliens:this.people.filter(p=>p.species==='ALIEN').length,rows:4,sections:this.sections.length,visible:this.visibleSpectators,
   groundBuilds:this.groundBuilds,zoom:this.zoom,lastLap:this.lastLap,reactions:this.reactions};}
 }
 window.RaceEventPresentation=RaceEventPresentation;
})();
