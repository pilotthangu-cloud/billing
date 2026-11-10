import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modalSource = fs.readFileSync(new URL('../src/components/DotMatrixReceiptModal.jsx', import.meta.url), 'utf8');
const electronSource = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');

test('manual Electron print imports the formatter it executes', () => {
  assert.match(modalSource, /import\s*\{[^}]*formatTvsBillLines[^}]*generateTvsEscPosStream[^}]*\}\s*from\s*['"]\.\.\/utils\/tvsPrinterEngine['"]/s);
  assert.match(modalSource, /formatTvsBillLines\(billData\)/);
});

test('raw printing never falls back to the default or first unrelated printer', () => {
  assert.doesNotMatch(electronSource, /\.Default\s*-eq\s*\$true/);
  assert.doesNotMatch(electronSource, /\$allPrinters\[0\]/);
  assert.match(electronSource, /Configured TVS\/MSP printer was not found/);
});

test('raw printing requires a complete byte write and has a bounded timeout', () => {
  assert.match(electronSource, /dwWritten\s*==\s*pBytes\.Length/);
  assert.match(electronSource, /TVS printer did not respond within 15 seconds/);
  assert.match(electronSource, /setTimeout\([^]*15000\)/s);
});
