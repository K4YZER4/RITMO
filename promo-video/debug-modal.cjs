const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('console', msg => console.log('PAGE LOG:', msg.text()));
  p.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Login as Coach
  await p.goto('http://localhost:5173/login');
  await p.click('button:has-text("Entrenador")');
  await p.waitForURL('**/app**');

  // Go to Ana's profile
  await p.goto('http://localhost:5173/app/alumnos');
  await p.click('a[href*="/app/alumnos/"]:has-text("Ana")');
  await p.waitForURL('**/app/alumnos/**');

  // Open Monday modal
  await p.click('.week-day:has-text("Lunes") button.week-add');
  await p.waitForSelector('.modal');

  // Click SelectTrigger
  await p.click('.modal .select-trigger');
  await p.waitForSelector('.select-option');

  // Click Torso
  await p.click('.select-option:has-text("Torso")');
  await new Promise(r => setTimeout(r, 500));

  console.log('Selected text:', await p.textContent('.modal .select-trigger'));
  console.log('Is Guardar disabled?:', await p.getAttribute('.modal button.button.primary:has-text("Guardar")', 'disabled'));

  // Click Guardar
  await p.click('.modal button.button.primary:has-text("Guardar")');
  await new Promise(r => setTimeout(r, 2000));

  const modalCount = await p.locator('.modal').count();
  console.log('Modal count after click:', modalCount);
  const errorText = await p.locator('.modal .error, .error').allTextContents();
  console.log('Errors if any:', errorText);

  await b.close();
})();
