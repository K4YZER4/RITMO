const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const features = [
  { id: 'FeatureWeight', out: 'feat_weight.mp4' },
  { id: 'FeatureExercise', out: 'feat_exercise.mp4' },
  { id: 'FeatureRoutine', out: 'feat_routine.mp4' },
  { id: 'FeatureNotes', out: 'feat_notes.mp4' },
  { id: 'FeatureLimits', out: 'feat_limits.mp4' },
];

console.log('=== Starting Remotion Rendering of 5 Feature Clips ===');

for (const f of features) {
  console.log(`\nRendering ${f.id} -> out/${f.out}...`);
  execSync(`npx.cmd remotion render src/index.ts ${f.id} out/${f.out} --concurrency 8`, {
    cwd: __dirname,
    stdio: 'inherit',
  });
  console.log(`✓ Finished rendering out/${f.out}`);

  // Copy to brain artifacts directory
  const brainDir = path.join('C:', 'Users', 'horac', '.gemini', 'antigravity', 'brain', 'de9e3233-0b6c-43a9-aa30-e0f8c05960a8');
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(path.join(__dirname, 'out', f.out), path.join(brainDir, f.out));
    console.log(`✓ Copied out/${f.out} to artifacts directory.`);
  }
}

console.log('\n=== All 5 Feature Clips Rendered and Copied Successfully! ===');
