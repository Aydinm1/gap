import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectFile } from '../src/lib/uploads/inspect.ts';
import { fileError, fileMime, MAX_FILE_BYTES } from '../src/lib/uploads/format.ts';
import { pdf, office, zipFiles } from './upload-fixtures.mjs';

test('all four supported file formats receive bounded structure validation', async () => {
  for (const ext of ['pdf','docx','pptx','xlsx']) {
    const bytes = ext === 'pdf' ? pdf : office(ext);
    await inspectFile(bytes, `Résumé final.${ext}`, fileMime(`x.${ext}`), bytes.length);
  }
});
test('file descriptors reject empty, oversized, mismatched and unsafe names', () => {
  for (const value of [null, undefined, 42, {}, {name:42,size:1,type:''}, {name:'x.pdf',size:'1',type:''}]) assert.ok(fileError(value));
  assert.equal(fileError({name:'final.PDF',size:MAX_FILE_BYTES,type:'application/pdf'}),undefined);
  for (const f of [{name:'x.pdf',size:0,type:''},{name:'x.pdf',size:MAX_FILE_BYTES+1,type:''},{name:'x.docx',size:10,type:'application/pdf'},{name:'../x.pdf',size:10,type:''},{name:'x\n.pdf',size:10,type:''},{name:'x.exe',size:10,type:''}]) assert.ok(fileError(f));
});
test('malformed, mismatched and hostile file structures are rejected', async () => {
  const invalid = [
    ['x.pdf', Buffer.from('not pdf')], ['x.pdf', pdf.subarray(0,20)],
    ['x.docx',office('pptx')], ['x.xlsx',pdf], ['x.docx', Buffer.from('PKbad')],
    ['x.docx',zipFiles({'word/document.xml':'<document/>'})],
    ['x.docx',office('docx',{'word/document.xml':'<document>'})],
    ['x.docx',office('docx',{'word/document.xml':'<!DOCTYPE document [<!ENTITY xx "a">]><document/>'})],
    ['x.docx',office('docx',{'word/document.xml':'x'.repeat(4*1024*1024+1)})],
  ];
  for (const [name,bytes] of invalid) await assert.rejects(inspectFile(bytes,name,fileMime(name),bytes.length));
  await assert.rejects(inspectFile(pdf,'x.pdf','application/pdf',pdf.length+1));
});
