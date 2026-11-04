const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./map_backpack_harness.cjs');
const keys={up:'w',down:'s',left:'a',right:'d'},opposite={up:'down',down:'up',left:'right',right:'left'};
for(const id of ['HUB','ILHA_ESQUI','ILHA_ESCALADA','ILHA_SURF','ILHA_ARCO','ILHA_PINGPONG','ILHA_CORRIDA','ILHA_SKATE','ILHA_BASQUETE']){
 test(id+': every WASD move follows actual card coordinates, with no wrap or diagonal',()=>{
  const g=setup(),c=g.env.MerchantCatalog,current=c.regions.find(r=>r.id===id);
  for(const [dir,key]of Object.entries(keys)){
   const candidates=c.regions.filter(r=>dir==='up'?r.x===current.x&&r.y<current.y:dir==='down'?r.x===current.x&&r.y>current.y:dir==='left'?r.y===current.y&&r.x<current.x:r.y===current.y&&r.x>current.x)
    .sort((a,b)=>Math.hypot(a.x-current.x,a.y-current.y)-Math.hypot(b.x-current.x,b.y-current.y));
   const expected=candidates[0]?.id||id;
   assert.equal(c.mapNavigation[id][dir]||id,expected);
   if(expected!==id)assert.equal(c.mapNavigation[expected][opposite[dir]],id);
   g.m.open('map',{selected:c.regions.indexOf(current)});g.step(.2);g.tap(key);
   assert.equal(c.regions[g.m.snapshot().ui.selected].id,expected);
  }
 });
}
test('unknown cards participate without granting discovery, a medal or teleport permission',()=>{
 const g=setup(),before=JSON.stringify(g.w.campaignState());g.m.open('map');g.step(.2);g.tap('d');
 assert.equal(g.env.MerchantCatalog.regions[g.m.snapshot().ui.selected].id,'ILHA_PINGPONG');
 assert.equal(JSON.stringify(g.w.campaignState()),before);g.tap('e');assert.equal(g.m.snapshot().ui.mode,'map');
});
test('central W/S and A/D are reversible and the bottom edge keeps selection',()=>{
 const g=setup(),c=g.env.MerchantCatalog;g.m.open('map');g.step(.2);
 const id=()=>c.regions[g.m.snapshot().ui.selected].id;
 g.tap('w');assert.equal(id(),'ILHA_ESQUI');g.tap('s');assert.equal(id(),'HUB');g.tap('a');assert.equal(id(),'ILHA_ARCO');g.tap('d');assert.equal(id(),'HUB');g.tap('d');assert.equal(id(),'ILHA_PINGPONG');
 // Bottom-edge navigation has no wrap.
 g.m.open('map',{selected:0});g.step(.2);
 // Use the DOM event path through a normal tap to verify edges remain stable.
 g.tap('s');assert.equal(id(),'ILHA_SKATE');g.tap('s');assert.equal(id(),'ILHA_SKATE');
});
