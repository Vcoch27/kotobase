"""Validate local speech drafts and publish compact timed transcripts for /listening."""

import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DRAFTS = ROOT / "tmp" / "listening-transcription" / "drafts"
PUBLIC = ROOT / "public" / "listening-transcripts"
EXPORT = ROOT / "tmp" / "listening-transcription" / "exports"
SECTION_NAMES = ["課題理解", "ポイント理解", "概要理解", "発話表現", "即時応答"]


def marker_time(cues: list[dict], part: int, lower: float, upper: float) -> float:
    variants = str(part) if part != 2 else "2二に"
    expression = re.compile(rf"問題\s*[{variants}](?:\s*では|[。\s]*$)")
    matches = []
    for cue in cues:
        if not lower < cue["start"] < upper:
            continue
        content = unicodedata.normalize("NFKC", cue["ja"])
        if "回答用紙" in content and not re.search(rf"問題\s*[{variants}]\s*では", content):
            continue
        if expression.search(content):
            matches.append(cue["start"])
    if not matches:
        raise ValueError(f"Cannot identify start of problem {part} between {lower:.0f}s and {upper:.0f}s")
    return min(matches)


def srt_time(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, remainder = divmod(milliseconds, 3600000)
    minutes, remainder = divmod(remainder, 60000)
    whole, remainder = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{whole:02},{remainder:03}"


def main() -> None:
    drafts = sorted(DRAFTS.glob("[0-9][0-9].json"))
    if len(drafts) != 26:
        raise ValueError(f"Expected 26 drafts, found {len(drafts)}")
    PUBLIC.mkdir(parents=True, exist_ok=True)
    EXPORT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for source in drafts:
        draft = json.loads(source.read_text(encoding="utf-8"))
        cues = draft["cues"]
        duration = draft["duration"]
        if not cues or any(cue["end"] <= cue["start"] or cue["start"] < 0 or cue["end"] > duration + 2 for cue in cues):
            raise ValueError(f"Invalid cue timing in {source.name}")
        if any(cues[i]["start"] < cues[i - 1]["start"] for i in range(1, len(cues))):
            raise ValueError(f"Out-of-order cues in {source.name}")
        starts = []
        for part in range(1, 6):
            lower = starts[-1] + 100 if starts else -1
            upper = duration - (5 - part) * 90
            starts.append(marker_time(cues, part, lower, upper))
        if any(starts[i] <= starts[i - 1] for i in range(1, 5)):
            raise ValueError(f"Non-increasing section times in {source.name}")
        sections = [
            {"part": part, "label": SECTION_NAMES[part - 1], "start": round(start, 2),
             "end": round(starts[part] if part < 5 else duration, 2)}
            for part, start in enumerate(starts, 1)
        ]
        compact_cues = []
        for cue in cues:
            content = cue["ja"]
            if cue["start"] < starts[0] + 90 and ("日本語能力試験" in content or "n 3" in content.lower()):
                content = content.replace("懲戒", "聴解")
            if starts[1] <= cue["start"] < starts[1] + 25:
                content = content.replace("問題にでは", "問題2では").replace("問題に 問題に", "問題2。問題2")
            compact_cues.append({"start": cue["start"], "end": cue["end"], "ja": content})
        published = {
            "schemaVersion": 1,
            "status": "machine_transcript",
            "index": draft["index"],
            "label": draft["label"],
            "driveFileId": draft["driveFileId"],
            "duration": duration,
            "sections": sections,
            "cues": compact_cues,
        }
        output = PUBLIC / f'{draft["driveFileId"]}.json'
        output.write_text(json.dumps(published, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        srt = []
        for number, cue in enumerate(compact_cues, 1):
            srt.extend([str(number), f'{srt_time(cue["start"])} --> {srt_time(cue["end"])}', cue["ja"], ""])
        (EXPORT / f'{draft["index"]:02d} JLPT N3 Choukai {draft["label"].replace("/", "-")}.srt').write_text("\n".join(srt), encoding="utf-8")
        manifest.append({"index": draft["index"], "label": draft["label"], "driveFileId": draft["driveFileId"], "sections": sections, "cueCount": len(cues)})
        print(f'{draft["index"]:02d} {draft["label"]}: {len(cues)} cues; sections {", ".join(str(round(start)) for start in starts)}')
    (PUBLIC / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (EXPORT / "README.txt").write_text(
        "JLPT N3 Choukai — 26 phụ đề đồng bộ\n\n"
        "Mỗi file .srt tương ứng với một video cùng số thứ tự. "
        "Mốc thời gian dùng độ chính xác mili giây.\n"
        "Nội dung được nhận dạng giọng nói tự động và chưa được nghe kiểm duyệt từng câu; "
        "có thể sai chữ hoặc lệch mốc ở một số chỗ.\n"
        "Các mốc Dạng 1–5 và mã file Drive được ghi trong manifest.json.\n",
        encoding="utf-8",
    )
    (EXPORT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
