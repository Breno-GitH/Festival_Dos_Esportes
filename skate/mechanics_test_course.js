(function (root, factory) {
    const assets = root.SkateNewAssets || (typeof require === "function" ? require("../skate_new/asset_catalog.js") : null);
    const geometry = root.SkateCollisionGeometry || (typeof require === "function" ? require("../skate_new/collision_geometry.js") : null);
    const course = factory(assets, geometry);
    if (typeof module === "object" && module.exports) module.exports = course;
    if (root) root.SkateMechanicsTestCourse = course;
})(typeof globalThis === "object" ? globalThis : this, function (assets, geometry) {
    const rampById = Object.fromEntries(assets.ramps.map(asset => [asset.id, asset]));
    const grindById = Object.fromEntries(assets.grinds.map(asset => [asset.id, asset]));

    function placeRamp(id, x, width, height, bottomY, launchStrength, name, options = {}) {
        const asset = rampById[id];
        const ramp = geometry.createRampGeometry(asset, { id: `mechanics-${id}`, x, width, height, bottomY, launchStrength });
        ramp.startX = ramp.surfacePoints[0].x;
        ramp.endX = ramp.surfacePoints[ramp.surfacePoints.length - 1].x;
        ramp.x = x;
        ramp.bottomY = bottomY;
        ramp.asset = asset.file;
        ramp.name = name;
        ramp.kind = asset.type;
        ramp.launchImpulse = launchStrength;
        ramp.autoLaunch = options.autoLaunch === true;
        ramp.takeoffX = options.takeoffX ?? ramp.endX;
        if (options.specialAir) ramp.specialAir = Object.freeze(options.specialAir);
        return Object.freeze(ramp);
    }

    function placeRail(id, x, width, firstY, type, name, bend = 0) {
        const asset = grindById[id];
        const height = Math.max(18, asset.size[1] * width / asset.size[0]);
        const normalized = asset.grindPathNormalized;
        const spriteBottomY = firstY + (1 - normalized[0][1]) * height;
        const points = geometry.transformNormalizedPath(normalized, {
            x, width, height, bottomY: spriteBottomY
        });
        if (bend) points[points.length - 1].y += bend;
        return Object.freeze({
            id: `mechanics-${name.toLowerCase().replaceAll(" ", "-")}`,
            name, type, asset: asset.file,
            points: Object.freeze(points), grindPath: Object.freeze(points),
            renderHeight: height, spriteBottomY
        });
    }

    const groundSegments = Object.freeze([
        Object.freeze({ startX: 0, endX: 500, startY: 250, endY: 250, kind: "chain-launch" }),
        Object.freeze({ startX: 1570, endX: 2535, startY: 250, endY: 250, kind: "special-ramp-runup" }),
        Object.freeze({ startX: 2960, endX: 3500, startY: 250, endY: 250, kind: "test-landing" })
    ]);
    const ramps = Object.freeze([
        placeRamp("quarter-small-neon", 290, 150, 78, 250, 340, "CHAIN LAUNCH", { autoLaunch: true }),
        placeRamp("quarter-large-neon", 2240, 260, 145, 250, 565, "SPECIAL AIR RAMP", {
            autoLaunch: true,
            specialAir: {
                graceMs: 100,
                maxControlledMs: 1450,
                sustainGravityScale: 0.58,
                fallGravityScale: 1.75,
                sustainVelocityFloor: 260,
                slowMotionMs: 850
            }
        })
    ]);
    const rails = Object.freeze([
        placeRail("rail-long-straight", 500, 145, 170, "horizontal", "RAIL 1 LOW"),
        placeRail("rail-short-straight", 738.5, 125, 160, "horizontal", "RAIL 2 +10"),
        placeRail("handrail-descending-stairs", 954.2, 110, 150, "descending", "RAIL 3 DROP"),
        placeRail("rail-long-straight", 1175, 235, 65, "horizontal", "RAIL 4 HIGH")
    ]);
    const transfers = Object.freeze([
        Object.freeze({ from: rails[0].id, to: rails[1].id, exitOffset: 5, jump: "normal" }),
        Object.freeze({ from: rails[1].id, to: rails[2].id, exitOffset: 5, jump: "normal" }),
        Object.freeze({ from: rails[2].id, to: rails[3].id, exitOffset: 5, jump: "super" })
    ]);
    const gaps = Object.freeze([
        Object.freeze({ startX: 500, endX: 1570, width: 1070, label: "CHAIN GAP" }),
        Object.freeze({ startX: 2535, endX: 2960, width: 425, label: "SPECIAL AIR GAP" })
    ]);

    function groundHeightAt(x) {
        const ramp = geometry.rampSurfaceAt(ramps, x);
        if (ramp) return ramp.y;
        const segment = groundSegments.find(item => x >= item.startX && x <= item.endX);
        if (!segment) return null;
        const t = (x - segment.startX) / Math.max(1, segment.endX - segment.startX);
        return segment.startY + (segment.endY - segment.startY) * t;
    }

    const spawnX = 80;
    const finish = Object.freeze({ id: "mechanics-test-finish", x: 3430, label: "TEST FINISH" });
    return Object.freeze({
        id: "skate-grind-chain-special-ramp-test",
        name: "GRIND CHAINS + SPECIAL AIR",
        isTestCourse: true,
        isMechanicsTestCourse: true,
        spawnX,
        builtThroughX: finish.x,
        projectedFullLength: finish.x - spawnX,
        finish,
        checkpoints: Object.freeze([]),
        groundSegments,
        gaps,
        ramps,
        rails,
        transfers,
        playLine: Object.freeze([Object.freeze({ x: 1790, action: "normal" })]),
        obstacles: Object.freeze([]),
        decor: Object.freeze([
            Object.freeze({ id: "controls-bench", assetId: "bench-neon", type: "asset",
                asset: "skate_new/props/gameplay/bench-neon.png", x: 1840, width: 180, height: 40, trickable: true }),
            Object.freeze({ id: "special-air-landing-platform", assetId: "platform-wide", type: "asset", asset: "skate_new/props/gameplay/platform-wide.png", x: 2770, width: 230, height: 60 })
        ]),
        forwardSpeedAt: x => x > 1820 && x < 2240 ? 250 : 230,
        groundHeightAt,
        groundHeightForAir: x => {
            const height = groundHeightAt(x);
            return Number.isFinite(height) ? height : 250;
        },
        sectionAt: () => ({ name: "GRIND CHAINS + SPECIAL AIR" }),
        estimateDurationSeconds: () => (finish.x - spawnX) / 230
    });
});
