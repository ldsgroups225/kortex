# Kortex: The All-in-One Workspace

**Kortex** is the intelligent workspace that boosts your productivity. Seamlessly manage rich-text notes, organize code snippets, and track tasks on a visual Kanban board. Your ultimate tool for clarity and focus.

This project is built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
 You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).

This project is connected to the Convex deployment named [`insightful-parakeet-551`](https://dashboard.convex.dev/d/insightful-parakeet-551).

## Installation

To get started with Kortex, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd kortex
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start the development servers:**
   ```bash
   bun run dev
   ```

This will start both the frontend and backend servers.

## Project Structure

The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).

The backend code is in the `convex` directory.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## Service Worker & PWA Features

Kortex includes Progressive Web App (PWA) capabilities with offline support:

### Service Worker Updates

The service worker (`public/sw.js`) handles:
- **Offline Functionality**: Caches static resources for offline access
- **Background Sync**: Queues data updates when offline and syncs when back online
- **Push Notifications**: Receives and displays notifications
- **Cache Management**: Automatically manages and updates cached resources

The service worker is automatically registered and updated by Vite PWA plugin. When updates are available, users will be prompted to refresh the app.

### Cache Clearing

To clear application caches and reset the app state:

1. **Browser Cache:**
   - Open DevTools (F12)
   - Go to Application/Storage tab
   - Click "Clear site data" or "Clear storage"

2. **Service Worker Cache:**
   - In DevTools > Application > Service Workers
   - Click "Unregister" next to the Kortex service worker
   - Refresh the page to reinstall

3. **Local Storage:**
   - In DevTools > Application > Local Storage
   - Delete `kortex-*` entries manually
   - Or run in console: `localStorage.clear()`

4. **Complete Reset:**
   ```bash
   # For development, you can also clear PWA data
   bun run test:pwa:ci
   ```

### PWA Manifest

The app manifest (`public/manifest.webmanifest`) defines the PWA configuration including:
- App name, icons, and theme colors
- Display mode (standalone)
- Start URL and scope

**⚠️ Security Note:** The manifest path is publicly accessible and does not contain sensitive information.

## Environment Variable Safety

**🔒 Environment Variable Security:**

Kortex follows strict environment variable safety practices:

- **Protected Files:** The following files are excluded from version control and deployment:
  - `.env`
  - `.env*.local`
  - `.env*.production`

- **Safe Public Variables:** Only variables prefixed with `VITE_` are exposed to the client-side code

- **Manifest Security:** The PWA manifest is static and contains no sensitive configuration

- **Best Practices:**
  - Never commit `.env` files to version control
  - Use environment-specific files (`.env.local`, `.env.production`) for secrets
  - Validate that sensitive keys are not exposed in the built client bundle
  - Regularly audit environment variables in production

## Code Quality & Linting

### ESLint Configuration

Kortex uses [@antfu/eslint-config](https://github.com/antfu/eslint-config) with customizations for React and service worker development:

**Main Rules:**
- **Console Usage**: `console.warn` and `console.error` are allowed, but `console.log` triggers warnings
- **Unused Variables**: Variables prefixed with `_` are ignored (e.g., `_unusedParam`)
- **React Hooks**:
  - `react-hooks/exhaustive-deps`: Warns about missing dependencies in hooks
  - `react-hooks-extra/no-direct-set-state-in-use-effect`: Warns about direct state setters in useEffect

**File-Specific Rules:**
- **Service Worker** (`public/sw.js`): Allows `self`, `clients`, and service worker globals
- **Scripts** (`scripts/`): Relaxed console and unused variable rules for build tooling

**Running Linting:**
```bash
# Check for lint errors
bun run lint

# Auto-fix lint errors where possible
bun run lint:fix
```

**Common ESLint Fixes:**

1. **Unused Variables**: Prefix with underscore `_variable` or remove if truly unused
2. **React Hooks Dependencies**: Add missing dependencies to hooks dependency arrays
3. **Console Statements**: Replace `console.log` with `console.warn` or `console.error`
4. **Button Types**: Add `type="button"` to buttons that don't submit forms
5. **Service Worker**: Use `self` instead of `globalThis` in service worker context

**ESLint Rule Exceptions:**

Some ESLint warnings are acceptable in this codebase:
- **Service Worker Global Usage**: `self`, `clients`, etc. are valid in service worker context
- **React Hook Warnings**: Some dependency warnings for optimization hooks are acceptable
- **Debug Console**: `console.warn/error` allowed for debugging, logs should be avoided in production
- **Template Variables**: Some unused variables in template code (service worker, scripts) are expected

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
