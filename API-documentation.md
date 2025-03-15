# API Reference Documentation

This document provides a comprehensive reference for all API endpoints in the fitness app, organized by domain area. Each endpoint includes the URL, HTTP method, required authentication level, request parameters, and response format.

## Table of Contents
- [Authentication](#authentication)
- [User Profile](#user-profile)
- [Tasks](#tasks)
- [Exercises](#exercises)
- [Workouts](#workouts)
- [Progress Tracking](#progress-tracking)
- [Achievements](#achievements)
- [Foods](#foods)
- [Meals](#meals)
- [Database Management](#database-management)

## Common Response Format

All API endpoints follow a standardized response format:

### Success Response
```json
{
  "success": true,
  "data": {}, // Response data specific to the endpoint
  "message": "Operation successful", // Optional success message
  "timestamp": "2023-01-01T00:00:00.000Z" // ISO timestamp
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE", // Standardized error code
    "message": "Error message", // Human-readable error message
    "details": {} // Optional additional error details
  },
  "timestamp": "2023-01-01T00:00:00.000Z" // ISO timestamp
}
```

## Authentication

### Register User
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "image": "string" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "image": "string" // Optional
      }
    },
    "message": "User registered successfully"
  }
  ```

### Login User
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "image": "string", // Optional
        "role": "string"
      }
    },
    "message": "Login successful"
  }
  ```

## User Profile

### Get User Profile
- **URL**: `/api/user/profile`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "email": "string",
      "image": "string", // Optional
      "settings": {
        "weightUnit": "kg|lbs",
        "lengthUnit": "cm|in",
        "theme": "string" // Optional
      },
      "bodyweight": [ // Optional
        {
          "weight": "number",
          "date": "string",
          "notes": "string" // Optional
        }
      ]
    },
    "message": "User profile retrieved successfully"
  }
  ```

### Update User Profile
- **URL**: `/api/user/profile`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "string", // Optional
    "image": "string", // Optional
    "settings": { // Optional
      "weightUnit": "kg|lbs",
      "lengthUnit": "cm|in",
      "theme": "string"
    },
    "currentPassword": "string", // Required if changing password
    "newPassword": "string" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "email": "string",
      "image": "string", // Optional
      "settings": { /* settings object */ }
    },
    "message": "Profile updated successfully"
  }
  ```

### Add Weight Entry
- **URL**: `/api/user/weight`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "weight": "number",
    "date": "string", // ISO date string, optional (defaults to current date)
    "notes": "string" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "weight": "number",
      "date": "string",
      "notes": "string" // Optional
    },
    "message": "Weight entry added successfully"
  }
  ```

## Tasks

### List Tasks
- **URL**: `/api/tasks`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `completed`: Filter by completion status (boolean)
  - `category`: Filter by category (string)
  - `from`: Start date for filtering (ISO string)
  - `to`: End date for filtering (ISO string)
  - `page`: Page number for pagination (default: 1)
  - `limit`: Items per page (default: 20)
  - `sort`: Field to sort by (default: 'date')
  - `order`: Sort order ('asc' or 'desc', default: 'desc')
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "data": [
        {
          "id": "string",
          "name": "string",
          "scheduledTime": "string",
          "completed": "boolean",
          "date": "string",
          "recurrencePattern": "string",
          "customRecurrenceDays": "number[]",
          "currentStreak": "number",
          "bestStreak": "number",
          "lastCompletedDate": "string",
          "category": "string",
          "priority": "string",
          "isDueToday": "boolean"
        }
      ],
      "pagination": {
        "total": "number",
        "page": "number",
        "limit": "number",
        "pages": "number"
      }
    },
    "message": "Tasks retrieved successfully"
  }
  ```

### Create Task
- **URL**: `/api/tasks`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "string",
    "scheduledTime": "string",
    "date": "string", // Optional, ISO date string
    "recurrencePattern": "string", // Optional, one of: daily, weekdays, weekends, weekly, custom
    "customRecurrenceDays": "number[]", // Optional, required if recurrencePattern is 'custom'
    "category": "string", // Optional
    "priority": "string" // Optional, one of: low, medium, high
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "scheduledTime": "string",
      "completed": false,
      "date": "string",
      "recurrencePattern": "string",
      "customRecurrenceDays": "number[]",
      "currentStreak": 0,
      "bestStreak": 0,
      "lastCompletedDate": null,
      "category": "string",
      "priority": "string",
      "isDueToday": "boolean"
    },
    "message": "Task created successfully"
  }
  ```

### Get Task
- **URL**: `/api/tasks/[id]`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "scheduledTime": "string",
      "completed": "boolean",
      "date": "string",
      "recurrencePattern": "string",
      "customRecurrenceDays": "number[]",
      "currentStreak": "number",
      "bestStreak": "number",
      "lastCompletedDate": "string",
      "category": "string",
      "priority": "string",
      "isDueToday": "boolean"
    },
    "message": "Task retrieved successfully"
  }
  ```

### Update Task
- **URL**: `/api/tasks/[id]`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "string", // Optional
    "scheduledTime": "string", // Optional
    "completed": "boolean", // Optional
    "recurrencePattern": "string", // Optional
    "customRecurrenceDays": "number[]", // Optional
    "category": "string", // Optional
    "priority": "string" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "scheduledTime": "string",
      "completed": "boolean",
      "date": "string",
      "recurrencePattern": "string",
      "customRecurrenceDays": "number[]",
      "currentStreak": "number",
      "bestStreak": "number",
      "lastCompletedDate": "string",
      "category": "string",
      "priority": "string",
      "isDueToday": "boolean"
    },
    "message": "Task updated successfully"
  }
  ```

### Delete Task
- **URL**: `/api/tasks/[id]`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Task deleted successfully"
  }
  ```

### Get Task Streak
- **URL**: `/api/tasks/[id]/streak`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "taskId": "string",
      "name": "string",
      "currentStreak": "number",
      "bestStreak": "number",
      "lastCompletedDate": "string",
      "isDueToday": "boolean",
      "completionHistory": "string[]" // ISO date strings
    },
    "message": "Task streak retrieved successfully"
  }
  ```

### Get Due Tasks
- **URL**: `/api/tasks/due`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `date`: Optional date to check tasks for (ISO string, defaults to current date)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "data": [
        {
          "id": "string",
          "name": "string",
          "scheduledTime": "string",
          "completed": "boolean",
          "date": "string",
          "recurrencePattern": "string",
          "customRecurrenceDays": "number[]",
          "currentStreak": "number",
          "bestStreak": "number",
          "lastCompletedDate": "string",
          "category": "string",
          "priority": "string",
          "isDueToday": true
        }
      ],
      "date": "string",
      "count": "number"
    },
    "message": "Due tasks retrieved successfully"
  }
  ```

### Get Task Statistics
- **URL**: `/api/tasks/statistics`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `period`: Time period for statistics ('week', 'month', 'year', default: 'week')
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "completionRate": {
        "daily": "number", // Percentage
        "weekly": "number", // Percentage
        "monthly": "number" // Percentage
      },
      "streaks": {
        "current": {
          "average": "number",
          "highest": {
            "task": "string",
            "streak": "number"
          }
        },
        "best": {
          "average": "number",
          "highest": {
            "task": "string",
            "streak": "number"
          }
        }
      },
      "categoryBreakdown": {
        "category1": "number",
        "category2": "number"
        // etc.
      },
      "totalTasks": "number",
      "completedToday": "number",
      "pendingToday": "number"
    },
    "message": "Task statistics retrieved successfully"
  }
  ```

## Exercises

### List Exercises
- **URL**: `/api/exercises`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `category`: Filter by category (string)
  - `subcategory`: Filter by subcategory (string)
  - `difficulty`: Filter by difficulty level (string)
  - `progressionLevel`: Filter by progression level (number)
  - `search`: Search by name or description (string)
  - `unlocked`: Filter by unlock status (boolean)
  - `page`: Page number for pagination (default: 1)
  - `limit`: Items per page (default: 20)
  - `sort`: Field to sort by (default: 'progressionLevel')
  - `order`: Sort order ('asc' or 'desc', default: 'asc')
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "exercises": [
        {
          "id": "string",
          "name": "string",
          "category": "string",
          "subcategory": "string",
          "progressionLevel": "number",
          "description": "string",
          "primaryMuscleGroup": "string",
          "secondaryMuscleGroups": "string[]",
          "difficulty": "string",
          "xpValue": "number",
          "unlockRequirements": "string",
          "formCues": "string[]",
          "previousExercise": "string",
          "nextExercise": "string",
          "unlocked": "boolean",
          "progress": "number" // Percentage towards unlocking
        }
      ],
      "pagination": {
        "total": "number",
        "page": "number",
        "limit": "number",
        "pages": "number"
      }
    },
    "message": "Exercises retrieved successfully"
  }
  ```

### Get Exercise
- **URL**: `/api/exercises/[id]`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "category": "string",
      "subcategory": "string",
      "progressionLevel": "number",
      "description": "string",
      "primaryMuscleGroup": "string",
      "secondaryMuscleGroups": "string[]",
      "difficulty": "string",
      "xpValue": "number",
      "unlockRequirements": "string",
      "formCues": "string[]",
      "previousExercise": "string",
      "nextExercise": "string",
      "unlocked": "boolean",
      "progress": "number" // Percentage towards unlocking
    },
    "message": "Exercise retrieved successfully"
  }
  ```

### Get Exercise Progression
- **URL**: `/api/exercises/progression`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `exerciseId`: ID of the current exercise (string)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "current": {
        "id": "string",
        "name": "string",
        "category": "string",
        "progressionLevel": "number",
        // ...other exercise fields
        "unlocked": "boolean"
      },
      "previous": {
        // Previous exercise in progression
      },
      "next": {
        // Next exercise in progression
      },
      "alternativesAtLevel": [
        // Other exercises at the same level
      ]
    },
    "message": "Exercise progression retrieved successfully"
  }
  ```

### Search Exercises
- **URL**: `/api/exercises/search`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `q`: Search query (string)
  - `limit`: Maximum results to return (default: 10)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "results": [
        {
          "id": "string",
          "name": "string",
          "category": "string",
          "progressionLevel": "number",
          "difficulty": "string",
          "unlocked": "boolean"
        }
      ],
      "count": "number",
      "query": "string"
    },
    "message": "Search results retrieved successfully"
  }
  ```

## Workouts

### List Workouts
- **URL**: `/api/workouts`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `from`: Start date for filtering (ISO string)
  - `to`: End date for filtering (ISO string)
  - `page`: Page number for pagination (default: 1)
  - `limit`: Items per page (default: 20)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "workouts": [
        {
          "id": "string",
          "name": "string",
          "date": "string",
          "duration": "number",
          "exercises": [
            {
              "exerciseId": "string",
              "exerciseName": "string",
              "category": "string",
              "sets": [
                {
                  "reps": "number",
                  "holdTime": "number",
                  "weight": "number",
                  "completed": "boolean",
                  "notes": "string"
                }
              ],
              "restTime": "number",
              "notes": "string",
              "performance": {
                "totalVolume": "number",
                "maxReps": "number",
                "maxHoldTime": "number",
                "maxWeight": "number",
                "improvement": "number"
              }
            }
          ],
          "notes": "string",
          "bodyweight": "number",
          "completed": "boolean",
          "createdAt": "string",
          "stats": {
            "totalExercises": "number",
            "totalSets": "number",
            "totalVolume": "number",
            "xpEarned": "number"
          }
        }
      ],
      "pagination": {
        "total": "number",
        "page": "number",
        "limit": "number",
        "pages": "number"
      }
    },
    "message": "Workouts retrieved successfully"
  }
  ```

### Create Workout
- **URL**: `/api/workouts`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "string",
    "date": "string", // Optional ISO date string
    "bodyweight": "number", // Optional
    "notes": "string", // Optional
    "exercises": [ // Optional
      {
        "exerciseId": "string",
        "sets": "number", // Optional, number of sets to create
        "reps": "number", // Optional, default reps per set
        "holdTime": "number", // Optional, default hold time per set
        "weight": "number", // Optional, default weight per set
        "restTime": "number", // Optional, rest time in seconds
        "notes": "string" // Optional
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "date": "string",
      "duration": 0,
      "exercises": [
        {
          "exerciseId": "string",
          "exerciseName": "string",
          "category": "string",
          "sets": [
            {
              "reps": "number",
              "holdTime": "number",
              "weight": "number",
              "completed": false,
              "notes": "string"
            }
          ],
          "restTime": "number",
          "notes": "string"
        }
      ],
      "notes": "string",
      "bodyweight": "number",
      "completed": false,
      "createdAt": "string"
    },
    "message": "Workout created successfully"
  }
  ```

### Get Workout
- **URL**: `/api/workouts/[id]`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "date": "string",
      "duration": "number",
      "exercises": [
        {
          "exerciseId": "string",
          "exerciseName": "string",
          "category": "string",
          "sets": [
            {
              "reps": "number",
              "holdTime": "number",
              "weight": "number",
              "completed": "boolean",
              "notes": "string"
            }
          ],
          "restTime": "number",
          "notes": "string",
          "performance": {
            "totalVolume": "number",
            "maxReps": "number",
            "maxHoldTime": "number",
            "maxWeight": "number"
          }
        }
      ],
      "notes": "string",
      "bodyweight": "number",
      "completed": "boolean",
      "createdAt": "string"
    },
    "message": "Workout retrieved successfully"
  }
  ```

### Update Workout
- **URL**: `/api/workouts/[id]`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "string", // Optional
    "date": "string", // Optional
    "duration": "number", // Optional
    "bodyweight": "number", // Optional
    "notes": "string", // Optional
    "completed": "boolean" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "date": "string",
      "duration": "number",
      "exercises": [], // Exercise data
      "notes": "string",
      "bodyweight": "number",
      "completed": "boolean",
      "createdAt": "string"
    },
    "message": "Workout updated successfully"
  }
  ```

### Delete Workout
- **URL**: `/api/workouts/[id]`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Workout deleted successfully"
  }
  ```

### Add Exercise to Workout
- **URL**: `/api/workouts/[id]/sets`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "exerciseId": "string",
    "sets": "number", // Optional, number of sets to create
    "reps": "number", // Optional, default reps per set
    "holdTime": "number", // Optional, default hold time per set
    "weight": "number", // Optional, default weight per set
    "restTime": "number", // Optional, rest time in seconds
    "notes": "string" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "exerciseId": "string",
      "exerciseName": "string",
      "category": "string",
      "sets": [
        {
          "reps": "number",
          "holdTime": "number",
          "weight": "number",
          "completed": false,
          "notes": "string"
        }
      ],
      "restTime": "number",
      "notes": "string"
    },
    "message": "Exercise added to workout successfully"
  }
  ```

### Update Set in Workout
- **URL**: `/api/workouts/[id]/sets/[setId]`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "reps": "number", // Optional
    "holdTime": "number", // Optional
    "weight": "number", // Optional
    "completed": "boolean", // Optional