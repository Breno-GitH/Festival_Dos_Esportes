const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=fs.existsSync(path.join(__dirname,'pingpong_ball.js'))?__dirname:'C:/xampp/htdocs/2025/Festival_Dos_Esportes';
function context(){
 const calls=[],stack=[];let smoothing=true;
 const c=new Proxy({calls,record:true,depth:0,save(){stack.push(smoothing);this.depth++;},restore(){assert.ok(this.depth>0);smoothing=stack.pop();this.depth--;},
 get imageSmoothingEnabled(){return smoothing;},set imageSmoothingEnabled(v){smoothing=v;}},{get(o,k){if(k in o)return o[k];return (...args)=>{if(o.record)calls.push({method:k,args,smoothing});};}});
 return c;
}
function setup(){
 const c=context(),layers=[];let randomCount=0,rng=517,t=0;
 const math=Object.create(Math);math.random=()=>{randomCount++;rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;};
 const env={console,Math:math,ctx:c,performance:{now:()=>t},canvas:{width:450,height:300},keys:{},hintText:{},dialogText:{},dialogBox:{classList:{add(){}}},
  currentScene:'JOGO_PINGPONG',insignias:{pingpong:false},PreGameBrief:{active:false},drawOverlayScreen(){},document:{createElement(){const l=context();layers.push(l);return {getContext:()=>l};}}};
 for(const name of ['imgZorpIdle','imgZorpMU','imgZorpMD','imgZorpHit','imgMestreIdle','imgMestreMU','imgMestreMD','imgMestreHit'])env[name]={complete:true,naturalWidth:80};
 env.window=env;vm.createContext(env);
 for(const name of ['pingpong_ball.js','pingpong_master_ai.js','pingpong_multiball.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,name),'utf8'),env);
 const source=fs.readFileSync(path.join(__dirname,'script.js'),'utf8');
 const court=source.slice(source.indexOf('const PINGPONG_COURT'),source.indexOf('// TELAS DE INTERFACE'));
 const core=source.slice(source.indexOf('function pingPongPaddle('),source.indexOf('// 6. DESENHO DAS ILHAS'));
 vm.runInContext(court+'\n'+core+'\nglobalThis.qa={game:pingPong,court:PINGPONG_COURT,update:updatePingPong,spawn:spawnPingPongBall,paddle:pingPongPaddle,finish:finishPingPongMatch,reset:resetPingPong};',env);
 for(const name of ['pingpong_pixel_font.js','pingpong_crowd.js','pingpong_arena_art.js','pingpong_feedback.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),env);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'pingpong_presentation.js'),'utf8'),env);
 const draw=source.slice(source.indexOf('function drawPingPongGame()'),source.indexOf('// 7.1. HUD compartilhado'));
 vm.runInContext(draw+'\nglobalThis.qa.draw=drawPingPongGame;',env);
 return {env,c,layers,a:env.qa,p:env.PingPongPresentation,randoms:()=>randomCount,tick:()=>t+=1000/60};
}
function freeze(v){if(v&&typeof v==='object'){Object.freeze(v);for(const c of Object.values(v))freeze(c);}return v;}


module.exports={setup,context,freeze};
