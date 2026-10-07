/**
 * SUÍTE DE TESTES OBRIGATÓRIOS DO SISTEMA DE MEDALHAS DO OVERWORLD
 */

const fs = require('fs');

console.log('=== INICIANDO SUÍTE DE TESTES DO SISTEMA DE MEDALHAS ===\n');

// Mock do ambiente do navegador
class MockLocalStorage {
    constructor() { this.store = {}; }
    getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
    setItem(k, v) { this.store[k] = String(v); }
    removeItem(k) { delete this.store[k]; }
    clear() { this.store = {}; }
}

class MockImage {
    constructor() {
        this.src = '';
        this.complete = true;
        this.naturalWidth = 335;
        this.naturalHeight = 388;
    }
}

class MockCanvasContext {
    constructor() {
        this.drawCalls = [];
        this.imageSmoothingEnabled = true;
    }
    save() {}
    restore() {}
    fillRect(x, y, w, h) { this.drawCalls.push({ type: 'fillRect', x, y, w, h }); }
    strokeRect(x, y, w, h) { this.drawCalls.push({ type: 'strokeRect', x, y, w, h }); }
    drawImage(img, x, y, w, h) { this.drawCalls.push({ type: 'drawImage', src: img.src, x, y, w, h }); }
    translate() {}
    scale() {}
    beginPath() {}
    arc() {}
    fill() {}
}

const mockCanvas = { width: 450, height: 300 };

// Setup do ambiente global
global.window = global;
global.localStorage = new MockLocalStorage();
global.Image = MockImage;
global.performance = { now: () => Date.now() };

// Carregar medalhas_registry.js
require('../medalhas_registry.js');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`[PASS] ${testName}`);
        passCount++;
    } else {
        console.error(`[FAIL] ${testName} ${details}`);
        failCount++;
    }
}

// -------------------------------------------------------------
// TESTE 1 — Novo save: Começar com zero medalhas. Esperado: 8 bloqueadas.
// -------------------------------------------------------------
localStorage.clear();
global.insignias = {};
global.MEDALHAS_REGISTRY.forEach(m => global.insignias[m.id] = false);
carregarMedalhas(global.insignias);

let t1AllLocked = global.MEDALHAS_REGISTRY.every(m => !isMedalhaDesbloqueada(m.id));
assert(t1AllLocked, 'TESTE 1 — Novo save: Todas as 8 medalhas iniciam bloqueadas');

// -------------------------------------------------------------
// TESTE 2 — Uma vitória: Conquistar somente Ping-Pong. Esperado: 1 colorida e 7 bloqueadas.
// -------------------------------------------------------------
desbloquearMedalha('pingpong');
let t2PingPong = isMedalhaDesbloqueada('pingpong');
let t2OutrasBloqueadas = global.MEDALHAS_REGISTRY.filter(m => m.id !== 'pingpong').every(m => !isMedalhaDesbloqueada(m.id));
assert(t2PingPong && t2OutrasBloqueadas, 'TESTE 2 — Uma vitória: Somente Ping-Pong desbloqueada (1 colorida, 7 bloqueadas)');

// -------------------------------------------------------------
// TESTE 3 — Derrota: Perder um minigame sem cumprir sua condição de medalha.
// -------------------------------------------------------------
// Simula derrota em Basquete (não chama desbloquearMedalha)
let t3BasqueteBloqueado = !isMedalhaDesbloqueada('basquete');
assert(t3BasqueteBloqueado && isMedalhaDesbloqueada('pingpong'), 'TESTE 3 — Derrota: Nenhuma nova medalha concedida e Ping-Pong preservado');

// -------------------------------------------------------------
// TESTE 4 — Várias conquistas: Conquistar Ping-Pong, Corrida e Skate.
// -------------------------------------------------------------
desbloquearMedalha('corrida');
desbloquearMedalha('skate');
let t4Esperadas = ['pingpong', 'corrida', 'skate'];
let t4Corretas = global.MEDALHAS_REGISTRY.every(m => {
    const shouldBe = t4Esperadas.includes(m.id);
    return isMedalhaDesbloqueada(m.id) === shouldBe;
});
assert(t4Corretas, 'TESTE 4 — Várias conquistas: Exatamente Ping-Pong, Corrida e Skate desbloqueadas');

// -------------------------------------------------------------
// TESTE 5 — Persistência: Atualizar a página. Esperado: conquistas preservadas.
// -------------------------------------------------------------
// Simular reload criando novo objeto de insignias e recarregando do localStorage
const reiniciouInsignias = {};
global.MEDALHAS_REGISTRY.forEach(m => reiniciouInsignias[m.id] = false);
carregarMedalhas(reiniciouInsignias);
let t5Preservadas = t4Esperadas.every(id => reiniciouInsignias[id] === true) &&
    global.MEDALHAS_REGISTRY.filter(m => !t4Esperadas.includes(m.id)).every(m => !reiniciouInsignias[m.id]);
assert(t5Preservadas, 'TESTE 5 — Persistência: Conquistas mantidas intactas após simulação de refresh');

// -------------------------------------------------------------
// TESTE 6 — Reiniciar minigame: Entrar novamente em um minigame já vencido.
// -------------------------------------------------------------
// Desbloqueia novamente Ping-Pong (não deve duplicar ou bugar)
desbloquearMedalha('pingpong');
assert(reiniciouInsignias.pingpong === true, 'TESTE 6 — Reiniciar minigame: Medalha de Ping-Pong permanece conquistada');

// -------------------------------------------------------------
// TESTE 7 — Ordem correta: Verificar que cada esporte utiliza a imagem correspondente.
// -------------------------------------------------------------
const ordemEsperada = [
    { id: 'pingpong', nome: 'Ping-Pong', cor: 'Vermelha', arqL: 'ping_pong_locked.png', arqU: 'ping_pong_unlocked.png' },
    { id: 'basquete', nome: 'Basquete', cor: 'Laranja', arqL: 'basquete_locked.png', arqU: 'basquete_unlocked.png' },
    { id: 'corrida', nome: 'Corrida', cor: 'Amarela', arqL: 'corrida_locked.png', arqU: 'corrida_unlocked.png' },
    { id: 'skate', nome: 'Skate', cor: 'Verde', arqL: 'skate_locked.png', arqU: 'skate_unlocked.png' },
    { id: 'arco', nome: 'Arco e Flecha', cor: 'Ciano', arqL: 'arco_locked.png', arqU: 'arco_unlocked.png' },
    { id: 'escalada', nome: 'Escalada', cor: 'Azul', arqL: 'escalada_locked.png', arqU: 'escalada_unlocked.png' },
    { id: 'boxe', nome: 'Boxe', cor: 'Roxa', arqL: 'boxe_locked.png', arqU: 'boxe_unlocked.png' },
    { id: 'surf', nome: 'Surf', cor: 'Rosa', arqL: 'surf_locked.png', arqU: 'surf_unlocked.png' }
];

let t7OrdemOk = true;
for (let i = 0; i < ordemEsperada.length; i++) {
    const reg = global.MEDALHAS_REGISTRY[i];
    const exp = ordemEsperada[i];
    if (reg.id !== exp.id || !reg.lockedSrc.endsWith(exp.arqL) || !reg.unlockedSrc.endsWith(exp.arqU)) {
        t7OrdemOk = false;
        console.error(`Ordem incorreta no índice ${i}: esperado ${exp.id}, encontrado ${reg.id}`);
    }
}
assert(t7OrdemOk, 'TESTE 7 — Ordem correta: Todas as 8 medalhas posicionadas nos slots e arquivos corretos');

// -------------------------------------------------------------
// TESTE 8 — Todas as medalhas: Simular um save com oito conquistas válidas.
// -------------------------------------------------------------
global.MEDALHAS_REGISTRY.forEach(m => desbloquearMedalha(m.id));
let t8TodasDesbloqueadas = global.MEDALHAS_REGISTRY.every(m => isMedalhaDesbloqueada(m.id));
assert(t8TodasDesbloqueadas, 'TESTE 8 — Todas as medalhas: Todas as 8 medalhas desbloqueadas com sucesso');

// -------------------------------------------------------------
// TESTE 9 — Retorno ao OverWorld: Ganhar uma medalha e renderizar o HUD.
// -------------------------------------------------------------
const ctxMock = new MockCanvasContext();
drawMedalhasHUD(ctxMock, mockCanvas, global.insignias);
// 8 drawImage calls correspondentes às 8 medalhas desbloqueadas
const drawImageCalls = ctxMock.drawCalls.filter(c => c.type === 'drawImage');
const t9AllUnlockedImages = drawImageCalls.length === 8 && drawImageCalls.every(c => c.src.includes('_unlocked.png'));
assert(t9AllUnlockedImages, 'TESTE 9 — Retorno ao OverWorld: HUD renderiza exatamente as 8 medalhas coloridas');

// -------------------------------------------------------------
// TESTE 10 — Save antigo & Correção do Surf:
// Verificar que Surf NÃO desbloqueia sem conclusão legítima e preserva saves com esqui/boxe
// -------------------------------------------------------------
localStorage.clear();
// 10a: Simular save com zorpSurfMedal falso-positivo sem ter completado legitimamente
localStorage.setItem('zorpSurfMedal', '1');
const saveSemConclusao = { esqui: true };
carregarMedalhas(saveSemConclusao);
let t10aSurfBloqueado = saveSemConclusao.surf === false;
let t10aBoxeSincronizado = saveSemConclusao.boxe === true && saveSemConclusao.esqui === true;

// 10b: Simular save legítimo com zorpSurfCompleted = '1'
localStorage.setItem('zorpSurfCompleted', '1');
const saveComConclusao = { esqui: true };
carregarMedalhas(saveComConclusao);
let t10bSurfDesbloqueado = saveComConclusao.surf === true;

assert(t10aSurfBloqueado && t10aBoxeSincronizado && t10bSurfDesbloqueado, 'TESTE 10 — Save antigo & Correção do Surf: Falso-positivo prevenido e conclusão legítima preservada');

// -------------------------------------------------------------
// RESULTADO FINAL
// -------------------------------------------------------------
console.log(`\n=== SUÍTE DE TESTES CONCLUÍDA ===`);
console.log(`PASSOU: ${passCount} | FALHOU: ${failCount}`);

if (failCount > 0) {
    process.exit(1);
} else {
    console.log('TODOS OS 10 TESTES PASSARAM COM 100% DE SUCESSO!\n');
}
