/* Limites dos pixels visíveis de zorp.png (500 x 500), sem dividir em grade.
 * Pivô horizontal por coluna e contato dos pés por frame; escala única em todas as direções. */
window.OVERWORLD_ZORP_WALK = {
    scale: 0.4,
    pivots: [94,243,391],
    sequences: [[1,0,1,2],[1,0,1,2],[1,0,1,2],[1,0,1,2]],
    frames: [
        [[67,17,55,104],[216,17,53,104],[364,18,55,103]],
        [[68,134,54,105],[215,134,55,104],[364,134,55,105]],
        [[71,254,48,98],[218,254,48,98],[368,254,48,98]],
        [[71,367,45,97],[218,368,44,96],[366,368,46,96]]
    ]
};
