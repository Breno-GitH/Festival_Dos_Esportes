/* The only price table. All goods are optional, permanent and non-consumable. */
(function(g){'use strict';
 const items=[
  {id:'island_map',name:'MAPA DAS ILHAS',price:15,type:'USABLE_INTERFACE',icon:'map',description:'Conheça as conexões do arquipélago. Atalho: M.'},
  {id:'teleporter',name:'TELETRANSPORTADOR PORTÁTIL',price:35,type:'USABLE_INTERFACE',icon:'portal',description:'Viaje apenas para ilhas que você já visitou.'},
  {id:'quest_scanner',name:'SCANNER DE MISSÕES',price:20,type:'PASSIVE_UPGRADE',icon:'scanner',description:'Adiciona ao mapa o status público das missões, sem revelar segredos.'},
  {id:'records',name:'MÓDULO DE RECORDES',price:15,type:'USABLE_INTERFACE',icon:'records',description:'Consulte seus melhores registros nas modalidades já jogadas.'},
  {id:'jukebox',name:'JUKEBOX DA NAVE',price:15,type:'LOCATION_UNLOCK',icon:'music',description:'Libera a jukebox na nave. Ouça os temas desbloqueados na viagem.'},
  {id:'destiny_letter',name:'CARTA DOS ÚLTIMOS DESTINOS',price:25,type:'USABLE_INTERFACE',icon:'letter',description:'Um mapa antigo do arquipélago coberto por marcas estranhas. Alguns caminhos parecem terminar onde outros começam.'},
  {id:'ship_customizer',name:'PERSONALIZADOR DA NAVE',price:20,type:'LOCATION_UNLOCK',icon:'ship',description:'Libera cores e pequenos detalhes visuais da nave. Sem efeitos na viagem.'}
 ];
 const regions=[
  {id:'HUB',name:'ILHA CENTRAL',x:0,y:0,spawn:[225,194]},
  {id:'ILHA_ESQUI',name:'BOXE',x:0,y:-1,spawn:[225,254],quest:'boxe_sem_quedas'},
  {id:'ILHA_PINGPONG',name:'PING-PONG',x:1,y:0,spawn:[36,148],quest:'pingpong_medalha'},
  {id:'ILHA_SURF',name:'SURF',x:1,y:-1,spawn:[225,254],quest:'surf_contra_corrente'},
  {id:'ILHA_SKATE',name:'SKATE',x:0,y:1,spawn:[225,40],quest:'skate_uma_tomada'},
  {id:'ILHA_BASQUETE',name:'BASQUETE',x:1,y:1,spawn:[36,148],quest:'basquete_foto_ano'},
  {id:'ILHA_CORRIDA',name:'MARATONA',x:-1,y:1,spawn:[408,148],quest:'corrida_volta_limpa'},
  {id:'ILHA_ARCO',name:'ARQUEARIA',x:-1,y:0,spawn:[408,148],quest:'arco_tres_vento'},
  {id:'ILHA_ESCALADA',name:'ESCALADA',x:-1,y:-1,spawn:[225,254],quest:'escalada_medalha'}
 ];
 const sports={JOGO_PINGPONG:'pingpong',JOGO_BASQUETE:'basquete',JOGO_CORRIDA:'corrida',JOGO_SKATE:'skate',JOGO_ARCO:'arco',JOGO_ESCALADA:'escalada',JOGO_BOXE:'boxe',JOGO_SURF:'surf'};
 const itemKeys=Object.freeze({island_map:'islandMap',teleporter:'teleporter',quest_scanner:'questScanner',records:'recordsModule',destiny_letter:'finalDestinationsChart',jukebox:'jukebox',ship_customizer:'shipCustomizer'});
 const regionDetails={
  HUB:{visitKey:'central',fastTravelSpawn:[225,225],icon:'central',accent:'#547f6a'},
  ILHA_PINGPONG:{visitKey:'pingpong',medal:'pingpong',fastTravelSpawn:[350,235],icon:'pingpong',accent:'#488a85'},
  ILHA_BASQUETE:{visitKey:'basketball',medal:'basquete',fastTravelSpawn:[225,220],icon:'basketball',accent:'#987249'},
  ILHA_CORRIDA:{visitKey:'running',medal:'corrida',fastTravelSpawn:[225,238],icon:'running',accent:'#6e8358'},
  ILHA_SKATE:{visitKey:'skate',medal:'skate',fastTravelSpawn:[245,230],icon:'skate',accent:'#637c8b'},
  ILHA_ARCO:{visitKey:'archery',medal:'arco',fastTravelSpawn:[226,231],icon:'archery',accent:'#6b8752'},
  ILHA_ESCALADA:{visitKey:'climbing',medal:'escalada',fastTravelSpawn:[225,238],icon:'climbing',accent:'#747f87'},
  ILHA_ESQUI:{visitKey:'boxing',medal:'boxe',fastTravelSpawn:[269,228],icon:'boxing',accent:'#8e625e'},
  ILHA_SURF:{visitKey:'surf',medal:'surf',fastTravelSpawn:[225,230],icon:'surf',accent:'#518f9b'}
 };
 for(const item of items)item.inventoryKey=itemKeys[item.id];
 for(const region of regions){Object.assign(region,regionDetails[region.id]);Object.freeze(region.fastTravelSpawn);}
 g.MerchantCatalog=Object.freeze({itemKeys,items:Object.freeze(items.map(Object.freeze)),regions:Object.freeze(regions.map(Object.freeze)),sports:Object.freeze(sports),
  styles:Object.freeze(['ORIGINAL','AURORA','SOLAR']),sign:Object.freeze(['ACEITAMOS ALIENS','SÓ NÃO ACEITAMOS','QUEM PAGA FIADO'])});
})(window);
