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
│       └── Dockerfile
├── frontend/
│   └── pennywise-ui/            # React + TypeScript + Vite
│       ├── src/
│       │   ├── components/
│       │   │   ├── AppLayout.tsx    # Shared app layout with sidebar navigation
│       │   │   ├── ThemeToggle.tsx  # Dark/light theme switcher
│       │   │   └── ui/              # shadcn/ui components (30+ components)
│       │   ├── pages/
│       │   │   ├── HomePage.tsx     # Landing page
│       │   │   ├── DashboardPage.tsx # Dashboard with analytics
│       │   │   ├── ExpensesPage.tsx  # Expense management
│       │   │   └── CategoriesPage.tsx # Category management
│       │   ├── hooks/               # Custom React hooks
│       │   └── lib/                 # API client and utilities
│       ├── package.json
│       ├── vite.config.ts
│       └── Dockerfile
├── docker-compose.yml           # Docker orchestration
└── README.md
```

## Technologies

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components (30+ components including accordion, alert, avatar, badge, button, card, checkbox, dialog, dropdown, forms, tables, and more)
- Radix UI primitives
- Nginx (for production)

### Backend

- .NET 10
- ASP.NET Core Web API
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

## Stopping the Application

```bash
docker-compose down
```

To remove volumes as well:

```bash
docker-compose down -v
```
