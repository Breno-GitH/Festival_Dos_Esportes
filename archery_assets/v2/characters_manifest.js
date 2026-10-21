window.ARCHERY_CHARACTER_V2_MANIFEST = {
  "version": "2.0.0",
  "canvas": [
    192,
    240
  ],
  "anchor": [
    96,
    228
  ],
  "scale": 0.46,
  "orientation": "BACK_UP",
  "background": "Edge-connected near-white flood fill; enclosed white clothing and dark outlines preserved. Large empty spaces inside bows isolated above/beside head.",
  "states": {
    "IDLE": {
      "count": 4,
      "fps": 10,
      "loop": true
    },
    "READY": {
      "count": 4,
      "fps": 10,
      "loop": true
    },
    "WALK_UP": {
      "count": 4,
      "fps": 16,
      "loop": true
    },
    "RAISE_BOW": {
      "count": 4,
      "fps": 16,
      "loop": false
    },
    "DRAW_BOWSTRING": {
      "count": 4,
      "fps": 16,
      "loop": false
    },
    "AIM": {
      "count": 4,
      "fps": 10,
      "loop": true
    },
    "RELEASE_SHOT": {
      "count": 4,
      "fps": 16,
      "loop": false
    },
    "RECOVERY": {
      "count": 4,
      "fps": 16,
      "loop": false
    },
    "HIT_REACTION": {
      "count": 3,
      "fps": 16,
      "loop": false
    },
    "MISS_REACTION": {
      "count": 3,
      "fps": 16,
      "loop": false
    },
    "VICTORY": {
      "count": 6,
      "fps": 16,
      "loop": false
    }
  },
  "characters": {
    "zorp": {
      "source": "zorp_arquearia2.0.png",
      "image": "archery_assets/v2/zorp_atlas.png",
      "frames": [
        {
          "id": "zorp_idle_01",
          "state": "IDLE",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            15,
            90,
            95,
            157
          ],
          "visibleSourceBounds": [
            19,
            94,
            87,
            149
          ],
          "sourceAnchor": [
            58,
            243
          ],
          "atlasRect": [
            0,
            0,
            192,
            240
          ],
          "contentRect": [
            57,
            79,
            144,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_idle_02",
          "state": "IDLE",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            120,
            89,
            95,
            158
          ],
          "visibleSourceBounds": [
            124,
            93,
            87,
            150
          ],
          "sourceAnchor": [
            164,
            243
          ],
          "atlasRect": [
            192,
            0,
            192,
            240
          ],
          "contentRect": [
            56,
            78,
            143,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_idle_03",
          "state": "IDLE",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            226,
            89,
            96,
            158
          ],
          "visibleSourceBounds": [
            230,
            93,
            88,
            150
          ],
          "sourceAnchor": [
            269,
            243
          ],
          "atlasRect": [
            384,
            0,
            192,
            240
          ],
          "contentRect": [
            57,
            78,
            145,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_idle_04",
          "state": "IDLE",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            331,
            90,
            97,
            157
          ],
          "visibleSourceBounds": [
            335,
            94,
            89,
            149
          ],
          "sourceAnchor": [
            375,
            243
          ],
          "atlasRect": [
            576,
            0,
            192,
            240
          ],
          "contentRect": [
            56,
            79,
            145,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_ready_01",
          "state": "READY",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            457,
            92,
            105,
            155
          ],
          "visibleSourceBounds": [
            461,
            96,
            97,
            147
          ],
          "sourceAnchor": [
            514,
            243
          ],
          "atlasRect": [
            768,
            0,
            192,
            240
          ],
          "contentRect": [
            43,
            81,
            140,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_ready_02",
          "state": "READY",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            567,
            92,
            106,
            155
          ],
          "visibleSourceBounds": [
            571,
            96,
            98,
            147
          ],
          "sourceAnchor": [
            626,
            243
          ],
          "atlasRect": [
            960,
            0,
            192,
            240
          ],
          "contentRect": [
            41,
            81,
            139,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_ready_03",
          "state": "READY",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            678,
            91,
            105,
            156
          ],
          "visibleSourceBounds": [
            682,
            95,
            97,
            148
          ],
          "sourceAnchor": [
            736,
            243
          ],
          "atlasRect": [
            1152,
            0,
            192,
            240
          ],
          "contentRect": [
            42,
            80,
            139,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_ready_04",
          "state": "READY",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            788,
            92,
            111,
            155
          ],
          "visibleSourceBounds": [
            792,
            96,
            103,
            147
          ],
          "sourceAnchor": [
            846,
            243
          ],
          "atlasRect": [
            1344,
            0,
            192,
            240
          ],
          "contentRect": [
            42,
            81,
            145,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_walk_up_01",
          "state": "WALK_UP",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            955,
            88,
            104,
            166
          ],
          "visibleSourceBounds": [
            959,
            92,
            96,
            158
          ],
          "sourceAnchor": [
            994,
            250
          ],
          "atlasRect": [
            0,
            240,
            192,
            240
          ],
          "contentRect": [
            61,
            70,
            157,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_walk_up_02",
          "state": "WALK_UP",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1077,
            90,
            100,
            164
          ],
          "visibleSourceBounds": [
            1081,
            94,
            92,
            156
          ],
          "sourceAnchor": [
            1116,
            250
          ],
          "atlasRect": [
            192,
            240,
            192,
            240
          ],
          "contentRect": [
            61,
            72,
            153,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_walk_up_03",
          "state": "WALK_UP",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1198,
            90,
            101,
            164
          ],
          "visibleSourceBounds": [
            1202,
            94,
            93,
            156
          ],
          "sourceAnchor": [
            1244,
            250
          ],
          "atlasRect": [
            384,
            240,
            192,
            240
          ],
          "contentRect": [
            54,
            72,
            147,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_walk_up_04",
          "state": "WALK_UP",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1328,
            89,
            102,
            163
          ],
          "visibleSourceBounds": [
            1332,
            93,
            94,
            155
          ],
          "sourceAnchor": [
            1375,
            248
          ],
          "atlasRect": [
            576,
            240,
            192,
            240
          ],
          "contentRect": [
            53,
            73,
            147,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_raise_bow_01",
          "state": "RAISE_BOW",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            13,
            356,
            102,
            178
          ],
          "visibleSourceBounds": [
            17,
            360,
            94,
            170
          ],
          "sourceAnchor": [
            57,
            530
          ],
          "atlasRect": [
            768,
            240,
            192,
            240
          ],
          "contentRect": [
            56,
            58,
            150,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_raise_bow_02",
          "state": "RAISE_BOW",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            120,
            342,
            103,
            193
          ],
          "visibleSourceBounds": [
            124,
            346,
            95,
            185
          ],
          "sourceAnchor": [
            168,
            531
          ],
          "atlasRect": [
            960,
            240,
            192,
            240
          ],
          "contentRect": [
            52,
            43,
            147,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_raise_bow_03",
          "state": "RAISE_BOW",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            227,
            332,
            105,
            203
          ],
          "visibleSourceBounds": [
            231,
            336,
            97,
            195
          ],
          "sourceAnchor": [
            275,
            531
          ],
          "atlasRect": [
            1152,
            240,
            192,
            240
          ],
          "contentRect": [
            52,
            33,
            149,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_raise_bow_04",
          "state": "RAISE_BOW",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            335,
            334,
            110,
            201
          ],
          "visibleSourceBounds": [
            339,
            338,
            102,
            193
          ],
          "sourceAnchor": [
            384,
            531
          ],
          "atlasRect": [
            1344,
            240,
            192,
            240
          ],
          "contentRect": [
            51,
            35,
            153,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_draw_bowstring_01",
          "state": "DRAW_BOWSTRING",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            469,
            344,
            117,
            191
          ],
          "visibleSourceBounds": [
            473,
            348,
            109,
            183
          ],
          "sourceAnchor": [
            528,
            531
          ],
          "atlasRect": [
            0,
            480,
            192,
            240
          ],
          "contentRect": [
            41,
            45,
            150,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_draw_bowstring_02",
          "state": "DRAW_BOWSTRING",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            588,
            341,
            121,
            194
          ],
          "visibleSourceBounds": [
            592,
            345,
            113,
            186
          ],
          "sourceAnchor": [
            650,
            531
          ],
          "atlasRect": [
            192,
            480,
            192,
            240
          ],
          "contentRect": [
            38,
            42,
            151,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_draw_bowstring_03",
          "state": "DRAW_BOWSTRING",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            710,
            341,
            120,
            194
          ],
          "visibleSourceBounds": [
            714,
            345,
            112,
            186
          ],
          "sourceAnchor": [
            770,
            531
          ],
          "atlasRect": [
            384,
            480,
            192,
            240
          ],
          "contentRect": [
            40,
            42,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_draw_bowstring_04",
          "state": "DRAW_BOWSTRING",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            832,
            340,
            115,
            195
          ],
          "visibleSourceBounds": [
            836,
            344,
            107,
            187
          ],
          "sourceAnchor": [
            887,
            531
          ],
          "atlasRect": [
            576,
            480,
            192,
            240
          ],
          "contentRect": [
            45,
            41,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_aim_01",
          "state": "AIM",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            972,
            334,
            118,
            200
          ],
          "visibleSourceBounds": [
            976,
            338,
            110,
            192
          ],
          "sourceAnchor": [
            1032,
            530
          ],
          "atlasRect": [
            768,
            480,
            192,
            240
          ],
          "contentRect": [
            40,
            36,
            150,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 2,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_aim_02",
          "state": "AIM",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1093,
            333,
            114,
            202
          ],
          "visibleSourceBounds": [
            1097,
            337,
            106,
            194
          ],
          "sourceAnchor": [
            1150,
            531
          ],
          "atlasRect": [
            960,
            480,
            192,
            240
          ],
          "contentRect": [
            43,
            34,
            149,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 2,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_aim_03",
          "state": "AIM",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1209,
            332,
            116,
            202
          ],
          "visibleSourceBounds": [
            1213,
            336,
            108,
            194
          ],
          "sourceAnchor": [
            1266,
            530
          ],
          "atlasRect": [
            1152,
            480,
            192,
            240
          ],
          "contentRect": [
            43,
            34,
            151,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 2,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_aim_04",
          "state": "AIM",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1326,
            332,
            111,
            203
          ],
          "visibleSourceBounds": [
            1330,
            336,
            103,
            195
          ],
          "sourceAnchor": [
            1380,
            531
          ],
          "atlasRect": [
            1344,
            480,
            192,
            240
          ],
          "contentRect": [
            46,
            33,
            149,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 2,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_release_shot_01",
          "state": "RELEASE_SHOT",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            15,
            631,
            106,
            199
          ],
          "visibleSourceBounds": [
            19,
            635,
            98,
            191
          ],
          "sourceAnchor": [
            61,
            826
          ],
          "atlasRect": [
            0,
            720,
            192,
            240
          ],
          "contentRect": [
            54,
            37,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_release_shot_02",
          "state": "RELEASE_SHOT",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            116,
            634,
            105,
            197
          ],
          "visibleSourceBounds": [
            120,
            638,
            97,
            189
          ],
          "sourceAnchor": [
            164,
            827
          ],
          "atlasRect": [
            192,
            720,
            192,
            240
          ],
          "contentRect": [
            52,
            39,
            149,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_release_shot_03",
          "state": "RELEASE_SHOT",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            217,
            614,
            107,
            218
          ],
          "visibleSourceBounds": [
            221,
            618,
            99,
            210
          ],
          "sourceAnchor": [
            266,
            828
          ],
          "atlasRect": [
            384,
            720,
            192,
            240
          ],
          "contentRect": [
            51,
            18,
            150,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_release_shot_04",
          "state": "RELEASE_SHOT",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            313,
            611,
            111,
            223
          ],
          "visibleSourceBounds": [
            317,
            615,
            103,
            215
          ],
          "sourceAnchor": [
            370,
            830
          ],
          "atlasRect": [
            576,
            720,
            192,
            240
          ],
          "contentRect": [
            43,
            13,
            146,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_recovery_01",
          "state": "RECOVERY",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            425,
            637,
            107,
            198
          ],
          "visibleSourceBounds": [
            429,
            641,
            99,
            190
          ],
          "sourceAnchor": [
            472,
            830
          ],
          "atlasRect": [
            768,
            720,
            192,
            240
          ],
          "contentRect": [
            53,
            39,
            152,
            229
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_recovery_02",
          "state": "RECOVERY",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            526,
            640,
            107,
            195
          ],
          "visibleSourceBounds": [
            530,
            644,
            99,
            187
          ],
          "sourceAnchor": [
            576,
            830
          ],
          "atlasRect": [
            960,
            720,
            192,
            240
          ],
          "contentRect": [
            50,
            42,
            149,
            229
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_recovery_03",
          "state": "RECOVERY",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            627,
            641,
            106,
            193
          ],
          "visibleSourceBounds": [
            631,
            645,
            98,
            185
          ],
          "sourceAnchor": [
            674,
            830
          ],
          "atlasRect": [
            1152,
            720,
            192,
            240
          ],
          "contentRect": [
            53,
            43,
            151,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_recovery_04",
          "state": "RECOVERY",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            724,
            641,
            109,
            195
          ],
          "visibleSourceBounds": [
            728,
            645,
            101,
            187
          ],
          "sourceAnchor": [
            775,
            830
          ],
          "atlasRect": [
            1344,
            720,
            192,
            240
          ],
          "contentRect": [
            49,
            43,
            150,
            230
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_hit_reaction_01",
          "state": "HIT_REACTION",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            836,
            638,
            102,
            196
          ],
          "visibleSourceBounds": [
            840,
            642,
            94,
            188
          ],
          "sourceAnchor": [
            896,
            830
          ],
          "atlasRect": [
            0,
            960,
            192,
            240
          ],
          "contentRect": [
            40,
            40,
            134,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_hit_reaction_02",
          "state": "HIT_REACTION",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            926,
            647,
            122,
            187
          ],
          "visibleSourceBounds": [
            930,
            651,
            114,
            179
          ],
          "sourceAnchor": [
            990,
            830
          ],
          "atlasRect": [
            192,
            960,
            192,
            240
          ],
          "contentRect": [
            36,
            49,
            150,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_hit_reaction_03",
          "state": "HIT_REACTION",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1036,
            634,
            110,
            200
          ],
          "visibleSourceBounds": [
            1040,
            638,
            102,
            192
          ],
          "sourceAnchor": [
            1086,
            830
          ],
          "atlasRect": [
            384,
            960,
            192,
            240
          ],
          "contentRect": [
            50,
            36,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_miss_reaction_01",
          "state": "MISS_REACTION",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1150,
            654,
            99,
            181
          ],
          "visibleSourceBounds": [
            1154,
            658,
            91,
            173
          ],
          "sourceAnchor": [
            1208,
            830
          ],
          "atlasRect": [
            576,
            960,
            192,
            240
          ],
          "contentRect": [
            42,
            56,
            133,
            229
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_miss_reaction_02",
          "state": "MISS_REACTION",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1252,
            656,
            94,
            178
          ],
          "visibleSourceBounds": [
            1256,
            660,
            86,
            170
          ],
          "sourceAnchor": [
            1303,
            830
          ],
          "atlasRect": [
            768,
            960,
            192,
            240
          ],
          "contentRect": [
            49,
            58,
            135,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_miss_reaction_03",
          "state": "MISS_REACTION",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            1344,
            658,
            91,
            176
          ],
          "visibleSourceBounds": [
            1348,
            662,
            83,
            168
          ],
          "sourceAnchor": [
            1392,
            830
          ],
          "atlasRect": [
            960,
            960,
            192,
            240
          ],
          "contentRect": [
            52,
            60,
            135,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_victory_01",
          "state": "VICTORY",
          "frame": 1,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            14,
            897,
            130,
            160
          ],
          "visibleSourceBounds": [
            18,
            901,
            122,
            152
          ],
          "sourceAnchor": [
            62,
            1053
          ],
          "atlasRect": [
            1152,
            960,
            192,
            240
          ],
          "contentRect": [
            52,
            76,
            174,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_victory_02",
          "state": "VICTORY",
          "frame": 2,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            130,
            899,
            128,
            170
          ],
          "visibleSourceBounds": [
            134,
            903,
            120,
            162
          ],
          "sourceAnchor": [
            180,
            1065
          ],
          "atlasRect": [
            1344,
            960,
            192,
            240
          ],
          "contentRect": [
            50,
            66,
            170,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_victory_03",
          "state": "VICTORY",
          "frame": 3,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            252,
            900,
            139,
            169
          ],
          "visibleSourceBounds": [
            256,
            904,
            131,
            161
          ],
          "sourceAnchor": [
            310,
            1065
          ],
          "atlasRect": [
            0,
            1200,
            192,
            240
          ],
          "contentRect": [
            42,
            67,
            173,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_victory_04",
          "state": "VICTORY",
          "frame": 4,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            376,
            887,
            163,
            182
          ],
          "visibleSourceBounds": [
            380,
            891,
            155,
            174
          ],
          "sourceAnchor": [
            454,
            1065
          ],
          "atlasRect": [
            192,
            1200,
            192,
            240
          ],
          "contentRect": [
            22,
            54,
            177,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_victory_05",
          "state": "VICTORY",
          "frame": 5,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            521,
            877,
            163,
            185
          ],
          "visibleSourceBounds": [
            525,
            881,
            155,
            177
          ],
          "sourceAnchor": [
            599,
            1058
          ],
          "atlasRect": [
            384,
            1200,
            192,
            240
          ],
          "contentRect": [
            22,
            51,
            177,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "zorp_victory_06",
          "state": "VICTORY",
          "frame": 6,
          "source": "zorp_arquearia2.0.png",
          "sourceRect": [
            657,
            892,
            141,
            170
          ],
          "visibleSourceBounds": [
            661,
            896,
            133,
            162
          ],
          "sourceAnchor": [
            730,
            1058
          ],
          "atlasRect": [
            576,
            1200,
            192,
            240
          ],
          "contentRect": [
            27,
            66,
            160,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        }
      ],
      "notes": []
    },
    "master": {
      "source": "mestre_arquearia2.0.png",
      "image": "archery_assets/v2/master_atlas.png",
      "frames": [
        {
          "id": "master_idle_01",
          "state": "IDLE",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            15,
            84,
            98,
            160
          ],
          "visibleSourceBounds": [
            19,
            88,
            90,
            152
          ],
          "sourceAnchor": [
            60,
            240
          ],
          "atlasRect": [
            0,
            0,
            192,
            240
          ],
          "contentRect": [
            55,
            76,
            145,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_idle_02",
          "state": "IDLE",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            122,
            85,
            96,
            159
          ],
          "visibleSourceBounds": [
            126,
            89,
            88,
            151
          ],
          "sourceAnchor": [
            166,
            240
          ],
          "atlasRect": [
            192,
            0,
            192,
            240
          ],
          "contentRect": [
            56,
            77,
            144,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_idle_03",
          "state": "IDLE",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            224,
            85,
            100,
            160
          ],
          "visibleSourceBounds": [
            228,
            89,
            92,
            152
          ],
          "sourceAnchor": [
            269,
            241
          ],
          "atlasRect": [
            384,
            0,
            192,
            240
          ],
          "contentRect": [
            55,
            76,
            147,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_idle_04",
          "state": "IDLE",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            324,
            85,
            99,
            160
          ],
          "visibleSourceBounds": [
            328,
            89,
            91,
            152
          ],
          "sourceAnchor": [
            370,
            241
          ],
          "atlasRect": [
            576,
            0,
            192,
            240
          ],
          "contentRect": [
            54,
            76,
            145,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_ready_01",
          "state": "READY",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            460,
            84,
            109,
            163
          ],
          "visibleSourceBounds": [
            464,
            88,
            101,
            155
          ],
          "sourceAnchor": [
            516,
            243
          ],
          "atlasRect": [
            768,
            0,
            192,
            240
          ],
          "contentRect": [
            44,
            73,
            145,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_ready_02",
          "state": "READY",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            571,
            84,
            111,
            164
          ],
          "visibleSourceBounds": [
            575,
            88,
            103,
            156
          ],
          "sourceAnchor": [
            630,
            244
          ],
          "atlasRect": [
            960,
            0,
            192,
            240
          ],
          "contentRect": [
            41,
            72,
            144,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_ready_03",
          "state": "READY",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            681,
            84,
            117,
            163
          ],
          "visibleSourceBounds": [
            685,
            88,
            109,
            155
          ],
          "sourceAnchor": [
            740,
            243
          ],
          "atlasRect": [
            1152,
            0,
            192,
            240
          ],
          "contentRect": [
            41,
            73,
            150,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_ready_04",
          "state": "READY",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            797,
            84,
            112,
            162
          ],
          "visibleSourceBounds": [
            801,
            88,
            104,
            154
          ],
          "sourceAnchor": [
            853,
            242
          ],
          "atlasRect": [
            1344,
            0,
            192,
            240
          ],
          "contentRect": [
            44,
            74,
            148,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_walk_up_01",
          "state": "WALK_UP",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            961,
            75,
            112,
            180
          ],
          "visibleSourceBounds": [
            965,
            79,
            104,
            172
          ],
          "sourceAnchor": [
            1028,
            251
          ],
          "atlasRect": [
            0,
            240,
            192,
            240
          ],
          "contentRect": [
            33,
            56,
            137,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_walk_up_02",
          "state": "WALK_UP",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1085,
            80,
            105,
            179
          ],
          "visibleSourceBounds": [
            1089,
            84,
            97,
            171
          ],
          "sourceAnchor": [
            1125,
            255
          ],
          "atlasRect": [
            192,
            240,
            192,
            240
          ],
          "contentRect": [
            60,
            57,
            157,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_walk_up_03",
          "state": "WALK_UP",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1205,
            82,
            105,
            177
          ],
          "visibleSourceBounds": [
            1209,
            86,
            97,
            169
          ],
          "sourceAnchor": [
            1262,
            255
          ],
          "atlasRect": [
            384,
            240,
            192,
            240
          ],
          "contentRect": [
            43,
            59,
            140,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_walk_up_04",
          "state": "WALK_UP",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1321,
            76,
            111,
            179
          ],
          "visibleSourceBounds": [
            1325,
            80,
            103,
            171
          ],
          "sourceAnchor": [
            1388,
            251
          ],
          "atlasRect": [
            576,
            240,
            192,
            240
          ],
          "contentRect": [
            33,
            57,
            136,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_raise_bow_01",
          "state": "RAISE_BOW",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            13,
            335,
            102,
            199
          ],
          "visibleSourceBounds": [
            17,
            339,
            94,
            191
          ],
          "sourceAnchor": [
            56,
            530
          ],
          "atlasRect": [
            768,
            240,
            192,
            240
          ],
          "contentRect": [
            57,
            37,
            151,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_raise_bow_02",
          "state": "RAISE_BOW",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            119,
            333,
            106,
            201
          ],
          "visibleSourceBounds": [
            123,
            337,
            98,
            193
          ],
          "sourceAnchor": [
            166,
            530
          ],
          "atlasRect": [
            960,
            240,
            192,
            240
          ],
          "contentRect": [
            53,
            35,
            151,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_raise_bow_03",
          "state": "RAISE_BOW",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            229,
            333,
            106,
            201
          ],
          "visibleSourceBounds": [
            233,
            337,
            98,
            193
          ],
          "sourceAnchor": [
            276,
            530
          ],
          "atlasRect": [
            1152,
            240,
            192,
            240
          ],
          "contentRect": [
            53,
            35,
            151,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_raise_bow_04",
          "state": "RAISE_BOW",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            331,
            324,
            114,
            210
          ],
          "visibleSourceBounds": [
            335,
            328,
            106,
            202
          ],
          "sourceAnchor": [
            384,
            530
          ],
          "atlasRect": [
            1344,
            240,
            192,
            240
          ],
          "contentRect": [
            47,
            26,
            153,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_draw_bowstring_01",
          "state": "DRAW_BOWSTRING",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            470,
            342,
            117,
            192
          ],
          "visibleSourceBounds": [
            474,
            346,
            109,
            184
          ],
          "sourceAnchor": [
            526,
            530
          ],
          "atlasRect": [
            0,
            480,
            192,
            240
          ],
          "contentRect": [
            44,
            44,
            153,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_draw_bowstring_02",
          "state": "DRAW_BOWSTRING",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            584,
            339,
            121,
            194
          ],
          "visibleSourceBounds": [
            588,
            343,
            113,
            186
          ],
          "sourceAnchor": [
            644,
            529
          ],
          "atlasRect": [
            192,
            480,
            192,
            240
          ],
          "contentRect": [
            40,
            42,
            153,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_draw_bowstring_03",
          "state": "DRAW_BOWSTRING",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            703,
            339,
            123,
            195
          ],
          "visibleSourceBounds": [
            707,
            343,
            115,
            187
          ],
          "sourceAnchor": [
            766,
            530
          ],
          "atlasRect": [
            384,
            480,
            192,
            240
          ],
          "contentRect": [
            37,
            41,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_draw_bowstring_04",
          "state": "DRAW_BOWSTRING",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            829,
            337,
            118,
            197
          ],
          "visibleSourceBounds": [
            833,
            341,
            110,
            189
          ],
          "sourceAnchor": [
            885,
            530
          ],
          "atlasRect": [
            576,
            480,
            192,
            240
          ],
          "contentRect": [
            44,
            39,
            154,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_aim_01",
          "state": "AIM",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            969,
            326,
            117,
            208
          ],
          "visibleSourceBounds": [
            973,
            330,
            109,
            200
          ],
          "sourceAnchor": [
            1026,
            530
          ],
          "atlasRect": [
            768,
            480,
            192,
            240
          ],
          "contentRect": [
            43,
            28,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 2,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_aim_02",
          "state": "AIM",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1091,
            325,
            114,
            209
          ],
          "visibleSourceBounds": [
            1095,
            329,
            106,
            201
          ],
          "sourceAnchor": [
            1145,
            530
          ],
          "atlasRect": [
            960,
            480,
            192,
            240
          ],
          "contentRect": [
            46,
            27,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 2,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_aim_03",
          "state": "AIM",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1208,
            325,
            114,
            209
          ],
          "visibleSourceBounds": [
            1212,
            329,
            106,
            201
          ],
          "sourceAnchor": [
            1262,
            530
          ],
          "atlasRect": [
            1152,
            480,
            192,
            240
          ],
          "contentRect": [
            46,
            27,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 2,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_aim_04",
          "state": "AIM",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1327,
            325,
            111,
            209
          ],
          "visibleSourceBounds": [
            1331,
            329,
            103,
            201
          ],
          "sourceAnchor": [
            1378,
            530
          ],
          "atlasRect": [
            1344,
            480,
            192,
            240
          ],
          "contentRect": [
            49,
            27,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 2,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_release_shot_01",
          "state": "RELEASE_SHOT",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            15,
            633,
            105,
            200
          ],
          "visibleSourceBounds": [
            19,
            637,
            97,
            192
          ],
          "sourceAnchor": [
            60,
            829
          ],
          "atlasRect": [
            0,
            720,
            192,
            240
          ],
          "contentRect": [
            55,
            36,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_release_shot_02",
          "state": "RELEASE_SHOT",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            114,
            633,
            110,
            200
          ],
          "visibleSourceBounds": [
            118,
            637,
            102,
            192
          ],
          "sourceAnchor": [
            164,
            829
          ],
          "atlasRect": [
            192,
            720,
            192,
            240
          ],
          "contentRect": [
            50,
            36,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_release_shot_03",
          "state": "RELEASE_SHOT",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            220,
            606,
            106,
            227
          ],
          "visibleSourceBounds": [
            224,
            610,
            98,
            219
          ],
          "sourceAnchor": [
            266,
            829
          ],
          "atlasRect": [
            384,
            720,
            192,
            240
          ],
          "contentRect": [
            54,
            9,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_release_shot_04",
          "state": "RELEASE_SHOT",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            318,
            621,
            105,
            212
          ],
          "visibleSourceBounds": [
            322,
            625,
            97,
            204
          ],
          "sourceAnchor": [
            371,
            829
          ],
          "atlasRect": [
            576,
            720,
            192,
            240
          ],
          "contentRect": [
            47,
            24,
            144,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_recovery_01",
          "state": "RECOVERY",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            422,
            633,
            106,
            201
          ],
          "visibleSourceBounds": [
            426,
            637,
            98,
            193
          ],
          "sourceAnchor": [
            470,
            830
          ],
          "atlasRect": [
            768,
            720,
            192,
            240
          ],
          "contentRect": [
            52,
            35,
            150,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_recovery_02",
          "state": "RECOVERY",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            520,
            634,
            113,
            200
          ],
          "visibleSourceBounds": [
            524,
            638,
            105,
            192
          ],
          "sourceAnchor": [
            574,
            830
          ],
          "atlasRect": [
            960,
            720,
            192,
            240
          ],
          "contentRect": [
            46,
            36,
            151,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_recovery_03",
          "state": "RECOVERY",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            625,
            635,
            112,
            199
          ],
          "visibleSourceBounds": [
            629,
            639,
            104,
            191
          ],
          "sourceAnchor": [
            678,
            830
          ],
          "atlasRect": [
            1152,
            720,
            192,
            240
          ],
          "contentRect": [
            47,
            37,
            151,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_recovery_04",
          "state": "RECOVERY",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            729,
            634,
            109,
            199
          ],
          "visibleSourceBounds": [
            733,
            638,
            101,
            191
          ],
          "sourceAnchor": [
            778,
            829
          ],
          "atlasRect": [
            1344,
            720,
            192,
            240
          ],
          "contentRect": [
            51,
            37,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_hit_reaction_01",
          "state": "HIT_REACTION",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            842,
            631,
            114,
            203
          ],
          "visibleSourceBounds": [
            846,
            635,
            106,
            195
          ],
          "sourceAnchor": [
            896,
            830
          ],
          "atlasRect": [
            0,
            960,
            192,
            240
          ],
          "contentRect": [
            46,
            33,
            152,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_hit_reaction_02",
          "state": "HIT_REACTION",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            947,
            640,
            109,
            194
          ],
          "visibleSourceBounds": [
            951,
            644,
            101,
            186
          ],
          "sourceAnchor": [
            990,
            830
          ],
          "atlasRect": [
            192,
            960,
            192,
            240
          ],
          "contentRect": [
            57,
            42,
            158,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_hit_reaction_03",
          "state": "HIT_REACTION",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1044,
            631,
            98,
            205
          ],
          "visibleSourceBounds": [
            1048,
            635,
            90,
            197
          ],
          "sourceAnchor": [
            1080,
            832
          ],
          "atlasRect": [
            384,
            960,
            192,
            240
          ],
          "contentRect": [
            64,
            31,
            154,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_miss_reaction_01",
          "state": "MISS_REACTION",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1146,
            653,
            101,
            182
          ],
          "visibleSourceBounds": [
            1150,
            657,
            93,
            174
          ],
          "sourceAnchor": [
            1202,
            831
          ],
          "atlasRect": [
            576,
            960,
            192,
            240
          ],
          "contentRect": [
            44,
            54,
            137,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_miss_reaction_02",
          "state": "MISS_REACTION",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1249,
            654,
            97,
            180
          ],
          "visibleSourceBounds": [
            1253,
            658,
            89,
            172
          ],
          "sourceAnchor": [
            1302,
            830
          ],
          "atlasRect": [
            768,
            960,
            192,
            240
          ],
          "contentRect": [
            47,
            56,
            136,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_miss_reaction_03",
          "state": "MISS_REACTION",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            1344,
            635,
            94,
            199
          ],
          "visibleSourceBounds": [
            1348,
            639,
            86,
            191
          ],
          "sourceAnchor": [
            1392,
            830
          ],
          "atlasRect": [
            960,
            960,
            192,
            240
          ],
          "contentRect": [
            52,
            37,
            138,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_victory_01",
          "state": "VICTORY",
          "frame": 1,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            14,
            899,
            136,
            166
          ],
          "visibleSourceBounds": [
            18,
            903,
            128,
            158
          ],
          "sourceAnchor": [
            66,
            1061
          ],
          "atlasRect": [
            1152,
            960,
            192,
            240
          ],
          "contentRect": [
            48,
            70,
            176,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_victory_02",
          "state": "VICTORY",
          "frame": 2,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            132,
            893,
            135,
            176
          ],
          "visibleSourceBounds": [
            136,
            897,
            127,
            168
          ],
          "sourceAnchor": [
            192,
            1065
          ],
          "atlasRect": [
            1344,
            960,
            192,
            240
          ],
          "contentRect": [
            40,
            60,
            167,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_victory_03",
          "state": "VICTORY",
          "frame": 3,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            253,
            892,
            172,
            175
          ],
          "visibleSourceBounds": [
            257,
            896,
            164,
            167
          ],
          "sourceAnchor": [
            331,
            1063
          ],
          "atlasRect": [
            0,
            1200,
            192,
            240
          ],
          "contentRect": [
            22,
            61,
            186,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_victory_04",
          "state": "VICTORY",
          "frame": 4,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            394,
            876,
            175,
            193
          ],
          "visibleSourceBounds": [
            398,
            880,
            167,
            185
          ],
          "sourceAnchor": [
            484,
            1065
          ],
          "atlasRect": [
            192,
            1200,
            192,
            240
          ],
          "contentRect": [
            10,
            43,
            177,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 1,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_victory_05",
          "state": "VICTORY",
          "frame": 5,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            551,
            880,
            148,
            185
          ],
          "visibleSourceBounds": [
            555,
            884,
            140,
            177
          ],
          "sourceAnchor": [
            636,
            1061
          ],
          "atlasRect": [
            384,
            1200,
            192,
            240
          ],
          "contentRect": [
            15,
            51,
            155,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        },
        {
          "id": "master_victory_06",
          "state": "VICTORY",
          "frame": 6,
          "source": "mestre_arquearia2.0.png",
          "sourceRect": [
            698,
            883,
            141,
            182
          ],
          "visibleSourceBounds": [
            702,
            887,
            133,
            174
          ],
          "sourceAnchor": [
            773,
            1061
          ],
          "atlasRect": [
            576,
            1200,
            192,
            240
          ],
          "contentRect": [
            25,
            54,
            158,
            228
          ],
          "anchor": [
            96,
            228
          ],
          "enclosedBackgroundHolesRemoved": 0,
          "orientation": "BACK_UP",
          "mirrored": false
        }
      ],
      "notes": [
        "mestre_arquearia2.0.png: RECOVERY 2/3 share an outline. Split at visible-pixel valley x=629; no grid or pixels deleted."
      ]
    }
  }
};
