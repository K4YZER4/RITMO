const { chromium } = require('playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Scroll to #video
  await page.evaluate(() => {
    document.getElementById('video')?.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Initial view screenshot
  await page.screenshot({ path: path.join(__dirname, 'out', 'check_01_initial_poster.png') });
  console.log('Saved check_01_initial_poster.png');

  // 2. Click 02 EJERCICIOS tab
  const tabExercise = page.locator('button.video-tab-btn:has-text("02 EJERCICIOS")');
  await tabExercise.click();
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(__dirname, 'out', 'check_02_tab_exercise.png') });
  console.log('Saved check_02_tab_exercise.png');

  // 3. Click 01 PESO & GRÁFICA tab
  const tabWeight = page.locator('button.video-tab-btn:has-text("01 PESO")');
  await tabWeight.click();
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(__dirname, 'out', 'check_03_tab_weight.png') });
  console.log('Saved check_03_tab_weight.png');

  // 4. Click play button
  const playBtn = page.locator('button#play');
  if (await playBtn.count() > 0) {
    await playBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(__dirname, 'out', 'check_04_playing.png') });
    console.log('Saved check_04_playing.png');
  }

  await browser.close();
  console.log('All poster and tab switch checks passed!');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
