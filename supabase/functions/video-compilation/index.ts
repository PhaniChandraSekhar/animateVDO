import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface VideoCompilationData {
  video_url: string;
  thumbnail_url: string;
  duration: string;
  resolution: string;
  format: string;
  file_size: number;
  render_settings: RenderSettings;
  timestamp: string;
}

interface RenderSettings {
  resolution: string;
  fps: number;
  codec: string;
  bitrate: string;
  transitions: string;
  background_music?: string;
  watermark?: boolean;
}

interface SceneAssets {
  scene_number: number;
  visual_url: string;
  audio_url: string;
  duration: number;
  narration: string;
}

class VideoCompilationService {
  private supabaseClient: SupabaseClient;
  private ffmpegPath: string;
  private tempDir: string;

  constructor(supabaseClient: SupabaseClient) {
    this.supabaseClient = supabaseClient;
    this.ffmpegPath = Deno.env.get('FFMPEG_PATH') || 'ffmpeg';
    this.tempDir = '/tmp/video-compilation';
  }

  async compileVideo(
    projectId: string,
    scriptData: any,
    characterData: any,
    audioData: any
  ): Promise<VideoCompilationData> {
    console.log('Starting video compilation for project:', projectId);

    // Create temporary directory for processing
    const workDir = `${this.tempDir}/${projectId}`;
    await this.ensureDirectory(workDir);

    // Prepare scene assets
    const sceneAssets = this.prepareSceneAssets(scriptData, characterData, audioData);

    // Define render settings
    const renderSettings: RenderSettings = {
      resolution: '1920x1080',
      fps: 30,
      codec: 'h264',
      bitrate: '5000k',
      transitions: 'fade',
      background_music: undefined,
      watermark: true
    };

    console.log('Processing scenes:', sceneAssets.length);

    // Download all assets locally
    const downloadedAssets = await this.downloadAllAssets(sceneAssets, workDir);

    // Create video for each scene with Ken Burns effect
    const sceneVideos = await this.createSceneVideos(downloadedAssets, workDir, renderSettings);

    // Concatenate scenes with transitions
    const finalVideoPath = await this.concatenateScenes(sceneVideos, workDir, renderSettings);

    // Calculate total duration
    const totalDuration = sceneAssets.reduce((sum, scene) => sum + scene.duration, 0);
    const minutes = Math.floor(totalDuration / 60);
    const seconds = Math.round(totalDuration % 60);
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Generate thumbnail from first frame
    const thumbnailPath = await this.generateThumbnail(finalVideoPath, workDir);

    // Upload video and thumbnail to Supabase Storage
    const videoUrl = await this.uploadVideoToStorage(finalVideoPath, projectId);
    const thumbnailUrl = await this.uploadThumbnailToStorage(thumbnailPath, projectId);

    // Get file size
    const fileSize = await this.getFileSize(finalVideoPath);

    // Cleanup temporary files
    await this.cleanup(workDir);

    return {
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration: formattedDuration,
      resolution: renderSettings.resolution,
      format: 'mp4',
      file_size: fileSize,
      render_settings: renderSettings,
      timestamp: new Date().toISOString()
    };
  }

  private prepareSceneAssets(
    scriptData: any,
    characterData: any,
    audioData: any
  ): SceneAssets[] {
    const assets: SceneAssets[] = [];
    
    // Map script scenes with their corresponding assets
    for (const scene of scriptData.scenes) {
      // Find corresponding visual
      const sceneVisual = characterData.scenes?.find(
        (s: any) => s.scene_number === scene.scene_number
      );
      
      // Find corresponding audio
      const sceneAudio = audioData.audio_files.find(
        (a: any) => a.scene_number === scene.scene_number
      );
      
      if (sceneAudio) {
        assets.push({
          scene_number: scene.scene_number,
          visual_url: sceneVisual?.image_url || this.getDefaultVisual(scene),
          audio_url: sceneAudio.audio_url,
          duration: sceneAudio.duration,
          narration: scene.narration
        });
      }
    }
    
    return assets;
  }

  private getDefaultVisual(scene: any): string {
    // Return a default visual if no specific image was generated
    return `https://via.placeholder.com/1920x1080/4F46E5/FFFFFF?text=Scene+${scene.scene_number}`;
  }

  private async ensureDirectory(path: string): Promise<void> {
    try {
      await Deno.mkdir(path, { recursive: true });
    } catch (error) {
      // Directory might already exist
      console.log('Directory creation:', error);
    }
  }

  private async downloadFile(url: string, destination: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.statusText}`);
      }
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      await Deno.writeFile(destination, new Uint8Array(buffer));
      console.log(`Downloaded: ${destination}`);
    } catch (error) {
      console.error(`Error downloading ${url}:`, error);
      throw error;
    }
  }

  private async downloadAllAssets(
    scenes: SceneAssets[],
    workDir: string
  ): Promise<Array<{ scene_number: number; imagePath: string; audioPath: string; duration: number }>> {
    const downloaded = [];

    for (const scene of scenes) {
      const imagePath = `${workDir}/scene_${scene.scene_number}_image.jpg`;
      const audioPath = `${workDir}/scene_${scene.scene_number}_audio.mp3`;

      try {
        // Download image
        await this.downloadFile(scene.visual_url, imagePath);

        // Download audio
        await this.downloadFile(scene.audio_url, audioPath);

        downloaded.push({
          scene_number: scene.scene_number,
          imagePath,
          audioPath,
          duration: scene.duration
        });
      } catch (error) {
        console.error(`Failed to download assets for scene ${scene.scene_number}:`, error);
        throw new Error(`Asset download failed for scene ${scene.scene_number}`);
      }
    }

    return downloaded;
  }

  private async createSceneVideos(
    assets: Array<{ scene_number: number; imagePath: string; audioPath: string; duration: number }>,
    workDir: string,
    settings: RenderSettings
  ): Promise<string[]> {
    const sceneVideos: string[] = [];

    for (const asset of assets) {
      const outputPath = `${workDir}/scene_${asset.scene_number}.mp4`;

      // Create Ken Burns effect: zoom in from 1.0 to 1.2 over the duration
      const zoomDuration = asset.duration * settings.fps; // Convert to frames

      const args = [
        '-loop', '1',
        '-i', asset.imagePath,
        '-i', asset.audioPath,
        '-filter_complex',
        `[0:v]scale=${settings.resolution},zoompan=z='min(zoom+0.0015,1.2)':d=${zoomDuration}:s=${settings.resolution}:fps=${settings.fps}[v]`,
        '-map', '[v]',
        '-map', '1:a',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-y',
        outputPath
      ];

      await this.executeFFmpegCommand(args);
      sceneVideos.push(outputPath);
    }

    return sceneVideos;
  }

  private async concatenateScenes(
    sceneVideos: string[],
    workDir: string,
    settings: RenderSettings
  ): Promise<string> {
    const concatListPath = `${workDir}/concat_list.txt`;
    const outputPath = `${workDir}/final_video.mp4`;

    // Create concat demuxer file list
    const fileList = sceneVideos.map(path => `file '${path}'`).join('\n');
    await Deno.writeTextFile(concatListPath, fileList);

    // Concatenate with fade transitions
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      outputPath
    ];

    await this.executeFFmpegCommand(args);
    return outputPath;
  }

  private async generateThumbnail(videoPath: string, workDir: string): Promise<string> {
    const thumbnailPath = `${workDir}/thumbnail.jpg`;

    const args = [
      '-i', videoPath,
      '-ss', '00:00:01',
      '-vframes', '1',
      '-vf', 'scale=1920:1080',
      '-y',
      thumbnailPath
    ];

    await this.executeFFmpegCommand(args);
    return thumbnailPath;
  }

  private async uploadVideoToStorage(filePath: string, projectId: string): Promise<string> {
    const fileName = `${projectId}/videos/final_video.mp4`;
    const fileData = await Deno.readFile(filePath);

    const { data, error } = await this.supabaseClient.storage
      .from('project-assets')
      .upload(fileName, fileData, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (error) {
      console.error('Error uploading video:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    const { data: { publicUrl } } = this.supabaseClient.storage
      .from('project-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  private async uploadThumbnailToStorage(filePath: string, projectId: string): Promise<string> {
    const fileName = `${projectId}/videos/thumbnail.jpg`;
    const fileData = await Deno.readFile(filePath);

    const { data, error } = await this.supabaseClient.storage
      .from('project-assets')
      .upload(fileName, fileData, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Error uploading thumbnail:', error);
      throw new Error(`Failed to upload thumbnail: ${error.message}`);
    }

    const { data: { publicUrl } } = this.supabaseClient.storage
      .from('project-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  private async getFileSize(filePath: string): Promise<number> {
    const fileInfo = await Deno.stat(filePath);
    return fileInfo.size;
  }

  private async cleanup(workDir: string): Promise<void> {
    try {
      await Deno.remove(workDir, { recursive: true });
      console.log('Cleaned up temporary files');
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  }

  private async executeFFmpegCommand(args: string[]): Promise<void> {
    console.log('Executing FFmpeg:', this.ffmpegPath, args.join(' '));

    const command = new Deno.Command(this.ffmpegPath, {
      args,
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await command.output();

    if (code !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      console.error('FFmpeg error:', errorMessage);
      throw new Error(`FFmpeg failed with code ${code}: ${errorMessage}`);
    }

    const output = new TextDecoder().decode(stdout);
    console.log('FFmpeg output:', output);
  }
}

export async function handleRequest(req: Request, supabaseClient: SupabaseClient): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
      } 
    });
  }

  try {
    const { project_id } = await req.json();
    console.log('Compiling video for project_id:', project_id);

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required." }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json', 
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
          } 
        },
      );
    }

    // Fetch all required data
    const [scriptStage, characterStage, audioStage] = await Promise.all([
      supabaseClient
        .from('story_stages')
        .select('*')
        .eq('project_id', project_id)
        .eq('stage_name', 'script')
        .single(),
      supabaseClient
        .from('story_stages')
        .select('*')
        .eq('project_id', project_id)
        .eq('stage_name', 'characters')
        .single(),
      supabaseClient
        .from('story_stages')
        .select('*')
        .eq('project_id', project_id)
        .eq('stage_name', 'audio')
        .single()
    ]);

    if (!scriptStage.data?.content || !audioStage.data?.content) {
      throw new Error('Missing required data. Please complete all previous stages.');
    }

    // Initialize video compilation service
    const videoService = new VideoCompilationService(supabaseClient);

    // Check if we should use mock data (only if explicitly enabled)
    const useMockData = Deno.env.get('USE_MOCK_VIDEO') === 'true' ||
                        Deno.env.get('DISABLE_VIDEO_PROCESSING') === 'true';

    let videoData: VideoCompilationData;

    if (useMockData) {
      console.log('Using mock video data (USE_MOCK_VIDEO or DISABLE_VIDEO_PROCESSING is enabled)');
      // Create mock video data
      const totalDuration = audioStage.data.content.total_duration;
      videoData = {
        video_url: `https://storage.example.com/${project_id}/final_video.mp4`,
        thumbnail_url: characterStage.data?.content?.scenes?.[0]?.image_url ||
          'https://via.placeholder.com/1920x1080/4F46E5/FFFFFF?text=Video+Thumbnail',
        duration: totalDuration,
        resolution: '1920x1080',
        format: 'mp4',
        file_size: 50 * 1024 * 1024,
        render_settings: {
          resolution: '1920x1080',
          fps: 30,
          codec: 'h264',
          bitrate: '5000k',
          transitions: 'fade',
          watermark: true
        },
        timestamp: new Date().toISOString()
      };
    } else {
      console.log('Compiling actual video with FFmpeg');
      // Compile actual video using FFmpeg
      try {
        videoData = await videoService.compileVideo(
          project_id,
          scriptStage.data.content,
          characterStage.data?.content || {},
          audioStage.data.content
        );
      } catch (error: any) {
        console.error('Video compilation failed:', error);

        // Check if FFmpeg is not available
        if (error.message.includes('command not found') || error.message.includes('No such file')) {
          throw new Error(
            'FFmpeg is not installed. Please install FFmpeg in your Supabase Edge Functions environment or set USE_MOCK_VIDEO=true for testing.'
          );
        }

        throw error;
      }
    }

    // Store video data
    const { error: stageError } = await supabaseClient
      .from('story_stages')
      .insert({
        project_id,
        stage_name: 'video',
        status: 'completed',
        content: videoData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (stageError) {
      console.error('Error storing video data:', stageError);
      throw new Error(`Failed to store video data: ${stageError.message}`);
    }

    // Update story_progress table
    const { error: progressError } = await supabaseClient
      .from('story_progress')
      .update({ video: true })
      .eq('project_id', project_id);

    if (progressError) {
      console.error('Error updating story progress:', progressError);
      throw new Error(`Failed to update story progress: ${progressError.message}`);
    }

    // Update project status to completed
    const { error: statusError } = await supabaseClient
      .from('projects')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id);

    if (statusError) {
      console.error('Error updating project status:', statusError);
    }

    console.log('Video compilation completed for project_id:', project_id);

    return new Response(
      JSON.stringify(videoData),
      { 
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
        } 
      },
    );
  } catch (error: any) {
    console.error('Error in video-compilation function:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred." }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
        } 
      },
    );
  }
}

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key not found in environment variables');
    return new Response(
      JSON.stringify({ error: 'Supabase client not configured.' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
        } 
      },
    );
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  return await handleRequest(req, supabaseClient);
});