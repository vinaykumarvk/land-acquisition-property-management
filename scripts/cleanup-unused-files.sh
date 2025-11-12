#!/bin/bash

# Repository Cleanup Script for LAMS/PMS Application
# This script identifies and optionally removes unused files
# Based on REPOSITORY_SIZE_ANALYSIS.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Repository Cleanup Script"
echo "=========================================="
echo ""
echo "Current directory: $PROJECT_ROOT"
echo ""

# Function to calculate directory size
calc_size() {
    if [ -d "$1" ] || [ -f "$1" ]; then
        du -sh "$1" 2>/dev/null | awk '{print $1}'
    else
        echo "0"
    fi
}

# Function to count files
count_files() {
    if [ -d "$1" ]; then
        find "$1" -type f 2>/dev/null | wc -l | tr -d ' '
    elif [ -f "$1" ]; then
        echo "1"
    else
        echo "0"
    fi
}

echo "=== ANALYSIS MODE ==="
echo ""

# 1. Check attached_assets
echo "1. Checking attached_assets/ directory..."
ATTACHED_SIZE=$(calc_size "attached_assets")
ATTACHED_COUNT=$(count_files "attached_assets")
echo "   Size: $ATTACHED_SIZE"
echo "   Files: $ATTACHED_COUNT"
if [ -d "attached_assets" ]; then
    echo "   Status: ❌ UNUSED (no code references found)"
else
    echo "   Status: ✅ Already removed"
fi
echo ""

# 2. Check test files
echo "2. Checking test files..."
TEST_PDF_SIZE=$(calc_size "test-download.pdf" 2>/dev/null || echo "0")
TEST_TXT_COUNT=$(find . -maxdepth 1 -name "test-*.txt" -type f 2>/dev/null | wc -l | tr -d ' ')
TEST_JSON_COUNT=$(find . -maxdepth 1 -name "test-*.json" -type f 2>/dev/null | wc -l | tr -d ' ')
TEST_SH_COUNT=$(find . -maxdepth 1 -name "test-*.sh" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "   test-download.pdf: $TEST_PDF_SIZE"
echo "   test-*.txt files: $TEST_TXT_COUNT"
echo "   test-*.json files: $TEST_JSON_COUNT"
echo "   test-*.sh files: $TEST_SH_COUNT"
echo "   Status: ❌ UNUSED (test artifacts)"
echo ""

# 3. Check log files
echo "3. Checking log files..."
LOG_COUNT=$(find . -maxdepth 1 -name "*.log" -type f 2>/dev/null | wc -l | tr -d ' ')
LOG_SIZE=$(find . -maxdepth 1 -name "*.log" -type f -exec du -ch {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
echo "   Count: $LOG_COUNT"
echo "   Total Size: $LOG_SIZE"
echo "   Status: ❌ UNUSED (test execution logs)"
echo ""

# 4. Check backup files
echo "4. Checking backup files..."
BACKUP_COUNT=$(find . -name "*.backup" -type f 2>/dev/null | wc -l | tr -d ' ')
BACKUP_SIZE=$(find . -name "*.backup" -type f -exec du -ch {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
echo "   Count: $BACKUP_COUNT"
echo "   Total Size: $BACKUP_SIZE"
echo "   Status: ❌ UNUSED (code backups)"
echo ""

# 5. Check dist directory
echo "5. Checking dist/ directory..."
DIST_SIZE=$(calc_size "dist")
DIST_COUNT=$(count_files "dist")
echo "   Size: $DIST_SIZE"
echo "   Files: $DIST_COUNT"
if [ -d "dist" ]; then
    echo "   Status: ⚠️  REGENERABLE (can be rebuilt with 'npm run build')"
else
    echo "   Status: ✅ Already removed"
fi
echo ""

# 6. Check documentation files
echo "6. Checking documentation files..."
DOC_COUNT=$(find . -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
DOC_SIZE=$(find . -maxdepth 1 -name "*.md" -type f -exec du -ch {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
echo "   Count: $DOC_COUNT"
echo "   Total Size: $DOC_SIZE"
echo "   Status: ⚠️  OPTIONAL (keep essential, remove phase/test reports)"
echo ""

# 7. Check other unused files
echo "7. Checking other unused files..."
OTHER_FILES=(
    "session_cookie.txt"
    "proposal-consistency-analysis.json"
    "test_result.json"
)
OTHER_TOTAL=0
for file in "${OTHER_FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(calc_size "$file")
        echo "   $file: $size"
        OTHER_TOTAL=$((OTHER_TOTAL + 1))
    fi
done
if [ $OTHER_TOTAL -eq 0 ]; then
    echo "   No other unused files found"
fi
echo ""

# Summary
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Files that can be safely removed:"
echo "  - attached_assets/ ($ATTACHED_SIZE, $ATTACHED_COUNT files)"
echo "  - test-download.pdf ($TEST_PDF_SIZE)"
echo "  - test-*.txt, test-*.json, test-*.sh files"
echo "  - *.log files ($LOG_SIZE)"
echo "  - *.backup files ($BACKUP_SIZE)"
echo "  - dist/ ($DIST_SIZE, $DIST_COUNT files) [regenerable]"
echo "  - Documentation files ($DOC_SIZE) [optional]"
echo ""

# Interactive mode
if [ "$1" = "--remove" ]; then
    echo "=========================================="
    echo "REMOVAL MODE"
    echo "=========================================="
    echo ""
    read -p "Are you sure you want to remove unused files? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    
    echo ""
    echo "Removing files..."
    
    # Remove attached_assets
    if [ -d "attached_assets" ]; then
        echo "  Removing attached_assets/..."
        rm -rf attached_assets/
        echo "  ✅ Removed attached_assets/"
    fi
    
    # Remove test files
    echo "  Removing test files..."
    find . -maxdepth 1 -name "test-*.pdf" -type f -delete 2>/dev/null || true
    find . -maxdepth 1 -name "test-*.txt" -type f -delete 2>/dev/null || true
    find . -maxdepth 1 -name "test-*.json" -type f -delete 2>/dev/null || true
    find . -maxdepth 1 -name "test-*.sh" -type f -delete 2>/dev/null || true
    [ -f "proposal-consistency-analysis.json" ] && rm -f proposal-consistency-analysis.json
    [ -f "test_result.json" ] && rm -f test_result.json
    [ -f "session_cookie.txt" ] && rm -f session_cookie.txt
    echo "  ✅ Removed test files"
    
    # Remove log files
    echo "  Removing log files..."
    find . -maxdepth 1 -name "*.log" -type f -delete 2>/dev/null || true
    echo "  ✅ Removed log files"
    
    # Remove backup files
    echo "  Removing backup files..."
    find . -name "*.backup" -type f -delete 2>/dev/null || true
    echo "  ✅ Removed backup files"
    
    # Remove dist (optional)
    read -p "  Remove dist/ directory? (yes/no): " remove_dist
    if [ "$remove_dist" = "yes" ]; then
        if [ -d "dist" ]; then
            rm -rf dist/
            echo "  ✅ Removed dist/"
        fi
    fi
    
    # Remove documentation (optional)
    read -p "  Remove phase/test/deployment documentation? (yes/no): " remove_docs
    if [ "$remove_docs" = "yes" ]; then
        echo "  Removing documentation files..."
        find . -maxdepth 1 -name "PHASE_*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "PMS_*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "LAMS_*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "TEST*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "DEPLOYMENT*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "MOBILE*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "UI_*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "ROUTE*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "MIGRATION*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "GROUP*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "FUNCTIONAL*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "FINAL*.md" -type f -delete 2>/dev/null || true
        find . -maxdepth 1 -name "COMBINED*.md" -type f -delete 2>/dev/null || true
        echo "  ✅ Removed documentation files"
    fi
    
    echo ""
    echo "=========================================="
    echo "CLEANUP COMPLETE"
    echo "=========================================="
    echo ""
    echo "Remaining repository size:"
    du -sh . 2>/dev/null | awk '{print "  Total: " $1}'
    echo ""
    echo "Note: Run 'git status' to see removed files."
    echo "      Commit changes with: git add -A && git commit -m 'Remove unused files'"
else
    echo "To remove these files, run:"
    echo "  ./scripts/cleanup-unused-files.sh --remove"
    echo ""
    echo "Or manually remove:"
    echo "  rm -rf attached_assets/"
    echo "  rm -f test-*.pdf test-*.txt test-*.json test-*.sh"
    echo "  rm -f *.log *.backup session_cookie.txt"
    echo "  rm -f proposal-consistency-analysis.json test_result.json"
    echo "  rm -rf dist/  # (optional, can be regenerated)"
fi

echo ""

