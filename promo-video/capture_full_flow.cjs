const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { resetDemoFull, close: closeDb } = require('./reset-demo-full.cjs');

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
    await delay(200);
    await page.mouse.click(targetX, targetY);
    await delay(300);
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
  console.log('--- Step 0: Resetting DB for clean real flow ---');
  await resetDemoFull();

  const outputDir = path.join(__dirname, 'raw-captures');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('--- Step 1: Launching 1080p recording browser on port 5173 ---');
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

  // ========================================================
  // SCENE 1: Student generates linking token
  // ========================================================
  console.log('--- SCENE 1: Student Token Generation ---');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await delay(800);

  const studentDemoBtn = page.locator('button:has-text("Alumno")').first();
  await smoothClick(page, studentDemoBtn);
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1200);

  // Navigate to /app/perfil
  await page.goto('http://localhost:5173/app/perfil', { waitUntil: 'networkidle' });
  await delay(1500);

  // Scroll to link coach card
  await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
  await delay(1000);

  // Click "Generar código"
  const generateBtn = page.locator('button:has-text("Generar código")');
  await smoothClick(page, generateBtn);

  // Wait for token card to appear
  await page.waitForSelector('.token-values strong', { timeout: 15000 });
  await delay(800);

  // Extract generated token and secret
  const tokenCode = (await page.locator('.token-values strong').textContent()).trim();
  const tokenSecret = (await page.locator('.token-values span').textContent()).trim();
  console.log(`Generated Real Token: Code=${tokenCode}, Secret=${tokenSecret}`);

  // Click "Copiar token completo"
  const copyBtn = page.locator('button:has-text("Copiar token completo")').or(page.locator('button:has-text("Copiado")')).first();
  await smoothClick(page, copyBtn);
  await delay(2500); // 2.5s pause to appreciate the generated token

  // ========================================================
  // SCENE 2: Coach consumes token via real API
  // ========================================================
  console.log('--- SCENE 2: Coach Consumes Token via API ---');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await delay(800);

  const coachDemoBtn = page.locator('button:has-text("Entrenador")').first();
  await smoothClick(page, coachDemoBtn);
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1200);

  await page.goto('http://localhost:5173/app/alumnos', { waitUntil: 'networkidle' });
  await delay(1200);

  // Click "Vincular alumno" button
  const linkModalBtn = page.locator('button:has-text("Vincular alumno")');
  await smoothClick(page, linkModalBtn);
  await delay(1000);

  // Enter code and secret into modal inputs
  const codeInput = page.locator('label:has-text("Código") input');
  await smoothClick(page, codeInput);
  await codeInput.fill(tokenCode);
  await delay(400);

  const secretInput = page.locator('label:has-text("Secreto") input');
  await smoothClick(page, secretInput);
  await secretInput.fill(tokenSecret);
  await delay(600);

  // Click submit "Vincular" inside modal
  const vincularSubmitBtn = page.locator('.modal button.button.primary:has-text("Vincular")');
  await smoothClick(page, vincularSubmitBtn);
  await delay(2500); // Wait for modal close and list refresh

  // ========================================================
  // SCENE 3: Full Student Screen Showcase (Profile, Injuries, Stats, PRs)
  // ========================================================
  console.log('--- SCENE 3: Full Student Profile & Medical Check ---');
  const anaCard = page.locator('a[href*="/app/alumnos/"]:has-text("Ana")').first();
  await smoothClick(page, anaCard);
  await page.waitForURL('**/app/alumnos/**', { timeout: 15000 });
  await delay(1500);

  // Smooth scroll down to Ficha Médica y Restricciones Físicas
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
  await delay(1200);

  // Hover over injuries alert
  const medicalCard = page.locator('text=Ficha Médica').first();
  if (await medicalCard.count() > 0) {
    await smoothMoveTo(page, medicalCard);
  }
  await delay(3500); // 3.5s pause to read medical & injury notes

  // Scroll down to stats, PRs and recent sessions
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
  await delay(2500); // 2.5s pause on stats, PRs and sessions

  // ========================================================
  // SCENE 4: Assign 2 Routines (Lunes Torso, Martes Pierna)
  // ========================================================
  console.log('--- SCENE 4: Assigning Torso (Mon) & Pierna (Tue) ---');
  // Scroll down to Weekly Routine Planner
  await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'smooth' }));
  await delay(1500);

  // 1. Assign Monday -> Torso
  console.log('Assigning Monday Torso...');
  const mondayAssignBtn = page.locator('.week-day:has-text("Lunes") button.week-add, .week-day:has-text("Lunes") button:has-text("Asignar")').first();
  await smoothClick(page, mondayAssignBtn);
  await page.waitForSelector('.modal', { state: 'attached', timeout: 10000 });
  await delay(800);

  // Click SelectTrigger
  const selectTrigger = page.locator('.modal .select-trigger').first();
  await smoothClick(page, selectTrigger);
  await delay(800);

  // Select "Torso · Tren superior"
  const torsoOption = page.locator('.select-option:has-text("Torso")').first();
  await smoothClick(page, torsoOption);
  await delay(800);

  // Click "Guardar asignación"
  const saveBtn1 = page.locator('.modal button.button.primary:has-text("Guardar")').first();
  await smoothClick(page, saveBtn1);
  await page.waitForSelector('.modal', { state: 'detached', timeout: 15000 });
  await delay(2000); // 2s pause to see Torso card rendered in Monday!

  // 2. Assign Tuesday -> Pierna (Fast)
  console.log('Assigning Tuesday Pierna...');
  const tuesdayAssignBtn = page.locator('.week-day:has-text("Martes") button.week-add, .week-day:has-text("Martes") button:has-text("Asignar")').first();
  await smoothClick(page, tuesdayAssignBtn);
  await page.waitForSelector('.modal', { state: 'attached', timeout: 10000 });
  await delay(800);

  const selectTrigger2 = page.locator('.modal .select-trigger').first();
  await smoothClick(page, selectTrigger2);
  await delay(600);

  const piernaOption = page.locator('.select-option:has-text("Pierna")').first();
  await smoothClick(page, piernaOption);
  await delay(600);

  const saveBtn2 = page.locator('.modal button.button.primary:has-text("Guardar")').first();
  await smoothClick(page, saveBtn2);
  await page.waitForSelector('.modal', { state: 'detached', timeout: 15000 });
  await delay(1500);

  // 3. Assign Today (Sábado) -> Torso so athlete has today's active workout
  console.log('Assigning Today (Saturday) Torso...');
  const saturdayAssignBtn = page.locator('.week-day:has-text("Sábado") button.week-add, .week-day:has-text("Sábado") button:has-text("Asignar")').first();
  if (await saturdayAssignBtn.count() > 0) {
    await smoothClick(page, saturdayAssignBtn);
    await page.waitForSelector('.modal', { state: 'attached', timeout: 10000 });
    await delay(600);

    const selectTrigger3 = page.locator('.modal .select-trigger').first();
    await smoothClick(page, selectTrigger3);
    await delay(500);

    const torsoOption2 = page.locator('.select-option:has-text("Torso")').first();
    await smoothClick(page, torsoOption2);
    await delay(500);

    const saveBtn3 = page.locator('.modal button.button.primary:has-text("Guardar")').first();
    await smoothClick(page, saveBtn3);
    await page.waitForSelector('.modal', { state: 'detached', timeout: 15000 });
  }
  await delay(2500); // 2.5s pause to see routines in planner!

  // ========================================================
  // SCENE 5: Student Executes & Completes Workout
  // ========================================================
  console.log('--- SCENE 5: Student Workout Execution ---');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await delay(800);

  const studentLogin2 = page.locator('button:has-text("Alumno")').first();
  await smoothClick(page, studentLogin2);
  await page.waitForURL('**/app**', { timeout: 15000 });
  await delay(1500);

  // Scroll down to today's workout card
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await delay(1200);

  // Click "Empezar entrenamiento"
  const startBtn = page.locator('button:has-text("Empezar"), a:has-text("Empezar")').first();
  if (await startBtn.count() > 0) {
    await smoothClick(page, startBtn);
    await delay(1800);
  }

  // Check off sets with visible click ripples
  const checkButtons = page.locator('button[title*="completar"], button.check-btn, .set-input button');
  const count = await checkButtons.count();
  if (count > 0) {
    await smoothClick(page, checkButtons.first());
    await delay(800);
    if (count > 1) {
      await smoothClick(page, checkButtons.nth(1));
      await delay(800);
    }
  }
  await delay(2000);

  // Click "Finalizar entrenamiento"
  const finishBtn = page.locator('button:has-text("Finalizar entrenamiento")').first();
  if (await finishBtn.count() > 0) {
    await smoothClick(page, finishBtn);
    await delay(1200);

    // Confirm modal "Confirmar y terminar"
    const confirmFinishBtn = page.locator('.modal button:has-text("Confirmar y terminar")').first();
    if (await confirmFinishBtn.count() > 0) {
      await smoothClick(page, confirmFinishBtn);
      await delay(2500);
    }
  }

  // ========================================================
  // SCENE 6: Student Views Updated Progress
  // ========================================================
  console.log('--- SCENE 6: Student Progress Validation ---');
  await page.goto('http://localhost:5173/app/progreso', { waitUntil: 'networkidle' });
  await delay(1500);

  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
  await delay(1200);

  // Hover over the latest session at top of history
  const latestSessionRow = page.locator('.list-row, tr, .session-item').first();
  if (await latestSessionRow.count() > 0) {
    await smoothMoveTo(page, latestSessionRow);
  }
  await delay(4000); // 4s pause to appreciate the completed routine in progress!

  console.log('--- Finalizing Video Capture ---');
  await delay(1000);

  const video = page.video();
  await context.close();
  await browser.close();
  await closeDb();

  if (video) {
    const videoPath = await video.path();
    console.log('Raw video saved to:', videoPath);
    const targetPath = path.join(outputDir, 'raw_full_flow.webm');
    fs.copyFileSync(videoPath, targetPath);

    const publicTarget = path.join(__dirname, 'public', 'raw_full_flow.webm');
    fs.copyFileSync(videoPath, publicTarget);
    console.log('Copied raw video to public/raw_full_flow.webm');
  }
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
