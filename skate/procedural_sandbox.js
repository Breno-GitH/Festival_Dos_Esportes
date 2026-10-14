(function (root, factory) {
    const course = factory(root.SkateProceduralTrack || (typeof require === "function" ? require("./procedural_track.js") : null));
    if (typeof module === "object" && module.exports) module.exports = course;
    if (root) root.SkateProceduralSandbox = course;
})(typeof globalThis === "object" ? globalThis : this, function (kit) {
    "use strict";
    const level = kit.createBuilder({ spawnX: 80, groundY: 250 });

    level.addGround({ id: "ground-a", x: 0, length: 560, y: 250 });
    level.addRamp({ id: "small-kicker", type: "SMALL_KICKER", x: 215, length: 155,
        startY: 250, height: 48, baseY: 250, launchStrength: 74 });
    level.addRail({ id: "low-rail", x: 390, y: 184, length: 145, supportY: 250,
        supportSpacing: 74, name: "LOW RAIL" });
    level.addGap({ id: "small-gap", leftEdge: 560, rightEdge: 630, edgeY: 250, label: "SMALL GAP" });

    level.addGround({ id: "ground-b", x: 630, length: 750, y: 250 });
    level.addBench({ id: "sandbox-bench", x: 695, groundY: 250, width: 205, height: 42,
        name: "BENCH" });
    level.addLedge({ id: "sandbox-ledge", x: 1010, groundY: 250, width: 110, height: 45,
        name: "LEDGE" });
    level.addRamp({ id: "long-bank", type: "LONG_BANK", x: 1130, length: 250,
        startY: 250, height: 80, baseY: 250, launchStrength: 16 });

    level.addPlatform({ id: "upper-platform", x: 1380, y: 170, width: 300, baseY: 250,
        grindable: true, supportSpacing: 95, name: "UPPER PLATFORM" });
    level.addRail({ id: "curved-rail", x: 1420, y: 128, length: 220, curve: 18,
        supportY: 170, supportSpacing: 82, name: "CURVED RAIL" });
    level.addStairs({ id: "sandbox-stairs", x: 1680, topY: 170, steps: 8,
        stepWidth: 28, stepHeight: 10, direction: "down", fatal: false,
        handrail: true, railHeight: 42, railStartOffset: 24, name: "STAIRS" });

    level.addGround({ id: "ground-c", x: 1904, length: 696, y: 250 });
    level.addRamp({ id: "medium-kicker", type: "MEDIUM_KICKER", x: 2010, length: 185,
        startY: 250, height: 75, baseY: 250, launchStrength: 108 });
    level.addRamp({ id: "big-launch", type: "BIG_LAUNCH", x: 2300, length: 300,
        startY: 250, height: 145, baseY: 250, launchStrength: 188, autoLaunch: true });
    level.addGap({ id: "launch-gap", leftEdge: 2600, rightEdge: 2745, edgeY: 250,
        label: "LAUNCH GAP" });
    level.addGround({ id: "ground-d", x: 2745, length: 755, y: 250 });
    level.addPlatform({ id: "landing-platform", x: 2745, y: 218, width: 260, baseY: 250,
        grindable: true, supportSpacing: 90, name: "LANDING" });
    level.addSupport({ id: "landing-brace", x: 2930, topY: 218, bottomY: 250, width: 18 });

    level.addTransfer("low-rail", "sandbox-bench-top", { exitOffset: 14 });
    level.addTransfer("curved-rail", "sandbox-stairs-handrail", { exitOffset: 14 });
    level.addPlayInput(175, "normal");
    level.addPlayInput(690, "ollie");
    level.addPlayInput(940, "normal");
    level.addPlayInput(2570, "ollie");
    level.addCheckpoint(3090, "SANDBOX OK");
    level.setFinish(3370, "END SANDBOX");

    return level.build({
        id: "procedural-primitives-sandbox", name: "PROCEDURAL TRACK SANDBOX",
        sectionAt: x => ({ name: x < 630 ? "GROUND · RAMP · RAIL · GAP"
            : x < 1380 ? "BENCH · LEDGE · BANK"
            : x < 1904 ? "PLATFORM · CURVE · STAIRS"
            : "KICKER · BIG LAUNCH · LANDING" })
    });
});
