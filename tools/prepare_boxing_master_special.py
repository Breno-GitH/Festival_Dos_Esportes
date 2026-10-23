"""Map original RGB art to runtime source strips; never rewrite the official sheet."""
from pathlib import Path
import importlib.util,json
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
project=Path(__file__).resolve().parents[1]
out=project
r=project/'docs'/'qa'/'boxing_master_special'
r.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('normal_boxing',project/'tools/prepare_boxing_sprites_v3.py')
normal=importlib.util.module_from_spec(spec);spec.loader.exec_module(normal)
source=Image.open(project/'mestre_boxe3.0_especial.png').convert('RGB');rgb=np.array(source)
ink=(rgb.max(axis=2)>32).astype(np.uint8)*255
rows=[(90,425,[286,597,919]),(505,795,[223,468,818,1030]),(875,1185,[370,672,971])]
chosen={0:{0:'charge_stance',2:'charge_low',3:'charge_arm'},
        1:{1:'dash_drive',2:'dash_punch'},2:{1:'recover_low',2:'recover_knee',3:'recover_ready'}}
frames={};seams=[];previews=[]
for row,(y1,y2,cuts) in enumerate(rows):
    if row not in chosen:continue
    local=ink[y1:y2];h,w=local.shape
    boundaries=[np.zeros(h,dtype=int)]+[normal.seam(local,cut,68,protect_upper=True) for cut in cuts]+[np.full(h,w,dtype=int)]
    for c,name in chosen[row].items():
        region=(np.arange(w)[None,:]>=boundaries[c][:,None])&(np.arange(w)[None,:]<boundaries[c+1][:,None])
        seed=((local>0)&region).astype(np.uint8)*255
        # Fill only enclosed black details (eyes, shorts, boots); the border-connected black matte stays out.
        padded=Image.new('L',(w+4,h+4),0);padded.paste(Image.fromarray(seed),(2,2));ImageDraw.floodfill(padded,(0,0),128)
        mask=np.array(padded)[2:-2,2:-2]!=128
        mask=np.array(Image.fromarray(mask.astype(np.uint8)*255).filter(ImageFilter.MaxFilter(3)))>0
        mask &= region
        # Seams can leave isolated pixels from a neighboring pose. Retain the connected character.
        dense_y=int(mask.sum(axis=1).argmax());dense_points=np.flatnonzero(mask[dense_y]);dense_x=int(dense_points[len(dense_points)//2])
        component=Image.fromarray(mask.astype(np.uint8)*255).copy();ImageDraw.floodfill(component,(dense_x,dense_y),128)
        mask=np.array(component)==128
        yy,xx=np.where(mask);bx1,bx2,by1,by2=int(xx.min()),int(xx.max())+1,int(yy.min()),int(yy.max())+1
        # The lowest substantial support row excludes faint outline dust.
        support=np.flatnonzero(mask.sum(axis=1)>6);floor=int(support[-1]);foot_y,foot_x=np.where(mask[max(0,floor-5):floor+1])
        foot_center=(int(foot_x.min())+int(foot_x.max()))/2
        boxes=[];active={}
        for y in range(by1,by2):
            occupied=np.flatnonzero(mask[y]);chunks=np.split(occupied,np.where(np.diff(occupied)>1)[0]+1)
            next_active={}
            for chunk in chunks:
                if not len(chunk):continue
                start,end=int(chunk[0]),int(chunk[-1])+1;key=(start,end)
                if key in active:box=active[key];box[3]+=1
                else:box=[start,y+y1,end-start,1];boxes.append(box)
                next_active[key]=box
            active=next_active
        scale=.47;dx=160-(foot_center-bx1)*scale;dy=210-(floor+1-by1)*scale
        bounds=[bx1,y1+by1,bx2-bx1,by2-by1]
        if dx<3 or dy<3 or dx+bounds[2]*scale>317 or dy+bounds[3]*scale>222:raise ValueError((name,dx,dy,bounds))
        frames[name]={'sourceRect':bounds,'sourceAnchor':[foot_center,y1+floor+1],'scale':scale,'strips':boxes,'sourcePose':[row+1,c+1]}
        crop=source.crop((bx1,y1+by1,bx2,y1+by2)).convert('RGBA');crop.putalpha(Image.fromarray(mask[by1:by2,bx1:bx2].astype(np.uint8)*255))
        canvas=Image.new('RGBA',(320,224));resized=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
        canvas.alpha_composite(resized,(round(dx),round(dy)));previews.append((name,canvas))
        seams.append({'frame':name,'leftSolidCrossings':int((local[np.arange(h),np.minimum(w-1,boundaries[c])]>64).sum()),'rightSolidCrossings':int((local[np.arange(h),np.minimum(w-1,boundaries[c+1])]>64).sum())})
atlas={'source':'mestre_boxe3.0_especial.png?v=1.0.0_curated_special','sheetSize':list(source.size),'canvas':[320,224],'anchor':[160,210],
       'method':'Curated pose order; minimum-ink seams; border-connected black matte excluded; enclosed dark character details preserved; one uniform .47 scale.',
       'frames':frames,'actions':{'charge':['charge_stance','charge_low','charge_arm'],'dash':['dash_drive','dash_punch'],'recovery':['recover_low','recover_knee','recover_ready']}}
(out/'boxing_master_special_atlas.js').write_text('"use strict";\nconst BOXING_MASTER_SPECIAL_ATLAS='+json.dumps(atlas,separators=(',',':'))+';\n',encoding='utf-8')
(r/'atlas-validation.json').write_text(json.dumps({'frames':{k:{p:v for p,v in f.items() if p!='strips'} for k,f in frames.items()},'seams':seams},indent=2))
preview=Image.new('RGB',(960,((len(previews)+2)//3)*248),'#243445');draw=ImageDraw.Draw(preview)
for i,(name,frame) in enumerate(previews):
    x=(i%3)*320;y=(i//3)*248;preview.paste(frame,(x,y),frame);draw.line((x+10,y+210,x+310,y+210),fill='#698691');draw.text((x+10,y+228),name,fill='#ffffff')
preview.save(r/'atlas-preview.png')
print(json.dumps({'frames':len(frames),'bytes':(out/'boxing_master_special_atlas.js').stat().st_size,'seams':seams}))
