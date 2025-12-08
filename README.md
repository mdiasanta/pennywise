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

## Quick Start

Run the entire application stack with Docker Compose:

```bash
docker-compose up --build
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
├── backend/
│   └── Pennywise.Api/          # .NET Web API project
│       ├── Program.cs
│       ├── Pennywise.Api.csproj
│       └── Dockerfile
├── frontend/
│   └── pennywise-ui/           # React + TypeScript + Vite
│       ├── src/
│       ├── package.json
│       ├── vite.config.ts
│       └── Dockerfile
├── docker-compose.yml          # Docker orchestration
└── README.md
```

## Technologies

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
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

All services communicate through a dedicated Docker network (`pennywise-network`).

## Stopping the Application

```bash
docker-compose down
```

To remove volumes as well:

```bash
docker-compose down -v
```

