// -----------------------------------------------------------------------------
// ZORP SKATE 2 — PISTA DE TESTE DE FÍSICA (10s)
// Formas geométricas apenas. Nenhuma arte final entra nesta cena.
// -----------------------------------------------------------------------------

const skateTestInput = {
    left: false, right: false, down: false, space: false,
    jumpPressed: false, trickRequest: ''
};

window.addEventListener('keydown', (event) => {
    if (currentScene !== 'JOGO_SKATE') return;
    const key = event.key.toLowerCase();
    const isJump = event.code === 'Space';
    if (isJump || ['arrowleft', 'arrowright', 'arrowdown', 'a', 'd', 'w', 's'].includes(key)) event.preventDefault();
    if (isJump && !event.repeat) skateTestInput.jumpPressed = true;
    if (isJump) skateTestInput.space = true;
    if (key === 'arrowleft' || key === 'a') skateTestInput.left = true;
    if (key === 'arrowright' || key === 'd') skateTestInput.right = true;
    if (key === 'arrowdown' || key === 's') skateTestInput.down = true;

    const test = window.skatePhysicsTest;
    if (!event.repeat && test && !test.player.grounded && !test.player.grinding && skateTestInput.space) {
        if (key === 'a' || key === 'arrowleft') skateTestInput.trickRequest = 'flip';
        if (key === 'd' || key === 'arrowright') skateTestInput.trickRequest = 'heel';
        if (key === 'w' || key === 'arrowup') skateTestInput.trickRequest = 'spin';
        if (key === 's' || key === 'arrowdown') skateTestInput.trickRequest = 'grab';
    }
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (event.code === 'Space') skateTestInput.space = false;
    if (key === 'arrowleft' || key === 'a') skateTestInput.left = false;
    if (key === 'arrowright' || key === 'd') skateTestInput.right = false;
    if (key === 'arrowdown' || key === 's') skateTestInput.down = false;
});

const skateTestTrack = {
    length: 1450,
    // O asfalto é contínuo; a rampa é somente uma superfície inclinada, não um trampolim.
    ramp: { x1: 330, x2: 440, y1: 250, y2: 174 },
    highPlatform: { x1: 490, x2: 820, y: 165 },
    exitRamp: { x1: 820, x2: 930, y1: 165, y2: 250 },
    rail: { x1: 530, x2: 745, y1: 124, y2: 124 }
};

function makeSkatePhysicsTest() {
    return {
        state: 'TUTORIAL',
        elapsed: 0,
        score: 0,
        cameraX: -53,
        cameraY: 35,
        cameraZoom: 1,
        shake: 0,
        dropThrough: 0,
        lastEvent: 'Acelere e use a rampa para escolher sua rota.',
        lastEventTimer: 0,
        player: {
            x: 82, y: 250, vx: 2.3, vy: 0,
            grounded: true, grinding: false, rail: null,
            angle: 0, targetAngle: 0,
            trick: '', trickFrames: 0, trickDuration: 0,
            squash: 0, landedFrom: 250, surfaceKind: 'ground', action: 'CRUISE'
        }
    };
}

function resetSkateGame() {
    window.skatePhysicsTest = makeSkatePhysicsTest();
    skateTestInput.jumpPressed = false;
    skateTestInput.trickRequest = '';
}

function skateTestSetEvent(text, duration = 75) {
    const test = window.skatePhysicsTest;
    test.lastEvent = text;
    test.lastEventTimer = duration;
}

function skateTestFail(reason) {
    const test = window.skatePhysicsTest;
    if (test.state !== 'PLAYING') return;
    test.state = 'GAMEOVER';
    test.lastEvent = reason;
    test.lastEventTimer = 999;
    test.player.grinding = false;
}

function skateTestLineY(line, x) {
    const t = (x - line.x1) / (line.x2 - line.x1);
    return line.y1 + (line.y2 - line.y1) * t;
}

function skateTestLineSlope(line) {
    return (line.y2 - line.y1) / (line.x2 - line.x1);
}

function skateTestSurfaceAt(x, allowPlatform = true) {
    // Superfícies são avaliadas do topo para baixo. Plataformas só vencem quando estão acima do asfalto.
    let surface = { kind: 'ground', y: 250, slope: 0 };
    if (x >= skateTestTrack.ramp.x1 && x <= skateTestTrack.ramp.x2) {
        surface = { kind: 'ramp', y: skateTestLineY(skateTestTrack.ramp, x), slope: skateTestLineSlope(skateTestTrack.ramp) };
    }
    if (x >= skateTestTrack.exitRamp.x1 && x <= skateTestTrack.exitRamp.x2) {
        surface = { kind: 'exitRamp', y: skateTestLineY(skateTestTrack.exitRamp, x), slope: skateTestLineSlope(skateTestTrack.exitRamp) };
    }
    if (allowPlatform && x >= skateTestTrack.highPlatform.x1 && x <= skateTestTrack.highPlatform.x2) {
        const platform = { kind: 'platform', y: skateTestTrack.highPlatform.y, slope: 0 };
        if (platform.y < surface.y) surface = platform;
    }
    return surface;
}

function skateTestLandingSurfaceAt(x, oldY, allowPlatform) {
    const base = skateTestSurfaceAt(x, false);
    if (allowPlatform && x >= skateTestTrack.highPlatform.x1 && x <= skateTestTrack.highPlatform.x2 && oldY <= skateTestTrack.highPlatform.y) {
        return { kind: 'platform', y: skateTestTrack.highPlatform.y, slope: 0 };
    }
    return base;
}

function skateTestStartTrick(p, type) {
    if (p.trick || p.grounded || p.grinding) return;
    const data = {
        flip: ['KICKFLIP', 'KICKFLIP', 23, 280],
        heel: ['HEELFLIP', 'KICKFLIP', 23, 280],
        spin: ['360° SPIN', 'SPIN', 30, 420],
        grab: ['INDY GRAB', 'GRAB', 20, 320]
    }[type];
    if (!data) return;
    p.trick = data[0];
    p.trickFrames = 0;
    p.trickDuration = data[2];
    p.action = data[1];
    window.skatePhysicsTest.score += data[3];
    skateTestSetEvent(`${data[0]}  +${data[3]}`);
}

function skateTestTryRail(p, oldY) {
    const rail = skateTestTrack.rail;
    if (p.vy <= 0 || p.x < rail.x1 || p.x > rail.x2) return false;
    const railY = skateTestLineY(rail, p.x);
    if (oldY <= railY && p.y >= railY) {
        p.grinding = true;
        p.grounded = false;
        p.rail = rail;
        p.y = railY;
        p.vy = 0;
        p.angle = Math.atan(skateTestLineSlope(rail));
        p.targetAngle = p.angle;
        p.trick = '';
        p.action = 'GRIND';
        skateTestSetEvent('GRIND LINE: ESPAÇO PARA SAIR');
        return true;
    }
    return false;
}

function skateTestUpdatePhysics() {
    const test = window.skatePhysicsTest;
    const p = test.player;

    // Aceleração, inércia e atrito. Soltar a direção nunca zera a velocidade de imediato.
    if (skateTestInput.right) p.vx = Math.min(5.2, p.vx + .075);
    else if (skateTestInput.left) p.vx = Math.max(.35, p.vx - .13);
    else p.vx *= p.grounded ? .992 : .998;

    if (p.grinding) {
        p.x += p.vx;
        p.y = skateTestLineY(p.rail, Math.min(p.rail.x2, Math.max(p.rail.x1, p.x)));
        p.vx = Math.min(5.55, p.vx + .018);
        p.targetAngle = Math.atan(skateTestLineSlope(p.rail));
        test.score += .7;
        if (skateTestInput.jumpPressed) {
            p.grinding = false;
            p.rail = null;
            p.vy = -5.65;
            p.x += 2;
            p.action = 'OLLIE';
            skateTestSetEvent('OLLIE OUT');
        } else if (p.x >= p.rail.x2) {
            p.grinding = false;
            p.rail = null;
            p.vy = -1.7;
        }
        return;
    }

    if (p.grounded) {
        const surface = skateTestSurfaceAt(p.x, p.surfaceKind === 'platform' && test.dropThrough <= 0);
        // Pulo existe, mas a rampa não injeta força: ela transforma vx em subida pela própria inclinação.
        if (skateTestInput.jumpPressed) {
            if (surface.kind === 'platform' && skateTestInput.down) {
                test.dropThrough = 18;
                p.grounded = false;
                p.vy = .8;
                p.y += 4;
                p.surfaceKind = 'ground';
                skateTestSetEvent('DROP-THROUGH: ROTA BAIXA');
            } else {
                p.grounded = false;
                p.vy = -5.5;
                p.landedFrom = p.y;
                p.action = 'OLLIE';
            }
        } else {
            p.x += p.vx;
            const nextSurface = skateTestSurfaceAt(p.x, p.surfaceKind === 'platform' && test.dropThrough <= 0);
            // No topo do kicker a prancha deixa a superfície carregando o vetor da inclinação.
            if (surface.kind === 'ramp' && p.x > skateTestTrack.ramp.x2 && nextSurface.y > surface.y + 18) {
                p.grounded = false;
                p.vy = p.vx * surface.slope;
                p.landedFrom = p.y;
                p.action = 'OLLIE';
                skateTestSetEvent('LANÇAMENTO POR INÉRCIA');
                return;
            }
            p.y = nextSurface.y;
            p.surfaceKind = nextSurface.kind;
            p.targetAngle = Math.atan(nextSurface.slope);
            // Subir consome velocidade; descer converte o vetor vertical em aceleração horizontal.
            // A subida reduz velocidade; a descida devolve gravidade para vx.
            p.vx += Math.sin(p.targetAngle) * .045;
            p.vx = Math.max(.32, Math.min(5.2, p.vx));
            p.action = Math.abs(p.vx) > .5 ? 'CRUISE' : 'IDLE';
            return;
        }
    }

    // Rigidbody dinâmico: integração de velocidade, gravidade e teste real de aterrissagem.
    const oldY = p.y;
    p.vy += .285;
    p.x += p.vx;
    p.y += p.vy;
    p.targetAngle += (0 - p.targetAngle) * .12;

    if (skateTestInput.trickRequest) {
        skateTestStartTrick(p, skateTestInput.trickRequest);
        skateTestInput.trickRequest = '';
    }
    if (p.trick) {
        p.trickFrames++;
        if (p.trickFrames >= p.trickDuration) {
            p.trick = '';
            p.action = 'OLLIE';
        }
    }
    if (skateTestTryRail(p, oldY)) return;

    const allowPlatform = test.dropThrough <= 0;
    const surface = skateTestLandingSurfaceAt(p.x, oldY, allowPlatform);
    const crossedSurface = p.vy >= 0 && oldY <= surface.y && p.y >= surface.y;
    if (crossedSurface) {
        if (p.trick) {
            skateTestFail('WIPEOUT: finalize a manobra antes de pousar');
            return;
        }
        const impact = Math.abs(p.vy);
        p.y = surface.y;
        p.vy = 0;
        p.grounded = true;
        p.surfaceKind = surface.kind;
        p.targetAngle = Math.atan(surface.slope);
        p.squash = Math.min(1, impact / 7);
        if (impact > 3.7) test.shake = Math.min(5, impact);
        if (impact > 5.8) skateTestSetEvent('IMPACTO PERFEITO!');
        p.action = 'LAND';
    }
}

function updateSkateGame() {
    const test = window.skatePhysicsTest || (window.skatePhysicsTest = makeSkatePhysicsTest());
    if (test.state === 'TUTORIAL') {
        if (skateTestInput.jumpPressed || skateTestInput.right) {
            test.state = 'PLAYING';
            skateTestSetEvent('TESTE INICIADO: Rampa + Plataforma + Grind');
        }
        skateTestInput.jumpPressed = false;
        return;
    }
    if (test.state === 'GAMEOVER' || test.state === 'FINISH') {
        if (skateTestInput.jumpPressed || keys.r) resetSkateGame();
        skateTestInput.jumpPressed = false;
        return;
    }

    test.elapsed++;
    if (test.dropThrough > 0) test.dropThrough--;
    skateTestUpdatePhysics();
    const p = test.player;
    p.angle += (p.targetAngle - p.angle) * .25; // Raycast equivalente: normal da superfície define a prancha.
    p.squash *= .78;
    test.shake *= .78;
    test.cameraX += ((p.x - canvas.width * .30) - test.cameraX) * .08;
    const screenY = p.y - test.cameraY;
    let targetY = test.cameraY;
    if (screenY < 145) targetY = p.y - 145;
    if (screenY > 215) targetY = p.y - 215;
    test.cameraY += (targetY - test.cameraY) * .08;
    const zoomTarget = p.vx > 4.3 ? .91 : p.vx < .8 ? 1.04 : 1;
    test.cameraZoom += (zoomTarget - test.cameraZoom) * .06;
    if (test.lastEventTimer > 0) test.lastEventTimer--;

    if (p.x >= skateTestTrack.length || test.elapsed >= 60 * 10) {
        test.state = 'FINISH';
        skateTestSetEvent('TESTE CONCLUÍDO: 10 SEGUNDOS', 999);
    }
    skateTestInput.jumpPressed = false;
}

function skateTestDrawSurface(line, color, thickness = 5) {
    ctx.strokeStyle = color; ctx.lineWidth = thickness;
    ctx.beginPath(); ctx.moveTo(line.x1, line.y1); ctx.lineTo(line.x2, line.y2); ctx.stroke();
}

function skateTestDrawTrack() {
    const track = skateTestTrack;
    ctx.fillStyle = '#111827'; ctx.fillRect(-200, 250, 1900, 140);
    // Rota baixa contínua.
    skateTestDrawSurface({ x1: -100, y1: 250, x2: 1500, y2: 250 }, '#e5e7eb', 5);
    // Rampa triangular: é uma massa inclinada desenhada, não um botão de lançamento.
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.moveTo(track.ramp.x1, 250); ctx.lineTo(track.ramp.x2, track.ramp.y2); ctx.lineTo(track.ramp.x2, 250); ctx.closePath(); ctx.fill();
    skateTestDrawSurface(track.ramp, '#fbbf24', 5);
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.moveTo(track.exitRamp.x1, track.exitRamp.y1); ctx.lineTo(track.exitRamp.x2, 250); ctx.lineTo(track.exitRamp.x1, 250); ctx.closePath(); ctx.fill();
    skateTestDrawSurface(track.exitRamp, '#fbbf24', 5);
    // Plataforma alta one-way: linha magenta e base tracejada.
    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(track.highPlatform.x1, track.highPlatform.y); ctx.lineTo(track.highPlatform.x2, track.highPlatform.y); ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#f9a8d4'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(track.highPlatform.x1, track.highPlatform.y + 7); ctx.lineTo(track.highPlatform.x2, track.highPlatform.y + 7); ctx.stroke(); ctx.setLineDash([]);
    // Corrimão: somente uma linha azul de trigger.
    skateTestDrawSurface(track.rail, '#38bdf8', 3);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(track.rail.x1 + 10, track.rail.y1, 2, 41); ctx.fillRect(track.rail.x2 - 12, track.rail.y2, 2, 41);
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8'; ctx.fillText('RAIL / GRIND', (track.rail.x1 + track.rail.x2) / 2, track.rail.y1 - 10);
    ctx.fillStyle = '#f9a8d4'; ctx.fillText('PLATAFORMA ONE-WAY', (track.highPlatform.x1 + track.highPlatform.x2) / 2, track.highPlatform.y - 11);
    ctx.fillStyle = '#fbbf24'; ctx.fillText('RAMPA: INÉRCIA', (track.ramp.x1 + track.ramp.x2) / 2, 273);
}

function skateTestDrawPlayer() {
    const test = window.skatePhysicsTest, p = test.player;
    const squashX = 1 + p.squash * .16;
    const squashY = 1 - p.squash * .18;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.scale(squashX, squashY);
    // Avatar propositalmente geométrico: nenhuma arte de produção participa do teste.
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(-8, -33, 16, 25);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(-11, -8, 22, 5);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-15, -5, 30, 4);
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-10, 1, 3, 0, Math.PI * 2); ctx.arc(10, 1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function skateTestOverlay(title, lines, color) {
    ctx.fillStyle = 'rgba(4, 10, 22, .88)'; ctx.fillRect(23, 56, 404, 185);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(23, 56, 404, 185);
    ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = 'bold 16px monospace'; ctx.fillText(title, 225, 86);
    ctx.fillStyle = '#eef6ff'; ctx.font = '8px monospace';
    lines.forEach((line, index) => ctx.fillText(line, 225, 113 + index * 20));
}

function skateTestDrawHUD() {
    const test = window.skatePhysicsTest, p = test.player;
    ctx.fillStyle = 'rgba(4, 10, 22, .88)'; ctx.fillRect(0, 0, 450, 38);
    ctx.strokeStyle = '#64748b'; ctx.strokeRect(0, 0, 450, 38);
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#f8fafc';
    ctx.fillText(`TESTE FÍSICA  ${Math.min(10, (test.elapsed / 60).toFixed(1))}s / 10s`, 9, 15);
    ctx.fillStyle = '#fbbf24'; ctx.fillText(`VX ${p.vx.toFixed(1)}`, 9, 30);
    ctx.textAlign = 'center'; ctx.fillStyle = p.grinding ? '#38bdf8' : p.grounded ? '#86efac' : '#f9a8d4';
    ctx.fillText(p.grinding ? 'GRIND ATIVO' : p.grounded ? 'NO CHÃO' : 'NO AR', 225, 15);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '7px monospace';
    ctx.fillText(`ÂNGULO ${(p.angle * 180 / Math.PI).toFixed(0)}° | ZOOM ${test.cameraZoom.toFixed(2)}`, 225, 29);
    ctx.textAlign = 'right'; ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#f8fafc'; ctx.fillText(`SCORE ${Math.floor(test.score)}`, 441, 15);
    if (test.lastEventTimer > 0) {
        ctx.textAlign = 'center'; ctx.fillStyle = '#fbca4d'; ctx.font = 'bold 10px monospace'; ctx.fillText(test.lastEvent, 225, 54);
    }
}

function drawSkateGame() {
    const test = window.skatePhysicsTest || (window.skatePhysicsTest = makeSkatePhysicsTest());
    ctx.imageSmoothingEnabled = false;
    const shakeX = (Math.random() - .5) * test.shake;
    const shakeY = (Math.random() - .5) * test.shake;
    const sky = ctx.createLinearGradient(0, 0, 0, 300);
    sky.addColorStop(0, '#0f172a'); sky.addColorStop(1, '#312e81');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 450, 300);
    // Grade simples para revelar a câmera e a navegação vertical, sem arte final.
    ctx.strokeStyle = 'rgba(148, 163, 184, .12)'; ctx.lineWidth = 1;
    for (let x = 0; x < 450; x += 30) { ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x, 300); ctx.stroke(); }
    for (let y = 50; y < 300; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(450, y); ctx.stroke(); }
    ctx.save();
    ctx.translate(225 + shakeX, 185 + shakeY);
    ctx.scale(test.cameraZoom, test.cameraZoom);
    ctx.translate(-225 - test.cameraX, -185 - test.cameraY);
    skateTestDrawTrack();
    skateTestDrawPlayer();
    ctx.restore();
    skateTestDrawHUD();

    if (test.state === 'TUTORIAL') {
        skateTestOverlay('PROTOÓTIPO: GAME FEEL', [
            '[D] ACELERA  |  [A] FREIA',
            '[ESPAÇO] OLLIE  |  NO AR: ESPAÇO + A/D/W/S',
            'RAMPA CONVERTE A INÉRCIA; ELA NÃO É TRAMPOLIM.',
            'POUSE NO RAIL AZUL PARA GRINDAR.',
            '[↓ + ESPAÇO] NA PLATAFORMA: DROP-THROUGH',
            'ESPAÇO ou D PARA COMEÇAR'
        ], '#38bdf8');
    } else if (test.state === 'GAMEOVER') {
        skateTestOverlay('WIPEOUT', [
            test.lastEvent,
            'Teste novamente o timing de manobra e aterrissagem.',
            'ESPAÇO PARA REINICIAR'
        ], '#fb7185');
    } else if (test.state === 'FINISH') {
        skateTestOverlay('TESTE CONCLUÍDO', [
            `Score de teste: ${Math.floor(test.score)}`,
            'Inércia, rampa, plataforma, grind e câmera validados.',
            'ESPAÇO PARA REINICIAR'
        ], '#86efac');
    }
    ctx.textAlign = 'left';
}

resetSkateGame();
