/* All poses share one source-pixel scale and feet anchor. No animated dimensions. */
(function(g){'use strict';
 const image=new Image();image.src='merchant_walk_atlas.png?v=1';
 const atlas=g.MerchantAtlas,scale=atlas.scale;
 function create(x=342,y=111){return {x,y,direction:'down',state:'idle_down',clock:0,frame:0,moving:false,speed:40};}
 function pose(a,state,dt=0){if(a.state!==state){a.state=state;a.clock=0;}a.clock+=dt;
  const sequence=atlas.animations[state]||atlas.animations.idle_down;
  const fps=state.startsWith('walk_')?7:state.startsWith('idle_')?3.5:6;
  a.frame=sequence[Math.floor(a.clock*fps)%sequence.length];a.moving=state.startsWith('walk_');return a;
 }
 function move(a,target,dt){const dx=target[0]-a.x,dy=target[1]-a.y,d=Math.hypot(dx,dy),step=Math.min(d,a.speed*dt);
  if(d<.01){a.x=target[0];a.y=target[1];pose(a,'idle_'+a.direction,dt);return true;}
  a.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
  a.x+=dx/d*step;a.y+=dy/d*step;pose(a,'walk_'+a.direction,dt);return step===d;
 }
 function draw(ctx,a){if(!image.complete||!image.naturalWidth)return;
  const frame=atlas.frames[a.frame??0],r=frame.atlasRect;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#07182444';ctx.beginPath();ctx.ellipse(Math.round(a.x),Math.round(a.y-1),10,3,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(image,...r,Math.round(a.x-atlas.anchor[0]*scale),Math.round(a.y-atlas.anchor[1]*scale),r[2]*scale,r[3]*scale);ctx.restore();
 }
 g.MerchantAnimation=Object.freeze({image,scale,create,pose,move,draw,diagnostics:a=>({...a,scaleX:scale,scaleY:scale,anchor:'bottom-center',frames:50})});
})(window);
