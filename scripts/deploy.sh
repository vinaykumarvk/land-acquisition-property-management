#!/bin/bash

# Deployment Script for LAMS & PMS Combined Application
# This script handles the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}LAMS & PMS Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env and set your DATABASE_URL${NC}"
        echo -e "${YELLOW}   Then run this script again${NC}"
        exit 1
    else
        echo -e "${RED}✗ .env.example not found. Please create .env manually${NC}"
        exit 1
    fi
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL is not set in .env file${NC}"
    echo -e "${YELLOW}Please set DATABASE_URL in your .env file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ DATABASE_URL is set${NC}\n"

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}\n"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Step 2: Type check
echo -e "${BLUE}Step 2: Running TypeScript type check...${NC}"
if npm run check; then
    echo -e "${GREEN}✓ Type check passed${NC}\n"
else
    echo -e "${RED}✗ Type check failed${NC}"
    exit 1
fi

# Step 3: Push database schema
echo -e "${BLUE}Step 3: Pushing database schema...${NC}"
if npm run db:push; then
    echo -e "${GREEN}✓ Database schema pushed${NC}\n"
else
    echo -e "${RED}✗ Failed to push database schema${NC}"
    echo -e "${YELLOW}⚠️  Check your DATABASE_URL and database connection${NC}"
    exit 1
fi

# Step 4: Build application
echo -e "${BLUE}Step 4: Building application...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Application built successfully${NC}\n"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# Step 5: Run tests (optional, can be skipped)
read -p "Do you want to run tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Step 5: Running tests...${NC}"
    if npm test; then
        echo -e "${GREEN}✓ Tests passed${NC}\n"
    else
        echo -e "${YELLOW}⚠️  Some tests failed, but continuing deployment...${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping tests${NC}\n"
fi

# Step 6: Deployment summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo -e "${GREEN}✓ Type check passed${NC}"
echo -e "${GREEN}✓ Database schema pushed${NC}"
echo -e "${GREEN}✓ Application built${NC}"
echo -e "${GREEN}✓ Ready for deployment${NC}\n"

echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Start the application: ${GREEN}npm start${NC}"
echo -e "2. Or run in development: ${GREEN}npm run dev${NC}"
echo -e "3. Verify health: ${GREEN}curl http://localhost:5000/api/auth/me${NC}\n"

echo -e "${GREEN}Deployment preparation complete!${NC}\n"

