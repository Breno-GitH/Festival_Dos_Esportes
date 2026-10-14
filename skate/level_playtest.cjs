const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { COURSE } = require("./course.js");
const pilotApi = require("./level_pilot.js");

function run(options = {}) {
    let now = 100;
    const selectedCourse = options.course || COURSE;
    const listeners = {};
    class FakeImage { complete = false; naturalWidth = 0; set src(value) {} }
    const window = {
        SkateOlliePhysics: require("./ollie_physics.js"), SkateCourse: { COURSE },
        SkateInjectedTestCourse: selectedCourse,
        SkateTricks: require("./trick_system.js"), SkateCombo: require("./combo_system.js"),
        SkateTraversal: require("./traversal_system.js"), SkateCollisionGeometry: require("../skate_new/collision_geometry.js"),
        SkateProceduralTrack: require("./procedural_track.js"),
        SkateAssetsV2: require("../skate_v2/catalog.js"),
        SkateRiderPresentation: require("./rider_presentation.js"),
        SkateSpaceInput: require("./space_input_parser.js"), SkateJourney: require("./journey_presentation.js"),
        location: { search: options.course ? "?skateInjectedTest=1" : "" },
        addEventListener(type, callback) { listeners[type] = callback; }, desbloquearMedalha() {}
    };
    const context = vm.createContext({ window, canvas: { width: 450, height: 300 }, Image: FakeImage,
        performance: { now: () => now }, currentScene: "JOGO_SKATE", console });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "skate_ollie_runtime.js"), "utf8"), context);
    if (options.startX) vm.runInContext(`skateOllieSimulation.config.startX=${Number(options.startX)};skateOllieSimulation.reset()`, context);
    const pilot = pilotApi.createPilot(selectedCourse, options);
    const entries = [], transitions = [], trace = [], keysUsed = new Set();
    let previousMode = "GROUND", previousRail = "", maximumCombo = 0, maxMultiplier = 1, frames = 0;
    let view;
    for (; frames < 15000; frames++) {
        view = vm.runInContext(`({ player: skateOllieSimulation.state.player, phase: skateOllieSimulation.state.phase,
            mode: skateTraversal.mode, rail: skateTraversal.activeRail, held: skateOllieInput.held,
            excludedRail: skateTraversal.lastExitedRailId, combo: skateCombo.snapshot(), camera: skateOllieCamera })`, context);
        if (view.phase !== "PLAYING") break;
        if (options.endX && view.player.x >= options.endX) break;
        let events = pilot.tick(view, now);
        if (options.profile === "zero") events = [];
        if (options.profile === "hold") events = frames === 0 ? [{ code: "Space", down: true }] : [];
        if (options.profile === "mash") events = frames % 4 === 0 ? [{ code: "Space", down: true }] : frames % 4 === 2 ? [{ code: "Space", down: false }] : [];
        for (const event of events) {
            keysUsed.add(event.code);
            listeners[event.down ? "keydown" : "keyup"]({ code: event.code, repeat: false, preventDefault() {} });
        }
        now += 1000 / (options.frameRate || 60);
        vm.runInContext("updateSkateGame()", context);
        if (view.mode !== previousMode || (view.rail?.id || "") !== previousRail) {
            transitions.push({ x: +view.player.x.toFixed(1), y: +view.player.y.toFixed(1), mode: view.mode,
                rail: view.rail?.id || "", at: +(now / 1000).toFixed(2) });
            if (view.mode === "GRIND") entries.push(view.rail.id);
        }
        previousMode = view.mode; previousRail = view.rail?.id || "";
        maximumCombo = Math.max(maximumCombo, view.combo.activeScore); maxMultiplier = Math.max(maxMultiplier, view.combo.multiplier);
        if (frames % 6 === 0) trace.push({ x: +view.player.x.toFixed(1), y: +view.player.y.toFixed(1),
            vy: +view.player.verticalVelocity.toFixed(1), mode: view.mode, tier: view.player.jumpTier,
            zoom: +(view.camera.zoom || 1).toFixed(3),
            screenX: +((view.player.x - view.camera.x) * (view.camera.zoom || 1)).toFixed(1),
            screenY: +((view.player.y - view.camera.y) * (view.camera.zoom || 1)).toFixed(1) });
    }
    const state = vm.runInContext("skateOllieSimulation.state", context);
    const combo = vm.runInContext("skateCombo.snapshot()", context);
    const presentation = vm.runInContext("skateJourney.snapshot()", context);
    return { profile: options.profile || "full", phase: state.phase, timeSeconds: +(now / 1000 - .1).toFixed(2),
        physicsSeconds: +state.elapsed.toFixed(2), failureReason: state.failureReason || "", hit: state.player.hitObstacleId,
        x: +state.player.x.toFixed(1), y: +state.player.y.toFixed(1), score: combo.bankedScore,
        maximumCombo: Math.round(maximumCombo), maxMultiplier, enteredRails: entries,
        presentation, keysUsed: [...keysUsed], jumps: state.player.takeoffs, landings: state.player.landings, inputs: pilot.log, transitions, trace };
}
if (require.main === module) {
    const result = run({ profile: process.argv[2] || "full", captureDelayMs: Number(process.argv[3]) || 0 });
    fs.mkdirSync(path.join(__dirname, "qa"), { recursive: true });
    fs.writeFileSync(path.join(__dirname, "qa", "latest-run.json"), JSON.stringify(result, null, 2));
    const { trace, inputs, transitions, ...short } = result;
    short.lastInputs = inputs.slice(-10); short.lastTransitions = transitions.slice(-10);
    console.log(JSON.stringify(short, null, 2));
}
module.exports = { run };
