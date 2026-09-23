import { deflateRawSync } from 'node:zlib';
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function zipFiles(files) {
  const local = [], central = []; let offset = 0;
  for (const [filename, content] of Object.entries(files)) {
    const name = Buffer.from(filename), raw = Buffer.from(content), compressed = deflateRawSync(raw), crc = crc32(raw);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(8, 8); header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(raw.length, 22); header.writeUInt16LE(name.length, 26);
    const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(8, 10); directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(compressed.length, 20); directory.writeUInt32LE(raw.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42);
    local.push(header, name, compressed); central.push(directory, name); offset += header.length + name.length + compressed.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}
export const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
export function office(ext, overrides = {}) {
  const main = { docx: 'word/document.xml', pptx: 'ppt/presentation.xml', xlsx: 'xl/workbook.xml' }[ext];
  const kind = { docx: 'wordprocessingml.document', pptx: 'presentationml.presentation', xlsx: 'spreadsheetml.sheet' }[ext];
  const root = { docx: 'document', pptx: 'presentation', xlsx: 'workbook' }[ext];
  return zipFiles({ '[Content_Types].xml': `<Types><Override PartName="/${main}" ContentType="application/vnd.openxmlformats-officedocument.${kind}.main+xml"/></Types>`, '_rels/.rels': `<Relationships><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${main}"/></Relationships>`, [main]: `<${root}/>`, ...overrides });
}
