const { chromium } = require('playwright');
const path = require('path');

async function checkScrollbar() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--hide-scrollbars=0'] // ensure scrollbars are rendered
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Scroll down to the feature-scroll-section
  await page.evaluate(() => {
    const el = document.querySelector('.features-scroll-section');
    el?.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 800));

  // Screenshot showing the right edge
  const outPath = path.join(__dirname, 'out', 'scrollbar_check.png');
  await page.screenshot({ path: outPath });
  console.log('Saved screenshot to:', outPath);

  // Check scrollbar CSS computed rules
  const scrollbarStyles = await page.evaluate(() => {
    const html = document.documentElement;
    const computed = window.getComputedStyle(html);
    return {
      scrollbarWidth: computed.scrollbarWidth,
      scrollbarColor: computed.scrollbarColor,
    };
  });
  console.log('Computed scrollbar styles:', scrollbarStyles);

  await browser.close();
}

checkScrollbar().catch(err => {
  console.error(err);
  process.exit(1);
});
