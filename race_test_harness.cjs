const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=fs.existsSync(path.join(__dirname,'corrida_sprites'))?__dirname:'C:/xampp/htdocs/2025/Festival_Dos_Esportes';
function setup(search=''){
 let now=0;const listeners={},gradient={addColorStop(){}};
 const ctx=new Proxy({measureText:s=>({width:s.length*6}),createLinearGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const env={console,Math,URLSearchParams,Set,Map,Infinity,performance:{now:()=>now},location:{search},
  canvas:{width:450,height:300,dataset:{},getContext:()=>ctx},ctx,currentScene:'JOGO_CORRIDA',insignias:{corrida:false},hintText:{},dialogBox:{classList:{remove(){}}},
  document:{getElementById:()=>({style:{}}),createElement:()=>({width:0,height:0,getContext:()=>ctx})},
  addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn);},
  Image:class{constructor(){this.handlers={};this.complete=true;this.naturalWidth=8192;this.naturalHeight=8192;}addEventListener(t,f){this.handlers[t]=f;}set src(v){this._src=v;this.handlers.load?.();}get src(){return this._src;}}};
 env.window=env;vm.createContext(env);
 vm.runInContext(fs.readFileSync(ROOT+'/corrida_sprites/runtime/corrida_runners_manifest.js','utf8'),env);
 for(const file of ['race_lap_system.js','race_event_presentation.js','race_rival_events.js','corrida_maratona.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),env,{filename:file});
 return {env,game:env.corridaMaratona,listeners,tick(dt=1/60){now+=dt*1000;env.corridaMaratona.update();},step(n=1){for(let i=0;i<n;i++)env.corridaMaratona.advance(1/60);}};
}
module.exports={setup};
