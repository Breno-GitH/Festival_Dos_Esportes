const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const catalog = require("./asset_catalog.js");
const geometry = require("./collision_geometry.js");
const physics = require("../skate/ollie_physics.js");
const traversal = require("../skate/traversal_system.js");

const ROOT = path.resolve(__dirname, "..");

test("os três sheets viram recortes individuais com trilha de origem e sem asset faltando", () => {
    assert.equal(catalog.sources["rampas.png"].components, 10);
    assert.equal(catalog.sources["grids.png"].components, 11);
    assert.equal(catalog.sources["assets_skate.png"].components, 15);
    const all = [...catalog.ramps, ...catalog.grinds, ...catalog.props.gameplay, ...catalog.props.decoration];
    assert.equal(all.length, 36);
    for (const asset of all) {
        assert.ok(fs.existsSync(path.join(ROOT, asset.file)), asset.file);
        assert.ok(asset.sourceBounds[2] > asset.sourceBounds[0]);
        assert.ok(asset.sourceBounds[3] > asset.sourceBounds[1]);
    }
    assert.equal(catalog.props.gameplay.length, 12);
    assert.equal(catalog.props.decoration.length, 3);
});

test("Zorp usa anchor bottom-center e collider próprio do corpo/board", () => {
    assert.equal(catalog.anchor, "bottom-center");
    assert.equal(Object.keys(catalog.riderFrames).length, 101);
    assert.ok(Object.values(catalog.riderFrames).every(frame => frame.anchor === "bottom-center"));
    const rider = { x: 100, y: 200, groundContactY: 200 };
    const bounds = geometry.riderColliderBounds(rider);
    assert.deepEqual(bounds, { left: 88, right: 112, top: 156, bottom: 200 });
});

test("rampa pequena e grande acompanham superfície inclinada e voltam ao chão", () => {
    const groundSegments = [{ startX: 0, endX: 900, startY: 250, endY: 250 }];
    for (const [id, x, width, height] of [
        ["quarter-small-neon", 100, 140, 60],
        ["quarter-large-neon", 400, 220, 120]
    ]) {
        const asset = catalog.ramps.find(item => item.id === id);
        const ramp = geometry.createRampGeometry(asset, { id, x, bottomY: 250, width, height });
        const simulation = physics.createSimulation({
            startX: 40,
            groundY: 250,
            groundSegments,
            ramps: [ramp],
            obstacles: [],
            obstacle: null
        });
        let followedSurface = false;
        let leftRamp = false;
        for (let step = 0; step < 1800; step++) {
            simulation.step({spaceHeld:true}, 1 / 120);
            const player = simulation.state.player;
            const sample = geometry.rampSurfaceAt([ramp], player.x);
            if (sample && player.grounded) {
                followedSurface = true;
                assert.ok(Math.abs(player.groundContactY - sample.y) < 1e-6);
            }
            if (simulation.state.rampLaunches.some(l=>l.rampId===id && l.held)) leftRamp = true;
            if (leftRamp && player.grounded && player.x > ramp.surfacePoints.at(-1).x) break;
        }
        assert.equal(simulation.state.phase, "PLAYING");
        assert.equal(followedSurface, true, `${id} ground contact follows its path`);
        assert.equal(leftRamp, true, `${id} leaves the lip with tangent momentum`);
        assert.ok(simulation.state.player.landings > 0, `${id} returns to ground naturally`);
    }
});

test("rails usam grindPath e ledges separam standing top de grind edge", () => {
    const railAsset = catalog.grinds.find(item => item.id === "handrail-ascending-stairs");
    const grindPath = geometry.transformNormalizedPath(railAsset.grindPathNormalized, {
        x: 100, bottomY: 250, width: 180, height: 90
    });
    const rail = { points: grindPath, grindPath };
    const sample = traversal.sampleRail(rail, 190);
    assert.ok(sample);
    assert.ok(sample.slope < 0, "ascending path uses screen-space y slope");
    assert.ok(traversal.railLength(rail) > 150);

    const ledgeAsset = catalog.props.gameplay.find(item => item.id === "platform-wide");
    const platform = geometry.createPlatformGeometry(ledgeAsset, {
        id: "test-platform", x: 300, bottomY: 250, width: 200, height: 90
    });
    assert.ok(platform.standingSurfaceSegments.length > 0);
    assert.ok(platform.grindPath.length >= 2);
    assert.ok(platform.solidCollider);
    assert.notEqual(platform.grindPath, platform.standingSurfaceSegments);
});

test("test lane de assets é isolada da pista e contém rampas, rails e plataforma", () => {
    assert.equal(catalog.testArea.enabledOnlyInDebug, true);
    assert.deepEqual(catalog.testArea.ramps, ["quarter-small-neon", "quarter-large-neon"]);
    assert.ok(catalog.testArea.grinds.includes("rail-short-straight"));
    assert.ok(catalog.testArea.grinds.includes("handrail-descending-stairs"));
    assert.ok(catalog.testArea.platforms.includes("platform-wide"));
});
