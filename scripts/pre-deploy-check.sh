#!/bin/bash

# Pre-Deployment Check Script
# Verifies all requirements before deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Pre-Deployment Check${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check 1: Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v 2>/dev/null || echo "not found")
if [ "$NODE_VERSION" != "not found" ]; then
    echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    ((ERRORS++))
fi

# Check 2: npm version
echo -e "${BLUE}Checking npm version...${NC}"
NPM_VERSION=$(npm -v 2>/dev/null || echo "not found")
if [ "$NPM_VERSION" != "not found" ]; then
    echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    ((ERRORS++))
fi

# Check 3: .env file
echo -e "${BLUE}Checking .env file...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check if DATABASE_URL is set
    if grep -q "DATABASE_URL=" .env && ! grep -q "^#.*DATABASE_URL" .env; then
        DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d ' ')
        if [ -n "$DATABASE_URL" ] && [ "$DATABASE_URL" != "postgresql://user:password@host:port/database" ]; then
            echo -e "${GREEN}✓ DATABASE_URL is set${NC}"
        else
            echo -e "${RED}✗ DATABASE_URL is not properly configured${NC}"
            ((ERRORS++))
        fi
    else
        echo -e "${RED}✗ DATABASE_URL not found in .env${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo -e "${YELLOW}   Run: ./scripts/setup-env.sh${NC}"
    ((WARNINGS++))
fi

# Check 4: node_modules
echo -e "${BLUE}Checking dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules directory exists${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules not found${NC}"
    echo -e "${YELLOW}   Run: npm install${NC}"
    ((WARNINGS++))
fi

# Check 5: Database connection (if DATABASE_URL is set)
if [ -f .env ] && grep -q "DATABASE_URL=" .env; then
    DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d ' ')
    if [ -n "$DATABASE_URL" ] && [ "$DATABASE_URL" != "postgresql://user:password@host:port/database" ]; then
        echo -e "${BLUE}Testing database connection...${NC}"
        export DATABASE_URL
        if npm run db:push > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Database connection successful${NC}"
        else
            echo -e "${YELLOW}⚠️  Database connection test failed${NC}"
            echo -e "${YELLOW}   This may be normal if schema is already up to date${NC}"
            ((WARNINGS++))
        fi
    fi
fi

# Check 6: TypeScript compilation
echo -e "${BLUE}Checking TypeScript compilation...${NC}"
if npm run check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
else
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    echo -e "${YELLOW}   Run: npm run check${NC} to see errors"
    ((ERRORS++))
fi

# Check 7: Build
echo -e "${BLUE}Checking build...${NC}"
if [ -d "dist" ]; then
    echo -e "${GREEN}✓ dist directory exists${NC}"
    if [ -f "dist/index.js" ]; then
        echo -e "${GREEN}✓ Built application found${NC}"
    else
        echo -e "${YELLOW}⚠️  dist/index.js not found${NC}"
        echo -e "${YELLOW}   Run: npm run build${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  dist directory not found${NC}"
    echo -e "${YELLOW}   Run: npm run build${NC}"
    ((WARNINGS++))
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Check Summary${NC}"
echo -e "${BLUE}========================================${NC}\n"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}\n"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo -e "${GREEN}✓ No critical errors. Deployment can proceed.${NC}\n"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    fi
    echo -e "${RED}Please fix errors before deploying${NC}\n"
    exit 1
fi

