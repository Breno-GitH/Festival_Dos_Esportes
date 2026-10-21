# Atlas do Zorp — Escalada 2.0

Fonte: `zorp_escalada2.0.png`. 53 recortes reais; 45 frames usados em 16 estados.

Canvas: 144 × 192. Escala única: 64/153 px de mundo por pixel da imagem, sem redimensionar cada pose.
As bordas semitransparentes originais são preservadas; a ponte quase transparente entre as poses de pull-up foi separada pelos componentes visíveis.

## Mapa dos estados

### CLIMB_IDLE

Frames: `idle_01.png`, `idle_02.png`, `idle_03.png`, `idle_04.png`

Âncora: `hands`; offset no mundo: `[0, -44]`; 5 fps; espelhamento: `False`.


### CLIMB_HOLD

Frames: `edge_wait_01.png`, `edge_wait_02.png`, `edge_wait_03.png`, `edge_wait_04.png`

Âncora: `hands`; offset no mundo: `[0, -44]`; 6 fps; espelhamento: `False`.


### CLIMB_MOVE

Frames: `transfer_01.png`, `transfer_03.png`, `transfer_04.png`

Âncora: `body`; offset no mundo: `[0, -24]`; 9 fps; espelhamento: `False`.
Transições de costas/3/4 traseiro; a variante frontal transfer_02 permanece catalogada separadamente.

### CLIMB_SIDE

Frames: `side_grip_03.png`

Âncora: `body`; offset no mundo: `[0, -24]`; 6 fps; espelhamento: `right`.
Pose lateral de costas; a mesma pose é espelhada para a mão oposta, sem criar outro desenho.

### PULL_UP

Frames: `pull_up_01.png`, `pull_up_02.png`, `pull_up_03.png`, `pull_up_04.png`

Âncora: `body`; offset no mundo: `[0, -24]`; 6 fps; espelhamento: `False`.


### JUMP

Frames: `jump_01.png`, `jump_02.png`, `jump_03.png`, `jump_04.png`

Âncora: `lowerCenter`; offset no mundo: `[0, 0]`; 9 fps; espelhamento: `left`.


### FALL

Frames: `fall_01.png`, `fall_02.png`, `fall_03.png`

Âncora: `lowerCenter`; offset no mundo: `[0, 0]`; 7 fps; espelhamento: `left`.


### HANG

Frames: `lower_grip_01.png`, `lower_grip_02.png`, `lower_grip_03.png`

Âncora: `hands`; offset no mundo: `[0, -44]`; 6 fps; espelhamento: `False`.


### CLIMB_CORNER

Frames: `corner_01.png`, `corner_02.png`, `corner_03.png`

Âncora: `body`; offset no mundo: `[0, -24]`; 10 fps; espelhamento: `False`.
Trecho final do climb-up já existente no cume; não cria uma nova mecânica de movimento.

### CHECKPOINT_IDLE

Frames: `checkpoint_01.png`

Âncora: `feet`; offset no mundo: `[0, 3]`; 6 fps; espelhamento: `False`.


### CHECKPOINT_WALK_LEFT

Frames: `walk_01.png`, `walk_02.png`, `walk_03.png`, `walk_04.png`

Âncora: `feet`; offset no mundo: `[0, 3]`; 8 fps; espelhamento: `True`.


### CHECKPOINT_WALK_RIGHT

Frames: `walk_01.png`, `walk_02.png`, `walk_03.png`, `walk_04.png`

Âncora: `feet`; offset no mundo: `[0, 3]`; 8 fps; espelhamento: `False`.


### CHECKPOINT_JUMP

Frames: `checkpoint_06.png`

Âncora: `lowerCenter`; offset no mundo: `[0, 0]`; 6 fps; espelhamento: `left`.


### TIRED

Frames: `tired_01.png`, `tired_02.png`, `tired_03.png`

Âncora: `feet`; offset no mundo: `[0, 3]`; 4 fps; espelhamento: `False`.
Estado visual preparado, sem adicionar stamina/cansaço à gameplay. Na parede, prioriza tired_02 de costas.

### HIT

Frames: `hurt_01.png`, `hurt_02.png`, `hurt_03.png`

Âncora: `feet`; offset no mundo: `[0, 3]`; 9 fps; espelhamento: `False`.


### VICTORY

Frames: `victory_01.png`, `victory_02.png`, `victory_03.png`, `victory_04.png`, `victory_01.png`

Âncora: `feet`; offset no mundo: `[0, 3]`; 5 fps; espelhamento: `False`.
Quatro poses reais, uma comemoração e retorno à primeira pose de vencedor; sem marcas decorativas da folha.

## Frames disponíveis fora da animação normal

`checkpoint_02.png`, `checkpoint_03.png`, `checkpoint_04.png`, `checkpoint_05.png`, `side_grip_01.png`, `side_grip_02.png`, `side_grip_04.png`, `transfer_02.png`

Esses frames continuam catalogados e acessíveis no inspetor. As variantes frontais de agarre não substituem as poses de costas na parede.

## Bounds e âncoras de cada recorte

- **idle_01** — sourceRect `[33, 54, 108, 156]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 130.8], 'hands': [71, 74]}`.
- **idle_02** — sourceRect `[151, 56, 106, 155]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 131.15], 'hands': [72, 74]}`.
- **idle_03** — sourceRect `[268, 56, 104, 152]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 132.2], 'hands': [73, 75]}`.
- **idle_04** — sourceRect `[383, 54, 106, 154]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 131.5], 'hands': [71, 73]}`.
- **edge_wait_01** — sourceRect `[541, 52, 106, 156]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 130.8], 'hands': [72, 69]}`.
- **edge_wait_02** — sourceRect `[657, 54, 106, 156]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 130.8], 'hands': [72, 70]}`.
- **edge_wait_03** — sourceRect `[773, 53, 105, 155]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 131.15], 'hands': [72, 70]}`.
- **edge_wait_04** — sourceRect `[883, 52, 104, 155]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 131.15], 'hands': [73, 70]}`.
- **walk_01** — sourceRect `[1058, 52, 109, 158]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 130.10000000000002]}`.
- **walk_02** — sourceRect `[1195, 54, 107, 157]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 130.45]}`.
- **walk_03** — sourceRect `[1332, 54, 105, 155]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 131.15]}`.
- **walk_04** — sourceRect `[1470, 53, 110, 157]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 130.45]}`.
- **side_grip_01** — sourceRect `[28, 275, 77, 168]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [75, 126]}`.
- **side_grip_02** — sourceRect `[126, 275, 85, 174]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [73, 122]}`.
- **side_grip_03** — sourceRect `[229, 275, 82, 172]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [76, 125]}`.
- **side_grip_04** — sourceRect `[337, 274, 79, 165]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [75, 130]}`.
- **pull_up_01** — sourceRect `[457, 303, 102, 152]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [73, 139]}`.
- **pull_up_02** — sourceRect `[556, 287, 97, 152]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [75, 138]}`.
- **pull_up_03** — sourceRect `[652, 286, 102, 164]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [73, 136]}`.
- **pull_up_04** — sourceRect `[753, 266, 102, 152]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [74, 141]}`.
- **jump_01** — sourceRect `[890, 288, 107, 160]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 129.39999999999998]}`.
- **jump_02** — sourceRect `[1013, 264, 101, 163]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 128.35000000000002]}`.
- **jump_03** — sourceRect `[1119, 264, 120, 152]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 132.2]}`.
- **jump_04** — sourceRect `[1226, 278, 101, 162]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 128.7]}`.
- **fall_01** — sourceRect `[1352, 321, 111, 130]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 139.89999999999998]}`.
- **fall_02** — sourceRect `[1437, 274, 105, 104]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 149.0]}`.
- **fall_03** — sourceRect `[1540, 329, 105, 123]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 142.35000000000002]}`.
- **lower_grip_01** — sourceRect `[43, 519, 87, 152]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 132.20000000000005], 'hands': [73, 48]}`.
- **lower_grip_02** — sourceRect `[141, 519, 84, 156]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [71.5, 130.79999999999995], 'hands': [72, 44]}`.
- **lower_grip_03** — sourceRect `[234, 518, 83, 153]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 131.85000000000002], 'hands': [72, 47]}`.
- **transfer_01** — sourceRect `[365, 523, 101, 156]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72, 116]}`.
- **transfer_02** — sourceRect `[471, 513, 77, 163]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [73, 114]}`.
- **transfer_03** — sourceRect `[553, 524, 91, 129]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [73, 139]}`.
- **transfer_04** — sourceRect `[660, 513, 77, 159]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [75, 115]}`.
- **corner_01** — sourceRect `[769, 510, 84, 166]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [67, 126]}`.
- **corner_02** — sourceRect `[874, 525, 84, 161]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72, 123]}`.
- **corner_03** — sourceRect `[955, 519, 83, 154]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [71, 128]}`.
- **checkpoint_01** — sourceRect `[1068, 533, 80, 150]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 132.89999999999998]}`.
- **checkpoint_02** — sourceRect `[1161, 533, 88, 151]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 132.54999999999995]}`.
- **checkpoint_03** — sourceRect `[1258, 533, 95, 150]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 132.89999999999998]}`.
- **checkpoint_04** — sourceRect `[1366, 532, 88, 150]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 132.89999999999998]}`.
- **checkpoint_05** — sourceRect `[1460, 534, 82, 149]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 133.25]}`.
- **checkpoint_06** — sourceRect `[1548, 523, 104, 155]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 131.79999999999995]}`.
- **tired_01** — sourceRect `[33, 770, 114, 145]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [70.5, 134.64999999999998]}`.
- **tired_02** — sourceRect `[163, 771, 109, 147]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 133.95000000000005]}`.
- **tired_03** — sourceRect `[291, 759, 116, 153]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [71.0, 131.85000000000002]}`.
- **hurt_01** — sourceRect `[455, 754, 120, 160]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 136.39999999999998]}`.
- **hurt_02** — sourceRect `[590, 755, 119, 159]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 136.75]}`.
- **hurt_03** — sourceRect `[723, 748, 118, 170]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 133.60000000000002]}`.
- **victory_01** — sourceRect `[932, 767, 123, 151]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 132.54999999999995]}`.
- **victory_02** — sourceRect `[1095, 753, 119, 161]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 129.04999999999995]}`.
- **victory_03** — sourceRect `[1265, 746, 119, 171]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.5, 125.54999999999995]}`.
- **victory_04** — sourceRect `[1454, 771, 110, 147]`; anchors `{'feet': [72, 186], 'lowerCenter': [72, 180], 'body': [72.0, 133.95000000000005]}`.

## Debug

Na Escalada: F8 ativa/desativa. PageUp/PageDown escolhem estado; ←/→ escolhem frame; Home retorna ao estado real.
Debug desativado por padrão. A seleção de prévia altera somente o desenho; colisão, controles e física continuam os mesmos.
`docs/climb_sprite_atlas.html` permite inspecionar os 16 estados e todos os 53 recortes sem iniciar uma partida.
