#!/bin/bash

# Script to kill inactive Node.js processes related to the asset management workflow
# Usage: ./scripts/kill-inactive-processes.sh [--force]

set -e

FORCE_KILL=false
if [[ "$1" == "--force" ]]; then
    FORCE_KILL=true
fi

PROJECT_DIR="/Users/n15318/asset_management_workflow"
SIGNAL="TERM"
if [[ "$FORCE_KILL" == "true" ]]; then
    SIGNAL="KILL"
fi

echo "🔍 Finding Node.js processes related to asset_management_workflow..."
echo ""

# Find all Node.js processes related to this project
PROCESSES=$(ps aux | grep -E "node|npm|tsx|drizzle-kit" | grep "$PROJECT_DIR" | grep -v grep || true)

if [[ -z "$PROCESSES" ]]; then
    echo "✅ No active Node.js processes found for this project."
    exit 0
fi

echo "📋 Found the following processes:"
echo "$PROCESSES" | awk '{printf "  PID: %-8s CPU: %-6s TIME: %-12s CMD: %s\n", $2, $3, $10, substr($0, index($0,$11))}'
echo ""

# Extract PIDs
PIDS=$(echo "$PROCESSES" | awk '{print $2}')

if [[ -z "$PIDS" ]]; then
    echo "✅ No processes to kill."
    exit 0
fi

echo "⚠️  About to kill the following processes: $PIDS"
echo "   Signal: $SIGNAL"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 0
fi

# Kill each process
KILLED=0
FAILED=0

for PID in $PIDS; do
    if kill -0 "$PID" 2>/dev/null; then
        if kill -$SIGNAL "$PID" 2>/dev/null; then
            echo "✅ Killed process $PID"
            ((KILLED++))
        else
            echo "❌ Failed to kill process $PID"
            ((FAILED++))
        fi
    else
        echo "⚠️  Process $PID no longer exists"
    fi
done

echo ""
echo "📊 Summary:"
echo "   Killed: $KILLED"
echo "   Failed: $FAILED"

if [[ $KILLED -gt 0 ]]; then
    echo ""
    echo "✅ Done! Inactive processes have been terminated."
fi

