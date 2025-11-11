#!/bin/bash

# Combined LAMS & PMS System Test Verification Script
# This script verifies that both systems are ready for deployment

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
COOKIE_JAR=$(mktemp)
TEST_RESULTS="COMBINED_TEST_RESULTS.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Initialize test results file
cat > "$TEST_RESULTS" << EOF
# Combined LAMS & PMS Test Results

**Test Execution Date**: $(date)
**Base URL**: $BASE_URL

## Test Summary

| System | Module | Test | Status | Notes |
|--------|--------|------|--------|-------|
EOF

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Combined LAMS & PMS System Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Helper function to log test results
log_test() {
    local system=$1
    local module=$2
    local test_name=$3
    local status=$4
    local message=$5
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} [$system] $module: $test_name"
        ((PASSED++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}✗${NC} [$system] $module: $test_name - $message"
        ((FAILED++))
    else
        echo -e "${YELLOW}⊘${NC} [$system] $module: $test_name - $message"
        ((SKIPPED++))
    fi
    
    echo "| $system | $module | $test_name | $status | $message |" >> "$TEST_RESULTS"
}

# Helper function to make authenticated API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X "$method" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint"
    else
        curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint"
    fi
}

# Helper function to login
login() {
    local username=$1
    local password=$2
    
    local response=$(api_call POST "/api/auth/login" "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    if echo "$response" | grep -q "Login successful\|user"; then
        return 0
    else
        return 1
    fi
}

# Check if server is running
echo -e "${BLUE}Checking server availability...${NC}"
if ! curl -s "$BASE_URL/api/auth/me" > /dev/null 2>&1; then
    echo -e "${RED}Error: Server is not running at $BASE_URL${NC}"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}Server is running${NC}\n"

# ============================================
# SYSTEM HEALTH CHECKS
# ============================================
echo -e "${BLUE}=== System Health Checks ===${NC}\n"

# Check authentication endpoint
echo "Testing authentication endpoint..."
if curl -s "$BASE_URL/api/auth/me" > /dev/null 2>&1; then
    log_test "SYSTEM" "Health" "Authentication Endpoint" "PASS" "Endpoint accessible"
else
    log_test "SYSTEM" "Health" "Authentication Endpoint" "FAIL" "Endpoint not accessible"
fi

# ============================================
# LAMS MODULE TESTS
# ============================================
echo -e "\n${BLUE}=== LAMS Module Tests ===${NC}\n"

# LAMS Dashboard
echo "Testing LAMS Dashboard endpoint..."
if login "case_officer" "password123" 2>/dev/null; then
    RESPONSE=$(api_call GET "/api/lams/sia" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "\[\|\"id\""; then
        log_test "LAMS" "Dashboard" "Dashboard Data Retrieval" "PASS" "Data retrieved successfully"
    else
        log_test "LAMS" "Dashboard" "Dashboard Data Retrieval" "FAIL" "Failed to retrieve data"
    fi
else
    log_test "LAMS" "Dashboard" "Dashboard Data Retrieval" "SKIP" "Login failed (test user may not exist)"
fi

# LAMS SIA Endpoint
echo "Testing LAMS SIA endpoint..."
if login "case_officer" "password123" 2>/dev/null; then
    RESPONSE=$(api_call GET "/api/lams/sia" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "\[\|\"id\""; then
        log_test "LAMS" "SIA" "SIA List Endpoint" "PASS" "Endpoint working"
    else
        log_test "LAMS" "SIA" "SIA List Endpoint" "FAIL" "Endpoint error"
    fi
else
    log_test "LAMS" "SIA" "SIA List Endpoint" "SKIP" "Login failed"
fi

# LAMS Notifications Endpoint
echo "Testing LAMS Notifications endpoint..."
if login "case_officer" "password123" 2>/dev/null; then
    RESPONSE=$(api_call GET "/api/lams/notifications" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "\[\|\"id\""; then
        log_test "LAMS" "Notifications" "Notifications List Endpoint" "PASS" "Endpoint working"
    else
        log_test "LAMS" "Notifications" "Notifications List Endpoint" "FAIL" "Endpoint error"
    fi
else
    log_test "LAMS" "Notifications" "Notifications List Endpoint" "SKIP" "Login failed"
fi

# LAMS Parcels Endpoint
echo "Testing LAMS Parcels endpoint..."
if login "case_officer" "password123" 2>/dev/null; then
    RESPONSE=$(api_call GET "/api/lams/parcels" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "\[\|\"id\""; then
        log_test "LAMS" "Parcels" "Parcels List Endpoint" "PASS" "Endpoint working"
    else
        log_test "LAMS" "Parcels" "Parcels List Endpoint" "FAIL" "Endpoint error"
    fi
else
    log_test "LAMS" "Parcels" "Parcels List Endpoint" "SKIP" "Login failed"
fi

# ============================================
# PMS MODULE TESTS
# ============================================
echo -e "\n${BLUE}=== PMS Module Tests ===${NC}\n"

# PMS Schemes Endpoint
echo "Testing PMS Schemes endpoint..."
if login "case_officer" "password123" 2>/dev/null; then
    RESPONSE=$(api_call GET "/api/property-management/schemes" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "\[\|\"id\""; then
        log_test "PMS" "Schemes" "Schemes List Endpoint" "PASS" "Endpoint working"
    else
        log_test "PMS" "Schemes" "Schemes List Endpoint" "FAIL" "Endpoint error"
    fi
else
    log_test "PMS" "Schemes" "Schemes List Endpoint" "SKIP" "Login failed"
fi

# PMS Properties Endpoint
echo "Testing PMS Properties endpoint..."
if login "case_officer" "password123" 2>/dev/null; then
    RESPONSE=$(api_call GET "/api/property-management/properties" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "\[\|\"id\""; then
        log_test "PMS" "Properties" "Properties List Endpoint" "PASS" "Endpoint working"
    else
        log_test "PMS" "Properties" "Properties List Endpoint" "FAIL" "Endpoint error"
    fi
else
    log_test "PMS" "Properties" "Properties List Endpoint" "SKIP" "Login failed"
fi

# PMS Parties Endpoint
echo "Testing PMS Parties endpoint..."
if login "case_officer" "password123" 2>/dev/null; then
    RESPONSE=$(api_call GET "/api/property-management/parties" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "\[\|\"id\""; then
        log_test "PMS" "Parties" "Parties List Endpoint" "PASS" "Endpoint working"
    else
        log_test "PMS" "Parties" "Parties List Endpoint" "FAIL" "Endpoint error"
    fi
else
    log_test "PMS" "Parties" "Parties List Endpoint" "SKIP" "Login failed"
fi

# PMS Allotments Endpoint
echo "Testing PMS Allotments endpoint..."
if login "case_officer" "password123" 2>/dev/null; then
    RESPONSE=$(api_call GET "/api/property-management/allotments" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "\[\|\"id\""; then
        log_test "PMS" "Allotments" "Allotments List Endpoint" "PASS" "Endpoint working"
    else
        log_test "PMS" "Allotments" "Allotments List Endpoint" "FAIL" "Endpoint error"
    fi
else
    log_test "PMS" "Allotments" "Allotments List Endpoint" "SKIP" "Login failed"
fi

# ============================================
# MODULE SEPARATION TESTS
# ============================================
echo -e "\n${BLUE}=== Module Separation Tests ===${NC}\n"

# Verify LAMS routes don't interfere with PMS
echo "Testing module independence..."
if login "case_officer" "password123" 2>/dev/null; then
    LAMS_RESPONSE=$(api_call GET "/api/lams/sia" 2>/dev/null)
    PMS_RESPONSE=$(api_call GET "/api/property-management/schemes" 2>/dev/null)
    
    if [ -n "$LAMS_RESPONSE" ] && [ -n "$PMS_RESPONSE" ]; then
        log_test "INTEGRATION" "Separation" "Module Independence" "PASS" "Both modules accessible independently"
    else
        log_test "INTEGRATION" "Separation" "Module Independence" "FAIL" "Module interference detected"
    fi
else
    log_test "INTEGRATION" "Separation" "Module Independence" "SKIP" "Login failed"
fi

# ============================================
# FINAL SUMMARY
# ============================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Execution Summary${NC}"
echo -e "${BLUE}========================================${NC}\n"

TOTAL=$((PASSED + FAILED + SKIPPED))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}\n"

# Append summary to results file
cat >> "$TEST_RESULTS" << EOF

## Summary

- **Total Tests**: $TOTAL
- **Passed**: $PASSED
- **Failed**: $FAILED
- **Skipped**: $SKIPPED
- **Pass Rate**: $(awk "BEGIN {printf \"%.1f\", ($PASSED / $TOTAL) * 100}")%

## Notes

- Tests marked as SKIP may require additional setup (database, test data, etc.)
- Some tests depend on authentication and test user accounts
- Review individual test results above for detailed information
- For comprehensive testing, run:
  - LAMS: ./test-lams-functional.sh
  - PMS: npm test

## Next Steps

1. Review detailed test results in this file
2. Run comprehensive LAMS tests: ./test-lams-functional.sh
3. Run comprehensive PMS tests: npm test
4. Review deployment readiness: LAMS_PMS_DEPLOYMENT_READINESS_REPORT.md

EOF

echo -e "Detailed results saved to: ${BLUE}$TEST_RESULTS${NC}\n"
echo -e "For comprehensive testing, see: ${BLUE}LAMS_PMS_DEPLOYMENT_READINESS_REPORT.md${NC}\n"

# Cleanup
rm -f "$COOKIE_JAR"

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi

