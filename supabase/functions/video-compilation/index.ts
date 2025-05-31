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

  constructor(supabaseClient: SupabaseClient) {
    this.supabaseClient = supabaseClient;
    this.ffmpegPath = Deno.env.get('FFMPEG_PATH') || '/usr/bin/ffmpeg';
  }

  async compileVideo(
    projectId: string,
    scriptData: any,
    characterData: any,
    audioData: any
  ): Promise<VideoCompilationData> {
    console.log('Starting video compilation for project:', projectId);

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

    // In a real implementation, this would:
    // 1. Download all assets locally
    // 2. Use FFmpeg to create video for each scene
    // 3. Add Ken Burns effect to images
    // 4. Sync audio with visuals
    // 5. Add transitions between scenes
    // 6. Add intro/outro
    // 7. Export final video

    // For now, we'll create a mock implementation
    const videoFileName = `${projectId}/final_video.mp4`;
    const thumbnailFileName = `${projectId}/thumbnail.jpg`;
    
    // Mock video compilation process
    console.log('Processing scenes:', sceneAssets.length);
    console.log('Applying transitions:', renderSettings.transitions);
    console.log('Target resolution:', renderSettings.resolution);
    
    // Calculate total duration
    const totalDuration = sceneAssets.reduce((sum, scene) => sum + scene.duration, 0);
    const minutes = Math.floor(totalDuration / 60);
    const seconds = Math.round(totalDuration % 60);
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // In production, this would upload the actual compiled video
    const videoUrl = await this.mockUploadVideo(videoFileName);
    const thumbnailUrl = await this.mockUploadThumbnail(thumbnailFileName, characterData);

    return {
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration: formattedDuration,
      resolution: renderSettings.resolution,
      format: 'mp4',
      file_size: 50 * 1024 * 1024, // Mock 50MB file
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

  private async mockUploadVideo(fileName: string): Promise<string> {
    // In production, this would upload the actual video file
    // For now, return a mock URL
    return `https://storage.example.com/${fileName}`;
  }

  private async mockUploadThumbnail(
    fileName: string, 
    characterData: any
  ): Promise<string> {
    // Use the first scene visual as thumbnail, or a default
    if (characterData.scenes && characterData.scenes.length > 0) {
      return characterData.scenes[0].image_url;
    }
    return `https://via.placeholder.com/1920x1080/4F46E5/FFFFFF?text=Video+Thumbnail`;
  }

  private async executeFFmpegCommand(args: string[]): Promise<void> {
    // In production, this would execute actual FFmpeg commands
    console.log('FFmpeg command:', this.ffmpegPath, args.join(' '));
    
    // Example FFmpeg command structure:
    // ffmpeg -i image1.jpg -i audio1.mp3 -filter_complex 
    // "[0:v]scale=1920:1080,zoompan=z='zoom+0.001':d=750:s=1920x1080[v1]" 
    // -map "[v1]" -map 1:a -c:v libx264 -c:a aac -shortest scene1.mp4
  }

  createFFmpegScript(scenes: SceneAssets[]): string {
    // Generate FFmpeg filter complex for all scenes
    const filterComplex: string[] = [];
    const inputs: string[] = [];
    
    scenes.forEach((scene, index) => {
      inputs.push(`-i "${scene.visual_url}"`);
      inputs.push(`-i "${scene.audio_url}"`);
      
      // Ken Burns effect for images
      filterComplex.push(
        `[${index * 2}:v]scale=1920:1080,` +
        `zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))':` +
        `d=${scene.duration * 30}:s=1920x1080:fps=30[v${index}]`
      );
    });
    
    // Concatenate all video streams with transitions
    const concatFilter = scenes.map((_, i) => `[v${i}]`).join('') + 
      `concat=n=${scenes.length}:v=1:a=0[outv]`;
    
    filterComplex.push(concatFilter);
    
    // Concatenate all audio streams
    const audioConcat = scenes.map((_, i) => `[${i * 2 + 1}:a]`).join('') + 
      `concat=n=${scenes.length}:v=0:a=1[outa]`;
    
    filterComplex.push(audioConcat);
    
    return `ffmpeg ${inputs.join(' ')} ` +
      `-filter_complex "${filterComplex.join(';')}" ` +
      `-map "[outv]" -map "[outa]" ` +
      `-c:v libx264 -preset slow -crf 22 ` +
      `-c:a aac -b:a 192k ` +
      `-pix_fmt yuv420p output.mp4`;
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
    
    // Check if we should use mock data
    const useMockData = Deno.env.get('USE_MOCK_VIDEO') === 'true';
    
    let videoData: VideoCompilationData;
    
    if (useMockData || Deno.env.get('DISABLE_VIDEO_PROCESSING') === 'true') {
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
      // Compile actual video
      videoData = await videoService.compileVideo(
        project_id,
        scriptStage.data.content,
        characterStage.data?.content || {},
        audioStage.data.content
      );
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