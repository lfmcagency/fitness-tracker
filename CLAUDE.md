# Fitness Tracker - Development Guide

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run lint` - Run ESLint
- `npm run start` - Start production server
- `./dev-tools.sh all` - Run all checks (DB, auth, API, lint)
- `./dev-tools.sh [command]` - Run specific check (db|api|auth|tasks|xp|history|categories)
- `npm run test:db` - Test database connection | `npm run test:api` - Test all API endpoints
- `npm run test:[module]` - Run specific module test (auth|nutrition|tasks|progress|achievements)
- `node scripts/test-[module]-api.js [id]` - Test specific module with optional ID parameter
- `npm run import-csv` - Import exercise data | `npm run seed-foods` - Seed food database
- `npm run fix-csv` - Fix CSV exercise data formatting issues

## Code Style
- **Components**: Arrow functions with `React.FC<Props>` type, one file per component, 'use client' at top
- **Imports**: React first, third-party libraries next, internal imports last (@/ path alias)
- **Props/Types**: TypeScript interfaces for ALL props, strong typing throughout, model types in /models
- **Error Handling**: Try/catch with `handleApiError` and `apiError` from api-utils.ts
- **API Patterns**: Use `withApiHandler`, `withDbConnection` for consistent error handling
- **State**: Zustand for global state (`useStore` hooks), React hooks for local state
- **Naming**: PascalCase for components/interfaces, camelCase for functions/variables
- **Styling**: Tailwind CSS with consistent class patterns
- **Tests**: Script-based tests with descriptive logging, clear pass/fail indicators
- **API Response Format**: Always use `apiResponse()` or `apiError()` with proper types

## Architecture
- **API**: Next.js App Router with RESTful endpoints in src/app/api
- **Auth**: NextAuth.js with MongoDB adapter, role-based access via session
- **Database**: MongoDB/Mongoose with connection pooling via dbConnect
- **State**: Zustand stores in /store directory with optimistic updates
- **Components**: UI components in /components/ui, feature components in root /components

Always use existing patterns, utilities, and components for consistency. All API responses should follow the standard success/error format.