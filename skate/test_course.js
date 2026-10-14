(function (root, factory) {
    const assets = root.SkateNewAssets || (typeof require === "function" ? require("../skate_new/asset_catalog.js") : null);
    const geometry = root.SkateCollisionGeometry || (typeof require === "function" ? require("../skate_new/collision_geometry.js") : null);
    const api = factory(assets, geometry);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateTestCourse = api;
})(typeof globalThis === "object" ? globalThis : this, function (assets, geometry) {
    const rampById = Object.fromEntries(assets.ramps.map(asset => [asset.id, asset]));
    const grindById = Object.fromEntries(assets.grinds.map(asset => [asset.id, asset]));

    function placeRamp(id, x, width, height, bottomY, launchStrength, kind) {
        const asset = rampById[id];
        const placement = { id: `test-${id}`, x, width, height, bottomY, launchStrength };
        const ramp = geometry.createRampGeometry(asset, placement);
        ramp.x = x;
        ramp.bottomY = bottomY;
        ramp.startX = ramp.surfacePoints[0].x;
        ramp.endX = ramp.surfacePoints[ramp.surfacePoints.length - 1].x;
        ramp.asset = asset.file;
        ramp.name = `TEST ${kind.toUpperCase()} RAMP`;
        ramp.kind = kind;
        ramp.launchImpulse = launchStrength;
        ramp.autoLaunch = false;
        return Object.freeze(ramp);
    }

    function placeRail(id, x, width, y, type, name) {
        const asset = grindById[id];
        const height = Math.max(18, asset.size[1] * width / asset.size[0]);
        const firstY = asset.grindPathNormalized[0][1];
        const spriteBottomY = y + (1 - firstY) * height;
        const points = geometry.transformNormalizedPath(asset.grindPathNormalized, {
            x, width, height, bottomY: spriteBottomY
        });
        return Object.freeze({
            id: `test-${id}`, name, type, asset: asset.file,
            points: Object.freeze(points), grindPath: Object.freeze(points),
            renderHeight: height, spriteBottomY
        });
    }

    const groundSegments = Object.freeze([
        Object.freeze({ startX: 0, endX: 2000, startY: 250, endY: 250, kind: "test-ground" })
    ]);
    const ramps = Object.freeze([
        placeRamp("quarter-small-neon", 230, 145, 62, 250, 48, "small"),
        placeRamp("kicker-medium-neon", 515, 175, 86, 250, 82, "medium"),
        placeRamp("quarter-large-neon", 1530, 230, 130, 250, 145, "big")
    ]);
    const rails = Object.freeze([
        placeRail("rail-long-straight", 760, 190, 193, "horizontal", "TEST RAIL A"),
        placeRail("handrail-descending-stairs", 1005, 195, 194, "descending", "TEST RAIL B"),
        placeRail("handrail-ascending-stairs", 1260, 180, 205, "ascending", "TEST RAIL C"),
        placeRail("rail-curved-sag", 1460, 170, 190, "curved", "TEST CURVED RAIL")
    ]);

    const spawnX = 80;
    const finish = Object.freeze({ id: "test-finish", x: 1940, label: "TEST FINISH" });
    function groundHeightAt(x) {
        const ramp = geometry.rampSurfaceAt(ramps, x);
        if (ramp) return ramp.y;
        return x >= 0 && x <= 2000 ? 250 : null;
    }
    const testCourse = {
        id: "skate-gameplay-test-course",
        name: "SKATE TEST LINE",
        isTestCourse: true,
        spawnX,
        builtThroughX: finish.x,
        projectedFullLength: finish.x - spawnX,
        finish,
        checkpoints: Object.freeze([]),
        groundSegments,
        gaps: Object.freeze([]),
        ramps,
        rails,
        obstacles: Object.freeze([]),
        decor: Object.freeze([]),
        forwardSpeedAt: () => 230,
        groundHeightAt,
        groundHeightForAir: () => 250,
        sectionAt: () => ({ name: "TEST COURSE" }),
        estimateDurationSeconds: () => (finish.x - spawnX) / 230
    };
    return Object.freeze(testCourse);
});
