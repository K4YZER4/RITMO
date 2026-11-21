const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { resetForCapture, close: closeDb } = require('./db-helper.cjs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Injected cursor + ripple click animation
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

    // Expanding ripple ring
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
    await delay(250);
    await page.mouse.click(targetX, targetY);
    await delay(350);
  } else {
    await locator.click();
  }
}

async function smoothMoveTo(page, locator, steps = 25) {
  const box = await locator.boundingBox();
  if (box) {
    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;
    await page.mouse.move(targetX, targetY, { steps });
  }
}

async function run() {
  console.log('--- Step 0: Resetting DB state for clean demo ---');
  await resetForCapture();

  const outputDir = path.join(__dirname, 'raw-captures');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('--- Step 1: Launching 1080p recording browser ---');
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

  // Auto-inject cursor and ripple animations into all pages/navigations
  await context.addInitScript(CLICK_INJECTION);

  const page = await context.newPage();

  // ==========================================
  // SCENE 1: Student generates linking token
  // ==========================================
  console.log('--- SCENE 1: Student Token Generation ---');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
  await delay(1000);

  // Click Student Demo Login
  const studentDemoBtn = page.locator('button:has-text("Alumno")').first();
  await smoothClick(page, studentDemoBtn);
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1500);

  // Go to Student Profile
  await page.goto('http://localhost:5174/app/perfil', { waitUntil: 'networkidle' });
  await delay(1500);

  // Smooth scroll down to Link Coach Card
  await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
  await delay(1200);

  // Click "Generar código"
  const generateBtn = page.locator('button:has-text("Generar código")');
  if (await generateBtn.count() > 0) {
    await smoothClick(page, generateBtn);
    await delay(1800);
  }

  // Hover and Click "Copiar token completo"
  const copyBtn = page.locator('button:has-text("Copiar token completo")').or(page.locator('button:has-text("Copiado")')).first();
  if (await copyBtn.count() > 0) {
    await smoothClick(page, copyBtn);
    await delay(3000); // Generous pause so viewer reads token and success state
  }

  // ==========================================
  // SCENE 2: Coach Links Student & Reviews Medical Sheet
  // ==========================================
  console.log('--- SCENE 2: Coach Links & Reviews Medical Sheet ---');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
  await delay(1000);

  const coachDemoBtn = page.locator('button:has-text("Entrenador")').first();
  await smoothClick(page, coachDemoBtn);
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1500);

  // Go to /app/alumnos
  await page.goto('http://localhost:5174/app/alumnos', { waitUntil: 'networkidle' });
  await delay(1500);

  // Click "Vincular alumno" button
  const linkModalBtn = page.locator('button:has-text("Vincular alumno")');
  if (await linkModalBtn.count() > 0) {
    await smoothClick(page, linkModalBtn);
    await delay(1500);

    // Click inside textarea/input or fill
    const pasteInput = page.locator('textarea, input[placeholder*="token"], input').first();
    if (await pasteInput.count() > 0) {
      await smoothClick(page, pasteInput);
      await delay(800);
    }

    // Close or submit modal
    const closeBtn = page.locator('button:has-text("Cancelar"), button.close-btn, .modal button').last();
    if (await closeBtn.count() > 0) {
      await smoothClick(page, closeBtn);
      await delay(1200);
    }
  }

  // Click Ana Fuerza card to view detail
  const anaCard = page.locator('a[href*="/app/alumnos/"]').first();
  if (await anaCard.count() > 0) {
    await smoothClick(page, anaCard);
    await delay(2000);
  }

  // Smooth scroll down to Ficha Médica y Restricciones
  await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
  await delay(1200);

  // Hover over the injuries alert card
  const medicalCard = page.locator('text=Ficha Médica').first();
  if (await medicalCard.count() > 0) {
    await smoothMoveTo(page, medicalCard);
  }
  await delay(4000); // 4 seconds generous pause on medical & injuries!

  // ==========================================
  // SCENE 3: Coach Programs Weekly Routine
  // ==========================================
  console.log('--- SCENE 3: Coach Programs Weekly Routine ---');
  // Scroll down to Weekly Routine Planner
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await delay(1500);

  // Smooth mouse movement across Monday and Tuesday routines
  await page.mouse.move(520, 500, { steps: 30 });
  await delay(800);
  await page.mouse.move(740, 500, { steps: 30 });
  await delay(800);
  await page.mouse.move(960, 500, { steps: 30 });
  await delay(3500); // Generous pause to appreciate routine layout

  // ==========================================
  // SCENE 4: Student Live Workout Execution
  // ==========================================
  console.log('--- SCENE 4: Student Live Workout Execution ---');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
  await delay(1000);

  const studentLoginAgain = page.locator('button:has-text("Alumno")').first();
  await smoothClick(page, studentLoginAgain);
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1500);

  // Scroll down to today's routine workout card
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await delay(1500);

  // Click on "Empezar" or workout card or check sets
  const startWorkoutBtn = page.locator('a:has-text("Empezar"), button:has-text("Empezar"), .routine-card, .btn-primary').first();
  if (await startWorkoutBtn.count() > 0) {
    await smoothClick(page, startWorkoutBtn);
    await delay(2000);
  }

  // Smooth click on set checkboxes/buttons with visible ripple
  const setCheckboxes = page.locator('button:has-text("Completar"), input[type="checkbox"], button.check-btn, tr button');
  if (await setCheckboxes.count() > 0) {
    await smoothClick(page, setCheckboxes.first());
    await delay(1200);
  }
  await delay(3500); // Generous pause to see completed set and weight

  // ==========================================
  // SCENE 5: Shared Mutual Progress & PRs
  // ==========================================
  console.log('--- SCENE 5: Mutual Progress Tracking ---');
  await page.goto('http://localhost:5174/app/progreso', { waitUntil: 'networkidle' });
  await delay(1500);

  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await delay(1500);

  // Smooth hover over chart/PR cards
  await page.mouse.move(600, 450, { steps: 25 });
  await delay(1000);
  await page.mouse.move(900, 450, { steps: 25 });
  await delay(3500); // Generous pause on progress metrics

  console.log('--- Finalizing Capture ---');
  await delay(1500);

  const video = page.video();
  await context.close();
  await browser.close();
  await closeDb();

  if (video) {
    const videoPath = await video.path();
    console.log('Raw video saved to:', videoPath);
    const targetPath = path.join(outputDir, 'raw_main_flow.webm');
    fs.copyFileSync(videoPath, targetPath);

    const publicTarget = path.join(__dirname, 'public', 'raw_main_flow.webm');
    fs.copyFileSync(videoPath, publicTarget);
    console.log('Copied raw video to public/raw_main_flow.webm');
  }
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
