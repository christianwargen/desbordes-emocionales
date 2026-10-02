// node render.js "<archivo.html>" "<salida.pdf>" [previewPrefix]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const [src, out, prev] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
  await p.goto('file://' + path.resolve(src), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const issues = await p.evaluate(() => {
    const r = [];
    document.querySelectorAll('.page').forEach((pg, i) => {
      const pb = pg.getBoundingClientRect(); const lim = pb.bottom - 15 * 3.7795;
      pg.querySelectorAll('*').forEach(el => {
        if (el.closest('.foot') || el.closest('.cover')) return;
        const b = el.getBoundingClientRect();
        if (b.height > 0 && b.bottom > lim + 1) r.push(`p${i + 1}: ${el.tagName}.${el.className} sobra ${(b.bottom - lim).toFixed(0)}px :: ${(el.textContent || '').trim().slice(0, 50)}`);
      });
      if (pg.querySelector('.fonterr')) r.push('font');
    });
    return r;
  });
  const fontOk = await p.evaluate(() => document.fonts.check('12pt Manrope'));
  console.log('Manrope:', fontOk, '| desbordes:', issues.length);
  issues.slice(0, 40).forEach(x => console.log('  ' + x));
  await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  if (prev) {
    const n = await p.evaluate(() => document.querySelectorAll('.page').length);
    for (let i = 0; i < n; i++) {
      const el = (await p.$$('.page'))[i];
      await el.screenshot({ path: `${prev}-${String(i + 1).padStart(2, '0')}.png` });
    }
  }
  await b.close();
})();
