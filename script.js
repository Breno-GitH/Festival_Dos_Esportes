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
const esquiAssets = {
    zorp: new Image(),
    mestre: new Image(),
    elementos: new Image()
};
esquiAssets.zorp.src = "zorp_esqui.png";
esquiAssets.mestre.src = "mestre_esqui.png";
esquiAssets.elementos.src = "elementos_esqui.png";

const ESQUI_SPRITES = {
    zorp: {
        descidaFrente:  [ {x: 0, y: 50, w: 50, h: 50}, {x: 50, y: 50, w: 50, h: 50}, {x: 100, y: 50, w: 50, h: 50} ],
        virarEsquerda:  [ {x: 150, y: 0, w: 50, h: 50} ],
        virarDireita:   [ {x: 300, y: 0, w: 50, h: 50} ],
        colisao:        [ {x: 300, y: 50, w: 50, h: 50} ]
    },
    elementos: {
        arvore:         { x: 150, y: 0, w: 40, h: 50 },
        rocha:          { x: 195, y: 0, w: 40, h: 35 },
        bonecoNeve:     { x: 240, y: 0, w: 35, h: 45 },
        bandeiraAzul:   { x: 0, y: 0, w: 30, h: 40 }
    }
};

const esquiGame = {
    playerX: 200, 
    playerY: 200, 
    speedX: 4, 
    baseSpeedY: 4,
    distance: 0, 
    maxDistance: 1500, // Chegue a 1500 para ganhar a insígnia
    obstacles: [],
    animTimer: 0,
    animIndex: 0,
    action: "descidaFrente", // Estado atual da animação do Zorp
    isHit: false,
    hitTimer: 0
};

// -------------------------------------------------------------
// MINIGAME ESQUI
// -------------------------------------------------------------
function resetEsqui() {
    esquiGame.playerX = 200;
    esquiGame.distance = 0;
    esquiGame.obstacles = [];
    esquiGame.isHit = false;
    esquiGame.hitTimer = 0;
    esquiGame.action = "descidaFrente";
}

function updateEsqui() {
    hintText.innerText = "[A D] DESVIAR | SOBREVIVA A DESCIDA!";

    // Controle de Animação
    esquiGame.animTimer++;
    if (esquiGame.animTimer > 10) {
        esquiGame.animIndex = (esquiGame.animIndex + 1) % 3;
        esquiGame.animTimer = 0;
    }

    if (esquiGame.hitTimer > 0) {
        esquiGame.hitTimer--;
        esquiGame.action = "colisao";
        if (esquiGame.hitTimer === 0) esquiGame.isHit = false;
    } else {
        // Movimento
        let moveX = 0;
        if (keys.a) moveX -= esquiGame.speedX;
        if (keys.d) moveX += esquiGame.speedX;

        esquiGame.playerX = Math.max(20, Math.min(canvas.width - 60, esquiGame.playerX + moveX));

        if (keys.a) esquiGame.action = "virarEsquerda";
        else if (keys.d) esquiGame.action = "virarDireita";
        else esquiGame.action = "descidaFrente";

        // Avanço da pista
        esquiGame.distance += esquiGame.baseSpeedY;

        // Gerar Obstáculos aleatórios
        if (Math.random() < 0.04) { // 4% de chance por frame
            const obsTypes = ["arvore", "rocha", "bonecoNeve", "bandeiraAzul"];
            const type = obsTypes[Math.floor(Math.random() * obsTypes.length)];
            const obsSprite = ESQUI_SPRITES.elementos[type];
            esquiGame.obstacles.push({
                x: Math.random() * (canvas.width - obsSprite.w - 20) + 10,
                y: -50,
                type: type,
                w: obsSprite.w,
                h: obsSprite.h
            });
        }
    }

    // Atualizar Obstáculos e Colisão
    let playerBox = { x: esquiGame.playerX + 10, y: esquiGame.playerY + 10, w: 30, h: 30 };
    
    for (let i = esquiGame.obstacles.length - 1; i >= 0; i--) {
        let obs = esquiGame.obstacles[i];
        
        // Só move se o jogador não estiver batido (congela a tela no hit)
        if (!esquiGame.isHit) obs.y += esquiGame.baseSpeedY;

        // Verifica Colisão
        if (playerBox.x < obs.x + obs.w && playerBox.x + playerBox.w > obs.x &&
            playerBox.y < obs.y + obs.h && playerBox.y + playerBox.h > obs.y) {
            
            esquiGame.isHit = true;
            esquiGame.hitTimer = 60; // Fica travado por 1 segundo
            esquiGame.obstacles.splice(i, 1); // Remove o obstáculo após bater
            esquiGame.distance = Math.max(0, esquiGame.distance - 100); // Penalidade
            continue;
        }

        // Remove obstáculos que saíram da tela
        if (obs.y > canvas.height) {
            esquiGame.obstacles.splice(i, 1);
        }
    }

    // Condição de Vitória
    if (esquiGame.distance >= esquiGame.maxDistance) {
        insignias.esqui = true;
        currentScene = "ILHA_ESQUI";
        dialogText.innerHTML = "> MESTRE DO GELO: Seus reflexos sao frios como o gelo! Voce ganhou a Insignia do Esqui!";
        dialogBox.classList.add("show");
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

    // Desenhar Obstáculos
    esquiGame.obstacles.forEach(obs => {
        let spriteInfo = ESQUI_SPRITES.elementos[obs.type];
        drawSprite(esquiAssets.elementos, spriteInfo, obs.x, obs.y);
    });

    // Desenhar Zorp
    let zorpSpriteInfo;
    let animArray = ESQUI_SPRITES.zorp[esquiGame.action];
    
    // Se for array (animação), pega o frame atual, se não, pega o objeto direto
    if (Array.isArray(animArray)) {
        let frame = esquiGame.animIndex % animArray.length;
        zorpSpriteInfo = animArray[frame];
    } else {
        zorpSpriteInfo = animArray; 
    }

    // Feedback visual de dano (piscar vermelho)
    if (esquiGame.isHit && esquiGame.hitTimer % 10 < 5) {
        ctx.globalAlpha = 0.5;
    }
    drawSprite(esquiAssets.zorp, zorpSpriteInfo, esquiGame.playerX, esquiGame.playerY, 50, 50);
    ctx.globalAlpha = 1.0;

    // HUD (Progresso)
    ctx.fillStyle = "#333"; ctx.fillRect(80, 20, 290, 15);
    let progresso = (esquiGame.distance / esquiGame.maxDistance) * 290;
    ctx.fillStyle = "#3498db"; ctx.fillRect(80, 20, progresso, 15);
    ctx.strokeStyle = "#fff"; ctx.strokeRect(80, 20, 290, 15);
    
    ctx.fillStyle = "#2c3e50"; ctx.font = "bold 14px monospace";
    ctx.fillText("DISTÂNCIA", 185, 15);
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