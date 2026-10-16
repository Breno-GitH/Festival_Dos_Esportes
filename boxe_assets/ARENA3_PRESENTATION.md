# Boxe — arena 3.0 e apresentação da luta

## Arena e enquadramento

- Imagem oficial: `arena_boxe3.0.png`, sem fallback para a arena antiga.
- Escala uniforme 0,344, centralizada horizontalmente, deslocamento vertical −20.
- A imagem mantém sua proporção. O enquadramento recorta as extremidades externas;
  o piso útil continua alinhado à área de movimento existente, de Y166 a Y252.
- O piso, as arquibancadas, os refletores e as cordas pertencem à imagem nova.
  O piso geométrico e o segundo conjunto de cordas antigo foram retirados.
- As cordas frontais da própria imagem são reapresentadas em faixas estreitas
  com opacidade 0,62, para dar profundidade sem esconder os golpes.
- `boxe_arena.png` permanece no disco como arquivo inativo; não é requisitado.

## Torcida e evento

- 52 silhuetas visíveis em duas faixas de profundidade, com posições pré-calculadas.
- Movimento base lento, braços ocasionais e ondas de reação por grupos.
- Jab e bloqueio provocam reações pequenas; cross, hook e especiais provocam
  reações maiores. Counter, quebra de guarda, knockdown e desfecho têm prioridade.
- Flashes fotográficos discretos ficam nas arquibancadas. A iluminação de evento
  tem opacidade máxima de 0,085 e é desenhada atrás dos lutadores.
- Confete aparece no super soco da finalização e na confirmação do vencedor,
  inclusive quando o Mestre vence. Não é disparado em golpes comuns ou contagens.
- Emissores laterais representam canhões de confete da arena. As partículas ficam
  atrás dos lutadores e do HUD, com duração e emissão limitadas.
- Pool fixo de 128 partículas compartilhado entre confete e detalhes de contato.
  Reiniciar limpa partículas, emissão, reações e tremor.

## Impacto e juiz

- Tremor por força: aproximadamente 0,35 px no jab, 0,90 no cross, 1,69 no hook,
  2,37 no counter, 3 no knockdown e teto de 4 na finalização, com amortecimento rápido.
- HUD estável, sem seguir o tremor.
- Recuo visual de até 1,2 px e rotação de até 0,045 rad, sem modificar posição física.
- Contatos fortes enfatizam a pose por dois frames de renderização. Não existe
  pausa adicional da simulação ou alteração dos tempos de ataque.
- Esquiva próxima recebe um rastro curto; quebra de guarda recebe traços separados;
  os especiais conservam suas animações e trilhas próprias.
- O juiz mantém a lógica existente, sem HP, alvo ou colisão. Um foco discreto no
  piso e um pulso a cada número reforçam sua presença durante a contagem.

## Problemas encontrados e correções

1. Os círculos preenchidos do feedback anterior cobriam olhos e luvas.
   Foram removidos; textos curtos com contorno agora ficam acima do contato.
2. Um bloqueio que quebrava a guarda disparava também o feedback de bloqueio comum,
   sobrescrevendo o recuo visual da quebra. A apresentação de quebra tem prioridade.
3. O render antigo cortava/esticava o cenário e redesenhava todo o piso. Agora a
   imagem oficial usa escala uniforme, sem um ringue procedural duplicado.

## Validação em navegador

Chrome, entradas de teclado reais e cenários de QA preparados com posição/HP
controlados para reproduzir golpes, quedas e desfechos. Duas rodadas de combate
foram executadas; a segunda ocorreu após as correções de leitura. Também foi
validado o endereço oficial `http://localhost/2025/Festival_dos_Esportes/`.

- Entrada pelo Mestre do Boxe: READY → INTRO → FIGHTING.
- WASD, J/K/L, defesa, esquiva, counter, quebra de guarda e dash: funcionais.
- Dano preservado: jab 6, cross 12, hook 17, dash 24; jab bloqueado 2.
- Knockdown: juiz se aproxima, conta e o primeiro levantamento recupera 30 HP.
- Segundo knockdown: contagem até 10 → finalização → vitória do Zorp.
- Derrota do Zorp: contagem → resultado do Mestre, sem finalização do Zorp.
- Confete confirmado na finalização e nos dois resultados; ausente em golpes comuns.
- Movimento da torcida confirmado por inspeção de capturas em instantes diferentes.
- Reinício: HP, partículas e apresentação voltam ao estado inicial.
- Escape retorna à ilha; nova interação com o Mestre reabre o boxe em READY.
- Carregamento: 92/92 recursos do boxe, sendo 91 frames 3.0 e a arena nova.
- Nenhuma requisição para a arena antiga ou sprites 2.0.
- Zero HTTP 404, TypeError, ReferenceError, outras exceções ou warnings registrados.
- Celebração: aproximadamente 60 FPS; intervalo de frame p95 de 16,7 ms, numa
  amostra de 100 frames no Chrome local. Não constitui garantia para todos os dispositivos.
- Captura de vitória com 92 partículas ativas; saturação testada e limitada a 128.
- Validador dos 91 recortes: anchors, transparência e referências corretos.

Evidências: `arena3_browser_qa.json` e `arena3_extra_qa.json`.

## Arquivos alterados

- `boxing_presentation.js` (novo): arena, plateia, iluminação, partículas e recoil visual.
- `boxing_arena.js`: ligação dos eventos e camadas ao combate, sem mudar suas regras.
- `script.js`: apenas preload/cache de imagens do boxe.
- `index.html`: carregamento do módulo e versões dos scripts afetados.
- `tools/validate_boxe_assets.ps1`: conferência da nova arena e ausência de preload antigo.
- `boxe_assets/boxe_integration_audit.json`: arena e validação atuais.
- Este relatório e os dois registros de QA.

Nenhum outro minigame ou regra de movimentação/ataque/HP foi alterado.
