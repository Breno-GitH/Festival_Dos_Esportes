/* QA only: a memorized keyboard line. This file is never loaded by index.html. */
(function (root, factory) {
    const api = factory(root.SkateTraversal || (typeof require === "function" ? require("./traversal_system.js") : null));
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateLevelPilot = api;
})(typeof globalThis === "object" ? globalThis : this, function (traversal) {
    function createPilot(course, options = {}) {
        let queue = [], nextJump = 0, lastExited = "", specialStarted = false, specialReleased = false;
        const attempted = new Set();
        const profile = options.profile || "full";
        const log = [];
        function enqueue(at, code, down) { queue.push({ at, code, down }); queue.sort((a, b) => a.at - b.at); }
        function press(at, action) {
            enqueue(at, "Space", true);
            if (action !== "grind") enqueue(at + (action === "super" ? 335 : 45), "Space", false);
            if (action === "ollie") { enqueue(at + 95, "Space", true); enqueue(at + 150, "Space", false); }
            if (action === "superAir") { enqueue(at + 85, "Space", true); enqueue(at + 420, "Space", false); }
        }
        return {
            log,
            get busy() { return queue.length > 0; },
            tick(view, now) {
                const p = view.player, events = [];
                if (view.phase !== "PLAYING") return events;
                // Once a planned jump catches a rail, keep holding instead of sending
                // the remaining tap-release and accidentally launching immediately.
                if (view.mode === "GRIND" && queue.some(e=>e.code === "Space" && !e.down)) queue=[];
                const skipped = course.rails.find(r => r.id === options.skipRail);
                if (skipped && view.mode === "AIR" && view.held
                    && p.x >= (skipped.grindPath || skipped.points)[0].x - 60
                    && p.x <= (skipped.grindPath || skipped.points).at(-1).x) {
                    queue = [];
                    return [{ at: now, code: "Space", down: false }];
                }
                while (queue.length && queue[0].at <= now) events.push(queue.shift());
                if (events.length || queue.length) return events;
                if (p.specialRampAir?.active && view.mode === "AIR" && !specialReleased) {
                    if (!specialStarted) {
                        specialStarted = true;
                        if (options.specialMode !== "d-only" && options.specialMode !== "none") enqueue(now, "Space", true);
                        
                        log.push({ x: p.x, action: "special-sustain", at: now });
                    } else if (p.specialRampAir.controlledMs >= p.specialRampAir.maxControlledMs - 8
                        || p.specialRampAir.elapsedMs >= (options.specialReleaseMs ?? Infinity)) {
                        enqueue(now, "Space", false);
                        specialReleased = true;
                        log.push({ x: p.x, action: "special-release", at: now });
                    }
                } else if (view.mode === "GRIND" && view.rail) {
                    const end = view.rail.grindPath.at(-1).x;
                    const transfer = (course.transfers || []).find(item => item.from === view.rail.id);
                    const exitOffset = Math.max(14, transfer?.exitOffset ?? 14);
                    if (p.x >= end - exitOffset + (options.exitOffsetPx || 0)
                        && view.held && lastExited !== view.rail.id) {
                        lastExited = view.rail.id;
                        enqueue(now, "Space", false);
                        log.push({ x: p.x, action: "release-super-out", rail: view.rail.id, at: now });
                    }
                } else if (!p.grounded && !view.held) {
                    const captureRails = course.rails.filter(rail =>
                        rail.id !== view.excludedRail && rail.id !== options.skipRail && (profile !== "survival" || rail.required));
                    const near = traversal.findCaptureCandidate(p, captureRails, p.forwardSpeed || course.forwardSpeedAt(p.x), {
                        lookAheadMs: 100, gravity: 1650
                    });
                    if (near && !attempted.has(near.rail.id)) {
                        attempted.add(near.rail.id);
                        enqueue(now + (options.captureDelayMs || 0), "Space", true);
                        log.push({ x: p.x, action: "capture", rail: near.rail.id, distance: near.distance, at: now });
                    }
                } else if (p.grounded && !view.held) {
                    const playLine = course.playLine || [];
                    while (nextJump < playLine.length && playLine[nextJump].x < p.x - 36) {
                        log.push({ x: p.x, action: "missed-setup", setup: playLine[nextJump].x });
                        nextJump++;
                    }
                    const setup = playLine[nextJump];
                    if (setup && p.x >= setup.x + (options.groundOffsetPx || 0)) {
                        press(now, setup.action);
                        log.push({ x: p.x, action: setup.action, at: now });
                        nextJump++;
                    }
                }
                while (queue.length && queue[0].at <= now) events.push(queue.shift());
                return events;
            }
        };
    }
    return Object.freeze({ createPilot });
});
