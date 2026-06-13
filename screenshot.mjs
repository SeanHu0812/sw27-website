import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const existing = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0', 10));
const next = nums.length ? Math.max(...nums) + 1 : 1;
const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outPath  = path.join(dir, filename);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-web-security'] });
const page    = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
await new Promise(r => setTimeout(r, 1200));

// Force all reveal animations to complete immediately
await page.evaluate(() => {
  // Disable transitions temporarily
  const style = document.createElement('style');
  style.id = 'no-transition';
  style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(style);
  // Force all reveal elements visible
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.add('will-animate', 'visible');
  });
});
await new Promise(r => setTimeout(r, 200));

// Re-enable transitions for the screenshot
await page.evaluate(() => {
  const s = document.getElementById('no-transition');
  if (s) s.remove();
});
await new Promise(r => setTimeout(r, 200));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log(`Saved: ${outPath}`);
