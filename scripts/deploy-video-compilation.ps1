# Video Compilation Docker Deployment Script for Windows
# Run with: .\scripts\deploy-video-compilation.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "animateVDO Video Compilation - Docker Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check Prerequisites
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Yellow
Write-Host "-----------------------------------"

# Check Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerVersion = docker --version
    Write-Host "✓ Docker is installed: $dockerVersion" -ForegroundColor Green

    # Check if Docker is running
    try {
        docker info | Out-Null
        Write-Host "✓ Docker daemon is running" -ForegroundColor Green
    } catch {
        Write-Host "✗ Docker daemon is not running" -ForegroundColor Red
        Write-Host "Please start Docker Desktop" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Cyan
        Write-Host "1. Press Windows key" -ForegroundColor White
        Write-Host "2. Search for 'Docker Desktop'" -ForegroundColor White
        Write-Host "3. Open the application" -ForegroundColor White
        Write-Host "4. Wait for it to start" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "✗ Docker is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Docker Desktop for Windows:" -ForegroundColor Yellow
    Write-Host "https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use winget:" -ForegroundColor Yellow
    Write-Host "  winget install Docker.DockerDesktop" -ForegroundColor White
    exit 1
}

# Check Supabase CLI
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    $supabaseVersion = supabase --version
    Write-Host "✓ Supabase CLI is installed: $supabaseVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Supabase CLI is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Supabase CLI:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Using Scoop (recommended):" -ForegroundColor Cyan
    Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor White
    Write-Host "  scoop install supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 - Using NPM:" -ForegroundColor Cyan
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Don't have Scoop? Install it first:" -ForegroundColor Yellow
    Write-Host "  irm get.scoop.sh | iex" -ForegroundColor White
    exit 1
}

Write-Host ""

# Navigate to function directory
Write-Host "Step 2: Building Docker image..." -ForegroundColor Yellow
Write-Host "--------------------------------"

$FunctionDir = "supabase\functions\video-compilation"

if (Test-Path $FunctionDir) {
    Push-Location $FunctionDir

    Write-Host "Building image: video-compilation-function" -ForegroundColor Cyan
    docker build -t video-compilation-function .

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker image built successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker build failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }

    Pop-Location
} else {
    Write-Host "✗ Function directory not found: $FunctionDir" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test Docker image
Write-Host "Step 3: Testing Docker image..." -ForegroundColor Yellow
Write-Host "-------------------------------"

Write-Host "Running FFmpeg test..." -ForegroundColor Cyan
$ffmpegTest = docker run --rm video-compilation-function ffmpeg -version 2>&1 | Select-Object -First 1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ FFmpeg is available in the container" -ForegroundColor Green
    Write-Host "  $ffmpegTest" -ForegroundColor Gray
} else {
    Write-Host "✗ FFmpeg test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check Supabase login
Write-Host "Step 4: Checking Supabase authentication..." -ForegroundColor Yellow
Write-Host "-------------------------------------------"

$loginCheck = supabase projects list 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Already logged in to Supabase" -ForegroundColor Green
} else {
    Write-Host "⚠ Not logged in to Supabase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Logging in to Supabase..." -ForegroundColor Cyan
    Write-Host "This will open your browser for authentication." -ForegroundColor White
    Write-Host ""

    supabase login

    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Login failed" -ForegroundColor Red
        exit 1
    }

    Write-Host "✓ Login successful" -ForegroundColor Green
}

Write-Host ""

# Check if project is linked
Write-Host "Step 5: Checking project link..." -ForegroundColor Yellow
Write-Host "---------------------------------"

$statusCheck = supabase status 2>&1

if ($statusCheck -match "API URL") {
    Write-Host "✓ Project is linked" -ForegroundColor Green
} else {
    Write-Host "⚠ Project not linked" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available projects:" -ForegroundColor Cyan
    supabase projects list
    Write-Host ""

    $projectRef = Read-Host "Enter your project reference ID"

    if ($projectRef) {
        supabase link --project-ref $projectRef

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Project linked successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to link project" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✗ No project reference provided" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Deploy
Write-Host "Step 6: Deploying to Supabase..." -ForegroundColor Yellow
Write-Host "---------------------------------"

$Deploy = Read-Host "Do you want to deploy now? (y/n)"

if ($Deploy -eq "y" -or $Deploy -eq "Y") {
    Write-Host ""
    Write-Host "Deploying video-compilation function with Docker..." -ForegroundColor Cyan
    Write-Host "This may take a few minutes..." -ForegroundColor Gray
    Write-Host ""

    supabase functions deploy video-compilation --docker

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Function deployed successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "✗ Deployment failed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
        Write-Host "1. Make sure you're in the project root directory" -ForegroundColor White
        Write-Host "2. Check that supabase\functions\video-compilation exists" -ForegroundColor White
        Write-Host "3. Verify you have access to the Supabase project" -ForegroundColor White
        Write-Host "4. Check logs: supabase functions logs video-compilation" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "⚠ Skipping deployment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To deploy later, run:" -ForegroundColor Cyan
    Write-Host "  supabase functions deploy video-compilation --docker" -ForegroundColor White
}

Write-Host ""

# Environment variables
Write-Host "Step 7: Environment variables..." -ForegroundColor Yellow
Write-Host "--------------------------------"

Write-Host ""
Write-Host "Required environment variables for the function:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SUPABASE_URL=your_supabase_url" -ForegroundColor White
Write-Host "  SUPABASE_ANON_KEY=your_anon_key" -ForegroundColor White
Write-Host ""
Write-Host "Optional:" -ForegroundColor Cyan
Write-Host "  FFMPEG_PATH=/usr/bin/ffmpeg  (default)" -ForegroundColor White
Write-Host "  USE_MOCK_VIDEO=false  (set to true to disable FFmpeg)" -ForegroundColor White
Write-Host ""

$SetSecrets = Read-Host "Do you want to set environment variables now? (y/n)"

if ($SetSecrets -eq "y" -or $SetSecrets -eq "Y") {
    Write-Host ""
    Write-Host "Get your credentials from:" -ForegroundColor Cyan
    Write-Host "https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api" -ForegroundColor White
    Write-Host ""

    $supabaseUrl = Read-Host "Enter SUPABASE_URL"
    $supabaseKey = Read-Host "Enter SUPABASE_ANON_KEY"

    if ($supabaseUrl -and $supabaseKey) {
        Write-Host ""
        Write-Host "Setting secrets..." -ForegroundColor Cyan

        supabase secrets set "SUPABASE_URL=$supabaseUrl"
        supabase secrets set "SUPABASE_ANON_KEY=$supabaseKey"

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Secrets set successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠ Failed to set some secrets" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ Skipping secret setup" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Set secrets later using:" -ForegroundColor Cyan
    Write-Host "  supabase secrets set SUPABASE_URL=your_url" -ForegroundColor White
    Write-Host "  supabase secrets set SUPABASE_ANON_KEY=your_key" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use the Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "Settings > Edge Functions > Environment Variables" -ForegroundColor White
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set environment variables (if not done)" -ForegroundColor White
Write-Host "2. Test the function with a real project" -ForegroundColor White
Write-Host "3. Monitor logs: supabase functions logs video-compilation" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - Windows Setup: WINDOWS_SETUP.md" -ForegroundColor White
Write-Host "  - Quick Start: DOCKER_QUICKSTART.md" -ForegroundColor White
Write-Host "  - Setup Guide: docs\VIDEO_COMPILATION_SETUP.md" -ForegroundColor White
Write-Host ""
