from pathlib import Path
from PIL import Image,ImageDraw
from collections import deque
import numpy as np,json,hashlib
R=Path(r'C:\xampp\htdocs\2025\Festival_Dos_Esportes');S=Path(__file__).parent
ROWS=[
 ('idle_down',(8,183),[(135,268),(274,404),(410,542)]),
 ('idle_up',(8,183),[(752,890),(891,1030),(1032,1172)]),
 ('idle_left',(186,349),[(134,262),(263,393),(394,524)]),
 ('idle_right',(186,349),[(763,902),(904,1040),(1040,1182)]),
 ('walk_down',(350,506),[(128,253),(254,370),(371,490),(491,618)]),
 ('walk_up',(350,506),[(751,863),(864,977),(978,1092),(1093,1228)]),
 ('walk_left',(508,664),[(126,251),(252,371),(372,488),(489,620)]),
 ('walk_right',(508,664),[(756,872),(873,985),(986,1100),(1101,1238)]),
 ('present',(670,850),[(140,278),(279,409),(410,536),(537,685)]),
 ('beckon',(670,850),[(808,948),(949,1080),(1081,1233)]),
 ('coins',(851,1026),[(135,270),(271,406),(407,539)]),
 ('bag',(851,1026),[(700,827),(828,950),(951,1081),(1082,1238)]),
 ('talk',(1030,1206),[(116,245),(245,359),(359,477)]),
 ('happy',(1030,1206),[(555,687),(688,800),(801,920)]),
 ('surprised',(1030,1206),[(1000,1125),(1126,1254)])]
def clean(px):
 rgb=px[:,:,:3];allowed=(rgb.max(2)<=14)|(px[:,:,3]<=8);h,w=allowed.shape
 seen=np.zeros((h,w),bool);q=deque()
 for x in range(w):
  for y in [0,h-1]:
   if allowed[y,x] and not seen[y,x]:seen[y,x]=True;q.append((x,y))
 for y in range(h):
  for x in [0,w-1]:
   if allowed[y,x] and not seen[y,x]:seen[y,x]=True;q.append((x,y))
 while q:
  x,y=q.popleft()
  for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
   if 0<=nx<w and 0<=ny<h and allowed[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
 px[:,:,3][seen]=0
 return px
def main():
 rgba=np.array(Image.open(R/'npc_comerciante.png').convert('RGBA'));atlas=Image.new('RGBA',(1900,950));frames={};allFrames=[]
 components=json.loads((S/'components.json').read_text());labels=np.load(S/'labels.npy');mainIds=[c[5] for c in components]
 groups=[(0,185,[('idle_down',3),('idle_up',3)]),(185,350,[('idle_left',3),('idle_right',3)]),
  (350,507,[('walk_down',4),('walk_up',4)]),(507,666,[('walk_left',4),('walk_right',4)]),
  (666,850,[('present',4),('beckon',3)]),(850,1027,[('coins',3),('bag',4)]),
  (1027,1210,[('talk',3),('happy',3),('surprised',2)])]
 measured=[]
 for low,high,animations in groups:
  row=sorted([c for c in components if low<=c[1]<high],key=lambda c:c[0]);cursor=0
  assert len(row)==sum(n for _,n in animations)
  for name,count in animations:
   for i in range(cursor,cursor+count):
    x0,y0,x1,y1,_,label=row[i]
    measured.append((name,max(0,x0-4),max(0,y0-3),min(1254,x1+4),min(1254,y1+3),label))
   cursor+=count
 for name,x0,y0,x1,y1,label in measured:
  if name not in frames:frames[name]=[]
  for _ in [0]:
   px=rgba[y0:y1,x0:x1].copy();local=labels[y0:y1,x0:x1];foreign=np.isin(local,[i for i in mainIds if i!=label]);px[:,:,3][foreign]=0
   px=clean(px);visible=px[:,:,3]>8;yy,xx=np.where(visible)
   a,b,c,d=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
   if a==0 or c==px.shape[1]:print('CHECK EDGE',name,len(frames[name]),[x0,y0,x1,y1],[a,b,c,d])
   # Bottom-most boots determine the anchor; poses keep their original pixel dimensions.
   feet=visible & (np.arange(visible.shape[0])[:,None]>=d-8);fy,fx=np.where(feet)
   ax=(float(fx.min())+float(fx.max())+1)/2;ay=float(fy.max()+1)
   sprite=Image.fromarray(px[b:d,a:c]);offset=(round(95-(ax-a)),round(184-(ay-b)))
   index=len(allFrames);sx=(index%10)*190;sy=(index//10)*190
   assert offset[0]>=0 and offset[1]>=0 and offset[0]+sprite.width<=190 and offset[1]+sprite.height<=190,(name,offset,sprite.size)
   atlas.alpha_composite(sprite,(sx+offset[0],sy+offset[1]))
   frame={'sourceRect':[x0+a,y0+b,c-a,d-b],'atlasRect':[sx,sy,190,190],'feet':[95,184],'bodySize':[c-a,d-b]}
   frames[name].append(index);allFrames.append(frame)
 scale=44/float(np.median([allFrames[i]['bodySize'][1] for i in frames['idle_down']]))
 data={'source':'npc_comerciante.png','sourceSize':[1254,1254],'sourceSHA256':hashlib.sha256((R/'npc_comerciante.png').read_bytes()).hexdigest(),'atlas':'merchant_walk_atlas.png','scale':scale,'anchor':[95,184],'frames':allFrames,'animations':frames,'walkFPS':7,'walkSpeed':40}
 atlas.save(S/'merchant_walk_atlas.png');(S/'merchant_atlas.json').write_text(json.dumps(data,indent=2),encoding='utf8');(S/'merchant_atlas.js').write_text('window.MerchantAtlas='+json.dumps(data,separators=(',',':'))+';\n',encoding='utf8')
 preview=Image.new('RGB',(950,475),'#325344');small=atlas.resize((950,475),Image.Resampling.NEAREST);preview.paste(small,(0,0),small);preview.save(S/'merchant-atlas-preview.png')
 print('Frames:',len(allFrames),'scale',scale)
if __name__=='__main__':main()
