import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveOtherBranchRecord, replaceBranchBatches } from '../src/utils/branchImport.js';

test('Main import replaces Main batches and preserves Polyclinic batches', () => {
  const result = replaceBranchBatches(
    [
      { batch_no: 'OLD-MAIN', qty: 4, branch_id: 'MAIN' },
      { batch_no: 'KEEP-POLY', qty: 9, branch_id: 'POLYCLINIC' }
    ],
    [{ batch_no: 'NEW-MAIN', qty: 435 }],
    'MAIN'
  );
  assert.deepEqual(result, [
    { batch_no: 'KEEP-POLY', qty: 9, branch_id: 'POLYCLINIC' },
    { batch_no: 'NEW-MAIN', qty: 435, branch_id: 'MAIN' }
  ]);
});

test('empty imported batch evidence clears only the target branch batches', () => {
  const result = replaceBranchBatches(
    [
      { batch_no: 'MAIN-1', qty: 4, branch_id: 'MAIN' },
      { batch_no: 'POLY-1', qty: 9, branch_id: 'POLYCLINIC' }
    ],
    undefined,
    'MAIN'
  );
  assert.deepEqual(result, [{ batch_no: 'POLY-1', qty: 9, branch_id: 'POLYCLINIC' }]);
});

test('replace snapshot retains a missing product when another branch owns stock', () => {
  const result = preserveOtherBranchRecord({
    code: 'D650',
    stock: 9,
    stock_shop1: 4,
    stock_shop2: 9,
    batches: [
      { batch_no: 'MAIN-1', qty: 4, branch_id: 'MAIN' },
      { batch_no: 'POLY-1', qty: 9, branch_id: 'POLYCLINIC' }
    ]
  }, 'stock_shop1', 'MAIN');
  assert.equal(result.stock_shop1, 0);
  assert.equal(result.stock_shop2, 9);
  assert.equal(result.stock, 0);
  assert.deepEqual(result.batches, [{ batch_no: 'POLY-1', qty: 9, branch_id: 'POLYCLINIC' }]);
});

test('replace snapshot drops a missing product with no other-branch stock', () => {
  const result = preserveOtherBranchRecord({
    code: 'D650',
    stock_shop1: 4,
    stock_shop2: 0,
    batches: [{ batch_no: 'MAIN-1', qty: 4, branch_id: 'MAIN' }]
  }, 'stock_shop1', 'MAIN');
  assert.equal(result, null);
});
