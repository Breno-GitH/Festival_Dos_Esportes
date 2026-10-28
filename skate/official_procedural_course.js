(function (root, factory) {
    const course = factory(root.SkateProceduralTrack
        || (typeof require === "function" ? require("./procedural_track.js") : null));
    if (typeof module === "object" && module.exports) module.exports = course;
    if (root) root.SkateOfficialProceduralCourse = course;
})(typeof globalThis === "object" ? globalThis : this, function (kit) {
    "use strict";

    const level = kit.createBuilder({ spawnX: 150, groundY: 250 });
    const groundRows = [
        [150,430,250,250],[478,2470,250,250],[2780,3470,250,250],[3870,5540,250,250],
        [5585,8140,250,250],[8620,9200,250,250],
        [10190,11115.6,250,250],[11115.6,11394,250,130],[11394,11465.6,130,130],
        [11465.6,11744,130,10],[11744,11815.6,10,10],[11815.6,12094,10,-180],
        [12094,12135,-180,-180],[12135,12385,-180,-110],[12385,12880,-110,-110],
        [13140,13700,-170,-170],[13700,13900,-170,-170],[13900,14480,-170,-170],
        [16350,16650,-170,-170],[17820,17980,250,250],[17980,18990,250,250],
        [20130,20730,265,320],[20730,20734.5,320,320],[20734.5,20877,320,334.04],
        [20877,21130,334.04,350],[21130,21150,350,349.067],[22630,22970,280,280],
        [23035,24059,250,250],[25179,25849,250,250],[25849,26449,250,250]
    ];
    groundRows.forEach(([startX,endX,startY,endY], index) => level.addGround({
        id: `official-ground-${index + 1}`, x: startX, length: endX - startX,
        y: startY, endY, depth: 180
    }));

    const sampleGround = x => {
        const row = groundRows.find(([start,end]) => x >= start && x <= end);
        if (!row) return null;
        const [start,end,a,b] = row;
        return a + (b - a) * (x - start) / Math.max(1, end - start);
    };
    const fatalFloor = x => x < 10780 ? 510 : x < 13700 ? 90
        : x < 20130 ? 430 : x < 22630 ? 510 : 430;
    const supportFloor = x => sampleGround(x) ?? fatalFloor(x);

    const gapRows = [
        ["first-hop",430,478,false,"JUMP"],["street-hop",5540,5585,false,"STREET GAP"],
        ["first-transfer-risk",2470,2780,true,"CURVE OVER VOID"],
        ["intro-long-risk",3470,3870,true,"HOLD THE LINE"],
        ["stair-drop",8140,8620,true,"HANDRAIL / STAIRS"],
        ["three-rail-void",9200,10190,true,"GRIND CHAIN"],
        ["huge-launch-gap",12880,13140,true,"ROOFTOP GAP"],
        ["five-rail-void",14480,16350,true,"FIVE RAILS · NO FLOOR"],
        ["grand-stair-drop",16650,17610,true,"GRIND THE STAIR RAIL"],
        ["grand-stair-exit",17610,17820,true,"RELEASE → SUPER OUT"],
        ["advanced-stair-gap",18990,20130,true,"HIGH RAIL → HANDRAIL"],
        ["final-chain-gap",21150,22630,true,"FINAL RAIL LINE"],
        ["final-platform-gap",22970,23035,false,"PRECISION HOP"],
        ["final-launch-gap",24059,25179,true,"MEGA AIR · HOLD SPACE"]
    ];
    gapRows.forEach(([id,leftEdge,rightEdge,fatal,label]) => level.addGap({
        id, leftEdge, rightEdge, edgeY: sampleGround(leftEdge) ?? sampleGround(rightEdge) ?? 250,
        rightEdgeY: sampleGround(rightEdge) ?? 250,
        fatal, label
    }));

    const rampRows = [
        ["start-kicker","SMALL KICKER","SMALL_KICKER",288.389,78,false,[[618.745,250],[778.073,199.065]]],
        ["first-rail-kicker","FIRST RAIL SETUP","MEDIUM_KICKER",278.872,92,false,[[904.5,250],[1042.5,199.888]]],
        ["transfer-bank","TRANSFER BANK","LONG_BANK",273.04,45,false,[[1625.6,250],[1795.25,208.96]]],
        ["chain-kicker","THREE RAIL SETUP","MEDIUM_KICKER",286.72,280,false,[[3128.821,250],[3278.493,201.28]]],
        ["street-kicker","STREET FLOW","SMALL_KICKER",287.972,70,false,[[4778.669,250],[4947.653,199.619]]],
        ["bench-bank","BENCH SETUP","LONG_BANK",280.08,62,false,[[6294.4,250],[6451,196.42]]],
        ["bench-exit-kicker","BENCH EXIT","MEDIUM_KICKER",279.209,500,false,[[7098.898,250],[7238.912,211.245]]],
        ["stair-kicker","STAIR HANDRAIL","MEDIUM_KICKER",286.09,480,false,[[7806,250],[7990,187.36]]],
        ["danger-chain-kicker","NO FLOOR SETUP","MEDIUM_KICKER",279.173,115,false,[[8794.95,250],[8946.75,199.366]]],
        ["speed-kicker-first","SPEED RELEASE","SMALL_KICKER",286.72,72,false,[[10598.707,250],[10762.863,201.28]]],
        ["ascent-bank-1","CONCRETE ASCENT","LONG_BANK",317.2,12,false,[[11115.6,250],[11394,130.3]]],
        ["ascent-bank-2","PLAZA BANK","LONG_BANK",197.2,12,false,[[11465.6,130],[11744,10.3]]],
        ["ascent-bank-3","ROOFTOP BANK","LONG_BANK",77.2,12,false,[[11815.6,10],[12094,-179.7]]],
        ["huge-launch","ROOFTOP LAUNCH","BIG_LAUNCH",-37.378,630,true,kit.launchSurface(12405,-110,465,110)],
        ["void-entry-kicker","VOID RAIL SETUP","MEDIUM_KICKER",-150,82,false,[[14010,-170],[14075,-178],[14125,-220]]],
        ["advanced-launch","LEDGE SETUP","MEDIUM_KICKER",252.88,400,false,[[18156.3,250],[18202.5,242.8],[18250.8,227.68],[18301.2,208.24],[18355.8,185.2]]],
        ["release-small","DOWNHILL KICKER","SMALL_KICKER",285,48,false,[[20250,276],[20310,270],[20380,245]]],
        ["release-medium","DOWNHILL KICKER","MEDIUM_KICKER",310,70,false,[[20535,302],[20590,291],[20650,266]]],
        ["release-curve","CURVED TRANSITION","CURVED_RAMP",338,85,false,[[20734.5,320],[20778,316],[20830,301],[20885,275]]],
        ["final-medium-kicker","FINAL HANDRAIL SETUP","MEDIUM_KICKER",338.681,375,false,[[20915.7,336.481],[20957.5,333.731],[20999.3,326.581],[21039.2,312.281],[21067.7,294.681],[21092.4,285.606]]],
        ["final-big-ramp","MEGA LAUNCH","BIG_LAUNCH",262,620,true,kit.launchSurface(23636,250,420,110)],
        ["finish-landing-bank","FINISH LANDING","LONG_BANK",290,18,false,[[25519,250],[25559,250],[25604,250],[25649,250]]]
    ];
    // Deliberate receiving surfaces, also used by the camera and QA validator.
    const rampDestinations = {
        "start-kicker": [800,900,"ground", "Salto curto de introdução"],
        "first-rail-kicker": [1089,1470,"first-rail", "Entrada no primeiro grind"],
        "transfer-bank": [1810,1910,"ground", "Bank suave entre transfers"],
        "chain-kicker": [3370,3930,"three-c", "Entrada no rail sobre o gap"],
        "street-kicker": [4970,5140,"ground", "Salto curto de street"],
        "bench-bank": [6470,6710,"ground", "Preparação da área de bancos"],
        "bench-exit-kicker": [7358,7653,"bench-exit", "Saída curva para grind"],
        "stair-kicker": [8073,8608,"stair-handrail", "Lançamento alto para corrimão da escada"],
        "danger-chain-kicker": [8889,9269,"danger-a", "Primeiro rail da cadeia sem chão"],
        "speed-kicker-first": [10780,11100,"ground", "Salto de entrada na subida"],
        "ascent-bank-1": [11394,11465,"ground", "Subida longa e suave ao primeiro patamar"],
        "ascent-bank-2": [11744,11815,"ground", "Segundo patamar da praça"],
        "ascent-bank-3": [12094,12400,"ground", "Acesso ao rooftop"],
        "huge-launch": [13140,13900,"ground", "Grande gap entre rooftops"],
        "void-entry-kicker": [14165,14515,"void-a", "Entrada na cadeia de cinco rails"],
        "advanced-launch": [18395,18921,"advanced-ledge-edge", "Banco elevado e ledge"],
        "release-small": [20390,20530,"ground", "Kicker curto no downhill"],
        "release-medium": [20660,20885,"ground", "Transfer médio para transição curva"],
        "release-curve": [20890,21092,"ground", "Curva de conexão ao lançamento final"],
        "final-medium-kicker": [21201,21558,"final-descending", "Corrimão do gauntlet final"],
        "final-big-ramp": [25179,25519,"ground", "Mega Air sustentado sobre o grande vazio"],
        "finish-landing-bank": [25649,25849,"ground", "Pequena saída e estabilização antes do finish"]
    };
    rampRows.forEach(([id,name,type,baseY,launchStrength,autoLaunch,authoredSurface]) => {
        // Low timber kickers retain their exit positions but use a compact human-scale silhouette.
        const surfacePoints = type === "SMALL_KICKER" && authoredSurface.length === 2
            ? [[authoredSurface[1][0] - Math.min(112, authoredSurface[1][0] - authoredSurface[0][0]), authoredSurface[0][1]],
                [authoredSurface[1][0], authoredSurface[0][1] - Math.min(34, authoredSurface[0][1] - authoredSurface[1][1])]]
            : authoredSurface;
        level.addRamp({
        id, name, type, baseY: Math.max(...surfacePoints.map(p => Array.isArray(p) ? p[1] : p.y)) + 12, launchStrength, autoLaunch, surfacePoints,
        landingZone: Object.freeze({ startX: rampDestinations[id][0], endX: rampDestinations[id][1],
            surfaceId: rampDestinations[id][2] }), purpose: rampDestinations[id][3],
        specialAir: id === "final-big-ramp" ? { maxControlledMs: 3400,
            sustainVelocityFloor: 120, sustainGravityScale: 0.58,
            fallGravityScale: 1.75, slowMotionMs: 800, graceMs: 100 } : null
    });
    });

    const railRows = [
        ["first-rail","FIRST GRIND","horizontal",false,[[1089.567,211],[1470,211]]],
        ["first-link","SHORT HIGH LINK","ascending",false,[[1600,141],[1770,124]]],
        ["transfer-b","DESCENDING FLOW","descending",true,[[1915,90],[2360,190]]],
        ["three-a","CURVE OVER VOID","curved",true,[[2500,145],[2580,130],[2690,166],[2820,193]]],
        ["three-c","LONG RISK LINE","curved",true,[[3370,195],[3530,176],[3720,191],[3930,210]]],
        ["street-ledge","STREET LEDGE","ledge",false,[[5252.697,211.496],[5483.78,211.496]]],
        ["bench-exit","BENCH EXIT RAIL","curved",false,[[7358.051,143.046],[7443.694,176.849],[7542.025,200.251],[7653.045,200.251]]],
        ["stair-handrail","STAIR RAIL","descending",true,[[8073.04,96],[8608.72,194.383]]],
        ["danger-a","RISK A","horizontal",true,[[8889.64,179.568],[9269.12,179.568]]],
        ["danger-b","RISK B","horizontal",true,[[9309.559,129],[9661.618,129]]],
        ["danger-c","RISK C","curved",true,[[9757.206,112],[9879.962,155.28],[10020.903,185.243],[10180.031,185.243]]],
        ["huge-exit-rail","LANDING GRIND","horizontal",true,[[13335,-214],[13675,-214]]],
        ["void-a","VOID A · FLAT","horizontal",true,[[14165,-251],[14515,-251]]],
        ["void-b","VOID B · RISE","ascending",true,[[14590,-280],[14925,-288]]],
        ["void-c","VOID C · DESCEND","descending",true,[[15020,-292],[15435,-205]]],
        ["void-d","VOID D · CURVE","curved",true,[[15525,-230],[15605,-251],[15705,-246],[15825,-225]]],
        ["void-e","VOID E · LONG","horizontal",true,[[15970,-330],[16325,-330]]],
        ["grand-stair-handrail","GRAND STAIR · EXIT","descending",true,[[16620,-235],[17620,185]]],
        ["advanced-ledge-edge","LEDGE LAUNCH","ledge",true,[[18518.4,135.8],[18921.6,135.8]]],
        ["high-rail","HIGH RAIL · SUPER","ascending",true,[[19035,65],[19175,55],[19346,42],[19489.5,35]]],
        ["advanced-handrail","SECOND STAIR RAIL","descending",true,[[19598.65,10],[19685.1,28.7],[19780.65,55.9],[19885.3,83.1],[20026.35,110.3]]],
        ["final-descending","FINAL HANDRAIL","descending",true,[[21201.4,205],[21273.6,222.05],[21353.4,246.85],[21440.8,271.65],[21558.6,296.45]]],
        ["final-transfer","FAST TRANSFER","descending",true,[[21622,220],[21685,228],[21765,240]]],
        ["final-high","FINAL HIGH CAPTURE","horizontal",true,[[21850,180],[22140,180]]],
        ["final-curved","FINAL CURVE","curved",true,[[22214.4,140],[22236,149.101],[22264.8,159.2],[22300.8,167.284],[22336.8,169.308],[22372.8,163.247],[22394.4,157.186],[22430.4,140],[22459.2,128.885],[22495.2,118.274],[22524,117.257],[22547.4,115.747]]],
        ["final-bench-edge","FINAL LEDGE","ledge",false,[[23032.2,217.2],[23377.8,217.2]]],
        ["finish-rail","LAST CAPTURE","curved",false,[[25299,210],[25379,194],[25469,190],[25559,210]]]
    ];
    const stairSupportFloor = x => x < 8140 ? 250
        : 130 + Math.min(11, Math.floor((x - 8140) / 40)) * 10;
    const grandStairSupportFloor = x => x < 16650 ? -170
        : -170 + Math.min(23, Math.floor((x - 16650) / 40)) * 17.5;
    const finalStairSupportFloor = x => x < 21230 ? 350
        : 255 + Math.min(6, Math.floor((x - 21230) / 48)) * 12;
    const advancedStairSupportFloor = x => x < 19660 ? 430
        : 55 + Math.min(11, Math.floor((x - 19660) / (400 / 12))) * (160 / 12);
    railRows.forEach(([id,name,type,required,grindPath]) => level.addRail({
        id, name, type, required, grindPath, supportSpacing: type === "ledge" ? 150 : 105,
        supportY: id === "stair-handrail" ? stairSupportFloor
            : id === "grand-stair-handrail" ? grandStairSupportFloor
                : id === "final-descending" ? finalStairSupportFloor
                    : id === "advanced-handrail" ? advancedStairSupportFloor : supportFloor
    }));

    // Structural gameplay props. Their collision regions come from the primitives, never sprites.
    level.addLedge({ id: "street-ledge-block", x: 5252.697, groundY: 250, width: 231.083,
        height: 38.504, grindable: false, name: "STREET LEDGE" });
    level.addPlatform({ id: "street-low-block", x: 5747, y: 193.37, width: 158,
        baseY: 250, trickable: true, name: "LOW BLOCK" });
    level.addPlatform({ id: "street-concrete", x: 6106.2, y: 204.915, width: 144.15,
        baseY: 250, trickable: true, name: "CONCRETE BLOCK" });
    level.addBench({ id: "main-bench", x: 6731.56, groundY: 250, width: 188.05,
        height: 59.209, grindable: false, name: "MAIN BENCH" });
    level.addStairs({ id: "fatal-stairs", x: 8140, topY: 130, steps: 12,
        stepWidth: 40, stepHeight: 10, fatal: true, handrail: false,
        safeGrindRailId: "stair-handrail", name: "FATAL STAIRS" });
    level.addSupport({ id: "danger-pillar-left", x: 9290, topY: 180, bottomY: 510, width: 115 });
    level.addSupport({ id: "danger-pillar-mid", x: 9590, topY: 155, bottomY: 510, width: 110 });
    level.addSupport({ id: "danger-pillar-right", x: 9840, topY: 185, bottomY: 510, width: 130 });
    level.addPlatform({ id: "huge-landing-structure", x: 13140, y: -170, width: 760,
        baseY: 90, dangerousSide: false, name: "HUGE LANDING" });
    for (const [id,x,topY,width] of [
        ["void-pier-a",14480,-243,100],["void-pier-b",14900,-279,110],
        ["void-pier-c",15390,-206,110],["void-pier-d",15800,-222,110],
        ["void-pier-e",16225,-322,125]
    ]) level.addSupport({ id, x, topY, bottomY: 430, width });
    level.addPlatform({ id: "void-exit-structure", x: 16350, y: -170, width: 300,
        baseY: 430, dangerousSide: false, name: "STAIR APPROACH" });
    level.addStairs({ id: "grand-fatal-stairs", x: 16650, topY: -170, steps: 24,
        stepWidth: 40, stepHeight: 17.5, fatal: true, handrail: false,
        safeGrindRailId: "grand-stair-handrail", name: "GRAND STAIR DROP" });
    level.addSupport({ id: "grand-stair-foundation", x: 17110, topY: 31,
        bottomY: 430, width: 150 });
    level.addPlatform({ id: "grand-stair-landing", x: 17820, y: 250, width: 160,
        baseY: 430, dangerousSide: false, name: "EXIT LANDING" });
    level.addBench({ id: "advanced-bench", x: 18395, groundY: 250, width: 95,
        height: 85, grindable: true, name: "RAMP TO BENCH" });
    level.addLedge({ id: "advanced-ledge", x: 18518.4, groundY: 250, width: 403.2,
        height: 114.2, grindable: false, name: "ADVANCED LEDGE" });
    level.addStairs({ id: "advanced-stairs", x: 19660, topY: 55, steps: 12,
        stepWidth: 400 / 12, stepHeight: 160 / 12, fatal: true, handrail: false,
        safeGrindRailId: "advanced-handrail", name: "ADVANCED STAIRS" });
    level.addPlatform({ id: "advanced-landing-platform", x: 20150, y: 265, width: 100,
        baseY: 308, dangerousSide: true, name: "ADVANCED LANDING" });
    level.addStairs({ id: "final-stairs", x: 21230, topY: 255, steps: 7,
        stepWidth: 48, stepHeight: 12, fatal: true, handrail: false,
        safeGrindRailId: "final-descending", name: "FINAL STAIR RAIL" });
    level.addSupport({ id: "final-stair-foundation", x: 21420, topY: 327,
        bottomY: 510, width: 170 });
    level.addSupport({ id: "fast-transfer-pier", x: 21655, topY: 225,
        bottomY: 510, width: 95 });
    level.addPlatform({ id: "final-platform", x: 22630, y: 235, width: 355,
        baseY: 280, dangerousSide: true, name: "FINAL PLATFORM" });
    level.addBench({ id: "final-bench", x: 23032.2, groundY: 250, width: 345.6,
        height: 32.8, grindable: false, name: "FINAL BENCH" });
    level.addLedge({ id: "final-launch-ledge", x: 23475, groundY: 250, width: 130,
        height: 24, grindable: true, name: "LAUNCH LEDGE" });
    level.addPlatform({ id: "final-landing-platform", x: 25179, y: 250, width: 340,
        baseY: 430, dangerousSide: true, name: "FINAL LANDING" });

    const transferRows = [
        ["first-rail","first-link","super",false],["first-link","transfer-b","super",false],
        ["transfer-b","three-a","super",true],["danger-a","danger-b","hop",true],
        ["danger-b","danger-c","hop",true],
        ["void-a","void-b","hop",true],["void-b","void-c","hop",true],
        ["void-c","void-d","hop",true],["void-d","void-e","super",true],
        ["advanced-ledge-edge","high-rail","super",true],
        ["high-rail","advanced-handrail","hop",true],
        ["final-descending","final-transfer","hop",true],
        ["final-transfer","final-high","super",true],
        ["final-high","final-curved","hop",true]
    ];
    transferRows.forEach(([from,to,jump,required]) => level.addTransfer(from, to, {
        jump, required, exitOffset: 14
    }));
    // Ordinary-ground tricks only. Every ramp setup is held SPACE, derived from
    // its physical approach zone instead of an authored tap/Ollie combination.
    [[395,"normal"],[2245,"ollie"],[4690,"normal"],
        [5150,"ollie"],[5500,"normal"],[5650,"ollie"],[6040,"ollie"],[6610,"ollie"],
        [13280,"normal"],[16570,"grind"],
        [18900,"ollie"],[22955,"normal"],[23410,"normal"],
        [25234,"normal"]].forEach(([x,action]) => level.addPlayInput(x, action));

    level.addCheckpoint(8750, "CHECKPOINT 1", "checkpoint-1");
    level.addCheckpoint(17980, "CHECKPOINT 2", "checkpoint-2");
    level.setFinish(25849, "FINISH", "finish");

    const sectionRows = [
        ["immediate-start","FAST START",150,1600],["first-transfer","FIRST TRANSFER",1600,3100],
        ["three-rail-chain","THREE RAIL CHAIN",3100,4700],["street-objects","STREET OBJECTS",4700,6450],
        ["bench-precision","BENCH PRECISION",6450,7600],["stair-rail","STAIR RAIL",7600,8800],
        ["danger-chain","RISK CHAIN",8800,10500],["huge-ramp-gap","ROOFTOP RAMP FLOW",10500,13900],
        ["five-rail-void","FIVE RAILS · NO FLOOR",13900,16350],
        ["grand-stair-exit","GRAND STAIR · CRITICAL EXIT",16350,17980],
        ["advanced-street","ADVANCED STREET LINE",17980,20130],
        ["downhill-ramp-combo","DOWNHILL RAMP COMBO",20130,21150],
        ["final-gauntlet","FINAL GAUNTLET",21150,25849]
    ];
    const sections = sectionRows.map(([id,name,startX,endX]) => Object.freeze({ id,name,startX,endX }));
    const sectionAt = x => sections.find(section => x >= section.startX && x < section.endX) || null;
    const forwardSpeedAt = x => {
        if (x < 11000) return 230;
        if (x < 12600) return 230 + 55 * (x - 11000) / 1600;
        if (x < 13700) return 285 - 55 * (x - 12600) / 1100;
        if (x >= 17980) return 280;
        const t = Math.min(1, (x - 13700) / 3950);
        return 230 + 50 * t * t * (3 - 2 * t);
    };
    const estimateDurationSeconds = (startX = 150, endX = 25849, step = 5) => {
        let seconds = 0;
        for (let x = startX; x < endX; x += step) seconds += Math.min(step, endX - x) / forwardSpeedAt(x);
        return seconds;
    };

    return level.build({
        id: "official-procedural-skate", name: "THE ONE LINE · PROCEDURAL",
        official: true, isTestCourse: false, isProceduralSandbox: false,
        sections, sectionAt, forwardSpeedAt, estimateDurationSeconds,
        cues: [
            { x: 970, y: 130, baseY: 220, text: "SEGURE SPACE", width: 125 },
            { x: 13900, y: -295, baseY: -170, text: "SEGURE / SOLTE", width: 145 },
            { x: 16450, y: -270, baseY: -170, text: "ESCADARIA", danger: true },
            { x: 17555, y: 105, baseY: 215, text: "SOLTE SPACE", width: 95, danger: true },
            { x: 23420, y: 130, baseY: 250, text: "SEGURE SPACE", width: 125 },
            { x: 25189, y: 180, baseY: 250, text: "ATERRISSE", width: 90 }
        ],
        downhill: Object.freeze({ startX: 13700, endX: 17980, baseSpeed: 230, peakSpeed: 280 })
    });
});
