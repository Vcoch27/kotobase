"""Save article images next to the N3 archive and localize HTML references."""

from __future__ import annotations

import hashlib
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

import lxml.html
import requests


ROOT = Path(__file__).resolve().parents[1] / "data" / "tiengnhatdongian-n3"
MANIFEST = ROOT / "n3-full.json"
ASSETS = ROOT / "assets"


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ASSETS.mkdir(exist_ok=True)
    sources = set()
    for entry in data["entries"]:
        for block in entry["article"]["blocks"]:
            fragment = lxml.html.fragment_fromstring(block["html"], create_parent="div")
            sources.update(img.get("src") for img in fragment.iter("img") if img.get("src"))
    session = requests.Session()
    asset_map = {}
    errors = []
    for source in sorted(sources):
        host = urlparse(source).hostname or ""
        if not (host == "tiengnhatdongian.com" or host.endswith(".tiengnhatdongian.com")):
            continue
        try:
            response = session.get(source, timeout=35)
            response.raise_for_status()
            content_type = response.headers.get("Content-Type", "").split(";", 1)[0]
            if not content_type.startswith("image/") or len(response.content) > 15_000_000:
                raise ValueError(f"Unexpected image response: {content_type}, {len(response.content)} bytes")
            extension = mimetypes.guess_extension(content_type) or Path(urlparse(source).path).suffix or ".bin"
            if extension == ".jpe":
                extension = ".jpg"
            name = hashlib.sha256(source.encode()).hexdigest()[:20] + extension
            target = ASSETS / name
            target.write_bytes(response.content)
            asset_map[source] = f"assets/{name}"
        except (requests.RequestException, ValueError, OSError) as exc:
            errors.append({"url": source, "error": str(exc)})
    for entry in data["entries"]:
        for block in entry["article"]["blocks"]:
            for source, local in asset_map.items():
                block["html"] = block["html"].replace(source, local)
        page = ROOT / "pages" / f"{entry['number']:03d}.html"
        if page.exists():
            content = page.read_text(encoding="utf-8")
            for source, local in asset_map.items():
                content = content.replace(source, f"../{local}")
            page.write_text(content, encoding="utf-8")
    data["asset_map"] = asset_map
    data["asset_errors"] = errors
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(asset_map)}/{len(sources)} images; errors={len(errors)}")


if __name__ == "__main__":
    main()
