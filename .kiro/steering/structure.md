# Project Structure

## Root Directory
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite build configuration with PWA setup
- `tailwind.config.js` - Tailwind CSS configuration with custom theme
- `eslint.config.js` - ESLint configuration using @antfu/eslint-config
- `tsconfig.json` - TypeScript configuration with path aliases
- `components.json` - Component library configuration
- `.env.local` - Local environment variables (not committed)

## Frontend (`src/`)
```
src/
├── App.tsx                 # Main app component with routing
├── main.tsx               # App entry point
├── index.css              # Global styles
├── components/            # Reusable UI components
│   ├── NotesPage.tsx      # Notes management page
│   ├── SnippetsPage.tsx   # Code snippets page
│   ├── TodosPage.tsx      # Task management page
│   ├── SettingsPage.tsx   # User settings
│   ├── RichTextEditor.tsx # TipTap editor wrapper
│   ├── FilterBar.tsx      # Filtering components
│   ├── SearchBar.tsx      # Search functionality
│   └── ...                # Other UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and offline logic
│   ├── utils.ts           # Common utilities (cn function)
│   ├── useOfflineNotes.ts # Offline notes management
│   ├── useOfflineSync.ts  # Sync coordination
│   ├── automerge.ts       # CRDT document handling
│   └── ...                # Other utilities
├── i18n/                  # Internationalization
│   ├── index.ts           # i18n setup
│   └── locales/           # Translation files
└── types/                 # TypeScript type definitions
```

## Backend (`convex/`)
```
convex/
├── schema.ts              # Database schema definitions
├── auth.config.ts         # Authentication configuration
├── auth.ts                # Auth-related functions
├── notes.ts               # Notes CRUD operations
├── snippets.ts            # Snippets CRUD operations
├── todos.ts               # Todos CRUD operations
├── users.ts               # User management
├── userPreferences.ts     # User settings
├── automergeSync.ts       # Offline sync functions
├── http.ts                # HTTP endpoints (auth)
├── router.ts              # Custom HTTP routes
└── _generated/            # Auto-generated Convex files
```

## PWA Assets (`public/`)
```
public/
├── manifest.webmanifest   # PWA manifest
├── sw.js                  # Service worker
├── offline.html           # Offline fallback page
├── icons/                 # PWA icons
└── kortex-logo.svg        # App logo
```

## Architecture Patterns

### Component Organization
- **Pages**: Top-level route components (NotesPage, TodosPage, etc.)
- **Components**: Reusable UI components with single responsibility
- **Hooks**: Custom hooks for state management and side effects
- **Lib**: Pure utility functions and business logic

### State Management
- **Server State**: Managed by Convex React hooks (useQuery, useMutation)
- **Client State**: React useState/useReducer for UI state
- **Offline State**: Automerge documents for offline-first data

### File Naming
- **Components**: PascalCase (e.g., `NotesPage.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useOfflineNotes.ts`)
- **Utilities**: camelCase (e.g., `utils.ts`)
- **Types**: camelCase with descriptive names

### Import Organization
- External libraries first
- Internal imports grouped by: hooks, components, utilities, types
- Relative imports last

### Styling Conventions
- Use Tailwind utility classes
- Custom colors defined in tailwind.config.js
- Dark mode support with `dark:` prefix
- Component-specific styles in same file when needed
