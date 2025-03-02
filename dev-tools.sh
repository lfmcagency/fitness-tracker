#!/bin/bash
# Simple development tools for fitness app

# Color codes for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Display a header for a task
show_header() {
  echo -e "\n${BLUE}===== $1 =====${NC}\n"
}

# Show success message
show_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Show error message
show_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Show warning message
show_warning() {
  echo -e "${YELLOW}! $1${NC}"
}

# Test database connection
test_db_connection() {
  show_header "Testing Database Connection"
  
  # Check for the environment file
  if [ ! -f .env.local ]; then
    show_error "No .env.local file found. Please create one with your MongoDB connection string."
    return 1
  fi
  
  # Use our dedicated test script
  node scripts/test-mongodb-connection.js
  
  if [ $? -eq 0 ]; then
    show_success "Database connection successful!"
  else
    show_error "Database connection failed. Check your connection string."
  fi
}

# Test API endpoints
test_api_endpoints() {
  show_header "Testing API Endpoints"
  
  # Check for the App Router API directory (Next.js 13+)
  API_DIR="src/app/api"
  if [ ! -d "$API_DIR" ]; then
    # Check for Pages Router API directory (older Next.js)
    API_DIR="src/pages/api"
    if [ ! -d "$API_DIR" ]; then
      API_DIR="pages/api"
      if [ ! -d "$API_DIR" ]; then
        show_error "Could not find API directory. Make sure you're in the project root."
        return 1
      fi
    fi
  fi
  
  echo "Found API directory at $API_DIR"
  
  # Start the development server in the background
  echo "Starting development server for testing..."
  npm run dev > /dev/null 2>&1 &
  DEV_SERVER_PID=$!
  
  # Give it some time to start up
  sleep 8
  
  # Test some basic endpoints
  endpoints=(
    "api/health"
    "api/debug/health"
    "api/exercises"
    "api/tasks"
  )
  
  for endpoint in "${endpoints[@]}"; do
    echo "Testing endpoint: $endpoint"
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/$endpoint)
    
    if [[ $response == 2* ]]; then
      show_success "Endpoint $endpoint returned $response"
    else
      show_warning "Endpoint $endpoint returned $response"
    fi
  done
  
  # Stop the development server
  echo "Stopping development server..."
  kill $DEV_SERVER_PID
  wait $DEV_SERVER_PID 2>/dev/null || true
  sleep 2
}

# Run linting and check for build errors
lint_and_build_check() {
  show_header "Linting and Build Check"
  
  echo "Running linting..."
  npm run lint
  
  if [ $? -eq 0 ]; then
    show_success "Linting passed!"
  else
    show_error "Linting failed. Please fix the errors."
    return 1
  fi
  
  echo "Running build check..."
  npm run build
  
  if [ $? -eq 0 ]; then
    show_success "Build successful!"
  else
    show_error "Build failed. Please fix the errors."
    return 1
  fi
}

# Simple git workflow
git_quick_commit() {
  show_header "Git Quick Commit"
  
  # Check if there are any changes
  if [ -z "$(git status --porcelain)" ]; then
    show_warning "No changes to commit."
    return 0
  fi
  
  # Add all changes
  echo "Adding all changes..."
  git add .
  
  # Prompt for commit message
  read -p "Enter commit message (or press Enter for default): " commit_msg
  
  if [ -z "$commit_msg" ]; then
    # Generate a default commit message based on changed files
    file_count=$(git diff --cached --name-only | wc -l)
    changed_dirs=$(git diff --cached --name-only | xargs dirname | sort | uniq | head -3 | tr '\n' ' ')
    commit_msg="Update ${file_count} files in ${changed_dirs}..."
  fi
  
  # Commit changes
  echo "Committing with message: $commit_msg"
  git commit -m "$commit_msg"
  
  # Ask about pushing
  read -p "Do you want to push changes? (y/n): " should_push
  
  if [[ $should_push == "y" || $should_push == "Y" ]]; then
    echo "Pushing to remote..."
    git push
    
    if [ $? -eq 0 ]; then
      show_success "Successfully pushed changes!"
    else
      show_error "Failed to push changes."
    fi
  else
    show_warning "Changes committed but not pushed."
  fi
}

# Test authentication system
test_auth_system() {
  show_header "Testing Authentication System"
  
  # Check for the environment file
  if [ ! -f .env.local ]; then
    show_error "No .env.local file found. Please create one with your MongoDB connection string."
    return 1
  fi
  
  # Use our dedicated auth test script
  node scripts/test-auth-flow.js
  
  if [ $? -eq 0 ]; then
    show_success "Authentication system is working properly!"
  else
    show_error "Authentication system test failed. Check the logs for details."
  fi
}

# Test nutrition API
test_nutrition_api() {
  show_header "Testing Nutrition API"
  
  # Check for the environment file
  if [ ! -f .env.local ]; then
    show_error "No .env.local file found. Please create one with your MongoDB connection string."
    return 1
  fi
  
  # Use our dedicated nutrition test script
  node scripts/test-nutrition-api.js
  
  if [ $? -eq 0 ]; then
    show_success "Nutrition API is working properly!"
  else
    show_error "Nutrition API test failed. Check the logs for details."
  fi
}

# Test tasks API
test_tasks_api() {
  show_header "Testing Tasks API"
  
  # Check for the environment file
  if [ ! -f .env.local ]; then
    show_error "No .env.local file found. Please create one with your MongoDB connection string."
    return 1
  fi
  
  # Use our dedicated tasks test script
  node scripts/test-tasks-api.js
  
  if [ $? -eq 0 ]; then
    show_success "Tasks API is working properly!"
  else
    show_error "Tasks API test failed. Check the logs for details."
  fi
}

# Run all checks
run_all_checks() {
  show_header "Running All Checks"
  
  test_db_connection
  test_auth_system
  test_api_endpoints
  test_nutrition_api
  test_tasks_api
  lint_and_build_check
  
  if [ $? -eq 0 ]; then
    show_success "All checks passed! You can now commit your changes."
    
    read -p "Do you want to commit and push now? (y/n): " should_commit
    
    if [[ $should_commit == "y" || $should_commit == "Y" ]]; then
      git_quick_commit
    fi
  else
    show_error "Some checks failed. Please fix the issues before committing."
  fi
}

# Show usage information
show_usage() {
  echo "Fitness App Development Tools"
  echo ""
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  db          Test database connection"
  echo "  auth        Test authentication system"
  echo "  api         Test API endpoints"
  echo "  nutrition   Test nutrition API"
  echo "  tasks       Test tasks API"
  echo "  lint        Run linting and build check"
  echo "  commit      Quick git add, commit, and push"
  echo "  all         Run all checks and then commit"
  echo "  help        Show this help message"
  echo ""
}

# Parse command line arguments
if [ $# -eq 0 ]; then
  show_usage
  exit 0
fi

case "$1" in
  db)
    test_db_connection
    ;;
  auth)
    test_auth_system
    ;;
  api)
    test_api_endpoints
    ;;
  nutrition)
    test_nutrition_api
    ;;
  tasks)
    test_tasks_api
    ;;
  lint)
    lint_and_build_check
    ;;
  commit)
    git_quick_commit
    ;;
  all)
    run_all_checks
    ;;
  help)
    show_usage
    ;;
  *)
    show_error "Unknown command: $1"
    show_usage
    exit 1
    ;;
esac

exit 0