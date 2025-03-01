# Fitness Tracker Application

## Project Overview
A comprehensive fitness tracking application focusing on training, nutrition, routine management, and progress tracking with a unique gamification approach to calisthenics progression.

## Tech Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS, shadcn/ui components
- **State Management**: Zustand
- **Backend**: Next.js API routes
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Data Visualization**: Recharts

## Project Structure
- `/src/app` - Next.js application routes
- `/src/components` - React components
- `/src/lib` - Utilities, database connection, API helpers
- `/src/store` - Zustand state management
- `/public` - Static assets

## Core Modules
1. **Training Module** - Exercise tracking with progression system
2. **Nutrition Tracker** - Macro tracking and meal management
3. **Daily Routine Manager** - Habit tracking and task management
4. **Progress Dashboard** - Visualization of metrics and achievements

## Development Guidelines
- Component-first architecture
- Mobile-responsive design
- MongoDB for data persistence
- Type safety with TypeScript


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Fitness Tracker App - Backend Documentation

## Overview

This document outlines the database and API functionality of the Fitness Tracker app.

## Database Architecture

The app uses MongoDB with the following collections:

- **Users**: User accounts and preferences
- **Exercises**: Exercise database with progression relationships
- **Workouts**: User workout logs
- **Meals**: Nutrition tracking
- **Tasks**: Daily routine items

## API Endpoints

### Exercise Endpoints

- `GET /api/exercises`: Fetch all exercises
  - Query parameters:
    - `category`: Filter by category (core, push, pull, legs)
    - `limit`: Number of items to return
    - `page`: Page number for pagination

- `GET /api/exercises/[id]`: Get specific exercise details

- `GET /api/exercises/search`: Search exercises
  - Query parameters:
    - `q`: Search term
    - `category`: Filter by category

### Admin Endpoints

- `POST /api/admin/import-exercises`: Import exercise data
- `POST /api/admin/init-db`: Initialize database indexes and settings

### Debug Endpoints

- `GET /api/debug/db`: Check database status
- `GET /api/debug/health`: Full health check with detailed information

## Admin Interface

The app includes admin interfaces for database management:

- `/admin/database`: Database status and management
- `/admin/exercises`: Exercise data browser

## Setup Instructions

1. **Environment Variables**:
   - `MONGODB_URI`: MongoDB connection string
   - `NEXTAUTH_SECRET`: Secret for authentication
   - `NEXTAUTH_URL`: Base URL for authentication

2. **Database Initialization**:
   - Visit `/admin/database` in your browser
   - Click "Initialize Indexes" to set up the database structure
   - Click "Import Exercises" to populate exercise data

3. **Development**: