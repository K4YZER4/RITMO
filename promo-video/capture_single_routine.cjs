const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const CLICK_INJECTION = `
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('demo-cursor-dot')) return;

  const cursor = document.createElement('div');
  cursor.id = 'demo-cursor-dot';
  cursor.style.cssText = \`
    position: fixed;
    top: 0; left: 0;
    width: 22px; height: 22px;
    background: rgba(183, 243, 74, 0.45);
    border: 2px solid #b7f34a;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2147483647;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 15px rgba(183, 243, 74, 0.7);
    transition: transform 0.08s ease-out;
  \`;
  document.body.appendChild(cursor);

  window.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  window.addEventListener('mousedown', (e) => {
    cursor.style.transform = 'translate(-50%, -50%) scale(0.75)';

    const ripple = document.createElement('div');
    ripple.className = 'demo-click-ripple';
    ripple.style.cssText = \`
      position: fixed;
      left: \${e.clientX}px;
      top: \${e.clientY}px;
      width: 14px; height: 14px;
      border: 3px solid #b7f34a;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483646;
      transform: translate(-50%, -50%) scale(1);
      box-shadow: 0 0 25px #b7f34a;
      animation: rippleAnim 0.65s cubic-bezier(0.15, 0.85, 0.35, 1) forwards;
    \`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });

  window.addEventListener('mouseup', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  const style = document.createElement('style');
  style.textContent = \`
    @keyframes rippleAnim {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(5);
        opacity: 0;
      }
    }
  \`;
  document.head.appendChild(style);
});
`;

async function smoothClick(page, locator) {
  const box = await locator.boundingBox();
  if (box) {
    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;
    await page.mouse.move(targetX, targetY, { steps: 25 });
    await delay(180);
    await page.mouse.click(targetX, targetY);
    await delay(250);
  } else {
    await locator.click();
  }
}

async function run() {
  const outputDir = path.join(__dirname, 'raw-captures');
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

  await context.addInitScript(CLICK_INJECTION);
  const page = await context.newPage();

  console.log('--- Capturing raw_feat_routine ---');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await delay(600);
  await smoothClick(page, page.locator('button:has-text("Entrenador")').first());
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1000);

  await page.goto('http://localhost:5173/app/rutinas', { waitUntil: 'networkidle' });
  await delay(1500);

  // Click "Nueva rutina"
  const newRoutineBtn = page.locator('button:has-text("Nueva rutina")');
  await smoothClick(page, newRoutineBtn);
  await page.waitForSelector('.modal', { state: 'attached', timeout: 10000 });
  await delay(800);

  // Fill Name
  const rNameInput = page.locator('.modal label:has-text("Nombre") input');
  await smoothClick(page, rNameInput);
  await rNameInput.fill('Glúteo & Cadena Posterior Pro');
  await delay(400);

  // Fill Description
  const rDescInput = page.locator('.modal label:has-text("Descripción") textarea');
  await smoothClick(page, rDescInput);
  await rDescInput.fill('Enfoque de máxima activación de glúteo mayor y femorales con cadencia 3-0-1.');
  await delay(400);

  // Select Category
  const catSelect = page.locator('.modal label:has-text("Categoría") .select-trigger').first();
  await smoothClick(page, catSelect);
  await delay(500);
  const catOpt = page.locator('.select-option').first();
  await smoothClick(page, catOpt);
  await delay(600);

  // Submit button "Crear rutina"
  const saveRBtn = page.locator('.modal button.button.primary:has-text("Crear rutina")');
  await smoothClick(page, saveRBtn);
  await page.waitForSelector('.modal', { state: 'detached', timeout: 15000 });
  await delay(4000); // 4s pause to appreciate new routine card

  await delay(1000);
  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const videoPath = await video.path();
    const targetPath = path.join(__dirname, 'public', 'raw_feat_routine.webm');
    fs.copyFileSync(videoPath, targetPath);
    console.log('✓ Successfully re-captured raw_feat_routine.webm');
  }
}

run().catch(console.error);
