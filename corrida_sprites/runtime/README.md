# Sprites da Corrida em uso

`corrida_runners_atlas.png` e `corrida_runners_manifest.js` são os recursos carregados pelo minigame. O script `tools/build_corrida_sprite_atlas.ps1` os gera dos PNGs originais, preservando a transparência nativa e os pixels escuros dos personagens.

- **Corredores ativos:** Zorp, Mestre, Cobalto, Ferrugem, Lina, Kai, Axol e Nox.
- **Outros personagens móveis:** retardatário, corredor em zigue-zague, fiscal e robô de manutenção.
- **Variantes preparadas:** os quatro robôs, quatro humanos e quatro monstros do sheet de competidores. Somente seis participam da corrida atual.
- **Canvas de cada quadro:** 148 × 174 px, anchor `bottom-center`, margem inferior de 7 px.
- **Collider de corredores:** círculo de raio 13,5 unidades no ponto dos pés. É independente do canvas e conserva a distância de contato anterior de 27 unidades entre dois corredores.

O sheet de Zorp e Mestre fornece `RIGHT`, `LEFT`, `UP` e `DOWN` nas poses de corrida, espera e salto, além de troca de raia, tropeço, vitória e derrota. Os competidores fornecem boas poses de direita e de costas. A direção esquerda espelha a pose de direita. Para baixo, o atlas usa a pose frontal existente ou a pose de três quartos mais próxima. O monstro roxo não tem uma vista de costas nítida: sua pose frontal intacta é reutilizada.

Os seis quadros pequenos de corrida por competidor se sobrepõem no original. Quando uma pose secundária invade a vizinha, o atlas usa apenas a pose completa. O recorte mede os pixels visíveis dentro de uma região conferida e isola a silhueta conectada para excluir partes de outro personagem; sombras e efeitos das poses de queda permanecem no recorte.

Prévia: `corrida_runners_preview.png` mostra todos os participantes ativos nas quatro direções e o ponto dos pés; `corrida_runners_actions_preview.png` mostra os estados usados; `corrida_mobile_preview.png` mostra os personagens móveis da pista.
