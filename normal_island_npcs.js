/* Approved static frontal NPCs only. Masters and completed islands are not replaced. */
(function(global){
 'use strict';
 const cache=new Map();
 const lines={
  tecnico_pingpong:{before:'Uma troca longa nasce do posicionamento. A bola acelera; acompanhe o quique, não apenas a raquete. Nosso Mestre transforma defesa em arte.',after:'Você sustentou o ritmo do Mestre! Seu aprendiz está estudando cada troca. Eu ainda gosto de uma defesa bem colocada.'},
  fa_basquete:{before:'As partidas deste Mestre enchem a arquibancada. A fotógrafa ali procura uma jogada que mereça a capa do festival.',during:'Já está aprendendo os truques da ilha? Aqui, uma cesta de três pode mudar tudo nos últimos segundos.',after:'Você superou o Mestre! Agora entendo por que todo mundo quer ver Zorpzin jogar.'},
  fa_corrida:{before:'A terceira volta revela quem guardou fôlego. As ultrapassagens na última curva sempre levantam a arquibancada.',during:'Cada posição conta. O treinador acompanha as voltas limpas; eu fico de olho nas disputas da reta final.',after:'Sua chegada entrou para a história da pista! Três voltas, muita disputa e uma medalha merecida.'},
  shapeiro_skate:{before:'Eu cuido dos shapes e dos rails. Cada rampa tem uma função; segurar Espaço é o compromisso com a linha, até na Mega Ramp.',during:'O skate aguenta pressão, mas uma boa linha vale mais que pressa. Nosso cinegrafista adora filmar a saída do grind.',after:'Esse shape voltou com história! Dominar a pista do Mestre exige conhecer cada rampa e respeitar a aterrissagem.'},
  aprendiz_arco:{before:'Ainda treino para acompanhar os alvos pequenos. O Mestre observa a correnteza antes de preparar cada flecha.',during:'Vi você testando posições na margem. O naturalista conhece bem os pássaros; os alvos ficam presos abaixo deles.',after:'Você venceu o Mestre! Vou tentar aprender com sua calma antes do disparo.'},
  pescador_surf:{before:'O vento empurra as cristas, mas a correnteza manda no ritmo. O salva-vidas conhece os trechos perigosos. E o Capitão sempre tem planos para depois do festival.',during:'Observe a espuma chegando por trás. O mar muda, e ganhar velocidade na descida ajuda mais que lutar contra a onda.',after:'Você leu o mar como quem nasceu aqui. O Capitão diz que a melhor parte da Terra começa depois dos desafios.'}
 };
 const medals={ILHA_PINGPONG:'pingpong',ILHA_BASQUETE:'basquete',ILHA_CORRIDA:'corrida',ILHA_SKATE:'skate',ILHA_ARCO:'arco',ILHA_SURF:'surf'};
 function create(){return Object.entries(global.NORMAL_NPC_GEOMETRY.sprites).map(([id,g])=>{
  let img=cache.get(g.source);if(!img){img=new Image();img.src=g.source+'?v=1.0.0_normal_npcs';cache.set(g.source,img);}
  return {id,scene:g.scene,x:g.x,y:g.y,img,spriteGeometry:g,tamanho:44,normalIslandNpc:true,
   interactionWidth:44,interactionHeight:48,interactionOffsetY:14,footprint:{width:18,height:8},
   msg:'> '+g.name.toUpperCase()+': '+(lines[id]?.before||'Tenho um desafio para você. Converse comigo para conhecer os detalhes.')};
 });}
 function interact(npc){
  const entry=lines[npc.id];if(!entry)return null;
  const medal=global.isMedalhaDesbloqueada(medals[npc.scene]);
  const progress=global.MEDALHAS_REGISTRY?.filter(m=>global.isMedalhaDesbloqueada(m.id)).length||0;
  return '> '+npc.spriteGeometry.name.toUpperCase()+': '+(medal?entry.after:progress>0&&entry.during?entry.during:entry.before);
 }
 global.NormalIslandNpcs=Object.freeze({create,interact,medals,counts:()=>({added:11,static:true,walkFrames:0})});
})(window);
