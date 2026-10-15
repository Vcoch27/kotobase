"""Normalize the two existing N3 grammar sources without losing their originals.

Usage: python -X utf8 scripts/normalize-grammar-data.py
Reads the ignored Firestore backup and the checked-in TNDG summary/detail files.
Writes a preview under tmp/; --apply-local replaces only the checked-in summary.
Firestore writes are intentionally handled by apply-grammar-normalization.cjs.
"""
import argparse
import collections
import copy
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_PATH = ROOT / "data/tiengnhatdongian-n3-summary.json"
DETAIL_PATH = ROOT / "data/tiengnhatdongian-n3-parsed.json"
NORMALIZED_DETAIL_PATH = ROOT / "data/tiengnhatdongian-n3-detail-normalized.json"
BACKUP_PATH = ROOT / "tmp/grammar-firestore-backup-2026-10-15.json"
PREVIEW_PATH = ROOT / "tmp/grammar-normalization-preview.json"
KANJI_KANA = re.compile(r"([一-龯々]+)([ぁ-ゖー]+)")
VIETNAMESE = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]")
JAPANESE_SENTENCE = re.compile(r"[ぁ-ゖァ-ヿ一-龯々][^。！？\n]{0,250}[。！？]")
CURATED = {
    "形": ["けい"], "表": ["あらわ"], "動": ["どう"], "動詞": ["どうし"],
    "文": ["ぶん"], "名": ["めい", "な"], "話者": ["わしゃ"], "世": ["よ"],
    "例": ["れい"], "意向": ["いこう"], "硬": ["かた"], "主語": ["しゅご"],
    "助詞": ["じょし"], "辞書形": ["じしょけい"], "心理的": ["しんりてき"],
    "主観的": ["しゅかんてき"], "継続的": ["けいぞくてき"], "否定": ["ひてい"],
    "強調": ["きょうちょう"], "自然環境": ["しぜんかんきょう"],
    "日本語能力試験": ["にほんごのうりょくしけん"], "徹底的": ["てっていてき"],
    "重大": ["じゅうだい"], "現地": ["げんち"], "本日": ["ほんじつ"],
    "都会": ["とかい"], "四季": ["しき"], "長年": ["ながねん"],
    "見直": ["みなお"], "確信": ["かくしん"],
    "明": ["あか"], "示": ["しめ"], "留守番": ["るすばん"],
    "意志的": ["いしてき"], "例外": ["れいがい"], "立札": ["たてふだ"],
    "極端": ["きょくたん"], "動作": ["どうさ"], "適切": ["てきせつ"],
    "主": ["おも"], "毎回": ["まいかい"], "状況": ["じょうきょう"],
    "毎年": ["まいとし"], "過去形": ["かこけい"], "一定": ["いってい"],
    "大体": ["だいたい"], "客観的": ["きゃっかんてき"],
    "意外感": ["いがいかん"], "意志": ["いし"],
}
SOURCE_EXAMPLE_OVERRIDES = {
    "tndg-103": [{"jpn": "彼かれみたいな強つよい人ひとが好すきです。", "vie": "Tôi thích những người mạnh mẽ như anh ấy."}],
    "tndg-230": [{"jpn": "先生せんせいは私わたしをほめました。", "vie": "Cô giáo đã khen tôi."}, {"jpn": "私わたしは先生せんせいにほめられました。", "vie": "Tôi đã được cô giáo khen."}],
    "tndg-272": [{"jpn": "私わたしは将来しょうらい、医者いしゃになる。", "vie": "Sau này tôi sẽ trở thành bác sĩ."}],
    "tndg-274": [{"jpn": "私わたしは両親りょうしんにアメリカに留学りゅうがくさせられた。", "vie": "Tôi bị bố mẹ bắt đi du học ở Mỹ."}],
    "tndg-279": [{"jpn": "そのセーターいいですね。よく似合にあっていますよ。", "vie": "Cái áo len ấy đẹp nhỉ. Hợp lắm đấy!"}],
}


class RubyCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_ruby = False
        self.in_rt = False
        self.base = ""
        self.reading = ""
        self.pairs = []

    def handle_starttag(self, tag, attrs):
        if tag == "ruby":
            self.in_ruby, self.base, self.reading = True, "", ""
        elif tag == "rt" and self.in_ruby:
            self.in_rt = True

    def handle_endtag(self, tag):
        if tag == "rt":
            self.in_rt = False
        elif tag == "ruby" and self.in_ruby:
            if re.fullmatch(r"[一-龯々]+", self.base) and re.fullmatch(r"[ぁ-ゖー]+", self.reading):
                self.pairs.append((self.base, self.reading))
            self.in_ruby = False

    def handle_data(self, data):
        if self.in_ruby:
            if self.in_rt:
                self.reading += data
            else:
                self.base += data


def reading_dictionary(detail_items):
    result = collections.defaultdict(collections.Counter)
    for item in detail_items:
        for block in item.get("articleBlocks", []):
            collector = RubyCollector()
            collector.feed(block.get("html", ""))
            for base, reading in collector.pairs:
                if len(reading) <= 12:
                    result[base][reading] += 1
    for base, variants in CURATED.items():
        for reading in variants:
            result[base][reading] += 20
    return result


def normalize_text(value, dictionary):
    if not isinstance(value, str):
        return value, None
    source = value.replace("\r\n", "\n").replace("\r", "\n").replace("\u00a0", " ")
    source = re.sub(r"([［\[])([一-龯々]+)[］\]][「]([ぁ-ゖ]+)[」]", r"\1\2\3］", source)
    source = re.sub(r"[ \t]+", " ", source).strip()
    plain, ruby = [], []
    cursor = 0
    for match in KANJI_KANA.finditer(source):
        base, tail = match.groups()
        candidates = [(reading, count) for reading, count in dictionary.get(base, {}).items() if tail.startswith(reading)]
        if not candidates:
            continue
        # Prefer readings supported by repeated source ruby; avoid long malformed ruby readings.
        reading = max(candidates, key=lambda pair: (pair[1], -len(pair[0])))[0]
        prefix = source[cursor:match.start()]
        residue = tail[len(reading):]
        plain.extend((prefix, base, residue))
        ruby.extend((prefix, "{" + base + "|" + reading + "}", residue))
        cursor = match.end()
    plain.append(source[cursor:])
    ruby.append(source[cursor:])
    clean = "".join(plain)
    rich = "".join(ruby)
    if re.sub(r"\{([^{}|]+)\|[^{}]+\}", r"\1", rich) != clean:
        raise ValueError("Ruby/plain mismatch")
    return clean, rich if rich != clean else None


def normalize_example(example, dictionary, local):
    source = example.get("jpn", "")
    translation = example.get("vie", "")
    if local and VIETNAMESE.search(source):
        candidates = [s.group().strip() for s in JAPANESE_SENTENCE.finditer(source) if not VIETNAMESE.search(s.group())]
        if not candidates:
            return None
        source = max(candidates, key=len)
        # The imported translation often repeats the lesson meaning; prefer the sentence translation if present.
        suffix = example.get("jpn", "").split(source, 1)[-1].strip()
        if suffix and VIETNAMESE.search(suffix) and len(suffix) < 250:
            translation = suffix
    clean, rich = normalize_text(source, dictionary)
    if not clean or not re.search(r"[一-龯々ぁ-ゖァ-ヿ]", clean):
        return None
    result = {**example, "jpn": clean, "vie": translation.strip()}
    if rich:
        result["ruby"] = rich
    return result


def normalize_item(item, dictionary, local):
    result = copy.deepcopy(item)
    for field in ("structure", "formation", "meaning", "nuance"):
        if not result.get(field):
            continue
        source = result[field]
        if local and field == "nuance":
            source = re.sub(r"\s*💠\s*", "\n• ", source).strip()
        if local and field == "formation":
            source = re.sub(r"(V[ぁ-ゖァ-ヿ]+) Động từ thể [^\.\n]*\s*\.", r"\1", source)
            source = re.sub(r"(A[ぁ-ゖァ-ヿ]+) Tính từ đuôi [^\.\n]*\s*\.", r"\1", source)
            source = re.sub(r"(N\d?) DANH TỪ\s*\.", r"\1", source)
            source = re.sub(r"(?<![\n ])(?=(?:V[るてたな]|A[いな]|N\d?\s*\+))", "\n", source)
            source = re.sub(r"[ \t]+(?=(?:V[るてたな]|A[いな]|N\d?\s*\+))", "\n", source)
            source = re.sub(r"\s*／\s*", "\n", source)
            source = re.sub(r"\s+\.\s*(?=\n|$)", "", source)
        clean, rich = normalize_text(source, dictionary)
        result[field] = clean
        if rich:
            result[field + "Ruby"] = rich

    examples = SOURCE_EXAMPLE_OVERRIDES.get(result["id"], result.get("examples", [])) if local else result.get("examples", [])
    cleaned = [normalize_example(ex, dictionary, local) for ex in examples]
    result["examples"] = [ex for ex in cleaned if ex]
    if result["examples"]:
        first = result["examples"][0]
        result["example"] = first["jpn"]
        result["exampleMeaning"] = first["vie"]
        if first.get("ruby"):
            result["exampleRuby"] = first["ruby"]
    else:
        result["example"] = ""
        result["exampleMeaning"] = ""

    if isinstance(result.get("blocks"), list):
        for block in result["blocks"]:
            for field in ("formation", "meaning", "nuance"):
                if block.get(field):
                    clean, rich = normalize_text(block[field], dictionary)
                    block[field] = clean
                    if rich:
                        block[field + "Ruby"] = rich
            block["examples"] = [ex for ex in (normalize_example(ex, dictionary, False) for ex in block.get("examples", [])) if ex]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply-local", action="store_true")
    args = parser.parse_args()
    local_json = json.loads(LOCAL_PATH.read_text(encoding="utf-8"))
    remote_json = json.loads(BACKUP_PATH.read_text(encoding="utf-8"))
    details = json.loads(DETAIL_PATH.read_text(encoding="utf-8"))["items"]
    dictionary = reading_dictionary(details)
    local = [normalize_item(item, dictionary, True) for item in local_json["items"]]
    remote = [normalize_item(item, dictionary, False) for item in remote_json["items"]]
    local_detail = []
    for item in details:
        examples = [ex for ex in (normalize_example(ex, dictionary, True) for ex in item.get("examples", [])) if ex]
        if not examples:
            examples = [ex for ex in (normalize_example(ex, dictionary, True) for ex in SOURCE_EXAMPLE_OVERRIDES.get(item["id"], [])) if ex]
        local_detail.append({"id": item["id"], "examples": examples})
    detail_by_id = {item["id"]: item for item in local_detail}
    for item in local:
        item["totalExamplesCount"] = len(detail_by_id[item["id"]]["examples"])
    assert len(local) == 308 and len(remote) == 100
    assert all(item["structure"] and item["meaning"] for item in local + remote)
    preview = {"local": local, "localDetail": local_detail, "firestore": remote}
    PREVIEW_PATH.write_text(json.dumps(preview, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    stats = {
        "local": len(local), "firestore": len(remote),
        "local_examples": sum(len(item["examples"]) for item in local),
        "local_detail_examples": sum(len(item["examples"]) for item in local_detail),
        "remote_examples": sum(len(item["examples"]) for item in remote),
        "local_ruby_examples": sum(bool(ex.get("ruby")) for item in local for ex in item["examples"]),
        "remote_ruby_examples": sum(bool(ex.get("ruby")) for item in remote for ex in item["examples"]),
        "remaining_mixed_japanese": sum(bool(VIETNAMESE.search(ex["jpn"])) for item in local for ex in item["examples"]),
    }
    print(json.dumps(stats, ensure_ascii=False))
    if args.apply_local:
        local_json["items"] = local
        LOCAL_PATH.write_text(json.dumps(local_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        NORMALIZED_DETAIL_PATH.write_text(json.dumps({"items": local_detail}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
