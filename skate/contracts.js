/**
 * Stable contracts for the next Skate runtime.
 *
 * This module is intentionally not loaded by index.html yet. It defines the
 * boundary of the replacement without changing the active mini-game or
 * authoring a course.
 */

export const SKATE_SCENES = Object.freeze({
    overworld: "ILHA_SKATE",
    game: "JOGO_SKATE"
});

export const SKATE_SESSION_STATES = Object.freeze({
    ready: "READY",
    playing: "PLAYING",
    recovering: "RECOVERING",
    victory: "VICTORY",
    failed: "FAILED",
    disposed: "DISPOSED"
});

export const SKATE_ACTIONS = Object.freeze({
    spacePressed: "SPACE_PRESSED",
    spaceReleased: "SPACE_RELEASED",
    exitRequested: "EXIT_REQUESTED",
    restartRequested: "RESTART_REQUESTED"
});

export const SKATE_PORTS = Object.freeze({
    assets: Object.freeze([
        "load",
        "getAnimation",
        "getEnvironmentSprite"
    ]),
    course: Object.freeze([
        "getSpawn",
        "getBounds",
        "querySurface",
        "queryInteractions",
        "getFinish"
    ]),
    integration: Object.freeze([
        "isSkateSceneActive",
        "returnToSkateIsland",
        "unlockSkateMedal"
    ]),
    score: Object.freeze([
        "registerAction",
        "bankCombo",
        "breakCombo",
        "getSnapshot"
    ])
});

export const SKATE_RUNTIME_ENTRY_POINTS = Object.freeze([
    "resetSkateGame",
    "updateSkateGame",
    "drawSkateGame"
]);

