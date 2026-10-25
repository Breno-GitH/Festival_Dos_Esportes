const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=fs.existsSync(path.join(__dirname,'pingpong_pixel_font.js'))?__dirname:'C:/xampp/htdocs/2025/Festival_Dos_Esportes';
function setup(storage={}){
 let now=0,scene='HUB',busy=false,free=true,fail=false,writes=0;const medals=new Set(),events={},draws=[];
 const ctx=new Proxy({measureText:s=>({width:s.length*6})},{get:(o,k)=>k in o?o[k]:(...a)=>draws.push([k,...a]),set:(o,k,v)=>(o[k]=v,true)}),canvas={width:450,height:300,getContext:()=>ctx};
 const dom={classList:{add(){},remove(){}},getContext:()=>ctx,setAttribute(){}};
 const env={console,Map,Set,Image:class{constructor(){this.complete=true;this.naturalWidth=1900;this.naturalHeight=950;}set src(v){this._src=v;}get src(){return this._src;}},performance:{now:()=>now},
  document:{hidden:false,createElement:()=>({...canvas}),getElementById:()=>dom},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{if(fail)throw Error('unavailable');storage[k]=v;writes++;}},
  addEventListener:(t,f)=>(events[t]??=[]).push(f),MEDALHAS_REGISTRY:['pingpong','basquete','corrida','skate','arco','escalada','boxe','surf'].map(id=>({id})),isMedalhaDesbloqueada:id=>medals.has(id)};env.window=env;vm.createContext(env);
 for(const f of ['merchant_config.js','festival_economy.js','festival_progress.js','merchant_atlas.js','merchant_animation.js','pingpong_pixel_font.js','festival_map_art.js','merchant_ui.js','merchant_campaign.js'])vm.runInContext(fs.readFileSync(path.join(fs.existsSync(path.join(__dirname,f))?__dirname:ROOT,f),'utf8'),env,{filename:f});
 env.AdventureIntro={endingSeen:false,drawParked(){}};env.RavokEvent={ravokArrivalSeen:false,ravokBadEndingSeen:false,ravokArrested:false,snapshot:()=>({arrivalSeen:env.RavokEvent.ravokArrivalSeen,arrested:env.RavokEvent.ravokArrested})};
 env.MerchantCampaign.init({ctx,canvas,scene:()=>scene,medalCount:()=>medals.size,busy:()=>busy,point:()=>({scene,x:225,y:225}),captureFrame:()=>canvas,captureHub:()=>canvas,clearInput(){},hideDialogue(){},restore:p=>scene=p.scene,hubActors:()=>[],nearShip:()=>false,landing:r=>free?{scene:r.id,x:r.fastTravelSpawn[0],y:r.fastTravelSpawn[1]}:null});
 const api={env,storage,medals,ctx,draws,w:env.FestivalWallet,m:env.MerchantCampaign,p:env.FestivalProgress,get writes(){return writes;},get scene(){return scene;},set scene(v){scene=v;},set busy(v){busy=v;},set free(v){free=v;},set fail(v){fail=v;},step(dt=.05){now+=dt*1000;return env.MerchantCampaign.update(scene,dt);},tap(key){for(const type of ['keydown','keyup'])for(const f of events[type]||[])f({key,repeat:false,preventDefault(){},stopImmediatePropagation(){}});},text(){const out=[];env.PingPongPixelFont={measure:s=>s.length*6,draw:(ctx,s)=>out.push(s)};return out;}};
 return api;
}
module.exports={setup};
