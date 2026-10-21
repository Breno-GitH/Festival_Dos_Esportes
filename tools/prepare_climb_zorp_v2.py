"""Extract existing Zorp 2.0 silhouettes; never include sheet labels or frames.

Requires Pillow. Source pixels remain unchanged, including enclosed black pixels.
The source already has alpha: no color-key removal is necessary.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "zorp_escalada2.0.png"
OUT = ROOT / "climb_assets" / "zorp_v2"
CANVAS = (144, 192)
ANCHOR = (72, 186)
# These are visible contact/torso landmarks measured on the supplied sheet,
# not cell centers. Feet remain the shared bottom-center for standing/air.
HAND_POINTS = {
    "idle_01": (86, 98), "idle_02": (204, 99), "idle_03": (321, 97), "idle_04": (435, 95),
    "edge_wait_01": (594, 91), "edge_wait_02": (710, 94),
    "edge_wait_03": (825, 92), "edge_wait_04": (936, 91),
    "lower_grip_01": (87, 533), "lower_grip_02": (183, 533), "lower_grip_03": (275, 532),
}
BODY_POINTS = {
    "side_grip_01": (69, 383), "side_grip_02": (169, 385),
    "side_grip_03": (274, 386), "side_grip_04": (379, 383),
    "transfer_01": (415, 609), "transfer_02": (510, 604),
    "transfer_03": (599, 606), "transfer_04": (701, 601),
    "pull_up_01": (509, 408), "pull_up_02": (607, 391),
    "pull_up_03": (704, 400), "pull_up_04": (806, 373),
    "corner_01": (806, 616), "corner_02": (916, 623), "corner_03": (995, 615),
}


def state_config():
    def seq(prefix, numbers):
        return [f"{prefix}_{n:02d}" for n in numbers]
    def state(frames, anchor, offset, fps=6, loop=True, orientation="back", mirror=False, note=""):
        return dict(frames=frames, anchor=anchor, targetOffset=offset, fps=fps,
                    loop=loop, orientation=orientation, mirror=mirror, note=note)
    return {
        "CLIMB_IDLE": state(seq("idle", range(1, 5)), "hands", [0, -44], fps=5),
        "CLIMB_HOLD": state(seq("edge_wait", range(1, 5)), "hands", [0, -44]),
        "CLIMB_MOVE": state(seq("transfer", [1, 3, 4]), "body", [0, -24], fps=9,
                            note="Transições de costas/3/4 traseiro; a variante frontal transfer_02 permanece catalogada separadamente."),
        "CLIMB_SIDE": state(["side_grip_03"], "body", [0, -24], mirror="right",
                            note="Pose lateral de costas; a mesma pose é espelhada para a mão oposta, sem criar outro desenho."),
        "PULL_UP": state(seq("pull_up", range(1, 5)), "body", [0, -24], fps=6, loop=False),
        "JUMP": state(seq("jump", range(1, 5)), "lowerCenter", [0, 0], fps=9,
                      loop=False, orientation="side", mirror="left"),
        "FALL": state(seq("fall", range(1, 4)), "lowerCenter", [0, 0], fps=7,
                      orientation="tumbling", mirror="left"),
        "HANG": state(seq("lower_grip", range(1, 4)), "hands", [0, -44]),
        "CLIMB_CORNER": state(seq("corner", range(1, 4)), "body", [0, -24], fps=10,
                              loop=False, note="Trecho final do climb-up já existente no cume; não cria uma nova mecânica de movimento."),
        "CHECKPOINT_IDLE": state(["checkpoint_01"], "feet", [0, 3], orientation="standing"),
        "CHECKPOINT_WALK_LEFT": state(seq("walk", range(1, 5)), "feet", [0, 3], fps=8,
                                      orientation="standing_side", mirror=True),
        "CHECKPOINT_WALK_RIGHT": state(seq("walk", range(1, 5)), "feet", [0, 3], fps=8,
                                       orientation="standing_side"),
        "CHECKPOINT_JUMP": state(["checkpoint_06"], "lowerCenter", [0, 0],
                                 orientation="standing_three_quarter", mirror="left", loop=False),
        "TIRED": state(seq("tired", range(1, 4)), "feet", [0, 3], fps=4,
                       orientation="mixed", note="Estado visual preparado, sem adicionar stamina/cansaço à gameplay. Na parede, prioriza tired_02 de costas."),
        "HIT": state(seq("hurt", range(1, 4)), "feet", [0, 3], fps=9,
                     loop=False, orientation="three_quarter"),
        "VICTORY": state(seq("victory", range(1, 5)) + ["victory_01"], "feet", [0, 3], fps=5,
                         loop=False, orientation="front",
                         note="Quatro poses reais, uma comemoração e retorno à primeira pose de vencedor; sem marcas decorativas da folha."),
    }
# Panel interiors exclude headings and dividers. Frames are connected visible
# silhouettes within these windows, NOT fixed-size cells in an assumed grid.
PANELS = [
    ("idle", (20, 49, 503, 212)),
    ("edge_wait", (525, 49, 1000, 212)),
    ("walk", (1025, 49, 1622, 212)),
    ("side_grip", (20, 267, 425, 455)),
    ("pull_up", (450, 266, 864, 455)),
    ("jump", (882, 263, 1328, 455)),
    ("fall", (1350, 266, 1651, 455)),
    ("lower_grip", (20, 510, 334, 688)),
    ("transfer", (355, 510, 746, 688)),
    ("corner", (766, 510, 1040, 688)),
    ("checkpoint", (1060, 510, 1654, 688)),
    ("tired", (20, 746, 426, 919)),
    ("hurt", (450, 746, 854, 919)),
    ("victory", (875, 746, 1650, 919)),
]


def components(image):
    alpha = image.getchannel("A")
    px = alpha.load()
    seen = set()
    parts = []
    for y in range(image.height):
        for x in range(image.width):
            if px[x, y] < 40 or (x, y) in seen:
                continue
            queue = [(x, y)]
            seen.add((x, y))
            for ax, ay in queue:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                               (1, 1), (-1, -1), (1, -1), (-1, 1)):
                    nx, ny = ax + dx, ay + dy
                    if (0 <= nx < image.width and 0 <= ny < image.height
                            and (nx, ny) not in seen and px[nx, ny] >= 40):
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            xs, ys = zip(*queue)
            parts.append({"pixels": queue, "box": (min(xs), min(ys), max(xs)+1, max(ys)+1)})
    return parts


def main():
    sheet = Image.open(ROOT / SOURCE).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    frames, actions, excluded = [], {}, []
    for action, window in PANELS:
        panel = sheet.crop(window)
        parts = components(panel)
        bodies = sorted([p for p in parts if len(p["pixels"]) > 5000], key=lambda p: p["box"][0])
        core_owners = {pixel: i for i, p in enumerate(bodies) for pixel in p["pixels"]}
        actions[action] = []
        for number, body in enumerate(bodies, 1):
            l, t, r, b = body["box"]
            if r - l > 150:
                # Never silently divide a genuinely merged silhouette.
                excluded.append({"action": action, "sourceBounds": [l+window[0], t+window[1], r+window[0], b+window[1]],
                                 "reason": "Two touching middle pull-up silhouettes; not used at runtime."})
                continue
            selected = list(body["pixels"])
            # Victory supplies only the actor. Detached orange excitement marks
            # belong to the sheet decoration, not to Zorp's antennae/equipment.
            decoration = {pixel for part in parts if part is not body for pixel in part["pixels"]} if action == "victory" else set()
            for part in parts:
                if action == "victory":
                    continue
                if part is body or len(part["pixels"]) < 8 or len(part["pixels"]) > 5000:
                    continue
                pl, pt, pr, pb = part["box"]
                if ((pr-pl > 50 and pb-pt < 5) or
                        (pb-pt > 70 and pr-pl < 5)):
                    continue  # Residual thin panel decoration, not character art.
                cx, cy = (pl+pr)/2, (pt+pb)/2
                def distance(candidate):
                    a, c, d, e = candidate["box"]
                    return max(a-cx, 0, cx-d)**2 + max(c-cy, 0, cy-e)**2
                if min(bodies, key=distance) is body and distance(body) <= 30**2:
                    selected.extend(part["pixels"])  # Antennae, stars, breath, impact marks.
            isolated = Image.new("RGBA", panel.size)
            source_px, dest_px = panel.load(), isolated.load()
            # Cores above alpha 40 separate the two pull-up silhouettes: the
            # apparent connection was a low-alpha (25..39) background bridge.
            # Restore original translucent contour pixels in two non-iterative
            # rings, without flood-filling through that bridge to another pose.
            selected = set(selected)
            contour = set(selected)
            for x, y in selected:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)):
                    nx, ny = x+dx, y+dy
                    if (0 <= nx < panel.width and 0 <= ny < panel.height and source_px[nx, ny][3]
                            and core_owners.get((nx, ny), number-1) == number-1
                            and (nx, ny) not in decoration):
                        contour.add((nx, ny))
            for x, y in contour:
                dest_px[x, y] = source_px[x, y]
            box = isolated.getbbox()
            cropped = isolated.crop(box)
            assert cropped.width + 12 <= CANVAS[0] and cropped.height + 12 <= CANVAS[1], (action, box)
            canvas = Image.new("RGBA", CANVAS)
            offset = (ANCHOR[0] - cropped.width//2, ANCHOR[1] - cropped.height)
            canvas.paste(cropped, offset)
            source_number = number
            ident = f"{action}_{source_number:02d}"
            relative = f"zorp_v2/{ident}.png"
            canvas.save(OUT / f"{ident}.png")
            actions[action].append(ident)
            def source_anchor(point):
                return [point[0]-box[0]-window[0]+offset[0], point[1]-box[1]-window[1]+offset[1]]
            body_box = body["box"]
            body_point = BODY_POINTS.get(ident, ((body_box[0]+body_box[2])/2+window[0],
                                                body_box[1]+(body_box[3]-body_box[1])*.65+window[1]))
            anchors = {"feet": list(ANCHOR), "lowerCenter": [ANCHOR[0], ANCHOR[1]-6],
                       "body": source_anchor(body_point)}
            if ident in HAND_POINTS:
                anchors["hands"] = source_anchor(HAND_POINTS[ident])
            assert all(0 <= point[0] < CANVAS[0] and 0 <= point[1] < CANVAS[1]
                       for point in anchors.values()), (ident, anchors)
            source_rect = [box[0]+window[0], box[1]+window[1], box[2]-box[0], box[3]-box[1]]
            frames.append({"id": ident, "file": relative, "source": SOURCE,
                           "category": "zorp", "subtype": action, "state": action.upper(), "frame": source_number,
                           "width": CANVAS[0], "height": CANVAS[1], "anchorX": ANCHOR[0], "anchorY": ANCHOR[1],
                           "contactAnchorX": ANCHOR[0], "contactAnchorY": ANCHOR[1],
                           "anchorType": "BOTTOM_CENTER", "canvasGroup": "climb_zorp",
                           "sourceBounds": [box[0]+window[0], box[1]+window[1], box[2]+window[0], box[3]+window[1]],
                           "sourceRect": source_rect, "anchors": anchors,
                           "visibleBounds": list(canvas.getbbox()),
                           "notes": "Original RGBA pixels, component-isolated with 6px minimum safety margin; uniform scale."
                           + (" Character only; detached victory decoration excluded." if action == "victory" else "")})
    states = state_config()
    used = {ident for state in states.values() for ident in state["frames"]}
    index = {frame["id"]: frame for frame in frames}
    for name, state in states.items():
        for ident in state["frames"]:
            assert ident in index and state["anchor"] in index[ident]["anchors"], (name, ident)
    manifest = {"version": "2.2.0", "source": SOURCE, "canvas": list(CANVAS), "anchor": list(ANCHOR),
                "bodyHeight": 153, "displayBodyHeight": 64, "actions": actions, "frames": frames,
                "states": states, "usedFrames": sorted(used),
                "availableOnly": sorted(set(index)-used), "excluded": excluded,
                "collision": {"body": {"offset": [0, -14], "radius": 16},
                              "note": "Existing runtime damage circle; independent of PNG bounds and visual anchors."}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    # JSONP-style local catalog works under file:// without fetch/CORS.
    (OUT / "manifest.js").write_text("// Generated by tools/prepare_climb_zorp_v2.py; original poses only.\n"
        + "const CLIMB_ZORP_V2_MANIFEST = Object.freeze(" + json.dumps(manifest, ensure_ascii=False) + ");\n", encoding="utf-8")
    combined_path = ROOT / "climb_assets" / "climb_assets_manifest.json"
    combined = json.loads(combined_path.read_text(encoding="utf-8-sig"))
    combined["sources"] = [SOURCE, "pedras_efeitos.png", "assets_escalada.png"]
    combined["frames"] = [f for f in combined["frames"] if f["category"] != "zorp"] + frames
    combined["uncertainCrops"] = [f for f in combined.get("uncertainCrops", []) if f["source"] not in ("escalada_zorp.png", SOURCE)]
    combined["uncertainCrops"] += [{"source": SOURCE, **item} for item in excluded]
    combined["transparency"] = "Zorp 2.0 retains original RGBA alpha; other sheets retain edge-connected background removal."
    combined_path.write_text(json.dumps(combined, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    preview = Image.new("RGB", (900, ((len(frames)+8)//9)*230), "#132334")
    draw = ImageDraw.Draw(preview)
    for i, frame in enumerate(frames):
        x, y = i%9*100, i//9*230
        tile = Image.open(ROOT / "climb_assets" / frame["file"])
        # Fit thumbnail uniformly; the actual PNGs remain unscaled.
        tile.thumbnail((98, 192), Image.Resampling.NEAREST)
        preview.paste(tile, (x+(100-tile.width)//2, y+20), tile)
        draw.line((x+5, y+20+tile.height-4, x+95, y+20+tile.height-4), fill="#416b77")
        draw.text((x+3, y+205), frame["id"], fill="white")
    preview_path = ROOT / "docs" / "climb_asset_previews" / "climb_zorp_v2_preview.png"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(preview_path)
    report = ["# Atlas do Zorp — Escalada 2.0", "", f"Fonte: `{SOURCE}`. {len(frames)} recortes reais; {len(used)} frames usados em 16 estados.",
              "", "Canvas: 144 × 192. Escala única: 64/153 px de mundo por pixel da imagem, sem redimensionar cada pose.",
              "As bordas semitransparentes originais são preservadas; a ponte quase transparente entre as poses de pull-up foi separada pelos componentes visíveis.",
              "", "## Mapa dos estados", ""]
    for name, state in states.items():
        report.extend([f"### {name}", "", "Frames: " + ", ".join(f"`{ident}.png`" for ident in state["frames"]),
                       f"", f"Âncora: `{state['anchor']}`; offset no mundo: `{state['targetOffset']}`; {state['fps']} fps; espelhamento: `{state['mirror']}`.",
                       state["note"], ""])
    report.extend(["## Frames disponíveis fora da animação normal", "", ", ".join(f"`{ident}.png`" for ident in manifest["availableOnly"]),
                   "", "Esses frames continuam catalogados e acessíveis no inspetor. As variantes frontais de agarre não substituem as poses de costas na parede.",
                   "", "## Bounds e âncoras de cada recorte", ""])
    for frame in frames:
        report.append(f"- **{frame['id']}** — sourceRect `{frame['sourceRect']}`; anchors `{frame['anchors']}`.")
    report.extend(["", "## Debug", "", "Na Escalada: F8 ativa/desativa. PageUp/PageDown escolhem estado; ←/→ escolhem frame; Home retorna ao estado real.",
                   "Debug desativado por padrão. A seleção de prévia altera somente o desenho; colisão, controles e física continuam os mesmos.",
                   "`docs/climb_sprite_atlas.html` permite inspecionar os 16 estados e todos os 53 recortes sem iniciar uma partida."])
    (ROOT / "docs" / "climb_zorp_v2_atlas.md").write_text("\n".join(report)+"\n", encoding="utf-8")
    print(json.dumps({"frames": len(frames), "actions": {k: len(v) for k,v in actions.items()}, "excluded": excluded}))


if __name__ == "__main__":
    main()
