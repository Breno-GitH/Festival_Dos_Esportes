/* Surf runtime asset registry — manifest-driven, preload-once, no legacy fallbacks. */
(function () {
    'use strict';

    const ROOT = 'surf_assets/';
    const MANIFESTS = {
        zorp: `${ROOT}zorp_surf_manifest.json`,
        world: `${ROOT}assets_surf_manifest.json`,
        beach: 'surf_sprites/surf_sprites_manifest.json'
    };
    const ZORP_CATEGORIES = new Set([
        'glide', 'pump', 'ascend', 'descend', 'crest_skim',
        'takeoff', 'aerial', 'trick', 'reentry', 'landing'
    ]);
    const WORLD_CATEGORIES = new Set(['swimmers', 'surfers', 'sharks', 'seagulls', 'hazards']);

    class SurfAssetRegistry {
        constructor() {
            this.ready = false;
            this.failed = 0;
            this.invalidDrawCalls = 0;
            this.errors = [];
            this.entries = [];
            this.usedFiles = new Set();
            this.byCategory = new Map();
            this.readyPromise = this.load();
        }

        async load() {
            try {
                const [zorpManifest, worldManifest, beachManifest] = await Promise.all([
                    this.fetchManifest(MANIFESTS.zorp),
                    this.fetchManifest(MANIFESTS.world),
                    this.fetchManifest(MANIFESTS.beach)
                ]);
                const zorpEntries = (zorpManifest.frames || []).map(raw => ({
                    ...raw,
                    set: 'zorp',
                    animation: raw.category,
                    characterId: 'zorp',
                    contactAnchorX: raw.surfContactAnchorX,
                    contactAnchorY: raw.surfContactAnchorY,
                    url: ROOT + raw.file
                }));
                const worldEntries = (worldManifest.assets || []).map(raw => ({
                    ...raw,
                    set: 'world',
                    url: ROOT + raw.file
                }));
                const libraryEntries = (beachManifest.frames || [])
                    .filter(raw => raw.category === 'beach' || raw.category === 'score_sign')
                    .map(raw => ({
                        ...raw,
                        set: raw.category,
                        animation: String(raw.state || 'decorative').toLowerCase(),
                        characterId: raw.subtype || 'decor',
                        url: 'surf_sprites/' + raw.file
                    }));
                const candidates = [...zorpEntries, ...worldEntries, ...libraryEntries];
                for (const entry of candidates) {
                    if (!this.validateMetadata(entry)) continue;
                    this.entries.push(entry);
                    if (!this.byCategory.has(entry.category)) this.byCategory.set(entry.category, []);
                    this.byCategory.get(entry.category).push(entry);
                }
                await Promise.all(this.entries.map(entry => this.preload(entry)));
                for (const list of this.byCategory.values()) {
                    list.sort((a, b) => (a.frame || 0) - (b.frame || 0) || a.file.localeCompare(b.file));
                }
                this.ready = this.failed === 0 && this.entries.length === candidates.length;
                // Rendering may already be running while images are still being decoded.
                // Those expected preload misses are not invalid runtime draw calls.
                this.invalidDrawCalls = 0;
                if (new URLSearchParams(location.search).get('surfAssetDebug') === '1') {
                    console.info('[SurfAssets]', this.diagnostics());
                }
            } catch (error) {
                this.failed++;
                this.errors.push(String(error && error.message || error));
                console.error('[SurfAssets] Falha ao carregar os manifests oficiais.', error);
            }
            return this;
        }

        async fetchManifest(url) {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
            return response.json();
        }

        validateMetadata(entry) {
            const categoryValid = entry.set === 'zorp'
                ? ZORP_CATEGORIES.has(entry.category)
                : entry.set === 'beach' || entry.set === 'score_sign'
                    ? entry.category === entry.set
                    : WORLD_CATEGORIES.has(entry.category);
            const widthValid = Number.isFinite(entry.width) && entry.width > 0;
            const heightValid = Number.isFinite(entry.height) && entry.height > 0;
            const anchorX = entry.contactAnchorX ?? entry.anchorX;
            const anchorY = entry.contactAnchorY ?? entry.anchorY;
            const anchorValid = Number.isFinite(anchorX) && Number.isFinite(anchorY) && anchorX >= 0 && anchorX <= entry.width && anchorY >= 0 && anchorY <= entry.height;
            if (categoryValid && widthValid && heightValid && anchorValid && entry.file) return true;
            this.failed++;
            this.errors.push(`Metadados inválidos: ${entry.file || '(sem arquivo)'}`);
            return false;
        }

        preload(entry) {
            return new Promise(resolve => {
                const image = new Image();
                image.decoding = 'async';
                image.onload = () => {
                    if (image.naturalWidth === entry.width && image.naturalHeight === entry.height) entry.image = image;
                    else {
                        this.failed++;
                        this.errors.push(`Dimensão inesperada: ${entry.url} (${image.naturalWidth}x${image.naturalHeight}, esperado ${entry.width}x${entry.height})`);
                    }
                    resolve();
                };
                image.onerror = () => {
                    this.failed++;
                    this.errors.push(`Falha ao carregar: ${entry.url}`);
                    resolve();
                };
                image.src = entry.url;
            });
        }

        sequence(category, options = {}) {
            const list = this.byCategory.get(category) || [];
            return list.filter(entry =>
                (!options.animation || entry.animation === options.animation) &&
                (!options.characterId || entry.characterId === options.characterId)
            );
        }

        zorp(category) {
            return this.sequence(category);
        }

        world(category, characterId, animation) {
            return this.sequence(category, { characterId, animation });
        }

        beach(subtype, animation) {
            return this.sequence('beach', { characterId: subtype, animation });
        }

        scorePlate(kind) {
            return this.sequence('score_sign', { characterId: 'plate', animation: kind })[0] || null;
        }

        scoreDigit(value) {
            const digit = Math.max(0, Math.min(10, Math.round(Number(value) || 0)));
            return this.sequence('score_sign', { characterId: 'digit', animation: `digit_${digit}` })[0] || null;
        }

        pick(category, characterId, animation, frameIndex = 0) {
            const list = this.world(category, characterId, animation);
            return list.length ? list[Math.abs(frameIndex) % list.length] : null;
        }

        draw(context, entry, x, y, width, height) {
            if (!entry || !entry.image || !entry.image.complete || entry.image.naturalWidth <= 0 || entry.image.naturalHeight <= 0 || !Number.isFinite(x + y + width + height) || width <= 0 || height <= 0) {
                this.invalidDrawCalls++;
                return false;
            }
            context.drawImage(entry.image, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
            this.usedFiles.add(entry.file);
            return true;
        }

        drawAtContact(context, entry, x, y, scale = 1) {
            if (!entry) return false;
            const width = entry.width * scale;
            const height = entry.height * scale;
            const anchorX = (entry.contactAnchorX ?? entry.surfContactAnchorX ?? entry.anchorX ?? entry.width / 2) * scale;
            const anchorY = (entry.contactAnchorY ?? entry.surfContactAnchorY ?? entry.anchorY ?? entry.height) * scale;
            return this.draw(context, entry, x - anchorX, y - anchorY, width, height);
        }

        diagnostics() {
            const counts = {};
            for (const [category, list] of this.byCategory) counts[category] = list.length;
            return {
                ready: this.ready,
                total: this.entries.length,
                failed: this.failed,
                invalidDrawCalls: this.invalidDrawCalls,
                used: this.usedFiles.size,
                counts,
                errors: this.errors.slice()
            };
        }
    }

    window.SurfAssetRegistry = SurfAssetRegistry;
    window.surfAssets = new SurfAssetRegistry();
})();
