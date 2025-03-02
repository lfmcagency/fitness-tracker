# Fitness Tracker - Development Guide

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run lint` - Run ESLint
- `npm run start` - Start production server
- `npm run test:api` - Test API endpoints
- `npm run test:db` - Test database connection
- `npm run test:auth` - Test authentication flow
- `npm run test:nutrition` - Test nutrition API
- `node scripts/test-api.js [endpoint]` - Test specific API endpoint
- `./dev-tools.sh lint` - Run linting and build check
- `./dev-tools.sh all` - Run all checks (DB, auth, API, lint)
- `./dev-tools.sh api` - Test API endpoints specifically

## Code Style
- **Components**: Arrow functions with `React.FC<Props>` type, one per file
- **Props**: Define interfaces for all component props (TypeScript)
- **Imports**: React first, then third-party, then internal (@/ imports)
- **State**: Zustand for global state, React hooks for local state
- **Naming**: PascalCase for components/interfaces, camelCase for functions/variables
- **Error handling**: Use try/catch with `handleApiError` from api-utils.ts
- **API responses**: Use `apiResponse` and `apiError` utilities consistently
- **Types**: Strict typing throughout with proper interfaces/types
- **Styling**: Use Tailwind CSS with consistent class patterns
- **API Endpoints**: Implement proper error handling, validation, and pagination

## Architecture
- **API**: RESTful endpoints in src/app/api with Next.js App Router
- **Auth**: NextAuth.js with MongoDB adapter and role-based access
- **Database**: MongoDB/Mongoose with connection pooling via dbConnect
- **Testing**: Script-based testing in /scripts directory
- **Modules**: Feature-based organization with clear separation of concerns
- **Utils**: Reuse utility functions from src/lib for common operations

Refer to existing components for examples of proper structure and style.