/* Small original synthesized themes. No external audio files or dependencies. */
(function(g){'use strict';
 const tracks=Object.freeze([{id:'market',name:'FEIRA VIAJANTE',notes:[60,64,67,69,67,64,62,60]},
  {id:'festival',name:'FESTIVAL DOS CAMPEÕES',notes:[60,67,72,71,67,64,65,67]},
  {id:'ocean',name:'BRISA DO ARQUIPÉLAGO',notes:[57,60,64,67,64,60,62,59]},
  {id:'mountain',name:'TRILHA DA MONTANHA',notes:[55,62,67,65,62,59,57,55]}].map(Object.freeze));
 let audio=null,timer=null,voices=new Set(),playing=null;
 function stop(){if(timer){clearInterval(timer);timer=null;}for(const o of voices){try{o.stop();}catch(_){}}voices.clear();playing=null;}
 function play(id){const track=tracks.find(t=>t.id===id);if(!track||!g.FestivalWallet.commerce.heardTracks[id])return false;
  stop();try{const Context=g.AudioContext||g.webkitAudioContext;if(!Context)return false;audio=audio||new Context();audio.resume().catch(()=>{});let phrase=0;playing=id;
   const schedule=()=>{if(voices.size>20)return;const start=audio.currentTime+.03;for(let i=0;i<track.notes.length;i++){
    const o=audio.createOscillator(),gain=audio.createGain(),t=start+i*.31;o.type='triangle';o.frequency.value=440*Math.pow(2,(track.notes[i]-69)/12);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.025,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+.26);o.connect(gain);gain.connect(audio.destination);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();gain.disconnect();};o.start(t);o.stop(t+.28);
   }phrase++;};schedule();timer=setInterval(schedule,2800);return true;
  }catch(_){stop();return false;}
 }
 g.MerchantMusic=Object.freeze({tracks,play,stop,snapshot:()=>({playing,voices:voices.size})});
})(window);
