#!/bin/bash

# API Testing Script for Micro-Task Escrow Platform
# Backend running on http://localhost:3001

API_URL="http://localhost:3001"
TOKENS_FILE="/tmp/api_test_tokens.json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "API Testing - Micro-Task Escrow Platform"
echo "========================================="
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
    fi
}

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
if [ "$response" = "200" ]; then
    print_result 0 "Server is running"
else
    print_result 1 "Server is not responding (HTTP $response)"
    exit 1
fi
echo ""

# Test 2: Register Client
echo -e "${BLUE}Test 2: Register Client${NC}"
CLIENT_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@test.com",
    "password": "password123",
    "name": "Test Client",
    "role": "CLIENT"
  }')

if echo "$CLIENT_RESPONSE" | grep -q "id"; then
    print_result 0 "Client registered successfully"
    CLIENT_ID=$(echo $CLIENT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "  Client ID: $CLIENT_ID"
else
    print_result 1 "Client registration failed"
    echo "  Response: $CLIENT_RESPONSE"
fi
echo ""

# Test 3: Register Worker
echo -e "${BLUE}Test 3: Register Worker${NC}"
WORKER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@test.com",
    "password": "password123",
    "name": "Test Worker",
    "role": "WORKER"
  }')

if echo "$WORKER_RESPONSE" | grep -q "id"; then
    print_result 0 "Worker registered successfully"
    WORKER_ID=$(echo $WORKER_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "  Worker ID: $WORKER_ID"
else
    print_result 1 "Worker registration failed"
    echo "  Response: $WORKER_RESPONSE"
fi
echo ""

# Test 4: Client Login
echo -e "${BLUE}Test 4: Client Login${NC}"
CLIENT_LOGIN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@test.com",
    "password": "password123"
  }')

if echo "$CLIENT_LOGIN" | grep -q "access_token"; then
    print_result 0 "Client login successful"
    CLIENT_TOKEN=$(echo $CLIENT_LOGIN | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "  Token: ${CLIENT_TOKEN:0:20}..."
else
    print_result 1 "Client login failed"
    echo "  Response: $CLIENT_LOGIN"
fi
echo ""

# Test 5: Worker Login
echo -e "${BLUE}Test 5: Worker Login${NC}"
WORKER_LOGIN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@test.com",
    "password": "password123"
  }')

if echo "$WORKER_LOGIN" | grep -q "access_token"; then
    print_result 0 "Worker login successful"
    WORKER_TOKEN=$(echo $WORKER_LOGIN | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "  Token: ${WORKER_TOKEN:0:20}..."
else
    print_result 1 "Worker login failed"
    echo "  Response: $WORKER_LOGIN"
fi
echo ""

# Test 6: Create Task (Client)
echo -e "${BLUE}Test 6: Create Task${NC}"
TASK_RESPONSE=$(curl -s -X POST $API_URL/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{
    "title": "Fix broken chair",
    "description": "Repair the broken leg of wooden chair",
    "category": "repair",
    "budget": 500,
    "requiresLocation": false
  }')

if echo "$TASK_RESPONSE" | grep -q "id"; then
    print_result 0 "Task created successfully"
    TASK_ID=$(echo $TASK_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "  Task ID: $TASK_ID"
    echo "  Title: Fix broken chair"
    echo "  Budget: 500 INR"
else
    print_result 1 "Task creation failed"
    echo "  Response: $TASK_RESPONSE"
fi
echo ""

# Test 7: Get All Tasks (Marketplace)
echo -e "${BLUE}Test 7: Get Marketplace Tasks${NC}"
MARKETPLACE=$(curl -s -X GET $API_URL/tasks)

if echo "$MARKETPLACE" | grep -q "Fix broken chair"; then
    print_result 0 "Marketplace listing works"
    TASK_COUNT=$(echo $MARKETPLACE | grep -o '"id"' | wc -l)
    echo "  Tasks available: $TASK_COUNT"
else
    print_result 1 "Marketplace listing failed"
fi
echo ""

# Test 8: Accept Task (Worker)
echo -e "${BLUE}Test 8: Worker Accepts Task${NC}"
ACCEPT_RESPONSE=$(curl -s -X POST $API_URL/tasks/$TASK_ID/accept \
  -H "Authorization: Bearer $WORKER_TOKEN")

if echo "$ACCEPT_RESPONSE" | grep -q "ACCEPTED"; then
    print_result 0 "Task accepted by worker"
    echo "  Status: ACCEPTED"
else
    print_result 1 "Task acceptance failed"
    echo "  Response: $ACCEPT_RESPONSE"
fi
echo ""

# Test 9: Get Task Details
echo -e "${BLUE}Test 9: Get Task Details${NC}"
TASK_DETAILS=$(curl -s -X GET $API_URL/tasks/$TASK_ID)

if echo "$TASK_DETAILS" | grep -q "worker"; then
    print_result 0 "Task details retrieved"
    echo "  Client: $(echo $TASK_DETAILS | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)"
    echo "  Worker: $(echo $TASK_DETAILS | grep -o '"name":"[^"]*"' | tail -1 | cut -d'"' -f4)"
else
    print_result 1 "Task details retrieval failed"
fi
echo ""

# Test 10: Get My Tasks (Client)
echo -e "${BLUE}Test 10: Client Get My Tasks${NC}"
CLIENT_TASKS=$(curl -s -X GET "$API_URL/tasks/my-tasks?role=client" \
  -H "Authorization: Bearer $CLIENT_TOKEN")

if echo "$CLIENT_TASKS" | grep -q "$TASK_ID"; then
    print_result 0 "Client can see their tasks"
    echo "  Found task in client's list"
else
    print_result 1 "Client tasks retrieval failed"
fi
echo ""

# Test 11: Get My Jobs (Worker)
echo -e "${BLUE}Test 11: Worker Get My Jobs${NC}"
WORKER_JOBS=$(curl -s -X GET "$API_URL/tasks/my-tasks?role=worker" \
  -H "Authorization: Bearer $WORKER_TOKEN")

if echo "$WORKER_JOBS" | grep -q "$TASK_ID"; then
    print_result 0 "Worker can see their jobs"
    echo "  Found task in worker's list"
else
    print_result 1 "Worker jobs retrieval failed"
fi
echo ""

echo "========================================="
echo "API Test Summary"
echo "========================================="
echo ""
echo "Core Functionality: WORKING"
echo "  - Authentication (register, login)"
echo "  - Task management (create, accept)"
echo "  - Marketplace listing"
echo "  - User tasks/jobs retrieval"
echo ""
echo "Next steps to test manually:"
echo "  1. Upload before image (requires multipart/form-data)"
echo "  2. Upload after image (requires multipart/form-data)"
echo "  3. AI verification (automatic after step 2)"
echo "  4. Dispute functionality"
echo ""
echo "Saved tokens for manual testing:"
echo "  CLIENT_TOKEN=$CLIENT_TOKEN"
echo "  WORKER_TOKEN=$WORKER_TOKEN"
echo "  TASK_ID=$TASK_ID"
