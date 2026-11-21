const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const posters = [
  { video: 'full_flow_demo.mp4', time: 35, out: 'poster_full.jpg' },
  { video: 'feat_weight.mp4', time: 13, out: 'poster_weight.jpg' },
  { video: 'feat_exercise.mp4', time: 12, out: 'poster_exercise.jpg' },
  { video: 'feat_routine.mp4', time: 14, out: 'poster_routine.jpg' },
  { video: 'feat_notes.mp4', time: 8, out: 'poster_notes.jpg' },
  { video: 'feat_limits.mp4', time: 6, out: 'poster_limits.jpg' },
];

const targetDir = path.join(__dirname, '..', 'frontend', 'public', 'videos', 'posters');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

console.log('--- Extracting Posters for Landing Page ---');

for (const p of posters) {
  const videoPath = path.join(__dirname, '..', 'frontend', 'public', 'videos', p.video);
  const outPath = path.join(targetDir, p.out);
  console.log(`Extracting ${p.video} at ${p.time}s -> ${p.out}...`);
  execSync(`npx.cmd remotion ffmpeg -y -ss ${p.time} -i "${videoPath}" -vframes 1 -q:v 2 "${outPath}"`, {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log(`✓ Generated ${p.out}`);
}

console.log('--- All posters extracted successfully! ---');
