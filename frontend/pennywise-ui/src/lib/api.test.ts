import { describe, expect, it } from 'vitest';
import { buildExpenseQuery } from './api';

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
