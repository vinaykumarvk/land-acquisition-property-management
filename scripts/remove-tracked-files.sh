#!/bin/bash

# Script to remove files from git tracking that should not be pushed to GitHub
# Based on GITHUB_PUSH_SIZE_ANALYSIS.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Remove Files from Git Tracking"
echo "=========================================="
echo ""
echo "This script will remove files from git tracking that should not be pushed to GitHub."
echo "The files will remain on your local machine, but won't be tracked by git anymore."
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not a git repository"
    exit 1
fi

# Show what will be removed
echo "Files that will be removed from git tracking:"
echo ""

# Check what's currently tracked
echo "1. Checking uploads/ directory..."
if git ls-files uploads/ | grep -q .; then
    UPLOADS_COUNT=$(git ls-files uploads/ | wc -l | tr -d ' ')
    UPLOADS_SIZE=$(git ls-files uploads/ -z | xargs -0 du -ch 2>/dev/null | tail -1 | awk '{print $1}')
    echo "   Found: $UPLOADS_COUNT files ($UPLOADS_SIZE)"
else
    echo "   No files found (already untracked)"
fi

echo ""
echo "2. Checking attached_assets/ directory..."
if git ls-files attached_assets/ | grep -q .; then
    ASSETS_COUNT=$(git ls-files attached_assets/ | wc -l | tr -d ' ')
    ASSETS_SIZE=$(git ls-files attached_assets/ -z | xargs -0 du -ch 2>/dev/null | tail -1 | awk '{print $1}')
    echo "   Found: $ASSETS_COUNT files ($ASSETS_SIZE)"
else
    echo "   No files found (already untracked)"
fi

echo ""
echo "3. Checking log files..."
LOG_FILES=$(git ls-files | grep -E "\.log$" || true)
if [ -n "$LOG_FILES" ]; then
    LOG_COUNT=$(echo "$LOG_FILES" | wc -l | tr -d ' ')
    echo "   Found: $LOG_COUNT log files"
    echo "$LOG_FILES" | sed 's/^/     - /'
else
    echo "   No log files found (already untracked)"
fi

echo ""
echo "4. Checking test files..."
TEST_FILES=$(git ls-files | grep -E "^test-.*\.(pdf|txt|json|sh)$" || true)
if [ -n "$TEST_FILES" ]; then
    TEST_COUNT=$(echo "$TEST_FILES" | wc -l | tr -d ' ')
    echo "   Found: $TEST_COUNT test files"
    echo "$TEST_FILES" | head -5 | sed 's/^/     - /'
    [ $TEST_COUNT -gt 5 ] && echo "     ... and $((TEST_COUNT - 5)) more"
else
    echo "   No test files found (already untracked)"
fi

echo ""
echo "5. Checking other files..."
OTHER_FILES=$(git ls-files | grep -E "(\.backup$|session_cookie\.txt|proposal-consistency-analysis\.json|test_result\.json)" || true)
if [ -n "$OTHER_FILES" ]; then
    OTHER_COUNT=$(echo "$OTHER_FILES" | wc -l | tr -d ' ')
    echo "   Found: $OTHER_COUNT other files"
    echo "$OTHER_FILES" | sed 's/^/     - /'
else
    echo "   No other files found (already untracked)"
fi

echo ""
echo "=========================================="
read -p "Do you want to remove these files from git tracking? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Removing files from git tracking..."

# Remove uploads/
if git ls-files uploads/ | grep -q .; then
    echo "  Removing uploads/ from git tracking..."
    git rm -r --cached uploads/ 2>/dev/null || true
    echo "  ✅ Removed uploads/"
fi

# Remove attached_assets/
if git ls-files attached_assets/ | grep -q .; then
    echo "  Removing attached_assets/ from git tracking..."
    git rm -r --cached attached_assets/ 2>/dev/null || true
    echo "  ✅ Removed attached_assets/"
fi

# Remove log files
if [ -n "$LOG_FILES" ]; then
    echo "  Removing log files from git tracking..."
    echo "$LOG_FILES" | xargs git rm --cached 2>/dev/null || true
    echo "  ✅ Removed log files"
fi

# Remove test files
if [ -n "$TEST_FILES" ]; then
    echo "  Removing test files from git tracking..."
    echo "$TEST_FILES" | xargs git rm --cached 2>/dev/null || true
    echo "  ✅ Removed test files"
fi

# Remove other files
if [ -n "$OTHER_FILES" ]; then
    echo "  Removing other files from git tracking..."
    echo "$OTHER_FILES" | xargs git rm --cached 2>/dev/null || true
    echo "  ✅ Removed other files"
fi

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Files have been removed from git tracking."
echo "The files still exist on your local machine."
echo ""
echo "Next steps:"
echo "  1. Review the changes: git status"
echo "  2. Stage .gitignore: git add .gitignore"
echo "  3. Commit the changes:"
echo "     git commit -m 'Remove user-generated content and development artifacts from git tracking'"
echo ""
echo "After committing, the size that will be pushed to GitHub will be reduced."
echo ""

