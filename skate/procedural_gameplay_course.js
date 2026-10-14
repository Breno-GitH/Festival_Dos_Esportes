(function (root, factory) {
    const course = factory(root.SkateProceduralTrack
        || (typeof require === "function" ? require("./procedural_track.js") : null));
    if (typeof module === "object" && module.exports) module.exports = course;
    if (root) root.SkateProceduralGameplayCourse = course;
})(typeof globalThis === "object" ? globalThis : this, function (kit) {
    "use strict";

    const level = kit.createBuilder({ spawnX: 80, groundY: 250 });

    // Launch apron: enough room to compare Normal, Ollie and Super before the chain.
    level.addGround({ id: "controls-runup", x: 0, length: 500, y: 250 });
    level.addRamp({ id: "chain-launch", type: "CURVED_RAMP", x: 290, length: 150,
        startY: 250, height: 80, baseY: 250, launchStrength: 340, autoLaunch: true,
        name: "CHAIN LAUNCH" });

    // Proven transfer spacing. The pit makes ground contact impossible between rails.
    level.addGap({ id: "chain-fatal-area", leftEdge: 500, rightEdge: 1570,
        edgeY: 250, fatal: true, label: "GRIND CHAIN" });
    level.addRail({ id: "validation-rail-1", x: 500, y: 170, length: 145,
        supportY: 430, supportSpacing: 72, required: true, name: "RAIL 1" });
    level.addRail({ id: "validation-rail-2", x: 738.5, y: 160, length: 125,
        supportY: 430, supportSpacing: 64, required: true, name: "RAIL 2" });
    level.addRail({ id: "validation-rail-3", x: 954.2, y: 150, length: 110,
        angle: 15.25, supportY: 430, supportSpacing: 58, required: true,
        name: "RAIL 3 DESCENDING" });
    level.addRail({ id: "validation-rail-4-high", x: 1175, y: 65, length: 235,
        supportY: 430, supportSpacing: 76, required: true, name: "RAIL 4 HIGH" });
    level.addTransfer("validation-rail-1", "validation-rail-2", { jump: "normal", required: true, exitOffset: 5 });
    level.addTransfer("validation-rail-2", "validation-rail-3", { jump: "normal", required: true, exitOffset: 5 });
    level.addTransfer("validation-rail-3", "validation-rail-4-high", { jump: "super", required: true, exitOffset: 5 });

    // Landing and stair handrail validate SAFE_TOP, DANGEROUS_SIDE and FATAL_AREA.
    level.addGround({ id: "stair-approach", x: 1570, length: 310, y: 250 });
    level.addRamp({ id: "stair-kicker", type: "SMALL_KICKER", x: 1660, length: 120,
        startY: 250, height: 42, baseY: 250, launchStrength: 72, name: "STAIR KICKER" });
    level.addStairs({ id: "validation-stairs", x: 1880, topY: 250, steps: 8,
        stepWidth: 28, stepHeight: 10, direction: "down", fatal: true,
        handrail: true, railHeight: 46, railStartOffset: 28, name: "STAIR HANDRAIL" });
    level.addGround({ id: "stair-landing", x: 2104, length: 596, y: 330 });

    level.addCheckpoint(2310, "GAMEPLAY VALIDATED");
    level.setFinish(2600, "END GAMEPLAY TEST");

    return level.build({
        id: "procedural-gameplay-validation",
        name: "SPACE + GRIND VALIDATION",
        sectionAt: x => ({ name: x < 500 ? "JUMPS + RAMP"
            : x < 1570 ? "4-RAIL CHAIN"
                : "STAIR HANDRAIL" })
    });
});
