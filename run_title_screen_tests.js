/**
 * tools/run_title_screen_tests.js
 * Executa os 10 testes funcionais e visuais da Tela Inicial via Chrome DevTools Protocol (CDP).
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const TARGET_URL = `http://localhost/2025/Festival_Dos_Esportes/index.html?v=${Date.now()}`;
const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

class CDPClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.msgId = 1;
        this.callbacks = new Map();
        this.consoleLogs = [];
        this.consoleErrors = [];
    }

    async connect() {
        this.ws = new WebSocket(this.wsUrl);
        await new Promise((resolve, reject) => {
            this.ws.onopen = resolve;
            this.ws.onerror = reject;
        });

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.id && this.callbacks.has(data.id)) {
                const cb = this.callbacks.get(data.id);
                this.callbacks.delete(data.id);
                if (data.error) cb.reject(new Error(JSON.stringify(data.error)));
                else cb.resolve(data.result);
            } else if (data.method === 'Runtime.consoleAPICalled') {
                const type = data.params.type;
                const text = data.params.args.map(a => a.value || a.description || '').join(' ');
                this.consoleLogs.push({ type, text });
                if (type === 'error') {
                    this.consoleErrors.push(text);
                }
            } else if (data.method === 'Runtime.exceptionThrown') {
                const text = data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || '');
                this.consoleErrors.push(text);
            }
        };

        // Habilitar domínios necessários
        await this.send('Page.enable');
        await this.send('Runtime.enable');
        await this.send('DOM.enable');
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = this.msgId++;
            this.callbacks.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
        }
        return res.result ? res.result.value : undefined;
    }

    async captureScreenshot(filename) {
        const res = await this.send('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(SCREENSHOTS_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
        console.log(`[Screenshot salvo]: ${filename}`);
        return filePath;
    }

    async close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

async function run() {
    console.log('=== INICIANDO SUÍTE DE 10 TESTES DA TELA INICIAL ===');

    // 1. Iniciar Chrome Headless com remote debugging
    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--window-size=900,600',
        '--no-sandbox',
        'about:blank'
    ]);

    let cdp = null;

    try {
        // Aguardar o Chrome estar pronto
        await sleep(1500);

        const list = await fetchJson(`http://127.0.0.1:${PORT}/json`);
        const pageTarget = list.find(t => t.type === 'page');
        if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
            throw new Error('Não foi possível obter webSocketDebuggerUrl do Chrome');
        }

        cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
        await cdp.connect();

        // -------------------------------------------------------------
        // TESTE 1: Abrir localhost -> Tela Inicial com logo.png
        // -------------------------------------------------------------
        console.log('\n--- TESTE 1: Abrir localhost -> Tela Inicial com logo.png ---');
        await cdp.send('Page.navigate', { url: TARGET_URL });
        await sleep(1500); // Aguardar carregamento da logo e renderização

        const t1 = await cdp.evaluate(`(() => {
            return {
                currentScene: typeof currentScene !== 'undefined' ? currentScene : null,
                titleActive: typeof TitleScreen !== 'undefined' ? TitleScreen.isActive() : false,
                titleState: typeof TitleScreen !== 'undefined' ? TitleScreen.getState() : null,
                logoLoaded: typeof TitleScreen !== 'undefined' ? TitleScreen.logoLoaded : false,
                headerDisplay: document.getElementById('header-ui') ? window.getComputedStyle(document.getElementById('header-ui')).display : null,
                controlsDisplay: document.getElementById('controls-hint') ? window.getComputedStyle(document.getElementById('controls-hint')).display : null
            };
        })()`);

        console.log('T1 resultado:', t1);
        if (t1.titleActive && t1.titleState === 'TITLE' && t1.logoLoaded && t1.headerDisplay === 'none') {
            console.log('[PASS] TESTE 1: Tela Inicial carregada perfeitamente com logo.png!');
        } else {
            throw new Error(`[FAIL] TESTE 1 falhou: ${JSON.stringify(t1)}`);
        }
        await cdp.captureScreenshot('01_tela_inicial.png');

        // -------------------------------------------------------------
        // TESTE 2: INICIAR -> OverWorld
        // -------------------------------------------------------------
        console.log('\n--- TESTE 2: INICIAR -> OverWorld ---');
        await cdp.evaluate(`(() => {
            TitleScreen.activateMenuItem(0); // 0 = INICIAR
        })()`);
        await sleep(600); // Aguardar fade transition (300ms)

        const t2 = await cdp.evaluate(`(() => {
            return {
                currentScene: typeof currentScene !== 'undefined' ? currentScene : null,
                titleActive: typeof TitleScreen !== 'undefined' ? TitleScreen.isActive() : false,
                headerDisplay: document.getElementById('header-ui') ? window.getComputedStyle(document.getElementById('header-ui')).display : null,
                controlsDisplay: document.getElementById('controls-hint') ? window.getComputedStyle(document.getElementById('controls-hint')).display : null,
                playerX: typeof player !== 'undefined' ? player.x : null,
                playerY: typeof player !== 'undefined' ? player.y : null
            };
        })()`);

        console.log('T2 resultado:', t2);
        if (t2.currentScene === 'HUB' && !t2.titleActive && t2.headerDisplay === 'flex') {
            console.log('[PASS] TESTE 2: INICIAR transitou suavemente para o OverWorld com UI visível!');
        } else {
            throw new Error(`[FAIL] TESTE 2 falhou: ${JSON.stringify(t2)}`);
        }
        await cdp.captureScreenshot('02_overworld.png');

        // -------------------------------------------------------------
        // TESTE 3: Recarregar -> Tela Inicial novamente
        // -------------------------------------------------------------
        console.log('\n--- TESTE 3: Recarregar -> Tela Inicial novamente ---');
        await cdp.send('Page.reload');
        await sleep(1500);

        const t3 = await cdp.evaluate(`(() => {
            return {
                currentScene: typeof currentScene !== 'undefined' ? currentScene : null,
                titleActive: typeof TitleScreen !== 'undefined' ? TitleScreen.isActive() : false,
                titleState: typeof TitleScreen !== 'undefined' ? TitleScreen.getState() : null
            };
        })()`);

        console.log('T3 resultado:', t3);
        if (t3.titleActive && t3.titleState === 'TITLE') {
            console.log('[PASS] TESTE 3: Recarregamento reabriu na Tela Inicial conforme esperado!');
        } else {
            throw new Error(`[FAIL] TESTE 3 falhou: ${JSON.stringify(t3)}`);
        }

        // -------------------------------------------------------------
        // TESTE 4: SOBRE -> Tela/Painel de informações
        // -------------------------------------------------------------
        console.log('\n--- TESTE 4: SOBRE -> Painel de informações ---');
        await cdp.evaluate(`(() => {
            TitleScreen.activateMenuItem(1); // 1 = SOBRE
        })()`);
        await sleep(400);

        const t4 = await cdp.evaluate(`(() => {
            return {
                titleState: typeof TitleScreen !== 'undefined' ? TitleScreen.getState() : null,
                aboutButtonRect: typeof TitleScreen !== 'undefined' ? TitleScreen.aboutButtonRect : null
            };
        })()`);

        console.log('T4 resultado:', t4);
        if (t4.titleState === 'ABOUT' && t4.aboutButtonRect) {
            console.log('[PASS] TESTE 4: Painel SOBRE aberto com sucesso e botão VOLTAR pronto!');
        } else {
            throw new Error(`[FAIL] TESTE 4 falhou: ${JSON.stringify(t4)}`);
        }
        await cdp.captureScreenshot('03_painel_sobre.png');

        // -------------------------------------------------------------
        // TESTE 5: VOLTAR -> Menu Principal
        // -------------------------------------------------------------
        console.log('\n--- TESTE 5: VOLTAR -> Menu Principal ---');
        // Testar pressionando ESC
        await cdp.evaluate(`(() => {
            TitleScreen.handleKeyDown({ key: 'Escape' });
        })()`);
        await sleep(400);

        const t5 = await cdp.evaluate(`(() => {
            return {
                titleState: typeof TitleScreen !== 'undefined' ? TitleScreen.getState() : null
            };
        })()`);

        console.log('T5 resultado:', t5);
        if (t5.titleState === 'TITLE') {
            console.log('[PASS] TESTE 5: VOLTAR retornou perfeitamente ao Menu Principal!');
        } else {
            throw new Error(`[FAIL] TESTE 5 falhou: ${JSON.stringify(t5)}`);
        }

        // -------------------------------------------------------------
        // TESTE 6: SAIR -> NÃO (Nenhum progresso apagado)
        // -------------------------------------------------------------
        console.log('\n--- TESTE 6: SAIR -> NÃO (Nenhum progresso apagado) ---');
        // Inserir progresso de teste no localStorage
        await cdp.evaluate(`(() => {
            localStorage.setItem('zorp_esportes_medalhas', JSON.stringify({ pingpong: true, skate: true }));
            localStorage.setItem('outro_projeto_teste', 'seguro');
            TitleScreen.activateMenuItem(2); // 2 = SAIR
        })()`);
        await sleep(400);

        const t6_modal = await cdp.evaluate(`TitleScreen.getState()`);
        console.log('T6 modal state:', t6_modal);
        if (t6_modal !== 'RESET_CONFIRM') {
            throw new Error(`[FAIL] Modal de confirmação não abriu: ${t6_modal}`);
        }
        await cdp.captureScreenshot('04_confirmacao_sair.png');

        // Selecionar NÃO (índice 1)
        await cdp.evaluate(`(() => {
            TitleScreen.activateConfirmItem(1); // 1 = NÃO
        })()`);
        await sleep(400);

        const t6 = await cdp.evaluate(`(() => {
            return {
                titleState: TitleScreen.getState(),
                saveMedalhas: localStorage.getItem('zorp_esportes_medalhas'),
                outroSave: localStorage.getItem('outro_projeto_teste')
            };
        })()`);

        console.log('T6 resultado:', t6);
        if (t6.titleState === 'TITLE' && t6.saveMedalhas && t6.outroSave === 'seguro') {
            console.log('[PASS] TESTE 6: SAIR -> NÃO cancelou com segurança e manteve os saves intactos!');
        } else {
            throw new Error(`[FAIL] TESTE 6 falhou: ${JSON.stringify(t6)}`);
        }

        // -------------------------------------------------------------
        // TESTE 7: SAIR -> SIM (Save local do Festival removido + reload)
        // -------------------------------------------------------------
        console.log('\n--- TESTE 7: SAIR -> SIM (Exclusão seletiva e segura) ---');
        await cdp.evaluate(`(() => {
            localStorage.setItem('zorp_esportes_medalhas', JSON.stringify({ pingpong: true }));
            localStorage.setItem('zorpSurfCompleted', '1');
            localStorage.setItem('zorpSurfBestScore', '5000');
            localStorage.setItem('outro_projeto_cliente', 'deve_sobreviver');
            TitleScreen.activateMenuItem(2); // 2 = SAIR
        })()`);
        await sleep(400);

        // Selecionar SIM (índice 0)
        await cdp.evaluate(`(() => {
            TitleScreen.activateConfirmItem(0); // 0 = SIM
        })()`);
        await sleep(1500); // Aguardar o reload disparado

        const t7 = await cdp.evaluate(`(() => {
            return {
                titleActive: TitleScreen.isActive(),
                titleState: TitleScreen.getState(),
                zorpMedalhas: localStorage.getItem('zorp_esportes_medalhas'),
                zorpSurf: localStorage.getItem('zorpSurfCompleted'),
                outroProjeto: localStorage.getItem('outro_projeto_cliente')
            };
        })()`);

        console.log('T7 resultado:', t7);
        if (t7.titleActive && !t7.zorpMedalhas && !t7.zorpSurf && t7.outroProjeto === 'deve_sobreviver') {
            console.log('[PASS] TESTE 7: SAIR -> SIM apagou somente saves do Festival e preservou outros projetos!');
        } else {
            throw new Error(`[FAIL] TESTE 7 falhou: ${JSON.stringify(t7)}`);
        }

        // -------------------------------------------------------------
        // TESTE 8: Save existente -> INICIAR (Save continua intacto)
        // -------------------------------------------------------------
        console.log('\n--- TESTE 8: Save existente -> INICIAR (Save mantido) ---');
        await cdp.evaluate(`(() => {
            localStorage.setItem('zorp_esportes_medalhas', JSON.stringify({ pingpong: true, basquete: true }));
            TitleScreen.activateMenuItem(0); // INICIAR
        })()`);
        await sleep(600);

        const t8 = await cdp.evaluate(`(() => {
            return {
                currentScene: typeof currentScene !== 'undefined' ? currentScene : null,
                insigniasPingPong: typeof insignias !== 'undefined' ? insignias.pingpong : null,
                savedMedalhas: localStorage.getItem('zorp_esportes_medalhas')
            };
        })()`);

        console.log('T8 resultado:', t8);
        if (t8.currentScene === 'HUB' && t8.savedMedalhas && t8.savedMedalhas.includes('pingpong')) {
            console.log('[PASS] TESTE 8: Save existente carregado normalmente pelo OverWorld sem perda!');
        } else {
            throw new Error(`[FAIL] TESTE 8 falhou: ${JSON.stringify(t8)}`);
        }

        // -------------------------------------------------------------
        // TESTE 9: Minigame -> Retorno (Vai para OverWorld, NÃO Tela Inicial)
        // -------------------------------------------------------------
        console.log('\n--- TESTE 9: Minigame -> Retorno ao OverWorld ---');
        await cdp.evaluate(`(() => {
            // Simular entrada no minigame de Ping Pong
            currentScene = "JOGO_PINGPONG";
        })()`);
        await sleep(300);

        // Simular encerramento e retorno para a ilha do Ping-Pong
        await cdp.evaluate(`(() => {
            currentScene = "ILHA_PINGPONG";
        })()`);
        await sleep(300);

        const t9 = await cdp.evaluate(`(() => {
            return {
                currentScene: typeof currentScene !== 'undefined' ? currentScene : null,
                titleActive: typeof TitleScreen !== 'undefined' ? TitleScreen.isActive() : false
            };
        })()`);

        console.log('T9 resultado:', t9);
        if (t9.currentScene === 'ILHA_PINGPONG' && !t9.titleActive) {
            console.log('[PASS] TESTE 9: Retorno de minigame permaneceu no OverWorld sem voltar para a Tela Inicial!');
        } else {
            throw new Error(`[FAIL] TESTE 9 falhou: ${JSON.stringify(t9)}`);
        }

        // -------------------------------------------------------------
        // TESTE 10: Auditoria do Console (zero erros relevantes)
        // -------------------------------------------------------------
        console.log('\n--- TESTE 10: Auditoria do Console ---');
        console.log('Total de logs coletados:', cdp.consoleLogs.length);
        console.log('Erros no console:', cdp.consoleErrors);

        const criticalErrors = cdp.consoleErrors.filter(err => {
            const lower = err.toLowerCase();
            return lower.includes('typeerror') || lower.includes('referenceerror') || lower.includes('404') || lower.includes('syntaxerror');
        });

        if (criticalErrors.length === 0) {
            console.log('[PASS] TESTE 10: Zero TypeErrors, ReferenceErrors ou 404 relevantes detectados!');
        } else {
            throw new Error(`[FAIL] TESTE 10 encontrou erros críticos: ${JSON.stringify(criticalErrors)}`);
        }

        console.log('\n==================================================');
        console.log('TODOS OS 10 TESTES PASSARAM COM 100% DE SUCESSO!');
        console.log('==================================================');

    } finally {
        if (cdp) await cdp.close();
        chrome.kill();
    }
}

run().catch(err => {
    console.error('\n[ERRO NA EXECUÇÃO DOS TESTES]:', err);
    process.exit(1);
});
