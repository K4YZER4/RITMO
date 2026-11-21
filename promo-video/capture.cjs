const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function smoothMove(page, targetX, targetY, steps = 30) {
  await page.mouse.move(targetX, targetY, { steps });
}

async function run() {
  const outputDir = path.join(__dirname, 'raw-captures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('1. Launching browser for 1080p recording...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--window-size=1920,1080', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  console.log('2. Coach Scene: Login on port 5174...');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
  await delay(1000);

  // Click 1-click coach demo login button
  const coachBtn = page.locator('button:has-text("Entrenador")').first();
  await coachBtn.click();
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1500);

  console.log('3. Coach Scene: Weekly Routine Planner...');
  await page.goto('http://localhost:5174/app/alumnos', { waitUntil: 'networkidle' });
  await delay(1200);

  // Click first student link or button
  const studentLink = page.locator('a[href*="/app/alumnos/"]').first();
  if (await studentLink.count() > 0) {
    await studentLink.click();
    await delay(1500);
  }

  // Smooth scroll down to weekly routine planner
  await page.evaluate(() => {
    window.scrollBy({ top: 520, behavior: 'smooth' });
  });
  await delay(1200);

  // Smooth mouse movement over the planner columns
  await smoothMove(page, 520, 500, 30);
  await delay(800);
  await smoothMove(page, 740, 500, 30);
  await delay(800);
  await smoothMove(page, 960, 500, 30);
  await delay(1500);

  console.log('4. Student Scene: Login as student...');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
  await delay(1000);

  const studentBtn = page.locator('button:has-text("Alumno")').first();
  await studentBtn.click();
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1500);

  console.log('5. Student Scene: Today workout & weekly schedule...');
  // Scroll down smoothly to show week and today workout
  await page.evaluate(() => {
    window.scrollBy({ top: 280, behavior: 'smooth' });
  });
  await delay(1200);

  // Hover over the today workout or reorder button
  await smoothMove(page, 450, 480, 25);
  await delay(800);
  await smoothMove(page, 950, 680, 25); // reorder week button area
  await delay(1500);

  console.log('6. Closing context to finalize video...');
  await delay(1000);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const videoPath = await video.path();
    console.log('Raw video saved to:', videoPath);
    const targetPath = path.join(outputDir, 'raw.webm');
    fs.copyFileSync(videoPath, targetPath);
    console.log('Copied canonical raw capture to:', targetPath);

    const publicTarget = path.join(__dirname, 'public', 'raw.webm');
    fs.copyFileSync(videoPath, publicTarget);
    console.log('Copied to Remotion public dir:', publicTarget);
  }
}

run().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
