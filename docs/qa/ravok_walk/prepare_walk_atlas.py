"""Measured poses from the two supplied sheets. Originals remain untouched.

Each crop is isolated before background cleanup. Uniform nearest-neighbor
normalization happens once at asset preparation, never during runtime motion.
"""
from pathlib import Path
from collections import deque
from PIL import Image, ImageDraw
import json

ROOT = Path(r'C:\xampp\htdocs\2025\Festival_Dos_Esportes')
OUT = Path(__file__).resolve().parent
# Real row boundaries differ by column; several are only 1–3 pixels apart.
RAVOK_Y = [
    [(15,151),(14,151),(14,151),(14,151)],
    [(154,284),(157,287),(156,286),(156,286)],
    [(285,404),(285,404),(286,405),(286,405)],
    [(402,524),(403,523),(404,525),(404,525)],
    [(525,639),(528,639),(528,643),(528,639),(523,643),(522,643)],
    [(643,757),(643,756),(646,757),(644,757),(643,758),(643,757)],
    [(755,857),(754,855),(756,858),(756,858),(757,858),(756,858)],
    [(856,959),(858,957),(858,958),(859,959),(861,959),(859,959)]
]
RAVOK_X = [(148,246),(312,413),(485,578),(650,746),(840,935),(996,1089)]
K7_GROUPS = [
    ('idle_down', [(28,405,60,244)],3), ('idle_up',[(440,820,60,244)],3),
    ('idle_left',[(860,1240,60,244)],3), ('idle_right',[(28,382,308,480)],3),
    ('walk_down',[(400,818,308,480)],4),('walk_up',[(830,1250,308,480)],4),
    ('walk_left',[(30,610,540,715)],4),('walk_right',[(680,1248,540,715)],4)
]
NAMES = ['idle_down','idle_up','idle_left','idle_right','walk_down','walk_up','walk_left','walk_right']
atlas = Image.new('RGBA',(128*8,176*9))
manifest = {'version':1,'image':'overworld_assets/ravok_k7_walk.png','imageSize':list(atlas.size),'characters':{}}
contact = Image.new('RGB',(128*8,176*9),'#203c42')
label = ImageDraw.Draw(contact)
cell=0

def extract(im,search):
    x0,x1,y0,y1=search
    points=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if max(im.getpixel((x,y))[:3])>24]
    left,top=min(x for x,y in points),min(y for x,y in points)
    right,bottom=max(x for x,y in points)+1,max(y for x,y in points)+1
    # Two pixels of source padding isolate the exterior while preserving dark contour.
    rect=[left-2,top-2,right-left+4,bottom-top+4]
    raw=im.crop((rect[0],rect[1],rect[0]+rect[2],rect[1]+rect[3]))
    w,h=raw.size;p=raw.load();seen=set();q=deque()
    for y in range(h):
        for x in range(w):
            if (x in (0,w-1) or y in (0,h-1)) and max(p[x,y][:3])<=24:q.append((x,y));seen.add((x,y))
    while q:
        x,y=q.popleft()
        for a,b in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=a<w and 0<=b<h and (a,b) not in seen and max(p[a,b][:3])<=24:seen.add((a,b));q.append((a,b))
    for x,y in seen:p[x,y]=(0,0,0,0)
    useful=raw.getbbox();raw=raw.crop(useful)
    return raw,rect

for who in ['ravok','k7']:
    im=Image.open(ROOT/('Ravok.png' if who=='ravok' else 'K7.png')).convert('RGBA')
    nominal=132 if who=='ravok' else 168
    char={'source':('Ravok.png' if who=='ravok' else 'K7.png'),'sourceSize':list(im.size),
          'nominalHeight':nominal,'cell':[128,176],'anchor':[64,172],'animations':{},'frames':[]}
    searches=[]
    if who=='ravok':
        for row,name in enumerate(NAMES):
            searches.append((name,[(RAVOK_X[i][0],RAVOK_X[i][1],a,b) for i,(a,b) in enumerate(RAVOK_Y[row])]))
    else:
        for name,regions,count in K7_GROUPS:
            x0,x1,y0,y1=regions[0];bands=[];start=None
            for x in range(x0,x1):
                yes=any(max(im.getpixel((x,y))[:3])>24 for y in range(y0,y1))
                if yes and start is None:start=x
                if not yes and start is not None:
                    if x-start>15:bands.append((start-2,x+2,y0,y1))
                    start=None
            assert len(bands)==count,(name,bands)
            searches.append((name,bands))
    for name,regions in searches:
        ids=[]
        for i,region in enumerate(regions):
            raw,rect=extract(im,region)
            factor=nominal/raw.height
            normalized=raw.resize((round(raw.width*factor),nominal),Image.Resampling.NEAREST)
            # Common cell and bottom-center pivot, irrespective of pose bounds.
            cell_x=(cell%8)*128;cell_y=(cell//8)*176
            feet=[x for y in range(max(0,raw.height-8),raw.height) for x in range(raw.width) if raw.getpixel((x,y))[3]]
            foot_x=(min(feet)+max(feet)+1)/2
            px=round(64-foot_x*factor);py=172-nominal
            atlas.alpha_composite(normalized,(cell_x+px,cell_y+py))
            contact.paste(atlas.crop((cell_x,cell_y,cell_x+128,cell_y+176)),(cell_x,cell_y),atlas.crop((cell_x,cell_y,cell_x+128,cell_y+176)))
            label.text((cell_x+3,cell_y+2),f'{who} {name} {i}',fill='#f1dda3')
            frame={'name':name+'_'+str(i),'sourceRect':rect,'atlasRect':[cell_x,cell_y,128,176],
                   'sourceUsefulSize':list(raw.size),'sourceFeetPivot':[foot_x,raw.height],'normalization':factor}
            ids.append(len(char['frames']));char['frames'].append(frame);cell+=1
        # Two poses in the supplied RIGHT row face LEFT. Keep their audit records,
        # but never turn Ravok around in the middle of a rightward walk.
        char['animations'][name]=[v for i,v in enumerate(ids) if not(who=='ravok' and name=='walk_right' and i in (3,4))]
        if who=='ravok' and name=='walk_right':char['excludedIncompatiblePoses']=[ids[3],ids[4]]
    manifest['characters'][who]=char
    print(who,{k:len(v) for k,v in char['animations'].items()})
atlas.save(OUT/'ravok_k7_walk.png')
contact.save(OUT/'atlas-contact.png')
(OUT/'ravok_walk_atlas.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
(OUT/'ravok_walk_atlas.js').write_text('/* Measured sourceRects; uniform normalization, common feet pivot. */\nwindow.RAVOK_K7_WALK_ATLAS = '+json.dumps(manifest,separators=(',',':'))+';\n',encoding='utf-8')
