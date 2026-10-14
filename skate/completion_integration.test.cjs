const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const physics = require("./ollie_physics.js");
const tricks = require("./trick_system.js");
const combo = require("./combo_system.js");
const traversal = require("./traversal_system.js");
const { COURSE } = require("./course.js");
const geometry = require("../skate_new/collision_geometry.js");
const assets = require("../skate_new/asset_catalog.js");
const riderAssets = require("../skate_v2/catalog.js");
const riderPresentation = require("./rider_presentation.js");
const spaceInput = require("./space_input_parser.js");

test("assets novos classificam topo, lateral, escadas e borda grindável por região", () => {
    const bench = assets.props.gameplay.find(item => item.id === "bench-neon");
    const ledge = assets.props.gameplay.find(item => item.id === "ledge-long-low");
    const stairs = assets.props.gameplay.find(item => item.id === "stairset-small");
    const benchGeometry = geometry.createPlatformGeometry(bench, {
        id: "bench-test", x: 100, bottomY: 250, width: 120, height: 42
    });
    const ledgeGeometry = geometry.createPlatformGeometry(ledge, {
        id: "ledge-test", x: 100, bottomY: 250, width: 150, height: 36
    });
    const stairGeometry = geometry.createPlatformGeometry(stairs, {
        id: "stairs-test", x: 100, bottomY: 250, width: 170, height: 64
    });
    assert.ok(benchGeometry.collisionRegions.SAFE_TOP.length > 0);
    assert.ok(benchGeometry.collisionRegions.DANGEROUS_SIDE);
    assert.ok(ledgeGeometry.collisionRegions.GRINDABLE_TOP.length > 1);
    assert.equal(stairGeometry.collisionRegions.SAFE_TOP.length, 0);
    assert.ok(stairGeometry.collisionRegions.DANGEROUS_STAIR_FALL);
    assert.ok(stairGeometry.collisionRegions.DANGEROUS_STAIR_FALL.segments.length >= 3);
    assert.deepEqual(geometry.classifyAssetCollision(bench), ["SAFE_TOP", "DANGEROUS_SIDE"]);
    assert.ok(geometry.classifyAssetCollision(ledge).includes("GRINDABLE_TOP"));
});

test("runtime executa Normal Jump no primeiro keydown e double Space eleva o mesmo salto", () => {
    let now = 100;
    const listeners = {};
    class FakeImage {
        complete = false;
        naturalWidth = 0;
        set src(value) { this._src = value; }
    }
    const window = {
        SkateOlliePhysics: physics, SkateCourse: { COURSE }, SkateTricks: tricks,
        SkateCombo: combo, SkateTraversal: traversal, SkateCollisionGeometry: geometry,
        SkateNewAssets: assets, SkateAssetsV2: riderAssets, SkateRiderPresentation: riderPresentation, SkateSpaceInput: spaceInput, SkateJourney: require("./journey_presentation.js"),
        location: { search: "" },
        addEventListener(type, callback) { listeners[type] = callback; },
        desbloquearMedalha() {}
    };
    const context = vm.createContext({
        window, canvas: { width: 450, height: 300 }, Image: FakeImage,
        performance: { now: () => now }, currentScene: "JOGO_SKATE", console
    });
    const fs = require("node:fs");
    const path = require("node:path");
    vm.runInContext(fs.readFileSync(path.join(__dirname, "skate_ollie_runtime.js"), "utf8"), context);

    listeners.keydown({ code: "Space", repeat: false, preventDefault() {} });
    now = 116;
    vm.runInContext("updateSkateGame()", context);
    assert.equal(vm.runInContext("skateOllieSimulation.state.player.jumpTier", context), "normal");
    assert.equal(vm.runInContext("skateOllieSimulation.state.player.takeoffs", context), 1);

    now = 130;
    listeners.keyup({ code: "Space", preventDefault() {} });
    vm.runInContext("updateSkateGame()", context);
    now = 200;
    listeners.keydown({ code: "Space", repeat: false, preventDefault() {} });
    now = 216;
    vm.runInContext("updateSkateGame()", context);
    assert.equal(vm.runInContext("skateOllieSimulation.state.player.jumpTier", context), "ollie");
    assert.equal(vm.runInContext("skateOllieSimulation.state.player.takeoffs", context), 1);
    assert.equal(vm.runInContext("skateOllieSimulation.state.player.airTrick", context), "kickflip");
});

test("runtime prioriza Grind Capture sobre Double Space perto de um rail válido", () => {
    let now = 100;
    const listeners = {};
    class FakeImage { complete = false; naturalWidth = 0; set src(value) { this._src = value; } }
    const window = {
        SkateOlliePhysics: physics, SkateCourse: { COURSE }, SkateTricks: tricks,
        SkateCombo: combo, SkateTraversal: traversal, SkateCollisionGeometry: geometry,
        SkateNewAssets: assets, SkateAssetsV2: riderAssets, SkateRiderPresentation: riderPresentation, SkateSpaceInput: spaceInput, SkateJourney: require("./journey_presentation.js"), location: { search: "" },
        addEventListener(type, callback) { listeners[type] = callback; }, desbloquearMedalha() {}
    };
    const context = vm.createContext({
        window, canvas: { width: 450, height: 300 }, Image: FakeImage,
        performance: { now: () => now }, currentScene: "JOGO_SKATE", console
    });
    const fs = require("node:fs");
    const path = require("node:path");
    vm.runInContext(fs.readFileSync(path.join(__dirname, "skate_ollie_runtime.js"), "utf8"), context);
    const railPoint = COURSE.rails[0].grindPath[0];
    vm.runInContext(`{
        const p = skateOllieSimulation.state.player;
        p.x = ${railPoint.x}; p.y = ${railPoint.y}; p.grounded = false;
        p.verticalVelocity = 0; p.jumpTier = "normal"; skateTraversal.mode = "AIR";
    }`, context);

    listeners.keydown({ code: "Space", repeat: false, preventDefault() {} });
    assert.equal(vm.runInContext("skateOllieInput.grindPressed", context), true);
    assert.equal(vm.runInContext("skateOllieInput.ollieUpgrade", context), false);
    assert.equal(vm.runInContext("skateOllieInput.airTrickInputActive", context), false);
    listeners.keyup({ code: "Space", preventDefault() {} });
    now = 140;
    listeners.keydown({ code: "Space", repeat: false, preventDefault() {} });
    assert.equal(vm.runInContext("skateOllieInput.ollieUpgrade", context), false,
        "a second Space in the double-tap interval still prioritizes Grind capture");
    now = 156;
    vm.runInContext("updateSkateGame()", context);
    assert.equal(vm.runInContext("skateTraversal.mode", context), "GRIND");
});

test("runtime mantém o primeiro Space pendente até a física consumir o input", () => {
    let now = 100;
    const listeners = {};
    class FakeImage { complete = false; naturalWidth = 0; set src(value) { this._src = value; } }
    const window = {
        SkateOlliePhysics: physics, SkateCourse: { COURSE }, SkateTricks: tricks,
        SkateCombo: combo, SkateTraversal: traversal, SkateCollisionGeometry: geometry,
        SkateNewAssets: assets, SkateAssetsV2: riderAssets, SkateRiderPresentation: riderPresentation, SkateSpaceInput: spaceInput, SkateJourney: require("./journey_presentation.js"), location: { search: "" },
        addEventListener(type, callback) { listeners[type] = callback; }, desbloquearMedalha() {}
    };
    const context = vm.createContext({
        window, canvas: { width: 450, height: 300 }, Image: FakeImage,
        performance: { now: () => now }, currentScene: "JOGO_SKATE", console
    });
    const fs = require("node:fs");
    const path = require("node:path");
    vm.runInContext(fs.readFileSync(path.join(__dirname, "skate_ollie_runtime.js"), "utf8"), context);
    vm.runInContext("updateSkateGame()", context);
    now = 101;
    listeners.keydown({ code: "Space", repeat: false, preventDefault() {} });
    now = 103;
    vm.runInContext("updateSkateGame()", context);
    assert.equal(vm.runInContext("skateOllieSimulation.state.player.takeoffs", context), 0);
    now = 110;
    vm.runInContext("updateSkateGame()", context);
    assert.equal(vm.runInContext("skateOllieSimulation.state.player.takeoffs", context), 1);
});

test("soltar Space depois de aterrissar em Manual não fica preso como soltura aérea", () => {
    let now = 100;
    const listeners = {};
    class FakeImage { complete = false; naturalWidth = 0; set src(value) { this._src = value; } }
    const window = {
        SkateOlliePhysics: physics, SkateCourse: { COURSE }, SkateTricks: tricks,
        SkateCombo: combo, SkateTraversal: traversal, SkateCollisionGeometry: geometry,
        SkateNewAssets: assets, SkateAssetsV2: riderAssets, SkateRiderPresentation: riderPresentation, SkateSpaceInput: spaceInput, SkateJourney: require("./journey_presentation.js"), location: { search: "" },
        addEventListener(type, callback) { listeners[type] = callback; }, desbloquearMedalha() {}
    };
    const context = vm.createContext({
        window, canvas: { width: 450, height: 300 }, Image: FakeImage,
        performance: { now: () => now }, currentScene: "JOGO_SKATE", console
    });
    const fs = require("node:fs");
    const path = require("node:path");
    vm.runInContext(fs.readFileSync(path.join(__dirname, "skate_ollie_runtime.js"), "utf8"), context);
    vm.runInContext("skateOllieSimulation.state.player.grounded = false", context);
    listeners.keydown({ code: "Space", repeat: false, preventDefault() {} });
    vm.runInContext('skateTraversal.mode = "MANUAL"', context);
    now = 200;
    listeners.keyup({ code: "Space", preventDefault() {} });
    assert.equal(vm.runInContext("skateOllieInput.released", context), true);
});

test("finish conclui a linha, banca combo e concede a medalha skate uma vez", () => {
    let now = 100;
    const awarded = [];
    class FakeImage {
        complete = false;
        naturalWidth = 0;
        set src(value) { this._src = value; }
    }
    const window = {
        SkateOlliePhysics: physics,
        SkateCourse: { COURSE },
        SkateTricks: tricks,
        SkateCombo: combo,
        SkateTraversal: traversal,
        SkateCollisionGeometry: geometry,
        SkateNewAssets: assets,
        SkateAssetsV2: riderAssets,
        SkateRiderPresentation: riderPresentation,
        SkateSpaceInput: spaceInput, SkateJourney: require("./journey_presentation.js"),
        location: { search: "" },
        addEventListener() {},
        desbloquearMedalha(id) { awarded.push(id); }
    };
    const context = vm.createContext({
        window,
        canvas: { width: 450, height: 300 },
        Image: FakeImage,
        performance: { now: () => now },
        currentScene: "JOGO_SKATE",
        console
    });
    const fs = require("node:fs");
    const path = require("node:path");
    vm.runInContext(fs.readFileSync(path.join(__dirname, "skate_ollie_runtime.js"), "utf8"), context);
    vm.runInContext(`
        skateOllieSimulation.state.player.x = skateCourse.finish.x - 1;
        skateCombo.registerTrick({ status: "COMPLETED", trick: "Kickflip", score: 300 });
        skateOllieLastTime = 100;
    `, context);

    now = 150;
    vm.runInContext("updateSkateGame()", context);
    const result = vm.runInContext(`({
        phase: skateOllieSimulation.state.phase,
        x: skateOllieSimulation.state.player.x,
        bankedScore: skateCombo.bankedScore
    })`, context);
    assert.equal(result.phase, "COMPLETED");
    assert.equal(result.x, COURSE.finish.x);
    assert.equal(result.bankedScore, 330);
    assert.deepEqual(awarded, ["skate"]);

    now += 50;
    vm.runInContext("updateSkateGame()", context);
    assert.deepEqual(awarded, ["skate"], "não deve conceder novamente ao permanecer na tela de chegada");
});
