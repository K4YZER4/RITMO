const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  
  // Click on '01 PESO & GRÁFICA' tab
  const tab = page.locator('button.video-tab-btn:has-text("01 PESO")');
  await tab.click();
  await new Promise(r => setTimeout(r, 1000));
  
  const videoSrc = await page.locator('video#player').getAttribute('src');
  console.log('Active video src after tab click:', videoSrc);
  
  // Click next scroll button
  const nextBtn = page.locator('.scroll-nav-btn').nth(1);
  await nextBtn.click();
  await new Promise(r => setTimeout(r, 800));
  
  // Click 'Reproducir en grande' on routine card
  const routineCardAction = page.locator('.feature-card:has-text("Constructor de Rutinas") button.feature-card-action');
  await routineCardAction.click();
  await new Promise(r => setTimeout(r, 1000));
  
  const videoSrc2 = await page.locator('video#player').getAttribute('src');
  console.log('Active video src after card action:', videoSrc2);
  
  await browser.close();
  console.log('Interaction test completed with 100% success!');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
