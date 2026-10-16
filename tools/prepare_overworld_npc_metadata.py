"""Measure existing NPC pixels; export geometry only, never repaint source art."""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FILES = ["npc_turista.png", "npc_guia.png", "npc_mestre_novo.png",
         "npc_treinador_novo.png", "npc_arbitro_novo.png", "npc_pugilista_novo.png",
         "npc_aprendiz.png", "npc_mestre_ping_pong.png", "mestre_skate.png",
         "arqueiro_overworld.png", "skate_sprites/mestre_corrida_npc.png",
         "npc_mestre_escalada.png", "npc_guia_trilha.png", "npc_geologa.png",
         "npc_chef.png", "surf_assets/mestre_surfing_overworld.png"]
catalog = {"version": "1.0.0", "anchor": "bottom-center", "referenceVisibleHeight": 49.89, "sprites": {}}
for file in FILES:
    rgba = np.array(Image.open(ROOT / file).convert("RGBA"))
    h, w, _ = rgba.shape
    background = np.zeros((h, w), dtype=bool)
    mask_rectangles = []
    # Only the opaque RGB race source needs a background mask. Interior dark pixels stay.
    if file == "skate_sprites/mestre_corrida_npc.png":
        black = (rgba[:, :, :3].max(axis=2) <= 3) & (rgba[:, :, 3] > 0)
        queue = deque()
        for x in range(w):
            for y in (0, h - 1):
                if black[y, x] and not background[y, x]:
                    background[y, x] = True; queue.append((x, y))
        for y in range(h):
            for x in (0, w - 1):
                if black[y, x] and not background[y, x]:
                    background[y, x] = True; queue.append((x, y))
        while queue:
            x, y = queue.popleft()
            for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0 <= nx < w and 0 <= ny < h and black[ny,nx] and not background[ny,nx]:
                    background[ny,nx] = True; queue.append((nx,ny))
    visible = (rgba[:, :, 3] > 24) & ~background
    ys, xs = np.where(visible)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1
    # Merge background scanline spans into rectangles for one-time Canvas clearing.
    active = {}
    for y in range(y0, y1):
        spans = []
        row = background[y, x0:x1]
        changes = np.diff(np.r_[False, row, False].astype(int))
        for a,b in zip(np.where(changes == 1)[0], np.where(changes == -1)[0]):
            spans.append((int(a), int(b-a)))
        next_active = {}
        for span in spans:
            if span in active:
                rect = active.pop(span); rect[3] += 1
            else:
                rect = [span[0]+2, y-y0+2, span[1], 1]
            next_active[span] = rect
        mask_rectangles.extend(active.values()); active = next_active
    mask_rectangles.extend(active.values())
    entry = {"source": file, "sourceSize": [w,h], "crop": [x0,y0,x1-x0,y1-y0],
             "padding": 2, "anchor": [(x1-x0)/2+2,y1-y0+2],
             "backgroundMethod": "edge-connected-flood-fill" if background.any() else "existing-alpha",
             "backgroundRectangles": mask_rectangles}
    catalog["sprites"][file] = entry
    print(file, "crop", entry["crop"], "backgroundRects", len(mask_rectangles))
out = ROOT / "overworld_assets"
out.mkdir(exist_ok=True)
(out / "npc_geometry.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding="utf-8")
(out / "npc_geometry.js").write_text("\"use strict\";\nconst OVERWORLD_NPC_GEOMETRY = Object.freeze(" + json.dumps(catalog,ensure_ascii=False,separators=(",",":")) + ");\n",encoding="utf-8")
