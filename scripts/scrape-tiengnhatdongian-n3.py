"""Archive the public N3 grammar series as JSON and readable local HTML.

Requires requests and lxml. The series page determines the article list.
Cached per-article JSON makes interrupted runs resumable.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import lxml.html
import requests


SERIES_URL = "https://www.tiengnhatdongian.com/series/tong-hop-ngu-phap-n3/"
ROOT = Path(__file__).resolve().parents[1] / "data" / "tiengnhatdongian-n3"
USER_AGENT = "KotoBase personal N3 study archive/1.0 (+source attribution)"
BLOCKED_CLASSES = {
    "wrap-ads-post", "adsbygoogle", "google-auto-placed", "adsbygoogle-noablate",
    "sharedaddy", "jp-relatedposts", "related-posts", "essb_links",
}
BLOCKED_TAGS = {"script", "style", "noscript", "iframe", "form", "svg", "canvas"}
SKIP_TOP_CLASSES = {"row", "2-block-type"}


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def classes(node) -> set[str]:
    return set((node.get("class") or "").split())


def request(session: requests.Session, url: str) -> requests.Response:
    for attempt in range(4):
        try:
            response = session.get(url, timeout=40)
            if response.status_code in {429, 500, 502, 503, 504}:
                time.sleep(2 ** attempt)
                continue
            response.raise_for_status()
            return response
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Could not fetch {url}")


def clean(node, base_url: str):
    node = copy.deepcopy(node)
    for child in list(node.iter()):
        if child is node:
            continue
        if child.tag in BLOCKED_TAGS or classes(child) & BLOCKED_CLASSES:
            child.drop_tree()
            continue
        if child.get("id") == "slidebox":
            child.drop_tree()
            continue
        for attr in list(child.attrib):
            if attr.lower().startswith("on") or attr in {"srcset", "sizes", "data-srcset"}:
                del child.attrib[attr]
            elif attr.startswith("data-"):
                del child.attrib[attr]
        if child.get("style") and re.search(r"url\s*\(|expression\s*\(|@import", child.get("style"), re.I):
            del child.attrib["style"]
        for attr in ("src", "href", "poster"):
            value = child.get(attr)
            if value and not value.startswith(("#", "mailto:", "tel:")):
                if value.lower().startswith(("javascript:", "data:")):
                    del child.attrib[attr]
                else:
                    child.set(attr, urljoin(base_url, value))
    return node


def content_nodes(entry):
    for child in entry:
        cls = classes(child)
        if cls & SKIP_TOP_CLASSES or "wrap-ads-post" in cls:
            continue
        if child.get("id") == "slidebox":
            continue
        if child.tag not in {"div", "p", "section", "h2", "h3", "h4", "h5", "ul", "ol", "table", "blockquote"}:
            continue
        if not norm(child.text_content()):
            continue
        yield child


def parse_series(html: bytes) -> list[dict]:
    doc = lxml.html.fromstring(html)
    rows = [a for a in doc.iter("a") if "row-np" in classes(a)]
    entries = []
    for row in rows:
        raw_id = row.get("data-id", "")
        if not raw_id.isdigit():
            continue
        title_nodes = [x for x in row.iter("div") if "grammarText" in classes(x)]
        title = norm(title_nodes[0].text_content()) if title_nodes else norm(row.text_content())
        entries.append({
            "number": int(raw_id),
            "title": title,
            "search_title": row.get("data-title", ""),
            "books": (row.get("data-book") or "").split(),
            "url": urljoin(SERIES_URL, row.get("href", "")),
        })
    if not entries or len({x["number"] for x in entries}) != len(entries):
        raise ValueError("Series index is empty or has duplicate numbers")
    return entries


def parse_article(html: bytes, url: str) -> dict:
    doc = lxml.html.fromstring(html)
    articles = [x for x in doc.iter("article") if "post" in classes(x)]
    if not articles:
        raise ValueError(f"Missing article: {url}")
    article = articles[0]
    headings = [x for x in article.iter("h1") if "entry-title" in classes(x)]
    entries = [x for x in article.iter("div") if "entry-content" in classes(x)]
    if not headings or not entries:
        raise ValueError(f"Missing title or content: {url}")
    blocks = []
    for original in content_nodes(entries[0]):
        node = clean(original, url)
        text = norm(node.text_content())
        if not text:
            continue
        card_headings = [x for x in node.iter("h5") if "card-header" in classes(x)]
        blocks.append({
            "kind": "card" if "card" in classes(node) else "content",
            "heading": norm(card_headings[0].text_content()) if card_headings else "",
            "text": text,
            "html": lxml.html.tostring(node, encoding="unicode", method="html", with_tail=False),
        })
    if not blocks:
        raise ValueError(f"No study content: {url}")
    return {
        "title": norm(headings[0].text_content()),
        "url": url,
        "blocks": blocks,
    }


CSS = """
:root{font-family:Arial,'Noto Sans',sans-serif;color:#182333;background:#eef3f8}
*{box-sizing:border-box}body{margin:0}a{color:#1660a9}header.top{background:#fff;border-bottom:1px solid #dce5ed;padding:18px 24px}
header.top a{text-decoration:none;font-weight:700}.wrap{max-width:1120px;margin:24px auto;padding:0 16px}
h1{font-size:1.55rem;line-height:1.5}.meta{color:#62748b;font-size:.9rem;margin:12px 0 24px}
.card,.alert{background:#fff;border:1px solid #d8dfe6;border-radius:3px;margin:18px 0;overflow:hidden;box-shadow:0 1px 3px #18233310}
.card-header{font-size:1rem;font-weight:700;margin:0;padding:9px 13px;background:#f4f5f6;border-bottom:1px solid #d8dfe6}
.card-body{padding:12px 20px;line-height:1.75}.alert{padding:14px 18px}.alert-primary{background:#d0e6ff;border-color:#b4d8ff}
.alert-info{background:#d9effa;border-color:#bde2f5}.border-warning{border-color:#f0bc54}.border-secondary{border-color:#abb9c8}
.card-body .alert{margin:8px 0}.tooltip-content{display:none}.tooltip-item{color:#007473;text-decoration:underline dotted;cursor:help}
.tooltip-np:hover .tooltip-content{display:inline;position:absolute;z-index:2;max-width:260px;padding:8px;background:#fffbea;border:1px solid #e4c874;box-shadow:0 4px 14px #0002;font-size:.85rem}
.tooltip-np{position:relative}.small-text-np{font-size:.78em}ruby rt{font-size:.55em}img{max-width:100%;height:auto}
.nav{display:flex;gap:16px;justify-content:space-between;margin:28px 0}.nav a{padding:9px 14px;border:1px solid #cbd8e5;background:#fff;border-radius:6px;text-decoration:none}
.index{background:#fff;border:1px solid #d8dfe6;border-radius:7px;overflow:hidden}.index a{display:flex;gap:16px;padding:12px 15px;border-bottom:1px solid #e8edf2;text-decoration:none;color:#152235}
.index a:hover{background:#f2f8ff}.index .num{min-width:42px;color:#607993}.index .books{margin-left:auto;color:#577093;font-size:.75rem;white-space:nowrap}
@media(max-width:700px){.wrap{margin:12px auto}.card-body{padding:12px}.index .books{display:none}}
"""


def html_page(entry: dict, article: dict, previous: dict | None, following: dict | None) -> str:
    body = "\n".join(block["html"] for block in article["blocks"])
    nav = '<nav class="nav">'
    nav += f'<a href="{previous["number"]:03d}.html">← Bài trước</a>' if previous else "<span></span>"
    nav += f'<a href="{following["number"]:03d}.html">Bài sau →</a>' if following else "<span></span>"
    nav += "</nav>"
    import html
    return f'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{html.escape(entry['title'])}</title><style>{CSS}</style></head><body><header class="top"><a href="../index.html">← Tổng hợp ngữ pháp N3</a></header><main class="wrap"><h1>{html.escape(article['title'])}</h1><div class="meta">Bài {entry['number']:03d} · Nguồn: <a href="{html.escape(entry['url'], quote=True)}" target="_blank" rel="noopener noreferrer">Tiếng Nhật Đơn Giản</a></div>{body}{nav}</main></body></html>'''


def html_index(entries: list[dict]) -> str:
    import html
    links = "\n".join(f'<a href="pages/{e["number"]:03d}.html"><span class="num">{e["number"]:03d}</span><span>{html.escape(e["title"])}</span><span class="books">{html.escape(" · ".join(e["books"]))}</span></a>' for e in entries)
    return f'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tổng hợp ngữ pháp N3</title><style>{CSS}</style></head><body><header class="top"><a href="{SERIES_URL}">Nguồn: Tiếng Nhật Đơn Giản ↗</a></header><main class="wrap"><h1>Tổng hợp ngữ pháp N3</h1><p class="meta">{len(entries)} mục · Bản lưu phục vụ học tập, giữ nguyên liên kết nguồn ở mỗi bài.</p><div class="index">{links}</div></main></body></html>'''


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Only fetch the first N entries (for parser checks)")
    parser.add_argument("--delay", type=float, default=0.7, help="Minimum delay between page requests")
    args = parser.parse_args()
    ROOT.mkdir(parents=True, exist_ok=True)
    cache = ROOT / "cache"
    page_dir = ROOT / "pages"
    cache.mkdir(exist_ok=True)
    page_dir.mkdir(exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    index_path = cache / "series.html"
    if not index_path.exists():
        index_path.write_bytes(request(session, SERIES_URL).content)
    entries = parse_series(index_path.read_bytes())
    if args.limit:
        entries = entries[:args.limit]
    articles_by_url = {}
    errors = []
    last_request = time.monotonic()
    for position, entry in enumerate(entries, 1):
        url = entry["url"]
        key = hashlib.sha256(url.encode()).hexdigest()[:16]
        path = cache / f"{key}.json"
        try:
            if url not in articles_by_url:
                if path.exists():
                    article = json.loads(path.read_text(encoding="utf-8"))
                else:
                    remaining = args.delay - (time.monotonic() - last_request)
                    if remaining > 0:
                        time.sleep(remaining)
                    response = request(session, url)
                    last_request = time.monotonic()
                    article = parse_article(response.content, url)
                    path.write_text(json.dumps(article, ensure_ascii=False), encoding="utf-8")
                articles_by_url[url] = article
        except (requests.RequestException, ValueError, OSError) as exc:
            errors.append({"number": entry["number"], "url": url, "error": str(exc)})
        if position % 10 == 0 or position == len(entries):
            print(f"Parsed {position}/{len(entries)} entries; errors={len(errors)}", flush=True)
    complete = []
    for i, entry in enumerate(entries):
        article = articles_by_url.get(entry["url"])
        if not article:
            continue
        complete.append({**entry, "article": article})
        previous = entries[i - 1] if i else None
        following = entries[i + 1] if i + 1 < len(entries) else None
        (page_dir / f"{entry['number']:03d}.html").write_text(html_page(entry, article, previous, following), encoding="utf-8")
    manifest = {
        "source": SERIES_URL,
        "scraped_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "listed_entries": len(entries),
        "unique_urls": len({x["url"] for x in entries}),
        "saved_entries": len(complete),
        "errors": errors,
        "entries": complete,
    }
    (ROOT / "n3-full.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "index.html").write_text(html_index(entries), encoding="utf-8")
    print(f"Saved {len(complete)} entries to {ROOT}", flush=True)


if __name__ == "__main__":
    main()
