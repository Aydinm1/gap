import assert from 'node:assert/strict';
import test from 'node:test';
import { glob, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

test('built interaction styles provide restrained, accessible feedback', async t => {
  const sheets = [];
  for await (const path of glob('.next/static/css/**/*.css')) sheets.push(await readFile(path, 'utf8'));
  assert.ok(sheets.length, 'Build the application before checking its generated styles');
  const source = await readFile('src/components/admin/admin-overview.tsx', 'utf8');
  const classes = source.match(/<button className="([^"]+)" onClick=\{\(\)=>update\(\{assignment:assignment.id\}\)\}>View assignment/)[1];
  const browser = await chromium.launch({ executablePath: process.env.GAP_TEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    for (const touch of [false, true]) await t.test(touch ? 'phone tap feedback does not depend on hover' : 'desktop hover, keyboard focus, disabled and reduced-motion states', async () => {
      const context = await browser.newContext({ viewport: { width: touch ? 390 : 1280, height: 900 }, hasTouch: touch, isMobile: touch });
      try {
        const page = await context.newPage();
        await page.setContent(`<main style="padding:24px"><button id="action" class="${classes}">View assignment →</button><a id="link" class="action-link text-action" href="#target">Review →</a><button id="disabled" class="action-link text-action" disabled>Unavailable</button><button id="aria-disabled" class="action-link text-action" aria-disabled="true">Unavailable</button><details><summary>More</summary>Details</details><label>Choose<input type="checkbox"></label><select aria-label="Week"><option>Week 1</option></select><input aria-label="Search" type="text"><input type="file"><p id="target">Target</p></main>`);
        await page.addStyleTag({ content: sheets.join('\n') });
        const action = page.locator('#action');
        const style = selector => page.locator(selector).evaluate(el => { const s = getComputedStyle(el); return { cursor: s.cursor, color: s.color, underline: s.textDecorationLine, outline: s.outlineStyle, outlineWidth: s.outlineWidth, transition: s.transitionDuration }; });
        for (const selector of ['#action', '#link', 'summary', 'label', 'input[type=checkbox]', 'input[type=file]', 'select']) assert.equal((await style(selector)).cursor, 'pointer', selector);
        for (const selector of ['#disabled', '#aria-disabled']) assert.equal((await style(selector)).cursor, 'not-allowed');
        assert.notEqual((await style('input[type=text]')).cursor, 'pointer');
        assert.equal((await style('#action')).underline, 'none');
        const before = await action.boundingBox();
        if (!touch) {
          const color = (await style('#action')).color;
          await action.hover();
          await page.waitForFunction(() => getComputedStyle(document.querySelector('#action')).color === 'rgb(39, 95, 34)');
          assert.notEqual((await style('#action')).color, color);
          assert.equal((await style('#action')).underline, 'underline');
          assert.deepEqual(await action.boundingBox(), before, 'Hover must not shift or resize the target');
          for (const selector of ['#disabled', '#aria-disabled']) { await page.locator(selector).hover(); assert.equal((await style(selector)).underline, 'none'); }
          await page.mouse.move(0, 0); await page.keyboard.press('Tab');
          assert.equal(await action.evaluate(el => el === document.activeElement), true);
          assert.equal((await style('#action')).outline, 'solid');
          assert.equal((await style('#action')).outlineWidth, '3px');
          assert.equal((await style('#action')).underline, 'underline');
          await page.emulateMedia({ reducedMotion: 'reduce' });
          assert.ok(parseFloat((await style('#action')).transition) <= 0.001);
        } else {
          assert.equal(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), false);
          await action.tap();
          assert.ok(await action.evaluate(el => el === document.activeElement));
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
      } finally { await context.close(); }
    });
  } finally { await browser.close(); }
});
