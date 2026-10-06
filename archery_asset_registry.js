(function () {
    "use strict";

    const manifest = window.ARCHERY_ASSET_MANIFEST;
    if (!manifest || !Array.isArray(manifest.frames)) {
        console.error("ArcheryAssetRegistry: manifest ausente ou invalido.");
        return;
    }

    const CHARACTER_STATES = new Set([
        "IDLE_BACK",
        "WALK_DOWN_BACK",
        "RAISE_BOW_BACK",
        "DRAW_BOWSTRING_BACK",
        "RELEASE_SHOT_BACK",
        "RECOVERY_BACK",
        "MISS_REACTION_BACK",
        "VICTORY_BACK"
    ]);
    const TARGET_SUBTYPES = new Set(["small", "medium", "large", "golden", "side_moving", "popup"]);
    const ARROW_SUBTYPES = new Set([
        "arrow_up", "arrow_up_left", "arrow_up_right",
        "arrow_fast_up", "arrow_fast_up_left", "arrow_fast_up_right"
    ]);
    const EFFECT_SUBTYPES = new Set(["arrow_impact", "bullseye", "score_hit"]);
    const PROP_SUBTYPES = new Set(["wind_flag", "lane_marker", "hay_bale", "target_stand"]);

    class ArcheryAssetRegistry {
        constructor(assetManifest) {
            this.manifest = assetManifest;
            this.basePath = "archery_assets/";
            this.groups = new Map();
            this.images = new Map();
            this.loaded = 0;
            this.failed = 0;
            this.invalidDrawCalls = 0;
            this.runtimeFrames = assetManifest.frames.filter((entry) => this.isRuntimeEntry(entry));

            for (const entry of assetManifest.frames) {
                const key = this.groupKey(entry.category, entry.subtype, entry.state);
                if (!this.groups.has(key)) this.groups.set(key, []);
                this.groups.get(key).push(entry);
            }
            for (const frames of this.groups.values()) {
                frames.sort((a, b) => a.frame - b.frame || a.file.localeCompare(b.file));
            }

            this.ready = Promise.all(this.runtimeFrames.map((entry) => this.load(entry))).then(() => this.failed === 0);
        }

        groupKey(category, subtype, state) {
            return `${category}:${subtype}:${state || "*"}`;
        }

        isRuntimeEntry(entry) {
            if (entry.category === "arena") return true;
            if (entry.category === "character") return CHARACTER_STATES.has(entry.state);
            if (entry.category === "target") return TARGET_SUBTYPES.has(entry.subtype);
            if (entry.category === "arrow") return ARROW_SUBTYPES.has(entry.subtype);
            if (entry.category === "effect") return EFFECT_SUBTYPES.has(entry.subtype);
            if (entry.category === "prop") return PROP_SUBTYPES.has(entry.subtype);
            return false;
        }

        load(entry) {
            return new Promise((resolve) => {
                const image = new Image();
                this.images.set(entry.file, image);
                image.addEventListener("load", () => {
                    if (image.naturalWidth > 0 && image.naturalHeight > 0) this.loaded++;
                    else this.failed++;
                    resolve();
                }, { once: true });
                image.addEventListener("error", () => {
                    this.failed++;
                    resolve();
                }, { once: true });
                image.src = this.basePath + entry.file;
            });
        }

        frames(category, subtype, state) {
            return this.groups.get(this.groupKey(category, subtype, state)) || [];
        }

        frame(category, subtype, state, frameIndex = 0) {
            const frames = this.frames(category, subtype, state);
            if (!frames.length) return null;
            const index = ((Math.floor(frameIndex) % frames.length) + frames.length) % frames.length;
            return frames[index];
        }

        drawable(entry) {
            const image = entry ? this.images.get(entry.file) : null;
            if (!entry || !image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null;
            return image;
        }

        draw(ctx, category, subtype, state, frameIndex, x, y, width, height, anchorMode = "manifest") {
            const entry = this.frame(category, subtype, state, frameIndex);
            const image = this.drawable(entry);
            if (!Number.isFinite(x + y + width + height) || width <= 0 || height <= 0) {
                this.invalidDrawCalls++;
                return false;
            }
            if (!image) return false;
            let dx = x - width / 2;
            let dy = y - height / 2;
            if (anchorMode === "manifest") {
                dx = x - (entry.anchorX / entry.width) * width;
                dy = y - (entry.anchorY / entry.height) * height;
            }
            ctx.drawImage(image, Math.round(dx), Math.round(dy), Math.round(width), Math.round(height));
            return true;
        }

        drawCover(ctx, x, y, width, height) {
            const entry = this.frame("arena", "background", "FULL", 0);
            const image = this.drawable(entry);
            if (width <= 0 || height <= 0) {
                this.invalidDrawCalls++;
                return false;
            }
            if (!image) return false;
            const sourceRatio = image.naturalWidth / image.naturalHeight;
            const targetRatio = width / height;
            let sx = 0;
            let sy = 0;
            let sw = image.naturalWidth;
            let sh = image.naturalHeight;
            if (sourceRatio > targetRatio) {
                sw = image.naturalHeight * targetRatio;
                sx = (image.naturalWidth - sw) / 2;
            } else {
                sh = image.naturalWidth / targetRatio;
                sy = (image.naturalHeight - sh) / 2;
            }
            ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
            return true;
        }

        diagnostics() {
            return {
                assetSet: this.manifest.assetSet,
                manifestFrames: this.manifest.frames.length,
                runtimeFrames: this.runtimeFrames.length,
                loaded: this.loaded,
                failed: this.failed,
                ready: this.loaded + this.failed === this.runtimeFrames.length && this.failed === 0,
                invalidDrawCalls: this.invalidDrawCalls
            };
        }
    }

    window.ArcheryAssetRegistry = ArcheryAssetRegistry;
    window.archeryAssets = new ArcheryAssetRegistry(manifest);
})();
