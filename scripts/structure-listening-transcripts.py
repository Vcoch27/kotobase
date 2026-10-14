"""Group timed N3 listening cues by Mondai and numbered question.

Readable source scripts improve boundary detection. Older scans fall back to
spoken number markers and mark interpolated starts as estimates.
"""

import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "listening-transcripts"
SOURCES = ROOT / "tmp" / "listening-transcription" / "sources"
COUNTS = (6, 6, 3, 4, 9)
NUMBERS = {character: number for number, character in enumerate("一二三四五六七八九", 1)}
QUESTION_LINE = re.compile(r"^\s*([1-9])\s*番(?:\s*(?:正解|正答)\s*[:：]?\s*[1-4])?\s*$")
PART_LINE = re.compile(r"^\s*問題\s*([1-5])\s*$")
SPOKEN_NUMBER = re.compile(r"(?:^|[。.!?？\s])([1-9一二三四五六七八九])\s*番(?:[。.!?？\s、]|$)")


def normalized(value: str) -> str:
    return unicodedata.normalize("NFKC", value)


def comparison(value: str) -> str:
    return re.sub(r"[^\w\u3040-\u30ff\u3400-\u9fff]", "", normalized(value)).lower()


def source_questions(label: str) -> dict[tuple[int, int], str]:
    month, year = label.split("/")
    source = SOURCES / f"{year}-{month}.txt"
    if not source.exists():
        return {}
    lines = [normalized(line).strip() for line in source.read_text(encoding="utf-8").splitlines()]
    result: dict[tuple[int, int], str] = {}
    part = number = 0
    for line in lines:
        part_match = PART_LINE.fullmatch(line)
        if part_match:
            part = int(part_match[1])
            number = 0
            continue
        question_match = QUESTION_LINE.fullmatch(line)
        if question_match and part:
            number = int(question_match[1])
            continue
        if not part or not number or (part, number) in result:
            continue
        if not line or line.startswith(("男:", "女:", "男：", "女：", "①", "②", "③", "④")):
            continue
        if re.search(r"Yuuki|JLPT|Script Nghe|^\d+$", line, re.I):
            continue
        if len(comparison(line)) < 8:
            continue
        prompt = re.sub(r"\s*(?:正解|正答)\s*[:：]?\s*[1-4]\s*$", "", line)
        result[(part, number)] = prompt[:180]
    return result


def audio_markers(cues: list[dict], section: dict) -> dict[int, list[float]]:
    found: dict[int, list[float]] = {number: [] for number in range(1, COUNTS[section["part"] - 1] + 1)}
    for cue in cues:
        if not section["start"] <= cue["start"] < section["end"]:
            continue
        text = normalized(cue["ja"])
        for match in SPOKEN_NUMBER.finditer(text):
            number = int(match[1]) if match[1].isdigit() else NUMBERS[match[1]]
            if number not in found or "答えは" in text or "最も良いものは" in text:
                continue
            # The number is usually read at the start of the new question.
            if match.start() > 35 and not re.search(r"始めます|では次|どうしますか", text[:match.start()]):
                continue
            found[number].append(cue["start"])
    return found


def source_match(cues: list[dict], section: dict, prompt: str) -> tuple[float, float]:
    target = comparison(prompt)[:65]
    if len(target) < 10:
        return 0.0, 0.0
    best_time, best_score = 0.0, 0.0
    for cue in cues:
        if not section["start"] <= cue["start"] < section["end"]:
            continue
        candidate = comparison(cue["ja"])
        if len(candidate) < 8:
            continue
        score = SequenceMatcher(None, target, candidate[: max(len(target) + 12, 40)]).ratio()
        if target[:15] in candidate:
            score = max(score, 0.85)
        if score > best_score:
            best_time, best_score = cue["start"], score
    return best_time, best_score


def question_starts(cues: list[dict], section: dict, prompts: dict[tuple[int, int], str]) -> list[tuple[float, str]]:
    part = section["part"]
    count = COUNTS[part - 1]
    markers = audio_markers(cues, section)
    known: dict[int, tuple[float, str]] = {}
    for number in range(1, count + 1):
        prompt = prompts.get((part, number), "")
        match_time, match_score = source_match(cues, section, prompt) if prompt else (0.0, 0.0)
        marker_times = markers[number]
        if match_score >= 0.55:
            # The prompt is often repeated after the dialogue, so prefer the
            # spoken question number preceding that repeat.
            before = [time for time in marker_times if 0 <= match_time - time <= 140]
            known[number] = (max(before) if before else match_time, "source")
        elif marker_times:
            known[number] = (marker_times[0], "audio_marker")

    # Reject candidates whose ordering disagrees with the question numbering.
    previous = section["start"]
    for number in range(1, count + 1):
        if number in known:
            time, kind = known[number]
            if time < previous + 5:
                del known[number]
            else:
                previous = time

    if 1 not in known:
        cue_after_intro = next((cue["end"] for cue in cues if section["start"] <= cue["start"] < section["end"] and "始めます" in cue["ja"]), None)
        if cue_after_intro:
            first = cue_after_intro
        elif known:
            first_number = min(known)
            average = (section["end"] - section["start"]) / (count + 0.8)
            first = known[first_number][0] - (first_number - 1) * average
        else:
            first = section["start"] + min(35, (section["end"] - section["start"]) * 0.08)
        known[1] = (max(section["start"], first), "estimated")

    # Fill missing numbers between observed starts; the UI labels these estimates.
    starts: list[tuple[float, str]] = []
    anchors = sorted(known)
    for number in range(1, count + 1):
        if number in known:
            starts.append(known[number])
            continue
        before = max(anchor for anchor in anchors if anchor < number)
        later = [anchor for anchor in anchors if anchor > number]
        if later:
            after = min(later)
            time = known[before][0] + (known[after][0] - known[before][0]) * (number - before) / (after - before)
        else:
            time = known[before][0] + (section["end"] - known[before][0]) * (number - before) / (count + 1 - before)
        starts.append((time, "estimated"))
    return starts


def main() -> None:
    manifest = json.loads((PUBLIC / "manifest.json").read_text(encoding="utf-8"))
    total_estimated = 0
    for item in manifest:
        path = PUBLIC / f'{item["driveFileId"]}.json'
        data = json.loads(path.read_text(encoding="utf-8"))
        prompts = source_questions(item["label"])
        previous_questions = {(question["part"], question["number"]): question for question in data.get("questions", [])}
        for key, previous in previous_questions.items():
            if key not in prompts and previous.get("promptJa"):
                prompts[key] = previous["promptJa"]
        questions = []
        for section in data["sections"]:
            starts = question_starts(data["cues"], section, prompts)
            for index, (start, source) in enumerate(starts):
                end = starts[index + 1][0] if index + 1 < len(starts) else section["end"]
                if end <= start:
                    raise ValueError(f'Question timing invalid: {item["label"]} part {section["part"]} question {index + 1}')
                question = {
                    "part": section["part"], "number": index + 1,
                    "start": round(start, 2), "end": round(end, 2),
                    "promptJa": prompts.get((section["part"], index + 1), ""),
                    "timing": source,
                }
                previous = previous_questions.get((section["part"], index + 1), {})
                if previous.get("promptJa") == question["promptJa"]:
                    for field in ("promptRuby", "promptVi"):
                        if previous.get(field):
                            question[field] = previous[field]
                questions.append(question)
                total_estimated += source == "estimated"
        data["questions"] = questions
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f'{item["label"]}: {len(questions)} questions; {sum(q["timing"] == "estimated" for q in questions)} estimated; {len(prompts)} source prompts')
    print(f"Total estimated question starts: {total_estimated}/{len(manifest) * sum(COUNTS)}")


if __name__ == "__main__":
    main()
