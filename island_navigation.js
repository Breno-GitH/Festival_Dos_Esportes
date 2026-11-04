/* Physical wayfinding and the map share the same tiny sport pictograms. */
(function(g){'use strict';
 const routes=Object.freeze({
  HUB:{n:'ILHA_ESQUI',e:'ILHA_PINGPONG',s:'ILHA_SKATE',w:'ILHA_ARCO'},
  ILHA_ESQUI:{s:'HUB'},ILHA_PINGPONG:{w:'HUB',n:'ILHA_SURF'},
  ILHA_SURF:{s:'ILHA_PINGPONG'},ILHA_SKATE:{n:'HUB',w:'ILHA_CORRIDA',e:'ILHA_BASQUETE'},
  ILHA_BASQUETE:{w:'ILHA_SKATE'},ILHA_CORRIDA:{e:'ILHA_SKATE'},
  ILHA_ARCO:{e:'HUB',n:'ILHA_ESCALADA'},ILHA_ESCALADA:{s:'ILHA_ARCO'}
 });Object.values(routes).forEach(Object.freeze);
 const positions=Object.freeze({n:[264,81],e:[385,150],s:[267,259],w:[65,120]});
 const scenePositions=Object.freeze({ILHA_PINGPONG:{n:[310,60]}});
 const signPos=(scene,dir)=>scenePositions[scene]?.[dir]||positions[dir];
 const colors={central:'#b8bc83',pingpong:'#d26e66',basketball:'#e39a50',running:'#85bd79',skate:'#af8acb',archery:'#c2ce79',climbing:'#c58d61',boxing:'#b66560',surf:'#78bfce'};
 let cfg=null,entry=null,last=0;
 const region=id=>g.MerchantCatalog.regions.find(r=>r.id===id);
 const name=id=>id==='HUB'?'ILHA CENTRAL':id==='ILHA_CORRIDA'?'ILHA DA MARATONA':id==='ILHA_PINGPONG'?'ILHA DO PING-PONG':id==='ILHA_ESQUI'?'ILHA DO BOXE':id==='ILHA_ARCO'?'ILHA DA ARQUEARIA':id==='ILHA_ESCALADA'?'ILHA DA ESCALADA':id==='ILHA_BASQUETE'?'ILHA DO BASQUETE':id==='ILHA_SKATE'?'ILHA DO SKATE':'ILHA DO SURF';
 const signs=scene=>Object.entries(routes[scene]||{}).map(([direction,destination])=>{const [x,y]=signPos(scene,direction);return {direction,destination,x,y,icon:region(destination)?.icon};});
 function discover(scene){if(scene==='HUB'||!routes[scene])return;entry={scene,left:1.8};last=performance.now();}
 function update(){const t=performance.now(),dt=Math.max(0,Math.min(.05,(t-last)/1000));last=t;
  if(entry&&entry.scene!==cfg.scene())entry=null;
  if(entry&&!cfg.busy()){entry.left-=dt;if(entry.left<=0)entry=null;}
 }
 function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
 function arrow(c,x,y,d){const vector={n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]}[d];
  for(let i=-3;i<=3;i++)rect(c,x+vector[0]*i,y+vector[1]*i,1,1,'#f4e4b2');
  for(let i=1;i<=3;i++)for(const side of [-1,1])rect(c,x+vector[0]*(3-i)+vector[1]*i*side,y+vector[1]*(3-i)-vector[0]*i*side,1,1,'#f4e4b2');
 }
 function drawWorld(c,scene){c.save();c.imageSmoothingEnabled=false;
  for(const s of signs(scene)){
   const {x,y}=s,color=colors[s.icon]||colors.central;
   rect(c,x-12,y+4,30,3,'rgba(12,30,32,.24)');rect(c,x-2,y-2,4,9,'#73543c');rect(c,x-1,y-1,1,7,'#b18b59');
   rect(c,x-22,y-19,44,20,'#654c35');rect(c,x-22,y-19,44,2,'#c5a779');rect(c,x-20,y-16,40,14,'#243e40');
   rect(c,x-20,y-16,2,14,color);rect(c,x+18,y-16,2,14,color);
   const left=s.direction==='w';g.FestivalMapArt.sport(c,s.icon,x+(left?3:-14),y-15);arrow(c,x+(left?-11:11),y-9,s.direction);
   rect(c,x-20,y-18,1,1,'#e5d3a0');rect(c,x+19,y-18,1,1,'#e5d3a0');
  }c.restore();
 }
 function draw(c){if(!cfg||cfg.busy())return;const scene=cfg.scene();if(!routes[scene])return;
  c.save();c.imageSmoothingEnabled=false;c.textAlign='center';
  if(entry?.scene===scene){
   const w=246,x=(450-w)/2;rect(c,x,56,w,35,'#142d36ef');rect(c,x,56,2,35,colors[region(scene).icon]);
   c.save();c.translate(x+12,62);c.scale(2,2);g.FestivalMapArt.sport(c,region(scene).icon,0,0);c.restore();
   c.fillStyle='#f4e6c3';c.font='bold 11px monospace';c.fillText(name(scene),238,77);
  }else{
   const p=cfg.player,s=signs(scene).find(s=>Math.hypot(p.x-s.x,p.y-s.y)<39);
   if(s){const title=name(s.destination);c.font='bold 10px monospace';const w=Math.ceil(c.measureText(title).width)+24;
    rect(c,225-w/2,248,w,20,'#18323beF');rect(c,225-w/2,248,w,1,'#bca472');c.fillStyle='#f0e1b9';c.fillText(title,225,262);}
  }c.restore();
 }
 g.IslandNavigation=Object.freeze({routes,signs,name,init(c){cfg=c;last=performance.now();},discover,update,drawWorld,draw,
  get identifying(){return !!entry&&entry.scene===cfg?.scene();},snapshot:()=>({entry:entry?{...entry}:null,signs:cfg?signs(cfg.scene()):[]})});
})(window);
