#!/bin/bash

# Check if a parameter was provided
if [ $# -ne 1 ]; then
  echo "Usage: $0 <fix_type>"
  echo "Options for fix_type: all, frontend, backend"
  exit 1
fi

FIX_TYPE="$1"
echo "Running fix: $FIX_TYPE"

# Execute the appropriate fix script based on parameter
case "$FIX_TYPE" in
  "all")
    echo "Executing complete fix (frontend + backend)..."
    bash $(dirname "$0")/fix_all.sh
    ;;
  "frontend")
    echo "Executing frontend-only fix..."
    bash $(dirname "$0")/fix_frontend.sh
    ;;
  "backend")
    echo "Executing backend-only fix..."
    bash $(dirname "$0")/fix_backend.sh
    ;;
  *)
    echo "Invalid fix type. Please use one of: all, frontend, backend"
    exit 1
    ;;
esac

echo "Fix process completed." 