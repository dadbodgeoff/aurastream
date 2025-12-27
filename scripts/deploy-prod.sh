#!/bin/bash
# =============================================================================
# AuraStream Production Deployment Script
# =============================================================================
# Usage: ./scripts/deploy-prod.sh
# 
# This script:
# 1. Pulls latest code from git
# 2. Builds production Docker images
# 3. Starts all services
#
# NOTE: You must manually configure nginx on your droplet to proxy to:
#   - API:  localhost:8001
#   - Web:  localhost:3001
# =============================================================================

set -e

echo "🚀 AuraStream Production Deployment"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Pull latest code
echo -e "\n${GREEN}📥 Pulling latest code...${NC}"
git pull origin main

# Build and start services
echo -e "\n${GREEN}🔨 Building production images...${NC}"
docker compose -f docker-compose.prod.yml build

echo -e "\n${GREEN}🚀 Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "\n${GREEN}⏳ Waiting for services to be healthy...${NC}"
sleep 15

# Check service status
echo -e "\n${GREEN}📊 Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps

# Test health endpoint
echo -e "\n${GREEN}🏥 Testing health endpoint...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health | grep -q "200"; then
    echo -e "${GREEN}✅ API is healthy on port 8001!${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
    echo "Check logs with: docker compose -f docker-compose.prod.yml logs aurastream-api"
fi

# Test web frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    echo -e "${GREEN}✅ Web frontend is running on port 3001!${NC}"
else
    echo -e "${YELLOW}⚠️  Web frontend may still be starting...${NC}"
fi

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  IMPORTANT: Configure your nginx to proxy to AuraStream:${NC}"
echo ""
echo "Add this to your nginx config for aurastream.shop:"
echo ""
echo "    location /api/ {"
echo "        proxy_pass http://localhost:8001/api/;"
echo "        proxy_http_version 1.1;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
echo "        proxy_read_timeout 300s;"
echo "    }"
echo ""
echo "    location / {"
echo "        proxy_pass http://localhost:3001;"
echo "        proxy_http_version 1.1;"
echo "        proxy_set_header Upgrade \$http_upgrade;"
echo "        proxy_set_header Connection 'upgrade';"
echo "        proxy_set_header Host \$host;"
echo "        proxy_cache_bypass \$http_upgrade;"
echo "    }"
echo ""
echo "Then reload nginx: sudo nginx -t && sudo systemctl reload nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
