/**
 * SISTEMA CENTRAL DE MEDALHAS DO OVERWORLD
 * Festival dos Esportes - Zorp 16-Bits
 */

(function(global) {
    // 1. Ordem oficial e metadados das 8 medalhas
    const MEDALHAS_REGISTRY = [
        {
            id: "pingpong",
            name: "Ping-Pong",
            cor: "Vermelha",
            lockedSrc: "medalhas/ping_pong_locked.png",
            unlockedSrc: "medalhas/ping_pong_unlocked.png",
            aliases: ["pingpong", "ping_pong"]
        },
        {
            id: "basquete",
            name: "Basquete",
            cor: "Laranja",
            lockedSrc: "medalhas/basquete_locked.png",
            unlockedSrc: "medalhas/basquete_unlocked.png",
            aliases: ["basquete", "basketball"]
        },
        {
            id: "corrida",
            name: "Corrida",
            cor: "Amarela",
            lockedSrc: "medalhas/corrida_locked.png",
            unlockedSrc: "medalhas/corrida_unlocked.png",
            aliases: ["corrida", "maratona"]
        },
        {
            id: "skate",
            name: "Skate",
            cor: "Verde",
            lockedSrc: "medalhas/skate_locked.png",
            unlockedSrc: "medalhas/skate_unlocked.png",
            aliases: ["skate"]
        },
        {
            id: "arco",
            name: "Arco e Flecha",
            cor: "Ciano",
            lockedSrc: "medalhas/arco_locked.png",
            unlockedSrc: "medalhas/arco_unlocked.png",
            aliases: ["arco", "arquearia"]
        },
        {
            id: "escalada",
            name: "Escalada",
            cor: "Azul",
            lockedSrc: "medalhas/escalada_locked.png",
            unlockedSrc: "medalhas/escalada_unlocked.png",
            aliases: ["escalada"]
        },
        {
            id: "boxe",
            name: "Boxe",
            cor: "Roxa",
            lockedSrc: "medalhas/boxe_locked.png",
            unlockedSrc: "medalhas/boxe_unlocked.png",
            aliases: ["boxe", "esqui"] // 'esqui' é o identificador histórico herdado da cena ILHA_ESQUI
        },
        {
            id: "surf",
            name: "Surf",
            cor: "Rosa",
            lockedSrc: "medalhas/surf_locked.png",
            unlockedSrc: "medalhas/surf_unlocked.png",
            aliases: ["surf"]
        }
    ];

    // 2. Pré-carregamento único em memória de todos os 16 sprites (zero alocações no loop)
    const ASSET_CACHE = {
        locked: {},
        unlocked: {}
    };

    MEDALHAS_REGISTRY.forEach(m => {
        const imgL = new Image();
        imgL.src = m.lockedSrc;
        m.imgLocked = imgL;
        ASSET_CACHE.locked[m.id] = imgL;

        const imgU = new Image();
        imgU.src = m.unlockedSrc;
        m.imgUnlocked = imgU;
        ASSET_CACHE.unlocked[m.id] = imgU;
    });

    // 3. Sistema de animação de desbloqueio (pop + brilho satisfatório de ~0.65s)
    const medalUnlockAnims = {};

    function dispararAnimacaoDesbloqueio(id) {
        medalUnlockAnims[id] = {
            startTime: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
            duration: 650
        };
    }

    // 4. Normalização de identificadores
    function normalizarId(id) {
        if (!id) return null;
        const lower = String(id).toLowerCase().trim();
        for (const m of MEDALHAS_REGISTRY) {
            if (m.id === lower || m.aliases.includes(lower)) {
                return m.id;
            }
        }
        return lower;
    }

    // 5. Suporte a modo QA isolado via URL (sem persistência no save real)
    let qaOverride = null;
    try {
        if (typeof window !== 'undefined' && window.location && window.location.search) {
            const params = new URLSearchParams(window.location.search);
            const qaParam = params.get('medalhasQa');
            if (qaParam) {
                qaOverride = {};
                MEDALHAS_REGISTRY.forEach(m => qaOverride[m.id] = false);
                if (qaParam === 'none') {
                    // Todas bloqueadas
                } else if (qaParam === 'all') {
                    MEDALHAS_REGISTRY.forEach(m => qaOverride[m.id] = true);
                } else if (qaParam === 'some') {
                    qaOverride.pingpong = true;
                    qaOverride.corrida = true;
                    qaOverride.skate = true;
                } else if (qaOverride[qaParam] !== undefined) {
                    qaOverride[qaParam] = true;
                } else {
                    const parts = qaParam.split(',');
                    parts.forEach(p => {
                        const n = normalizarId(p);
                        if (n && qaOverride[n] !== undefined) qaOverride[n] = true;
                    });
                }
                console.log('[Medalhas QA Mode Ativo]:', qaOverride);
            }
        }
    } catch (e) {
        // Ambiente de teste/headless
    }

    // 6. Persistência permanente em localStorage
    const STORAGE_KEY = "zorp_esportes_medalhas";

    function salvarMedalhas(insigniasObj) {
        if (qaOverride) return; // Modo QA nunca salva no disco
        try {
            if (typeof localStorage === 'undefined') return;
            const target = insigniasObj || global.insignias;
            if (!target) return;

            const estadoSalvar = {};
            MEDALHAS_REGISTRY.forEach(m => {
                estadoSalvar[m.id] = Boolean(target[m.id] || (m.aliases.some(a => target[a])));
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoSalvar));

            // Sincronizar chave de save legada do Surf para compatibilidade 100%
            if (estadoSalvar.surf) {
                localStorage.setItem("zorpSurfMedal", "1");
            }
        } catch (err) {
            console.warn('[Medalhas] Falha ao persistir medalhas:', err);
        }
    }

    function carregarMedalhas(insigniasObj) {
        const target = insigniasObj || global.insignias;
        if (!target) return;

        // Se modo QA está ativo, aplicar override
        if (qaOverride) {
            MEDALHAS_REGISTRY.forEach(m => {
                const val = Boolean(qaOverride[m.id]);
                target[m.id] = val;
                m.aliases.forEach(a => target[a] = val);
            });
            return;
        }

        try {
            if (typeof localStorage === 'undefined') return;

            // 1. Tentar carregar save moderno unificado
            const salvo = localStorage.getItem(STORAGE_KEY);
            if (salvo) {
                const dados = JSON.parse(salvo);
                MEDALHAS_REGISTRY.forEach(m => {
                    if (dados[m.id]) {
                        target[m.id] = true;
                        m.aliases.forEach(a => target[a] = true);
                    }
                });
            }

            // 2. Corrigir falso-positivo da medalha de surf:
            // Só é desbloqueada se foi completada legitimamente (zorpSurfCompleted === '1')
            const surfConcluido = localStorage.getItem("zorpSurfCompleted") === "1";
            if (!surfConcluido) {
                target.surf = false;
                if (salvo) {
                    try {
                        const dados = JSON.parse(salvo);
                        if (dados && dados.surf) {
                            dados.surf = false;
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
                        }
                    } catch (e) {}
                }
                localStorage.removeItem("zorpSurfMedal");
            } else {
                target.surf = true;
            }

            // 3. Sincronizar aliases (ex: esqui <-> boxe)
            if (target.esqui || target.boxe) {
                target.esqui = true;
                target.boxe = true;
            }
        } catch (err) {
            console.warn('[Medalhas] Falha ao carregar medalhas:', err);
        }
    }

    // 7. Função mestra de desbloqueio
    function desbloquearMedalha(esporteId) {
        const norm = normalizarId(esporteId);
        if (!norm) return false;

        const target = global.insignias;
        const jaTinha = target ? Boolean(target[norm]) : false;

        if (target) {
            target[norm] = true;
            const meta = MEDALHAS_REGISTRY.find(m => m.id === norm);
            if (meta) {
                meta.aliases.forEach(a => target[a] = true);
            }
        }

        if (!jaTinha) {
            dispararAnimacaoDesbloqueio(norm);
            salvarMedalhas(target);
            console.log(`[Medalha Conquistada]: ${norm.toUpperCase()}`);
        }

        return true;
    }

    function isMedalhaDesbloqueada(esporteId, insigniasObj) {
        const norm = normalizarId(esporteId);
        if (!norm) return false;
        const target = insigniasObj || global.insignias;
        if (!target) return false;
        return Boolean(target[norm]);
    }

    // 8. Renderizador oficial do HUD de medalhas no canto inferior esquerdo (Canvas 450x300)
    function drawMedalhasHUD(ctx, canvas, insigniasObj) {
        if (!ctx || !canvas) return;

        const target = insigniasObj || global.insignias || {};
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Dimensões do Shelf das Medalhas:
        // 8 medalhas x 24px (20px largura + 4px espaçamento) = 192px
        // Container: x=6, y=263, w=200, h=33
        const boxX = 6;
        const boxY = 263;
        const boxW = 200;
        const boxH = 33;

        // Fundo do painel estilo arcade retrô
        ctx.fillStyle = "rgba(10, 14, 26, 0.85)";
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Borda dourada sutil com cantos chanfrados de 1px
        ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

        // Borda interna de profundidade
        ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
        ctx.strokeRect(boxX + 1.5, boxY + 1.5, boxW - 3, boxH - 3);

        const medalW = 20;
        const medalH = 23;
        const startX = 10;
        const startY = 268;
        const spacingX = 24;

        for (let i = 0; i < MEDALHAS_REGISTRY.length; i++) {
            const m = MEDALHAS_REGISTRY[i];
            const unlocked = Boolean(target[m.id] || m.aliases.some(a => target[a]));
            const img = unlocked ? m.imgUnlocked : m.imgLocked;

            const mX = startX + i * spacingX;
            const mY = startY;

            // Verificar se há animação de desbloqueio ativa para esta medalha
            const anim = medalUnlockAnims[m.id];
            if (anim) {
                const elapsed = now - anim.startTime;
                const progress = elapsed / anim.duration;

                if (progress < 1.0) {
                    // Efeito Pop: cresce suavemente até 1.35x e acomoda de volta a 1.0x
                    let scale = 1.0;
                    if (progress < 0.4) {
                        scale = 1.0 + (progress / 0.4) * 0.35;
                    } else {
                        scale = 1.35 - ((progress - 0.4) / 0.6) * 0.35;
                    }

                    ctx.save();
                    const centerX = mX + medalW / 2;
                    const centerY = mY + medalH / 2;
                    ctx.translate(centerX, centerY);
                    ctx.scale(scale, scale);

                    if (img.complete && img.naturalWidth > 0) {
                        ctx.drawImage(img, -medalW / 2, -medalH / 2, medalW, medalH);
                    }

                    // Brilho / flash dourado
                    const flashAlpha = Math.max(0, 1 - progress * 1.6) * 0.65;
                    if (flashAlpha > 0) {
                        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
                        ctx.beginPath();
                        ctx.arc(0, 0, medalW * 0.7, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.restore();
                    continue;
                } else {
                    // Fim da animação; expurgar para não repetir ao voltar ao Overworld
                    delete medalUnlockAnims[m.id];
                }
            }

            // Renderização padrão direta e estável a 60 FPS
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, mX, mY, medalW, medalH);
            }
        }

        ctx.restore();
    }

    // 9. Exportar para escopo global
    global.MEDALHAS_REGISTRY = MEDALHAS_REGISTRY;
    global.desbloquearMedalha = desbloquearMedalha;
    global.isMedalhaDesbloqueada = isMedalhaDesbloqueada;
    global.salvarMedalhas = salvarMedalhas;
    global.carregarMedalhas = carregarMedalhas;
    global.drawMedalhasHUD = drawMedalhasHUD;
    global.dispararAnimacaoDesbloqueio = dispararAnimacaoDesbloqueio;

})(typeof window !== 'undefined' ? window : global);
