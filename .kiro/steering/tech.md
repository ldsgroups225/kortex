# Technology Stack

## Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6 with hot module replacement
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Convex React hooks for server state
- **Rich Text**: TipTap editor with extensions
- **Icons**: Heroicons
- **Notifications**: Sonner toast library
- **Internationalization**: react-i18next

## Backend
- **Platform**: Convex (serverless backend-as-a-service)
- **Authentication**: Convex Auth with anonymous auth
- **Database**: Convex (document-based with real-time sync)
- **API**: Convex functions (queries, mutations, actions)

## PWA & Offline
- **Service Worker**: Custom implementation with Vite PWA plugin
- **Offline Sync**: Automerge CRDT for conflict-free offline editing
- **Caching**: Workbox for static asset and API caching
- **Background Sync**: Queue offline changes for later sync

## Development Tools
- **Package Manager**: Bun (preferred) or npm
- **Linting**: ESLint with @antfu/eslint-config
- **Type Checking**: TypeScript with strict mode
- **Testing**: Puppeteer for PWA testing

## Common Commands

```bash
# Development (starts both frontend and backend)
bun run dev

# Frontend only
bun run dev:frontend

# Backend only (Convex)
bun run dev:backend

# Build for production
bun run build

# Linting
bun run lint
bun run lint:fix

# Type checking
bun run typecheck

# PWA testing
bun run test:pwa
```

## Key Dependencies
- `@automerge/automerge`: Offline-first data synchronization
- `@convex-dev/auth`: Authentication system
- `@tiptap/react`: Rich text editor
- `vite-plugin-pwa`: Progressive Web App features
- `react-i18next`: Internationalization
