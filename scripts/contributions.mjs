// Draws the public GitHub contribution calendar as two SVGs (light and dark).
// Usage: node scripts/contributions.mjs
// If the data is missing or empty, it exits without touching the existing images.
import { mkdirSync, writeFileSync } from 'node:fs';

const USER = 'mateogsilvaa';
const res = await fetch(`https://github.com/users/${USER}/contributions`);
if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
const html = await res.text();

const total = html.match(/([\d,]+)\s+contributions?\s+in the last year/)?.[1];
const days = [...html.matchAll(/<td[^>]*data-date="([\d-]+)"[^>]*>/g)]
  .map((m) => ({ date: m[1], level: Number(m[0].match(/data-level="(\d)"/)?.[1] ?? 0) }))
  .sort((a, b) => a.date.localeCompare(b.date));
if (!total || total === '0' || days.length < 300) throw new Error('No contribution data: images left as they were');

const THEMES = {
  light: { text: '#1f2328', muted: '#59636e', levels: ['#e9e7e1', '#b9c2ff', '#7f8fff', '#5468ff', '#2b45ff'] },
  dark: { text: '#f0f6fc', muted: '#9198a1', levels: ['#1b1f27', '#1b2668', '#2436b0', '#2b45ff', '#8b9aff'] },
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STEP = 15, LEFT = 36, TOP = 62;
const start = new Date(`${days[0].date}T00:00:00Z`);
const offset = start.getUTCDay();

function draw({ text, muted, levels }) {
  const cells = [], labels = [];
  let lastMonth = -1, lastX = -100;
  let columns = 0;
  for (const { date, level } of days) {
    const d = new Date(`${date}T00:00:00Z`);
    const i = Math.round((d - start) / 86400000) + offset;
    const col = Math.floor(i / 7), row = i % 7, x = LEFT + col * STEP;
    columns = Math.max(columns, col + 1);
    cells.push(`<rect x="${x}" y="${TOP + row * STEP}" width="12" height="12" rx="2.5" fill="${levels[level]}"/>`);
    if (row === 0 && d.getUTCMonth() !== lastMonth) {
      lastMonth = d.getUTCMonth();
      if (x - lastX >= 34) {
        labels.push(`<text x="${x}" y="${TOP - 9}" font-size="11" fill="${muted}">${MONTHS[lastMonth]}</text>`);
        lastX = x;
      }
    }
  }
  const week = [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']]
    .map(([r, n]) => `<text x="4" y="${TOP + r * STEP + 10}" font-size="11" fill="${muted}">${n}</text>`);
  const w = LEFT + columns * STEP + 4, h = TOP + 7 * STEP + 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${total} contributions in the last year" font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
<text x="4" y="22" font-size="17" fill="${text}">${total} contributions in the last year</text>
${[...labels, ...week, ...cells].join('\n')}
</svg>
`;
}

mkdirSync('assets', { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) writeFileSync(`assets/contributions-${name}.svg`, draw(theme));
console.log(`${total} contributions, ${days.length} days`);
