# Pennywise AI Coding Instructions

Personal finance expense tracking app with React frontend and .NET backend.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React + Vite   │────▶│  .NET 10 API    │────▶│  PostgreSQL 16  │
│  :3000 / :5173  │     │     :8080       │     │     :5432       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

- **Frontend**: `frontend/pennywise-ui/` - React 19 + TypeScript + Vite + shadcn/ui + Tailwind
- **Backend**: `backend/Pennywise.Api/` - .NET 10 Web API with EF Core + Npgsql
- **Auth**: Google Sign-In (ID token → HttpOnly session cookie)

## Backend Patterns (.NET)

**Layered architecture**: Controller → Service → Repository → DbContext

```
Controllers/     # HTTP endpoints, route to /api/[controller]
Services/        # Business logic with I*Service interfaces
Repositories/    # Data access with I*Repository interfaces
DTOs/            # Request/response objects (never expose Models directly)
Models/          # EF Core entities
```

**Key conventions**:

- All services/repos registered via DI in `Program.cs` as `AddScoped<Interface, Implementation>`
- Migrations auto-apply in development (`db.Database.Migrate()`)
- DateTime values use UTC - see `Helpers/DateTimeHelpers.cs` for `.ToUtc()` extension
- API returns DTOs, map with `MapToDto()` methods in services

## Frontend Patterns (React)

**Structure**:

```
src/
  components/       # App components (AppLayout, UserMenu, etc.)
  components/ui/    # shadcn/ui components - DO NOT manually edit
  hooks/            # Custom hooks (use-auth, use-categories, use-toast)
  lib/api.ts        # API client with typed interfaces matching backend DTOs
  pages/            # Route components (HomePage, DashboardPage, etc.)
```

**Key patterns**:

- Path alias: use `@/` for imports (e.g., `import { Button } from "@/components/ui/button"`)
- API calls use `credentials: 'include'` for cookie auth
- Auth context via `useAuth()` hook from `use-auth.tsx`
- Toast notifications via `useToast()` hook
- All app pages use `<AppLayout>` wrapper with sidebar navigation

## Development Commands

```bash
# Full stack with Docker
cp .env.example .env  # Configure Google Client ID
docker compose --profile app up --build

# Frontend only (dev container or local)
cd frontend/pennywise-ui
npm run dev           # Vite dev server :5173
npm run format        # Prettier (excludes components/ui/)
npm run lint          # ESLint
npm run test          # Vitest

# Backend only (dev container or local)
cd backend/Pennywise.Api
dotnet run            # API server :8080
dotnet ef migrations add <Name>  # New migration
```

## Environment Configuration

All config via `.env` file (see `.env.example`):

- `Authentication__Google__ClientId` - Backend Google OAuth validation
- `VITE_GOOGLE_CLIENT_ID` - Frontend Google Sign-In button
- `ConnectionStrings__DefaultConnection` - PostgreSQL connection

## Adding New Features

**New API endpoint**: Create Controller → Service (+ interface) → Repository (+ interface) → DTO → Register in Program.cs

**New frontend page**: Add to `src/pages/` → Add route in `App.tsx` → Use `<AppLayout>` for app pages

**New shadcn/ui component**: Use `npx shadcn@latest add <component>` - don't manually create in `components/ui/`
