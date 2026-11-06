(function () {
    "use strict";

    const DEADZONE = 0.30;

    /*
        CONTROLE SNES

        B / baixo    -> SPACE + E
        A / direita  -> K
        Y / esquerda -> J
        X / cima     -> L

        L -> SHIFT
        R -> R

        SELECT -> B
        START  -> ESC

        D-PAD -> WASD
    */

    const BUTTONS = {
        B: 0,
        A: 1,
        Y: 2,
        X: 3,

        L: 4,
        R: 5,

        SELECT: 8,
        START: 9,

        DPAD_UP: 12,
        DPAD_DOWN: 13,
        DPAD_LEFT: 14,
        DPAD_RIGHT: 15
    };

    let previousKeys = new Set();
    let currentPad = null;

    function getPad() {
        if (!navigator.getGamepads) {
            return null;
        }

        const pads = navigator.getGamepads();

        for (const pad of pads) {
            if (pad && pad.connected) {
                return pad;
            }
        }

        return null;
    }

    function isPressed(pad, index) {
        if (
            index === undefined ||
            !pad.buttons ||
            !pad.buttons[index]
        ) {
            return false;
        }

        const button = pad.buttons[index];

        return (
            button.pressed === true ||
            button.value > 0.5
        );
    }

    function keyboardCode(key) {
        const codes = {
            " ": "Space",

            "e": "KeyE",
            "j": "KeyJ",
            "k": "KeyK",
            "l": "KeyL",
            "r": "KeyR",
            "b": "KeyB",

            "w": "KeyW",
            "a": "KeyA",
            "s": "KeyS",
            "d": "KeyD",

            "Shift": "ShiftLeft",
            "Escape": "Escape"
        };

        return codes[key] || "";
    }

    function dispatch(type, key) {
        const event = new KeyboardEvent(type, {
            key: key,
            code: keyboardCode(key),
            bubbles: true,
            cancelable: true
        });

        window.dispatchEvent(event);
    }

    function buildCurrentKeys(pad) {
        const keys = new Set();

        // ============================
        // BOTÕES FRONTAIS
        // ============================

        // B - botão inferior
        if (isPressed(pad, BUTTONS.B)) {
            keys.add(" ");
            keys.add("e");
        }

        // A - botão direito
        if (isPressed(pad, BUTTONS.A)) {
            keys.add("k");
        }

        // Y - botão esquerdo
        if (isPressed(pad, BUTTONS.Y)) {
            keys.add("j");
        }

        // X - botão superior
        if (isPressed(pad, BUTTONS.X)) {
            keys.add("l");
        }

        // ============================
        // BOTÕES SUPERIORES
        // ============================

        if (isPressed(pad, BUTTONS.L)) {
            keys.add("Shift");
        }

        if (isPressed(pad, BUTTONS.R)) {
            keys.add("r");
        }

        // ============================
        // SELECT / START
        // ============================

        if (isPressed(pad, BUTTONS.SELECT)) {
            keys.add("b");
        }

        if (isPressed(pad, BUTTONS.START)) {
            keys.add("Escape");
        }

        // ============================
        // D-PAD
        // ============================

        let up = isPressed(pad, BUTTONS.DPAD_UP);
        let down = isPressed(pad, BUTTONS.DPAD_DOWN);
        let left = isPressed(pad, BUTTONS.DPAD_LEFT);
        let right = isPressed(pad, BUTTONS.DPAD_RIGHT);

        /*
            Muitos controles USB antigos usam AXES
            em vez dos botões 12-15.
        */

        if (pad.axes && pad.axes.length >= 2) {
            const axisX = pad.axes[0] || 0;
            const axisY = pad.axes[1] || 0;

            if (axisX < -DEADZONE) {
                left = true;
            }

            if (axisX > DEADZONE) {
                right = true;
            }

            if (axisY < -DEADZONE) {
                up = true;
            }

            if (axisY > DEADZONE) {
                down = true;
            }
        }

        if (up) keys.add("w");
        if (down) keys.add("s");
        if (left) keys.add("a");
        if (right) keys.add("d");

        return keys;
    }

    function updateKeyboard(currentKeys) {

        // KEYDOWN
        for (const key of currentKeys) {
            if (!previousKeys.has(key)) {
                dispatch("keydown", key);
            }
        }

        // KEYUP
        for (const key of previousKeys) {
            if (!currentKeys.has(key)) {
                dispatch("keyup", key);
            }
        }

        previousKeys = currentKeys;
    }

    function releaseEverything() {
        for (const key of previousKeys) {
            dispatch("keyup", key);
        }

        previousKeys.clear();
    }

    function loop() {
        const pad = getPad();

        if (pad) {

            if (
                !currentPad ||
                currentPad.index !== pad.index
            ) {
                currentPad = pad;

                console.log(
                    "[GAMEPAD] Controle:",
                    pad.id
                );

                console.log(
                    "[GAMEPAD] Mapping:",
                    pad.mapping
                );

                console.log(
                    "[GAMEPAD] Buttons:",
                    pad.buttons.length
                );

                console.log(
                    "[GAMEPAD] Axes:",
                    pad.axes.length
                );
            }

            const currentKeys =
                buildCurrentKeys(pad);

            updateKeyboard(currentKeys);

        } else {

            if (currentPad) {
                console.log(
                    "[GAMEPAD] Controle desconectado"
                );

                releaseEverything();

                currentPad = null;
            }
        }

        requestAnimationFrame(loop);
    }

    // ================================
    // DEBUG
    // ================================

    window.GamepadKeyboard = {

        debug: function () {

            const pad = getPad();

            if (!pad) {
                console.log(
                    "Nenhum controle detectado."
                );

                return;
            }

            console.log(
                "========== GAMEPAD =========="
            );

            console.log(
                "ID:",
                pad.id
            );

            console.log(
                "Mapping:",
                pad.mapping
            );

            console.log(
                "Buttons:",
                pad.buttons.length
            );

            console.log(
                "Axes:",
                [...pad.axes]
            );

            pad.buttons.forEach(
                (button, index) => {

                    if (
                        button.pressed ||
                        button.value > 0.5
                    ) {

                        console.log(
                            "BOTÃO PRESSIONADO:",
                            index
                        );
                    }
                }
            );
        },

        buttons: BUTTONS
    };

    window.addEventListener(
        "gamepaddisconnected",
        function () {
            releaseEverything();
        }
    );

    console.log(
        "[GAMEPAD] Sistema SNES carregado."
    );

    requestAnimationFrame(loop);

})();
