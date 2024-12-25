#!/bin/bash

# Exit on error
set -e

# Create database if it doesn't exist
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'interview_platform'" | grep -q 1 || psql -U postgres -c "CREATE DATABASE interview_platform"

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Run migrations
alembic upgrade head

echo "Database initialized successfully!"