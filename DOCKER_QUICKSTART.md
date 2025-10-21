# Docker Quick Start Guide

This guide will help you deploy the video compilation function with Docker support.

## Prerequisites

Before starting, ensure you have:

- ✅ **Docker Desktop** installed and running
  - Download: https://docs.docker.com/get-docker/
- ✅ **Supabase CLI** installed
  - macOS: `brew install supabase/tap/supabase`
  - Linux/Windows: https://supabase.com/docs/guides/cli
- ✅ **Git** installed
- ✅ **Access to your Supabase project**

## Option 1: Automated Setup (Recommended)

Run the automated deployment script:

```bash
# From the project root
./scripts/deploy-video-compilation.sh
```

This script will:
1. ✓ Check all prerequisites
2. ✓ Build the Docker image
3. ✓ Test FFmpeg availability
4. ✓ Deploy to Supabase
5. ✓ Guide you through environment variables

## Option 2: Manual Step-by-Step

### Step 1: Login to Supabase

```bash
supabase login
```

This will open your browser for authentication.

### Step 2: Link Your Project (if not already linked)

```bash
# List your projects
supabase projects list

# Link to your project
supabase link --project-ref your-project-ref
```

### Step 3: Build the Docker Image

```bash
cd supabase/functions/video-compilation
docker build -t video-compilation-function .
```

**Expected output:**
```
Step 1/6 : FROM denoland/deno:1.37.0
Step 2/6 : RUN apt-get update && apt-get install -y ffmpeg...
...
Successfully built abc123def456
Successfully tagged video-compilation-function:latest
```

### Step 4: Test the Docker Image Locally

```bash
# Test FFmpeg is available
docker run --rm video-compilation-function ffmpeg -version

# Should output:
# ffmpeg version 4.x.x ...
```

### Step 5: Deploy to Supabase

```bash
# From project root
cd ../../..
supabase functions deploy video-compilation --docker
```

**Expected output:**
```
Deploying function video-compilation (Docker)...
Building image...
Pushing image...
Deploying...
✓ Function deployed successfully
```

### Step 6: Set Environment Variables

```bash
# Get your Supabase URL and Anon Key from:
# https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key

# Optional: Set FFmpeg path (default is 'ffmpeg')
supabase secrets set FFMPEG_PATH=/usr/bin/ffmpeg
```

### Step 7: Verify Deployment

```bash
# Check function logs
supabase functions logs video-compilation

# List deployed functions
supabase functions list
```

## Option 3: Test Locally with Supabase Local Dev

For local development and testing:

### Step 1: Start Supabase Locally

```bash
# From project root
supabase start
```

### Step 2: Serve the Function Locally

```bash
supabase functions serve video-compilation --docker --env-file .env.local
```

### Step 3: Create Test .env.local

Create `.env.local` in your project root:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-local-anon-key
FFMPEG_PATH=/usr/bin/ffmpeg
USE_MOCK_VIDEO=false
```

### Step 4: Test the Local Function

```bash
curl -X POST 'http://localhost:54321/functions/v1/video-compilation' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"project_id": "test-project-id"}'
```

## Troubleshooting

### Docker Build Fails

**Error:** `Cannot connect to the Docker daemon`

**Solution:**
```bash
# Start Docker Desktop or Docker service
# macOS: Open Docker Desktop app
# Linux: sudo systemctl start docker
```

### FFmpeg Not Found in Container

**Error:** `ffmpeg: command not found`

**Solution:**
```bash
# Rebuild the image with --no-cache
cd supabase/functions/video-compilation
docker build --no-cache -t video-compilation-function .
```

### Deployment Fails

**Error:** `Failed to deploy function`

**Solutions:**

1. **Check you're logged in:**
```bash
supabase projects list
# If fails: supabase login
```

2. **Check project is linked:**
```bash
supabase status
# If not linked: supabase link --project-ref your-ref
```

3. **Check function directory structure:**
```bash
ls -la supabase/functions/video-compilation/
# Should show: Dockerfile, index.ts, README.md
```

### Function Times Out

**Error:** `Function execution timed out`

**Solutions:**
- Set `USE_MOCK_VIDEO=true` for testing
- Reduce number of scenes in your project
- Lower video resolution in the code
- Contact Supabase support for higher timeout limits

### Out of Memory

**Error:** `Command killed due to memory limit`

**Solutions:**
- Use 720p instead of 1080p
- Process fewer scenes at once
- Upgrade to higher Supabase plan with more memory

## Testing the Deployed Function

### Create a Test Project

1. Log in to your animateVDO app
2. Create a new project
3. Wait for all stages to complete:
   - Research ✓
   - Script ✓
   - Characters ✓
   - Audio ✓
   - Video (this will use the new Docker function)

### Monitor Logs

```bash
# Live tail
supabase functions logs video-compilation --tail

# Recent logs
supabase functions logs video-compilation --limit 50
```

### Check for Success

Look for these log messages:

```
✓ Starting video compilation for project: abc-123
✓ Downloaded: /tmp/video-compilation/abc-123/scene_1_image.jpg
✓ Executing FFmpeg: ffmpeg -loop 1 -i ...
✓ Video compilation completed for project_id: abc-123
```

## Switching Between Mock and Real Video

### Enable Mock Mode (No FFmpeg Required)

```bash
supabase secrets set USE_MOCK_VIDEO=true
```

### Enable Real Video Rendering

```bash
supabase secrets unset USE_MOCK_VIDEO
# Or set to false
supabase secrets set USE_MOCK_VIDEO=false
```

## Performance Tips

### Optimize for Speed

Edit `supabase/functions/video-compilation/index.ts`:

```typescript
const renderSettings: RenderSettings = {
  resolution: '1280x720',  // Lower resolution
  fps: 24,                  // Lower frame rate
  codec: 'h264',
  bitrate: '3000k',        // Lower bitrate
  transitions: 'fade',
  watermark: true
};
```

Then redeploy:
```bash
supabase functions deploy video-compilation --docker
```

### Monitor Resource Usage

```bash
# Check function invocations and errors
supabase functions stats video-compilation
```

## Next Steps

1. ✅ Deploy the function with Docker
2. ✅ Set environment variables
3. ✅ Test with a real project
4. ✅ Monitor logs for issues
5. ✅ Optimize settings as needed

## Additional Resources

- **Setup Guide**: `docs/VIDEO_COMPILATION_SETUP.md`
- **Function README**: `supabase/functions/video-compilation/README.md`
- **Implementation Details**: `VIDEO_COMPILATION_IMPLEMENTATION.md`
- **Supabase Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **FFmpeg Documentation**: https://ffmpeg.org/documentation.html

## Support

If you encounter issues:

1. Check the logs: `supabase functions logs video-compilation`
2. Review the troubleshooting section above
3. Check Supabase status: https://status.supabase.com
4. Open an issue on GitHub with:
   - Error messages from logs
   - Steps to reproduce
   - Your environment (OS, Docker version, etc.)

---

**Need Help?** Run the automated script for guided setup:
```bash
./scripts/deploy-video-compilation.sh
```
