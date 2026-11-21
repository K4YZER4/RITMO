const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('console', msg => console.log('LOG:', msg.text()));
  p.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await p.goto('http://localhost:5174/login');
  await p.waitForSelector('button');
  console.log('Clicking Entrenador demo button...');
  await p.click('button:has-text("Entrenador")');
  
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 1000));
    console.log(`Sec ${i + 1} URL:`, p.url());
  }

  const errorEl = await p.$('.error');
  if (errorEl) {
    console.log('UI Error:', await errorEl.textContent());
  }
  await b.close();
})();
