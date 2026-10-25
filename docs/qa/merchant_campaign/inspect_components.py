from PIL import Image
import numpy as np
from collections import deque
from pathlib import Path
im=np.array(Image.open(r'C:\xampp\htdocs\2025\Festival_Dos_Esportes\npc_comerciante.png').convert('RGBA'));mask=(im[:,:,:3].max(2)>20)&(im[:,:,3]>8);seen=np.zeros(mask.shape,bool);labels=np.zeros(mask.shape,np.int32);out=[];h,w=mask.shape;serial=0
for y,x in zip(*np.where(mask)):
 if seen[y,x]:continue
 serial+=1;q=deque([(int(x),int(y))]);seen[y,x]=True;pts=[]
 while q:
  px,py=q.popleft();pts.append((px,py));labels[py,px]=serial
  for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
   if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
 if len(pts)>4500:
  xx,yy=zip(*pts);out.append([min(xx),min(yy),max(xx)+1,max(yy)+1,len(pts),serial])
print('count',len(out));print(out)
import json
(Path(__file__).parent/'components.json').write_text(json.dumps(out))
np.save(Path(__file__).parent/'labels.npy',labels)
