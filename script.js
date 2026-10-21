const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const dialogBox = document.getElementById("dialog-box");
const dialogText = document.getElementById("dialog-text");
const hintText = document.getElementById("hint-text");

let currentScene = "TITLE_SCREEN"; 

// Registro de Insígnias dos Esportes e Sistema Central de Medalhas
const rawInsignias = { 
    esqui: false, 
    pingpong: false,
    skate: false,
    basquete: false,
    arco: false,
    corrida: false,
    escalada: false,
    surf: false,
    boxe: false
};

const insignias = new Proxy(rawInsignias, {
    get(target, prop) {
        if (prop === "esqui" || prop === "boxe") {
            return Boolean(target.esqui || target.boxe);
        }
        return target[prop];
    },
    set(target, prop, value) {
        const boolVal = Boolean(value);
        if (target[prop] === boolVal) {
            return true;
        }

        // Se a chamada está vindo de dentro do fluxo de desbloquearMedalha, apenas atualiza target sem re-disparar
        if (typeof window !== 'undefined' && window.__desbloqueandoMedalha) {
            target[prop] = boolVal;
            if (prop === "esqui") target.boxe = boolVal;
            if (prop === "boxe") target.esqui = boolVal;
            return true;
        }

        // Se uma atribuição externa definiu insignias[prop] = true, delega ao sistema central de medalhas
        if (boolVal && typeof window !== 'undefined' && typeof window.desbloquearMedalha === 'function') {
            window.desbloquearMedalha(prop);
            return true;
        }

        target[prop] = boolVal;
        if (prop === "esqui") target.boxe = boolVal;
        if (prop === "boxe") target.esqui = boolVal;
        return true;
    }
});
if (typeof window !== 'undefined') {
    window.rawInsignias = rawInsignias;
    window.insignias = insignias;
    if (typeof window.carregarMedalhas === 'function') {
        window.carregarMedalhas(rawInsignias);
    }
}

// -------------------------------------------------------------
// CONFIGURAÇÃO DE SPRITES
// -------------------------------------------------------------
const SPRITES_CONFIG = {
    pedras: [
        { x: 0.668, y: 0.825, w: 0.030, h: 0.052 }, // Pedra Vermelha
        { x: 0.715, y: 0.825, w: 0.030, h: 0.052 }, // Pedra Laranja
        { x: 0.765, y: 0.825, w: 0.030, h: 0.052 }, // Pedra Amarela
        { x: 0.715, y: 0.893, w: 0.030, h: 0.052 }  // Pedra Azul
    ],
    zorp: {
        idle: { x: 0.90, y: 0.52, w: 0.08, h: 0.22 },
        subindo: [
            { x: 0.17, y: 0.52, w: 0.08, h: 0.22 },
            { x: 0.25, y: 0.52, w: 0.08, h: 0.22 }
        ]
    }
}   

// -------------------------------------------------------------
// 1. CARREGAMENTO DAS IMAGENS
// -------------------------------------------------------------
const zorpImg = new Image(); zorpImg.src = "zorp.png";
const bgPingPong = new Image(); bgPingPong.src = "bg_pingpong.png?v=2";

// NPCs Globais
const imgTurista = new Image(); imgTurista.src = "npc_turista.png";
const imgGuia = new Image(); imgGuia.src = "npc_guia.png";
const imgMestreBasqueteNpc = new Image();
imgMestreBasqueteNpc.src = "basketball_assets/exported/master_basket/idle/master_basket_idle_01.png?v=1.0.1_visual_fix";
// Mestre do Surf: recorte RGBA do sprite oficial mestre_surfing.
const imgMestreSurfing = new Image();
imgMestreSurfing.src = "surf_assets/mestre_surfing_overworld.png?v=1.0";
const surfIslandDecor = {};
for (const [name, file] of Object.entries({
    palm: "beach_palm_01.png",
    umbrella: "beach_umbrella_red_01.png",
    sign: "beach_sign_01.png",
    towel: "beach_towel_01.png",
    cooler: "beach_cooler_01.png"
})) {
    const image = new Image();
    image.src = `surf_sprites/beach/decor/${file}`;
    surfIslandDecor[name] = image;
}
const imgAprendiz = new Image(); imgAprendiz.src = "npc_aprendiz.png";
const imgMestrePingPong = new Image(); imgMestrePingPong.src = "npc_mestre_ping_pong.png";
// Mestre oficial da Ilha do Arco: PNG frontal com crop de conteúdo no registro do NPC.
const imgMestreArcoOverworld = new Image();
imgMestreArcoOverworld.src = "mestre_arquearia2.0_overworld.png?v=2.0.0_frontal";

// Mestre da Corrida: original preserved; edge-connected background mask is cached by the overworld renderer.
const imgMestreCorridaNpc = new Image();
imgMestreCorridaNpc.src = "skate_sprites/mestre_corrida_npc.png";

// Sprites Ping-Pong
const imgZorpIdle = new Image(); imgZorpIdle.src = "zorp_idle.png";
const imgZorpMU = new Image(); imgZorpMU.src = "zorp_mu.png";
const imgZorpMD = new Image(); imgZorpMD.src = "zorp_md.png";
const imgZorpHit = new Image(); imgZorpHit.src = "zorp_hit.png";

const imgMestreIdle = new Image(); imgMestreIdle.src = "mestre_idle.png";
const imgMestreMU = new Image(); imgMestreMU.src = "mestre_mu.png";
const imgMestreMD = new Image(); imgMestreMD.src = "mestre_md.png";
const imgMestreHit = new Image(); imgMestreHit.src = "mestre_hit.png";

const imgMestreEscalada = new Image(); imgMestreEscalada.src = "npc_mestre_escalada.png";
// Separate image/cache entries select the four frontal Overworld figures.
// imgMestreEscalada above belongs to the minigame summit and stays unchanged.
const imgMestreEscaladaOverworld = new Image(); imgMestreEscaladaOverworld.src = "npcs_escalada2.0.png?v=1";
const imgGuiaTrilha = new Image(); imgGuiaTrilha.src = "npcs_escalada2.0.png?v=1";
const imgGeologa = new Image(); imgGeologa.src = "npcs_escalada2.0.png?v=1";
const imgChef = new Image(); imgChef.src = "npcs_escalada2.0.png?v=1";

// Biblioteca oficial da Escalada. Os recortes aprovados mantêm canvas/âncora
// consistentes e são os únicos assets usados durante a subida.
const loadClimbAsset = (path) => {
    const image = new Image();
    image.src = `climb_assets/${path}?v=2`;
    return image;
};
// Catálogo exclusivo de zorp_escalada2.0.png: apenas recortes transparentes.
// O cache é separado dos props; nenhuma folha/pose antiga é carregada.
const climbZorpImageCache = new Map();
const climbZorpAssetStatus = { version: "2.0", requested: 0, loaded: 0, failed: [] };
function loadClimbZorpFrame(id) {
    if (climbZorpImageCache.has(id)) return climbZorpImageCache.get(id);
    const frame = CLIMB_ZORP_V2_MANIFEST.frames.find(frame => frame.id === id);
    if (!frame) throw new Error(`Frame da Escalada não catalogado: ${id}`);
    const image = new Image();
    climbZorpImageCache.set(id, image);
    climbZorpAssetStatus.requested++;
    image.addEventListener("load", () => climbZorpAssetStatus.loaded++, { once: true });
    image.addEventListener("error", () => {
        climbZorpAssetStatus.failed.push(frame.file);
        console.error(`Não foi possível carregar o Zorp da Escalada: ${frame.file}`);
    }, { once: true });
    image.src = `climb_assets/${frame.file}?v=${CLIMB_ZORP_V2_MANIFEST.version}`;
    return image;
}
const climbAssets = {
    zorp: ClimbSprites.createLibrary(loadClimbZorpFrame),
    holds: {
        normal: loadClimbAsset("pedras/pedra_normal_01.png"),
        moving: loadClimbAsset("pedras/pedra_gelo_01.png"),
        brittle: loadClimbAsset("pedras/pedra_fragil_01.png"),
        moss: loadClimbAsset("pedras/pedra_musgo_02.png"),
        bonus: loadClimbAsset("pedras/pedra_brilhante_01.png"),
        danger: loadClimbAsset("pedras/pedra_perigosa_01.png"),
        purple: loadClimbAsset("pedras/pedra_escura_01.png"),
        checkpoint: loadClimbAsset("pedras/pedra_bonus_01.png")
    },
    hazards: {
        thrownStone: [loadClimbAsset("obstaculos/boulder/hazard_boulder_01.png"), loadClimbAsset("obstaculos/boulder/hazard_boulder_02.png")],
        boulder: [loadClimbAsset("obstaculos/boulder/hazard_boulder_03.png"), loadClimbAsset("obstaculos/boulder/hazard_boulder_04.png"), loadClimbAsset("obstaculos/boulder/hazard_boulder_05.png")],
        log: [loadClimbAsset("obstaculos/log/hazard_log_01.png"), loadClimbAsset("obstaculos/log/hazard_log_02.png"), loadClimbAsset("obstaculos/log/hazard_log_03.png")],
        crate: [loadClimbAsset("obstaculos/crate/hazard_crate_01.png"), loadClimbAsset("obstaculos/crate/hazard_crate_02.png"), loadClimbAsset("obstaculos/crate/hazard_crate_03.png"), loadClimbAsset("obstaculos/crate/hazard_crate_04.png")],
        boot: [loadClimbAsset("obstaculos/boot/hazard_boot_01.png"), loadClimbAsset("obstaculos/boot/hazard_boot_02.png"), loadClimbAsset("obstaculos/boot/hazard_boot_03.png")],
        bucket: [loadClimbAsset("obstaculos/bucket/hazard_bucket_01.png"), loadClimbAsset("obstaculos/bucket/hazard_bucket_02.png"), loadClimbAsset("obstaculos/bucket/hazard_bucket_03.png"), loadClimbAsset("obstaculos/bucket/hazard_bucket_04.png")],
        coconut: [loadClimbAsset("obstaculos/coconut/hazard_coconut_01.png"), loadClimbAsset("obstaculos/coconut/hazard_coconut_02.png"), loadClimbAsset("obstaculos/coconut/hazard_coconut_03.png"), loadClimbAsset("obstaculos/coconut/hazard_coconut_04.png")],
        planter: [loadClimbAsset("obstaculos/planter/hazard_planter_01.png"), loadClimbAsset("obstaculos/planter/hazard_planter_02.png"), loadClimbAsset("obstaculos/planter/hazard_planter_03.png")],
        impact: loadClimbAsset("efeitos/climb_warning_02.png"),
        dust: [loadClimbAsset("efeitos/climb_dust_01.png"), loadClimbAsset("efeitos/climb_dust_02.png"), loadClimbAsset("efeitos/climb_dust_03.png"), loadClimbAsset("efeitos/climb_dust_04.png")]
    }
};

// Arte e Sprites de Vitória no Cume (VictoryEscalada.png)
const imgVictoryEscalada = new Image(); imgVictoryEscalada.src = "VictoryEscalada.png?v=3";

// -------------------------------------------------------------
// BOXE — recortes oficiais 3.0; geometria e combate permanecem no runtime atual.
// A seleção de poses e os anchors vêm do catálogo gerado das três folhas 3.0.
const BOXING_ASSET_VERSION = "3.0.2_boxing_arena";
const BOXING_FRAME_DURATIONS = Object.freeze({
    idle: 11, walk: 5, guard: 9, jab: 4, cross: 7, hook: 8, dodge: 5, hurt: 5,
    stun: 10, idle_damaged: 11, idle_heavy: 11,
    dash: 5, charged: 10, burst: 6, knockdown: 6, getup: 5,
    victory: 8, defeat: 8, start: 6, count_start: 6, count: 10, continue: 6, ko: 7
});
const BOXING_FRAME_CANVAS = Object.freeze({ ...BOXING_V3_MANIFEST.canvas });
const boxingAssetStatus = { version: "3.0", requested: 0, loaded: 0, failed: 0, failedPaths: [] };
const boxingImageCache = new Map();
function loadBoxingImage(path) {
    if (boxingImageCache.has(path)) return boxingImageCache.get(path);
    const img = new Image();
    boxingImageCache.set(path, img);
    boxingAssetStatus.requested++;
    img.addEventListener("load", () => boxingAssetStatus.loaded++, { once: true });
    img.addEventListener("error", () => {
        boxingAssetStatus.failed++;
        boxingAssetStatus.failedPaths.push(path);
    }, { once: true });
    img.src = `${path}?v=${BOXING_ASSET_VERSION}`;
    return img;
}
function loadBoxingSequence(role, action) {
    const actor = BOXING_V3_MANIFEST.actors[role];
    return Object.freeze(actor.actions[action].map(key => {
        const frame = actor.frames[key];
        const img = loadBoxingImage(frame.sprite);
        img.boxingFootY = frame.anchor.y - 1;
        img.boxingAnchorX = frame.anchor.x;
        img.boxingFrameId = frame.id;
        return img;
    }));
}
const imgBoxeArenaBg = loadBoxingImage("arena_boxe3.0.png");
const BOXING_SPRITES = Object.freeze(Object.fromEntries(
    Object.entries(BOXING_V3_MANIFEST.actors).map(([role, actor]) => [role,
        Object.freeze(Object.fromEntries(Object.keys(actor.actions).map(action =>
            [action, loadBoxingSequence(role, action)])))
    ])
));
// Novos NPCs da Ilha de Boxe (Overworld)
const imgNpcMestreBoxe = new Image(); imgNpcMestreBoxe.src = "npc_mestre_novo.png?v=4";
const imgNpcTreinadorBoxe = new Image(); imgNpcTreinadorBoxe.src = "npc_treinador_novo.png?v=4";
const imgNpcArbitroBoxe = new Image(); imgNpcArbitroBoxe.src = "npc_arbitro_novo.png?v=4";
const imgNpcBoxeador = new Image(); imgNpcBoxeador.src = "npc_pugilista_novo.png?v=4";
const imgBoxeSacoPancada = new Image(); imgBoxeSacoPancada.src = "boxe_saco_pancada.png?v=4";

const imgMestreSkate = new Image(); imgMestreSkate.src = "mestre_skate.png?v=5_cropped_pixel_perfect";
// -------------------------------------------------------------
// 2. OBJETOS, OBSTÁCULOS E ESTADOS DO JOGO
// -------------------------------------------------------------
const player = { 
    x: 225, 
    y: 150, 
    speed: 2.2,
    renderWidth: 40,   
    renderHeight: 48   
};

const keys = { 
    w: false, a: false, s: false, d: false, e: false, space: false,
    j: false, k: false, u: false, i: false, l: false, r: false,
    z: false, x: false, c: false, v: false,
    arrowleft: false, arrowright: false, arrowup: false, arrowdown: false,
    escape: false
};
let archeryShootPressed = false;

const zorpSprite = {
    cols: 3, rows: 4, row: 0, 
    animSequence: [1, 0, 1, 2], animIndex: 0,
    isMoving: false, timer: 0, speed: 8 
};

// One coordinate model for the arena crop, tabletop, net and shot landing zones.
// Crop the existing artwork at its native aspect ratio; do not stretch the table.
const PINGPONG_COURT = (() => {
    const artwork = Object.freeze({ width: 1683, height: 935, x: 454, y: 200, w: 775, h: 775 * 300 / 450 });
    const scale = 450 / artwork.w;
    // Visible white tabletop boundary in bg_pingpong.png's native pixels.
    const table = Object.freeze({
        left: (609 - artwork.x) * scale, right: (1074 - artwork.x) * scale,
        back: (357 - artwork.y) * scale, front: (585 - artwork.y) * scale
    });
    return Object.freeze({
        artwork, table,
        net: Object.freeze({ x: (table.left + table.right) / 2, back: table.back,
            front: table.front, height: (357 - 322) * scale, collisionEnabled: false }),
        player: Object.freeze({ homeX: 44, minX: 30, maxX: 58 }),
        opponent: Object.freeze({ homeX: 366 })
    });
})();
function pingPongTableX(x) {
    return PINGPONG_COURT.table.left + (x - 150) / 150 * (PINGPONG_COURT.table.right - PINGPONG_COURT.table.left);
}
function pingPongTableY(y) {
    return PINGPONG_COURT.table.back + (y - 100) / 90 * (PINGPONG_COURT.table.front - PINGPONG_COURT.table.back);
}

const pingPong = {
    playerX: PINGPONG_COURT.player.homeX, playerY: pingPongTableY(145) - 20,
    opponentX: PINGPONG_COURT.opponent.homeX, opponentY: pingPongTableY(145) - 20,
    speed: 4.0, // Velocidade de caminhada do Zorp
    opponentSpeed: 2.75, // Velocidade justa de caminhada do Mestre (estilo Tengu, sem dash)
    masterAI: PingPongMasterAI.create(),
    balls: [], // Array de bolas ativas em campo
    ballRadius: 4,
    playerScore: 0, opponentScore: 0, maxScore: 50, // Partida até 50 pontos
    playerAction: "IDLE", opponentAction: "IDLE",  
    playerHitTimer: 0, opponentHitTimer: 0,
    power: 0, maxPower: 100, isPowerActive: false, // Super Smash exclusivo do Zorp
    rallyHits: 0,
    gameState: 'TUTORIAL',
    win: false,
    bounceEffects: [],
    specialEffects: [], // Arcos curtos da raquetada global
    server: 'PLAYER',
    nextBallId: 1,
    serveCooldown: 0,
    pointFreeze: 0, pendingPoints: [], pointFeedback: [],
    multiball: PingPongMultiball.create(),
    scoreCooldown: 0,
    globalReturnCooldown: 0,
    playerVelocityY: 0,
    mestreReaction: null // { text: '💦', timer: 30 }
};

// -------------------------------------------------------------
// TELAS DE INTERFACE (UI OVERLAYS)
// -------------------------------------------------------------
function drawOverlayScreen(title, lines, titleColor = "#f1c40f", promptText = "[Pressione ESPAÇO para continuar]") {
    // Fundo escuro translúcido
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.textAlign = "center";
    
    // Título
    ctx.fillStyle = titleColor;
    ctx.font = "bold 26px monospace";
    ctx.fillText(title, canvas.width / 2, 80);
    
    // Linhas de explicação
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px monospace";
    lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, 130 + (index * 25));
    });
    
    // Instrução para continuar piscando
    ctx.fillStyle = (Date.now() % 1000 < 500) ? "#ffffff" : "#f1c40f"; 
    ctx.font = "bold 13px monospace";
    ctx.fillText(promptText, canvas.width / 2, canvas.height - 35);
    
    ctx.textAlign = "left"; // Reset
}


// -------------------------------------------------------------
// MINIGAME ESCALADA (PLATFORMING VERTICAL ARCADE, COM FILOSOFIA INSPIRADA EM DOODLE)
// -------------------------------------------------------------
const CLIMB_PHYSICS = Object.freeze({
    jumpForce: 7.75,
    gravity: 0.34,
    airAcceleration: 0.31,
    launchSpeed: 2.65,
    maxAirSpeed: 3.85,
    terminalVelocity: 8.4,
    grabRadius: 27,
    snapFrames: 4,
    settleFrames: 10,
    recoveryDepth: 132
});
const CLIMB_SAFE_REACH = 126;
const CLIMB_QUERY = new URLSearchParams(window.location.search);
const CLIMB_QA_MODE = CLIMB_QUERY.has('climbQa');
const CLIMB_QA_NO_HAZARDS = CLIMB_QUERY.has('climbNoHazards');
const CLIMB_SPIKE_EXCLUSION_RADIUS = 168;
const CLIMB_LEVEL = ClimbCourse.sections;

const CLIMB_THROW_PATTERNS = {
    single: [{ delay: 0, offset: 0, type: 'stone' }],
    center: [{ delay: 0, offset: 0, type: 'boulder' }],
    force_left: [
        { delay: 0, offset: 20, type: 'crate' },
        { delay: 34, offset: 185, type: 'coconut' }
    ],
    force_right: [
        { delay: 0, offset: -20, type: 'boulder' },
        { delay: 34, offset: -185, type: 'boot' }
    ],
    swap: [
        { delay: 0, offset: 0, type: 'stone' },
        { delay: 46, offset: 0, type: 'bucket' }
    ],
    double: [
        { delay: 0, offset: -145, type: 'stone' },
        { delay: 0, offset: 145, type: 'stone' }
    ],
    fragile_pressure: [
        { delay: 0, offset: 0, type: 'planter' },
        { delay: 42, offset: 175, type: 'coconut' }
    ],
    gauntlet: [
        { delay: 0, offset: 0, type: 'log' },
        { delay: 45, offset: -175, type: 'boot' },
        { delay: 45, offset: 175, type: 'coconut' }
    ]
};

const escaladaGame = {
    vida: 3,
    maxVida: 3,
    invulTimer: 0,
    shakeTimer: 0,
    
    // Mountain silhouette and routes share the same world-space profile.
    mountainWidth: ClimbCourse.worldWidth,
    cameraX: 525,
    
    playerX: ClimbCourse.profile(0,1).spine,
    playerY: 220,
    pedraAtual: null,
    playerState: 'GRABBED',
    vx: 0,
    vy: 0,
    airFrames: 0,
    launchHoldId: 0,
    grabTarget: null,
    snapTimer: 0,
    gripTimer: 0,
    jumpBufferTimer: 0,
    nextJumpControl: 1,
    jumpDir: 0,
    currentStep: 0,
    
    climbFrameTimer: 0,
    climbFrameIndex: 0,
    score: 0,
    combo: 0,
    hazardCooldown: 0,
    lastHazardLane: -1,
    slipTimer: 0,
    fallFrames: 0,
    checkpointsGerados: {},
    settleTimer: 0,
    checkpointHoldId: 0,
    respawnTimer: 0,
    hazardQueue: [],
    throwPatternIndex: 0,
    sectionRanges: [],
    levelValidation: null,
    finishStarted: false,
    startTime: 0,
    lastRunSeconds: 0,
    qaLastFpsTime: 0,
    qaFrameCount: 0,
    qaFps: 0,
    
    pedrasGeradas: [],
    objetosCaindo: [],
    particulas: [],
    sparksImpacto: [],
    
    alturaAtual: 0,
    alturaTotal: 5400,
    checkpointAltura: 0,
    
    ventoForca: 0,
    ventoTimer: 0,
    ventoDuracao: 0,
    ventoDirecao: 1, // 1 para direita, -1 para esquerda
    ventoParticulas: [],
    
    morteMotivo: "",
    isGameOver: false,
    
    minimapaX: 14,
    minimapaY: 46,
    minimapaLargura: 44,
    minimapaAltura: 195,
    
    mensagemAtual: "",
    mensagemTimer: 0,
    mensagensMostradas: {},
    
    gameState: 'TUTORIAL',
    win: false
};

function buildClimbLevel() {
    return ClimbCourse.build(configureClimbHold);
}

const CLIMB_MOVING_TYPES = Object.freeze([
    'moving_horizontal', 'moving_vertical', 'moving_diagonal',
    'moving_diagonal_steep', 'moving_diagonal_low', 'moving_circular',
    'moving_elliptical_wide', 'moving_elliptical_tall', 'moving_figure_eight',
    'moving_arc', 'moving_pendulum', 'moving_triangle', 'moving_rect', 'moving_ice'
]);

function configureClimbHold(hold, seed) {
    hold.quebrada = false;
    hold.respawnTimer = 0;
    if (hold.tipo === 'brittle') {
        hold.tempoRestante = 82;
        hold.breakMax = 82;
        hold.quebrando = false;
    }
    if (CLIMB_MOVING_TYPES.includes(hold.tipo)) {
        const sizeVariant = Math.floor(seed * 7 + hold.sectionIndex * 3) % 3;
        hold.amplitude = 36 + sizeVariant * 7;
        hold.verticalAmplitude = 22 + ((sizeVariant + 1) % 3) * 6;
        if (hold.tipo === 'moving_vertical') hold.amplitude = 0;
        if (hold.tipo === 'moving_diagonal_steep') { hold.amplitude = 27 + sizeVariant * 3; hold.verticalAmplitude = 42 + sizeVariant * 4; }
        if (hold.tipo === 'moving_diagonal_low') { hold.amplitude = 46 + sizeVariant * 5; hold.verticalAmplitude = 17 + sizeVariant * 3; }
        if (hold.tipo === 'moving_elliptical_wide') { hold.amplitude = 50 + sizeVariant * 4; hold.verticalAmplitude = 20 + sizeVariant * 2; }
        if (hold.tipo === 'moving_elliptical_tall') { hold.amplitude = 25 + sizeVariant * 3; hold.verticalAmplitude = 43 + sizeVariant * 4; }
        if (hold.tipo === 'moving_figure_eight') { hold.amplitude = 43; hold.verticalAmplitude = 27; }
        if (hold.tipo === 'moving_arc') { hold.amplitude = 48; hold.verticalAmplitude = 30; }
        if (hold.tipo === 'moving_pendulum') { hold.amplitude = 52; hold.verticalAmplitude = 36; }
        if (hold.tipo === 'moving_triangle') { hold.amplitude = 39; hold.verticalAmplitude = 31; }
        if (hold.tipo === 'moving_rect') { hold.amplitude = 43; hold.verticalAmplitude = 27; }
        hold.speed = 1.32 + hold.sectionIndex * 0.17;
        if (hold.tipo === 'moving_figure_eight') hold.speed *= 0.92;
        if (hold.tipo === 'moving_pendulum') hold.speed *= 1.05;
        hold.offset = seed * 1.173 + hold.sectionIndex * 0.41;
    }
}

function isMovingClimbHold(hold) {
    return !!hold && CLIMB_MOVING_TYPES.includes(hold.tipo);
}

function sampleClimbHoldMotion(hold, phase) {
    const amplitude = hold.amplitude || 0;
    const vertical = hold.verticalAmplitude || 0;
    if (hold.tipo === 'moving_horizontal' || hold.tipo === 'moving_ice') return { x: Math.sin(phase) * amplitude, y: 0 };
    if (hold.tipo === 'moving_vertical') return { x: 0, y: Math.sin(phase) * vertical };
    if (hold.tipo === 'moving_diagonal' || hold.tipo === 'moving_diagonal_low' || hold.tipo === 'moving_diagonal_steep') {
        return { x: Math.sin(phase) * amplitude, y: Math.sin(phase) * vertical };
    }
    if (hold.tipo === 'moving_circular' || hold.tipo === 'moving_elliptical_wide' || hold.tipo === 'moving_elliptical_tall') {
        return { x: Math.cos(phase) * amplitude, y: Math.sin(phase) * vertical };
    }
    if (hold.tipo === 'moving_figure_eight') return { x: Math.sin(phase) * amplitude, y: Math.sin(phase * 2) * vertical };
    if (hold.tipo === 'moving_arc') {
        const progress = (Math.sin(phase) + 1) * 0.5;
        return { x: (progress * 2 - 1) * amplitude, y: -Math.sin(progress * Math.PI) * vertical + vertical * 0.35 };
    }
    if (hold.tipo === 'moving_pendulum') {
        const angle = Math.sin(phase) * 0.86;
        return { x: Math.sin(angle) * amplitude, y: (1 - Math.cos(angle)) * vertical - vertical * 0.18 };
    }
    const cycle = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
    if (hold.tipo === 'moving_triangle') {
        const points = [{ x: -amplitude, y: vertical * 0.5 }, { x: 0, y: -vertical }, { x: amplitude, y: vertical * 0.5 }];
        const scaled = cycle * 3;
        const index = Math.floor(scaled) % 3;
        const local = scaled - Math.floor(scaled);
        const from = points[index], to = points[(index + 1) % 3];
        return { x: from.x + (to.x - from.x) * local, y: from.y + (to.y - from.y) * local };
    }
    if (hold.tipo === 'moving_rect') {
        const points = [{ x: -amplitude, y: -vertical }, { x: amplitude, y: -vertical }, { x: amplitude, y: vertical }, { x: -amplitude, y: vertical }];
        const scaled = cycle * 4;
        const index = Math.floor(scaled) % 4;
        const local = scaled - Math.floor(scaled);
        const from = points[index], to = points[(index + 1) % 4];
        return { x: from.x + (to.x - from.x) * local, y: from.y + (to.y - from.y) * local };
    }
    return { x: 0, y: 0 };
}

function climbHoldPositionAtTime(hold, timeSeconds) {
    if (!isMovingClimbHold(hold)) return { x: hold.baseX, climbY: hold.climbY };
    const motion = sampleClimbHoldMotion(hold, timeSeconds * hold.speed + hold.offset);
    return { x: hold.baseX + motion.x, climbY: hold.climbY - motion.y };
}

// Use the actual discrete jump integration, rather than a circular distance guess.
// The graph checks directed transfers at 64 deterministic departure phases.
function measureClimbTransfer(from, to) {
    const rise = to.climbY - from.climbY;
    if (rise < 18 || rise > 145 || Math.abs(to.baseX-from.baseX)>220)
        return {reachable:false, minDistance:Infinity, contactWindowFrames:0};
    const moving = isMovingClimbHold(from)||isMovingClimbHold(to);
    const samples = moving ? 64 : 1;
    let longest=0, run=0, successes=0, fastest=Infinity;
    for (let sample=0;sample<samples;sample++) {
        const time=sample*.1, origin=climbHoldPositionAtTime(from,time);
        const initial=climbHoldPositionAtTime(to,time);
        const next=climbHoldPositionAtTime(from,time+1/60);
        let x=origin.x,y=-origin.climbY,vy=-CLIMB_PHYSICS.jumpForce;
        let vx=Math.sign(initial.x-x)*CLIMB_PHYSICS.launchSpeed+(next.x-origin.x)*.55;
        let hit=false;
        for(let frame=1;frame<=60;frame++) {
            const target=climbHoldPositionAtTime(to,time+frame/60);
            const desired=Math.max(-3.85,Math.min(3.85,(target.x-x)*.18));
            const input=Math.abs(desired-vx)<.25?0:Math.sign(desired-vx);
            vx+=input*CLIMB_PHYSICS.airAcceleration*(from.tipo==='moss'?.72:1);
            vx*=input?.992:.982;
            vx=Math.max(-CLIMB_PHYSICS.maxAirSpeed,Math.min(CLIMB_PHYSICS.maxAirSpeed,vx));
            vy=Math.min(CLIMB_PHYSICS.terminalVelocity,vy+CLIMB_PHYSICS.gravity);
            x+=vx;y+=vy;
            const dy=-target.climbY-y, radius=to.grabRadius||CLIMB_PHYSICS.grabRadius;
            const contact=to.isFinish ? frame>=4&&x>=to.surface.left+16&&x<=to.surface.right-16&&Math.abs(dy+44)<=8
                : frame>=4&&Math.hypot(target.x-x,dy)<=radius&&Math.abs(dy)<=radius*.92;
            if(contact){hit=true;fastest=Math.min(fastest,frame);break;}
        }
        if(hit){successes++;run++;longest=Math.max(longest,run);}else run=0;
    }
    return {reachable:successes>0&&(!moving||longest>=3),
        minDistance:Math.hypot(to.baseX-from.baseX,rise),
        contactWindowFrames:moving?longest*6:999, phaseCoverage:successes/samples, fastestFrames:fastest};
}

function buildClimbGraph(holds) {
    const outgoing=new Map(holds.map(h=>[h.id,[]])),incoming=new Map(holds.map(h=>[h.id,[]])),edges=[];
    for(const from of holds)for(const to of holds){
        if(to.climbY<=from.climbY||to.climbY>from.climbY+145)continue;
        const transfer=measureClimbTransfer(from,to);if(!transfer.reachable)continue;
        const edge={from:from.id,to:to.id,fromHold:from,toHold:to,...transfer};
        outgoing.get(from.id).push(edge);incoming.get(to.id).push(edge);edges.push(edge);
    }
    return {outgoing,incoming,edges};
}

function isConnectedClimbPath(path,graph) {
    return path.every((h,i)=>!i||graph.outgoing.get(path[i-1].id).some(e=>e.to===h.id));
}

// Check authored transfers with independent motion phases. A short shared-clock
// sample can miss an unfavourable combination between two different trajectories.
function auditClimbTransferPhases(from, to) {
    const phaseCount = 64, fromCount = isMovingClimbHold(from) ? phaseCount : 1;
    const toCount = isMovingClimbHold(to) ? phaseCount : 1;
    let failures=0, narrow=0, jitterFailures=0, minContactFrames=Infinity;
    function contacts(timeFrom,timeTo,offset=0,delay=0) {
        const origin=climbHoldPositionAtTime(from,timeFrom),initial=climbHoldPositionAtTime(to,timeTo);
        const next=climbHoldPositionAtTime(from,timeFrom+1/60);
        let x=origin.x+offset,y=-origin.climbY,vy=-CLIMB_PHYSICS.jumpForce;
        let vx=Math.sign(initial.x-x)*CLIMB_PHYSICS.launchSpeed+(next.x-origin.x)*.55,run=0,longest=0;
        for(let frame=1;frame<=60;frame++) {
            const target=climbHoldPositionAtTime(to,timeTo+frame/60);
            const desired=Math.max(-CLIMB_PHYSICS.maxAirSpeed,Math.min(CLIMB_PHYSICS.maxAirSpeed,(target.x-x)*.18));
            const input=frame<=delay?0:Math.abs(desired-vx)<.25?0:Math.sign(desired-vx);
            vx+=input*CLIMB_PHYSICS.airAcceleration*(from.tipo==='moss'?.72:1);
            vx*=input?.992:.982;
            vx=Math.max(-CLIMB_PHYSICS.maxAirSpeed,Math.min(CLIMB_PHYSICS.maxAirSpeed,vx));
            vy=Math.min(CLIMB_PHYSICS.terminalVelocity,vy+CLIMB_PHYSICS.gravity);x+=vx;y+=vy;
            const dy=-target.climbY-y,radius=to.grabRadius||CLIMB_PHYSICS.grabRadius;
            const contact=to.isFinish ? frame>=4&&x>=to.surface.left+16&&x<=to.surface.right-16&&Math.abs(dy+44)<=8
                : frame>=4&&Math.hypot(target.x-x,dy)<=radius&&Math.abs(dy)<=radius*.92;
            if(contact){run++;longest=Math.max(longest,run);}else run=0;
        }
        return longest;
    }
    for(let a=0;a<fromCount;a++)for(let b=0;b<toCount;b++) {
        const ta=fromCount===1?0:(a/fromCount*Math.PI*2-from.offset)/from.speed;
        const tb=toCount===1?0:(b/toCount*Math.PI*2-to.offset)/to.speed;
        const frames=contacts(ta,tb);
        minContactFrames=Math.min(minContactFrames,frames);
        if(!frames)failures++;else if(frames<3)narrow++;
        if(!contacts(ta,tb,-4,2)||!contacts(ta,tb,4,2))jitterFailures++;
    }
    return {from:from.id,to:to.id,samples:fromCount*toCount,failures,narrow,jitterFailures,minContactFrames};
}

function validateClimbLevel(holds,finishId,ranges=[]) {
    const graph=buildClimbGraph(holds), dangerous=h=>['spike','danger'].includes(h.tipo);
    const reachable=new Set([0]),queue=[holds[0]];
    const minJumps=new Map([[0,0]]);
    while(queue.length){const h=queue.shift();for(const e of graph.outgoing.get(h.id)){
        if(dangerous(e.toHold))continue;
        if(!reachable.has(e.to)){reachable.add(e.to);minJumps.set(e.to,minJumps.get(h.id)+1);queue.push(e.toHold);}
    }}
    const main=holds.filter(h=>!h.optionalRoute).sort((a,b)=>a.climbY-b.climbY);
    const authoredPairs=new Map();
    function includePath(path){path.slice(1).forEach((h,i)=>authoredPairs.set(`${path[i].id}:${h.id}`,[path[i],h]));}
    includePath(main);
    for(const tag of new Set(holds.filter(h=>h.forkEntry!==undefined).map(h=>h.routeTag))){
        const branch=holds.filter(h=>h.routeTag===tag).sort((a,b)=>a.climbY-b.climbY);
        includePath([holds.find(h=>h.id===branch[0].forkEntry),...branch,holds.find(h=>h.id===branch[0].forkExit)]);
    }
    const phaseChecks=[...authoredPairs.values()].map(([a,b])=>auditClimbTransferPhases(a,b));
    const phaseIssues=phaseChecks.filter(c=>c.failures||c.narrow||c.jitterFailures);
    const transferValidator={valid:!phaseIssues.length,transfers:phaseChecks.length,independentPhases:64,
        simulations:phaseChecks.reduce((n,c)=>n+c.samples*3,0),positionTolerance:4,controlDelayFrames:2,
        requiredContinuousFrames:3,minContactFrames:Math.min(...phaseChecks.map(c=>c.minContactFrames)),issues:phaseIssues};
    const missingMain=[];
    main.forEach((h,i)=>{if(i&&!graph.outgoing.get(main[i-1].id).some(e=>e.to===h.id))missingMain.push([main[i-1].id,h.id]);});
    const sections=ranges.map(r=>{
        const group=holds.filter(h=>h.sectionIndex===r.sectionIndex);
        const tags=[...new Set(group.filter(h=>h.forkEntry!==undefined).map(h=>h.routeTag))];
        const invalidRouteTags=tags.filter(tag=>{
            // A route can cross visual zones; validate its complete authored path.
            const branch=holds.filter(h=>h.routeTag===tag).sort((a,b)=>a.climbY-b.climbY);
            return !isConnectedClimbPath([holds.find(h=>h.id===branch[0].forkEntry),...branch,holds.find(h=>h.id===branch[0].forkExit)],graph);
        });
        const lanes=[...new Set(group.filter(h=>!dangerous(h)&&h.lane!=='connection').map(h=>h.lane||'center'))];
        return {id:r.id,holdCount:group.length,startHeight:r.startHeight,endHeight:r.endHeight,
            reachableEnd:main.filter(h=>h.sectionIndex===r.sectionIndex).every(h=>reachable.has(h.id)),
            routes:lanes.length,lanes,bifurcations:tags.length-invalidRouteTags.length,invalidRouteTags};
    });
    const spikes=holds.filter(dangerous),pairs=[],spikeEdges=[],withoutAlternative=[];
    let minSpikeDistance=Infinity;
    spikes.forEach((h,i)=>{
        spikes.slice(i+1).forEach(b=>{const d=Math.hypot(h.baseX-b.baseX,h.climbY-b.climbY);minSpikeDistance=Math.min(minSpikeDistance,d);if(d<CLIMB_SPIKE_EXCLUSION_RADIUS)pairs.push([h.id,b.id]);});
        graph.outgoing.get(h.id).forEach(e=>{if(dangerous(e.toHold))spikeEdges.push([h.id,e.to]);});
        if(!holds.some(b=>!dangerous(b)&&Math.abs(b.climbY-h.climbY)<10&&reachable.has(b.id)&&graph.outgoing.get(b.id).some(e=>!dangerous(e.toHold))))withoutAlternative.push(h.id);
    });
    const moving=holds.filter(isMovingClimbHold),withoutTransfer=moving.filter(h=>!graph.incoming.get(h.id).some(e=>!dangerous(e.fromHold))||!graph.outgoing.get(h.id).some(e=>!dangerous(e.toHold))).map(h=>h.id);
    const collisionViolations=[];
    moving.forEach((h,i)=>moving.slice(i+1).forEach(b=>{
        if(Math.abs(h.climbY-b.climbY)>110)return;
        let min=Infinity;for(let k=0;k<96;k++){const a=climbHoldPositionAtTime(h,k/10),c=climbHoldPositionAtTime(b,k/10);min=Math.min(min,Math.hypot(a.x-c.x,a.climbY-c.climbY));}
        if(min<34)collisionViolations.push({holds:[h.id,b.id],minDistance:min});
    }));
    const finish=holds.find(h=>h.id===finishId), checkpoints=holds.filter(h=>h.tipo==='checkpoint').map(h=>{
        const visited=new Set([0]),pending=[0];
        while(pending.length){const id=pending.shift();for(const e of graph.outgoing.get(id)){
            if(e.to===h.id||dangerous(e.toHold)||visited.has(e.to))continue;
            visited.add(e.to);pending.push(e.to);
        }}
        return {id:h.id,step:h.levelStep,progress:h.climbY/finish.climbY,reachable:reachable.has(h.id),mandatory:!visited.has(finishId)};
    });
    const checkpointValidator={valid:checkpoints.length===2&&checkpoints.every((c,i)=>c.reachable&&c.mandatory&&c.progress>=[.30,.65][i]&&c.progress<=[.35,.70][i]),checkpoints};
    const spikeValidator={valid:!pairs.length&&!spikeEdges.length&&!withoutAlternative.length,count:spikes.length,minDistance:Number.isFinite(minSpikeDistance)?minSpikeDistance:null,radiusViolations:pairs,spikeEdges,withoutAlternative};
    const routeValidator={valid:!missingMain.length&&sections.every(s=>s.reachableEnd&&!s.invalidRouteTags.length),missingMain,totalBifurcations:sections.reduce((n,s)=>n+s.bifurcations,0),sections};
    const canReachSummit=new Set([finishId]),backward=[finishId];
    while(backward.length){const id=backward.shift();for(const e of graph.incoming.get(id)){
        if(dangerous(e.fromHold)||canReachSummit.has(e.from))continue;
        canReachSummit.add(e.from);backward.push(e.from);
    }}
    const deadEnds=holds.filter(h=>!dangerous(h)&&reachable.has(h.id)&&!canReachSummit.has(h.id)).map(h=>h.id);
    routeValidator.deadEnds=deadEnds;routeValidator.valid=routeValidator.valid&&!deadEnds.length;
    const movingValidator={valid:!withoutTransfer.length&&!collisionViolations.length,withoutTransfer,collisionViolations,minTransferWindowFrames:Math.min(...graph.edges.filter(e=>isMovingClimbHold(e.toHold)).map(e=>e.contactWindowFrames))};
    const outsideMountain=[];let minimumClearance=Infinity;
    for(const hold of holds.filter(h=>!h.isFinish)){
        const count=isMovingClimbHold(hold)?64:1;
        for(let i=0;i<count;i++){
            const time=count===1?0:(i/count*Math.PI*2-hold.offset)/hold.speed;
            const pos=climbHoldPositionAtTime(hold,time),face=ClimbCourse.profile(pos.climbY,finish.climbY);
            const clearance=Math.min(pos.x-face.left,face.right-pos.x);
            minimumClearance=Math.min(minimumClearance,clearance);
            if(clearance<36){outsideMountain.push(hold.id);break;}
        }
    }
    const mountainValidator={valid:!outsideMountain.length,requiredClearance:36,minimumClearance,outsideMountain,
        widths:[0,.5,.9,1].map(p=>{const e=ClimbCourse.profile(p*finish.climbY,finish.climbY);return {progress:p,width:e.right-e.left};})};
    const distribution=sections.map(s=>{
        const group=holds.filter(h=>!dangerous(h)&&h.sectionIndex===ranges.find(r=>r.id===s.id).sectionIndex);
        const positions=group.map(h=>{const face=ClimbCourse.profile(h.climbY,finish.climbY);return (h.baseX-face.left)/(face.right-face.left);});
        return {id:s.id,lanes:s.lanes,bands:[...new Set(positions.map(p=>Math.max(0,Math.min(4,Math.floor(p*5)))))].sort(),
            left:Math.min(...positions),right:Math.max(...positions)};
    });
    const distributionValidator={valid:distribution.every(s=>s.lanes.length===3&&s.bands.length>=(s.id==='base'?3:5)),sections:distribution};
    return {valid:reachable.has(finishId)&&routeValidator.valid&&spikeValidator.valid&&movingValidator.valid&&checkpointValidator.valid&&transferValidator.valid&&mountainValidator.valid&&distributionValidator.valid,
        holds:holds.length,steps:finish.levelStep,height:finish.climbY,reachable:reachable.size,edgeCount:graph.edges.length,
        minimumJumps:minJumps.get(finishId),sections,routeValidator,spikeValidator,movingValidator,checkpointValidator,transferValidator,mountainValidator,distributionValidator,
        summit:{physical:true,surface:finish.surface,height:finish.climbY},physics:{...CLIMB_PHYSICS}};
}

function getCurrentClimbSection() {
    const height = Math.max(0,Math.min(escaladaGame.alturaTotal,escaladaGame.pedraAtual ? escaladaGame.pedraAtual.climbY : 220-escaladaGame.playerY+escaladaGame.alturaAtual));
    const range = escaladaGame.sectionRanges.find(item => height >= item.startHeight && height <= item.endHeight);
    return range || escaladaGame.sectionRanges[0] || { sectionIndex: 0, id: 'intro', width: 620 };
}

function resetEscalada() {
    document.getElementById('game-title').style.visibility = 'hidden';
    hintText.innerText = '';
    escaladaGame.vida = 3;
    escaladaGame.invulTimer = 0;
    escaladaGame.shakeTimer = 0;
    escaladaGame.mountainWidth = ClimbCourse.worldWidth;
    escaladaGame.cameraX = 525;
    escaladaGame.playerX = ClimbCourse.profile(0,1).spine;
    escaladaGame.playerY = 220;
    escaladaGame.alturaAtual = 0;
    escaladaGame.checkpointAltura = 0;
    escaladaGame.playerState = 'GRABBED';
    escaladaGame.vx = 0;
    escaladaGame.vy = 0;
    escaladaGame.airFrames = 0;
    escaladaGame.launchHoldId = 0;
    escaladaGame.grabTarget = null;
    escaladaGame.snapTimer = 0;
    escaladaGame.gripTimer = 0;
    escaladaGame.jumpBufferTimer = 0;
    escaladaGame.nextJumpControl = 1;
    escaladaGame.currentStep = 0;
    escaladaGame.jumpDir = 0;
    escaladaGame.climbFrameTimer = 0;
    escaladaGame.climbFrameIndex = 0;
    escaladaGame.score = 0;
    escaladaGame.combo = 0;
    escaladaGame.hazardCooldown = 150;
    escaladaGame.blockedHoldId=-1;escaladaGame.blockedHoldTimer=0;
    escaladaGame.motionClock=0;escaladaGame.summitContactX=null;
    escaladaGame.lastHazardLane = -1;
    escaladaGame.slipTimer = 0;
    escaladaGame.fallFrames = 0;
    escaladaGame.checkpointsGerados = {};
    escaladaGame.settleTimer = 0;
    escaladaGame.checkpointHoldId = 0;
    escaladaGame.respawnTimer = 0;
    escaladaGame.hazardQueue = [];
    escaladaGame.throwPatternIndex = 0;
    escaladaGame.finishStarted = false;
    ClimbSummit.reset(escaladaGame);
    climbSummitAdvancePressed=false;
    escaladaGame.startTime = performance.now();
    escaladaGame.lastRunSeconds = 0;
    escaladaGame.qaLastFpsTime = performance.now();
    escaladaGame.qaFrameCount = 0;
    escaladaGame.qaFps = 0;
    climbUpPressed = false;
    escaladaGame.isGameOver = false;
    escaladaGame.morteMotivo = "";
    escaladaGame.objetosCaindo = [];
    escaladaGame.particulas = [];
    escaladaGame.sparksImpacto = [];
    escaladaGame.ventoForca = 0;
    escaladaGame.ventoTimer = 180;
    escaladaGame.ventoDuracao = 0;
    escaladaGame.ventoParticulas = [];
    escaladaGame.mensagemAtual = "";
    escaladaGame.mensagemTimer = 0;
    escaladaGame.mensagensMostradas = {};

    const builtLevel = buildClimbLevel();
    escaladaGame.pedrasGeradas = builtLevel.holds;
    escaladaGame.sectionRanges = builtLevel.ranges;
    escaladaGame.routePlan = builtLevel.routePlan;
    escaladaGame.alturaTotal = builtLevel.totalHeight;
    escaladaGame.levelValidation = validateClimbLevel(builtLevel.holds, builtLevel.finishId, builtLevel.ranges);
    escaladaGame.pedraAtual = escaladaGame.pedrasGeradas[0];
    escaladaGame.playerX=escaladaGame.pedraAtual.x;
    escaladaGame.cameraX=escaladaGame.playerX-canvas.width*.5;
    if (!escaladaGame.levelValidation.valid) {
        console.error('[Escalada] Blueprint sem caminho seguro ate o topo.', escaladaGame.levelValidation);
    }
    escaladaGame.gameState = 'TUTORIAL';
    ClimbSprites.reset(escaladaGame);
    ClimbCheckpoints.reset(escaladaGame);
}

function tentarPular() {
    const podePular = escaladaGame.playerState === 'GRABBED' || escaladaGame.playerState === 'STANDING';
    if (!podePular || escaladaGame.isGameOver || escaladaGame.settleTimer > 0 || escaladaGame.finishStarted) return false;

    const direction = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    if(escaladaGame.playerState==='STANDING'&&escaladaGame.pedraAtual?.tipo==='checkpoint')
        return ClimbCheckpoints.prepareJump(escaladaGame,direction);
    return iniciarSaltoEscalada(direction);
}

function iniciarSaltoEscalada(direction, fromCheckpoint = false) {
    const holdVelocity = escaladaGame.pedraAtual ? (escaladaGame.pedraAtual.motionVX || 0) : 0;
    escaladaGame.launchHoldId = escaladaGame.pedraAtual ? escaladaGame.pedraAtual.id : -1;
    escaladaGame.playerState = 'AIRBORNE';
    escaladaGame.pedraAtual = null;
    escaladaGame.grabTarget = null;
    escaladaGame.airFrames = 0;
    escaladaGame.vx = direction * CLIMB_PHYSICS.launchSpeed + holdVelocity * 0.55;
    escaladaGame.vy = -CLIMB_PHYSICS.jumpForce;
    escaladaGame.jumpDir = direction;
    escaladaGame.nextJumpControl = Math.max(0.68, escaladaGame.nextJumpControl || 1);
    criarPoeira(escaladaGame.playerX, escaladaGame.playerY, '#d7ccc8', 7);
    ClimbSprites.notify(escaladaGame, 'jump', { checkpoint: fromCheckpoint });
    return true;
}

function criarPoeira(x, y, cor, qtd = 6) {
    for (let i = 0; i < qtd; i++) {
        escaladaGame.particulas.push({
            x: x + (Math.random() * 16 - 8),
            y: y + (Math.random() * 10 - 5),
            vx: (Math.random() - 0.5) * 2.5,
            vy: (Math.random() - 0.5) * 2 - 1,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            cor: cor,
            r: 2 + Math.random() * 2.5
        });
    }
}

function criarHitSpark(x, y) {
    escaladaGame.sparksImpacto.push({
        x: x,
        y: y,
        life: 14,
        maxLife: 14,
        scale: 1.0,
        frame: Math.floor(Math.random() * climbAssets.hazards.dust.length)
    });
}

function concluirAgarrada(pedra) {
    if(pedra.isFinish){ClimbSummit.begin(escaladaGame,pedra);return;}
    if(pedra.tipo==='checkpoint'){ClimbCheckpoints.begin(escaladaGame,pedra);return;}
    if (pedra.tipo === 'spike' || pedra.tipo === 'danger') {
        escaladaGame.blockedHoldId=pedra.id;escaladaGame.blockedHoldTimer=45;
        aplicarDanoJogador('Espinhos! Procure a rota de rocha ao lado.', {drop:true,knockbackX:escaladaGame.playerX<pedra.x?-2.7:2.7});
        if(escaladaGame.playerState!=='AIRBORNE'&&escaladaGame.gameState!=='GAMEOVER')soltarDaAgarra(2.4,1.6);
        return;
    }
    const estavaCaindo = escaladaGame.vy > 1.25;
    escaladaGame.playerState = (pedra.tipo === 'checkpoint'||pedra.isFinish) ? 'STANDING' : 'GRABBED';
    escaladaGame.pedraAtual = pedra;
    escaladaGame.currentStep = Math.max(escaladaGame.currentStep, pedra.levelStep);
    escaladaGame.grabTarget = null;
    escaladaGame.summitContactX = pedra.isFinish ? escaladaGame.playerX : null;
    escaladaGame.playerX = pedra.isFinish ? escaladaGame.summitContactX : pedra.x;
    escaladaGame.playerY = pedra.y;
    escaladaGame.vx = 0;
    escaladaGame.vy = 0;
    escaladaGame.airFrames = 0;
    escaladaGame.settleTimer = CLIMB_PHYSICS.settleFrames;
    escaladaGame.gripTimer = 0;
    escaladaGame.nextJumpControl = pedra.tipo === 'moss' ? 0.72 : 1;
    if (!pedra.visited) {
        escaladaGame.combo = Math.min(99, escaladaGame.combo + 1);
        escaladaGame.score += 80 + escaladaGame.combo * 12 + (estavaCaindo ? 55 : 0);
        pedra.visited = true;
    }
    criarPoeira(pedra.x, pedra.y, estavaCaindo ? '#f1c40f' : '#d7ccc8', estavaCaindo ? 10 : 6);

    if (pedra.tipo === 'brittle') pedra.quebrando = true;
    if (pedra.tipo === 'moss') {
        escaladaGame.slipTimer = 24;
        criarPoeira(pedra.x, pedra.y, '#92b85c', 8);
    }
    if (pedra.tipo === 'ice' || pedra.tipo === 'moving_ice') {
        escaladaGame.slipTimer = 20;
        escaladaGame.gripTimer = pedra.tipo === 'moving_ice' ? 58 : 76;
    }
    if (pedra.tipo === 'bonus' && !pedra.coletado) {
        escaladaGame.score += 500;
        escaladaGame.combo += 2;
        pedra.coletado = true;
    }
    ClimbSprites.notify(escaladaGame, 'grip', { hold: pedra, descending: estavaCaindo });
}

function confirmarCheckpointEscalada(pedra) {
    if(!ClimbCheckpoints.confirm(escaladaGame,pedra))return;
    escaladaGame.currentStep=Math.max(escaladaGame.currentStep,pedra.levelStep);
    if(!pedra.visited){
        escaladaGame.combo=Math.min(99,escaladaGame.combo+1);
        escaladaGame.score+=80+escaladaGame.combo*12;
        pedra.visited=true;
    }
    if(!pedra.coletado){escaladaGame.score+=500;escaladaGame.combo+=2;pedra.coletado=true;}
    if (escaladaGame.checkpointHoldId !== pedra.id) {
        escaladaGame.vida = escaladaGame.maxVida;
        escaladaGame.checkpointAltura = Math.max(0, pedra.climbY - 42);
        escaladaGame.checkpointHoldId = pedra.id;
        escaladaGame.hazardCooldown=180;escaladaGame.hazardQueue.length=0;escaladaGame.objetosCaindo.length=0;
        criarPoeira(pedra.x, pedra.y, '#f1c40f', 24);
    }
}

function procurarAutoGrab() {
    if (escaladaGame.playerState !== 'AIRBORNE' || escaladaGame.airFrames < 4) return null;
    let best = null;
    let bestScore = Infinity;
    for (const pedra of escaladaGame.pedrasGeradas) {
        if (pedra.quebrada) continue;
        if(pedra.id===escaladaGame.blockedHoldId&&escaladaGame.blockedHoldTimer>0)continue;
        if(['spike','danger'].includes(pedra.tipo)&&escaladaGame.invulTimer>0)continue;
        if(pedra.isFinish){
            if(ClimbSummit.canGrip(escaladaGame,pedra))return pedra;
            continue;
        }
        if (pedra.id === escaladaGame.launchHoldId && escaladaGame.airFrames < 15) continue;
        if(pedra.tipo==='checkpoint'){
            if(ClimbCheckpoints.canGrip(escaladaGame,pedra))return pedra;
            continue;
        }
        const dx = pedra.x - escaladaGame.playerX;
        const dy = pedra.y - escaladaGame.playerY;
        const distance = Math.hypot(dx, dy);
        const radius = pedra.grabRadius || CLIMB_PHYSICS.grabRadius;
        const dangerPenalty = pedra.tipo === 'spike' || pedra.tipo === 'danger' ? 9 : 0;
        const score = distance + dangerPenalty;
        if (distance <= radius && score < bestScore && Math.abs(dy) <= radius * 0.92) {
            best = pedra;
            bestScore = score;
        }
    }
    return best;
}

function soltarDaAgarra(vx = 0, vy = 1.6) {
    if(escaladaGame.pedraAtual){escaladaGame.blockedHoldId=escaladaGame.pedraAtual.id;escaladaGame.blockedHoldTimer=45;}
    escaladaGame.playerState = 'AIRBORNE';
    escaladaGame.pedraAtual = null;
    escaladaGame.grabTarget = null;
    escaladaGame.airFrames = 10;
    escaladaGame.vx = vx;
    escaladaGame.vy = vy;
    escaladaGame.jumpDir = Math.sign(vx);
    ClimbSprites.notify(escaladaGame, 'drop');
}

function atualizarFisicaEscalada() {
    if(escaladaGame.playerState==='STANDING'&&escaladaGame.pedraAtual?.tipo==='checkpoint'){
        ClimbCheckpoints.walk(escaladaGame,keys);return;
    }
    if (escaladaGame.playerState === 'GRABBING') {
        const alvo = escaladaGame.grabTarget;
        if (!alvo || alvo.quebrada) {
            soltarDaAgarra(escaladaGame.vx, Math.max(1.2, escaladaGame.vy));
            return;
        }
        const t = 1 / Math.max(1, escaladaGame.snapTimer);
        escaladaGame.playerX += (alvo.x - escaladaGame.playerX) * t;
        escaladaGame.playerY += (alvo.y - escaladaGame.playerY) * t;
        escaladaGame.snapTimer--;
        if (escaladaGame.snapTimer <= 0) concluirAgarrada(alvo);
        return;
    }

    if (escaladaGame.playerState === 'GRABBED' || escaladaGame.playerState === 'STANDING') {
        if (escaladaGame.pedraAtual) {
            escaladaGame.playerX = escaladaGame.pedraAtual.isFinish ? escaladaGame.summitContactX : escaladaGame.pedraAtual.x;
            escaladaGame.playerY = escaladaGame.pedraAtual.y;
        }
        if (escaladaGame.gripTimer > 0) {
            escaladaGame.gripTimer--;
            if (escaladaGame.gripTimer === 0) {
                escaladaGame.mensagemAtual = 'O gelo fez Zorp escorregar!';
                escaladaGame.mensagemTimer = 48;
                soltarDaAgarra(0, 1.9);
            }
        }
        return;
    }

    if (escaladaGame.playerState !== 'AIRBORNE') return;
    escaladaGame.airFrames++;
    const horizontalInput = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    const control = escaladaGame.nextJumpControl || 1;
    escaladaGame.vx += horizontalInput * CLIMB_PHYSICS.airAcceleration * control;
    escaladaGame.vx *= horizontalInput ? 0.992 : 0.982;
    escaladaGame.vx = Math.max(-CLIMB_PHYSICS.maxAirSpeed, Math.min(CLIMB_PHYSICS.maxAirSpeed, escaladaGame.vx));
    if (escaladaGame.ventoDuracao > 0) escaladaGame.vx += escaladaGame.ventoDirecao * escaladaGame.ventoForca * 0.006;
    escaladaGame.vy = Math.min(CLIMB_PHYSICS.terminalVelocity, escaladaGame.vy + CLIMB_PHYSICS.gravity);
    escaladaGame.playerX += escaladaGame.vx;
    escaladaGame.playerY += escaladaGame.vy;
    escaladaGame.jumpDir = Math.abs(escaladaGame.vx) > 0.2 ? Math.sign(escaladaGame.vx) : escaladaGame.jumpDir;

    const mountainFace=ClimbCourse.profile(220-escaladaGame.playerY+escaladaGame.alturaAtual,escaladaGame.alturaTotal);
    const minX = mountainFace.left+24;
    const maxX = mountainFace.right-24;
    if (escaladaGame.playerX < minX || escaladaGame.playerX > maxX) {
        escaladaGame.playerX = Math.max(minX, Math.min(maxX, escaladaGame.playerX));
        escaladaGame.vx *= -0.28;
    }

    const alvo = procurarAutoGrab();
    if (alvo) {
        if(alvo.isFinish){ClimbSummit.begin(escaladaGame,alvo);return;}
        if(alvo.tipo==='checkpoint'){ClimbCheckpoints.begin(escaladaGame,alvo);return;}
        escaladaGame.playerState = 'GRABBING';
        escaladaGame.grabTarget = alvo;
        escaladaGame.snapTimer = CLIMB_PHYSICS.snapFrames;
        ClimbSprites.notify(escaladaGame, 'reach', { hold: alvo, descending: escaladaGame.vy > 1.25 });
    }
}

function atualizarCameraEMundo() {
    if(ClimbCheckpoints.lockCamera(escaladaGame))return;
    const limiteTelaY = canvas.height * 0.69;
    const limiteQuedaY = canvas.height * 0.75;

    // A câmera revela a próxima decisão e também acompanha uma queda tempo suficiente
    // para permitir o recovery grab em agarras inferiores.
    if (escaladaGame.playerY < limiteTelaY) {
        const diferenca = limiteTelaY - escaladaGame.playerY;
        escaladaGame.playerY = limiteTelaY;
        escaladaGame.alturaAtual = Math.min(escaladaGame.alturaTotal, escaladaGame.alturaAtual + diferenca);
    } else if (escaladaGame.playerState === 'AIRBORNE' && escaladaGame.playerY > limiteQuedaY) {
        const minFallAltitude = Math.max(0, escaladaGame.checkpointAltura - CLIMB_PHYSICS.recoveryDepth);
        const diferenca = Math.min(escaladaGame.playerY - limiteQuedaY, escaladaGame.alturaAtual - minFallAltitude);
        if (diferenca > 0) {
            escaladaGame.playerY -= diferenca;
            escaladaGame.alturaAtual -= diferenca;
        }
    } else if (['GRABBED','STANDING'].includes(escaladaGame.playerState) && escaladaGame.playerY>limiteTelaY+10 && escaladaGame.alturaAtual>0) {
        const correction=Math.min(escaladaGame.alturaAtual,(escaladaGame.playerY-limiteTelaY)*.12);
        escaladaGame.playerY-=correction;escaladaGame.alturaAtual-=correction;
    }

    for (const hold of escaladaGame.pedrasGeradas) {
        hold.y = 220 - hold.climbY + escaladaGame.alturaAtual + (hold.motionY || 0);
    }

    // Reveal the exposed slope, then center the view as the route reaches the ridge.
    const maxCamX = escaladaGame.mountainWidth - canvas.width;
    const framing=.5;
    const targetCamX = Math.max(0, Math.min(maxCamX, escaladaGame.playerX - canvas.width * framing));
    escaladaGame.cameraX += (targetCamX - escaladaGame.cameraX) * 0.18;
}

function gerenciarPedras(atualizarTimers = true) {
    // Restarting the climb restarts the same predictable motion choreography.
    if(atualizarTimers)escaladaGame.motionClock+=1/60;
    const now = escaladaGame.motionClock || 0;

    for (let p of escaladaGame.pedrasGeradas) {
        const previousX = p.x;
        const phase = now * p.speed + (p.offset || 0);
        const motion = isMovingClimbHold(p) ? sampleClimbHoldMotion(p, phase) : { x: 0, y: 0 };
        p.x = p.baseX + motion.x;
        p.motionY = motion.y;
        if(atualizarTimers)p.motionVX = p.x - previousX;
        p.y = 220 - p.climbY + escaladaGame.alturaAtual + p.motionY;

        if (atualizarTimers && p.tipo === 'brittle' && p.quebrando && !p.quebrada) {
            p.tempoRestante--;
            if (Math.random() < 0.4) {
                criarPoeira(p.x, p.y, '#e74c3c', 2);
            }
            if (p.tempoRestante <= 0) {
                p.quebrada = true;
                criarPoeira(p.x, p.y, '#c0392b', 14);
                escaladaGame.shakeTimer = 8;
                
                p.respawnTimer = 190;
                if (escaladaGame.pedraAtual === p && escaladaGame.playerState !== 'AIRBORNE') {
                    escaladaGame.mensagemAtual = 'A rocha quebrou: procure uma agarra abaixo!';
                    escaladaGame.mensagemTimer = 64;
                    soltarDaAgarra(0, 1.7);
                }
            }
        } else if (atualizarTimers && p.tipo === 'brittle' && p.quebrada && p.respawnTimer > 0) {
            p.respawnTimer--;
            if (p.respawnTimer <= 0) {
                p.quebrada = false;
                p.quebrando = false;
                p.tempoRestante = p.breakMax;
            }
        }
    }
}

function respawnEscaladaNoCheckpoint() {
    const checkpoint = escaladaGame.pedrasGeradas.find(hold => hold.id === escaladaGame.checkpointHoldId)
        || escaladaGame.pedrasGeradas[0];
    escaladaGame.alturaAtual = escaladaGame.checkpointAltura;
    escaladaGame.pedrasGeradas.forEach(hold => {
        hold.y = 220 - hold.climbY + escaladaGame.alturaAtual + (hold.motionY || 0);
        if (hold.tipo === 'brittle' && hold.levelStep >= checkpoint.levelStep) {
            hold.quebrada = false;
            hold.quebrando = false;
            hold.tempoRestante = hold.breakMax;
            hold.respawnTimer = 0;
        }
    });
    escaladaGame.pedraAtual = checkpoint;
    escaladaGame.playerX = checkpoint.x;
    escaladaGame.playerY = checkpoint.y;
    escaladaGame.objetosCaindo.length = 0;
    escaladaGame.hazardQueue.length = 0;
    escaladaGame.playerState = checkpoint.tipo === 'checkpoint' ? 'STANDING' : 'GRABBED';
    escaladaGame.vx = 0;
    escaladaGame.vy = 0;
    escaladaGame.grabTarget = null;
    escaladaGame.airFrames = 0;
    escaladaGame.settleTimer = 18;
    ClimbCheckpoints.restore(escaladaGame,checkpoint);
    gerenciarPedras(false);
    ClimbSprites.reset(escaladaGame);
}

function aplicarDanoJogador(motivo, options = {}) {
    if (escaladaGame.invulTimer > 0 || escaladaGame.isGameOver) return;

    escaladaGame.vida--;
    escaladaGame.invulTimer = 78;
    escaladaGame.shakeTimer = 11;
    escaladaGame.slipTimer = 38;
    escaladaGame.combo = 0;
    escaladaGame.fallFrames = 10;
    ClimbSprites.notify(escaladaGame, 'hit');
    escaladaGame.mensagemAtual = motivo;
    escaladaGame.mensagemTimer = 70;

    if (escaladaGame.vida <= 0) {
        finalizarMinigame("DERROTA");
    } else if (options.respawn) {
        escaladaGame.respawnTimer = 34;
        escaladaGame.playerState = 'FALLING';
    } else if (options.drop !== false) {
        const knockbackX = options.knockbackX == null ? (Math.random() < 0.5 ? -2.4 : 2.4) : options.knockbackX;
        soltarDaAgarra(knockbackX, options.knockbackY == null ? -1.1 : options.knockbackY);
    }
}

function gerenciarVento() {
    if (escaladaGame.ventoDuracao > 0) {
        escaladaGame.ventoDuracao--;
        
        if (Math.random() < 0.8) {
            escaladaGame.ventoParticulas.push({
                x: escaladaGame.ventoDirecao > 0 ? -20 : escaladaGame.mountainWidth + 20,
                y: Math.random() * canvas.height,
                vx: escaladaGame.ventoDirecao * (8 + Math.random() * 5),
                vy: (Math.random() - 0.5) * 1.5,
                len: 24 + Math.random() * 30,
                alpha: 0.85
            });
        }
    } else {
        escaladaGame.ventoForca = 0;
        escaladaGame.ventoTimer--;
        if (escaladaGame.ventoTimer <= 0) {
            escaladaGame.ventoDuracao = 180 + Math.floor(Math.random() * 120);
            escaladaGame.ventoTimer = 280 + Math.floor(Math.random() * 200);
            escaladaGame.ventoDirecao = Math.random() < 0.5 ? 1 : -1;
            escaladaGame.ventoForca = 1.1 + Math.random() * 0.9;
        }
    }

    for (let i = escaladaGame.ventoParticulas.length - 1; i >= 0; i--) {
        let vp = escaladaGame.ventoParticulas[i];
        vp.x += vp.vx;
        vp.y += vp.vy;
        vp.alpha -= 0.016;
        if (vp.alpha <= 0 || vp.x < -60 || vp.x > escaladaGame.mountainWidth + 60) {
            escaladaGame.ventoParticulas.splice(i, 1);
        }
    }
}

function randomClimbSprite(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function spawnClimbHazard(spec, progresso) {
    const definitions = {
        stone: { sprite: randomClimbSprite(climbAssets.hazards.thrownStone), radius: 15, speed: 5.3 },
        boulder: { sprite: randomClimbSprite(climbAssets.hazards.boulder), radius: 23, speed: 3.15 },
        log: { sprite: randomClimbSprite(climbAssets.hazards.log), radius: 25, speed: 3.0 },
        crate: { sprite: randomClimbSprite(climbAssets.hazards.crate), radius: 22, speed: 3.05 },
        bucket: { sprite: randomClimbSprite(climbAssets.hazards.bucket), radius: 17, speed: 3.75 },
        boot: { sprite: randomClimbSprite(climbAssets.hazards.boot), radius: 16, speed: 5.0 },
        coconut: { sprite: randomClimbSprite(climbAssets.hazards.coconut), radius: 15, speed: 5.25 },
        planter: { sprite: randomClimbSprite(climbAssets.hazards.planter), radius: 19, speed: 3.55 }
    };
    const hazard = definitions[spec.type] || definitions.stone;
    const face=ClimbCourse.profile(220-escaladaGame.playerY+escaladaGame.alturaAtual,escaladaGame.alturaTotal);
    const minX = face.left+42;
    const maxX = face.right-42;
    const targetX = Math.max(minX, Math.min(maxX, escaladaGame.playerX + spec.offset));
    escaladaGame.objetosCaindo.push({
        x: targetX,
        y: escaladaGame.playerY - canvas.height * 0.88,
        speed: hazard.speed + progresso * 0.55,
        r: hazard.radius,
        type: spec.type,
        sprite: hazard.sprite,
        rotacao: 0,
        telegraph: true, warningFrames: 48
    });
}

function gerenciarObjetosCaindo() {
    if (CLIMB_QA_NO_HAZARDS) return;
    const progresso = escaladaGame.alturaAtual / escaladaGame.alturaTotal;
    const sectionInfo = getCurrentClimbSection();
    const section = CLIMB_LEVEL[sectionInfo.sectionIndex];
    if (escaladaGame.hazardCooldown > 0) escaladaGame.hazardCooldown--;

    const checkpointSafe=ClimbCheckpoints.locked(escaladaGame);
    if (!checkpointSafe && escaladaGame.hazardQueue.length === 0 && escaladaGame.hazardCooldown <= 0 && section.throws.length > 0) {
        const patternName = section.throws[escaladaGame.throwPatternIndex % section.throws.length];
        escaladaGame.throwPatternIndex++;
        let cumulativeDelay = 0;
        escaladaGame.hazardQueue = CLIMB_THROW_PATTERNS[patternName].map(spec => {
            cumulativeDelay += spec.delay;
            return { ...spec, remaining: cumulativeDelay };
        });
        escaladaGame.hazardCooldown = section.cooldown;
    }

    for (let i = escaladaGame.hazardQueue.length - 1; i >= 0; i--) {
        if(checkpointSafe)break;
        const queued = escaladaGame.hazardQueue[i];
        queued.remaining--;
        if (queued.remaining <= 0) {
            spawnClimbHazard(queued, progresso);
            escaladaGame.hazardQueue.splice(i, 1);
        }
    }

    const cameraY = 0;
    
    for (let i = escaladaGame.objetosCaindo.length - 1; i >= 0; i--) {
        let obj = escaladaGame.objetosCaindo[i];
        if(obj.warningFrames>0){obj.warningFrames--;continue;}
        obj.y += obj.speed;
        obj.rotacao += 0.12;

        let dx = obj.x - escaladaGame.playerX;
        let dy = obj.y - (escaladaGame.playerY - 14);
        let dist = Math.hypot(dx, dy);

        if (!checkpointSafe && dist < obj.r + 16) {
            criarPoeira(obj.x, obj.y, '#d6c4aa', 14);
            criarHitSpark(escaladaGame.playerX, escaladaGame.playerY - 15);
            escaladaGame.combo = 0;
            escaladaGame.slipTimer = 32;
            aplicarDanoJogador("Um objeto do mestre atingiu Zorp!", {
                drop: true,
                knockbackX: dx <= 0 ? 2.9 : -2.9,
                knockbackY: escaladaGame.playerState === 'AIRBORNE' ? -0.45 : -1.2
            });
            escaladaGame.objetosCaindo.splice(i, 1);
        } else if (obj.y > cameraY + canvas.height + 80) {
            escaladaGame.objetosCaindo.splice(i, 1);
        }
    }
}

function gerenciarParticulas() {
    for (let i = escaladaGame.particulas.length - 1; i >= 0; i--) {
        let p = escaladaGame.particulas[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
            escaladaGame.particulas.splice(i, 1);
        }
    }

    for (let i = escaladaGame.sparksImpacto.length - 1; i >= 0; i--) {
        let sp = escaladaGame.sparksImpacto[i];
        sp.life--;
        if (sp.life <= 0) {
            escaladaGame.sparksImpacto.splice(i, 1);
        }
    }
}

function checarVitoriaEscalada() {
    if(ClimbSummit.canFinish(escaladaGame)&&!escaladaGame.win)finalizarMinigame('VITORIA');
}

function resolverQuedaEscalada() {
    if (escaladaGame.playerState !== 'AIRBORNE' || escaladaGame.respawnTimer > 0) return;
    const minFallAltitude = Math.max(0, escaladaGame.checkpointAltura - CLIMB_PHYSICS.recoveryDepth);
    if (escaladaGame.alturaAtual <= minFallAltitude + 0.5 && escaladaGame.playerY > canvas.height + 72) {
        if (escaladaGame.invulTimer > 0) {
            escaladaGame.playerState = 'FALLING';
            escaladaGame.respawnTimer = 28;
        } else {
            aplicarDanoJogador('Zorp perdeu a parede e voltou ao checkpoint!', { respawn: true, drop: false });
        }
    }
}

function finalizarMinigame(resultado) {
    // A height, a standing flag or a direct finish-hold attachment is not a victory.
    if(resultado==='VITORIA'&&(!ClimbSummit.canFinish(escaladaGame)||escaladaGame.win))return false;
    escaladaGame.gameState = 'GAMEOVER';
    escaladaGame.win = (resultado === "VITORIA");
    escaladaGame.lastRunSeconds = resultado==='VITORIA' ? escaladaGame.summitClimbSeconds : (performance.now() - escaladaGame.startTime) / 1000;
    if (resultado === "VITORIA") {
        dialogText.innerHTML = "> MESTRE DA ESCALADA: Espetacular! Você dominou o Monte Zorp e conquistou a Insígnia da Escalada!";
    } else {
        dialogText.innerHTML = "> MESTRE DA ESCALADA: A montanha exige atenção! Use as rotas laterais e desvie das pedras que arremesso!";
    }
}

function updateEscaladaGame() {
    if (CLIMB_QA_MODE) {
        escaladaGame.qaFrameCount++;
        const qaNow = performance.now();
        const qaElapsed = qaNow - escaladaGame.qaLastFpsTime;
        if (qaElapsed >= 500) {
            escaladaGame.qaFps = Math.round(escaladaGame.qaFrameCount * 1000 / qaElapsed);
            escaladaGame.qaFrameCount = 0;
            escaladaGame.qaLastFpsTime = qaNow;
        }
        document.body.dataset.climbQaStep = String(escaladaGame.currentStep);
        document.body.dataset.climbQaState = escaladaGame.playerState;
        document.body.dataset.climbQaGameState = escaladaGame.gameState;
        document.body.dataset.climbQaX = escaladaGame.playerX.toFixed(1);
        document.body.dataset.climbQaElapsed = ((qaNow - escaladaGame.startTime) / 1000).toFixed(2);
        document.body.dataset.climbQaFps = String(escaladaGame.qaFps);
    }
    if (escaladaGame.gameState === 'TUTORIAL') {
        if (climbUpPressed) {
            escaladaGame.gameState = 'PLAYING';
            escaladaGame.startTime = performance.now();
            climbUpPressed = false;
        }
        return;
    }
    
    if (escaladaGame.gameState === 'GAMEOVER') {
        if (climbUpPressed) {
            currentScene = "ILHA_ESCALADA";
            document.getElementById('game-title').style.visibility = '';
            climbUpPressed = false;
            dialogBox.classList.add("show");
        }
        return;
    }

    if (ClimbSummit.active(escaladaGame)) {
        const event=ClimbSummit.update(escaladaGame,climbSummitAdvancePressed);
        climbSummitAdvancePressed=false;climbUpPressed=false;
        gerenciarPedras(false);gerenciarParticulas();
        if(event==='STOOD')criarPoeira(escaladaGame.playerX,escaladaGame.playerY,'#e2edf0',6);
        if(event==='MEDAL'&&ClimbSummit.canAward(escaladaGame)&&!escaladaGame.summitSequence.medalAwarded){
            insignias.escalada=true;
            escaladaGame.summitSequence.medalAwarded=true;
        }
        if(event==='CELEBRATE')criarPoeira(escaladaGame.playerX,escaladaGame.playerY-22,'#eddb9b',12);
        if(event==='COMPLETE')checarVitoriaEscalada();
        return;
    }

    if (escaladaGame.isGameOver) return;

    if (escaladaGame.invulTimer > 0) escaladaGame.invulTimer--;
    if (escaladaGame.shakeTimer > 0) escaladaGame.shakeTimer--;
    if (escaladaGame.slipTimer > 0) escaladaGame.slipTimer--;
    if (escaladaGame.fallFrames > 0) escaladaGame.fallFrames--;
    if (escaladaGame.settleTimer > 0) escaladaGame.settleTimer--;
    if (escaladaGame.blockedHoldTimer > 0) escaladaGame.blockedHoldTimer--;

    if (escaladaGame.respawnTimer > 0) {
        escaladaGame.respawnTimer--;
        climbUpPressed = false;
        gerenciarParticulas();
        if (escaladaGame.respawnTimer === 0) respawnEscaladaNoCheckpoint();
        return;
    }

    if(ClimbCheckpoints.active(escaladaGame)){
        climbUpPressed=false;escaladaGame.jumpBufferTimer=0;
        const event=ClimbCheckpoints.update(escaladaGame);
        gerenciarPedras();gerenciarParticulas();gerenciarObjetosCaindo();
        if(event?.type==='STOOD')confirmarCheckpointEscalada(event.hold);
        if(event?.type==='LAUNCH')iniciarSaltoEscalada(event.direction,true);
        return;
    }

    escaladaGame.climbFrameTimer++;
    if (escaladaGame.climbFrameTimer > 10) {
        escaladaGame.climbFrameTimer = 0;
        escaladaGame.climbFrameIndex = (escaladaGame.climbFrameIndex + 1) % 4;
    }

    hintText.innerText = '';

    if (climbUpPressed) escaladaGame.jumpBufferTimer = 6;
    climbUpPressed = false;

    if (escaladaGame.jumpBufferTimer > 0) {
        if (tentarPular()) escaladaGame.jumpBufferTimer = 0;
        else escaladaGame.jumpBufferTimer--;
    }
    if(ClimbCheckpoints.active(escaladaGame))return;

    gerenciarPedras();
    atualizarFisicaEscalada();
    if(ClimbSummit.active(escaladaGame)){climbUpPressed=false;climbSummitAdvancePressed=false;return;}
    if(ClimbCheckpoints.active(escaladaGame)){climbUpPressed=false;escaladaGame.jumpBufferTimer=0;return;}
    atualizarCameraEMundo();
    gerenciarPedras(false);
    if ((escaladaGame.playerState === 'GRABBED' || escaladaGame.playerState === 'STANDING') && escaladaGame.pedraAtual) {
        if(escaladaGame.pedraAtual.tipo!=='checkpoint')
            escaladaGame.playerX = escaladaGame.pedraAtual.isFinish ? escaladaGame.summitContactX : escaladaGame.pedraAtual.x;
        escaladaGame.playerY = escaladaGame.pedraAtual.y;
    }
    resolverQuedaEscalada();
    gerenciarVento();
    gerenciarObjetosCaindo();
    gerenciarParticulas();
    
    const sectionMessages = {
        wall: 'Parede: esquerda firme; direita mais rápida.',
        cliffs: 'Penhascos: espere o movimento e salte.',
        snow: 'Gelo: a pegada dura pouco. Continue!',
        ascent: 'O cume está perto. Acerte a última travessia!'
    };
    for (const range of escaladaGame.sectionRanges.slice(1)) {
        if (escaladaGame.currentStep >= range.startStep && !escaladaGame.mensagensMostradas[range.id]) {
            escaladaGame.mensagemAtual = sectionMessages[range.id];
            escaladaGame.mensagemTimer = 190;
            escaladaGame.mensagensMostradas[range.id] = true;
        }
    }
    
    if (escaladaGame.mensagemTimer > 0) {
        escaladaGame.mensagemTimer--;
    }

    checarVitoriaEscalada();
}

function drawEscaladaGame() {
    const cameraX = escaladaGame.cameraX;
    const cameraY = 0;
    
    // Efeito de Tremor de Tela
    let shakeX = 0, shakeY = 0;
    if (escaladaGame.shakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * 6;
        shakeY = (Math.random() - 0.5) * 6;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    const summitView=ClimbPresentation.view(escaladaGame);
    ctx.translate(canvas.width/2,summitView.pivotY);ctx.scale(summitView.zoom,summitView.zoom);ctx.translate(-canvas.width/2,-summitView.pivotY);

    const progresso = Math.min(1, escaladaGame.alturaAtual / escaladaGame.alturaTotal);
    ClimbPresentation.background(ctx,escaladaGame,canvas);
    // The summit face is behind the climber, including the final approach from below.
    ClimbPresentation.summit(ctx,escaladaGame,cameraX,imgMestreEscalada);
    // 2. Partículas de Poeira
    escaladaGame.particulas.forEach(p => {
        const renderX = p.x - cameraX;
        const renderY = p.y - cameraY;
        ctx.fillStyle = p.cor;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(renderX, renderY, p.r, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Rock formations and their supports share the existing hold coordinates.
    ClimbPresentation.holds(ctx,escaladaGame,canvas,sampleClimbHoldMotion);

    // 4. Desenhar Jogador (Zorp - Sprites Puros de Escalada de Costas, Sem Pedra de Gelo)
    const playerRenderX = escaladaGame.playerX - cameraX;
    const playerRenderY = escaladaGame.playerY - cameraY;
    const isBlinking = (!ClimbCheckpoints.locked(escaladaGame) && escaladaGame.invulTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0);

    if (!isBlinking) {
        ClimbSprites.draw(ctx, climbAssets.zorp, escaladaGame, keys, playerRenderX, playerRenderY);
    }

    // 5. Desenhar Projéteis Jogados pelo Mestre (Pedras jogadas, Pedregulhos e Bolas de Neve)
    escaladaGame.objetosCaindo.forEach(obj => {
        const renderX = obj.x - cameraX;
        const renderY = obj.y - cameraY;

        // Ground shadow gives a full, visible warning before the falling object reaches Zorp.
        const targetRenderY = escaladaGame.playerY - cameraY - 9;
        const pulse = 1 + Math.sin(Date.now() * 0.012) * 0.08;
        ctx.strokeStyle = "rgba(255, 222, 89, 0.92)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(renderX, targetRenderY, 20 * pulse, 7 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(22, 20, 24, 0.20)";
        ctx.beginPath(); ctx.ellipse(renderX, targetRenderY, 14, 4, 0, 0, Math.PI * 2); ctx.fill();

        if(obj.warningFrames>0){
            ctx.fillStyle='#f5ce72';ctx.font='bold 15px monospace';ctx.textAlign='center';
            ctx.fillText('▼',renderX,52);ctx.textAlign='left';return;
        }
        if (obj.sprite && obj.sprite.complete && obj.sprite.naturalWidth > 0) {
            const size = Math.max(36, obj.r * 2.65);
            ctx.save(); ctx.translate(renderX, renderY); ctx.rotate(obj.rotacao);
            ctx.drawImage(obj.sprite, -size / 2, -size / 2, size, size);
            ctx.restore();
        } else {
            ctx.fillStyle = "#6f6256";
            ctx.beginPath(); ctx.arc(renderX, renderY, obj.r, 0, Math.PI * 2); ctx.fill();
        }
    });

    // 6. Efeito de Faísca Amarela de Impacto (Hit Spark Effect)
    escaladaGame.sparksImpacto.forEach(sp => {
        const renderX = sp.x - cameraX;
        const renderY = sp.y - cameraY;
        const dust = climbAssets.hazards.dust[sp.frame];
        if (dust && dust.complete && dust.naturalWidth > 0) {
            const progress = 1 - sp.life / sp.maxLife;
            const size = 36 + progress * 30;
            ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
            ctx.drawImage(dust, renderX - size / 2, renderY - size / 2, size, size);
            ctx.globalAlpha = 1;
        } else if (climbAssets.hazards.impact.complete && climbAssets.hazards.impact.naturalWidth > 0) {
            ctx.drawImage(climbAssets.hazards.impact, renderX - 24, renderY - 24, 48, 48);
        } else {
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath(); ctx.arc(renderX, renderY, 16, 0, Math.PI * 2); ctx.fill();
        }
    });

    ClimbSummit.drawWorld(ctx,escaladaGame);
    ClimbPresentation.atmosphere(ctx,escaladaGame,canvas);
    if(!ClimbSummit.active(escaladaGame))ClimbPresentation.foreground(ctx,escaladaGame,canvas);
    ctx.restore(); // World camera transform ends here.
    if(ClimbSummit.active(escaladaGame)){
        ClimbSummit.drawOverlay(ctx,escaladaGame,canvas);
        ClimbSprites.drawOverlay(ctx,escaladaGame,canvas);
        return;
    }

    // 9. HUD Superior e Minimapa 2D
    // Perfil compacto: deixa as vistas laterais livres.
    const climbMap = { x: 8, y: 44, width: 48, height: 84 };
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(climbMap.x, climbMap.y, climbMap.width, climbMap.height);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(climbMap.x, climbMap.y, climbMap.width, climbMap.height);

    ctx.save();ctx.translate(climbMap.x,climbMap.y);
    ClimbPresentation.overview(ctx,escaladaGame,climbMap,{mini:true,routes:true});
    ctx.restore();

    // Barra Superior
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, 32);

    // Vidas (Corações)
    ctx.fillStyle = "#e74c3c";
    ctx.font = "bold 15px monospace";
    let coracoes = "";
    for (let v = 0; v < escaladaGame.maxVida; v++) {
        coracoes += (v < escaladaGame.vida) ? "♥ " : "♡ ";
    }
    ctx.fillText(`VIDAS: ${coracoes}`, 8, 21);

    // Altura Atual
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`${Math.min(100,Math.floor((220-escaladaGame.playerY+escaladaGame.alturaAtual)/escaladaGame.alturaTotal*100))}%  •  ${getCurrentClimbSection().name || getCurrentClimbSection().id}`, 140, 21);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`PONTOS ${escaladaGame.score}`, canvas.width - 10, canvas.height - 12);
    ctx.textAlign = "left";
    ctx.fillStyle='#d7e8df';ctx.font='9px monospace';
    ctx.fillText('A/D: NO AR  •  ESPAÇO/W: SALTO',70,canvas.height-12);

    if (CLIMB_QA_MODE) {
        const qaSection = getCurrentClimbSection();
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        ctx.fillRect(62, canvas.height - 32, 250, 22);
        ctx.fillStyle = "#9fffe0";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`QA ${qaSection.id.toUpperCase()}  ${Math.floor(escaladaGame.currentStep)}/${escaladaGame.levelValidation.steps}  ${escaladaGame.playerState}  ${escaladaGame.qaFps} FPS`, 68, canvas.height - 17);
    }

    if(escaladaGame.mensagemTimer>0){
        ctx.fillStyle='rgba(13,26,35,.88)';ctx.fillRect(70,canvas.height-50,canvas.width-82,22);
        ctx.fillStyle='#f6dd98';ctx.font='10px monospace';
        ctx.fillText(escaladaGame.mensagemAtual,77,canvas.height-35);
    }

    ClimbSprites.drawOverlay(ctx, escaladaGame, canvas);
    if (escaladaGame.gameState === 'TUTORIAL') {
        drawOverlayScreen('MONTE ZORP', [
            'A / D: controle a trajetória no ar.',
            'ESPAÇO / W: um salto por toque.',
            'Agarre apoios; recupere-se nos inferiores.',
            'Gelo escorrega. Rocha rachada quebra.',
            'Dois patamares salvam sua subida.'
        ], '#bde7df');
    } else if (escaladaGame.gameState === 'GAMEOVER') {
        if (escaladaGame.win) {
            // TELA DE VITÓRIA COM VictoryEscalada.png, ZORP COM A MEDALHA E MESTRE COM POLEGAR
            if (imgVictoryEscalada.complete && imgVictoryEscalada.naturalWidth > 0) {
                // Desenha a arte completa de fundo
                ctx.drawImage(imgVictoryEscalada, 0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = "rgba(10, 20, 35, 0.92)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Caixa central da mensagem de vitória limpa e elegante
            ctx.fillStyle = "rgba(15, 25, 40, 0.90)";
            ctx.fillRect(40, 195, canvas.width - 80, 85);
            ctx.strokeStyle = "#f1c40f";
            ctx.lineWidth = 3;
            ctx.strokeRect(40, 195, canvas.width - 80, 85);

            // Textos de Vitória
            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 15px monospace";
            ctx.textAlign = "center";
            ctx.fillText("★ VOCÊ VENCEU A ESCALADA! ★", canvas.width / 2, 218);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px monospace";
            ctx.fillText(`Cume conquistado em ${escaladaGame.lastRunSeconds.toFixed(1)}s!`, canvas.width / 2, 240);

            ctx.fillStyle = (Date.now() % 600 < 300) ? "#2ecc71" : "#ffffff";
            ctx.font = "bold 12px monospace";
            ctx.fillText("[W / ESPAÇO] CONTINUAR", canvas.width / 2, 265);
            ctx.textAlign = "left";
        } else {
            drawOverlayScreen("QUEDA NA MONTANHA...", [
                "A montanha é implacável!",
                "Mantenha o ritmo, desvie dos projéteis e tente novamente!"
            ], "#e74c3c");
        }
    }
}

// -------------------------------------------------------------
// MINIGAME DE BOXE
// Runtime oficial em boxing_arena.js. A implementacao antiga foi removida.
// -------------------------------------------------------------
// -------------------------------------------------------------
// MINIGAME ARCO E FLECHA
// -------------------------------------------------------------
const ARCHERY_CONFIG = Object.freeze({
    shooterArea: Object.freeze({ left: 48, right: 402, front: 216, back: 270 }),
    roundFrames: 60 * 60,
    playerSpeedX: 4.3,
    playerSpeedY: 3.2,
    arrowSpeed: 11.8,
    playerFireCooldown: window.ArcheryPlayerControl.CONFIG.cooldown,
    maxTargets: Object.freeze(window.ArcheryMatchPacing.PHASES.map(p=>p.riverCapacity)),
    patternIntervals: Object.freeze(window.ArcheryMatchPacing.PHASES.map(p=>p.interval)),
    maxCarriers: 16,
    targetField: Object.freeze({ top: 118, bottom: 204 }),
    teleportThreshold: 8
});

const ARCHERY_SPEEDS = window.ArcheryRiverTargets.SPEEDS;
const ARCHERY_TARGET_TYPES = Object.freeze({
    NORMAL_LARGE: Object.freeze({radius:18,basePoints:10,sizeTier:'LARGE',golden:false}),
    NORMAL_MEDIUM: Object.freeze({radius:14,basePoints:16,sizeTier:'MEDIUM',golden:false}),
    NORMAL_SMALL: Object.freeze({radius:10,basePoints:26,sizeTier:'SMALL',golden:false}),
    EXPLOSIVE: Object.freeze({radius:13,basePoints:24,sizeTier:'MEDIUM',golden:false,explosive:true}),
    ...window.ArcheryGoldenTargets.SPECS
});
const ARCHERY_PATH_TYPES = window.ArcheryRiverTargets.PATHS;
const ARCHERY_PATTERNS = window.ArcheryMatchPacing.PATTERNS;

function clampArco(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

const arcoGame = {
    playerScore: 0,
    mestreScore: 0,
    playerX: 135,
    playerY: 252,
    playerState: 'IDLE',
    playerShootTimer: 0,
    playerShootCooldown: 0,
    playerReactionTimer: 0,
    playerControl: window.ArcheryPlayerControl.create(),

    mestreX: 315,
    mestreY: 252,
    mestreState: 'IDLE',
    mestreShootTimer: 0,
    mestreShootCooldown: 0,
    mestreReactionTimer: 0,
    mestreAimTargetId: null,
    mestreDecisionTimer: 0,
    masterAI: window.ArcheryMasterAI.create(),

    arrows: [],
    targets: [],
    effects: [],
    pendingTargetSpawns: [],
    targetPool: [],
    arrowPool: [],
    effectPool: [],
    spawnTimer: 0,
    lastPatternId: null,
    nextTargetId: 1,
    lastTargetSpawnFrame: -1000,
    lastEntryFrames: {TOP:-1000,LEFT:-1000,RIGHT:-1000},
    nextBirdFrame: window.ArcheryBirdTargets.FIRST_FRAME,
    birdFlightIndex: 0,
    goldenSchedule: [],
    lastGoldenSpawnFrame: -10000,
    roundFrame: 0,
    roundFrames: ARCHERY_CONFIG.roundFrames,
    lastUpdateTime: null,
    simulationAccumulator: 0,
    phase: 0,
    pacing: window.ArcheryMatchPacing.create(),
    gameState: 'TUTORIAL',
    win: false,
    tie: false,
    stats: null
};

function resetArco() {
    arcoGame.lastUpdateTime=null;arcoGame.simulationAccumulator=0;
    window.archeryCharactersV2.reset();
    arcoGame.playerScore = 0;
    arcoGame.mestreScore = 0;
    arcoGame.playerX = 135;
    arcoGame.mestreX = 315;
    arcoGame.playerY = 252;
    arcoGame.mestreY = 252;
    arcoGame.playerState = 'IDLE';
    arcoGame.mestreState = 'IDLE';
    arcoGame.playerShootTimer = 0;
    arcoGame.mestreShootTimer = 0;
    arcoGame.playerShootCooldown = 0;
    arcoGame.mestreShootCooldown = 0;
    arcoGame.playerReactionTimer = 0;
    arcoGame.playerControl = window.ArcheryPlayerControl.create();
    arcoGame.mestreReactionTimer = 0;
    arcoGame.mestreAimTargetId = null;
    arcoGame.mestreDecisionTimer = 0;
    arcoGame.masterAI = window.ArcheryMasterAI.create();
    while (arcoGame.arrows.length) arcoGame.arrowPool.push(arcoGame.arrows.pop());
    while (arcoGame.targets.length) arcoGame.targetPool.push(arcoGame.targets.pop());
    while (arcoGame.effects.length) arcoGame.effectPool.push(arcoGame.effects.pop());
    arcoGame.pendingTargetSpawns.length = 0;
    arcoGame.spawnTimer = 0;
    arcoGame.lastPatternId = null;
    arcoGame.nextTargetId = 1;
    arcoGame.lastTargetSpawnFrame = -1000;
    arcoGame.lastEntryFrames = {TOP:-1000,LEFT:-1000,RIGHT:-1000};
    arcoGame.nextBirdFrame = window.ArcheryBirdTargets.FIRST_FRAME;
    arcoGame.birdFlightIndex = 0;
    arcoGame.goldenSchedule = [];
    arcoGame.lastGoldenSpawnFrame = -10000;
    arcoGame.roundFrame = 0;
    arcoGame.roundFrames = ARCHERY_CONFIG.roundFrames;
    arcoGame.phase = 0;
    arcoGame.pacing = window.ArcheryMatchPacing.create();
    arcoGame.gameState = 'TUTORIAL';
    arcoGame.win = false;
    arcoGame.tie = false;
    arcoGame.stats = {
        playerShots: 0,
        mestreShots: 0,
        playerHits: 0,
        mestreHits: 0,
        playerBullseyes: 0,
        mestreBullseyes: 0,
        playerMisses: 0,
        mestreMisses: 0,
        maxTargets: 0,
        spawnedTypes: {},
        pathTypes: {},
        speedTiers: {},
        patternCounts: {},
        normalTargetsSpawned: 0,
        goldenTargetsSpawned: 0,
        goldenHits: {PLAYER:0,MESTRE:0},
        goldenBullseyes: {PLAYER:0,MESTRE:0},
        goldenVariantCounts: {},
        goldenAppearances: [],
        birdTargetsSpawned: 0,
        birdHits: {PLAYER:0,MESTRE:0},
        birdExits: 0,
        maxBirds: 0,
        explosivesSpawned: 0,
        detonations: 0,
        explosionHits: 0,
        maxChain: 0,
        maxExplosionCombo: 0,
        comboBonuses: {PLAYER:0,MESTRE:0},
        explosionEvents: [],
        targetExits: 0,
        spentTargetExits: 0,
        lifecycleEvents: [],
        teleportEvents: 0,
        maxTargetStep: 0,
        lastImpacts: [],
        boundaryClampEvents: 0,
        boundsViolations: 0,
        playerRange: { minX: arcoGame.playerX, maxX: arcoGame.playerX, minY: arcoGame.playerY, maxY: arcoGame.playerY },
        mestreRange: { minX: arcoGame.mestreX, maxX: arcoGame.mestreX, minY: arcoGame.mestreY, maxY: arcoGame.mestreY },
        fps: { samples: 0, average: 0, minimum: 999, lastTime: 0 }
    };
    archeryShootPressed = false;
}

function getArcoPhase() {
    return window.ArcheryMatchPacing.phaseAt(arcoGame.roundFrame,arcoGame.roundFrames);
}

function recordArcoTargetEvent(type, target) {
    const events=arcoGame.stats.lifecycleEvents;
    events.push({type,id:target.id,frame:arcoGame.roundFrame,x:+target.x.toFixed(2),y:+target.y.toFixed(2),state:target.state});
    if(events.length>160)events.shift();
}

function acquireArcoObject(pool, fields) {
    return Object.assign(pool.pop() || {}, fields);
}

function evaluateArcoTargetPath(target, progress) {
    if(target.carrier==='BIRD')return window.ArcheryBirdTargets.position(target,progress);
    return window.ArcheryRiverTargets.position(target, progress);
}

function spawnArcoBirdTarget(golden=false) {
    if(arcoGame.targets.some(target=>target.carrier==='BIRD')||arcoGame.targets.length>=ARCHERY_CONFIG.maxCarriers)return null;
    const target=acquireArcoObject(arcoGame.targetPool,{
        ...window.ArcheryBirdTargets.create(arcoGame.birdFlightIndex,golden),id:arcoGame.nextTargetId++,type:golden?'GOLD_SKY':'BIRD_TARGET'
    });
    arcoGame.birdFlightIndex++;
    if(!golden)arcoGame.nextBirdFrame=window.ArcheryMatchPacing.nextBirdAfter(arcoGame.roundFrame);
    arcoGame.targets.push(target);
    arcoGame.stats.birdTargetsSpawned++;
    if(golden)arcoGame.stats.goldenTargetsSpawned++;
    arcoGame.stats.maxBirds=Math.max(arcoGame.stats.maxBirds,arcoGame.targets.filter(t=>t.carrier==='BIRD').length);
    arcoGame.stats.maxTargets=Math.max(arcoGame.stats.maxTargets,arcoGame.targets.length);
    arcoGame.stats.spawnedTypes[target.type]=(arcoGame.stats.spawnedTypes[target.type]||0)+1;
    window.ArcheryMatchPacing.recordSpawn(arcoGame.pacing,target,arcoGame.phase);
    recordArcoTargetEvent('SPAWN_OUTSIDE',target);
    return target;
}

function spawnArcoTarget(descriptor) {
    const kind=descriptor.kind || 'NORMAL_MEDIUM';
    const spec=ARCHERY_TARGET_TYPES[kind] || ARCHERY_TARGET_TYPES.NORMAL_MEDIUM;
    const target=acquireArcoObject(arcoGame.targetPool,{
        ...window.ArcheryRiverTargets.create(spec,descriptor),id:arcoGame.nextTargetId++,type:kind
    });
    arcoGame.targets.push(target);
    arcoGame.lastTargetSpawnFrame=arcoGame.roundFrame;
    arcoGame.lastEntryFrames[target.entry]=arcoGame.roundFrame;
    arcoGame.stats.maxTargets=Math.max(arcoGame.stats.maxTargets,arcoGame.targets.length);
    for(const [bucket,key]of [['spawnedTypes',kind],['pathTypes',target.pathType],['speedTiers',target.speedTier]]){
        arcoGame.stats[bucket][key]=(arcoGame.stats[bucket][key]||0)+1;
    }
    if(spec.explosive)arcoGame.stats.explosivesSpawned++;
    else if(spec.golden)arcoGame.stats.goldenTargetsSpawned++;else arcoGame.stats.normalTargetsSpawned++;
    window.ArcheryMatchPacing.recordSpawn(arcoGame.pacing,target,arcoGame.phase);
    recordArcoTargetEvent('SPAWN_OUTSIDE',target);
    return target;
}

function spawnArcoGoldenEvent(event) {
    if(arcoGame.targets.length>=ARCHERY_CONFIG.maxCarriers)return null;
    let target;
    if(event.variant==='SKY'){
        if(arcoGame.birdFlightIndex>=window.ArcheryBirdTargets.MAX_PER_ROUND)return null;
        target=spawnArcoBirdTarget(true);
    }else{
        const arc=event.variant==='ARC';
        target=spawnArcoTarget({kind:arc?'GOLD_ARC':'GOLD_FAST',path:arc?'ARC':'STRAIGHT',speed:'FAST',
            entry:arc?event.entry:'TOP',exit:event.entry,goldenVariant:event.variant});
    }
    if(target){
        arcoGame.lastGoldenSpawnFrame=arcoGame.roundFrame;
        const variants=arcoGame.stats.goldenVariantCounts;
        variants[event.variant]=(variants[event.variant]||0)+1;
        arcoGame.stats.goldenAppearances.push({id:target.id,frame:arcoGame.roundFrame,variant:event.variant});
    }
    return target;
}

function updateArcoGoldenSpawns() {
    const gold=window.ArcheryGoldenTargets,event=arcoGame.goldenSchedule[0];
    if(!event||arcoGame.roundFrame<event.frame||arcoGame.stats.goldenTargetsSpawned>=gold.MAX_PER_ROUND
        ||arcoGame.roundFrame-arcoGame.lastGoldenSpawnFrame<gold.MIN_INTERVAL
        ||arcoGame.targets.some(target=>target.isGolden)||arcoGame.targets.length>=ARCHERY_CONFIG.maxCarriers)return;
    // If a regular carrier occupies the sky, wait briefly, then use the rapids.
    // No bird is removed or overlapped to make room for the special opportunity.
    if(event.variant==='SKY'&&(arcoGame.targets.some(target=>target.carrier==='BIRD')
        ||arcoGame.birdFlightIndex>=window.ArcheryBirdTargets.MAX_PER_ROUND)){
        if(arcoGame.roundFrame-event.frame<120)return;
        event.variant='RAPIDS';
    }
    if(spawnArcoGoldenEvent(event))arcoGame.goldenSchedule.shift();
}

function chooseArcoPattern() {
    return window.ArcheryMatchPacing.choose(arcoGame.phase,arcoGame.pacing.waveCounts[arcoGame.phase]);
}

function queueArcoPattern(pattern) {
    arcoGame.lastPatternId = pattern.id;
    arcoGame.pacing.waveCounts[arcoGame.phase]++;
    arcoGame.pacing.waves.push({id:pattern.id,phase:arcoGame.phase,frame:arcoGame.roundFrame});
    arcoGame.stats.patternCounts[pattern.id] = (arcoGame.stats.patternCounts[pattern.id] || 0) + 1;
    for (const descriptor of pattern.targets) {
        arcoGame.pendingTargetSpawns.push({ delay: descriptor.delay || 0, descriptor: { ...descriptor } });
    }
}

function queueArcoQaShowcase(descriptors) {
    arcoGame.lastPatternId = 'QA_SHOWCASE';
    descriptors.forEach((descriptor, index) => {
        arcoGame.pendingTargetSpawns.push({ delay: index * 74, descriptor });
    });
}

function beginArcoRound() {
    arcoGame.lastUpdateTime=performance.now();arcoGame.simulationAccumulator=0;
    window.archeryCharactersV2.reset();
    arcoGame.playerControl = window.ArcheryPlayerControl.create();
    arcoGame.masterAI = window.ArcheryMasterAI.create();
    arcoGame.gameState = 'PLAYING';
    arcoGame.roundFrame = 0;
    arcoGame.phase = 0;
    arcoGame.pacing = window.ArcheryMatchPacing.create();
    arcoGame.spawnTimer = 0;
    arcoGame.targets.length = 0;
    arcoGame.pendingTargetSpawns.length = 0;
    arcoGame.nextBirdFrame = window.ArcheryBirdTargets.FIRST_FRAME;
    arcoGame.birdFlightIndex = 0;
    arcoGame.goldenSchedule = window.ArcheryGoldenTargets.plan();
    arcoGame.lastGoldenSpawnFrame = -10000;
    if (archeryQaParams.get('archeryQaBullseye') === '1') {
        spawnArcoTarget({ kind: 'NORMAL_LARGE', path: 'STRAIGHT', speed: 'SLOW', entry: 'LEFT', lane: 'MID', qaStatic: true, x: 225, y: 145 });
        arcoGame.playerX = 225;
    } else if (archeryQaParams.get('archeryQaAllPaths') === '1') {
        queueArcoQaShowcase(ARCHERY_PATH_TYPES.map((path, index) => ({
            kind: index % 3 === 0 ? 'NORMAL_LARGE' : (index % 3 === 1 ? 'NORMAL_MEDIUM' : 'NORMAL_SMALL'),
            path,
            speed: index < 3 ? 'SLOW' : (index < 6 ? 'MEDIUM' : 'FAST'),
            entry: index % 2 ? 'RIGHT' : 'LEFT',
            lane: index % 3 === 0 ? 'HIGH' : (index % 3 === 1 ? 'MID' : 'LOW'),
            exitLane: index % 2 ? 'LOW' : 'HIGH',
            amplitude: 38,
            exactSpeed: true
        })));
    } else if (archeryQaParams.get('archeryQaAllGold') === '1') {
        queueArcoQaShowcase([
            { kind: 'GOLD_SMALL', path: 'STRAIGHT', speed: 'FAST', entry: 'LEFT', lane: 'HIGH' },
            { kind: 'GOLD_FAST', path: 'DIAGONAL', speed: 'FAST', entry: 'RIGHT', lane: 'LOW', exitLane: 'HIGH' },
            { kind: 'GOLD_WAVE', path: 'WAVE', speed: 'FAST', entry: 'LEFT', lane: 'MID', amplitude: 39 },
            { kind: 'GOLD_S_CURVE', path: 'S_CURVE', speed: 'FAST', entry: 'RIGHT', lane: 'MID', amplitude: 46 },
            { kind: 'GOLD_ELLIPSE', path: 'ELLIPSE', speed: 'FAST', entry: 'LEFT', lane: 'MID' },
            { kind: 'GOLD_ARC', path: 'ARC', speed: 'FAST', entry: 'RIGHT', lane: 'LOW', amplitude: 68 },
            { kind: 'GOLD_CURVE', path: 'CURVE', speed: 'FAST', entry: 'LEFT', lane: 'MID' }
        ]);
    } else {
        queueArcoPattern(ARCHERY_PATTERNS.find(pattern=>pattern.id==='OPENING_CURRENT'));
    }
    keys.space = false;
    archeryShootPressed = false;
}

function consumeArcoShootEdges() {
    archeryShootPressed = false;
}

function applyArcoQaAutomation() {
    if (arcoGame.gameState !== 'PLAYING') return;
    if (archeryQaParams.get('archeryQaBounds') === '1') {
        const segment = Math.floor((arcoGame.roundFrame % 480) / 120);
        keys.a = segment === 0 || segment === 3;
        keys.d = segment === 1 || segment === 2;
        keys.w = segment === 0 || segment === 1;
        keys.s = segment === 2 || segment === 3;
        return;
    }
    if (archeryQaParams.get('archeryQaHoldSpace') === '1') {
        keys.a = keys.d = keys.w = keys.s = false;
        keys.space = true;
        if (arcoGame.stats.playerShots === 0 && arcoGame.playerShootCooldown <= 0) archeryShootPressed = true;
        return;
    }
    if (archeryQaParams.get('archeryQaAuto') !== '1') return;
    const target = arcoGame.targets
        .filter((candidate) => candidate.active && candidate.visible)
        .sort((a, b) => Math.abs(a.x - arcoGame.playerX) - Math.abs(b.x - arcoGame.playerX))[0];
    if (target) {
        keys.a = target.x < arcoGame.playerX - 4;
        keys.d = target.x > arcoGame.playerX + 4;
        if (archeryQaParams.get('archeryQaPrecision') === '1' && Math.abs(target.x - arcoGame.playerX) <= 4.5) {
            arcoGame.playerX = target.x;
            keys.a = false;
            keys.d = false;
        }
    } else {
        keys.a = false;
        keys.d = false;
    }
    const desiredY = ARCHERY_CONFIG.shooterArea.front + 18 + (Math.sin(arcoGame.roundFrame / 72) + 1) * 15;
    keys.w = arcoGame.playerY > desiredY + 2;
    keys.s = arcoGame.playerY < desiredY - 2;
    const precisionAligned = target && Math.abs(target.x - arcoGame.playerX) <= (archeryQaParams.get('archeryQaPrecision') === '1' ? 4.5 : 9);
    if (arcoGame.playerShootCooldown <= 0 && precisionAligned) {
        archeryShootPressed = true;
    }
}

function updateArcoRange(range, x, y) {
    range.minX = Math.min(range.minX, x);
    range.maxX = Math.max(range.maxX, x);
    range.minY = Math.min(range.minY, y);
    range.maxY = Math.max(range.maxY, y);
}

function getArcoArrowOrigin(owner) {
    return {x:owner==='PLAYER'?arcoGame.playerX:arcoGame.mestreX,
        y:(owner==='PLAYER'?arcoGame.playerY:arcoGame.mestreY)-73};
}

function fireArcoArrow(owner, shot = null) {
    window.archeryCharactersV2.shoot(owner);
    window.ArcheryRiverTargets.releaseSound(owner);
    const isPlayer = owner === 'PLAYER';
    const {x,y} = getArcoArrowOrigin(owner);
    const speed = isPlayer ? ARCHERY_CONFIG.arrowSpeed : ARCHERY_CONFIG.arrowSpeed + 0.35;
    let speedX = 0;
    let speedY = -speed;
    if(isPlayer){
        const direction=shot&&shot.direction?shot.direction:window.ArcheryPlayerControl.aim(arcoGame.playerX,arcoGame.playerY,ARCHERY_CONFIG.shooterArea);
        speedX=speed*direction.x;speedY=speed*direction.y;
    }
    if (!isPlayer && shot && shot.lockedAim) {
        // This is the previously committed aim point, not a live target lookup.
        const travelFrames = Math.max(1, (y - shot.y) / speed);
        speedX = clampArco((shot.x - x) / travelFrames, -2.7, 2.7);
    }
    arcoGame.arrows.push(acquireArcoObject(arcoGame.arrowPool, {
        x,
        y,
        previousX: x,
        previousY: y,
        prevX: x,
        prevY: y,
        state: 'ACTIVE',
        speedX,
        speedY,
        owner
    }));
    if (isPlayer) arcoGame.stats.playerShots++;
    else arcoGame.stats.mestreShots++;
    arcoGame.pacing.phases[arcoGame.phase][isPlayer?'playerShots':'masterShots']++;
}

function updateArcoPlayer() {
    const area = ARCHERY_CONFIG.shooterArea;
    let moveX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let moveY = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    if (moveX && moveY) {
        moveX *= 0.7071;
        moveY *= 0.7071;
    }
    const rawX = arcoGame.playerX + moveX * ARCHERY_CONFIG.playerSpeedX;
    const rawY = arcoGame.playerY + moveY * ARCHERY_CONFIG.playerSpeedY;
    if (rawX < area.left || rawX > area.right || rawY < area.front || rawY > area.back) {
        arcoGame.stats.boundaryClampEvents++;
    }
    arcoGame.playerX = clampArco(rawX, area.left, area.right);
    arcoGame.playerY = clampArco(rawY, area.front, area.back);
    if (arcoGame.playerX < area.left || arcoGame.playerX > area.right || arcoGame.playerY < area.front || arcoGame.playerY > area.back) {
        arcoGame.stats.boundsViolations++;
    }
    updateArcoRange(arcoGame.stats.playerRange, arcoGame.playerX, arcoGame.playerY);

    if (arcoGame.playerReactionTimer > 0) arcoGame.playerReactionTimer--;
    const previousState=arcoGame.playerControl.state;
    const result=window.ArcheryPlayerControl.step(arcoGame.playerControl,{
        frame:arcoGame.roundFrame,x:arcoGame.playerX,y:arcoGame.playerY,
        area,pressed:archeryShootPressed
    });
    archeryShootPressed=false;
    if(result.state==='DRAW_BOWSTRING'&&previousState!==result.state)window.ArcheryRiverTargets.bowSound('PLAYER');
    arcoGame.playerShootCooldown=result.cooldown;
    if(result.accepted)arcoGame.playerReactionTimer=0;
    if(result.fire){fireArcoArrow('PLAYER',result.fire);arcoGame.playerShootTimer=window.ArcheryPlayerControl.CONFIG.release;}
    else if(arcoGame.playerShootTimer>0)arcoGame.playerShootTimer--;

    if(result.state!=='IDLE')arcoGame.playerState=result.state;
    else if (arcoGame.playerReactionTimer > 0) {
        arcoGame.playerState = 'MISS';
    } else {
        arcoGame.playerState = moveX || moveY ? 'MOVE' : 'IDLE';
    }
}

function updateArcoMaster() {
    const area = ARCHERY_CONFIG.shooterArea;
    if (archeryQaParams.get('archeryQaBullseye') === '1') {
        arcoGame.mestreState = 'IDLE';
        updateArcoRange(arcoGame.stats.mestreRange, arcoGame.mestreX, arcoGame.mestreY);
        return;
    }
    if (arcoGame.mestreShootTimer > 0) arcoGame.mestreShootTimer--;
    if (arcoGame.mestreReactionTimer > 0) arcoGame.mestreReactionTimer--;
    const previousState=arcoGame.masterAI.state;
    const result=window.ArcheryMasterAI.step(arcoGame.masterAI,{
        frame:arcoGame.roundFrame,totalFrames:arcoGame.roundFrames,phase:arcoGame.phase,x:arcoGame.mestreX,y:arcoGame.mestreY,
        area,targets:arcoGame.targets,arrowSpeed:ARCHERY_CONFIG.arrowSpeed+.35,
        opponent:{x:arcoGame.playerX,y:arcoGame.playerY,
            arrowVisible:arcoGame.arrows.some(arrow=>arrow.owner==='PLAYER'&&arrow.y>=0&&arrow.y<=300)},
        explosionRadius:window.ArcheryExplosiveTargets.RADIUS
    });
    arcoGame.mestreX=result.x;arcoGame.mestreY=result.y;
    arcoGame.mestreAimTargetId=result.targetId;
    arcoGame.mestreShootCooldown=result.cooldown;
    arcoGame.mestreDecisionTimer=result.state==='DECIDING'?Math.max(0,arcoGame.masterAI.timing.decisionTime-arcoGame.masterAI.age):0;
    if(result.state==='DRAW_BOWSTRING'&&previousState!==result.state)window.ArcheryRiverTargets.bowSound('MESTRE');
    if(result.fire){fireArcoArrow('MESTRE',result.fire);arcoGame.mestreShootTimer=window.ArcheryMasterAI.CONFIG.release;}
    updateArcoRange(arcoGame.stats.mestreRange, arcoGame.mestreX, arcoGame.mestreY);

    if (arcoGame.mestreReactionTimer > 0 && ['OBSERVE','RECOVERY'].includes(result.state)) {
        arcoGame.mestreState = 'MISS';
    } else {
        arcoGame.mestreState = ['OBSERVE','DECIDING'].includes(result.state)?'IDLE':result.state;
    }
}

function updateArcoTargets(deltaSeconds=1/60) {
    for(let index=arcoGame.targets.length-1;index>=0;index--){
        const target=arcoGame.targets[index],wasVisible=target.visible;
        const retired=(target.carrier==='BIRD'?window.ArcheryBirdTargets:window.ArcheryRiverTargets).step(target,deltaSeconds);
        target.retireAfterCollision=retired;
        const step=Math.hypot(target.speedX,target.speedY);
        arcoGame.stats.maxTargetStep=Math.max(arcoGame.stats.maxTargetStep,step);
        if(step>ARCHERY_CONFIG.teleportThreshold)arcoGame.stats.teleportEvents++;
        if(!wasVisible&&target.visible){
            recordArcoTargetEvent('ENTERED',target);
            if(target.isGolden)arcoGame.effects.push(acquireArcoObject(arcoGame.effectPool,{
                effectKind:'GOLD_NOTICE',timer:72,duration:72
            }));
        }
    }
}

function retireArcoTargets() {
    // A fast carrier may cross an arrow before leaving this step. Test it first.
    for(let index=arcoGame.targets.length-1;index>=0;index--){
        const target=arcoGame.targets[index];
        if(target.retireAfterCollision){
            if(target.isGolden&&!target.hit)window.archeryCharactersV2.goldenLost('MESTRE');
            arcoGame.stats.targetExits++;if(target.hit)arcoGame.stats.spentTargetExits++;
            if(target.carrier==='BIRD')arcoGame.stats.birdExits++;
            recordArcoTargetEvent('EXITED_OUTSIDE',target);
            arcoGame.targetPool.push(arcoGame.targets.splice(index,1)[0]);
        }
    }
}

function updateArcoTargetSpawns() {
    const showcase=archeryQaParams.get('archeryQaBullseye')==='1'
        ||archeryQaParams.get('archeryQaAllPaths')==='1'||archeryQaParams.get('archeryQaAllGold')==='1';
    if(arcoGame.pacing.phase!==arcoGame.phase){
        arcoGame.pacing.phase=arcoGame.phase;
        arcoGame.pacing.phaseEntries.push({phase:arcoGame.phase,frame:arcoGame.roundFrame});
        if(!showcase){
            // Existing carriers keep flowing. Only unlaunched entries from the
            // previous phase are retired so they cannot stall the new section.
            arcoGame.pendingTargetSpawns.length=0;
            arcoGame.spawnTimer=ARCHERY_CONFIG.patternIntervals[arcoGame.phase];
        }
    }
    if(!showcase)updateArcoGoldenSpawns();
    if(!showcase&&arcoGame.roundFrame>=arcoGame.nextBirdFrame
        &&arcoGame.birdFlightIndex<window.ArcheryBirdTargets.MAX_PER_ROUND
        &&arcoGame.targets.filter(target=>!target.hit).length<window.ArcheryMatchPacing.PHASES[arcoGame.phase].capacity){
        spawnArcoBirdTarget();
    }
    for (let index = 0; index < arcoGame.pendingTargetSpawns.length; index++) {
        const pending = arcoGame.pendingTargetSpawns[index];
        pending.delay--;
        const entry=pending.descriptor.entry||'TOP';
        const spaced=arcoGame.roundFrame-arcoGame.lastTargetSpawnFrame>=24
            &&arcoGame.roundFrame-arcoGame.lastEntryFrames[entry]>=66;
        const capacity=pending.descriptor.capacity||ARCHERY_CONFIG.maxTargets[arcoGame.phase];
        if (pending.delay <= 0 && spaced && arcoGame.targets.filter(target=>!target.hit).length < capacity && arcoGame.targets.length < ARCHERY_CONFIG.maxCarriers) {
            spawnArcoTarget(pending.descriptor);
            arcoGame.pendingTargetSpawns.splice(index--, 1);
        }
    }

    if(showcase)return;

    arcoGame.spawnTimer++;
    if (arcoGame.spawnTimer >= ARCHERY_CONFIG.patternIntervals[arcoGame.phase] && arcoGame.pendingTargetSpawns.length === 0) {
        queueArcoPattern(chooseArcoPattern());
        arcoGame.spawnTimer = 0;
    }
}

function awardArcoTargetHit(arrow, target, impactDistance, impact, silent=false) {
    if(!target.active||target.hit)return false;
    (target.carrier==='BIRD'?window.ArcheryBirdTargets:window.ArcheryRiverTargets).markHit(target,arrow.owner,impact);
    if(target.carrier==='BIRD')arcoGame.stats.birdHits[arrow.owner]++;
    recordArcoTargetEvent('HIT_ONCE',target);
    window.archeryCharactersV2.hit(arrow.owner);
    const normalized = impactDistance / Math.max(1, target.radius);
    const bullseye = normalized <= 0.35;
    let points = target.basePoints + window.ArcheryGoldenTargets.precisionBonus(target,normalized);
    if(target.isGolden){
        if(arrow.owner==='PLAYER')window.archeryCharactersV2.goldenLost('MESTRE');
        arcoGame.stats.goldenHits[arrow.owner]++;
        if(bullseye)arcoGame.stats.goldenBullseyes[arrow.owner]++;
    }
    arcoGame.stats.lastImpacts.push({
        owner: arrow.owner,
        distance: +impactDistance.toFixed(2),
        radius: target.radius,
        normalized: +normalized.toFixed(3),
        arrowX: +arrow.x.toFixed(1),
        targetX: +target.x.toFixed(1),
        targetType: target.type
    });
    if (arcoGame.stats.lastImpacts.length > 8) arcoGame.stats.lastImpacts.shift();

    if (arrow.owner === 'PLAYER') {
        arcoGame.playerScore += points;
        arcoGame.stats.playerHits++;
        if (bullseye) arcoGame.stats.playerBullseyes++;
    } else {
        arcoGame.mestreScore += points;
        arcoGame.stats.mestreHits++;
        if (bullseye) arcoGame.stats.mestreBullseyes++;
    }

    if(!silent)window.ArcheryRiverTargets.sound(target.isGolden||bullseye);
    const subtype = target.isGolden ? 'bullseye' : (bullseye ? 'bullseye' : 'arrow_impact');
    const state = target.isGolden || bullseye ? 'BULLSEYE' : 'IMPACT';
    arcoGame.effects.push(acquireArcoObject(arcoGame.effectPool, {
        effectKind: 'HIT',
        x: target.x + target.hitOffsetX,
        y: target.y + target.hitOffsetY,
        subtype,
        state,
        timer: target.isGolden ? 46 : 34,
        duration: target.isGolden ? 46 : 34,
        bullseye,
        label: (arrow.owner==='MESTRE'?'MESTRE ':'')+(target.isGolden ? (bullseye?'MOSCA DOURADA! +':'OURO +') : (target.carrier==='BIRD' ? 'AEREO +' : (bullseye ? 'BULLSEYE! +' : '+'))) + points,
        color: target.isGolden || bullseye ? '#ffe066' : (arrow.owner==='MESTRE'?'#ffb69e':'#ffffff')
    }));
    return true;
}

function awardArcoHit(arrow, target, impactDistance, impact) {
    const explosive=window.ArcheryExplosiveTargets;
    if(!explosive.valid(target))return false;
    if(!target.isExplosive)return awardArcoTargetHit(arrow,target,impactDistance,impact);
    const result=explosive.resolve(target,arcoGame.targets);
    if(!result.hits.length)return false;
    for(const {target:victim,source}of result.hits){
        if(!source){awardArcoTargetHit(arrow,victim,impactDistance,impact,true);continue;}
        // Blast collateral earns the target's base value, never a fabricated bullseye.
        const dx=source.x-victim.x,dy=source.y-victim.y,d=Math.hypot(dx,dy)||1;
        const offsetX=dx/d*victim.radius,offsetY=dy/d*victim.radius;
        awardArcoTargetHit({owner:arrow.owner,x:victim.x+offsetX,y:victim.y+offsetY},victim,victim.radius,{offsetX,offsetY},true);
    }
    arcoGame.stats.detonations+=result.blasts.length;
    arcoGame.stats.explosionHits+=result.hits.length-1;
    arcoGame.stats.maxChain=Math.max(arcoGame.stats.maxChain,result.blasts.length);
    arcoGame.stats.maxExplosionCombo=Math.max(arcoGame.stats.maxExplosionCombo,result.hits.length);
    const event={frame:arcoGame.roundFrame,owner:arrow.owner,targets:result.hits.map(hit=>hit.target.id),
        detonations:result.blasts.length,bonus:result.bonus};
    arcoGame.stats.explosionEvents.push(event);if(arcoGame.stats.explosionEvents.length>32)arcoGame.stats.explosionEvents.shift();
    for(const blast of result.blasts){
        const delay=blast.depth*3,duration=explosive.DURATION+delay;
        arcoGame.effects.push(acquireArcoObject(arcoGame.effectPool,{...blast,effectKind:'EXPLOSION',timer:duration,duration,delay}));
        window.ArcheryRiverTargets.explosionSound(blast.depth);
    }
    if(result.bonus){
        window.ArcheryRiverTargets.comboSound(result.hits.length);
        if(arrow.owner==='PLAYER')arcoGame.playerScore+=result.bonus;else arcoGame.mestreScore+=result.bonus;
        arcoGame.stats.comboBonuses[arrow.owner]+=result.bonus;
        arcoGame.effects.push(acquireArcoObject(arcoGame.effectPool,{
            effectKind:'COMBO',count:result.hits.length,bonus:result.bonus,owner:arrow.owner,
            x:clampArco(target.x,85,365),y:Math.max(88,target.y-22),timer:52,duration:52,
            bullseye:true,label:(result.hits.length>=6?'SUPER COMBO x':'COMBO x')+result.hits.length+' +'+result.bonus,color:'#ffe69d'
        }));
    }
    return true;
}

function updateArcoArrows(deltaSeconds=1/60) {
    const collisionSystem=window.ArcheryCollision,frames=deltaSeconds*60;
    collisionSystem.advanceDebug(deltaSeconds);
    for(let arrowIndex=arcoGame.arrows.length-1;arrowIndex>=0;arrowIndex--){
        const arrow=arcoGame.arrows[arrowIndex];
        if(arrow.state&&arrow.state!=='ACTIVE'){
            arrow.state='REMOVED';arcoGame.arrowPool.push(arcoGame.arrows.splice(arrowIndex,1)[0]);continue;
        }
        arrow.state='ACTIVE';
        arrow.prevX=arrow.previousX=arrow.x;arrow.prevY=arrow.previousY=arrow.y;
        arrow.x+=arrow.speedX*frames;arrow.y+=arrow.speedY*frames;
        let targetIndex=-1,first=null;
        for(let index=0;index<arcoGame.targets.length;index++){
            const collision=window.ArcheryRiverTargets.sweep(arrow,arcoGame.targets[index]);
            if(collision&&(!first||collision.t<first.t)){first=collision;targetIndex=index;}
        }
        collisionSystem.trace(arrow,first);
        if(first){
            arrow.x=first.x;arrow.y=first.y;
            arrow.state='HIT';
            // Explosion neighbourhoods and hit effects use positions at contact,
            // not endpoints a fast target may already have travelled beyond.
            collisionSystem.atImpact(arcoGame.targets,first.t,()=>
                awardArcoHit(arrow,arcoGame.targets[targetIndex],first.distance,first));
            // The carrier keeps travelling: a raft drifts, a bird flies on unharmed.
            arrow.state='REMOVED';
            arcoGame.arrowPool.push(arcoGame.arrows.splice(arrowIndex,1)[0]);continue;
        }
        const visualMargin=arrow.owner==='PLAYER'?48:30;
        if(arrow.y < -visualMargin || arrow.x < -30 || arrow.x > canvas.width+30){
            arrow.state='REMOVED';
            window.archeryCharactersV2.miss(arrow.owner);
            if(arrow.owner==='PLAYER'){arcoGame.stats.playerMisses++;arcoGame.playerReactionTimer=18;}
            else{arcoGame.stats.mestreMisses++;arcoGame.mestreReactionTimer=14;}
            arcoGame.arrowPool.push(arcoGame.arrows.splice(arrowIndex,1)[0]);
        }
    }
}

function updateArcoEffects() {
    for (let index = arcoGame.effects.length - 1; index >= 0; index--) {
        arcoGame.effects[index].timer--;
        if (arcoGame.effects[index].timer <= 0) arcoGame.effectPool.push(arcoGame.effects.splice(index, 1)[0]);
    }
}

function finishArcoRound() {
    arcoGame.tie = arcoGame.playerScore === arcoGame.mestreScore;
    arcoGame.win = arcoGame.playerScore > arcoGame.mestreScore;
    if (arcoGame.win) insignias.arco = true;
    arcoGame.gameState = 'GAMEOVER';
    arcoGame.pacing.finalScores={player:arcoGame.playerScore,master:arcoGame.mestreScore};
    keys.a = keys.d = keys.w = keys.s = keys.space = false;
    consumeArcoShootEdges();
}

function beginArcoResolution() {
    arcoGame.gameState='RESOLVING';
    arcoGame.pacing.settleFrames=0;
    arcoGame.pacing.arrowsAtBuzzer=arcoGame.arrows.length;
    arcoGame.pacing.scoresAtBuzzer={player:arcoGame.playerScore,master:arcoGame.mestreScore};
    arcoGame.pendingTargetSpawns.length=0;
    arcoGame.playerControl.buffer=0;
    arcoGame.playerControl.state='IDLE';arcoGame.playerControl.age=0;
    arcoGame.playerState='IDLE';arcoGame.mestreState='IDLE';
    keys.a=keys.d=keys.w=keys.s=keys.space=false;
    consumeArcoShootEdges();
}

function resolveArcoFrame() {
    // No new shots or spawns after the buzzer. Live targets and all projectiles
    // already released continue using the same movement and collision routines.
    arcoGame.pacing.settleFrames++;
    updateArcoTargets();updateArcoArrows();retireArcoTargets();updateArcoEffects();
    consumeArcoShootEdges();
    const pacing=window.ArcheryMatchPacing;
    if((arcoGame.arrows.length===0&&arcoGame.pacing.settleFrames>=pacing.SETTLE_MIN)
        ||arcoGame.pacing.settleFrames>=pacing.SETTLE_MAX)finishArcoRound();
}

function simulateArcoFrame() {
    if(arcoGame.gameState==='RESOLVING'){resolveArcoFrame();return;}
    if(arcoGame.gameState!=='PLAYING')return;
    arcoGame.roundFrame++;
    arcoGame.phase = getArcoPhase();
    applyArcoQaAutomation();
    updateArcoTargetSpawns();
    updateArcoPlayer();
    updateArcoMaster();
    updateArcoTargets();
    updateArcoArrows();
    retireArcoTargets();
    updateArcoEffects();
    window.ArcheryMatchPacing.sample(arcoGame.pacing,arcoGame.phase,arcoGame.targets,arcoGame.roundFrames-arcoGame.roundFrame);
    if (arcoGame.roundFrame >= arcoGame.roundFrames) beginArcoResolution();
}

function advanceArcoSimulation(deltaSeconds,speed=1) {
    if(!Number.isFinite(deltaSeconds)||deltaSeconds<0)return 0;
    // Keep existing 60 Hz AI, schedules, cooldowns and scoring. Rendering may run
    // at 30, 60 or 144 Hz; collision always sees matching target/arrow intervals.
    arcoGame.simulationAccumulator+=Math.min(deltaSeconds,.25)*60*speed;
    let steps=0;
    while(arcoGame.simulationAccumulator>=1-1e-9&&['PLAYING','RESOLVING'].includes(arcoGame.gameState)){
        arcoGame.simulationAccumulator=Math.max(0,arcoGame.simulationAccumulator-1);
        simulateArcoFrame();consumeArcoShootEdges();steps++;
    }
    return steps;
}

function updateArco(now=performance.now()) {
    if (arcoGame.gameState === 'TUTORIAL') {
        if (archeryShootPressed) beginArcoRound();
        consumeArcoShootEdges();
        return;
    }

    if (arcoGame.gameState === 'GAMEOVER') {
        if (archeryShootPressed) {
            currentScene = 'ILHA_ARCO';
            keys.space = false;
            archeryShootPressed = false;
            hintText.innerText = 'USE [W A S D] PARA MOVER | [E] PARA FALAR';
            dialogText.innerHTML = arcoGame.tie
                ? '> MESTRE ARQUEIRO: Empate! Foi uma disputa digna de campeoes.'
                : (arcoGame.win
                    ? '> MESTRE ARQUEIRO: Mira excelente! Voce venceu por ' + arcoGame.playerScore + ' a ' + arcoGame.mestreScore + '.'
                    : '> MESTRE ARQUEIRO: Venci por ' + arcoGame.mestreScore + ' a ' + arcoGame.playerScore + '. Tente antecipar os alvos moveis.');
            dialogBox.classList.add('show');
        }
        consumeArcoShootEdges();
        return;
    }

    hintText.innerText = arcoGame.gameState==='RESOLVING'?'TEMPO ESGOTADO | RESOLVENDO FLECHAS EM VOO':'[W A S D] AREA DE TIRO | [ESPACO] ATIRAR';
    const qaFrameStepValue = Number(archeryQaParams.get('archeryQaSpeed'));
    const frameStep = archeryQaParams.get('archeryQa') === '1' && Number.isFinite(qaFrameStepValue)
        ? clampArco(Math.round(qaFrameStepValue), 1, 60)
        : 1;
    const deltaSeconds=arcoGame.lastUpdateTime===null?0:Math.max(0,(now-arcoGame.lastUpdateTime)/1000);
    arcoGame.lastUpdateTime=now;
    advanceArcoSimulation(deltaSeconds,frameStep);
}
function getArcoCharacterVisual(actor) {
    return window.archeryCharactersV2.resolve(actor, arcoGame).state;
}



function drawArcoShooterArea() {
    const area = ARCHERY_CONFIG.shooterArea;
    ctx.strokeStyle = 'rgba(245, 232, 187, 0.74)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(area.left, area.front);
    ctx.lineTo(area.right, area.front);
    ctx.stroke();
    ctx.setLineDash([]);
    // Ground markings only; physical bounds remain in ARCHERY_CONFIG.
    for (const x of [area.left, area.right]) {
        const direction = x === area.left ? 1 : -1;
        for (const y of [area.front + 15, area.back + 15]) {
            ctx.fillStyle = '#d9ca98';
            ctx.fillRect(x, y, direction * 8, 1);
            ctx.fillRect(x, y + (y === area.front + 15 ? 0 : -5), 1, 5);
        }
    }
    ctx.fillStyle = '#665f42';
    ctx.fillRect(canvas.width / 2 - 42, area.front - 10, 84, 10);
    ctx.fillStyle = '#fff4c2';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LINHA DE TIRO', canvas.width / 2, area.front - 3);
    ctx.textAlign = 'left';
}

function drawArcoTargets() {
    for(const target of arcoGame.targets.filter(t=>t.carrier!=='BIRD').sort((a,b)=>a.waterY-b.waterY)){
        window.ArcheryRiverTargets.draw(ctx,target);window.ArcheryExplosiveTargets.drawBadge(ctx,target);
    }
}

function drawArcoBirds() {
    for(const target of arcoGame.targets)if(target.carrier==='BIRD')window.ArcheryBirdTargets.draw(ctx,target);
}

function drawArcoEffects() {
    const shocks=arcoGame.effects.filter(effect=>effect.effectKind==='EXPLOSION').length;
    for(const effect of arcoGame.effects){
        if(effect.effectKind==='EXPLOSION')window.ArcheryExplosiveTargets.drawShock(ctx,effect,shocks);
        else if(effect.effectKind==='GOLD_NOTICE')window.ArcheryGoldenTargets.drawNotice(ctx,effect);
        else window.ArcheryRiverTargets.drawImpact(ctx,effect);
    }
}

function drawArcoCharacters() {
    const actors = [
        { type: 'PLAYER', x: arcoGame.playerX, y: arcoGame.playerY },
        { type: 'MESTRE', x: arcoGame.mestreX, y: arcoGame.mestreY }
    ].sort((a, b) => a.y - b.y);
    for (const actor of actors) {
        ctx.save();
        ctx.fillStyle = 'rgba(42, 49, 37, 0.25)';
        ctx.beginPath(); ctx.ellipse(actor.x, actor.y + 15, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        window.archeryCharactersV2.draw(ctx, actor.type, arcoGame, actor.x, actor.y + 15);
    }

}

function getArcoDiagnostics() {
    const area = ARCHERY_CONFIG.shooterArea;
    const values = [
        arcoGame.playerX,
        arcoGame.playerY,
        arcoGame.mestreX,
        arcoGame.mestreY,
        arcoGame.playerScore,
        arcoGame.mestreScore,
        arcoGame.roundFrame
    ];
    return {
        scene: currentScene,
        state: arcoGame.gameState,
        phase: arcoGame.phase,
        phaseName: window.ArcheryMatchPacing.PHASES[arcoGame.phase].name,
        secondsRemaining: Math.max(0, Math.ceil((arcoGame.roundFrames - arcoGame.roundFrame) / 60)),
        scores: { player: arcoGame.playerScore, master: arcoGame.mestreScore },
        player: { x: +arcoGame.playerX.toFixed(1), y: +arcoGame.playerY.toFixed(1), state: arcoGame.playerState },
        master: { x: +arcoGame.mestreX.toFixed(1), y: +arcoGame.mestreY.toFixed(1), state: arcoGame.mestreState },
        shooterArea: area,
        playerInBounds: arcoGame.playerX >= area.left && arcoGame.playerX <= area.right && arcoGame.playerY >= area.front && arcoGame.playerY <= area.back,
        masterInBounds: arcoGame.mestreX >= area.left && arcoGame.mestreX <= area.right && arcoGame.mestreY >= area.front && arcoGame.mestreY <= area.back,
        overlapAllowed: true,
        targets: arcoGame.targets.length,
        targetTypes: arcoGame.targets.map((target) => target.type),
        targetPaths: arcoGame.targets.map((target) => ({
            id: target.id,
            carrier: target.carrier,
            explosive: target.isExplosive, detonated: target.detonated,
            path: target.pathType,
            entry: target.entryPoint,
            exit: target.exitPoint,
            speed: target.speedTier,
            size: target.sizeTier,
            golden: target.isGolden,
            goldenVariant: target.goldenVariant,
            progress: +target.progress.toFixed(3),
            visible: target.visible, state: target.state, radius: target.radius, x:+target.x.toFixed(2), y:+target.y.toFixed(2), waterY:+target.waterY.toFixed(2), active:target.active
        })),
        pendingTargets: arcoGame.pendingTargetSpawns.length,
        arrows: arcoGame.arrows.length,
        effects: arcoGame.effects.length,
        stats: arcoGame.stats,
        assets: window.archeryAssets ? window.archeryAssets.diagnostics() : null,
        characters: window.archeryCharactersV2.diagnostics(),
        environment: window.ArcheryValley.diagnostics(),
        riverTargets: window.ArcheryRiverTargets.diagnostics(),
        birdTargets: window.ArcheryBirdTargets.diagnostics(),
        explosiveTargets: window.ArcheryExplosiveTargets.diagnostics(),
        goldenTargets: {...window.ArcheryGoldenTargets.diagnostics(),pending:arcoGame.goldenSchedule.length},
        masterAI: window.ArcheryMasterAI.diagnostics(arcoGame.masterAI),
        playerControl: window.ArcheryPlayerControl.diagnostics(arcoGame.playerControl),
        pacing: arcoGame.pacing,
        hasNaN: values.some((value) => !Number.isFinite(value))
    };
}

function recordArcoFps() {
    if (!arcoGame.stats || archeryQaParams.get('archeryQa') !== '1') return;
    const now = performance.now();
    const fps = arcoGame.stats.fps;
    if (fps.lastTime > 0) {
        const delta = now - fps.lastTime;
        if (delta > 0 && delta < 120) {
            const instant = 1000 / delta;
            fps.samples++;
            fps.average += (instant - fps.average) / fps.samples;
            fps.minimum = Math.min(fps.minimum, instant);
        }
    }
    fps.lastTime = now;
}

function drawArcoGame() {
    const assets = window.archeryAssets;
    recordArcoFps();
    const diagnostics = getArcoDiagnostics();
    if (assets && archeryQaParams.get('archeryQa') === '1') {
        canvas.dataset.archeryDiagnostics = JSON.stringify(diagnostics);
        canvas.dataset.archeryAssets = JSON.stringify(diagnostics.assets);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    window.ArcheryValley.draw(ctx, performance.now() / 1000);
    drawArcoShooterArea();

    drawArcoTargets();
    window.ArcheryValley.drawSourceLip(ctx);
    drawArcoBirds();
    for(const arrow of arcoGame.arrows)window.ArcheryRiverTargets.drawArrow(ctx,assets,arrow);
    drawArcoEffects();
    window.ArcheryCollision.drawDebug(ctx,arcoGame.targets);

    drawArcoCharacters();
    if(arcoGame.gameState==='PLAYING')window.ArcheryPlayerControl.drawGuide(ctx,getArcoArrowOrigin('PLAYER'),arcoGame.playerControl);
    ctx.restore();

    ctx.fillStyle = 'rgba(12, 37, 34, 0.78)';
    ctx.fillRect(5, 14, 100, 18);
    ctx.fillRect(canvas.width - 105, 14, 100, 18);
    ctx.fillRect(canvas.width / 2 - 57, 3, 114, 29);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'left';
    ctx.fillText('ZORP ' + arcoGame.playerScore, 12, 26);
    ctx.fillStyle = '#ff806f';
    ctx.textAlign = 'right';
    ctx.fillText('MESTRE ' + arcoGame.mestreScore, canvas.width - 12, 26);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const seconds = Math.max(0, Math.ceil((arcoGame.roundFrames - arcoGame.roundFrame) / 60));
    ctx.fillText(seconds + 's', canvas.width / 2, 14);
    ctx.fillStyle = window.ArcheryMatchPacing.PHASES[arcoGame.phase].color;
    ctx.font = 'bold 7px monospace';
    ctx.fillText(arcoGame.gameState==='RESOLVING'?'FLECHAS EM VOO':window.ArcheryMatchPacing.PHASES[arcoGame.phase].name, canvas.width / 2, 27);
    ctx.textAlign = 'left';
    if(arcoGame.gameState==='PLAYING')window.ArcheryMatchPacing.drawCountdown(ctx,arcoGame.roundFrame,arcoGame.roundFrames);

    if (arcoGame.gameState === 'TUTORIAL') {
        drawOverlayScreen('ARCO E FLECHA', [
            'Disputa de 60 segundos em quatro fases.',
            '[W A S D]: mova-se dentro da area de tiro.',
            '[ESPACO]: um toque, uma flecha. Intervalo de 0,5 s.',
            'Anel externo: base | interno: +15 | centro: +30.',
            'Lento / medio / rapido: siga o rio. [ESPACO] inicia.'
        ], '#e67e22');
    } else if (arcoGame.gameState === 'GAMEOVER') {
        const scoreLine = 'ZORP ' + arcoGame.playerScore + '  x  ' + arcoGame.mestreScore + ' MESTRE';
        if (arcoGame.tie) {
            drawOverlayScreen('EMPATE!', [
                scoreLine,
                'Bullseyes: ' + arcoGame.stats.playerBullseyes + ' x ' + arcoGame.stats.mestreBullseyes,
                'Sem medalha no empate. [ESPACO] volta a ilha.'
            ], '#f1c40f');
        } else if (arcoGame.win) {
            drawOverlayScreen('VITORIA NA ARENA!', [
                scoreLine,
                'Bullseyes: ' + arcoGame.stats.playerBullseyes,
                'Insignia do Arco conquistada!'
            ], '#2ecc71');
        } else {
            drawOverlayScreen('O MESTRE VENCEU', [
                scoreLine,
                'Mova-se, antecipe a trajetoria e acerte o timing.'
            ], '#e74c3c');
        }
    }
}

window.__archeryQA = {
    enter() {
        currentScene = 'JOGO_ARCO';
        resetArco();
    },
    play() {
        currentScene = 'JOGO_ARCO';
        if (arcoGame.gameState === 'TUTORIAL') beginArcoRound();
    },
    diagnostics() {
        return getArcoDiagnostics();
    }
};

const archeryQaParams = new URLSearchParams(window.location.search);
if (archeryQaParams.get('archeryQa') === '1') {
    window.__archeryQA.enter();
    const qaSeconds = Number(archeryQaParams.get('archeryQaSeconds'));
    if (Number.isFinite(qaSeconds) && qaSeconds > 0) arcoGame.roundFrames = Math.max(60, Math.round(qaSeconds * 60));
    if (archeryQaParams.get('archeryQaPlay') === '1') window.__archeryQA.play();
}

// -------------------------------------------------------------
// BASQUETE 1v1 — implementação independente em basketball_1v1.js
// -------------------------------------------------------------
const BASKETBALL_SCENE = "JOGO_BASQUETE";
const SURF_SCENE = "JOGO_SURF";


// -------------------------------------------------------------
// OBSTÁCULOS E NPCs (HUB E ILHAS)
// -------------------------------------------------------------
const sceneObstacles = {
    HUB: [
        {x:68,y:211,w:46,h:14,type:'bench',solid:true,renderByIsland:true},
        {x:336,y:211,w:46,h:14,type:'bench',solid:true,renderByIsland:true},
        {x:46,y:65,w:38,h:25,type:'flower_bed',solid:true,renderByIsland:true},
        {x:366,y:65,w:38,h:25,type:'flower_bed',solid:true,renderByIsland:true}
    ],
    ILHA_CORRIDA: [
        { x: 105, y: 145, w: 32, h: 10, type: 'hurdle', solid: true },
        { x: 335, y: 145, w: 32, h: 10, type: 'hurdle', solid: true },
        { x: 94, y: 88, w: 36, h: 12, type: 'water_station', solid: true, renderByIsland: true },
        { x: 94, y: 178, w: 42, h: 23, type: 'podium', solid: true, renderByIsland: true }
    ],
    ILHA_SURF: [
        // Colisores pequenos nos pontos de apoio; a arte fica na camada da ilha.
        { x: 52, y: 99, w: 14, h: 10, type: 'surf_island_decor', solid: true },
        { x: 384, y: 99, w: 14, h: 10, type: 'surf_island_decor', solid: true },
        { x: 84, y: 219, w: 24, h: 10, type: 'surf_island_decor', solid: true },
        { x: 345, y: 198, w: 17, h: 10, type: 'surf_island_decor', solid: true }
    ],
    ILHA_SKATE: [
        { x: 52, y: 46, w: 72, h: 46, type: 'skate_quarter', solid: true },
        { x: 295, y: 180, w: 72, h: 14, type: 'rail', solid: true },
        { x: 64, y: 190, w: 58, h: 20, type: 'bench', solid: true },
        { x: 135, y: 225, w: 14, h: 14, type: 'cone', solid: true },
        { x: 340, y: 70, w: 14, h: 14, type: 'cone', solid: true }
    ],
    ILHA_ARCO: [
        ...ArcheryIsland.obstacles
    ],
    ILHA_ESCALADA: [
        ...ClimbIsland.obstacles
    ],
    ILHA_ESQUI: [
        // Ringue Central (Cordas e Postes)
        { x: 130, y: 55, w: 190, h: 8, solid: true }, // Corda Norte
        { x: 130, y: 165, w: 75, h: 8, solid: true }, // Corda Sul (lado esquerdo)
        { x: 245, y: 165, w: 75, h: 8, solid: true }, // Corda Sul (lado direito - vão central da escada livre)
        { x: 130, y: 55, w: 8, h: 115, solid: true }, // Corda Oeste
        { x: 312, y: 55, w: 8, h: 115, solid: true }, // Corda Leste
        
        // Área de Treino com Sacos de Pancada
        { x: 45, y: 65, w: 28, h: 42, type: 'punching_bag', solid: true },
        { x: 45, y: 135, w: 28, h: 42, type: 'punching_bag', solid: true },
        { x: 50, y: 205, w: 35, h: 22, type: 'bench_press', solid: true },

        // Mesa de Arbitragem & Oficiais
        { x: 350, y: 70, w: 45, h: 30, type: 'judges_table', solid: true },
        { x: 360, y: 155, w: 30, h: 25, type: 'corner_stool', solid: true }
    ],
    ILHA_PINGPONG: [
        { x: 182, y: 154, w: 86, h: 36, type: 'pingpong_table', solid: true },
        { x: 280, y: 166, w: 16, h: 16, type: 'pingpong_bucket', solid: true },
        { x: 173, y: 60, w: 104, h: 38, type: 'scoreboard', solid: true }
    ]
};

const npcs = [
    { scene: "HUB", x: 180, y: 180, img: imgTurista, tamanho: 44, msg: "> TURISTA: O arquipélago tem diversas modalidades esportivas!" },
    { id: "guia_festival", scene: "HUB", x: 270, y: 130, img: imgGuia, tamanho: 44, msg: "> GUIA: Explore os caminhos ao Norte, Sul, Leste e Oeste." },

    // NPCs da Ilha de Boxe (Arena dos Campeões)
    { scene: "ILHA_ESQUI", x: 225, y: 110, img: imgNpcMestreBoxe, tamanho: 50, msg: "> MESTRE DO BOXE: Controle a distância, circule pelo ringue e lute até o nocaute!", isMaster: "JOGO_BOXE" },
    { scene: "ILHA_ESQUI", x: 130, y: 190, img: imgNpcTreinadorBoxe, tamanho: 44, msg: "> TREINADOR: WASD movimenta no ringue. J é jab, K é golpe forte e L é hook. SHIFT defende; ESPAÇO esquiva." },
    { scene: "ILHA_ESQUI", x: 345, y: 130, img: imgNpcArbitroBoxe, tamanho: 44, msg: "> ÁRBITRO: Lute com distância e timing. Uma queda inicia a contagem; quem não levantar perde por KO." },
    { id: "pugilista_apostador", scene: "ILHA_ESQUI", x: 98, y: 186, img: imgNpcBoxeador, tamanho: 44, msg: "> PUGILISTA/APOSTADOR: Ganhe do Mestre do Boxe sem cair nenhuma vez. Volte aqui para receber 40 moedas." },

    { id: "aprendiz_pingpong", scene: "ILHA_PINGPONG", x: 138, y: 187, img: imgAprendiz, tamanho: 44, msg: "> APRENDIZ: Desafiei o mestre e não consegui fazer um ponto... Esse vovô é realmente bom nisso ou eu sou muito ruim?" },
    { scene: "ILHA_PINGPONG", x: 312, y: 187, img: imgMestrePingPong, tamanho: 50, msg: "> MESTRE DO PING-PONG: Mostre seus reflexos!", isMaster: "JOGO_PINGPONG" },

    { scene: "ILHA_SKATE", x: 225, y: 105, img: imgMestreSkate, tamanho: 50, msg: "> MESTRE DO SKATE: Conecte rampas e corrimãos e domine a linha até a chegada!", isMaster: "JOGO_SKATE" },
    { id: "entrada_basquete", scene: "ILHA_BASQUETE", x: 225, y: 82, img: imgMestreBasqueteNpc, tamanho: 54, interactionWidth: 62, interactionHeight: 62, msg: "> MESTRE DO BASQUETE: Sessenta segundos. Vença no placar e conquiste a arena!", isMaster: BASKETBALL_SCENE },
    {
        id: "mestre_arco_overworld",
        scene: "ILHA_ARCO",
        x: 225,
        y: 118,
        img: imgMestreArcoOverworld,
        tamanho: 50,
        msg: "> MESTRE DO ARCO: Observe a trajetória, alinhe o disparo e prove sua precisão!",
        isMaster: "JOGO_ARCO"
    },
    {
        id: "mestre_corrida",
        scene: "ILHA_CORRIDA",
        x: 225,
        y: 106,
        img: imgMestreCorridaNpc,
        tamanho: 50,
        msg: "> MESTRE DA CORRIDA: Duas voltas. Escolha bem a raia, salte as barreiras e me alcance na reta final!",
        isMaster: "JOGO_CORRIDA"
    },
    
    // NPCs da Ilha da Escalada (Reduzidos para 4 icônicos e bem posicionados)
    { scene: "ILHA_ESCALADA", x: 225, y: 168, img: imgMestreEscaladaOverworld, spriteKey: "climb_v2_mestre", tamanho: 50, msg: "> MESTRE DA ESCALADA: O Monte Zorp não perdoa os fracos! Desvie das pedras e alcance o cume!", isMaster: "JOGO_ESCALADA" },
    { scene: "ILHA_ESCALADA", x: 87, y: 166, img: imgGuiaTrilha, spriteKey: "climb_v2_guia", tamanho: 44, msg: "> GUIA DE TRILHA: Cuidado lá em cima! O vento sopra forte e algumas pedras rachadas quebram ao pisar!" },
    { id: "geologa_escalada", scene: "ILHA_ESCALADA", x: 365, y: 176, img: imgGeologa, spriteKey: "climb_v2_geologa", tamanho: 44, msg: "> GEÓLOGA: As pedras azuis deslizam pela montanha, e as vermelhas estão prestes a desmoronar!" },
    { scene: "ILHA_ESCALADA", x: 112, y: 224, img: imgChef, spriteKey: "climb_v2_chef", tamanho: 44, msg: "> CHEF DE ACAMPAMENTO: Uma sopa bem quente para dar energia antes de enfrentar a montanha!" },
    
    { id: "entrada_surf", scene: "ILHA_SURF", x: 225, y: 112, img: imgMestreSurfing, tamanho: 50, msg: "> MESTRE DO SURF: Mantenha o flow, enfrente os tubos e sobreviva ao grande evento final!", isMaster: SURF_SCENE },
    {
        id: "capitao", scene: "ILHA_SURF", x: 310, y: 180,
        img: FestivalAssets.images.capitao, tamanho: 44,
        msg: "> CAPITÃO: Minha embarcação quebrou e não tenho dinheiro para pagar. Se me trouxer 100 moedas, te deixo embarcar no iate com comida, diversão e etc."
    }
];

// -------------------------------------------------------------
// 3. CONTROLES DO TECLADO
// -------------------------------------------------------------
// Captura a borda do comando de interação. O polling de `keys` sozinho podia
// perder um toque rápido quando keydown e keyup ocorriam entre dois frames.
configureOverworldPresentation();
let overworldConversationText = null;
let interactionPressed = false;
let shipInteractionPressed = false;
let climbUpPressed = false;
let climbSummitAdvancePressed = false;
window.addEventListener("keydown", (e) => {
    if (typeof TitleScreen !== "undefined" && TitleScreen.isActive()) {
        if (TitleScreen.handleKeyDown(e)) {
            e.preventDefault();
            return;
        }
    }
    const k = e.key.toLowerCase();
    if (currentScene === 'JOGO_ARCO' && [' ', 'w', 'a', 's', 'd'].includes(k)) ArcheryRiverTargets.unlockAudio();
    if (currentScene === 'JOGO_PINGPONG' && [' ', 'w', 'a', 's', 'd'].includes(k)) PingPongBall.unlockAudio();
    if (currentScene === 'JOGO_ESCALADA' && ClimbSprites.handleKeyDown(e)) return;
    if (CaptainRoute.handleKeyDown(e)) return;
    if (EndingCinematic.handleKeyDown(e)) return;
    if (typeof AdventureIntro !== "undefined" && AdventureIntro.handleKeyDown(e)) return;
    if (MedalCompletion.handleKeyDown(e)) return;
    if (MastersFarewell.handleKeyDown(e)) return;
    if (!e.repeat && (k === "e" || k === " ") && !currentScene.startsWith("JOGO_")) {
        interactionPressed = true;
        if (k === "e") shipInteractionPressed = true;
    }
    if (k === " ") keys.space = true;
    if (currentScene === "JOGO_ARCO" && k === " ") {
        e.preventDefault();
        if(window.ArcheryPlayerControl.press(e.repeat))archeryShootPressed = true;
    }
    if (currentScene === "JOGO_ESCALADA" && !e.repeat) {
        if(ClimbSummit.active(escaladaGame)) {
            if(k===' ')climbSummitAdvancePressed=true;
        }else if (k === "w" || k === " ") climbUpPressed = true;
    }
    if (currentScene === "JOGO_BOXE") {
        if (k === " " || k === "shift") e.preventDefault();
        if (k === "shift") boxingInputPress.guard = true;
        if (!e.repeat) {
            if (k === " ") {
                if (boxeGame.phase === "READY") boxingInputPress.start = true;
                else boxingInputPress.dodge = true;
            }
            if (k === "j") boxingInputPress.jab = true;
            if (k === "k") boxingInputPress.cross = true;
            if (k === "l") boxingInputPress.hook = true;
            if (k === "q") boxingInputPress.special = true;
            if (k === "r") boxingInputPress.restart = true;
            if (k === "w" || k === "a" || k === "s" || k === "d") queueBoxingMoveTap(k);
            if (k === "escape") {
                currentScene = "ILHA_ESQUI";
                player.x = 225; player.y = 150;
                dialogBox.classList.remove("show");
            }
        }
    }
    if (k === "escape" && currentScene === "JOGO_SKATE") {
        currentScene = "ILHA_SKATE";
        player.x = 225; player.y = 150;
    }
    if (keys.hasOwnProperty(k)) keys[k] = true;
});

window.addEventListener("keyup", (e) => {
    if (typeof TitleScreen !== "undefined" && TitleScreen.isActive()) {
        if (TitleScreen.handleKeyUp(e)) {
            return;
        }
    }
    const k = e.key.toLowerCase();
    if (k === "shift") boxingInputPress.guard = false;
    if (k === " ") {
        keys.space = false;
    }
    if (keys.hasOwnProperty(k)) keys[k] = false;
});

// -------------------------------------------------------------
// 4. COLISÕES E LÓGICA DE MOVIMENTO (HUB)
// -------------------------------------------------------------
function isColliding(player, box) {
    const playerBox = { x: player.x - 12, y: player.y - 16, width: 24, height: 18 };
    return (
        playerBox.x < box.x + box.width &&
        playerBox.x + playerBox.width > box.x &&
        playerBox.y < box.y + box.height &&
        playerBox.y + playerBox.height > box.y
    );
}

function checkObstacleCollision(nextX, nextY) {
    if (currentScene === "HUB" && AdventureIntro.collides(nextX, nextY)) return true;
    if (currentScene === "HUB" && MastersFarewell.collides(nextX, nextY)) return true;
    const feetBox = { x: nextX - 10, y: nextY - 8, w: 20, h: 10 };
    if (currentScene === "ILHA_ARCO" && ArcheryIsland.blocks(feetBox)) return true;
    if (currentScene === "ILHA_ESCALADA" && ClimbIsland.blocks(feetBox)) return true;
    const obstacles = sceneObstacles[currentScene] || [];

    for (let obs of obstacles) {
        if (!obs.solid) continue;
        if (
            feetBox.x < obs.x + obs.w &&
            feetBox.x + feetBox.w > obs.x &&
            feetBox.y < obs.y + obs.h &&
            feetBox.y + feetBox.h > obs.y
        ) {
            return true; 
        }
    }
    if (currentScene !== "ILHA_BASQUETE") {
        for (const npc of npcs) {
            if (npc.scene !== currentScene || !npc.footprint) continue;
            const body = { x: npc.x - npc.footprint.width / 2,
                y: npc.y - npc.footprint.height + 2,
                w: npc.footprint.width, h: npc.footprint.height };
            if (feetBox.x < body.x + body.w && feetBox.x + feetBox.w > body.x &&
                feetBox.y < body.y + body.h && feetBox.y + feetBox.h > body.y) return true;
        }
    }
    return false;
}

function update() {
    if (typeof TitleScreen !== "undefined" && TitleScreen.isActive()) {
        TitleScreen.update();
        return;
    }
    if (AdventureIntro.active) { AdventureIntro.update(); return; }
    if (EndingCinematic.active) { EndingCinematic.update(); return; }
    if (CaptainRoute.active) { CaptainRoute.update(); return; }
    if (MedalCompletion.update(currentScene)) return;
    if (MastersFarewell.update(currentScene)) return;
    const isOverworldScene = !currentScene.startsWith("JOGO_");
    // A result-screen Space must not reopen a minigame while the same key is held.
    // Preserve the basketball island's original interaction path verbatim.
    const interactionRequested = isOverworldScene && (currentScene === "ILHA_BASQUETE"
        ? (interactionPressed || keys.e || keys.space) : interactionPressed);
    const shipInteractionRequested = isOverworldScene && shipInteractionPressed;
    if (isOverworldScene) { interactionPressed = false; shipInteractionPressed = false; }

    if (isOverworldScene) {
        hintText.innerText = "[W A S D] MOVER | [E / ESPAÇO] CONVERSAR";
        
        let moveX = 0, moveY = 0;
        if (keys.w) moveY -= 1;
        if (keys.s) moveY += 1;
        if (keys.a) moveX -= 1;
        if (keys.d) moveX += 1;

        if (moveX !== 0 && moveY !== 0) {
            moveX *= Math.SQRT1_2;
            moveY *= Math.SQRT1_2;
        }

        if (moveX !== 0 || moveY !== 0) {
            const previousX = player.x, previousY = player.y, previousRow = zorpSprite.row;

            if (moveY > 0) zorpSprite.row = 0;       
            else if (moveY < 0) zorpSprite.row = 1;  
            else if (moveX < 0) zorpSprite.row = 2;  
            else if (moveX > 0) zorpSprite.row = 3;  

            let nextX = player.x + moveX * player.speed;
            let nextY = player.y + moveY * player.speed;

            if (!checkObstacleCollision(nextX, player.y)) player.x = nextX;
            if (!checkObstacleCollision(player.x, nextY)) player.y = nextY;
            zorpSprite.isMoving = player.x !== previousX || player.y !== previousY;
            if (zorpSprite.row !== previousRow) { zorpSprite.animIndex = 0; zorpSprite.timer = 0; }

        } else {
            zorpSprite.isMoving = false;
        }

        if (zorpSprite.isMoving) {
            zorpSprite.timer++;
            if (zorpSprite.timer % zorpSprite.speed === 0) {
                zorpSprite.animIndex = (zorpSprite.animIndex + 1) % zorpSprite.animSequence.length;
            }
        } else {
            zorpSprite.animIndex = 0;
            zorpSprite.timer = 0;
        }

        // Transições de Mapa
        if (currentScene === "HUB") {
            if (player.y < 5 && player.x > 200 && player.x < 240) { currentScene = "ILHA_ESQUI"; player.y = 265; }
            else if (player.x > 430 && player.y > 120 && player.y < 170) { currentScene = "ILHA_PINGPONG"; player.x = 20; }
            else if (player.y > 280 && player.x > 200 && player.x < 240) { currentScene = "ILHA_SKATE"; player.y = 20; }
            else if (player.x < 10 && player.y > 120 && player.y < 170) { currentScene = "ILHA_ARCO"; player.x = 420; }
        } 
        else if (currentScene === "ILHA_ESQUI") {
            if (player.y > 280) { currentScene = "HUB"; player.y = 15; }
        }
        else if (currentScene === "ILHA_PINGPONG") {
            if (player.x < 10) { currentScene = "HUB"; player.x = 420; }
            else if (player.y < 5) { currentScene = "ILHA_SURF"; player.y = 265; }
        }
        else if (currentScene === "ILHA_SKATE") {
            if (player.y < 5) { currentScene = "HUB"; player.y = 270; }
            else if (player.x > 430) { currentScene = "ILHA_BASQUETE"; player.x = 20; }
            else if (player.x < 10) { currentScene = "ILHA_CORRIDA"; player.x = 420; }
        }
        else if (currentScene === "ILHA_BASQUETE") {
            if (player.x < 10) { currentScene = "ILHA_SKATE"; player.x = 420; }
        }
        else if (currentScene === "ILHA_CORRIDA") {
            if (player.x > 430) { currentScene = "ILHA_SKATE"; player.x = 20; }
        }
        else if (currentScene === "ILHA_ARCO") {
            if (player.x > 430) { currentScene = "HUB"; player.x = 20; }
            else if (player.y < 5) { currentScene = "ILHA_ESCALADA"; player.y = 265; }
        }
        else if (currentScene === "ILHA_ESCALADA") {
            if (player.y > 280) { currentScene = "ILHA_ARCO"; player.y = 15; }
        }
        else if (currentScene === "ILHA_SURF") {
            if (player.y > 280) { currentScene = "ILHA_PINGPONG"; player.y = 15; }
        }

        // Interação NPC
        let npcProximo = null;
        let npcDistance = Infinity;
        for (let npc of npcs) {
            const interactionBox = overworldNpcInteractionBox(npc);
            if (npc.scene === currentScene && isColliding(player, interactionBox)) {
                const distance = Math.hypot(player.x - npc.x, player.y - npc.y);
                if (distance < npcDistance) { npcProximo = npc; npcDistance = distance; }
                if (currentScene === "ILHA_BASQUETE") break;
            }
        }
        
        overworldFocusNpc = npcProximo;
        if (overworldConversationNpc !== npcProximo) {
            overworldConversationNpc = null; overworldConversationText = null;
        }
        if (npcProximo) {
            dialogBox.classList.add("show");

            const extra = npcProximo.isMaster
                ? "<br><br>[E] OU [ESPAÇO] PARA INICIAR"
                : "";

            if (npcProximo.isMaster && interactionRequested) {
                const jogo = npcProximo.isMaster;

                if (jogo === "JOGO_PINGPONG") {
                    currentScene = "JOGO_PINGPONG";
                    resetPingPong(true);
                } else if (jogo === "JOGO_ARCO") {
                    currentScene = "JOGO_ARCO";
                    resetArco();
                } else if (jogo === BASKETBALL_SCENE) {
                    if (typeof window.resetBasketball1v1 === "function") {
                        currentScene = BASKETBALL_SCENE;
                        window.resetBasketball1v1(true);
                    } else {
                        console.error("[Basquete] O módulo basketball_1v1.js não foi carregado.");
                        dialogText.innerHTML = "> A arena ainda não carregou. Recarregue a página e tente novamente.";
                    }
                } else if (jogo === "JOGO_ESCALADA") {
                    currentScene = "JOGO_ESCALADA";
                    resetEscalada();
                } else if (jogo === "JOGO_BOXE") {
                    currentScene = "JOGO_BOXE";
                    resetBoxe();
                } else if (jogo === "JOGO_SKATE") {
                    currentScene = "JOGO_SKATE";
                    resetSkateGame(true);
                } else if (jogo === "JOGO_CORRIDA") {
                    if (typeof window.resetCorridaMaratona === "function") {
                        currentScene = "JOGO_CORRIDA";
                        window.resetCorridaMaratona(true);
                    } else {
                        console.error("[Corrida] O módulo corrida_maratona.js não foi carregado.");
                        dialogText.innerHTML = "> A pista ainda não está pronta. Recarregue a página e tente novamente.";
                    }
                } else if (jogo === SURF_SCENE) {
                    if (typeof window.resetSurfMinigame === "function") {
                        currentScene = SURF_SCENE;
                        window.resetSurfMinigame(true);
                    } else {
                        console.error("[Surf] O módulo surf_endless.js não foi carregado.");
                        dialogText.innerHTML = "> O oceano ainda não carregou. Recarregue a página e tente novamente.";
                    }
                }

                dialogBox.classList.remove("show");
                keys.e = false;
                keys.space = false;

            } else if (interactionRequested) {
                if (npcProximo.scene !== "ILHA_BASQUETE") overworldConversationNpc = npcProximo;
                overworldConversationText = CaptainRoute.interact(npcProximo) || FestivalChallenges.interact(npcProximo) || npcProximo.msg;
                dialogText.innerHTML = overworldConversationText + extra;
            } else {
                dialogText.innerHTML = overworldConversationNpc === npcProximo
                    ? (overworldConversationText || npcProximo.msg) : npcProximo.scene !== "ILHA_BASQUETE"
                    ? "> " + npcProximo.msg.replace(/^>\s*/, "").split(":")[0] +
                        (npcProximo.isMaster ? " · [E] / [ESPAÇO] INICIAR" : " · [E] / [ESPAÇO] CONVERSAR")
                    : npcProximo.isMaster
                    ? "> (Pressione [E] ou [ESPAÇO] para iniciar)"
                    : "> (Pressione [E] para conversar)";
            }
        } else { 
            dialogBox.classList.remove("show"); 
        }
        if (currentScene === "HUB" && AdventureIntro.introSeen) {
            AdventureIntro.updateShipInteraction(interactionRequested, Boolean(npcProximo), shipInteractionRequested);
        }
    } 
    else if (currentScene === "JOGO_PINGPONG") {
        updatePingPong();
    } else if (currentScene === "JOGO_ARCO") {
        updateArco();
    } else if (currentScene === "JOGO_ESCALADA") {
        updateEscaladaGame();
    } else if (currentScene === "JOGO_BOXE") {
        updateBoxeGame();
    } else if (currentScene === "JOGO_SKATE") {
        updateSkateGame();
    } else if (currentScene === BASKETBALL_SCENE) {
        window.updateBasketball1v1();
    } else if (currentScene === "JOGO_CORRIDA") {
        window.updateCorridaMaratona();
    } else if (currentScene === SURF_SCENE) {
        window.updateSurfMinigame();
    }
}

// -------------------------------------------------------------
// 5. MINIGAME PING PONG
// -------------------------------------------------------------
function pingPongPaddle(receiver) {
    const playerSide = receiver === 'PLAYER';
    const x = playerSide ? pingPong.playerX : pingPong.opponentX;
    const y = playerSide ? pingPong.playerY : pingPong.opponentY;
    return { left: x - (playerSide ? 2 : 8), right: x + (playerSide ? 40 : 32),
        top: y - 6, bottom: y + 54 };
}

function aimPingPongReturn(ball, hitter, targetX, targetY, speed, loft = 25, serve = false, style = null) {
    PingPongBall.launch(ball, { hitter, targetX, targetY, speed, loft,
        serve, isSuper: ball.isSuper, rally: pingPong.rallyHits,
        contact: serve ? 0 : (ball.y - ((hitter === 'PLAYER' ? pingPong.playerY : pingPong.opponentY) + 24)) / 30,
        paddleVelocity: serve ? 0 : hitter === 'PLAYER' ? pingPong.playerVelocityY : pingPong.masterAI.velocityY,
        style }, PINGPONG_COURT);
}

function spawnPingPongBall(from = 'PLAYER', customTargetY = pingPongTableY(145), customSpeed = 4.2, isSuper = false) {
    if (pingPong.balls.filter(b => b.state !== 'MISSED').length >= 10) return null;
    const playerSide = from === 'PLAYER';
    const ball = { id: pingPong.nextBallId++,
        x: playerSide ? pingPong.playerX + 28 : pingPong.opponentX - 6,
        y: (playerSide ? pingPong.playerY : pingPong.opponentY) + 20,
        z: 22, radius: pingPong.ballRadius, isSuper: playerSide && isSuper, trail: [] };
    aimPingPongReturn(ball, from, pingPongTableX(playerSide ? 250 : 190), customTargetY, customSpeed, 25, true);
    pingPong.balls.push(ball);
    return ball;
}

function emitPingPongEventBall(index) {
    if (pingPong.balls.filter(b => b.state !== 'MISSED').length >= 10) return;
    const ball = { id: pingPong.nextBallId++, x: pingPong.opponentX - 6,
        y: pingPong.opponentY + 24, z: 22, radius: pingPong.ballRadius, trail: [], isSuper: false };
    let destinationY = pingPongTableY(145) + Math.sin(index * 0.85) * 22;
    const arriving = pingPong.balls.filter(b => b.state !== 'MISSED' && b.receiver === 'PLAYER')
        .map(b => ({ b, time: PingPongBall.timeToReceiver(b, 70) }))
        .filter(item => Math.abs(item.time - 68) < 18)
        .sort((a, b) => Math.abs(a.time - 68) - Math.abs(b.time - 68))[0];
    // Nearby receiving deadlines share a reachable lane at release. Each shot
    // then has its own physical ray, with no tracking after it leaves the racket.
    if (arriving) destinationY = Math.max(PINGPONG_COURT.table.back + 12,
        Math.min(PINGPONG_COURT.table.front - 12, arriving.b.receive.y + Math.sin(index) * 7));
    PingPongBall.launch(ball, { hitter: 'OPPONENT', targetX: 198,
        targetY: destinationY, speed: 4.2, rally: 3, loft: 25 }, PINGPONG_COURT);
    pingPong.balls.push(ball);
    pingPong.multiball.flash = 0.65;
    pingPong.opponentHitTimer = 5;
    PingPongBall.playPaddle();
}

function resetPingPong(fullReset = false) {
    if (fullReset) {
        pingPong.playerScore = 0;
        pingPong.opponentScore = 0;
        pingPong.power = 0;
        pingPong.playerX = PINGPONG_COURT.player.homeX;
        pingPong.playerY = pingPongTableY(145) - 20;
        pingPong.opponentX = PINGPONG_COURT.opponent.homeX;
        pingPong.opponentY = pingPongTableY(145) - 20;
        pingPong.gameState = 'TUTORIAL';
        pingPong.win = false;
        pingPong.server = 'PLAYER';
        pingPong.nextBallId = 1;
    }
    
    pingPong.playerHitTimer = 0;
    pingPong.opponentHitTimer = 0;
    pingPong.isPowerActive = false;
    pingPong.rallyHits = 0;
    pingPong.bounceEffects = [];
    pingPong.specialEffects = [];
    pingPong.balls = [];
    pingPong.multiball = PingPongMultiball.create();
    pingPong.scoreCooldown = 0;
    pingPong.globalReturnCooldown = 0;
    pingPong.playerVelocityY = 0;
    pingPong.mestreReaction = null;
    pingPong.masterAI = PingPongMasterAI.create();
    pingPong.serveCooldown = 0;
    pingPong.pointFreeze = 0;
    pingPong.pendingPoints = [];
    pingPong.pointFeedback = [];

    // Saque inicial com 1 bola
    spawnPingPongBall(pingPong.server, pingPongTableY(145), 4.2);
    pingPong.server = (pingPong.server === 'PLAYER') ? 'OPPONENT' : 'PLAYER';
}

function finishPingPongMatch() {
    if (pingPong.playerScore >= pingPong.maxScore) {
        insignias.pingpong = true;
        pingPong.gameState = 'GAMEOVER'; pingPong.win = true;
    } else if (pingPong.opponentScore >= pingPong.maxScore) {
        pingPong.gameState = 'GAMEOVER'; pingPong.win = false;
    }
}

function commitPingPongPoints() {
    const point = pingPong.pendingPoints.shift();
    if (!point || pingPong.gameState !== 'PLAYING') return;
    if (point.playerWon) pingPong.playerScore++;
    else pingPong.opponentScore++;
    point.feedback.phase = 'POINT'; point.feedback.timer = 26;
    pingPong.scoreCooldown = 12;
    pingPong.balls = pingPong.balls.filter(ball => ball.id !== point.id);
    if (pingPong.balls.length === 0) pingPong.serveCooldown = 32;
    finishPingPongMatch();
    if (pingPong.gameState === 'GAMEOVER') {
        pingPong.pendingPoints = []; pingPong.multiball.remaining = 0;
    }
}

function updatePingPong() {
    if (pingPong.gameState === 'TUTORIAL') {
        if (keys.space) { pingPong.gameState = 'PLAYING'; keys.space = false; }
        return;
    }
    
    if (pingPong.gameState === 'GAMEOVER') {
        if (keys.space) { 
            currentScene = "ILHA_PINGPONG"; 
            keys.space = false; 
            dialogText.innerHTML = pingPong.win ? "> MESTRE: Reflexo Lendário! Você superou o ritmo frenético e ganhou a Insígnia do Ping-Pong!" : "> MESTRE: Foi um belo confronto de 50 pontos! Respire fundo e tente novamente!";
            dialogBox.classList.add("show");
        }
        return;
    }

    for (const effect of pingPong.pointFeedback) if (effect.phase === 'POINT') effect.timer--;
    pingPong.pointFeedback = pingPong.pointFeedback.filter(effect => effect.phase === 'MISS' || effect.timer > 0);
    if (pingPong.scoreCooldown > 0) pingPong.scoreCooldown--;
    if (pingPong.globalReturnCooldown > 0) pingPong.globalReturnCooldown--;
    if (pingPong.pointFreeze > 0) {
        // Freeze the short receiving failure, never let that ball cross the hall.
        pingPong.pointFreeze--;
        if (pingPong.pointFreeze === 0) commitPingPongPoints();
        return;
    }
    if (pingPong.pendingPoints.length && pingPong.scoreCooldown === 0) commitPingPongPoints();
    if (pingPong.gameState === 'GAMEOVER') return;
    PingPongMultiball.update(pingPong.multiball, pingPong, emitPingPongEventBall);
    hintText.innerText = "[W/S] MIRAR CIMA/BAIXO | [A/D] RECUAR/AVANÇAR | [ESPAÇO] RAQUETADA GLOBAL";

    // 1. Movimentação do Jogador Zorp
    let pMoveX = 0, pMoveY = 0;
    if (keys.w) pMoveY -= pingPong.speed;
    if (keys.s) pMoveY += pingPong.speed;
    if (keys.a) pMoveX -= pingPong.speed;
    if (keys.d) pMoveX += pingPong.speed;

    const oldPlayerY = pingPong.playerY;
    pingPong.playerX = Math.max(PINGPONG_COURT.player.minX, Math.min(PINGPONG_COURT.player.maxX, pingPong.playerX + pMoveX));
    pingPong.playerY = Math.max(PINGPONG_COURT.table.back - 20, Math.min(PINGPONG_COURT.table.front - 20, pingPong.playerY + pMoveY));
    pingPong.playerVelocityY = pingPong.playerY - oldPlayerY;

    if (pMoveY < 0) pingPong.playerAction = "MOVE_UP";
    else if (pMoveY > 0) pingPong.playerAction = "MOVE_DOWN";
    else pingPong.playerAction = "IDLE";

    if (pingPong.playerHitTimer > 0) {
        pingPong.playerAction = "HIT";
        pingPong.playerHitTimer--;
    }

    // One global racket stroke: every eligible ball becomes a NEW Zorp return.
    const specialTargets = pingPong.balls.filter(ball => PingPongBall.canGlobalReturn(ball, PINGPONG_COURT) &&
        !PingPongBall.missed(ball, pingPongPaddle(ball.receiver)));
    if (keys.space && pingPong.power >= pingPong.maxPower && pingPong.globalReturnCooldown === 0 && specialTargets.length > 0) {
        keys.space = false;
        pingPong.power = 0;
        pingPong.globalReturnCooldown = 150;
        pingPong.playerHitTimer = 18;
        pingPong.playerAction = "HIT";
        pingPong.rallyHits++;
        pingPong.specialEffects.push({ age: 0, lifetime: 16 });
        PingPongBall.playGlobalReturn();
        specialTargets.forEach((ball, index) => {
            if (PingPongBall.returnGlobally(ball, index, specialTargets.length, pingPong.rallyHits, PINGPONG_COURT)) {
                pingPong.bounceEffects.push({ x: ball.x, y: ball.y - ball.z,
                    radius: 2, maxRadius: 8, alpha: 0.8, color: '#c1faff', racketHit: true });
            }
        });
    }
    for (let i = pingPong.specialEffects.length - 1; i >= 0; i--) {
        if (++pingPong.specialEffects[i].age >= pingPong.specialEffects[i].lifetime) pingPong.specialEffects.splice(i, 1);
    }

    // 4. React only to a legal bounce on the master's half. No pre-bounce aim.
    const masterRead = PingPongMasterAI.update(pingPong.masterAI, {
        balls: pingPong.balls, y: pingPong.opponentY,
        minY: PINGPONG_COURT.table.back - 20, maxY: PINGPONG_COURT.table.front - 20,
        homeY: pingPongTableY(145) - 20, baseSpeed: pingPong.opponentSpeed,
        paddleLeft: pingPong.opponentX - 8, paddleRight: pingPong.opponentX + 32,
        rally: pingPong.rallyHits,
        holdPosition: pingPong.multiball.phase === 'PREPARING_MULTIBALL'
    });
    pingPong.opponentY = masterRead.y;
    pingPong.opponentAction = masterRead.action;
    if (masterRead.struggling) pingPong.mestreReaction = { text: '💦', timer: 30 };

    if (pingPong.opponentHitTimer > 0) {
        pingPong.opponentAction = "HIT";
        pingPong.opponentHitTimer--;
    }

    if (pingPong.mestreReaction) {
        pingPong.mestreReaction.timer--;
        if (pingPong.mestreReaction.timer <= 0) pingPong.mestreReaction = null;
    }

    // 5. Serve: own half then receiving half. Rally: receiving half only.
    for (const b of pingPong.balls) {
        const event = PingPongBall.step(b);
        if (event === 'BOUNCE' || event === 'SERVE_BOUNCE') {
            pingPong.bounceEffects.push({ x: b.x, y: b.y, radius: 2, maxRadius: 13,
                alpha: 1, color: b.isSuper ? '#00e5ff' : '#fff7cf' });
            PingPongBall.playBounce();
        }
        b.trail.push({ x: b.x, y: b.y - b.z, alpha: 0.85, speed: Math.abs(b.speedX) });
        if (b.trail.length > 7) b.trail.shift();
        for (const tr of b.trail) tr.alpha *= 0.82;

        // 6. REBATIDA DO ZORP (CONTROLE TOTAL DE BOLA)
        if (PingPongBall.canReturn(b, 'PLAYER')) {
            const contact = PingPongBall.paddleContact(b, pingPongPaddle('PLAYER'));
            if (contact) {
                Object.assign(b, contact);
                pingPong.playerHitTimer = 12;
                PingPongBall.playPaddle();
                b.lastHitter = 'PLAYER';
                pingPong.rallyHits++;

                // Aumenta velocidade gradativamente no rali
                let baseSpeed = Math.min(10.5, 4.2 + pingPong.rallyHits * 0.38);
                let targetX = pingPongTableX(260);

                // Avanço ([D]) e Recuo ([A])
                if (keys.d || pingPong.playerX > PINGPONG_COURT.player.homeX + 8) {
                    baseSpeed += 1.6;
                    targetX = pingPongTableX(275);
                } else if (keys.a || pingPong.playerX < PINGPONG_COURT.player.homeX - 4) {
                    baseSpeed = Math.max(3.8, baseSpeed - 1.2);
                    targetX = pingPongTableX(245);
                }

                // Super Smash individual se o botão estiver pressionado
                if (b.isSuper) {
                    baseSpeed = Math.max(9.5, baseSpeed + 2.5);
                }

                // Carrega barra de poder
                pingPong.power = Math.min(pingPong.maxPower, pingPong.power + 15);
                b.speedX = baseSpeed;

                // Direcional [W/S]
                let targetY = pingPongTableY(145);
                if (keys.w) targetY = pingPongTableY(112); // Canto superior
                else if (keys.s) targetY = pingPongTableY(178); // Canto inferior

                // Ponto de contato na raquete
                const paddleCenter = pingPong.playerY + 24;
                const contactRatio = (b.y - paddleCenter) / 24;
                if (Math.abs(contactRatio) >= 0.25) {
                    targetY += contactRatio * (pingPongTableY(171) - pingPongTableY(145));
                }
                targetY = Math.max(pingPongTableY(105), Math.min(pingPongTableY(185), targetY));

                aimPingPongReturn(b, 'PLAYER', targetX, targetY, baseSpeed, 25, false,
                    keys.w || keys.s ? 'wide' : null);

                let hitColor = pingPong.rallyHits >= 8 ? '#e74c3c' : (pingPong.rallyHits >= 4 ? '#f1c40f' : '#2ecc71');
                pingPong.bounceEffects.push({
                    x: pingPong.playerX + 25, y: pingPong.playerY + 24,
                    radius: 3, maxRadius: 14, alpha: 1.0, color: hitColor
                });
            }
        }

        // 7. REBATIDA DO MESTRE (VARIAÇÕES SEM SUPER APELATIVO)
        if (PingPongBall.canReturn(b, 'OPPONENT')) {
            const contact = PingPongBall.paddleContact(b, pingPongPaddle('OPPONENT'));
            if (contact) {
                Object.assign(b, contact);
                pingPong.opponentHitTimer = 12;
                PingPongBall.playPaddle();
                b.lastHitter = 'OPPONENT';
                b.isSuper = false;
                pingPong.rallyHits++;

                let baseSpeed = Math.min(9.5, 3.8 + pingPong.rallyHits * 0.32);
                let targetX = pingPongTableX(185);
                let targetY = pingPongTableY(145);
                let zBoost = 0.6;
                let shotStyle = 'straight';

                const rndShot = Math.random();
                if (rndShot < 0.35) {
                    // Cruzada na ponta oposta
                    shotStyle = 'cross';
                    targetY = pingPongTableY(b.y < pingPongTableY(145) ? 168 : 122);
                    targetX = pingPongTableX(175);
                } else if (rndShot < 0.50) {
                    // Lob alto
                    shotStyle = 'central';
                    targetY = pingPongTableY(145 + (Math.random() - 0.5) * 30);
                    baseSpeed = Math.max(3.6, baseSpeed - 1.2);
                    zBoost = 1.4;
                    targetX = pingPongTableX(195);
                } else if (rndShot < 0.62 && pingPong.rallyHits >= 4) {
                    // Cortada rápida
                    shotStyle = 'wide';
                    baseSpeed += 1.5;
                    targetY = pingPongTableY((Math.random() < 0.5) ? 120 : 170);
                    targetX = pingPongTableX(170);
                    pingPong.bounceEffects.push({
                        x: pingPong.opponentX - 8, y: pingPong.opponentY + 20,
                        radius: 4, maxRadius: 16, alpha: 1.0, color: '#f39c12'
                    });
                } else {
                    // Retorno neutro
                    targetY = pingPongTableY(145 + (Math.random() - 0.5) * 20);
                    targetX = pingPongTableX(185);
                }

                aimPingPongReturn(b, 'OPPONENT', targetX, targetY, baseSpeed, zBoost > 1 ? 36 : 25, false, shotStyle);

                let hitColor = pingPong.rallyHits >= 8 ? '#e74c3c' : '#ffffff';
                pingPong.bounceEffects.push({
                    x: pingPong.opponentX - 6, y: pingPong.opponentY + 24,
                    radius: 3, maxRadius: 12, alpha: 1.0, color: hitColor
                });
            }
        }

        // 8. A point requires the legal bounce AND a missed receiving attempt.
        if (PingPongBall.markMissed(b, pingPongPaddle(b.receiver))) {
            const playerWon = b.receiver === 'OPPONENT';
            const feedback = { x: b.x, y: b.y - b.z, phase: 'MISS', timer: 26,
                color: playerWon ? '#2ecc71' : '#e74c3c' };
            pingPong.pointFeedback.push(feedback);
            pingPong.pendingPoints.push({ id: b.id, playerWon, feedback });
            if (pingPong.pendingPoints.length === 1 && pingPong.scoreCooldown === 0) pingPong.pointFreeze = 6;
        }
    }

    // Se todas as bolas saíram de jogo, agenda novo saque
    if (pingPong.balls.length === 0 && pingPong.pendingPoints.length === 0 && pingPong.multiball.remaining === 0) {
        if (pingPong.serveCooldown <= 0) {
            pingPong.serveCooldown = 32;
        } else {
            pingPong.serveCooldown--;
            if (pingPong.serveCooldown === 0) {
                pingPong.rallyHits = 0;
                spawnPingPongBall(pingPong.server, pingPongTableY(145), 4.2);
                pingPong.server = (pingPong.server === 'PLAYER') ? 'OPPONENT' : 'PLAYER';
            }
        }
    }

    // 9. Atualização dos efeitos visuais de quique
    for (let i = pingPong.bounceEffects.length - 1; i >= 0; i--) {
        let b = pingPong.bounceEffects[i];
        b.radius += 0.8;
        b.alpha -= 0.08;
        if (b.alpha <= 0) pingPong.bounceEffects.splice(i, 1);
    }

    // 10. CONDIÇÃO DE VITÓRIA (LIMITE DE 50 PONTOS)
    finishPingPongMatch();
}

// -------------------------------------------------------------
// 6. DESENHO DAS ILHAS E OBSTÁCULOS
// -------------------------------------------------------------
function drawWater() {
    ctx.fillStyle = "#2b78e4"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#4a90e2";
    for(let i = 0; i < 30; i++) {
        let wx = (Date.now() / 20 + i * 40) % canvas.width;
        let wy = (i * 15) % canvas.height;
        ctx.fillRect(wx, wy, 12, 2);
    }
}

function drawPath(x, y, w, h) {
    ctx.fillStyle = "#95a5a6"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#7f8c8d"; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
}

function drawShadow(footX, footY) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(footX, footY - 1, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayer() {
    drawShadow(player.x, player.y);
    if (zorpImg.complete && zorpImg.naturalWidth !== 0) {
        ctx.imageSmoothingEnabled = false;
        const atlas = OVERWORLD_ZORP_WALK;
        const column = atlas.sequences[zorpSprite.row][zorpSprite.animIndex];
        const [x,y,w,h] = atlas.frames[zorpSprite.row][column];
        const scale = atlas.scale;
        ctx.drawImage(zorpImg, x,y,w,h,
            Math.round(player.x - (atlas.pivots[column]-x)*scale),
            Math.round(player.y - h*scale), w*scale, h*scale);
    }
}

function drawNPC(npc) {
    if(npc.scene==="ILHA_BASQUETE")drawBasketballOverworldNpc(npc);
    else drawUnifiedOverworldNpc(npc);
}

function drawSceneObstacles() {
    const obstacles = sceneObstacles[currentScene] || [];
    obstacles.forEach(obs => {
        if (obs.renderByIsland) return;
        if (obs.type === 'surf_island_decor' || obs.type === 'archery_island_decor' || obs.type === 'pingpong_table' || obs.type === 'pingpong_bucket' || obs.type === 'skate_quarter' || obs.type === 'podium') return;
        switch (obs.type) {
            case 'hurdle':
                ctx.fillStyle = '#ffffff'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.fillStyle = '#e74c3c'; ctx.fillRect(obs.x + 4, obs.y, 6, obs.h); ctx.fillRect(obs.x + 20, obs.y, 6, obs.h);
                break;
            case 'palm_tree':
                ctx.fillStyle = '#795548'; ctx.fillRect(obs.x + 10, obs.y + 10, 10, 20);
                ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(obs.x + 15, obs.y + 8, 16, 0, Math.PI * 2); ctx.fill();
                break;
            case 'surf_rack':
                ctx.fillStyle = '#8d6e63'; ctx.fillRect(obs.x, obs.y + 10, obs.w, 8);
                ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.ellipse(obs.x + obs.w / 2, obs.y + 6, obs.w / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
                break;
            case 'ramp':
                ctx.fillStyle = '#bdc3c7';
                ctx.beginPath(); ctx.moveTo(obs.x, obs.y + obs.h); ctx.lineTo(obs.x + obs.w, obs.y + obs.h); ctx.lineTo(obs.x + obs.w, obs.y); ctx.closePath(); ctx.fill();
                break;
            case 'rail':
                ctx.fillStyle = '#ecf0f1'; ctx.fillRect(obs.x, obs.y + 2, obs.w, 4);
                ctx.fillRect(obs.x + 8, obs.y + 6, 4, obs.h - 6); ctx.fillRect(obs.x + obs.w - 12, obs.y + 6, 4, obs.h - 6);
                break;
            case 'target':
                ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(obs.x + 12, obs.y + 12, 12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(obs.x + 12, obs.y + 12, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(obs.x + 12, obs.y + 12, 4, 0, Math.PI * 2); ctx.fill();
                break;
            case 'boulder':
                ctx.fillStyle='rgba(13,30,40,.25)';ctx.beginPath();ctx.ellipse(obs.x+15,obs.y+25,16,6,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#526574';ctx.beginPath();ctx.moveTo(obs.x+2,obs.y+22);ctx.lineTo(obs.x+6,obs.y+5);
                ctx.lineTo(obs.x+20,obs.y+1);ctx.lineTo(obs.x+29,obs.y+12);ctx.lineTo(obs.x+26,obs.y+27);ctx.closePath();ctx.fill();
                ctx.fillStyle='#819695';ctx.beginPath();ctx.moveTo(obs.x+6,obs.y+5);ctx.lineTo(obs.x+20,obs.y+1);
                ctx.lineTo(obs.x+17,obs.y+15);ctx.lineTo(obs.x+2,obs.y+22);ctx.closePath();ctx.fill();
                break;
            case 'pine_tree':
                ctx.fillStyle='rgba(13,30,40,.22)';ctx.beginPath();ctx.ellipse(obs.x+12,obs.y+32,14,4,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#665444';ctx.fillRect(obs.x+10,obs.y+23,5,12);
                for(let tier=0;tier<3;tier++){
                    const y=obs.y+tier*7,w=9+tier*6;
                    ctx.fillStyle=tier%2?'#456d60':'#36594f';ctx.beginPath();ctx.moveTo(obs.x+12,y);
                    ctx.lineTo(obs.x+12-w,y+14);ctx.lineTo(obs.x+12+w,y+14);ctx.closePath();ctx.fill();
                    ctx.strokeStyle='#729383';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(obs.x+12,y+2);ctx.lineTo(obs.x+13-w,y+13);ctx.stroke();
                }
                break;
            case 'bench':
                ctx.fillStyle = '#8d6e63'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.fillStyle = '#5d4037'; ctx.fillRect(obs.x, obs.y + 5, obs.w, 2); ctx.fillRect(obs.x, obs.y + 12, obs.w, 2);
                break;
            case 'flower_bed': 
                ctx.fillStyle = '#27ae60'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(obs.x + 8, obs.y + 8, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(obs.x + 22, obs.y + 15, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#9b59b6'; ctx.beginPath(); ctx.arc(obs.x + 10, obs.y + 22, 4, 0, Math.PI * 2); ctx.fill();
                break;
            case 'water_station':
                ctx.fillStyle = '#bdc3c7'; ctx.fillRect(obs.x, obs.y + 10, obs.w, 10);
                ctx.fillStyle = '#3498db'; ctx.fillRect(obs.x + 5, obs.y + 5, 6, 5); ctx.fillRect(obs.x + 20, obs.y + 5, 6, 5);
                break;
            case 'umbrella': 
                ctx.fillStyle = '#d35400'; ctx.fillRect(obs.x + 18, obs.y + 15, 4, 25);
                ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(obs.x + 20, obs.y + 15, 20, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(obs.x + 20, obs.y + 15, 10, Math.PI, 0); ctx.fill();
                break;
            case 'sandcastle': 
                ctx.fillStyle = '#f39c12'; ctx.fillRect(obs.x, obs.y + 5, obs.w, 15);
                ctx.fillRect(obs.x, obs.y, 5, 5); ctx.fillRect(obs.x + 7, obs.y, 6, 5); ctx.fillRect(obs.x + 15, obs.y, 5, 5);
                break;
            case 'cone': 
                ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.moveTo(obs.x + 7, obs.y); ctx.lineTo(obs.x, obs.y + 15); ctx.lineTo(obs.x + 15, obs.y + 15); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#ffffff'; ctx.fillRect(obs.x + 3, obs.y + 5, 9, 3);
                break;
            case 'wind_flag':
                ctx.fillStyle = '#7f8c8d'; ctx.fillRect(obs.x, obs.y, 3, obs.h);
                ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.moveTo(obs.x + 3, obs.y + 2); ctx.lineTo(obs.x + 20, obs.y + 8); ctx.lineTo(obs.x + 3, obs.y + 14); ctx.closePath(); ctx.fill();
                break;
            case 'bleachers': 
                ctx.fillStyle = '#95a5a6'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.fillStyle = '#7f8c8d'; ctx.fillRect(obs.x, obs.y + 10, obs.w, 2); ctx.fillRect(obs.x, obs.y + 20, obs.w, 2);
                break;
            case 'tent': 
                ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.moveTo(obs.x + 20, obs.y); ctx.lineTo(obs.x, obs.y + 30); ctx.lineTo(obs.x + 40, obs.y + 30); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.moveTo(obs.x + 20, obs.y); ctx.lineTo(obs.x + 20, obs.y + 30); ctx.lineTo(obs.x + 40, obs.y + 30); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#333333'; ctx.beginPath(); ctx.moveTo(obs.x + 20, obs.y + 15); ctx.lineTo(obs.x + 10, obs.y + 30); ctx.lineTo(obs.x + 30, obs.y + 30); ctx.closePath(); ctx.fill();
                break;
            case 'snowman': 
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(obs.x + 10, obs.y + 22, 8, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(obs.x + 10, obs.y + 10, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#d35400'; ctx.beginPath(); ctx.moveTo(obs.x + 10, obs.y + 10); ctx.lineTo(obs.x + 18, obs.y + 12); ctx.lineTo(obs.x + 10, obs.y + 14); ctx.closePath(); ctx.fill(); 
                ctx.fillStyle = '#333333'; ctx.fillRect(obs.x + 5, obs.y, 10, 5); ctx.fillRect(obs.x + 2, obs.y + 5, 16, 2); 
                break;
            case 'campfire':
                // Fogueira animada do acampamento base
                ctx.fillStyle = '#424242';
                ctx.beginPath(); ctx.arc(obs.x + 12, obs.y + 16, 11, 0, Math.PI * 2); ctx.fill();
                // Troncos de madeira cruzados
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(obs.x + 3, obs.y + 14, 18, 4);
                ctx.fillRect(obs.x + 10, obs.y + 7, 4, 18);
                // Chamas animadas
                let flameHeight = 10 + Math.sin(Date.now() * 0.015) * 3;
                ctx.fillStyle = '#e67e22';
                ctx.beginPath();
                ctx.moveTo(obs.x + 5, obs.y + 16);
                ctx.lineTo(obs.x + 12, obs.y + 16 - flameHeight);
                ctx.lineTo(obs.x + 19, obs.y + 16);
                ctx.closePath(); ctx.fill();
                // Núcleo amarelo
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.moveTo(obs.x + 8, obs.y + 16);
                ctx.lineTo(obs.x + 12, obs.y + 18 - flameHeight);
                ctx.lineTo(obs.x + 16, obs.y + 16);
                ctx.closePath(); ctx.fill();
                break;
            case 'trail_sign':
                // Placa de trilha da montanha
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(obs.x + 8, obs.y + 8, 4, obs.h - 8);
                ctx.fillStyle = '#8d6e63';
                ctx.fillRect(obs.x, obs.y, obs.w, 12);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 7px monospace';
                ctx.fillText('▲ CUME', obs.x + 2, obs.y + 9);
                break;
            case 'climbing_gear':
                // Mochila e cordas de escalada
                ctx.fillStyle = '#1565c0';
                ctx.fillRect(obs.x + 2, obs.y + 4, 12, 14); // Mochila
                ctx.fillStyle = '#0d47a1';
                ctx.fillRect(obs.x + 4, obs.y + 7, 8, 5);
                // Corda enrolada
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(obs.x + 18, obs.y + 11, 6, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'scoreboard': 
                ctx.fillStyle = '#2c3e50'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2; ctx.strokeRect(obs.x + 2, obs.y + 2, obs.w - 4, obs.h - 4);
                ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 12px monospace'; ctx.fillText('00', obs.x + 10, obs.y + 25);
                ctx.fillStyle = '#3498db'; ctx.fillText('00', obs.x + 35, obs.y + 25);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(obs.x + obs.w / 2 - 1, obs.y + 5, 2, obs.h - 10);
                break;
            case 'punching_bag':
                if (imgBoxeSacoPancada.complete && imgBoxeSacoPancada.naturalWidth > 0) {
                    ctx.drawImage(imgBoxeSacoPancada, obs.x, obs.y, obs.w, obs.h);
                } else {
                    ctx.fillStyle = '#c0392b'; ctx.fillRect(obs.x + 4, obs.y + 8, obs.w - 8, obs.h - 12);
                }
                break;
            case 'bench_press':
                ctx.fillStyle = '#2c3e50'; ctx.fillRect(obs.x, obs.y + 10, obs.w, 10);
                ctx.fillStyle = '#7f8c8d'; ctx.fillRect(obs.x + 5, obs.y, 4, 15); ctx.fillRect(obs.x + obs.w - 9, obs.y, 4, 15);
                ctx.fillStyle = '#bdc3c7'; ctx.fillRect(obs.x + 2, obs.y + 2, obs.w - 4, 3);
                ctx.fillStyle = '#111111'; ctx.fillRect(obs.x, obs.y - 2, 4, 10); ctx.fillRect(obs.x + obs.w - 4, obs.y - 2, 4, 10);
                break;
            case 'judges_table':
                ctx.fillStyle = '#34495e'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.fillStyle = '#2c3e50'; ctx.fillRect(obs.x + 2, obs.y + 2, obs.w - 4, obs.h - 4);
                ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(obs.x + 10, obs.y + 10, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff'; ctx.fillRect(obs.x + 22, obs.y + 6, 16, 12);
                break;
            case 'corner_stool':
                ctx.fillStyle = '#e74c3c'; ctx.fillRect(obs.x + 4, obs.y + 6, obs.w - 8, 8);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(obs.x + 6, obs.y + 2, 10, 6);
                ctx.fillStyle = '#3498db'; ctx.fillRect(obs.x + 20, obs.y + 2, 5, 10);
                break;
        }
    });
}

function drawHUB() {
    drawOverworldHub();
}

function drawIlhaEsqui() {
    drawOverworldBase("ILHA_ESQUI");
    ctx.save();
    ctx.fillStyle="#68464b";ctx.fillRect(38,52,60,198);ctx.fillRect(352,52,60,198);
    
// 3. Ringue Central de Boxe Elevado (3D Isométrico Pixel Art)
    const rx = 130, ry = 55, rw = 190, rh = 115;
    
    // Sombra do ringue
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(rx + 6, ry + 6, rw, rh + 6);

    // Plataforma de madeira do ringue (apron)
    ctx.fillStyle = "#212f3d";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = "#17202a";
    ctx.fillRect(rx, ry + rh, rw, 6);

    // Lona azul do ringue de combate
    ctx.fillStyle = "#1f4068";
    ctx.fillRect(rx + 10, ry + 10, rw - 20, rh - 20);

    // Círculo central da lona com estrela
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx + 18, ry + 18, rw - 36, rh - 36);
    ctx.beginPath();
    ctx.arc(rx + rw / 2, ry + rh / 2, 22, 0, Math.PI * 2);
    ctx.stroke();
    
    // Logo central "GALAXY BOXE"
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GALAXY BOXE", rx + rw / 2, ry + rh / 2 + 3);
    ctx.textAlign = "left";

    // Degraus / Escada de Acesso ao Ringue (Sul)
    ctx.fillStyle = "#566573";
    ctx.fillRect(205, ry + rh, 40, 8);
    ctx.fillStyle = "#808b96";
    ctx.fillRect(208, ry + rh + 2, 34, 4);

    // Cordas do Ringue (Vermelha, Branca, Azul)
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 4, ry + 4, rw - 8, rh - 8);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx + 6, ry + 6, rw - 12, rh - 12);

    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 8, ry + 8, rw - 16, rh - 16);

    // Vão da escada no sul (cordas abertas para o lutador entrar no ringue)
    ctx.fillStyle = "#1f4068";
    ctx.fillRect(205, ry + rh - 10, 40, 10);

    // 4 Postes de Canto (Turnbuckles)
    ctx.fillStyle = "#c0392b"; ctx.fillRect(rx, ry - 4, 8, 14); // Canto Vermelho
    ctx.fillStyle = "#ecf0f1"; ctx.fillRect(rx + rw - 8, ry - 4, 8, 14); // Neutro
    ctx.fillStyle = "#ecf0f1"; ctx.fillRect(rx, ry + rh - 10, 8, 14); // Neutro
    ctx.fillStyle = "#2980b9"; ctx.fillRect(rx + rw - 8, ry + rh - 10, 8, 14); // Canto Azul

    // Holofotes de Estádio (Luz suave projetada no ringue)
    ctx.fillStyle = "rgba(255, 241, 118, 0.08)";
    ctx.beginPath();
    ctx.moveTo(rx - 20, 0);
    ctx.lineTo(rx + rw + 20, 0);
    ctx.lineTo(rx + rw - 10, ry + rh);
    ctx.lineTo(rx + 10, ry + rh);
    ctx.closePath();
    ctx.fill();

    // 4. Setor de Treinamento (Oeste)
    ctx.fillStyle = "#1b2631";
    ctx.fillRect(38, 55, 60, 195);
    ctx.strokeStyle = "#f39c12";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(38, 55, 60, 195);

    // Suporte dos Sacos de Pancada (Viga de ferro)
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(40, 58, 56, 4);

    // 5. Setor de Oficiais e Troféus (Leste)
    ctx.fillStyle = "#1b2631";
    ctx.fillRect(352, 55, 60, 195);
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(352, 55, 60, 195);

    // Pedestal do Troféu da Luva de Ouro
    ctx.fillStyle = "#34495e";
    ctx.fillRect(367, 195, 30, 20);
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(382, 190, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(379, 196, 6, 8);

    // Caminho de saída ao Sul (volta para o HUB)

    finishOverworldIsland("ILHA_ESQUI");
}

function drawIlhaPingPong() {
    drawOverworldBase("ILHA_PINGPONG");
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    
    // Demonstração central: aprendiz à esquerda, Mestre/time azul à direita.
    const arenaX = 104, arenaY = 114, arenaW = 242, arenaH = 110;
    ctx.fillStyle = "#285f7e"; // Azul clássico de competição ITTF
    ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
    ctx.strokeStyle = "#e3f2fd";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(arenaX, arenaY, arenaW, arenaH);

    // Divisórias de Quadra (Surrounds vermelhos com acabamento)
    ctx.fillStyle = "#a64e53";
    ctx.fillRect(arenaX - 2, arenaY - 6, arenaW + 4, 5);
    ctx.fillRect(arenaX - 2, arenaY + arenaH + 1, arenaW + 4, 5);
    ctx.fillRect(arenaX + arenaW + 1, arenaY - 6, 5, arenaH + 12);
    // Suportes metálicos dos surrounds
    ctx.fillStyle = "#eceff1";
    for (let bx = arenaX + 10; bx < arenaX + arenaW; bx += 32) {
        ctx.fillRect(bx, arenaY - 8, 2, 8);
        ctx.fillRect(bx, arenaY + arenaH, 2, 8);
    }

    // 4. MESA OFICIAL DE PING-PONG (LANDMARK PRINCIPAL)
    const tblX = 182, tblY = 144, tblW = 86, tblH = 46;
    
    // Sombra da mesa no solo
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(tblX + tblW / 2, tblY + tblH - 2, tblW / 2 + 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cavalete metálico / pernas da mesa
    ctx.fillStyle = "#263238";
    ctx.fillRect(tblX + 10, tblY + 22, 4, 20);
    ctx.fillRect(tblX + 18, tblY + 22, 4, 20);
    ctx.fillRect(tblX + 8, tblY + 38, 16, 3);
    ctx.fillRect(tblX + tblW - 22, tblY + 22, 4, 20);
    ctx.fillRect(tblX + tblW - 14, tblY + 22, 4, 20);
    ctx.fillRect(tblX + tblW - 24, tblY + 38, 16, 3);
    ctx.fillRect(tblX + tblW / 2 - 2, tblY + 24, 4, 18);
    ctx.fillStyle = "#90a4ae";
    ctx.fillRect(tblX + 6, tblY + 41, 6, 3);
    ctx.fillRect(tblX + tblW - 12, tblY + 41, 6, 3);

    // Borda lateral espessa 3D do tampo
    ctx.fillStyle = "#0a3880";
    ctx.fillRect(tblX, tblY + 3, tblW, tblH - 14);

    // Tampo superior oficial (Azul ITTF vibrante)
    ctx.fillStyle = "#0d47a1";
    ctx.fillRect(tblX, tblY, tblW, tblH - 16);

    // Linha branca perimetral oficial (2px)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(tblX + 1, tblY + 1, tblW - 2, tblH - 18);

    // Linha branca central (divisão de duplas)
    ctx.beginPath();
    ctx.moveTo(tblX + 1, tblY + (tblH - 16) / 2);
    ctx.lineTo(tblX + tblW - 1, tblY + (tblH - 16) / 2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rede Central (Net) com postes metálicos
    const netX = tblX + tblW / 2;
    ctx.fillStyle = "#212121";
    ctx.fillRect(netX - 2, tblY - 5, 4, 6);
    ctx.fillRect(netX - 2, tblY + tblH - 17, 4, 6);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillRect(netX - 1, tblY - 4, 2, tblH - 14);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(netX - 1.5, tblY - 5, 3, 2);
    ctx.fillRect(netX - 1.5, tblY + tblH - 18, 3, 2);

    // Raquetes de Ping-Pong apoiadas sobre a mesa
    ctx.fillStyle = "#d7ccc8";
    ctx.fillRect(tblX + 16, tblY + 8, 7, 3);
    ctx.fillStyle = "#d32f2f";
    ctx.beginPath();
    ctx.ellipse(tblX + 26, tblY + 9, 5, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d7ccc8";
    ctx.fillRect(tblX + tblW - 24, tblY + 16, 7, 3);
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.ellipse(tblX + tblW - 32, tblY + 17, 5, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Bolinhas de Ping-Pong
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(tblX + 42, tblY + 11, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff9800";
    ctx.beginPath();
    ctx.arc(tblX + 65, tblY + tblH + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cesto de Bolinhas de Treino ao Lado da Mesa
    const bktX = 280, bktY = 166;
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(bktX - 2, bktY + 18, 20, 4);
    ctx.strokeStyle = "#78909c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bktX + 8, bktY + 10); ctx.lineTo(bktX + 2, bktY + 19);
    ctx.moveTo(bktX + 8, bktY + 10); ctx.lineTo(bktX + 14, bktY + 19);
    ctx.stroke();
    ctx.fillStyle = "#37474f";
    ctx.fillRect(bktX, bktY, 16, 11);
    ctx.fillStyle = "#ffffff";
    for (let bi = 0; bi < 8; bi++) {
        ctx.beginPath();
        ctx.arc(bktX + 3 + (bi % 4) * 3.5, bktY + 2 + Math.floor(bi / 4) * 4, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Placar cenográfico: não modifica a pontuação real do minigame.
    const scbX = 173, scbY = 60;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(scbX, scbY, 104, 38);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(scbX, scbY, 104, 38);
    ctx.textAlign = "center";
    ctx.font = "bold 6px monospace";
    ctx.fillStyle = "#74caff";
    ctx.fillText("MESTRE", scbX + 79, scbY + 10);
    ctx.fillStyle = "#ff9696";
    ctx.fillText("APRENDIZ", scbX + 25, scbY + 10);
    ctx.font = "bold 17px monospace";
    ctx.fillStyle = "#61bfff"; ctx.fillText("50", scbX + 79, scbY + 30);
    ctx.fillStyle = "#c4d3e6"; ctx.fillText("×", scbX + 52, scbY + 29);
    ctx.fillStyle = "#ff8585"; ctx.fillText("0", scbX + 25, scbY + 30);
    ctx.font = "bold 7px monospace";
    ctx.fillStyle = "#ffb6b6"; ctx.fillText("0 PONTOS", 138, 207);
    ctx.fillStyle = "#a0dcff"; ctx.fillText("AZUL", 312, 207);
    ctx.textAlign = "left";

    // 7. Área de Descanso do Aprendiz (Oeste)
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(52, 192, 42, 14);
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(52, 190, 42, 4);
    ctx.fillStyle = "#00bcd4";
    ctx.fillRect(58, 184, 5, 7);
    ctx.fillStyle = "#fff";
    ctx.fillRect(72, 186, 12, 6);

    // 8. Caminhos de Conexão (Piso antiderrapante)



    ctx.restore();
    finishOverworldIsland("ILHA_PINGPONG");
}

function drawIlhaSkate() {
    drawOverworldBase("ILHA_SKATE");
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="#26445c";ctx.fillRect(360,52,46,28);ctx.fillRect(360,228,46,28);
    ctx.fillStyle="#587658";ctx.fillRect(363,55,40,22);ctx.fillRect(363,231,40,22);
    
    // Quarter-pipe: superfície curva, face estrutural e coping legíveis.
    const qX = 52, qY = 46, qW = 72, qH = 46;
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(qX + 2, qY + qH, qW + 4, 6);
    // Face lateral sustentada no chão; a curva mostra a transição vertical.
    ctx.fillStyle = "#405865";
    ctx.beginPath();
    ctx.moveTo(qX + qW, qY);
    ctx.quadraticCurveTo(qX + qW, qY + 30, qX + 52, qY + qH);
    ctx.lineTo(qX + qW, qY + qH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#b8cbd1";
    ctx.beginPath();
    ctx.moveTo(qX + 18, qY); ctx.lineTo(qX + qW, qY);
    ctx.quadraticCurveTo(qX + qW, qY + 30, qX + 52, qY + qH);
    ctx.lineTo(qX, qY + qH);
    ctx.quadraticCurveTo(qX + 18, qY + 30, qX + 18, qY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#718d9a"; ctx.lineWidth = 1.5; ctx.stroke();
    // Deck e borda metálica no alto, sem grafite usado como substituto da forma.
    ctx.fillStyle = "#546e7a";
    ctx.fillRect(qX + 18, qY - 8, qW - 18, 8);
    ctx.fillStyle = "#ecf2f3"; ctx.fillRect(qX + 18, qY - 2, qW - 18, 3);
    ctx.fillStyle = "#62d7df"; ctx.fillRect(qX + 18, qY - 2, qW - 18, 1);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(qX + 15, qY + 17); ctx.lineTo(qX + 69, qY + 17);
    ctx.moveTo(qX + 10, qY + 32); ctx.lineTo(qX + 63, qY + 32); ctx.stroke();
    ctx.strokeStyle = "#263e4c";
    ctx.beginPath(); ctx.moveTo(qX + 67, qY + 31); ctx.lineTo(qX + 68, qY + qH - 2); ctx.stroke();
    // Skate estacionado na base, incluído no mesmo elemento cenográfico.
    ctx.fillStyle = "#263541"; ctx.beginPath(); ctx.roundRect(qX + 22, qY + 38, 25, 5, 2.5); ctx.fill();
    ctx.fillStyle = "#deac65"; ctx.fillRect(qX + 26, qY + 39, 17, 2);
    ctx.fillStyle = "#223541";
    for (const wheelX of [qX + 27, qX + 42]) {
        ctx.beginPath(); ctx.arc(wheelX, qY + 44, 2, 0, Math.PI * 2); ctx.fill();
    }

    // 4. CORRIMÃO TUBULAR DE AÇO INOX (GRIND RAIL)
    const rlX = 295, rlY = 180, rlW = 72, rlH = 14;
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(rlX, rlY + rlH, rlW, 3);
    ctx.fillStyle = "#607d8b";
    ctx.fillRect(rlX + 10, rlY + 3, 4, rlH - 3);
    ctx.fillRect(rlX + rlW - 14, rlY + 3, 4, rlH - 3);
    ctx.fillStyle = "#37474f";
    ctx.fillRect(rlX + 7, rlY + rlH - 2, 10, 2);
    ctx.fillRect(rlX + rlW - 17, rlY + rlH - 2, 10, 2);
    ctx.fillStyle = "#b5c9d1";
    ctx.fillRect(rlX, rlY, rlW, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(rlX, rlY, rlW, 1.5);
    ctx.fillStyle="#62d7df";ctx.fillRect(rlX,rlY,rlW,1);
    // Marcas de atrito e cera preta
    ctx.fillStyle = "#212121";
    ctx.fillRect(rlX + 20, rlY + 3, 14, 1.5);
    ctx.fillRect(rlX + 48, rlY + 3, 10, 1.5);

    // 5. SKATE LEDGE / BANCO DE PRAÇA COM CANTONEIRA
    const ldX = 64, ldY = 190, ldW = 58, ldH = 20;
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(ldX, ldY + ldH, ldW, 4);
    ctx.fillStyle = "#78909c";
    ctx.fillRect(ldX, ldY, ldW, ldH);
    ctx.fillStyle = "#b0bec5";
    ctx.fillRect(ldX + 2, ldY + 2, ldW - 4, ldH - 4);
    ctx.fillStyle = "#eceff1";
    ctx.fillRect(ldX, ldY, ldW, 3);
    ctx.fillStyle = "#263238";
    ctx.fillRect(ldX + 12, ldY + 1, 18, 2);
    ctx.fillRect(ldX + 38, ldY + 1, 14, 2);

    // 6. SKATEBOARDS DECORATIVOS ENCOSTADOS
    ctx.fillStyle = "#e91e63";
    ctx.fillRect(ldX + ldW + 4, ldY + 4, 14, 5);
    ctx.fillStyle = "#212121";
    ctx.fillRect(ldX + ldW + 5, ldY + 5, 12, 3);
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(ldX + ldW + 3, ldY + 3, 3, 2);
    ctx.fillRect(ldX + ldW + 16, ldY + 8, 3, 2);

    // 7. CONES DE SLALOM LARANJAS
    [ { x: 135, y: 225 }, { x: 340, y: 70 } ].forEach(c => {
        ctx.fillStyle = "#ff5722";
        ctx.beginPath();
        ctx.moveTo(c.x + 6, c.y); ctx.lineTo(c.x, c.y + 12); ctx.lineTo(c.x + 12, c.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(c.x + 3, c.y + 5, 6, 2);
    });

    // 8. Caminhos de Conexão




    ctx.restore();
    finishOverworldIsland("ILHA_SKATE");
}

function drawIlhaBasquete() {
    drawWater();
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Água noturna com reflexos: a ilha deixa de ser um bloco retangular isolado.
    ctx.fillStyle = "rgba(16, 42, 85, 0.42)";
    for (let y = 12; y < 300; y += 24) {
        for (let x = (y / 24) % 2 ? 8 : 26; x < 450; x += 58) {
            ctx.fillRect(x, y, 20, 2);
        }
    }
    ctx.fillStyle = "rgba(102, 220, 236, 0.5)";
    for (let i = 0; i < 10; i++) {
        const shimmerX = (i * 47 + 19) % 438;
        const shimmerY = 20 + ((i * 31) % 258);
        ctx.fillRect(shimmerX, shimmerY, 9, 2);
    }

    // Plataforma da arena: cantos chanfrados e uma borda de proteção fazem a cena parecer uma ilha esportiva.
    ctx.beginPath();
    ctx.moveTo(36, 18); ctx.lineTo(414, 18); ctx.lineTo(434, 38); ctx.lineTo(434, 262);
    ctx.lineTo(414, 282); ctx.lineTo(36, 282); ctx.lineTo(16, 262); ctx.lineTo(16, 38);
    ctx.closePath();
    ctx.fillStyle = "#14314f";
    ctx.fill();
    ctx.strokeStyle = "#62d7df";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(42, 27); ctx.lineTo(408, 27); ctx.lineTo(424, 43); ctx.lineTo(424, 257);
    ctx.lineTo(408, 273); ctx.lineTo(42, 273); ctx.lineTo(26, 257); ctx.lineTo(26, 43);
    ctx.closePath();
    ctx.fillStyle = "#26445c";
    ctx.fill();

    // Luzes discretas do perímetro da arena.
    ctx.fillStyle = "#f3ca63";
    [60, 130, 200, 270, 340, 390].forEach(x => {
        ctx.fillRect(x, 29, 8, 3);
        ctx.fillRect(x, 268, 8, 3);
    });
    [70, 230].forEach(y => {
        ctx.fillRect(29, y, 3, 8);
        ctx.fillRect(418, y, 3, 8);
    });

    // Piso da quadra. As tábuas variam de tom sem comprometer a leitura top-down.
    const courtX = 42, courtY = 50, courtW = 366, courtH = 198;
    ctx.fillStyle = "#b75f38";
    ctx.fillRect(courtX - 4, courtY - 4, courtW + 8, courtH + 8);
    ctx.fillStyle = "#e19753";
    ctx.fillRect(courtX, courtY, courtW, courtH);
    for (let y = courtY; y < courtY + courtH; y += 11) {
        ctx.fillStyle = ((y - courtY) / 11) % 2 === 0 ? "rgba(255, 231, 165, 0.16)" : "rgba(113, 54, 38, 0.10)";
        ctx.fillRect(courtX, y, courtW, 6);
    }
    ctx.fillStyle = "rgba(123, 58, 41, 0.18)";
    for (let x = courtX + 18; x < courtX + courtW; x += 36) ctx.fillRect(x, courtY, 1, courtH);

    // Marcação completa, com contraste suficiente para navegação e reconhecimento imediato da modalidade.
    const line = "#fff3c8";
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.strokeRect(courtX, courtY, courtW, courtH);
    ctx.beginPath();
    ctx.moveTo(225, courtY); ctx.lineTo(225, courtY + courtH);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(225, 149, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = line;
    ctx.beginPath(); ctx.arc(225, 149, 3, 0, Math.PI * 2); ctx.fill();

    // Garrafões, lances livres e arcos de três pontos nos dois lados.
    const drawKey = (side) => {
        const isLeft = side === "left";
        const keyX = isLeft ? courtX : courtX + courtW - 62;
        const freeX = isLeft ? keyX + 62 : keyX;
        ctx.fillStyle = "rgba(84, 51, 93, 0.20)";
        ctx.fillRect(keyX, 103, 62, 92);
        ctx.strokeStyle = line;
        ctx.lineWidth = 2;
        ctx.strokeRect(keyX, 103, 62, 92);
        ctx.beginPath();
        ctx.arc(freeX, 149, 22, isLeft ? -Math.PI / 2 : Math.PI / 2, isLeft ? Math.PI / 2 : Math.PI * 1.5);
        ctx.stroke();
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(freeX, 149, 22, isLeft ? Math.PI / 2 : -Math.PI / 2, isLeft ? Math.PI * 1.5 : Math.PI / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(isLeft ? courtX + 7 : courtX + courtW - 7, 149, 88, isLeft ? -1.06 : 2.08, isLeft ? 1.06 : 4.20);
        ctx.stroke();
    };
    drawKey("left");
    drawKey("right");

    // Cestas no próprio overworld: tabela, aro e suporte são legíveis, sem se confundirem com os aros físicos do minigame.
    const drawOverworldHoop = (side) => {
        const isLeft = side === "left";
        const boardX = isLeft ? 49 : 401;
        const rimX = isLeft ? 58 : 392;
        ctx.fillStyle = "#d8edf2";
        ctx.fillRect(boardX - 2, 128, 4, 42);
        ctx.fillStyle = "#526a80";
        ctx.fillRect(isLeft ? 34 : 412, 145, 17, 5);
        ctx.fillStyle = "#87a6ba";
        ctx.fillRect(isLeft ? 39 : 394, 151, 5, 19);
        ctx.strokeStyle = "#ffcf42";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rimX, 149, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(245, 250, 255, 0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rimX - 5, 155); ctx.lineTo(rimX, 161); ctx.lineTo(rimX + 5, 155);
        ctx.stroke();
    };
    drawOverworldHoop("left");
    drawOverworldHoop("right");

    // Banners e bolas decorativas dão identidade sem criar obstáculos visuais na linha de caminhada.
    const drawBanner = (x, y, accent) => {
        ctx.fillStyle = "#122a46"; ctx.fillRect(x, y, 22, 30);
        ctx.fillStyle = accent; ctx.fillRect(x + 2, y + 2, 18, 5);
        ctx.strokeStyle = "#f6d36c"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x + 11, y + 18, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 5, y + 18); ctx.lineTo(x + 17, y + 18); ctx.moveTo(x + 11, y + 12); ctx.lineTo(x + 11, y + 24); ctx.stroke();
    };
    drawBanner(58, 61, "#e75c48");
    drawBanner(370, 61, "#51cad3");
    [[72, 228], [378, 228]].forEach(([x, y]) => {
        ctx.fillStyle = "#f28d38";
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#713a2a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
    });

    // Marca de anfitrião: destaca o Mestre sem bloquear a circulação pelo centro da quadra.
    ctx.fillStyle = "rgba(64, 205, 215, 0.24)";
    ctx.beginPath(); ctx.ellipse(225, 84, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f8e8aa";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ARENA 1v1", 225, 42);
    ctx.textAlign = "left";

    // Conexão visual para a ilha do skate; a transição continua usando a borda esquerda do mapa.
    ctx.fillStyle = "#7895a6";
    ctx.fillRect(0, 130, 26, 40);
    ctx.fillStyle = "#a9c6ce";
    ctx.fillRect(4, 134, 22, 32);
    ctx.fillStyle = "#f3ca63";
    ctx.fillRect(11, 145, 12, 8);
    ctx.restore();
}

function drawIlhaArco() {
    drawWater();
    ArcheryIsland.draw(ctx);
    finishOverworldIsland("ILHA_ARCO");
    if (archeryQaParams.has("archeryIslandQa")) {
        canvas.dataset.archeryIslandDiagnostics=JSON.stringify({
            ...getOverworldDiagnostics(),island:ArcheryIsland.diagnostics()
        });
    }
}

function drawIlhaCorrida() {
    drawOverworldBase("ILHA_CORRIDA");
    ctx.save();ctx.imageSmoothingEnabled=false;
    
// 2. Anel de Pista de Tartan Vermelho-Terracota Oficial
    const trackX = 28, trackY = 28, trackW = 394, trackH = 244;
    ctx.fillStyle = "#b4674f"; // Vermelho tijolo oficial de atletismo
    ctx.beginPath();ctx.roundRect(trackX,trackY,trackW,trackH,24);ctx.fill();

    // Gramado Central Interno (Infield)
    const fieldX = 82, fieldY = 76, fieldW = 286, fieldH = 148;
    ctx.fillStyle = "#64845e"; // Grama do campo central
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
    ctx.strokeStyle = "#f4e7c4";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    // Faixas cortadas no gramado central (efeito cortador de grama)
    for (let gy = fieldY; gy < fieldY + fieldH; gy += 20) {
        ctx.fillStyle = ((gy - fieldY) / 20) % 2 === 0 ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
        ctx.fillRect(fieldX, gy, fieldW, 10);
    }

    // 3. Marcações das Raias de Atletismo (3 Raias com linhas brancas contínuas)
    ctx.strokeStyle = "#f4e7c4";
    ctx.lineWidth = 1.5;
    // Raia 1 (Interna)
    ctx.beginPath();ctx.roundRect(trackX + 18, trackY + 16, trackW - 36, trackH - 32,18);ctx.stroke();
    // Raia 2 (Média)
    ctx.beginPath();ctx.roundRect(trackX + 36, trackY + 32, trackW - 72, trackH - 64,18);ctx.stroke();
    // Raia 3 (Externa)
    ctx.beginPath();ctx.roundRect(trackX + 2, trackY + 2, trackW - 4, trackH - 4,18);ctx.stroke();

    // Numeração Oficial das Raias pintada no solo
    ctx.fillStyle = "#f4e7c4";
    ctx.font = "bold 9px monospace";
    ctx.fillText("1", trackX + 24, trackY + 12);
    ctx.fillText("2", trackX + 42, trackY + 12);
    ctx.fillText("3", trackX + 6, trackY + 12);

    // 4. LINHA DE CHEGADA (LANDMARK PRINCIPAL) & PÓRTICO SUSPENSO
    const finX = 202, finY = 126, finW = 46, finH = 18;
    for (let cx = 0; cx < finW; cx += 5) {
        for (let cy = 0; cy < finH; cy += 4.5) {
            ctx.fillStyle = ((Math.floor(cx / 5) + Math.floor(cy / 4.5)) % 2 === 0) ? "#f4e7c4" : "#111111";
            ctx.fillRect(finX + cx, finY + cy, 5, 4.5);
        }
    }
    // Postes laterais do pórtico
    ctx.fillStyle = "#d32f2f";
    ctx.fillRect(finX - 4, finY - 8, 4, finH + 16);
    ctx.fillRect(finX + finW, finY - 8, 4, finH + 16);
    // Banner superior suspenso do pórtico
    ctx.fillStyle = "#b71c1c";
    ctx.fillRect(finX - 6, finY - 14, finW + 12, 9);
    ctx.fillStyle = "#fbc02d";
    ctx.font = "bold 7px monospace";
    ctx.fillText("★ FINISH ★", finX + 3, finY - 7);

    // 5. PÓDIO OLÍMPICO DE PREMIAÇÃO (Sudoeste do campo)
    const podX = 94, podY = 178;
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(podX - 2, podY + 22, 46, 5);
    // 2º Lugar
    ctx.fillStyle = "#90a4ae";
    ctx.fillRect(podX, podY + 7, 13, 16);
    ctx.fillStyle = "#f4e7c4"; ctx.font = "bold 7px monospace"; ctx.fillText("2", podX + 4, podY + 18);
    // 1º Lugar
    ctx.fillStyle = "#fbc02d";
    ctx.fillRect(podX + 14, podY, 14, 23);
    ctx.fillStyle = "#f4e7c4"; ctx.fillText("1", podX + 18, podY + 15);
    // 3º Lugar
    ctx.fillStyle = "#bcaaa4";
    ctx.fillRect(podX + 29, podY + 11, 13, 12);
    ctx.fillStyle = "#f4e7c4"; ctx.fillText("3", podX + 33, podY + 20);

    // 6. ESTAÇÃO DE HIDRATAÇÃO (Noroeste)
    const wstX = 94, wstY = 88;
    ctx.fillStyle = "#1976d2";
    ctx.fillRect(wstX, wstY, 36, 12);
    ctx.fillStyle = "#1565c0";
    ctx.fillRect(wstX, wstY + 10, 36, 2);
    ctx.fillStyle = "#ff9800";
    ctx.fillRect(wstX + 4, wstY - 5, 4, 6);
    ctx.fillRect(wstX + 12, wstY - 5, 4, 6);
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(wstX + 20, wstY - 4, 4, 5);
    ctx.fillRect(wstX + 28, wstY - 4, 4, 5);

    // 7. CONES ESPORTIVOS NAS CURVAS
    [ { x: 45, y: 55 }, { x: 45, y: 235 }, { x: 395, y: 55 }, { x: 395, y: 235 } ].forEach(c => {
        ctx.fillStyle = "#ff6d00";
        ctx.beginPath();
        ctx.moveTo(c.x + 5, c.y); ctx.lineTo(c.x, c.y + 10); ctx.lineTo(c.x + 10, c.y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f4e7c4";
        ctx.fillRect(c.x + 2, c.y + 4, 6, 2);
    });

    // 8. Caminho de Saída Leste (para a Ilha do Skate)


    ctx.restore();
    finishOverworldIsland("ILHA_CORRIDA");
}

function drawIlhaEscalada() {
    drawWater();
    ClimbIsland.draw(ctx);
    drawOverworldConnections("ILHA_ESCALADA");
    drawOverworldMasterMark("ILHA_ESCALADA");
}

function drawSurfIslandShape(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    ctx.fill();
}

function drawSurfIslandAsset(image, centerX, bottomY, height) {
    if (!image.complete || !image.naturalWidth) return;
    const width = Math.round(height * image.naturalWidth / image.naturalHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(centerX - width / 2), Math.round(bottomY - height), width, height);
}

function drawIlhaSurf() {
    drawOverworldBase("ILHA_SURF");
    ctx.save();
    
// Manchas de areia e um corredor claro até o mestre, sem bloquear a navegação.
    drawSurfIslandShape([187, 149, 263, 149, 259, 174, 271, 209, 258, 253,
        253, 279, 197, 279, 192, 252, 179, 209, 191, 174], "#ffefb7");
    ctx.fillStyle = "#e7c982";
    for (let i = 0; i < 44; i++) {
        const x = 34 + (i * 97) % 383;
        const y = 41 + (i * 53) % 210;
        if (x > 176 && x < 274 && y > 142) continue;
        ctx.fillRect(x, y, i % 3 === 0 ? 3 : 2, 1);
    }
    ctx.fillStyle = "#fffdf0";
    for (let x = 31; x < 417; x += 36) {
        ctx.fillRect(x, 30 + (x % 4), 12, 2);
        ctx.fillRect(x + 8, 260 - (x % 5), 9, 2);
    }

    // Boardwalk stage, scaled to the same host footprint as the other sports.
    ctx.fillStyle="#26445c";ctx.fillRect(183,97,84,25);
    ctx.fillStyle="#af8d60";ctx.fillRect(186,98,78,18);
    ctx.fillStyle="#e3c391";
    for(let x=190;x<262;x+=12)ctx.fillRect(x,99,1,16);
    ctx.fillStyle="#62d7df";ctx.fillRect(183,119,84,2);

    // Decoração de praia com os recortes oficiais, mantendo o centro livre.
    drawSurfIslandAsset(surfIslandDecor.palm, 58, 109, 80);
    drawSurfIslandAsset(surfIslandDecor.palm, 392, 109, 80);
    drawSurfIslandAsset(surfIslandDecor.umbrella, 96, 229, 64);
    drawSurfIslandAsset(surfIslandDecor.towel, 117, 249, 34);
    drawSurfIslandAsset(surfIslandDecor.cooler, 151, 239, 32);
    drawSurfIslandAsset(surfIslandDecor.sign, 353, 208, 52);

    ctx.restore();

    finishOverworldIsland("ILHA_SURF");
}

// -------------------------------------------------------------
// 7. RENDERIZADOR DO PING PONG E HUD GERAL
// -------------------------------------------------------------
function drawPingPongGame() {
    ctx.imageSmoothingEnabled = false;

    if (bgPingPong.complete && bgPingPong.naturalWidth > 0) {
        const art = PINGPONG_COURT.artwork;
        const sx = bgPingPong.naturalWidth / art.width;
        const sy = bgPingPong.naturalHeight / art.height;
        ctx.drawImage(bgPingPong, art.x * sx, art.y * sy, art.w * sx, art.h * sy,
            0, 0, canvas.width, canvas.height);
    }

    let zorpSpriteImg = imgZorpIdle;
    if (pingPong.playerAction === "MOVE_UP") zorpSpriteImg = imgZorpMU;
    else if (pingPong.playerAction === "MOVE_DOWN") zorpSpriteImg = imgZorpMD;
    else if (pingPong.playerAction === "HIT") zorpSpriteImg = imgZorpHit;

    let mestreSpriteImg = imgMestreIdle;
    if (pingPong.opponentAction === "MOVE_UP") mestreSpriteImg = imgMestreMU;
    else if (pingPong.opponentAction === "MOVE_DOWN") mestreSpriteImg = imgMestreMD;
    else if (pingPong.opponentAction === "HIT") mestreSpriteImg = imgMestreHit;
    if (pingPong.multiball.phase === "PREPARING_MULTIBALL") mestreSpriteImg = imgMestreHit;

    drawShadow(pingPong.playerX + 18, pingPong.playerY + 45);
    drawShadow(pingPong.opponentX + 18, pingPong.opponentY + 45);

    if (zorpSpriteImg.complete) ctx.drawImage(zorpSpriteImg, pingPong.playerX, pingPong.playerY, 36, 48);
    if (mestreSpriteImg.complete) ctx.drawImage(mestreSpriteImg, pingPong.opponentX, pingPong.opponentY, 36, 48);

    // Esforço e cansaço ao acompanhar a trajetória pós-quique.
    if (pingPong.mestreReaction) {
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(pingPong.mestreReaction.text, pingPong.opponentX + 10, pingPong.opponentY - 8);
    }

    // A single exaggerated racket swing, attached to Zorp, never a radial blast.
    for (const effect of pingPong.specialEffects) {
        const t = effect.age / effect.lifetime;
        const x = pingPong.playerX + 29, y = pingPong.playerY + 23;
        ctx.save(); ctx.globalAlpha = (1 - t) * 0.85;
        ctx.strokeStyle = '#b9faff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x - 7, y, 12 + t * 10, -1.2 + t * 0.4, 0.9 + t * 0.4); ctx.stroke();
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - 9, y + 1, 16 + t * 8, -1.0, 0.65); ctx.stroke();
        ctx.fillStyle = '#efffff'; ctx.fillRect(x - 2, y - 4, 4, 8);
        ctx.restore();
    }

    // Subtle projected contact marker; the outgoing attack remains a reaction.
    for (const ball of pingPong.balls) PingPongBall.drawTelegraph(ctx, ball);

    // Efeitos Visuais de Quique
    if (pingPong.bounceEffects) {
        pingPong.bounceEffects.forEach(b => {
            ctx.save();
            ctx.strokeStyle = b.color || "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = Math.max(0, b.alpha);
            ctx.beginPath();
            if (b.racketHit) {
                ctx.moveTo(b.x - b.radius, b.y + b.radius); ctx.lineTo(b.x + b.radius, b.y - b.radius);
                ctx.moveTo(b.x - b.radius, b.y - 2); ctx.lineTo(b.x + b.radius, b.y + 2);
            } else ctx.ellipse(b.x, b.y, b.radius * 1.5, b.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
    }

    // RENDERIZAÇÃO DAS BOLAS ATIVAS (MULTI-BOLAS)
    for (let b of pingPong.balls) {
        ctx.save();
        // Rastro luminoso individual
        if (b.trail && b.trail.length > 0 && (b.attackSpeed >= 6.7 || b.isSuper || b.specialTicks > 0)) {
            for (let i = 0; i < b.trail.length; i++) {
                let tr = b.trail[i];
                let trRad = Math.max(1.5, b.radius * (i / b.trail.length));
                ctx.save();
                ctx.globalAlpha = tr.alpha * (b.specialTicks > 0 ? 0.65 : 0.45);
                let trailColor = b.isSuper || b.specialTicks > 0 ? "#00e5ff" : (b.attackSpeed >= 7.5 ? "#ff7658" : "#ffe19a");
                ctx.fillStyle = trailColor;
                ctx.beginPath();
                ctx.arc(tr.x, tr.y, trRad, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Sombra 3D da Bolinha
        let shadowRadius = Math.max(1, b.radius * (1 - b.z / 90));
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, shadowRadius * 1.4, shadowRadius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Posição 3D da Bolinha (Y_draw = Y - Z)
        let bDrawY = b.y - b.z;
        if (b.state === PingPongBall.STATES.MISSED) {
            ctx.fillStyle = '#cbd5e1'; ctx.shadowBlur = 0;
        } else if (b.isSuper || b.specialTicks > 0) {
            ctx.fillStyle = "#bcfaff"; ctx.shadowBlur = 6; ctx.shadowColor = "#00e5ff";
        } else if (b.attackSpeed >= 7.5) {
            ctx.fillStyle = "#ff7658"; ctx.shadowBlur = 5; ctx.shadowColor = "#ff7455";
        } else if (b.attackSpeed >= 6.3) {
            ctx.fillStyle = "#ffce67"; ctx.shadowBlur = 3; ctx.shadowColor = "#ffeb3b";
        } else {
            ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        if (b.state === PingPongBall.STATES.TABLE_BOUNCE || b.state === PingPongBall.STATES.SERVE_OWN_BOUNCE) {
            ctx.ellipse(b.x, bDrawY, b.radius * 1.45, b.radius * 0.62, 0, 0, Math.PI * 2);
        } else {
            ctx.arc(b.x, bDrawY, b.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
    for (const effect of pingPong.pointFeedback) {
        ctx.save(); ctx.strokeStyle = effect.color; ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.phase === 'MISS' ? 0.9 : Math.min(1, effect.timer / 12);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.phase === 'MISS' ? 9 : 10 + (26 - effect.timer) * 0.25, 0, Math.PI * 2); ctx.stroke();
        if (effect.phase === 'POINT') {
            ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText('+1', Math.max(20, Math.min(430, effect.x)), Math.max(65, effect.y - 14));
        }
        ctx.restore();
    }

    // -------------------------------------------------------------
    // PLACAR ARCADE ELETRÔNICO (CENTRALIZADO ACIMA DA MESA - META: 50)
    // -------------------------------------------------------------
    const boardX = 135, boardY = 8, boardW = 180, boardH = 34;
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boardX, boardY, boardW, boardH);

    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`ZORP ${String(pingPong.playerScore).padStart(2, '0')}`, boardX + 10, boardY + 22);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`x`, boardX + boardW / 2, boardY + 16);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`META: 50`, boardX + boardW / 2, boardY + 28);

    ctx.fillStyle = "#ff5722";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${String(pingPong.opponentScore).padStart(2, '0')} MESTRE`, boardX + boardW - 10, boardY + 22);
    ctx.textAlign = "left";

    PingPongMultiball.draw(ctx, pingPong.multiball, pingPong);

    // Informações Adicionais: Bolas em jogo e Barra de Especial
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`BOLAS EM JOGO: ${pingPong.balls.filter(b => b.state !== PingPongBall.STATES.MISSED).length}`, 328, 22);

    // Indicador Dinâmico de Rali
    if (pingPong.rallyHits > 0) {
        ctx.font = "bold 10px monospace";
        if (pingPong.rallyHits >= 13) {
            ctx.fillStyle = (Date.now() % 200 < 100) ? "#e74c3c" : "#f1c40f";
            ctx.fillText(`⚡ RALI: ${pingPong.rallyHits}x (VELOCIDADE MÁXIMA!) ⚡`, 125, 52);
        } else if (pingPong.rallyHits >= 4) {
            ctx.fillStyle = "#ffeb3b";
            ctx.fillText(`RALI: ${pingPong.rallyHits}x (ACELERADO)`, 150, 52);
        } else {
            ctx.fillStyle = "#2ecc71";
            ctx.fillText(`RALI: ${pingPong.rallyHits}x`, 185, 52);
        }
    }

    // Barra de Energia do Super Smash
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(15, 12, 100, 10);
    let barraPreenchida = (pingPong.power / pingPong.maxPower) * 100;
    if (pingPong.power >= pingPong.maxPower) {
        ctx.fillStyle = pingPong.globalReturnCooldown > 0 ? '#607d8b' : (Date.now() % 300 < 150) ? "#00e5ff" : "#ffea00";
        ctx.fillRect(15, 12, 100, 10);
        ctx.fillStyle = "#00e5ff";
        ctx.font = "bold 8px monospace";
        ctx.fillText(pingPong.globalReturnCooldown > 0 ? `RECARGA: ${(pingPong.globalReturnCooldown / 60).toFixed(1)}s` : "ESPAÇO: RAQUETADA!", 15, 32);
    } else {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(15, 12, barraPreenchida, 10);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "8px monospace";
        ctx.fillText(`ESPECIAL: ${Math.floor(barraPreenchida)}%`, 15, 32);
    }
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 12, 100, 10);

    // OVERLAYS (Telas)
    if (pingPong.gameState === 'TUTORIAL') {
        drawOverlayScreen("PING PONG TENGU", [
            "Partida até 50 pontos para a glória!",
            "[W / S]: Direcionar bola para ponta superior ou inferior.",
            "[A / D]: Recuar para amortecer | Avançar para bater rápido.",
            "O Mestre lança novas bolas conforme a disputa se intensifica!",
            "Em alta velocidade, o Mestre não consegue reagir a tempo.",
            "[ESPAÇO] com a barra cheia: RAQUETADA GLOBAL!"
        ], "#00e5ff");
    } else if (pingPong.gameState === 'GAMEOVER') {
        if (pingPong.win) {
            drawOverlayScreen("VITÓRIA LENDÁRIA!", ["Você atingiu 50 pontos e", "conquistou a Insígnia do Ping-Pong!"], "#2ecc71");
        } else {
            drawOverlayScreen("DERROTA...", ["O Mestre atingiu 50 pontos primeiro.", "Aperte ESPAÇO para tentar novamente!"], "#e74c3c");
        }
    }
}

// -------------------------------------------------------------
// 7.1. HUD compartilhado de medalhas do OverWorld
// -------------------------------------------------------------

function drawHUD() {
    if (typeof drawMedalhasHUD === "function") {
        drawMedalhasHUD(ctx, canvas, insignias);
    }
}

// -------------------------------------------------------------
// 8. LOOP PRINCIPAL
// -------------------------------------------------------------
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (typeof TitleScreen !== "undefined" && TitleScreen.isActive()) {
        TitleScreen.draw(ctx);
        return;
    }
    if (AdventureIntro.active) { AdventureIntro.draw(ctx); return; }
    if (EndingCinematic.active) { EndingCinematic.draw(ctx); return; }
    if (CaptainRoute.active && ['FERIAS_MERECIDAS','ENDING_CARD'].includes(CaptainRoute.state)) { CaptainRoute.draw(ctx); return; }

    const displayScene = MastersFarewell.displayScene(currentScene);
    if (displayScene === "HUB") drawHUB();
    else if (currentScene === "ILHA_ESQUI") drawIlhaEsqui();
    else if (currentScene === "ILHA_PINGPONG") drawIlhaPingPong();
    else if (currentScene === "ILHA_SKATE") drawIlhaSkate();
    else if (currentScene === "ILHA_BASQUETE") drawIlhaBasquete();
    else if (currentScene === "ILHA_ARCO") drawIlhaArco();
    else if (currentScene === "ILHA_CORRIDA") drawIlhaCorrida();
    else if (currentScene === "ILHA_ESCALADA") drawIlhaEscalada();
    else if (currentScene === "ILHA_SURF") drawIlhaSurf();
    else if (currentScene === "JOGO_PINGPONG") drawPingPongGame();
    else if (currentScene === "JOGO_ARCO") drawArcoGame();
    else if (currentScene === BASKETBALL_SCENE) window.drawBasketball1v1();
    else if (currentScene === "JOGO_ESCALADA") drawEscaladaGame();
    else if (currentScene === "JOGO_BOXE") drawBoxeGame();
    else if (currentScene === "JOGO_SKATE") drawSkateGame();
    else if (currentScene === "JOGO_CORRIDA") window.drawCorridaMaratona();
    else if (currentScene === SURF_SCENE) window.drawSurfMinigame();
    
    if (!currentScene.startsWith("JOGO_")) {
        drawSceneObstacles();
        if (currentScene === "ILHA_BASQUETE") {
            // Frozen reference: preserve the original actor order and presentation.
            for (const npc of npcs) if (npc.scene === currentScene) drawNPC(npc);
            drawPlayer();
        } else {
            const actors = npcs.filter(npc => npc.scene === displayScene)
                .map(npc => ({ y: npc.y, draw: () => drawNPC(npc) }));
            if (displayScene === "HUB" && AdventureIntro.introSeen) {
                actors.push({ y: 150, draw: () => AdventureIntro.drawParked(ctx) });
            }
            actors.push(...MastersFarewell.actors(displayScene));
            actors.push({ y: player.y, draw: drawPlayer });
            actors.sort((a,b) => a.y - b.y).forEach(actor => actor.draw());
        }
        drawHUD();
        if (!MastersFarewell.active) MedalCompletion.drawObjective(ctx, currentScene);
    }
    MedalCompletion.draw(ctx);
    MastersFarewell.draw(ctx);
    CaptainRoute.draw(ctx);
}

function gameLoop() { 
    update(); 
    draw(); 
    requestAnimationFrame(gameLoop); 
}

// Ponto de entrada exclusivo para o teste local da interação do Mestre.
// Sem o parâmetro, o fluxo normal do mapa permanece inalterado.
if (new URLSearchParams(window.location.search).has("corridaNpcQa")) {
    currentScene = "ILHA_CORRIDA";
    player.x = 225;
    player.y = 100;
}

if (new URLSearchParams(window.location.search).has("basketballNpcQa")) {
    currentScene = "ILHA_BASQUETE";
    player.x = 225;
    player.y = 90;
}

if (new URLSearchParams(window.location.search).has("surfNpcQa")) {
    currentScene = "ILHA_SURF";
    player.x = 225;
    player.y = 163;
}

if (archeryQaParams.has("archeryIslandQa")) {
    currentScene = "ILHA_ARCO";
    if (archeryQaParams.get("archeryIslandQa") === "master") {
        player.x = 225;
        player.y = 145;
    } else {
        player.x = 410;
        player.y = 150;
    }
    dialogBox.classList.remove("show");
}

if (CLIMB_QA_MODE) {
    currentScene = "JOGO_ESCALADA";
    resetEscalada();
    escaladaGame.gameState = 'PLAYING';
    dialogBox.classList.remove('show');
    const qaStep = Number(CLIMB_QUERY.get('climbQaStep') || 0);
    const qaHoldType = CLIMB_QUERY.get('climbQaHold');
    const qaRoute = CLIMB_QUERY.get('climbQaRoute');
    const qaStartHold = qaHoldType
        ? escaladaGame.pedrasGeradas.find(hold => hold.tipo === qaHoldType)
        : qaRoute
            ? escaladaGame.pedrasGeradas.filter(hold => hold.routeTag === qaRoute && hold.levelStep >= qaStep).sort((a, b) => a.levelStep - b.levelStep)[0]
            : escaladaGame.pedrasGeradas.find(hold => !hold.optionalRoute && hold.levelStep === qaStep);
    if (qaStartHold && qaStartHold.id !== 0) {
        escaladaGame.alturaAtual = Math.max(0, qaStartHold.climbY - 42);
        gerenciarPedras(false);
        if(qaStartHold.tipo==='checkpoint'){
            escaladaGame.playerState='AIRBORNE';escaladaGame.airFrames=4;
            escaladaGame.playerX=qaStartHold.x;escaladaGame.playerY=qaStartHold.y+44;escaladaGame.vy=-1;
        }
        concluirAgarrada(qaStartHold);
    }
}

window.getClimbQaSnapshot = () => ({
    state: escaladaGame.gameState,
    playerState: escaladaGame.playerState,
    section: getCurrentClimbSection().id,
    step: escaladaGame.currentStep,
    x: Number(escaladaGame.playerX.toFixed(1)),
    y: Number(escaladaGame.playerY.toFixed(1)),
    vx: Number(escaladaGame.vx.toFixed(2)),
    vy: Number(escaladaGame.vy.toFixed(2)),
    altitude: Math.round(escaladaGame.alturaAtual),
    totalAltitude: Math.round(escaladaGame.alturaTotal),
    lives: escaladaGame.vida,
    checkpointStep: (escaladaGame.pedrasGeradas.find(hold => hold.id === escaladaGame.checkpointHoldId) || { levelStep: 0 }).levelStep,
    elapsedSeconds: Number(((performance.now() - escaladaGame.startTime) / 1000).toFixed(2)),
    validation: escaladaGame.levelValidation,
    holdCounts: escaladaGame.pedrasGeradas.reduce((counts, hold) => {
        counts[hold.tipo] = (counts[hold.tipo] || 0) + 1;
        return counts;
    }, {}),
    nextOptions: escaladaGame.pedraAtual
        ? escaladaGame.pedrasGeradas
            .filter(hold => hold.levelStep === escaladaGame.pedraAtual.levelStep + 1 && !hold.quebrada)
            .map(hold => ({ x: hold.x, dx: Math.round(hold.x - escaladaGame.playerX), type: hold.tipo }))
        : []
});

window.setClimbQaInput = (left = false, right = false) => {
    if (!CLIMB_QA_MODE) return;
    keys.a = !!left;
    keys.d = !!right;
};
window.pulseClimbQaJump = () => {
    if (CLIMB_QA_MODE) climbUpPressed = true;
};
window.releaseClimbQaInput = () => {
    keys.a = false;
    keys.d = false;
    climbUpPressed = false;
};
window.attachClimbQaToHold = (type) => {
    if (!CLIMB_QA_MODE) return false;
    const hold = escaladaGame.pedrasGeradas.find(item => item.tipo === type && !item.quebrada);
    if (!hold) return false;
    escaladaGame.alturaAtual = Math.max(0, hold.climbY - 42);
    gerenciarPedras(false);
    if(hold.tipo==='checkpoint'){
        escaladaGame.playerState='AIRBORNE';escaladaGame.airFrames=4;
        escaladaGame.playerX=hold.x;escaladaGame.playerY=hold.y+44;escaladaGame.vy=-1;
    }
    concluirAgarrada(hold);
    return true;
};
window.spawnClimbQaHazard = (type = 'stone', offset = 0) => {
    if (!CLIMB_QA_MODE) return;
    spawnClimbHazard({ type, offset }, escaladaGame.alturaAtual / escaladaGame.alturaTotal);
};

window.stepClimbQaFrames = (frames = 1) => {
    if (!CLIMB_QA_MODE) return;
    for (let frame = 0; frame < frames; frame++) updateEscaladaGame();
};
window.damageClimbQa = () => {
    if (CLIMB_QA_MODE) aplicarDanoJogador('QA: impacto controlado');
};

const BOXING_QA_PARAMS = new URLSearchParams(window.location.search);
if (BOXING_QA_PARAMS.has("boxeNpcQa")) {
    currentScene = "ILHA_ESQUI";
    player.x = 225;
    player.y = 112;
    dialogBox.classList.remove("show");
}

if (BOXING_QA_PARAMS.has("boxeQa")) {
    currentScene = "JOGO_BOXE";
    resetBoxe(true);
    dialogBox.classList.remove("show");
    boxeGame.qaFreezeAi = BOXING_QA_PARAMS.get("boxeQaFreezeAi") === "1";
    if (BOXING_QA_PARAMS.get("boxeQaCross") === "1") {
        boxeGame.player.x = 278;
        boxeGame.mestre.x = 172;
    }
}
const headerUi = document.getElementById("header-ui");
const controlsHint = document.getElementById("controls-hint");

function showOverworldUI() {
    if (headerUi) headerUi.style.display = "flex";
    if (controlsHint) controlsHint.style.display = "block";
}

function hideOverworldUI() {
    if (headerUi) headerUi.style.display = "none";
    if (controlsHint) controlsHint.style.display = "none";
}

// As duas cinemáticas enquadram as mesmas ilhas, sem mapas ou colliders paralelos.
function captureOverworldIsland(scene) {
    const previousScene = currentScene;
    const renderers = {HUB:drawHUB,ILHA_ESQUI:drawIlhaEsqui,ILHA_PINGPONG:drawIlhaPingPong,
        ILHA_SKATE:drawIlhaSkate,ILHA_BASQUETE:drawIlhaBasquete,ILHA_CORRIDA:drawIlhaCorrida,
        ILHA_ARCO:drawIlhaArco,ILHA_ESCALADA:drawIlhaEscalada,ILHA_SURF:drawIlhaSurf};
    const snapshot = document.createElement('canvas');snapshot.width=450;snapshot.height=300;
    const previousFrame = document.createElement('canvas');previousFrame.width=450;previousFrame.height=300;
    previousFrame.getContext('2d').drawImage(canvas,0,0);
    ctx.save();
    try {
        ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
        currentScene=scene;renderers[scene]();drawSceneObstacles();
        snapshot.getContext('2d').drawImage(canvas,0,0);
    } finally {
        currentScene=previousScene;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
        ctx.clearRect(0,0,450,300);ctx.drawImage(previousFrame,0,0);ctx.restore();
    }
    return snapshot;
}

AdventureIntro.init({
    player, dialogBox, dialogText,
    medalCount: () => MEDALHAS_REGISTRY.filter(m => insignias[m.id]).length,
    captureIsland: captureOverworldIsland,
    clearInput: () => {
        Object.keys(keys).forEach(key => keys[key] = false);
        interactionPressed = false; shipInteractionPressed = false; zorpSprite.isMoving = false;
        dialogBox.classList.remove("show");
    },
    drawHub: () => {
        drawHUB(); drawSceneObstacles();
        npcs.filter(npc => npc.scene === "HUB" && npc.y <= 150).sort((a,b) => a.y-b.y).forEach(drawNPC);
    },
    drawHubForeground: () => {
        npcs.filter(npc => npc.scene === "HUB" && npc.y > 150).sort((a,b) => a.y-b.y).forEach(drawNPC);
    },
    drawActor: (x, y, walking) => {
        player.x = x; player.y = y;
        zorpSprite.row = walking ? 0 : 1;
        zorpSprite.animIndex = walking ? Math.floor(AdventureIntro.elapsed * 8) % 4 : 0;
        drawPlayer();
    },
    complete: () => {
        currentScene = "HUB"; player.x = 225; player.y = 194;
        zorpSprite.row = 1; zorpSprite.animIndex = 0;
        showOverworldUI();
    }
});

MedalCompletion.init({
    player,
    clearInput: () => AdventureIntro.config.clearInput(),
    interactionHeld: () => keys.space || keys.e || interactionPressed,
    faceForward: () => { zorpSprite.row = 0; zorpSprite.animIndex = 0; zorpSprite.timer = 0; },
    drawActor: drawPlayer
});

MastersFarewell.init({
    player, npcs, ctx, dialogBox, dialogText,
    clearInput: () => AdventureIntro.config.clearInput(),
    hideUI: hideOverworldUI,
    showUI: showOverworldUI,
    drawNPC,
    blocked: checkObstacleCollision,
    face: (dx, dy, time = 0) => {
        zorpSprite.isMoving = Boolean(dx || dy);
        zorpSprite.row = dy > 0 ? 0 : dy < 0 ? 1 : dx < 0 ? 2 : dx > 0 ? 3 : 0;
        zorpSprite.animIndex = zorpSprite.isMoving ? Math.floor(time / 130) % 4 : 0;
    },
    enterFinal: () => EndingCinematic.start(),
    resume: () => { currentScene = "HUB"; }
});

EndingCinematic.init({
    zorp: zorpImg, npcs, drawNPC,
    victoryPortrait: climbAssets.zorp.victory[0],
    clearInput: () => AdventureIntro.config.clearInput(),
    hideUI: hideOverworldUI,
    enter: () => { currentScene = "FINAL_CUTSCENE"; },
    captureIsland: captureOverworldIsland,
    returnToMenu: () => {
        currentScene="TITLE_SCREEN";MastersFarewell.active=false;MastersFarewell.path=[];MastersFarewell.setState('COMPLETE');
        TitleScreen.active=true;TitleScreen.state='TITLE';TitleScreen.selectedIndex=0;
        TitleScreen.fadeAction=null;TitleScreen.fadeAlpha=1;TitleScreen.fadeTarget=0;
        canvas.style.cursor='default';hideOverworldUI();
    }
});

CaptainRoute.init({
    clearInput: () => AdventureIntro.config.clearInput(),
    hideUI: hideOverworldUI,
    offerHint: () => { hintText.innerText = "[ESPAÇO / E] CONFIRMAR | [ESC] CANCELAR"; },
    enterEnding: () => { currentScene = "FERIAS_MERECIDAS"; },
    showMessage: text => {
        overworldConversationText = text; dialogText.textContent = text;
        dialogBox.classList.add("show");
    },
    returnToMenu: () => EndingCinematic.config.returnToMenu()
});

if (typeof TitleScreen !== "undefined") {
    TitleScreen.init({
        canvas: canvas,
        ctx: ctx,
        onStartGame: () => {
            currentScene = AdventureIntro.introSeen ? "HUB" : "INTRO_ARRIVAL";
            player.x = 225;
            player.y = 194;
            AdventureIntro.config.clearInput();
            if (AdventureIntro.introSeen) showOverworldUI();
            else { hideOverworldUI(); AdventureIntro.start(); }
        },
        onResetGame: () => {
            window.location.reload();
        }
    });

    if (currentScene !== "TITLE_SCREEN") {
        TitleScreen.active = false;
        showOverworldUI();
    } else {
        TitleScreen.active = true;
        hideOverworldUI();
    }
}

gameLoop();







