"""Produce word-level audio evidence for manual Chōkai timeline review.

Run locally with faster-whisper and a cached large-v3 model:
    python scripts/choukai-transcribe.py OUTPUT.json
The output is a working file and is not loaded by the web app.
"""

import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
LESSONS = json.loads((ROOT / "src/data/choukai-lessons.json").read_text(encoding="utf-8"))


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/choukai-transcribe.py OUTPUT.json")
    model = WhisperModel("large-v3", device="cuda", compute_type="float16", local_files_only=True)
    result = {}
    for lesson in LESSONS:
        segments, _ = model.transcribe(
            str(ROOT / "public" / lesson["audio"].lstrip("/")),
            language="ja",
            beam_size=5,
            word_timestamps=True,
            vad_filter=False,
        )
        result[lesson["id"]] = [
            {
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": segment.text.strip(),
                "words": [
                    {"start": round(word.start, 2), "end": round(word.end, 2), "text": word.word}
                    for word in segment.words or []
                ],
            }
            for segment in segments
        ]
        print(lesson["id"], len(result[lesson["id"]]), "segments", flush=True)
    Path(sys.argv[1]).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
