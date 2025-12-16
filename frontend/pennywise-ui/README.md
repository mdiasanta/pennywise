# Pennywise Frontend

React + TypeScript + Vite frontend for the Pennywise personal finance application.

## Application Structure

### Pages

- **HomePage** (`/`) - Landing page with marketing content and quick access to the app
- **DashboardPage** (`/dashboard`) - Main dashboard with expense analytics and charts
- **ExpensesPage** (`/expenses`) - Expense management with CRUD operations and import/export
- **CategoriesPage** (`/categories`) - Category management for organizing expenses

### Navigation

The application uses a consistent sidebar navigation pattern for all app pages (Dashboard, Expenses, Categories):

- **AppLayout** (`src/components/AppLayout.tsx`) - Shared layout component with:
  - Fixed sidebar navigation on desktop (collapsible on mobile)
  - Consistent header with page title and description
  - Theme toggle in both sidebar footer and header
  - Responsive design with hamburger menu for mobile

The HomePage has its own standalone layout as a marketing/landing page.

### Key Components

- `src/components/AppLayout.tsx` - Main application shell with sidebar navigation
- `src/components/ThemeToggle.tsx` - Dark/light theme switcher
- `src/components/ui/` - shadcn/ui component library (30+ components)

### Hooks

- `src/hooks/use-categories.tsx` - Category state management with context
- `src/hooks/use-toast.ts` - Toast notification system

### API Integration

- `src/lib/api.ts` - API client for backend communication

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run tests
npm test
```

## Technologies

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Radix UI primitives
- Recharts (for dashboard charts)
- React Router DOM

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
