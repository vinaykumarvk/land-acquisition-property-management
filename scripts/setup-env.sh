#!/bin/bash

# Environment Setup Script
# Helps configure DATABASE_URL and other environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Environment Setup Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Keeping existing .env file${NC}"
        exit 0
    fi
fi

# Create .env from .env.example if it doesn't exist
if [ ! -f .env.example ]; then
    echo -e "${RED}✗ .env.example not found${NC}"
    exit 1
fi

cp .env.example .env
echo -e "${GREEN}✓ Created .env file from .env.example${NC}\n"

# Prompt for DATABASE_URL
echo -e "${BLUE}Database Configuration${NC}"
echo -e "${YELLOW}Enter your PostgreSQL DATABASE_URL:${NC}"
echo -e "${YELLOW}Format: postgresql://user:password@host:port/database${NC}"
echo -e "${YELLOW}Or press Enter to set it later${NC}"
read -p "DATABASE_URL: " DATABASE_URL

if [ -n "$DATABASE_URL" ]; then
    # Update .env file with DATABASE_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
    else
        # Linux
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
    fi
    echo -e "${GREEN}✓ DATABASE_URL set in .env${NC}\n"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not set. Please edit .env file manually${NC}\n"
fi

# Optional: Prompt for other variables
read -p "Do you want to configure other environment variables? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}Optional Configuration${NC}"
    
    # OpenAI API Key
    read -p "OpenAI API Key (optional, press Enter to skip): " OPENAI_KEY
    if [ -n "$OPENAI_KEY" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|# OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
        else
            sed -i "s|# OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
        fi
        echo -e "${GREEN}✓ OpenAI API Key set${NC}"
    fi
    
    # Port
    read -p "Server Port (default: 5000, press Enter to skip): " PORT
    if [ -n "$PORT" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|# PORT=.*|PORT=$PORT|" .env
        else
            sed -i "s|# PORT=.*|PORT=$PORT|" .env
        fi
        echo -e "${GREEN}✓ Port set to $PORT${NC}"
    fi
fi

echo -e "\n${GREEN}✓ Environment setup complete!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Review your .env file: ${GREEN}cat .env${NC}"
echo -e "2. Run deployment: ${GREEN}./scripts/deploy.sh${NC}"
echo -e "3. Or start development: ${GREEN}npm run dev${NC}\n"

