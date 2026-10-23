const {simulate}=require('../boxing_ai_harness.cjs'),fs=require('node:fs');
const rows=[];for(const policy of ['idle','guard','mash','competent','skilled'])for(let seed=1;seed<=12;seed++)rows.push(simulate(seed,policy));
const totals={};for(const policy of ['idle','guard','mash','competent','skilled']){
 const r=rows.filter(r=>r.policy===policy),sum=k=>r.reduce((a,x)=>a+(x.stats?.[k]||0),0);
 totals[policy]={fights:r.length,zorpWins:r.filter(x=>x.winner==='zorp').length,masterWins:r.filter(x=>x.winner==='master').length,
  unfinished:r.filter(x=>x.phase!=='RESULT').length,meanSeconds:+(r.reduce((a,x)=>a+x.seconds,0)/r.length).toFixed(1),
  jab:sum('jab'),cross:sum('cross'),guard:sum('guard'),dodge:sum('dodge'),special:sum('special'),whiffs:sum('whiffs'),dodged:sum('dodged'),hits:sum('hits'),interrupted:sum('interrupted'),
  minLag:Math.min(...r.map(x=>x.minLag)),maxLag:Math.max(...r.map(x=>x.maxLag))};
}
fs.writeFileSync(__dirname+'/../docs/qa/boxing_master_ai/simulation-results.json',JSON.stringify({totals,rows},null,2));console.log(JSON.stringify(totals,null,2));
