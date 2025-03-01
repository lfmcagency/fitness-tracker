# Fitness Tracker - Development Guidelines

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run start` - Start production server
- `npm run import-csv` - Import exercise data from CSV
- `./dev-tools.sh db` - Test database connection
- `./dev-tools.sh api` - Test API endpoints
- `./dev-tools.sh lint` - Run linting and build check
- `./dev-tools.sh all` - Run all checks

## Code Style
- **Component declarations**: Use arrow functions with React.FC type
- **Imports**: React/hooks first, then third-party libs, then internal imports with @/ prefix
- **TypeScript**: Use strict mode with proper type annotations
- **State management**: Use Zustand for global state
- **Naming**: PascalCase for components, camelCase for functions/variables
- **File structure**: Group related components in directories
- **Error handling**: Try/catch for async operations, fallbacks for loading states
- **Path aliases**: Use @/ prefix for imports from src directory

## Database
- MongoDB/Mongoose for data persistence
- Define schemas in /src/models
- Use MongoDB adapter for NextAuth

## API
- RESTful API endpoints in src/app/api
- Next.js App Router for routing
- API utility functions in src/lib/api-utils.ts