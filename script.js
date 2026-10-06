const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const dialogBox = document.getElementById("dialog-box");
const dialogText = document.getElementById("dialog-text");
const hintText = document.getElementById("hint-text");

let currentScene = "HUB"; 

// Registro de Insígnias dos Esportes
const insignias = { 
    esqui: false, 
    pingpong: false,
    skate: false,
    basquete: false,
    arco: false,
    corrida: false,
    escalada: false,
    surf: false
};

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
const imgAlpinista = new Image(); imgAlpinista.src = "npc_alpinista.png";
const imgMestreGelo = new Image(); imgMestreGelo.src = "npc_mestre_gelo.png";
const imgAprendiz = new Image(); imgAprendiz.src = "npc_aprendiz.png";
const imgMestrePingPong = new Image(); imgMestrePingPong.src = "npc_mestre_ping_pong.png";
// Mestre oficial da Ilha do Arco: PNG frontal com crop de conteúdo no registro do NPC.
const imgMestreArcoOverworld = new Image();
imgMestreArcoOverworld.src = "arqueiro_overworld.png?v=1.0_archery_island";

// Mestre da Corrida: a arte fonte possui fundo preto e bastante margem.
// O arquivo original é preservado; uma cópia com chroma-key é criada em memória.
const imgMestreCorridaNpc = new Image();
const imgMestreCorridaNpcSource = new Image();
imgMestreCorridaNpcSource.addEventListener("load", () => {
    const surface = document.createElement("canvas");
    surface.width = imgMestreCorridaNpcSource.naturalWidth;
    surface.height = imgMestreCorridaNpcSource.naturalHeight;
    const surfaceCtx = surface.getContext("2d", { willReadFrequently: true });
    surfaceCtx.drawImage(imgMestreCorridaNpcSource, 0, 0);
    const pixels = surfaceCtx.getImageData(0, 0, surface.width, surface.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i];
        const g = pixels.data[i + 1];
        const b = pixels.data[i + 2];
        if (r <= 3 && g <= 3 && b <= 3) pixels.data[i + 3] = 0;
    }
    surfaceCtx.putImageData(pixels, 0, 0);
    imgMestreCorridaNpc.src = surface.toDataURL("image/png");
});
imgMestreCorridaNpcSource.src = "skate_sprites/mestre_corrida_npc.png";

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
const imgGuiaTrilha = new Image(); imgGuiaTrilha.src = "npc_guia_trilha.png";
const imgFotografo = new Image(); imgFotografo.src = "npc_fotografo.png";
const imgAtleta = new Image(); imgAtleta.src = "npc_atleta.png";
const imgIniciante = new Image(); imgIniciante.src = "npc_iniciante.png";
const imgGeologa = new Image(); imgGeologa.src = "npc_geologa.png";
const imgChef = new Image(); imgChef.src = "npc_chef.png";
const imgGuarda = new Image(); imgGuarda.src = "npc_guarda.png";

// Biblioteca oficial da Escalada. Os recortes aprovados mantêm canvas/âncora
// consistentes e são os únicos assets usados durante a subida.
const loadClimbAsset = (path) => {
    const image = new Image();
    image.src = `climb_assets/${path}?v=2`;
    return image;
};
const climbAssets = {
    zorp: {
        idle: [loadClimbAsset("zorp/idle_hang/zorp_climb_idle_hang_01.png"), loadClimbAsset("zorp/idle_hang/zorp_climb_idle_hang_02.png")],
        climb: [
            loadClimbAsset("zorp/climb_alternate/zorp_climb_alternate_01.png"),
            loadClimbAsset("zorp/climb_alternate/zorp_climb_alternate_02.png"),
            loadClimbAsset("zorp/climb_alternate/zorp_climb_alternate_03.png"),
            loadClimbAsset("zorp/climb_alternate/zorp_climb_alternate_04.png")
        ],
        reachLeft: loadClimbAsset("zorp/reach/zorp_climb_reach_left_01.png"),
        reachRight: loadClimbAsset("zorp/reach/zorp_climb_reach_right_01.png"),
        slip: [loadClimbAsset("zorp/slip/zorp_climb_slip_01.png"), loadClimbAsset("zorp/slip/zorp_climb_slip_02.png")],
        pushUp: loadClimbAsset("zorp/push_up/zorp_climb_push_up_01.png"),
        pushLeft: loadClimbAsset("zorp/push_up/zorp_climb_push_up_02.png"),
        pushRight: loadClimbAsset("zorp/push_up/zorp_climb_push_up_03.png"),
        stun: loadClimbAsset("zorp/stun/zorp_climb_stun_01.png"),
        fall: loadClimbAsset("zorp/fall/zorp_climb_fall_01.png"),
        victory: [loadClimbAsset("zorp/victory/zorp_climb_victory_01.png"), loadClimbAsset("zorp/victory/zorp_climb_victory_02.png")]
    },
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
// BOXE — PACOTE OFICIAL DO BOXE ARCADE DE ARENA
// A arena e os frames recortados são usados pelo runtime boxing_arena.js.
// -------------------------------------------------------------
const BOXING_ASSET_VERSION = "3.0_boxing_arena";
const BOXING_FRAME_COUNTS = Object.freeze({
    idle: 4,
    walk: 4,
    step_back: 4,
    jab: 3,
    cross: 3,
    hook: 3,
    uppercut: 3,
    block: 2,
    dodge: 2,
    hurt: 3,
    knockdown: 4,
    victory: 3
});
const BOXING_FRAME_DURATIONS = Object.freeze({
    idle: 160,
    walk: 110,
    step_back: 110,
    jab: 80,
    cross: 85,
    hook: 90,
    uppercut: 95,
    block: 130,
    dodge: 105,
    hurt: 115,
    knockdown: 145,
    victory: 160
});
const BOXING_FRAME_CANVAS = Object.freeze({ width: 256, height: 192, anchorX: 128, anchorY: 184 });
const boxingAssetStatus = { requested: 0, loaded: 0, failed: 0, failedPaths: [] };

function loadBoxingImage(path) {
    const img = new Image();
    boxingAssetStatus.requested++;
    img.addEventListener("load", () => boxingAssetStatus.loaded++, { once: true });
    img.addEventListener("error", () => {
        boxingAssetStatus.failed++;
        boxingAssetStatus.failedPaths.push(path);
    }, { once: true });
    img.src = `${path}?v=${BOXING_ASSET_VERSION}`;
    return img;
}

function loadBoxingSequence(character, animation) {
    const prefix = character === "zorp" ? "zorp" : "master";
    return Array.from({ length: BOXING_FRAME_COUNTS[animation] }, (_, index) => {
        const number = String(index + 1).padStart(2, "0");
        return loadBoxingImage(`boxe_assets/${character}/${animation}/${prefix}_${animation}_${number}.png`);
    });
}

const imgBoxeArenaBg = loadBoxingImage("boxe_arena.png");
const BOXING_SPRITES = Object.freeze({
    zorp: Object.freeze(Object.fromEntries(Object.keys(BOXING_FRAME_COUNTS).map(animation => [animation, loadBoxingSequence("zorp", animation)]))),
    master: Object.freeze(Object.fromEntries(Object.keys(BOXING_FRAME_COUNTS).map(animation => [animation, loadBoxingSequence("master", animation)])))
});

// Novos NPCs da Ilha de Boxe (Overworld)
const imgNpcMestreBoxe = new Image(); imgNpcMestreBoxe.src = "npc_mestre_novo.png?v=4";
const imgNpcTreinadorBoxe = new Image(); imgNpcTreinadorBoxe.src = "npc_treinador_novo.png?v=4";
const imgNpcArbitroBoxe = new Image(); imgNpcArbitroBoxe.src = "npc_arbitro_novo.png?v=4";
const imgNpcBoxeador = new Image(); imgNpcBoxeador.src = "npc_pugilista_novo.png?v=4";
const imgBoxeSacoPancada = new Image(); imgBoxeSacoPancada.src = "boxe_saco_pancada.png?v=4";

// -------------------------------------------------------------
// SPRITES E RECURSOS DO MINIGAME DE SKATE (PARK ARCADE)
// -------------------------------------------------------------
// Legacy scene references share the audited exports; absent old filenames must
// not be requested when the island initializes.
function skateExportImage(sheet,group,index=1) {
    const img=new Image(); img.src=`skate_sprites/zorp_skate_pro${sheet}_${group}_${String(index).padStart(2,'0')}.png?v=3`; return img;
}
const imgZorpSkateIdle = skateExportImage(4,'idle_on_board');
const imgZorpSkatePush = skateExportImage(4,'push_accelerate');
const imgZorpSkateCruise = skateExportImage(4,'rolling_ride');
const imgZorpSkateCharge = skateExportImage(4,'crouch_jump_prep');
const imgZorpSkateBrake = skateExportImage(1,'row03');
const imgZorpSkateCarve = skateExportImage(4,'turn_balance');
const imgZorpSkateFall = skateExportImage(1,'row04');
const imgZorpSkateStumble = skateExportImage(1,'row03',2);
const imgZorpSkateGrab = skateExportImage(3,'row05');
const imgZorpSkateWin = skateExportImage(1,'row06');

const imgZorpSkateOllie = [0, 1, 2, 3].map(i => {
    return skateExportImage(1,'row01',i+1);
});
const imgZorpSkateLand = [0, 1, 2, 3].map(i => {
    return skateExportImage(3,'row06',i+1);
});
const imgZorpSkateKickflip = [0, 1, 2, 3, 4, 5].map(i => {
    return skateExportImage(3,'row04',i%5+1);
});
const imgZorpSkateSpin = [0, 1, 2, 3, 4, 5].map(i => {
    return skateExportImage(3,'row03',i%5+1);
});
const imgZorpSkateGrind = [0, 1, 2, 3].map(i => {
    return skateExportImage(2,'row02',i+1);
});
const imgZorpSkateSpecial = [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
    return skateExportImage(3,'row05',i%4+1);
});

const imgMestreSkate = new Image(); imgMestreSkate.src = "mestre_skate.png?v=2";
// Só existe um sprite do Mestre do Skate neste projeto. As quatro referências
// reutilizam a imagem válida em vez de solicitar variantes inexistentes (404).
const imgMestreSkateCruise = imgMestreSkate;
const imgMestreSkateIdle = imgMestreSkate;
const imgMestreSkateOllie = imgMestreSkate;
const imgMestreSkateGrind = imgMestreSkate;

// Collectibles belonged to the superseded park scene; its renderer already has
// geometric fallbacks and the active fixed course does not spawn these items.
const imgSkateBattery = new Image();
const imgSkateTape = new Image();
const imgSkateMultiplier = new Image();
const imgSkateTime = new Image();

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

const pingPong = {
    playerX: 50, playerY: 140, 
    opponentX: 370, opponentY: 140, 
    speed: 4.0, // Velocidade de caminhada do Zorp
    opponentSpeed: 2.75, // Velocidade justa de caminhada do Mestre (estilo Tengu, sem dash)
    balls: [], // Array de bolas ativas em campo
    ballRadius: 4, gravity: 0.22,
    playerScore: 0, opponentScore: 0, maxScore: 50, // Partida até 50 pontos
    playerAction: "IDLE", opponentAction: "IDLE",  
    playerHitTimer: 0, opponentHitTimer: 0,
    power: 0, maxPower: 100, isPowerActive: false, // Super Smash exclusivo do Zorp
    rallyHits: 0,
    gameState: 'TUTORIAL',
    win: false,
    bounceEffects: [],
    aoeEffects: [], // Efeito de onda de choque do Especial
    server: 'PLAYER',
    nextBallId: 1,
    serveCooldown: 0,
    mestreSpawnCooldown: 140,
    mestreSpawnWindup: 0,
    mestreReaction: null // { text: '💦', timer: 30 }
};

// -------------------------------------------------------------
// TELAS DE INTERFACE (UI OVERLAYS)
// -------------------------------------------------------------
function drawOverlayScreen(title, lines, titleColor = "#f1c40f") {
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
    ctx.font = "bold 14px monospace";
    ctx.fillText("[Pressione ESPAÇO para continuar]", canvas.width / 2, canvas.height - 40);
    
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
const CLIMB_LEVEL = [
    {
        id: 'intro', share: 0.11, width: 500, gap: [47, 49, 46, 48],
        route: [710, 665, 715, 770, 720, 670, 620, 675, 730, 690],
        types: ['normal', 'normal', 'normal', 'purple', 'normal', 'moving_horizontal', 'normal', 'normal', 'purple', 'normal'],
        branches: [
            { step: 5, x: 735, type: 'normal', route: 'intro_alt' },
            { step: 6, x: 785, type: 'normal', route: 'intro_alt' },
            { step: 7, x: 735, type: 'bonus', route: 'intro_alt' }
        ], throws: []
    },
    {
        id: 'route_choice', share: 0.17, width: 720, gap: [41, 42, 43, 41],
        route: [650, 600, 555, 605, 660, 715, 670, 615, 570, 620, 680, 740, 695, 645, 700, 750],
        types: ['normal', 'normal', 'moss', 'normal', 'normal', 'purple', 'normal', 'moss', 'normal', 'normal', 'purple', 'normal', 'normal', 'moss', 'normal', 'normal'],
        branches: [
            { step: 0, x: 725, type: 'normal', route: 'right_safe' },
            { step: 1, x: 780, type: 'normal', route: 'right_safe' },
            { step: 2, x: 830, type: 'normal', route: 'right_safe' },
            { step: 3, x: 785, type: 'moss', route: 'right_safe' },
            { step: 4, x: 730, type: 'normal', route: 'right_safe' },
            { step: 5, x: 770, type: 'normal', route: 'right_safe' },
            { step: 7, x: 720, type: 'moving_diagonal_low', route: 'center_risk' },
            { step: 8, x: 775, type: 'bonus', route: 'center_risk' },
            { step: 9, x: 825, type: 'brittle', route: 'center_risk' },
            { step: 10, x: 780, type: 'normal', route: 'center_risk' },
            { step: 12, x: 610, type: 'moving_horizontal', route: 'fast_left', shortcut: true },
            { step: 14, x: 665, type: 'bonus', route: 'fast_left', shortcut: true }
        ],
        throws: ['single']
    },
    {
        id: 'moving_holds', share: 0.20, width: 780, gap: [43, 44, 42, 45],
        route: [705, 650, 595, 650, 710, 770, 715, 655, 600, 660, 720, 780, 725, 665, 610, 670, 730, 690],
        types: ['normal', 'moving_horizontal', 'normal', 'moving_vertical', 'normal', 'moving_diagonal_low', 'normal', 'moving_diagonal_steep', 'normal', 'moving_elliptical_wide', 'checkpoint', 'normal', 'moving_arc', 'normal', 'moving_pendulum', 'normal', 'moving_circular', 'normal'],
        branches: [
            { step: 0, x: 775, type: 'normal', route: 'right_timing' },
            { step: 1, x: 830, type: 'moving_vertical', route: 'right_timing' },
            { step: 2, x: 875, type: 'normal', route: 'right_timing' },
            { step: 3, x: 900, type: 'moving_diagonal_steep', route: 'right_timing' },
            { step: 4, x: 845, type: 'bonus', route: 'right_timing' },
            { step: 6, x: 880, type: 'moving_horizontal', route: 'transfer_pair' },
            { step: 7, x: 820, type: 'moving_vertical', route: 'transfer_pair' },
            { step: 8, x: 770, type: 'normal', route: 'transfer_pair' },
            { step: 9, x: 835, type: 'moving_circular', route: 'transfer_pair' },
            { step: 11, x: 655, type: 'normal', route: 'left_arc' },
            { step: 12, x: 600, type: 'moving_arc', route: 'left_arc' },
            { step: 13, x: 545, type: 'bonus', route: 'left_arc' },
            { step: 14, x: 600, type: 'normal', route: 'left_arc' },
            { step: 15, x: 655, type: 'normal', route: 'left_arc' },
            { step: 16, x: 650, type: 'moving_elliptical_tall', route: 'left_arc' }
        ],
        throws: ['single']
    },
    {
        id: 'special_holds', share: 0.20, width: 760, gap: [47, 50, 46, 49],
        route: [735, 790, 735, 675, 620, 675, 730, 785, 730, 670, 615, 665, 720, 775, 720, 660, 610, 670],
        types: ['normal', 'brittle', 'normal', 'ice', 'normal', 'moss', 'normal', 'brittle', 'normal', 'ice', 'normal', 'moss', 'normal', 'brittle', 'normal', 'moving_ice', 'normal', 'normal'],
        branches: [
            { step: 0, x: 665, type: 'moss', route: 'left_safe' },
            { step: 1, x: 610, type: 'normal', route: 'left_safe' },
            { step: 2, x: 555, type: 'normal', route: 'left_safe' },
            { step: 3, x: 605, type: 'moss', route: 'left_safe' },
            { step: 4, x: 660, type: 'normal', route: 'left_safe' },
            { step: 5, x: 710, type: 'normal', route: 'left_safe' },
            { step: 6, x: 790, type: 'spike', route: 'right_risk' },
            { step: 7, x: 845, type: 'bonus', route: 'right_risk' },
            { step: 8, x: 800, type: 'moving_diagonal_low', route: 'right_risk' },
            { step: 9, x: 750, type: 'normal', route: 'right_risk' },
            { step: 10, x: 690, type: 'normal', route: 'right_risk' },
            { step: 11, x: 610, type: 'brittle', route: 'fragile_reward' },
            { step: 12, x: 555, type: 'moving_horizontal', route: 'fragile_reward' },
            { step: 13, x: 610, type: 'bonus', route: 'fragile_reward' },
            { step: 14, x: 665, type: 'normal', route: 'fragile_reward' },
            { step: 16, x: 720, type: 'bonus', route: 'ice_exit' }
        ],
        throws: ['single', 'center']
    },
    {
        id: 'master_pressure', share: 0.15, width: 820, gap: [46, 49, 47, 50],
        route: [725, 665, 610, 665, 725, 785, 730, 670, 615, 675, 735, 790, 735, 690],
        types: ['normal', 'brittle', 'normal', 'moving_diagonal_steep', 'normal', 'moss', 'normal', 'normal', 'ice', 'normal', 'checkpoint', 'normal', 'moving_pendulum', 'normal'],
        branches: [
            { step: 0, x: 785, type: 'normal', route: 'right_pressure' },
            { step: 1, x: 850, type: 'moving_horizontal', route: 'right_pressure' },
            { step: 2, x: 900, type: 'normal', route: 'right_pressure' },
            { step: 3, x: 850, type: 'brittle', route: 'right_pressure' },
            { step: 4, x: 795, type: 'bonus', route: 'right_pressure' },
            { step: 6, x: 700, type: 'moving_vertical', route: 'center_fast', shortcut: true },
            { step: 8, x: 725, type: 'bonus', route: 'center_fast', shortcut: true },
            { step: 9, x: 700, type: 'spike', route: 'center_risk' },
            { step: 10, x: 755, type: 'normal', route: 'center_risk' },
            { step: 11, x: 870, type: 'moving_figure_eight', route: 'center_risk' },
            { step: 12, x: 755, type: 'bonus', route: 'center_risk' }
        ],
        throws: ['force_left', 'force_right', 'swap', 'double']
    },
    {
        id: 'final_gauntlet', share: 0.17, width: 780, gap: [44, 47, 45, 48],
        route: [745, 800, 855, 805, 750, 695, 640, 695, 750, 810, 865, 810, 755, 700, 750, 790],
        types: ['normal', 'moving_circular', 'normal', 'brittle', 'normal', 'moving_elliptical_tall', 'normal', 'moss', 'moving_arc', 'normal', 'moving_pendulum', 'normal', 'brittle', 'normal', 'moving_rect', 'normal'],
        branches: [
            { step: 0, x: 675, type: 'normal', route: 'left_final' },
            { step: 1, x: 620, type: 'moving_diagonal_steep', route: 'left_final' },
            { step: 2, x: 565, type: 'normal', route: 'left_final' },
            { step: 3, x: 615, type: 'moving_triangle', route: 'left_final' },
            { step: 4, x: 670, type: 'bonus', route: 'left_final' },
            { step: 6, x: 800, type: 'moving_figure_eight', route: 'figure8_risk' },
            { step: 7, x: 755, type: 'bonus', route: 'figure8_risk' },
            { step: 8, x: 810, type: 'brittle', route: 'figure8_risk' },
            { step: 9, x: 755, type: 'normal', route: 'figure8_risk' },
            { step: 11, x: 745, type: 'spike', route: 'spike_shortcut' },
            { step: 12, x: 690, type: 'bonus', route: 'spike_shortcut' },
            { step: 13, x: 640, type: 'moving_elliptical_wide', route: 'spike_shortcut' },
            { step: 14, x: 695, type: 'bonus', route: 'spike_shortcut' }
        ],
        throws: ['fragile_pressure', 'force_left', 'force_right', 'gauntlet']
    }
];

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
    
    // Mundo Amplo da Montanha (1500px de largura com Exploração Lateral Completa)
    mountainWidth: 1500,
    cameraX: 525,
    
    playerX: 750,
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
    summitTimer: 0,
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
    const holds = [{
        id: 0, x: 750, baseX: 750, y: 220, baseY: 220, climbY: 0,
        r: 17, tipo: 'normal', levelStep: 0, sectionIndex: 0, coletado: false
    }];
    const ranges = [];
    let levelStep = 0;
    let climbY = 0;
    let nextId = 1;

    CLIMB_LEVEL.forEach((section, sectionIndex) => {
        const startHeight = climbY;
        const startStep = levelStep + 1;
        section.route.forEach((x, localStep) => {
            climbY += section.gap[localStep % section.gap.length];
            levelStep++;
            const type = section.types[localStep] || 'normal';
            const hold = {
                id: nextId++, x, baseX: x, y: 220 - climbY, baseY: 220 - climbY,
                climbY, r: type === 'checkpoint' ? 22 : 17, tipo: type,
                levelStep, sectionIndex, coletado: false, routeTag: 'safe'
            };
            configureClimbHold(hold, localStep);
            holds.push(hold);

            section.branches.filter(branch => branch.step === localStep).forEach(branch => {
                const branchHold = {
                    id: nextId++, x: branch.x, baseX: branch.x, y: 220 - climbY,
                    baseY: 220 - climbY, climbY, r: 17, tipo: branch.type,
                    levelStep, sectionIndex, coletado: false, optionalRoute: true,
                    routeTag: branch.route || 'alternate', shortcut: !!branch.shortcut
                };
                configureClimbHold(branchHold, localStep + 0.5);
                holds.push(branchHold);
            });
        });
        ranges.push({
            sectionIndex, id: section.id, startHeight, endHeight: climbY,
            startStep, endStep: levelStep, width: section.width
        });
    });

    const finish = holds.filter(hold => !hold.optionalRoute).sort((a, b) => b.levelStep - a.levelStep)[0];
    finish.isFinish = true;
    return { holds, ranges, totalHeight: Math.max(1, climbY - 40), finishId: finish.id };
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

function measureClimbTransfer(from, to) {
    const stepDelta = to.levelStep - from.levelStep;
    if (stepDelta < 1 || stepDelta > 2) return { reachable: false, minDistance: Infinity, contactWindowFrames: 0 };
    if (!isMovingClimbHold(from) && !isMovingClimbHold(to)) {
        const vertical = to.climbY - from.climbY;
        const distance = Math.hypot(to.baseX - from.baseX, vertical);
        return { reachable: vertical > 15 && vertical <= 91 && distance <= CLIMB_SAFE_REACH, minDistance: distance, contactWindowFrames: 999 };
    }
    let minDistance = Infinity;
    let consecutive = 0;
    let bestConsecutive = 0;
    const samples = 96;
    const sampleFrames = 4;
    for (let sample = 0; sample < samples; sample++) {
        const time = sample * sampleFrames / 60;
        const a = climbHoldPositionAtTime(from, time);
        const b = climbHoldPositionAtTime(to, time);
        const vertical = b.climbY - a.climbY;
        const distance = Math.hypot(b.x - a.x, vertical);
        minDistance = Math.min(minDistance, distance);
        if (vertical > 12 && vertical <= 94 && distance <= CLIMB_SAFE_REACH) {
            consecutive++;
            bestConsecutive = Math.max(bestConsecutive, consecutive);
        } else {
            consecutive = 0;
        }
    }
    const contactWindowFrames = bestConsecutive * sampleFrames;
    return { reachable: contactWindowFrames >= 12, minDistance, contactWindowFrames };
}

function buildClimbGraph(holds) {
    const outgoing = new Map(holds.map(hold => [hold.id, []]));
    const incoming = new Map(holds.map(hold => [hold.id, []]));
    const edges = [];
    for (const from of holds) {
        for (const to of holds) {
            if (to.levelStep <= from.levelStep || to.levelStep > from.levelStep + 2) continue;
            const transfer = measureClimbTransfer(from, to);
            if (!transfer.reachable) continue;
            const edge = { from: from.id, to: to.id, fromHold: from, toHold: to, ...transfer };
            edges.push(edge);
            outgoing.get(from.id).push(edge);
            incoming.get(to.id).push(edge);
        }
    }
    return { outgoing, incoming, edges };
}

function isConnectedClimbPath(path, graph) {
    for (let index = 1; index < path.length; index++) {
        if (!graph.outgoing.get(path[index - 1].id).some(edge => edge.to === path[index].id)) return false;
    }
    return true;
}

function validateClimbLevel(holds, finishId, ranges = []) {
    const start = holds.find(hold => hold.id === 0);
    const finish = holds.find(hold => hold.id === finishId);
    const graph = buildClimbGraph(holds);
    const reachable = new Set([start.id]);
    const queue = [start];
    while (queue.length) {
        const from = queue.shift();
        for (const edge of graph.outgoing.get(from.id)) {
            if (!reachable.has(edge.to)) {
                reachable.add(edge.to);
                queue.push(edge.toHold);
            }
        }
    }
    const mainRoute = holds.filter(hold => !hold.optionalRoute).sort((a, b) => a.levelStep - b.levelStep);
    let lateralDistance = 0;
    for (let i = 1; i < mainRoute.length; i++) lateralDistance += Math.abs(mainRoute[i].x - mainRoute[i - 1].x);
    const sections = ranges.map(range => {
        const sectionHolds = holds.filter(hold => hold.sectionIndex === range.sectionIndex);
        const main = sectionHolds.filter(hold => !hold.optionalRoute).sort((a, b) => a.levelStep - b.levelStep);
        const entry = holds.filter(hold => !hold.optionalRoute && hold.levelStep < range.startStep).sort((a, b) => b.levelStep - a.levelStep)[0] || start;
        const exit = holds.filter(hold => !hold.optionalRoute && hold.levelStep > range.endStep).sort((a, b) => a.levelStep - b.levelStep)[0] || finish;
        const routeTags = [...new Set(sectionHolds.filter(hold => hold.optionalRoute).map(hold => hold.routeTag))];
        const validRouteTags = routeTags.filter(tag => {
            const branch = sectionHolds.filter(hold => hold.routeTag === tag).sort((a, b) => a.levelStep - b.levelStep);
            if (!branch.length) return false;
            const before = holds.filter(hold => !hold.optionalRoute && hold.levelStep < branch[0].levelStep).sort((a, b) => b.levelStep - a.levelStep)[0] || entry;
            const after = holds.filter(hold => !hold.optionalRoute && hold.levelStep > branch[branch.length - 1].levelStep).sort((a, b) => a.levelStep - b.levelStep)[0] || exit;
            return isConnectedClimbPath([before, ...branch, after], graph);
        });
        const choiceLevels = new Set(sectionHolds.filter(hold => hold.optionalRoute).map(hold => hold.levelStep)).size;
        const safeConnected = isConnectedClimbPath([entry, ...main, exit].filter((hold, index, array) => index === 0 || hold.id !== array[index - 1].id), graph);
        return {
            id: range.id,
            startStep: range.startStep,
            endStep: range.endStep,
            reachableEnd: holds.some(hold => hold.levelStep === range.endStep && reachable.has(hold.id)),
            holdCount: sectionHolds.length,
            routes: (safeConnected ? 1 : 0) + validRouteTags.length,
            declaredRoutes: 1 + routeTags.length,
            bifurcations: validRouteTags.length,
            merges: validRouteTags.length,
            choiceCoverage: Number((choiceLevels / Math.max(1, range.endStep - range.startStep + 1)).toFixed(2)),
            invalidRouteTags: routeTags.filter(tag => !validRouteTags.includes(tag))
        };
    });
    const spikeHolds = holds.filter(hold => hold.tipo === 'spike' || hold.tipo === 'danger');
    let minSpikeDistance = Infinity;
    const spikeRadiusViolations = [];
    for (let left = 0; left < spikeHolds.length; left++) {
        for (let right = left + 1; right < spikeHolds.length; right++) {
            const distance = Math.hypot(spikeHolds[left].baseX - spikeHolds[right].baseX, spikeHolds[left].climbY - spikeHolds[right].climbY);
            minSpikeDistance = Math.min(minSpikeDistance, distance);
            if (distance < CLIMB_SPIKE_EXCLUSION_RADIUS) spikeRadiusViolations.push([spikeHolds[left].id, spikeHolds[right].id]);
        }
    }
    const spikeEdges = graph.edges.filter(edge => (edge.fromHold.tipo === 'spike' || edge.fromHold.tipo === 'danger') && (edge.toHold.tipo === 'spike' || edge.toHold.tipo === 'danger'));
    const spikesWithoutAlternative = spikeHolds.filter(spike => !holds.some(hold =>
        hold.levelStep === spike.levelStep && hold.id !== spike.id &&
        hold.tipo !== 'spike' && hold.tipo !== 'danger' && reachable.has(hold.id) &&
        (hold.isFinish || graph.outgoing.get(hold.id).length > 0)
    ));
    const movingEdges = graph.edges.filter(edge => isMovingClimbHold(edge.fromHold) || isMovingClimbHold(edge.toHold));
    const movingWithoutTransfer = holds.filter(isMovingClimbHold).filter(hold => !movingEdges.some(edge => edge.from === hold.id || edge.to === hold.id));
    const movingHolds = holds.filter(isMovingClimbHold);
    const movingCollisionViolations = [];
    for (let left = 0; left < movingHolds.length; left++) {
        for (let right = left + 1; right < movingHolds.length; right++) {
            const a = movingHolds[left], b = movingHolds[right];
            if (Math.abs(a.climbY - b.climbY) > 105) continue;
            let minDistance = Infinity;
            for (let sample = 0; sample < 96; sample++) {
                const time = sample * 4 / 60;
                const pa = climbHoldPositionAtTime(a, time);
                const pb = climbHoldPositionAtTime(b, time);
                minDistance = Math.min(minDistance, Math.hypot(pa.x - pb.x, pa.climbY - pb.climbY));
            }
            if (minDistance < 34) movingCollisionViolations.push({ holds: [a.id, b.id], minDistance: Number(minDistance.toFixed(1)) });
        }
    }
    const specialFamilies = hold => {
        if (hold.tipo === 'ice' || hold.tipo === 'moving_ice') return 'ice';
        if (hold.tipo === 'brittle') return 'brittle';
        if (hold.tipo === 'moss') return 'moss';
        if (isMovingClimbHold(hold)) return 'moving';
        if (hold.tipo === 'spike' || hold.tipo === 'danger') return 'spike';
        return null;
    };
    const repetitionViolations = [];
    const checkRepetition = (label, sequence) => {
        let previous = null;
        let run = 0;
        for (const hold of sequence) {
            const family = specialFamilies(hold);
            if (family && family === previous) run++;
            else run = family ? 1 : 0;
            previous = family;
            const allowed = family === 'spike' ? 1 : 2;
            if (family && run > allowed) repetitionViolations.push({ route: label, family, hold: hold.id, run });
        }
    };
    checkRepetition('safe', mainRoute);
    for (const range of ranges) {
        const tags = [...new Set(holds.filter(hold => hold.sectionIndex === range.sectionIndex && hold.optionalRoute).map(hold => hold.routeTag))];
        for (const tag of tags) checkRepetition(`${range.id}:${tag}`, holds.filter(hold => hold.sectionIndex === range.sectionIndex && hold.routeTag === tag).sort((a, b) => a.levelStep - b.levelStep));
    }
    const spikeValidator = {
        valid: spikeRadiusViolations.length === 0 && spikeEdges.length === 0 && spikesWithoutAlternative.length === 0,
        count: spikeHolds.length,
        exclusionRadius: CLIMB_SPIKE_EXCLUSION_RADIUS,
        minDistance: Number.isFinite(minSpikeDistance) ? Number(minSpikeDistance.toFixed(1)) : null,
        radiusViolations: spikeRadiusViolations,
        spikeEdges: spikeEdges.map(edge => [edge.from, edge.to]),
        withoutAlternative: spikesWithoutAlternative.map(hold => hold.id)
    };
    const routeValidator = {
        valid: sections.every(section => section.reachableEnd && section.routes >= 2 && section.invalidRouteTags.length === 0),
        totalBifurcations: sections.reduce((sum, section) => sum + section.bifurcations, 0),
        totalMerges: sections.reduce((sum, section) => sum + section.merges, 0),
        sections
    };
    const movingValidator = {
        valid: movingWithoutTransfer.length === 0 && movingCollisionViolations.length === 0 && (movingEdges.length === 0 || Math.min(...movingEdges.map(edge => edge.contactWindowFrames)) >= 12),
        withoutTransfer: movingWithoutTransfer.map(hold => hold.id),
        collisionViolations: movingCollisionViolations,
        minTransferWindowFrames: movingEdges.length ? Math.min(...movingEdges.map(edge => edge.contactWindowFrames)) : null
    };
    const repetitionValidator = { valid: repetitionViolations.length === 0, violations: repetitionViolations };
    return {
        valid: reachable.has(finish.id) && routeValidator.valid && spikeValidator.valid && movingValidator.valid && repetitionValidator.valid,
        reachable: reachable.size, edgeCount: graph.edges.length,
        holds: holds.length, steps: finish.levelStep, lateralDistance,
        sections, routeValidator, spikeValidator, movingValidator, repetitionValidator,
        minMovingWindowFrames: movingEdges.length ? Math.min(...movingEdges.map(edge => edge.contactWindowFrames)) : null,
        movingWithoutTransfer: movingWithoutTransfer.map(hold => hold.id)
    };
}

function getCurrentClimbSection() {
    const currentStep = escaladaGame.pedraAtual ? escaladaGame.pedraAtual.levelStep : escaladaGame.currentStep;
    const range = escaladaGame.sectionRanges.find(item => currentStep >= item.startStep && currentStep <= item.endStep);
    return range || escaladaGame.sectionRanges[0] || { sectionIndex: 0, id: 'intro', width: 620 };
}

function resetEscalada() {
    escaladaGame.vida = 3;
    escaladaGame.invulTimer = 0;
    escaladaGame.shakeTimer = 0;
    escaladaGame.mountainWidth = 1500;
    escaladaGame.cameraX = 525;
    escaladaGame.playerX = 750;
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
    escaladaGame.summitTimer = 0;
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
    escaladaGame.alturaTotal = builtLevel.totalHeight;
    escaladaGame.levelValidation = validateClimbLevel(builtLevel.holds, builtLevel.finishId, builtLevel.ranges);
    escaladaGame.pedraAtual = escaladaGame.pedrasGeradas[0];
    if (!escaladaGame.levelValidation.valid) {
        console.error('[Escalada] Blueprint sem caminho seguro ate o topo.', escaladaGame.levelValidation);
    }
    escaladaGame.gameState = 'TUTORIAL';
}

function tentarPular() {
    const podePular = escaladaGame.playerState === 'GRABBED' || escaladaGame.playerState === 'STANDING';
    if (!podePular || escaladaGame.isGameOver || escaladaGame.settleTimer > 0 || escaladaGame.finishStarted) return false;

    const direction = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
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
    const estavaCaindo = escaladaGame.vy > 1.25;
    escaladaGame.playerState = pedra.tipo === 'checkpoint' ? 'STANDING' : 'GRABBED';
    escaladaGame.pedraAtual = pedra;
    escaladaGame.currentStep = Math.max(escaladaGame.currentStep, pedra.levelStep);
    escaladaGame.grabTarget = null;
    escaladaGame.playerX = pedra.x;
    escaladaGame.playerY = pedra.y;
    escaladaGame.vx = 0;
    escaladaGame.vy = 0;
    escaladaGame.airFrames = 0;
    escaladaGame.settleTimer = CLIMB_PHYSICS.settleFrames;
    escaladaGame.gripTimer = 0;
    escaladaGame.nextJumpControl = pedra.tipo === 'moss' ? 0.72 : 1;
    escaladaGame.combo = Math.min(99, escaladaGame.combo + 1);
    escaladaGame.score += 80 + escaladaGame.combo * 12 + (estavaCaindo ? 55 : 0);
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
    if (pedra.tipo === 'spike' || pedra.tipo === 'danger') {
        criarPoeira(pedra.x, pedra.y, '#e45845', 14);
        aplicarDanoJogador('Os espinhos fizeram Zorp perder a pegada!', { drop: true, knockbackX: escaladaGame.playerX < 750 ? -2.7 : 2.7 });
        return;
    }
    if ((pedra.tipo === 'bonus' || pedra.tipo === 'checkpoint') && !pedra.coletado) {
        escaladaGame.score += 500;
        escaladaGame.combo += 2;
        pedra.coletado = true;
    }
    if (pedra.tipo === 'checkpoint' && escaladaGame.checkpointHoldId !== pedra.id) {
        escaladaGame.vida = escaladaGame.maxVida;
        escaladaGame.checkpointAltura = Math.max(0, pedra.climbY - 42);
        escaladaGame.checkpointHoldId = pedra.id;
        criarPoeira(pedra.x, pedra.y, '#f1c40f', 24);
    }
}

function procurarAutoGrab() {
    if (escaladaGame.playerState !== 'AIRBORNE' || escaladaGame.airFrames < 4) return null;
    let best = null;
    let bestScore = Infinity;
    for (const pedra of escaladaGame.pedrasGeradas) {
        if (pedra.quebrada) continue;
        if (pedra.id === escaladaGame.launchHoldId && escaladaGame.airFrames < 15) continue;
        const dx = pedra.x - escaladaGame.playerX;
        const dy = pedra.y - escaladaGame.playerY;
        const distance = Math.hypot(dx, dy);
        const radius = CLIMB_PHYSICS.grabRadius + (isMovingClimbHold(pedra) ? 3 : 0);
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
    escaladaGame.playerState = 'AIRBORNE';
    escaladaGame.pedraAtual = null;
    escaladaGame.grabTarget = null;
    escaladaGame.airFrames = 10;
    escaladaGame.vx = vx;
    escaladaGame.vy = vy;
    escaladaGame.jumpDir = Math.sign(vx);
}

function atualizarFisicaEscalada() {
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
            escaladaGame.playerX = escaladaGame.pedraAtual.x;
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

    const section = getCurrentClimbSection();
    const halfWidth = section.width * 0.5;
    const minX = 750 - halfWidth + 24;
    const maxX = 750 + halfWidth - 24;
    if (escaladaGame.playerX < minX || escaladaGame.playerX > maxX) {
        escaladaGame.playerX = Math.max(minX, Math.min(maxX, escaladaGame.playerX));
        escaladaGame.vx *= -0.28;
    }

    const alvo = procurarAutoGrab();
    if (alvo) {
        escaladaGame.playerState = 'GRABBING';
        escaladaGame.grabTarget = alvo;
        escaladaGame.snapTimer = CLIMB_PHYSICS.snapFrames;
    }
}

function atualizarCameraEMundo() {
    const limiteTelaY = canvas.height * 0.60;
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
    }

    for (const hold of escaladaGame.pedrasGeradas) {
        hold.y = 220 - hold.climbY + escaladaGame.alturaAtual + (hold.motionY || 0);
    }

    // Acompanhamento horizontal suave pela montanha ampla de 1500px
    const maxCamX = escaladaGame.mountainWidth - canvas.width;
    const targetCamX = Math.max(0, Math.min(maxCamX, escaladaGame.playerX - canvas.width * 0.50));
    escaladaGame.cameraX += (targetCamX - escaladaGame.cameraX) * 0.18;
}

function gerenciarPedras(atualizarTimers = true) {
    const now = performance.now() * 0.001;

    for (let p of escaladaGame.pedrasGeradas) {
        const previousX = p.x;
        const phase = now * p.speed + (p.offset || 0);
        const motion = isMovingClimbHold(p) ? sampleClimbHoldMotion(p, phase) : { x: 0, y: 0 };
        p.x = p.baseX + motion.x;
        p.motionY = motion.y;
        p.motionVX = p.x - previousX;
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
}

function aplicarDanoJogador(motivo, options = {}) {
    if (escaladaGame.invulTimer > 0 || escaladaGame.isGameOver) return;

    escaladaGame.vida--;
    escaladaGame.invulTimer = 78;
    escaladaGame.shakeTimer = 11;
    escaladaGame.slipTimer = 38;
    escaladaGame.combo = 0;
    escaladaGame.fallFrames = 10;
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
    const currentSection = getCurrentClimbSection();
    const halfWidth = currentSection.width * 0.5;
    const minX = 750 - halfWidth + 42;
    const maxX = 750 + halfWidth - 42;
    const targetX = Math.max(minX, Math.min(maxX, escaladaGame.playerX + spec.offset));
    escaladaGame.objetosCaindo.push({
        x: targetX,
        y: escaladaGame.playerY - canvas.height * 0.88,
        speed: hazard.speed + progresso * 0.55,
        r: hazard.radius,
        type: spec.type,
        sprite: hazard.sprite,
        rotacao: 0,
        telegraph: true
    });
}

function gerenciarObjetosCaindo() {
    if (CLIMB_QA_NO_HAZARDS) return;
    const progresso = escaladaGame.alturaAtual / escaladaGame.alturaTotal;
    const sectionInfo = getCurrentClimbSection();
    const section = CLIMB_LEVEL[sectionInfo.sectionIndex];
    if (escaladaGame.hazardCooldown > 0) escaladaGame.hazardCooldown--;

    if (escaladaGame.hazardQueue.length === 0 && escaladaGame.hazardCooldown <= 0 && section.throws.length > 0) {
        const patternName = section.throws[escaladaGame.throwPatternIndex % section.throws.length];
        escaladaGame.throwPatternIndex++;
        let cumulativeDelay = 0;
        escaladaGame.hazardQueue = CLIMB_THROW_PATTERNS[patternName].map(spec => {
            cumulativeDelay += spec.delay;
            return { ...spec, remaining: cumulativeDelay };
        });
        escaladaGame.hazardCooldown = Math.max(115, 230 - sectionInfo.sectionIndex * 24);
    }

    for (let i = escaladaGame.hazardQueue.length - 1; i >= 0; i--) {
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
        obj.y += obj.speed;
        obj.rotacao += 0.12;

        let dx = obj.x - escaladaGame.playerX;
        let dy = obj.y - (escaladaGame.playerY - 14);
        let dist = Math.hypot(dx, dy);

        if (dist < obj.r + 16) {
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
    if (escaladaGame.pedraAtual && escaladaGame.pedraAtual.isFinish && !escaladaGame.finishStarted) {
        escaladaGame.finishStarted = true;
        escaladaGame.summitTimer = 72;
        escaladaGame.alturaAtual = escaladaGame.alturaTotal;
        escaladaGame.objetosCaindo.length = 0;
        escaladaGame.hazardQueue.length = 0;
        escaladaGame.score += 2000 + escaladaGame.vida * 500;
        criarPoeira(escaladaGame.playerX, escaladaGame.playerY, '#f1c40f', 28);
    }
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
    escaladaGame.gameState = 'GAMEOVER';
    escaladaGame.win = (resultado === "VITORIA");
    escaladaGame.lastRunSeconds = (performance.now() - escaladaGame.startTime) / 1000;
    if (resultado === "VITORIA") {
        insignias.escalada = true;
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
            climbUpPressed = false;
            dialogBox.classList.add("show");
        }
        return;
    }

    if (escaladaGame.isGameOver) return;

    if (escaladaGame.invulTimer > 0) escaladaGame.invulTimer--;
    if (escaladaGame.shakeTimer > 0) escaladaGame.shakeTimer--;
    if (escaladaGame.slipTimer > 0) escaladaGame.slipTimer--;
    if (escaladaGame.fallFrames > 0) escaladaGame.fallFrames--;
    if (escaladaGame.settleTimer > 0) escaladaGame.settleTimer--;

    if (escaladaGame.respawnTimer > 0) {
        escaladaGame.respawnTimer--;
        climbUpPressed = false;
        gerenciarParticulas();
        if (escaladaGame.respawnTimer === 0) respawnEscaladaNoCheckpoint();
        return;
    }

    if (escaladaGame.finishStarted) {
        escaladaGame.summitTimer--;
        gerenciarParticulas();
        if (escaladaGame.summitTimer <= 0) finalizarMinigame("VITORIA");
        return;
    }

    escaladaGame.climbFrameTimer++;
    if (escaladaGame.climbFrameTimer > 10) {
        escaladaGame.climbFrameTimer = 0;
        escaladaGame.climbFrameIndex = (escaladaGame.climbFrameIndex + 1) % 4;
    }

    hintText.innerText = "A/D controla a trajetória  •  ESPAÇO/W salta  •  aproxime-se para agarrar  •  brilho = bônus";

    if (climbUpPressed) escaladaGame.jumpBufferTimer = 6;
    climbUpPressed = false;

    if (escaladaGame.jumpBufferTimer > 0) {
        if (tentarPular()) escaladaGame.jumpBufferTimer = 0;
        else escaladaGame.jumpBufferTimer--;
    }

    gerenciarPedras();
    atualizarFisicaEscalada();
    atualizarCameraEMundo();
    gerenciarPedras(false);
    if ((escaladaGame.playerState === 'GRABBED' || escaladaGame.playerState === 'STANDING') && escaladaGame.pedraAtual) {
        escaladaGame.playerX = escaladaGame.pedraAtual.x;
        escaladaGame.playerY = escaladaGame.pedraAtual.y;
    }
    resolverQuedaEscalada();
    gerenciarVento();
    gerenciarObjetosCaindo();
    gerenciarParticulas();
    
    const sectionMessages = {
        route_choice: 'MESTRE: Escolha: rota longa e segura ou atalho arriscado.',
        moving_holds: 'MESTRE: Observe o ciclo e transfira entre pedras moveis.',
        special_holds: 'MESTRE: Gelo, musgo e rochas frageis mudam seu ritmo.',
        master_pressure: 'MESTRE: Meus arremessos pressionam uma rota; procure outra!',
        final_gauntlet: 'MESTRE: Ultimo gauntlet. Ainda existem dois caminhos!'
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

    // 1. Parede rochosa com grandes planos e uma leitura de subida vertical.
    const progresso = Math.min(1, escaladaGame.alturaAtual / escaladaGame.alturaTotal);
    let gradiente = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (progresso < 0.35) {
        gradiente.addColorStop(0, "#8d6751");
        gradiente.addColorStop(0.5, "#634638");
        gradiente.addColorStop(1, "#382a27");
    } else if (progresso < 0.75) {
        gradiente.addColorStop(0, "#74818a");
        gradiente.addColorStop(0.5, "#52616b");
        gradiente.addColorStop(1, "#39464e");
    } else {
        gradiente.addColorStop(0, "#b7d9e3");
        gradiente.addColorStop(0.28, "#758e9a");
        gradiente.addColorStop(1, "#3c4b56");
    }
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const activeSection = getCurrentClimbSection();
    const wallLeft = 750 - activeSection.width * 0.5 - cameraX;
    const wallRight = 750 + activeSection.width * 0.5 - cameraX;
    ctx.fillStyle = "rgba(17, 13, 16, 0.58)";
    if (wallLeft > 0) ctx.fillRect(0, 0, wallLeft, canvas.height);
    if (wallRight < canvas.width) ctx.fillRect(wallRight, 0, canvas.width - wallRight, canvas.height);
    ctx.strokeStyle = "rgba(235, 210, 172, 0.22)";
    ctx.lineWidth = 4;
    if (wallLeft > -10 && wallLeft < canvas.width + 10) {
        ctx.beginPath(); ctx.moveTo(wallLeft, 0); ctx.lineTo(wallLeft, canvas.height); ctx.stroke();
    }
    if (wallRight > -10 && wallRight < canvas.width + 10) {
        ctx.beginPath(); ctx.moveTo(wallRight, 0); ctx.lineTo(wallRight, canvas.height); ctx.stroke();
    }

    // Broad, low contrast rock facets move with the wall instead of reading as a flat color.
    for (let i = -2; i < 8; i++) {
        const worldY = Math.floor((escaladaGame.alturaAtual * 0.55) / 190) * 190 + i * 190;
        const screenY = ((i * 190 - (escaladaGame.alturaAtual * 0.55)) % (canvas.height + 190) + canvas.height + 190) % (canvas.height + 190) - 90;
        const facetX = ((i * 173 + worldY * 0.13) % escaladaGame.mountainWidth) - cameraX;
        ctx.fillStyle = i % 2 ? "rgba(232, 211, 181, 0.055)" : "rgba(10, 18, 24, 0.09)";
        ctx.beginPath();
        ctx.moveTo(facetX, screenY);
        ctx.lineTo(facetX + 150, screenY + 34);
        ctx.lineTo(facetX + 95, screenY + 142);
        ctx.lineTo(facetX - 45, screenY + 108);
        ctx.closePath(); ctx.fill();
    }

    // Fendas rochosas e estratos montanhosos na coordenada de mundo (1500px)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
        let fendaMundoX = 30 + (i * 58);
        let renderFendaX = fendaMundoX - cameraX;
        let fendaY = ((i * 55 - (escaladaGame.alturaAtual * 0.4)) % (canvas.height + 80));
        
        if (renderFendaX > -40 && renderFendaX < canvas.width + 40) {
            ctx.beginPath();
            ctx.moveTo(renderFendaX, fendaY);
            ctx.lineTo(renderFendaX + 18, fendaY + 35);
            ctx.lineTo(renderFendaX + 8, fendaY + 70);
            ctx.stroke();
        }
    }

    // Paredões de penhasco nas extremidades do mundo da montanha
    const leftCliffRenderX = 0 - cameraX;
    if (leftCliffRenderX + 40 > 0) {
        ctx.fillStyle = "#271c19";
        ctx.fillRect(0, 0, Math.max(0, leftCliffRenderX + 40), canvas.height);
    }
    const rightCliffRenderX = (escaladaGame.mountainWidth - 40) - cameraX;
    if (rightCliffRenderX < canvas.width) {
        ctx.fillStyle = "#271c19";
        ctx.fillRect(Math.max(0, rightCliffRenderX), 0, canvas.width - rightCliffRenderX, canvas.height);
    }

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

    // 3. Desenhar Agarras Coloridas de Escalada (Estilo Google Doodle Champion Island)
    escaladaGame.pedrasGeradas.forEach((p) => {
        if (p.quebrada) return;
        const renderX = p.x - cameraX;
        const renderY = p.y - cameraY;

        if (renderX > -60 && renderX < canvas.width + 60 && renderY > -60 && renderY < canvas.height + 60) {
            let shakePedraX = 0;
            if (p.tipo === 'brittle' && p.quebrando) {
                shakePedraX = (Math.random() - 0.5) * 4;
            }

            if (isMovingClimbHold(p)) {
                const baseRenderX = p.baseX - cameraX;
                const baseRenderY = 220 - p.climbY + escaladaGame.alturaAtual;
                ctx.save();
                ctx.strokeStyle = 'rgba(164, 239, 255, 0.30)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 5]);
                ctx.beginPath();
                const samples = (p.tipo === 'moving_rect' || p.tipo === 'moving_triangle') ? 24 : 36;
                for (let sample = 0; sample <= samples; sample++) {
                    const motion = sampleClimbHoldMotion(p, (sample / samples) * Math.PI * 2);
                    const trackX = baseRenderX + motion.x;
                    const trackY = baseRenderY + motion.y;
                    if (sample === 0) ctx.moveTo(trackX, trackY);
                    else ctx.lineTo(trackX, trackY);
                }
                ctx.stroke();
                ctx.restore();
            }

            // Renderiza de acordo com o tipo de agarra
            if (p.tipo === 'checkpoint') {
                // Pequeno patamar de descanso: checkpoint é uma superfície real,
                // sem transformar a escalada inteira em plataformas.
                ctx.fillStyle = "#4a3a32";
                ctx.fillRect(renderX - 52, renderY + 13, 104, 13);
                ctx.fillStyle = "#a88a63";
                ctx.fillRect(renderX - 55, renderY + 10, 110, 5);
                if (climbAssets.holds.checkpoint.complete && climbAssets.holds.checkpoint.naturalWidth > 0) {
                    ctx.shadowColor = "#f1c40f";
                    ctx.shadowBlur = 14;
                    ctx.drawImage(climbAssets.holds.checkpoint, renderX - 28, renderY - 28, 56, 56);
                    ctx.shadowBlur = 0;
                }
            } else if (p.tipo === 'bonus') {
                if (climbAssets.holds.bonus.complete && climbAssets.holds.bonus.naturalWidth > 0) {
                    ctx.shadowColor = "#48e7ff";
                    ctx.shadowBlur = 12;
                    ctx.drawImage(climbAssets.holds.bonus, renderX - 28, renderY - 28, 56, 56);
                    ctx.shadowBlur = 0;
                }
            } else if (isMovingClimbHold(p) || p.tipo === 'ice') {
                if (climbAssets.holds.moving.complete && climbAssets.holds.moving.naturalWidth > 0) {
                    ctx.shadowColor = "#00e5ff";
                    ctx.shadowBlur = 10;
                    ctx.drawImage(climbAssets.holds.moving, renderX + shakePedraX - 22, renderY - 22, 44, 44);
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = "#0288d1";
                    ctx.beginPath(); ctx.arc(renderX + shakePedraX, renderY, p.r, 0, Math.PI * 2); ctx.fill();
                }
            } else if (p.tipo === 'brittle') {
                if (climbAssets.holds.brittle.complete && climbAssets.holds.brittle.naturalWidth > 0) {
                    ctx.drawImage(climbAssets.holds.brittle, renderX + shakePedraX - 21, renderY - 21, 42, 42);
                } else {
                    ctx.fillStyle = "#e74c3c";
                    ctx.beginPath(); ctx.arc(renderX + shakePedraX, renderY, p.r, 0, Math.PI * 2); ctx.fill();
                }
                if (p.quebrando) {
                    const urgency = 1 - p.tempoRestante / p.breakMax;
                    ctx.strokeStyle = urgency > 0.65 ? '#fff3b0' : '#6d261f';
                    ctx.lineWidth = 1.5 + urgency;
                    ctx.beginPath();
                    ctx.moveTo(renderX - 8, renderY - 11);
                    ctx.lineTo(renderX - 2, renderY - 2);
                    ctx.lineTo(renderX - 7, renderY + 9);
                    ctx.moveTo(renderX + 6, renderY - 9);
                    ctx.lineTo(renderX + 1, renderY + 1);
                    ctx.lineTo(renderX + 9, renderY + 8);
                    ctx.stroke();
                }
            } else if (p.tipo === 'moss') {
                if (climbAssets.holds.moss.complete && climbAssets.holds.moss.naturalWidth > 0) {
                    ctx.drawImage(climbAssets.holds.moss, renderX - 23, renderY - 23, 46, 46);
                }
            } else if (p.tipo === 'danger' || p.tipo === 'spike') {
                if (climbAssets.holds.danger.complete && climbAssets.holds.danger.naturalWidth > 0) {
                    ctx.drawImage(climbAssets.holds.danger, renderX - 23, renderY - 23, 46, 46);
                }
            } else if (p.tipo === 'purple') {
                if (climbAssets.holds.purple.complete && climbAssets.holds.purple.naturalWidth > 0) {
                    ctx.drawImage(climbAssets.holds.purple, renderX - 21, renderY - 21, 42, 42);
                } else {
                    ctx.fillStyle = "#8e44ad";
                    ctx.beginPath(); ctx.arc(renderX, renderY, p.r, 0, Math.PI * 2); ctx.fill();
                }
            } else {
                if (climbAssets.holds.normal.complete && climbAssets.holds.normal.naturalWidth > 0) {
                    ctx.drawImage(climbAssets.holds.normal, renderX - 21, renderY - 21, 42, 42);
                } else {
                    ctx.fillStyle = "#27ae60";
                    ctx.beginPath(); ctx.arc(renderX, renderY, p.r, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
    });

    // 4. Desenhar Jogador (Zorp - Sprites Puros de Escalada de Costas, Sem Pedra de Gelo)
    const playerRenderX = escaladaGame.playerX - cameraX;
    const playerRenderY = escaladaGame.playerY - cameraY;
    const isBlinking = (escaladaGame.invulTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0);

    if (!isBlinking) {
        let currentZorpSprite = null;
        let zW = 72, zH = 98;

        if (escaladaGame.finishStarted && escaladaGame.summitTimer < 42) {
            currentZorpSprite = climbAssets.zorp.victory[Math.floor(Date.now() / 180) % climbAssets.zorp.victory.length];
        } else if (escaladaGame.fallFrames > 0) {
            currentZorpSprite = climbAssets.zorp.fall;
        } else if (escaladaGame.invulTimer > 42) {
            currentZorpSprite = climbAssets.zorp.stun;
        } else if (escaladaGame.playerState === 'AIRBORNE' || escaladaGame.playerState === 'GRABBING') {
            if (escaladaGame.jumpDir < 0) {
                currentZorpSprite = climbAssets.zorp.pushLeft;
            } else if (escaladaGame.jumpDir > 0) {
                currentZorpSprite = climbAssets.zorp.pushRight;
            } else {
                currentZorpSprite = climbAssets.zorp.pushUp;
            }
        } else if (escaladaGame.slipTimer > 0) {
            currentZorpSprite = climbAssets.zorp.slip[Math.floor(Date.now() / 110) % climbAssets.zorp.slip.length];
        } else if (keys.a) {
            currentZorpSprite = climbAssets.zorp.reachLeft;
        } else if (keys.d) {
            currentZorpSprite = climbAssets.zorp.reachRight;
        } else {
            const climbFrames = [climbAssets.zorp.idle[0], climbAssets.zorp.climb[0], climbAssets.zorp.idle[1], climbAssets.zorp.climb[1]];
            currentZorpSprite = climbFrames[escaladaGame.climbFrameIndex % climbFrames.length];
        }

        if (currentZorpSprite && currentZorpSprite.complete && currentZorpSprite.naturalWidth > 0) {
            ctx.drawImage(
                currentZorpSprite,
                playerRenderX - zW / 2,
                playerRenderY - zH + 6,
                zW, zH
            );
        } else {
            ctx.fillStyle = "#2ecc71";
            ctx.beginPath();
            ctx.arc(playerRenderX, playerRenderY - 12, 14, 0, Math.PI * 2);
            ctx.fill();
        }
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

    // 7. Vento Montanhoso
    if (escaladaGame.ventoParticulas.length > 0) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        escaladaGame.ventoParticulas.forEach(vp => {
            const renderX = vp.x - cameraX;
            ctx.globalAlpha = vp.alpha;
            ctx.beginPath();
            ctx.moveTo(renderX, vp.y);
            ctx.lineTo(renderX + vp.vx * 3, vp.y + vp.vy * 3);
            ctx.stroke();
        });
        ctx.globalAlpha = 1.0;
    }

    // 8. Cume do Monte Zorp
    const topoDist = (escaladaGame.alturaTotal - escaladaGame.alturaAtual);
    const topoRenderY = escaladaGame.playerY - topoDist - cameraY;
    if (topoRenderY > -150 && topoRenderY < canvas.height) {
        // Platô do Cume amplo (1500px)
        const platoRenderX = 40 - cameraX;
        ctx.fillStyle = "#eceff1";
        ctx.fillRect(platoRenderX, topoRenderY + 30, escaladaGame.mountainWidth - 80, 26);
        
        // Mastro da Bandeira no centro
        const flagRenderX = 750 - cameraX;
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(flagRenderX, topoRenderY - 14, 5, 45);
        ctx.fillStyle = "#e74c3c";
        ctx.beginPath();
        ctx.moveTo(flagRenderX + 5, topoRenderY - 14);
        ctx.lineTo(flagRenderX + 34, topoRenderY - 2);
        ctx.lineTo(flagRenderX + 5, topoRenderY + 10);
        ctx.closePath();
        ctx.fill();

        // Mestre da Escalada esperando no topo
        if (imgMestreEscalada.complete) {
            ctx.drawImage(imgMestreEscalada, flagRenderX + 45, topoRenderY - 20, 36, 54);
        }
    }

    ctx.restore(); // Restaura contexto após tremor

    // 9. HUD Superior e Minimapa 2D
    // Minimapa Amplo
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(escaladaGame.minimapaX, escaladaGame.minimapaY, escaladaGame.minimapaLargura, escaladaGame.minimapaAltura);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(escaladaGame.minimapaX, escaladaGame.minimapaY, escaladaGame.minimapaLargura, escaladaGame.minimapaAltura);

    const progressoMini = Math.min(1, escaladaGame.alturaAtual / escaladaGame.alturaTotal);
    const posZorpY = escaladaGame.minimapaY + escaladaGame.minimapaAltura - (progressoMini * escaladaGame.minimapaAltura);
    const posZorpX = escaladaGame.minimapaX + (escaladaGame.playerX / escaladaGame.mountainWidth) * escaladaGame.minimapaLargura;

    // Marcador do Cume
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(escaladaGame.minimapaX - 2, escaladaGame.minimapaY, escaladaGame.minimapaLargura + 4, 3);

    // Marcador do Zorp
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(posZorpX, posZorpY, 3.5, 0, Math.PI * 2);
    ctx.fill();

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
    ctx.fillText(`VIDAS: ${coracoes}`, 65, 21);

    // Altura Atual
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`ALTITUDE: ${Math.floor(escaladaGame.alturaAtual)}m / ${escaladaGame.alturaTotal}m`, 230, 21);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`PONTOS ${escaladaGame.score}`, canvas.width - 10, canvas.height - 12);
    ctx.textAlign = "left";

    if (CLIMB_QA_MODE) {
        const qaSection = getCurrentClimbSection();
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        ctx.fillRect(62, canvas.height - 32, 250, 22);
        ctx.fillStyle = "#9fffe0";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`QA ${qaSection.id.toUpperCase()}  ${escaladaGame.currentStep}/92  ${escaladaGame.playerState}  ${escaladaGame.qaFps} FPS`, 68, canvas.height - 17);
    }

    // Indicador de Vento
    if (escaladaGame.ventoDuracao > 0) {
        ctx.fillStyle = (Date.now() % 400 < 200) ? "#00e5ff" : "#ffffff";
        ctx.font = "bold 11px monospace";
        let setaVento = escaladaGame.ventoDirecao > 0 ? ">>>" : "<<<";
        ctx.fillText(`VENTO ${setaVento}`, canvas.width - 85, 21);
    }

    // 10. Caixa de Diálogo do Mestre durante a subida
    if (escaladaGame.mensagemTimer > 0) {
        ctx.fillStyle = "rgba(20, 20, 30, 0.9)";
        ctx.fillRect(35, 42, canvas.width - 70, 44);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 2;
        ctx.strokeRect(35, 42, canvas.width - 70, 44);
        
        if (imgMestreEscalada.complete) {
            ctx.drawImage(imgMestreEscalada, 40, 45, 26, 38);
        }
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px monospace";
        ctx.fillText(escaladaGame.mensagemAtual, 75, 68);
    }
    
    // 11. Telas de Tutorial e Fim de Jogo
    if (escaladaGame.gameState === 'TUTORIAL') {
        drawOverlayScreen("ESCALADA NO MONTE ZORP", [
            `Suba ${Math.round(escaladaGame.alturaTotal)}m ate o cume controlando cada salto.`,
            "[A / D] controla o movimento; [ESPAÇO / W] dá um salto físico.",
            "Chegue perto de uma pedra para agarrar automaticamente; cair ainda permite recuperação.",
            "Gelo desliza, pedra rachada quebra; brilho vale pontos e recupera vida.",
            "Leia o circulo no chao: ele indica onde o proximo objeto vai cair."
        ], "#f1c40f");
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
    roundFrames: 55 * 60,
    playerSpeedX: 4.3,
    playerSpeedY: 3.2,
    arrowSpeed: 11.8,
    playerFireCooldown: 10,
    phaseBreaks: Object.freeze([0.34, 0.70]),
    maxTargets: Object.freeze([3, 4, 4]),
    patternIntervals: Object.freeze([168, 142, 118]),
    targetField: Object.freeze({ top: 44, bottom: 184 }),
    teleportThreshold: 8
});

const ARCHERY_SPEEDS = Object.freeze({
    SLOW: 0.92,
    MEDIUM: 1.38,
    FAST: 1.92,
    GOLD_FAST: 2.34
});

const ARCHERY_TARGET_TYPES = Object.freeze({
    NORMAL_LARGE: Object.freeze({ subtype: 'large', state: 'IDLE', radius: 22, basePoints: 10, renderSize: 72, sizeTier: 'LARGE', golden: false }),
    NORMAL_MEDIUM: Object.freeze({ subtype: 'medium', state: 'IDLE', radius: 17, basePoints: 16, renderSize: 62, sizeTier: 'MEDIUM', golden: false }),
    NORMAL_SMALL: Object.freeze({ subtype: 'small', state: 'IDLE', radius: 12, basePoints: 26, renderSize: 52, sizeTier: 'SMALL', golden: false }),
    GOLD_SMALL: Object.freeze({ subtype: 'golden', state: 'BONUS', radius: 9, basePoints: 75, renderSize: 45, sizeTier: 'SMALL', golden: true }),
    GOLD_FAST: Object.freeze({ subtype: 'golden', state: 'BONUS', radius: 14, basePoints: 68, renderSize: 58, sizeTier: 'MEDIUM', golden: true }),
    GOLD_ZIGZAG: Object.freeze({ subtype: 'golden', state: 'BONUS', radius: 12, basePoints: 82, renderSize: 52, sizeTier: 'SMALL', golden: true }),
    GOLD_S_CURVE: Object.freeze({ subtype: 'golden', state: 'BONUS', radius: 12, basePoints: 86, renderSize: 52, sizeTier: 'SMALL', golden: true }),
    GOLD_CIRCLE: Object.freeze({ subtype: 'golden', state: 'BONUS', radius: 13, basePoints: 90, renderSize: 55, sizeTier: 'MEDIUM', golden: true }),
    GOLD_ARC: Object.freeze({ subtype: 'golden', state: 'BONUS', radius: 12, basePoints: 84, renderSize: 52, sizeTier: 'SMALL', golden: true }),
    GOLD_FIGURE8: Object.freeze({ subtype: 'golden', state: 'BONUS', radius: 11, basePoints: 105, renderSize: 49, sizeTier: 'SMALL', golden: true })
});

const ARCHERY_PATH_TYPES = Object.freeze([
    'HORIZONTAL', 'DIAGONAL', 'ZIGZAG', 'S_CURVE', 'CIRCLE',
    'ELLIPSE', 'ARC', 'WAVE', 'FIGURE_EIGHT'
]);

const ARCHERY_PATTERNS = Object.freeze([
    Object.freeze({ id: 'OPENING_HORIZONTAL', phases: [0], targets: [
        { delay: 0, kind: 'NORMAL_LARGE', path: 'HORIZONTAL', speed: 'SLOW', entry: 'LEFT', lane: 'LOW' },
        { delay: 54, kind: 'NORMAL_LARGE', path: 'HORIZONTAL', speed: 'SLOW', entry: 'RIGHT', lane: 'HIGH' }
    ] }),
    Object.freeze({ id: 'EASY_ARC', phases: [0], targets: [
        { delay: 0, kind: 'NORMAL_MEDIUM', path: 'ARC', speed: 'SLOW', entry: 'LEFT', lane: 'LOW', amplitude: 54 },
        { delay: 62, kind: 'NORMAL_LARGE', path: 'HORIZONTAL', speed: 'MEDIUM', entry: 'RIGHT', lane: 'MID' }
    ] }),
    Object.freeze({ id: 'DIAGONAL_CROSS', phases: [1], targets: [
        { delay: 0, kind: 'NORMAL_MEDIUM', path: 'DIAGONAL', speed: 'MEDIUM', entry: 'LEFT', lane: 'LOW', exitLane: 'HIGH' },
        { delay: 48, kind: 'NORMAL_SMALL', path: 'DIAGONAL', speed: 'MEDIUM', entry: 'RIGHT', lane: 'HIGH', exitLane: 'LOW' }
    ] }),
    Object.freeze({ id: 'ZIGZAG_PAIR', phases: [1], targets: [
        { delay: 0, kind: 'NORMAL_MEDIUM', path: 'ZIGZAG', speed: 'MEDIUM', entry: 'LEFT', lane: 'MID', amplitude: 35 },
        { delay: 70, kind: 'NORMAL_SMALL', path: 'ZIGZAG', speed: 'MEDIUM', entry: 'RIGHT', lane: 'MID', amplitude: 42, phaseOffset: Math.PI }
    ] }),
    Object.freeze({ id: 'S_AND_GOLD_SMALL', phases: [1], goldEvent: true, targets: [
        { delay: 0, kind: 'NORMAL_MEDIUM', path: 'S_CURVE', speed: 'MEDIUM', entry: 'LEFT', lane: 'MID', amplitude: 44 },
        { delay: 66, kind: 'GOLD_SMALL', path: 'HORIZONTAL', speed: 'FAST', entry: 'RIGHT', lane: 'HIGH' }
    ] }),
    Object.freeze({ id: 'WAVE_AND_DIAGONAL', phases: [1, 2], targets: [
        { delay: 0, kind: 'NORMAL_SMALL', path: 'WAVE', speed: 'MEDIUM', entry: 'LEFT', lane: 'MID', amplitude: 32 },
        { delay: 58, kind: 'NORMAL_MEDIUM', path: 'DIAGONAL', speed: 'FAST', entry: 'RIGHT', lane: 'LOW', exitLane: 'HIGH' }
    ] }),
    Object.freeze({ id: 'CIRCLE_AND_ARC', phases: [2], targets: [
        { delay: 0, kind: 'NORMAL_SMALL', path: 'CIRCLE', speed: 'FAST', entry: 'LEFT', lane: 'MID' },
        { delay: 78, kind: 'NORMAL_MEDIUM', path: 'ARC', speed: 'FAST', entry: 'RIGHT', lane: 'LOW', amplitude: 70 }
    ] }),
    Object.freeze({ id: 'ADVANCED_ELLIPSE_WAVE', phases: [2], targets: [
        { delay: 0, kind: 'NORMAL_MEDIUM', path: 'ELLIPSE', speed: 'FAST', entry: 'RIGHT', lane: 'MID' },
        { delay: 76, kind: 'NORMAL_SMALL', path: 'WAVE', speed: 'FAST', entry: 'LEFT', lane: 'MID', amplitude: 34 }
    ] }),
    Object.freeze({ id: 'ELLIPSE_GOLD_FAST', phases: [2], goldEvent: true, targets: [
        { delay: 0, kind: 'NORMAL_MEDIUM', path: 'ELLIPSE', speed: 'FAST', entry: 'RIGHT', lane: 'MID' },
        { delay: 82, kind: 'GOLD_FAST', path: 'HORIZONTAL', speed: 'GOLD_FAST', entry: 'LEFT', lane: 'HIGH' }
    ] }),
    Object.freeze({ id: 'GOLD_CURVES', phases: [2], goldEvent: true, targets: [
        { delay: 0, kind: 'NORMAL_LARGE', path: 'HORIZONTAL', speed: 'FAST', entry: 'RIGHT', lane: 'LOW' },
        { delay: 52, kind: 'GOLD_ZIGZAG', path: 'ZIGZAG', speed: 'GOLD_FAST', entry: 'LEFT', lane: 'MID', amplitude: 39 },
        { delay: 120, kind: 'NORMAL_SMALL', path: 'S_CURVE', speed: 'FAST', entry: 'RIGHT', lane: 'MID', amplitude: 47 }
    ] }),
    Object.freeze({ id: 'RARE_GOLD_FIGURE8', phases: [2], rare: true, goldEvent: true, targets: [
        { delay: 0, kind: 'NORMAL_SMALL', path: 'WAVE', speed: 'FAST', entry: 'LEFT', lane: 'LOW', amplitude: 29 },
        { delay: 74, kind: 'GOLD_FIGURE8', path: 'FIGURE_EIGHT', speed: 'FAST', entry: 'RIGHT', lane: 'MID' }
    ] }),
    Object.freeze({ id: 'GOLD_CIRCLE_EVENT', phases: [2], rare: true, goldEvent: true, targets: [
        { delay: 0, kind: 'GOLD_CIRCLE', path: 'CIRCLE', speed: 'FAST', entry: 'LEFT', lane: 'MID' },
        { delay: 104, kind: 'NORMAL_MEDIUM', path: 'ARC', speed: 'FAST', entry: 'RIGHT', lane: 'LOW', amplitude: 58 }
    ] })
]);

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

    mestreX: 315,
    mestreY: 252,
    mestreState: 'IDLE',
    mestreShootTimer: 0,
    mestreShootCooldown: 0,
    mestreReactionTimer: 0,
    mestreAimTargetId: null,
    mestreDecisionTimer: 0,
    mestreAimError: 0,

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
    midGoldMomentQueued: false,
    finalGoldMomentQueued: false,
    roundFrame: 0,
    roundFrames: ARCHERY_CONFIG.roundFrames,
    phase: 0,
    gameState: 'TUTORIAL',
    win: false,
    tie: false,
    stats: null
};

function resetArco() {
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
    arcoGame.mestreReactionTimer = 0;
    arcoGame.mestreAimTargetId = null;
    arcoGame.mestreDecisionTimer = 0;
    arcoGame.mestreAimError = 0;
    while (arcoGame.arrows.length) arcoGame.arrowPool.push(arcoGame.arrows.pop());
    while (arcoGame.targets.length) arcoGame.targetPool.push(arcoGame.targets.pop());
    while (arcoGame.effects.length) arcoGame.effectPool.push(arcoGame.effects.pop());
    arcoGame.pendingTargetSpawns.length = 0;
    arcoGame.spawnTimer = 0;
    arcoGame.lastPatternId = null;
    arcoGame.nextTargetId = 1;
    arcoGame.midGoldMomentQueued = false;
    arcoGame.finalGoldMomentQueued = false;
    arcoGame.roundFrame = 0;
    arcoGame.roundFrames = ARCHERY_CONFIG.roundFrames;
    arcoGame.phase = 0;
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
        targetExits: 0,
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
    const progress = arcoGame.roundFrame / Math.max(1, arcoGame.roundFrames);
    return progress < ARCHERY_CONFIG.phaseBreaks[0] ? 0 : (progress < ARCHERY_CONFIG.phaseBreaks[1] ? 1 : 2);
}

function getArcoLaneY(lane) {
    if (lane === 'HIGH') return 66;
    if (lane === 'LOW') return 158;
    return 112;
}

function acquireArcoObject(pool, fields) {
    return Object.assign(pool.pop() || {}, fields);
}

function evaluateArcoTargetPath(target, progress) {
    const p = clampArco(progress, 0, 1);
    const direction = target.entry === 'LEFT' ? 1 : -1;
    const startX = direction === 1 ? -target.margin : canvas.width + target.margin;
    const endX = direction === 1 ? canvas.width + target.margin : -target.margin;
    const linearX = startX + (endX - startX) * p;
    const laneY = target.laneY;
    const amplitude = target.amplitude;
    let x = linearX;
    let y = laneY;

    if (target.pathType === 'DIAGONAL') {
        y = laneY + (target.exitY - laneY) * p;
    } else if (target.pathType === 'ZIGZAG') {
        y = laneY + Math.sin(p * Math.PI * 4 + target.phaseOffset) * amplitude;
    } else if (target.pathType === 'S_CURVE') {
        y = laneY + Math.sin((p - 0.5) * Math.PI) * amplitude;
    } else if (target.pathType === 'ARC') {
        y = laneY - Math.sin(p * Math.PI) * amplitude;
    } else if (target.pathType === 'WAVE') {
        y = laneY + Math.sin(p * Math.PI * 6 + target.phaseOffset) * amplitude;
    } else if (target.pathType === 'CIRCLE' || target.pathType === 'ELLIPSE') {
        const enterEnd = 0.18;
        const orbitEnd = 0.80;
        const radiusX = target.pathType === 'ELLIPSE' ? 96 : 63;
        const radiusY = target.pathType === 'ELLIPSE' ? 39 : 58;
        const centerX = canvas.width / 2;
        const centerY = laneY;
        const anchorX = centerX - direction * radiusX;
        if (p < enterEnd) {
            const q = p / enterEnd;
            x = startX + (anchorX - startX) * q;
            y = laneY;
        } else if (p <= orbitEnd) {
            const q = (p - enterEnd) / (orbitEnd - enterEnd);
            const startAngle = direction === 1 ? Math.PI : 0;
            const angle = startAngle + direction * q * Math.PI * 2;
            x = centerX + Math.cos(angle) * radiusX;
            y = centerY + Math.sin(angle) * radiusY;
        } else {
            const q = (p - orbitEnd) / (1 - orbitEnd);
            x = anchorX + (startX - anchorX) * q;
            y = laneY;
        }
    } else if (target.pathType === 'FIGURE_EIGHT') {
        const enterEnd = 0.18;
        const loopEnd = 0.82;
        const centerX = canvas.width / 2;
        const centerY = laneY;
        if (p < enterEnd) {
            const q = p / enterEnd;
            x = startX + (centerX - startX) * q;
            y = laneY;
        } else if (p <= loopEnd) {
            const q = (p - enterEnd) / (loopEnd - enterEnd);
            const angle = q * Math.PI * 2;
            x = centerX + Math.sin(angle) * 92 * direction;
            y = centerY + Math.sin(angle * 2) * 43;
        } else {
            const q = (p - loopEnd) / (1 - loopEnd);
            x = centerX + (endX - centerX) * q;
            y = laneY;
        }
    }

    return {
        x,
        y: clampArco(y, ARCHERY_CONFIG.targetField.top, ARCHERY_CONFIG.targetField.bottom)
    };
}

function spawnArcoTarget(descriptor) {
    const kind = descriptor.kind || 'NORMAL_MEDIUM';
    const spec = ARCHERY_TARGET_TYPES[kind] || ARCHERY_TARGET_TYPES.NORMAL_MEDIUM;
    const pathType = ARCHERY_PATH_TYPES.includes(descriptor.path) ? descriptor.path : 'HORIZONTAL';
    const speedTier = ARCHERY_SPEEDS[descriptor.speed] ? descriptor.speed : 'MEDIUM';
    const entry = descriptor.entry || (Math.random() < 0.5 ? 'LEFT' : 'RIGHT');
    const speedVariation = descriptor.exactSpeed ? 1 : 0.94 + Math.random() * 0.12;
    const target = acquireArcoObject(arcoGame.targetPool, {
        id: arcoGame.nextTargetId++,
        x: 0,
        y: 0,
        previousX: 0,
        previousY: 0,
        speedX: 0,
        speedY: 0,
        type: kind,
        assetSubtype: spec.subtype,
        assetState: spec.state,
        pathType,
        speedTier,
        speed: ARCHERY_SPEEDS[speedTier] * speedVariation,
        sizeTier: spec.sizeTier,
        radius: spec.radius,
        basePoints: spec.basePoints,
        renderSize: spec.renderSize,
        isGolden: spec.golden,
        entry,
        entryPoint: entry,
        exitPoint: (pathType === 'CIRCLE' || pathType === 'ELLIPSE') ? entry : (entry === 'LEFT' ? 'RIGHT' : 'LEFT'),
        laneY: getArcoLaneY(descriptor.lane),
        exitY: getArcoLaneY(descriptor.exitLane || descriptor.lane),
        amplitude: descriptor.amplitude || (pathType === 'WAVE' ? 31 : 38),
        phaseOffset: descriptor.phaseOffset || 0,
        margin: spec.renderSize * 0.58 + 12,
        pathLength: (pathType === 'CIRCLE' || pathType === 'ELLIPSE' || pathType === 'FIGURE_EIGHT') ? 610 : 540,
        progress: 0,
        age: 0,
        active: true,
        visible: false,
        qaStatic: !!descriptor.qaStatic,
        hit: false,
        animationOffset: Math.floor(Math.random() * 5)
    });
    const start = descriptor.qaStatic
        ? { x: descriptor.x || 225, y: descriptor.y || 105 }
        : evaluateArcoTargetPath(target, 0);
    target.x = target.previousX = start.x;
    target.y = target.previousY = start.y;
    target.visible = descriptor.qaStatic;
    arcoGame.targets.push(target);
    arcoGame.stats.maxTargets = Math.max(arcoGame.stats.maxTargets, arcoGame.targets.length);
    arcoGame.stats.spawnedTypes[kind] = (arcoGame.stats.spawnedTypes[kind] || 0) + 1;
    arcoGame.stats.pathTypes[pathType] = (arcoGame.stats.pathTypes[pathType] || 0) + 1;
    arcoGame.stats.speedTiers[speedTier] = (arcoGame.stats.speedTiers[speedTier] || 0) + 1;
    if (spec.golden) arcoGame.stats.goldenTargetsSpawned++;
    else arcoGame.stats.normalTargetsSpawned++;
    return target;
}

function chooseArcoPattern() {
    let candidates = ARCHERY_PATTERNS.filter((pattern) => pattern.phases.includes(arcoGame.phase));
    const roll = Math.random();
    if (arcoGame.phase === 2 && roll < 0.05) {
        candidates = candidates.filter((pattern) => pattern.rare);
    } else {
        const chooseGold = (arcoGame.phase === 1 && roll < 0.10)
            || (arcoGame.phase === 2 && roll < 0.22);
        candidates = candidates.filter((pattern) => !pattern.rare && !!pattern.goldEvent === chooseGold);
    }
    const alternatives = candidates.filter((pattern) => pattern.id !== arcoGame.lastPatternId);
    if (alternatives.length) candidates = alternatives;
    return candidates[Math.floor(Math.random() * candidates.length)] || ARCHERY_PATTERNS[0];
}

function queueArcoPattern(pattern) {
    arcoGame.lastPatternId = pattern.id;
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
    arcoGame.gameState = 'PLAYING';
    arcoGame.roundFrame = 0;
    arcoGame.spawnTimer = 0;
    arcoGame.targets.length = 0;
    arcoGame.pendingTargetSpawns.length = 0;
    if (archeryQaParams.get('archeryQaBullseye') === '1') {
        spawnArcoTarget({ kind: 'NORMAL_LARGE', path: 'HORIZONTAL', speed: 'SLOW', entry: 'LEFT', lane: 'MID', qaStatic: true, x: 225, y: 105 });
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
            { kind: 'GOLD_SMALL', path: 'HORIZONTAL', speed: 'FAST', entry: 'LEFT', lane: 'HIGH' },
            { kind: 'GOLD_FAST', path: 'DIAGONAL', speed: 'GOLD_FAST', entry: 'RIGHT', lane: 'LOW', exitLane: 'HIGH' },
            { kind: 'GOLD_ZIGZAG', path: 'ZIGZAG', speed: 'FAST', entry: 'LEFT', lane: 'MID', amplitude: 39 },
            { kind: 'GOLD_S_CURVE', path: 'S_CURVE', speed: 'FAST', entry: 'RIGHT', lane: 'MID', amplitude: 46 },
            { kind: 'GOLD_CIRCLE', path: 'CIRCLE', speed: 'FAST', entry: 'LEFT', lane: 'MID' },
            { kind: 'GOLD_ARC', path: 'ARC', speed: 'FAST', entry: 'RIGHT', lane: 'LOW', amplitude: 68 },
            { kind: 'GOLD_FIGURE8', path: 'FIGURE_EIGHT', speed: 'FAST', entry: 'LEFT', lane: 'MID' }
        ]);
    } else {
        queueArcoPattern(ARCHERY_PATTERNS[0]);
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

function fireArcoArrow(owner, target = null) {
    const isPlayer = owner === 'PLAYER';
    const x = isPlayer ? arcoGame.playerX : arcoGame.mestreX;
    const y = (isPlayer ? arcoGame.playerY : arcoGame.mestreY) - 49;
    const speed = isPlayer ? ARCHERY_CONFIG.arrowSpeed : ARCHERY_CONFIG.arrowSpeed + 0.35;
    let speedX = 0;
    if (!isPlayer && target) {
        const travelFrames = Math.max(1, (y - target.y) / speed);
        const predictedX = target.x + target.speedX * travelFrames;
        speedX = clampArco((predictedX + arcoGame.mestreAimError - x) / travelFrames, -2.7, 2.7);
    }
    arcoGame.arrows.push(acquireArcoObject(arcoGame.arrowPool, {
        x,
        y,
        previousX: x,
        previousY: y,
        speedX,
        speedY: -speed,
        owner
    }));
    if (isPlayer) arcoGame.stats.playerShots++;
    else arcoGame.stats.mestreShots++;
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

    if (arcoGame.playerShootCooldown > 0) arcoGame.playerShootCooldown--;
    if (arcoGame.playerReactionTimer > 0) arcoGame.playerReactionTimer--;

    if (archeryShootPressed && arcoGame.playerShootCooldown <= 0) {
        fireArcoArrow('PLAYER');
        arcoGame.playerShootCooldown = ARCHERY_CONFIG.playerFireCooldown;
        arcoGame.playerShootTimer = 14;
        archeryShootPressed = false;
    }

    if (arcoGame.playerReactionTimer > 0) {
        arcoGame.playerState = 'MISS';
    } else if (arcoGame.playerShootTimer > 0) {
        arcoGame.playerShootTimer--;
        arcoGame.playerState = 'SHOOT';
    } else {
        arcoGame.playerState = moveX || moveY ? 'MOVE' : 'IDLE';
    }
}

function selectArcoMasterTarget() {
    return arcoGame.targets
        .filter((target) => target.active && target.visible && target.progress < 0.90)
        .sort((a, b) => {
            const valueDifference = b.basePoints - a.basePoints;
            if (valueDifference !== 0) return valueDifference;
            return Math.abs(a.x - arcoGame.mestreX) - Math.abs(b.x - arcoGame.mestreX);
        })[0] || null;
}

function updateArcoMaster() {
    const area = ARCHERY_CONFIG.shooterArea;
    if (archeryQaParams.get('archeryQaBullseye') === '1') {
        arcoGame.mestreState = 'IDLE';
        updateArcoRange(arcoGame.stats.mestreRange, arcoGame.mestreX, arcoGame.mestreY);
        return;
    }
    if (arcoGame.mestreShootCooldown > 0) arcoGame.mestreShootCooldown--;
    if (arcoGame.mestreReactionTimer > 0) arcoGame.mestreReactionTimer--;

    let target = arcoGame.targets.find((candidate) => candidate.id === arcoGame.mestreAimTargetId && candidate.active && candidate.visible) || null;
    if (!target) {
        target = selectArcoMasterTarget();
        arcoGame.mestreAimTargetId = target ? target.id : null;
        arcoGame.mestreDecisionTimer = target ? [42, 31, 23][arcoGame.phase] + Math.floor(Math.random() * 12) : 0;
        if (target) {
            const baseError = [25, 17, 11][arcoGame.phase];
            const deliberateMiss = Math.random() < [0.30, 0.22, 0.16][arcoGame.phase];
            arcoGame.mestreAimError = deliberateMiss
                ? (Math.random() < 0.5 ? -1 : 1) * (target.radius + 18 + Math.random() * 13)
                : (Math.random() * 2 - 1) * baseError;
        }
    }
    if (arcoGame.mestreDecisionTimer > 0) arcoGame.mestreDecisionTimer--;
    let moving = false;
    if (target && arcoGame.mestreShootTimer <= 0 && arcoGame.mestreDecisionTimer <= 0) {
        const speed = ARCHERY_CONFIG.arrowSpeed + 0.35;
        const travelFrames = Math.max(1, (arcoGame.mestreY - 49 - target.y) / speed);
        const aimX = clampArco(target.x + target.speedX * travelFrames + arcoGame.mestreAimError, area.left, area.right);
        const difference = aimX - arcoGame.mestreX;
        if (Math.abs(difference) > 8) {
            arcoGame.mestreX += Math.sign(difference) * (2.8 + arcoGame.phase * 0.25);
            moving = true;
        } else if (arcoGame.mestreShootCooldown <= 0) {
            fireArcoArrow('MESTRE', target);
            arcoGame.mestreShootCooldown = [78, 62, 50][arcoGame.phase];
            arcoGame.mestreShootTimer = 14;
            arcoGame.mestreAimTargetId = null;
        }
    }

    const desiredY = 226 + Math.sin(arcoGame.roundFrame / 100) * 6;
    if (Math.abs(desiredY - arcoGame.mestreY) > 1.5) {
        arcoGame.mestreY += Math.sign(desiredY - arcoGame.mestreY) * 1.35;
        moving = true;
    }
    arcoGame.mestreX = clampArco(arcoGame.mestreX, area.left, area.right);
    arcoGame.mestreY = clampArco(arcoGame.mestreY, area.front, area.back);
    updateArcoRange(arcoGame.stats.mestreRange, arcoGame.mestreX, arcoGame.mestreY);

    if (arcoGame.mestreReactionTimer > 0) {
        arcoGame.mestreState = 'MISS';
    } else if (arcoGame.mestreShootTimer > 0) {
        arcoGame.mestreShootTimer--;
        arcoGame.mestreState = 'SHOOT';
    } else {
        arcoGame.mestreState = moving ? 'MOVE' : 'IDLE';
    }
}

function updateArcoTargets() {
    for (let index = arcoGame.targets.length - 1; index >= 0; index--) {
        const target = arcoGame.targets[index];
        target.age++;
        if (!target.qaStatic) {
            target.previousX = target.x;
            target.previousY = target.y;
            target.progress = Math.min(1, target.progress + target.speed / target.pathLength);
            const position = evaluateArcoTargetPath(target, target.progress);
            target.x = position.x;
            target.y = position.y;
            target.speedX = target.x - target.previousX;
            target.speedY = target.y - target.previousY;
            const step = Math.hypot(target.speedX, target.speedY);
            arcoGame.stats.maxTargetStep = Math.max(arcoGame.stats.maxTargetStep, step);
            if (step > ARCHERY_CONFIG.teleportThreshold) arcoGame.stats.teleportEvents++;
        }
        target.visible = target.x >= -target.radius && target.x <= canvas.width + target.radius
            && target.y >= ARCHERY_CONFIG.targetField.top - target.radius
            && target.y <= ARCHERY_CONFIG.targetField.bottom + target.radius;
        if (target.progress >= 1 && !target.qaStatic) {
            arcoGame.stats.targetExits++;
            arcoGame.targetPool.push(arcoGame.targets.splice(index, 1)[0]);
        }
    }
}

function updateArcoTargetSpawns() {
    for (let index = arcoGame.pendingTargetSpawns.length - 1; index >= 0; index--) {
        const pending = arcoGame.pendingTargetSpawns[index];
        pending.delay--;
        if (pending.delay <= 0 && arcoGame.targets.length < ARCHERY_CONFIG.maxTargets[arcoGame.phase]) {
            spawnArcoTarget(pending.descriptor);
            arcoGame.pendingTargetSpawns.splice(index, 1);
        }
    }

    if (archeryQaParams.get('archeryQaBullseye') === '1'
        || archeryQaParams.get('archeryQaAllPaths') === '1'
        || archeryQaParams.get('archeryQaAllGold') === '1') return;

    const progress = arcoGame.roundFrame / Math.max(1, arcoGame.roundFrames);
    if (!arcoGame.midGoldMomentQueued && progress >= 0.47 && arcoGame.pendingTargetSpawns.length === 0) {
        arcoGame.midGoldMomentQueued = true;
        queueArcoPattern(ARCHERY_PATTERNS.find((pattern) => pattern.id === 'S_AND_GOLD_SMALL'));
        arcoGame.spawnTimer = 0;
        return;
    }
    if (!arcoGame.finalGoldMomentQueued && progress >= 0.82 && arcoGame.pendingTargetSpawns.length === 0) {
        arcoGame.finalGoldMomentQueued = true;
        const finalEventId = Math.random() < 0.5 ? 'RARE_GOLD_FIGURE8' : 'GOLD_CIRCLE_EVENT';
        queueArcoPattern(ARCHERY_PATTERNS.find((pattern) => pattern.id === finalEventId));
        arcoGame.spawnTimer = 0;
        return;
    }

    arcoGame.spawnTimer++;
    if (arcoGame.spawnTimer >= ARCHERY_CONFIG.patternIntervals[arcoGame.phase] && arcoGame.pendingTargetSpawns.length === 0) {
        queueArcoPattern(chooseArcoPattern());
        arcoGame.spawnTimer = 0;
    }
}

function awardArcoHit(arrow, target, impactDistance) {
    const normalized = impactDistance / Math.max(1, target.radius);
    const bullseye = normalized <= 0.35;
    const innerRing = normalized <= 0.70;
    let points = target.basePoints + (bullseye ? 30 : (innerRing ? 15 : 0));
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

    const subtype = target.isGolden ? 'bullseye' : (bullseye ? 'bullseye' : 'arrow_impact');
    const state = target.isGolden || bullseye ? 'BULLSEYE' : 'IMPACT';
    arcoGame.effects.push(acquireArcoObject(arcoGame.effectPool, {
        x: target.x,
        y: target.y,
        subtype,
        state,
        timer: target.isGolden ? 46 : 34,
        duration: target.isGolden ? 46 : 34,
        label: (target.isGolden ? 'GOLD +' : (bullseye ? 'BULLSEYE +' : '+')) + points,
        color: target.isGolden || bullseye ? '#ffe066' : '#ffffff'
    }));
}

function updateArcoArrows() {
    for (let arrowIndex = arcoGame.arrows.length - 1; arrowIndex >= 0; arrowIndex--) {
        const arrow = arcoGame.arrows[arrowIndex];
        arrow.previousX = arrow.x;
        arrow.previousY = arrow.y;
        arrow.x += arrow.speedX;
        arrow.y += arrow.speedY;
        let hitTargetIndex = -1;
        let impactDistance = Infinity;
        let impactX = arrow.x;

        for (let targetIndex = arcoGame.targets.length - 1; targetIndex >= 0; targetIndex--) {
            const target = arcoGame.targets[targetIndex];
            if (!target.active) continue;
            const crossedTargetCenter = arrow.previousY >= target.y && arrow.y <= target.y;
            if (!crossedTargetCenter) continue;
            const verticalTravel = Math.max(0.0001, arrow.previousY - arrow.y);
            const crossingRatio = clampArco((arrow.previousY - target.y) / verticalTravel, 0, 1);
            const crossingX = arrow.previousX + (arrow.x - arrow.previousX) * crossingRatio;
            const distance = Math.abs(crossingX - target.x);
            if (distance <= target.radius && distance < impactDistance) {
                impactDistance = distance;
                impactX = crossingX;
                hitTargetIndex = targetIndex;
            }
        }

        if (hitTargetIndex >= 0) {
            const target = arcoGame.targets[hitTargetIndex];
            arrow.x = impactX;
            arrow.y = target.y;
            awardArcoHit(arrow, target, impactDistance);
            arcoGame.targetPool.push(arcoGame.targets.splice(hitTargetIndex, 1)[0]);
            arcoGame.arrowPool.push(arcoGame.arrows.splice(arrowIndex, 1)[0]);
            continue;
        }

        if (arrow.y < -30 || arrow.x < -30 || arrow.x > canvas.width + 30) {
            if (arrow.owner === 'PLAYER') {
                arcoGame.stats.playerMisses++;
                arcoGame.playerReactionTimer = 18;
            } else {
                arcoGame.stats.mestreMisses++;
                arcoGame.mestreReactionTimer = 14;
            }
            arcoGame.arrowPool.push(arcoGame.arrows.splice(arrowIndex, 1)[0]);
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
    keys.a = keys.d = keys.w = keys.s = keys.space = false;
    consumeArcoShootEdges();
}

function simulateArcoFrame() {
    arcoGame.roundFrame++;
    arcoGame.phase = getArcoPhase();
    applyArcoQaAutomation();
    updateArcoTargetSpawns();
    updateArcoPlayer();
    updateArcoMaster();
    updateArcoTargets();
    updateArcoArrows();
    updateArcoEffects();
    if (arcoGame.roundFrame >= arcoGame.roundFrames) finishArcoRound();
}

function updateArco() {
    if (arcoGame.gameState === 'TUTORIAL') {
        if (archeryShootPressed || keys.space) beginArcoRound();
        consumeArcoShootEdges();
        return;
    }

    if (arcoGame.gameState === 'GAMEOVER') {
        if (archeryShootPressed || keys.space) {
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

    hintText.innerText = '[W A S D] AREA DE TIRO | [ESPACO] ATIRAR';
    const qaFrameStepValue = Number(archeryQaParams.get('archeryQaSpeed'));
    const frameStep = archeryQaParams.get('archeryQa') === '1' && Number.isFinite(qaFrameStepValue)
        ? clampArco(Math.round(qaFrameStepValue), 1, 60)
        : 1;
    for (let step = 0; step < frameStep && arcoGame.gameState === 'PLAYING'; step++) simulateArcoFrame();
    consumeArcoShootEdges();
}
function getArcoCharacterVisual(actor) {
    const isPlayer = actor === 'PLAYER';
    const state = isPlayer ? arcoGame.playerState : arcoGame.mestreState;
    const shootTimer = isPlayer ? arcoGame.playerShootTimer : arcoGame.mestreShootTimer;
    if (arcoGame.gameState === 'GAMEOVER') {
        const actorWon = !arcoGame.tie && (isPlayer ? arcoGame.win : !arcoGame.win);
        return actorWon ? 'VICTORY_BACK' : (arcoGame.tie ? 'IDLE_BACK' : 'MISS_REACTION_BACK');
    }
    if (state === 'MISS') return 'MISS_REACTION_BACK';
    if (state === 'MOVE') return 'WALK_DOWN_BACK';
    if (state === 'SHOOT') return shootTimer > 8 ? 'RELEASE_SHOT_BACK' : 'RECOVERY_BACK';
    return 'IDLE_BACK';
}

function getArcoTargetFrame(target, timeFrame) {
    return timeFrame + target.animationOffset;
}

function drawArcoShooterArea() {
    const area = ARCHERY_CONFIG.shooterArea;
    ctx.fillStyle = 'rgba(255, 238, 171, 0.10)';
    ctx.fillRect(area.left, area.front, area.right - area.left, area.back - area.front + 18);
    ctx.strokeStyle = 'rgba(255, 245, 200, 0.82)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(area.left, area.front);
    ctx.lineTo(area.right, area.front);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(35, 46, 29, 0.86)';
    ctx.fillRect(canvas.width / 2 - 42, area.front - 10, 84, 10);
    ctx.fillStyle = '#fff4c2';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LINHA DE TIRO', canvas.width / 2, area.front - 3);
    ctx.textAlign = 'left';
}

function drawArcoTargets(assets, timeFrame) {
    for (const target of arcoGame.targets) {
        if (!target.visible) continue;
        const pulse = target.isGolden ? 1 + Math.sin(performance.now() / 120) * 0.06 : 1;
        const size = target.renderSize * pulse;
        const bottomY = target.y + size * 0.43;
        if (assets) {
            assets.draw(
                ctx,
                'target',
                target.assetSubtype,
                target.assetState,
                getArcoTargetFrame(target, timeFrame),
                target.x,
                bottomY,
                size,
                size,
                'manifest'
            );
        }
        if (target.isGolden && target.active) {
            ctx.fillStyle = 'rgba(48, 34, 8, 0.82)';
            ctx.fillRect(Math.floor(target.x - 22), Math.floor(target.y - target.radius - 13), 44, 10);
            ctx.fillStyle = '#ffe066';
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BONUS', Math.floor(target.x), Math.floor(target.y - target.radius - 5));
            ctx.textAlign = 'left';
        }
    }
}

function getArcoArrowVisual(arrow) {
    const fast = arrow.owner === 'MESTRE';
    if (arrow.speedX < -0.35) return fast
        ? { subtype: 'arrow_fast_up_left', state: 'FAST_UP_LEFT' }
        : { subtype: 'arrow_up_left', state: 'UP_LEFT' };
    if (arrow.speedX > 0.35) return fast
        ? { subtype: 'arrow_fast_up_right', state: 'FAST_UP_RIGHT' }
        : { subtype: 'arrow_up_right', state: 'UP_RIGHT' };
    return fast
        ? { subtype: 'arrow_fast_up', state: 'FAST_UP' }
        : { subtype: 'arrow_up', state: 'UP' };
}

function drawArcoEffects(assets) {
    for (const effect of arcoGame.effects) {
        const progress = 1 - effect.timer / effect.duration;
        const frame = Math.min(3, Math.floor(progress * 4));
        const size = 38 + progress * 18;
        ctx.globalAlpha = clampArco(effect.timer / 9, 0, 1);
        if (assets) assets.draw(ctx, 'effect', effect.subtype, effect.state, frame, effect.x, effect.y, size, size, 'center');
        ctx.fillStyle = effect.color;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(effect.label, effect.x, effect.y - 25 - progress * 13);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }
}

function drawArcoCharacters(assets, timeFrame) {
    if (!assets) return;
    const actors = [
        { type: 'PLAYER', subtype: 'zorp', x: arcoGame.playerX, y: arcoGame.playerY, offset: 0 },
        { type: 'MESTRE', subtype: 'master', x: arcoGame.mestreX, y: arcoGame.mestreY, offset: 1 }
    ].sort((a, b) => a.y - b.y);
    for (const actor of actors) {
        assets.draw(
            ctx,
            'character',
            actor.subtype,
            getArcoCharacterVisual(actor.type),
            timeFrame + actor.offset,
            actor.x,
            actor.y + 15,
            94,
            94,
            'manifest'
        );
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
        phaseName: ['AQUECIMENTO', 'MOVIMENTO', 'PRECISAO'][arcoGame.phase],
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
            path: target.pathType,
            entry: target.entryPoint,
            exit: target.exitPoint,
            speed: target.speedTier,
            size: target.sizeTier,
            golden: target.isGolden,
            progress: +target.progress.toFixed(3),
            visible: target.visible
        })),
        pendingTargets: arcoGame.pendingTargetSpawns.length,
        arrows: arcoGame.arrows.length,
        effects: arcoGame.effects.length,
        stats: arcoGame.stats,
        assets: window.archeryAssets ? window.archeryAssets.diagnostics() : null,
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
    const timeFrame = Math.floor(performance.now() / 105);
    recordArcoFps();
    const diagnostics = getArcoDiagnostics();
    if (assets && archeryQaParams.get('archeryQa') === '1') {
        canvas.dataset.archeryDiagnostics = JSON.stringify(diagnostics);
        canvas.dataset.archeryAssets = JSON.stringify(diagnostics.assets);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const arenaReady = assets && assets.drawCover(ctx, 0, 0, canvas.width, canvas.height);
    if (!arenaReady) {
        ctx.fillStyle = '#183d2c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CARREGANDO ARQUEARIA...', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
    }

    drawArcoShooterArea();
    if (assets) {
        assets.draw(ctx, 'prop', 'wind_flag', 'IDLE', timeFrame, 28, 136, 46, 46, 'manifest');
        assets.draw(ctx, 'prop', 'wind_flag', 'IDLE', timeFrame + 1, canvas.width - 28, 136, 46, 46, 'manifest');
        [92, 225, 358].forEach((x, index) => assets.draw(ctx, 'prop', 'lane_marker', 'IDLE', index, x, 190, 32, 32, 'manifest'));
    }

    drawArcoTargets(assets, timeFrame);
    for (let index = 0; index < arcoGame.arrows.length; index++) {
        const arrow = arcoGame.arrows[index];
        const visual = getArcoArrowVisual(arrow);
        if (assets) assets.draw(ctx, 'arrow', visual.subtype, visual.state, timeFrame + index, arrow.x, arrow.y, 38, 38, 'center');
    }
    drawArcoEffects(assets);
    drawArcoCharacters(assets, timeFrame);
    ctx.restore();

    ctx.fillStyle = 'rgba(7, 14, 12, 0.88)';
    ctx.fillRect(0, 0, canvas.width, 35);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'left';
    ctx.fillText('ZORP ' + arcoGame.playerScore, 12, 15);
    ctx.fillStyle = '#ff806f';
    ctx.textAlign = 'right';
    ctx.fillText('MESTRE ' + arcoGame.mestreScore, canvas.width - 12, 15);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const seconds = Math.max(0, Math.ceil((arcoGame.roundFrames - arcoGame.roundFrame) / 60));
    ctx.fillText(seconds + 's', canvas.width / 2, 14);
    ctx.fillStyle = ['#9ff3b0', '#74e6ff', '#ffcf70'][arcoGame.phase];
    ctx.font = 'bold 7px monospace';
    ctx.fillText(['AQUECIMENTO', 'ALVOS MOVEIS', 'PRECISAO FINAL'][arcoGame.phase], canvas.width / 2, 27);
    ctx.textAlign = 'left';

    if (arcoGame.gameState === 'TUTORIAL') {
        drawOverlayScreen('ARCO E FLECHA', [
            'Disputa de 55 segundos contra o Mestre.',
            '[W A S D]: mova-se dentro da area de tiro.',
            '[ESPACO]: dispara imediatamente. Sem barra de forca.',
            'Anel externo: base | interno: +15 | centro: +30.',
            'Leia a trajetoria dos dourados raros. [ESPACO] inicia.'
        ], '#e67e22');
    } else if (arcoGame.gameState === 'GAMEOVER') {
        const scoreLine = 'ZORP ' + arcoGame.playerScore + '  x  ' + arcoGame.mestreScore + ' MESTRE';
        if (arcoGame.tie) {
            drawOverlayScreen('EMPATE!', [
                scoreLine,
                'Bullseyes: ' + arcoGame.stats.playerBullseyes + ' x ' + arcoGame.stats.mestreBullseyes
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
        { x: 130, y: 190, w: 40, h: 20, type: 'bench', solid: true },
        { x: 280, y: 190, w: 40, h: 20, type: 'bench', solid: true },
        { x: 130, y: 100, w: 30, h: 30, type: 'flower_bed', solid: false },
        { x: 290, y: 100, w: 30, h: 30, type: 'flower_bed', solid: false }
    ],
    ILHA_CORRIDA: [
        { x: 105, y: 145, w: 32, h: 10, type: 'hurdle', solid: true },
        { x: 335, y: 145, w: 32, h: 10, type: 'hurdle', solid: true },
        { x: 75, y: 48, w: 42, h: 20, type: 'water_station', solid: true },
        { x: 75, y: 200, w: 46, h: 24, type: 'podium', solid: true }
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
        // Colisores acompanham apenas os volumes externos; centro, entrada direita e saída norte ficam livres.
        { x: 68, y: 68, w: 54, h: 55, type: 'archery_island_decor', solid: true },
        { x: 330, y: 79, w: 50, h: 52, type: 'archery_island_decor', solid: true },
        { x: 35, y: 202, w: 55, h: 38, type: 'archery_island_decor', solid: true },
        { x: 365, y: 201, w: 54, h: 39, type: 'archery_island_decor', solid: true },
        { x: 35, y: 48, w: 20, h: 45, type: 'archery_island_decor', solid: false },
        { x: 397, y: 51, w: 20, h: 45, type: 'archery_island_decor', solid: false }
    ],
    ILHA_ESCALADA: [
        { x: 45, y: 190, w: 40, h: 35, type: 'tent', solid: true },
        { x: 130, y: 220, w: 25, h: 25, type: 'campfire', solid: true },
        { x: 110, y: 140, w: 20, h: 25, type: 'trail_sign', solid: true },
        { x: 330, y: 140, w: 25, h: 20, type: 'climbing_gear', solid: true },
        { x: 35, y: 65, w: 25, h: 35, type: 'pine_tree', solid: true },
        { x: 385, y: 65, w: 25, h: 35, type: 'pine_tree', solid: true },
        { x: 390, y: 200, w: 25, h: 35, type: 'pine_tree', solid: true },
        { x: 80, y: 70, w: 30, h: 30, type: 'boulder', solid: true },
        { x: 340, y: 70, w: 30, h: 30, type: 'boulder', solid: true }
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
        { x: 290, y: 145, w: 86, h: 36, type: 'pingpong_table', solid: true },
        { x: 384, y: 152, w: 16, h: 16, type: 'pingpong_bucket', solid: true },
        { x: 320, y: 45, w: 65, h: 38, type: 'scoreboard', solid: true }
    ]
};

const npcs = [
    { scene: "HUB", x: 180, y: 180, img: imgTurista, tamanho: 48, msg: "> TURISTA: O arquipélago tem diversas modalidades esportivas!" },
    { scene: "HUB", x: 270, y: 130, img: imgGuia, tamanho: 48, msg: "> GUIA: Explore os caminhos ao Norte, Sul, Leste e Oeste." },

    // NPCs da Ilha de Boxe (Arena dos Campeões)
    { scene: "ILHA_ESQUI", x: 225, y: 110, img: imgNpcMestreBoxe, tamanho: 50, msg: "> MESTRE DO BOXE: Bem-vindo ao meu ringue, Zorp! Prove sua pegada e aguente até o round final!", isMaster: "JOGO_BOXE" },
    { scene: "ILHA_ESQUI", x: 130, y: 190, img: imgNpcTreinadorBoxe, tamanho: 50, msg: "> TREINADOR PUNCH: Os socos do Mestre quebram qualquer guarda! Pendule com [A/D] para esquivar e mande um contragolpe com [J] na abertura!" },
    { scene: "ILHA_ESQUI", x: 345, y: 110, img: imgNpcArbitroBoxe, tamanho: 50, msg: "> ÁRBITRO: Regras oficiais de Punch-Out! Luta limpa e toquem as luvas quando soar o sino!" },
    { scene: "ILHA_ESQUI", x: 80, y: 175, img: imgNpcBoxeador, tamanho: 50, msg: "> PUGILISTA: Cuidado com o soco especial carregado do Mestre! Não spameie esquiva ou tomará contragolpe!" },

    { scene: "ILHA_PINGPONG", x: 150, y: 220, img: imgAprendiz, tamanho: 48, msg: "> APRENDIZ: Treine seu tempo de reação para rebatidas." },
    { scene: "ILHA_PINGPONG", x: 225, y: 80, img: imgMestrePingPong, tamanho: 48, msg: "> MESTRE DO PING-PONG: Mostre seus reflexos!", isMaster: "JOGO_PINGPONG" },

    { scene: "ILHA_SKATE", x: 225, y: 80, img: imgMestreSkate, tamanho: 48, msg: "> mestre_skate: A pista é uma linha contínua. Ganhe velocidade nas descidas, conecte rampas, rails e fios — e chegue à minha arena com 12.000 pontos!", isMaster: "JOGO_SKATE" },
    { id: "entrada_basquete", scene: "ILHA_BASQUETE", x: 225, y: 82, img: imgMestreBasqueteNpc, tamanho: 54, interactionWidth: 62, interactionHeight: 62, msg: "> MESTRE DO BASQUETE: Sessenta segundos. Vença no placar e conquiste a arena!", isMaster: BASKETBALL_SCENE },
    {
        id: "mestre_arco_overworld",
        scene: "ILHA_ARCO",
        x: 225,
        y: 118,
        img: imgMestreArcoOverworld,
        tamanho: 72,
        sx: 335,
        sy: 96,
        sw: 656,
        sh: 1114,
        interactionWidth: 58,
        interactionHeight: 76,
        interactionOffsetY: 12,
        msg: "> MESTRE DO ARCO: Observe a trajetória, alinhe o disparo e prove sua precisão!",
        isMaster: "JOGO_ARCO"
    },
    {
        id: "mestre_corrida",
        scene: "ILHA_CORRIDA",
        x: 225,
        y: 88,
        img: imgMestreCorridaNpc,
        tamanho: 62,
        sx: 270,
        sy: 75,
        sw: 710,
        sh: 1090,
        interactionWidth: 78,
        interactionHeight: 68,
        msg: "> MESTRE DA CORRIDA: Duas voltas. Escolha bem a raia, salte as barreiras e me alcance na reta final!",
        isMaster: "JOGO_CORRIDA"
    },
    
    // NPCs da Ilha da Escalada (Reduzidos para 4 icônicos e bem posicionados)
    { scene: "ILHA_ESCALADA", x: 225, y: 70, img: imgMestreEscalada, tamanho: 48, msg: "> MESTRE DA ESCALADA: O Monte Zorp não perdoa os fracos! Desvie das pedras e alcance o cume!", isMaster: "JOGO_ESCALADA" },
    { scene: "ILHA_ESCALADA", x: 80, y: 140, img: imgGuiaTrilha, tamanho: 48, msg: "> GUIA DE TRILHA: Cuidado lá em cima! O vento sopra forte e algumas pedras rachadas quebram ao pisar!" },
    { scene: "ILHA_ESCALADA", x: 370, y: 140, img: imgGeologa, tamanho: 48, msg: "> GEÓLOGA: As pedras azuis deslizam pela montanha, e as vermelhas estão prestes a desmoronar!" },
    { scene: "ILHA_ESCALADA", x: 95, y: 220, img: imgChef, tamanho: 48, msg: "> CHEF DE ACAMPAMENTO: Uma sopa bem quente para dar energia antes de enfrentar a montanha!" },
    
    { id: "entrada_surf", scene: "ILHA_SURF", x: 225, y: 140, img: imgMestreSurfing, tamanho: 84, interactionWidth: 46, interactionHeight: 70, interactionOffsetY: 8, msg: "> MESTRE DO SURF: Mantenha o flow, enfrente os tubos e sobreviva ao grande evento final!", isMaster: SURF_SCENE }
];

// -------------------------------------------------------------
// 3. CONTROLES DO TECLADO
// -------------------------------------------------------------
// Captura a borda do comando de interação. O polling de `keys` sozinho podia
// perder um toque rápido quando keydown e keyup ocorriam entre dois frames.
let interactionPressed = false;
let climbUpPressed = false;
window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (!e.repeat && (k === "e" || k === " ") && !currentScene.startsWith("JOGO_")) {
        interactionPressed = true;
    }
    if (k === " ") keys.space = true;
    if (currentScene === "JOGO_ARCO" && k === " " && !e.repeat) {
        archeryShootPressed = true;
    }
    if (currentScene === "JOGO_ESCALADA" && !e.repeat) {
        if (k === "w" || k === " ") climbUpPressed = true;
    }
    if (currentScene === "JOGO_BOXE" && !e.repeat) {
        if (k === " ") boxingInputPress.dodge = true;
        if (k === "j") boxingInputPress.jab = true;
        if (k === "k") boxingInputPress.power = true;
        if (k === "w" || k === "a" || k === "s" || k === "d") queueBoxingMoveTap(k);
    }
    if (k === "escape" && currentScene === "JOGO_SKATE") {
        currentScene = "ILHA_SKATE";
        player.x = 225; player.y = 150;
    }
    if (keys.hasOwnProperty(k)) keys[k] = true;
});

window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
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
    const feetBox = { x: nextX - 10, y: nextY - 8, w: 20, h: 10 };
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
    return false;
}

function update() {
    const isOverworldScene = !currentScene.startsWith("JOGO_");
    const interactionRequested = isOverworldScene && (interactionPressed || keys.e || keys.space);
    if (isOverworldScene) interactionPressed = false;

    if (isOverworldScene) {
        hintText.innerText = "USE [W A S D] PARA MOVER | [E] PARA FALAR";
        
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
            zorpSprite.isMoving = true;

            if (moveY > 0) zorpSprite.row = 0;       
            else if (moveY < 0) zorpSprite.row = 1;  
            else if (moveX < 0) zorpSprite.row = 2;  
            else if (moveX > 0) zorpSprite.row = 3;  

            let nextX = player.x + moveX * player.speed;
            let nextY = player.y + moveY * player.speed;

            if (!checkObstacleCollision(nextX, player.y)) player.x = nextX;
            if (!checkObstacleCollision(player.x, nextY)) player.y = nextY;

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
        for (let npc of npcs) {
            const interactionWidth = npc.interactionWidth || 46;
            const interactionHeight = npc.interactionHeight || 50;
            const interactionBox = npc.interactionWidth || npc.interactionHeight
                ? {
                    x: npc.x - interactionWidth / 2,
                    y: npc.y - interactionHeight + (npc.interactionOffsetY || 0),
                    width: interactionWidth,
                    height: interactionHeight
                }
                : { x: npc.x - 15, y: npc.y - 15, width: 46, height: 50 };
            if (npc.scene === currentScene && isColliding(player, interactionBox)) {
                npcProximo = npc; 
                break;
            }
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
                dialogText.innerHTML = npcProximo.msg + extra;
            } else {
                dialogText.innerHTML = npcProximo.isMaster
                    ? "> (Pressione [E] ou [ESPAÇO] para iniciar)"
                    : "> (Pressione [E] para conversar)";
            }
        } else { 
            dialogBox.classList.remove("show"); 
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
function spawnPingPongBall(from = 'PLAYER', customTargetY = 145, customSpeed = 4.2, isSuper = false) {
    let bx, by, bz, bSpeedX;
    if (from === 'PLAYER') {
        bx = pingPong.playerX + 28;
        by = pingPong.playerY + 20;
        bz = 22;
        bSpeedX = customSpeed;
        let targetX = 250;
        let t = Math.max(1, (targetX - bx) / bSpeedX);
        let bSpeedY = (customTargetY - by) / t;
        let bSpeedZ = 0.5 * pingPong.gravity * t - bz / t + 0.6;
        pingPong.balls.push({
            id: pingPong.nextBallId++,
            x: bx, y: by, z: bz,
            speedX: bSpeedX, speedY: bSpeedY, speedZ: Math.max(1.8, bSpeedZ),
            radius: pingPong.ballRadius,
            lastHitter: 'PLAYER',
            trail: [],
            isSuper: isSuper
        });
    } else {
        bx = pingPong.opponentX - 6;
        by = pingPong.opponentY + 20;
        bz = 22;
        bSpeedX = -customSpeed;
        let targetX = 190;
        let t = Math.max(1, (targetX - bx) / bSpeedX);
        let bSpeedY = (customTargetY - by) / t;
        let bSpeedZ = 0.5 * pingPong.gravity * t - bz / t + 0.6;
        pingPong.balls.push({
            id: pingPong.nextBallId++,
            x: bx, y: by, z: bz,
            speedX: bSpeedX, speedY: bSpeedY, speedZ: Math.max(1.8, bSpeedZ),
            radius: pingPong.ballRadius,
            lastHitter: 'OPPONENT',
            trail: [],
            isSuper: false
        });
    }
}

function resetPingPong(fullReset = false) {
    if (fullReset) {
        pingPong.playerScore = 0;
        pingPong.opponentScore = 0;
        pingPong.power = 0;
        pingPong.playerX = 50;
        pingPong.playerY = 140;
        pingPong.opponentX = 370;
        pingPong.opponentY = 140;
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
    pingPong.aoeEffects = [];
    pingPong.balls = [];
    pingPong.mestreSpawnCooldown = 140;
    pingPong.mestreSpawnWindup = 0;
    pingPong.mestreReaction = null;
    pingPong.serveCooldown = 0;

    // Saque inicial com 1 bola
    spawnPingPongBall(pingPong.server, 145, 4.2);
    pingPong.server = (pingPong.server === 'PLAYER') ? 'OPPONENT' : 'PLAYER';
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

    hintText.innerText = "[W/S] MIRAR CIMA/BAIXO | [A/D] RECUAR/AVANÇAR | [ESPAÇO] SMASH GLOBAL (EM ÁREA)";

    // 1. Movimentação do Jogador Zorp
    let pMoveX = 0, pMoveY = 0;
    if (keys.w) pMoveY -= pingPong.speed;
    if (keys.s) pMoveY += pingPong.speed;
    if (keys.a) pMoveX -= pingPong.speed;
    if (keys.d) pMoveX += pingPong.speed;

    pingPong.playerX = Math.max(30, Math.min(150, pingPong.playerX + pMoveX));
    pingPong.playerY = Math.max(75, Math.min(215, pingPong.playerY + pMoveY));

    if (pMoveY < 0) pingPong.playerAction = "MOVE_UP";
    else if (pMoveY > 0) pingPong.playerAction = "MOVE_DOWN";
    else pingPong.playerAction = "IDLE";

    if (pingPong.playerHitTimer > 0) {
        pingPong.playerAction = "HIT";
        pingPong.playerHitTimer--;
    }

    // 2. ESPECIAL GLOBAL DO JOGADOR (ÁREA DE EFEITO TOTAL)
    // Acionamento com [ESPAÇO] com barra cheia: rebate TODAS as bolas em campo simultaneamente!
    if (keys.space && pingPong.power >= pingPong.maxPower) {
        keys.space = false;
        pingPong.power = 0;
        pingPong.playerHitTimer = 18;
        pingPong.playerAction = "HIT";

        // Onda de choque visual em tela inteira
        pingPong.aoeEffects.push({
            x: pingPong.playerX + 18,
            y: pingPong.playerY + 24,
            radius: 8,
            maxRadius: 360,
            alpha: 1.0,
            color: '#00e5ff'
        });

        // Rebate todas as bolas ativas simultaneamente em direção ao Mestre
        const spreadAngles = [112, 145, 178, 125, 165];
        pingPong.balls.forEach((ball, idx) => {
            ball.lastHitter = 'PLAYER';
            ball.isSuper = true;
            let smashSpeed = Math.max(9.5, Math.abs(ball.speedX) + 2.8);
            ball.speedX = smashSpeed;
            let targetX = 275;
            let targetY = spreadAngles[idx % spreadAngles.length] || 145;
            let t = Math.max(1, (targetX - ball.x) / ball.speedX);
            ball.speedY = (targetY - ball.y) / t;
            ball.speedZ = Math.max(2.4, 0.5 * pingPong.gravity * t - ball.z / t + 0.8);
            
            pingPong.bounceEffects.push({
                x: ball.x, y: ball.y - ball.z,
                radius: 4, maxRadius: 22,
                alpha: 1.0, color: '#00e5ff'
            });
        });
    }

    // Atualização dos efeitos visuais AoE
    for (let i = pingPong.aoeEffects.length - 1; i >= 0; i--) {
        let aoe = pingPong.aoeEffects[i];
        aoe.radius += 12;
        aoe.alpha -= 0.04;
        if (aoe.alpha <= 0) pingPong.aoeEffects.splice(i, 1);
    }

    // 3. SPAWN GRADATIVO DE BOLAS PELO MESTRE (ESTILO TENGU)
    // As bolas NUNCA entram do nada; são lançadas da raquete do Mestre conforme a pontuação avança
    const totalScore = pingPong.playerScore + pingPong.opponentScore;
    let maxAllowedBalls = 1;
    if (totalScore >= 40) maxAllowedBalls = 4;
    else if (totalScore >= 25) maxAllowedBalls = 3;
    else if (totalScore >= 10) maxAllowedBalls = 2;

    if (pingPong.balls.length < maxAllowedBalls) {
        if (pingPong.mestreSpawnWindup > 0) {
            pingPong.mestreSpawnWindup--;
            pingPong.opponentAction = "HIT";
            if (pingPong.mestreSpawnWindup === 0) {
                // Lança bola telegrafada diretamente da raquete do Mestre
                let spawnTargetY = 110 + Math.random() * 70;
                spawnPingPongBall('OPPONENT', spawnTargetY, 4.4 + pingPong.rallyHits * 0.15);
                pingPong.bounceEffects.push({
                    x: pingPong.opponentX - 6, y: pingPong.opponentY + 20,
                    radius: 3, maxRadius: 18, alpha: 1.0, color: '#f39c12'
                });
                pingPong.mestreSpawnCooldown = 180 + Math.random() * 80;
            }
        } else {
            pingPong.mestreSpawnCooldown--;
            if (pingPong.mestreSpawnCooldown <= 0) {
                pingPong.mestreSpawnWindup = 22; // Inicia telegrafia do saque de bola adicional
            }
        }
    }

    // 4. IA DO MESTRE ESTILO TENGU (CAMINHADA REALISTA, LIMITE DE VELOCIDADE E DESISTÊNCIA)
    // Procura bola prioritária se movendo em direção ao Mestre
    let targetBall = null;
    let minTime = 9999;
    for (let b of pingPong.balls) {
        if (b.speedX > 0) {
            let timeToMestre = (pingPong.opponentX - b.x) / b.speedX;
            if (timeToMestre > 0 && timeToMestre < minTime) {
                minTime = timeToMestre;
                targetBall = b;
            }
        }
    }

    let isGivingUp = false;
    if (targetBall) {
        // Lógica Tengu: se a bola estiver muito rápida (speedX > 7.2 ou Super Smash)
        // e longe do Mestre, o Mestre desiste da bola (não dá tempo de reação)
        let distanceY = Math.abs((targetBall.y - 20) - pingPong.opponentY);
        if (targetBall.isSuper || targetBall.speedX > 7.2) {
            if (distanceY > 30 || targetBall.isSuper) {
                isGivingUp = true;
                pingPong.mestreReaction = { text: '💦', timer: 30 };
            }
        }

        if (!isGivingUp) {
            let targetY = targetBall.y - 20;
            let mSpeed = pingPong.opponentSpeed; // Velocidade justa de caminhada (2.75)
            if (pingPong.opponentY < targetY - 8) {
                pingPong.opponentY += mSpeed;
                pingPong.opponentAction = "MOVE_DOWN";
            } else if (pingPong.opponentY > targetY + 8) {
                pingPong.opponentY -= mSpeed;
                pingPong.opponentAction = "MOVE_UP";
            } else {
                pingPong.opponentAction = "IDLE";
            }
        } else {
            pingPong.opponentAction = "IDLE";
        }
    } else {
        // Retorna suavemente ao centro da mesa
        if (pingPong.opponentY < 135) pingPong.opponentY += 1.5;
        else if (pingPong.opponentY > 145) pingPong.opponentY -= 1.5;
        else pingPong.opponentAction = "IDLE";
    }

    pingPong.opponentY = Math.max(75, Math.min(215, pingPong.opponentY));

    if (pingPong.opponentHitTimer > 0) {
        pingPong.opponentAction = "HIT";
        pingPong.opponentHitTimer--;
    }

    if (pingPong.mestreReaction) {
        pingPong.mestreReaction.timer--;
        if (pingPong.mestreReaction.timer <= 0) pingPong.mestreReaction = null;
    }

    // 5. FÍSICA E COLISÃO DAS BOLAS
    const TABLE_MIN_X = 150;
    const TABLE_MAX_X = 300;
    const TABLE_MIN_Y = 100;
    const TABLE_MAX_Y = 190;

    let scoredBallIds = [];

    for (let b of pingPong.balls) {
        let prevZ = b.z;

        b.speedZ -= pingPong.gravity;
        b.x += b.speedX;
        b.y += b.speedY;
        b.z += b.speedZ;

        // Rastro luminoso individual da bola
        b.trail.push({
            x: b.x,
            y: b.y - b.z,
            alpha: 0.85,
            speed: Math.abs(b.speedX)
        });
        if (b.trail.length > 7) b.trail.shift();
        for (let tr of b.trail) tr.alpha *= 0.82;

        // A REDE NÃO TEM HITBOX FÍSICA: a bola passa direto por X=225 sem nunca colidir ou enganchar!

        // Quique na Superfície da Mesa / Chão (Z <= 0)
        if (prevZ >= 0 && b.z <= 0) {
            b.z = 0;
            if (b.x >= TABLE_MIN_X && b.x <= TABLE_MAX_X && b.y >= TABLE_MIN_Y && b.y <= TABLE_MAX_Y) {
                b.speedZ = -b.speedZ * 0.72;
            } else {
                b.speedZ = -b.speedZ * 0.65;
            }
            if (Math.abs(b.speedZ) < 0.5) b.speedZ = 0;

            let bounceColor = b.isSuper ? '#00e5ff' : (pingPong.rallyHits >= 8 ? '#e74c3c' : '#ffffff');
            pingPong.bounceEffects.push({
                x: b.x, y: b.y,
                radius: 2, maxRadius: 10, alpha: 1.0, color: bounceColor
            });
        }

        // LIMITES DO MAPA (PAREDES INVISÍVEIS):
        // A bola nunca sai da arena visualmente em Y
        if (b.y <= 42 && b.speedY < 0) {
            b.speedY = Math.abs(b.speedY);
            pingPong.bounceEffects.push({ x: b.x, y: b.y, radius: 2, maxRadius: 8, alpha: 0.8, color: '#ffffff' });
        } else if (b.y >= 252 && b.speedY > 0) {
            b.speedY = -Math.abs(b.speedY);
            pingPong.bounceEffects.push({ x: b.x, y: b.y, radius: 2, maxRadius: 8, alpha: 0.8, color: '#ffffff' });
        }

        // 6. REBATIDA DO ZORP (CONTROLE TOTAL DE BOLA)
        if (b.speedX < 0) {
            let zLeft = pingPong.playerX - 2;
            let zRight = pingPong.playerX + 40;
            let zTopY = pingPong.playerY - 6;
            let zBottomY = pingPong.playerY + 54;

            if (b.x >= zLeft && b.x <= zRight && b.y >= zTopY && b.y <= zBottomY && b.z >= -6 && b.z <= 48) {
                pingPong.playerHitTimer = 12;
                b.lastHitter = 'PLAYER';
                pingPong.rallyHits++;

                // Aumenta velocidade gradativamente no rali
                let baseSpeed = Math.min(10.5, 4.2 + pingPong.rallyHits * 0.38);
                let targetX = 260;

                // Avanço ([D]) e Recuo ([A])
                if (keys.d || pingPong.playerX > 75) {
                    baseSpeed += 1.6;
                    targetX = 275;
                } else if (keys.a || pingPong.playerX < 65) {
                    baseSpeed = Math.max(3.8, baseSpeed - 1.2);
                    targetX = 245;
                }

                // Super Smash individual se o botão estiver pressionado
                if (b.isSuper) {
                    baseSpeed = Math.max(9.5, baseSpeed + 2.5);
                }

                // Carrega barra de poder
                pingPong.power = Math.min(pingPong.maxPower, pingPong.power + 15);
                b.speedX = baseSpeed;

                // Direcional [W/S]
                let targetY = 145;
                if (keys.w) targetY = 112; // Canto superior
                else if (keys.s) targetY = 178; // Canto inferior

                // Ponto de contato na raquete
                const paddleCenter = pingPong.playerY + 24;
                const contactRatio = (b.y - paddleCenter) / 24;
                if (Math.abs(contactRatio) >= 0.25) {
                    targetY += contactRatio * 26;
                }
                targetY = Math.max(105, Math.min(185, targetY));

                let t = Math.max(1, (targetX - b.x) / b.speedX);
                b.speedY = (targetY - b.y) / t;
                b.speedZ = Math.max(2.0, 0.5 * pingPong.gravity * t - b.z / t + 0.6);

                let hitColor = pingPong.rallyHits >= 8 ? '#e74c3c' : (pingPong.rallyHits >= 4 ? '#f1c40f' : '#2ecc71');
                pingPong.bounceEffects.push({
                    x: pingPong.playerX + 25, y: pingPong.playerY + 24,
                    radius: 3, maxRadius: 14, alpha: 1.0, color: hitColor
                });
            }
        }

        // 7. REBATIDA DO MESTRE (VARIAÇÕES SEM SUPER APELATIVO)
        if (b.speedX > 0 && (!isGivingUp || targetBall !== b)) {
            let mLeft = pingPong.opponentX - 8;
            let mRight = pingPong.opponentX + 32;
            let mTopY = pingPong.opponentY - 6;
            let mBottomY = pingPong.opponentY + 54;

            if (b.x >= mLeft && b.x <= mRight && b.y >= mTopY && b.y <= mBottomY && b.z >= -6 && b.z <= 48) {
                pingPong.opponentHitTimer = 12;
                b.lastHitter = 'OPPONENT';
                b.isSuper = false;
                pingPong.rallyHits++;

                let baseSpeed = Math.min(9.5, 3.8 + pingPong.rallyHits * 0.32);
                let targetX = 185;
                let targetY = 145;
                let zBoost = 0.6;

                const rndShot = Math.random();
                if (rndShot < 0.35) {
                    // Cruzada na ponta oposta
                    targetY = (pingPong.playerY < 145) ? (168 + Math.random() * 12) : (110 + Math.random() * 12);
                    targetX = 175;
                } else if (rndShot < 0.50) {
                    // Lob alto
                    targetY = 145 + (Math.random() - 0.5) * 30;
                    baseSpeed = Math.max(3.6, baseSpeed - 1.2);
                    zBoost = 1.4;
                    targetX = 195;
                } else if (rndShot < 0.62 && pingPong.rallyHits >= 4) {
                    // Cortada rápida
                    baseSpeed += 1.5;
                    targetY = (Math.random() < 0.5) ? 120 : 170;
                    targetX = 170;
                    pingPong.bounceEffects.push({
                        x: pingPong.opponentX - 8, y: pingPong.opponentY + 20,
                        radius: 4, maxRadius: 16, alpha: 1.0, color: '#f39c12'
                    });
                } else {
                    // Retorno neutro
                    targetY = 145 + (Math.random() - 0.5) * 20;
                    targetX = 185;
                }

                b.speedX = -baseSpeed;
                let t = Math.max(1, (targetX - b.x) / b.speedX);
                b.speedY = (targetY - b.y) / t;
                b.speedZ = Math.max(2.0, 0.5 * pingPong.gravity * t - b.z / t + zBoost);

                let hitColor = pingPong.rallyHits >= 8 ? '#e74c3c' : '#ffffff';
                pingPong.bounceEffects.push({
                    x: pingPong.opponentX - 6, y: pingPong.opponentY + 24,
                    radius: 3, maxRadius: 12, alpha: 1.0, color: hitColor
                });
            }
        }

        // 8. REGRA DE PONTUAÇÃO (Ponto imediato ao passar do limite válido)
        if (b.x < 20) {
            // Passou pelo Zorp -> Ponto do Mestre!
            pingPong.opponentScore++;
            scoredBallIds.push(b.id);
            pingPong.bounceEffects.push({ x: 25, y: b.y, radius: 4, maxRadius: 20, alpha: 1.0, color: '#e74c3c' });
        } else if (b.x > 430) {
            // Passou pelo Mestre -> Ponto do Zorp!
            pingPong.playerScore++;
            scoredBallIds.push(b.id);
            pingPong.bounceEffects.push({ x: 425, y: b.y, radius: 4, maxRadius: 20, alpha: 1.0, color: '#2ecc71' });
        }
    }

    // Remove bolas que pontuaram
    if (scoredBallIds.length > 0) {
        pingPong.balls = pingPong.balls.filter(b => !scoredBallIds.includes(b.id));
    }

    // Se todas as bolas saíram de jogo, agenda novo saque
    if (pingPong.balls.length === 0) {
        if (pingPong.serveCooldown <= 0) {
            pingPong.serveCooldown = 32;
        } else {
            pingPong.serveCooldown--;
            if (pingPong.serveCooldown === 0) {
                pingPong.rallyHits = 0;
                spawnPingPongBall(pingPong.server, 145, 4.2);
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
    if (pingPong.playerScore >= pingPong.maxScore) {
        insignias.pingpong = true;
        pingPong.gameState = 'GAMEOVER';
        pingPong.win = true;
    } else if (pingPong.opponentScore >= pingPong.maxScore) {
        pingPong.gameState = 'GAMEOVER';
        pingPong.win = false;
    }
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

        const frameWidth = zorpImg.width / zorpSprite.cols;
        const frameHeight = zorpImg.height / zorpSprite.rows;

        const sequences = [
            [1, 0, 1, 2], 
            [1, 0, 1, 2], 
            [1, 2, 1, 0], 
            [1, 2, 1, 0]  
        ];
        
        const currentSeq = sequences[zorpSprite.row];
        const sx = currentSeq[zorpSprite.animIndex] * frameWidth;
        const sy = zorpSprite.row * frameHeight;

        const offsetsY = [0, 0, 15, 15]; 
        const currentOffsetY = offsetsY[zorpSprite.row] || 0;

        const targetHeight = 48;
        const targetWidth = Math.floor(targetHeight * (frameWidth / frameHeight));

        const drawX = Math.floor(player.x - targetWidth / 2);
        const drawY = Math.floor(player.y - targetHeight + currentOffsetY);

        ctx.drawImage(
            zorpImg, 
            Math.floor(sx), Math.floor(sy), Math.floor(frameWidth), Math.floor(frameHeight), 
            drawX, drawY, targetWidth, targetHeight
        );
    }
}

function drawNPC(npc) {
    drawShadow(npc.x, npc.y);
    if (npc.img.complete && npc.img.naturalWidth !== 0) {
        let larguraCalculada, alturaCalculada, drawX, drawY;

        if (npc.sw && npc.sh) {
            const proporcao = npc.sw / npc.sh;
            larguraCalculada = npc.tamanho * proporcao;
            alturaCalculada = npc.tamanho;
            drawX = Math.floor(npc.x - larguraCalculada / 2);
            drawY = Math.floor(npc.y - alturaCalculada);

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(npc.img, npc.sx, npc.sy, npc.sw, npc.sh, drawX, drawY, larguraCalculada, alturaCalculada);
        } else {
            const proporcao = npc.img.width / npc.img.height;
            larguraCalculada = npc.tamanho * proporcao;
            alturaCalculada = npc.tamanho;
            drawX = Math.floor(npc.x - larguraCalculada / 2);
            drawY = Math.floor(npc.y - alturaCalculada);

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(npc.img, drawX, drawY, larguraCalculada, alturaCalculada);
        }
    }
}

function drawSceneObstacles() {
    const obstacles = sceneObstacles[currentScene] || [];
    obstacles.forEach(obs => {
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
                ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.arc(obs.x + 15, obs.y + 15, 15, 0, Math.PI * 2); ctx.fill();
                break;
            case 'pine_tree':
                ctx.fillStyle = '#3e2723'; ctx.fillRect(obs.x + 10, obs.y + 25, 5, 10); 
                ctx.fillStyle = '#1b5e20';
                ctx.beginPath(); ctx.moveTo(obs.x + 12, obs.y); ctx.lineTo(obs.x, obs.y + 25); ctx.lineTo(obs.x + obs.w, obs.y + 25); ctx.closePath(); ctx.fill();
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
    drawWater();
    drawPath(205, 0, 40, 80);    
    drawPath(205, 220, 40, 80);  
    drawPath(310, 130, 140, 40); 
    drawPath(0, 130, 140, 40);   

    ctx.fillStyle = "#7dbd42";
    ctx.beginPath(); ctx.arc(225, 150, 95, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = "#bdc3c7"; ctx.fillRect(190, 115, 70, 70);
    ctx.strokeStyle = "#7f8c8d"; ctx.strokeRect(190, 115, 70, 70);
}

function drawIlhaEsqui() {
    drawWater();
    
    // 1. Base da Ilha (Estádio de Boxe com bordas atléticas)
    ctx.fillStyle = "#1e272c";
    ctx.fillRect(15, 15, 420, 270);
    
    // Piso de borracha atlética
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(25, 25, 400, 250);
    
    // Pistas laterais emborrachadas vermelhas (Setores de Aquecimento e Oficiais)
    ctx.fillStyle = "#782828";
    ctx.fillRect(30, 30, 75, 240);
    ctx.fillRect(345, 30, 75, 240);

    // Linhas demarcatórias da arena
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 390, 240);

    // 2. Banner do Topo (Portal de Entrada dos Campeões)
    ctx.fillStyle = "#111827";
    ctx.fillRect(90, 18, 270, 22);
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 2;
    ctx.strokeRect(90, 18, 270, 22);
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("★ ARENA DE BOXE - CLUBE DOS CAMPEÕES ★", 225, 33);
    ctx.textAlign = "left";

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
    drawPath(205, 270, 40, 30);
}

function drawIlhaPingPong() {
    drawWater();
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Contorno atlético da ilha com cantos chanfrados (Plataforma Esportiva)
    ctx.beginPath();
    ctx.moveTo(40, 20); ctx.lineTo(410, 20); ctx.lineTo(432, 42); ctx.lineTo(432, 258);
    ctx.lineTo(410, 280); ctx.lineTo(40, 280); ctx.lineTo(18, 258); ctx.lineTo(18, 42);
    ctx.closePath();
    ctx.fillStyle = "#102a45"; // Base da plataforma azul marinho escuro
    ctx.fill();
    ctx.strokeStyle = "#00bcd4"; // Borda ciano olímpico
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2. Piso emborrachado oficial (Taraflex Verde Esportivo)
    const courtX = 26, courtY = 28, courtW = 398, courtH = 244;
    ctx.fillStyle = "#1e3d59";
    ctx.fillRect(courtX, courtY, courtW, courtH);
    ctx.fillStyle = "#2e7d32"; // Verde oficial de tênis de mesa
    ctx.fillRect(courtX + 4, courtY + 4, courtW - 8, courtH - 8);

    // Linhas sutis das placas de piso
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    for (let py = courtY + 12; py < courtY + courtH - 8; py += 28) {
        ctx.fillRect(courtX + 4, py, courtW - 8, 1);
    }
    for (let px = courtX + 16; px < courtX + courtW - 8; px += 38) {
        ctx.fillRect(px, courtY + 4, 1, courtH - 8);
    }

    // 3. Área de Competição Destacada (Arena Azul ITTF no Lado Leste)
    const arenaX = 265, arenaY = 95, arenaW = 145, arenaH = 150;
    ctx.fillStyle = "#1565c0"; // Azul clássico de competição ITTF
    ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
    ctx.strokeStyle = "#e3f2fd";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(arenaX, arenaY, arenaW, arenaH);

    // Divisórias de Quadra (Surrounds vermelhos com acabamento)
    ctx.fillStyle = "#c62828";
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
    const tblX = 290, tblY = 135, tblW = 86, tblH = 46;
    
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
    ctx.fillStyle = "#212121";
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
    const bktX = 384, bktY = 152;
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

    // 6. Placar Esportivo Oficial (Scoreboard) no Topo Leste
    const scbX = 320, scbY = 45;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(scbX, scbY, 65, 38);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(scbX, scbY, 65, 38);
    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 6px monospace";
    ctx.fillText("TABLE TENNIS", scbX + 8, scbY + 9);
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 13px monospace";
    ctx.fillText("11", scbX + 8, scbY + 26);
    ctx.fillStyle = "#3b82f6";
    ctx.fillText("09", scbX + 38, scbY + 26);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(scbX + 30, scbY + 14, 2, 16);

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
    drawPath(0, 130, 30, 40);
    drawPath(205, 0, 40, 30);

    ctx.restore();
}

function drawIlhaSkate() {
    drawWater();
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Silhueta da Skate Plaza Tropical-Urbana
    ctx.beginPath();
    ctx.moveTo(42, 20); ctx.lineTo(408, 20); ctx.lineTo(432, 44); ctx.lineTo(432, 256);
    ctx.lineTo(408, 280); ctx.lineTo(42, 280); ctx.lineTo(18, 256); ctx.lineTo(18, 44);
    ctx.closePath();
    ctx.fillStyle = "#455a64"; // Bordas de calçamento reforçado
    ctx.fill();
    ctx.strokeStyle = "#78909c";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. Piso de Lajes de Concreto Polido de Skatepark
    const plazaX = 26, plazaY = 28, plazaW = 398, plazaH = 244;
    ctx.fillStyle = "#cfd8dc"; // Concreto liso clássico
    ctx.fillRect(plazaX, plazaY, plazaW, plazaH);

    // Juntas de dilatação pretas de concreto (grid quadriculado de rua)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.10)";
    ctx.lineWidth = 1;
    for (let gx = plazaX; gx < plazaX + plazaW; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, plazaY); ctx.lineTo(gx, plazaY + plazaH); ctx.stroke();
    }
    for (let gy = plazaY; gy < plazaY + plazaH; gy += 40) {
        ctx.beginPath(); ctx.moveTo(plazaX, gy); ctx.lineTo(plazaX + plazaW, gy); ctx.stroke();
    }

    // Canteiros Verdes Tropicais nos Cantos
    ctx.fillStyle = "#33691e";
    ctx.fillRect(360, 34, 52, 40);
    ctx.strokeStyle = "#607d8b";
    ctx.strokeRect(360, 34, 52, 40);
    ctx.fillStyle = "#33691e";
    ctx.fillRect(360, 222, 52, 40);
    ctx.strokeRect(360, 222, 52, 40);

    // 3. MINI QUARTER-PIPE / RAMPA DE TRANSIÇÃO (LANDMARK PRINCIPAL)
    const qX = 52, qY = 46, qW = 72, qH = 46;
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(qX + 2, qY + qH, qW + 4, 6);

    ctx.fillStyle = "#90a4ae";
    ctx.beginPath();
    ctx.moveTo(qX, qY + qH); ctx.lineTo(qX + qW, qY + qH); ctx.lineTo(qX + qW, qY); ctx.lineTo(qX + 16, qY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#b0bec5";
    ctx.beginPath();
    ctx.moveTo(qX, qY + qH); ctx.lineTo(qX + qW - 6, qY + qH); ctx.lineTo(qX + qW - 6, qY + 6); ctx.lineTo(qX + 22, qY + 6);
    ctx.closePath();
    ctx.fill();

    // Coping Metálico Tubular no Topo
    ctx.fillStyle = "#eceff1";
    ctx.fillRect(qX + 18, qY, qW - 20, 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qX + 18, qY + 1, qW - 20, 1.5);

    // Plataforma / Deck do topo
    ctx.fillStyle = "#546e7a";
    ctx.fillRect(qX + 20, qY - 8, qW - 20, 8);
    ctx.strokeStyle = "#37474f";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(qX + 20, qY - 14, qW - 20, 6);

    // GRAFITE URBANO NA RAMPA ("SKATE" em magenta/ciano)
    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("SKATE", qX + 25, qY + 28);
    ctx.fillStyle = "#ff007f";
    ctx.fillText("SKATE", qX + 24, qY + 27);

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
    ctx.fillStyle = "#cfd8dc";
    ctx.fillRect(rlX, rlY, rlW, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(rlX, rlY, rlW, 1.5);
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
    drawPath(205, 0, 40, 30);
    drawPath(420, 130, 30, 40);
    drawPath(0, 130, 30, 40);

    ctx.restore();
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
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Costa pixelada e gramado: mantém a linguagem das outras ilhas sem reutilizar a arena do minigame.
    ctx.fillStyle = "#24663f"; ctx.fillRect(11, 11, 428, 278);
    ctx.fillStyle = "#54b85f"; ctx.fillRect(16, 16, 418, 268);
    ctx.fillStyle = "#72d36c"; ctx.fillRect(22, 22, 406, 256);
    ctx.fillStyle = "#9de477";
    [[35, 37, 30, 4], [139, 29, 28, 3], [293, 38, 35, 4], [378, 111, 34, 3],
     [45, 169, 27, 3], [157, 201, 38, 4], [273, 242, 31, 3], [340, 264, 42, 3]]
        .forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
    ctx.fillStyle = "#3c9851";
    [[74, 150], [132, 253], [305, 181], [398, 250], [320, 60], [51, 118]]
        .forEach(([x, y]) => { ctx.fillRect(x, y, 8, 3); ctx.fillRect(x + 3, y - 3, 3, 6); });

    // Caminhos de terra ligam a entrada direita ao Mestre e preservam a saída norte para a Escalada.
    ctx.fillStyle = "#9a7444";
    ctx.fillRect(420, 127, 30, 46);
    ctx.fillRect(205, 0, 40, 58);
    ctx.fillRect(160, 52, 130, 101);
    ctx.fillRect(250, 130, 185, 40);
    ctx.fillStyle = "#d9bd72";
    ctx.fillRect(424, 132, 26, 36);
    ctx.fillRect(210, 0, 30, 62);
    ctx.fillRect(166, 57, 118, 90);
    ctx.fillRect(248, 136, 187, 28);
    ctx.fillStyle = "#efd98d";
    ctx.fillRect(177, 66, 96, 4);
    ctx.fillRect(260, 142, 145, 3);

    // Pontes curtas nas duas conexões do mapa.
    ctx.fillStyle = "#654225";
    for (let x = 422; x < 450; x += 7) ctx.fillRect(x, 129, 4, 42);
    for (let y = 0; y < 24; y += 7) ctx.fillRect(207, y, 36, 4);

    const assets = window.archeryAssets;
    const frame = Math.floor(performance.now() / 240);
    const drawAsset = (category, subtype, state, index, x, y, size) => assets
        ? assets.draw(ctx, category, subtype, state, index, x, y, size, size, "manifest")
        : false;

    // Estandartes deixam a modalidade reconhecível ainda na borda da ilha.
    drawAsset("prop", "wind_flag", "IDLE", frame, 45, 96, 58);
    drawAsset("prop", "wind_flag", "IDLE", frame + 1, 407, 99, 58);

    // Pequena área de treino: alvos diferentes e fardos nas laterais, sem fechar o corredor central.
    if (!drawAsset("target", "large", "IDLE", frame, 95, 124, 64)) {
        ctx.fillStyle = "#f5f0dc"; ctx.beginPath(); ctx.arc(95, 94, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#e74c3c"; ctx.beginPath(); ctx.arc(95, 94, 17, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#f1c40f"; ctx.beginPath(); ctx.arc(95, 94, 7, 0, Math.PI * 2); ctx.fill();
    }
    drawAsset("target", "medium", "IDLE", frame + 2, 355, 132, 56);
    drawAsset("prop", "hay_bale", "IDLE", frame, 62, 239, 64);
    drawAsset("prop", "hay_bale", "IDLE", frame + 1, 392, 239, 60);
    drawAsset("prop", "target_stand", "IDLE", frame, 321, 226, 48);

    // Caixa de flechas decorativa.
    ctx.fillStyle = "#5a351f"; ctx.fillRect(103, 212, 29, 17);
    ctx.fillStyle = "#9b632f"; ctx.fillRect(106, 215, 23, 11);
    ctx.fillStyle = "#e0aa45"; ctx.fillRect(106, 217, 23, 3);
    [[111, 194], [119, 190], [127, 196]].forEach(([x, y], index) => {
        ctx.strokeStyle = "#f0f3e8"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, 216); ctx.stroke();
        ctx.fillStyle = index === 1 ? "#e74c3c" : "#f1c40f";
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 5); ctx.lineTo(x + 3, y + 5); ctx.closePath(); ctx.fill();
    });

    // Arco apoiado no cavalete direito.
    ctx.strokeStyle = "#8a4b24"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(333, 204, 12, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.strokeStyle = "#f4ead1"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(333, 192); ctx.lineTo(333, 216); ctx.stroke();
    ctx.fillStyle = "#d9a441"; ctx.fillRect(328, 202, 9, 4);

    // Placa de entrada aponta o caminho para a área do Mestre.
    ctx.fillStyle = "#5a351f"; ctx.fillRect(372, 177, 4, 25);
    ctx.fillStyle = "#8e572a"; ctx.fillRect(350, 174, 45, 17);
    ctx.fillStyle = "#f5d66d";
    ctx.beginPath(); ctx.moveTo(358, 182); ctx.lineTo(384, 182); ctx.lineTo(378, 177); ctx.moveTo(384, 182); ctx.lineTo(378, 187); ctx.strokeStyle = "#f5d66d"; ctx.lineWidth = 2; ctx.stroke();

    // Label em forma de placa; o sprite do Mestre é desenhado depois pela camada global de NPCs.
    ctx.fillStyle = "#5b3522"; ctx.fillRect(161, 24, 128, 17);
    ctx.fillStyle = "#8d5530"; ctx.fillRect(164, 27, 122, 11);
    ctx.fillStyle = "#fff0b7";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("MESTRE DO ARCO", 225, 36);
    ctx.textAlign = "left";
    if (archeryQaParams.has("archeryIslandQa")) {
        canvas.dataset.archeryIslandDiagnostics = JSON.stringify({
            scene: currentScene,
            masterAsset: imgMestreArcoOverworld.src,
            masterLoaded: imgMestreArcoOverworld.complete && imgMestreArcoOverworld.naturalWidth > 0,
            masterNaturalSize: [imgMestreArcoOverworld.naturalWidth, imgMestreArcoOverworld.naturalHeight],
            masterPosition: [225, 118],
            masterScaleHeight: 72,
            masterCrop: [335, 96, 656, 1114],
            interaction: [58, 76, 12],
            player: [Math.round(player.x), Math.round(player.y)],
            decorAssets: assets ? assets.diagnostics() : null
        });
    }
    ctx.restore();
}

function drawIlhaCorrida() {
    drawWater();
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Silhueta do Estádio Olímpico / Pista de Atletismo Oval
    ctx.beginPath();
    ctx.moveTo(50, 18); ctx.lineTo(400, 18); ctx.lineTo(434, 48); ctx.lineTo(434, 252);
    ctx.lineTo(400, 282); ctx.lineTo(50, 282); ctx.lineTo(16, 252); ctx.lineTo(16, 48);
    ctx.closePath();
    ctx.fillStyle = "#2e7d32"; // Grama perimetral de amortecimento
    ctx.fill();
    ctx.strokeStyle = "#1b5e20";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. Anel de Pista de Tartan Vermelho-Terracota Oficial
    const trackX = 28, trackY = 28, trackW = 394, trackH = 244;
    ctx.fillStyle = "#c62828"; // Vermelho tijolo oficial de atletismo
    ctx.fillRect(trackX, trackY, trackW, trackH);

    // Gramado Central Interno (Infield)
    const fieldX = 82, fieldY = 76, fieldW = 286, fieldH = 148;
    ctx.fillStyle = "#43a047"; // Grama do campo central
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    // Faixas cortadas no gramado central (efeito cortador de grama)
    for (let gy = fieldY; gy < fieldY + fieldH; gy += 20) {
        ctx.fillStyle = ((gy - fieldY) / 20) % 2 === 0 ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
        ctx.fillRect(fieldX, gy, fieldW, 10);
    }

    // 3. Marcações das Raias de Atletismo (3 Raias com linhas brancas contínuas)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    // Raia 1 (Interna)
    ctx.strokeRect(trackX + 18, trackY + 16, trackW - 36, trackH - 32);
    // Raia 2 (Média)
    ctx.strokeRect(trackX + 36, trackY + 32, trackW - 72, trackH - 64);
    // Raia 3 (Externa)
    ctx.strokeRect(trackX + 2, trackY + 2, trackW - 4, trackH - 4);

    // Numeração Oficial das Raias pintada no solo
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("1", trackX + 24, trackY + 12);
    ctx.fillText("2", trackX + 42, trackY + 12);
    ctx.fillText("3", trackX + 6, trackY + 12);

    // 4. LINHA DE CHEGADA (LANDMARK PRINCIPAL) & PÓRTICO SUSPENSO
    const finX = 202, finY = 126, finW = 46, finH = 18;
    for (let cx = 0; cx < finW; cx += 5) {
        for (let cy = 0; cy < finH; cy += 4.5) {
            ctx.fillStyle = ((Math.floor(cx / 5) + Math.floor(cy / 4.5)) % 2 === 0) ? "#ffffff" : "#111111";
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
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 7px monospace"; ctx.fillText("2", podX + 4, podY + 18);
    // 1º Lugar
    ctx.fillStyle = "#fbc02d";
    ctx.fillRect(podX + 14, podY, 14, 23);
    ctx.fillStyle = "#ffffff"; ctx.fillText("1", podX + 18, podY + 15);
    // 3º Lugar
    ctx.fillStyle = "#bcaaa4";
    ctx.fillRect(podX + 29, podY + 11, 13, 12);
    ctx.fillStyle = "#ffffff"; ctx.fillText("3", podX + 33, podY + 20);

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
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(c.x + 2, c.y + 4, 6, 2);
    });

    // 8. Caminho de Saída Leste (para a Ilha do Skate)
    drawPath(420, 130, 30, 40);

    ctx.restore();
}

function drawIlhaEscalada() {
    drawWater();
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Orla Alpina Rochosa Orgânica (Pedregulhos e Escarpas quebrando na água)
    ctx.beginPath();
    ctx.moveTo(34, 20); ctx.lineTo(416, 20); ctx.lineTo(436, 46); ctx.lineTo(430, 110);
    ctx.lineTo(438, 170); ctx.lineTo(430, 240); ctx.lineTo(412, 280); ctx.lineTo(38, 280);
    ctx.lineTo(16, 244); ctx.lineTo(24, 170); ctx.lineTo(16, 110); ctx.lineTo(22, 46);
    ctx.closePath();
    ctx.fillStyle = "#37474f"; // Rocha base granítica escura
    ctx.fill();
    ctx.strokeStyle = "#263238";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Espuma das ondas batendo nas rochas
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    [20, 70, 130, 200, 280, 350, 410].forEach(bx => {
        ctx.fillRect(bx, 17, 8, 2);
        ctx.fillRect(bx, 281, 8, 2);
    });

    // 2. Terreno Alpino e Platô de Terra Batida & Grama
    const mtnX = 26, mtnY = 26, mtnW = 398, mtnH = 248;
    ctx.fillStyle = "#5d4037"; // Terra e cascalho alpino
    ctx.fillRect(mtnX, mtnY, mtnW, mtnH);

    // Manchas de vegetação rasteira alpina
    ctx.fillStyle = "#33691e";
    ctx.fillRect(36, 115, 95, 140);
    ctx.fillRect(315, 115, 95, 140);
    ctx.fillRect(145, 165, 160, 90);

    // 3. Cordilheira de Montanhas Majestosa ao Fundo (Norte)
    // Pico distante da esquerda
    ctx.fillStyle = "#455a64";
    ctx.beginPath();
    ctx.moveTo(30, 90); ctx.lineTo(130, 18); ctx.lineTo(230, 90);
    ctx.closePath(); ctx.fill();

    // Pico distante da direita
    ctx.beginPath();
    ctx.moveTo(220, 90); ctx.lineTo(320, 18); ctx.lineTo(420, 90);
    ctx.closePath(); ctx.fill();

    // Pico Central Mais Alto (Monte Zorp)
    ctx.fillStyle = "#263238";
    ctx.beginPath();
    ctx.moveTo(120, 100); ctx.lineTo(225, 10); ctx.lineTo(330, 100);
    ctx.closePath(); ctx.fill();

    // Cumes Nevados das Montanhas
    ctx.fillStyle = "#eceff1";
    ctx.beginPath();
    ctx.moveTo(225, 10); ctx.lineTo(200, 36); ctx.lineTo(215, 30);
    ctx.lineTo(225, 38); ctx.lineTo(235, 28); ctx.lineTo(250, 36);
    ctx.closePath(); ctx.fill();

    // Neve do Pico Esquerdo e Direito
    ctx.beginPath();
    ctx.moveTo(130, 18); ctx.lineTo(110, 34); ctx.lineTo(130, 30); ctx.lineTo(150, 34);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(320, 18); ctx.lineTo(300, 34); ctx.lineTo(320, 30); ctx.lineTo(340, 34);
    ctx.closePath(); ctx.fill();

    // 4. PAREDÃO ROCHOSO DE ESCALADA COM AGARRAS COLORIDAS (LANDMARK PRINCIPAL)
    // Paredão de treino da esquerda (Noroeste: x=108..190, y=32..76)
    const wallX = 108, wallY = 32, wallW = 82, wallH = 44;
    ctx.fillStyle = "#37474f";
    ctx.fillRect(wallX, wallY, wallW, wallH);
    ctx.strokeStyle = "#546e7a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wallX, wallY, wallW, wallH);

    // Agarras de Escalada em Resina Coloridas (Climbing Holds)
    const holds = [
        { x: wallX + 10, y: wallY + 8, c: "#e53935" },
        { x: wallX + 28, y: wallY + 12, c: "#ffeb3b" },
        { x: wallX + 46, y: wallY + 6, c: "#1e88e5" },
        { x: wallX + 66, y: wallY + 10, c: "#76ff03" },
        { x: wallX + 18, y: wallY + 22, c: "#ff9800" },
        { x: wallX + 38, y: wallY + 25, c: "#e53935" },
        { x: wallX + 58, y: wallY + 22, c: "#ffeb3b" },
        { x: wallX + 74, y: wallY + 28, c: "#1e88e5" },
        { x: wallX + 12, y: wallY + 34, c: "#76ff03" },
        { x: wallX + 32, y: wallY + 36, c: "#ff9800" },
        { x: wallX + 52, y: wallY + 35, c: "#e53935" }
    ];
    holds.forEach(h => {
        ctx.fillStyle = h.c;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, 3.5, 2.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111111";
        ctx.fillRect(h.x - 0.7, h.y - 0.7, 1.4, 1.4);
    });

    // Corda Dinâmica de Segurança Suspensa com Mosquetões
    ctx.strokeStyle = "#fbc02d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wallX + 46, wallY + 4);
    ctx.lineTo(wallX + 44, wallY + 25);
    ctx.lineTo(wallX + 48, wallY + wallH);
    ctx.stroke();
    // Mosquetão prateado clipado
    ctx.fillStyle = "#eceff1";
    ctx.fillRect(wallX + 43, wallY + 18, 4, 6);

    // Paredão de treino da direita (Nordeste: x=265..345, y=32..76)
    const wall2X = 265, wall2Y = 32, wall2W = 80, wall2H = 44;
    ctx.fillStyle = "#37474f";
    ctx.fillRect(wall2X, wall2Y, wall2W, wall2H);
    ctx.strokeStyle = "#546e7a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wall2X, wall2Y, wall2W, wall2H);

    const holds2 = [
        { x: wall2X + 12, y: wall2Y + 8, c: "#1e88e5" },
        { x: wall2X + 30, y: wall2Y + 12, c: "#76ff03" },
        { x: wall2X + 50, y: wall2Y + 6, c: "#ff9800" },
        { x: wall2X + 68, y: wall2Y + 10, c: "#e53935" },
        { x: wall2X + 20, y: wall2Y + 24, c: "#ffeb3b" },
        { x: wall2X + 40, y: wall2Y + 22, c: "#1e88e5" },
        { x: wall2X + 60, y: wall2Y + 26, c: "#76ff03" },
        { x: wall2X + 14, y: wall2Y + 36, c: "#e53935" },
        { x: wall2X + 36, y: wall2Y + 35, c: "#ff9800" },
        { x: wall2X + 58, y: wall2Y + 36, c: "#ffeb3b" }
    ];
    holds2.forEach(h => {
        ctx.fillStyle = h.c;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, 3.5, 2.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111111";
        ctx.fillRect(h.x - 0.7, h.y - 0.7, 1.4, 1.4);
    });

    // Corda suspensa direita
    ctx.strokeStyle = "#ff7043";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wall2X + 30, wall2Y + 4);
    ctx.lineTo(wall2X + 34, wall2Y + 24);
    ctx.lineTo(wall2X + 31, wall2Y + wall2H);
    ctx.stroke();

    // 5. Trilha de Terra Batida Principal até a base da montanha
    ctx.fillStyle = "#8d6e63";
    ctx.beginPath();
    ctx.moveTo(196, 270); ctx.lineTo(204, 75); ctx.lineTo(246, 75); ctx.lineTo(254, 270);
    ctx.closePath();
    ctx.fill();

    // Pedregulhos na trilha
    ctx.fillStyle = "#d7ccc8";
    for (let i = 0; i < 8; i++) {
        ctx.fillRect(212 + (i % 2) * 14, 90 + i * 22, 4, 3);
    }

    // Portal de Expedição no Norte
    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(195, 52, 6, 26);
    ctx.fillRect(249, 52, 6, 26);
    ctx.fillRect(195, 52, 60, 6);
    ctx.fillStyle = "#fbc02d";
    ctx.font = "bold 7px monospace";
    ctx.fillText("▲ MONTE ZORP 2.800m", 168, 47);

    // Entrada Sul (caminho para a Ilha do Arco)
    drawPath(205, 270, 40, 30);

    ctx.restore();
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
    drawWater();

    // Água rasa e contorno quebrado: a ilha deixa de parecer uma placa retangular.
    drawSurfIslandShape([10, 33, 26, 18, 95, 13, 123, 20, 185, 12, 272, 12,
        330, 20, 363, 14, 424, 22, 440, 37, 440, 84, 435, 106, 441, 176,
        436, 244, 421, 275, 264, 281, 246, 300, 204, 300, 185, 281,
        28, 277, 12, 250, 8, 187, 13, 123], "#7ddbd8");
    drawSurfIslandShape([15, 38, 29, 25, 97, 21, 125, 27, 185, 20, 273, 20,
        329, 27, 362, 22, 420, 29, 433, 43, 432, 90, 427, 110, 434, 177,
        429, 241, 417, 268, 259, 274, 243, 300, 207, 300, 190, 274,
        32, 270, 19, 246, 16, 185, 21, 124], "#fff8d7");
    drawSurfIslandShape([21, 41, 34, 30, 99, 27, 126, 33, 188, 26, 269, 26,
        328, 33, 359, 28, 416, 35, 426, 47, 425, 91, 420, 111, 427, 176,
        422, 237, 411, 261, 255, 267, 239, 300, 211, 300, 195, 267,
        38, 263, 26, 241, 23, 183, 28, 124], "#f7e3a0");

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

    // Pequeno deck de treino: o mestre tem uma silhueta própria e espaço ao redor.
    drawSurfIslandShape([177, 132, 185, 118, 265, 118, 273, 132,
        267, 150, 183, 150], "#297e94");
    drawSurfIslandShape([184, 130, 190, 123, 260, 123, 266, 130,
        261, 142, 189, 142], "#72c8c3");
    ctx.fillStyle = "#e7ffff";
    ctx.fillRect(183, 145, 84, 3);
    ctx.fillRect(193, 150, 64, 2);
    ctx.fillStyle = "#8a5635";
    ctx.fillRect(179, 42, 92, 14);
    ctx.fillStyle = "#bd8350";
    ctx.fillRect(182, 44, 86, 9);
    ctx.fillStyle = "#fff6d5";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("MESTRE DO SURF", 225, 52);
    ctx.textAlign = "left";

    // Decoração de praia com os recortes oficiais, mantendo o centro livre.
    drawSurfIslandAsset(surfIslandDecor.palm, 58, 109, 112);
    drawSurfIslandAsset(surfIslandDecor.palm, 392, 109, 112);
    drawSurfIslandAsset(surfIslandDecor.umbrella, 96, 229, 94);
    drawSurfIslandAsset(surfIslandDecor.towel, 117, 249, 55);
    drawSurfIslandAsset(surfIslandDecor.cooler, 151, 239, 54);
    drawSurfIslandAsset(surfIslandDecor.sign, 353, 208, 74);

    // Entrada conectada à ilha ao sul, sem o antigo retângulo cinza.
    ctx.fillStyle = "#a77348";
    ctx.fillRect(205, 273, 40, 27);
    ctx.fillStyle = "#d7a16b";
    for (let y = 277; y < 300; y += 8) ctx.fillRect(208, y, 34, 5);
}

// -------------------------------------------------------------
// 7. RENDERIZADOR DO PING PONG E HUD GERAL
// -------------------------------------------------------------
function drawPingPongGame() {
    ctx.imageSmoothingEnabled = false;

    if (bgPingPong.complete) ctx.drawImage(bgPingPong, 0, 0, canvas.width, canvas.height);

    let zorpSpriteImg = imgZorpIdle;
    if (pingPong.playerAction === "MOVE_UP") zorpSpriteImg = imgZorpMU;
    else if (pingPong.playerAction === "MOVE_DOWN") zorpSpriteImg = imgZorpMD;
    else if (pingPong.playerAction === "HIT") zorpSpriteImg = imgZorpHit;

    let mestreSpriteImg = imgMestreIdle;
    if (pingPong.opponentAction === "MOVE_UP") mestreSpriteImg = imgMestreMU;
    else if (pingPong.opponentAction === "MOVE_DOWN") mestreSpriteImg = imgMestreMD;
    else if (pingPong.opponentAction === "HIT") mestreSpriteImg = imgMestreHit;

    drawShadow(pingPong.playerX + 18, pingPong.playerY + 45);
    drawShadow(pingPong.opponentX + 18, pingPong.opponentY + 45);

    if (zorpSpriteImg.complete) ctx.drawImage(zorpSpriteImg, pingPong.playerX, pingPong.playerY, 36, 48);
    if (mestreSpriteImg.complete) ctx.drawImage(mestreSpriteImg, pingPong.opponentX, pingPong.opponentY, 36, 48);

    // Reação Visual do Mestre (Desistência/Suor estilo Tengu)
    if (pingPong.mestreReaction) {
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(pingPong.mestreReaction.text, pingPong.opponentX + 10, pingPong.opponentY - 8);
    }

    // Telegrafia do Saque de Novas Bolas pelo Mestre
    if (pingPong.mestreSpawnWindup > 0) {
        ctx.save();
        ctx.fillStyle = (Date.now() % 160 < 80) ? "rgba(243, 156, 18, 0.7)" : "rgba(231, 76, 60, 0.7)";
        ctx.beginPath();
        ctx.arc(pingPong.opponentX - 6, pingPong.opponentY + 20, 10 + (pingPong.mestreSpawnWindup % 6), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Ondas de Choque do Especial AoE (Tela Inteira)
    if (pingPong.aoeEffects) {
        pingPong.aoeEffects.forEach(aoe => {
            ctx.save();
            ctx.strokeStyle = aoe.color || "#00e5ff";
            ctx.lineWidth = 3;
            ctx.globalAlpha = Math.max(0, aoe.alpha);
            ctx.beginPath();
            ctx.arc(aoe.x, aoe.y, aoe.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
    }

    // Efeitos Visuais de Quique
    if (pingPong.bounceEffects) {
        pingPong.bounceEffects.forEach(b => {
            ctx.save();
            ctx.strokeStyle = b.color || "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = Math.max(0, b.alpha);
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.radius * 1.5, b.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
    }

    // RENDERIZAÇÃO DAS BOLAS ATIVAS (MULTI-BOLAS)
    for (let b of pingPong.balls) {
        // Rastro luminoso individual
        if (b.trail && b.trail.length > 0) {
            for (let i = 0; i < b.trail.length; i++) {
                let tr = b.trail[i];
                let trRad = Math.max(1.5, b.radius * (i / b.trail.length));
                ctx.save();
                ctx.globalAlpha = tr.alpha * 0.45;
                let trailColor = b.isSuper ? "#00e5ff" : ((pingPong.rallyHits >= 8) ? "#e74c3c" : (pingPong.rallyHits >= 4 ? "#f1c40f" : "#ffffff"));
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
        if (b.isSuper) {
            ctx.fillStyle = "#00e5ff"; ctx.shadowBlur = 14; ctx.shadowColor = "#00e5ff";
        } else if (pingPong.rallyHits >= 8 || Math.abs(b.speedX) > 7) {
            ctx.fillStyle = "#e74c3c"; ctx.shadowBlur = 12; ctx.shadowColor = "#ff0055";
        } else if (pingPong.rallyHits >= 4) {
            ctx.fillStyle = "#ff9800"; ctx.shadowBlur = 8; ctx.shadowColor = "#ffeb3b";
        } else {
            ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(b.x, bDrawY, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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

    // Informações Adicionais: Bolas em jogo e Barra de Especial
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`BOLAS EM JOGO: ${pingPong.balls.length}`, 328, 22);

    // Indicador Dinâmico de Rali
    if (pingPong.rallyHits > 0) {
        ctx.font = "bold 10px monospace";
        if (pingPong.rallyHits >= 8) {
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
        ctx.fillStyle = (Date.now() % 300 < 150) ? "#00e5ff" : "#ffea00";
        ctx.fillRect(15, 12, 100, 10);
        ctx.fillStyle = "#00e5ff";
        ctx.font = "bold 8px monospace";
        ctx.fillText("ESPAÇO: SMASH TOTAL!", 15, 32);
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
            "Aperte [ESPAÇO] com a barra cheia para o Smash Global em Área!"
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
// 7.1. MINIGAME DE SKATE: PARK ARCADE (ESTILO TONY HAWK)
// -------------------------------------------------------------

const skateGame = {
    state: 'TUTORIAL', // 'TUTORIAL', 'PLAYING', 'VICTORY', 'DEFEAT'
    score: 0,
    highScore: 25000,
    timer: 75 * 60, // 75 segundos (4500 frames)
    special: 0,
    maxSpecial: 100,
    isSpecialActive: false,
    specialTimer: 0,
    
    // Sistema de Pontuação e Combos
    comboScore: 0,
    comboMultiplier: 1,
    comboTricks: [],
    comboDisplayTimer: 0,
    lastComboText: '',
    lastComboTotal: 0,
    
    // Coletáveis e Conquistas
    tapesCollected: 0,
    totalTapes: 5,
    
    // Câmera da Pista (Mundo de 1800px)
    cameraX: 0,
    worldWidth: 1800,
    
    // Jogador Zorp
    player: {
        x: 240,
        y: 245,
        vx: 0,
        vy: 0,
        facing: 1, // 1: direita, -1: esquerda
        action: 'IDLE',
        frame: 0,
        animTimer: 0,
        angle: 0,
        charge: 0,
        charging: false,
        isGrounded: true,
        isGrinding: false,
        currentRail: null,
        landTimer: 0,
        fallTimer: 0
    },
    
    // Rival Mestre Humano
    mestre: {
        x: 650,
        y: 245,
        vx: 2.8,
        vy: 0,
        facing: 1,
        action: 'CRUISE',
        score: 0,
        frame: 0,
        animTimer: 0,
        isGrounded: true,
        isGrinding: false
    },
    
    // Elementos da Pista
    rails: [
        { id: 1, x1: 380, x2: 580, y: 215, height: 30 },
        { id: 2, x1: 780, x2: 970, y: 165, height: 30 }, // No topo da Funbox
        { id: 3, x1: 1180, x2: 1420, y: 205, height: 40 }
    ],
    
    boostPads: [
        { x: 260, w: 50, dir: 1 },
        { x: 1500, w: 50, dir: -1 }
    ],
    
    collectibles: [],
    particles: [],
    floatingTexts: []
};

function getParkSurface(x) {
    if (x <= 180) {
        // Quarter pipe esquerdo: curva suave de x=180 (y=245) até x=20 (y=120)
        let t = Math.max(0, Math.min(1, (180 - x) / 160));
        return 245 - 125 * Math.pow(t, 1.8);
    } else if (x >= 1620) {
        // Quarter pipe direito: curva suave de x=1620 (y=245) até x=1780 (y=120)
        let t = Math.max(0, Math.min(1, (x - 1620) / 160));
        return 245 - 125 * Math.pow(t, 1.8);
    } else if (x >= 700 && x <= 1050) {
        // Funbox Central: rampa subida x=700..770, mesa reta x=770..980, rampa descida x=980..1050
        if (x < 770) {
            let t = (x - 700) / 70;
            return 245 - 50 * t;
        } else if (x <= 980) {
            return 195;
        } else {
            let t = (x - 980) / 70;
            return 195 + 50 * t;
        }
    }
    return 245;
}

function getParkSlope(x) {
    if (x <= 180) {
        let t = Math.max(0, Math.min(1, (180 - x) / 160));
        let dy_dx = - (125 * 1.8 * Math.pow(t, 0.8)) / 160;
        return -Math.atan(dy_dx);
    } else if (x >= 1620) {
        let t = Math.max(0, Math.min(1, (x - 1620) / 160));
        let dy_dx = (125 * 1.8 * Math.pow(t, 0.8)) / 160;
        return Math.atan(dy_dx);
    } else if (x >= 700 && x < 770) {
        return -Math.atan(50 / 70);
    } else if (x > 980 && x <= 1050) {
        return Math.atan(50 / 70);
    }
    return 0;
}

function spawnSkateParticle(x, y, vx, vy, color, size, life, shape = 'circle') {
    skateGame.particles.push({
        x: x, y: y, vx: vx, vy: vy,
        color: color, size: size,
        life: life, maxLife: life,
        shape: shape
    });
}

function spawnSkateFloatingText(text, x, y, color = "#f1c40f", size = 12) {
    skateGame.floatingTexts.push({
        text: text,
        x: x, y: y,
        vy: -1.2,
        color: color,
        size: size,
        alpha: 1.0,
        life: 70
    });
}

function resetSkateGame(fullReset = true) {
    if (fullReset) {
        skateGame.state = 'TUTORIAL';
        skateGame.score = 0;
        skateGame.highScore = 25000;
        skateGame.timer = 75 * 60;
        skateGame.special = 0;
        skateGame.isSpecialActive = false;
        skateGame.specialTimer = 0;
        skateGame.tapesCollected = 0;
        skateGame.comboScore = 0;
        skateGame.comboMultiplier = 1;
        skateGame.comboTricks = [];
        skateGame.comboDisplayTimer = 0;
        skateGame.lastComboText = '';
        skateGame.lastComboTotal = 0;
    }
    
    // Posiciona o Zorp na pista
    skateGame.player.x = 240;
    skateGame.player.y = 245;
    skateGame.player.vx = 0;
    skateGame.player.vy = 0;
    skateGame.player.facing = 1;
    skateGame.player.action = 'IDLE';
    skateGame.player.frame = 0;
    skateGame.player.animTimer = 0;
    skateGame.player.angle = 0;
    skateGame.player.charge = 0;
    skateGame.player.charging = false;
    skateGame.player.isGrounded = true;
    skateGame.player.isGrinding = false;
    skateGame.player.currentRail = null;
    skateGame.player.landTimer = 0;
    skateGame.player.fallTimer = 0;
    
    skateGame.cameraX = 0;
    
    // Mestre Humano
    skateGame.mestre.x = 650;
    skateGame.mestre.y = 245;
    skateGame.mestre.vx = 2.8;
    skateGame.mestre.vy = 0;
    skateGame.mestre.facing = 1;
    skateGame.mestre.action = 'CRUISE';
    skateGame.mestre.score = 0;
    skateGame.mestre.isGrounded = true;
    skateGame.mestre.isGrinding = false;
    
    // Recria os coletáveis da arena
    skateGame.collectibles = [
        // 4 Baterias Neon (+25% Especial)
        { id: 1, type: 'battery', x: 100, y: 135, img: imgSkateBattery, collected: false, name: 'Bateria Neon' },
        { id: 2, type: 'battery', x: 480, y: 175, img: imgSkateBattery, collected: false, name: 'Bateria Neon' },
        { id: 3, type: 'battery', x: 875, y: 125, img: imgSkateBattery, collected: false, name: 'Bateria Neon' },
        { id: 4, type: 'battery', x: 1700, y: 135, img: imgSkateBattery, collected: false, name: 'Bateria Neon' },
        
        // 5 Fitas K7 (+1.000 pts cada, +5.000 bônus ao coletar o set completo!)
        { id: 5, type: 'tape', x: 50, y: 85, img: imgSkateTape, collected: false, name: 'Fita K7 #1' },
        { id: 6, type: 'tape', x: 320, y: 220, img: imgSkateTape, collected: false, name: 'Fita K7 #2' },
        { id: 7, type: 'tape', x: 875, y: 155, img: imgSkateTape, collected: false, name: 'Fita K7 #3' },
        { id: 8, type: 'tape', x: 1300, y: 175, img: imgSkateTape, collected: false, name: 'Fita K7 #4' },
        { id: 9, type: 'tape', x: 1750, y: 85, img: imgSkateTape, collected: false, name: 'Fita K7 #5' },
        
        // 2 Orbes Multiplicadores (+1x Combo Multiplier)
        { id: 10, type: 'multiplier', x: 640, y: 175, img: imgSkateMultiplier, collected: false, name: 'Multiplicador de Combo' },
        { id: 11, type: 'multiplier', x: 1110, y: 175, img: imgSkateMultiplier, collected: false, name: 'Multiplicador de Combo' },
        
        // 2 Cristais de Tempo (+5s de tempo cada)
        { id: 12, type: 'time', x: 220, y: 220, img: imgSkateTime, collected: false, name: 'Cristal Temporal (+5s)' },
        { id: 13, type: 'time', x: 1450, y: 220, img: imgSkateTime, collected: false, name: 'Cristal Temporal (+5s)' },
        
        // 1 Fã Alienígena Secreto (+2.500 pts!)
        { id: 14, type: 'alien', x: 920, y: 85, img: imgTurista, collected: false, name: 'Fã Alienígena Resgatado!' }
    ];
    
    skateGame.particles = [];
    skateGame.floatingTexts = [];
}

function getZorpSkateSprite() {
    const act = skateGame.player.action;
    const f = skateGame.player.frame;
    if (act === 'PUSH') return imgZorpSkatePush;
    if (act === 'CRUISE') return imgZorpSkateCruise;
    if (act === 'CHARGE') return imgZorpSkateCharge;
    if (act === 'BRAKE') return imgZorpSkateBrake;
    if (act === 'CARVE') return imgZorpSkateCarve;
    if (act === 'FALL') return imgZorpSkateFall;
    if (act === 'STUMBLE') return imgZorpSkateStumble;
    if (act === 'GRAB') return imgZorpSkateGrab;
    if (act === 'WIN') return imgZorpSkateWin;
    if (act === 'OLLIE') return imgZorpSkateOllie[f % 4];
    if (act === 'LAND') return imgZorpSkateLand[f % 4];
    if (act === 'KICKFLIP') return imgZorpSkateKickflip[f % 6];
    if (act === 'SPIN') return imgZorpSkateSpin[f % 6];
    if (act === 'GRIND') return imgZorpSkateGrind[f % 4];
    if (act === 'SPECIAL') return imgZorpSkateSpecial[f % 8];
    return imgZorpSkateIdle;
}

function updateSkateGame() {
    // 1. Estado de Tutorial
    if (skateGame.state === 'TUTORIAL') {
        if (keys.space) {
            skateGame.state = 'PLAYING';
            keys.space = false;
        }
        return;
    }
    
    // 2. Estado de Fim de Jogo (Vitória ou Derrota)
    if (skateGame.state === 'VICTORY' || skateGame.state === 'DEFEAT') {
        if (keys.space) {
            if (skateGame.state === 'VICTORY') {
                currentScene = "ILHA_SKATE";
                player.x = 225; player.y = 150;
            } else {
                resetSkateGame(true);
            }
            keys.space = false;
        } else if (keys.r) {
            resetSkateGame(true);
            keys.r = false;
        }
        return;
    }
    
    const p = skateGame.player;
    
    // 3. Cronômetro da Partida (75 Segundos)
    skateGame.timer--;
    if (skateGame.timer <= 0) {
        if (skateGame.comboScore > 0) {
            skateGame.score += skateGame.comboScore * skateGame.comboMultiplier;
            skateGame.comboScore = 0;
        }
        if (skateGame.score >= skateGame.highScore) {
            skateGame.state = 'VICTORY';
            insignias.skate = true;
            p.action = 'WIN';
        } else {
            skateGame.state = 'DEFEAT';
            p.action = 'FALL';
        }
        return;
    }
    
    // 4. Modo Especial (Buraco de Minhoca Cósmico)
    if (skateGame.isSpecialActive) {
        skateGame.specialTimer--;
        if (Math.random() < 0.6) {
            spawnSkateParticle(
                p.x + (Math.random() - 0.5) * 35,
                p.y - 20 + (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                Math.random() < 0.5 ? "#00ffff" : "#e056fd",
                3, 25, 'spark'
            );
        }
        if (skateGame.specialTimer <= 0) {
            skateGame.isSpecialActive = false;
        }
    }
    
    // 5. Atualização de Partículas e Textos Flutuantes
    for (let i = skateGame.particles.length - 1; i >= 0; i--) {
        const pt = skateGame.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) skateGame.particles.splice(i, 1);
    }
    for (let i = skateGame.floatingTexts.length - 1; i >= 0; i--) {
        const ft = skateGame.floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        ft.alpha = ft.life / 70;
        if (ft.life <= 0) skateGame.floatingTexts.splice(i, 1);
    }
    
    // 6. Timers de Pouso e Queda
    if (p.landTimer > 0) {
        p.landTimer--;
        if (p.landTimer === 0 && p.isGrounded) p.action = 'CRUISE';
    }
    if (p.fallTimer > 0) {
        p.fallTimer--;
        if (p.fallTimer === 0) p.action = 'CRUISE';
    }
    
    // 7. Mecânica de Abaixar e Carregar Pulo (Hold to Jump)
    if (p.isGrounded && !p.isGrinding && p.fallTimer === 0) {
        if (keys.space || keys.w) {
            p.charging = true;
            p.charge = Math.min(1.0, p.charge + 0.038);
            p.action = 'CHARGE';
            p.vx *= 0.98;
            if (Math.random() < 0.25) {
                spawnSkateParticle(p.x, p.y, (Math.random() - 0.5) * 1.5, -0.5, "#ffffff", 2, 12);
            }
        } else if (p.charging) {
            p.charging = false;
            const jumpForce = 6.2 + p.charge * 4.6;
            p.vy = -jumpForce;
            p.isGrounded = false;
            p.action = 'OLLIE';
            p.frame = 0;
            p.charge = 0;
            if (skateGame.comboTricks.length === 0) {
                skateGame.comboScore = 150;
                skateGame.comboMultiplier = 1;
                skateGame.comboTricks.push("Ollie");
            }
        }
    }
    
    // 8. Movimentação e Remada no Chão
    if (p.isGrounded && !p.charging && p.fallTimer === 0) {
        const maxSpd = skateGame.isSpecialActive ? 8.5 : 5.5;
        if (keys.d) {
            if (p.vx < -0.5) {
                p.action = 'BRAKE';
                p.vx += 0.25;
            } else {
                p.action = 'PUSH';
                p.facing = 1;
                p.vx = Math.min(maxSpd, p.vx + 0.18);
            }
        } else if (keys.a) {
            if (p.vx > 0.5) {
                p.action = 'BRAKE';
                p.vx -= 0.25;
            } else {
                p.action = 'PUSH';
                p.facing = -1;
                p.vx = Math.max(-maxSpd, p.vx - 0.18);
            }
        } else {
            p.vx *= 0.986;
            if (Math.abs(p.vx) < 0.05) p.vx = 0;
            if (Math.abs(p.vx) > 0.4 && p.action !== 'LAND') p.action = 'CRUISE';
            else if (Math.abs(p.vx) <= 0.4 && p.action !== 'LAND') p.action = 'IDLE';
        }
        
        // Força da gravidade no plano inclinado das rampas
        const slope = getParkSlope(p.x);
        p.vx -= Math.sin(slope) * 0.38;
        
        // Impulso Vertical ao atingir o topo das Quarters
        if (p.x <= 55 || (p.x < 110 && p.vx < -3.2)) {
            p.vy = -Math.max(7.4, Math.abs(p.vx) * 1.35);
            p.vx = 2.4;
            p.facing = 1;
            p.isGrounded = false;
            p.action = 'OLLIE';
            p.frame = 0;
            if (!skateGame.comboTricks.includes("Vert Air")) {
                skateGame.comboTricks.push("Vert Air");
                skateGame.comboScore += 350;
                spawnSkateFloatingText("+350 VERT AIR!", p.x, p.y - 30, "#00ffea", 13);
            }
        } else if (p.x >= 1745 || (p.x > 1690 && p.vx > 3.2)) {
            p.vy = -Math.max(7.4, Math.abs(p.vx) * 1.35);
            p.vx = -2.4;
            p.facing = -1;
            p.isGrounded = false;
            p.action = 'OLLIE';
            p.frame = 0;
            if (!skateGame.comboTricks.includes("Vert Air")) {
                skateGame.comboTricks.push("Vert Air");
                skateGame.comboScore += 350;
                spawnSkateFloatingText("+350 VERT AIR!", p.x, p.y - 30, "#00ffea", 13);
            }
        }
    }
    
    // 9. Física e Manobras no Ar
    if (!p.isGrounded && !p.isGrinding) {
        p.vy += 0.28; // Gravidade
        
        // Controle de inclinação no ar
        if (keys.a) {
            p.vx = Math.max(-5.2, p.vx - 0.12);
            p.angle = Math.max(-0.65, p.angle - 0.04);
        }
        if (keys.d) {
            p.vx = Math.min(5.2, p.vx + 0.12);
            p.angle = Math.min(0.65, p.angle + 0.04);
        }
        if (!keys.a && !keys.d) {
            p.angle *= 0.94; // Nivelamento automático
        }
        
        // Execução de Manobras Aéreas
        if (keys.j && p.action !== 'KICKFLIP' && p.action !== 'FALL') {
            p.action = 'KICKFLIP'; p.frame = 0; p.animTimer = 0;
            skateGame.comboScore += 300;
            skateGame.comboMultiplier += 1;
            skateGame.comboTricks.push('Kickflip');
            skateGame.special = Math.min(100, skateGame.special + 6);
            spawnSkateFloatingText("+300 KICKFLIP!", p.x, p.y - 35, "#ff007f", 13);
        }
        if (keys.k && p.action !== 'SPIN' && p.action !== 'FALL') {
            p.action = 'SPIN'; p.frame = 0; p.animTimer = 0;
            skateGame.comboScore += 500;
            skateGame.comboMultiplier += 1;
            skateGame.comboTricks.push('360° Spin');
            skateGame.special = Math.min(100, skateGame.special + 9);
            spawnSkateFloatingText("+500 360° SPIN!", p.x, p.y - 35, "#ffeb3b", 13);
        }
        if (keys.u && p.action !== 'GRAB' && p.action !== 'FALL') {
            p.action = 'GRAB'; p.frame = 0; p.animTimer = 0;
            skateGame.comboScore += 400;
            skateGame.comboMultiplier += 1;
            skateGame.comboTricks.push('Indy Grab');
            skateGame.special = Math.min(100, skateGame.special + 7);
            spawnSkateFloatingText("+400 INDY GRAB!", p.x, p.y - 35, "#00e5ff", 13);
        }
    }
    
    // Ativação do Buraco de Minhoca Especial (Pode ativar no chão ou no ar)
    if ((keys.i || keys.l) && skateGame.special >= 100 && !skateGame.isSpecialActive && p.action !== 'FALL') {
        skateGame.isSpecialActive = true;
        skateGame.specialTimer = 360; // 6s de duração
        skateGame.special = 0;
        p.action = 'SPECIAL';
        p.frame = 0;
        skateGame.comboScore += 3000;
        skateGame.comboMultiplier += 2;
        skateGame.comboTricks.push('BURACO DE MINHOCA!');
        spawnSkateFloatingText("🌀 BURACO DE MINHOCA! +3000 🌀", p.x, p.y - 45, "#b388ff", 15);
        for (let i = 0; i < 15; i++) {
            spawnSkateParticle(p.x, p.y - 20, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, Math.random() < 0.5 ? "#00ffff" : "#e056fd", 4, 30, 'star');
        }
    }
    
    // 10. Travamento Magnético em Corrimãos (Grind Automático)
    if (!p.isGrounded && p.vy >= -1.5 && !p.isGrinding) {
        for (let rail of skateGame.rails) {
            if (p.x >= rail.x1 && p.x <= rail.x2 && Math.abs(p.y - rail.y) <= 13) {
                p.isGrinding = true;
                p.currentRail = rail;
                p.y = rail.y;
                p.vy = 0;
                p.angle = 0;
                p.action = 'GRIND';
                if (Math.abs(p.vx) < 2.5) p.vx = 2.8 * p.facing;
                if (!skateGame.comboTricks.includes("50-50 Grind")) {
                    skateGame.comboTricks.push("50-50 Grind");
                    skateGame.comboScore += 250;
                    skateGame.comboMultiplier += 1;
                    spawnSkateFloatingText("+250 50-50 GRIND!", p.x, p.y - 30, "#00e5ff", 13);
                }
                break;
            }
        }
    }
    
    if (p.isGrinding) {
        // Faíscas elétricas e de metal
        spawnSkateParticle(
            p.x - p.facing * 8, p.y + 1,
            (Math.random() - 0.5) * 3 - p.vx * 0.3,
            -Math.random() * 2,
            Math.random() < 0.5 ? "#00ffff" : "#fffb00",
            2.5, 12, 'spark'
        );
        skateGame.comboScore += 12;
        skateGame.special = Math.min(100, skateGame.special + 0.18);
        
        // Pulo do Corrimão
        if (keys.space || keys.w) {
            p.isGrinding = false;
            p.vy = -6.5;
            p.action = 'OLLIE';
            p.frame = 0;
            skateGame.comboTricks.push("Ollie Off");
            skateGame.comboScore += 150;
            spawnSkateFloatingText("+150 OLLIE OFF!", p.x, p.y - 30, "#ffffff", 12);
        } else if (p.x < p.currentRail.x1 - 6 || p.x > p.currentRail.x2 + 6) {
            p.isGrinding = false;
            p.action = 'CRUISE';
        }
    }
    
    // 11. Pouso e Sistema de Wipeout (Queda)
    const floorY = getParkSurface(p.x);
    if (!p.isGrounded && !p.isGrinding && p.y >= floorY) {
        if (Math.abs(p.angle) <= 0.78 || skateGame.isSpecialActive) {
            // Pouso Limpo
            p.y = floorY;
            p.vy = 0;
            p.isGrounded = true;
            p.angle = 0;
            if (skateGame.comboScore > 0) {
                const total = skateGame.comboScore * skateGame.comboMultiplier;
                skateGame.score += total;
                skateGame.lastComboText = skateGame.comboTricks.slice(-3).join(" + ") + " = +" + total.toLocaleString() + " PTS!";
                skateGame.lastComboTotal = total;
                skateGame.comboDisplayTimer = 120;
                spawnSkateFloatingText(`+${total.toLocaleString()} PTS!`, p.x, p.y - 35, "#ffd700", 14);
                skateGame.comboScore = 0;
                skateGame.comboMultiplier = 1;
                skateGame.comboTricks = [];
            }
            p.action = 'LAND';
            p.frame = 0;
            p.landTimer = 14;
            for (let i = 0; i < 6; i++) {
                spawnSkateParticle(p.x + (Math.random() - 0.5) * 16, p.y, (Math.random() - 0.5) * 2, -Math.random() * 1.2, "#cbd5e1", 3, 16);
            }
        } else {
            // Wipeout (Queda e perda total do combo)
            p.y = floorY;
            p.vy = 0;
            p.vx = 0;
            p.isGrounded = true;
            p.action = 'FALL';
            p.fallTimer = 45;
            skateGame.comboScore = 0;
            skateGame.comboMultiplier = 1;
            skateGame.comboTricks = [];
            skateGame.lastComboText = "WIPEOUT! COMBO PERDIDO!";
            skateGame.comboDisplayTimer = 90;
            spawnSkateFloatingText("💥 WIPEOUT! 💥", p.x, p.y - 35, "#ff3838", 14);
            for (let i = 0; i < 8; i++) {
                spawnSkateParticle(p.x, p.y - 15, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, "#ffea00", 3.5, 20, 'star');
            }
        }
    }
    
    // Alinhamento ao Chão
    if (p.isGrounded) {
        p.y = getParkSurface(p.x);
        p.angle = getParkSlope(p.x);
    }
    
    // Atualiza Posições
    p.x += p.vx;
    if (!p.isGrounded && !p.isGrinding) {
        p.y += p.vy;
    }
    
    // Limites Laterais da Pista (Paredes Invisíveis)
    if (p.x < 25) { p.x = 25; p.vx = Math.abs(p.vx) * 0.5; p.facing = 1; }
    if (p.x > 1775) { p.x = 1775; p.vx = -Math.abs(p.vx) * 0.5; p.facing = -1; }
    
    // 12. Boost Pads (Aceleradores de Chão)
    for (let pad of skateGame.boostPads) {
        if (p.isGrounded && p.x >= pad.x && p.x <= pad.x + pad.w) {
            if (pad.dir === 1 && p.vx >= 0) {
                p.vx = Math.max(p.vx, 8.5);
                spawnSkateFloatingText("TURBO BOOST >>", p.x, p.y - 25, "#00ffff", 12);
                for (let i = 0; i < 6; i++) spawnSkateParticle(p.x, p.y - 5, -Math.random() * 4, (Math.random() - 0.5) * 2, "#00ffff", 3, 15);
            } else if (pad.dir === -1 && p.vx <= 0) {
                p.vx = Math.min(p.vx, -8.5);
                spawnSkateFloatingText("<< TURBO BOOST", p.x, p.y - 25, "#ff00ea", 12);
                for (let i = 0; i < 6; i++) spawnSkateParticle(p.x, p.y - 5, Math.random() * 4, (Math.random() - 0.5) * 2, "#ff00ea", 3, 15);
            }
        }
    }
    
    // 13. Coleta de Itens
    for (let item of skateGame.collectibles) {
        if (!item.collected) {
            const dx = p.x - item.x;
            const dy = (p.y - 20) - item.y;
            if (Math.hypot(dx, dy) < 32) {
                item.collected = true;
                if (item.type === 'battery') {
                    skateGame.special = Math.min(100, skateGame.special + 25);
                    skateGame.comboScore += 200;
                    spawnSkateFloatingText("+25% ESPECIAL", item.x, item.y, "#00ffff", 12);
                } else if (item.type === 'tape') {
                    skateGame.tapesCollected++;
                    skateGame.comboScore += 1000;
                    if (skateGame.tapesCollected === 5) {
                        skateGame.score += 5000;
                        spawnSkateFloatingText("SUPER MIXTAPE: +5.000 PTS!", item.x, item.y, "#ff00ea", 15);
                    } else {
                        spawnSkateFloatingText(`FITA K7 (${skateGame.tapesCollected}/5) +1000`, item.x, item.y, "#ffea00", 12);
                    }
                } else if (item.type === 'multiplier') {
                    skateGame.comboMultiplier += 1;
                    spawnSkateFloatingText("+1x MULTIPLICADOR!", item.x, item.y, "#ff007f", 13);
                } else if (item.type === 'time') {
                    skateGame.timer += 300; // +5 segundos
                    spawnSkateFloatingText("+5s TEMPO!", item.x, item.y, "#00ff66", 13);
                } else if (item.type === 'alien') {
                    skateGame.score += 2500;
                    spawnSkateFloatingText("ALIEN RESGATADO! +2.500 PTS", item.x, item.y, "#b388ff", 14);
                }
            }
        }
    }
    
    // 14. IA do Rival Mestre Humano
    const m = skateGame.mestre;
    m.x += m.vx;
    if (m.x > 1710) { m.vx = -2.8; m.facing = -1; }
    if (m.x < 90) { m.vx = 2.8; m.facing = 1; }
    m.y = getParkSurface(m.x);
    
    m.animTimer++;
    if (m.x >= 780 && m.x <= 970) {
        m.action = 'GRIND';
        m.y = 165;
    } else if ((m.x >= 380 && m.x <= 580) || (m.x >= 1180 && m.x <= 1420)) {
        if (Math.sin(m.x * 0.05) > 0.3) {
            m.action = 'GRIND';
        } else {
            m.action = 'CRUISE';
        }
    } else {
        m.action = 'CRUISE';
    }
    
    // Acumulação de Pontos do Mestre
    if (skateGame.timer % 60 === 0) {
        m.score += Math.floor(280 + Math.random() * 80);
    }
    
    // 15. Câmera Suave com Parallax
    const targetCamX = Math.max(0, Math.min(skateGame.worldWidth - canvas.width, p.x - canvas.width / 2));
    skateGame.cameraX += (targetCamX - skateGame.cameraX) * 0.14;
    
    if (skateGame.comboDisplayTimer > 0) skateGame.comboDisplayTimer--;
    
    // 16. Ciclo de Animação do Zorp
    p.animTimer++;
    if (p.animTimer >= 5) {
        p.animTimer = 0;
        p.frame++;
        if (p.action === 'OLLIE' && p.frame >= 4) p.frame = 3;
        if (p.action === 'LAND' && p.frame >= 4) { p.action = 'CRUISE'; p.frame = 0; }
        if (p.action === 'KICKFLIP' && p.frame >= 6) { p.action = p.isGrounded ? 'CRUISE' : 'OLLIE'; p.frame = 2; }
        if (p.action === 'SPIN' && p.frame >= 6) { p.action = p.isGrounded ? 'CRUISE' : 'OLLIE'; p.frame = 2; }
        if (p.action === 'SPECIAL' && p.frame >= 8) { p.action = p.isGrounded ? 'CRUISE' : 'OLLIE'; p.frame = 2; }
    }
}

function drawSkateGame() {
    const camX = skateGame.cameraX;
    
    // 1. FUNDO: GRADIENTE DO CÉU RETRO SYNTHWAVE / URBAN DUSK
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#09041a');
    skyGrad.addColorStop(0.35, '#1e0836');
    skyGrad.addColorStop(0.7, '#481359');
    skyGrad.addColorStop(1.0, '#9e2a2b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Estrelas piscando no céu
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 35; i++) {
        const starX = ((i * 127) - camX * 0.05 + 2000) % canvas.width;
        const starY = (i * 37) % 110;
        const size = (i % 3 === 0) ? 2 : 1;
        ctx.fillRect(starX, starY, size, size);
    }
    
    // 2. CAMADA PARALLAX 1: SILHUETA DA CIDADE E HOLOFOTES (Fator 0.18)
    const cityOffset = (camX * 0.18) % 450;
    ctx.fillStyle = "rgba(18, 10, 38, 0.9)";
    for (let b = -1; b < 6; b++) {
        const bx = b * 90 - cityOffset;
        const bh = 70 + ((b * 47) % 50);
        ctx.fillRect(bx, 180 - bh, 75, bh);
        // Janelas iluminadas da cidade
        ctx.fillStyle = "rgba(0, 255, 234, 0.4)";
        for (let w = 0; w < 4; w++) {
            ctx.fillRect(bx + 12 + (w % 2) * 25, 180 - bh + 15 + Math.floor(w / 2) * 20, 8, 8);
        }
        ctx.fillStyle = "rgba(18, 10, 38, 0.9)";
    }
    
    // Torres de Holofotes da Pista
    for (let t = 0; t < 5; t++) {
        const tx = t * 400 + 100 - camX * 0.18;
        if (tx >= -50 && tx <= canvas.width + 50) {
            ctx.fillStyle = "#334155";
            ctx.fillRect(tx - 3, 70, 6, 110);
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(tx - 12, 65, 24, 8);
            // Feixe de luz translúcido
            const lightGrad = ctx.createLinearGradient(tx, 73, tx, 250);
            lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
            lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.moveTo(tx - 10, 73);
            ctx.lineTo(tx + 10, 73);
            ctx.lineTo(tx + 60, 250);
            ctx.lineTo(tx - 60, 250);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    // 3. CAMADA PARALLAX 2: MURO DE CONCRETO E GRAFFITIS (Fator 0.45)
    const wallOffset = (camX * 0.45);
    ctx.fillStyle = "#2d3748";
    ctx.fillRect(0, 185, canvas.width, 35);
    // Grade de proteção
    ctx.strokeStyle = "#4a5568";
    ctx.lineWidth = 1;
    for (let g = 0; g < canvas.width; g += 15) {
        ctx.beginPath();
        ctx.moveTo(g, 170);
        ctx.lineTo(g, 185);
        ctx.stroke();
    }
    ctx.strokeRect(0, 170, canvas.width, 2);
    
    // Graffitis Urbanos ("ZORP", "SKATE", "16-BIT")
    ctx.save();
    ctx.font = "bold 18px 'Press Start 2P', monospace";
    const grafX1 = 200 - wallOffset;
    if (grafX1 > -200 && grafX1 < canvas.width + 100) {
        ctx.fillStyle = "#ff007f";
        ctx.fillText("ZORP", grafX1, 208);
    }
    const grafX2 = 600 - wallOffset;
    if (grafX2 > -200 && grafX2 < canvas.width + 100) {
        ctx.fillStyle = "#00f0ff";
        ctx.fillText("RADICAL!", grafX2, 208);
    }
    const grafX3 = 1000 - wallOffset;
    if (grafX3 > -200 && grafX3 < canvas.width + 100) {
        ctx.fillStyle = "#ffe600";
        ctx.fillText("SKATE OR FLY", grafX3, 208);
    }
    ctx.restore();
    
    // 4. CAMADA DO JOGO: PISTA DE CONCRETO, RAMPAS E FUNBOX (Coordenadas Reais - camX)
    ctx.save();
    ctx.translate(-camX, 0);
    
    // Chão de concreto da pista (Base de 1800px)
    ctx.fillStyle = "#475569";
    ctx.fillRect(0, 245, skateGame.worldWidth, 55);
    // Placas de concreto e juntas
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    for (let c = 0; c < skateGame.worldWidth; c += 60) {
        ctx.beginPath();
        ctx.moveTo(c, 245);
        ctx.lineTo(c, 300);
        ctx.stroke();
    }
    // Linha de demarcação esportiva neon amarela
    ctx.fillStyle = "#eab308";
    ctx.fillRect(0, 246, skateGame.worldWidth, 3);
    
    // QUARTER PIPE ESQUERDO (x: 0..180)
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(0, 120);
    for (let x = 0; x <= 180; x += 5) {
        ctx.lineTo(x, getParkSurface(x));
    }
    ctx.lineTo(180, 300);
    ctx.lineTo(0, 300);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Coping metálico do quarter esquerdo
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(15, 118, 12, 6);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 100, 20, 145);
    
    // QUARTER PIPE DIREITO (x: 1620..1800)
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(1620, 245);
    for (let x = 1620; x <= 1800; x += 5) {
        ctx.lineTo(x, getParkSurface(x));
    }
    ctx.lineTo(1800, 300);
    ctx.lineTo(1620, 300);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Coping metálico do quarter direito
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(1775, 118, 12, 6);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(1780, 100, 20, 145);
    
    // CENTRAL FUNBOX (x: 700..1050, topo y=195)
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(700, 245);
    ctx.lineTo(770, 195);
    ctx.lineTo(980, 195);
    ctx.lineTo(1050, 245);
    ctx.lineTo(1050, 300);
    ctx.lineTo(700, 300);
    ctx.closePath();
    ctx.fill();
    // Borda superior e copings
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(700, 245);
    ctx.lineTo(770, 195);
    ctx.lineTo(980, 195);
    ctx.lineTo(1050, 245);
    ctx.stroke();
    // Detalhe 3D da Funbox
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(770, 195, 210, 50);
    
    // Placa do Skatepark no fundo da Funbox
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(800, 110, 150, 30);
    ctx.strokeStyle = "#00e5ff";
    ctx.strokeRect(800, 110, 150, 30);
    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ZORP SKATEPARK", 875, 128);
    
    // CORRIMÃOS (RAILS)
    for (let rail of skateGame.rails) {
        // Sombra no chão
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(rail.x1, rail.y + rail.height - 2, rail.x2 - rail.x1, 4);
        
        // Postes verticais de sustentação
        ctx.fillStyle = "#64748b";
        const postStep = (rail.x2 - rail.x1) / 3;
        for (let pX = rail.x1 + 15; pX <= rail.x2; pX += postStep) {
            ctx.fillRect(pX - 2, rail.y, 4, rail.height);
            ctx.fillStyle = "#334155";
            ctx.fillRect(pX - 4, rail.y + rail.height - 2, 8, 3);
            ctx.fillStyle = "#64748b";
        }
        
        // Barra tubular de aço do corrimão
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(rail.x1, rail.y - 3, rail.x2 - rail.x1, 6);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(rail.x1, rail.y - 3, rail.x2 - rail.x1, 2); // Brilho metálico
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(rail.x1, rail.y + 1, rail.x2 - rail.x1, 2);
    }
    
    // BOOST PADS (ACELERADORES NEON)
    for (let pad of skateGame.boostPads) {
        ctx.fillStyle = (pad.dir === 1) ? "rgba(0, 240, 255, 0.25)" : "rgba(255, 0, 234, 0.25)";
        ctx.fillRect(pad.x, 243, pad.w, 4);
        ctx.fillStyle = (pad.dir === 1) ? "#00f0ff" : "#ff00ea";
        const arrow = (pad.dir === 1) ? ">>>" : "<<<";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(arrow, pad.x + pad.w / 2, 243);
    }
    
    // COLETÁVEIS
    for (let item of skateGame.collectibles) {
        if (!item.collected) {
            const hover = Math.sin(Date.now() / 200 + item.id) * 3;
            // Halo de brilho
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.beginPath();
            ctx.arc(item.x, item.y + hover, 14, 0, Math.PI * 2);
            ctx.fill();
            
            if (item.img && item.img.complete && item.img.naturalWidth > 0) {
                const iw = item.img.naturalWidth;
                const ih = item.img.naturalHeight;
                ctx.drawImage(item.img, item.x - iw / 2, item.y + hover - ih / 2);
            } else {
                ctx.fillStyle = (item.type === 'battery') ? '#00ffff' : (item.type === 'tape') ? '#f1c40f' : '#ff007f';
                ctx.fillRect(item.x - 8, item.y + hover - 8, 16, 16);
            }
        }
    }
    
    // PARTÍCULAS
    for (let pt of skateGame.particles) {
        ctx.fillStyle = pt.color;
        if (pt.shape === 'spark') {
            ctx.fillRect(pt.x, pt.y, pt.size, pt.size * 0.6);
        } else if (pt.shape === 'star') {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // RIVAL MESTRE HUMANO
    const m = skateGame.mestre;
    let mImg = imgMestreSkateCruise;
    if (m.action === 'OLLIE') mImg = imgMestreSkateOllie;
    else if (m.action === 'GRIND') mImg = imgMestreSkateGrind;
    else if (m.action === 'IDLE') mImg = imgMestreSkateIdle;
    
    // Sombra do Mestre
    drawShadow(m.x, m.y);
    
    ctx.save();
    ctx.translate(m.x, m.y);
    if (m.facing === -1) ctx.scale(-1, 1);
    if (mImg && mImg.complete && mImg.naturalWidth > 0) {
        ctx.drawImage(mImg, -19, -48, 38, 48);
    }
    ctx.restore();
    
    // Placa do Mestre Humano
    ctx.fillStyle = "#ff5722";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("MESTRE HUMANO", m.x, m.y - 54);
    
    // JOGADOR ZORP NO SKATE
    const p = skateGame.player;
    const sprite = getZorpSkateSprite();
    
    // Sombra do Zorp
    drawShadow(p.x, p.y);
    
    // Aura Cósmica do Modo Especial
    if (skateGame.isSpecialActive) {
        ctx.strokeStyle = "rgba(0, 240, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 25, 26, 32, (Date.now() / 150), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(224, 86, 253, 0.7)";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 25, 30, 24, -(Date.now() / 150), 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Barra de Carregamento de Salto (Hold to Jump)
    if (p.charging) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(p.x - 16, p.y - 65, 32, 6);
        ctx.fillStyle = (p.charge > 0.8) ? "#ff007f" : (p.charge > 0.4) ? "#ffeb3b" : "#00e5ff";
        ctx.fillRect(p.x - 15, p.y - 64, 30 * p.charge, 4);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 16, p.y - 65, 32, 6);
    }
    
    // Desenho do Sprite do Zorp com Escala, Ângulo e Espelhamento
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const scale = 0.48; // Zorp fica com ~50px de altura
        const sw = sprite.naturalWidth * scale;
        const sh = sprite.naturalHeight * scale;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if (p.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(sprite, -sw / 2, -sh, sw, sh);
        ctx.restore();
    }
    
    // TEXTOS FLUTUANTES NO MUNDO
    for (let ft of skateGame.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px monospace`;
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }
    
    ctx.restore(); // Fim da translação da câmera
    
    // 5. HUD RETRO ARCADE (COORDINADAS DA TELA FIXA 450x300)
    // Top Bar Background
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(0, 0, canvas.width, 36);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, 36);
    
    // Pontuação Zorp & Recorde do Mestre
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`PONTOS: ${String(skateGame.score).padStart(6, '0')}`, 10, 15);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px monospace";
    ctx.fillText(`RECORDE: 25.000`, 10, 28);
    
    // Mestre Humano Score
    ctx.fillStyle = "#ff5722";
    ctx.font = "9px monospace";
    ctx.fillText(`MESTRE: ${String(skateGame.mestre.score).padStart(5, '0')}`, 115, 28);
    
    // Cronômetro Digital Central
    const totalSecs = Math.max(0, Math.ceil(skateGame.timer / 60));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    ctx.textAlign = "center";
    ctx.font = "bold 15px monospace";
    if (totalSecs <= 15) {
        ctx.fillStyle = (Date.now() % 300 < 150) ? "#ef4444" : "#ffffff";
    } else {
        ctx.fillStyle = "#ffffff";
    }
    ctx.fillText(timeStr, canvas.width / 2, 23);
    
    // Fitas K7 Coletadas
    ctx.textAlign = "right";
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`FITAS K7: ${skateGame.tapesCollected}/5`, canvas.width - 120, 16);
    
    // Barra de Especial (Buraco de Minhoca)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(canvas.width - 110, 8, 100, 14);
    if (skateGame.special >= 100) {
        ctx.fillStyle = (Date.now() % 300 < 150) ? "#00e5ff" : "#e056fd";
        ctx.fillRect(canvas.width - 110, 8, 100, 14);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ESPECIAL [I/L]!", canvas.width - 60, 19);
    } else {
        ctx.fillStyle = "#00e5ff";
        ctx.fillRect(canvas.width - 110, 8, skateGame.special, 14);
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.floor(skateGame.special)}%`, canvas.width - 60, 19);
    }
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(canvas.width - 110, 8, 100, 14);
    
    // LIVE COMBO DISPLAY (Em Manobra Ativa)
    if (skateGame.comboScore > 0) {
        const cWidth = 240;
        const cX = (canvas.width - cWidth) / 2;
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(cX, canvas.height - 52, cWidth, 36);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cX, canvas.height - 52, cWidth, 36);
        
        ctx.fillStyle = "#94a3b8";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(skateGame.comboTricks.slice(-3).join(" + "), canvas.width / 2, canvas.height - 40);
        
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`${skateGame.comboScore.toLocaleString()} x ${skateGame.comboMultiplier} = ${(skateGame.comboScore * skateGame.comboMultiplier).toLocaleString()} PTS`, canvas.width / 2, canvas.height - 24);
    }
    
    // LANDED COMBO BANNER (Feedback de Manobra Concluída)
    if (skateGame.comboDisplayTimer > 0 && skateGame.lastComboText) {
        ctx.textAlign = "center";
        ctx.font = "bold 11px monospace";
        if (skateGame.lastComboText.includes("WIPEOUT")) {
            ctx.fillStyle = "#ef4444";
        } else {
            ctx.fillStyle = "#2ecc71";
        }
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 4;
        ctx.fillText(skateGame.lastComboText, canvas.width / 2, 58);
        ctx.shadowBlur = 0;
    }
    
    // 6. OVERLAYS DE ESTADO (TUTORIAL, VITÓRIA, DERROTA)
    if (skateGame.state === 'TUTORIAL') {
        drawOverlayScreen("SKATEPARK ARCADE", [
            "Supere o recorde do Mestre Humano (25.000 pts) em 75s!",
            "[A / D]: Movimentar / Inclinação aérea",
            "SEGURE [ESPAÇO] OU [W]: Abaixar e Carregar Ollie",
            "[J]: Kickflip (+300) | [K]: 360° Spin (+500)",
            "[U]: Indy Grab (+400) | [I / L]: Buraco de Minhoca!",
            "CORRIMÃOS: Pouse neles para Grind automático com faíscas!",
            "Cuidado ao pousar! Se estiver muito inclinado, dará Wipeout."
        ], "#00e5ff");
    } else if (skateGame.state === 'VICTORY') {
        drawOverlayScreen("NOVO RECORDE RADICAL!", [
            `Sua Pontuação: ${skateGame.score.toLocaleString()} PTS!`,
            "Você superou os 25.000 pontos do Mestre Humano!",
            "Parabéns! Você conquistou a Insígnia do Skate!",
            "Pressione [ESPAÇO] para voltar à Ilha!"
        ], "#2ecc71");
    } else if (skateGame.state === 'DEFEAT') {
        drawOverlayScreen("TEMPO ESGOTADO!", [
            `Sua Pontuação: ${skateGame.score.toLocaleString()} PTS`,
            "O Mestre manteve a coroa do parque (25.000 pts).",
            "Dica: Encaixe manobras nos corrimãos e use o Especial!",
            "Pressione [ESPAÇO] para tentar novamente!"
        ], "#e74c3c");
    }
    
    ctx.textAlign = "left"; // Reset alinhamento
}



function drawHUD() {
    const size = 15;
    const spacing = 22;
    const startX = 20;
    const startY = canvas.height - 30; 
    let i = 0;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(5, canvas.height - 40, 200, 35);

    for (let esporte in insignias) {
        ctx.fillStyle = insignias[esporte] ? "#f1c40f" : "#7f8c8d";
        ctx.beginPath();
        ctx.arc(startX + (i * spacing), startY, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.stroke();
        i++;
    }
}

// -------------------------------------------------------------
// 8. LOOP PRINCIPAL
// -------------------------------------------------------------
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentScene === "HUB") drawHUB();
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
        for (let npc of npcs) {
            if (npc.scene === currentScene) drawNPC(npc);
        }
        drawPlayer();
        drawHUD();
    }
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
    resetBoxe();
    dialogBox.classList.remove("show");
    if (BOXING_QA_PARAMS.get("boxeQaCross") === "1") {
        boxeGame.player.x = 278;
        boxeGame.mestre.x = 172;
    }
    configureBoxingQaFromQuery(BOXING_QA_PARAMS);
    const requestedResult = BOXING_QA_PARAMS.get("boxeQaGameover");
    if (requestedResult === "win" || requestedResult === "lose") {
        const winner = requestedResult === "win" ? boxeGame.player : boxeGame.mestre;
        const loser = requestedResult === "win" ? boxeGame.mestre : boxeGame.player;
        triggerBoxingKO(winner, loser, "cross");
        boxeGame.koFrames = BOXING_CONFIG.ko.resultDelay;
        winner.state = "victory";
        winner.animation = "victory";
        boxeGame.phase = "RESULT";
    }
}

gameLoop();
