const { execSync } = require('child_process');
const path = require('path');
const times = [8, 14, 25, 35, 42, 50, 60, 70, 83, 89, 94];
times.forEach(t => {
  const pad = String(t).padStart(2, '0');
  execSync(`npx.cmd remotion ffmpeg -y -ss ${t} -i public/raw_full_flow.webm -vframes 1 -update 1 out/frame_${pad}s.png`, {
    cwd: __dirname
  });
  console.log(`Extracted frame at ${t}s -> out/frame_${pad}s.png`);
});
