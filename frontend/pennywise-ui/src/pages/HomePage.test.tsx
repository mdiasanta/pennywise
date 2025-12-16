import { render, screen, waitFor } from '@testing-library/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, beforeEach, expect, type Mock } from 'vitest';

import { AuthProvider } from '@/hooks/use-auth';
import HomePage from './HomePage';
import type { DashboardSummary } from '@/lib/api';

const mockSummaryApi = vi.hoisted(() => ({
  getDashboard: vi.fn(),
})) as {
  getDashboard: Mock<(userId: number) => Promise<DashboardSummary>>;
};

const mockUserApi = vi.hoisted(() => ({
  getByEmail: vi.fn(),
  create: vi.fn(),
})) as {
  getByEmail: Mock<(email: string) => Promise<{ id: number } | null>>;
  create: Mock<(payload: { username: string; email: string }) => Promise<{ id: number }>>;
};

vi.mock('@/lib/api', () => ({
  summaryApi: mockSummaryApi,
  userApi: mockUserApi,
}));

// Mock fetch for auth API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const summaryResponse: DashboardSummary = {
  totalTracked: 1200,
  monthTracked: 500,
  monthChangePercent: 12.5,
  averageTicket: 50,
  activeCategories: 4,
  remainingThisMonth: 200,
  recentTransactions: [
    {
      id: 1,
      title: 'Groceries · Market Square',
      amount: 32.5,
      date: new Date().toISOString(),
      category: 'Food & Dining',
      categoryColor: '#FF6B6B',
    },
  ],
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserApi.getByEmail.mockResolvedValue({ id: 1 });
    mockUserApi.create.mockResolvedValue({ id: 1 });
    // Mock fetch for /api/me - return 401 to simulate not logged in
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });
  });

  const renderHome = () =>
    render(
      <GoogleOAuthProvider clientId="test-client-id">
        <AuthProvider>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </AuthProvider>
      </GoogleOAuthProvider>
    );

  it('shows loading states before data arrives', () => {
    mockSummaryApi.getDashboard.mockResolvedValue(summaryResponse);

    renderHome();

    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);
  });

  it('renders error state when summary fails', async () => {
    mockSummaryApi.getDashboard.mockRejectedValue(new Error('fail'));

    renderHome();

    expect(await screen.findByText(/unable to load your highlights/i)).toBeInTheDocument();
    expect(screen.getAllByText(/we couldn't load your cashflow/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/retry/i).length).toBeGreaterThan(0);
  });

  it('renders data from the summary API', async () => {
    mockSummaryApi.getDashboard.mockResolvedValue(summaryResponse);

    renderHome();

    await waitFor(() => expect(mockSummaryApi.getDashboard).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.textContent).toContain('$500.00'));
    await waitFor(() => expect(document.body.textContent).toContain('Groceries · Market Square'));
  });

  it('shows an empty state when no summary data exists', async () => {
    const emptySummary: DashboardSummary = {
      totalTracked: 0,
      monthTracked: 0,
      monthChangePercent: 0,
      averageTicket: 0,
      activeCategories: 0,
      remainingThisMonth: 0,
      recentTransactions: [],
    };
    mockSummaryApi.getDashboard.mockResolvedValue(emptySummary);
    mockUserApi.getByEmail.mockResolvedValue(null);

    renderHome();

    expect(await screen.findByText(/no spending to show yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no recent transactions yet/i)).toBeInTheDocument();
  });
});
