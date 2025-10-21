# Windows Quick Start - 5 Minutes Setup

Fast setup guide for Windows users to deploy video compilation with Docker.

## TL;DR - Quick Commands

```powershell
# 1. Install prerequisites (one-time)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
# Install Docker Desktop from: https://docker.com/products/docker-desktop

# 2. Run automated deployment
cd C:\Development\animateVDO
.\scripts\deploy-video-compilation.ps1
```

That's it! The script will guide you through everything.

---

## Step-by-Step (First Time)

### 1️⃣ Install Scoop (Package Manager)

Open PowerShell as **Administrator**:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### 2️⃣ Install Supabase CLI

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Verify:
```powershell
supabase --version
```

### 3️⃣ Install Docker Desktop

**Download and Install:**
- Go to: https://docs.docker.com/desktop/install/windows-install/
- Download Docker Desktop for Windows
- Run the installer
- Restart your computer
- Open Docker Desktop

**Or use Winget (Windows 11):**
```powershell
winget install Docker.DockerDesktop
```

Verify:
```powershell
docker --version
```

### 4️⃣ Run the Deployment Script

```powershell
cd C:\Development\animateVDO
.\scripts\deploy-video-compilation.ps1
```

The script will:
- ✅ Check all prerequisites
- ✅ Build Docker image with FFmpeg
- ✅ Test FFmpeg works
- ✅ Login to Supabase (opens browser)
- ✅ Deploy the function
- ✅ Set environment variables

---

## Manual Deployment (Alternative)

If you prefer manual steps:

```powershell
# Navigate to project
cd C:\Development\animateVDO

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref-here

# Build Docker image
cd supabase\functions\video-compilation
docker build -t video-compilation-function .

# Test FFmpeg
docker run --rm video-compilation-function ffmpeg -version

# Deploy
cd ..\..\..
supabase functions deploy video-compilation --docker

# Set environment variables
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Common Issues & Fixes

### ❌ "supabase : The term 'supabase' is not recognized"

**Fix:** Install Supabase CLI
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Then close and reopen PowerShell.

### ❌ "docker: command not found"

**Fix:** Install Docker Desktop
1. Download from https://docker.com/products/docker-desktop
2. Install and restart computer
3. Open Docker Desktop application

### ❌ "Docker daemon is not running"

**Fix:** Start Docker Desktop
1. Press Windows key
2. Type "Docker Desktop"
3. Open the application
4. Wait for whale icon in system tray

### ❌ "Execution policy" error

**Fix:** Set execution policy
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ❌ WSL 2 required

**Fix:** Install WSL 2
```powershell
wsl --install
```

Then restart your computer.

---

## Testing Your Deployment

### Check if function deployed:
```powershell
supabase functions list
```

Should show `video-compilation` in the list.

### View logs:
```powershell
supabase functions logs video-compilation
```

### Test with your app:
1. Open animateVDO app
2. Create a new project
3. Wait for video compilation to complete
4. Check the video output!

---

## Environment Variables

Get these from your Supabase dashboard:
- **URL**: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
- **Keys**: Same page, under "Project API keys"

Set them:
```powershell
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJhbG...
```

Optional settings:
```powershell
# Use mock mode (no FFmpeg needed)
supabase secrets set USE_MOCK_VIDEO=true

# Set custom FFmpeg path
supabase secrets set FFMPEG_PATH=/usr/bin/ffmpeg
```

---

## Useful Commands

```powershell
# View all secrets
supabase secrets list

# View function logs (live)
supabase functions logs video-compilation --tail

# List deployed functions
supabase functions list

# Get function URL
supabase functions list

# Redeploy after changes
supabase functions deploy video-compilation --docker

# Check Docker images
docker images

# Remove old Docker images
docker image prune -a
```

---

## Folder Structure

Make sure you're in the right location:

```
C:\Development\animateVDO\
├── supabase\
│   └── functions\
│       └── video-compilation\
│           ├── Dockerfile          ← Docker config
│           ├── index.ts            ← Function code
│           └── README.md
├── scripts\
│   └── deploy-video-compilation.ps1   ← Run this!
├── WINDOWS_SETUP.md               ← Full Windows guide
└── WINDOWS_QUICKSTART.md          ← You are here
```

---

## Next Steps After Deployment

1. ✅ **Test the function**
   - Create a project in your app
   - Watch it progress through all stages
   - Check video compilation completes

2. ✅ **Monitor performance**
   ```powershell
   supabase functions logs video-compilation --tail
   ```

3. ✅ **Optimize if needed**
   - See `docs\VIDEO_COMPILATION_SETUP.md`
   - Adjust video quality settings
   - Enable mock mode for testing

---

## Get Help

**Full Documentation:**
- Windows Setup: `WINDOWS_SETUP.md`
- Docker Guide: `DOCKER_QUICKSTART.md`
- Setup Guide: `docs\VIDEO_COMPILATION_SETUP.md`

**Check Logs:**
```powershell
supabase functions logs video-compilation --limit 50
```

**Common Log Messages:**

✅ **Success:**
```
Starting video compilation for project: abc-123
Downloaded: /tmp/video-compilation/abc-123/scene_1_image.jpg
Executing FFmpeg: ffmpeg -loop 1 -i ...
Video compilation completed
```

❌ **Error:**
```
FFmpeg is not installed
Asset download failed
Function execution timed out
```

---

## Support

If you encounter issues:

1. Check Docker Desktop is running (system tray)
2. Verify Supabase login: `supabase projects list`
3. Check function logs: `supabase functions logs video-compilation`
4. Restart PowerShell if commands aren't recognized
5. See full guide: `WINDOWS_SETUP.md`

---

**Ready to go?** Run this now:

```powershell
cd C:\Development\animateVDO
.\scripts\deploy-video-compilation.ps1
```

🎬 You'll have video compilation running in less than 5 minutes!
