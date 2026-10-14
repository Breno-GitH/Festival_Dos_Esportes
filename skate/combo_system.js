(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateCombo = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
    const SETTINGS = Object.freeze({
        bankWindowMs: 450,
        grindPointsPerWorldUnit: 0.8,
        multiplierStepSequence: 0.10,
        multiplierStepVariety: 0.25,
        multiplierStepGrind: 0.25,
        multiplierStepTransfer: 0.25,
        multiplierStepClean: 0.10,
        maxMultiplier: 5,
        contextBonuses: Object.freeze({ highRail: 140, benchTrick: 120, specialAir: 300 })
    });

    function createController() {
        const controller = {
            active: false,
            activeScore: 0,
            bankedScore: 0,
            multiplier: 1,
            bankTimerMs: 0,
            lastAction: "",
            actionCount: 0,
            trickTypes: new Set(),
            reset() {
                this.active = false;
                this.activeScore = 0;
                this.bankedScore = 0;
                this.multiplier = 1;
                this.bankTimerMs = 0;
                this.lastAction = "";
                this.actionCount = 0;
                this.trickTypes = new Set();
                return this;
            },
            raiseMultiplier(amount) {
                this.multiplier = Math.min(SETTINGS.maxMultiplier, this.multiplier + amount);
            },
            beginAction(type) {
                this.active = true;
                this.bankTimerMs = 0;
                if (this.actionCount > 0 && this.lastAction !== type) {
                    this.raiseMultiplier(SETTINGS.multiplierStepSequence);
                }
                this.lastAction = type;
                this.actionCount++;
            },
            registerTrick(result) {
                if (!result || result.status !== "COMPLETED") return 0;
                const newType = !this.trickTypes.has(result.trick);
                if (this.trickTypes.size > 0 && newType) {
                    this.raiseMultiplier(SETTINGS.multiplierStepVariety);
                }
                this.beginAction("trick");
                this.raiseMultiplier(SETTINGS.multiplierStepClean);
                this.trickTypes.add(result.trick);
                const points = Math.floor(result.score * this.multiplier);
                this.activeScore += points;
                return points;
            },
            beginGrind() {
                this.beginAction("grind");
                this.raiseMultiplier(SETTINGS.multiplierStepGrind);
            },
            addGrindDistance(distance) {
                const units = Math.max(0, Number(distance) || 0);
                if (!units) return 0;
                this.active = true;
                const points = units * SETTINGS.grindPointsPerWorldUnit * this.multiplier;
                this.activeScore += points;
                this.lastAction = "grind";
                return points;
            },
            enterManual() {
                if (!this.active) return;
                const previous = this.lastAction;
                this.beginAction("manual");
                if (["grind", "trick"].includes(previous)) {
                    this.raiseMultiplier(SETTINGS.multiplierStepTransfer);
                }
            },
            registerOllie(from = "ground") {
                if (!this.active) return;
                const previous = this.lastAction;
                this.beginAction("ollie");
                if (from === "manual" || from === "grind" || previous === "manual" || previous === "grind") {
                    this.raiseMultiplier(SETTINGS.multiplierStepTransfer);
                }
            },
            registerContextBonus(kind) {
                const points = SETTINGS.contextBonuses[kind];
                if (!Number.isFinite(points)) return 0;
                this.beginAction(kind);
                this.raiseMultiplier(SETTINGS.multiplierStepClean);
                const awarded = Math.floor(points * this.multiplier);
                this.activeScore += awarded;
                return awarded;
            },
            startBankWindow() {
                if (!this.active || this.activeScore <= 0) return false;
                this.bankTimerMs = SETTINGS.bankWindowMs;
                return true;
            },
            cancelBankWindow() {
                this.bankTimerMs = 0;
            },
            bank() {
                if (!this.active || this.activeScore <= 0) return 0;
                const points = Math.floor(this.activeScore);
                this.bankedScore += points;
                this.activeScore = 0;
                this.active = false;
                this.multiplier = 1;
                this.bankTimerMs = 0;
                this.lastAction = "";
                this.actionCount = 0;
                this.trickTypes = new Set();
                return points;
            },
            breakCombo() {
                const lost = Math.floor(this.activeScore);
                this.active = false;
                this.activeScore = 0;
                this.multiplier = 1;
                this.bankTimerMs = 0;
                this.lastAction = "";
                this.actionCount = 0;
                this.trickTypes = new Set();
                return lost;
            },
            update(dtSeconds) {
                if (this.bankTimerMs <= 0) return 0;
                this.bankTimerMs = Math.max(0, this.bankTimerMs - Math.max(0, dtSeconds * 1000));
                return this.bankTimerMs === 0 ? this.bank() : 0;
            },
            snapshot() {
                return {
                    active: this.active,
                    activeScore: Math.floor(this.activeScore),
                    bankedScore: this.bankedScore,
                    totalScore: this.bankedScore + Math.floor(this.activeScore),
                    multiplier: Number(this.multiplier.toFixed(2)),
                    bankTimerMs: Math.ceil(this.bankTimerMs)
                };
            }
        };
        return controller.reset();
    }

    return Object.freeze({ SETTINGS, createController });
});
