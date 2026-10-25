from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np, json, hashlib
from collections import deque
class ndimage:
 @staticmethod
 def label(mask):
  h,w=mask.shape;lab=np.zeros((h,w),np.int32);n=0
  for y,x in zip(*np.where(mask)):
   if lab[y,x]:continue
   n+=1;lab[y,x]=n;q=deque([(int(x),int(y))])
   while q:
    px,py=q.popleft()
    for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
     if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not lab[ny,nx]:lab[ny,nx]=n;q.append((nx,ny))
  return lab,n
 @staticmethod
 def find_objects(lab):
  result=[]
  for i in range(1,int(lab.max())+1):
   ys,xs=np.where(lab==i);result.append((slice(int(ys.min()),int(ys.max())+1),slice(int(xs.min()),int(xs.max())+1)))
  return result
 @staticmethod
 def binary_propagation(seeds,mask):
  h,w=mask.shape;seen=seeds.copy();q=deque((int(x),int(y)) for y,x in zip(*np.where(seeds)))
  while q:
   x,y=q.popleft()
   for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
    if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
  return seen
ROOT=Path(__file__).resolve().parents[1] if Path(__file__).parent.name=='tools' else Path(r'C:\xampp\htdocs\2025\Festival_Dos_Esportes')
OUT=ROOT if Path(__file__).parent.name=='tools' else Path(__file__).parent
ROLES={
 'npcs_pingpong.png':[(2,'tecnico_pingpong','Técnico Aposentado','ILHA_PINGPONG',83,108)],
 'npcs_basquete.png':[(0,'fa_basquete','Fã de Basquete','ILHA_BASQUETE',107,194),(1,'fotografa_basquete','Fotógrafa Esportiva','ILHA_BASQUETE',345,197)],
 'npcs_corrida.png':[(0,'fa_corrida','Fã de Atletismo','ILHA_CORRIDA',81,240),(2,'treinador_corrida','Treinador','ILHA_CORRIDA',338,219)],
 'npcs_skate.png':[(2,'shapeiro_skate','Shapeiro','ILHA_SKATE',109,151),(1,'cinegrafista_skate','Cinegrafista','ILHA_SKATE',379,218)],
 'npcs_arquearia.png':[(2,'naturalista_arco','Naturalista','ILHA_ARCO',155,222),(0,'aprendiz_arco','Aprendiz de Arqueira','ILHA_ARCO',344,207)],
 'npcs_surf.png':[(1,'salva_vidas_surf','Salva-Vidas','ILHA_SURF',112,160),(2,'pescador_surf','Pescador / Meteorologista','ILHA_SURF',376,155)]}

def build():
 catalog={'version':'1.0.0','sprites':{},'audit':[]}
 gallery=Image.new('RGB',(720,len(ROLES)*155),'#355344');d=ImageDraw.Draw(gallery)
 for row,(file,roles) in enumerate(ROLES.items()):
  rgba=np.array(Image.open(ROOT/file).convert('RGBA'));mask=rgba[:,:,3]>100
  labels,n=ndimage.label(mask);objects=[]
  for i,sl in enumerate(ndimage.find_objects(labels),1):
   if sl is not None and (labels[sl]==i).sum()>12000: objects.append((sl[1].start,sl,i))
  objects.sort();assert len(objects)==3,(file,len(objects))
  audit={'file':file,'size':[rgba.shape[1],rgba.shape[0]],'sha256':hashlib.sha256((ROOT/file).read_bytes()).hexdigest(),'directions':['front'],'walkFrames':0,'figures':[]}
  d.text((8,row*155+4),file,fill='white')
  for index,(_,sl,figureId) in enumerate(objects):
   y0,y1=sl[0].start,sl[0].stop;x0,x1=sl[1].start,sl[1].stop
   # Measured connected figure + its own small margin, never equal-cell slicing.
   x0=max(0,x0-4);y0=max(0,y0-4);x1=min(rgba.shape[1],x1+4);y1=min(rgba.shape[0],y1+4)
   px=rgba[y0:y1,x0:x1].copy()
   for _,_,otherId in objects:
    if otherId!=figureId:px[:,:,3][labels[y0:y1,x0:x1]==otherId]=0
   alpha=px[:,:,3];rgb=px[:,:,:3].astype(int)
   # Only neutral matte connected to the exterior. Dark ink protects white clothing/eyes.
   pale=(rgb.min(2)>=145)&((rgb.max(2)-rgb.min(2))<34)
   allowed=(alpha<110)|pale
   seeds=np.zeros(allowed.shape,bool);seeds[0]=allowed[0];seeds[-1]=allowed[-1];seeds[:,0]=allowed[:,0];seeds[:,-1]=allowed[:,-1]
   clear=ndimage.binary_propagation(seeds,mask=allowed)
   removed=int(((alpha>0)&clear).sum());px[:,:,3][clear]=0
   visible=px[:,:,3]>100;ys,xs=np.where(visible)
   # Ignore isolated export specks after cleanup, retaining character and connected props.
   lab,num=ndimage.label(visible);counts=np.bincount(lab.ravel());keep=counts>=20;keep[0]=False
   px[:,:,3][~keep[lab]]=0;visible=px[:,:,3]>100;ys,xs=np.where(visible)
   a,b,c,e=int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)
   clean=px[b:e,a:c];h,w=clean.shape[:2]
   audit['figures'].append({'index':index,'crop':[x0+a,y0+b,w,h],'visible':[w,h],'exteriorPixelsRemoved':removed})
   used=next((r for r in roles if r[0]==index),None)
   if used:
    _,id,name,scene,x,y=used
    # Original sheet is retained; runtime cache clears only measured alpha spans.
    clearFinal=clean[:,:,3]==0;rects=[];active={}
    for yy,rr in enumerate(clearFinal):
     edges=np.diff(np.r_[False,rr,False].astype(int));nextActive={}
     for l,r in zip(np.where(edges==1)[0],np.where(edges==-1)[0]):
      span=(int(l),int(r-l));rect=active.pop(span,None)
      if rect is None:rect=[span[0]+2,yy+2,span[1],1]
      else:rect[3]+=1
      nextActive[span]=rect
     rects.extend(active.values());active=nextActive
    rects.extend(active.values())
    feet=visible[b:e,a:c]& (np.arange(h)[:,None]>=h-max(5,round(h*.05)))
    fy,fx=np.where(feet);anchor=[float((fx.min()+fx.max()+1)/2+2),float(fy.max()+1+2)]
    catalog['sprites'][id]={'source':file,'sourceSize':[rgba.shape[1],rgba.shape[0]],'crop':[x0+a,y0+b,w,h],'padding':2,'anchor':anchor,'visibleWidth':w,'visibleHeight':h,'backgroundRectangles':rects,'backgroundMethod':'measured-exterior-alpha-mask','name':name,'scene':scene,'x':x,'y':y,'facing':'front','walkFrames':0}
    preview=Image.fromarray(clean);preview.thumbnail((100,113),Image.Resampling.NEAREST)
    gx=10+index*235;gallery.paste(preview,(gx,row*155+25),preview);d.text((gx+103,row*155+45),name,fill='white')
  catalog['audit'].append(audit)
 (OUT/'normal_npc_geometry.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
 (OUT/'normal_npc_geometry.js').write_text('/* Measured source rectangles; original approved PNGs are never repainted. */\nwindow.NORMAL_NPC_GEOMETRY='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
 galleryPath=ROOT/'docs/qa/island_npcs/npc-crops.png' if Path(__file__).parent.name=='tools' else OUT/'npc-crops.png'
 galleryPath.parent.mkdir(parents=True,exist_ok=True);gallery.save(galleryPath)
 print(json.dumps(catalog['audit'],ensure_ascii=False,indent=2))
if __name__=='__main__':build()
