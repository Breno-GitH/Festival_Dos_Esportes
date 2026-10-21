"""Measure existing NPC pixels; export geometry only, never repaint source art."""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image
from prepare_climb_overworld_npc_geometry import write_geometry

ROOT = Path(__file__).resolve().parents[1]
FILES = ["npc_turista.png", "npc_guia.png", "npc_mestre_novo.png",
         "npc_treinador_novo.png", "npc_arbitro_novo.png", "npc_pugilista_novo.png",
         "npc_aprendiz.png", "npc_mestre_ping_pong.png", "mestre_skate.png",
         "mestre_arquearia2.0_overworld.png", "skate_sprites/mestre_corrida_npc.png",
         "surf_assets/mestre_surfing_overworld.png", "capitao.png"]
catalog = {"version": "1.3.1", "anchor": "bottom-center", "referenceVisibleHeight": 49.89, "sprites": {}}
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
    visible = (rgba[:, :, 3] > 8) & ~background
    ys, xs = np.where(visible)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1
    # Preserve faint outlines and give transparent sources a small safety margin.
    # The race mask keeps its measured origin so scanline rectangles remain aligned.
    if not background.any():
        x0, y0 = max(0, x0-3), max(0, y0-3)
        x1, y1 = min(w, x1+3), min(h, y1+3)
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
    anchor_x = (int(xs.min())+int(xs.max())+1)/2
    if file == "mestre_arquearia2.0_overworld.png":
        # The quiver and ribbon extend asymmetrically. Center on both feet, not accessories.
        foot_top = int(ys.max()) - round((int(ys.max())-int(ys.min())+1)*.05)
        _, foot_xs = np.where(visible & (np.arange(h)[:, None] >= foot_top))
        anchor_x = (int(foot_xs.min())+int(foot_xs.max())+1)/2
    entry = {"source": file, "sourceSize": [w,h], "crop": [x0,y0,x1-x0,y1-y0],
             "padding": 2,
             "anchor": [anchor_x-x0+2, int(ys.max())+1-y0+2],
             "backgroundMethod": "edge-connected-flood-fill" if background.any() else "existing-alpha",
             "backgroundRectangles": mask_rectangles,
             "visibleWidth": int(xs.max())-int(xs.min())+1,
             "visibleHeight": int(ys.max())-int(ys.min())+1}
    catalog["sprites"][file] = entry
    print(file, "crop", entry["crop"], "backgroundRects", len(mask_rectangles))
catalog["sprites"].update(write_geometry(ROOT)["sprites"])
out = ROOT / "overworld_assets"
out.mkdir(exist_ok=True)
(out / "npc_geometry.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding="utf-8")
(out / "npc_geometry.js").write_text("\"use strict\";\nconst OVERWORLD_NPC_GEOMETRY = Object.freeze(" + json.dumps(catalog,ensure_ascii=False,separators=(",",":")) + ");\n",encoding="utf-8")
