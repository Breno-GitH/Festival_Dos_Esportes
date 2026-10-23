const {spawnSync}=require('node:child_process');
for(const file of ['browser_accept_full.cjs','browser_arrest_full.cjs','browser_gateways.cjs']){
 const result=spawnSync(process.execPath,[file],{cwd:__dirname,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
