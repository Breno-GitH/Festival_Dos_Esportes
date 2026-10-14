const test = require("node:test");
const assert = require("node:assert/strict");
const input = require("./space_input_parser.js");

test("Mega Hold sustenta sem interpretar Ollie ou sequência aérea",()=>{
    const parser=input.createParser();
    parser.keyDown(0,"GROUND");parser.keyUp(40);
    assert.deepEqual(parser.keyDown(120,"MEGA_AIR"),[{type:"MEGA_HOLD",at:120}]);
    assert.deepEqual(parser.update(3400,"MEGA_AIR"),[]);
    assert.deepEqual(parser.keyUp(3500),[{type:"AIR_RELEASE",holdMs:3380}]);
    assert.equal(parser.lastGroundJumpAt,null);
});

test("um Space inicia Normal Jump imediatamente e o segundo Space no ar faz upgrade Ollie", () => {
    const parser = input.createParser();
    assert.deepEqual(parser.keyDown(0, "GROUND"), [{ type: "NORMAL_JUMP", at: 0 }]);
    parser.keyUp(45);
    assert.deepEqual(parser.keyDown(160, "AIR"), [{ type: "OLLIE_UPGRADE", at: 160 }]);
});

test("hold permanece intenção de Grind sem produzir Super Jump", () => {
    const parser = input.createParser();
    parser.keyDown(0, "GROUND");
    const upgrade = parser.update(300, "AIR");
    assert.deepEqual(upgrade, []);
    parser.keyUp(340);
    assert.deepEqual(parser.keyDown(400, "AIR"), [{ type: "AIR_PRESS", at: 400 }]);
});

test("hold não gera impulso; release do Grind é resolvido pela travessia", () => {
    const parser = input.createParser();
    assert.deepEqual(parser.keyDown(100, "GRIND"), [{ type: "GRIND_PRESS", at: 100 }]);
    assert.deepEqual(parser.update(500, "GRIND"), []);
    assert.deepEqual(parser.update(500, "AIR"), []);
    assert.deepEqual(parser.keyUp(520), [{ type: "GRIND_RELEASE", holdMs: 420 }]);
});

test("rail capturável prioriza Grind sobre Ollie e Super Jump no mesmo pressionamento", () => {
    const parser = input.createParser();
    assert.deepEqual(parser.keyDown(0, "GROUND"), [{ type: "NORMAL_JUMP", at: 0 }]);
    parser.keyUp(40);
    assert.deepEqual(parser.keyDown(150, "AIR", { grindCapturable: true, allowSuperHold: true }),
        [{ type: "GRIND_CAPTURE_PRESS", at: 150 }]);
    assert.deepEqual(parser.update(500, "AIR"), []);
    assert.deepEqual(parser.keyUp(520), [{ type: "AIR_RELEASE", holdMs: 370 }]);
    assert.deepEqual(parser.keyDown(550, "AIR"), [{ type: "AIR_PRESS", at: 550 }],
        "the buffered Grind press must not leave a pending ground double tap");
});

test("novo hold aéreo após captura e Jump Out não adiciona energia", () => {
    const parser = input.createParser();
    parser.keyDown(0, "GROUND");
    assert.deepEqual(parser.update(300, "AIR"), []);
    parser.keyUp(340);
    assert.equal(parser.keyDown(500, "AIR", { grindCapturable: true })[0].type,
        "GRIND_CAPTURE_PRESS");
    parser.keyUp(530);
    assert.equal(parser.keyDown(600, "GRIND")[0].type, "GRIND_PRESS");
    parser.keyUp(640);
    assert.equal(parser.keyDown(700, "AIR", { allowSuperHold: true })[0].type, "AIR_PRESS");
    assert.deepEqual(parser.update(1000, "AIR"), []);
});
