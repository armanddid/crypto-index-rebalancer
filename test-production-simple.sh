#!/bin/bash

# Simple Production API Test Script
BASE_URL="https://crypto-index-rebalancer-production.up.railway.app"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="SecurePassword123!"
NAME="Production Test User"

echo "=========================================="
echo "🧪 Testing Production Deployment"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Test Email: $EMAIL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local headers=$5
    
    echo -n "Testing: $name... "
    
    if [ -z "$headers" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "$headers" \
            -d "$data" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        FAILED=$((FAILED + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
}

# 1. Health Check
echo "=========================================="
echo "1️⃣  Health Check"
echo "=========================================="
test_endpoint "Health Check" "GET" "/api/health" "" ""

# 2. User Registration
echo "=========================================="
echo "2️⃣  User Registration"
echo "=========================================="
test_endpoint "Register User" "POST" "/api/auth/register" \
    "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}" ""

# 3. User Login
echo "=========================================="
echo "3️⃣  User Login"
echo "=========================================="
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$login_response" | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}✗ FAIL${NC} - Could not extract token"
    echo "$login_response" | jq '.'
    FAILED=$((FAILED + 1))
    exit 1
else
    echo -e "${GREEN}✓ PASS${NC} - Login successful"
    echo "Token: ${TOKEN:0:20}..."
    PASSED=$((PASSED + 1))
fi
echo ""

# 4. Get User Info
echo "=========================================="
echo "4️⃣  Get User Info"
echo "=========================================="
test_endpoint "Get User Info" "GET" "/api/auth/me" "" "Authorization: Bearer $TOKEN"

# 5. Create Account (with wallet)
echo "=========================================="
echo "5️⃣  Create Account with Wallet"
echo "=========================================="
account_response=$(curl -s -X POST "$BASE_URL/api/accounts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Production Test Account","description":"Testing on Railway"}')

ACCOUNT_ID=$(echo "$account_response" | jq -r '.accountId // .account.accountId // empty')
WALLET_ADDRESS=$(echo "$account_response" | jq -r '.walletAddress // .account.walletAddress // empty')

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" == "null" ]; then
    echo -e "${RED}✗ FAIL${NC} - Could not create account"
    echo "$account_response" | jq '.'
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Account created"
    echo "Account ID: $ACCOUNT_ID"
    echo "Wallet Address: $WALLET_ADDRESS"
    PASSED=$((PASSED + 1))
fi
echo ""

# 6. Create Index
echo "=========================================="
echo "6️⃣  Create Index"
echo "=========================================="
index_response=$(curl -s -X POST "$BASE_URL/api/indexes" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
        \"accountId\":\"$ACCOUNT_ID\",
        \"name\":\"Production Test Index\",
        \"description\":\"Testing index creation on Railway\",
        \"allocations\":[
            {\"symbol\":\"BTC\",\"percentage\":50},
            {\"symbol\":\"ETH\",\"percentage\":30},
            {\"symbol\":\"SOL\",\"percentage\":20}
        ],
        \"rebalancingConfig\":{
            \"method\":\"DRIFT\",
            \"driftThreshold\":5
        },
        \"riskConfig\":{
            \"maxDrawdown\":20,
            \"stopLoss\":15
        }
    }")

INDEX_ID=$(echo "$index_response" | jq -r '.index.indexId // .indexId // empty')

if [ -z "$INDEX_ID" ] || [ "$INDEX_ID" == "null" ]; then
    echo -e "${RED}✗ FAIL${NC} - Could not create index"
    echo "$index_response" | jq '.'
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Index created"
    echo "Index ID: $INDEX_ID"
    PASSED=$((PASSED + 1))
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

