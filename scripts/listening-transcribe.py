"""Transcribe the 26 public JLPT N3 listening videos without Codex model calls.

Run from the repository root. Completed transcripts are kept when a run is resumed.
The generated text is a draft and must be reviewed before publishing as an answer key.
"""

import argparse
import gc
import json
import re
import subprocess
import time
import wave
from datetime import datetime, timezone
from pathlib import Path

import requests
from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "tmp" / "listening-transcription"
OUTPUT = WORK / "drafts"
PLAN = ROOT / "src" / "lib" / "listening-plan.ts"
EXAM_PATTERN = re.compile(
    r'"label": "([^"]+)"\s*,\s*"driveFileId": "([^"]+)"\s*,\s*"index": (\d+)\s*,\s*"fileName": "([^"]+)"'
)


def exams() -> list[dict]:
    result = [
        {"label": label, "driveFileId": file_id, "index": int(index), "fileName": name}
        for label, file_id, index, name in EXAM_PATTERN.findall(PLAN.read_text(encoding="utf-8"))
    ]
    if len(result) != 26 or sorted(item["index"] for item in result) != list(range(1, 27)):
        raise RuntimeError("Expected exactly 26 mapped exams in listening-plan.ts")
    return result


def log(message: str) -> None:
    print(f"{datetime.now(timezone.utc).isoformat()} {message}", flush=True)


def download(file_id: str, target: Path) -> None:
    url = "https://drive.usercontent.google.com/download"
    for attempt in range(1, 5):
        try:
            with requests.get(
                url,
                params={"id": file_id, "export": "download"},
                headers={"Accept-Encoding": "identity"},
                stream=True,
                timeout=(20, 120),
            ) as response:
                response.raise_for_status()
                if not response.headers.get("content-type", "").startswith(("video/", "application/octet-stream")):
                    raise RuntimeError("Drive did not return video bytes")
                expected = int(response.headers.get("content-length", "0"))
                with target.open("wb") as output:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            output.write(chunk)
                if expected and target.stat().st_size != expected:
                    raise RuntimeError(f"Incomplete download: {target.stat().st_size}/{expected} bytes")
                return
        except Exception:
            target.unlink(missing_ok=True)
            if attempt == 4:
                raise
            time.sleep(attempt * 5)


def extract_audio(video: Path, audio: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
         "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(audio)],
        check=True,
    )


def transcribe_audio(model: WhisperModel, audio: Path, index: int, chunk_seconds: int | None) -> tuple[list[dict], float]:
    cues: list[dict] = []
    with wave.open(str(audio), "rb") as source:
        rate = source.getframerate()
        total_frames = source.getnframes()
        duration = total_frames / rate
        if source.getnchannels() != 1 or source.getsampwidth() != 2:
            raise RuntimeError("Expected mono 16-bit PCM from ffmpeg")
        step = (chunk_seconds or max(1, int(duration) + 1)) * rate
        for boundary in range(0, total_frames, step):
            overlap = min(2 * rate, boundary)
            first = boundary - overlap
            source.setpos(first)
            frames = source.readframes(min(step + overlap, total_frames - first))
            chunk = WORK / f"{index:02d}.chunk.wav"
            try:
                with wave.open(str(chunk), "wb") as output:
                    output.setnchannels(1)
                    output.setsampwidth(2)
                    output.setframerate(rate)
                    output.writeframes(frames)
                segments, _ = model.transcribe(
                    str(chunk), language="ja", beam_size=5, word_timestamps=True,
                    vad_filter=True, condition_on_previous_text=False,
                )
                offset = first / rate
                for segment in segments:
                    content = segment.text.strip()
                    if not content or (boundary and offset + segment.end <= boundary / rate):
                        continue
                    cues.append({
                        "start": round(offset + segment.start, 2),
                        "end": round(min(duration, offset + segment.end), 2),
                        "ja": content,
                        "words": [
                            {"start": round(offset + word.start, 2), "end": round(min(duration, offset + word.end), 2), "text": word.word}
                            for word in segment.words or []
                        ],
                    })
                log(f"CHUNK {index:02d} {min(duration, (boundary + step) / rate):.0f}/{duration:.0f}s")
            finally:
                chunk.unlink(missing_ok=True)
                gc.collect()
    return cues, duration


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, help="Only transcribe one exam (1–26)")
    parser.add_argument("--max-files", type=int, help="Stop after this many new transcripts")
    parser.add_argument("--chunk-seconds", type=int, help="Transcribe short audio chunks to limit memory")
    args = parser.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    model = WhisperModel("large-v3", device="cuda", compute_type="int8_float16", local_files_only=True)
    completed = 0
    for exam in exams():
        if args.index and exam["index"] != args.index:
            continue
        destination = OUTPUT / f'{exam["index"]:02d}.json'
        if destination.exists():
            log(f'SKIP {exam["index"]:02d}: draft already exists')
            continue
        video = WORK / f'{exam["index"]:02d}.mp4'
        audio = WORK / f'{exam["index"]:02d}.wav'
        try:
            log(f'START {exam["index"]:02d} {exam["label"]}')
            download(exam["driveFileId"], video)
            log(f'DOWNLOADED {exam["index"]:02d} {video.stat().st_size} bytes')
            extract_audio(video, audio)
            video.unlink(missing_ok=True)
            log(f'EXTRACTED {exam["index"]:02d}')
            cues, duration = transcribe_audio(model, audio, exam["index"], args.chunk_seconds)
            draft = {
                "schemaVersion": 1,
                "status": "machine_draft",
                "index": exam["index"],
                "label": exam["label"],
                "driveFileId": exam["driveFileId"],
                "sourceFileName": exam["fileName"],
                "duration": round(duration, 2),
                "language": "ja",
                "cues": cues,
            }
            temp = destination.with_suffix(".json.tmp")
            temp.write_text(json.dumps(draft, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            temp.replace(destination)
            completed += 1
            log(f'DONE {exam["index"]:02d} {len(cues)} cues, {duration:.1f} seconds')
        except Exception as error:
            log(f'FAILED {exam["index"]:02d} {type(error).__name__}: {error}')
            (WORK / f'{exam["index"]:02d}.error.txt').write_text(str(error), encoding="utf-8")
        finally:
            audio.unlink(missing_ok=True)
            video.unlink(missing_ok=True)
        if args.max_files and completed >= args.max_files:
            break
    log(f'FINISHED {len(list(OUTPUT.glob("[0-9][0-9].json")))}/26 drafts')


if __name__ == "__main__":
    main()
