/* Skate runtime: physics owns the player position; Skate 2.0 frames present its state. */
const skateOlliePhysics = window.SkateOlliePhysics;
const skateProceduralTestMode = /(?:\?|&)skateProceduralTest=1(?:&|$)/.test(window.location?.search || "");
const skateGameplayTestMode = /(?:\?|&)(?:skateGameplayTest|skateMechanicsTest)=1(?:&|$)/
    .test(window.location?.search || "");
const skateInjectedTestMode = /(?:\?|&)skateInjectedTest=1(?:&|$)/.test(window.location?.search || "");
const skateCourse = skateInjectedTestMode
    ? window.SkateInjectedTestCourse
    : skateGameplayTestMode
    ? window.SkateProceduralGameplayCourse
    : skateProceduralTestMode ? window.SkateProceduralSandbox
        : window.SkateCourse.COURSE;
const skateProceduralStartParam = skateProceduralTestMode || skateGameplayTestMode
    ? new URLSearchParams(window.location.search).get("startX") : null;
const skateProceduralStartX = skateProceduralStartParam !== null && skateProceduralStartParam !== ""
    ? Number(skateProceduralStartParam) : NaN;
const skateRuntimeStartX = Number.isFinite(skateProceduralStartX) && skateProceduralStartX >= 0
    ? skateProceduralStartX : skateCourse.spawnX;
const skateCollisionObjects = skateCourse.decor.flatMap(item => {
    if (item.collisionDisabled) return [];
    if (item.collisionObject) return [item.collisionObject];
    return [];
});
const skateOllieSimulation = skateOlliePhysics.createSimulation({
    startX: skateRuntimeStartX,
    distanceOriginX: skateCourse.spawnX,
    groundSegments: skateCourse.groundSegments,
    ramps: skateCourse.ramps,
    obstacles: skateCourse.obstacles,
    collisionObjects: skateCollisionObjects,
    obstacle: null,
    failY: 520
});
const skateTrickSystem = window.SkateTricks.createController();
const skateTraversal = window.SkateTraversal.createController();
const skateCombo = window.SkateCombo.createController();
const skateSpaceParser = window.SkateSpaceInput.createParser();
const skateJourney = window.SkateJourney.createController();
const skateCourseRails = skateCourse.rails;
const skateOllieCamera = skateOlliePhysics.createCamera(canvas.width, canvas.height, 0.32);
const skateOllieInput = {
    held: false,
    pressSerial: 0,
    released: false,
    releaseHoldMs: null,
    pressStartedAt: 0,
    restart: false,
    pressMode: "GROUND",
    grindPressed: false,
    normalJump: false,
    ollieUpgrade: false,
    airTrickInputActive: false
};
const skateOllieImages = new Map();
const skateRiderPresenter = window.SkateRiderPresentation.createPresenter(window.SkateAssetsV2);
const SKATE_RIDER_SCALE = 0.34;
let skateAirPose = null;
let skateRiderAngle = 0;
let skateRiderDrawAt = 0;
let skateJourneyDrawAt = 0;
// Only the QA page provides a clock. The official game always uses wall time.
function skateClockNow() {
    return Number.isFinite(window.skatePlaytestTimeMs) ? window.skatePlaytestTimeMs : performance.now();
}
window.skateDebug = window.skateDebug ?? false;
window.setSkateDebug = enabled => { window.skateDebug = Boolean(enabled); };
let skateLastTrickResult = null;
let skateQuestTrickCompletedAt = -Infinity;
let skateCheckpointsReached = new Set();
function loadSkateAssetOnce(key, source) {
    if (!key || skateOllieImages.has(key)) return skateOllieImages.get(key);
    const image = new Image();
    image.src = source;
    skateOllieImages.set(key, image);
    return image;
}


for (const frames of Object.values(skateRiderPresenter.framesByState)) {
    for (const frame of frames) loadSkateAssetOnce(frame.file, frame.file);
}

let skateOllieLastTime = 0;
let skateOllieAccumulator = 0;
let skateTimeScale = 1;
let skateCrashComboLost = 0;
let skateFpsEstimate = 0;
let skateFpsFrameCount = 0;
let skateFpsWindowStart = 0;
const SKATE_OLLIE_FIXED_STEP = 1 / 120;

window.addEventListener("keydown", event => {
    if (currentScene !== "JOGO_SKATE") return;
    if (event.code === "Space") {
        event.preventDefault();
        if (event.repeat || skateOllieInput.held) return;
        if (["FAILED", "COMPLETED"].includes(skateOllieSimulation.state.phase)) {
            skateOllieInput.restart = true;
            return;
        }
        skateOllieInput.held = true;
        skateOllieInput.pressSerial++;
        skateOllieInput.pressStartedAt = skateClockNow();
        const player = skateOllieSimulation.state.player;
        const rampIntent = player?.grounded && skateTraversal.mode !== "GRIND"
            && skateOlliePhysics.rampIntentAt(player.x, skateOllieSimulation.config);
        skateOllieInput.pressMode = rampIntent ? "RAMP"
            : skateTraversal.mode === "GRIND" || skateTraversal.mode === "MANUAL"
            ? skateTraversal.mode
            : player?.specialRampAir?.active ? "MEGA_AIR"
            : player && !player.grounded ? "AIR" : "GROUND";
        const captureRails = skateTraversal.lastExitedRailId
            && player?.x <= skateTraversal.lastExitedRailMaxX + window.SkateTraversal.SETTINGS.grindCaptureRadiusPx
            ? skateCourseRails.filter(rail => rail.id !== skateTraversal.lastExitedRailId)
            : skateCourseRails;
        const captureCandidate = skateOllieInput.pressMode === "AIR"
            ? window.SkateTraversal.findCaptureCandidate(
                player,
                captureRails,
                player.forwardSpeed || skateOllieSimulation.config.forwardSpeed,
                { lookAheadMs: window.SkateTraversal.SETTINGS.grindInputBufferMs, gravity: skateOllieSimulation.config.gravity }
            )
            : null;
        const events = skateSpaceParser.keyDown(skateOllieInput.pressStartedAt, skateOllieInput.pressMode, {
            grindCapturable: Boolean(captureCandidate)
        });
        for (const inputEvent of events) {
            if (inputEvent.type === "RAMP_HOLD" || inputEvent.type === "MEGA_HOLD") {
                skateTrickSystem.cancelInput();
                skateOllieInput.airTrickInputActive = false;
            } else if (inputEvent.type === "NORMAL_JUMP") {
                skateOllieInput.normalJump = true;
                skateOllieInput.pressMode = "GROUND";
            } else if (inputEvent.type === "OLLIE_UPGRADE") {
                skateOllieInput.ollieUpgrade = true;
            } else if (inputEvent.type === "GRIND_CAPTURE_PRESS") {
                skateOllieInput.grindPressed = true;
            } else if (inputEvent.type === "AIR_PRESS") {
                if (player?.jumpTier !== "grind-hop") {
                    skateTrickSystem.press(skateOllieInput.pressStartedAt, player);
                    skateOllieInput.airTrickInputActive = true;
                }
            } else if (inputEvent.type === "GROUND_RELEASE") {
                skateOllieInput.released = true;
                skateOllieInput.releaseHoldMs = inputEvent.holdMs;
            } else if (inputEvent.type === "GRIND_PRESS") skateOllieInput.grindPressed = true;
        }
    }
});

window.addEventListener("keyup", event => {
    if (event.code !== "Space" || currentScene !== "JOGO_SKATE" || !skateOllieInput.held) return;
    event.preventDefault();
    skateOllieInput.held = false;
    const releasedAt = skateClockNow();
    const releaseMode = skateTraversal.mode;
    for (const inputEvent of skateSpaceParser.keyUp(releasedAt)) {
        skateOllieInput.releaseHoldMs = Math.min(
            skateOlliePhysics.DEFAULTS.holdThresholdsMs.maximum,
            inputEvent.holdMs
        );
        if (inputEvent.type === "GROUND_RELEASE" || inputEvent.type === "MANUAL_RELEASE"
            || inputEvent.type === "GRIND_RELEASE"
            || ((releaseMode === "MANUAL" || releaseMode === "GRIND")
                && ["AIR_RELEASE", "RAMP_RELEASE"].includes(inputEvent.type))) {
            skateOllieInput.released = true;
            skateOllieInput.airTrickInputActive = false;
        } else if (inputEvent.type === "AIR_RELEASE" && skateOllieInput.airTrickInputActive) {
            skateOllieInput.released = true;
            skateTrickSystem.release(releasedAt);
            skateOllieInput.airTrickInputActive = false;
        }
    }
});

function resetSkateGame(restartFromCheckpoint = false) {
    window.FestivalChallenges?.start('skate');
    const reachedCheckpoints = new Set(skateCheckpointsReached);
    const bankedScore = skateCombo.bankedScore;
    const resumePoint = restartFromCheckpoint === "checkpoint"
        ? [...skateCourse.checkpoints].reverse().find(checkpoint => reachedCheckpoints.has(checkpoint.id))
        : null;
    skateOllieSimulation.config.startX = resumePoint ? resumePoint.x
        : (skateProceduralTestMode || skateGameplayTestMode) ? skateRuntimeStartX : skateCourse.spawnX;
    skateOllieSimulation.config.forwardSpeed = skateCourse.forwardSpeedAt(skateOllieSimulation.config.startX);
    skateOllieSimulation.reset();
    const nextCamera = skateOlliePhysics.createCamera(canvas.width, canvas.height, 0.32);
    nextCamera.zoom = 0.72;
    nextCamera.screenX = canvas.width * 0.30 / nextCamera.zoom;
    nextCamera.screenY = canvas.height * 0.78 / nextCamera.zoom;
    const spawnGroundY = skateCourse.groundHeightAt(skateOllieSimulation.config.startX) ?? 250;
    nextCamera.x = Math.max(0, skateOllieSimulation.config.startX - nextCamera.screenX);
    nextCamera.targetX = nextCamera.x;
    nextCamera.y = spawnGroundY - nextCamera.screenY;
    nextCamera.targetY = nextCamera.y;
    Object.assign(skateOllieCamera, nextCamera);
    Object.assign(skateOllieInput, {
        held: false, pressSerial: 0, released: false, releaseHoldMs: null,
        pressStartedAt: 0, restart: false, pressMode: "", grindPressed: false,
        normalJump: false, ollieUpgrade: false,
        airTrickInputActive: false
    });
    skateSpaceParser.reset();
    skateRiderPresenter.reset();
    skateAirPose = null;
    skateJourney.reset();
    skateRiderAngle = 0;
    skateRiderDrawAt = 0;
    skateJourneyDrawAt = 0;
    skateTrickSystem.reset();
    skateTraversal.reset();
    skateCombo.reset();
    skateCombo.bankedScore = resumePoint ? bankedScore : 0;
    skateLastTrickResult = null;
    skateQuestTrickCompletedAt = -Infinity;
    skateCrashComboLost = 0;
    skateCheckpointsReached = resumePoint ? reachedCheckpoints : new Set();
    skateOllieLastTime = skateClockNow();
    skateOllieAccumulator = 0;
    skateTimeScale = 1;
}

function clearSkateBriefingInput() {
    Object.assign(skateOllieInput, {
        held:false,released:false,restart:false,grindPressed:false,
        normalJump:false,ollieUpgrade:false,airTrickInputActive:false,
        pressMode:'',releaseHoldMs:null
    });
    skateSpaceParser.reset();
}

function startSkateFromBrief() {
    clearSkateBriefingInput();
    skateOllieLastTime = skateClockNow();
    skateOllieAccumulator = 0;
}

function updateSkateGame() {
    if (currentScene !== "JOGO_SKATE") return;
    const now = skateClockNow();
    if (!skateFpsWindowStart) skateFpsWindowStart = now;
    skateFpsFrameCount++;
    if (now - skateFpsWindowStart >= 500) {
        skateFpsEstimate = skateFpsFrameCount * 1000 / Math.max(1, now - skateFpsWindowStart);
        skateFpsFrameCount = 0;
        skateFpsWindowStart = now;
    }
    if (!skateOllieLastTime) skateOllieLastTime = now;
    const elapsed = Math.min(0.05, Math.max(0, (now - skateOllieLastTime) / 1000));
    skateOllieLastTime = now;

    if (skateOllieInput.restart) {
        resetSkateGame(skateOllieSimulation.state.phase === "FAILED" ? "checkpoint" : false);
        return;
    }
    if (skateOllieSimulation.state.phase === "COMPLETED") return;

    const currentPlayer = skateOllieSimulation.state.player;

    const specialAir = currentPlayer.specialRampAir;
    const specialSlowMotion = specialAir?.active && specialAir.elapsedMs < specialAir.slowMotionMs;
    skateTimeScale += ((specialSlowMotion ? 0.68 : 1) - skateTimeScale) * (1 - Math.exp(-elapsed * 9));
    skateOllieAccumulator += elapsed * skateTimeScale;
    let firstStep = true;
    let consumedInput = false;
    while (skateOllieAccumulator >= SKATE_OLLIE_FIXED_STEP
        && skateOllieSimulation.state.phase === "PLAYING") {
        const courseSpeed = skateCourse.forwardSpeedAt(skateOllieSimulation.state.player.x);
        skateOllieSimulation.config.forwardSpeed = courseSpeed;
        const action = firstStep ? {
            spacePressed: skateOllieInput.normalJump,
            ollieUpgrade: skateOllieInput.ollieUpgrade,
            spaceHeld: skateOllieInput.held
        } : { spaceHeld: skateOllieInput.held };
        const before = skateOllieSimulation.state.player;
        const previousGrounded = before.grounded;
        const previousX = before.x;
        const previousTakeoffs = before.takeoffs;
        const previousJumpTier = before.jumpTier;
        const previousSpecialRampActive = before.specialRampAir?.active === true;
        skateOllieSimulation.step(action, SKATE_OLLIE_FIXED_STEP);
        if (firstStep) consumedInput = true;
        const justLanded = !previousGrounded && before.grounded;
        const landingPlatformId = before.lastLandingPlatformId;
        if (previousSpecialRampActive && before.specialRampAir?.landed
            && before.specialRampAir.controlledMs >= before.specialRampAir.maxControlledMs) {
            skateCombo.registerContextBonus("specialAir");
        }
        if (justLanded && previousJumpTier === "ollie" && landingPlatformId
            && skateCourse.decor.some(item => item.id === landingPlatformId && item.trickable)) {
            skateCombo.registerContextBonus("benchTrick");
        }
        if (firstStep && skateOllieInput.ollieUpgrade && previousJumpTier === "normal"
            && skateOllieSimulation.state.player.jumpTier === "ollie") {
            skateCombo.registerTrick({ status: "COMPLETED", trick: "KICKFLIP OLLIE", score: 220 });
        }
        const state = skateOllieSimulation.state;
        const player = state.player;
        if (state.phase === "FAILED") {
            window.FestivalChallenges?.onSkate({type:'FALL'});
            skateJourney.observe(state, false);
            if (skateTraversal.mode !== "CRASH") {
                skateCrashComboLost = skateCombo.breakCombo();
                skateTraversal.mode = "CRASH";
            }
            skateOllieAccumulator -= SKATE_OLLIE_FIXED_STEP;
            firstStep = false;
            continue;
        }
        // The physical landing point may be a bench/ledge above the terrain.
        const groundY = player.grounded ? player.y
            : skateOlliePhysics.groundHeightAt(player.x, skateOllieSimulation.config);
        const traversalTransitions = skateTraversal.update({
            player,
            previousGrounded,
            previousX,
            input: {
                held: skateOllieInput.held,
                pressId: skateOllieInput.pressSerial,
                pressed: firstStep && skateOllieInput.grindPressed,
                released: firstStep && skateOllieInput.released,
                releaseHoldMs: skateOllieInput.releaseHoldMs
            },
            rails: skateCourseRails,
            forwardSpeed: player.forwardSpeed || skateOllieSimulation.config.forwardSpeed,
            targetForwardSpeed: courseSpeed,
            groundY,
            dtSeconds: SKATE_OLLIE_FIXED_STEP,
            simulation: skateOllieSimulation,
            tricks: skateTrickSystem
        });
        for (const transition of traversalTransitions) {
            window.FestivalChallenges?.onSkate(transition);
            if (transition.type === "GRIND_ENTER") {
                skateSpaceParser.consumeJumpIntent();
                skateOllieInput.airTrickInputActive = false;
                skateCombo.beginGrind();
                if (transition.railId === "high-rail" && previousJumpTier === "super") {
                    skateCombo.registerContextBonus("highRail");
                }
            }
            else if (transition.type === "GRIND_DISTANCE") skateCombo.addGrindDistance(transition.distance);
            else if (transition.type === "MANUAL_ENTER") skateCombo.enterManual();
            else if (transition.type === "MANUAL_OLLIE") skateCombo.registerOllie("manual");
            else if (["NORMAL_LANDING", "MANUAL_TIMEOUT"].includes(transition.type)) skateCombo.startBankWindow();
        }
        if (player.takeoffs > previousTakeoffs
            && !traversalTransitions.some(transition => transition.type === "MANUAL_OLLIE")) {
            skateCombo.registerOllie(traversalTransitions.some(event => event.type === "GRIND_OLLIE_OUT")
                ? "grind"
                : "ground");
        }
        const remainingAirMs = window.SkateTricks.remainingAirTimeMs(
            player,
            skateOllieSimulation.config.gravity,
            skateCourse.groundHeightForAir(player.x)
        );
        skateTrickSystem.update(player, SKATE_OLLIE_FIXED_STEP, remainingAirMs);
        if (skateTrickSystem.lastResult !== skateLastTrickResult) {
            skateLastTrickResult = skateTrickSystem.lastResult;
            if (skateLastTrickResult && skateLastTrickResult.status === "COMPLETED") {
                skateCombo.registerTrick(skateLastTrickResult);
                if(!player.grounded)skateQuestTrickCompletedAt=state.elapsed;
                window.FestivalChallenges?.onSkate({type:'TRICK',airborne:!player.grounded});
            }
        }
        // Quest-only landing grade: an actual collision-free touchdown after a completed
        // aerial trick is GOOD; an already completed pose with spare airtime is PERFECT.
        // No landing impulse, ramp rule or scoring rule is changed by this annotation.
        if (!previousGrounded && player.grounded && skateTraversal.mode !== 'CRASH') {
            const cleanPose = skateTrickSystem.lastResult?.status === 'COMPLETED';
            const quality = !cleanPose ? 'ROUGH'
                : state.elapsed-skateQuestTrickCompletedAt >= .12 ? 'PERFECT' : 'GOOD';
            window.FestivalChallenges?.onSkate({type:'LAND',quality});
            skateQuestTrickCompletedAt=-Infinity;
        }
        skateCombo.update(SKATE_OLLIE_FIXED_STEP);
        for (const checkpoint of skateCourse.checkpoints) {
            if (skateCheckpointsReached.has(checkpoint.id) || player.x < checkpoint.x) continue;
            skateCheckpointsReached.add(checkpoint.id);
            state.lastEvent = checkpoint.id.toUpperCase().replaceAll("-", "_");
        }
        if (player.x >= skateCourse.finish.x) {
            player.x = skateCourse.finish.x;
            player.y = skateCourse.groundHeightAt(skateCourse.finish.x) ?? 230;
            player.verticalVelocity = 0;
            player.grounded = true;
            player.charging = false;
            state.distance = player.x - skateOllieSimulation.config.startX;
            state.phase = "COMPLETED";
            state.lastEvent = "FINISH";
            skateCombo.bank();
        if (!skateCourse.isTestCourse && typeof window.desbloquearMedalha === "function") {
                window.desbloquearMedalha("skate");
            }
        }
        if (skateTraversal.mode === "GROUND" && skateOllieInput.held) {
            skateOllieInput.pressMode = "GROUND";
        } else if (skateTraversal.mode === "GRIND" || skateTraversal.mode === "MANUAL") {
            skateOllieInput.pressMode = skateTraversal.mode;
        }
        skateJourney.observe(state, skateOllieInput.held);
        skateJourney.update(SKATE_OLLIE_FIXED_STEP);
        skateOllieAccumulator -= SKATE_OLLIE_FIXED_STEP;
        firstStep = false;
    }
    if (consumedInput) {
        skateOllieInput.released = false;
        skateOllieInput.grindPressed = false;
        skateOllieInput.normalJump = false;
        skateOllieInput.ollieUpgrade = false;
        skateOllieInput.releaseHoldMs = null;
    }
    if (!skateOllieInput.held) skateOllieInput.pressMode = "GROUND";

    const state = skateOllieSimulation.state;
    const p = state.player;
    const camera = skateOllieCamera;
    // Terrain owns the framing. A jump may use the upper deadzone without dragging
    // the whole view skyward; zoom fits rider AND the upcoming contact surface.
    const mega = skateCourse.gaps.find(g => g.id === "final-launch-gap"
        && p.x > g.startX - 600 && p.x < g.endX + 180);
    const largeRamp = skateCourse.ramps.find(r => r.landingZone && r.launchStrength >= 400
        && p.x > r.startX - 300 && p.x < r.landingZone.startX);
    const stair = skateCourse.rails.find(r => r.id === "grand-stair-handrail"
        && p.x > r.grindPath[0].x - 250 && p.x < r.grindPath.at(-1).x + 200);
    const stairExit = stair && skateCourse.gaps.find(g => g.id === "grand-stair-exit");
    const ahead = 160 + Math.max(0, (p.forwardSpeed || 230) - 230) * 2;
    const contacts = [p.x, p.x + ahead, p.x + ahead + 150].flatMap(x => {
        const ground = skateCourse.groundHeightAt(x);
        const rail = skateCourse.rails.map(r => window.SkateTraversal.sampleRail(r, x)).find(Boolean);
        return [ground, rail?.y].filter(Number.isFinite);
    });
    if (mega) contacts.push(skateCourse.groundHeightAt(mega.endX + 20) ?? 250);
    if (stairExit) contacts.push(skateCourse.groundHeightAt(stairExit.endX + 20) ?? 250);
    const terrainY = contacts.length ? Math.max(...contacts) : skateCourse.groundHeightForAir(p.x);
    const verticalSpan = Math.max(80, terrainY - (p.y - 90));
    const landingFit = mega ? canvas.width * 0.80 / Math.max(1, mega.endX + 140 - p.x)
        : largeRamp ? canvas.width * 0.68 / Math.max(1, largeRamp.landingZone.startX + 100 - p.x)
        : stairExit ? canvas.width * 0.68 / Math.max(1, stairExit.endX + 160 - p.x) : 1;
    const desiredZoom = Math.min(mega ? 0.32 : stair ? 0.42 : p.jumpTier === "super" && !p.grounded ? 0.62 : 0.72,
        (canvas.height - (mega ? 138 : 112)) / verticalSpan, landingFit);
    const dt = Math.min(0.05, Math.max(elapsed, SKATE_OLLIE_FIXED_STEP));
    camera.zoom = (camera.zoom ?? 0.72) + (Math.max(mega ? 0.16 : 0.20, desiredZoom) - (camera.zoom ?? 0.72)) * (1 - Math.exp(-dt * 5));
    const ratio = mega ? 0.20 : 0.30 - Math.min(0.045, Math.max(0, (p.forwardSpeed || 230) - 230) / 1100);
    camera.screenX = canvas.width * ratio / camera.zoom;
    camera.screenY = canvas.height * (mega ? 0.67 : stair ? 0.75 : 0.78) / camera.zoom;
    camera.targetX = p.x - camera.screenX + (p.forwardSpeed || 230) * 0.10;
    camera.x += (camera.targetX - camera.x) * (1 - Math.exp(-dt * 9));
    const terrainTarget = terrainY - camera.screenY;
    const upperLimit = p.y - 90 - canvas.height * 0.24 / camera.zoom;
    camera.targetY = Math.min(terrainTarget, upperLimit);
    // Wide deadzone; no vertical tracking for a small jump inside this band.
    if (Math.abs(camera.targetY - camera.y) > 18 / camera.zoom)
        camera.y += (camera.targetY - camera.y) * (1 - Math.exp(-dt * 4.5));
}

function drawSkateGame() {
    const state = skateOllieSimulation.state;
    const p = state.player;
    const camera = skateOllieCamera;
    const screenX = p.x - camera.x;
    const screenY = p.y - camera.y;
    const presentationNow=performance.now();
    const presentationDt=Math.min(.05,Math.max(0,(presentationNow-skateJourneyDrawAt)/1000));
    skateJourneyDrawAt=presentationNow;

    ctx.imageSmoothingEnabled = false;
    const lighting = window.SkateJourney.lighting((p.x-skateCourse.spawnX)/(skateCourse.finish.x-skateCourse.spawnX));
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, lighting.top);
    sky.addColorStop(1, lighting.horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawSkateCityBackground(camera, lighting);
    if (state.phase !== "PLAYING") {
        skateJourney.observe(state, false);
        // Celebration/fading continues when the physics and QA clock have stopped.
        skateJourney.update(presentationDt);
    }
    skateJourney.drawFireworks(ctx,canvas.width,canvas.height,{
        x:screenX*(camera.zoom||.72),y:(screenY-30)*(camera.zoom||.72)});

    ctx.save();
    ctx.scale(camera.zoom || 0.72, camera.zoom || 0.72);
    ctx.translate(-camera.x, -camera.y);
    window.SkateProceduralTrack.draw(ctx, skateCourse, camera.x, camera.x + canvas.width / (camera.zoom || 0.72),
        canvas.height / (camera.zoom || 0.72) + camera.y + 160, state.elapsed, lighting);
    drawSkateCheckpoints();
    drawSkateFinish();
    drawSkateOllieRider(p);
    skateJourney.drawLanding(ctx);
    drawSpecialAirEffects(p);
    if (window.skateDebug) drawSkateDebugOverlay(p);
    ctx.restore();
    drawSkateOllieHud(state);
    if (p.specialRampAir?.active && p.specialRampAir.elapsedMs < p.specialRampAir.slowMotionMs) {
        ctx.fillStyle = "rgba(83, 229, 255, .055)";
        ctx.fillRect(0, 32, canvas.width, canvas.height - 32);
        ctx.strokeStyle = "rgba(157, 245, 255, .52)";
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 35, canvas.width - 6, canvas.height - 38);
    }

    if (state.phase === "FAILED") {
        drawSkateOllieOverlay(state.failureReason === "FELL_IN_GAP" ? "CAIU NO GAP" : `COLISÃO: ${p.hitObstacleId.toUpperCase()}`, [
            p.specialRampAir && !p.specialRampAir.landed
                ? "MEGA AIR: mantenha SPACE até a margem."
                : "Pule, capture o Grind e solte na hora certa.",
            `BANK ${skateCombo.bankedScore} · COMBO PERDIDO ${skateCrashComboLost}`,
            `CHECKPOINTS ${skateCheckpointsReached.size}/${skateCourse.checkpoints.length}`,
            "SPACE PARA RECOMEÇAR"
        ], "#ff8c73");
    }
    if (state.phase === "COMPLETED" && skateJourney.snapshot().stageAge > .55) {
        drawSkateOllieOverlay("LINHA COMPLETA", [
            `BANK FINAL ${skateCombo.bankedScore}`,
            `DISTÂNCIA ${Math.floor(state.distance)} · 2 CHECKPOINTS`,
            "SPACE PARA UMA NOVA RUN"
        ], "#a5f5ab");
    }
}

function drawSkateCityBackground(camera, lighting) {
    const h=canvas.height, vertical=camera.y*.018;
    // Screen-space parallax keeps the city quiet while the course descends hundreds of world pixels.
    const layers=[{factor:.07,base:.58,width:78,color:lighting.far,height:86},
        {factor:.17,base:.74,width:96,color:lighting.mid,height:112},
        {factor:.31,base:.92,width:140,color:lighting.near,height:78}];
    const sunX=canvas.width*(.75-lighting.progress*.4),sunY=h*(.18+lighting.progress*.65);
    if(lighting.progress<.82){ctx.fillStyle=`rgba(255,231,173,${.55*(1-lighting.progress)})`;
        ctx.beginPath();ctx.arc(sunX,sunY,13,0,Math.PI*2);ctx.fill();}
    for(let layer=0;layer<layers.length;layer++) {
        const {factor,base,width,color,height}=layers[layer],offset=camera.x*factor;
        const first=Math.floor(offset/width)-1;
        for(let i=first;i<first+Math.ceil(canvas.width/width)+3;i++) {
            const hash=((i*37%83)+83)%83,bh=height*(.48+hash/100);
            const x=i*width-offset,y=h*base-bh-vertical;
            ctx.fillStyle=color;ctx.fillRect(x,y,width-12,h-y);
            ctx.fillStyle=layer===0?'#19283a':'#263c48';ctx.fillRect(x+width-22,y,10,h-y);
            if(layer<2) {
                ctx.fillStyle=`rgba(241,215,155,${.10+lighting.neon*.45})`;
                for(let row=9;row<bh-8;row+=14)for(let col=9;col<width-20;col+=16)
                    if((i+row+col)%5!==0)ctx.fillRect(x+col,y+row,4,6);
                ctx.fillStyle=hash%2?`rgba(93,219,240,${lighting.neon*.5})`:`rgba(224,104,190,${lighting.neon*.4})`;
                ctx.fillRect(x+8,y+5,width-35,2);
                ctx.fillStyle='#111f30';ctx.fillRect(x+16,y-8,18,8);
                if(layer===1&&hash>45){ctx.fillRect(x+31,y-18,3,18);
                    ctx.fillStyle='#748780';ctx.fillRect(x+30,y-19,5,3);}
            } else {
                // Industrial faces, vents and service lights below the playable silhouette.
                ctx.fillStyle='#182b36';ctx.fillRect(x+15,y+24,54,35);
                ctx.strokeStyle='#304751';ctx.lineWidth=2;
                for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(x+20,y+31+j*8);ctx.lineTo(x+63,y+31+j*8);ctx.stroke();}
                ctx.fillStyle='rgba(199,165,115,.24)';ctx.fillRect(x+88,y+17,14,4);
            }
        }
    }
    // Tropical silhouettes share the near-background plane; they never pass in front of rails.
    const offset=camera.x*.27;
    for(let i=Math.floor(offset/280)-1;i<Math.floor(offset/280)+Math.ceil(canvas.width/280)+2;i++){
        const x=i*280-offset+130,y=h*.58-vertical;
        ctx.strokeStyle=lighting.near;ctx.lineWidth=5;ctx.beginPath();
        ctx.moveTo(x+13,h);ctx.quadraticCurveTo(x+19,y+50,x,y);ctx.stroke();
        for(let leaf=-3;leaf<=3;leaf++) {
            ctx.lineWidth=leaf===0?3:4;ctx.beginPath();ctx.moveTo(x,y);
            ctx.quadraticCurveTo(x+leaf*14,y-20,x+leaf*20,y+Math.abs(leaf)*7);ctx.stroke();
        }
    }
    // Occasional street lamps are behind the course and subdued enough to preserve contact-line contrast.
    const lampOffset=camera.x*.22;
    for(let i=Math.floor(lampOffset/370)-1;i<Math.floor(lampOffset/370)+Math.ceil(canvas.width/370)+2;i++){
        const x=i*370-lampOffset+280,y=h*.58-vertical;
        ctx.strokeStyle='#314752';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,h);ctx.lineTo(x,y);
        ctx.lineTo(x+25,y);ctx.stroke();ctx.fillStyle=`rgba(255,223,153,${.1+lighting.neon*.65})`;ctx.fillRect(x+15,y+1,14,3);
    }
}

function drawSkateCheckpoints() {
    for (const checkpoint of skateCourse.checkpoints) {
        const groundY = skateOlliePhysics.groundHeightAt(checkpoint.x, skateOllieSimulation.config) ?? 250;
        ctx.fillStyle = skateCheckpointsReached.has(checkpoint.id) ? "#9af6a1" : "#fff0a6";
        ctx.fillRect(checkpoint.x, groundY - 110, 5, 110);
        ctx.fillRect(checkpoint.x + 5, groundY - 108, 82, 25);
        ctx.fillStyle = "#1c3449";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(checkpoint.label, checkpoint.x + 46, groundY - 92);
    }
}

function drawSkateFinish() {
    const x=skateCourse.finish.x,y=skateCourse.groundHeightAt(x)??250;
    // A supported finish arch and crowd sit behind the rider; no collision regions.
    ctx.save();
    for(const side of [-1,1]){
        const px=x+side*65;
        ctx.fillStyle='#263b49';ctx.fillRect(px-5,y-138,10,138);
        ctx.fillStyle=side<0?'#65efff':'#ff65c6';ctx.fillRect(px-2,y-134,3,127);
        ctx.fillStyle='#74838e';ctx.fillRect(px-13,y-4,26,7);
    }
    ctx.fillStyle='#152a39';ctx.fillRect(x-70,y-145,140,30);
    ctx.strokeStyle='#82efad';ctx.lineWidth=2;ctx.strokeRect(x-70,y-145,140,30);
    ctx.fillStyle='#e6f1e0';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('FINISH',x,y-125);
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#263749':'#e0e6db';ctx.fillRect(x-65+i*13,y-113,13,6);}
    for(let row=0;row<2;row++)for(let i=0;i<12;i++){
        ctx.fillStyle=(row+i)%2?'#d6e4df':'#273846';ctx.fillRect(x-12+row*12,y-4-i*2,12,2);
    }
    for(let i=0;i<9;i++){
        const px=x-105+i*26,py=y+25+(i%2)*3;
        ctx.fillStyle='#1a2b39';ctx.fillRect(px-5,py-12,10,22);
        ctx.beginPath();ctx.arc(px,py-18,4,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
}

function drawSkateOllieRider(p) {
    // World translation is already active. The physics board contact stays at p.y.
    const platform = p.grounded && p.lastLandingPlatformId
        ? skateCollisionObjects.find(item => item.id === p.lastLandingPlatformId)
        : null;
    const platformTop = platform?.collisionRegions?.SAFE_TOP?.some(([start, end]) => {
        if (p.x < start.x || p.x > end.x) return false;
        const y = start.y + (end.y - start.y) * (p.x - start.x) / (end.x - start.x);
        return Math.abs(p.groundContactY - y) < 5;
    });
    const benchActive = platformTop && skateCourse.decor.some(item => {
        const semanticType = item.primitiveType || "";
        return item.id === platform.id && item.trickable && /bench|ledge/.test(semanticType);
    });
    const pose = skateRiderPresenter.select({
        player: p,
        phase: skateOllieSimulation.state.phase,
        mode: skateTraversal.mode,
        nowMs: skateClockNow(),
        elapsedSec: skateOllieSimulation.state.elapsed,
        benchActive,
        activeTrick: skateTrickSystem.activeTrick,
        groundY: skateOlliePhysics.groundHeightAt(p.x, skateOllieSimulation.config)
    });
    if (!pose) return;
    const frame = pose.frame;
    const image = skateOllieImages.get(frame.file);
    if (!image?.complete || image.naturalWidth <= 0) return;
    const grinding = skateTraversal.mode === "GRIND";
    const contact = grinding ? (p.grindCaptureProgress ?? 1) : 0;
    const railSample = grinding && window.SkateTraversal.sampleRail(skateTraversal.activeRail,p.x);
    const now = skateClockNow();
    const dt = Math.min(.05, Math.max(0,(now-skateRiderDrawAt)/1000));
    skateRiderDrawAt = now;
    const rampSample=p.grounded&&window.SkateCollisionGeometry.rampSurfaceAt(skateCourse.ramps,p.x);
    const ground= p.grounded&&skateCourse.groundSegments.find(g=>p.x>=g.startX&&p.x<=g.endX);
    const slope=railSample?railSample.slope:rampSample?rampSample.slope:ground?(ground.endY-ground.startY)/(ground.endX-ground.startX):0;
    const journeyFrame=skateJourney.snapshot();
    const feedback=window.SkateJourney.riderFeedback({slope,grinding,contact:grinding?contact:1,clock:now/1000,
        landingAge:journeyFrame.landingAge,impact:journeyFrame.lastLanding?.impact||0});
    skateRiderAngle += (feedback.angle-skateRiderAngle)*(1-Math.exp(-dt*14));
    ctx.save();ctx.translate(p.x,p.groundContactY);ctx.rotate(skateRiderAngle);
    ctx.transform(feedback.scaleX,0,feedback.lean,feedback.scaleY,0,0);
    const drawPose = (sprite, opacity) => {
        const source = skateOllieImages.get(sprite.file);
        if(!source?.complete || !source.naturalWidth) return;
        const d = window.SkateRiderPresentation.placement(sprite,0,0,SKATE_RIDER_SCALE);
        ctx.globalAlpha=opacity;ctx.drawImage(source,d.x,d.y,d.width,d.height);
    };
    if(grinding && contact<1 && skateAirPose) drawPose(skateAirPose,1-contact);
    drawPose(frame,grinding && contact<1 && skateAirPose ? contact : 1);
    ctx.restore();
    if(!grinding) skateAirPose=frame;
    if((grinding && contact>.85) || p.rampRide?.prepared){
        ctx.save();ctx.strokeStyle=grinding?"#96f4ff":"#ffce8a";ctx.lineWidth=1.5;
        for(let i=0;i<(grinding?feedback.sparks:2);i++){
            const life=((now*.005+i*.31)%1),back=4+life*17*feedback.trail;
            ctx.globalAlpha=(1-life)*.6;ctx.beginPath();
            ctx.moveTo(p.x-back,p.y+2+life*5);
            ctx.lineTo(p.x-back-5,p.y+4+life*7);ctx.stroke();
        }
        ctx.restore();
    }
}

function drawSkateDebugOverlay(player) {
    const box = skateOlliePhysics.riderColliderBounds(player, skateOlliePhysics.RIDER_COLLIDER);
    ctx.save();
    ctx.strokeStyle = "#ff5b5b";
    ctx.lineWidth = 1;
    ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    ctx.fillStyle = "#fff16a";
    ctx.beginPath();
    ctx.arc(player.x, player.groundContactY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4ee8ff";
    ctx.lineWidth = 2;
    for (const ground of skateCourse.groundSegments) {
        ctx.beginPath();
        ctx.moveTo(ground.startX, ground.startY);
        ctx.lineTo(ground.endX, ground.endY);
        ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 53, 94, .16)";
    ctx.strokeStyle = "#ff355e";
    for (const gap of skateCourse.gaps) {
        if (!gap.fatal) continue;
        const bottom = canvas.height + skateOllieCamera.y + 120;
        ctx.fillRect(gap.startX, gap.edgeY, gap.width, bottom - gap.edgeY);
        ctx.strokeRect(gap.startX, gap.edgeY, gap.width, bottom - gap.edgeY);
    }

    for (const ramp of skateCourse.ramps) {
        if (!ramp.surfacePoints?.length) continue;
        ctx.strokeStyle = ramp.collisionEnabled ? "#63ff91" : "rgba(99,255,145,.38)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ramp.surfacePoints.forEach((point, index) => index === 0
            ? ctx.moveTo(point.x, point.y)
            : ctx.lineTo(point.x, point.y));
        ctx.stroke();
    }
    for (const rail of skateCourseRails) {
        const path = rail.grindPath || rail.points;
        ctx.strokeStyle = "#ff9e4a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        path.forEach((point, index) => index === 0
            ? ctx.moveTo(point.x, point.y)
            : ctx.lineTo(point.x, point.y));
        ctx.stroke();
    }
    const nearestCapture = player.grounded ? null : skateCourseRails.reduce((best, rail) => {
        const point = window.SkateTraversal.nearestRailPoint(rail, player.x, player.groundContactY);
        if (!point || point.x < player.x - 6 || point.x > player.x + window.SkateTraversal.SETTINGS.grindCaptureRadiusPx + 40) return best;
        return !best || point.distance < best.distance ? { ...point, rail } : best;
    }, null);
    const captureRadius = window.SkateTraversal.SETTINGS.grindCaptureRadiusPx;
    if (nearestCapture) {
        const tangentVelocity = nearestCapture.slope * (player.forwardSpeed || skateOllieSimulation.config.forwardSpeed);
        const plausible = Math.abs(player.verticalVelocity - tangentVelocity)
            <= window.SkateTraversal.SETTINGS.trajectoryTolerance;
        ctx.strokeStyle = plausible && nearestCapture.distance <= captureRadius ? "#78ff9b" : "#ffb347";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nearestCapture.x, nearestCapture.y, captureRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "left";
        ctx.fillText(
            `nearestGrind=${nearestCapture.rail.id} · distanceToGrind=${nearestCapture.distance.toFixed(1)} · GRIND_CAPTURABLE ${plausible && nearestCapture.distance <= captureRadius}`,
            player.x + 18, player.y - 52
        );
    } else if (!player.grounded) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "left";
        ctx.fillText("nearestGrind=— · distanceToGrind=— · GRIND_CAPTURABLE false", player.x + 18, player.y - 52);
    }
    ctx.fillStyle = skateTraversal.pendingCaptureMs > 0 ? "#78ff9b" : "#ffffff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`grindCaptureRadius=${captureRadius}px · bufferedGrindInput=${skateTraversal.pendingCaptureMs > 0}`, player.x + 18, player.y - 40);
    for (const object of skateCollisionObjects) {
        const regions = object.collisionRegions || {};
        ctx.lineWidth = 2;
        for (const [a, b] of regions.SAFE_TOP || []) {
            ctx.strokeStyle = "#63ff91";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
        for (const path of [regions.GRINDABLE_TOP]) {
            if (!Array.isArray(path) || path.length < 2) continue;
            ctx.strokeStyle = "#ffb347";
            ctx.beginPath();
            path.forEach((point, index) => index === 0
                ? ctx.moveTo(point.x, point.y)
                : ctx.lineTo(point.x, point.y));
            ctx.stroke();
        }
        const danger = regions.DANGEROUS_SIDE || regions.DANGEROUS_STAIR_FALL;
        if (danger?.type === "STAIR_SEGMENTS") {
            ctx.strokeStyle = "#ff4f75";
            for (const step of danger.segments || []) {
                ctx.strokeRect(step.left, step.top, step.right - step.left, step.bottom - step.top);
            }
        } else if (danger && Number.isFinite(danger.left)) {
            ctx.strokeStyle = regions.DANGEROUS_STAIR_FALL ? "#ff4f75" : "#ff5b5b";
            ctx.strokeRect(danger.left, danger.top, danger.right - danger.left, danger.bottom - danger.top);
        }
    }
    ctx.strokeStyle = "#ff5b5b";
    ctx.lineWidth = 1;
    for (const obstacle of skateCourse.obstacles) {
        const groundY = skateOlliePhysics.groundHeightAt(obstacle.x, skateOllieSimulation.config);
        if (!Number.isFinite(groundY)) continue;
        ctx.strokeRect(obstacle.x, groundY - obstacle.height, obstacle.width, obstacle.height);
    }
    ctx.restore();
}

function drawSkateOllieHud(state) {
    const p = state.player;
    ctx.fillStyle = "rgba(6, 13, 28, .78)";
    ctx.fillRect(0, 0, canvas.width, 32);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SKATE · AUTO-RIDE", 10, 13);
    ctx.font = "8px monospace";
    ctx.fillStyle = "#bfe7ed";
    ctx.fillText("SPACE: HOLD RAMPA/GRIND · RELEASE RAIL · DOUBLE OLLIE", 10, 26);
    if (p.specialRampAir?.active) {
        ctx.textAlign = "right";
        ctx.fillStyle = p.specialRampAir.releasedEarly ? "#ffb29e" : "#9cf5ff";
        ctx.fillText(p.specialRampAir.limitReached ? "PREPARE LANDING" : "MEGA AIR · HOLD SPACE", canvas.width - 10, 45);
    }
    const section = skateCourse.sectionAt(state.player.x);
    if (section) {
        ctx.textAlign = "center";
        ctx.fillStyle = skateCheckpointsReached.size === skateCourse.checkpoints.length ? "#a5f5ab" : "#fff0a6";
        ctx.fillText(section.name, canvas.width * .63, 26);
    }
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffe49b";
    ctx.fillText(`DIST ${Math.floor(state.distance)}m`, canvas.width - 10, 19);
    if (p.charging && p.grounded) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff0b1";
        ctx.font = "bold 9px monospace";
        ctx.fillText("PREPARANDO...", canvas.width * 0.32, 52);
    } else if (!p.grounded || skateTraversal.mode === "MANUAL" || skateTraversal.mode === "GRIND") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff0b1";
        ctx.font = "bold 9px monospace";
        const label = skateTraversal.mode === "GRIND"
            ? "GRIND"
            : skateTraversal.mode === "MANUAL"
            ? `MANUAL ${Math.max(0, Math.ceil((window.SkateTraversal.SETTINGS.manualMaxDurationMs - skateTraversal.manualElapsedMs) / 100)) / 10}s`
            : p.airTrick === "kickflip"
            ? "KICKFLIP OLLIE"
            : skateTrickSystem.trickActive && skateTrickSystem.activeTrick
            ? skateTrickSystem.activeTrick.name
            : p.jumpTier === "normal"
            ? "NORMAL JUMP"
            : p.jumpTier === "super"
            ? "SUPER JUMP"
            : p.jumpTier === "ollie"
            ? "OLLIE · KICKFLIP"
            : p.jumpTier.toUpperCase();
        ctx.fillText(label, canvas.width * 0.32, 52);
    }
    const combo = skateCombo.snapshot();
    ctx.textAlign = "left";
    ctx.fillStyle = combo.active ? "#fff0a6" : "#bfe7ed";
    ctx.font = "bold 8px monospace";
    const activeLabel = combo.active
        ? `COMBO ${combo.activeScore} · x${combo.multiplier.toFixed(2)}${combo.bankTimerMs ? ` · ${combo.bankTimerMs}ms` : ""}`
        : "COMBO —";
    ctx.fillText(`BANK ${combo.bankedScore}  ${activeLabel}`, 10, 45);
    if (window.skateDebug) {
        ctx.textAlign = "right";
        ctx.fillStyle = skateFpsEstimate >= 55 ? "#9af6a1" : "#ffb29e";
        ctx.font = "bold 8px monospace";
        ctx.fillText(`FPS ${skateFpsEstimate ? Math.round(skateFpsEstimate) : "--"}`, canvas.width - 10, canvas.height - 10);
    }
    if (skateTrickSystem.lastResult && ["COMPLETED", "NOT_ENOUGH_AIRTIME"].includes(skateTrickSystem.lastResult.status)) {
        ctx.textAlign = "center";
        ctx.fillStyle = skateTrickSystem.lastResult.status === "COMPLETED" ? "#ffe49b" : "#ffb29e";
        ctx.font = "bold 8px monospace";
        const text = skateTrickSystem.lastResult.status === "COMPLETED"
            ? `${skateTrickSystem.lastResult.trick} +${skateTrickSystem.lastResult.score}`
            : `SEM AIRTIME · ${skateTrickSystem.lastResult.trick}`;
        ctx.fillText(text, canvas.width * 0.68, 52);
    }
}

function drawSpecialAirEffects(player) {
    const special = player.specialRampAir;
    if (!special?.active) return;
    const pulse = (special.elapsedMs % 520) / 520;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#a1f6ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y - 24, 31 + pulse * 20, 11 + pulse * 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
        const phase = (pulse + i / 5) % 1;
        const x = player.x - 34 - phase * 42;
        const y = player.y - 13 - ((i * 17 + special.elapsedMs * 0.025) % 29);
        ctx.fillStyle = i % 2 ? "#e9ffff" : "#72eaff";
        ctx.fillRect(x, y, 2 + (i % 2), 2 + (i % 2));
    }
    ctx.restore();
}

function drawSkateOllieOverlay(title, lines, color) {
    ctx.fillStyle = "rgba(4, 10, 22, .9)";
    ctx.fillRect(48, 92, canvas.width - 96, 118);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 92, canvas.width - 96, 118);
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.font = "bold 12px monospace";
    ctx.fillText(title, canvas.width / 2, 119);
    ctx.fillStyle = "#fff4da";
    ctx.font = "8px monospace";
    lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, 146 + index * 19));
}

window.skateOllieRuntime = Object.freeze({
    simulation: skateOllieSimulation,
    tricks: skateTrickSystem,
    traversal: skateTraversal,
    combo: skateCombo,
    rails: skateCourseRails,
    camera: skateOllieCamera,
    input: skateOllieInput,
    physics: skateOlliePhysics,
    clearBriefingInput: clearSkateBriefingInput
});
window.startSkateFromBrief = startSkateFromBrief;
resetSkateGame();
