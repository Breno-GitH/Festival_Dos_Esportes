# Skate: preparação de assets e geometria

Os assets foram preparados e agora alimentam a gameplay principal. A pista longa continua intacta; a faixa curta é selecionada em modo de teste.

## Sprite sheets e recortes

`extract_sprite_sheets.py` lê os PNGs originais `rampas.png`, `grids.png` e `assets_skate.png`. O recorte é feito por componentes de pixels com alpha visível, sem assumir uma grade regular, e mantém margem transparente ao redor das peças. A execução é offline e única; no jogo, as imagens individuais são carregadas pelo cache do runtime.

- `ramps/`: 10 rampas.
- `grinds/`: 11 rails, pipes e ledges grindáveis.
- `props/gameplay/`: 12 peças de gameplay.
- `props/decoration/`: 3 peças decorativas.

`asset_manifest.json` registra origem e dimensões dos recortes, classificação, superfícies de rampa e paths de grind. `asset_catalog.js` expõe o catálogo ao jogo. As peças decorativas não recebem colisão. Os objetos de gameplay podem declarar colisão sólida, superfície superior ou grind edge separadamente.

## Zorp

As animações continuam sendo os sprites completos de Zorp, incluindo o skate já desenhado nos frames. O runtime não desenha mais o skate vetorial separado. Cada frame usa os limites de alpha registrados no manifesto para alinhar o conteúdo visível pelo bottom-center ao ponto físico de contato.

O collider independente mede **24 × 44 unidades**, com offsets **(0, 0)** em relação ao anchor de contato. `groundContactY`, `boardY` e `feetY` referem-se ao mesmo ponto estável no plano físico.

## Geometria de colisão

- **Rampas:** superfícies são polylines normalizadas transformadas para o posicionamento no mundo. A amostragem linear fornece a altura de contato e a inclinação tangente; metadados centralizam tipo, dimensões, impulso e offset.
- **Rails/ledges:** cada asset grindável declara um `grindPath` normalizado que vira segmentos no mundo. O grind segue esse path, separado do sprite e dos suportes visuais. Ledges podem manter uma superfície de pé distinta da borda grindável.
- **Props:** sólidos e superfícies são metadados opcionais; a caixa visual não é adotada automaticamente como colisão.

Os paths das rampas da pista longa continuam preparados como metadados, mas desativados para colisão. A nova colisão física é exercitada na faixa curta, sem redesenhar a rota longa.

## Área temporária e debug

`skate/test_course.js` fornece a pista curta small ramp → landing → medium ramp → rails → big ramp. Abra a aplicação com `?skateTest=1` para carregá-la; `?skateTest=0` mantém a pista longa. `window.setSkateDebug(true)` exibe opcionalmente collider do Zorp, contato com o chão, superfícies de rampa, paths de grind e colisões sólidas. O debug começa desligado.

## Parâmetros da gameplay de teste

- Avanço nominal: **230 unidades/s**; terreno inclinado varia até **±8%**.
- Gravidade: **1650 unidades/s²**.
- Ollie: **LOW −340**, **MEDIUM −460**, **HIGH −560 unidades/s**; limiares em **120/260/420 ms**.
- Double-tap: janela **220 ms**, separado de hold/release com um atraso máximo de **150 ms** para confirmar um toque simples.
- Rampas: impulso configurado small/medium/big em **48/82/145**; sem SPACE o declive já dá lançamento, e o Ollie combina impulso com a tangente da superfície.
- Grind: captura até **8 px**, speed scale **0,96**, trajetória validada por proximidade e velocidade compatível. SPACE aplica impulso vertical **−390 unidades/s** e mantém o avanço.
- O rail termina com saída natural; um Ollie out pode entrar em outro rail ou pousar na rampa seguinte. Manual continua limitado a **850 ms**.

## Verificação executada

Os testes automatizados verificam recortes, anchor/collider, hold versus double-tap, lançamentos naturais e assistidos, retorno ao chão, captura horizontal/inclinada/curva, Grind → Ollie → Grind e Grind → Ollie → rampa. O modo de teste também foi aberto no navegador local; o double-tap concedeu o score especial e a faixa chegou ao finish. Verificação de sintaxe JS e `git diff --check` também foram executadas.
