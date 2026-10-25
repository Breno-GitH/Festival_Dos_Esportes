const fs=require('node:fs'),vm=require('node:vm');
function setup(seed=123,search=''){
 let state=seed;const math=Object.create(Math);math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const context=new Proxy({measureText:t=>({width:t.length*5})},{get:(o,k)=>k in o?o[k]:(()=>{})});
 const env={console,Math:math,URLSearchParams,performance:{now:()=>0},location:{search},document:{hidden:false},addEventListener(){},
  keys:{},archeryShootPressed:false,currentScene:'JOGO_ARCO',insignias:{},hintText:{},dialogText:{},
  canvas:{width:900,height:480,getContext:()=>context},ctx:context,Image:class{},
  archeryCharactersV2:{reset(){},shoot(){},miss(){},hit(){},goldenLost(){},draw(){},diagnostics:()=>({scale:.46})},
  ArcheryValley:{diagnostics:()=>({canvas:[900,480]})},archeryAssets:{diagnostics:()=>({})}};
 env.window=env;vm.createContext(env);
 for(const f of ['archery_field.js','archery_collision.js','archery_match_pacing.js','archery_golden_targets.js','archery_river_targets.js','archery_bird_targets.js','archery_explosive_targets.js','archery_master_ai.js','archery_player_control.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),env);
 const main=fs.readFileSync(__dirname+'/script.js','utf8');
 vm.runInContext(main.slice(main.indexOf('const ARCHERY_CONFIG ='),main.indexOf('// BASQUETE 1v1 —')),env);
 vm.runInContext('resetArco();beginArcoRound();',env);
 return {env,game:vm.runInContext('arcoGame',env),config:vm.runInContext('ARCHERY_CONFIG',env),run:code=>vm.runInContext(code,env),step:n=>{for(let i=0;i<n;i++)env.simulateArcoFrame();}};
}
module.exports={setup};
