#!/bin/bash
# Test script for video compilation function
# This helps verify the function is working correctly

set -e

echo "========================================="
echo "Testing Video Compilation Function"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found"
    echo "Install from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Test 1: Check if function is deployed
echo "Test 1: Checking function deployment..."
echo "---------------------------------------"

if supabase functions list 2>&1 | grep -q "video-compilation"; then
    print_success "video-compilation function is deployed"
else
    print_error "video-compilation function not found"
    echo ""
    echo "Deploy with:"
    echo "  supabase functions deploy video-compilation --docker"
    exit 1
fi
echo ""

# Test 2: Check function logs
echo "Test 2: Checking recent logs..."
echo "-------------------------------"

print_info "Fetching last 5 log entries..."
supabase functions logs video-compilation --limit 5

echo ""

# Test 3: Check Docker image locally (if Docker available)
echo "Test 3: Checking local Docker image..."
echo "--------------------------------------"

if command -v docker &> /dev/null; then
    if docker images | grep -q "video-compilation-function"; then
        print_success "Docker image 'video-compilation-function' found locally"

        # Test FFmpeg in container
        print_info "Testing FFmpeg in container..."
        if docker run --rm video-compilation-function ffmpeg -version | head -n 1; then
            print_success "FFmpeg is working in the container"
        else
            print_warning "FFmpeg test failed"
        fi
    else
        print_warning "Docker image not found locally"
        echo "Build with: cd supabase/functions/video-compilation && docker build -t video-compilation-function ."
    fi
else
    print_warning "Docker not available, skipping local image test"
fi
echo ""

# Test 4: Check environment variables
echo "Test 4: Checking environment variables..."
echo "-----------------------------------------"

print_info "Required environment variables:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_ANON_KEY"
echo ""
print_info "Optional environment variables:"
echo "  - FFMPEG_PATH (default: ffmpeg)"
echo "  - USE_MOCK_VIDEO (default: false)"
echo ""
echo "View/set secrets at:"
echo "  https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions"
echo ""

# Test 5: Test function invocation (if project ID provided)
echo "Test 5: Function invocation test..."
echo "------------------------------------"

read -p "Do you have a project ID to test with? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter project ID: " PROJECT_ID
    read -p "Enter your Supabase Anon Key: " ANON_KEY

    # Get Supabase URL from status
    SUPABASE_URL=$(supabase status 2>/dev/null | grep "API URL" | awk '{print $3}')

    if [ -z "$SUPABASE_URL" ]; then
        print_warning "Could not auto-detect Supabase URL"
        read -p "Enter your Supabase URL: " SUPABASE_URL
    fi

    echo ""
    print_info "Testing function invocation..."
    echo "URL: $SUPABASE_URL/functions/v1/video-compilation"
    echo "Project ID: $PROJECT_ID"
    echo ""

    RESPONSE=$(curl -s -X POST \
        "${SUPABASE_URL}/functions/v1/video-compilation" \
        -H "Authorization: Bearer ${ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"project_id\": \"${PROJECT_ID}\"}")

    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""

    if echo "$RESPONSE" | grep -q "error"; then
        print_error "Function returned an error"
        print_info "Check logs with: supabase functions logs video-compilation --tail"
    else
        print_success "Function executed (check response above for details)"
    fi
else
    print_info "Skipping invocation test"
    echo ""
    echo "To test manually:"
    echo "  curl -X POST 'YOUR_SUPABASE_URL/functions/v1/video-compilation' \\"
    echo "    -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"project_id\": \"your-project-id\"}'"
fi

echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
print_info "Next steps:"
echo "1. Create a test project in your app"
echo "2. Monitor logs: supabase functions logs video-compilation --tail"
echo "3. Check video output in Supabase Storage"
echo ""
print_info "Documentation:"
echo "  - Quick Start: DOCKER_QUICKSTART.md"
echo "  - Setup Guide: docs/VIDEO_COMPILATION_SETUP.md"
echo "  - Function Docs: supabase/functions/video-compilation/README.md"
echo ""
