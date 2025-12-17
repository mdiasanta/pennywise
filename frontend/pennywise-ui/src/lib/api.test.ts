import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildExpenseQuery, expenseApi } from './api';

describe('buildExpenseQuery', () => {
  it('returns empty string when filters are missing', () => {
    expect(buildExpenseQuery()).toBe('');
  });

  it('creates a query string with all filters', () => {
    const query = buildExpenseQuery({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      categoryId: 3,
      search: 'rent',
    });

    expect(query).toBe('startDate=2025-01-01&endDate=2025-01-31&categoryId=3&search=rent');
  });

  it('omits empty filter values', () => {
    const query = buildExpenseQuery({
      startDate: '',
      endDate: undefined,
      categoryId: undefined,
      search: '   ',
    });

    expect(query).toBe('');
  });
});

describe('expenseApi.export', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds export request with filters and parses filename', async () => {
    const response = new Response('csvdata', {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="test.csv"',
        'Content-Type': 'text/csv',
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await expenseApi.export(5, 'csv', { search: 'rent' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('userId=5'),
      expect.objectContaining({
        headers: { Accept: 'text/csv' },
      })
    );
    expect(result.filename).toBe('test.csv');
  });

  it('decodes RFC5987 filename* header', async () => {
    const response = new Response('csvdata', {
      status: 200,
      headers: {
        'Content-Disposition': "attachment; filename*=UTF-8''expenses%20%C3%BC.csv",
        'Content-Type': 'text/csv',
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const result = await expenseApi.export(1, 'csv');
    expect(result.filename).toBe('expenses ü.csv');
  });

  it('throws on failed export response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('fail', { status: 500 })));
    await expect(expenseApi.export(1, 'csv')).rejects.toThrow('fail');
  });
});

describe('expenseApi.importExpenses and template download', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts multipart form data with options', async () => {
    const mockResponse = {
      fileName: 'file.csv',
      dryRun: true,
      duplicateStrategy: 'update',
      totalRows: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      rows: [],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const file = new File(['row'], 'expenses.csv', { type: 'text/csv' });
    await expenseApi.importExpenses(2, file, {
      duplicateStrategy: 'update',
      timezone: 'UTC',
      dryRun: true,
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = options?.body as FormData;
    expect(options?.method).toBe('POST');
    expect(body.get('userId')).toBe('2');
    expect(body.get('duplicateStrategy')).toBe('update');
    expect(body.get('timezone')).toBe('UTC');
    expect(body.get('dryRun')).toBe('true');
    expect(body.get('file')).toBeTruthy();
  });

  it('throws when import fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 400 })));
    const file = new File(['row'], 'expenses.csv', { type: 'text/csv' });
    await expect(expenseApi.importExpenses(1, file)).rejects.toThrow('bad');
  });

  it('parses template filenames', async () => {
    const response = new Response('csvdata', {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="expenses-template.csv"',
        'Content-Type': 'text/csv',
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    const { filename } = await expenseApi.downloadTemplate('csv');
    expect(filename).toBe('expenses-template.csv');
  });
});

describe('assetSnapshotApi.createBulk', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts bulk snapshots and returns result', async () => {
    const mockResult = {
      created: 2,
      updated: 1,
      snapshots: [
        { id: 1, assetId: 5, balance: 1000, date: '2025-01-01T00:00:00Z' },
        { id: 2, assetId: 5, balance: 1500, date: '2025-02-01T00:00:00Z' },
        { id: 3, assetId: 5, balance: 2000, date: '2025-03-01T00:00:00Z' },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { assetSnapshotApi } = await import('./api');

    const result = await assetSnapshotApi.createBulk({
      assetId: 5,
      entries: [
        { balance: 1000, date: '2025-01-01T00:00:00Z' },
        { balance: 1500, date: '2025-02-01T00:00:00Z' },
        { balance: 2000, date: '2025-03-01T00:00:00Z' },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/assetsnapshots/bulk'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(result.created).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.snapshots).toHaveLength(3);
  });

  it('throws when bulk create fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad request', { status: 400 })));
    const { assetSnapshotApi } = await import('./api');

    await expect(
      assetSnapshotApi.createBulk({
        assetId: 1,
        entries: [{ balance: 1000, date: '2025-01-01T00:00:00Z' }],
      })
    ).rejects.toThrow('Bad request');
  });
});
