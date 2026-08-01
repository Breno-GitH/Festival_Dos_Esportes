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
// 2. OBJETOS, OBSTÁCULOS E ESTADOS DO JOGO
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
// ASSETS E MAPEAMENTO: ESQUI
// -------------------------------------------------------------
// -------------------------------------------------------------
// ASSETS E MAPEAMENTO: ESQUI (ATUALIZADO PARA BOSS FIGHT)
// -------------------------------------------------------------
const esquiAssets = {
    zorp: new Image(),
    mestre: new Image(),
    elementos: new Image()
};
esquiAssets.zorp.src = "zorp_esqui.png";
esquiAssets.mestre.src = "mestre_esqui.png";
esquiAssets.elementos.src = "elementos_esqui.png";

// Mapeamento baseado na nova spritesheet
const ESQUI_SPRITES = {
    zorp: {
        descidaFrente:  [ {x: 0, y: 50, w: 50, h: 50}, {x: 50, y: 50, w: 50, h: 50} ],
        virarEsquerda:  [ {x: 150, y: 0, w: 50, h: 50} ],
        virarDireita:   [ {x: 300, y: 0, w: 50, h: 50} ],
        salto:          [ {x: 200, y: 50, w: 50, h: 50} ], // Novo sprite de rampa
        colisao:        [ {x: 300, y: 50, w: 50, h: 50} ]
    },
    mestre: {
        descidaCostas:  [ {x: 0, y: 0, w: 50, h: 50}, {x: 50, y: 0, w: 50, h: 50} ],
        ataque:         [ {x: 0, y: 100, w: 50, h: 50} ]
    }
};

 const esquiGame = {
    playerX: 0, // Agora 0 é o centro da tela
    speedX: 8, 
    speedZ: 15, // Velocidade que avança na pista
    distance: 0, 
    maxDistance: 4000, 
    obstacles: [],
    
    // Animação e Estados
    isJumping: false,
    jumpTimer: 0,
    isHit: false,
    hitTimer: 0,
    
    // Boss 
    bossX: 0,
    bossZ: 500, // Fica longe no horizonte e vai se aproximando/afastando
    bossAttackTimer: 50
};

// -------------------------------------------------------------
// MINIGAME ESQUI
// -------------------------------------------------------------
// -------------------------------------------------------------
// MINIGAME ESQUI - LÓGICA E RENDERIZAÇÃO ATUALIZADAS
// -------------------------------------------------------------
function resetEsqui() {
    esquiGame.playerX = 0;
    esquiGame.distance = 0;
    esquiGame.obstacles = [];
    esquiGame.isHit = false;
    esquiGame.hitTimer = 0;
    esquiGame.isJumping = false;
    esquiGame.bossZ = esquiGame.distance + 800; // Boss nasce longe
}

function updateEsqui() {
    hintText.innerText = "[A D] DESVIAR | [ESPAÇO] PULAR RAMPAS";

    // Pulo e Colisão
    if (esquiGame.isJumping) {
        esquiGame.jumpTimer--;
        if (esquiGame.jumpTimer <= 0) esquiGame.isJumping = false;
    }

    if (esquiGame.hitTimer > 0) {
        esquiGame.hitTimer--;
        if (esquiGame.hitTimer === 0) esquiGame.isHit = false;
    } else if (!esquiGame.isJumping) {
        // Movimento lateral (limites da pista - X vai de -300 a 300)
        if (keys.a) esquiGame.playerX -= esquiGame.speedX;
        if (keys.d) esquiGame.playerX += esquiGame.speedX;
        esquiGame.playerX = Math.max(-300, Math.min(300, esquiGame.playerX));
    }

    // Avançar na pista
    if (!esquiGame.isHit) {
        esquiGame.distance += esquiGame.speedZ;
        
        // Comportamento do Boss
        esquiGame.bossZ = esquiGame.distance + 600 + Math.sin(Date.now() / 500) * 100;
        if (esquiGame.bossX < esquiGame.playerX) esquiGame.bossX += 2;
        else if (esquiGame.bossX > esquiGame.playerX) esquiGame.bossX -= 2;

        esquiGame.bossAttackTimer--;
        if (esquiGame.bossAttackTimer <= 0) {
            let type = Math.random() > 0.5 ? "bolaDeNeve" : "estalactite";
            esquiGame.obstacles.push({
                x: esquiGame.bossX,
                z: esquiGame.bossZ - 20, // Sai da frente do boss
                type: type,
                w: 60, h: 60,
                isAttack: true
            });
            esquiGame.bossAttackTimer = 60 + Math.random() * 40;
        }
    }

    // Gerar Cenário Aleatório no horizonte (Z alto)
    if (Math.random() < 0.08 && !esquiGame.isHit) {
        const types = ["arvore", "arvore", "rocha", "rampa"];
        const type = types[Math.floor(Math.random() * types.length)];
        // Nasce nas bordas (árvores) ou no meio (rochas/rampas)
        let obsX = type === "arvore" ? (Math.random() > 0.5 ? 350 : -350) : (Math.random() * 600 - 300);
        
        esquiGame.obstacles.push({
            x: obsX,
            z: esquiGame.distance + 1500, // Nasce no horizonte
            type: type,
            w: 80, h: 80,
            isAttack: false
        });
    }

    // Atualizar Obstáculos e Colisão em Profundidade
    let playerZ = esquiGame.distance; // O jogador está sempre no Z atual
    
    for (let i = esquiGame.obstacles.length - 1; i >= 0; i--) {
        let obs = esquiGame.obstacles[i];
        
        if (obs.isAttack && !esquiGame.isHit) {
            obs.z -= esquiGame.speedZ * 0.5; // Ataques vêm mais rápido na direção do jogador
        }

        // Se passou do jogador (ficou para trás da câmera)
        if (obs.z < playerZ - 100) {
            esquiGame.obstacles.splice(i, 1);
            continue;
        }

        // Checagem de Colisão (Se o Z do obstáculo está perto do Z do jogador)
        if (obs.z > playerZ && obs.z < playerZ + 50) {
            if (Math.abs(esquiGame.playerX - obs.x) < 40) { // Colisão lateral X
                if (obs.type === "rampa" && keys.space && !esquiGame.isJumping) {
                    esquiGame.isJumping = true;
                    esquiGame.jumpTimer = 35;
                } else if (!esquiGame.isJumping && obs.type !== "rampa") {
                    esquiGame.isHit = true;
                    esquiGame.hitTimer = 60;
                    esquiGame.obstacles.splice(i, 1);
                    esquiGame.speedX -= 100; // Penalidade de recuo
                }
            }
        }
    }

    // Vitória
    if (esquiGame.distance >= esquiGame.maxDistance) {
        insignias.esqui = true;
        currentScene = "ILHA_ESQUI";
        dialogText.innerHTML = "> MESTRE DO GELO: Incrível! Você venceu a perspectiva 3D!";
        dialogBox.classList.add("show");
    }
}

// Projeção Matemática 3D para o Canvas
function project3D(x, z) {
    const horizonY = 120; // Linha do horizonte
    const cameraHeight = 150; // Altura da câmera
    const FOV = 250; // Campo de visão (Field of View)

    let relativeZ = z - esquiGame.distance; 
    if (relativeZ < 1) relativeZ = 1; // Previne bugar ao passar da câmera

    let scale = FOV / (FOV + relativeZ);
    let screenX = (canvas.width / 2) + (x * scale);
    let screenY = horizonY + (cameraHeight * scale);
    
    return { sx: screenX, sy: screenY, scale: scale };
}

function drawEsquiGame() {
    const horizonY = 120;

    // Fundo (Céu e Montanhas estáticas)
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, horizonY);
    ctx.fillStyle = "#ecf0f1";
    ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(100, 40); ctx.lineTo(250, horizonY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(200, horizonY); ctx.lineTo(350, 20); ctx.lineTo(canvas.width, horizonY); ctx.fill();

    // Desenhar o Chão Pseudo-3D (Efeito de velocidade)
    for (let i = 0; i < canvas.height - horizonY; i += 3) {
        let screenY = horizonY + i;
        // Reverte a projeção para saber o Z real daquela linha na tela
        let z = (150 * 250) / Math.max(1, i);
        let realZ = z + esquiGame.distance;
        
        // Pista zebrada para dar sensação de profundidade e velocidade
        ctx.fillStyle = (Math.floor(realZ / 120) % 2 === 0) ? "#ffffff" : "#f5f6fa";
        ctx.fillRect(0, screenY, canvas.width, 3);
        
        // Bordas da pista (Estilo corrida)
        let edgeScale = 250 / (250 + z);
        let edgeX = (canvas.width / 2) + (350 * edgeScale);
        ctx.fillStyle = (Math.floor(realZ / 80) % 2 === 0) ? "#e74c3c" : "#ffffff";
        ctx.fillRect((canvas.width / 2) - (350 * edgeScale), screenY, 15 * edgeScale, 3); // Esquerda
        ctx.fillRect(edgeX, screenY, 15 * edgeScale, 3); // Direita
    }

    // Organizar objetos para desenhar de trás pra frente (Painter's Algorithm)
    let renderList = [...esquiGame.obstacles, { isBoss: true, x: esquiGame.bossX, z: esquiGame.bossZ }];
    renderList.sort((a, b) => b.z - a.z); // Maior Z (mais longe) desenha primeiro

    // Renderizar Elementos em 3D
    renderList.forEach(obj => {
        let p = project3D(obj.x, obj.z);
        if (p.sy > canvas.height + 50 || p.scale < 0.05) return; // Não desenha se saiu da tela

        let scaledW = (obj.w || 70) * p.scale;
        let scaledH = (obj.h || 70) * p.scale;
        let drawX = p.sx - scaledW / 2;
        let drawY = p.sy - scaledH; // Ancorar pela base

        if (obj.isBoss) {
            // FALLBACK IMAGEM: Desenha o boss. Se a imagem falhar, desenha um bloco vermelho.
            if (esquiAssets.mestre.complete && esquiAssets.mestre.naturalWidth > 0) {
                ctx.drawImage(esquiAssets.mestre, drawX, drawY, scaledW, scaledH);
            } else {
                ctx.fillStyle = "#e74c3c"; ctx.fillRect(drawX, drawY, scaledW, scaledH);
            }
        } else {
            // Formas geométricas escaladas pela projeção
            if (obj.type === "arvore") {
                ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.moveTo(p.sx, drawY); ctx.lineTo(drawX, p.sy); ctx.lineTo(drawX + scaledW, p.sy); ctx.fill();
            } else if (obj.type === "rocha") {
                ctx.fillStyle = '#7f8c8d'; ctx.fillRect(drawX, drawY + scaledH/2, scaledW, scaledH/2);
            } else if (obj.type === "rampa") {
                ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(drawX, p.sy); ctx.lineTo(drawX + scaledW, p.sy); ctx.lineTo(drawX + scaledW, p.sy - scaledH/3); ctx.fill();
            } else if (obj.type === "bolaDeNeve") {
                ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.arc(p.sx, p.sy - scaledH/2, scaledW/2, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#bdc3c7'; ctx.stroke();
            } else if (obj.type === "estalactite") {
                ctx.fillStyle = '#81d4fa'; ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(drawX, drawY); ctx.lineTo(drawX + scaledW, drawY); ctx.fill();
            }
        }
    });

    // Renderizar Jogador (Zorp) - Sempre na frente
    let playerP = project3D(esquiGame.playerX, esquiGame.distance + 50); 
    let playerW = 60 * playerP.scale;
    let playerH = 60 * playerP.scale;
    
    let py = playerP.sy - playerH;
    if (esquiGame.isJumping) py -= 30; // Pulo visual
    if (esquiGame.isHit && esquiGame.hitTimer % 10 < 5) ctx.globalAlpha = 0.5;

    // FALLBACK IMAGEM ZORP
    if (esquiAssets.zorp.complete && esquiAssets.zorp.naturalWidth > 0) {
        ctx.drawImage(esquiAssets.zorp, playerP.sx - playerW/2, py, playerW, playerH);
    } else {
        ctx.fillStyle = "#3498db"; ctx.fillRect(playerP.sx - playerW/2, py, playerW, playerH); // Bloco azul caso a imagem não carregue
    }
    ctx.globalAlpha = 1.0;

    // HUD (Painel Superior)
    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0, 0, canvas.width, 40);
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px monospace";
    ctx.fillText("CORRIDA NO GELO", 15, 25);
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`PROG: ${Math.floor(esquiGame.distance)} / ${esquiGame.maxDistance}`, canvas.width - 250, 25);
}

    // Atualizar Posição dos Obstáculos e Colisões
    let playerBox = { x: esquiGame.playerX + 15, y: esquiGame.playerY + 15, w: 20, h: 30 };
    
    for (let i = esquiGame.obstacles.length - 1; i >= 0; i--) {
        let obs = esquiGame.obstacles[i];
        
        if (!esquiGame.isHit) {
            // Ataques do Boss descem mais rápido
            obs.y += obs.isAttack ? esquiGame.baseSpeedY + 3 : esquiGame.baseSpeedY;
        }

        // Interação com Rampa
        if (obs.type === "rampa" && keys.space && !esquiGame.isJumping) {
            if (playerBox.x < obs.x + obs.w && playerBox.x + playerBox.w > obs.x &&
                playerBox.y < obs.y + obs.h && playerBox.y + playerBox.h > obs.y) {
                esquiGame.isJumping = true;
                esquiGame.jumpTimer = 35; // Duração do pulo
            }
        }

        // Colisão com Obstáculos (Ignora se o jogador estiver pulando)
        if (!esquiGame.isJumping && obs.type !== "rampa") {
            if (playerBox.x < obs.x + obs.w && playerBox.x + playerBox.w > obs.x &&
                playerBox.y < obs.y + obs.h && playerBox.y + playerBox.h > obs.y) {
                
                esquiGame.isHit = true;
                esquiGame.hitTimer = 60; 
                esquiGame.obstacles.splice(i, 1); 
                esquiGame.distance = Math.max(0, esquiGame.distance - 150); 
                continue;
            }
        }

        if (obs.y > canvas.height) esquiGame.obstacles.splice(i, 1);
    }

    // Condição de Vitória
    if (esquiGame.distance >= esquiGame.maxDistance) {
        insignias.esqui = true;
        currentScene = "ILHA_ESQUI";
        dialogText.innerHTML = "> MESTRE DO GELO: Você sobreviveu à minha avalanche! Insígnia do Esqui conquistada!";
        dialogBox.classList.add("show");
    }


function drawEsquiGame() {
    // Fundo da Neve
    ctx.fillStyle = "#e3f2fd"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Efeito de descida
    ctx.fillStyle = "#bbdefb";
    for(let i = 0; i < 20; i++) {
        let ly = (esquiGame.distance + i * 25) % canvas.height;
        let lx = (i * 37) % canvas.width;
        ctx.fillRect(lx, ly, 3, 15);
    }

    // Renderizar Obstáculos e Ataques
    esquiGame.obstacles.forEach(obs => {
        if (obs.type === "arvore") {
            ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.moveTo(obs.x + obs.w/2, obs.y); ctx.lineTo(obs.x, obs.y + obs.h); ctx.lineTo(obs.x + obs.w, obs.y + obs.h); ctx.fill();
        } else if (obs.type === "rocha") {
            ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(obs.x + obs.w/2, obs.y + obs.h/2, obs.w/2, 0, Math.PI * 2); ctx.fill();
        } else if (obs.type === "rampa") {
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(obs.x, obs.y + obs.h); ctx.lineTo(obs.x + obs.w, obs.y + obs.h); ctx.lineTo(obs.x + obs.w, obs.y); ctx.fill();
            ctx.strokeStyle = '#bdc3c7'; ctx.lineWidth = 2; ctx.stroke();
        } else if (obs.type === "bolaDeNeve") {
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(obs.x + obs.w/2, obs.y + obs.h/2, obs.w/2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 10; ctx.shadowColor = "#90caf9"; ctx.fill(); ctx.shadowBlur = 0;
        } else if (obs.type === "estalactite") {
            ctx.fillStyle = '#81d4fa'; ctx.beginPath(); ctx.moveTo(obs.x + obs.w/2, obs.y + obs.h); ctx.lineTo(obs.x, obs.y); ctx.lineTo(obs.x + obs.w, obs.y); ctx.fill();
        } else {
            ctx.fillStyle = "#bdc3c7"; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        }
    });

    // Renderizar Boss (Mestre do Gelo)
    let bossAnim = ESQUI_SPRITES.mestre[esquiGame.bossAction];
    let bossSprite = Array.isArray(bossAnim) ? bossAnim[esquiGame.animIndex % bossAnim.length] : bossAnim;
    drawSprite(esquiAssets.mestre, bossSprite, esquiGame.bossX, esquiGame.bossY, 50, 50);

    // Renderizar Zorp (Jogador)
    let zorpAnim = ESQUI_SPRITES.zorp[esquiGame.action];
    let zorpSprite = Array.isArray(zorpAnim) ? zorpAnim[esquiGame.animIndex % zorpAnim.length] : zorpAnim;
    
    // Feedback visual (pulo ou dano)
    if (esquiGame.isHit && esquiGame.hitTimer % 10 < 5) ctx.globalAlpha = 0.5;
    
    let drawY = esquiGame.playerY;
    let drawScale = 50;
    if (esquiGame.isJumping) {
        drawY -= 20; // Eleva o sprite durante o pulo
        drawScale = 60; // Dá ilusão de aproximação da câmera
        // Sombra do pulo
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath(); ctx.ellipse(esquiGame.playerX + 25, esquiGame.playerY + 45, 20, 8, 0, 0, Math.PI*2); ctx.fill();
    }

    drawSprite(esquiAssets.zorp, zorpSprite, esquiGame.playerX, drawY, drawScale, drawScale);
    ctx.globalAlpha = 1.0;

    // Nova HUD Lateral Estilo Imagem
    const hudX = canvas.width - 150;
    ctx.fillStyle = "rgba(20, 20, 40, 0.85)"; ctx.fillRect(hudX, 20, 130, 200);
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px monospace";
    
    ctx.fillText("PROGRESSO", hudX + 10, 40);
    ctx.fillStyle = "#f1c40f"; 
    ctx.fillText(`${Math.floor(esquiGame.distance)} / ${esquiGame.maxDistance}m`, hudX + 10, 60);

    // Barra de Velocidade (Estética)
    ctx.fillStyle = "#fff"; ctx.fillText("VELOCIDADE", hudX + 10, 100);
    for(let i=0; i<5; i++) {
        ctx.fillStyle = (i < 3) ? "#3498db" : "#34495e";
        ctx.fillRect(hudX + 10 + (i*20), 110, 15, 10);
    }
}

// Função genérica para desenhar sprites cortadas
function drawSprite(img, sprite, dx, dy, dw, dh) {
    if (!img.complete || img.naturalWidth === 0) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, dx, dy, dw || sprite.w, dh || sprite.h);
}

// Obstáculos e Elementos Interativos/Decorativos por Ilha
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

// NPCs espalhados pelas ilhas
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
// 4. COLISÕES E LÓGICA DE MOVIMENTO
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
            return true; // Colidiu
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

            // Define a direção sem conflito (evita Zigzag)
            if (moveY > 0) zorpSprite.row = 0;       // Frente (Baixo)
            else if (moveY < 0) zorpSprite.row = 1;  // Costas (Cima)
            else if (moveX < 0) zorpSprite.row = 2;  // Esquerda
            else if (moveX > 0) zorpSprite.row = 3;  // Direita

            // Aplica movimento testando colisão individual por eixo
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
// 6. DESENHO DAS ILHAS, OBSTÁCULOS E JOGADOR
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

        // Sequência para eliminar moonwalk de ambos os lados
        const sequences = [
            [1, 0, 1, 2], // Frente
            [1, 0, 1, 2], // Costas
            [1, 2, 1, 0], // Esquerda (Invertido)
            [1, 2, 1, 0]  // Direita (Invertido)
        ];
        
        const currentSeq = sequences[zorpSprite.row];
        const sx = currentSeq[zorpSprite.animIndex] * frameWidth;
        const sy = zorpSprite.row * frameHeight;

        // Ancoragem na sombra (offset Y ajustado)
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
    drawPath(205, 0, 40, 80);    // Norte
    drawPath(205, 220, 40, 80);  // Sul
    drawPath(310, 130, 140, 40); // Leste
    drawPath(0, 130, 140, 40);   // Oeste

    ctx.fillStyle = "#7dbd42";
    ctx.beginPath(); ctx.arc(225, 150, 95, 0, Math.PI*2); ctx.fill();

    // Monumento Central
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
    ctx.fillStyle = "#e0e0e0"; ctx.fillRect(60, 60, 330, 180); // Half-pipe
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
    ctx.fillStyle = "#4caf50"; ctx.fillRect(70, 60, 310, 180); // Gramado
    drawPath(420, 130, 30, 40);
}

function drawIlhaEscalada() {
    drawWater();
    ctx.fillStyle = "#795548"; ctx.fillRect(15, 15, 420, 270); 
    ctx.fillStyle = "#5d4037"; ctx.fillRect(40, 30, 370, 220); // Parede
    drawPath(205, 270, 40, 30);
}

function drawIlhaSurf() {
    drawWater();
    ctx.fillStyle = "#fff59d"; ctx.fillRect(15, 15, 420, 270); // Areia
    drawPath(205, 270, 40, 30);
}

// -------------------------------------------------------------
// 7. RENDERIZADOR DOS MINIGAMES E HUD
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

function drawEsquiGame() {
    // Fundo da Neve
    ctx.fillStyle = "#ffffff"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Efeito de velocidade na neve (linhas cinzas descendo)
    ctx.fillStyle = "#ecf0f1";
    for(let i = 0; i < 20; i++) {
        let ly = (esquiGame.distance + i * 25) % canvas.height;
        let lx = (i * 37) % canvas.width;
        ctx.fillRect(lx, ly, 2, 15);
    }

    // Renderizar Obstáculos e Ataques usando formas do Canvas
    esquiGame.obstacles.forEach(obs => {
        if (obs.type === "arvore") {
            ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.moveTo(obs.x + obs.w/2, obs.y); ctx.lineTo(obs.x, obs.y + obs.h); ctx.lineTo(obs.x + obs.w, obs.y + obs.h); ctx.fill();
        } else if (obs.type === "rocha") {
            ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(obs.x + obs.w/2, obs.y + obs.h/2, obs.w/2, 0, Math.PI * 2); ctx.fill();
        } else if (obs.type === "rampa") {
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(obs.x, obs.y + obs.h); ctx.lineTo(obs.x + obs.w, obs.y + obs.h); ctx.lineTo(obs.x + obs.w, obs.y); ctx.fill();
        } else if (obs.type === "bolaDeNeve") {
            ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.arc(obs.x + obs.w/2, obs.y + obs.h/2, obs.w/2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#bdc3c7'; ctx.lineWidth = 2; ctx.stroke();
        } else if (obs.type === "estalactite") {
            ctx.fillStyle = '#81d4fa'; ctx.beginPath(); ctx.moveTo(obs.x + obs.w/2, obs.y + obs.h); ctx.lineTo(obs.x, obs.y); ctx.lineTo(obs.x + obs.w, obs.y); ctx.fill();
        } else {
            ctx.fillStyle = "#bdc3c7"; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        }
    });

    // Renderizar Boss (Mestre do Gelo) - Usando a imagem inteira
    if (esquiAssets.mestre.complete && esquiAssets.mestre.naturalWidth !== 0) {
        ctx.drawImage(esquiAssets.mestre, esquiGame.bossX, esquiGame.bossY, 50, 50);
    }

    // Renderizar Zorp (Jogador)
    // Feedback visual se tomar dano (piscar)
    if (esquiGame.isHit && esquiGame.hitTimer % 10 < 5) ctx.globalAlpha = 0.5;
    
    let drawY = esquiGame.playerY;
    let drawScale = 50;
    
    // Efeito visual do pulo (aumenta de tamanho e desenha sombra)
    if (esquiGame.isJumping) {
        drawY -= 20; 
        drawScale = 60; 
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.beginPath(); ctx.ellipse(esquiGame.playerX + 25, esquiGame.playerY + 45, 20, 8, 0, 0, Math.PI*2); ctx.fill();
    }

    if (esquiAssets.zorp.complete && esquiAssets.zorp.naturalWidth !== 0) {
        ctx.drawImage(esquiAssets.zorp, esquiGame.playerX, drawY, drawScale, drawScale);
    }
    
    ctx.globalAlpha = 1.0;

    // HUD Superior (Inspirada na sua imagem de referência)
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, canvas.width, 35);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(5, 5, canvas.width - 10, 25);
    
    ctx.fillStyle = "#f1c40f"; ctx.font = "bold 14px monospace";
    ctx.fillText("ILHA DOS CAMPEDES", 15, 23);
    
    ctx.fillStyle = "#fff";
    ctx.fillText(`PONTOS: ${Math.floor(esquiGame.distance)}`, canvas.width - 130, 23);

    // Barra de Progresso colada na borda inferior do HUD
    ctx.fillStyle = "#333"; ctx.fillRect(0, 35, canvas.width, 4);
    let progresso = (esquiGame.distance / esquiGame.maxDistance) * canvas.width;
    ctx.fillStyle = "#f1c40f"; ctx.fillRect(0, 35, progresso, 4);
}

// Extraído para o nível correto (fora do loop draw)
function drawHUD() {
    const marginX = 10;
    const marginY = 10;
    const size = 20;
    let i = 0;

    // Fundo semitransparente para o HUD
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(5, 5, 230, 30);

    // Iterar sobre o objeto de insígnias já existente
    for (let esporte in insignias) {
        // Se o jogador tem a insígnia, desenha dourado. Se não, cinza escuro.
        ctx.fillStyle = insignias[esporte] ? "#f1c40f" : "#7f8c8d";
        ctx.beginPath();
        ctx.arc(marginX + 15 + (i * 25), marginY + 10, size / 2, 0, Math.PI * 2);
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
    
    // Chama o HUD sobre tudo no final do render
    drawHUD();
}

function gameLoop() { 
    update(); 
    draw(); 
    requestAnimationFrame(gameLoop); 
}

gameLoop();