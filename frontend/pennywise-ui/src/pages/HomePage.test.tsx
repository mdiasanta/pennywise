import { render, screen, waitFor } from "@testing-library/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "./HomePage";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock fetch for auth API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      </GoogleOAuthProvider>,
    );

  it("renders the marketing hero section", async () => {
    renderHome();

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/a calmer home for your spending/i)
    );
    expect(screen.getByText(/intentional money management/i)).toBeInTheDocument();
  });

  it("renders the features section", async () => {
    renderHome();

    await waitFor(() =>
      expect(screen.getAllByText(/designed for clarity/i).length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText(/live spend radar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/smart categories/i).length).toBeGreaterThan(0);
  });

  it("renders the workflow section", async () => {
    renderHome();

    await waitFor(() =>
      expect(screen.getAllByText(/from capture to clarity/i).length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText(/capture once/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/auto-classify/i).length).toBeGreaterThan(0);
  });

  it("redirects authenticated users to dashboard", async () => {
    // Mock fetch to return authenticated user
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, email: "test@example.com", name: "Test User" }),
    });

    renderHome();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    );
  });

  it("does not redirect unauthenticated users", async () => {
    // Reset mock to return 401 for this test
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });
    
    renderHome();

    // Wait for page content to render (proves we're not redirecting)
    await waitFor(() =>
      expect(screen.getAllByText(/pennywise/i).length).toBeGreaterThan(0)
    );

    // Navigate should not have been called with /dashboard
    expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard");
  });
});
