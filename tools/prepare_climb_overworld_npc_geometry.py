"""Measure the four supplied figures and export Canvas cleanup masks, never repaint PNGs."""
from pathlib import Path
from collections import deque
import hashlib
import json
import numpy as np
from PIL import Image

SOURCE = "npcs_escalada2.0.png"
# Search windows identify the supplied figures, NOT the final source rectangles.
# Every final crop and anchor is measured from that figure's own visible pixels.
FIGURES = [
    ("climb_v2_geologa", "geologa", 0, 380),
    ("climb_v2_mestre", "mestre", 400, 760),
    ("climb_v2_guia", "guia", 780, 1140),
    ("climb_v2_chef", "chef", 1175, 1505),
]
# Tiny enclosed fragments of the original pale matte on the geologist's
# outer hair contour. Their dark surrounding ink blocks the exterior flood.
# Only neutral light pixels in these measured pockets are removed, never hair.
OUTLINE_POCKETS = {
    "climb_v2_geologa": [(280,310,292,334), (108,362,132,389), (158,314,167,326)]
}


def compress_spans(mask, padding=2):
    active, rectangles = {}, []
    for y, row in enumerate(mask):
        changes = np.diff(np.r_[False, row, False].astype(int))
        spans = [(int(a), int(b-a)) for a, b in
                 zip(np.where(changes == 1)[0], np.where(changes == -1)[0])]
        next_active = {}
        for span in spans:
            rect = active.pop(span, None)
            if rect is None:
                rect = [span[0]+padding, y+padding, span[1], 1]
            else:
                rect[3] += 1
            next_active[span] = rect
        rectangles.extend(active.values())
        active = next_active
    rectangles.extend(active.values())
    return rectangles


def external_outline(rgba):
    """Flood from transparent exterior through neutral light rim, never through dark ink."""
    alpha = rgba[:, :, 3]
    rgb = rgba[:, :, :3].astype(np.int16)
    # The supplied white matte includes gray antialias pixels, separated from
    # transparent pixels by a faint colored fringe. Flood that fringe too;
    # the character's dark ink remains the barrier protecting interior whites.
    light = (rgb.min(axis=2) >= 65) & ((rgb.max(axis=2)-rgb.min(axis=2)) <= 50)
    transparent = alpha <= 8
    allowed = (alpha <= 100) | light
    h, w = alpha.shape
    reached = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(w):
        for y in (0, h-1):
            if allowed[y, x] and not reached[y, x]:
                reached[y, x] = True
                queue.append((x, y))
    for y in range(h):
        for x in (0, w-1):
            if allowed[y, x] and not reached[y, x]:
                reached[y, x] = True
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x-1,y-1), (x,y-1), (x+1,y-1), (x-1,y),
                       (x+1,y), (x-1,y+1), (x,y+1), (x+1,y+1)):
            if 0 <= nx < w and 0 <= ny < h and allowed[ny, nx] and not reached[ny, nx]:
                reached[ny, nx] = True
                queue.append((nx, ny))
    rim = reached & light & ~transparent
    return transparent | reached, rim, light & ~reached & ~transparent


def feet_anchor(visible):
    """Center the two boots, excluding the chef's separate walking-stick tip."""
    yy, _ = np.where(visible)
    foot_top = int(yy.max()) - round((int(yy.max())-int(yy.min())+1)*.05)
    feet = visible & (np.arange(visible.shape[0])[:, None] >= foot_top)
    seen = np.zeros(feet.shape, dtype=bool)
    components = []
    for y, x in zip(*np.where(feet)):
        if seen[y, x]:
            continue
        queue = deque([(int(x), int(y))])
        seen[y, x] = True
        points = []
        while queue:
            px, py = queue.popleft()
            points.append((px, py))
            for dx, dy in ((-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)):
                nx, ny = px+dx, py+dy
                if (0 <= nx < feet.shape[1] and 0 <= ny < feet.shape[0]
                        and feet[ny,nx] and not seen[ny,nx]):
                    seen[ny,nx] = True
                    queue.append((nx,ny))
        components.append(points)
    components.sort(key=len, reverse=True)
    assert len(components) >= 2, "Expected two frontal boots in the supplied character"
    boots = components[0] + components[1]
    xs, ys = zip(*boots)
    return (min(xs)+max(xs)+1)/2, max(ys)+1


def build_geometry(root):
    path = root / SOURCE
    rgba = np.array(Image.open(path).convert("RGBA"))
    height, width, _ = rgba.shape
    sprites = {}
    for key, role, left, right in FIGURES:
        local = rgba[:, left:right]
        raw = local[:, :, 3] > 8
        ys, xs = np.where(raw)
        # Initial useful area plus exterior margin supplies transparent flood-fill seeds.
        rx = max(0, left+int(xs.min())-4)
        ry = max(0, int(ys.min())-4)
        rx1 = min(width, left+int(xs.max())+5)
        ry1 = min(height, int(ys.max())+5)
        pixels = rgba[ry:ry1, rx:rx1]
        clear, rim, preserved = external_outline(pixels)
        for px0, py0, px1, py1 in OUTLINE_POCKETS.get(key, []):
            pocket = pixels[py0-ry:py1-ry, px0-rx:px1-rx]
            rgb = pocket[:, :, :3].astype(np.int16)
            light = (rgb.min(axis=2) >= 65) & ((rgb.max(axis=2)-rgb.min(axis=2)) <= 50)
            area = np.s_[py0-ry:py1-ry, px0-rx:px1-rx]
            rim[area] |= light & ~clear[area]
            clear[area] |= light
            preserved[area] &= ~light
        visible = (pixels[:, :, 3] > 8) & ~clear
        yy, xx = np.where(visible)
        x0, y0 = max(0, int(xx.min())-3), max(0, int(yy.min())-3)
        x1, y1 = min(pixels.shape[1], int(xx.max())+4), min(pixels.shape[0], int(yy.max())+4)
        anchor_x, anchor_y = feet_anchor(visible)
        entry = {
            "source": SOURCE, "role": role, "sourceSize": [width, height],
            "crop": [rx+x0, ry+y0, x1-x0, y1-y0], "padding": 2,
            "anchor": [anchor_x-x0+2, anchor_y-y0+2],
            "backgroundMethod": "exterior-light-rim-and-low-alpha",
            "backgroundRectangles": compress_spans(clear[y0:y1, x0:x1]),
            "visibleWidth": int(xx.max()-xx.min()+1),
            "visibleHeight": int(yy.max()-yy.min()+1),
            "removedExteriorLightPixels": int(rim.sum()),
            "preservedInteriorLightPixels": int(preserved.sum()),
            "anchorReference": "feet-bottom-center",
        }
        assert entry["visibleHeight"] > 450 and entry["visibleWidth"] > 200
        assert entry["removedExteriorLightPixels"] > 0
        assert entry["preservedInteriorLightPixels"] > 0
        sprites[key] = entry
    return {"version": "2.0.1", "source": SOURCE,
            "sourceSHA256": hashlib.sha256(path.read_bytes()).hexdigest(), "sprites": sprites}


def write_geometry(root):
    result = build_geometry(root)
    (root / "overworld_assets" / "climb_npcs_v2_geometry.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    result = write_geometry(Path(__file__).resolve().parents[1])
    for key, sprite in result["sprites"].items():
        print(key, "crop", sprite["crop"], "rim removed", sprite["removedExteriorLightPixels"],
              "interior lights kept", sprite["preservedInteriorLightPixels"])
