const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== OVERWORLD VERIFICATION SUITE ===\n');

const currentCode = fs.readFileSync('script.js', 'utf8');
const headCode = execSync('git show HEAD:script.js', { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');

// 1. VERIFY FROZEN ISLANDS UNTOUCHED
console.log('--- 1. Testing Frozen Islands Integrity ---');
const frozenIslands = [
    { name: 'ILHA_ARCO', drawFn: 'drawIlhaArco' },
    { name: 'ILHA_ESQUI', drawFn: 'drawIlhaEsqui' },
    { name: 'ILHA_SURF', drawFn: 'drawIlhaSurf' },
    { name: 'ILHA_BASQUETE', drawFn: 'drawIlhaBasquete' }
];

let allFrozenPassed = true;

for (const { name, drawFn } of frozenIslands) {
    // Check draw function
    const curFn = currentCode.match(new RegExp('function ' + drawFn + '\\s*\\([\\s\\S]*?\\n(?=function )'));
    const headFn = headCode.match(new RegExp('function ' + drawFn + '\\s*\\([\\s\\S]*?\\n(?=function )'));
    if (!curFn || !headFn) {
        console.error(`[FAIL] Could not extract ${drawFn}`);
        allFrozenPassed = false;
        continue;
    }
    const fnMatch = curFn[0].trim() === headFn[0].trim();
    if (!fnMatch) {
        console.error(`[FAIL] ${drawFn} differs from HEAD!`);
        allFrozenPassed = false;
    } else {
        console.log(`[PASS] ${name} render function (${drawFn}): UNCHANGED`);
    }

    // Check obstacles
    const curObs = (currentCode.match(new RegExp(name + ':\\s*\\[([\\s\\S]*?)\\](?=,|\\n\\s*\\})')) || [])[1];
    const headObs = (headCode.match(new RegExp(name + ':\\s*\\[([\\s\\S]*?)\\](?=,|\\n\\s*\\})')) || [])[1];
    if (curObs && headObs) {
        const obsMatch = curObs.replace(/\s+/g, ' ').trim() === headObs.replace(/\s+/g, ' ').trim();
        if (!obsMatch) {
            console.error(`[FAIL] ${name} obstacles differ from HEAD!`);
            allFrozenPassed = false;
        } else {
            console.log(`[PASS] ${name} sceneObstacles: UNCHANGED`);
        }
    }

    // Check npcs
    const npcRegex = new RegExp('\\{[^\\}]*scene:\\s*[\'\"]' + name + '[\'\"][^\\}]*\\}', 'g');
    const curNpcs = (currentCode.match(npcRegex) || []).map(s => s.replace(/\s+/g, ' ').trim()).sort();
    const headNpcs = (headCode.match(npcRegex) || []).map(s => s.replace(/\s+/g, ' ').trim()).sort();
    const npcsMatch = JSON.stringify(curNpcs) === JSON.stringify(headNpcs);
    if (!npcsMatch) {
        console.error(`[FAIL] ${name} npcs differ from HEAD!`);
        allFrozenPassed = false;
    } else {
        console.log(`[PASS] ${name} NPCs: UNCHANGED`);
    }
}

if (!allFrozenPassed) {
    console.error('\nERROR: One or more frozen islands were modified!');
    process.exit(1);
}

console.log('\n--- 2. Testing Target Islands Navigation & Reachability ---');

// Extract sceneObstacles object from script.js
const obsMatch = currentCode.match(/const sceneObstacles = (\{[\s\S]*?\n\};)/);
if (!obsMatch) {
    console.error('[FAIL] Could not extract sceneObstacles');
    process.exit(1);
}
const sceneObstacles = eval('(' + obsMatch[1].replace(/;\s*$/, '') + ')');

// Extract npcs array from script.js
const npcsMatch = currentCode.match(/const npcs = (\[[\s\S]*?\n\];)/);
if (!npcsMatch) {
    console.error('[FAIL] Could not extract npcs');
    process.exit(1);
}
// Strip Image references for eval
const BASKETBALL_SCENE = "JOGO_BASQUETE";
const SURF_SCENE = "JOGO_SURF";
const cleanNpcsStr = npcsMatch[1].replace(/img:\s*[^,\n\}]+/g, 'img: null').replace(/;\s*$/, '');
const npcs = eval(cleanNpcsStr);

function checkCollision(x, y, w, h, obstacles) {
    for (const obs of obstacles) {
        if (!obs.solid) continue;
        if (x < obs.x + obs.w && x + w > obs.x && y < obs.y + obs.h && y + h > obs.y) {
            return true;
        }
    }
    return false;
}

function checkNpcInteraction(px, py, pw, ph, npc) {
    const interactionBox = {
        x: npc.x - 20,
        y: npc.y - 20,
        w: (npc.tamanho || 48) + 40,
        h: (npc.tamanho || 48) + 40
    };
    return (px < interactionBox.x + interactionBox.w &&
            px + pw > interactionBox.x &&
            py < interactionBox.y + interactionBox.h &&
            py + ph > interactionBox.y);
}

// Simple BFS grid pathfinding for player (32x32) on 450x300 canvas
function canReach(startX, startY, targetNpc, obstacles) {
    const pw = 32, ph = 32;
    const step = 8;
    const visited = new Set();
    const queue = [[startX, startY]];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
        const [x, y] = queue.shift();

        if (checkNpcInteraction(x, y, pw, ph, targetNpc)) {
            return true;
        }

        const neighbors = [
            [x + step, y],
            [x - step, y],
            [x, y + step],
            [x, y - step]
        ];

        for (const [nx, ny] of neighbors) {
            if (nx < 10 || nx > 450 - pw - 10 || ny < 10 || ny > 300 - ph - 10) continue;
            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (!checkCollision(nx, ny, pw, ph, obstacles)) {
                queue.push([nx, ny]);
            }
        }
    }
    return false;
}

const targetIslands = [
    {
        name: 'ILHA_PINGPONG',
        entrances: [{ name: 'West (from HUB)', x: 30, y: 145 }, { name: 'North (from Surf)', x: 225, y: 35 }]
    },
    {
        name: 'ILHA_CORRIDA',
        entrances: [{ name: 'East (from Skate)', x: 410, y: 145 }]
    },
    {
        name: 'ILHA_SKATE',
        entrances: [
            { name: 'North (from HUB)', x: 225, y: 35 },
            { name: 'West (from Corrida)', x: 30, y: 145 },
            { name: 'East (from Basquete)', x: 410, y: 145 }
        ]
    },
    {
        name: 'ILHA_ESCALADA',
        entrances: [{ name: 'South (from Arco)', x: 225, y: 260 }]
    }
];

let allTargetsReachable = true;

for (const target of targetIslands) {
    console.log(`\nValidating ${target.name}:`);
    const islandNpcs = npcs.filter(n => n.scene === target.name);
    const obstacles = sceneObstacles[target.name] || [];

    const mestre = islandNpcs.find(n => n.isMaster);
    if (!mestre) {
        console.error(`[FAIL] No Master NPC found on ${target.name}!`);
        allTargetsReachable = false;
        continue;
    }
    console.log(`- Master NPC found at (${mestre.x}, ${mestre.y}) -> minigame: ${mestre.isMaster}`);

    for (const entrance of target.entrances) {
        const canReachMaster = canReach(entrance.x, entrance.y, mestre, obstacles);
        if (canReachMaster) {
            console.log(`  [PASS] Path from entrance '${entrance.name}' (${entrance.x}, ${entrance.y}) -> Master: CLEAR & INTERACTABLE`);
        } else {
            console.error(`  [FAIL] Master is BLOCKED from entrance '${entrance.name}' (${entrance.x}, ${entrance.y})!`);
            allTargetsReachable = false;
        }

        // Test apprentices if present
        const apprentices = islandNpcs.filter(n => !n.isMaster);
        for (const app of apprentices) {
            const canReachApp = canReach(entrance.x, entrance.y, app, obstacles);
            if (canReachApp) {
                console.log(`  [PASS] Path from entrance '${entrance.name}' -> NPC at (${app.x}, ${app.y}): CLEAR`);
            } else {
                console.error(`  [FAIL] NPC at (${app.x}, ${app.y}) is BLOCKED from entrance '${entrance.name}'!`);
                allTargetsReachable = false;
            }
        }
    }
}

if (!allTargetsReachable) {
    console.error('\nERROR: Navigation test failed!');
    process.exit(1);
}

console.log('\n--- 3. Verifying Obstacle Solidity & Rendering ---');
// Verify that decorative colliders do not show default pink/placeholder boxes
const drawSceneObsFn = currentCode.match(/function drawSceneObstacles\(\)\s*\{([\s\S]*?)\n\}/)[1];
const filteredTypes = ['surf_island_decor', 'archery_island_decor', 'pingpong_table', 'pingpong_bucket', 'skate_quarter', 'podium'];
for (const t of filteredTypes) {
    if (drawSceneObsFn.includes(t)) {
        console.log(`[PASS] Collider type '${t}' is properly filtered from placeholder draw in drawSceneObstacles()`);
    } else {
        console.error(`[FAIL] Collider type '${t}' is NOT filtered in drawSceneObstacles()`);
        process.exit(1);
    }
}

console.log('\n=== ALL TESTS PASSED! OVERWORLD SUITE SUCCESSFUL ===');
