"""Add cached Vietnamese machine translation and automatic furigana to N3 cues."""

import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pykakasi
import requests


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "listening-transcripts"
PROGRESS = ROOT / "tmp" / "listening-transcription" / "translation-status.txt"
KANJI = re.compile(r"[\u3400-\u9fff々]")
KAKASI = pykakasi.kakasi()


def ruby(value: str) -> str:
    parts = []
    for token in KAKASI.convert(value):
        original, reading = token["orig"], token["hira"]
        parts.append(f"{{{original}|{reading}}}" if KANJI.search(original) and original != reading else original)
    return "".join(parts)


def translate(value: str) -> str:
    for attempt in range(4):
        try:
            response = requests.get(
                "https://translate.googleapis.com/translate_a/single",
                params={"client": "gtx", "sl": "ja", "tl": "vi", "dt": "t", "q": value},
                timeout=25,
            )
            response.raise_for_status()
            translated = "".join(piece[0] or "" for piece in response.json()[0]).strip()
            if translated:
                return translated
        except (requests.RequestException, ValueError, KeyError, IndexError):
            time.sleep(1.5 * (attempt + 1))
    return ""


def translate_many(values: list[str]) -> dict[str, str]:
    if len(values) == 1:
        return {values[0]: translate(values[0])}
    joined = "\n".join(values)
    translated = translate(joined).split("\n")
    if len(translated) != len(values):
        return {value: translate(value) for value in values}
    return dict(zip(values, translated))


def main() -> None:
    offline = "--offline" in sys.argv
    manifest = json.loads((PUBLIC / "manifest.json").read_text(encoding="utf-8"))
    cache: dict[str, str] = {}
    for item in manifest:
        data = json.loads((PUBLIC / f'{item["driveFileId"]}.json').read_text(encoding="utf-8"))
        for cue in data["cues"]:
            if cue.get("vi"):
                cache[cue["ja"]] = cue["vi"]
        for question in data.get("questions", []):
            if question.get("promptJa") and question.get("promptVi"):
                cache[question["promptJa"]] = question["promptVi"]

    for index, item in enumerate(manifest, 1):
        path = PUBLIC / f'{item["driveFileId"]}.json'
        data = json.loads(path.read_text(encoding="utf-8"))
        texts = {cue["ja"] for cue in data["cues"] if cue["ja"] and not cue.get("vi")}
        texts.update(q["promptJa"] for q in data.get("questions", []) if q.get("promptJa") and not q.get("promptVi"))
        texts -= cache.keys()
        failures = 0
        if texts and not offline:
            pending = list(texts)
            batches = [pending[start:start + 15] for start in range(0, len(pending), 15)]
            with ThreadPoolExecutor(max_workers=8) as pool:
                tasks = {pool.submit(translate_many, batch): batch for batch in batches}
                for task in as_completed(tasks):
                    for value, translated in task.result().items():
                        if translated:
                            cache[value] = translated
                        else:
                            failures += 1
        for cue in data["cues"]:
            cue["ruby"] = cue.get("ruby") or ruby(cue["ja"])
            cue["vi"] = cue.get("vi") or cache.get(cue["ja"], "")
        for question in data.get("questions", []):
            if question.get("promptJa"):
                question["promptRuby"] = question.get("promptRuby") or ruby(question["promptJa"])
                question["promptVi"] = question.get("promptVi") or cache.get(question["promptJa"], "")
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        status = f"{index}/{len(manifest)} exams enriched; {failures} failed in {item['label']}" + (" (offline)" if offline else "")
        PROGRESS.write_text(status, encoding="utf-8")
        print(status, flush=True)
    if any(not cue.get("vi") for item in manifest for cue in json.loads((PUBLIC / f'{item["driveFileId"]}.json').read_text(encoding="utf-8"))["cues"]):
        sys.exit("Some cues have no translation. Rerun to retry failed requests.")


if __name__ == "__main__":
    main()
