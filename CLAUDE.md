# Fitness Tracker - Development Guidelines

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run start` - Start production server
- `npm run import-csv` - Import exercise data from CSV
- `npm run import-csv:dry-run` - Test data import without committing
- `npm run fix-csv` - Fix CSV exercise data 
- `npm run test:auth` - Test authentication system
- `npm run test:db` - Test database connection
- `npm run test:api` - Test API endpoints
- `./dev-tools.sh db` - Test database connection
- `./dev-tools.sh auth` - Test authentication system
- `./dev-tools.sh api` - Test API endpoints
- `./dev-tools.sh lint` - Run linting and build check
- `./dev-tools.sh all` - Run all checks
- `./dev-tools.sh commit` - Quick git commit and push

## Authentication
- Uses NextAuth.js with MongoDB adapter for persistent sessions
- Email/password authentication with bcrypt password hashing
- Role-based access control (user, admin, trainer roles)
- Protected routes with middleware (`/dashboard`, `/training`, `/nutrition`, etc.)
- API endpoints for user management in `/api/user/*`
- Admin-only API endpoints in `/api/admin/*`
- Test authentication with `npm run test:auth` or `./dev-tools.sh auth`

## Code Style
- **Component declarations**: Use arrow functions with React.FC type
- **Imports**: React/hooks first, then third-party libs, then internal imports with @/ prefix
- **TypeScript**: Use strict mode with proper type annotations
- **State management**: Use Zustand for global state
- **Naming**: PascalCase for components, camelCase for functions/variables
- **File structure**: Group related components in directories
- **Error handling**: Try/catch for async operations, fallbacks for loading states
- **Path aliases**: Use @/ prefix for imports from src directory
- **Tests**: No test runner configured yet - use API testing scripts in /scripts directory

## Database
- MongoDB/Mongoose for data persistence
- Define schemas in /src/models
- Use MongoDB adapter for NextAuth
- Run `node scripts/test-mongodb-connection.js` to verify DB connection

## API
- RESTful API endpoints in src/app/api
- Next.js App Router for routing
- API utility functions in src/lib/api-utils.ts
- Run `node scripts/test-api-endpoints.js` to test endpoints