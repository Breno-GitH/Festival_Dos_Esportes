"""Measure one frontal pose in each supplied sheet; export exterior black masks.

Original PNGs are read only. The renderer crops once and clears these spans in
its existing sprite cache. Interior blacks/whites and original proportions stay.
"""
from pathlib import Path
from collections import deque
import json
from PIL import Image

import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--project-root', type=Path, default=Path(__file__).resolve().parent.parent)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
ROOT = args.project_root
OUT = args.output or ROOT
FIGURES = [('ravok_front', 'Ravok.png', (145, 5, 249, 154)),
           ('k7_front', 'K7.png', (28, 58, 140, 243))]

def spans(mask, width, height):
    rectangles, active = [], {}
    for y in range(height):
        runs, x = [], 0
        while x < width:
            if not mask[y * width + x]:
                x += 1
                continue
            start = x
            while x < width and mask[y * width + x]:
                x += 1
            runs.append((start, x-start))
        next_active = {}
        for run in runs:
            rect = active.pop(run, [run[0]+2, y+2, run[1], 0])
            rect[3] += 1
            next_active[run] = rect
        rectangles.extend(active.values())
        active = next_active
    rectangles.extend(active.values())
    return rectangles

entries = {}
for key, source, search in FIGURES:
    image = Image.open(ROOT / source).convert('RGBA')
    points = [(x, y) for y in range(search[1], search[3]) for x in range(search[0], search[2])
              if max(image.getpixel((x, y))[:3]) > 24]
    x0, y0 = min(p[0] for p in points)-2, min(p[1] for p in points)-2
    x1, y1 = max(p[0] for p in points)+3, max(p[1] for p in points)+3
    crop = image.crop((x0, y0, x1, y1)); w, h = crop.size
    allowed = [max(crop.getpixel((x, y))[:3]) <= 24 for y in range(h) for x in range(w)]
    mask, queue = [False]*(w*h), deque()
    for y in range(h):
        for x in range(w):
            if (x in (0, w-1) or y in (0, h-1)) and allowed[y*w+x]:
                mask[y*w+x] = True
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h and allowed[ny*w+nx] and not mask[ny*w+nx]:
                mask[ny*w+nx] = True
                queue.append((nx,ny))
    visible = [(x,y) for y in range(h) for x in range(w) if not mask[y*w+x]]
    minx, maxx = min(x for x,y in visible), max(x for x,y in visible)
    miny, maxy = min(y for x,y in visible), max(y for x,y in visible)
    feet = [(x,y) for x,y in visible if y >= maxy-7]
    anchorx = (min(x for x,y in feet)+max(x for x,y in feet)+1)/2 + 2
    entries[key] = dict(source=source, sourceSize=list(image.size),
        crop=[x0,y0,w,h], padding=2, anchor=[anchorx,maxy+3],
        visibleWidth=maxx-minx+1, visibleHeight=maxy-miny+1,
        backgroundMethod='edge-connected-black-flood-fill',
        backgroundRectangles=spans(mask,w,h), removedExteriorPixels=sum(mask))
    print(key, entries[key]['crop'], 'visible', entries[key]['visibleWidth'], entries[key]['visibleHeight'],
          'anchor', entries[key]['anchor'], 'mask spans', len(entries[key]['backgroundRectangles']))

(OUT/'ravok_npc_geometry.js').write_text('/* Measured frontal poses; source sheets preserved. */\nwindow.RAVOK_NPC_GEOMETRY = '+json.dumps(entries, separators=(',',':'))+';\n', encoding='utf-8')
(OUT/'ravok_npc_geometry.json').write_text(json.dumps(entries, indent=2), encoding='utf-8')
