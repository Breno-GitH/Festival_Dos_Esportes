"""One-time alpha-component cropper for the official Skate sprite sheets."""
from collections import defaultdict
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHEETS = ("rampas.png", "grids.png", "assets_skate.png")
ALPHA_THRESHOLD = 8
PADDING = 4
MIN_COMPONENT_AREA = 180

LABELS = {
    "rampas.png": [
        ("quarter-large-neon", "ramps", "quarter", [[.02,.98],[.20,.95],[.36,.84],[.49,.61],[.60,.34],[.68,.08],[.94,.05]]),
        ("quarter-medium-neon", "ramps", "quarter", [[.02,.98],[.18,.94],[.39,.82],[.58,.61],[.73,.28],[.82,.06],[.97,.05]]),
        ("quarter-small-neon", "ramps", "quarter", [[.02,.98],[.24,.92],[.43,.76],[.58,.48],[.70,.10],[.96,.06]]),
        ("quarter-tall-neon", "ramps", "quarter", [[.02,.98],[.22,.94],[.42,.82],[.58,.60],[.72,.30],[.78,.06],[.96,.05]]),
        ("bank-long-descending", "ramps", "bank", [[.03,.18],[.24,.28],[.48,.46],[.74,.70],[.98,.96]]),
        ("quarter-wooden", "ramps", "quarter", [[.26,.03],[.32,.19],[.43,.46],[.58,.72],[.78,.90],[.98,.96]]),
        ("kicker-medium-neon", "ramps", "kicker", [[.03,.96],[.25,.91],[.47,.78],[.68,.52],[.83,.20],[.96,.035]]),
        ("bank-medium-ascending", "ramps", "bank", [[.03,.96],[.25,.86],[.48,.65],[.72,.38],[.98,.06]]),
        ("quarter-bowl", "ramps", "bowl", [[.02,.08],[.15,.40],[.29,.70],[.42,.91],[.53,.98],[.66,.91],[.79,.68],[.91,.37],[.98,.06]]),
        ("bank-long-ascending", "ramps", "bank", [[.02,.96],[.23,.81],[.45,.60],[.67,.39],[.84,.20],[.98,.06]])
    ],
    "grids.png": [
        ("rail-long-straight", "grinds", "rail", [[.02,.16],[.98,.16]]),
        ("rail-short-straight", "grinds", "rail", [[.03,.17],[.97,.17]]),
        ("handrail-descending-stairs", "grinds", "stair-rail", [[.03,.07],[.22,.18],[.43,.34],[.66,.50],[.97,.66]]),
        ("handrail-ascending-stairs", "grinds", "stair-rail", [[.03,.67],[.29,.54],[.56,.33],[.78,.17],[.97,.05]]),
        ("rail-curved-sag", "grinds", "curved-rail", [[.02,.30],[.18,.44],[.38,.66],[.54,.76],[.72,.66],[.88,.40],[.98,.08]]),
        ("rail-curved-rise", "grinds", "curved-rail", [[.02,.14],[.18,.40],[.36,.60],[.55,.66],[.74,.56],[.89,.30],[.98,.04]]),
        ("pipe-horizontal-frame", "grinds", "pipe", [[.04,.18],[.96,.18]]),
        ("cable-sag", "grinds", "cable", [[.02,.17],[.25,.43],[.50,.82],[.75,.43],[.98,.17]]),
        ("ledge-sloped", "grinds", "ledge", [[.02,.48],[.98,.05]]),
        ("ledge-short", "grinds", "ledge", [[.02,.06],[.98,.06]]),
        ("ledge-long", "grinds", "ledge", [[.02,.11],[.98,.11]])
    ],
    "assets_skate.png": [
        ("stairset-large", "props/gameplay", "stairs", [[.02,.04],[.18,.04],[.18,.13],[.34,.13],[.34,.23],[.50,.23],[.50,.34],[.66,.34],[.66,.47],[.82,.47],[.82,.62],[.98,.62]]),
        ("stairset-small", "props/gameplay", "stairs", [[.02,.05],[.24,.05],[.24,.22],[.45,.22],[.45,.40],[.68,.40],[.68,.61],[.98,.61]]),
        ("platform-wide", "props/gameplay", "platform", [[.03,.12],[.97,.12]]),
        ("block-low", "props/gameplay", "block", [[.03,.08],[.97,.08]]),
        ("ledge-long-low", "props/gameplay", "ledge", [[.02,.12],[.98,.12]]),
        ("bollard-cyan", "props/decoration", "decoration", []),
        ("bollard-yellow", "props/decoration", "decoration", []),
        ("bollard-magenta", "props/decoration", "decoration", []),
        ("bench-neon", "props/gameplay", "bench", [[.03,.18],[.97,.18]]),
        ("block-small", "props/gameplay", "block", [[.03,.08],[.97,.08]]),
        ("rooftop-garden-platform", "props/gameplay", "platform", [[.05,.77],[.95,.77]]),
        ("stair-platform", "props/gameplay", "stairs", [[.02,.04],[.24,.04],[.24,.18],[.46,.18],[.46,.33],[.68,.33],[.68,.49],[.98,.49]]),
        ("rooftop-utility-platform", "props/gameplay", "platform", [[.04,.18],[.96,.18]]),
        ("barrier-striped", "props/gameplay", "barrier", [[.03,.10],[.97,.10]]),
        ("planter-neon", "props/gameplay", "planter", [[.03,.20],[.97,.20]])
    ]
}


def components(image):
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.tobytes()
    parent = [0]
    boxes = {}
    previous = []

    def make(label):
        parent.append(label)
        return label

    def find(label):
        while parent[label] != label:
            parent[label] = parent[parent[label]]
            label = parent[label]
        return label

    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            parent[b] = a

    for y in range(height):
        row = y * width
        runs = []
        x = 0
        while x < width:
            while x < width and pixels[row + x] <= ALPHA_THRESHOLD:
                x += 1
            if x >= width:
                break
            start = x
            while x < width and pixels[row + x] > ALPHA_THRESHOLD:
                x += 1
            end = x
            label = make(len(parent))
            boxes[label] = [start, y, end, y + 1, end - start]
            runs.append((start, end, label))

        left = 0
        for start, end, label in runs:
            while left < len(previous) and previous[left][1] < start - 1:
                left += 1
            index = left
            while index < len(previous) and previous[index][0] <= end:
                p_start, p_end, p_label = previous[index]
                if p_end >= start - 1:
                    union(label, p_label)
                index += 1
        previous = runs

    merged = defaultdict(lambda: [width, height, 0, 0, 0])
    for label, box in boxes.items():
        root = find(label)
        out = merged[root]
        out[0] = min(out[0], box[0])
        out[1] = min(out[1], box[1])
        out[2] = max(out[2], box[2])
        out[3] = max(out[3], box[3])
        out[4] += box[4]

    result = []
    for x0, y0, x1, y1, area in merged.values():
        if area >= MIN_COMPONENT_AREA:
            result.append((x0, y0, x1, y1, area))
    return sorted(result, key=lambda item: (item[1], item[0]))


if __name__ == "__main__":
    manifest = {"schemaVersion": 1, "anchor": "bottom-center", "sources": {}, "ramps": [], "grinds": [], "props": {"gameplay": [], "decoration": []}, "riderFrames": {}}
    for filename in SHEETS:
        source = Image.open(ROOT / filename).convert("RGBA")
        print(filename, source.size)
        found = components(source)
        labels = LABELS[filename]
        if len(found) != len(labels):
            raise RuntimeError(f"{filename}: {len(found)} visible components but {len(labels)} labels")
        manifest["sources"][filename] = {"width": source.width, "height": source.height, "components": len(found), "alphaThreshold": ALPHA_THRESHOLD, "padding": PADDING}
        for index, ((x0, y0, x1, y1, area), (name, folder, kind, path)) in enumerate(zip(found, labels), 1):
            crop_box = (max(0, x0 - PADDING), max(0, y0 - PADDING), min(source.width, x1 + PADDING), min(source.height, y1 + PADDING))
            crop = source.crop(crop_box)
            output = ROOT / "skate_new" / folder / f"{name}.png"
            output.parent.mkdir(parents=True, exist_ok=True)
            crop.save(output, optimize=True)
            item = {
                "id": name,
                "type": kind,
                "file": output.relative_to(ROOT).as_posix(),
                "source": filename,
                "sourceBounds": [x0, y0, x1, y1],
                "cropBounds": list(crop_box),
                "size": [crop.width, crop.height],
                "surfacePointsNormalized": path,
                "collisionOffset": [0, 0]
            }
            if folder == "ramps":
                item["launchStrength"] = {"kicker": 120, "bank": 145, "quarter": 190, "bowl": 210}[kind]
                manifest["ramps"].append(item)
            elif folder == "grinds":
                item["grindPathNormalized"] = path
                manifest["grinds"].append(item)
            else:
                collision = folder.endswith("gameplay")
                item["category"] = "GAMEPLAY" if collision else "DECORATION"
                item["standingSurfaceNormalized"] = path if collision and path else []
                item["solidColliderNormalized"] = [0.04, 0.50, 0.96, 0.98] if collision else None
                if collision and kind in ("ledge", "platform"):
                    item["grindPathNormalized"] = path
                manifest["props"]["gameplay" if collision else "decoration"].append(item)
            print(f"  {index:02}: {name} ({x0},{y0})-({x1},{y1}) => {crop.width}x{crop.height}")

    test_area = {
        "enabledOnlyInDebug": True,
        "ground": {"startX": 0, "endX": 1100, "y": 0},
        "ramps": ["quarter-small-neon", "quarter-large-neon"],
        "grinds": ["rail-short-straight", "handrail-descending-stairs", "ledge-long"],
        "platforms": ["platform-wide"],
        "note": "Isolated calibration fixture; not part of COURSE or the authored level."
    }
    manifest["testArea"] = test_area
    for frame in sorted((ROOT / "skate_sprites").glob("zorp_skate_*.png")):
        if "_review" in frame.stem:
            continue
        image = Image.open(frame).convert("RGBA")
        bounds = image.getchannel("A").getbbox()
        if bounds:
            manifest["riderFrames"][frame.name] = {
                "sourceSize": [image.width, image.height],
                "alphaBounds": list(bounds),
                "anchor": "bottom-center"
            }
    json_text = __import__("json").dumps(manifest, indent=2)
    (ROOT / "skate_new" / "asset_manifest.json").write_text(json_text + "\n", encoding="utf-8")
    runtime_catalog = "(function (root, factory) {\n    const catalog = factory();\n    if (typeof module === 'object' && module.exports) module.exports = catalog;\n    if (root) root.SkateNewAssets = catalog;\n})(typeof globalThis === 'object' ? globalThis : this, function () {\n    return Object.freeze(" + __import__("json").dumps(manifest, separators=(",", ":")) + ");\n});\n"
    (ROOT / "skate_new" / "asset_catalog.js").write_text(runtime_catalog, encoding="utf-8")

