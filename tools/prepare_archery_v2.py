"""Build only the v2 archer sprites. Authored row bands locate actions; visible
components locate frames. No uniform-grid crops, black removal, or source edits.
Run with Python + Pillow + NumPy. Output canvases preserve the original pixels.
"""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'archery_assets/v2'
DOCS=ROOT/'docs'
GROUPS=[ [('IDLE',4),('READY',4),('WALK_UP',4)], [('RAISE_BOW',4),('DRAW_BOWSTRING',4),('AIM',4)],
         [('RELEASE_SHOT',4),('RECOVERY',4),('HIT_REACTION',3),('MISS_REACTION',3)], [('VICTORY',6)] ]
BANDS=[(70,258),(324,542),(608,837),(880,1076)]
W,H,AX,AY,COLS=192,240,96,228,8

def components(mask):
 h,w=mask.shape; seen=np.zeros((h,w),bool); result=[]
 for y,x in zip(*np.where(mask)):
  if seen[y,x]:continue
  seen[y,x]=1;queue=deque([(int(x),int(y))]);points=[]
  while queue:
   xx,yy=queue.popleft();points.append((xx,yy))
   for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1),(xx-1,yy-1),(xx+1,yy-1),(xx-1,yy+1),(xx+1,yy+1)]:
    if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=1;queue.append((nx,ny))
  if len(points)>=6:
   p=np.array(points);result.append(p)
 return result

def bounds(p):return [int(p[:,0].min()),int(p[:,1].min()),int(p[:,0].max()+1),int(p[:,1].max()+1)]
def rect(b):return [b[0],b[1],b[2]-b[0],b[3]-b[1]]
def clean_background(image):
 a=np.array(image.convert('RGBA'));rgb=a[:,:,:3]
 white=(rgb.min(2)>=242)&(rgb.max(2).astype(int)-rgb.min(2)<=18)
 m=Image.fromarray(np.where(white,255,0).astype('uint8')).copy()
 ImageDraw.floodfill(m,(0,0),128)
 a[np.array(m)==128,3]=0
 return a

def build(sub,source):
 a=clean_background(Image.open(ROOT/source));frames=[];canvases=[];notes=[]
 for band_index,((y0,y1),groups) in enumerate(zip(BANDS,GROUPS)):
  mask=a[y0:y1,:,3]>0
  if y0==880:mask[:12,:390]=False # entire title border, outside every authored body
  cs=components(mask);core=[]
  for p in cs:
   x0,yy0,x1,yy1=bounds(p)
   if len(p)>=1800 and x1-x0>35 and yy1-yy0>60:
    if x1-x0>150 and len(p)>18000:
     counts=np.bincount(p[:,0],minlength=a.shape[1]);mid=(x0+x1)//2
     cut=min(range(mid-18,mid+19),key=lambda x:(counts[x],abs(x-mid)))
     core.extend([p[p[:,0]<cut],p[p[:,0]>=cut]])
     notes.append(f'{source}: RECOVERY 2/3 share an outline. Split at visible-pixel valley x={cut}; no grid or pixels deleted.')
    else:core.append(p)
  core.sort(key=lambda p:(bounds(p)[0]+bounds(p)[2])/2)
  expected=sum(n for _,n in groups)
  assert len(core)==expected,(source,band_index,len(core),expected)
  centers=[(bounds(p)[0]+bounds(p)[2])/2 for p in core]
  packs=[[p] for p in core]
  for p in cs:
   if len(p)>=1800:continue
   x0,_,x1,_=bounds(p);center=(x0+x1)/2
   nearest=min(range(len(core)),key=lambda n:abs(centers[n]-center))
   packs[nearest].append(p)
  names=[(state,i+1) for state,count in groups for i in range(count)]
  for n,((state,number),parts,body) in enumerate(zip(names,packs,core)):
   points=np.concatenate(parts).copy();points[:,1]+=y0
   body=body.copy();body[:,1]+=y0
   x0,top,x1,bottom=bounds(points);margin=4
   b=[max(0,x0-margin),max(0,top-margin),min(a.shape[1],x1+margin),min(a.shape[0],bottom+margin)]
   crop=np.zeros((b[3]-b[1],b[2]-b[0],4),dtype='uint8')
   crop[points[:,1]-b[1],points[:,0]-b[0]]=a[points[:,1],points[:,0]]
   foot_y=int(body[:,1].max()+1)
   foot=body[body[:,1]>=foot_y-20]
   foot_x=int(round((foot[:,0].min()+foot[:,0].max()+1)/2))
   # Clear only enclosed sheet-white spaces above the head or inside the bow.
   rgb=crop[:,:,:3];opaque=crop[:,:,3]>0
   if sub=='zorp':head=(rgb[:,:,1]>rgb[:,:,0].astype(float)*1.15)&(rgb[:,:,1]>rgb[:,:,2].astype(float)*1.4)&opaque
   else:head=(rgb[:,:,0]>rgb[:,:,1].astype(float)*1.2)&(rgb[:,:,1]>rgb[:,:,2].astype(float)*1.15)&opaque
   hp=components(head);hp.sort(key=len,reverse=True)
   holes=0
   if hp:
    hx0,hy0,hx1,hy1=bounds(hp[0]);white=(rgb.min(2)>=242)&(rgb.max(2).astype(int)-rgb.min(2)<=18)&opaque
    for p in components(white):
     bx0,by0,bx1,by1=bounds(p)
     # The upper bow holes are well above collars/white sleeves. A foot-relative
     # cutoff also works for the master's connected brown bow/hair/quiver mask.
     if len(p)>=90 and (by1<=foot_y-b[1]-110 or by1<=hy0+8 or bx1<=hx0+4 or bx0>=hx1-4):
      crop[p[:,1],p[:,0],3]=0;holes+=1
   sprite=Image.fromarray(crop);tile=Image.new('RGBA',(W,H))
   dx=AX-(foot_x-b[0]);dy=AY-(foot_y-b[1])
   assert dx>=0 and dy>=0 and dx+sprite.width<=W and dy+sprite.height<=H,(source,state,number,sprite.size,dx,dy)
   tile.alpha_composite(sprite,(dx,dy))
   i=len(frames);atlas_rect=[i%COLS*W,i//COLS*H,W,H]
   frames.append({'id':f'{sub}_{state.lower()}_{number:02d}','state':state,'frame':number,'source':source,
    'sourceRect':rect(b),'visibleSourceBounds':rect([x0,top,x1,bottom]),'sourceAnchor':[foot_x,foot_y],
    'atlasRect':atlas_rect,'contentRect':list(tile.getbbox()),'anchor':[AX,AY],
    'enclosedBackgroundHolesRemoved':holes,'orientation':'BACK_UP','mirrored':False})
   canvases.append(tile)
 assert len(frames)==44
 atlas=Image.new('RGBA',(COLS*W,6*H))
 for tile,f in zip(canvases,frames):atlas.alpha_composite(tile,(f['atlasRect'][0],f['atlasRect'][1]))
 atlas.save(OUT/f'{sub}_atlas.png',optimize=True)
 preview=Image.new('RGB',(1200,len([g for row in GROUPS for g in row])*184),(19,29,43));draw=ImageDraw.Draw(preview)
 for row,(state,count) in enumerate(g for band in GROUPS for g in band):
  draw.text((8,row*184+3),f'{sub.upper()} / {state}',fill='#8ceef0')
  for n,(f,tile) in enumerate((f,t) for f,t in zip(frames,canvases) if f['state']==state):
   x=8+n*195;y=row*184+23
   for yy in range(y,y+144,12):
    for xx in range(x,x+116,12):draw.rectangle((xx,yy,xx+11,yy+11),fill='#354456' if ((xx-x)//12+(yy-y)//12)%2 else '#46576b')
   preview.paste(tile.resize((115,144),Image.Resampling.NEAREST),(x,y),tile.resize((115,144),Image.Resampling.NEAREST))
   draw.line((x,y+137,x+115,y+137),fill='#63dfe4');draw.line((x+57,y+132,x+57,y+143),fill='#ffe275')
   draw.text((x+120,y+110),str(f['frame']),fill='white')
 preview.save(DOCS/f'archery_{sub}_v2_preview.png')
 return {'source':source,'image':f'archery_assets/v2/{sub}_atlas.png','frames':frames,'notes':notes}

def main():
 OUT.mkdir(parents=True,exist_ok=True);DOCS.mkdir(exist_ok=True)
 data={'version':'2.0.0','canvas':[W,H],'anchor':[AX,AY],'scale':0.46,'orientation':'BACK_UP',
 'background':'Edge-connected near-white flood fill; enclosed white clothing and dark outlines preserved. Large empty spaces inside bows isolated above/beside head.',
 'states':{state:{'count':count,'fps':10 if state in ['IDLE','READY','AIM'] else 16,'loop':state in ['IDLE','READY','WALK_UP','AIM']} for row in GROUPS for state,count in row},
 'characters':{sub:build(sub,source) for sub,source in [('zorp','zorp_arquearia2.0.png'),('master','mestre_arquearia2.0.png')]}}
 js=json.dumps(data,ensure_ascii=False,indent=2)
 (OUT/'characters_manifest.json').write_text(js+'\n',encoding='utf-8')
 (OUT/'characters_manifest.js').write_text('window.ARCHERY_CHARACTER_V2_MANIFEST = '+js+';\n',encoding='utf-8')
 lines=['# Arquearia 2.0 — mapa de personagens','','44 frames por personagem; somente costas/cima. Canvas 192×240; anchor [96,228].',
 'Fonte original intacta. Os sourceRects abaixo têm margem de 4 px; o matte por componentes isola o personagem de vizinhos/textos.',
 'A escala é fixa (0,46), sem resize por pose. HIT_REACTION representa acerto no alvo, pois o jogo atual não possui dano aos arqueiros.',
 'As flechas soltas, brilhos e sinais de reação realmente presentes na folha foram preservados; não foram desenhados sprites novos.','']
 for sub,character in data['characters'].items():
  lines+=['## '+sub,'']+character['notes']+['']
  for state in data['states']:
   rows=[f for f in character['frames'] if f['state']==state]
   lines+=['- **'+state+'**: '+', '.join(str(f['sourceRect']) for f in rows)]
  lines+=['']
 (DOCS/'archery_v2_mapping.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
 print(json.dumps({'frames':{k:len(v['frames']) for k,v in data['characters'].items()},'notes':{k:v['notes'] for k,v in data['characters'].items()}},ensure_ascii=False))
if __name__=='__main__':main()
