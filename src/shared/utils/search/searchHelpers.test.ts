import assert from 'node:assert/strict';
import test from 'node:test';
import { applySearchParam } from './searchHelpers';

test('applySearchParam returns the existing query when search is absent', () => {
  const baseQuery = { status: 'ACTIVE' };
  const result = applySearchParam({}, baseQuery, { textFields: ['name'] });
  assert.equal(result, baseQuery);
});

test('applySearchParam applies numeric search to a number field', () => {
  assert.deepEqual(
    applySearchParam(
      { search: '42' },
      { status: 'ACTIVE' },
      { numberFields: ['codigo'], textFields: ['name'] },
    ),
    { status: 'ACTIVE', codigo: 42 },
  );
});

test('applySearchParam applies case-insensitive text search', () => {
  const result = applySearchParam(
    { search: 'admin' },
    { status: 'ACTIVE' },
    { numberFields: ['codigo'], textFields: ['name', 'description'] },
  );

  assert.equal(result.status, 'ACTIVE');
  assert.equal(result.$or.length, 2);
  assert.equal(String(result.$or[0].name.$regex), '/admin/i');
  assert.equal(String(result.$or[1].description.$regex), '/admin/i');
});
