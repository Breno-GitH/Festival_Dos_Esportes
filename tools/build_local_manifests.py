"""Gera o transporte JS dos manifestos originais para abertura direta por file://."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
paths = [
    'basketball_assets/exported/basketball_assets_manifest.json',
    'surf_assets/zorp_surf_manifest.json',
    'surf_assets/assets_surf_manifest.json',
    'surf_sprites/surf_sprites_manifest.json',
]
payload = {name: json.loads((root / name).read_text(encoding='utf-8-sig')) for name in paths}
hashes = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in paths}
header = '/* Gerado de JSONs oficiais por tools/build_local_manifests.py. Não editar à mão.\n' + json.dumps(hashes) + '\n*/\n'
(root / 'local_asset_manifests.js').write_text(
    header + 'window.FESTIVAL_LOCAL_MANIFESTS = Object.freeze(' +
    json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ');\n', encoding='utf-8')
print('Manifestos locais gerados:', len(paths))
