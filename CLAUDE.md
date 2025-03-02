# Fitness Tracker - Development Guide

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run lint` - Run ESLint
- `npm run start` - Start production server
- `./dev-tools.sh all` - Run all checks (DB, auth, API, lint)
- `./dev-tools.sh [command]` - Run specific check (db|api|auth|tasks|xp|history|categories)
- `node scripts/test-api.js [endpoint]` - Test specific API endpoint
- `node scripts/test-tasks-api.js [taskId]` - Test specific task functionality
- `node scripts/test-progress-api.js [achievementId]` - Test progress API with ID
- `node scripts/test-achievements-api.js [achievementId]` - Test achievements with ID
- `npm run test:tasks` - Test tasks API | `npm run test:xp` - Test XP award system
- `npm run test:history` - Test history | `npm run test:categories` - Test category progress

## Code Style
- **Components**: Arrow functions with `React.FC<Props>` type, one per file, 'use client' at top
- **Imports**: React first, third-party libraries next, internal imports last (@/ path alias)
- **Props/Types**: TypeScript interfaces for ALL component props, strong typing throughout
- **Error Handling**: Try/catch with `handleApiError` and `apiError` from api-utils.ts
- **API Patterns**: Use `withApiHandler`, `withDbConnection` for consistent error handling
- **State**: Zustand for global state (`useStore` hooks), React hooks for local state
- **Naming**: PascalCase for components/interfaces, camelCase for functions/variables
- **Styling**: Tailwind CSS with consistent class patterns
- **Tests**: Script-based tests with descriptive logging, clear pass/fail indicators

## Architecture
- **API**: Next.js App Router with RESTful endpoints in src/app/api
- **Auth**: NextAuth.js with MongoDB adapter, role-based access via session
- **Database**: MongoDB/Mongoose with connection pooling via dbConnect
- **State**: Zustand stores in /store directory with optimistic updates
- **Components**: Reusable UI in /components/ui, feature components in root /components

## Data Flow
- API requests via api-wrapper.ts utilities with standardized response handling
- Database operations through withDbConnection wrapper with error handling
- Component state through appropriate Zustand stores and React hooks
- Auth state via NextAuth hooks with proper role/permission checks

Always use existing patterns, utilities, and components for consistency.