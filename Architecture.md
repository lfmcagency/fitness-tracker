# Fitness App Architecture Overview

## System Architecture

The Fitness App ("Kalos") is a full-stack Next.js application with a MongoDB database, designed around a holistic approach to fitness tracking with gamification elements. The system is structured with clear domain boundaries while maintaining integration between components.

## Core Components

### Database Layer
- **Technology**: MongoDB with Mongoose ODM
- **Connection Management**: Centralized in `db.ts` with connection pooling and retry logic
- **Models**: Structured schemas with TypeScript interfaces
- **Key Models**: User, Task, Exercise, Workout, Food, Meal, UserProgress, Achievement

### API Layer
- **Framework**: Next.js API Routes using App Router
- **Authentication**: NextAuth with JWT and custom role-based protection
- **Response Format**: Standardized through `apiResponse` and `apiError` utilities
- **Error Handling**: Consistent approach with `handleApiError` for all endpoints
- **Validation**: Request validation with custom validators and Zod schemas

### Frontend
- **Framework**: React with Next.js
- **State Management**: Zustand stores organized by domain
- **UI Components**: Custom components with Tailwind CSS
- **Data Fetching**: Direct API calls with proper loading states

### Authentication System
- **Provider**: NextAuth with credentials provider
- **Session Management**: JWT-based with MongoDB adapter
- **Authorization**: Role-based protection via `withAuth` and `withRoleProtection`
- **User Management**: Registration, login, profile updates

## Domain Areas

### 1. User & Authentication
Handles user accounts, profiles, and authentication flows with NextAuth integration.

**Key Files**:
- `src/lib/auth/index.ts` - Core authentication logic and helpers
- `src/lib/auth-utils.ts` - Authentication middleware and utilities
- `src/models/User.ts` - User data model
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth integration
- `src/app/api/user/profile/route.ts` - User profile management

### 2. Task Management
Manages daily routines, habits, and scheduled activities with streak tracking.

**Key Files**:
- `src/models/Task.ts` - Task data model
- `src/lib/task-utils.ts` - Task management utilities
- `src/app/api/tasks/*` - Task API endpoints
- `src/components/DailyRoutineManager.tsx` - Task UI component

### 3. Exercise & Training
Handles exercise database, workout tracking, and progressive training.

**Key Files**:
- `src/models/Exercise.ts` - Exercise data model
- `src/models/Workout.ts` - Workout data model
- `src/app/api/exercises/*` - Exercise API endpoints
- `src/app/api/workouts/*` - Workout API endpoints
- `src/components/TrainingModule.tsx` - Training UI component
- `src/components/skill-tree/*` - Skill tree visualization

### 4. Nutrition
Manages food database, meal tracking, and nutritional goals.

**Key Files**:
- `src/models/Food.ts` - Food data model
- `src/models/Meal.ts` - Meal data model
- `src/app/api/foods/*` - Food API endpoints
- `src/app/api/meals/*` - Meal API endpoints
- `src/components/NutritionTracker.tsx` - Nutrition UI component

### 5. Progress & Gamification
Tracks user progress, XP, levels, and achievements across all domains.

**Key Files**:
- `src/models/UserProgress.ts` - User progress data model
- `src/models/Achievement.ts` - Achievement data model
- `src/lib/xp-manager.ts` - XP calculation and management
- `src/lib/achievements.ts` - Achievement system logic
- `src/lib/category-progress.ts` - Category-specific progress tracking
- `src/app/api/progress/*` - Progress API endpoints
- `src/components/ProgressDashboard.tsx` - Progress UI component

## Key Design Principles

### 1. Domain-Driven Design
- Clear separation between domain areas
- Each domain has its own models, API routes, and UI components
- Cross-domain communication through well-defined interfaces

### 2. Single Source of Truth
- Centralized database connection management
- Standardized API response formats
- Consistent type definitions shared across the stack

### 3. Progressive Disclosure
- Exercise unlocking based on performance and progression
- Achievements revealed as users progress
- Skill tree visualization of available and locked exercises

### 4. Defensive Programming
- Comprehensive error handling
- Validation of all user inputs
- Fallbacks and defaults for missing data
- Connection retry logic and pooling

### 5. TypeScript Integration
- Strong typing across the entire stack
- Model interfaces reflect database schemas
- API request/response types enforce contracts
- Converter functions ensure type safety during transformations

## Integration Patterns

### Database Integration
- All database access goes through centralized `dbConnect()` function
- Models provide typed interfaces (IUser, ITask, etc.)
- Error handling with proper Mongoose error detection

### Authentication Flow
1. User authenticates via credentials provider
2. JWT token with user ID and role is generated
3. API routes use `withAuth` or `withRoleProtection` middleware
4. User ID is passed to route handlers for database queries

### XP and Progression System
1. User completes an action (task, workout, etc.)
2. XP is awarded through the XP manager
3. Levels are calculated based on total XP
4. Achievements are checked and unlocked if eligible
5. Exercise progressions are unlocked based on performance

### Data Flow
1. Frontend components request data from API endpoints
2. API routes authenticate the request
3. Database queries retrieve or modify data
4. Data is transformed to response format
5. Standardized response is returned to the frontend

## Deployment Architecture

- **Frontend & API**: Next.js application deployed on Vercel
- **Database**: MongoDB Atlas cloud database
- **Authentication**: NextAuth with JWT tokens
- **Static Assets**: Served from Vercel CDN

## Future Architecture Considerations

- **Caching Layer**: Redis for performance optimization
- **Job Queue**: Background processing for heavy computations
- **Analytics**: Integration with analytics services
- **Notifications**: Push notification system for reminders
- **Mobile App**: React Native adaptation of the web application
