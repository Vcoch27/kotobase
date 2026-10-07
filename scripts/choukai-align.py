"""Map existing Chōkai sentences onto Whisper word times for review.

Usage: python scripts/choukai-align.py ASR.json CANDIDATE.json REPORT.txt
The candidate must be reviewed before replacing the published lesson data.
"""

import json
import re
import subprocess
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FURIGANA = re.compile(r"([一-龯々ヶヵ]+)\(([ぁ-んァ-ンー]+)\)")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", FURIGANA.sub(r"\1", text))
    text = "".join(chr(ord(char) - 0x60) if "ァ" <= char <= "ヶ" else char for char in text)
    return "".join(char.lower() for char in text if not char.isspace() and not unicodedata.category(char).startswith(("P", "S")))


def duration(path: Path) -> float:
    return float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ], text=True).strip())


def align(lesson: dict, segments: list[dict]) -> list[dict]:
    source = ""
    source_ranges = []
    for cue in lesson["cues"]:
        start = len(source)
        source += normalize(cue["ja"])
        source_ranges.append((start, len(source)))

    words = [word for segment in segments for word in segment["words"] if normalize(word["text"])]
    recognized = ""
    char_to_word = []
    for index, word in enumerate(words):
        normalized = normalize(word["text"])
        recognized += normalized
        char_to_word.extend([index] * len(normalized))

    source_to_word: dict[int, int] = {}
    matcher = SequenceMatcher(None, source, recognized, autojunk=False)
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            source_to_word[block.a + offset] = char_to_word[block.b + offset]

    candidates = []
    for cue, (left, right) in zip(lesson["cues"], source_ranges):
        matched = [source_to_word[index] for index in range(left, right) if index in source_to_word]
        coverage = len(matched) / max(1, right - left)
        if matched:
            first, last = min(matched), max(matched)
            start, end = float(words[first]["start"]), float(words[last]["end"])
            recognized_text = "".join(word["text"] for word in words[first:last + 1])
        else:
            start, end, recognized_text = cue["start"], cue["start"] + 1, ""
        candidates.append({
            "old": cue["start"], "speechStart": start, "speechEnd": end,
            "coverage": round(coverage, 2), "asr": recognized_text,
        })

    # Keep every sentence's spoken tail while stopping before the next voice.
    audio_end = duration(ROOT / "public" / lesson["audio"].lstrip("/"))
    for index, candidate in enumerate(candidates):
        next_start = candidates[index + 1]["speechStart"] if index + 1 < len(candidates) else audio_end
        candidate["start"] = round(max(0, candidate["speechStart"] - 0.1), 2)
        candidate["end"] = round(min(audio_end, candidate["speechEnd"] + 0.15, next_start - 0.03), 2)
        if candidate["end"] <= candidate["start"]:
            candidate["end"] = round(max(candidate["start"] + 0.1, candidate["speechEnd"]), 2)
    return candidates


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("Usage: python scripts/choukai-align.py ASR.json CANDIDATE.json REPORT.txt")
    asr = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    lessons = json.loads((ROOT / "src/data/choukai-lessons.json").read_text(encoding="utf-8"))
    report = []
    for lesson in lessons:
        candidates = align(lesson, asr[lesson["id"]])
        report.append(f"\n# {lesson['id']} {lesson['title']}")
        for index, (cue, candidate) in enumerate(zip(lesson["cues"], candidates), start=1):
            report.append(
                f"{index:02} {candidate['old']:5.1f} -> {candidate['start']:5.2f}-{candidate['end']:5.2f} "
                f"cov={candidate['coverage']:.2f} | {FURIGANA.sub(r'\1', cue['ja'])} | {candidate['asr']}"
            )
            cue["start"] = candidate["start"]
            cue["end"] = candidate["end"]
    Path(sys.argv[2]).write_text(json.dumps(lessons, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(sys.argv[3]).write_text("\n".join(report) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
