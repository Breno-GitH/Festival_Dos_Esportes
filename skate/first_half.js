(function (root, factory) {
    const api = factory(
        root.SkateAssetsV2 || (typeof require === "function" ? require("../skate_v2/catalog.js") : null),
        root.SkateSpotAssembly || (typeof require === "function" ? require("../skate_v2/assembly_rules.js") : null)
    );
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateFirstHalf = api;
})(typeof globalThis === "object" ? globalThis : this, function (catalog, assembly) {
    "use strict";
    const scene = new Map(Object.values(catalog.scene).flat().map(asset => [asset.id, asset]));
    const asset = id => {
        const found = scene.get(id);
        if (!found) throw new Error(`Missing Skate 2.0 scene asset: ${id}`);
        return found;
    };
    const path = (id, x, y, width, height, name) => assembly.worldPath({ assetId: id, x, y, width, height }, name)
        .map(([px, py]) => ({ x: px, y: py }));
    const normalized = (id, name) => path(id, 0, 0, 1, 1, name);
    const calibratedSurfaces = {
        // The sheet hint for this thin bank starts below its cropped PNG. These
        // points follow the visible rideable lip, leaving its concrete body below.
        "bank-small-grey": [{ x: 0.08, y: 0.68 }, { x: 0.95, y: 0.11 }]
    };
    const surfaceFor = (id, x, y, width, height) => calibratedSurfaces[id]
        ? calibratedSurfaces[id].map(point => ({ x: x + point.x * width, y: y + point.y * height }))
        : path(id, x, y, width, height, "surfacePoints");

    const terrain = [
        [150, 250], [11115.6, 250], [11394, 130], [11465.6, 130],
        [11744, 10], [11815.6, 10], [12094, -110], [12880, -110],
        [13175, -200], [13700, -200]
    ];
    const gaps = [
        ["first-hop", 430, 478, false, "JUMP"],
        ["street-hop", 5540, 5585, false, "STREET GAP"],
        ["stair-drop", 8140, 8620, true, "HANDRAIL / STAIRS"],
        ["three-rail-void", 9200, 10190, true, "GRIND CHAIN"],
        ["huge-launch-gap", 12880, 13175, true, "HUGE GAP"]
    ].map(([id, startX, endX, fatal, label]) => ({ id, startX, endX, width: endX - startX, fatal, label, collisionRole: "FATAL_FALL" }));
    function terrainAt(x) {
        for (let i = 1; i < terrain.length; i++) {
            const [ax, ay] = terrain[i - 1], [bx, by] = terrain[i];
            if (x >= ax && x <= bx) return ay + (by - ay) * (x - ax) / (bx - ax);
        }
        return x < terrain[0][0] ? terrain[0][1] : terrain.at(-1)[1];
    }
    const boundaries = [...new Set([...terrain.map(point => point[0]), ...gaps.flatMap(gap => [gap.startX, gap.endX])])].sort((a, b) => a - b);
    const groundSegments = boundaries.slice(1).flatMap((endX, i) => {
        const startX = boundaries[i], middle = (startX + endX) / 2;
        if (gaps.some(gap => middle > gap.startX && middle < gap.endX)) return [];
        return [{ startX, endX, startY: terrainAt(startX), endY: terrainAt(endX), kind: "skate-v2-ground" }];
    });
    function makeRamp(id, name, assetId, x, width, height, entryY, strength, kind, autoLaunch = false) {
        const local = calibratedSurfaces[assetId] || normalized(assetId, "surfacePoints");
        const y = entryY - local[0].y * height;
        const surfacePoints = surfaceFor(assetId, x, y, width, height);
        const bottomY = y + height;
        return { id, name, assetId, asset: asset(assetId).file, kind, section: "first-half",
            startX: surfacePoints[0].x, endX: surfacePoints.at(-1).x,
            spriteX: x, spriteWidth: width, spriteY: y, height, bottomY, surfacePoints,
            launchStrength: strength, launchImpulse: strength, autoLaunch, takeoffX: surfacePoints.at(-1).x,
            collisionEnabled: true,
            collisionRegions: { SAFE_TOP: surfacePoints, DANGEROUS_SIDE: {
                type: "RAMP_BODY", left: x, right: x + width,
                top: Math.min(...surfacePoints.map(point => point.y)), bottom: bottomY, surfacePoints, rampId: id
            } }
        };
    }
    const ramps = [
        makeRamp("start-kicker", "SMALL KICKER", "kicker-small", 620, 165, 92, 250, 78, "small"),
        makeRamp("first-rail-kicker", "FIRST RAIL SETUP", "kicker-medium", 900, 150, 96, 250, 92, "medium"),
        makeRamp("transfer-bank", "TRANSFER BANK", "bank-small-grey", 1610, 195, 72, 250, 45, "bank"),
        makeRamp("chain-kicker", "THREE RAIL SETUP", "kicker-small", 3130, 155, 88, 250, 85, "small"),
        makeRamp("street-kicker", "STREET FLOW", "kicker-small", 4780, 175, 91, 250, 70, "small"),
        makeRamp("bench-bank", "BENCH SETUP", "bank-small-grey", 6280, 180, 94, 250, 62, "bank"),
        makeRamp("bench-exit-kicker", "BENCH EXIT", "kicker-small", 7100, 145, 70, 250, 72, "small"),
        makeRamp("stair-kicker", "STAIR HANDRAIL", "kicker-medium", 7800, 200, 120, 250, 130, "medium"),
        makeRamp("danger-chain-kicker", "NO FLOOR SETUP", "kicker-medium", 8790, 165, 97, 250, 115, "medium"),
        makeRamp("speed-kicker", "SPEED RELEASE", "kicker-small", 10600, 170, 88, 250, 72, "small"),
        makeRamp("ascent-bank-1", "CONCRETE ASCENT", "bank-small-grey", 11090, 320, 210, 250, 0, "bank"),
        makeRamp("ascent-bank-2", "PLAZA BANK", "bank-small-grey", 11440, 320, 210, 130, 0, "bank"),
        makeRamp("ascent-bank-3", "ROOFTOP BANK", "bank-small-grey", 11790, 320, 210, 10, 0, "bank"),
        makeRamp("huge-launch", "HUGE LAUNCH", "launch-steep", 12390, 500, 430, -110, 120, "large", true)
    ];
    function makeRail(id, name, assetId, x, width, height, firstY, required = false) {
        const local = normalized(assetId, "grindPath");
        const y = firstY - local[0].y * height;
        const points = path(assetId, x, y, width, height, "grindPath");
        return { id, name, type: asset(assetId).type, required, section: "first-half",
            assetId, grindAssetId: assetId, asset: asset(assetId).file, points, grindPath: points,
            renderHeight: height, spriteX: x, spriteWidth: width, spriteY: y, spriteBottomY: y + height,
            collisionRegions: { GRINDABLE_TOP: points, DECORATION: null }
        };
    }
    function groundRail(id, name, assetId, x, width, height, footY = 250, required = false) {
        const first = normalized(assetId, "grindPath")[0];
        return makeRail(id, name, assetId, x, width, height, footY - (1 - first.y) * height, required);
    }
    const rails = [
        groundRail("first-rail", "FIRST GRIND", "rail-cyan-long", 1090, 470, 76),
        groundRail("transfer-a", "TRANSFER A", "rail-gold-medium", 1850, 370, 89),
        groundRail("transfer-b", "TRANSFER B", "rail-cyan-short", 2290, 360, 91),
        groundRail("three-a", "CHAIN A", "rail-magenta-short", 3340, 340, 87),
        groundRail("three-b", "CHAIN B", "rail-cyan-short", 3750, 330, 91),
        groundRail("three-c", "CHAIN C", "rail-gold-medium", 4150, 365, 89),
        groundRail("street-ledge", "STREET LEDGE", "ledge-magenta", 5240, 250, 79),
        groundRail("bench-exit", "BENCH EXIT RAIL", "rail-cyan-sag", 7360, 300, 107),
        makeRail("stair-handrail", "STAIR RAIL", "handrail-cyan-descend", 8050, 560, 165, 121, true),
        groundRail("danger-a", "RISK A", "rail-cyan-long", 8890, 390, 82, 250, true),
        makeRail("danger-b", "RISK B", "rail-magenta-short", 9290, 380, 110, 129, true),
        makeRail("danger-c", "RISK C", "rail-cyan-sag", 9760, 430, 137, 112, true),
        makeRail("huge-exit-rail", "LANDING GRIND", "rail-cyan-long", 13300, 350, 89, -244, true)
    ];
    function placedProp(id, assetId, x, width, height, bottomY, options = {}) {
        const a = asset(assetId), y = bottomY - height;
        const surface = path(assetId, x, y, width, height, "surfacePoints");
        const edge = path(assetId, x, y, width, height, "grindPath");
        const safeSegments = [];
        for (let i = 1; i < surface.length; i++) {
            if (Math.abs(surface[i].y - surface[i - 1].y) <= 1 || a.type !== "stairs") {
                safeSegments.push([surface[i - 1], surface[i]]);
            }
        }
        const fatalStairs = options.fatalStairs === true;
        const topY = surface.length ? Math.min(...surface.map(point => point.y)) : y;
        const inset = a.type === "bench" ? 0.075 : 0.04;
        const slopedFront = assetId === "block-slope-cyan";
        const side = a.collision.dangerousSide ? {
            left: x + width * inset,
            right: slopedFront ? x + width * 0.13 : x + width * (1 - inset),
            top: (slopedFront ? surface[0]?.y : topY) + 3,
            bottom: bottomY - 2
        } : null;
        const stairSegments = fatalStairs ? safeSegments.map(([start, end]) => ({
            left: start.x, right: end.x, top: start.y, bottom: bottomY
        })) : [];
        const collisionObject = options.collisionDisabled ? null : {
            id, type: a.type, safeGrindRailId: options.safeGrindRailId || null,
            collisionRegions: {
                SAFE_TOP: fatalStairs ? [] : safeSegments,
                GRINDABLE_TOP: edge,
                DANGEROUS_SIDE: side,
                DANGEROUS_STAIR_FALL: fatalStairs ? { type: "STAIR_SEGMENTS", segments: stairSegments } : null,
                DECORATION: null
            }
        };
        return { id, assetId, type: "asset", asset: a.file, x, y, width, height, bottomY,
            trickable: !!options.trickable, collisionDisabled: !!options.collisionDisabled,
            fatalStairs, collisionObject,
            collisionRole: fatalStairs ? ["DANGEROUS_STAIR_FALL", "GRINDABLE_TOP"]
                : Object.entries(a.collision).filter(([, enabled]) => enabled).map(([role]) => role)
        };
    }
    const decor = [
        placedProp("street-ledge-block", "ledge-magenta", 5240, 250, 79, 250, { trickable: true }),
        placedProp("street-low-block", "block-slope-cyan", 5740, 165, 65, 250, { trickable: true }),
        placedProp("street-concrete", "crate-planter", 6100, 155, 86, 250, { trickable: true }),
        placedProp("main-bench", "bench-cyan", 6720, 220, 94, 250, { trickable: true }),
        placedProp("fatal-stairs", "steps-cyan-handrail", 8140, 480, 170, 250,
            { fatalStairs: true, safeGrindRailId: "stair-handrail" }),
        placedProp("danger-pillar-left", "chasm-pillar-01", 9290, 115, 370, 510, { collisionDisabled: true }),
        placedProp("danger-pillar-mid", "chasm-pillar-03", 9590, 110, 375, 510, { collisionDisabled: true }),
        placedProp("danger-pillar-right", "chasm-pillar-05", 9840, 130, 370, 510, { collisionDisabled: true }),
        placedProp("huge-landing-edge", "chasm-landing-platform", 13175, 355, 390, 18, { collisionDisabled: true }),
        placedProp("huge-landing-pillar", "chasm-pillar-05", 13235, 135, 600, 430, { collisionDisabled: true }),
        placedProp("landing-ledge", "floor-bench-platform-09", 13270, 245, 136, -150,
            { collisionDisabled: true }),
        placedProp("checkpoint-block", "floor-raised-04", 13570, 130, 90, -160, { collisionDisabled: true })
    ];
    const groundTiles = [];
    // One continuous pavement module keeps a coherent curb; named structures
    // and platforms above provide the visual variety without broken seams.
    const tileIds = ["floor-low-01"];
    for (const segment of groundSegments) {
        if (segment.startX >= 13700) continue;
        if (Math.abs(segment.endY - segment.startY) > 2) continue;
        for (let x = segment.startX, index = 0; x < segment.endX - 25; index++) {
            const id = tileIds[index % tileIds.length], a = asset(id);
            const width = Math.min(115, segment.endX - x), height = a.size[1] * width / a.size[0];
            const top = normalized(id, "surfacePoints")[0].y;
            const groundY = segment.startY + (segment.endY - segment.startY) * (x - segment.startX) / (segment.endX - segment.startX);
            groundTiles.push({ id: `floor-${Math.round(x)}`, assetId: id, asset: a.file, x, width, height,
                y: groundY - top * height });
            x += width - (width < 115 ? 0 : 10);
        }
    }
    const transfers = [
        ["transfer-a", "transfer-b", false], ["three-a", "three-b", false],
        ["three-b", "three-c", false], ["danger-a", "danger-b", true],
        ["danger-b", "danger-c", true]
    ].map(([from, to, required]) => ({ from, to, required, jump: "hop", exitOffset: 16 }));
    const playLine = [
        [395, "normal"], [860, "normal"], [1750, "ollie"], [3260, "normal"],
        [4690, "normal"], [5150, "ollie"], [5500, "normal"], [5650, "ollie"],
        [6040, "ollie"], [6610, "ollie"],
        [7940, "ollie"], [8760, "ollie"], [12820, "super"], [13255, "normal"]
    ].map(([x, action]) => ({ x, action }));

    return Object.freeze({ endX: 13700, terrain, gaps, groundSegments, ramps, rails, decor,
        groundTiles, transfers, playLine, terrainAt });
});
