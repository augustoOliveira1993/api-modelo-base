import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCursorPaginationParams,
  applyPaginationParams,
  buildCursorFilter,
  buildCursorPaginatedResult,
  buildPaginatedResult,
  decodeCursor,
  encodeCursor,
} from './paginationHelpers';

test('applyPaginationParams calculates skip and preserves existing filters', () => {
  const result = applyPaginationParams(
    { page: '3', limit: '25', sortBy: 'name', sortDesc: 'false' },
    { status: 'ACTIVE' },
  );
  assert.deepEqual(result, {
    status: 'ACTIVE',
    limit: 25,
    skip: 50,
    sortBy: 'name',
    sortDesc: 'false',
  });
});

test('applyPaginationParams defaults to no limit and zero skip', () => {
  assert.deepEqual(applyPaginationParams({}, { status: 'ACTIVE' }), {
    status: 'ACTIVE',
    skip: 0,
  });
});

test('buildPaginatedResult returns pagination metadata', () => {
  const data = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(buildPaginatedResult(data, 52, { page: '2', limit: '25' }), {
    hasNext: true,
    total: 52,
    limit: 25,
    currentPage: 2,
    totalPages: 3,
    data,
  });
});

test('applyCursorPaginationParams prepares cursor metadata and fetches one extra record', () => {
  const cursor = encodeCursor({
    fieldValue: '2026-01-01T00:00:00.000Z',
    id: '507f1f77bcf86cd799439011',
  });
  assert.deepEqual(
    applyCursorPaginationParams(
      { pagination: 'cursor', cursor, limit: '20', cursorField: 'createdAt', cursorDirection: 'desc' },
      { status: 'ACTIVE' },
    ),
    {
      status: 'ACTIVE',
      limit: 21,
      sortBy: { createdAt: -1, _id: -1 },
      __cursorPagination: {
        limit: 20,
        cursor,
        cursorField: 'createdAt',
        cursorDirection: 'desc',
      },
    },
  );
});

test('buildCursorFilter creates seek query for compound cursors', () => {
  const cursor = encodeCursor({
    fieldValue: '2026-01-01T00:00:00.000Z',
    id: '507f1f77bcf86cd799439011',
  });
  assert.deepEqual(
    buildCursorFilter({ limit: 20, cursor, cursorField: 'createdAt', cursorDirection: 'desc' }),
    {
      $or: [
        { createdAt: { $lt: '2026-01-01T00:00:00.000Z' } },
        {
          createdAt: '2026-01-01T00:00:00.000Z',
          _id: { $lt: '507f1f77bcf86cd799439011' },
        },
      ],
    },
  );
});

test('buildCursorPaginatedResult trims extra record and returns next cursor', () => {
  const data = [
    { _id: '507f1f77bcf86cd799439011', createdAt: new Date('2026-01-03T00:00:00.000Z') },
    { _id: '507f1f77bcf86cd799439012', createdAt: new Date('2026-01-02T00:00:00.000Z') },
    { _id: '507f1f77bcf86cd799439013', createdAt: new Date('2026-01-01T00:00:00.000Z') },
  ];
  const result = buildCursorPaginatedResult(data, { pagination: 'cursor', limit: '2' });

  assert.equal(result.hasNext, true);
  assert.equal(result.limit, 2);
  assert.equal(result.data.length, 2);
  assert.ok(result.nextCursor);
  assert.deepEqual(decodeCursor(result.nextCursor), {
    fieldValue: '2026-01-02T00:00:00.000Z',
    id: '507f1f77bcf86cd799439012',
  });
});
