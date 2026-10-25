(function(g){'use strict';
 function text(ctx,value,x,y,opt={}){const s=opt.scale||1,color=opt.color||'#f6e3b9',raw=String(value),width=g.PingPongPixelFont.measure(raw,s);
  g.PingPongPixelFont.draw(ctx,raw,Math.round(x),Math.round(y),{scale:s,color,align:opt.align||'left'});
  if(opt.accents!==false){let origin=Math.round(x)-(opt.align==='center'?width/2:opt.align==='right'?width:0);ctx.save();ctx.fillStyle=color;
   for(const c of [...raw.toUpperCase()]){const xx=Math.round(origin);if('ÁÉÍÓÚ'.includes(c)){ctx.fillRect(xx+2*s,y-2*s,s,s);ctx.fillRect(xx+3*s,y-3*s,s,s);}if('ÃÕ'.includes(c)){ctx.fillRect(xx+s,y-2*s,s,s);ctx.fillRect(xx+2*s,y-3*s,s,s);ctx.fillRect(xx+3*s,y-2*s,s,s);}if(c==='Ç')ctx.fillRect(xx+2*s,y+8*s,s,s);origin+=(c===' '?4:6)*s;}
   ctx.restore();}
 }
 function wrap(ctx,value,x,y,width,opt={}){let line='',yy=y;const lineHeight=opt.lineHeight||12;
  for(const word of String(value).split(' ')){const next=line?line+' '+word:word;if(g.PingPongPixelFont.measure(next,opt.scale||1)>width&&line){text(ctx,line,x,yy,opt);yy+=lineHeight;line=word;}else line=next;}if(line)text(ctx,line,x,yy,opt);return yy+lineHeight;
 }
 function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 function panel(ctx,title,sub=''){rect(ctx,0,0,450,300,'#07131ccc');rect(ctx,17,14,416,273,'#172b37');rect(ctx,20,17,410,267,'#d3ad6a');rect(ctx,22,19,406,263,'#10232e');rect(ctx,26,23,398,37,'#254449');rect(ctx,26,60,398,1,'#6a8d83');text(ctx,title,35,34,{scale:2});if(sub)text(ctx,sub,35,66,{color:'#afd0bf'});}
 function footer(ctx,label='[W/S] ESCOLHER  [E/ESPAÇO] USAR  [B/ESC] FECHAR'){rect(ctx,26,266,398,14,'#233e43');text(ctx,label,225,270,{align:'center',color:'#d8e7c8'});}
 function icon(ctx,id,x,y){ctx.save();const colors={map:'#b7d6b7',portal:'#84d5e7',scanner:'#8fe2ac',records:'#f2cb77',music:'#cda3e4',letter:'#d0b88c',ship:'#85cfc5'};rect(ctx,x,y,13,13,'#203a45');rect(ctx,x+2,y+2,9,9,colors[id]||'#c5bea5');ctx.fillStyle='#20313b';
  if(id==='map'||id==='letter'){ctx.fillRect(x+5,y+2,1,9);ctx.fillRect(x+8,y+2,1,9);if(id==='letter')ctx.fillRect(x+3,y+6,7,1);}
  else if(id==='portal'){ctx.fillRect(x+4,y+4,5,5);ctx.fillRect(x+6,y+1,1,11);}
  else if(id==='music'){ctx.fillRect(x+5,y+3,2,6);ctx.fillRect(x+5,y+3,5,2);ctx.fillRect(x+3,y+8,4,2);}
  else if(id==='records'){ctx.fillRect(x+3,y+7,2,4);ctx.fillRect(x+6,y+4,2,7);ctx.fillRect(x+9,y+2,2,9);}
  else if(id==='scanner'){ctx.fillRect(x+4,y+4,5,5);ctx.fillRect(x+6,y+1,1,11);ctx.fillRect(x+1,y+6,11,1);}
  else{ctx.fillRect(x+3,y+8,7,2);ctx.fillRect(x+4,y+4,5,3);}ctx.restore();
 }
 function dialogue(ctx,speaker,body,prompt=true){rect(ctx,23,231,404,53,'#10212ff5');rect(ctx,23,231,3,53,'#e0ba75');text(ctx,speaker,34,237,{color:'#f7d590'});wrap(ctx,body,34,250,382,{color:'#edf0d1'});if(prompt)text(ctx,'[ESPAÇO]',413,275,{align:'right',color:'#9fbeb5'});}
 function drawMap(ctx,ui,env){
  const data=env.data,regions=ui.mode==='teleport'?env.regions.filter(r=>data.visitedIslands[r.id]):env.regions;
  const selected=regions[ui.selected],states=env.mapState||[],art=g.FestivalMapArt;
  panel(ctx,ui.mode==='teleport'?'TELETRANSPORTADOR':'MAPA DAS ILHAS','CAMINHOS DO ARQUIPÉLAGO');
  const positions={};for(const r of env.regions)positions[r.id]=[225+r.x*119,149+r.y*57];
  ctx.strokeStyle='#416676';ctx.lineWidth=3;
  for(const[a,b]of [['HUB','ILHA_ESQUI'],['HUB','ILHA_PINGPONG'],['HUB','ILHA_SKATE'],['HUB','ILHA_ARCO'],['ILHA_PINGPONG','ILHA_SURF'],['ILHA_SKATE','ILHA_CORRIDA'],['ILHA_SKATE','ILHA_BASQUETE'],['ILHA_ARCO','ILHA_ESCALADA']]){ctx.beginPath();ctx.moveTo(...positions[a]);ctx.lineTo(...positions[b]);ctx.stroke();}
  for(const r of env.regions){const[x,y]=positions[r.id],state=states.find(s=>s.id===r.id)||{visited:!!data.visitedIslands[r.id],medal:false,current:r.id===env.currentScene},visited=state.visited;
   art.island(ctx,x-52,y-20,104,40,selected?.id===r.id?'#e0c17e':'#365665');
   art.island(ctx,x-50,y-18,100,36,visited?r.accent:'#1d303b');
   text(ctx,visited?r.name:'???',x,y-12,{align:'center',color:visited?'#fff0c3':'#78939b'});
   if(visited){art.sport(ctx,r.icon,x-43,y+2);text(ctx,'VISITOU',x-2,y+5,{align:'center',color:'#d0e2cd'});if(state.medal)art.check(ctx,x+36,y+3);if(state.store)art.shop(ctx,x+35,y+1);}
   if(state.current)art.zorp(ctx,x+54,y-13,ui.time||0);
  }
  const current=env.regions.find(r=>r.id===env.currentScene);
  text(ctx,'VOCÊ ESTÁ AQUI: '+(current?.name||'ILHA CENTRAL'),225,231,{align:'center',color:'#c8e8a6'});
  const r=selected,state=r&&states.find(s=>s.id===r.id);
  const visited=state?.visited??!!data.visitedIslands[r?.id];
  text(ctx,!visited?'REGIÃO NÃO EXPLORADA':r.name+' - '+(state?.medal?'VENCEU O MESTRE':'VISITADA'),225,243,{align:'center',color:'#f5d48e'});
  if(visited&&env.owns('quest_scanner')&&state?.questStatus)text(ctx,state.questStatus,225,255,{align:'center',color:'#b9dec9'});
  footer(ctx,env.owns('teleporter')?'[W/S] ESCOLHER [E/ESPAÇO] VIAJAR [B/ESC] FECHAR':'[W/S] CONSULTAR  [B/ESC] FECHAR');
 }
 function draw(ctx,ui,env){ctx.save();ctx.imageSmoothingEnabled=false;
  if(ui.mode==='travel'){rect(ctx,0,0,450,300,'rgba(4,14,27,'+(ui.time<.4?ui.time/.4:1-(ui.time-.4)/.4)+')');ctx.restore();return;}
  if(['map','teleport'].includes(ui.mode)){drawMap(ctx,ui,env);ctx.restore();return;}
  const titles={talk:'COMERCIANTE VIAJANTE',shop:'FEIRA INTERPLANETÁRIA',backpack:'MOCHILA DO ZORP',records:'MÓDULO DE RECORDES',letter:'CARTA DOS ÚLTIMOS DESTINOS',ship:'EQUIPAMENTOS DA NAVE',customizer:'PERSONALIZADOR DA NAVE',jukebox:'JUKEBOX DA NAVE',buy_confirm:'CONFIRMAR COMPRA',travel_confirm:'CONFIRMAR VIAGEM',info:ui.title||'MOCHILA'};
  panel(ctx,titles[ui.mode]||'MOCHILA',ui.mode==='shop'?'MOEDAS: '+env.coins:'ILHA DOS CAMPEÕES');
  if(ui.mode==='talk'){
   wrap(ctx,ui.text,35,87,375,{lineHeight:15});env.list.forEach((v,i)=>{rect(ctx,45,202+i*25,360,20,i===ui.selected?'#46635a':'#243f47');text(ctx,v,57,209+i*25);});
  }else if(['shop','backpack'].includes(ui.mode)){
   if(!env.list.length)wrap(ctx,'Sua mochila ainda está vazia. O Comerciante aparece depois de sua primeira medalha.',42,105,365,{lineHeight:16});
   env.list.forEach((item,i)=>{const y=85+i*19;rect(ctx,31,y-3,388,18,i===ui.selected?'#3b5f58':'#19313b');icon(ctx,item.icon,37,y-1);text(ctx,item.name,58,y+2,{color:i===ui.selected?'#fff1bd':'#c5d9c4'});text(ctx,ui.mode==='shop'?(env.owns(item.id)?'ADQUIRIDO':item.price+' M'):item.type==='PASSIVE_UPGRADE'?'ATIVO':item.type==='LOCATION_UNLOCK'?'NA NAVE':'USAR',410,y+2,{align:'right',color:'#e5c77f'});});
   const item=env.list[ui.selected];if(item){rect(ctx,31,219,388,42,'#19313b');wrap(ctx,ui.note||item.description,38,226,373,{lineHeight:11,color:ui.note?'#f2d297':'#bfd5c0'});}
  }else if(['buy_confirm','travel_confirm'].includes(ui.mode)){
   const item=env.items.find(i=>i.id===ui.itemId),region=env.regions.find(r=>r.id===ui.destination);
   wrap(ctx,ui.mode==='buy_confirm'?item.name+' - '+item.price+' MOEDAS':'VIAJAR PARA ESTA ILHA?',45,99,360,{lineHeight:16});
   if(region)text(ctx,region.name,45,126,{color:'#e9d394'});
   if(item)wrap(ctx,item.description,45,137,360,{lineHeight:14,color:'#b8cfbe'});
   env.list.forEach((v,i)=>{rect(ctx,85+i*151,218,133,23,i===ui.selected?'#4b7060':'#263d47');text(ctx,v,151+i*151,226,{align:'center'});});
  }else if(ui.mode==='records'){
   const names={pingpong:'PING-PONG',basquete:'BASQUETE',corrida:'MARATONA',skate:'SKATE',arco:'ARQUEARIA',escalada:'ESCALADA',boxe:'BOXE',surf:'SURF'};let y=89;
   for(const [id,name]of Object.entries(names)){if(!env.data.playedSports[id])continue;const r=env.data.records[id];text(ctx,name,40,y);text(ctx,r?Math.round(r.best*100)/100+' '+r.unit:'SEM REGISTRO SALVO',409,y,{align:'right',color:'#a9d5bf'});y+=20;}
   if(y===89)wrap(ctx,'Nenhuma modalidade jogada ainda. Os registros começam quando você inicia uma partida.',40,110,365,{lineHeight:16});
  }else if(ui.mode==='letter'){
   rect(ctx,33,83,384,174,'#b7aa80');ctx.strokeStyle='#675b48';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(77,116);ctx.lineTo(119,184);ctx.lineTo(79,232);ctx.stroke();
   const hints=[['ILHA CENTRAL','O caminho de quem termina aquilo que começou.'],['ILHA DO SURF','Nem toda viagem de volta precisa começar imediatamente.'],['ILHA DA ESCALADA','Alguns caminhos não deveriam ser seguidos.']];
   hints.forEach(([name,hint],i)=>{const y=97+i*53,key=['central','surf','climbing'][i],found=env.destinations?.[key]===true;
    const opacity=(found||env.medalCount>=8)?1:((i===2&&env.ravokArrived===true)?0.85:(env.medalCount>=4?0.6:0.32));
    ctx.save();ctx.globalAlpha=opacity;rect(ctx,49,y+9,24,13,'#4f6e61');text(ctx,'X',61,y+12,{align:'center',color:'#8c423f'});ctx.restore();
    text(ctx,name,89,y,{color:'#3d342a'});wrap(ctx,hint,89,y+15,310,{color:'#3e3d31',lineHeight:12});
    if(found)text(ctx,'Destino encontrado.',89,y+42,{color:'#405849'});
   });
  }else if(ui.mode==='info'){wrap(ctx,ui.text,39,100,370,{lineHeight:16});}
  else{env.list.forEach((item,i)=>{const value=typeof item==='string'?item:item.name;rect(ctx,36,91+i*29,378,23,i===ui.selected?'#406153':'#1a343e');text(ctx,value,46,99+i*29);});if(ui.mode==='customizer')text(ctx,'APLICADO: '+env.data.shipStyle,42,215,{color:'#d8ce9e'});if(ui.mode==='jukebox')text(ctx,'TEMAS DESBLOQUEADOS PELAS SUAS VISITAS',42,215,{color:'#a9cabb'});if(ui.note)wrap(ctx,ui.note,42,237,365,{lineHeight:12});}
  footer(ctx);ctx.restore();
 }
 g.MerchantUI=Object.freeze({text,wrap,icon,dialogue,draw});
})(window);
