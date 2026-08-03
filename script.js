const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const dialogBox = document.getElementById("dialog-box");
const dialogText = document.getElementById("dialog-text");
const hintText = document.getElementById("hint-text");

let currentScene = "HUB"; 

// Registro de Insígnias dos 8 Esportes
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
// 1. CARREGAMENTO DAS IMAGENS
// -------------------------------------------------------------
const zorpImg = new Image(); zorpImg.src = "zorp.png";
const bgPingPong = new Image(); bgPingPong.src = "bg_pingpong.png?v=2";

// NPCs Globais
const imgTurista = new Image(); imgTurista.src = "npc_turista.png";
const imgGuia = new Image(); imgGuia.src = "npc_guia.png";
const imgAlpinista = new Image(); imgAlpinista.src = "npc_alpinista.png";
const imgMestreGelo = new Image(); imgMestreGelo.src = "npc_mestre_gelo.png";
const imgAprendiz = new Image(); imgAprendiz.src = "npc_aprendiz.png";
const imgMestrePingPong = new Image(); imgMestrePingPong.src = "npc_mestre_ping_pong.png";

// Sprites Ping-Pong
const imgZorpIdle = new Image(); imgZorpIdle.src = "zorp_idle.png";
const imgZorpMU = new Image(); imgZorpMU.src = "zorp_mu.png";
const imgZorpMD = new Image(); imgZorpMD.src = "zorp_md.png";
const imgZorpHit = new Image(); imgZorpHit.src = "zorp_hit.png";

const imgMestreIdle = new Image(); imgMestreIdle.src = "mestre_idle.png";
const imgMestreMU = new Image(); imgMestreMU.src = "mestre_mu.png";
const imgMestreMD = new Image(); imgMestreMD.src = "mestre_md.png";
const imgMestreHit = new Image(); imgMestreHit.src = "mestre_hit.png";

// -------------------------------------------------------------
// 2. OBJETOS, OBSTÁCULOS E ESTADOS DO JOGO (GERAL E PING PONG)
// -------------------------------------------------------------
const player = { 
    x: 225, 
    y: 150, 
    speed: 2.2,
    renderWidth: 40,   
    renderHeight: 48   
};

const keys = { w: false, a: false, s: false, d: false, e: false, space: false };

const zorpSprite = {
    cols: 3, rows: 4, row: 0, 
    animSequence: [1, 0, 1, 2], animIndex: 0,
    isMoving: false, timer: 0, speed: 8 
};

const pingPong = {
    playerX: 50, playerY: 140, 
    opponentX: 370, opponentY: 140, 
    speed: 3,
    ballX: 225, ballY: 150, ballSpeedX: 3, ballSpeedY: 2, ballRadius: 4,
    playerScore: 0, opponentScore: 0, maxScore: 3,
    playerAction: "IDLE", opponentAction: "IDLE",  
    playerHitTimer: 0, opponentHitTimer: 0,
    power: 0, maxPower: 100, isPowerActive: false
};

// -------------------------------------------------------------
// ASSETS E MAPEAMENTO EXPLICITO: ESQUI (2D TOP-DOWN)
// -------------------------------------------------------------
const esquiAssets = {
    zorp: new Image(),
    mestre: new Image(),
    elementos: new Image()
};
esquiAssets.zorp.src = "zorp_esqui.png";
esquiAssets.mestre.src = "mestre_esqui.png";
esquiAssets.elementos.src = "elementos_esqui.png";

// Tabelas explícitas de frames (Tamanhos exatos sem grade uniforme)
const ZORP_ESQUI_FRAMES = {
    idle:  { x: 0, y: 0, w: 50, h: 60 },    // COORDENADA A CONFIRMAR
    left:  { x: 50, y: 0, w: 50, h: 60 },   // COORDENADA A CONFIRMAR
    right: { x: 100, y: 0, w: 50, h: 60 },  // COORDENADA A CONFIRMAR
    jump:  { x: 150, y: 0, w: 50, h: 60 },  // COORDENADA A CONFIRMAR
    hit:   { x: 200, y: 0, w: 50, h: 60 }   // COORDENADA A CONFIRMAR
};

const MESTRE_ESQUI_FRAMES = {
    idle:   { x: 0, y: 0, w: 60, h: 70 },   // COORDENADA A CONFIRMAR
    attack: { x: 60, y: 0, w: 60, h: 70 }   // COORDENADA A CONFIRMAR
};

const ELEMENTOS_ESQUI_FRAMES = {
    arvore:           { x: 0, y: 0, w: 64, h: 80, cw: 20, ch: 10 },    // cw/ch = collision width/height
    rocha:            { x: 64, y: 0, w: 48, h: 48, cw: 30, ch: 15 },
    rampa:            { x: 112, y: 0, w: 80, h: 40, cw: 60, ch: 20 },
    bolaDeNeve:       { x: 192, y: 0, w: 48, h: 48, cw: 24, ch: 24 },
    estalactite:      { x: 240, y: 0, w: 32, h: 64, cw: 16, ch: 16 },
    bandeiraAzul:     { x: 272, y: 0, w: 32, h: 64, cw: 5, ch: 5 },
    bandeiraVermelha: { x: 304, y: 0, w: 32, h: 64, cw: 5, ch: 5 },
    bonecoNeve:       { x: 336, y: 0, w: 48, h: 64, cw: 20, ch: 10 }
};

const esquiGame = {
    // Jogador ancorado na parte inferior
    playerX: 225, 
    playerY: 240, 
    speedX: 5, 
    
    // Progresso e Cenário
    trackSpeed: 6,     // Velocidade de deslocamento (Y)
    distance: 0, 
    maxDistance: 4000, 
    score: 0,
    trackOffset: 0,    // Para animação do chão
    
    // Listas de renderização
    obstacles: [],
    
    // Animação e Estados
    isJumping: false,
    jumpTimer: 0,
    maxJumpTimer: 45,
    jumpHeight: 0,
    isHit: false,
    hitTimer: 0,
    
    // Mestre
    bossActive: false,
    bossX: 225,
    bossY: -100,
    bossTimer: 0
};

// Limites visuais da pista de neve
const TRACK_LEFT = 100;
const TRACK_RIGHT = 350;

// -------------------------------------------------------------
// MINIGAME ESQUI - LÓGICA 2D TOP-DOWN
// -------------------------------------------------------------
function resetEsqui() {
    esquiGame.playerX = canvas.width / 2;
    esquiGame.distance = 0;
    esquiGame.score = 0;
    esquiGame.trackSpeed = 5;
    esquiGame.obstacles = [];
    esquiGame.isHit = false;
    esquiGame.hitTimer = 0;
    esquiGame.isJumping = false;
    esquiGame.jumpHeight = 0;
    esquiGame.bossActive = false;
    esquiGame.bossY = -100;
}

function spawnObstacle() {
    let isDeco = Math.random() > 0.6; // Decoração fora da pista ou obstáculo dentro
    let type, obsX;

    if (isDeco) {
        const decos = ["arvore", "arvore", "rocha"];
        type = decos[Math.floor(Math.random() * decos.length)];
        // Nasce nas laterais
        obsX = Math.random() > 0.5 ? Math.random() * (TRACK_LEFT - 20) : TRACK_RIGHT + 20 + (Math.random() * (canvas.width - TRACK_RIGHT - 20));
    } else {
        const obs = ["rocha", "rampa", "bandeiraAzul", "bandeiraVermelha", "bonecoNeve"];
        type = obs[Math.floor(Math.random() * obs.length)];
        // Nasce na pista
        obsX = TRACK_LEFT + 20 + Math.random() * (TRACK_RIGHT - TRACK_LEFT - 40);
    }

    esquiGame.obstacles.push({
        x: obsX,
        y: -50,
        type: type,
        passed: false
    });
}

function updateEsqui() {
    hintText.innerText = "[A D] MOVER | [ESPAÇO] PULAR RAMPAS";

    // Aumento progressivo de velocidade
    if (esquiGame.distance > 0 && esquiGame.distance % 500 === 0) {
        esquiGame.trackSpeed = Math.min(12, esquiGame.trackSpeed + 0.5);
    }

    // Pulo (Parábola visual apenas)
    if (esquiGame.isJumping) {
        esquiGame.jumpTimer--;
        esquiGame.jumpHeight = Math.sin((1 - (esquiGame.jumpTimer / esquiGame.maxJumpTimer)) * Math.PI) * 45;
        
        if (esquiGame.jumpTimer <= 0) {
            esquiGame.isJumping = false;
            esquiGame.jumpHeight = 0;
        }
    }

    // Hit e Movimento
    if (esquiGame.hitTimer > 0) {
        esquiGame.hitTimer--;
        if (esquiGame.hitTimer === 0) {
            esquiGame.isHit = false;
        }
    } else if (!esquiGame.isJumping) {
        if (keys.a) esquiGame.playerX -= esquiGame.speedX;
        if (keys.d) esquiGame.playerX += esquiGame.speedX;
        
        // Limita o jogador às bordas da pista
        esquiGame.playerX = Math.max(TRACK_LEFT + 15, Math.min(TRACK_RIGHT - 15, esquiGame.playerX));
    }

    // Mover Cenário e Progresso
    let currentSpeed = esquiGame.isHit ? esquiGame.trackSpeed * 0.4 : esquiGame.trackSpeed;
    esquiGame.distance += currentSpeed * 0.1;
    esquiGame.trackOffset = (esquiGame.trackOffset + currentSpeed) % 40;

    // Gerador de Cenário
    if (Math.random() < 0.08 && !esquiGame.isHit) spawnObstacle();

    // Atualização do Boss (Aparece de vez em quando)
    if (!esquiGame.bossActive && esquiGame.distance > 500 && Math.random() < 0.002) {
        esquiGame.bossActive = true;
        esquiGame.bossY = -100;
        esquiGame.bossX = esquiGame.playerX;
    }

    if (esquiGame.bossActive) {
        if (esquiGame.bossY < 80) esquiGame.bossY += 2; // Desce até a parte superior da tela
        
        esquiGame.bossTimer++;
        if (esquiGame.bossTimer > 100) {
            // Ataca
            esquiGame.obstacles.push({
                x: esquiGame.bossX,
                y: esquiGame.bossY + 20,
                type: "bolaDeNeve",
                passed: false
            });
            esquiGame.bossTimer = 0;
            if (Math.random() > 0.5) esquiGame.bossActive = false; // Vai embora
        }
    } else if (esquiGame.bossY > -100) {
        esquiGame.bossY -= 2; // Sobe e some
    }

    // Atualizar Obstáculos e Colisão
    // Bounding Box do jogador baseado nos PÉS
    const pBox = { 
        x: esquiGame.playerX - 10, 
        y: esquiGame.playerY - 5, 
        w: 20, 
        h: 10 
    };

    for (let i = esquiGame.obstacles.length - 1; i >= 0; i--) {
        let obs = esquiGame.obstacles[i];
        let frame = ELEMENTOS_ESQUI_FRAMES[obs.type] || { cw: 20, ch: 20 };
        
        // Move para baixo (em direção ao jogador)
        obs.y += currentSpeed;

        // Remover se saiu da tela (passou do fundo)
        if (obs.y > canvas.height + 100) {
            esquiGame.obstacles.splice(i, 1);
            continue;
        }

        // Pontuação por passar
        if (!obs.passed && obs.y > esquiGame.playerY) {
            obs.passed = true;
            if (!esquiGame.isHit && obs.type !== "arvore") {
                esquiGame.score += 15; 
            }
        }

        // Bounding Box do Obstáculo (Ancorado no Y)
        let oBox = {
            x: obs.x - (frame.cw / 2),
            y: obs.y - (frame.ch / 2),
            w: frame.cw,
            h: frame.ch
        };

        // Detecção de Colisão Lógica 2D
        if (pBox.x < oBox.x + oBox.w && pBox.x + pBox.w > oBox.x &&
            pBox.y < oBox.y + oBox.h && pBox.y + pBox.h > oBox.y) {
            
            if (obs.type === "rampa") {
                if (keys.space && !esquiGame.isJumping) {
                    esquiGame.isJumping = true;
                    esquiGame.jumpTimer = esquiGame.maxJumpTimer;
                    esquiGame.score += 100; // Bônus de salto
                }
            } else if (!esquiGame.isJumping || esquiGame.jumpHeight < 20) {
                // Colisão (não pulou ou não pulou alto o suficiente)
                esquiGame.isHit = true;
                esquiGame.hitTimer = 45;
                esquiGame.score = Math.max(0, esquiGame.score - 50); // Penalidade
                esquiGame.obstacles.splice(i, 1); // Destrói obstáculo
            }
        }
    }

    // Vitória
    if (esquiGame.distance >= esquiGame.maxDistance) {
        esquiGame.score += 1000;
        insignias.esqui = true;
        currentScene = "ILHA_ESQUI";
        dialogText.innerHTML = `> MESTRE DO GELO: Você dominou a descida! Pontuação: ${esquiGame.score}`;
        dialogBox.classList.add("show");
    }
}

function drawEsquiGame() {
    // 1. Fundo e Pista (Top-Down)
    ctx.fillStyle = "#a8d5e5"; // Neve externa (azul claro)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#ffffff"; // Pista central
    ctx.fillRect(TRACK_LEFT, 0, TRACK_RIGHT - TRACK_LEFT, canvas.height);

    // Bordas da pista (Linhas para dar sensação de velocidade)
    ctx.strokeStyle = "#9bc6d6";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(TRACK_LEFT, 0); ctx.lineTo(TRACK_LEFT, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(TRACK_RIGHT, 0); ctx.lineTo(TRACK_RIGHT, canvas.height); ctx.stroke();

    // Marcas de esqui na pista (Animação de deslocamento)
    ctx.strokeStyle = "#f0f8ff";
    ctx.lineWidth = 2;
    for (let y = esquiGame.trackOffset - 40; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(TRACK_LEFT + 40, y); ctx.lineTo(TRACK_LEFT + 40, y + 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(TRACK_RIGHT - 40, y); ctx.lineTo(TRACK_RIGHT - 40, y + 20); ctx.stroke();
    }

    // Helper de desenho com alinhamento pelos PÉS
    const drawSpriteAncorado = (img, frame, posX, posY, yOffset = 0, isShadow = false) => {
        if (!img.complete || img.naturalWidth === 0) return;
        
        if (isShadow) {
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            ctx.beginPath(); ctx.ellipse(posX, posY, frame.w * 0.3, frame.w * 0.1, 0, 0, Math.PI*2); ctx.fill();
            return;
        }

        let drawX = posX - (frame.w / 2);
        let drawY = posY - frame.h - yOffset; // Subtrai a altura para ancorar o Y na base do sprite
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, drawX, drawY, frame.w, frame.h);
    };

    // 2. Organizar elementos para Renderização (Y-Sorting / Painter's Algorithm)
    // Tudo que tem um Y menor é desenhado primeiro (fica atrás)
    let renderList = [...esquiGame.obstacles];
    if (esquiGame.bossActive || esquiGame.bossY > -50) {
        renderList.push({ isBoss: true, x: esquiGame.bossX, y: esquiGame.bossY });
    }
    renderList.push({ isPlayer: true, x: esquiGame.playerX, y: esquiGame.playerY });
    
    renderList.sort((a, b) => a.y - b.y);

    // 3. Desenhar elementos na ordem correta
    renderList.forEach(obj => {
        if (obj.isBoss) {
            let frame = esquiGame.bossTimer > 80 ? MESTRE_ESQUI_FRAMES.attack : MESTRE_ESQUI_FRAMES.idle;
            drawSpriteAncorado(esquiAssets.mestre, frame, obj.x, obj.y, 0, true); // Sombra
            drawSpriteAncorado(esquiAssets.mestre, frame, obj.x, obj.y);
            
        } else if (obj.isPlayer) {
            let playerFrame = ZORP_ESQUI_FRAMES.idle;
            if (esquiGame.isHit) playerFrame = ZORP_ESQUI_FRAMES.hit;
            else if (esquiGame.isJumping) playerFrame = ZORP_ESQUI_FRAMES.jump;
            else if (keys.a) playerFrame = ZORP_ESQUI_FRAMES.left;
            else if (keys.d) playerFrame = ZORP_ESQUI_FRAMES.right;

            if (esquiGame.isHit && esquiGame.hitTimer % 8 < 4) ctx.globalAlpha = 0.5;
            
            drawSpriteAncorado(esquiAssets.zorp, playerFrame, obj.x, obj.y, 0, true); // Sombra fica no chão
            drawSpriteAncorado(esquiAssets.zorp, playerFrame, obj.x, obj.y, esquiGame.jumpHeight); // Corpo sobe
            
            ctx.globalAlpha = 1.0;
            
        } else {
            let frame = ELEMENTOS_ESQUI_FRAMES[obj.type];
            if (frame) {
                if (obj.type !== "bandeiraAzul" && obj.type !== "bandeiraVermelha") {
                    drawSpriteAncorado(esquiAssets.elementos, frame, obj.x, obj.y, 0, true); // Sombras
                }
                drawSpriteAncorado(esquiAssets.elementos, frame, obj.x, obj.y);
            } else {
                // Fallback seguro caso a imagem falhe
                ctx.fillStyle = obj.type === 'arvore' ? '#27ae60' : '#7f8c8d';
                ctx.fillRect(obj.x - 15, obj.y - 30, 30, 30);
            }
        }
    });

    // 4. HUD
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, canvas.width, 35);
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px monospace";
    
    ctx.fillStyle = "#f1c40f"; // Amarelo
    ctx.fillText(`PONTOS: ${esquiGame.score}`, 10, 22);
    
    ctx.fillStyle = "#3498db"; // Azul
    ctx.fillText(`DIST: ${Math.floor(esquiGame.distance)}m`, 150, 22);

    ctx.fillStyle = "#e74c3c"; // Vermelho
    let displaySpeed = Math.floor(esquiGame.trackSpeed * 7.5);
    ctx.fillText(`VELOCIDADE: ${displaySpeed} km/h`, 270, 22);
}

// -------------------------------------------------------------
// OBSTÁCULOS E NPCs (HUB)
// -------------------------------------------------------------
const sceneObstacles = {
    HUB: [
        { x: 130, y: 190, w: 40, h: 20, type: 'bench', solid: true },
        { x: 280, y: 190, w: 40, h: 20, type: 'bench', solid: true },
        { x: 130, y: 100, w: 30, h: 30, type: 'flower_bed', solid: false },
        { x: 290, y: 100, w: 30, h: 30, type: 'flower_bed', solid: false }
    ],
    ILHA_CORRIDA: [
        { x: 120, y: 130, w: 35, h: 10, type: 'hurdle', solid: true },
        { x: 220, y: 130, w: 35, h: 10, type: 'hurdle', solid: true },
        { x: 320, y: 130, w: 35, h: 10, type: 'hurdle', solid: true },
        { x: 80, y: 40, w: 40, h: 20, type: 'water_station', solid: true }
    ],
    ILHA_SURF: [
        { x: 35, y: 35, w: 30, h: 30, type: 'palm_tree', solid: true },
        { x: 385, y: 35, w: 30, h: 30, type: 'palm_tree', solid: true },
        { x: 310, y: 180, w: 45, h: 20, type: 'surf_rack', solid: true },
        { x: 90, y: 190, w: 40, h: 40, type: 'umbrella', solid: true },
        { x: 220, y: 220, w: 20, h: 20, type: 'sandcastle', solid: false }
    ],
    ILHA_SKATE: [
        { x: 80, y: 150, w: 50, h: 30, type: 'ramp', solid: false },
        { x: 280, y: 160, w: 70, h: 15, type: 'rail', solid: true },
        { x: 120, y: 210, w: 15, h: 15, type: 'cone', solid: true },
        { x: 150, y: 230, w: 15, h: 15, type: 'cone', solid: true }
    ],
    ILHA_ARCO: [
        { x: 100, y: 45, w: 25, h: 25, type: 'target', solid: true },
        { x: 225, y: 45, w: 25, h: 25, type: 'target', solid: true },
        { x: 350, y: 45, w: 25, h: 25, type: 'target', solid: true },
        { x: 50, y: 100, w: 10, h: 30, type: 'wind_flag', solid: false },
        { x: 380, y: 100, w: 10, h: 30, type: 'wind_flag', solid: false }
    ],
    ILHA_BASQUETE: [
        { x: 210, y: 40, w: 30, h: 20, type: 'hoop', solid: true },
        { x: 330, y: 180, w: 60, h: 30, type: 'bleachers', solid: true }
    ],
    ILHA_ESCALADA: [
        { x: 70, y: 60, w: 30, h: 30, type: 'boulder', solid: true },
        { x: 350, y: 60, w: 30, h: 30, type: 'boulder', solid: true },
        { x: 90, y: 200, w: 40, h: 40, type: 'tent', solid: true }
    ],
    ILHA_ESQUI: [
        { x: 60, y: 70, w: 25, h: 35, type: 'pine_tree', solid: true },
        { x: 360, y: 70, w: 25, h: 35, type: 'pine_tree', solid: true },
        { x: 120, y: 200, w: 20, h: 30, type: 'snowman', solid: true },
        { x: 280, y: 170, w: 25, h: 35, type: 'pine_tree', solid: true }
    ],
    ILHA_PINGPONG: [
        { x: 320, y: 50, w: 60, h: 40, type: 'scoreboard', solid: true }
    ]
};

const npcs = [
    { scene: "HUB", x: 180, y: 180, img: imgTurista, tamanho: 48, msg: "> TURISTA: O arquipelago tem 8 modalidades esportivas!" },
    { scene: "HUB", x: 270, y: 130, img: imgGuia, tamanho: 48, msg: "> GUIA: Explore os caminhos ao Norte, Sul, Leste e Oeste." },

    { scene: "ILHA_ESQUI", x: 120, y: 150, img: imgAlpinista, tamanho: 48, msg: "> ALPINISTA: Brrr! Essa neve esta muito fria." },
    { scene: "ILHA_ESQUI", x: 225, y: 60, img: imgMestreGelo, tamanho: 48, msg: "> MESTRE DO GELO: Desafie a montanha congelada!", isMaster: "JOGO_ESQUI" },

    { scene: "ILHA_PINGPONG", x: 150, y: 220, img: imgAprendiz, tamanho: 48, msg: "> APRENDIZ: Treine seu tempo de reacao para rebatidas." },
    { scene: "ILHA_PINGPONG", x: 225, y: 80, img: imgMestrePingPong, tamanho: 48, msg: "> MESTRE DO PING-PONG: Mostre seus reflexos!", isMaster: "JOGO_PINGPONG" },

    { scene: "ILHA_SKATE", x: 225, y: 80, img: imgTurista, tamanho: 48, msg: "> MESTRE DO SKATE: Acerte as manobras no half-pipe!", isMaster: "JOGO_SKATE" },
    { scene: "ILHA_BASQUETE", x: 225, y: 80, img: imgGuia, tamanho: 48, msg: "> MESTRE DO BASQUETE: Marque pontos antes do tempo acabar!", isMaster: "JOGO_BASQUETE" },
    { scene: "ILHA_ARCO", x: 225, y: 80, img: imgAprendiz, tamanho: 48, msg: "> MESTRE ARQUEIRO: Cuidado com o vento ao mirar!", isMaster: "JOGO_ARCO" },
    { scene: "ILHA_CORRIDA", x: 225, y: 80, img: imgAlpinista, tamanho: 48, msg: "> MESTRE DA CORRIDA: Mantenha o ritmo para nao cansar!", isMaster: "JOGO_CORRIDA" },
    { scene: "ILHA_ESCALADA", x: 225, y: 80, img: imgMestreGelo, tamanho: 48, msg: "> MESTRE DA ESCALADA: Mantenha firme as maos nas pedras!", isMaster: "JOGO_ESCALADA" },
    { scene: "ILHA_SURF", x: 225, y: 80, img: imgTurista, tamanho: 48, msg: "> MESTRE DO SURF: Pegue as maiores ondas sem cair!", isMaster: "JOGO_SURF" }
];

// -------------------------------------------------------------
// 3. CONTROLES DO TECLADO
// -------------------------------------------------------------
window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === " ") keys.space = true;
    if (keys.hasOwnProperty(k)) keys[k] = true;
});

window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === " ") keys.space = false;
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

        // --- TRANSIÇÕES ENTRE AS 8 ILHAS ---
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

        // Interação com NPCs
        let npcProximo = null;
        for (let npc of npcs) {
            if (npc.scene === currentScene && isColliding(player, {x: npc.x-15, y: npc.y-15, width: 46, height: 50})) {
                npcProximo = npc; break;
            }
        }
        
        if (npcProximo) {
            dialogBox.classList.add("show");
            let extra = npcProximo.isMaster ? "<br><br>[ESPAÇO] INICIAR MINIGAME" : "";
            
            if (keys.e || keys.space) { 
                dialogText.innerHTML = npcProximo.msg + extra; 

                if (npcProximo.isMaster === "JOGO_PINGPONG") {
                    currentScene = "JOGO_PINGPONG";
                    dialogBox.classList.remove("show");
                    resetPingPong(true);
                } else if (npcProximo.isMaster === "JOGO_ESQUI") { 
                    currentScene = "JOGO_ESQUI";
                    dialogBox.classList.remove("show");
                    resetEsqui();
                } else if (npcProximo.isMaster) {
                    dialogText.innerHTML = `> ${npcProximo.msg}<br><br><i>(Minigame em construcao!)</i>`;
                }
            } else { 
                dialogText.innerHTML = "> (Pressione [E] para conversar)"; 
            }
        } else { 
            dialogBox.classList.remove("show"); 
        }
    } 
    else if (currentScene === "JOGO_PINGPONG") {
        updatePingPong();
    } else if (currentScene === "JOGO_ESQUI") { 
        updateEsqui();
    }
}

// -------------------------------------------------------------
// 5. MINIGAME PING PONG
// -------------------------------------------------------------
function resetPingPong(fullReset = false) {
    pingPong.ballX = 225;
    pingPong.ballY = 150;
    pingPong.ballSpeedX = Math.random() > 0.5 ? 3 : -3;
    pingPong.ballSpeedY = (Math.random() - 0.5) * 4;
    pingPong.playerHitTimer = 0;
    pingPong.opponentHitTimer = 0;
    pingPong.isPowerActive = false;
    
    if(fullReset) {
        pingPong.playerScore = 0;
        pingPong.opponentScore = 0;
        pingPong.power = 0;
        pingPong.playerX = 50;
        pingPong.playerY = 140;
    }
}

function updatePingPong() {
    hintText.innerText = "[W A S D] MOVER | [ESPACO] SMASH ESPECIAL!";

    let pMoveX = 0, pMoveY = 0;
    if (keys.w) pMoveY -= pingPong.speed;
    if (keys.s) pMoveY += pingPong.speed;
    if (keys.a) pMoveX -= pingPong.speed;
    if (keys.d) pMoveX += pingPong.speed;

    pingPong.playerX = Math.max(30, Math.min(180, pingPong.playerX + pMoveX));
    pingPong.playerY = Math.max(70, Math.min(230, pingPong.playerY + pMoveY));

    if (pMoveY < 0) pingPong.playerAction = "MOVE_UP";
    else if (pMoveY > 0) pingPong.playerAction = "MOVE_DOWN";
    else pingPong.playerAction = "IDLE";

    if (pingPong.playerHitTimer > 0) {
        pingPong.playerAction = "HIT";
        pingPong.playerHitTimer--;
    }

    if (keys.space && pingPong.power >= pingPong.maxPower) {
        pingPong.isPowerActive = true;
    }

    const targetY = pingPong.ballY;
    if (pingPong.opponentY < targetY - 10) {
        pingPong.opponentY += 2.2;
        pingPong.opponentAction = "MOVE_DOWN";
    } else if (pingPong.opponentY > targetY + 10) {
        pingPong.opponentY -= 2.2;
        pingPong.opponentAction = "MOVE_UP";
    } else {
        pingPong.opponentAction = "IDLE";
    }
    pingPong.opponentY = Math.max(70, Math.min(230, pingPong.opponentY));

    if (pingPong.opponentHitTimer > 0) {
        pingPong.opponentAction = "HIT";
        pingPong.opponentHitTimer--;
    }

    pingPong.ballX += pingPong.ballSpeedX;
    pingPong.ballY += pingPong.ballSpeedY;

    if (pingPong.ballY <= 80 || pingPong.ballY >= 230) pingPong.ballSpeedY *= -1;

    let pBox = { x: pingPong.playerX - 10, y: pingPong.playerY - 10, w: 40, h: 50 };
    if (pingPong.ballX > pBox.x && pingPong.ballX < pBox.x + pBox.w && 
        pingPong.ballY > pBox.y && pingPong.ballY < pBox.y + pBox.h) {
        if (pingPong.ballSpeedX < 0) {
            pingPong.playerHitTimer = 12; 
            if (pingPong.isPowerActive) {
                pingPong.ballSpeedX = 7.5;
                pingPong.power = 0;
                pingPong.isPowerActive = false;
            } else {
                pingPong.ballSpeedX = Math.abs(pingPong.ballSpeedX) + 0.3;
                pingPong.power = Math.min(pingPong.maxPower, pingPong.power + 25);
            }
            pingPong.ballSpeedY = (pingPong.ballY - pingPong.playerY) * 0.15;
        }
    }

    let mBox = { x: pingPong.opponentX - 15, y: pingPong.opponentY - 15, w: 50, h: 60 };
    if (pingPong.ballX > mBox.x && pingPong.ballX < mBox.x + mBox.w && 
        pingPong.ballY > mBox.y && pingPong.ballY < mBox.y + mBox.h) {
        if (pingPong.ballSpeedX > 0) {
            pingPong.opponentHitTimer = 12;
            let returnSpeed = Math.min(4.5, pingPong.ballSpeedX + 0.2); 
            pingPong.ballSpeedX = -Math.abs(returnSpeed);
            pingPong.ballSpeedY = (pingPong.ballY - pingPong.opponentY) * 0.15;
        }
    }

    if (pingPong.ballX < -10) {
        pingPong.opponentScore++;
        resetPingPong(false);
    } else if (pingPong.ballX > canvas.width + 10) {
        pingPong.playerScore++;
        resetPingPong(false);
    }

    if (pingPong.playerScore >= pingPong.maxScore) {
        insignias.pingpong = true;
        currentScene = "ILHA_PINGPONG";
        dialogText.innerHTML = "> MESTRE: Incrivel reflexo! Voce conquistou a Insignia do Ping-Pong!";
        dialogBox.classList.add("show");
    } else if (pingPong.opponentScore >= pingPong.maxScore) {
        currentScene = "ILHA_PINGPONG";
        dialogText.innerHTML = "> MESTRE: Treine mais um pouco e tente novamente!";
        dialogBox.classList.add("show");
    }
}

// -------------------------------------------------------------
// 6. DESENHO DAS ILHAS, OBSTÁCULOS E JOGADOR (HUB)
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
        const proporcao = npc.img.width / npc.img.height;
        const larguraCalculada = npc.tamanho * proporcao;
        const alturaCalculada = npc.tamanho;
        const drawX = Math.floor(npc.x - larguraCalculada / 2);
        const drawY = Math.floor(npc.y - alturaCalculada);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(npc.img, drawX, drawY, larguraCalculada, alturaCalculada);
    }
}

function drawSceneObstacles() {
    const obstacles = sceneObstacles[currentScene] || [];
    obstacles.forEach(obs => {
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
            case 'hoop':
                ctx.fillStyle = '#ffffff'; ctx.fillRect(obs.x, obs.y, obs.w, 8);
                ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 3; ctx.strokeRect(obs.x + 8, obs.y + 8, 14, 10);
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
            case 'scoreboard': 
                ctx.fillStyle = '#2c3e50'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2; ctx.strokeRect(obs.x + 2, obs.y + 2, obs.w - 4, obs.h - 4);
                ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 12px monospace'; ctx.fillText('00', obs.x + 10, obs.y + 25);
                ctx.fillStyle = '#3498db'; ctx.fillText('00', obs.x + 35, obs.y + 25);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(obs.x + obs.w / 2 - 1, obs.y + 5, 2, obs.h - 10);
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
    ctx.fillStyle = "#ffffff"; ctx.fillRect(15, 15, 420, 270); 
    drawPath(205, 270, 40, 30);
}

function drawIlhaPingPong() {
    drawWater();
    ctx.fillStyle = "#8bc34a"; ctx.fillRect(15, 15, 420, 270); 
    drawPath(0, 130, 30, 40); 
    drawPath(205, 0, 40, 30);
}

function drawIlhaSkate() {
    drawWater();
    ctx.fillStyle = "#9e9e9e"; ctx.fillRect(15, 15, 420, 270); 
    ctx.fillStyle = "#e0e0e0"; ctx.fillRect(60, 60, 330, 180); 
    drawPath(205, 0, 40, 30);
    drawPath(420, 130, 30, 40);
    drawPath(0, 130, 30, 40);
}

function drawIlhaBasquete() {
    drawWater();
    ctx.fillStyle = "#ff9800"; ctx.fillRect(15, 15, 420, 270); 
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.strokeRect(40, 40, 370, 220);
    drawPath(0, 130, 30, 40);
}

function drawIlhaArco() {
    drawWater();
    ctx.fillStyle = "#4caf50"; ctx.fillRect(15, 15, 420, 270); 
    drawPath(420, 130, 30, 40);
    drawPath(205, 0, 40, 30);
}

function drawIlhaCorrida() {
    drawWater();
    ctx.fillStyle = "#d84315"; ctx.fillRect(15, 15, 420, 270); 
    ctx.fillStyle = "#4caf50"; ctx.fillRect(70, 60, 310, 180); 
    drawPath(420, 130, 30, 40);
}

function drawIlhaEscalada() {
    drawWater();
    ctx.fillStyle = "#795548"; ctx.fillRect(15, 15, 420, 270); 
    ctx.fillStyle = "#5d4037"; ctx.fillRect(40, 30, 370, 220); 
    drawPath(205, 270, 40, 30);
}

function drawIlhaSurf() {
    drawWater();
    ctx.fillStyle = "#fff59d"; ctx.fillRect(15, 15, 420, 270); 
    drawPath(205, 270, 40, 30);
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

    if (Math.abs(pingPong.ballSpeedX) > 6) {
        ctx.fillStyle = "#ff5722"; ctx.shadowBlur = 10; ctx.shadowColor = "#ffeb3b";
    } else {
        ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 0;
    }

    ctx.beginPath(); ctx.arc(pingPong.ballX, pingPong.ballY, pingPong.ballRadius, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px monospace";
    ctx.fillText(`ZORP: ${pingPong.playerScore}`, 100, 30);
    ctx.fillText(`MESTRE: ${pingPong.opponentScore}`, 270, 30);

    ctx.fillStyle = "#333"; ctx.fillRect(80, 40, 100, 10);
    if (pingPong.isPowerActive || pingPong.power >= pingPong.maxPower) {
        ctx.fillStyle = (Date.now() % 400 < 200) ? "#ff9800" : "#ff5722"; 
        ctx.fillText("ESPAÇO: SMASH!", 80, 65);
    } else {
        ctx.fillStyle = "#ffeb3b";
    }
    
    let barraPreenchida = (pingPong.power / pingPong.maxPower) * 100;
    ctx.fillRect(80, 40, barraPreenchida, 10);
    ctx.strokeStyle = "#fff"; ctx.strokeRect(80, 40, 100, 10);
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
    else if (currentScene === "JOGO_ESQUI") drawEsquiGame();
    
    if (!currentScene.startsWith("JOGO_")) {
        drawSceneObstacles();
        for (let npc of npcs) {
            if (npc.scene === currentScene) drawNPC(npc);
        }
        drawPlayer();
    }
    
    // Esconde o HUD de insignias dentro do Jogo de Esqui (que tem o seu próprio)
    if (currentScene !== "JOGO_ESQUI") {
        drawHUD();
    }
}

function gameLoop() { 
    update(); 
    draw(); 
    requestAnimationFrame(gameLoop); 
}

gameLoop();