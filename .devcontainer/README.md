# Dev Container Configuration

This directory contains the development container configuration for the Pennywise project.

## Features

### Included Tools & Runtimes
- **Node.js 20**: For frontend development with React, TypeScript, and Vite
- **.NET 10 SDK**: For backend API development
- **Git**: Version control
- **GitHub CLI**: Command-line GitHub operations

### VS Code Extensions

#### AI & Productivity
- **GitHub Copilot** (`GitHub.copilot`): AI-powered code completion
- **GitHub Copilot Chat** (`GitHub.copilot-chat`): AI-powered chat assistance

#### Frontend Development
- **ESLint** (`dbaeumer.vscode-eslint`): JavaScript/TypeScript linting
- **Prettier** (`esbenp.prettier-vscode`): Code formatting
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`): Tailwind CSS class completion
- **Auto Rename Tag** (`formulahendry.auto-rename-tag`): Automatically rename paired HTML/XML tags
- **Color Highlight** (`naumovs.color-highlight`): Highlight colors in code

#### Backend Development (.NET)
- **C#** (`ms-dotnettools.csharp`): C# language support
- **C# Dev Kit** (`ms-dotnettools.csdevkit`): Enhanced C# development experience
- **.NET Install Tool** (`ms-dotnettools.vscode-dotnet-runtime`): .NET runtime management

#### Database
- **SQLTools** (`mtxr.sqltools`): Database management and querying
- **SQLTools PostgreSQL Driver** (`mtxr.sqltools-driver-pg`): PostgreSQL support for SQLTools

#### DevOps & Tools
- **Docker** (`ms-azuretools.vscode-docker`): Docker container management
- **Postman** (`Postman.postman-for-vscode`): API testing
- **GitLens** (`eamodio.gitlens`): Enhanced Git capabilities
- **GitHub Pull Requests** (`GitHub.vscode-pull-request-github`): GitHub PR management

#### General Enhancements
- **Error Lens** (`usernamehw.errorlens`): Inline error highlighting
- **Path Intellisense** (`christian-kohler.path-intellisense`): File path autocompletion
- **DotENV** (`mikestead.dotenv`): .env file syntax highlighting
- **Better Comments** (`aaron-bond.better-comments`): Enhanced comment styling
- **Material Icon Theme** (`PKief.material-icon-theme`): File icon theme

## Port Forwarding

The following ports are automatically forwarded:
- **3000**: Frontend React application
- **8080**: Backend .NET API
- **5432**: PostgreSQL database (silent forwarding)

## Usage

### Opening in VS Code

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open the project in VS Code
3. Press `F1` and select "Dev Containers: Reopen in Container"
4. Wait for the container to build and the postCreateCommand to complete

### First-Time Setup

The dev container will automatically:
1. Install Node.js dependencies for the frontend
2. Restore .NET packages for the backend

### Development Workflow

#### Frontend Development
```bash
cd frontend/pennywise-ui
npm run dev
```
The frontend will be available at http://localhost:3000

#### Backend Development
```bash
cd backend/Pennywise.Api
dotnet run
```
The API will be available at http://localhost:8080

#### Running the Full Stack
From the workspace root:
```bash
docker-compose up
```

## Configuration

### Editor Settings
- **Format on Save**: Enabled with Prettier as the default formatter
- **ESLint Auto-fix**: Enabled on save
- **TypeScript**: Configured to use workspace TypeScript version
- **Tailwind CSS**: Enhanced class completion with custom regex patterns

### Environment Variables
The dev container has access to the same environment variables as the backend service:
- `ASPNETCORE_ENVIRONMENT=Development`
- `ConnectionStrings__DefaultConnection`: PostgreSQL connection string

## Customization

To add more extensions or modify settings, edit `.devcontainer/devcontainer.json`.

## Troubleshooting

### Container Build Issues
If the container fails to build, try:
```bash
docker-compose down -v
docker system prune -a
```
Then rebuild the dev container.

### Extension Issues
If extensions don't load properly, try:
1. Press `F1` → "Developer: Reload Window"
2. If that doesn't work, rebuild the container

### Database Connection Issues
Ensure the PostgreSQL container is healthy:
```bash
docker-compose ps
```
The postgres service should show "healthy" status.
