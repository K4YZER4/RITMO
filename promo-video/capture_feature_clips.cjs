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

async function captureClip(clipName, runFlow) {
  console.log(`\n========================================`);
  console.log(`>>> Starting Capture: ${clipName}`);
  console.log(`========================================`);

  const outputDir = path.join(__dirname, 'raw-captures');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

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

  try {
    await runFlow(page);
  } catch (err) {
    console.error(`Error in clip ${clipName}:`, err);
  } finally {
    await delay(1000);
    const video = page.video();
    await context.close();
    await browser.close();

    if (video) {
      const videoPath = await video.path();
      const targetPath = path.join(__dirname, 'public', `${clipName}.webm`);
      fs.copyFileSync(videoPath, targetPath);
      console.log(`✓ Saved ${clipName}.webm to public directory.`);
    }
  }
}

async function run() {
  // ----------------------------------------------------
  // CLIP 1: Weight & Metric Tracking (/app/progreso)
  // ----------------------------------------------------
  await captureClip('raw_feat_weight', async (page) => {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await delay(600);
    await smoothClick(page, page.locator('button:has-text("Alumno")').first());
    await page.waitForURL('**/app**', { timeout: 15000 });
    await delay(1000);

    await page.goto('http://localhost:5173/app/progreso', { waitUntil: 'networkidle' });
    await delay(1200);

    // Scroll to measurement form
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await delay(1000);

    // Fill peso
    const pesoInput = page.locator('label:has-text("Peso (kg)") input');
    await smoothClick(page, pesoInput);
    await pesoInput.fill('76.2');
    await delay(500);

    // Fill grasa
    const grasaInput = page.locator('label:has-text("Grasa corporal (%)") input');
    await smoothClick(page, grasaInput);
    await grasaInput.fill('16.8');
    await delay(600);

    // Click Guardar medición
    const saveBtn = page.locator('button:has-text("Guardar medición")');
    await smoothClick(page, saveBtn);
    await delay(4000); // 4s pause to appreciate updated card, chart, and history
  });

  // ----------------------------------------------------
  // CLIP 2: Custom Exercise Creation (/app/ejercicios)
  // ----------------------------------------------------
  await captureClip('raw_feat_exercise', async (page) => {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await delay(600);
    await smoothClick(page, page.locator('button:has-text("Entrenador")').first());
    await page.waitForURL('**/app**', { timeout: 15000 });
    await delay(1000);

    await page.goto('http://localhost:5173/app/ejercicios', { waitUntil: 'networkidle' });
    await delay(1500);

    // Click "Nuevo ejercicio"
    const newBtn = page.locator('button:has-text("Nuevo ejercicio")');
    await smoothClick(page, newBtn);
    await page.waitForSelector('.modal', { state: 'attached', timeout: 10000 });
    await delay(800);

    // Fill Name
    const nameInput = page.locator('.modal label:has-text("Nombre") input');
    await smoothClick(page, nameInput);
    await nameInput.fill('Remo Unilateral en Polea Baja');
    await delay(500);

    // Fill Description
    const descInput = page.locator('.modal label:has-text("Descripción") textarea');
    await smoothClick(page, descInput);
    await descInput.fill('Mantener columna neutra y codo pegado al torso con 1s de contracción.');
    await delay(500);

    // Select Muscle
    const muscleSelect = page.locator('.modal label:has-text("Músculos") .select-trigger');
    if (await muscleSelect.count() > 0) {
      await smoothClick(page, muscleSelect);
      await delay(500);
      const opt = page.locator('.select-option').first();
      if (await opt.count() > 0) await smoothClick(page, opt);
      await delay(500);
    }

    // Submit
    const submitBtn = page.locator('.modal button.button.primary:has-text("Guardar")');
    await smoothClick(page, submitBtn);
    await page.waitForSelector('.modal', { state: 'detached', timeout: 15000 });
    await delay(4000); // 4s pause to view created exercise card
  });

  // ----------------------------------------------------
  // CLIP 3: Create & Organize Routine (/app/rutinas)
  // ----------------------------------------------------
  await captureClip('raw_feat_routine', async (page) => {
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
    const catSelect = page.locator('.modal .select-trigger').first();
    if (await catSelect.count() > 0) {
      await smoothClick(page, catSelect);
      await delay(500);
      const catOpt = page.locator('.select-option').first();
      if (await catOpt.count() > 0) await smoothClick(page, catOpt);
      await delay(500);
    }

    // Save
    const saveRBtn = page.locator('.modal button.button.primary:has-text("Guardar")');
    await smoothClick(page, saveRBtn);
    await page.waitForSelector('.modal', { state: 'detached', timeout: 15000 });
    await delay(4000); // 4s pause to see routine in list
  });

  // ----------------------------------------------------
  // CLIP 4: Athlete Notes & Live Workout Logging
  // ----------------------------------------------------
  await captureClip('raw_feat_notes', async (page) => {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await delay(600);
    await smoothClick(page, page.locator('button:has-text("Alumno")').first());
    await page.waitForURL('**/app**', { timeout: 15000 });
    await delay(1200);

    // Scroll to today's workout
    await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
    await delay(800);

    const startBtn = page.locator('button:has-text("Empezar"), a:has-text("Empezar")').first();
    if (await startBtn.count() > 0) {
      await smoothClick(page, startBtn);
      await delay(1500);
    }

    // Click "Añadir nota o molestia para este ejercicio"
    const addNoteBtn = page.locator('button:has-text("Añadir nota"), button:has-text("molestia")').first();
    if (await addNoteBtn.count() > 0) {
      await smoothClick(page, addNoteBtn);
      await delay(600);

      const noteTextarea = page.locator('textarea[placeholder*="sensaciones"], textarea').first();
      if (await noteTextarea.count() > 0) {
        await smoothClick(page, noteTextarea);
        await noteTextarea.fill('RPE 8.5 · Molestia leve en muñeca izquierda en la última serie.');
        await delay(600);

        const saveNoteBtn = page.locator('button:has-text("Guardar nota")').first();
        if (await saveNoteBtn.count() > 0) {
          await smoothClick(page, saveNoteBtn);
          await delay(1000);
        }
      }
    }

    // Check off completed sets
    const checkButtons = page.locator('button[title*="completar"], button.check-btn, .set-input button');
    if (await checkButtons.count() > 0) {
      await smoothClick(page, checkButtons.first());
      await delay(800);
      if (await checkButtons.count() > 1) {
        await smoothClick(page, checkButtons.nth(1));
        await delay(800);
      }
    }

    await delay(4000); // 4s pause to appreciate live note badge & checked sets
  });

  // ----------------------------------------------------
  // CLIP 5: Plan Quotas & Coach Roster Overview
  // ----------------------------------------------------
  await captureClip('raw_feat_limits', async (page) => {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await delay(600);
    await smoothClick(page, page.locator('button:has-text("Entrenador")').first());
    await page.waitForURL('**/app**', { timeout: 15000 });
    await delay(1000);

    // Go to /app/alumnos to showcase all students from seed
    await page.goto('http://localhost:5173/app/alumnos', { waitUntil: 'networkidle' });
    await delay(2000);

    // Scroll down through roster
    await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
    await delay(2000);

    // Go to /app/plan
    await page.goto('http://localhost:5173/app/plan', { waitUntil: 'networkidle' });
    await delay(1500);

    // Scroll down to see limits and Stripe upgrade button
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await delay(3500); // 3.5s pause to read plan cards & limits
  });
}

run().then(() => {
  console.log('\n>>> All feature clips captured successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
