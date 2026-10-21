# Arquearia — alvos levados pela correnteza

## Fluxo

O minigame usa alvos circulares em pequenas plataformas de troncos. Eles entram
pelos afluentes laterais ou emergem gradualmente de trás da espuma no pé da
cachoeira. As saídas ficam nas laterais inferiores do rio, antes da plataforma
seca dos arqueiros. Os afluentes e as duas saídas foram abertos visualmente no
cenário; algumas pedras das margens foram reposicionadas para liberar a passagem.

Cada instância começa fora da tela ou totalmente oculta na entrada da cachoeira.
Não há surgimento aleatório dentro do campo, reposicionamento durante o percurso
ou fade usado para esconder um teleporte. A entrada superior usa uma máscara de
oclusão junto à espuma: primeiro aparece a plataforma e depois o disco inteiro.
Somente a parte visível do disco pode receber um tiro.

Estados do fluxo: `ENTERING`, `DRIFTING`, `EXITING`.
Ao acertar, o alvo passa por `HIT_REACTION` durante 18 frames e fica `SPENT`.
Ele continua percorrendo a mesma rota, marcado com a flecha, até sair por inteiro.
Um alvo atingido não dá novos pontos. A remoção só ocorre depois de todo o desenho
estar fora da tela, inclusive para alvos que nunca foram atingidos.

## Percursos

Sete padrões determinísticos: `STRAIGHT`, `DIAGONAL`, `CURVE`, `S_CURVE`, `WAVE`,
`ARC`, `ELLIPSE`. Os trechos retos e diagonais têm conexões suaves nos encontros
dos canais. As elipses são pequenas variações transportadas pela correnteza;
não são órbitas estacionárias nem giros completos contra o fluxo.

As rotas são splines com pequenas variações limitadas e amostragem por comprimento
de arco. Isso mantém a velocidade regular mesmo nas curvas. Não há random walk.
A escolha de uma sequência pode variar, mas seus pontos de entrada e o caminho
de cada combinação são fixos. A fila respeita sua ordem e mantém pelo menos 24
frames entre entradas e 66 entre alvos da mesma origem, evitando sobreposição
instantânea quando uma vaga é liberada.

Velocidades no passo de simulação de 60 Hz:

- Lento: 0,58 px/frame, aproximadamente 34,8 px/s; bônus de velocidade 0.
- Médio: 0,90 px/frame, aproximadamente 54 px/s; bônus +3.
- Rápido: 1,30 px/frame, aproximadamente 78 px/s; bônus +7.

O limite continua sendo de 3 alvos novos na primeira fase e 4 nas demais.
Os já atingidos podem continuar passando, com limite total de 10 plataformas.

## Tamanho e pontuação

- Grande: raio útil de 18 px, 10 pontos base.
- Médio: raio útil de 14 px, 16 pontos base.
- Pequeno: raio útil de 10 px, 26 pontos base.
- Os dourados mantêm valores próprios maiores e percursos raros.

Sobre a base entram o bônus de velocidade e as zonas preservadas:

- Externa: pontuação base.
- Interna, até 70% do raio: +15.
- Centro/mosca, até 35% do raio: +30.

Os anéis usam um único centro e raio para desenho e colisão. Madeira, margem
externa e plataforma de troncos não ampliam a área que dá pontos.

## Colisão e impacto

O teste considera o segmento percorrido pela ponta da flecha e o deslocamento do
disco no mesmo frame. A interseção é resolvida no referencial relativo, como
segmento contra círculo, para evitar atravessamento em alta velocidade.
Entre dois discos sobrepostos, vence o primeiro contato ao longo do segmento.
Não existe bônus de proximidade fora do círculo.

A zona de pontuação usa o afastamento da linha de impacto em relação ao centro da
face. A máscara da cachoeira também limita a zona útil: uma mosca ainda oculta
pela espuma não concede o bônus como se estivesse exposta.

O sprite da flecha normal foi mantido. Sua ponta alfa medida `[79,9]`, no canvas
de 160 px, agora coincide com a coordenada física do projétil. A origem vertical
foi alinhada ao arco dos sprites 2.0 (`actorY - 73`), e a pequena inclinação do tiro
do Mestre acompanha o vetor do projétil. Velocidade das flechas e cooldown de
disparo permanecem os mesmos.

O acerto produz um impacto pequeno, texto com pontos e breve oscilação do disco.
A flecha presa e o efeito ficam no local atingido, inclusive em acertos externos.
O alvo marcado perde saturação e tomba sobre os troncos em cerca de 0,3 s, mas
permanece visível e segue a correnteza. Isso separa os discos já usados dos alvos
ainda válidos, sem deixar um excesso de faces grandes cobrindo o rio.
Não há congelamento global, hit-stop ou pausa do cronômetro.

Som sintetizado de impacto, curto e baixo, com timbre mais agudo na mosca. O áudio
só é inicializado após uma tecla do jogador, usa no máximo três vozes simultâneas
e não depende de arquivos externos. Se o navegador não permitir áudio, o restante
do jogo continua funcionando.

## Escopo preservado

Movimento WASD, comando Espaço, posição e bounds dos arqueiros, sprites 2.0,
câmera fixa, partida de 55 segundos, condição de vitória, medalha e retorno à ilha.
A seleção do Mestre ignora faces que sua flecha já não pode alcançar à frente do
arco e considera a velocidade vertical do alvo ao estimar o tiro.

Foi comparado o código com uma cópia anterior a esta etapa: fora do bloco de
Arquearia, só existe a chamada de habilitação de áudio para teclas da Arquearia.
Overworld e implementações dos outros minigames foram preservados. Nenhum arquivo
de imagem foi alterado ou apagado.

## Arquivos

- Criado `archery_river_targets.js`: rotas, ciclo de vida, desenho flutuante,
  colisão contínua, projétil visual e sons.
- Modificado `script.js`: geração, padrões, pontuação, eventos de acerto/saída,
  integração com projéteis, Mestre e diagnóstico.
- Modificado `archery_valley.js`: canais de entrada/saída, espuma de oclusão e
  consulta da área de água usada na validação.
- Modificado `index.html`: novo módulo e versões de cache.
- Criado este relatório.

## Validação

Chrome real em modo headless, perfil de teste isolado, cache desativado, entrada
por teclado e inspeção de capturas. Algumas condições de colisão e pontuação
usaram fixtures estáticas de QA; elas não fazem parte do fluxo normal do jogo.
As partidas completas usaram a automação de QA existente. Não foi uma run humana.

20 verificações aprovadas na rodada final:

- Entrada pelo Mestre e início normal.
- Rotas reproduzíveis, entrada inicialmente oculta e término fora da tela.
- 57.698 amostras dos apoios das plataformas dentro da água, sem erro.
- 21 percursos completos de alvos não atingidos, sem desaparecimento interno.
- Três velocidades e três tamanhos.
- Colisão contínua, inclusive atravessamento de um frame com deslocamento de 120 px.
- Ponta 0,05 px fora do raio não acerta; tiro no suporte não pontua.
- Alvo atingido permanece e não paga duas vezes.
- Disparos reais nas zonas: mosca 40, interno 25, externo 10, fora 0, em alvo grande lento.
- Áudio habilitado pelo gesto do jogador.
- Todos os sete percursos presentes no jogo.
- Partida completa com acertos dos dois arqueiros.
- Saídas reais, sem teleporte.
- Uma única pontuação por alvo.
- Remoção somente fora da tela.
- Desempenho e quantidade de plataformas limitados.
- Retorno à ilha.
- Zero 404/falhas de rede, TypeError, ReferenceError ou warnings da página.

Duas partidas completas foram executadas. A rodada final terminou em 2298 × 181,
com 41 acertos de Zorp e 6 do Mestre; 42 plataformas atingidas saíram do campo.
Máximo de 10 plataformas, deslocamento máximo por frame de aproximadamente
1,30 px, zero teleportes e média registrada de 60,35 FPS. Capturas/carregamento
provocaram quedas pontuais; esse resultado não garante desempenho em todo aparelho.

Após o polimento do marcador, uma verificação adicional confirmou acerto externo
de 10 pontos, flecha presa a 15,3 px do centro e efeito em `[240.3,145]`, coerentes
com a posição real do tiro.

Problemas encontrados e corrigidos: união dos canais espelhados abria um buraco
na água por orientação invertida do contorno; fila antiga processava entradas
pendentes de trás para frente; um teste de todos os percursos precisava aguardar
a liberação natural das vagas; marcador da flecha presa precisava acompanhar o
acerto externo em vez de sempre ficar no centro.
