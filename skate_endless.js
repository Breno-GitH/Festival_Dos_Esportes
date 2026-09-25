// -----------------------------------------------------------------------------
// MINIJOGO DE SKATE — ENDLESS RUNNER DE ESTILO
// Sobreviver mantém a corrida; manobras e grinds são a fonte principal de pontos.
// -----------------------------------------------------------------------------

const skateEndlessInput = {
    up: false, down: false, space: false, a: false, d: false, w: false, s: false,
    jumpPressed: false, spaceReleased: false, trickRequest: '', balanceNudge: 0, lastBalanceKey: ''
};

// Folha modular fornecida: usada por recortes no canvas, nunca como panorama ampliado.
const imgSkateModuleKit = new Image();
// The optional modular sheet is absent in this checkout; geometric fallbacks
// below are complete. Do not issue a known 404 for an unused legacy atlas.
const skateModuleRects = {
    asphalt: [27, 48, 69, 63],
    rampLow: [25, 201, 91, 76],
    rampHigh: [126, 170, 83, 109],
    quarter: [216, 169, 107, 111],
    railMedium: [493, 83, 118, 43],
    railRise: [637, 54, 111, 75],
    railDrop: [776, 55, 116, 74],
    crate: [632, 239, 111, 59],
    trash: [927, 229, 54, 79],
    wall: [1073, 49, 132, 101],
    graffiti: [1233, 190, 132, 87],
    lamp: [24, 498, 83, 139],
    foliage: [121, 550, 125, 80],
    fence: [276, 551, 113, 66],
    building: [420, 493, 88, 174],
    billboard: [807, 554, 77, 116],
    arena: [1124, 495, 257, 146]
};
const skateModuleSprites = {};

function prepareSkateModuleSprites() {
    Object.entries(skateModuleRects).forEach(([name, rect]) => {
        const [sx, sy, sw, sh] = rect;
        const surface = document.createElement('canvas');
        surface.width = sw; surface.height = sh;
        const surfaceCtx = surface.getContext('2d');
        surfaceCtx.drawImage(imgSkateModuleKit, sx, sy, sw, sh, 0, 0, sw, sh);
        const pixels = surfaceCtx.getImageData(0, 0, sw, sh);
        for (let i = 0; i < pixels.data.length; i += 4) {
            const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
            // Remove apenas o azul escuro de fundo da folha, preservando os neons brilhantes.
            if (b > r * 1.25 && b > g * 1.15 && r < 82 && g < 126 && b > 58) pixels.data[i + 3] = 0;
        }
        surfaceCtx.putImageData(pixels, 0, 0);
        skateModuleSprites[name] = surface;
    });
}

if (typeof document !== 'undefined') {
    if (imgSkateModuleKit.complete && imgSkateModuleKit.naturalWidth > 0) prepareSkateModuleSprites();
    else imgSkateModuleKit.addEventListener('load', prepareSkateModuleSprites);
}

function drawSkateModule(name, x, y, width, height, alpha = 1) {
    const sprite = skateModuleSprites[name];
    if (!sprite) return false;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    ctx.restore();
    return true;
}

window.addEventListener('keydown', (event) => {
    const isJump = event.code === 'Space' || event.key === 'ArrowUp';
    const key = event.key.toLowerCase();
    if (currentScene !== 'JOGO_SKATE') return;
    if (isJump || event.key === 'ArrowDown') event.preventDefault();
    if (isJump) {
        if (!event.repeat) skateEndlessInput.jumpPressed = true;
        skateEndlessInput.up = true;
    }
    if (event.code === 'Space') skateEndlessInput.space = true;
    if (event.key === 'ArrowDown') skateEndlessInput.down = true;
    if (key === 'a') {
        skateEndlessInput.a = true;
        if (!event.repeat && skateEndlessInput.space && !skateGame.player.isGrounded && !skateGame.player.isGrinding) skateEndlessInput.trickRequest = 'a';
        if (!event.repeat && skateGame.player.isGrinding) {
            skateEndlessInput.balanceNudge -= skateEndlessInput.lastBalanceKey === 'A' ? .07 : .18;
            skateEndlessInput.lastBalanceKey = 'A';
        }
    }
    if (key === 'd') {
        skateEndlessInput.d = true;
        if (!event.repeat && skateEndlessInput.space && !skateGame.player.isGrounded && !skateGame.player.isGrinding) skateEndlessInput.trickRequest = 'd';
        if (!event.repeat && skateGame.player.isGrinding) {
            skateEndlessInput.balanceNudge += skateEndlessInput.lastBalanceKey === 'D' ? .07 : .18;
            skateEndlessInput.lastBalanceKey = 'D';
        }
    }
    if (key === 'w') {
        skateEndlessInput.w = true;
        if (!event.repeat && skateEndlessInput.space && !skateGame.player.isGrounded && !skateGame.player.isGrinding) skateEndlessInput.trickRequest = 'w';
    }
    if (key === 's') {
        skateEndlessInput.s = true;
        if (!event.repeat && skateEndlessInput.space && !skateGame.player.isGrounded && !skateGame.player.isGrinding) skateEndlessInput.trickRequest = 's';
    }
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (event.code === 'Space' || event.key === 'ArrowUp') skateEndlessInput.up = false;
    if (event.code === 'Space') {
        skateEndlessInput.space = false;
        skateEndlessInput.spaceReleased = true;
    }
    if (event.key === 'ArrowDown') skateEndlessInput.down = false;
    if (key === 'a') skateEndlessInput.a = false;
    if (key === 'd') skateEndlessInput.d = false;
    if (key === 'w') skateEndlessInput.w = false;
    if (key === 's') skateEndlessInput.s = false;
});

function skateEndlessReset() {
    skateGame.state = 'TUTORIAL';
    skateGame.score = 0;
    skateGame.highScore = 25000;
    skateGame.distanceScore = 0;
    skateGame.styleScore = 0;
    skateGame.distance = 0;
    skateGame.elapsed = 0;
    skateGame.speed = .9;
    skateGame.comboLevel = 0;
    skateGame.comboMultiplier = 1;
    skateGame.styleTimer = 0;
    skateGame.styleDecay = 0;
    skateGame.lastStyle = '';
    skateGame.lastStyleTimer = 0;
    skateGame.routeHistory = [];
    skateGame.entities = [];
    skateGame.levelLength = 7000;
    skateGame.levelProgress = 0;
    skateGame.levelFinished = false;
    skateGame.segmentId = 0;
    skateGame.particles = [];
    skateGame.floatingTexts = [];
    skateGame.cameraX = 0;
    skateGame.cameraY = 0;
    skateGame.cameraZoom = 1;
    skateGame.grindBoostTimer = 0;

    const p = skateGame.player;
    // Look-ahead 30/70: Zorp ocupa 30% da largura, com 70% de leitura à frente.
    p.x = Math.round(canvas.width * .30);
    p.y = 255;
    p.vy = 0;
    p.action = 'CRUISE';
    p.frame = 0;
    p.animTimer = 0;
    p.angle = 0;
    p.isGrounded = true;
    p.isGrinding = false;
    p.currentRail = null;
    p.slide = false;
    p.airTrick = false;
    p.trickActive = false;
    p.trickFrames = 0;
    p.trickDuration = 0;
    p.balance = 0;
    p.balanceDrift = 0;
    p.centeredGrindTicks = 0;
    p.route = 'low';
    p.rampCharge = 0;
    p.chargingRamp = null;
    p.fallTimer = 0;

    skateEndlessInput.jumpPressed = false;
    skateEndlessInput.up = false;
    skateEndlessInput.down = false;
    skateEndlessInput.space = false;
    skateEndlessInput.a = false;
    skateEndlessInput.d = false;
    skateEndlessInput.w = false;
    skateEndlessInput.s = false;
    skateEndlessInput.balanceNudge = 0;
    skateEndlessInput.trickRequest = '';
    skateEndlessInput.spaceReleased = false;
    skateEndlessBuildFixedLevel();
}

function resetSkateGame() {
    skateEndlessReset();
}

function skateEndlessMultiplier() {
    return [1, 2, 3, 5, 6, 8, 10][Math.min(6, skateGame.comboLevel)];
}

function skateEndlessStyleCap() {
    const route = skateGame.player.route;
    if (route === 'high') return 6;   // x10 — risco máximo
    if (route === 'medium') return 3; // x5 — rota técnica
    return 1;                         // x2 — asfalto seguro
}

function skateEndlessRegisterStyle(name, basePoints) {
    skateGame.comboLevel = Math.min(skateEndlessStyleCap(), skateGame.comboLevel + 1);
    skateGame.comboMultiplier = skateEndlessMultiplier();
    skateGame.styleTimer = 210;
    skateGame.styleDecay = 0;

    const gained = basePoints * skateGame.comboMultiplier;
    skateGame.styleScore += gained;
    skateGame.score = Math.floor(skateGame.styleScore + skateGame.distanceScore);
    skateGame.lastStyle = `${name}  +${gained}`;
    skateGame.lastStyleTimer = 72;
    // O feedback vive no HUD, nunca sobre o sprite do Zorp.
}

function skateEndlessGameOver(reason) {
    if (skateGame.state !== 'PLAYING') return;
    skateGame.state = 'GAMEOVER';
    skateGame.player.action = 'FALL';
    skateGame.player.isGrinding = false;
    skateGame.player.isGrounded = false;
    skateGame.deathReason = reason;
    skateEndlessInput.jumpPressed = false;
}

function skateEndlessAdd(type, x, extra = {}) {
    skateGame.entities.push({ id: ++skateGame.segmentId, type, x, used: false, ...extra });
}

// Nível único, sem sorteio: cada ponto de risco e cada conexão entre rotas é planejado.
function skateEndlessBuildFixedLevel() {
    const mapScaleX = 7000 / 16580;
    const add = (type, x, extra = {}) => skateEndlessAdd(type, Math.round(x * mapScaleX), extra);
    const ramp = (x, h = 52) => add('ramp', x, { w: 74, h });
    const rail = (x, w, y, tier) => add('rail', x, { w, y, route: true, tier, level: tier === 'high' ? 'fiação' : 'médio' });
    const lowObstacle = (x, type = 'hydrant') => add(type, x, { w: type === 'trash' ? 27 : 18, h: type === 'trash' ? 32 : 22 });
    const ring = (x, y) => add('ring', x, { y, radius: 13 });

    // Setor 01/07 — Praça: apresenta as três alturas com margem para recuperação no asfalto.
    lowObstacle(420, 'hydrant'); ramp(620, 48); rail(744, 170, 160, 'medium');
    lowObstacle(1090, 'trash'); ramp(1320, 60); rail(1445, 175, 120, 'high'); ring(1525, 84); rail(1685, 128, 151, 'medium');
    add('bar', 1900, { w: 54, y: 115, h: 13, tier: 'medium' }); ramp(2040, 54); rail(2160, 190, 154, 'medium');

    // Setor 02/07 — Parque urbano, caixas e primeira travessia completa pela fiação.
    lowObstacle(2590, 'crate'); lowObstacle(2820, 'hydrant'); ramp(3020, 64); rail(3150, 150, 116, 'high');
    ring(3225, 80); add('trickGate', 3370, { w: 17, y: 78, h: 112 }); rail(3460, 170, 105, 'high'); ring(3550, 68);
    rail(3715, 150, 150, 'medium'); lowObstacle(4010, 'trash'); ramp(4230, 52); rail(4355, 170, 156, 'medium');

    // Setor 03/07 — Salto longo; falhar devolve ao chão, acertar mantém a rota alta.
    add('hole', 4730, { w: 58 }); ramp(4900, 70); rail(5035, 140, 112, 'high'); ring(5100, 74);
    add('trickGate', 5240, { w: 17, y: 72, h: 112 }); rail(5330, 205, 98, 'high'); ring(5440, 58);
    rail(5600, 146, 148, 'medium'); lowObstacle(5870, 'hydrant'); ramp(6070, 56); rail(6190, 170, 155, 'medium');

    // Setor 04/07 — Rota média mais densa, com placas que pedem slide durante o grind.
    add('bar', 6550, { w: 56, y: 113, h: 13, tier: 'medium' }); rail(6450, 195, 150, 'medium');
    ramp(6820, 66); rail(6950, 150, 114, 'high'); ring(7025, 74); rail(7160, 135, 137, 'medium');
    lowObstacle(7460, 'trash'); add('hole', 7700, { w: 64 }); ramp(7890, 62); rail(8020, 170, 116, 'high');
    add('trickGate', 8210, { w: 17, y: 74, h: 108 }); rail(8300, 200, 100, 'high'); ring(8400, 61);

    // Setor 05/07 — Intervalo baixo de recuperação e retomada para os telhados.
    lowObstacle(8720, 'hydrant'); lowObstacle(8970, 'crate'); ramp(9200, 52); rail(9320, 185, 157, 'medium');
    ramp(9600, 68); rail(9735, 155, 112, 'high'); ring(9810, 73); rail(9945, 165, 125, 'high');
    add('bar', 10145, { w: 56, y: 109, h: 13, tier: 'medium' }); rail(10070, 190, 149, 'medium');

    // Setor 06/07 — Final radical, rota alta longa e chegada no asfalto.
    add('hole', 10500, { w: 62 }); ramp(10690, 72); rail(10830, 160, 108, 'high'); ring(10910, 69);
    add('trickGate', 11030, { w: 17, y: 70, h: 113 }); rail(11120, 190, 94, 'high'); ring(11220, 52);
    rail(11390, 145, 125, 'high'); ramp(11600, 58); rail(11725, 175, 151, 'medium');
    lowObstacle(12010, 'trash'); ramp(12230, 64); rail(12360, 175, 115, 'high'); ring(12442, 75);
    rail(12600, 160, 150, 'medium'); lowObstacle(12900, 'hydrant'); add('hole', 13120, { w: 66 });

    // Setor 07/07 — Chegada: ainda técnico, sem geração adicional depois dele.
    ramp(13320, 68); rail(13455, 160, 111, 'high'); ring(13530, 71); rail(13660, 175, 150, 'medium');
    lowObstacle(14040, 'crate'); ramp(14250, 58); rail(14375, 190, 153, 'medium');
    ramp(14780, 70); rail(14920, 220, 106, 'high'); ring(15030, 65); rail(15195, 145, 145, 'medium');
    lowObstacle(15530, 'trash'); ramp(15760, 62); rail(15890, 165, 151, 'medium');
    add('finish', 16580, { w: 48 });
}

function skateEndlessUpdateEffects() {
    for (let i = skateGame.particles.length - 1; i >= 0; i--) {
        const particle = skateGame.particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        if (particle.life <= 0) skateGame.particles.splice(i, 1);
    }
    for (let i = skateGame.floatingTexts.length - 1; i >= 0; i--) {
        const text = skateGame.floatingTexts[i];
        text.y += text.vy;
        text.life--;
        text.alpha = text.life / 70;
        if (text.life <= 0) skateGame.floatingTexts.splice(i, 1);
    }
}

function skateEndlessRampUnderPlayer(p) {
    return skateGame.entities.find(entity =>
        entity.type === 'ramp' && !entity.used && p.x + 10 >= entity.x && p.x - 8 <= entity.x + entity.w
    );
}

function skateEndlessLaunchRamp(p, ramp) {
    ramp.used = true;
    const charge = Math.min(1, p.rampCharge);
    p.isGrounded = false;
    p.vy = -(8.7 + charge * 5.5);
    p.action = 'OLLIE';
    p.frame = 0;
    p.airTrick = false;
    p.chargingRamp = null;
    p.rampCharge = 0;
    skateGame.lastStyle = charge > .76 ? 'LANÇAMENTO PERFEITO — ROTA ALTA' : charge > .35 ? 'LANÇAMENTO TÉCNICO — ROTA MÉDIA' : 'LANÇAMENTO BAIXO';
    skateGame.lastStyleTimer = 50;
}

function skateEndlessStartAirTrick(p, name, action, duration, points) {
    if (p.trickActive || p.isGrounded || p.isGrinding) return;
    p.trickActive = true;
    p.airTrick = true;
    p.trickFrames = 0;
    p.trickDuration = duration;
    p.action = action;
    p.frame = 0;
    skateEndlessRegisterStyle(name, points);
}

function skateEndlessReadAirCombo(p) {
    // Cada manobra é iniciada manualmente durante o voo; não há pontuação automática.
    const input = skateEndlessInput.trickRequest;
    if (!input || p.trickActive) return;
    if (input === 'a' || input === 'd') {
        skateEndlessStartAirTrick(p, input === 'a' ? 'KICKFLIP' : 'HEELFLIP', 'KICKFLIP', 28, 360);
    } else if (input === 'w') {
        skateEndlessStartAirTrick(p, '360° SPIN', 'SPIN', 34, 500);
    } else if (input === 's') {
        skateEndlessStartAirTrick(p, 'INDY GRAB', 'GRAB', 24, 410);
    }
    skateEndlessInput.trickRequest = '';
}

function skateEndlessTryRail(p) {
    if (p.vy <= 0) return false;
    for (const rail of skateGame.entities) {
        if (rail.type !== 'rail') continue;
        const crossesRail = p.x >= rail.x - 9 && p.x <= rail.x + rail.w + 9;
        const previousFeetY = p.y - p.vy;
        if (crossesRail && previousFeetY <= rail.y && p.y >= rail.y) {
            p.isGrinding = true;
            p.currentRail = rail;
            p.y = rail.y;
            p.vy = 0;
            p.angle = 0;
            p.action = 'GRIND';
            p.airTrick = false;
            p.trickActive = false;
            p.route = rail.tier === 'high' ? 'high' : 'medium';
            p.balance = (Math.random() < .5 ? -1 : 1) * .13;
            p.balanceDrift = (Math.random() < .5 ? -1 : 1) * (rail.tier === 'high' ? .018 : .009);
            p.centeredGrindTicks = 0;
            rail.grindTicks = 0;
            skateEndlessRegisterStyle('50-50 GRIND', 300);
            return true;
        }
    }
    return false;
}

function skateEndlessHitObstacle(p) {
    const bodyTop = p.slide ? p.y - 25 : p.y - 46;
    const bodyLeft = p.x - 11;
    const bodyRight = p.x + 12;
    for (const entity of skateGame.entities) {
        if (entity.type === 'hole') {
            if (bodyRight > entity.x && bodyLeft < entity.x + entity.w && p.isGrounded) {
                skateEndlessGameOver('Zorp caiu no buraco');
                return;
            }
        }
        if (entity.type === 'crate' || entity.type === 'trash' || entity.type === 'hydrant') {
            const overlaps = bodyRight > entity.x && bodyLeft < entity.x + entity.w;
            if (overlaps && p.y > 255 - entity.h + 4) {
                skateEndlessGameOver(entity.type === 'hydrant' ? 'Colisão com hidrante' : 'Colisão com obstáculo');
                return;
            }
        }
        if (entity.type === 'bar') {
            const overlaps = bodyRight > entity.x && bodyLeft < entity.x + entity.w;
            if (overlaps && !p.slide && !skateEndlessInput.s && p.y > entity.y - 3) {
                skateEndlessGameOver('Era preciso deslizar');
                return;
            }
        }
        if (entity.type === 'trickGate') {
            if (entity.used) continue;
            const overlapsX = bodyRight > entity.x && bodyLeft < entity.x + entity.w;
            const overlapsY = p.y > entity.y && bodyTop < entity.y + entity.h;
            if (overlapsX && overlapsY) {
                if (!p.airTrick) {
                    skateEndlessGameOver('A barreira exigia uma manobra aérea');
                    return;
                }
                if (!entity.used) {
                    entity.used = true;
                    skateEndlessRegisterStyle('KICKFLIP BARRIER', 380);
                    spawnSkateParticle(entity.x, p.y - 22, -1, -1.5, '#ff66c4', 4, 24, 'spark');
                }
            }
        }
        if (entity.type === 'ring' && !entity.used) {
            const dx = p.x - entity.x;
            const dy = p.y - entity.y;
            if (dx * dx + dy * dy < (entity.radius + 15) * (entity.radius + 15) && p.airTrick) {
                entity.used = true;
                skateEndlessRegisterStyle('ANEL CÓSMICO', 460);
                skateGame.special = Math.min(100, (skateGame.special || 0) + 22);
            }
        }
    }
}

function skateEndlessUpdatePlayer() {
    const p = skateGame.player;
    p.slide = skateEndlessInput.down && p.isGrounded && !p.isGrinding;

    if (p.isGrinding) {
        const rail = p.currentRail;
        p.y = rail.y;
        rail.grindTicks++;
        // O trilho empurra gradualmente o equilíbrio para um lado; A/D são correções por toque.
        const highRail = rail.tier === 'high';
        p.balanceDrift += (Math.random() - .5) * (highRail ? .012 : .006);
        p.balanceDrift = Math.max(highRail ? -.058 : -.034, Math.min(highRail ? .058 : .034, p.balanceDrift));
        p.balance += p.balanceDrift + skateEndlessInput.balanceNudge;
        skateEndlessInput.balanceNudge = 0;
        if (Math.abs(p.balance) >= 1) {
            skateEndlessGameOver('Zorp perdeu o equilíbrio no grind');
            return;
        }
        if (Math.abs(p.balance) < .23) p.centeredGrindTicks++;
        else p.centeredGrindTicks = 0;
        if (p.centeredGrindTicks > 0 && p.centeredGrindTicks % 18 === 0) {
            skateEndlessRegisterStyle(highRail ? 'FIAÇÃO RADICAL' : 'GRIND ESTÁVEL', highRail ? 175 : 105);
            spawnSkateParticle(p.x - 9, p.y, -1.2, -Math.random() * 1.5, '#7df9ff', 2, 14, 'spark');
        }
        if (rail.x + rail.w < p.x - 7 || skateEndlessInput.jumpPressed) {
            const cleanExit = Math.abs(p.balance) < .3 && p.centeredGrindTicks >= 18;
            p.isGrinding = false;
            p.isGrounded = false;
            p.currentRail = null;
            p.vy = cleanExit ? -9.6 : -8.2;
            p.action = 'OLLIE';
            p.frame = 0;
            p.airTrick = false;
            if (cleanExit) {
                skateGame.grindBoostTimer = 110;
                skateEndlessRegisterStyle('SAÍDA PERFEITA', 280);
            }
        }
        return;
    }

    if (p.isGrounded) {
        p.y = 255;
        p.route = 'low';
        p.action = p.slide ? 'CARVE' : 'CRUISE';
        const ramp = skateEndlessRampUnderPlayer(p);
        if (ramp) {
            if (skateEndlessInput.space) {
                p.chargingRamp = ramp;
                p.rampCharge = Math.min(1, p.rampCharge + .025);
                p.action = 'CHARGE';
            } else if (p.chargingRamp === ramp && skateEndlessInput.spaceReleased) {
                skateEndlessLaunchRamp(p, ramp);
            }
        } else if (skateEndlessInput.jumpPressed) {
            p.isGrounded = false;
            p.vy = -8.45;
            p.action = 'OLLIE';
            p.frame = 0;
            p.airTrick = false;
        }
    } else {
        p.vy += 0.31;
        p.y += p.vy;
        // A rota é também uma leitura espacial: o jogador sobe/desce entre os três planos.
        p.route = p.y <= 138 ? 'high' : p.y <= 195 ? 'medium' : 'low';
        skateEndlessReadAirCombo(p);
        if (p.trickActive) {
            p.trickFrames++;
            if (p.trickFrames >= p.trickDuration) {
                p.trickActive = false;
                p.airTrick = false;
                p.action = 'OLLIE';
                p.frame = 2;
            }
        }
        if (skateEndlessTryRail(p)) return;

        if (p.y >= 255) {
            let overHole = false;
            for (const entity of skateGame.entities) {
                if (entity.type === 'hole' && p.x + 10 > entity.x && p.x - 10 < entity.x + entity.w) {
                    overHole = true;
                    break;
                }
            }
            if (overHole) {
                skateEndlessGameOver('Zorp caiu no buraco');
                return;
            }
            if (p.trickActive) {
                skateEndlessGameOver('Wipeout: manobra aterrissou antes do frame final');
                return;
            }
            p.y = 255;
            p.vy = 0;
            p.isGrounded = true;
            p.angle = 0;
            p.action = 'LAND';
            p.airTrick = false;
        }
    }
}

function skateEndlessUpdateCombo() {
    if (skateGame.styleTimer > 0) {
        skateGame.styleTimer--;
        return;
    }
    if (skateGame.comboLevel > 0) {
        skateGame.styleDecay++;
        if (skateGame.styleDecay >= 55) {
            skateGame.styleDecay = 0;
            skateGame.comboLevel--;
            skateGame.comboMultiplier = skateEndlessMultiplier();
            skateGame.lastStyle = `ESTILO CAINDO — x${skateGame.comboMultiplier}`;
            skateGame.lastStyleTimer = 55;
        }
    }
}

function updateSkateGame() {
    if (skateGame.state === 'TUTORIAL') {
        if (skateEndlessInput.jumpPressed) {
            skateGame.state = 'PLAYING';
            skateEndlessInput.jumpPressed = false;
        }
        return;
    }
    if (skateGame.state === 'GAMEOVER') {
        if (skateEndlessInput.jumpPressed || keys.r) {
            skateEndlessReset();
            skateEndlessInput.jumpPressed = false;
            keys.r = false;
        }
        return;
    }
    if (skateGame.state === 'FINISH') {
        if (skateEndlessInput.jumpPressed || keys.r) {
            skateEndlessReset();
            skateEndlessInput.jumpPressed = false;
            keys.r = false;
        }
        return;
    }

    skateGame.elapsed++;
    if (skateGame.grindBoostTimer > 0) skateGame.grindBoostTimer--;
    // 7.000px planejados a esta curva rendem cerca de 90–100s de percurso.
    const baseSpeed = Math.min(1.65, .9 + skateGame.elapsed / 7000);
    skateGame.speed = baseSpeed + (skateGame.grindBoostTimer > 0 ? .3 : 0);
    skateGame.distance += skateGame.speed;
    skateGame.levelProgress += skateGame.speed;
    skateGame.distanceScore += skateGame.speed * 0.065;
    skateGame.score = Math.floor(skateGame.styleScore + skateGame.distanceScore);

    for (const entity of skateGame.entities) entity.x -= skateGame.speed;
    skateGame.entities = skateGame.entities.filter(entity => entity.x + (entity.w || 10) > -80);
    skateEndlessUpdatePlayer();
    if (skateGame.state === 'PLAYING') skateEndlessHitObstacle(skateGame.player);
    skateEndlessUpdateCombo();
    skateEndlessUpdateEffects();
    // A câmera acompanha o ganho de altura sem perder a referência da rota abaixo.
    const cameraTarget = Math.max(0, Math.min(72, (180 - skateGame.player.y) * 0.38));
    // Deadzone vertical com Lerp 0.08: acompanha projeções sem tremular em ollies curtos.
    skateGame.cameraY += (cameraTarget - skateGame.cameraY) * .08;
    const zoomTarget = skateGame.player.route === 'high' ? .91 : 1;
    skateGame.cameraZoom += (zoomTarget - skateGame.cameraZoom) * .08;
    if (skateGame.lastStyleTimer > 0) skateGame.lastStyleTimer--;
    skateEndlessInput.jumpPressed = false;
    skateEndlessInput.spaceReleased = false;
    skateEndlessInput.trickRequest = '';

    if (skateGame.levelProgress >= skateGame.levelLength || skateGame.entities.some(entity => entity.type === 'finish' && entity.x <= skateGame.player.x)) {
        skateGame.state = 'FINISH';
        skateGame.levelFinished = true;
        return;
    }

    const p = skateGame.player;
    p.animTimer++;
    if (p.animTimer >= 5) {
        p.animTimer = 0;
        p.frame++;
        if (p.action === 'OLLIE' && p.frame >= 4) p.frame = 3;
        if (p.action === 'LAND' && p.frame >= 4) { p.action = 'CRUISE'; p.frame = 0; }
        if (p.action === 'KICKFLIP' && p.frame >= 6) {
            // A animação continua ativa durante todo o voo, inclusive ao atravessar barreiras.
            if (p.isGrounded) p.action = 'CRUISE';
            p.frame = 0;
        }
    }
}

function skateEndlessDrawCity() {
    const sky = ctx.createLinearGradient(0, 0, 0, 300);
    sky.addColorStop(0, '#0c1029');
    sky.addColorStop(0.62, '#4c1d65');
    sky.addColorStop(1, '#d85f3c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Camada 1: céu alienígena, névoa e lua dupla.
    ctx.fillStyle = 'rgba(126, 255, 237, .12)'; ctx.beginPath(); ctx.arc(92, 48, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8fff4'; ctx.beginPath(); ctx.arc(92, 48, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8bc8'; ctx.beginPath(); ctx.arc(128, 27, 9, 0, Math.PI * 2); ctx.fill();
    const haze = ctx.createLinearGradient(0, 80, 0, 210);
    haze.addColorStop(0, 'rgba(54, 225, 255, 0)'); haze.addColorStop(1, 'rgba(255, 62, 176, .17)');
    ctx.fillStyle = haze; ctx.fillRect(0, 78, canvas.width, 145);
    const motion = (skateGame.elapsed * skateGame.speed * 0.13) % 74;
    const cam = Math.round(skateGame.cameraY || 0);
    const streetY = 255 - cam;
    // Skyline distante: a câmera sobe lentamente em parallax com o Zorp.
    for (let i = -1; i < 8; i++) {
        const x = i * 74 - motion;
        const h = 55 + ((i * 23 + 79) % 58);
        ctx.fillStyle = '#17152d';
        ctx.fillRect(x, 202 - h - cam * .12, 59, h);
        ctx.fillStyle = 'rgba(91, 245, 255, .33)';
        ctx.fillRect(x + 12, 174 - h / 2 - cam * .12, 6, 7);
        ctx.fillRect(x + 35, 190 - h / 3 - cam * .12, 6, 7);
    }
    // Camada 5: skyline distante do kit modular (parallax 0.1x–0.2x).
    const farMotion = (skateGame.levelProgress * .14) % 130;
    for (let i = -1; i < 5; i++) drawSkateModule('building', i * 130 - farMotion, 84 - cam * .1, 72, 142, .42);
    // Prédios próximos, árvores alienígenas e postes deixam a pista com profundidade urbana.
    const nearMotion = (skateGame.elapsed * skateGame.speed * .32) % 118;
    for (let i = -1; i < 6; i++) {
        const x = i * 118 - nearMotion;
        const roof = 150 + (i % 2) * 18 - cam * .28;
        ctx.fillStyle = '#202a3b'; ctx.fillRect(x, roof, 87, streetY - roof);
        ctx.fillStyle = '#f44ea2'; ctx.fillRect(x + 14, roof + 18, 19, 5);
        ctx.fillStyle = '#4af2e6'; ctx.fillRect(x + 52, roof + 34, 12, 7);
        ctx.strokeStyle = 'rgba(126, 249, 255, .52)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 14, 104 - cam * .4); ctx.lineTo(x + 104, 92 - cam * .4); ctx.stroke();
        ctx.fillStyle = '#192f35'; ctx.fillRect(x + 91, streetY - 29, 4, 29);
        ctx.fillStyle = '#1e5960'; ctx.beginPath(); ctx.arc(x + 93, streetY - 36, 13, 0, Math.PI * 2); ctx.fill();
    }
    // Camada 4: prédios e outdoor do kit em 0.4x.
    const midMotion = (skateGame.levelProgress * .4) % 170;
    for (let i = -1; i < 4; i++) {
        drawSkateModule('building', i * 170 - midMotion, 92 - cam * .23, 93, 181, .82);
        if (i % 2 === 0) drawSkateModule('billboard', i * 170 + 90 - midMotion, 126 - cam * .22, 46, 69, .84);
    }
    ctx.fillStyle = '#303946';
    ctx.fillRect(0, streetY, canvas.width, 300 - streetY);
    ctx.fillStyle = '#d4a72c';
    ctx.fillRect(0, streetY, canvas.width, 3);
    // Gameplay_Back + Foreground: muro, luminárias, folhagem e grade passam por trás/à frente.
    const frontMotion = (skateGame.levelProgress * 1.2) % 150;
    for (let i = -1; i < 5; i++) {
        drawSkateModule('wall', i * 150 - frontMotion, streetY - 72, 88, 67, .55);
        drawSkateModule('lamp', i * 150 + 100 - frontMotion, streetY - 112, 35, 84, .93);
        drawSkateModule('foliage', i * 150 + 67 - frontMotion, streetY - 42, 55, 35, .83);
    }
    for (let x = -frontMotion; x < canvas.width; x += 150) drawSkateModule('asphalt', x, streetY - 2, 64, 58, .86);
    ctx.strokeStyle = '#26303b';
    for (let x = -motion; x < canvas.width; x += 74) {
        ctx.beginPath(); ctx.moveTo(x, streetY + 3); ctx.lineTo(x + 15, 300); ctx.stroke();
    }
}

function skateEndlessDrawEntity(entity) {
    if (entity.type === 'ramp') {
        if (drawSkateModule(entity.h >= 62 ? 'rampHigh' : 'rampLow', entity.x - 4, 255 - entity.h - 4, entity.w + 8, entity.h + 9)) return;
        ctx.fillStyle = '#6c7a89';
        ctx.beginPath();
        ctx.moveTo(entity.x, 255);
        ctx.lineTo(entity.x + entity.w, 255 - entity.h);
        ctx.lineTo(entity.x + entity.w, 255);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d6e6ef'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(entity.x, 255); ctx.lineTo(entity.x + entity.w, 255 - entity.h); ctx.stroke();
        return;
    }
    if (entity.type === 'rail') {
        if (drawSkateModule(entity.tier === 'high' ? 'railRise' : 'railMedium', entity.x, entity.y - 6, entity.w, entity.tier === 'high' ? 40 : 30)) return;
        ctx.strokeStyle = entity.tier === 'high' ? '#ffe979' : '#d8f7ff'; ctx.lineWidth = entity.tier === 'high' ? 2 : 4;
        ctx.beginPath(); ctx.moveTo(entity.x, entity.y); ctx.lineTo(entity.x + entity.w, entity.y); ctx.stroke();
        ctx.strokeStyle = '#7e94a4'; ctx.lineWidth = 2;
        for (let x = entity.x + 15; x < entity.x + entity.w; x += 42) {
            ctx.beginPath(); ctx.moveTo(x, entity.y); ctx.lineTo(x, 255); ctx.stroke();
        }
        return;
    }
    if (entity.type === 'ring') {
        if (entity.used) return;
        ctx.strokeStyle = '#ffea63'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#f25cc1'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(entity.x, entity.y, entity.radius + 4, 0, Math.PI * 2); ctx.stroke();
        return;
    }
    if (entity.type === 'hole') {
        ctx.fillStyle = '#111827'; ctx.fillRect(entity.x, 255, entity.w, 45);
        ctx.fillStyle = '#05080d'; ctx.fillRect(entity.x + 5, 260, entity.w - 10, 20);
        return;
    }
    if (entity.type === 'crate' || entity.type === 'trash' || entity.type === 'hydrant') {
        if (entity.type === 'crate' && drawSkateModule('crate', entity.x - 3, 255 - entity.h - 4, entity.w + 7, entity.h + 7)) return;
        if (entity.type === 'trash' && drawSkateModule('trash', entity.x - 5, 255 - entity.h - 4, entity.w + 10, entity.h + 7)) return;
        if (entity.type === 'hydrant') {
            ctx.fillStyle = '#ff4c5f'; ctx.fillRect(entity.x + 4, 255 - entity.h, entity.w - 8, entity.h);
            ctx.fillRect(entity.x, 255 - entity.h + 7, entity.w, 6); ctx.fillStyle = '#ffb35e'; ctx.fillRect(entity.x + 6, 255 - entity.h - 4, entity.w - 12, 5);
            return;
        }
        if (entity.type === 'trash') {
            ctx.fillStyle = '#4b6273'; ctx.fillRect(entity.x, 255 - entity.h, entity.w, entity.h);
            ctx.fillStyle = '#8bd7dc'; ctx.fillRect(entity.x - 2, 255 - entity.h - 4, entity.w + 4, 5);
            return;
        }
        ctx.fillStyle = '#b76231'; ctx.fillRect(entity.x, 255 - entity.h, entity.w, entity.h);
        ctx.strokeStyle = '#f5ba78'; ctx.strokeRect(entity.x + 2, 257 - entity.h, entity.w - 4, entity.h - 4);
        ctx.beginPath(); ctx.moveTo(entity.x, 255 - entity.h); ctx.lineTo(entity.x + entity.w, 255); ctx.moveTo(entity.x + entity.w, 255 - entity.h); ctx.lineTo(entity.x, 255); ctx.stroke();
        return;
    }
    if (entity.type === 'bar') {
        ctx.fillStyle = '#ff5ea8'; ctx.fillRect(entity.x, entity.y, entity.w, entity.h);
        ctx.fillStyle = '#c92e75'; ctx.fillRect(entity.x + 7, entity.y + entity.h, 4, 255 - entity.y - entity.h);
        ctx.fillRect(entity.x + entity.w - 11, entity.y + entity.h, 4, 255 - entity.y - entity.h);
        return;
    }
    if (entity.type === 'trickGate') {
        ctx.fillStyle = entity.used ? 'rgba(94, 255, 199, .24)' : 'rgba(255, 55, 169, .46)';
        ctx.fillRect(entity.x, entity.y, entity.w, entity.h);
        ctx.strokeStyle = entity.used ? '#83ffd1' : '#ff75c2'; ctx.lineWidth = 2;
        ctx.strokeRect(entity.x, entity.y, entity.w, entity.h);
        ctx.fillStyle = '#ffe66d'; ctx.fillRect(entity.x - 4, entity.y - 5, entity.w + 8, 4);
        return;
    }
    if (entity.type === 'finish') {
        ctx.fillStyle = '#ffd95d'; ctx.fillRect(entity.x, 78, 5, 177);
        ctx.fillStyle = '#48ffe0'; ctx.fillRect(entity.x + 5, 82, entity.w, 27);
        ctx.fillStyle = '#081525'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('CHEGADA', entity.x + 28, 99);
    }
}

function skateEndlessDrawZorp() {
    const p = skateGame.player;
    const sprite = getZorpSkateSprite();
    ctx.save();
    ctx.globalAlpha = p.action === 'FALL' ? .65 : 1;
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const scale = .48;
        const width = sprite.naturalWidth * scale;
        const height = sprite.naturalHeight * scale;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle || 0);
        ctx.drawImage(sprite, -width / 2, -height, width, height);
    } else {
        ctx.fillStyle = '#61f2ff'; ctx.fillRect(p.x - 10, p.y - 35, 20, 35);
    }
    ctx.restore();
}

function skateEndlessDrawBalanceMeter() {
    const p = skateGame.player;
    if (!p.isGrinding) return;
    const x = p.x - 25;
    const y = p.y - 73;
    ctx.fillStyle = 'rgba(3, 12, 25, .9)'; ctx.fillRect(x, y, 50, 9);
    ctx.strokeStyle = '#dcefff'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 50, 9);
    ctx.fillStyle = '#4ef4d5'; ctx.fillRect(x + 22, y + 2, 6, 5);
    const markerX = x + 25 + p.balance * 21;
    ctx.fillStyle = Math.abs(p.balance) > .7 ? '#ff5a91' : '#ffe76b';
    ctx.fillRect(markerX - 2, y + 1, 4, 7);
}

function skateEndlessDrawForeground() {
    // Layer 1 Foreground: grade e folhagem atravessam o plano do personagem em 1.2x.
    const motion = (skateGame.levelProgress * 1.2) % 190;
    for (let x = -190 - motion; x < canvas.width + 120; x += 190) {
        drawSkateModule('fence', x, 226, 74, 50, .52);
        drawSkateModule('foliage', x + 58, 242, 53, 34, .74);
    }
}

function skateEndlessDrawHud() {
    ctx.fillStyle = 'rgba(7, 12, 26, .9)'; ctx.fillRect(0, 0, 450, 43);
    ctx.strokeStyle = '#53ecff'; ctx.strokeRect(0, 0, 450, 43);
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe65a'; ctx.fillText(`PONTOS ${String(skateGame.score).padStart(6, '0')}`, 9, 15);
    ctx.font = '8px monospace'; ctx.fillStyle = '#b9c8d4';
    ctx.fillText(`PISTA ${Math.min(100, Math.floor(100 * skateGame.levelProgress / skateGame.levelLength))}%  +${Math.floor(skateGame.distanceScore)}`, 9, 31);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ff8abf'; ctx.font = 'bold 10px monospace';
    ctx.fillText(`ESTILO x${skateGame.comboMultiplier}`, 225, 15);
    ctx.font = '7px monospace'; ctx.fillStyle = '#d6e6ef';
    ctx.fillText('MANOBRAS + GRINDS = PONTUAÇÃO ALTA', 225, 30);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
    ctx.fillText('RECORDE mestre_skate: 25.000', 441, 16);
    ctx.fillStyle = '#ffda57';
    ctx.fillRect(337, 27, Math.max(0, 96 * skateGame.styleTimer / 210), 5);
    ctx.strokeStyle = '#677889'; ctx.strokeRect(337, 27, 96, 5);
    ctx.fillStyle = skateGame.player.route === 'high' ? '#ff736f' : skateGame.player.route === 'medium' ? '#7ef4ff' : '#d1d5db';
    ctx.textAlign = 'right'; ctx.font = '7px monospace';
    ctx.fillText(`ROTA ${skateGame.player.route === 'high' ? 'ALTA x10' : skateGame.player.route === 'medium' ? 'MÉDIA x5' : 'BAIXA x2'}`, 440, 41);
    if (skateGame.lastStyleTimer > 0 && skateGame.lastStyle) {
        ctx.textAlign = 'center'; ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#fff36b';
        ctx.fillText(skateGame.lastStyle, 225, 61);
    }
    if (skateGame.player.isGrinding) {
        ctx.textAlign = 'center'; ctx.fillStyle = '#71fff1'; ctx.font = 'bold 8px monospace';
        ctx.fillText('GRIND: TOQUE A / D PARA CENTRALIZAR', 225, 75);
    }
    if (skateGame.player.chargingRamp) {
        ctx.textAlign = 'center'; ctx.fillStyle = '#ffeb6c'; ctx.font = 'bold 8px monospace';
        ctx.fillText('SEGURE E SOLTE ESPAÇO NA PONTA DA RAMPA', 225, 75);
        ctx.fillStyle = '#1f2937'; ctx.fillRect(175, 79, 100, 5);
        ctx.fillStyle = '#ff64b4'; ctx.fillRect(176, 80, 98 * skateGame.player.rampCharge, 3);
    }
}

function skateEndlessDrawOverlay(title, lines, color) {
    ctx.fillStyle = 'rgba(3, 7, 18, .86)'; ctx.fillRect(28, 58, 394, 184);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(28, 58, 394, 184);
    ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = 'bold 17px monospace'; ctx.fillText(title, 225, 91);
    ctx.font = '9px monospace'; ctx.fillStyle = '#f1f5f9';
    lines.forEach((line, index) => ctx.fillText(line, 225, 121 + index * 21));
}

function drawSkateGame() {
    ctx.imageSmoothingEnabled = false;
    skateEndlessDrawCity();
    ctx.save();
    const zoom = skateGame.cameraZoom || 1;
    ctx.translate(canvas.width / 2, 245);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -245);
    ctx.translate(0, -Math.round(skateGame.cameraY || 0));
    for (const entity of skateGame.entities) skateEndlessDrawEntity(entity);
    for (const particle of skateGame.particles) {
        ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    skateEndlessDrawZorp();
    skateEndlessDrawBalanceMeter();
    for (const text of skateGame.floatingTexts) {
        ctx.save(); ctx.globalAlpha = Math.max(0, text.alpha); ctx.fillStyle = text.color;
        ctx.textAlign = 'center'; ctx.font = `bold ${text.size}px monospace`; ctx.fillText(text.text, text.x, text.y); ctx.restore();
    }
    ctx.restore();
    skateEndlessDrawForeground();
    skateEndlessDrawHud();

    if (skateGame.state === 'TUTORIAL') {
        skateEndlessDrawOverlay('ENDLESS SKATE: ESTILO', [
            'ESPAÇO: OLLIE  |  ESPAÇO + A/D: FLIP',
            'ESPAÇO + W: 360°  |  ESPAÇO + S: GRAB',
            'NO GRIND: alterne A/D e mantenha a barra central.',
            'NA RAMPA: SEGURE E SOLTE ESPAÇO PARA ESCOLHER A ALTURA.',
            'Aterre apenas depois de concluir a animação.',
            'Pressione ESPAÇO para começar'
        ], '#61f2ff');
    } else if (skateGame.state === 'GAMEOVER') {
        skateEndlessDrawOverlay('GAME OVER', [
            `Pontuação final: ${skateGame.score.toLocaleString()} pts`,
            'Recorde do Mestre: 25.000 pts',
            'Recordista: mestre_skate',
            skateGame.deathReason || 'A queda encerrou a corrida.',
            'ESPAÇO para tentar novamente'
        ], '#ff6b8f');
        // Usa o sprite fornecido do recordista sem criar ou substituir a arte do Mestre.
        if (imgMestreSkate && imgMestreSkate.complete && imgMestreSkate.naturalWidth > 0) {
            ctx.drawImage(imgMestreSkate, 354, 177, 48, 48);
        }
    } else if (skateGame.state === 'FINISH') {
        drawSkateModule('arena', 105, 156, 240, 136, 1);
        skateEndlessDrawOverlay('FIM DA PISTA!', [
            `Pontuação final: ${skateGame.score.toLocaleString()} pts`,
            `Recorde mestre_skate: ${skateGame.highScore.toLocaleString()} pts`,
            skateGame.score >= skateGame.highScore ? 'NOVO RECORDE RADICAL!' : 'Use a rota alta para multiplicadores até x10.',
            'ESPAÇO para correr novamente'
        ], skateGame.score >= skateGame.highScore ? '#67f7ad' : '#61f2ff');
    }
    ctx.textAlign = 'left';
}

skateEndlessReset();

// -----------------------------------------------------------------------------
// FASE FIXA 2.0 — substitui apenas o fluxo do skate abaixo. A base do projeto
// (canvas, loop, cena JOGO_SKATE, módulos, partículas e sprites existentes)
// continua sendo reutilizada.
// -----------------------------------------------------------------------------

const fixedSkateInput = { left: false, right: false, down: false, space: false, jump: false, trick: '', grindTrick: '' };
const fixedSpriteCache = new Map();
function fixedFrames(sheet, group, count, order) {
    return (order || Array.from({length:count}, (_,i)=>i+1)).map(i=> {
        const file = `zorp_skate_pro${sheet}_${group}_${String(i).padStart(2,'0')}.png`;
        if (!fixedSpriteCache.has(file)) {
            const img = new Image(); img.src = 'skate_sprites/' + file + '?v=3';
            fixedSpriteCache.set(file, img);
        }
        return [fixedSpriteCache.get(file),0,0,256,256,file];
    });
}
// Fundo separado da geometria da fase: repete apenas como skyline/parallax.
const fixedSkateBackground = new Image();
fixedSkateBackground.src = 'background_skate.png?v=1';

// Catálogo recortado dos três kits. O manifesto é a fonte de verdade para os
// caminhos e também permite que o QA confirme todos os PNGs antes da corrida.
const fixedKitCatalog = {
    manifest: null, images: new Map(), loaded: 0, failed: [], drawn: new Set(), ready: false, promise: null
};
const fixedKit = Object.freeze({
    rampQuarter: 'ramps/quarter/ramp_cyan_kit1_01.png',
    rampLongCyan: 'ramps/medium/ramp_cyan_kit1_03.png',
    rampLongMagenta: 'ramps/medium/ramp_magenta_kit1_04.png',
    rampGarden: 'ramps/medium/ramp_cyan_kit1_05.png',
    rampIndustrial: 'ramps/medium/ramp_cyan_kit1_06.png',
    rampSmall: 'ramps/small/ramp_cyan_kit2_06.png',
    railStraightCyan: 'rails/straight/rail_cyan_kit2_08.png',
    railStraightMagenta: 'rails/straight/rail_magenta_kit2_09.png',
    railSlopeCyan: 'rails/sloped/rail_cyan_kit2_01.png',
    railSlopeMagenta: 'rails/sloped/rail_magenta_kit2_03.png',
    railCurve: 'rails/curved/rail_cyan_kit1_03.png',
    cableTaut: 'cables/sag/cable_magenta_kit2_02.png',
    cableSag: 'cables/sag/cable_cyan_kit2_05.png',
    cableTower: 'cables/supports/cable_magenta_kit2_01.png',
    platformBeach: 'platforms/industrial/platform_cyan_kit1_05.png',
    platformUrban: 'platforms/industrial/platform_cyan_kit1_07.png',
    platformEdgeCyan: 'supports/industrial/support_cyan_kit1_08.png',
    platformEdgeMagenta: 'supports/industrial/support_magenta_kit1_07.png',
    bridgeArch: 'bridges/industrial/bridge_cyan_kit3_04.png',
    crane: 'bridges/industrial/bridge_magenta_kit3_03.png',
    tunnelPair: 'tunnels/industrial/tunnel_cyan_kit3_01.png',
    tunnelWide: 'tunnels/industrial/tunnel_cyan_kit3_09.png',
    signArrow: 'signs/directional/sign_cyan_kit3_01.png',
    signCheckpoint: 'signs/directional/sign_cyan_kit3_03.png',
    tropicalLights: 'props/industrial/prop_cyan_kit3_14.png',
    industrialProp: 'props/industrial/prop_yellow_kit3_16.png',
    arena: 'finish/scene/finish_scene_cyan_kit3_01.png'
});

function fixedLoadKitManifest() {
    if (fixedKitCatalog.promise) return fixedKitCatalog.promise;
    fixedKitCatalog.promise = fetch('skate_sprites/exported/sprite_kits_manifest.json?v=2')
        .then(response => {
            if (!response.ok) throw new Error('Manifesto dos kits: HTTP ' + response.status);
            return response.json();
        })
        .then(manifest => {
            fixedKitCatalog.manifest = manifest;
            const jobs = manifest.items.map(entry => new Promise(resolve => {
                const image = new Image();
                image.onload = () => { fixedKitCatalog.loaded++; resolve(true); };
                image.onerror = () => { fixedKitCatalog.failed.push(entry.exportedName); resolve(false); };
                image.src = 'skate_sprites/exported/' + entry.exportedName + '?v=2';
                fixedKitCatalog.images.set(entry.exportedName, image);
            }));
            return Promise.all(jobs);
        })
        .then(() => {
            fixedKitCatalog.ready = fixedKitCatalog.failed.length === 0;
            return fixedKitCatalog;
        })
        .catch(error => {
            fixedKitCatalog.failed.push(String(error));
            return fixedKitCatalog;
        });
    return fixedKitCatalog.promise;
}
fixedLoadKitManifest();
if (typeof window !== 'undefined') window.fixedKitCatalog = fixedKitCatalog;

function fixedDrawKit(path, x, y, width, height, options = {}) {
    const image = fixedKitCatalog.images.get(path);
    if (!image || !image.complete || image.naturalWidth <= 0 || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
    fixedKitCatalog.drawn.add(path);
    const flipX = !!options.flipX, alpha = options.alpha == null ? 1 : options.alpha;
    ctx.save(); ctx.globalAlpha = alpha;
    if (flipX) {
        ctx.translate(Math.round(x + width), 0); ctx.scale(-1, 1);
        ctx.drawImage(image, 0, Math.round(y), Math.round(width), Math.round(height));
    } else ctx.drawImage(image, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    ctx.restore();
    return true;
}

const fixedSkateFrames = {
    IDLE: fixedFrames(4,'idle_on_board',4),
    CRUISE: fixedFrames(4,'rolling_ride',6),
    PUSH: fixedFrames(4,'push_accelerate',6),
    CROUCH: fixedFrames(4,'crouch_jump_prep',3),
    BRAKE: fixedFrames(1,'row03',4),
    BALANCE: fixedFrames(4,'turn_balance',4),
    OLLIE: fixedFrames(1,'row01',4),
    TAKEOFF: fixedFrames(3,'row01',4),
    RAMP_UP: fixedFrames(3,'row01',4),
    RAMP_DOWN: fixedFrames(3,'row02',4),
    AIR_RISE: fixedFrames(3,'row01',4),
    AIR_APEX: fixedFrames(2,'row01',4,[3,4]),
    AIR_FALL: fixedFrames(3,'row02',4),
    KICKFLIP: fixedFrames(3,'row04',5),
    HEELFLIP: fixedFrames(3,'row04',5,[1,4,3,2,5]),
    SPIN: fixedFrames(3,'row03',5),
    GRAB: fixedFrames(3,'row05',4),
    PREPARE_LANDING: fixedFrames(3,'row06',4,[1,2,3]),
    GRIND_ENTER: fixedFrames(2,'row01',4),
    GRIND: fixedFrames(2,'row02',6),
    GRIND_TRICK: fixedFrames(2,'row04',5),
    GRIND_EXIT: fixedFrames(2,'row05',4),
    LAND: fixedFrames(3,'row06',4),
    STUMBLE: fixedFrames(1,'row03',4),
    FALL: fixedFrames(1,'row04',5),
    FAIL: fixedFrames(1,'row05',4),
    WIN: fixedFrames(1,'row06',4)
};

const fixedMoveState = Object.freeze({
    RIDE:'RIDE', RAMP:'RAMP', TAKEOFF:'TAKEOFF', AIR:'AIR', AIR_TRICK:'AIR_TRICK',
    DESCENDING:'DESCENDING', LANDING:'LANDING',
    GRIND_ENTER:'GRIND_ENTER', GRIND:'GRIND', GRIND_TRICK:'GRIND_TRICK', GRIND_EXIT:'GRIND_EXIT',
    STUMBLE:'STUMBLE', FALL:'FALL', FAIL:'FAIL', WIN:'WIN'
});

function fixedSetMoveState(p, state, action) {
    if (p.moveState !== state) { p.moveState = state; p.stateTicks = 0; }
    p.action = action || state;
}

// The authored skate sheets use a left-facing side profile (with a few
// front-facing frames).  The course is forward-only, so this is intentionally
// independent from vx, collision corrections and the current animation state.
function fixedZorpNeedsForwardMirror() { return true; }
const fixedPhysics = Object.freeze({ gravity:.235, maxSpeed:20, push:.17, drag:.006, ollie:5.5 });

window.addEventListener('keydown', function (event) {
    if (currentScene !== 'JOGO_SKATE') return;
    const key = event.key.toLowerCase();
    const jump = event.code === 'Space' || key === 'arrowup';
    if (jump || ['arrowleft', 'arrowright', 'arrowdown', 'a', 'd', 'w', 's'].includes(key)) event.preventDefault();
    if (jump) {
        if (!event.repeat) fixedSkateInput.jump = true;
        fixedSkateInput.space = true;
    }
    if (key === 'a' || key === 'arrowleft') fixedSkateInput.left = true;
    if (key === 'd' || key === 'arrowright') fixedSkateInput.right = true;
    if (key === 's' || key === 'arrowdown') fixedSkateInput.down = true;
    const p = skateGame.player;
    if (event.repeat) return;
    if (p.grinding && fixedSkateInput.space && (key === 'w' || key === 'arrowup' || key === 's' || key === 'arrowdown')) {
        fixedSkateInput.grindTrick = (key === 'w' || key === 'arrowup') ? 'boardslide' : 'grindGrab';
    } else if (!p.grounded && !p.grinding && fixedSkateInput.space) {
        if (key === 'a' || key === 'arrowleft') fixedSkateInput.trick = 'flip';
        else if (key === 'd' || key === 'arrowright') fixedSkateInput.trick = 'heel';
        else if (key === 'w' || key === 'arrowup') fixedSkateInput.trick = 'spin';
        else if (key === 's' || key === 'arrowdown') fixedSkateInput.trick = 'grab';
    }
});

window.addEventListener('keyup', function (event) {
    const key = event.key.toLowerCase();
    if (event.code === 'Space' || key === 'arrowup') fixedSkateInput.space = false;
    if (key === 'a' || key === 'arrowleft') fixedSkateInput.left = false;
    if (key === 'd' || key === 'arrowright') fixedSkateInput.right = false;
    if (key === 's' || key === 'arrowdown') fixedSkateInput.down = false;
});

function fixedLine(x1, y1, x2, y2, kind, launch) {
    return { x1: x1, y1: y1, x2: x2, y2: y2, kind: kind || 'terrain', launch: !!launch };
}
// Set to true only while tuning a new ramp. It draws the exact collision
// polyline over its kit artwork; shipping builds keep this disabled.
const FIXED_SKATE_RAMP_DEBUG = false;
function fixedContains(line, x) { return x >= line.x1 - .1 && x <= line.x2 + .1; }
function fixedY(line, x) {
    const t = Math.max(0, Math.min(1, (x - line.x1) / (line.x2 - line.x1)));
    return line.y1 + (line.y2 - line.y1) * t;
}
function fixedSlope(line) { return (line.y2 - line.y1) / (line.x2 - line.x1); }
function fixedTerrainAt(x) {
    let best = null;
    for (let i = 0; i < skateGame.terrain.length; i++) {
        const line = skateGame.terrain[i];
        if (!fixedContains(line, x)) continue;
        const y = fixedY(line, x);
        if (!best || y < best.y) best = { line: line, y: y, type: 'terrain' };
    }
    return best;
}
function fixedLandingAt(x, oldY, platforms, newY=Infinity, oldX=x) {
    const candidates = [];
    for (const line of [...skateGame.terrain, ...(platforms ? skateGame.platforms : [])]) {
        if (!fixedContains(line,x)) continue;
        const y=fixedY(line,x), before=oldY-fixedY(line,oldX), after=newY-y;
        if (before<=1 && after>=0) candidates.push({line,y,type:skateGame.platforms.includes(line)?'platform':'terrain',t:-before/(after-before||1)});
    }
    candidates.sort((a,b)=>a.t-b.t || a.y-b.y);
    return candidates[0] || null;
}

function fixedBuildLevel() {
    skateGame.levelLength = 13200;
    skateGame.finishX = 13020;
    skateGame.terrain = [];
    skateGame.platforms = [];
    skateGame.rails = [];
    skateGame.obstacles = [];
    skateGame.rings = [];
    skateGame.tunnels = [];
    skateGame.checkpoints = [];
    skateGame.sectionGates = [];

    // The city below remains background-only.  The playable path is composed
    // exclusively from these explicit surfaces, ramps and grind lines.
    const terrainPath = points => points.slice(1).forEach((point,index) =>
        skateGame.terrain.push(fixedLine(points[index][0],points[index][1],point[0],point[1],'terrain',false)));
    const platform = (x1,y1,x2,y2,tier='medium') => {
        const line=fixedLine(x1,y1,x2,y2,tier,false); skateGame.platforms.push(line); return line;
    };
    const ramp = (points, skin, target=skateGame.terrain) => {
        const rampSkin=Object.assign({surface:points},skin);
        points.slice(1).forEach((point,index) => {
            const line=fixedLine(points[index][0],points[index][1],point[0],point[1],'ramp',false);
            line.rampSkin=rampSkin; line.rampDrawOwner=index===0; target.push(line);
        });
    };
    const railPath = (points, options={}) => {
        const group={id:options.id||('rail-'+skateGame.rails.length),type:options.type||'rail'};
        const skin=options.skin?Object.assign({surface:points},options.skin):null;
        let previous=null;
        points.slice(1).forEach((point,index) => {
            const segment={x1:points[index][0],y1:points[index][1],x2:point[0],y2:point[1],tier:options.tier||'medium',type:options.type||'rail',group:group,pathSkin:skin,pathDrawOwner:index===0,next:null};
            if(previous)previous.next=segment; previous=segment; skateGame.rails.push(segment);
        });
    };
    let collectibleId=0;
    const ring=(x,y,value=90,special=false)=>skateGame.rings.push({id:'collect-'+collectibleId++,x,y,radius:special?17:12,value,used:false,special});
    const arc=(x1,x2,baseY,height,count,value=90,specialIndex=-1)=>{
        for(let i=0;i<count;i++){
            const t=count===1?.5:i/(count-1), special=i===specialIndex;
            ring(x1+(x2-x1)*t,baseY-Math.sin(Math.PI*t)*height,special?value*5:value,special);
        }
    };
    const obstacle=(x,y,width=28,height=28,type='crate')=>skateGame.obstacles.push({x,y,width,height,type});
    const gate=(id,x1,x2,y1,y2,label)=>skateGame.sectionGates.push({index:skateGame.sectionGates.length,id,x1,x2,y1,y2,label,complete:false});
    const checkpoint=(x,y,label,requiredSections)=>skateGame.checkpoints.push({
        index:skateGame.checkpoints.length,x,y,spawnX:x-25,spawnY:y,label,requiredSections,
        x1:x-85,x2:x+85,y1:y-90,y2:y+45,active:false
    });

    const smallLaunch={horizontal:.58,maxVx:7,maxUp:8.5,vertical:0};
    const mediumLaunch={horizontal:.65,maxVx:8.5,maxUp:10,vertical:.8};
    const steepLaunch={horizontal:.45,maxVx:6.2,maxUp:10.5,vertical:2.5};
    const megaLaunch={horizontal:.30,maxVx:4.8,maxUp:17,vertical:5};
    const finalRailLaunch={horizontal:.45,maxVx:7,maxUp:8,vertical:.5};

    // SECTION 1 — praia/timing. Muito chão, dois saltos curtos e landings largos.
    terrainPath([[0,260],[520,260]]);
    obstacle(360,260,26,24,'trash');
    arc(330,500,235,48,5,75);
    ramp([[520,260],[575,248],[625,228],[680,205]],
        {path:fixedKit.rampSmall,x:512,y:197,w:178,h:71,flipX:true,label:'kicker praia',launch:smallLaunch});
    platform(680,205,820,205,'medium');
    platform(930,230,1260,230,'medium');
    arc(785,955,210,72,6,85);
    obstacle(1080,230,27,24,'crate');
    ramp([[1260,230],[1320,216],[1380,188],[1435,158]],
        {path:fixedKit.rampLongCyan,x:1252,y:149,w:192,h:89,flipX:true,label:'saída praia',launch:mediumLaunch},skateGame.platforms);
    platform(1510,205,1750,205,'medium');
    arc(1410,1535,177,68,5,90);
    gate('SECTION_1_EXIT',1530,1710,115,265,'PRAIA');
    checkpoint(1620,205,'PRAIA',1);

    // SECTION 2 — cidade/rampas. Cada subida tira velocidade antes do próximo desafio.
    platform(1750,205,2050,205,'medium');
    obstacle(1900,205,28,25,'hydrant');
    ramp([[2050,205],[2110,185],[2170,145],[2240,100]],
        {path:fixedKit.rampLongCyan,x:2042,y:91,w:208,h:122,flipX:true,label:'rampa cidade',launch:mediumLaunch},skateGame.platforms);
    platform(2410,150,2700,150,'medium');
    arc(2210,2435,122,110,7,95,3);
    platform(2700,150,2890,100,'high');
    platform(2890,100,3070,100,'high');
    obstacle(2970,100,28,26,'crate');
    ramp([[3070,100],[3120,89],[3170,70],[3220,52]],
        {path:fixedKit.rampSmall,x:3062,y:44,w:168,h:64,flipX:true,label:'kicker cidade alta',launch:smallLaunch},skateGame.platforms);
    platform(3310,85,3500,85,'high');
    arc(3195,3335,66,76,6,100);
    gate('SECTION_2_EXIT',3330,3485,-5,155,'CIDADE');

    // SECTION 3 — rail district. O desafio é atingir o rail; a saída cai em recuperação.
    platform(3500,85,3700,85,'high');
    ramp([[3700,85],[3745,73],[3790,50],[3835,30]],
        {path:fixedKit.rampSmall,x:3692,y:22,w:153,h:71,flipX:true,label:'entrada rail',launch:smallLaunch},skateGame.platforms);
    railPath([[4140,10],[4240,100],[4350,145]],{id:'city-rail',tier:'medium',type:'rail',skin:{path:fixedKit.railCurve,x:4128,y:-24,w:236,h:181}});
    for(let x=4160;x<=4330;x+=42)ring(x,fixedY(skateGame.rails[0],x)-31,105);
    platform(4350,150,4660,150,'medium');
    platform(4660,150,4830,95,'high');
    ramp([[4830,95],[4875,82],[4925,58],[4970,38]],
        {path:fixedKit.rampSmall,x:4822,y:30,w:158,h:73,flipX:true,label:'segundo rail',launch:smallLaunch},skateGame.platforms);
    railPath([[5310,20],[5390,68],[5470,130]],{id:'roof-rail',tier:'high',type:'rail',skin:{path:fixedKit.railSlopeMagenta,x:5298,y:-8,w:186,h:152}});
    platform(5350,145,5530,145,'medium');
    arc(5005,5375,80,82,8,110,4);
    gate('SECTION_3_EXIT',5360,5505,65,210,'RAILS');
    checkpoint(5435,145,'RAILS',3);

    // SECTION 4 — telhados. Altura vem de rampas íngremes, não de alcance horizontal.
    platform(5530,145,5740,145,'medium');
    ramp([[5740,145],[5800,120],[5860,70],[5920,15]],
        {path:fixedKit.rampQuarter,x:5732,y:3,w:198,h:150,flipX:true,label:'subida telhados',launch:steepLaunch},skateGame.platforms);
    platform(6100,55,6410,55,'high');
    arc(5890,6130,35,150,8,110,4);
    platform(6410,55,6570,-45,'high');
    platform(6570,-45,6780,-45,'high');
    ramp([[6780,-45],[6825,-64],[6870,-108],[6915,-155]],
        {path:fixedKit.rampQuarter,x:6772,y:-167,w:153,h:130,flipX:true,label:'kicker telhado alto',launch:steepLaunch},skateGame.platforms);
    platform(7120,-80,7370,-80,'high');
    arc(6880,7150,-120,165,8,120,4);
    gate('SECTION_4_EXIT',7160,7340,-170,-20,'TELHADOS');

    // SECTION 5 — industrial/fios. Descida gera velocidade; subida após a landing a absorve.
    platform(7370,-80,7580,-80,'high');
    ramp([[7580,-80],[7620,-92],[7660,-116],[7700,-132]],
        {path:fixedKit.rampSmall,x:7572,y:-140,w:138,h:68,flipX:true,label:'fio industrial',launch:smallLaunch},skateGame.platforms);
    railPath([[7780,-102],[7960,-68],[8160,-18]],{id:'industrial-wire',tier:'high',type:'wire',skin:{path:fixedKit.cableSag,x:7768,y:-142,w:406,h:146}});
    for(let x=7810;x<=8130;x+=55)ring(x,fixedY(skateGame.rails[4],x)-29,120);
    platform(8250,40,8510,40,'medium');
    platform(8510,40,8730,285,'medium');
    platform(8730,285,8950,155,'medium');
    platform(8950,155,9120,155,'medium');
    gate('SECTION_5_EXIT',8960,9095,70,225,'INDÚSTRIA');
    checkpoint(9030,155,'INDÚSTRIA',5);

    // SECTION 6 — mega-rampa. Descida, takeoff vertical, arco alto e landing dedicada.
    platform(9120,155,9360,430,'medium');
    ramp([[9360,430],[9440,410],[9510,355],[9570,265],[9620,145],[9660,15],[9690,-105],[9720,-220]],
        {path:fixedKit.rampQuarter,x:9348,y:-236,w:384,h:676,flipX:true,label:'mega-rampa vertical',launch:megaLaunch},skateGame.platforms);
    platform(10150,-80,10520,-80,'high');
    platform(10520,-80,10720,-180,'high');
    platform(10720,-180,10920,-180,'high');
    arc(9690,10370,-120,650,15,145,7);
    gate('SECTION_6_EXIT',10730,10895,-270,-110,'MEGA-RAMPA');
    checkpoint(10810,-180,'MEGA',6);

    // SECTION 7 — desafio final. Repete apenas rampas, rail, obstáculo e gap conhecidos.
    platform(10920,-180,11080,-240,'high');
    platform(11080,-240,11280,-240,'high');
    ramp([[11280,-240],[11325,-250],[11370,-282],[11415,-320]],
        {path:fixedKit.rampLongMagenta,x:11272,y:-331,w:153,h:99,flipX:true,label:'final rail',launch:finalRailLaunch},skateGame.platforms);
    railPath([[11570,-400],[11700,-405],[11900,-360],[12050,-270],[12180,-160]],{id:'arena-rail',tier:'high',type:'rail',skin:{path:fixedKit.railCurve,x:11558,y:-421,w:636,h:277}});
    for(let x=11590;x<=12150;x+=55){const segment=skateGame.rails.find(rail=>rail.group.id==='arena-rail'&&fixedContains(rail,x));ring(x,fixedY(segment,x)-31,145);}
    platform(12080,-60,12270,-60,'medium');
    platform(12360,120,12620,120,'medium');
    arc(12240,12385,72,92,6,130,3);
    gate('SECTION_7_EXIT',12350,12580,40,185,'DESAFIO FINAL');

    // FINAL_ARENA — área física larga; só conclui após o último gate lógico.
    platform(12620,120,13200,120,'high');
    obstacle(12690,120,28,25,'crate');
    gate('FINAL_ARENA',12770,12970,35,185,'ARENA');

    skateGame.sectors=[
        {x1:0,x2:1750,name:'PRAIA NEON',color:'#63e7ff'},
        {x1:1750,x2:3500,name:'CIDADE',color:'#ff8bc8'},
        {x1:3500,x2:5530,name:'RAIL DISTRICT',color:'#ffe36b'},
        {x1:5530,x2:7370,name:'TELHADOS',color:'#63e7ff'},
        {x1:7370,x2:9120,name:'INDÚSTRIA',color:'#ff8bc8'},
        {x1:9120,x2:10920,name:'MEGA-RAMPA',color:'#ffe36b'},
        {x1:10920,x2:12620,name:'DESAFIO FINAL',color:'#63e7ff'},
        {x1:12620,x2:13200,name:'ARENA',color:'#ff8bc8'}
    ];
    skateGame.worldBounds={top:-1300,bottom:560};
    skateGame.kitSetPieces=[
        {path:fixedKit.tropicalLights,x:30,y:260,w:235,h:176,anchor:'bottom',layer:'back',alpha:.92},
        {path:fixedKit.platformBeach,x:930,y:230,w:220,h:92,anchor:'top',layer:'back',alpha:.96},
        {path:fixedKit.bridgeArch,x:4350,y:142,w:300,h:165,anchor:'top',layer:'back',alpha:1},
        {path:fixedKit.cableTower,x:7730,y:-102,w:100,h:245,anchor:'top',layer:'back',alpha:.96},
        {path:fixedKit.cableTower,x:8140,y:-18,w:100,h:245,anchor:'top',layer:'back',alpha:.96,flipX:true},
        {path:fixedKit.crane,x:9480,y:-330,w:330,h:255,anchor:'top',layer:'back',alpha:1},
        {path:fixedKit.signCheckpoint,x:12800,y:114,w:90,h:68,anchor:'bottom',layer:'front',alpha:1},
        {path:fixedKit.arena,x:12620,y:120,w:560,h:261,anchor:'bottom',layer:'front',alpha:1}
    ];
}

function fixedMakePlayer(x=135,y=260) {
    return { x,y,vx:5,vy:0,speed:5,angle:0,targetAngle:0,grounded:true,grinding:false,falling:false,
        surface:null,onPlatform:false,rail:null,action:'CRUISE',moveState:fixedMoveState.RIDE,stateTicks:0,frame:0,animTimer:0,
        slide:false,activeTrick:null,trickFrames:0,trickDuration:0,trickCooldown:0,completedAirTricks:0,
        jumpBuffer:0,coyoteTimer:0,ignoreLandingUntil:0,rampEntrySpeed:0,grindTrick:null,grindTrickFrames:0,grindTicks:0,fallTimer:0,squash:0,landTimer:0,airTicks:0 };
}

function fixedResetSkate() {
    Object.assign(skateGame, {
        state: 'TUTORIAL', levelLength: 13200, targetScore: 12000, score: 0, styleScore: 0, distanceScore: 0,
        cameraX: 0, cameraY: 0, cameraZoom: 1, elapsed: 0, lastStyle: '', lastStyleTimer: 0, particles: [],
        combo: { chain: 0, multiplier: 1, raw: 0, names: [], timer: 0, decay: 0 },
        stats: {takeoffs:0,airTricks:0,grinds:0,grindTricks:0,landings:0,collectibles:0,specialCollectibles:0,failures:0,checkpoints:0,progressionGates:0,skipDetections:0,groundFrames:0,airFrames:0,grindFrames:0,maxLaunchDistance:0},
        failReason:'', currentCheckpoint:-1,
        progression:{completed:0,order:[],lastSkipGate:'',furthestValidX:0},
        player: fixedMakePlayer()
    });
    fixedBuildLevel();
    skateGame.player.surface=(fixedTerrainAt(skateGame.player.x)||{}).line||null;
    fixedSkateInput.jump=false; fixedSkateInput.trick=''; fixedSkateInput.grindTrick='';
}

function fixedRespawnSkate() {
    const checkpoint=skateGame.currentCheckpoint>=0?skateGame.checkpoints[skateGame.currentCheckpoint]:null;
    const x=checkpoint?checkpoint.spawnX:135, y=checkpoint?checkpoint.spawnY:260;
    const savedSections=checkpoint?checkpoint.requiredSections:0;
    skateGame.progression.completed=savedSections;
    skateGame.progression.order=(skateGame.sectionGates||[]).slice(0,savedSections).map(gate=>gate.id);
    skateGame.progression.lastSkipGate='';
    skateGame.progression.furthestValidX=savedSections?(skateGame.sectionGates[savedSections-1]||{}).x2||0:0;
    (skateGame.sectionGates||[]).forEach((gate,index)=>{gate.complete=index<savedSections;});
    skateGame.player=fixedMakePlayer(x,y);
    const surfaces=[...skateGame.terrain,...skateGame.platforms].filter(line=>fixedContains(line,x));
    skateGame.player.surface=surfaces.sort((a,b)=>Math.abs(fixedY(a,x)-y)-Math.abs(fixedY(b,x)-y))[0]||null;
    skateGame.player.onPlatform=skateGame.platforms.includes(skateGame.player.surface);
    skateGame.player.y=skateGame.player.surface?fixedY(skateGame.player.surface,x):y;
    skateGame.state='PLAYING';skateGame.failReason='';skateGame.combo={chain:0,multiplier:1,raw:0,names:[],timer:0,decay:0};
    skateGame.particles=[];skateGame.cameraX=Math.max(0,x-120);skateGame.cameraY=y-190;skateGame.cameraZoom=1;
    skateGame.lastStyle=checkpoint?'CHECKPOINT '+checkpoint.label:'NOVA TENTATIVA';skateGame.lastStyleTimer=70;
    fixedSkateInput.jump=false;fixedSkateInput.trick='';fixedSkateInput.grindTrick='';
}

function resetSkateGame() { fixedResetSkate(); }
function fixedMultiplier(chain) { return [1,2,3,5,6,8,10][Math.min(6, Math.max(0, chain))]; }
function fixedStyle(name, value) {
    const combo = skateGame.combo;
    combo.chain = Math.min(6, combo.chain + 1); combo.multiplier = fixedMultiplier(combo.chain);
    combo.raw += value; combo.names.push(name); combo.names = combo.names.slice(-4); combo.timer = 250; combo.decay = 0;
    skateGame.lastStyle = name + '  x' + combo.multiplier; skateGame.lastStyleTimer = 65;
}
function fixedBank(reason) {
    const combo = skateGame.combo;
    if (combo.raw <= 0) return;
    const points = Math.floor(combo.raw * combo.multiplier);
    skateGame.styleScore += points; skateGame.score = Math.floor(skateGame.styleScore + skateGame.distanceScore);
    skateGame.lastStyle = reason + ': +' + points; skateGame.lastStyleTimer = 85;
    combo.raw = 0; combo.names = [];
}
function fixedBreak(reason) {
    skateGame.combo = { chain:0, multiplier:1, raw:0, names:[], timer:0, decay:0 };
    skateGame.lastStyle = reason + ' — COMBO QUEBRADO'; skateGame.lastStyleTimer = 100;
}
function fixedDifficultyAt(x) { return x<1750?0:x<5530?1:x<9120?2:3; }
function fixedBeginFall(reason) {
    const p = skateGame.player;
    if (p.falling || skateGame.state==='FAIL') return;
    fixedBreak(reason); skateGame.failReason=reason; skateGame.stats.failures++;
    p.falling=true; p.fallTimer=30; p.grounded=false; p.grinding=false; p.rail=null; p.surface=null;
    p.activeTrick=null; p.grindTrick=null; p.vy=Math.max(1.5,p.vy); p.vx=Math.max(1.2,p.vx*.55);
    fixedSetMoveState(p,fixedMoveState.FALL,'FALL');
}
function fixedWipeout(reason) { fixedBeginFall(reason); }
function fixedLaunch(p,line) {
    const angle=Math.atan(fixedSlope(line));
    const jumpImpulse=line.kind==='ramp'?2.8:fixedPhysics.ollie;
    const launchSpeed=line.kind==='ramp'?Math.max(p.speed,p.rampEntrySpeed||0):p.speed;
    const profile=line.kind==='ramp'&&line.rampSkin&&line.rampSkin.launch?line.rampSkin.launch:null;
    const rawVx=launchSpeed*Math.cos(angle)*(profile?profile.horizontal:1.035);
    p.grounded=false;p.onPlatform=false;p.surface=null;p.airTicks=0;p.coyoteTimer=0;p.jumpBuffer=0;p.ignoreLandingUntil=8;
    p.vx=Math.max(3,profile?Math.min(profile.maxVx,rawVx):Math.min(8,rawVx));
    const launchVy=launchSpeed*Math.sin(angle)-jumpImpulse-(profile?profile.vertical:0);
    p.vy=profile&&profile.maxUp?Math.max(-profile.maxUp,launchVy):launchVy;
    p.rampEntrySpeed=0;p.y-=2;p.launchX=p.x;p.launchLabel=line.rampSkin?line.rampSkin.label:'ollie';
    skateGame.stats.takeoffs++;fixedStyle(line.kind==='ramp'?'RAMP JUMP':'OLLIE',line.kind==='ramp'?135:85);
    fixedSetMoveState(p,fixedMoveState.TAKEOFF,'TAKEOFF');
}
function fixedStartTrick(type) {
    const p = skateGame.player;
    if (p.activeTrick || p.grounded || p.grinding || p.falling || p.trickCooldown>0) return;
    const data = { flip:{name:'KICKFLIP',action:'KICKFLIP',duration:26,score:280}, heel:{name:'HEELFLIP',action:'HEELFLIP',duration:28,score:310}, spin:{name:'360 SPIN',action:'SPIN',duration:34,score:430}, grab:{name:'INDY GRAB',action:'GRAB',duration:30,score:350} }[type];
    if (!data) return;
    p.activeTrick=data; p.trickFrames=0; p.trickDuration=data.duration;
    fixedSetMoveState(p,fixedMoveState.AIR_TRICK,data.action);
}
function fixedCompleteTrick(p) {
    const trick=p.activeTrick; if(!trick)return;
    fixedStyle(trick.name,trick.score); skateGame.stats.airTricks++; p.completedAirTricks++; p.activeTrick=null; p.trickCooldown=4;
}
function fixedSpark(x,y) { skateGame.particles.push({x:x,y:y,vx:-1.2-Math.random(),vy:-Math.random()*1.8,life:20,size:2+Math.random()*2}); }
function fixedTryRail(p, oldY) {
    if (p.vy <= 0 || p.falling) return false;
    for (let i=0;i<skateGame.rails.length;i++) {
        const rail=skateGame.rails[i],y=fixedY(rail,p.x),oldRailY=fixedY(rail,Math.max(rail.x1,Math.min(rail.x2,p.x-p.vx)));
        if (p.x < rail.x1-8 || p.x > rail.x2+8 || oldY > oldRailY || p.y < y) continue;
        // Reaching the rail is the skill test.  Entry itself is automatic.
        if (p.activeTrick) { p.activeTrick=null;p.trickCooldown=4; }
        p.speed=Math.max(3,Math.min(fixedPhysics.maxSpeed,p.vx*Math.cos(Math.atan(fixedSlope(rail)))+p.vy*Math.sin(Math.atan(fixedSlope(rail)))));
        p.grinding=true; p.grounded=false; p.surface=null; p.rail=rail; p.y=y; p.vy=0; p.targetAngle=Math.atan(fixedSlope(rail));
        p.grindTicks=0;p.grindTrick=null;p.grindTrickFrames=0;
        if(Number.isFinite(p.launchX))skateGame.stats.maxLaunchDistance=Math.max(skateGame.stats.maxLaunchDistance,p.x-p.launchX);
        p.launchX=null;p.launchLabel='';
        skateGame.stats.grinds++; fixedStyle(rail.type==='wire'?'FIAÇÃO GRIND':'50-50 GRIND',rail.type==='wire'?340:230);
        fixedSetMoveState(p,fixedMoveState.GRIND_ENTER,'GRIND_ENTER'); return true;
    }
    return false;
}
function fixedCheckRings(p) {
    for (let i=0;i<skateGame.rings.length;i++) {
        const ring=skateGame.rings[i], dx=p.x-ring.x, dy=p.y-ring.y;
        const reach=ring.special?31:27;
        if (!ring.used && dx*dx+dy*dy < reach*reach) {
            ring.used=true;skateGame.stats.collectibles++;if(ring.special)skateGame.stats.specialCollectibles++;
            fixedStyle(ring.special?'ESTRELA NEON':'COLETÁVEL',ring.value);fixedSpark(ring.x,ring.y);
        }
    }
}
function fixedCheckObstacles(p) {
    if (p.falling || p.grinding) return;
    for (let i=0;i<skateGame.obstacles.length;i++) {
        const o=skateGame.obstacles[i],top=o.y-o.height;
        if (p.x+12>o.x && p.x-12<o.x+o.width && p.y>top+4 && p.y<o.y+8) {
            fixedWipeout(o.type==='hydrant'?'BATEU NO HIDRANTE':'COLIDIU COM OBSTÁCULO');return;
        }
    }
}

function fixedUpdateProgression(p) {
    const progress=skateGame.progression, gates=skateGame.sectionGates||[];
    const gate=gates[progress.completed];
    if(!gate)return;
    const inside=p.x>=gate.x1&&p.x<=gate.x2&&p.y>=gate.y1&&p.y<=gate.y2;
    if(inside){
        gate.complete=true;progress.completed++;progress.order.push(gate.id);progress.lastSkipGate='';progress.furthestValidX=gate.x2;
        skateGame.stats.progressionGates++;
        fixedStyle(gate.label+' CONCLUÍDA',220);
        return;
    }
    // Segurança lógica: registra o skip, mas não teleporta nem ergue uma parede invisível.
    if(p.x>gate.x2+240&&progress.lastSkipGate!==gate.id){
        progress.lastSkipGate=gate.id;skateGame.stats.skipDetections++;
        skateGame.lastStyle='ATALHO INVÁLIDO — '+gate.label+' NÃO CONCLUÍDA';skateGame.lastStyleTimer=100;
    }
}

function fixedUpdateCheckpoint(p) {
    const next=skateGame.checkpoints[skateGame.currentCheckpoint+1];
    if(!next||skateGame.progression.completed<next.requiredSections)return;
    if(p.x<next.x1||p.x>next.x2||p.y<next.y1||p.y>next.y2)return;
    skateGame.currentCheckpoint=next.index;next.active=true;skateGame.stats.checkpoints++;
    fixedStyle('CHECKPOINT '+next.label,450);fixedBank('CHECKPOINT');
}

function fixedUpdateGround(p) {
    p.slide = fixedSkateInput.down;
    const line = p.surface || (fixedTerrainAt(p.x) || {}).line;
    if (!line) { p.grounded=false; return; }
    const slope=fixedSlope(line), angle=Math.atan(slope);
    // O limite global é apenas proteção extrema; a pista absorve velocidade por
    // subidas, pousos e trechos técnicos entre as descidas.
    const localMax=fixedPhysics.maxSpeed;
    p.speed=Math.max(1.3,Math.min(localMax,(p.speed||p.vx)+
        fixedPhysics.gravity*Math.sin(angle)+(fixedSkateInput.right?fixedPhysics.push:0)-
        (fixedSkateInput.left?.23:fixedPhysics.drag)));
    p.vx=p.speed*Math.cos(angle); p.vy=0; p.targetAngle=angle;
    if(p.landTimer>0)fixedSetMoveState(p,fixedMoveState.LANDING,'LAND');
    else if(line.kind==='ramp')fixedSetMoveState(p,fixedMoveState.RAMP,slope<0?'RAMP_UP':'RAMP_DOWN');
    else fixedSetMoveState(p,fixedMoveState.RIDE,p.slide?'CROUCH':fixedSkateInput.left?'BRAKE':fixedSkateInput.right?'PUSH':p.speed<2?'IDLE':'CRUISE');
    if (p.jumpBuffer>0) { fixedLaunch(p,line);return; }
    // Enter a ramp only at a connected foot, never snap onto overhead geometry.
    const entry=!p.onPlatform && skateGame.terrain.find(r=>r.kind==='ramp' && r.x1>p.x+.01 && r.x1<=p.x+p.vx && Math.abs(fixedY(line,r.x1)-r.y1)<2);
    if (entry) { p.x=entry.x1;p.y=entry.y1;p.rampEntrySpeed=p.speed;p.surface=entry;return; }
    if (p.x+p.vx<=line.x2) { p.x+=p.vx; p.y=fixedY(line,p.x); p.surface=line; return; }
    p.x=line.x2; p.y=line.y2;
    const connected=[...skateGame.terrain,...skateGame.platforms].filter(r=>r!==line && Math.abs(r.x1-line.x2)<.2 && Math.abs(r.y1-line.y2)<2).sort((a,b)=>fixedSlope(a)-fixedSlope(b))[0];
    if (connected) {
        if(connected.kind==='ramp'&&line.kind!=='ramp')p.rampEntrySpeed=p.speed;
        p.surface=connected; p.onPlatform=skateGame.platforms.includes(connected);
    } else {
        p.grounded=false;p.onPlatform=false;p.surface=null;p.coyoteTimer=6;p.airTicks=0;
        p.vx=Math.max(2,p.speed*Math.cos(angle));p.vy=p.speed*Math.sin(angle);p.x+=Math.min(p.vx,2);p.y+=p.vy;
        fixedSetMoveState(p,fixedMoveState.AIR,'AIR_FALL');
    }
}

function fixedUpdateGrind(p) {
    const rail=p.rail, hard=rail.tier==='high';
    const angle=Math.atan(fixedSlope(rail));
    p.grindTicks++; p.speed=Math.max(2,Math.min(fixedPhysics.maxSpeed,p.speed+fixedPhysics.gravity*Math.sin(angle)-.003)); p.vx=p.speed*Math.cos(angle); p.x+=p.vx;
    p.y=fixedY(rail,Math.min(rail.x2,Math.max(rail.x1,p.x))); p.targetAngle=Math.atan(fixedSlope(rail));
    if(fixedSkateInput.grindTrick&&!p.grindTrick){
        const data=fixedSkateInput.grindTrick==='boardslide'?{name:'BOARDSLIDE SHIFT',duration:22,score:360}:{name:'GRIND GRAB',duration:26,score:410};
        p.grindTrick=data;p.grindTrickFrames=0;
    }
    fixedSkateInput.grindTrick='';
    if(p.grindTrick){
        fixedSetMoveState(p,fixedMoveState.GRIND_TRICK,'GRIND_TRICK');
        if(++p.grindTrickFrames>=p.grindTrick.duration){
            fixedStyle(p.grindTrick.name,p.grindTrick.score);skateGame.stats.grindTricks++;p.grindTrick=null;
        }
    }else fixedSetMoveState(p,fixedMoveState.GRIND,'GRIND');
    if (p.grindTicks%28===0) { fixedStyle(hard?'GRIND LONGO':'GRIND',hard?145:95); fixedSpark(p.x,p.y); }
    const leaveRail=(boost=3.7)=>{
        if(p.grindTrick){p.grindTrick=null;p.grindTrickFrames=0;}
        p.grinding=false;p.rail=null;p.vy=p.speed*Math.sin(angle)-boost;p.y-=2;p.airTicks=0;p.coyoteTimer=0;
        fixedStyle(boost>4?'OLLIE OUT':'GRIND EXIT',boost>4?180:120);fixedSetMoveState(p,fixedMoveState.GRIND_EXIT,'GRIND_EXIT');
    };
    if (p.jumpBuffer>0) { p.jumpBuffer=0;leaveRail(5.2);return; }
    if(p.x>=rail.x2){
        if(rail.next){p.rail=rail.next;p.x=rail.next.x1;p.y=rail.next.y1;return;}
        leaveRail();
    }
}

function fixedUpdateAir(p) {
    const oldY=p.y,oldX=p.x;
    p.airTicks++;p.stateTicks++;p.vy+=fixedPhysics.gravity;if(p.trickCooldown>0)p.trickCooldown--;if(p.coyoteTimer>0)p.coyoteTimer--;if(p.ignoreLandingUntil>0)p.ignoreLandingUntil--;
    if(p.jumpBuffer>0&&p.coyoteTimer>0){
        p.vy=Math.min(0,p.vy)-fixedPhysics.ollie;p.jumpBuffer=0;p.coyoteTimer=0;
        fixedStyle('COYOTE OLLIE',90);fixedSetMoveState(p,fixedMoveState.TAKEOFF,'OLLIE');
    }
    // Air control alters range gently without destroying stored momentum.
    if (fixedSkateInput.right) p.vx=Math.min(fixedPhysics.maxSpeed,p.vx+.008);
    if (fixedSkateInput.left) p.vx=Math.max(1,p.vx-.06);
    p.x+=p.vx; p.y+=p.vy; p.targetAngle+=(Math.max(-.22,Math.min(.3,p.vy*.018))-p.targetAngle)*.12;
    if (fixedSkateInput.trick) { fixedStartTrick(fixedSkateInput.trick); fixedSkateInput.trick=''; }
    if (p.activeTrick && ++p.trickFrames>=p.trickDuration) fixedCompleteTrick(p);
    if(!p.activeTrick)fixedSetMoveState(p,p.vy>-.5?fixedMoveState.DESCENDING:fixedMoveState.AIR,p.vy>-.5?'AIR_FALL':p.vy<-2?'AIR_RISE':'AIR_APEX');
    fixedCheckRings(p);
    if (fixedTryRail(p,oldY)) return;
    const landing=p.ignoreLandingUntil>0?null:fixedLandingAt(p.x,oldY,true,p.y,oldX);
    if (landing) {
        const impact=Math.abs(p.vy);
        const slope=fixedSlope(landing.line), angle=Math.atan(slope);
        if(p.activeTrick){p.activeTrick=null;p.trickFrames=0;p.trickCooldown=5;skateGame.lastStyle='TRICK INTERROMPIDO — POUSO SEGURO';skateGame.lastStyleTimer=45;}
        const projected=Math.min(fixedPhysics.maxSpeed,p.vx*Math.cos(angle)+p.vy*Math.sin(angle));
        p.speed=Math.max(3,p.vx*.62,projected*.86);p.vx=p.speed*Math.cos(angle);
        p.y=landing.y;p.vy=0;p.grounded=true;p.surface=landing.line;p.onPlatform=landing.type==='platform';p.targetAngle=angle;p.squash=Math.min(1,impact/16);p.landTimer=22;
        if(Number.isFinite(p.launchX))skateGame.stats.maxLaunchDistance=Math.max(skateGame.stats.maxLaunchDistance,p.x-p.launchX);
        p.launchX=null;p.launchLabel='';
        skateGame.stats.landings++;fixedStyle('LANDING',100);fixedBank('LANDING');fixedSetMoveState(p,fixedMoveState.LANDING,'LAND');
    }
    if (p.y>skateGame.worldBounds.bottom) fixedBeginFall('CAIU NO GAP');
}

function fixedUpdateWipeout(p) {
    p.fallTimer--;p.vy+=fixedPhysics.gravity;p.x+=p.vx;p.y+=p.vy;p.targetAngle+=.07;
    p.y=Math.min(p.y,skateGame.worldBounds.bottom+35);
    fixedSetMoveState(p,p.fallTimer>10?fixedMoveState.FALL:fixedMoveState.STUMBLE,p.fallTimer>10?'FALL':'FAIL');
    if(p.fallTimer<=0||p.y>=skateGame.worldBounds.bottom+34){p.falling=false;fixedSetMoveState(p,fixedMoveState.FAIL,'FAIL');skateGame.state='FAIL';}
}

function fixedUpdateCombo() {
    const combo=skateGame.combo;
    if (combo.timer>0) { combo.timer--; return; }
    if (combo.chain>0 && ++combo.decay>=78) {
        combo.decay=0; combo.chain--; combo.multiplier=fixedMultiplier(combo.chain);
        skateGame.lastStyle='ESTILO CAINDO — x'+combo.multiplier; skateGame.lastStyleTimer=45;
    }
}

function fixedUpdateCamera() {
    const p=skateGame.player;
    const airborne=!p.grounded&&!p.grinding;
    const vertical=airborne?p.vy:p.vx*fixedSlope(p.rail||p.surface||{x1:0,x2:1,y1:0,y2:0});
    const zoom=airborne?Math.max(.74,.92-Math.abs(vertical)*.006):Math.max(.82,1-p.speed*.007);
    skateGame.cameraZoom+=(zoom-skateGame.cameraZoom)*.035;
    const z=skateGame.cameraZoom;
    // Feed-forward compensates follow lag so horizontal composition stays 30/70.
    const targetX=p.x-canvas.width/2+(canvas.width*.20)/z;
    skateGame.cameraX+=p.vx*.82+(targetX-skateGame.cameraX)*.20;
    const lead=vertical*(airborne?9:5);
    const projected=p.y+lead-skateGame.cameraY;
    const top=airborne&&vertical>2?140:165, bottom=airborne&&vertical< -2?230:210;
    let targetY=skateGame.cameraY;
    if(projected<top) targetY+=projected-top;
    if(projected>bottom) targetY+=projected-bottom;
    skateGame.cameraY+=(targetY-skateGame.cameraY)*.16;
    // Soft visibility guard covers fast falls without snapping to a fixed Y.
    const feet=150+(p.y-skateGame.cameraY-150)*z;
    if(feet<115) skateGame.cameraY-=(115-feet)/z*.45;
    if(feet>260) skateGame.cameraY+=(feet-260)/z*.45;
}

function fixedUpdateEffects() {
    for (let i=skateGame.particles.length-1;i>=0;i--) {
        const s=skateGame.particles[i]; s.x+=s.vx; s.y+=s.vy; s.vy+=.08; s.life--;
        if (s.life<=0) skateGame.particles.splice(i,1);
    }
}

function updateSkateGame() {
    if (skateGame.state==='TUTORIAL') {
        if (fixedSkateInput.jump || fixedSkateInput.right) { skateGame.state='PLAYING'; skateGame.lastStyle='LINHA LIBERADA — NÃO CAIA'; skateGame.lastStyleTimer=80; }
        fixedSkateInput.jump=false; return;
    }
    if (skateGame.state==='VICTORY' || skateGame.state==='FAIL') {
        if(++skateGame.player.animTimer>=8){skateGame.player.animTimer=0;skateGame.player.frame++;}
        if (fixedSkateInput.jump || keys.r) {
            if(skateGame.state==='FAIL')fixedRespawnSkate();
            else {fixedResetSkate();skateGame.state='PLAYING';skateGame.lastStyle='NOVA VOLTA';skateGame.lastStyleTimer=55;}
        }
        fixedSkateInput.jump=false; keys.r=false; return;
    }
    const p=skateGame.player;
    const previousAction=p.action;
    skateGame.elapsed++;p.stateTicks++;
    if(fixedSkateInput.jump)p.jumpBuffer=6;else if(p.jumpBuffer>0)p.jumpBuffer--;
    if (p.landTimer>0) p.landTimer--;
    if (p.falling) fixedUpdateWipeout(p);
    else if (p.grinding) fixedUpdateGrind(p);
    else if (p.grounded) fixedUpdateGround(p);
    else fixedUpdateAir(p);
    if (!p.falling) { fixedCheckObstacles(p);fixedCheckRings(p);fixedUpdateProgression(p);fixedUpdateCheckpoint(p); }
    if(p.grinding)skateGame.stats.grindFrames++;else if(p.grounded)skateGame.stats.groundFrames++;else if(!p.falling)skateGame.stats.airFrames++;
    skateGame.distanceScore+=Math.max(0,p.vx)*.01;
    skateGame.score=Math.floor(skateGame.styleScore+skateGame.distanceScore);
    fixedUpdateCombo(); fixedUpdateEffects(); fixedUpdateCamera();
    p.angle+=(p.targetAngle-p.angle)*.24; p.squash*=.85;
    if(p.action!==previousAction) { p.frame=0; p.animTimer=0; }
    if (p.activeTrick) p.frame=Math.min(fixedSkateFrames[p.action].length-1,Math.floor(p.trickFrames/p.trickDuration*fixedSkateFrames[p.action].length));
    else if(p.grindTrick)p.frame=Math.min(fixedSkateFrames.GRIND_TRICK.length-1,Math.floor(p.grindTrickFrames/p.grindTrick.duration*fixedSkateFrames.GRIND_TRICK.length));
    else if (++p.animTimer>=6) { p.animTimer=0; p.frame++; }
    if (skateGame.lastStyleTimer>0) skateGame.lastStyleTimer--;
    if (p.x>=skateGame.finishX && p.grounded && !p.falling && skateGame.progression.completed>=skateGame.sectionGates.length) {
        fixedBank('CHEGADA'); skateGame.score=Math.floor(skateGame.styleScore+skateGame.distanceScore); p.action='WIN'; p.frame=0;p.animTimer=0;
        fixedSetMoveState(p,fixedMoveState.WIN,'WIN');skateGame.state='VICTORY';
    }
    fixedSkateInput.jump=false; fixedSkateInput.trick=''; fixedSkateInput.grindTrick='';
}

function fixedSX(x) { return x-skateGame.cameraX; }
function fixedSY(y) { return y-skateGame.cameraY; }

function fixedDrawSetPieces(layer) {
    const pieces = skateGame.kitSetPieces || [];
    for (const piece of pieces) {
        if (piece.layer !== layer) continue;
        const x = fixedSX(piece.x);
        if (x + piece.w < -80 || x > canvas.width + 80) continue;
        const y = piece.anchor === 'bottom' ? fixedSY(piece.y) - piece.h : fixedSY(piece.y);
        fixedDrawKit(piece.path, x, y, piece.w, piece.h, {alpha:piece.alpha,flipX:piece.flipX});
    }
}

function fixedDrawRampSkin(line) {
    const skin = line.rampSkin;
    if (!skin || !line.rampDrawOwner) return false;
    return fixedDrawKit(skin.path, fixedSX(skin.x), fixedSY(skin.y), skin.w, skin.h,
        {flipX:skin.flipX, alpha:.98});
}

function fixedDrawRampDebug(line) {
    if (!FIXED_SKATE_RAMP_DEBUG || !line.rampDrawOwner || !line.rampSkin) return;
    const points = line.rampSkin.surface;
    ctx.save();
    ctx.strokeStyle = '#60ffcf'; ctx.fillStyle = '#ffea69'; ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]); ctx.beginPath();
    points.forEach((point, index) => {
        const x=fixedSX(point[0]), y=fixedSY(point[1]);
        if (index) ctx.lineTo(x,y); else ctx.moveTo(x,y);
    });
    ctx.stroke(); ctx.setLineDash([]);
    points.forEach(point => { ctx.beginPath(); ctx.arc(fixedSX(point[0]),fixedSY(point[1]),3,0,Math.PI*2); ctx.fill(); });
    ctx.restore();
}

function fixedDrawPlatformSkin(line,index) {
    if (Math.abs(line.y2-line.y1)>3) return fixedDrawRampSkin(line);
    const total = line.x2-line.x1, tileWidth = 170;
    const path = line.kind==='high' || index%3===1 ? fixedKit.platformEdgeMagenta : fixedKit.platformEdgeCyan;
    for (let offset=0;offset<total;offset+=tileWidth) {
        const width=Math.min(tileWidth,total-offset);
        fixedDrawKit(path,fixedSX(line.x1+offset),fixedSY(line.y1)-7,width,38,{alpha:.98});
    }
    return true;
}

function fixedDrawRailSkin(rail) {
    const x1=fixedSX(rail.x1), y1=fixedSY(rail.y1), x2=fixedSX(rail.x2), y2=fixedSY(rail.y2);
    const width=x2-x1, delta=y2-y1;
    if(rail.pathSkin){
        if(!rail.pathDrawOwner)return false;
        const skin=rail.pathSkin;
        return fixedDrawKit(skin.path,fixedSX(skin.x),fixedSY(skin.y),skin.w,skin.h,{flipX:skin.flipX,alpha:1});
    }
    if (rail.type==='wire') {
        const path=Math.abs(delta)>18?fixedKit.cableSag:fixedKit.cableTaut;
        return fixedDrawKit(path,x1,Math.min(y1,y2)-11,width,Math.max(30,Math.abs(delta)+31),{flipX:delta<0,alpha:1});
    }
    const flat=Math.abs(delta)<12;
    const path=flat?(rail.x1%2<1?fixedKit.railStraightCyan:fixedKit.railStraightMagenta):(rail.x1%2<1?fixedKit.railSlopeCyan:fixedKit.railSlopeMagenta);
    return fixedDrawKit(path,x1,Math.min(y1,y2)-7,width,flat?42:Math.abs(delta)+46,{flipX:!flat&&delta>0,alpha:1});
}

function fixedDrawCity() {
    const backgroundReady = fixedSkateBackground.complete && fixedSkateBackground.naturalWidth > 0;
    if (backgroundReady) {
        // O skyline é uma camada repetida, independente de toda a geometria de gameplay.
        ctx.fillStyle='#071326'; ctx.fillRect(0,0,canvas.width,canvas.height);
        const height = 390;
        const width = Math.round(height * fixedSkateBackground.naturalWidth / fixedSkateBackground.naturalHeight);
        const offset = ((skateGame.cameraX * .16) % width + width) % width;
        const y = Math.round(Math.max(-80,Math.min(0,-40-skateGame.cameraY*.04)));
        ctx.save();
        ctx.globalAlpha = .96;
        for (let x = -offset - width; x < canvas.width + width; x += width) {
            ctx.drawImage(fixedSkateBackground, Math.round(x), y, width, height);
        }
        ctx.fillStyle = 'rgba(3, 12, 34, .13)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        return;
    }

    // Fallback enquanto a imagem ainda carrega: reutiliza os módulos já disponíveis.
    const sky=ctx.createLinearGradient(0,0,0,300);
    sky.addColorStop(0,'#071326'); sky.addColorStop(.58,'#142f54'); sky.addColorStop(1,'#653552');
    ctx.fillStyle=sky; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(97,242,255,.14)'; ctx.beginPath(); ctx.arc(88,48,34,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#bffdf2'; ctx.beginPath(); ctx.arc(88,48,14,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff8ac7'; ctx.beginPath(); ctx.arc(126,30,8,0,Math.PI*2); ctx.fill();
    const far=(skateGame.cameraX*.14)%150;
    for (let i=-1;i<5;i++) drawSkateModule('building',i*150-far,89-skateGame.cameraY*.09,88,172,.45);
    const mid=(skateGame.cameraX*.40)%165;
    for (let i=-1;i<5;i++) {
        const x=i*165-mid;
        drawSkateModule('building',x,98-skateGame.cameraY*.20,95,184,.78);
        if (i%2===0) drawSkateModule('billboard',x+98,132-skateGame.cameraY*.16,42,63,.76);
    }
    const near=(skateGame.cameraX*.74)%155;
    for (let i=-1;i<5;i++) {
        const x=i*155-near;
        drawSkateModule('wall',x,184-skateGame.cameraY*.32,92,70,.55);
        drawSkateModule('lamp',x+111,132-skateGame.cameraY*.28,34,91,.9);
    }
}

function fixedDrawTerrain() {
    for (let i=0;i<skateGame.terrain.length;i++) {
        const line=skateGame.terrain[i], x1=fixedSX(line.x1), y1=fixedSY(line.y1), x2=fixedSX(line.x2), y2=fixedSY(line.y2);
        const skin=line.rampSkin;
        const skinVisible=line.rampDrawOwner && skin && fixedSX(skin.x+skin.w)>-40 && fixedSX(skin.x)<canvas.width+40;
        if ((x2<-40 || x1>canvas.width+40) && !skinVisible) continue;
        ctx.fillStyle=line.launch?'#384152':'#343d4a';
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x2,canvas.height+150); ctx.lineTo(x1,canvas.height+150); ctx.closePath(); ctx.fill();
        if (line.kind==='ramp') fixedDrawRampSkin(line);
        ctx.strokeStyle=line.launch?'#ffd65d':'#b9c6d5'; ctx.lineWidth=line.launch?3:2;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        if (line.launch) { ctx.strokeStyle='#f155b5'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x1,y1+5); ctx.lineTo(x2,y2+5); ctx.stroke(); }
        fixedDrawRampDebug(line);
    }
    for (let i=0;i<skateGame.platforms.length;i++) {
        const line=skateGame.platforms[i], x1=fixedSX(line.x1), y1=fixedSY(line.y1), x2=fixedSX(line.x2), y2=fixedSY(line.y2);
        if (x2<-40 || x1>canvas.width+40) continue;
        fixedDrawPlatformSkin(line,i);
        ctx.strokeStyle=line.kind==='high'?'#ff8bc8':'#63e7ff'; ctx.lineWidth=5;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.setLineDash([5,4]); ctx.globalAlpha=.7; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x1,y1+7); ctx.lineTo(x2,y2+7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
        fixedDrawRampDebug(line);
    }
}

function fixedDrawFeatures() {
    const tunnels = skateGame.tunnels || [];
    for (let i = 0; i < tunnels.length; i++) {
        const tunnel = tunnels[i], x1 = fixedSX(tunnel.x1), x2 = fixedSX(tunnel.x2), ceiling = fixedSY(tunnel.ceiling);
        if (x2 < -40 || x1 > canvas.width + 40) continue;
        const floor=fixedSY(tunnel.floor), span=x2-x1, tile=390;
        ctx.fillStyle = 'rgba(3, 10, 22, .82)'; ctx.fillRect(x1,ceiling,span,floor-ceiling+35);
        for(let offset=0;offset<span;offset+=tile) {
            const width=Math.min(tile,span-offset);
            fixedDrawKit(tunnel.sprite,x1+offset,ceiling-5,width,Math.max(150,floor-ceiling+18),{alpha:.96});
        }
        ctx.fillStyle='rgba(3,10,22,.18)'; ctx.fillRect(x1,ceiling,span,floor-ceiling+20);
        ctx.strokeStyle = '#4de6ed'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, ceiling); ctx.lineTo(x2, ceiling); ctx.stroke();
        for (let x = x1 + 42; x < x2; x += 96) {
            ctx.fillStyle = 'rgba(89, 248, 224, .25)'; ctx.fillRect(x, ceiling + 10, 26, 3);
        }
        ctx.fillStyle = '#71f1e9'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
        ctx.fillText(tunnel.label, (x1 + x2) / 2, ceiling + 18);
    }
    for (let i=0;i<skateGame.rails.length;i++) {
        const rail=skateGame.rails[i], x1=fixedSX(rail.x1), y1=fixedSY(rail.y1), x2=fixedSX(rail.x2), y2=fixedSY(rail.y2);
        if (x2<-40 || x1>canvas.width+40) continue;
        fixedDrawRailSkin(rail);
        ctx.strokeStyle=rail.type==='wire'?'#ffd75f':rail.type==='curve'?'#ff79c8':'#56e8ff'; ctx.shadowColor=rail.type==='wire'?'#ff5cbe':'#3af6ff'; ctx.shadowBlur=5; ctx.lineWidth=rail.type==='wire'?2:4;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.shadowBlur=0;
        if (rail.type!=='wire') {
            ctx.strokeStyle='#637a90'; ctx.lineWidth=1;
            for (let x=rail.x1+30;x<rail.x2;x+=52) { const sx=fixedSX(x), sy=fixedSY(fixedY(rail,x)); ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,fixedSY(252)); ctx.stroke(); }
        }
    }
    for (let i=0;i<skateGame.obstacles.length;i++) {
        const o=skateGame.obstacles[i], x=fixedSX(o.x);
        if (x<-40 || x>canvas.width+40) continue;
        const y=fixedSY(o.y-o.height);
        if (o.type==='trash' && drawSkateModule('trash',x-4,y-2,o.width+8,o.height+6)) continue;
        if (o.type==='crate' && drawSkateModule('crate',x-4,y-2,o.width+8,o.height+6)) continue;
        if (o.type==='hydrant') { ctx.fillStyle='#ff596f'; ctx.fillRect(x+4,y,o.width-8,o.height); ctx.fillStyle='#ffc160'; ctx.fillRect(x,y+7,o.width,6); }
        else { ctx.fillStyle=o.type==='trash'?'#617082':'#a85a39'; ctx.fillRect(x,y,o.width,o.height); }
    }
    for (let i=0;i<skateGame.rings.length;i++) {
        const ring=skateGame.rings[i]; if (ring.used) continue;
        const x=fixedSX(ring.x), y=fixedSY(ring.y); if (x<-30 || x>canvas.width+30) continue;
        ctx.strokeStyle=ring.special?'#fff4a2':'#ffdf63';ctx.fillStyle=ring.special?'rgba(255,87,188,.48)':'rgba(255,223,99,.16)';
        ctx.shadowColor=ring.special?'#69f6ff':'#ff4dae';ctx.shadowBlur=ring.special?12:7;ctx.lineWidth=ring.special?4:3;
        ctx.beginPath();ctx.arc(x,y,ring.radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
        if(ring.special){ctx.fillStyle='#fff3a0';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText('★',x,y+5);}
    }
    for(const checkpoint of skateGame.checkpoints||[]){
        const x=fixedSX(checkpoint.x),y=fixedSY(checkpoint.y);if(x<-60||x>canvas.width+60)continue;
        ctx.strokeStyle=checkpoint.active?'#78ffae':'#67eaff';ctx.globalAlpha=.65;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x,y-92);ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
        ctx.fillStyle=checkpoint.active?'#78ffae':'#67eaff';ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillText(checkpoint.active?'CHECKPOINT ATIVO':'CHECKPOINT',x,y-96);
    }
    fixedDrawSetPieces('front');
    const arenaX=fixedSX(skateGame.finishX);
    if (arenaX>-280 && arenaX<canvas.width+80) {
        const arenaImage=fixedKitCatalog.images.get(fixedKit.arena);
        if (!arenaImage || !arenaImage.complete || arenaImage.naturalWidth<=0) { ctx.fillStyle='#593d74'; ctx.fillRect(arenaX-180,fixedSY(105),420,145); }
        if (imgMestreSkate && imgMestreSkate.complete && imgMestreSkate.naturalWidth>0) {
            ctx.drawImage(imgMestreSkate,arenaX+35,fixedSY(178),48,66);
        }
        ctx.fillStyle='#ffe66d'; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.fillText('ARENA DO MESTRE',arenaX,fixedSY(-18));
    }

    // Sinalização discreta dos setores: comunica a progressão sem interromper a leitura da pista.
    const sectors = skateGame.sectors || [];
    for (let i = 0; i < sectors.length; i++) {
        const sector = sectors[i], x = fixedSX(sector.x1 + 22);
        if (x < -90 || x > canvas.width + 20) continue;
        const signY=fixedSY(202);
        fixedDrawKit(fixedKit.signArrow,x,signY,38,25,{alpha:.98});
        ctx.fillStyle = 'rgba(4, 13, 29, .88)'; ctx.fillRect(x+35, signY+5, 92, 15);
        ctx.strokeStyle = sector.color; ctx.lineWidth = 1; ctx.strokeRect(x+35, signY+5, 92, 15);
        ctx.fillStyle = sector.color; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
        ctx.fillText((i + 1) + '. ' + sector.name, x + 81, signY+15);
    }
}

function fixedDrawZorp() {
    const p=skateGame.player, frames=fixedSkateFrames[p.action] || fixedSkateFrames.CRUISE, frame=frames[p.frame%frames.length], x=fixedSX(p.x), y=fixedSY(p.y);
    const source=frame && frame[0];
    const isValidFrame=Array.isArray(frame) &&
        typeof HTMLImageElement !== 'undefined' &&
        source instanceof HTMLImageElement &&
        source.complete &&
        source.naturalWidth>0 &&
        Number.isFinite(frame[1]) &&
        Number.isFinite(frame[2]) &&
        Number.isFinite(frame[3]) &&
        Number.isFinite(frame[4]) &&
        frame[3]>0 &&
        frame[4]>0;
    const builtInTilt=['RAMP_UP','AIR_RISE'].includes(p.action)?-.32:['RAMP_DOWN','AIR_FALL'].includes(p.action)?.30:0;
    ctx.save(); ctx.translate(x,y); ctx.rotate(p.angle-builtInTilt); ctx.scale(1+p.squash*.12,1-p.squash*.14);
    // This is the sole orientation transform for every active skate frame.
    // Never derive it from velocity: small collision/landing corrections must
    // not make a forward run appear to turn around.
    if (fixedZorpNeedsForwardMirror()) ctx.scale(-1,1);
    if (isValidFrame) ctx.drawImage(source,frame[1],frame[2],frame[3],frame[4],-54,-102.5,108,108);
    else {
        const fallback=typeof getZorpSkateSprite==='function'?getZorpSkateSprite():null;
        if (typeof HTMLImageElement !== 'undefined' && fallback instanceof HTMLImageElement && fallback.complete && fallback.naturalWidth>0) ctx.drawImage(fallback,-25,-54,50,54);
        else { ctx.fillStyle='#8eff62'; ctx.fillRect(-12,-36,24,36); }
    }
    ctx.restore();
}

function fixedDrawParticles() {
    for (let i=0;i<skateGame.particles.length;i++) {
        const s=skateGame.particles[i]; ctx.fillStyle='#75f9ff'; ctx.fillRect(fixedSX(s.x),fixedSY(s.y),s.size,s.size);
    }
}
function fixedDrawBalance() {
    // Grind has no balance minigame in the simplified ruleset.
}
function fixedDrawForeground() {
    const scroll=(skateGame.cameraX*1.2)%180;
    for (let i=-1;i<5;i++) { const x=i*180-scroll; drawSkateModule('fence',x,234,72,50,.42); drawSkateModule('foliage',x+52,246,53,34,.72); }
}

function fixedDrawHud() {
    const game=skateGame, combo=game.combo;
    ctx.fillStyle='rgba(4,10,25,.92)'; ctx.fillRect(0,0,450,45); ctx.strokeStyle='#55eaff'; ctx.strokeRect(0,0,450,45);
    ctx.textAlign='left'; ctx.font='bold 10px monospace'; ctx.fillStyle='#ffe169'; ctx.fillText('PONTOS '+String(game.score).padStart(6,'0'),8,15);
    ctx.font='8px monospace'; ctx.fillStyle='#c1cedc'; ctx.fillText('ITENS '+game.stats.collectibles+'  '+Math.min(100,Math.floor(game.player.x/game.finishX*100))+'%',8,31);
    ctx.textAlign='center'; ctx.font='bold 11px monospace'; ctx.fillStyle='#ff91cb'; ctx.fillText('ESTILO x'+combo.multiplier,225,15);
    ctx.font='7px monospace'; ctx.fillStyle='#dfeefa'; ctx.fillText(combo.raw>0?combo.names.join(' + '):'MANOBRE PARA ELEVAR O COMBO',225,31);
    ctx.textAlign='right'; ctx.font='8px monospace'; ctx.fillStyle='#fff'; ctx.fillText('mestre_skate  12.000',441,16);
    ctx.fillStyle='#ffdb62'; ctx.fillRect(340,28,92*combo.timer/250,5); ctx.strokeStyle='#6a7888'; ctx.strokeRect(340,28,92,5);
    ctx.fillStyle='#66efff'; ctx.font='7px monospace'; ctx.fillText(game.player.moveState.replaceAll('_',' '),441,41);
    if (game.lastStyleTimer>0) { ctx.textAlign='center'; ctx.font='bold 10px monospace'; ctx.fillStyle='#fff06a'; ctx.fillText(game.lastStyle,225,62); }
    const p=game.player;
    let prompt='';
    if(p.grinding)prompt='GRIND AUTOMÁTICO · ESPAÇO PULA · ESPAÇO+W/S DÁ BÔNUS';
    else if(p.moveState===fixedMoveState.RAMP)prompt='OBSERVE O GAP E PULE PERTO DA SAÍDA';
    else if(!p.grounded)prompt='TRICKS SÃO OPCIONAIS: ESPAÇO + A/D/W/S';
    if(prompt){ctx.textAlign='center';ctx.font='bold 8px monospace';ctx.fillStyle='#64f6e1';ctx.fillText(prompt,225,76);}
}
function fixedDrawOverlay(title,lines,color) {
    ctx.fillStyle='rgba(3,9,22,.91)'; ctx.fillRect(25,53,400,192); ctx.strokeStyle=color; ctx.lineWidth=2; ctx.strokeRect(25,53,400,192);
    ctx.textAlign='center'; ctx.fillStyle=color; ctx.font='bold 16px monospace'; ctx.fillText(title,225,83);
    ctx.font='9px monospace'; ctx.fillStyle='#f2f7ff'; for (let i=0;i<lines.length;i++) ctx.fillText(lines[i],225,111+i*20);
}

function drawSkateGame() {
    ctx.imageSmoothingEnabled=false;
    fixedDrawCity();
    ctx.save(); ctx.translate(canvas.width/2,canvas.height/2); ctx.scale(skateGame.cameraZoom,skateGame.cameraZoom); ctx.translate(-canvas.width/2,-canvas.height/2);
    fixedDrawSetPieces('back'); fixedDrawTerrain(); fixedDrawFeatures(); fixedDrawParticles(); fixedDrawZorp(); fixedDrawBalance();
    ctx.restore(); fixedDrawForeground(); fixedDrawHud();
    if (skateGame.state==='TUTORIAL') fixedDrawOverlay('ZORP SKATE: FASE DO MESTRE',[
        '[D] ACELERA  |  [ESPAÇO] PULA',
        'PULE OBSTÁCULOS, GAPS E NO FINAL DAS RAMPAS.',
        'RAILS ENTRAM AUTOMATICAMENTE QUANDO VOCÊ ACERTA.',
        'NO AR: ESPAÇO + A/D/W/S FAZ TRICKS OPCIONAIS.',
        'COLETÁVEIS MOSTRAM AS MELHORES TRAJETÓRIAS.',
        'PRESSIONE ESPAÇO OU D PARA COMEÇAR'
    ],'#61f1ff');
    else if (skateGame.state==='VICTORY') fixedDrawOverlay('VOCÊ SUPEROU O MESTRE!',[
        'Pontuação final: '+skateGame.score.toLocaleString()+' pts',
        'Meta do mestre_skate: '+skateGame.targetScore.toLocaleString()+' pts',
        'Sua linha de skate dominou a arena!',
        'ESPAÇO PARA UMA NOVA VOLTA'
    ],'#69f6b2');
    else if (skateGame.state==='FAIL') fixedDrawOverlay('TENTATIVA ENCERRADA',[
        skateGame.failReason,
        'Pontuação desta linha: '+skateGame.score.toLocaleString()+' pts',
        skateGame.currentCheckpoint>=0?'Retorno: checkpoint '+skateGame.checkpoints[skateGame.currentCheckpoint].label:'Retorno: início da praia',
        'ESPAÇO OU R PARA VOLTAR RAPIDAMENTE'
    ],'#ff8aaf');
    ctx.textAlign='left';
}

// A última declaração destas funções torna a fase fixa a implementação ativa
// da cena JOGO_SKATE; os demais minijogos não são alterados.
fixedResetSkate();
