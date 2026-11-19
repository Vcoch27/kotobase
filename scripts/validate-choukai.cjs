#!/usr/bin/env node
/** Check lesson metadata, cue boundaries, and local audio before publishing. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const file = path.resolve(process.argv[2] || path.join(root, 'src/data/choukai-lessons.json'));
const problems = [];
const warnings = [];
let lessons;

try {
  lessons = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (error) {
  console.error(`Cannot read ${file}: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(lessons) || lessons.length === 0) {
  problems.push('Root must be a nonempty array of lessons.');
  lessons = [];
}

const ids = new Set();
let cueCount = 0;
for (const [lessonIndex, lesson] of lessons.entries()) {
  const label = `lesson ${lessonIndex + 1} (${lesson?.id || 'missing id'})`;
  if (!lesson || typeof lesson !== 'object') {
    problems.push(`${label}: expected an object`);
    continue;
  }
  for (const key of ['id', 'group', 'title', 'filename', 'audio', 'source']) {
    if (typeof lesson[key] !== 'string' || !lesson[key].trim()) problems.push(`${label}: missing ${key}`);
  }
  if (lesson.groupLabel !== undefined && typeof lesson.groupLabel !== 'string') {
    problems.push(`${label}: groupLabel must be a string`);
  }
  if (lesson.note !== undefined && typeof lesson.note !== 'string') {
    problems.push(`${label}: note must be a string`);
  }
  if (ids.has(lesson.id)) problems.push(`${label}: duplicate id`);
  ids.add(lesson.id);
  if (typeof lesson.source === 'string' && !/^https?:\/\//.test(lesson.source)) {
    problems.push(`${label}: source must be an http(s) URL`);
  }

  let audioDuration = null;
  if (typeof lesson.audio === 'string') {
    if (!/^\/choukai\/[\w.-]+\.(mp3|m4a|wav|ogg)$/i.test(lesson.audio)) {
      problems.push(`${label}: audio must be /choukai/<filename>.mp3, .m4a, .wav, or .ogg`);
    } else {
      const audioPath = path.join(root, 'public', lesson.audio.slice(1));
      if (!fs.existsSync(audioPath)) problems.push(`${label}: missing ${audioPath}`);
      else {
        const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1', audioPath], { encoding: 'utf8' });
        if (probe.error?.code === 'ENOENT') warnings.push('ffprobe unavailable; audio duration was not checked');
        else if (probe.status !== 0 || !Number.isFinite(Number(probe.stdout.trim()))) {
          problems.push(`${label}: audio cannot be probed`);
        } else audioDuration = Number(probe.stdout.trim());
      }
    }
  }

  if (!Array.isArray(lesson.cues) || lesson.cues.length === 0) {
    problems.push(`${label}: cues must be a nonempty array`);
    continue;
  }
  let previous = null;
  for (const [index, cue] of lesson.cues.entries()) {
    cueCount++;
    const cueLabel = `${label}, cue ${index + 1}`;
    if (!cue || typeof cue !== 'object') {
      problems.push(`${cueLabel}: expected an object`);
      continue;
    }
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start) {
      problems.push(`${cueLabel}: start/end must be seconds with 0 <= start < end`);
    }
    for (const key of ['speaker', 'ja', 'vi']) {
      if (typeof cue[key] !== 'string' || !cue[key].trim()) problems.push(`${cueLabel}: missing ${key}`);
    }
    if (typeof cue.ja === 'string' && /<[^>]*>/.test(cue.ja)) {
      problems.push(`${cueLabel}: use 漢字(かな), not HTML ruby`);
    }
    if (previous && Number.isFinite(cue.start) && Number.isFinite(previous.start)) {
      if (cue.start < previous.start) problems.push(`${cueLabel}: cues are out of order`);
      else if (cue.start < previous.end - 0.1) warnings.push(`${cueLabel}: overlaps previous cue by ${(previous.end - cue.start).toFixed(2)}s; review audio`);
    }
    if (audioDuration !== null && Number.isFinite(cue.end) && cue.end > audioDuration + 0.5) {
      problems.push(`${cueLabel}: ends at ${cue.end}s after audio duration ${audioDuration.toFixed(2)}s`);
    }
    previous = cue;
  }
}

for (const warning of new Set(warnings)) console.warn(`WARNING: ${warning}`);
for (const problem of problems) console.error(`ERROR: ${problem}`);
console.log(`${lessons.length} lessons, ${cueCount} cues checked; ${problems.length} errors, ${warnings.length} warnings.`);
process.exit(problems.length ? 1 : 0);
