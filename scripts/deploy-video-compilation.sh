#!/bin/bash
# Docker Deployment Script for animateVDO Video Compilation
# Run this on your local machine with Docker installed

set -e  # Exit on error

echo "========================================="
echo "animateVDO Video Compilation - Docker Setup"
echo "========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Check prerequisites
echo "Step 1: Checking prerequisites..."
echo "-----------------------------------"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
else
    print_success "Docker is installed: $(docker --version)"
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    echo "Please start Docker Desktop or Docker service"
    exit 1
else
    print_success "Docker daemon is running"
fi

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    print_warning "Supabase CLI is not installed"
    echo "Installing Supabase CLI..."

    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install supabase/tap/supabase
        else
            print_error "Homebrew not found. Install from: https://brew.sh"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
    else
        print_error "Unsupported OS. Please install Supabase CLI manually from:"
        echo "https://supabase.com/docs/guides/cli"
        exit 1
    fi
else
    print_success "Supabase CLI is installed: $(supabase --version)"
fi

echo ""

# Step 2: Navigate to function directory
echo "Step 2: Navigating to function directory..."
echo "-------------------------------------------"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FUNCTION_DIR="$SCRIPT_DIR/../supabase/functions/video-compilation"

if [ ! -d "$FUNCTION_DIR" ]; then
    print_error "Function directory not found: $FUNCTION_DIR"
    exit 1
fi

cd "$FUNCTION_DIR"
print_success "In directory: $(pwd)"
echo ""

# Step 3: Build Docker image
echo "Step 3: Building Docker image..."
echo "--------------------------------"

if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile not found in $FUNCTION_DIR"
    exit 1
fi

echo "Building image: video-compilation-function"
if docker build -t video-compilation-function .; then
    print_success "Docker image built successfully"
else
    print_error "Docker build failed"
    exit 1
fi
echo ""

# Step 4: Test Docker image locally
echo "Step 4: Testing Docker image locally..."
echo "---------------------------------------"

echo "Running test container..."
if docker run --rm video-compilation-function ffmpeg -version | head -n 1; then
    print_success "FFmpeg is available in the container"
else
    print_error "FFmpeg test failed"
    exit 1
fi
echo ""

# Step 5: Check Supabase login
echo "Step 5: Checking Supabase authentication..."
echo "-------------------------------------------"

cd "$SCRIPT_DIR"

if supabase projects list &> /dev/null; then
    print_success "Already logged in to Supabase"
else
    print_warning "Not logged in to Supabase"
    echo "Please login to Supabase CLI:"
    echo "  supabase login"
    exit 1
fi
echo ""

# Step 6: Deploy to Supabase
echo "Step 6: Deploying to Supabase..."
echo "---------------------------------"

read -p "Do you want to deploy now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying video-compilation function with Docker..."

    # Deploy with Docker flag
    if supabase functions deploy video-compilation --docker; then
        print_success "Function deployed successfully"
    else
        print_error "Deployment failed"
        echo ""
        print_warning "Troubleshooting tips:"
        echo "1. Make sure you're in the project root directory"
        echo "2. Check that supabase/functions/video-compilation exists"
        echo "3. Verify you have access to the Supabase project"
        exit 1
    fi
else
    print_warning "Skipping deployment"
    echo ""
    echo "To deploy later, run:"
    echo "  cd $SCRIPT_DIR"
    echo "  supabase functions deploy video-compilation --docker"
fi

echo ""

# Step 7: Set environment variables
echo "Step 7: Environment variables..."
echo "--------------------------------"

echo "Required environment variables for the function:"
echo ""
echo "  SUPABASE_URL=your_supabase_url"
echo "  SUPABASE_ANON_KEY=your_anon_key"
echo ""
echo "Optional:"
echo "  FFMPEG_PATH=/usr/bin/ffmpeg  (default)"
echo "  USE_MOCK_VIDEO=false  (set to true to disable FFmpeg)"
echo ""

read -p "Do you want to set environment variables now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Set secrets using:"
    echo "  supabase secrets set SUPABASE_URL=your_url"
    echo "  supabase secrets set SUPABASE_ANON_KEY=your_key"
    echo ""
    echo "Or use the Supabase Dashboard: Settings > Edge Functions > Environment Variables"
fi

echo ""
echo "========================================="
print_success "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Set environment variables (if not done)"
echo "2. Test the function with a real project"
echo "3. Monitor logs: supabase functions logs video-compilation"
echo ""
echo "Documentation:"
echo "  - Setup Guide: docs/VIDEO_COMPILATION_SETUP.md"
echo "  - Function README: supabase/functions/video-compilation/README.md"
echo ""
