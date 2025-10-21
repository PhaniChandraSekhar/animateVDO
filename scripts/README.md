# Scripts Directory

Utility scripts for deploying and managing animateVDO.

## Available Scripts

### `deploy-video-compilation.sh`

Automated deployment script for the video compilation function with Docker support.

**Usage:**
```bash
./scripts/deploy-video-compilation.sh
```

**What it does:**
1. Checks prerequisites (Docker, Supabase CLI)
2. Builds the Docker image with FFmpeg
3. Tests FFmpeg availability
4. Deploys to Supabase
5. Guides through environment variable setup

**Requirements:**
- Docker installed and running
- Supabase CLI installed
- Logged in to Supabase (`supabase login`)

---

### `test-video-compilation.sh`

Test script to validate the video compilation function deployment.

**Usage:**
```bash
./scripts/test-video-compilation.sh
```

**What it tests:**
1. Function deployment status
2. Recent function logs
3. Local Docker image (if available)
4. Environment variables setup
5. Optional: Function invocation with test project

**Requirements:**
- Supabase CLI installed
- Function already deployed

---

## Quick Start

### First Time Setup

1. **Deploy the function:**
   ```bash
   ./scripts/deploy-video-compilation.sh
   ```

2. **Test the deployment:**
   ```bash
   ./scripts/test-video-compilation.sh
   ```

3. **Monitor logs:**
   ```bash
   supabase functions logs video-compilation --tail
   ```

### Update Deployment

When you make changes to the function:

```bash
# Rebuild and redeploy
cd supabase/functions/video-compilation
docker build -t video-compilation-function .
cd ../../..
supabase functions deploy video-compilation --docker
```

### Quick Test

Test a specific project:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/video-compilation' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"project_id": "your-project-uuid"}'
```

## Troubleshooting

### Script Won't Run

Make sure scripts are executable:
```bash
chmod +x scripts/*.sh
```

### Docker Not Found

Install Docker Desktop:
- macOS: https://docs.docker.com/desktop/install/mac-install/
- Windows: https://docs.docker.com/desktop/install/windows-install/
- Linux: https://docs.docker.com/desktop/install/linux-install/

### Supabase CLI Not Found

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

**Windows:**
```bash
scoop install supabase
```

### Permission Denied

On Linux/macOS, you might need to run with appropriate permissions:
```bash
chmod +x scripts/deploy-video-compilation.sh
./scripts/deploy-video-compilation.sh
```

## Additional Resources

- **Docker Quick Start**: `../DOCKER_QUICKSTART.md`
- **Setup Guide**: `../docs/VIDEO_COMPILATION_SETUP.md`
- **Implementation Details**: `../VIDEO_COMPILATION_IMPLEMENTATION.md`
- **Function README**: `../supabase/functions/video-compilation/README.md`
