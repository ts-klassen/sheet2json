import { parseArrayBuffer } from '../src/utils/workbookLoader.js';

function stringToUint8Array(str) {
  return new Uint8Array(Buffer.from(str, 'utf8'));
}

describe('WorkbookLoader', () => {
  test('parses CSV array buffer into workbook structure', () => {
    const csv = 'Name,Value\nFoo,1\nBar,2';
    const buffer = stringToUint8Array(csv);

    const wb = parseArrayBuffer(buffer, 'sample.csv');

    expect(wb.sheets.length).toBe(1);
    expect(wb.activeSheet).toBe(wb.sheets[0]);
    const data = wb.data[wb.activeSheet];
    // First row should be header row ["Name", "Value"]
    expect(data[0]).toEqual(['Name', 'Value']);
    expect(data[1]).toEqual(['Foo', 1]);
  });

  test('throws descriptive error for unsupported extension', () => {
    const csv = 'foo';
    const buffer = new Uint8Array(Buffer.from(csv, 'utf8'));

    expect(() => parseArrayBuffer(buffer, 'image.png')).toThrow('Unsupported file type');
  });

  test('throws descriptive error for corrupt file', () => {
    // Provide random bytes that SheetJS cannot parse as any spreadsheet or CSV
    const random = new Uint8Array([0xff, 0xd8, 0x00, 0x00]);
    expect(() => parseArrayBuffer(random, 'data.xlsx')).toThrow('Unsupported or corrupt file');
  });
});
