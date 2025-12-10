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
