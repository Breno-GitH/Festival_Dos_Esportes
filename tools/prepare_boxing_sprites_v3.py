"""Prepare official boxing 3.0 sheets without assuming a rectangular grid.

Row and pose order is visually curated. Minimum-alpha seams follow the gaps
between silhouettes, including extended gloves and poses whose bounds overlap.
The original RGBA pixels are retained; black is never used as a color key.
"""
from __future__ import annotations

import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "boxe_assets" / "v3"
CANVAS = (320, 224)
ANCHOR = (160, 210)
UNIT_SCALE = .72
EXCLUDED_SOURCE_POSES = {
    "zorp": {"4.5", "4.6", "6.1", "6.2", "6.3", "6.5", "6.6", "6.7", "6.8", "6.9"},
    "master": {"1.6", "1.7"},
    "judge": {"5.4", "5.5", "5.7", "5.8"},
}

SHEETS = {
    "zorp": {
        "source": "zorp_boxe3.0.png",
        "rowSeams": [217, 423, 630, 835, 1049],
        "cuts": [
            [162, 311, 459, 614, 764, 919, 1080],
            [161, 306, 489, 696, 913, 1080],
            [163, 321, 486, 636, 771, 922, 1088],
            [165, 313, 465, 590, 766, 968, 1106],
            [176, 304, 418, 555, 766, 903, 1077],
            [137, 259, 378, 503, 627, 751, 875, 998, 1121],
        ],
        "labels": [
            ["stance"] * 6 + ["step", "step"],
            ["step", "stance", "lead_straight", "rear_straight", "straight_followthrough", "inside_windup", "stance"],
            ["high_guard", "guard", "slip", "slip", "duck", "low_guard", "weave", "guard"],
            ["hurt", "stagger", "hurt_bruised", "hurt_low", "fall", "prone", "kneeling", "getup_tired"],
            ["victory", "dejected", "stunned", "fall_crouch", "prone", "recover_prone", "kneeling", "tired_stance"],
            ["damage_healthy"] * 3 + ["damage_moderate"] * 3 + ["damage_heavy"] * 4,
        ],
        "actions": {
            "idle": ["1.1", "1.2", "1.3", "1.4"],
            "walk": ["1.7", "1.8", "2.1", "2.2"],
            "jab": ["2.2", "2.3", "2.7"],
            "cross": ["2.2", "2.4", "2.5", "2.7"],
            "hook": ["2.6", "2.5", "2.7"],
            "guard": ["3.1", "3.2", "3.8"],
            "dodge": ["3.3", "3.5", "3.7"],
            "hurt": ["4.1", "4.3", "4.4"],
            "stun": ["4.2", "5.3"],
            "knockdown": ["4.3", "4.4", "5.4", "5.5"],
            "getup": ["5.5", "5.6", "5.7", "4.8", "6.10"],
            "victory": ["5.1"], "defeat": ["5.5"],
            "idle_damaged": ["6.4"],
            "idle_heavy": ["6.10"],
            "dash": ["2.6", "2.4", "2.5", "2.7"],
            "charged": ["2.6", "2.2", "2.5", "2.7"],
            "burst": ["3.1", "3.8"],
        },
    },
    "master": {
        "source": "mestre_boxe3.0.png",
        "rowSeams": [208, 412, 620, 811, 1036],
        "cuts": [
            [157, 303, 450, 609, 764, 916, 1068],
            [160, 316, 470, 694, 893, 1064],
            [149, 313, 474, 607, 761, 915, 1087],
            [143, 282, 417, 583, 774, 975, 1130],
            [186, 376, 568, 748, 909, 1080],
            [127, 248, 374, 498, 626, 752, 875, 999, 1125],
        ],
        "labels": [
            ["stance"] * 6 + ["step", "step"],
            ["step", "stance", "stance", "lead_straight", "rear_straight", "inside_windup", "stance"],
            ["high_guard", "guard", "slip", "slip", "duck", "weave", "weave", "guard"],
            ["hurt", "stagger", "stunned", "fall_seated", "fall", "prone", "kneeling", "getup_tired"],
            ["victory", "victory", "victory", "dejected", "tired", "tired_low", "tired_stance"],
            ["damage_healthy"] * 3 + ["damage_moderate"] * 3 + ["damage_heavy"] * 4,
        ],
        "actions": {
            "idle": ["1.1", "1.2", "1.3", "1.4"],
            "walk": ["1.8", "2.1", "2.2", "2.3"],
            "jab": ["2.3", "2.4", "2.7"],
            "cross": ["2.3", "2.5", "2.7"],
            "hook": ["2.6", "2.5", "2.7"],
            "guard": ["3.1", "3.2", "3.8"],
            "dodge": ["3.3", "3.5", "3.7"],
            "hurt": ["4.1", "4.2", "4.3"], "stun": ["4.2", "4.3"],
            "knockdown": ["4.3", "4.4", "4.5", "4.6"],
            "getup": ["4.6", "4.7", "4.8", "6.10"],
            "victory": ["5.1", "5.2", "5.3"], "defeat": ["4.6"],
            "idle_damaged": ["6.4", "6.5", "6.6"],
            "idle_heavy": ["6.8", "6.9", "6.10"],
            "dash": ["2.6", "2.5", "2.7"],
            "charged": ["2.6", "2.3", "2.5", "2.7"],
            "burst": ["3.1", "3.8"],
        },
    },
    "judge": {
        "source": "juiz_boxe3.0.png",
        "rowSeams": [234, 437, 657, 854, 1081],
        "cuts": [
            [122, 225, 357, 489, 626, 754, 881, 1010, 1120],
            [189, 372, 559, 740, 937, 1087],
            [178, 345, 483, 657, 803, 935, 1097],
            [158, 318, 480, 647, 832, 967, 1103],
            [132, 301, 465, 602, 716, 875, 981, 1143],
            [121, 249, 357, 467, 587, 719, 838, 952, 1054, 1160],
        ],
        "labels": [
            ["idle", "idle", "observe", "observe", "observe"] + ["step"] * 5,
            ["separate", "point", "point", "start_stop", "separate", "gesture", "continue"],
            ["approach", "gesture", "observe_low", "kneel", "observe_kneel", "observe_kneel", "observe_low", "stop"],
            ["observe_low"] * 7 + ["stop"],
            ["ko_stop", "separate", "point", "paired_result", "paired_result", "point", "paired_result", "paired_result", "back_step"],
            ["observe_low", "continue", "observe_low", "observe", "kneel", "back_point", "continue", "kneel_back", "back_step", "back_idle", "back_step"],
        ],
        "actions": {
            "idle": ["1.1", "1.2", "1.3"],
            "observe": ["1.1", "1.2", "1.3"],
            "step": ["1.6", "1.7", "1.8", "1.9", "1.10"],
            "start": ["2.1", "2.4", "2.5", "2.1"],
            "count_start": ["3.1", "3.3", "4.1"],
            "count": ["4.1", "4.2", "4.4", "4.5"],
            "continue": ["2.2", "2.3", "2.7"],
            "ko": ["3.8", "5.1", "5.2"],
            "victory": ["5.2", "5.3"],
        },
    },
}


def seam(alpha: np.ndarray, expected: int, corridor: int = 32, protect_upper: bool = False):
    """Lowest ink seam; route around gloves/feet instead of cutting a grid cell."""
    h, w = alpha.shape
    lo, hi = max(1, expected - corridor), min(w - 1, expected + corridor)
    x = np.arange(lo, hi + 1)
    costs = (alpha[:, lo:hi + 1].astype(np.float64) / 255) ** 2 * 1200
    if protect_upper:
        occupied = np.flatnonzero((alpha > 80).any(axis=1))
        # When shoe outlines touch, cut the shared contact at floor level;
        # never take a cheaper shortcut across an ankle and detach the boot.
        if len(occupied):
            costs[:max(0, int(occupied[-1]) - 12)] *= 80
    costs += np.abs(x - expected)[None, :] * .018
    previous = costs[0].copy()
    back = np.zeros(costs.shape, dtype=np.int16)
    for y in range(1, h):
        choices = np.full((9, len(x)), np.inf)
        for i, delta in enumerate(range(-4, 5)):
            j = np.arange(len(x)) + delta
            ok = (j >= 0) & (j < len(x))
            choices[i, ok] = previous[j[ok]] + abs(delta) * .12
        best = choices.argmin(axis=0)
        back[y] = best - 4
        previous = costs[y] + choices[best, np.arange(len(x))]
    index = int(previous.argmin())
    result = np.zeros(h, dtype=np.int32)
    for y in range(h - 1, -1, -1):
        result[y] = lo + index
        index += int(back[y, index])
    return result


def font(size):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def preview(actor, frames):
    columns, cw, ch = 5, 230, 182
    out = Image.new("RGB", (columns * cw, 45 + ((len(frames) + columns - 1) // columns) * ch), "#202936")
    d = ImageDraw.Draw(out)
    d.text((12, 10), f"BOXE 3.0 / {actor.upper()} / bottom-center", font=font(20), fill="white")
    for i, f in enumerate(frames.values()):
        x, y = (i % columns) * cw, 45 + (i // columns) * ch
        d.rectangle((x + 3, y + 3, x + cw - 3, y + ch - 3), fill="#354353")
        im = Image.open(ROOT / f["sprite"]).convert("RGBA")
        im = im.resize((224, 157), Image.Resampling.NEAREST)
        out.paste(im, (x + 3, y + 10), im)
        # This is the runtime anchor, not the bottom of each source cell.
        ax, ay = x + 3 + 112, y + 10 + 147
        d.line((x + 7, ay, x + cw - 7, ay), fill="#57dbe8")
        d.ellipse((ax - 2, ay - 2, ax + 2, ay + 2), fill="#ffe178")
        label = f'{f["id"]}: {f["label"]}'
        d.text((x + 8, y + 5), label, font=font(12), fill="white")
    out.save(OUT / f"{actor}_preview.jpg", quality=94)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    actors = {}
    validation = {}
    for actor, spec in SHEETS.items():
        required = {key for refs in spec["actions"].values() for key in refs}
        if required & EXCLUDED_SOURCE_POSES[actor]:
            raise ValueError(f"Ambiguous source poses must not enter runtime: {actor}")
        source = Image.open(ROOT / spec["source"]).convert("RGBA")
        rgba = np.array(source)
        alpha = rgba[:, :, 3]
        # Remove only extremely faint detached export dust, retaining original alpha near visible art.
        near_visible = np.array(Image.fromarray((alpha > 16).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7))) > 0
        rgba[:, :, 3] = np.where(near_visible, alpha, 0)
        alpha = rgba[:, :, 3]
        h, w = alpha.shape
        horizontal = [np.zeros(w, dtype=np.int32)]
        horizontal += [seam(alpha.T, y, 31) for y in spec["rowSeams"]]
        horizontal += [np.full(w, h, dtype=np.int32)]
        yy, xx = np.indices((h, w))
        frames = {}
        crossing = []
        for row_index, cuts in enumerate(spec["cuts"]):
            row_mask = (yy >= horizontal[row_index][None, :]) & (yy < horizontal[row_index + 1][None, :])
            row_alpha = np.where(row_mask, alpha, 0)
            occupied_y = np.flatnonzero((row_alpha > 16).any(axis=1))
            y1, y2 = max(0, int(occupied_y[0]) - 4), min(h, int(occupied_y[-1]) + 5)
            local = row_alpha[y1:y2]
            boundaries = [np.zeros(y2 - y1, dtype=np.int32)]
            for cut in cuts:
                path = seam(local, cut, 37, protect_upper=True)
                boundaries.append(path)
                ink = local[np.arange(len(path)), path]
                crossing.append({"row": row_index + 1, "nearX": cut, "solidPixelsCrossed": int((ink > 80).sum())})
            boundaries.append(np.full(y2 - y1, w, dtype=np.int32))
            for col in range(len(boundaries) - 1):
                if not np.all(boundaries[col] < boundaries[col + 1]):
                    raise ValueError(f"Crossing separators: {actor} row {row_index + 1}")
                key = f"{row_index + 1}.{col + 1}"
                if key not in required:
                    continue
                pose_mask = (xx[y1:y2] >= boundaries[col][:, None]) & (xx[y1:y2] < boundaries[col + 1][:, None]) & row_mask[y1:y2]
                pose = rgba[y1:y2].copy()
                pose[:, :, 3] = np.where(pose_mask, pose[:, :, 3], 0)
                solid = pose[:, :, 3] > 32
                ys, xs = np.where(solid)
                bx1, bx2, by1, by2 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
                # Feet/contact pixels, rather than fist or hair bounds, determine the pivot.
                body = pose[:, :, 3] > 100
                support_rows = body.sum(axis=1)
                floor = int(np.flatnonzero(support_rows > max(3, support_rows.max() * .035))[-1])
                foot_y, foot_x = np.where(body[max(0, floor - 9):floor + 1])
                foot_center = (int(foot_x.min()) + int(foot_x.max())) / 2
                crop_box = (max(0, bx1 - 5), max(0, by1 - 5), min(w, bx2 + 5), min(y2 - y1, by2 + 5))
                crop = Image.fromarray(pose).crop(crop_box)
                scale = UNIT_SCALE
                resized = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.NEAREST)
                dx = ANCHOR[0] - round((foot_center - crop_box[0]) * scale)
                dy = ANCHOR[1] - round((floor + 1 - crop_box[1]) * scale)
                if dx < 4 or dy < 4 or dx + resized.width > CANVAS[0] - 4 or dy + resized.height > CANVAS[1] - 4:
                    raise ValueError(f"Canvas would clip {actor} {row_index + 1}.{col + 1}: {dx},{dy} {resized.size}")
                canvas = Image.new("RGBA", CANVAS)
                canvas.alpha_composite(resized, (dx, dy))
                frame_id = f"r{row_index + 1:02}_f{col + 1:02}"
                path = OUT / actor / f"{actor}_{frame_id}.png"
                path.parent.mkdir(parents=True, exist_ok=True)
                canvas.save(path, optimize=True)
                frames[key] = {
                    "id": frame_id, "label": spec["labels"][row_index][col],
                    "sprite": path.relative_to(ROOT).as_posix(),
                    "sourceBounds": [bx1, y1 + by1, bx2 - bx1, by2 - by1],
                    "sourceContact": [foot_center, y1 + floor + 1],
                    "anchor": {"x": ANCHOR[0], "y": ANCHOR[1]}, "unitScale": scale,
                    "classificationConfidence": "visual_pose",
                }
        actions = {name: refs for name, refs in spec["actions"].items()}
        for action, refs in actions.items():
            for key in refs:
                if key not in frames:
                    raise ValueError(f"Missing {actor}/{action}/{key}")
        # Semantic aliases only. J/K remain the existing jab/cross controls.
        if actor != "judge":
            actions["jab_left"] = actions["jab"]
            actions["jab_right"] = actions["cross"]
        actors[actor] = {"source": spec["source"], "sourcePoseCount": sum(len(cuts) + 1 for cuts in spec["cuts"]), "frameCount": len(frames), "frames": frames, "actions": actions}
        used = {ref for refs in actions.values() for ref in refs}
        validation[actor] = {"frames": len(frames), "runtimeFrames": len(used), "excludedSourcePoses": sorted(EXCLUDED_SOURCE_POSES[actor]), "canvasClipping": 0, "seamContacts": [c for c in crossing if c["solidPixelsCrossed"]]}
        preview(actor, frames)
    manifest = {
        "schemaVersion": 3, "version": "3.0.1", "canvas": {"width": 320, "height": 224, "anchorX": 160, "anchorY": 210},
        "method": "Visually curated rows; minimum-alpha pixel seams; original RGBA; bottom-center support-pixel anchors; fixed actor scale.",
        "actors": actors,
        "notes": [
            "The source sheets are already transparent; no black-color keying or interior dark-pixel removal was applied.",
            "Lead/rear straight punches are visible. Exact anatomical left/right is inferred from the drawn stance, not labelled in the source.",
            "A dedicated hook/uppercut or dash series is not clearly isolated: existing compact windup and punch follow-through poses represent those current combat states. No new frames were invented.",
            "Judge count uses crouched observation poses, without finger-number counting. The existing numeric HUD supplies 1 through 10.",
            "Four judge source poses share raised hands; ten Zorp and two Master source poses share shoe/prone pixels. They are excluded from export and every runtime action.",
            "Several shoes and prone silhouettes touch in the source. Seams preserve complete main silhouettes where possible; contact points are recorded in validation.json.",
            "Only frames referenced by current actions are exported. Source-only and ambiguous poses remain solely in the original 3.0 sheets.",
        ],
    }
    (OUT / "boxing_v3_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "boxing_v3_manifest.js").write_text("\"use strict\";\nconst BOXING_V3_MANIFEST = Object.freeze(" + json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + ");\n", encoding="utf-8")
    (OUT / "validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
