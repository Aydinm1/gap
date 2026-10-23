import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
// Compose the unmodified approved lockup on a square surface for thumbnail crops.
const logo=(await readFile('public/brand/180dc-uc-davis-compact-dark.png')).toString('base64');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1200},deviceScaleFactor:1});
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#f6f7f4;display:grid;place-items:center;width:1200px;height:1200px}img{width:900px;height:900px;object-fit:contain}</style><img src="data:image/png;base64,${logo}" alt="180 Degrees Consulting at UC Davis">`);
 await page.locator('img').evaluate(img=>img.decode());
 await page.screenshot({path:'public/brand/gap-social-logo.png'});
 console.log('Generated public/brand/gap-social-logo.png (1200 × 1200).');
}finally{await browser.close();}
