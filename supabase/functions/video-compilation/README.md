# Video Compilation Edge Function

This edge function compiles the final video from all generated assets (images, audio, script) using FFmpeg.

## Features

- **Asset Download**: Automatically downloads all scene images and audio files
- **Ken Burns Effect**: Applies smooth zoom animation to static images
- **Scene Transitions**: Concatenates scenes with professional transitions
- **Audio Synchronization**: Syncs narration audio perfectly with visuals
- **Thumbnail Generation**: Creates a thumbnail from the first frame
- **Supabase Storage**: Uploads final video and thumbnail to Supabase Storage

## Requirements

### FFmpeg Installation

The edge function requires FFmpeg to be available in the runtime environment.

#### Option 1: Using Docker (Recommended for Production)

Use the provided Dockerfile to build a custom edge function with FFmpeg:

```bash
# Build the Docker image
cd supabase/functions/video-compilation
docker build -t video-compilation-function .

# Deploy using Supabase CLI with custom Docker image
supabase functions deploy video-compilation --docker
```

#### Option 2: System FFmpeg (Local Development)

For local testing, install FFmpeg on your system:

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [FFmpeg official website](https://ffmpeg.org/download.html)

#### Option 3: Mock Mode (Testing Without FFmpeg)

For testing without FFmpeg, enable mock mode:

```bash
# In your Supabase project secrets/environment variables
USE_MOCK_VIDEO=true
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `FFMPEG_PATH` | No | Path to FFmpeg binary | `ffmpeg` |
| `USE_MOCK_VIDEO` | No | Enable mock video generation | `false` |
| `DISABLE_VIDEO_PROCESSING` | No | Disable actual video processing | `false` |
| `SUPABASE_URL` | Yes | Supabase project URL | - |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | - |

## Video Settings

The function uses the following render settings by default:

- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30 fps
- **Codec**: H.264
- **Video Bitrate**: 5000k
- **Audio Codec**: AAC
- **Audio Bitrate**: 192k
- **Transitions**: Fade between scenes
- **Ken Burns Effect**: Smooth zoom from 1.0x to 1.2x

## API Usage

### Request

```json
{
  "project_id": "uuid-of-project"
}
```

### Response

```json
{
  "video_url": "https://storage.supabase.co/..../final_video.mp4",
  "thumbnail_url": "https://storage.supabase.co/..../thumbnail.jpg",
  "duration": "2:30",
  "resolution": "1920x1080",
  "format": "mp4",
  "file_size": 45678901,
  "render_settings": {
    "resolution": "1920x1080",
    "fps": 30,
    "codec": "h264",
    "bitrate": "5000k",
    "transitions": "fade",
    "watermark": true
  },
  "timestamp": "2025-01-31T12:34:56.789Z"
}
```

## File Structure

```
/tmp/video-compilation/{project_id}/
├── scene_1_image.jpg          # Downloaded scene images
├── scene_1_audio.mp3          # Downloaded scene audio
├── scene_1.mp4                # Rendered scene video
├── scene_2_image.jpg
├── scene_2_audio.mp3
├── scene_2.mp4
├── ...
├── concat_list.txt            # FFmpeg concat file list
├── final_video.mp4            # Final compiled video
└── thumbnail.jpg              # Video thumbnail
```

## Processing Pipeline

1. **Download Assets**: Downloads all images and audio files from URLs
2. **Create Scene Videos**: For each scene:
   - Applies Ken Burns zoom effect to static image
   - Synchronizes audio narration
   - Renders individual scene video
3. **Concatenate Scenes**: Merges all scene videos with transitions
4. **Generate Thumbnail**: Extracts first frame as thumbnail
5. **Upload to Storage**: Uploads final video and thumbnail to Supabase
6. **Cleanup**: Removes temporary files

## Performance Considerations

### Execution Time

- Edge functions have execution time limits (typically 150-300 seconds)
- Video compilation time depends on:
  - Number of scenes (5-10 scenes recommended)
  - Total video duration (3-10 minutes recommended)
  - Resolution and quality settings

### Optimization Tips

1. **Limit Scene Count**: Keep projects to 5-10 scenes for faster processing
2. **Adjust Quality**: Use `medium` preset instead of `slow` for faster encoding
3. **Resolution**: Consider 720p for faster processing if 1080p isn't required
4. **Parallel Processing**: Scene videos are created sequentially but can be optimized

### Storage Requirements

- Temporary storage: ~2-5GB per video compilation
- Final video size: ~50-200MB depending on duration and quality
- Ensure adequate `/tmp` space in the edge function environment

## Troubleshooting

### FFmpeg Not Found

**Error**: `FFmpeg is not installed`

**Solution**:
- Deploy using the custom Dockerfile
- Or set `USE_MOCK_VIDEO=true` for testing

### Out of Memory

**Error**: `Command killed due to memory limit`

**Solution**:
- Reduce video resolution
- Use faster encoding preset
- Limit scene count
- Increase edge function memory allocation

### Execution Timeout

**Error**: `Function execution timed out`

**Solution**:
- Reduce video duration
- Optimize FFmpeg settings
- Consider splitting into smaller batches
- Use async processing with queue system

### Asset Download Failed

**Error**: `Asset download failed for scene X`

**Solution**:
- Check that previous stages (characters, audio) completed successfully
- Verify Supabase Storage bucket permissions
- Ensure image URLs from DALL-E are still valid (they expire after 1 hour)

## Future Enhancements

- [ ] Add intro/outro templates
- [ ] Support for background music
- [ ] Custom watermark positioning
- [ ] Advanced transition effects (crossfade, wipe, etc.)
- [ ] Subtitle/caption support
- [ ] Multiple resolution exports (720p, 1080p, 4K)
- [ ] Progress tracking for long videos
- [ ] Async queue-based processing
- [ ] Resume failed compilations

## License

Part of animateVDO project.
