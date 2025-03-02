#!/bin/bash

# Fix for route.ts
sed -i '7s/import { EnhancedTask, ApiResponse, RecurrencePattern, TaskPriority } from '\''@\/types'\'';/import { EnhancedTask, ApiResponse, RecurrencePattern, TaskPriority } from '\''@\/types'\'';\\nimport { convertTaskToEnhancedTask } from '\''\.\/task-utils'\'';/' src/app/api/tasks/route.ts
sed -i '22,40d' src/app/api/tasks/route.ts

# Fix for [id]/route.ts
cd src/app/api/tasks/
sed -i '7s/import { EnhancedTask, ApiResponse, RecurrencePattern, TaskPriority } from '\''@\/types'\'';/import { EnhancedTask, ApiResponse, RecurrencePattern, TaskPriority } from '\''@\/types'\'';\\nimport { convertTaskToEnhancedTask } from '\''\.\.\/task-utils'\'';/' \[id\]/route.ts
sed -i '10,29d' \[id\]/route.ts

# Fix for batch/route.ts
sed -i '7s/import { EnhancedTask, ApiResponse } from '\''@\/types'\'';/import { EnhancedTask, ApiResponse } from '\''@\/types'\'';\\nimport { convertTaskToEnhancedTask } from '\''\.\.\/task-utils'\'';/' batch/route.ts
sed -i '10,29d' batch/route.ts

# Fix for statistics/route.ts
sed -i '7s/import { ApiResponse, TaskWithHistory } from '\''@\/types'\'';/import { ApiResponse, TaskWithHistory } from '\''@\/types'\'';\\nimport { convertTaskToEnhancedTask } from '\''\.\.\/task-utils'\'';/' statistics/route.ts
sed -i '17,36d' statistics/route.ts

echo "All files updated"