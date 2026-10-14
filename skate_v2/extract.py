"""Export the two official Skate 2.0 sheets without touching the live course.

The sheets are arranged by illustrated sections, not a regular grid. Each region
below is a reviewed visual cell. Alpha is used only to trim the cell; RGB black
is never used as a transparency key, so the eyes, outlines and board survive.
"""

from __future__ import annotations

import json
import hashlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
ZORP_SOURCE = "zorp_skate2.0.png"
SCENE_SOURCE = "skate_assets2.0.png"
ALPHA_KEEP = 5
ALPHA_BOUNDS = 14
PAD = 4


def spec(group, name, box, **meta):
    return {"group": group, "id": name, "region": box, **meta}


# Regions are [left, top, right, bottom] in the 1254 px source sheet.
# Deliberate row bounds exclude all section captions.
RIDER = []
for group, y, spans in [
    ("ride_idle", (48, 232), [(0, 137), (138, 274), (274, 423)]),
    ("push_accelerate", (48, 232), [(445, 602), (602, 828), (846, 1027), (1027, 1200)]),
    ("normal_jump", (284, 492), [(0, 138), (138, 272), (272, 417)]),
    ("ollie_board_flip", (284, 492), [(428, 556), (556, 682), (682, 814), (814, 952), (952, 1094), (1094, 1254)]),
    ("super_jump", (545, 760), [(0, 137), (137, 250), (250, 383), (383, 508), (500, 607), (607, 748)]),
    ("grind_stance", (545, 760), [(760, 893), (893, 1005), (1005, 1127), (1127, 1254)]),
    ("grind_jump_out", (814, 1038), [(0, 142), (142, 276), (276, 423)]),
    ("air_catch_landing", (814, 1038), [(434, 601), (563, 687), (687, 824)]),
    ("bench_trick_slide", (814, 1038), [(832, 979), (979, 1116), (1116, 1254)]),
    ("stumble_near_fail", (1085, 1254), [(0, 149), (149, 277), (278, 445)]),
    ("crash_fall_off_board", (1085, 1254), [(450, 634), (621, 745), (742, 935), (935, 1117), (1117, 1254)]),
]:
    for index, (x0, x1) in enumerate(spans, 1):
        RIDER.append(spec(group, f"{group}_{index:02}", [x0, y[0], x1, y[1]],
                          frame=index,
                          boardAttached=group != "crash_fall_off_board",
                          anchor="body-center" if group == "crash_fall_off_board" else "board-bottom-center"))
for piece in RIDER:
    if piece["id"] == "super_jump_04":
        # This aerial pose rises above its row. Its section title is to the left.
        piece["region"][1] = 506
    if piece["id"] in ("super_jump_03", "super_jump_05"):
        piece["boardVisibility"] = "not clearly visible in source pose"
        piece["confidence"] = "review before using as a continuous board pose"
        piece["boardAttached"] = None
        piece["gameplayRecommended"] = False
    if piece["id"] == "air_catch_landing_01":
        piece["exclude"] = [[570, 896, 601, 1038]]
    if piece["id"] == "air_catch_landing_02":
        piece["region"][1] = 896
        piece["exclude"] = [[563, 896, 590, 920]]
    if piece["id"] == "super_jump_04":
        piece["exclude"] = [[500, 660, 508, 760]]
    if piece["id"] == "grind_stance_02":
        piece["exclude"] = [[893, 680, 901, 760]]
    if piece["id"] == "stumble_near_fail_02":
        piece["exclude"] = [[273, 1085, 277, 1160]]
    if piece["id"] == "stumble_near_fail_03":
        piece["exclude"] = [[278, 1178, 295, 1254]]
    if piece["id"] == "crash_fall_off_board_02":
        piece["exclude"] = [[621, 1164, 638, 1254]]
    if piece["id"] == "crash_fall_off_board_03":
        piece["exclude"] = [[742, 1085, 750, 1110]]
    if piece["id"] == "crash_fall_off_board_05":
        piece["characterVisible"] = False
        piece["anchor"] = "board-bottom-center"


SCENE = [
    # Floor modules: separate tile edges instead of treating the full row as one sprite.
    spec("ground", "floor-low-01", [0, 45, 127, 181], type="ground", surface=[[.03,.53],[.97,.53]]),
    spec("ground", "floor-low-02", [127, 45, 201, 181], type="ground", surface=[[.03,.53],[.97,.53]]),
    spec("ground", "floor-neon-03", [201, 45, 270, 181], type="ground", surface=[[.03,.54],[.97,.54]]),
    spec("ground", "floor-raised-04", [270, 45, 370, 181], type="ground", surface=[[.03,.40],[.97,.40]]),
    spec("ground", "floor-planter-05", [370, 45, 470, 181], type="ground", surface=[[.03,.49],[.97,.49]]),
    spec("ground", "floor-utility-06", [470, 45, 558, 181], type="ground", surface=[[.03,.52],[.97,.52]]),
    spec("ground", "floor-wide-07", [558, 45, 669, 181], type="ground", surface=[[.03,.38],[.97,.38]]),
    spec("ground", "floor-garden-08", [669, 45, 855, 181], type="ground", surface=[[.03,.29],[.97,.29]]),
    spec("ground", "floor-bench-platform-09", [855, 45, 1047, 181], type="platform", surface=[[.03,.37],[.97,.37]], dangerousSide=True),
    spec("ground", "floor-fenced-platform-10", [1047, 45, 1254, 181], type="platform", surface=[[.03,.39],[.97,.39]], dangerousSide=True),

    spec("rails", "rail-cyan-short", [0, 225, 133, 315], type="rail", grind=[[.05,.48],[.95,.48]]),
    spec("rails", "rail-magenta-short", [133, 225, 273, 315], type="rail", grind=[[.05,.42],[.95,.42]]),
    spec("rails", "rail-gold-medium", [273, 225, 423, 315], type="rail", grind=[[.05,.19],[.95,.19]]),
    spec("rails", "handrail-cyan-descend", [423, 200, 567, 316], type="handrail", grind=[[.04,.12],[.97,.67]]),
    spec("rails", "handrail-magenta-ascend", [567, 210, 743, 316], type="handrail", grind=[[.03,.54],[.97,.23]]),
    spec("rails", "handrail-magenta-curve-up", [743, 207, 848, 315], type="curved-rail", grind=[[.04,.49],[.35,.42],[.65,.31],[.97,.16]]),
    spec("rails", "rail-cyan-sag", [848, 203, 1014, 316], type="curved-rail", grind=[[.03,.08],[.30,.34],[.61,.52],[.96,.52]]),
    spec("rails", "rail-cyan-arch", [1014, 218, 1254, 318], type="curved-rail", grind=[[.03,.33],[.30,.12],[.55,.06],[.77,.13],[.98,.39]]),
    spec("rails", "rail-cyan-long", [0, 314, 367, 380], type="rail", grind=[[.04,.15],[.96,.15]]),
    spec("rails", "rail-magenta-long-ascend", [368, 306, 648, 380], type="handrail", grind=[[.04,.62],[.96,.19]]),
    spec("rails", "cable-wave-linked", [662, 307, 1254, 380], type="cable-rail", grind=[[.02,.55],[.19,.43],[.28,.82],[.38,.76],[.46,.39],[.57,.39],[.68,.76],[.77,.78],[.84,.40],[.98,.40]]),

    spec("stairs", "steps-short", [0, 425, 110, 610], type="stairs", surface=[[.03,.74],[.23,.74],[.23,.62],[.48,.62],[.48,.51],[.72,.51],[.72,.40],[.97,.40]]),
    spec("stairs", "steps-magenta-low", [110, 425, 201, 610], type="stairs", surface=[[.02,.60],[.28,.60],[.28,.50],[.57,.50],[.57,.39],[.98,.39]], grind=[[.08,.42],[.91,.68]]),
    spec("stairs", "steps-cyan-handrail", [180, 425, 323, 610], type="stairs", surface=[[.03,.47],[.26,.47],[.26,.57],[.53,.57],[.53,.67],[.77,.67],[.77,.77],[.97,.77]], grind=[[.08,.18],[.94,.74]]),
    spec("stairs", "steps-gold-handrail", [312, 425, 537, 610], type="stairs", surface=[[.03,.43],[.23,.43],[.23,.52],[.45,.52],[.45,.63],[.68,.63],[.68,.74],[.96,.74]], grind=[[.37,.11],[.95,.69]]),
    spec("stairs", "steps-double-handrail", [478, 425, 831, 610], type="stairs", surface=[[.02,.49],[.20,.49],[.20,.59],[.37,.59],[.37,.70],[.55,.70],[.55,.80],[.98,.80]], grind=[[.43,.05],[.73,.59]]),
    spec("stairs", "stair-roof-platform", [753, 425, 927, 610], type="platform", surface=[[.04,.21],[.96,.21]], dangerousSide=True),
    spec("stairs", "stair-plaza-large", [927, 390, 1254, 610], type="stairs", surface=[[.02,.71],[.25,.71],[.25,.59],[.48,.59],[.48,.44],[.70,.44],[.70,.28],[.96,.28]], grind=[[.34,.69],[.94,.06]]),

    spec("ramps", "kicker-small", [0, 658, 127, 832], type="kicker", surface=[[.04,.79],[.96,.58]], launchStrength=48),
    spec("ramps", "kicker-medium", [127, 658, 239, 832], type="kicker", surface=[[.03,.81],[.95,.57]], launchStrength=82),
    spec("ramps", "launch-steep", [239, 658, 407, 832], type="launch", surface=[[.03,.82],[.33,.72],[.62,.48],[.88,.17],[.96,.15]], launchStrength=145),
    spec("ramps", "bank-planter", [407, 658, 626, 832], type="bank", surface=[[.03,.36],[.21,.49],[.52,.66],[.82,.83],[.97,.91]], launchStrength=42),
    spec("ramps", "quarter-cyan", [626, 658, 805, 832], type="quarter", surface=[[.03,.84],[.31,.81],[.55,.67],[.77,.45],[.89,.28],[.96,.27]], launchStrength=95),
    spec("ramps", "transition-magenta", [805, 658, 1003, 832], type="transition", surface=[[.04,.23],[.17,.45],[.31,.66],[.54,.88],[.73,.95],[.96,.95]], launchStrength=78),
    spec("ramps", "special-launch-large", [950, 607, 1254, 832], type="special-launch", surface=[[.02,.75],[.32,.78],[.54,.64],[.74,.42],[.92,.16],[.98,.05]], launchStrength=170),

    spec("gap", "chasm-takeoff-platform", [0, 876, 355, 1093], type="gap-platform", surface=[[.03,.53],[.58,.27],[.71,.27]], fatalBelow=True),
    spec("gap", "chasm-pillar-01", [355, 876, 475, 1093], type="gap-pillar", surface=[[.15,.38],[.86,.38]], fatalBelow=True),
    spec("gap", "chasm-pillar-02", [475, 876, 558, 1093], type="gap-pillar", surface=[[.10,.35],[.89,.35]], fatalBelow=True),
    spec("gap", "chasm-pillar-03", [558, 876, 668, 1093], type="gap-pillar", surface=[[.11,.42],[.88,.42]], fatalBelow=True),
    spec("gap", "chasm-pillar-04", [668, 876, 769, 1093], type="gap-pillar", surface=[[.10,.38],[.87,.38]], fatalBelow=True),
    spec("gap", "chasm-pillar-05", [769, 876, 893, 1093], type="gap-pillar", surface=[[.12,.36],[.83,.36]], fatalBelow=True),
    spec("gap", "chasm-landing-platform", [893, 876, 1254, 1093], type="gap-platform", surface=[[.03,.44],[.97,.44]], fatalBelow=True),

    spec("extras", "bench-cyan", [0, 1140, 138, 1254], type="bench", surface=[[.08,.39],[.91,.39]], dangerousSide=True),
    spec("extras", "ledge-magenta", [138, 1140, 267, 1254], type="ledge", surface=[[.05,.53],[.96,.53]], grind=[[.05,.53],[.96,.53]], dangerousSide=True),
    spec("extras", "planter-crown", [267, 1132, 409, 1254], type="planter", surface=[[.05,.58],[.96,.58]], dangerousSide=True),
    spec("extras", "bank-small-grey", [409, 1140, 528, 1254], type="bank", surface=[[.04,.88],[.96,.31]], launchStrength=35),
    spec("extras", "block-slope-cyan", [528, 1140, 632, 1254], type="block", surface=[[.04,.39],[.80,.15],[.97,.29]], dangerousSide=True),
    spec("extras", "crate-planter", [632, 1126, 752, 1254], type="block", surface=[[.04,.42],[.97,.42]], dangerousSide=True),

    spec("hazards", "barrier-striped", [752, 1140, 842, 1254], type="blocker", dangerousSide=True),
    spec("hazards", "cone-orange", [842, 1140, 891, 1254], type="blocker", dangerousSide=True),
    spec("hazards", "barrier-fence", [891, 1140, 987, 1254], type="blocker", dangerousSide=True),
    spec("hazards", "warning-skull", [987, 1140, 1049, 1254], type="decoration"),
    spec("hazards", "sign-no-entry", [1049, 1140, 1105, 1254], type="decoration"),
    spec("hazards", "sign-chevron", [1105, 1140, 1152, 1254], type="decoration"),
    spec("hazards", "bollard-neon-01", [1152, 1140, 1180, 1254], type="blocker", dangerousSide=True),
    spec("hazards", "bollard-neon-02", [1180, 1140, 1211, 1254], type="blocker", dangerousSide=True),
    spec("hazards", "streetlight-magenta", [1211, 1082, 1254, 1254], type="decoration"),
]

for piece in SCENE:
    if piece["id"] in (
        "steps-magenta-low", "steps-cyan-handrail", "steps-gold-handrail",
        "steps-double-handrail", "stair-roof-platform",
        "transition-magenta", "special-launch-large",
        "chasm-pillar-01", "chasm-pillar-02", "chasm-pillar-03",
        "chasm-pillar-04", "chasm-pillar-05",
    ):
        piece["confidence"] = "source sheet overlaps a neighboring illustrated module"


def crop_piece(source: Image.Image, piece):
    region = piece["region"]
    x0, y0, x1, y1 = region
    cell = source.crop(tuple(region))
    if piece.get("exclude"):
        pixels = np.array(cell)
        for rx0, ry0, rx1, ry1 in piece["exclude"]:
            pixels[max(0, ry0-y0):min(y1-y0, ry1-y0),
                   max(0, rx0-x0):min(x1-x0, rx1-x0)] = (0, 0, 0, 0)
        cell = Image.fromarray(pixels, "RGBA")
    arr = np.asarray(cell.getchannel("A"))
    visible = arr > ALPHA_BOUNDS
    yy, xx = np.where(visible)
    if len(xx) < 50:
        raise ValueError(f"Empty or tiny crop region: {region}")
    left = max(0, int(xx.min()) - PAD)
    top = max(0, int(yy.min()) - PAD)
    right = min(cell.width, int(xx.max()) + 1 + PAD)
    bottom = min(cell.height, int(yy.max()) + 1 + PAD)
    result = cell.crop((left, top, right, bottom))
    rgba = np.array(result)
    rgba[rgba[:, :, 3] < ALPHA_KEEP] = (0, 0, 0, 0)
    return Image.fromarray(rgba, "RGBA"), [x0 + left, y0 + top, x0 + right, y0 + bottom]


def board_anchor(image: Image.Image, group: str, frame: int):
    """Pick the board underside; ignore cyan motion streaks below the wheels.

    The magenta wheel/rim highlights remain clear even in the jump poses. A
    conservative bottom zone and dark-line fallback keep anchors deterministic.
    """
    arr = np.asarray(image)
    a = arr[:, :, 3]
    h, w = a.shape
    if group == "crash_fall_off_board":
        if frame == 5:
            return [round(w / 2, 1), h - 4], "detached-board-bottom-center", "detached-board"
        return [round(w / 2, 1), round(h / 2, 1)], "body-center", None
    magenta = ((arr[:, :, 0] > 105) & (arr[:, :, 2] > 85) &
               (arr[:, :, 1] < arr[:, :, 0] * .7) & (a > 90))
    bottom_zone = np.indices(magenta.shape)[0] > h * .44
    yy, xx = np.where(magenta & bottom_zone)
    if len(yy) >= 10:
        contact_y = min(h - 2, int(np.percentile(yy, 97)) + 3)
        contact_x = float((xx.min() + xx.max()) / 2)
        return [round(contact_x, 1), contact_y], "board-bottom-center", "wheel-rim"
    return [round(w / 2, 1), h - 5], "board-bottom-center", "estimated-no-visible-rim"


def scene_geometry(piece):
    group = piece["group"]
    kind = piece["type"]
    surface = piece.get("surface", [])
    grind = piece.get("grind", [])
    safe = bool(surface) and kind not in ("blocker", "decoration")
    return {
        "type": kind,
        "collision": {
            "safeTop": safe,
            "grindableTop": bool(grind),
            "dangerousSide": bool(piece.get("dangerousSide", False)),
            "fatalBelow": bool(piece.get("fatalBelow", False)),
            "solid": kind in ("blocker", "block", "bench", "ledge", "planter", "platform"),
            "stairSteps": group == "stairs" and kind == "stairs",
            "decoration": kind == "decoration",
        },
        "geometryHints": {
            "coordinateSpace": "normalized sourceRegion",
            "surfacePoints": surface,
            "grindPath": grind,
            "status": "visual guide; calibrate to placed sprite before enabling collision",
        },
        "rampType": kind if kind in ("kicker", "launch", "bank", "quarter", "transition", "special-launch") else None,
        "launchStrength": piece.get("launchStrength"),
        "launchStrengthStatus": "suggested metadata only; current mechanics unchanged" if piece.get("launchStrength") is not None else None,
    }


def preview(items, name, cols=5, cell=(250, 180)):
    rows = (len(items) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * cell[0], rows * cell[1]), (28, 31, 42, 255))
    draw = ImageDraw.Draw(atlas)
    for index, (item, img) in enumerate(items):
        col, row = index % cols, index // cols
        x, y = col * cell[0], row * cell[1]
        avail = (cell[0] - 16, cell[1] - 32)
        thumb = img.copy()
        thumb.thumbnail(avail, Image.Resampling.NEAREST)
        atlas.alpha_composite(thumb, (x + (cell[0] - thumb.width) // 2,
                                      y + 4 + (avail[1] - thumb.height) // 2))
        draw.text((x + 6, y + cell[1] - 23), item["id"], fill=(234, 241, 245, 255))
        draw.line((x, y + cell[1] - 1, x + cell[0], y + cell[1] - 1), fill=(87, 98, 112, 255))
    atlas.convert("RGB").save(OUT / "preview" / name, quality=93)


def anchor_preview(items, records):
    cols, cw, ch = 6, 230, 300
    rows = (len(items) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * cw, rows * ch), (28, 31, 42, 255))
    draw = ImageDraw.Draw(atlas)
    for index, ((item, img), frame) in enumerate(zip(items, records)):
        col, row = index % cols, index // cols
        x, y = col * cw, row * ch
        ax, ay = frame["anchorPx"]
        draw.line((x + 3, y + 225, x + cw - 3, y + 225), fill=(70, 193, 210, 255), width=2)
        atlas.alpha_composite(img, (round(x + cw/2 - ax), round(y + 225 - ay)))
        draw.ellipse((x+cw/2-3,y+222,x+cw/2+3,y+228), fill=(248, 218, 38, 255))
        draw.text((x + 6, y + ch - 22), item["id"], fill=(234, 241, 245, 255))
        draw.line((x, y + ch - 1, x + cw, y + ch - 1), fill=(87, 98, 112, 255))
    atlas.convert("RGB").save(OUT / "preview" / "zorp-anchor-atlas.jpg", quality=93)


def main():
    (OUT / "preview").mkdir(parents=True, exist_ok=True)
    rider_sheet = Image.open(ROOT / ZORP_SOURCE).convert("RGBA")
    scene_sheet = Image.open(ROOT / SCENE_SOURCE).convert("RGBA")
    manifest = {
        "schemaVersion": 1,
        "status": "rider-active; scene assets prepared-only",
        "sources": {ZORP_SOURCE: {"size": list(rider_sheet.size), "sha256": hashlib.sha256((ROOT / ZORP_SOURCE).read_bytes()).hexdigest()},
                    SCENE_SOURCE: {"size": list(scene_sheet.size), "sha256": hashlib.sha256((ROOT / SCENE_SOURCE).read_bytes()).hexdigest()}},
        "extraction": {"alphaKeep": ALPHA_KEEP, "alphaBounds": ALPHA_BOUNDS,
                       "padding": PAD, "rgbColorKey": False, "sectionTitlesExcluded": True},
        "zorp": {"anchorPolicy": "bottom-center at the board underside for attached poses",
                 "animations": {}},
        "scene": {group: [] for group in ("ground", "rails", "stairs", "ramps", "gap", "extras", "hazards")},
        "unidentified": [],
        "reviewFlags": [],
    }
    rider_preview = []
    rider_records = []
    for piece in RIDER:
        img, bounds = crop_piece(rider_sheet, piece)
        destination = OUT / "zorp" / piece["group"] / (piece["id"] + ".png")
        destination.parent.mkdir(parents=True, exist_ok=True)
        img.save(destination, optimize=True)
        anchor, policy, method = board_anchor(img, piece["group"], piece["frame"])
        frame = {
            "id": piece["id"], "file": destination.relative_to(ROOT).as_posix(),
            "source": ZORP_SOURCE, "sourceRegion": piece["region"],
            "sourceBounds": bounds, "size": list(img.size), "frame": piece["frame"],
            "boardAttached": piece["boardAttached"], "anchor": policy,
            "characterVisible": piece.get("characterVisible", True),
            "gameplayRecommended": piece.get("gameplayRecommended", True),
            "anchorPx": anchor,
            "drawOffsetPx": [-anchor[0], -anchor[1]],
            "boardContactPx": anchor if piece["boardAttached"] else None,
            "anchorDetection": method,
            "boardVisibility": piece.get("boardVisibility", "visible" if piece["boardAttached"] else "off-board animation"),
            "confidence": piece.get("confidence", "identified"),
        }
        manifest["zorp"]["animations"].setdefault(piece["group"], []).append(frame)
        if piece.get("confidence"):
            manifest["reviewFlags"].append({"id": piece["id"], "reason": piece["confidence"]})
        rider_preview.append((piece, img))
        rider_records.append(frame)

    scene_preview = []
    for piece in SCENE:
        img, bounds = crop_piece(scene_sheet, piece)
        destination = OUT / "scene" / piece["group"] / (piece["id"] + ".png")
        destination.parent.mkdir(parents=True, exist_ok=True)
        img.save(destination, optimize=True)
        entry = {
            "id": piece["id"], "file": destination.relative_to(ROOT).as_posix(),
            "source": SCENE_SOURCE, "sourceRegion": piece["region"],
            "sourceBounds": bounds, "size": list(img.size),
            "visualAnchor": "bottom-center",
            "confidence": piece.get("confidence", "identified"),
            **scene_geometry(piece),
        }
        manifest["scene"][piece["group"]].append(entry)
        if piece.get("confidence"):
            manifest["reviewFlags"].append({"id": piece["id"], "reason": piece["confidence"]})
        scene_preview.append((piece, img))

    manifest["counts"] = {
        "zorpFrames": len(rider_preview),
        "zorpAnimations": len(manifest["zorp"]["animations"]),
        "scene": {group: len(parts) for group, parts in manifest["scene"].items()},
    }
    manifest["zorp"]["recommendedAnimationFrames"] = {
        group: [frame["id"] for frame in frames if frame["gameplayRecommended"]]
        for group, frames in manifest["zorp"]["animations"].items()
    }

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    catalog = "(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;if(root)root.SkateAssetsV2=data;})(typeof globalThis==='object'?globalThis:this,function(){return Object.freeze(" + json.dumps(manifest, separators=(",", ":"), ensure_ascii=False) + ");});\n"
    (OUT / "catalog.js").write_text(catalog, encoding="utf-8")
    preview(rider_preview, "zorp-atlas.jpg", cols=6, cell=(205, 210))
    anchor_preview(rider_preview, rider_records)
    preview(scene_preview, "scene-atlas.jpg", cols=5, cell=(250, 180))
    print("Zorp frames:", len(rider_preview), "animations:", len(manifest["zorp"]["animations"]))
    print("Scene pieces:", {group: len(parts) for group, parts in manifest["scene"].items()})


if __name__ == "__main__":
    main()
