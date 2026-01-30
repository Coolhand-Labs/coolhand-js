#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Checking for SSL certificates..."

# Check if certificates already exist
if [ -f "localhost.pem" ] && [ -f "localhost-key.pem" ]; then
    echo -e "${GREEN}✓ SSL certificates already exist${NC}"
    exit 0
fi

echo -e "${YELLOW}SSL certificates not found. Generating...${NC}"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo -e "${RED}Error: mkcert is not installed${NC}"
    echo ""
    echo "Please install mkcert first:"
    echo "  macOS:   brew install mkcert"
    echo "  Linux:   Follow instructions at https://github.com/FiloSottile/mkcert"
    echo ""
    echo "After installing, run this script again."
    exit 1
fi

# Install local CA if needed (this is safe to run multiple times)
echo "Installing local CA..."
mkcert -install

# Generate certificates
echo "Generating localhost certificates..."
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1

if [ -f "localhost.pem" ] && [ -f "localhost-key.pem" ]; then
    echo -e "${GREEN}✓ SSL certificates generated successfully!${NC}"
    echo ""
    echo "You can now run 'npm run dev' and access the site via https://localhost:3333"
else
    echo -e "${RED}Error: Failed to generate certificates${NC}"
    exit 1
fi
