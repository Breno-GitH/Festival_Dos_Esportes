/* Pixel-only map symbols, deliberately quieter than the island names. */
(function(g){'use strict';
 function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
 function island(c,x,y,w,h,color){c.fillStyle=color;c.beginPath();c.moveTo(x+4,y);c.lineTo(x+w-4,y);c.lineTo(x+w,y+4);c.lineTo(x+w,y+h-4);c.lineTo(x+w-4,y+h);c.lineTo(x+4,y+h);c.lineTo(x,y+h-4);c.lineTo(x,y+4);c.closePath();c.fill();}
 function sport(c,id,x,y){
  if(id==='pingpong'){rect(c,x,y+3,7,6,'#e19c79');rect(c,x+3,y+8,2,3,'#d8c49c');rect(c,x+9,y,2,2,'#fff5c7');}
  else if(id==='basketball'){rect(c,x+1,y,9,11,'#de974c');rect(c,x,y+2,11,7,'#de974c');rect(c,x+5,y,1,11,'#684f3d');rect(c,x,y+5,11,1,'#684f3d');}
  else if(id==='running'){rect(c,x,y+7,11,3,'#efd17d');rect(c,x+2,y+3,6,4,'#d7e6cf');rect(c,x+5,y+2,3,2,'#9ed7cc');rect(c,x,y+10,11,1,'#314951');}
  else if(id==='skate'){rect(c,x,y+4,11,3,'#c2d6c7');rect(c,x+2,y+8,2,2,'#e9bd75');rect(c,x+8,y+8,2,2,'#e9bd75');}
  else if(id==='archery'){rect(c,x+1,y,9,11,'#e5dcc0');rect(c,x,y+1,11,9,'#e5dcc0');rect(c,x+2,y+2,7,7,'#c87d66');rect(c,x+4,y+4,3,3,'#eed88e');}
  else if(id==='climbing'){for(let i=0;i<6;i++)rect(c,x+5-i,y+2+i,1+i*2,1,'#c9d5d4');rect(c,x+4,y+2,3,2,'#fff0d3');rect(c,x,y+8,11,2,'#9dacb3');}
  else if(id==='boxing'){rect(c,x+2,y,7,3,'#d88073');rect(c,x,y+2,10,6,'#d88073');rect(c,x+3,y+8,6,3,'#edc58b');}
  else if(id==='surf'){rect(c,x+4,y+1,6,2,'#bce8dd');rect(c,x+1,y+3,7,2,'#8cd3d6');rect(c,x,y+5,4,3,'#8cd3d6');rect(c,x,y+8,11,2,'#8cd3d6');}
  else{rect(c,x,y+7,11,3,'#d4c892');rect(c,x+4,y+3,2,5,'#baa27b');rect(c,x+1,y+1,9,3,'#8bc48f');}
 }
 function check(c,x,y){rect(c,x,y+3,2,2,'#ffdf89');rect(c,x+2,y+5,2,2,'#ffdf89');rect(c,x+4,y+3,2,2,'#ffdf89');rect(c,x+6,y+1,2,2,'#ffdf89');}
 function shop(c,x,y){rect(c,x,y+3,10,7,'#c49b65');rect(c,x-1,y+1,12,3,'#e6cd89');rect(c,x+3,y+1,3,3,'#78baa5');rect(c,x+7,y+1,2,3,'#78baa5');rect(c,x+3,y+6,4,4,'#36524f');}
 function zorp(c,x,y,time=0){rect(c,x+3,y-3,1,4,'#a0db72');rect(c,x+6,y-4,1,4,'#a0db72');rect(c,x+1,y,8,6,'#91d46c');rect(c,x,y+1,10,4,'#91d46c');rect(c,x+2,y+2,2,2,'#193932');rect(c,x+6,y+2,2,2,'#193932');rect(c,x-3,y+2,2,1,'#eddb91');if(Math.floor(time*2)%2===0){rect(c,x-1,y-2,12,1,'#d8e6a1');rect(c,x-1,y+7,12,1,'#d8e6a1');}}
 g.FestivalMapArt=Object.freeze({island,sport,check,shop,zorp});
})(window);
