/* Four original, authored chiptune arrangements. All sound is generated locally. */
(function(g){'use strict';
 const tracks=[
  {id:'market',name:'FEIRA VIAJANTE',style:'SWING DA FEIRA',bpm:108,meter:'4/4',stepsPerBar:8,swing:.18,lead:'triangle',cutoff:2600,
   roots:[48,45,50,43],chords:[[60,64,67],[57,60,64],[62,65,69],[59,62,67]],
   melody:[[0,64,1],[1,67,.7],[3,69,.8],[4,67,1.4],[6,64,.8],[7,62,.6],[8,60,1],[10,64,.8],[11,67,.7],[13,64,1],[14,60,1.2],[16,65,1],[17,69,.7],[19,72,.8],[20,69,1.4],[22,65,.8],[23,62,.7],[24,59,1],[26,62,1],[27,67,.7],[29,65,.7],[30,62,.7],[31,60,.7]],
   bass:[[0,0],[2,7],[4,12],[6,7]],kick:[0,4],snare:[2,6],hat:[1,3,5,7]},
  {id:'festival',name:'FESTIVAL DOS CAMPEÕES',style:'ARCADE EM MARCHA',bpm:136,meter:'4/4',stepsPerBar:8,swing:0,lead:'square',cutoff:2100,
   roots:[48,44,41,43],chords:[[60,63,67],[56,60,63],[53,56,60],[55,59,62]],
   melody:[[0,72,.75],[1,72,.75],[2,79,1.5],[4,75,.75],[5,74,.75],[6,72,1.4],[8,68,.75],[9,72,.75],[10,75,1.5],[12,79,.75],[14,80,1.4],[16,77,1.4],[18,75,.75],[19,72,.75],[20,68,1.5],[22,72,.75],[23,75,.75],[24,74,.75],[25,77,.75],[26,79,1.4],[28,74,.75],[29,71,.75],[30,72,1.5]],
   bass:[[0,0],[3,0],[4,7],[6,12]],kick:[0,3,4],snare:[2,6],hat:[0,1,2,3,4,5,6,7]},
  {id:'ocean',name:'BRISA DO ARQUIPÉLAGO',style:'BALANÇO DO MAR',bpm:82,meter:'6/8',stepsPerBar:6,swing:0,lead:'sine',cutoff:1800,
   roots:[45,50,43,48],chords:[[57,60,64],[57,62,65],[55,59,62],[55,60,64]],
   melody:[[0,69,2.5],[3,72,1],[4,71,1.6],[6,69,1],[7,65,1],[9,67,2.5],[12,71,2],[15,74,1],[16,72,1.5],[18,67,1],[20,64,1],[21,60,2.5]],
   bass:[[0,0],[3,7]],kick:[0],snare:[],hat:[1,2,4,5]},
  {id:'mountain',name:'TRILHA DA MONTANHA',style:'PASSOS NO CUME',bpm:94,meter:'3/4',stepsPerBar:6,swing:0,lead:'triangle',cutoff:1400,
   roots:[38,34,41,36],chords:[[62,65,69],[58,62,65],[60,65,69],[60,64,67]],
   melody:[[0,74,1.3],[2,69,.8],[4,65,1.5],[6,70,1.8],[9,69,.8],[10,65,1.3],[12,72,1.3],[14,77,.8],[16,76,1.5],[18,72,1.5],[21,69,.8],[22,74,1.5]],
   bass:[[0,0],[4,7]],kick:[0],snare:[],hat:[3]}
 ];
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
 freeze(tracks);
 let audio=null,master=null,noise=null,timer=null,playing=null,muted=false,world=true,blocked=false,step=0,nextAt=0;
 const voices=new Set(),volume=.58;
 const unlocked=()=>tracks.filter(t=>g.FestivalWallet?.commerce.heardTracks[t.id]);
 const owned=()=>g.FestivalWallet?.commerce.inventory?.jukebox===true||g.FestivalWallet?.commerce.purchasedItems?.jukebox===true;
 function destroy(v){voices.delete(v);for(const node of v.nodes){try{node.disconnect();}catch(_){}}}
 function halt(){if(timer!==null){g.clearInterval(timer);timer=null;}for(const v of [...voices]){try{v.source.stop();}catch(_){}destroy(v);}}
 function initAudio(){if(audio)return true;const Context=g.AudioContext||g.webkitAudioContext;if(!Context)return false;
  audio=new Context();master=audio.createGain();master.gain.value=muted?0:volume;master.connect(audio.destination);
  noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.16),audio.sampleRate);const data=noise.getChannelData(0);let seed=7419;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}return true;
 }
 function envelope(source,at,duration,amplitude,filter){if(voices.size>=64)return false;
  const gain=audio.createGain(),nodes=[source,gain];gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amplitude),at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  if(filter){const f=audio.createBiquadFilter();f.type=filter.type;f.frequency.value=filter.frequency;source.connect(f);f.connect(gain);nodes.push(f);}else source.connect(gain);
  gain.connect(master);const v={source,nodes};voices.add(v);source.onended=()=>destroy(v);source.start(at);source.stop(at+duration+.015);return true;
 }
 function note(midi,at,duration,amplitude,type='triangle',cutoff=2200){if(voices.size>=64)return;const o=audio.createOscillator();o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);envelope(o,at,Math.max(.04,duration),amplitude,{type:'lowpass',frequency:cutoff});}
 function drum(kind,at,level=1){if(voices.size>=64)return;
  if(kind==='kick'||kind==='tom'){const o=audio.createOscillator();o.type='sine';o.frequency.setValueAtTime(kind==='kick'?140:110,at);o.frequency.exponentialRampToValueAtTime(kind==='kick'?43:68,at+.13);envelope(o,at,.15,.11*level);}
  else{const s=audio.createBufferSource();s.buffer=noise;envelope(s,at,kind==='snare'?.11:.035,(kind==='snare'?.037:.012)*level,{type:'highpass',frequency:kind==='snare'?1300:6200});}
 }
 function arrange(track,index,at){const local=index%track.stepsPerBar,bar=Math.floor(index/track.stepsPerBar)%4,eighth=30/track.bpm,chord=track.chords[bar];
  for(const [s,m,d]of track.melody)if(s===index)note(m,at,d*eighth*.91,track.id==='festival'?.032:.068,track.lead,track.cutoff);
  for(const [s,offset]of track.bass)if(s===local)note(track.roots[bar]-12+offset,at,eighth*1.4,.068,'triangle',700);
  if(track.id==='market'&&local%2===1)for(const m of chord)note(m,at,eighth*.65,.017,'triangle',1700);
  if(track.id==='festival'&&local%2===0)for(const m of chord)note(m,at,eighth*.72,.009,'square',1300);
  if(track.id==='ocean')note(chord[local%3],at,eighth*1.75,.023,'sine',1500);
  if(track.id==='mountain'&&local%2===0)note(chord[(local/2)%3],at,eighth*.8,.028,'triangle',1100);
  if(track.kick.includes(local))drum('kick',at,track.id==='festival'?.9:track.id==='ocean'?.22:.48);
  if(track.snare.includes(local))drum('snare',at,track.id==='festival'?.8:.45);
  if(track.hat.includes(local))drum('hat',at,track.id==='ocean'?.35:track.id==='mountain'?.27:.7);
  if(track.id==='mountain'&&local===3)drum('tom',at,.28);
 }
 function schedule(){if(!playing||!world||blocked||!audio)return;const track=tracks.find(t=>t.id===playing);if(nextAt<audio.currentTime-.25)nextAt=audio.currentTime+.035;
  let count=0;while(nextAt<audio.currentTime+.14&&count++<8){arrange(track,step,nextAt);nextAt+=(30/track.bpm)*(1+(step%2===0?track.swing:-track.swing));step=(step+1)%(track.stepsPerBar*4);}
 }
 function start(){if(!playing||!world||blocked)return;try{if(!initAudio())return false;audio.resume().catch(()=>{});nextAt=audio.currentTime+.035;schedule();timer=g.setInterval(schedule,25);return true;}catch(_){halt();return false;}}
 function stop(){halt();playing=null;step=0;}
 function play(id){const track=unlocked().find(t=>t.id===id);if(!track||!owned())return false;halt();playing=id;step=0;
  if(!world||blocked)return true;if(start())return true;playing=null;return false;
 }
 function next(){if(!playing)return false;const list=unlocked();if(!list.length){stop();return false;}return play(list[(list.findIndex(t=>t.id===playing)+1)%list.length].id);}
 function setMuted(value){muted=!!value;if(master){master.gain.cancelScheduledValues(audio.currentTime);master.gain.setTargetAtTime(muted?0:volume,audio.currentTime,.012);}return muted;}
 function setContext(state){if(state.menu){stop();world=false;blocked=true;return;}const nextWorld=state.world===true,nextBlocked=state.blocked===true;
  if(world===nextWorld&&blocked===nextBlocked)return;world=nextWorld;blocked=nextBlocked;halt();if(playing&&world&&!blocked)start();
 }
 g.MerchantMusic=Object.freeze({tracks,play,next,stop,setMuted,toggleMute:()=>setMuted(!muted),setContext,
  snapshot:()=>{const t=tracks.find(t=>t.id===playing);return {playing,name:t?.name||'',style:t?.style||'',bpm:t?.bpm||0,meter:t?.meter||'',muted,paused:!!playing&&(!world||blocked),voices:voices.size};}});
})(window);
