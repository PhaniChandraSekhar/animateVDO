# Windows Setup Guide for Video Compilation

Complete guide for deploying the video compilation function on Windows.

## Prerequisites Installation

### Step 1: Install Scoop (Package Manager)

Open PowerShell as Administrator and run:

```powershell
# Set execution policy
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install Scoop
irm get.scoop.sh | iex
```

### Step 2: Install Supabase CLI

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Verify installation:
```powershell
supabase --version
```

### Step 3: Install Docker Desktop for Windows

**Option A: Download Installer**
1. Download from: https://docs.docker.com/desktop/install/windows-install/
2. Run the installer
3. Restart your computer
4. Open Docker Desktop and ensure it's running

**Option B: Using Winget (Windows 11)**
```powershell
winget install Docker.DockerDesktop
```

Verify Docker is running:
```powershell
docker --version
docker info
```

### Step 4: Install Git (if not already installed)

```powershell
winget install Git.Git
```

## Deployment Steps

### Step 1: Open PowerShell and Navigate to Project

```powershell
cd C:\Development\animateVDO
```

### Step 2: Login to Supabase

```powershell
supabase login
```

This will open your browser for authentication.

### Step 3: Link Your Project

```powershell
# List your projects
supabase projects list

# Link to your project (replace with your project ref)
supabase link --project-ref your-project-ref-here
```

### Step 4: Build Docker Image

```powershell
# Navigate to function directory
cd supabase\functions\video-compilation

# Build Docker image
docker build -t video-compilation-function .
```

**Expected output:**
```
Step 1/6 : FROM denoland/deno:1.37.0
...
Successfully built abc123def456
Successfully tagged video-compilation-function:latest
```

### Step 5: Test FFmpeg in Container

```powershell
docker run --rm video-compilation-function ffmpeg -version
```

Should show FFmpeg version information.

### Step 6: Deploy to Supabase

```powershell
# Return to project root
cd ..\..\..

# Deploy with Docker
supabase functions deploy video-compilation --docker
```

**Expected output:**
```
Deploying function video-compilation (Docker)...
Building image...
Pushing image...
Deploying...
✓ Deployed Function video-compilation
```

### Step 7: Set Environment Variables

```powershell
# Set required secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key-here
```

Get your URL and keys from:
https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

## Alternative: Using PowerShell Script

I'll create a Windows-compatible deployment script for you.

### Create PowerShell Deployment Script

Create a file `scripts\deploy-video-compilation.ps1`:

```powershell
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
    Write-Host "✓ Docker is installed: $(docker --version)" -ForegroundColor Green

    # Check if Docker is running
    try {
        docker info | Out-Null
        Write-Host "✓ Docker daemon is running" -ForegroundColor Green
    } catch {
        Write-Host "✗ Docker daemon is not running" -ForegroundColor Red
        Write-Host "Please start Docker Desktop" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✗ Docker is not installed" -ForegroundColor Red
    Write-Host "Install from: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
    exit 1
}

# Check Supabase CLI
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Write-Host "✓ Supabase CLI is installed: $(supabase --version)" -ForegroundColor Green
} else {
    Write-Host "✗ Supabase CLI is not installed" -ForegroundColor Red
    Write-Host "Install with: scoop install supabase" -ForegroundColor Yellow
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
    exit 1
}

Write-Host ""

# Test Docker image
Write-Host "Step 3: Testing Docker image..." -ForegroundColor Yellow
Write-Host "-------------------------------"

docker run --rm video-compilation-function ffmpeg -version | Select-Object -First 1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ FFmpeg is available in the container" -ForegroundColor Green
} else {
    Write-Host "✗ FFmpeg test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check Supabase login
Write-Host "Step 4: Checking Supabase authentication..." -ForegroundColor Yellow
Write-Host "-------------------------------------------"

try {
    supabase projects list | Out-Null
    Write-Host "✓ Already logged in to Supabase" -ForegroundColor Green
} catch {
    Write-Host "⚠ Not logged in to Supabase" -ForegroundColor Yellow
    Write-Host "Please login to Supabase CLI:" -ForegroundColor Cyan
    Write-Host "  supabase login" -ForegroundColor White
    exit 1
}

Write-Host ""

# Deploy
Write-Host "Step 5: Deploying to Supabase..." -ForegroundColor Yellow
Write-Host "---------------------------------"

$Deploy = Read-Host "Do you want to deploy now? (y/n)"

if ($Deploy -eq "y" -or $Deploy -eq "Y") {
    Write-Host "Deploying video-compilation function with Docker..." -ForegroundColor Cyan

    supabase functions deploy video-compilation --docker

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Function deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Deployment failed" -ForegroundColor Red
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
Write-Host "Step 6: Environment variables..." -ForegroundColor Yellow
Write-Host "--------------------------------"

Write-Host "Required environment variables for the function:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SUPABASE_URL=your_supabase_url" -ForegroundColor White
Write-Host "  SUPABASE_ANON_KEY=your_anon_key" -ForegroundColor White
Write-Host ""

$SetSecrets = Read-Host "Do you want to set environment variables now? (y/n)"

if ($SetSecrets -eq "y" -or $SetSecrets -eq "Y") {
    Write-Host "Set secrets using:" -ForegroundColor Cyan
    Write-Host "  supabase secrets set SUPABASE_URL=your_url" -ForegroundColor White
    Write-Host "  supabase secrets set SUPABASE_ANON_KEY=your_key" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use the Supabase Dashboard: Settings > Edge Functions > Environment Variables" -ForegroundColor Yellow
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
```

## Usage

### Run the PowerShell Script

```powershell
# Set execution policy (one-time, if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run the script
.\scripts\deploy-video-compilation.ps1
```

## Manual Commands (Step by Step)

If you prefer to run commands manually:

```powershell
# 1. Navigate to project
cd C:\Development\animateVDO

# 2. Login to Supabase
supabase login

# 3. Link project
supabase link --project-ref your-project-ref

# 4. Build Docker image
cd supabase\functions\video-compilation
docker build -t video-compilation-function .

# 5. Test FFmpeg
docker run --rm video-compilation-function ffmpeg -version

# 6. Deploy
cd ..\..\..
supabase functions deploy video-compilation --docker

# 7. Set secrets
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-key-here
```

## Testing

### Test the deployed function:

```powershell
# View logs
supabase functions logs video-compilation

# List deployed functions
supabase functions list
```

## Troubleshooting

### "Execution policy" error

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Docker Desktop not running

1. Press Windows key
2. Search for "Docker Desktop"
3. Open the application
4. Wait for it to start (whale icon in system tray)

### "Access denied" when running Docker

Run PowerShell as Administrator:
1. Right-click PowerShell
2. Select "Run as Administrator"

### WSL 2 installation required

Docker Desktop on Windows uses WSL 2. If prompted:

```powershell
wsl --install
```

Then restart your computer.

### Supabase CLI not found after installation

Close and reopen PowerShell to refresh environment variables.

## Common Windows-Specific Issues

### Line Ending Issues

If you get errors about line endings:

```powershell
# Configure Git to use LF line endings
git config --global core.autocrlf false
```

### Path Too Long

If you encounter "path too long" errors:

```powershell
# Enable long paths in Windows
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

Restart PowerShell after this change.

## Quick Reference

```powershell
# Check installations
docker --version
supabase --version

# Login to Supabase
supabase login

# Deploy
supabase functions deploy video-compilation --docker

# View logs
supabase functions logs video-compilation --tail

# Set environment variable
supabase secrets set VARIABLE_NAME=value

# List secrets
supabase secrets list
```

## Next Steps

1. ✅ Install prerequisites (Scoop, Supabase CLI, Docker)
2. ✅ Build Docker image
3. ✅ Deploy to Supabase
4. ✅ Set environment variables
5. ✅ Test with a real project

## Support

If you encounter issues:

1. Check Docker Desktop is running (system tray icon)
2. Verify Supabase login: `supabase projects list`
3. Check function logs: `supabase functions logs video-compilation`
4. Restart PowerShell if commands aren't recognized

---

**Ready to start?** Follow the "Prerequisites Installation" section above!
