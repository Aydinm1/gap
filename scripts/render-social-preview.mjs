import {readFile,readdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
// Run after a local Next build; reuse its self-hosted Montserrat Latin font.
const fontName=(await readdir('.next/static/media')).find(n=>n.endsWith('-s.p.woff2'));
if(!fontName)throw Error('Build GAP first to obtain the self-hosted Montserrat font.');
const font=(await readFile(`.next/static/media/${fontName}`)).toString('base64');
const logo=(await readFile('public/brand/180dc-uc-davis-landscape-dark.png')).toString('base64');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.setContent(`<style>@font-face{font-family:Montserrat;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}*{box-sizing:border-box}body{margin:0;font-family:Montserrat;background:#f6f7f4;color:#434343}.card{width:1200px;height:630px;padding:62px 72px;border-top:12px solid #55b441;position:relative}img{width:320px;height:auto}.eyebrow{margin:64px 0 14px;color:#2f7328;font-size:18px;font-weight:700;letter-spacing:4px}h1{font-size:64px;line-height:1.12;letter-spacing:-2px;margin:0;font-weight:750}.footer{position:absolute;bottom:50px;left:72px;font-size:20px;color:#5f645f}</style><div class="card"><img src="data:image/png;base64,${logo}" alt="180 Degrees Consulting UC Davis"><p class="eyebrow">LEARN. APPLY. GROW.</p><h1>Growth Analyst<br>Program</h1><p class="footer">180 Degrees Consulting at UC Davis</p></div>`);
 await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluate(img=>img.decode());
 await page.screenshot({path:'public/brand/gap-social-preview.png'});
 console.log('Generated public/brand/gap-social-preview.png (1200 × 630).');
}finally{await browser.close();}
