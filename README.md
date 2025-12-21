# Pennywise

Pennywise personal finance application for expense tracking

## Architecture

This is a monorepo containing:

- **Frontend**: React application with TypeScript, Vite, and shadcn/ui components
- **Backend**: .NET 10 Web API
- **Database**: PostgreSQL 16

## Prerequisites

- Docker and Docker Compose installed
- (Optional) Node.js 20+ and .NET 10 SDK for local development
- (Optional) VS Code with Dev Containers extension for containerized development

## Quick Start

### Option 1: Using Dev Container (Recommended)

The easiest way to get started is using VS Code Dev Containers:

1. Install [VS Code](https://code.visualstudio.com/) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open the project in VS Code
3. Press `F1` and select "Dev Containers: Reopen in Container"
4. Wait for the container to build (first time only)

The dev container includes:

- All required development tools (Node.js, .NET 10, Git, GitHub CLI)
- Pre-configured VS Code extensions (ESLint, Prettier, Tailwind CSS, C#, GitHub Copilot, etc.)
- Automatic port forwarding for frontend (3000), backend (8080), and database (5432)

See [.devcontainer/README.md](.devcontainer/README.md) for detailed documentation.

### Option 2: Using Docker Compose

Run the entire application stack with Docker Compose:

1. Copy the example environment file and configure it:

   ```bash
   cp .env.example .env
   # Edit .env with your Google Client ID (see README-auth.md for setup)
   ```

2. Start the application:
   ```bash
   docker compose --profile app up --build
   ```

This will start:

- PostgreSQL database on port 5432
- Backend API on http://localhost:8080
- Frontend application on http://localhost:3000

## Development

### Backend Development

Navigate to the backend directory:

```bash
cd backend/Pennywise.Api
dotnet restore
dotnet run
```

The API will be available at http://localhost:8080

### Frontend Development

Navigate to the frontend directory:

```bash
cd frontend/pennywise-ui
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

## Project Structure

```
pennywise/
├── .devcontainer/
│   ├── devcontainer.json        # Dev container configuration
│   └── README.md                # Dev container documentation
├── backend/
│   └── Pennywise.Api/           # .NET Web API project
│       ├── Program.cs
│       ├── Pennywise.Api.csproj
│       ├── Dockerfile
│       ├── Controllers/         # API endpoints
│       ├── Services/            # Business logic
│       ├── Repositories/        # Data access
│       ├── Models/              # EF Core entities
│       └── DTOs/                # Request/response objects
├── frontend/
│   └── pennywise-ui/            # React + TypeScript + Vite
│       ├── src/
│       │   ├── components/
│       │   │   ├── AppLayout.tsx    # Shared app layout with sidebar navigation
│       │   │   ├── ThemeToggle.tsx  # Dark/light theme switcher
│       │   │   ├── net-worth/       # Net worth tracking components
│       │   │   └── ui/              # shadcn/ui components (30+ components)
│       │   ├── pages/
│       │   │   ├── HomePage.tsx     # Landing page
│       │   │   ├── DashboardPage.tsx # Dashboard with analytics
│       │   │   ├── ExpensesPage.tsx  # Expense management
│       │   │   ├── CategoriesPage.tsx # Category management
│       │   │   ├── TagsPage.tsx     # Tag management
│       │   │   └── NetWorthPage.tsx # Net worth tracking
│       │   ├── hooks/               # Custom React hooks
│       │   └── lib/                 # API client and utilities
│       ├── package.json
│       ├── vite.config.ts
│       └── Dockerfile
├── docker-compose.yml           # Docker orchestration
└── README.md
```

## Features

- **Expense Tracking**: Add, edit, delete expenses with categories and tags
- **Custom Categories**: Create personalized categories with colors
- **Flexible Tags**: Tag expenses for cross-cutting views (trips, projects, etc.)
- **Net Worth Tracking**: Monitor assets and liabilities over time
- **Balance History**: Track account balances with projections
- **Recurring Transactions**: Manage recurring income and expenses
- **Dashboard Analytics**: Visual summaries with pie charts, bar charts, and year-over-year comparisons
- **Import/Export**: Import transactions from CSV, export to CSV/Excel
- **Google Sign-In**: Secure authentication via Google OAuth
- **Dark/Light Theme**: Toggle between themes
- **PWA Support**: Install as a progressive web app

## Technologies

### Frontend

- React 19
- TypeScript
- Vite (with PWA plugin)
- Tailwind CSS
- shadcn/ui components (30+ components including accordion, alert, avatar, badge, button, card, checkbox, dialog, dropdown, forms, tables, and more)
- Radix UI primitives
- Recharts (for dashboard visualizations)
- React Router DOM
- Nginx (for production)

### Backend

- .NET 10
- ASP.NET Core Web API
- Entity Framework Core with Npgsql
- Google OAuth ID token validation
- OpenAPI/Swagger

### Database

- PostgreSQL 16

## Environment Variables

### Backend

- `ASPNETCORE_ENVIRONMENT`: Development/Production
- `ConnectionStrings__DefaultConnection`: PostgreSQL connection string

### Database

- `POSTGRES_DB`: pennywise
- `POSTGRES_USER`: pennywise
- `POSTGRES_PASSWORD`: pennywise_password

## Docker Services

- **postgres**: PostgreSQL database with health checks
- **backend**: .NET Web API with automatic restart
- **frontend**: React app served by Nginx
- **devcontainer**: Development environment with Node.js, .NET, and all necessary tools

All services communicate through a dedicated Docker network (`pennywise-network`).

## Database Backup

### Creating a Backup

To create a SQL backup of the PostgreSQL database:

```bash
# Backup to a timestamped file
docker compose -f compose.yml exec postgres pg_dump -U pennywise pennywise > backup_$(date +%Y%m%d_%H%M%S).sql

# Or backup to a specific filename
docker compose -f compose.yml exec postgres pg_dump -U pennywise pennywise > backup.sql
```

### Restoring from Backup

To restore the database from a backup file:

```bash
# First, terminate active connections and drop/recreate the database
# (Must connect to 'postgres' db, not the one being dropped)
docker compose -f compose.yml exec -T postgres psql -U pennywise -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pennywise' AND pid <> pg_backend_pid();"
docker compose -f compose.yml exec -T postgres psql -U pennywise -d postgres -c "DROP DATABASE IF EXISTS pennywise;"
docker compose -f compose.yml exec -T postgres psql -U pennywise -d postgres -c "CREATE DATABASE pennywise;"

# Restore from backup file
docker compose -f compose.yml exec -T postgres psql -U pennywise pennywise < backup.sql
```

### Backup with Compression

For larger databases, use compressed backups:

```bash
# Create compressed backup
docker compose -f compose.yml exec postgres pg_dump -U pennywise pennywise | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore from compressed backup
gunzip -c backup.sql.gz | docker compose -f compose.yml exec -T postgres psql -U pennywise pennywise
```

## Stopping the Application

```bash
docker compose -f compose.yml down
```

To remove volumes as well:

```bash
docker compose -f compose.yml down -v
```
