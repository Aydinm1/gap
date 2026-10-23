import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('social preview is a square PNG with matching logo-only metadata',()=>{
 const bytes=readFileSync(new URL('../public/brand/gap-social-logo.png',import.meta.url));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),1200);
 assert.equal(bytes.readUInt32BE(20),1200);
 const layout=readFileSync(new URL('../src/app/layout.tsx',import.meta.url),'utf8');
 assert.match(layout,/gap-social-logo\.png',width:1200,height:1200/);
 assert.match(layout,/card:'summary'/);
 assert.doesNotMatch(layout,/gap-social-preview\.png|summary_large_image/);
 const renderer=readFileSync(new URL('../scripts/render-social-preview.mjs',import.meta.url),'utf8');
 assert.match(renderer,/180dc-uc-davis-compact-dark\.png/);
 assert.match(renderer,/object-fit:contain/);
 assert.doesNotMatch(renderer,/<h1|eyebrow|class="footer"/);
});
