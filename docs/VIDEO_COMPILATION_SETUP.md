# Video Compilation Setup Guide

This guide explains how to set up and deploy the video compilation feature for animateVDO.

## Quick Start

### For Testing (Mock Mode)

If you want to test the application without FFmpeg:

1. Set environment variable in Supabase:
```bash
supabase secrets set USE_MOCK_VIDEO=true
```

2. Deploy the function:
```bash
supabase functions deploy video-compilation
```

### For Production (Real Video Rendering)

To enable actual video compilation with FFmpeg:

## Deployment Options

### Option 1: Docker-based Deployment (Recommended)

This is the recommended approach for production deployments.

#### Prerequisites
- Docker installed on your local machine
- Supabase CLI installed (`npm install -g supabase`)
- Logged in to Supabase CLI (`supabase login`)

#### Steps

1. **Navigate to the function directory:**
```bash
cd supabase/functions/video-compilation
```

2. **Build the Docker image:**
```bash
docker build -t video-compilation-function .
```

3. **Test locally (optional):**
```bash
supabase functions serve video-compilation --docker
```

4. **Deploy to Supabase:**
```bash
supabase functions deploy video-compilation --docker
```

5. **Set environment variables:**
```bash
# Required
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_ANON_KEY=your_anon_key

# Optional
supabase secrets set FFMPEG_PATH=/usr/bin/ffmpeg
```

### Option 2: Custom Runtime

If your Supabase plan supports custom runtimes, you can install FFmpeg directly.

#### Using supabase/config.toml

Add to your `supabase/config.toml`:

```toml
[functions.video-compilation]
verify_jwt = true

[functions.video-compilation.runtime]
image = "denoland/deno:1.37.0"
entrypoint = ["deno", "run", "--allow-all", "index.ts"]

[functions.video-compilation.build]
dockerfile = "Dockerfile"
```

### Option 3: External Video Processing Service

For very large scale or complex requirements, consider using an external service:

#### Recommended Services:
- **Shotstack**: Cloud video editing API
- **Cloudinary**: Video transformation API
- **AWS MediaConvert**: Enterprise video processing
- **Azure Media Services**: Microsoft's video processing

#### Integration Example (Shotstack):

```typescript
// Replace VideoCompilationService with external API call
async function compileVideoWithShotstack(scenes: SceneAssets[]): Promise<string> {
  const response = await fetch('https://api.shotstack.io/v1/render', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('SHOTSTACK_API_KEY'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timeline: {
        tracks: scenes.map(scene => ({
          clips: [{
            asset: { type: 'image', src: scene.visual_url },
            length: scene.duration,
            effect: 'zoomIn'
          }]
        }))
      }
    })
  });

  const { data } = await response.json();
  return data.url;
}
```

## Verifying Installation

### Test FFmpeg Availability

Create a test endpoint to verify FFmpeg is installed:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/video-compilation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"project_id": "test-project-id"}'
```

Check the logs:
```bash
supabase functions logs video-compilation
```

You should see:
```
Executing FFmpeg: ffmpeg ...
```

If FFmpeg is not found, you'll see:
```
FFmpeg is not installed. Please install FFmpeg...
```

## Storage Configuration

### Increase Storage Bucket Limits

Run the migration to increase storage limits for video files:

```bash
supabase db push
```

This applies the migration that increases the `project-assets` bucket limit to 500MB.

### Verify Storage Setup

```sql
-- Check storage bucket configuration
SELECT * FROM storage.buckets WHERE id = 'project-assets';

-- Should show:
-- file_size_limit: 524288000 (500MB)
-- allowed_mime_types: includes 'video/mp4', 'video/webm'
```

## Performance Tuning

### Adjust Video Quality

Edit `supabase/functions/video-compilation/index.ts`:

```typescript
const renderSettings: RenderSettings = {
  resolution: '1280x720',  // Change to 720p for faster processing
  fps: 24,                  // Reduce to 24fps
  codec: 'h264',
  bitrate: '3000k',        // Lower bitrate
  transitions: 'fade',
  watermark: true
};
```

### Optimize FFmpeg Preset

In the `createSceneVideos` method:

```typescript
// Change from 'medium' to 'fast' or 'veryfast'
'-preset', 'fast',  // Faster encoding, slightly larger files
'-crf', '28',       // Increase CRF for smaller files (18-28 range)
```

### Handle Long Videos

For videos longer than 5 minutes, consider:

1. **Async Processing**: Implement a queue system
2. **Chunking**: Process scenes in batches
3. **External Service**: Use cloud video processing

## Monitoring and Debugging

### Enable Debug Logging

Set environment variable:
```bash
supabase secrets set VIDEO_COMPILATION_DEBUG=true
```

### Monitor Function Logs

```bash
# Live logs
supabase functions logs video-compilation --tail

# Recent logs
supabase functions logs video-compilation --limit 100
```

### Check Function Metrics

```bash
# View invocation stats
supabase functions stats video-compilation
```

### Common Log Messages

**Success:**
```
Starting video compilation for project: abc-123
Downloaded: /tmp/video-compilation/abc-123/scene_1_image.jpg
Executing FFmpeg: ffmpeg -loop 1 -i ...
Video compilation completed for project_id: abc-123
```

**Error - FFmpeg not found:**
```
FFmpeg error: ffmpeg: command not found
Error in video-compilation function: FFmpeg is not installed
```

**Error - Asset download failed:**
```
Failed to download assets for scene 2
Asset download failed for scene 2
```

## Cost Optimization

### Reduce Processing Time
- Limit videos to 3-5 minutes
- Use 720p instead of 1080p
- Reduce scene count (5-7 scenes ideal)

### Minimize API Calls
- Cache intermediate results
- Implement retry logic with exponential backoff
- Use webhook notifications instead of polling

### Storage Costs
- Set lifecycle policies to delete old videos
- Compress videos with higher CRF values
- Use adaptive bitrate encoding

## Troubleshooting

### Issue: Function Times Out

**Symptoms**: Execution timeout after 150-300 seconds

**Solutions**:
1. Reduce video duration
2. Lower resolution (720p)
3. Use faster FFmpeg preset
4. Implement async queue processing

### Issue: Out of Memory

**Symptoms**: Function crashes with memory error

**Solutions**:
1. Process scenes sequentially (already implemented)
2. Reduce resolution
3. Clean up intermediate files earlier
4. Upgrade to higher tier plan

### Issue: Poor Video Quality

**Symptoms**: Blurry or pixelated output

**Solutions**:
1. Decrease CRF value (lower = better quality)
2. Increase bitrate
3. Use higher resolution source images
4. Use 'slow' or 'slower' preset

### Issue: Audio Sync Issues

**Symptoms**: Audio and video out of sync

**Solutions**:
1. Ensure audio duration matches scene duration
2. Use `-shortest` flag (already implemented)
3. Check audio file integrity
4. Verify audio codec compatibility

## Security Considerations

### Input Validation
- Validate project_id format
- Check file sizes before download
- Verify URL schemes (https only)
- Sanitize filenames

### Rate Limiting
- Implement per-user quotas
- Throttle concurrent compilations
- Monitor abuse patterns

### Storage Security
- Use signed URLs for temporary access
- Implement RLS policies
- Set appropriate CORS headers
- Enable encryption at rest

## Support

For issues or questions:
1. Check the logs: `supabase functions logs video-compilation`
2. Review the README: `supabase/functions/video-compilation/README.md`
3. Open an issue on GitHub with:
   - Error messages from logs
   - Project configuration
   - Steps to reproduce

## Additional Resources

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Video Encoding Best Practices](https://trac.ffmpeg.org/wiki/Encode/H.264)
