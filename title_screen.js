/**
 * title_screen.js
 * Tela Inicial Oficial do Festival dos Esportes (Ilha dos Campeões)
 * 
 * Fluxo: CARREGAMENTO -> TELA INICIAL -> INICIAR -> OVERWORLD
 */

(function(global) {
    "use strict";

    // Estados possíveis da Tela Inicial
    const STATES = {
        LOADING: "LOADING",
        TITLE: "TITLE",
        ABOUT: "ABOUT",
        RESET_CONFIRM: "RESET_CONFIRM"
    };

    // Chaves de localStorage pertencentes exclusivamente ao Festival dos Esportes
    const FESTIVAL_STORAGE_KEYS = [
        "zorp_esportes_medalhas",
        "zorpSurfMedal",
        "zorpSurfCompleted",
        "zorpSurfBestDistance",
        "zorpSurfBestScore",
        "zorpSurfStoryMilestone"
    ];

    // Configuração do Sistema da Tela Inicial
    const TitleScreen = {
        active: true,
        state: STATES.LOADING,
        previousState: null,

        // Canvas e contexto
        canvas: null,
        ctx: null,

        // Callbacks
        onStartGame: null,
        onResetGame: null,

        // Asset da Logo
        logoImg: null,
        logoLoaded: false,
        logoFailed: false,

        // Transições e animações
        fadeAlpha: 0,
        fadeTarget: 0,
        fadeSpeed: 0.05, // ~250-350ms em 60fps
        fadeAction: null,
        animTime: 0,
        sparkleTimer: 0,
        sparkles: [],

        // Background Parallax
        clouds: [
            { x: 20, y: 35, w: 75, h: 18, speed: 0.12 },
            { x: 160, y: 20, w: 90, h: 22, speed: 0.08 },
            { x: 310, y: 48, w: 60, h: 16, speed: 0.15 },
            { x: 420, y: 28, w: 85, h: 20, speed: 0.10 }
        ],
        particles: [],

        // Menu Principal
        menuItems: [
            { id: "INICIAR", label: "INICIAR" },
            { id: "SOBRE", label: "SOBRE" },
            { id: "SAIR", label: "SAIR" }
        ],
        selectedIndex: 0,
        buttonRects: [],

        // Confirmação de Reset (SAIR)
        confirmSelectedIndex: 1, // 0: SIM, 1: NÃO (NÃO é o padrão seguro)
        confirmButtons: [
            { id: "SIM", label: "SIM" },
            { id: "NAO", label: "NÃO" }
        ],
        confirmButtonRects: [],

        // Botão Voltar da tela SOBRE
        aboutButtonRect: null,
        aboutScrollY: 0,

        // Inicialização
        init(config) {
            config = config || {};
            this.canvas = config.canvas || document.getElementById("gameCanvas");
            this.ctx = config.ctx || (this.canvas ? this.canvas.getContext("2d") : null);
            this.onStartGame = config.onStartGame || null;
            this.onResetGame = config.onResetGame || null;

            // Criar partículas procedurais do background
            this.particles = [];
            for (let i = 0; i < 22; i++) {
                this.particles.push({
                    x: Math.random() * (this.canvas ? this.canvas.width : 450),
                    y: Math.random() * (this.canvas ? this.canvas.height : 300),
                    radius: 1 + Math.random() * 1.5,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: -0.2 - Math.random() * 0.4,
                    alpha: 0.2 + Math.random() * 0.6,
                    pulse: Math.random() * Math.PI * 2
                });
            }

            // Iniciar o preload da logo oficial
            this.preloadLogo();

            // Registrar listeners de mouse de forma segura
            this.setupMouseEvents();

            return this;
        },

        preloadLogo() {
            this.state = STATES.LOADING;
            this.logoImg = new Image();
            this.logoImg.onload = () => {
                this.logoLoaded = true;
                this.logoFailed = false;
                if (this.state === STATES.LOADING) {
                    this.state = STATES.TITLE;
                    this.fadeAlpha = 0;
                }
            };
            this.logoImg.onerror = (err) => {
                console.error("[TitleScreen] Falha ao carregar logo.png. Usando fallback seguro.", err);
                this.logoLoaded = false;
                this.logoFailed = true;
                if (this.state === STATES.LOADING) {
                    this.state = STATES.TITLE;
                    this.fadeAlpha = 0;
                }
            };
            this.logoImg.src = "logo.png";

            // Se a imagem já estiver em cache
            if (this.logoImg.complete && this.logoImg.naturalWidth > 0) {
                this.logoLoaded = true;
                this.state = STATES.TITLE;
            }
        },

        isActive() {
            return this.active;
        },

        getState() {
            return this.state;
        },

        setState(newState) {
            this.state = newState;
        },

        // -------------------------------------------------------------
        // Transições com Fade
        // -------------------------------------------------------------
        startTransition(action) {
            this.fadeAction = action;
            this.fadeTarget = 1.0;
        },

        // -------------------------------------------------------------
        // Eventos de Mouse com Compensação de Letterboxing (object-fit: contain)
        // -------------------------------------------------------------
        getCanvasCoords(e) {
            if (!this.canvas) return { x: -1, y: -1, inside: false };
            const rect = this.canvas.getBoundingClientRect();
            const canvasAspect = this.canvas.width / this.canvas.height;
            const elemAspect = rect.width / rect.height;

            let renderW = rect.width;
            let renderH = rect.height;
            let offsetX = 0;
            let offsetY = 0;

            if (elemAspect > canvasAspect) {
                renderW = rect.height * canvasAspect;
                offsetX = (rect.width - renderW) / 2;
            } else {
                renderH = rect.width / canvasAspect;
                offsetY = (rect.height - renderH) / 2;
            }

            const clientX = e.clientX - rect.left - offsetX;
            const clientY = e.clientY - rect.top - offsetY;

            const x = (clientX / renderW) * this.canvas.width;
            const y = (clientY / renderH) * this.canvas.height;
            const inside = clientX >= 0 && clientX <= renderW && clientY >= 0 && clientY <= renderH;

            return { x, y, inside };
        },

        setupMouseEvents() {
            if (!this.canvas) return;

            this.canvas.addEventListener("mousemove", (e) => {
                if (!this.isActive()) return;
                const pos = this.getCanvasCoords(e);
                if (!pos.inside) {
                    this.canvas.style.cursor = "default";
                    return;
                }

                let isHovering = false;

                if (this.state === STATES.TITLE) {
                    for (let i = 0; i < this.buttonRects.length; i++) {
                        const r = this.buttonRects[i];
                        if (r && pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
                            this.selectedIndex = i;
                            isHovering = true;
                            break;
                        }
                    }
                } else if (this.state === STATES.RESET_CONFIRM) {
                    for (let i = 0; i < this.confirmButtonRects.length; i++) {
                        const r = this.confirmButtonRects[i];
                        if (r && pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
                            this.confirmSelectedIndex = i;
                            isHovering = true;
                            break;
                        }
                    }
                } else if (this.state === STATES.ABOUT) {
                    const r = this.aboutButtonRect;
                    if (r && pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
                        isHovering = true;
                    }
                }

                this.canvas.style.cursor = isHovering ? "pointer" : "default";
            });

            this.canvas.addEventListener("click", (e) => {
                if (!this.isActive()) return;
                const pos = this.getCanvasCoords(e);
                if (!pos.inside) return;

                if (this.state === STATES.TITLE) {
                    for (let i = 0; i < this.buttonRects.length; i++) {
                        const r = this.buttonRects[i];
                        if (r && pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
                            this.selectedIndex = i;
                            this.activateMenuItem(i);
                            break;
                        }
                    }
                } else if (this.state === STATES.RESET_CONFIRM) {
                    for (let i = 0; i < this.confirmButtonRects.length; i++) {
                        const r = this.confirmButtonRects[i];
                        if (r && pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
                            this.confirmSelectedIndex = i;
                            this.activateConfirmItem(i);
                            break;
                        }
                    }
                } else if (this.state === STATES.ABOUT) {
                    const r = this.aboutButtonRect;
                    if (r && pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
                        this.closeAbout();
                    }
                }
            });

            this.canvas.addEventListener("mouseleave", () => {
                if (this.canvas) this.canvas.style.cursor = "default";
            });
        },

        // -------------------------------------------------------------
        // Controles de Teclado
        // -------------------------------------------------------------
        handleKeyDown(e) {
            if (!this.isActive()) return false;
            const k = e.key.toLowerCase();

            // Bloquear se estiver no meio de um fade para Overworld
            if (this.fadeAction && this.fadeTarget === 1.0) {
                return true;
            }

            if (this.state === STATES.TITLE) {
                if (k === "arrowup" || k === "w") {
                    this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
                    return true;
                }
                if (k === "arrowdown" || k === "s") {
                    this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
                    return true;
                }
                if (k === "enter" || k === " ") {
                    this.activateMenuItem(this.selectedIndex);
                    return true;
                }
            } else if (this.state === STATES.ABOUT) {
                if (k === "escape" || k === "backspace" || k === "enter" || k === " ") {
                    this.closeAbout();
                    return true;
                }
            } else if (this.state === STATES.RESET_CONFIRM) {
                if (k === "arrowleft" || k === "a" || k === "arrowup" || k === "w") {
                    this.confirmSelectedIndex = 0; // SIM
                    return true;
                }
                if (k === "arrowright" || k === "d" || k === "arrowdown" || k === "s") {
                    this.confirmSelectedIndex = 1; // NÃO
                    return true;
                }
                if (k === "enter" || k === " ") {
                    this.activateConfirmItem(this.confirmSelectedIndex);
                    return true;
                }
                if (k === "escape" || k === "backspace") {
                    // ESC cancela e volta com segurança
                    this.activateConfirmItem(1);
                    return true;
                }
            }

            return false;
        },

        handleKeyUp(e) {
            if (!this.isActive()) return false;
            return true;
        },

        // -------------------------------------------------------------
        // Ações de Menu
        // -------------------------------------------------------------
        activateMenuItem(index) {
            const item = this.menuItems[index];
            if (!item) return;

            if (item.id === "INICIAR") {
                this.startGame();
            } else if (item.id === "SOBRE") {
                this.openAbout();
            } else if (item.id === "SAIR") {
                this.openResetConfirm();
            }
        },

        startGame() {
            // Fade curto de saída -> Iniciar OverWorld
            this.startTransition(() => {
                this.active = false;
                if (this.canvas) this.canvas.style.cursor = "default";
                if (typeof this.onStartGame === "function") {
                    this.onStartGame();
                }
            });
        },

        openAbout() {
            this.startTransition(() => {
                this.state = STATES.ABOUT;
                this.fadeAlpha = 0;
            });
        },

        closeAbout() {
            this.startTransition(() => {
                this.state = STATES.TITLE;
                this.fadeAlpha = 0;
            });
        },

        openResetConfirm() {
            this.confirmSelectedIndex = 1; // Padrão seguro em NÃO
            this.startTransition(() => {
                this.state = STATES.RESET_CONFIRM;
                this.fadeAlpha = 0;
            });
        },

        closeResetConfirm() {
            this.startTransition(() => {
                this.state = STATES.TITLE;
                this.fadeAlpha = 0;
            });
        },

        activateConfirmItem(index) {
            if (index === 0) {
                // SIM: Apagar progresso exclusivo do Festival e recarregar
                this.executeResetProgress();
            } else {
                // NÃO: Voltar ao menu sem tocar no progresso
                this.closeResetConfirm();
            }
        },

        executeResetProgress() {
            try {
                if (typeof localStorage !== "undefined") {
                    // 1. Remover chaves explícitas do Festival
                    FESTIVAL_STORAGE_KEYS.forEach(k => {
                        localStorage.removeItem(k);
                    });

                    // 2. Remover qualquer chave local adicional do Festival (prefixo 'zorp')
                    const toRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.toLowerCase().startsWith("zorp")) {
                            toRemove.push(key);
                        }
                    }
                    toRemove.forEach(k => localStorage.removeItem(k));
                }
            } catch (err) {
                console.warn("[TitleScreen] Erro ao limpar progresso do Festival no localStorage:", err);
            }

            if (typeof this.onResetGame === "function") {
                this.onResetGame();
            } else {
                window.location.reload();
            }
        },

        // -------------------------------------------------------------
        // Loop de Atualização
        // -------------------------------------------------------------
        update() {
            if (!this.isActive()) return;
            this.animTime += 1;

            // Atualizar fade de transição
            if (this.fadeTarget > this.fadeAlpha) {
                this.fadeAlpha += this.fadeSpeed;
                if (this.fadeAlpha >= this.fadeTarget) {
                    this.fadeAlpha = this.fadeTarget;
                    if (typeof this.fadeAction === "function") {
                        const action = this.fadeAction;
                        this.fadeAction = null;
                        this.fadeTarget = 0; // Desvanecer de volta
                        action();
                    }
                }
            } else if (this.fadeTarget < this.fadeAlpha) {
                this.fadeAlpha -= this.fadeSpeed;
                if (this.fadeAlpha <= 0) {
                    this.fadeAlpha = 0;
                }
            }

            // Atualizar nuvens em parallax
            const W = this.canvas ? this.canvas.width : 450;
            const H = this.canvas ? this.canvas.height : 300;

            for (let i = 0; i < this.clouds.length; i++) {
                const c = this.clouds[i];
                c.x += c.speed;
                if (c.x > W + 40) {
                    c.x = -c.w - 20;
                }
            }

            // Atualizar partículas
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                p.y += p.vy;
                p.x += p.vx + Math.sin(this.animTime * 0.02 + p.pulse) * 0.2;
                p.pulse += 0.03;
                if (p.y < -10) {
                    p.y = H + 10;
                    p.x = Math.random() * W;
                }
            }

            // Atualizar brilhos ocasionais (glints) na moldura da logo
            this.sparkleTimer++;
            if (this.sparkleTimer > 160) {
                this.sparkleTimer = 0;
                // Gerar 1 ou 2 glints em pontos de destaque
                this.sparkles.push({
                    progress: 0,
                    corner: Math.floor(Math.random() * 4)
                });
            }

            for (let i = this.sparkles.length - 1; i >= 0; i--) {
                const sp = this.sparkles[i];
                sp.progress += 0.04;
                if (sp.progress >= 1.0) {
                    this.sparkles.splice(i, 1);
                }
            }
        },

        // -------------------------------------------------------------
        // Renderização Principal
        // -------------------------------------------------------------
        draw(ctx) {
            if (!this.isActive() || !ctx || !this.canvas) return;

            const W = this.canvas.width;
            const H = this.canvas.height;

            // 1. Desenhar Background Procedural com Parallax
            this.drawBackground(ctx, W, H);

            // 2. Renderizar de acordo com o estado
            if (this.state === STATES.LOADING) {
                this.drawLoadingScreen(ctx, W, H);
            } else if (this.state === STATES.TITLE) {
                this.drawTitleScreen(ctx, W, H);
            } else if (this.state === STATES.ABOUT) {
                this.drawTitleScreen(ctx, W, H, true); // desenha title screen com blur/dim atrás
                this.drawAboutModal(ctx, W, H);
            } else if (this.state === STATES.RESET_CONFIRM) {
                this.drawTitleScreen(ctx, W, H, true); // desenha title screen com blur/dim atrás
                this.drawResetConfirmModal(ctx, W, H);
            }

            // 3. Renderizar cortina de fade
            if (this.fadeAlpha > 0.001) {
                ctx.fillStyle = `rgba(10, 25, 47, ${Math.min(1.0, this.fadeAlpha)})`;
                ctx.fillRect(0, 0, W, H);
            }
        },

        // -------------------------------------------------------------
        // Background Procedural com Parallax Tropical e Esportivo
        // -------------------------------------------------------------
        drawBackground(ctx, W, H) {
            // Céu com gradiente tropical/cósmico (azul profundo a turquesa)
            const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
            skyGrad.addColorStop(0.0, "#081d3d");
            skyGrad.addColorStop(0.4, "#0e3a66");
            skyGrad.addColorStop(0.75, "#156082");
            skyGrad.addColorStop(1.0, "#0b3d5c");
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, W, H);

            // Camada 1 de Parallax: Nuvens suaves
            ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
            for (let i = 0; i < this.clouds.length; i++) {
                const c = this.clouds[i];
                this.drawPixelCloud(ctx, c.x, c.y, c.w, c.h);
            }

            // Camada 2 de Parallax: Silhueta de montanhas e ilha ao longe
            ctx.fillStyle = "#092444";
            ctx.beginPath();
            ctx.moveTo(0, H * 0.76);
            ctx.lineTo(W * 0.15, H * 0.64);
            ctx.lineTo(W * 0.32, H * 0.74);
            ctx.lineTo(W * 0.48, H * 0.60);
            ctx.lineTo(W * 0.62, H * 0.72);
            ctx.lineTo(W * 0.82, H * 0.62);
            ctx.lineTo(W, H * 0.74);
            ctx.lineTo(W, H);
            ctx.lineTo(0, H);
            ctx.closePath();
            ctx.fill();

            // Camada 3 de Parallax: Mar e ondas tropicais animadas
            const seaGrad = ctx.createLinearGradient(0, H * 0.78, 0, H);
            seaGrad.addColorStop(0, "#0b466b");
            seaGrad.addColorStop(1, "#062238");
            ctx.fillStyle = seaGrad;
            ctx.fillRect(0, H * 0.78, W, H * 0.22);

            // Espuma das ondas com movimento sutil
            ctx.fillStyle = "rgba(125, 211, 252, 0.35)";
            const waveY = H * 0.78;
            for (let x = 0; x < W; x += 16) {
                const waveOffset = Math.sin((x * 0.05) + (this.animTime * 0.04)) * 2;
                ctx.fillRect(x, waveY + waveOffset, 12, 2);
            }

            // Partículas suaves (brilhos/esporos galácticos)
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha * 0.7})`;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), p.radius, p.radius);
            }
        },

        drawPixelCloud(ctx, x, y, w, h) {
            ctx.fillRect(x, y + h * 0.4, w, h * 0.6);
            ctx.fillRect(x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.85);
            ctx.fillRect(x + w * 0.3, y, w * 0.4, h);
        },

        // -------------------------------------------------------------
        // Tela de Carregamento Inicial
        // -------------------------------------------------------------
        drawLoadingScreen(ctx, W, H) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "10px 'Press Start 2P', monospace, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const dots = ".".repeat((Math.floor(this.animTime / 15) % 4));
            ctx.fillText("CARREGANDO" + dots, W / 2, H / 2 - 10);

            // Barra de loading retro pixelada
            const barW = 140;
            const barH = 10;
            const barX = Math.round((W - barW) / 2);
            const barY = Math.round(H / 2 + 15);

            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);

            const fillW = Math.min(barW - 4, (this.animTime * 3) % (barW - 4));
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(barX + 2, barY + 2, fillW, barH - 4);
        },

        // -------------------------------------------------------------
        // Tela Inicial Completa: Logo + Placa + Menu
        // -------------------------------------------------------------
        drawTitleScreen(ctx, W, H, dimmed) {
            if (dimmed) {
                // Desenhar tela com escurecimento de fundo para modais
                ctx.save();
            }

            // 1. Calcular dimensões dinâmicas da Logo (Contain, 55-65% da largura)
            // Preserva 100% o aspect ratio original (1536 x 1024 = 1.5)
            const natW = (this.logoImg && this.logoImg.naturalWidth > 0) ? this.logoImg.naturalWidth : 1536;
            const natH = (this.logoImg && this.logoImg.naturalHeight > 0) ? this.logoImg.naturalHeight : 1024;

            // Logo destacada: ~55% a 65% da largura da tela, deixando espaço suficiente para o menu abaixo
            const maxW = W * 0.62;
            const maxH = H * 0.52; // Garante espaço para os 3 botões do menu abaixo
            const scale = Math.min(maxW / natW, maxH / natH);

            const logoW = Math.round(natW * scale);
            const logoH = Math.round(natH * scale);

            // Animação sutil de floating (1-2px)
            const floatOffset = Math.sin(this.animTime * 0.035) * 1.5;

            // 2. Renderizar a Moldura/Placa Clara Integrada para a Logo
            // A imagem logo.png possui fundo branco opaco com elementos brancos internos (troféu, bola, nuvens, Zorp).
            // A moldura/placa clara com acabamento pixel-art integra a imagem de forma intencional e esteticamente harmoniosa.
            const cardPad = 4;
            const cardW = logoW + cardPad * 2;
            const cardH = logoH + cardPad * 2;
            const cardX = Math.round((W - cardW) / 2);
            const cardY = Math.round(H * 0.04 + floatOffset);

            this.drawLogoCard(ctx, cardX, cardY, cardW, cardH, logoW, logoH, cardPad);

            // 3. Renderizar o Menu Vertical: INICIAR, SOBRE, SAIR
            this.drawMenu(ctx, W, H, cardY + cardH);

            if (dimmed) {
                ctx.restore();
                // Sobreposição translúcida escura quando um modal estiver aberto
                ctx.fillStyle = "rgba(4, 15, 30, 0.78)";
                ctx.fillRect(0, 0, W, H);
            }
        },

        // -------------------------------------------------------------
        // Moldura / Placa Integrada da Logo
        // -------------------------------------------------------------
        drawLogoCard(ctx, x, y, w, h, logoW, logoH, pad) {
            // Sombra suave da placa
            ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
            ctx.fillRect(x + 3, y + 4, w, h);

            // Moldura externa da placa (azul escuro celestial)
            ctx.fillStyle = "#07162c";
            ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

            // Friso intermediário dourado/ciano (estilo troféu/campeonato)
            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(x - 1, y - 1, w + 2, h + 2);

            // Friso interno refinado
            ctx.fillStyle = "#0c284d";
            ctx.fillRect(x, y, w, h);

            // Painel de fundo claro idêntico ao fundo da logo (#fdfdfd)
            ctx.fillStyle = "#fdfdfd";
            ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

            // Rebites decorativos dourados nos 4 cantos da moldura
            const rivetColor = "#fbbf24";
            const rivetDark = "#b45309";
            this.drawRivet(ctx, x + 2, y + 2, rivetColor, rivetDark);
            this.drawRivet(ctx, x + w - 6, y + 2, rivetColor, rivetDark);
            this.drawRivet(ctx, x + 2, y + h - 6, rivetColor, rivetDark);
            this.drawRivet(ctx, x + w - 6, y + h - 6, rivetColor, rivetDark);

            // Renderizar a imagem da logo com suavização ativa para preservar legibilidade do texto escalado
            if (this.logoLoaded && this.logoImg) {
                const prevSmooth = ctx.imageSmoothingEnabled;
                ctx.imageSmoothingEnabled = true; // Necessário para downscale nítido da logo de alta resolução
                ctx.drawImage(this.logoImg, x + pad, y + pad, logoW, logoH);
                ctx.imageSmoothingEnabled = prevSmooth;
            } else if (this.logoFailed) {
                // Fallback elegante se houver falha de rede ou arquivo
                ctx.fillStyle = "#0284c7";
                ctx.fillRect(x + pad, y + pad, logoW, logoH);
                ctx.fillStyle = "#ffffff";
                ctx.font = "12px 'Press Start 2P', monospace, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("FESTIVAL DOS ESPORTES", x + w / 2, y + h / 2);
            }

            // Renderizar brilhos/glints ocasionais nos cantos da moldura
            this.drawGlints(ctx, x, y, w, h);
        },

        drawRivet(ctx, rx, ry, colMain, colShadow) {
            ctx.fillStyle = colShadow;
            ctx.fillRect(rx + 1, ry + 1, 3, 3);
            ctx.fillStyle = colMain;
            ctx.fillRect(rx, ry, 3, 3);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(rx, ry, 1, 1);
        },

        drawGlints(ctx, x, y, w, h) {
            const cornerPositions = [
                { x: x + 4, y: y + 4 },
                { x: x + w - 4, y: y + 4 },
                { x: x + 4, y: y + h - 4 },
                { x: x + w - 4, y: y + h - 4 }
            ];

            for (let i = 0; i < this.sparkles.length; i++) {
                const sp = this.sparkles[i];
                const pt = cornerPositions[sp.corner % 4];
                const intensity = Math.sin(sp.progress * Math.PI);
                const size = Math.round(intensity * 4);

                if (size > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
                    ctx.fillRect(pt.x - size, pt.y, size * 2 + 1, 1);
                    ctx.fillRect(pt.x, pt.y - size, 1, size * 2 + 1);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
                }
            }
        },

        // -------------------------------------------------------------
        // Menu Principal Vertical
        // -------------------------------------------------------------
        drawMenu(ctx, W, H, topY) {
            this.buttonRects = [];

            // Dimensões dos botões responsivas
            const btnW = Math.round(Math.min(W * 0.44, 180));
            const btnH = Math.round(Math.min(H * 0.075, 22));
            const btnGap = Math.round(Math.min(H * 0.024, 7));
            const btnX = Math.round((W - btnW) / 2);

            const startY = Math.max(topY + 12, Math.round(H * 0.63));

            for (let i = 0; i < this.menuItems.length; i++) {
                const item = this.menuItems[i];
                const btnY = startY + i * (btnH + btnGap);
                const isSelected = (this.selectedIndex === i);

                this.buttonRects.push({
                    x: btnX,
                    y: btnY,
                    w: btnW,
                    h: btnH,
                    id: item.id
                });

                this.drawButton(ctx, btnX, btnY, btnW, btnH, item.label, isSelected);
            }

            // Dica de controles no rodapé
            ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
            ctx.font = "6px 'Press Start 2P', monospace, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText("[W / S] NAVEGAR   |   [ENTER / ESPAÇO] SELECIONAR", W / 2, H - 6);
        },

        drawButton(ctx, x, y, w, h, label, isSelected) {
            // Sombra do botão
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(x + 2, y + 2, w, h);

            if (isSelected) {
                // Efeito de destaque do botão selecionado: contorno vibrante, brilho e gradiente
                const grad = ctx.createLinearGradient(x, y, x + w, y);
                grad.addColorStop(0, "#0284c7");
                grad.addColorStop(0.5, "#0369a1");
                grad.addColorStop(1, "#0f766e");
                ctx.fillStyle = grad;
                ctx.fillRect(x, y, w, h);

                // Contorno duplo com branco e ciano
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, w, h);

                // Pequena seta indicadora à esquerda (►) com animação horizontal sutil
                const arrowOffset = Math.sin(this.animTime * 0.12) * 1.5;
                ctx.fillStyle = "#ffffff";
                ctx.font = "8px 'Press Start 2P', monospace, sans-serif";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText("►", x + 10 + arrowOffset, y + h / 2 + 1);

                // Texto selecionado em branco nítido
                ctx.fillStyle = "#ffffff";
                ctx.font = "9px 'Press Start 2P', monospace, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(label, x + w / 2 + 6, y + h / 2 + 1);
            } else {
                // Botão não selecionado (azul escuro elegante com borda sutil)
                ctx.fillStyle = "rgba(10, 26, 50, 0.88)";
                ctx.fillRect(x, y, w, h);

                ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, w, h);

                // Texto não selecionado em tom suave
                ctx.fillStyle = "#94a3b8";
                ctx.font = "9px 'Press Start 2P', monospace, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(label, x + w / 2, y + h / 2 + 1);
            }
        },

        // -------------------------------------------------------------
        // Modal SOBRE (Painel Central de Informações)
        // -------------------------------------------------------------
        drawAboutModal(ctx, W, H) {
            const panelW = Math.round(W * 0.88);
            const panelH = Math.round(H * 0.88);
            const panelX = Math.round((W - panelW) / 2);
            const panelY = Math.round((H - panelH) / 2);

            // Sombra do painel
            ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            ctx.fillRect(panelX + 4, panelY + 4, panelW, panelH);

            // Fundo escuro do painel (azul cósmico profundo)
            ctx.fillStyle = "#07172e";
            ctx.fillRect(panelX, panelY, panelW, panelH);

            // Moldura dupla dourada e azul
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 2;
            ctx.strokeRect(panelX, panelY, panelW, panelH);
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1;
            ctx.strokeRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6);

            // Mini Logo no topo do painel
            if (this.logoLoaded && this.logoImg) {
                const miniW = 42;
                const miniH = 28;
                const miniX = Math.round(W / 2 - miniW / 2);
                const miniY = panelY + 8;
                // Moldura sutil da mini logo
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(miniX - 1, miniY - 1, miniW + 2, miniH + 2);
                const prevSmooth = ctx.imageSmoothingEnabled;
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(this.logoImg, miniX, miniY, miniW, miniH);
                ctx.imageSmoothingEnabled = prevSmooth;
            }

            // Título do Painel
            ctx.fillStyle = "#fbbf24";
            ctx.font = "8.5px 'Press Start 2P', monospace, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText("FESTIVAL DOS ESPORTES", W / 2, panelY + 40);

            // Linha divisória sutil
            ctx.strokeStyle = "#1e4976";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(panelX + 24, panelY + 54);
            ctx.lineTo(panelX + panelW - 24, panelY + 54);
            ctx.stroke();

            // Descrição curta do projeto
            ctx.fillStyle = "#cbd5e1";
            ctx.font = "6.5px 'Press Start 2P', monospace, sans-serif";
            ctx.fillText("Projeto desenvolvido utilizando", W / 2, panelY + 62);
            ctx.fillText("HTML5, JavaScript e Canvas.", W / 2, panelY + 74);

            // Protagonista
            ctx.fillStyle = "#4ade80";
            ctx.fillText("Protagonista: Zorp", W / 2, panelY + 90);

            // Título das Modalidades
            ctx.fillStyle = "#38bdf8";
            ctx.font = "7px 'Press Start 2P', monospace, sans-serif";
            ctx.fillText("MODALIDADES:", W / 2, panelY + 106);

            // Lista das 8 Modalidades em duas colunas alinhadas à esquerda
            const col1X = panelX + Math.round(panelW * 0.16);
            const col2X = panelX + Math.round(panelW * 0.55);
            const listY = panelY + 120;
            const lineH = 13;

            ctx.fillStyle = "#f1f5f9";
            ctx.font = "6.5px 'Press Start 2P', monospace, sans-serif";
            ctx.textAlign = "left";

            // Coluna 1
            ctx.fillText("• Ping-Pong", col1X, listY);
            ctx.fillText("• Basquete", col1X, listY + lineH);
            ctx.fillText("• Corrida", col1X, listY + lineH * 2);
            ctx.fillText("• Skate", col1X, listY + lineH * 3);

            // Coluna 2
            ctx.fillText("• Arco e Flecha", col2X, listY);
            ctx.fillText("• Escalada", col2X, listY + lineH);
            ctx.fillText("• Boxe", col2X, listY + lineH * 2);
            ctx.fillText("• Surf", col2X, listY + lineH * 3);

            // Botão VOLTAR
            const btnW = 120;
            const btnH = 20;
            const btnX = Math.round((W - btnW) / 2);
            const btnY = panelY + panelH - 28;

            this.aboutButtonRect = { x: btnX, y: btnY, w: btnW, h: btnH };
            this.drawButton(ctx, btnX, btnY, btnW, btnH, "VOLTAR", true);
        },

        // -------------------------------------------------------------
        // Modal de Confirmação de SAIR (Reset Local Session)
        // -------------------------------------------------------------
        drawResetConfirmModal(ctx, W, H) {
            this.confirmButtonRects = [];

            const panelW = Math.round(W * 0.80);
            const panelH = Math.round(H * 0.54);
            const panelX = Math.round((W - panelW) / 2);
            const panelY = Math.round((H - panelH) / 2);

            // Sombra
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(panelX + 4, panelY + 4, panelW, panelH);

            // Fundo escuro com tom de alerta
            ctx.fillStyle = "#111827";
            ctx.fillRect(panelX, panelY, panelW, panelH);

            // Moldura de alerta vermelha/âmbar
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 2;
            ctx.strokeRect(panelX, panelY, panelW, panelH);
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1;
            ctx.strokeRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6);

            // Título de Confirmação
            ctx.fillStyle = "#f87171";
            ctx.font = "9px 'Press Start 2P', monospace, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText("REINICIAR O JOGO?", W / 2, panelY + 16);

            // Texto explicativo curto
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "6.5px 'Press Start 2P', monospace, sans-serif";
            ctx.fillText("O progresso local e as medalhas", W / 2, panelY + 38);
            ctx.fillText("do Festival serão apagados.", W / 2, panelY + 52);

            // Dois botões lado a lado: SIM e NÃO
            const btnW = 90;
            const btnH = 20;
            const gap = 20;
            const totalW = btnW * 2 + gap;
            const startX = Math.round((W - totalW) / 2);
            const btnY = panelY + panelH - 34;

            for (let i = 0; i < this.confirmButtons.length; i++) {
                const btn = this.confirmButtons[i];
                const bX = startX + i * (btnW + gap);
                const isSelected = (this.confirmSelectedIndex === i);

                this.confirmButtonRects.push({
                    x: bX,
                    y: btnY,
                    w: btnW,
                    h: btnH,
                    id: btn.id
                });

                this.drawButton(ctx, bX, btnY, btnW, btnH, btn.label, isSelected);
            }
        }
    };

    // Exportar para o escopo global
    global.TitleScreen = TitleScreen;

})(typeof window !== "undefined" ? window : this);
