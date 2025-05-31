import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface VoiceSynthesisData {
  audio_files: AudioFileData[];
  voice_settings: VoiceSettings;
  total_duration: string;
  timestamp: string;
}

interface AudioFileData {
  scene_number: number;
  narration_text: string;
  audio_url: string;
  duration: number;
  voice_id: string;
  format: string;
}

interface VoiceSettings {
  voice_id: string;
  voice_name: string;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

class VoiceSynthesisService {
  private elevenLabsApiKey: string | undefined;
  private supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    this.supabaseClient = supabaseClient;
  }

  async getAvailableVoices(): Promise<any[]> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.elevenLabsApiKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      return data.voices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      // Return default voice list if API fails
      return [{
        voice_id: '21m00Tcm4TlvDq8ikWAM',
        name: 'Rachel - Calm Female'
      }, {
        voice_id: 'AZnzlk1XvdvUeBnXmlld',
        name: 'Domi - Confident Male'
      }];
    }
  }

  selectVoiceForContent(topic: string, tone: string, availableVoices: any[]): VoiceSettings {
    // Select appropriate voice based on content characteristics
    const topicLower = topic.toLowerCase();
    const toneLower = tone.toLowerCase();
    
    // Default to Rachel (calm, clear narration voice)
    let selectedVoiceId = '21m00Tcm4TlvDq8ikWAM';
    let selectedVoiceName = 'Rachel';
    
    // Match voice to content type
    if (topicLower.includes('children') || topicLower.includes('kids')) {
      // Use a friendly, energetic voice for children's content
      const childFriendlyVoice = availableVoices.find(v => 
        v.name.toLowerCase().includes('josh') || 
        v.name.toLowerCase().includes('elli')
      );
      if (childFriendlyVoice) {
        selectedVoiceId = childFriendlyVoice.voice_id;
        selectedVoiceName = childFriendlyVoice.name;
      }
    } else if (toneLower.includes('professional') || toneLower.includes('educational')) {
      // Use a clear, professional voice
      const professionalVoice = availableVoices.find(v => 
        v.name.toLowerCase().includes('adam') || 
        v.name.toLowerCase().includes('rachel')
      );
      if (professionalVoice) {
        selectedVoiceId = professionalVoice.voice_id;
        selectedVoiceName = professionalVoice.name;
      }
    } else if (topicLower.includes('story') || topicLower.includes('narrative')) {
      // Use an engaging storyteller voice
      const narratorVoice = availableVoices.find(v => 
        v.name.toLowerCase().includes('antoni') || 
        v.name.toLowerCase().includes('bella')
      );
      if (narratorVoice) {
        selectedVoiceId = narratorVoice.voice_id;
        selectedVoiceName = narratorVoice.name;
      }
    }
    
    return {
      voice_id: selectedVoiceId,
      voice_name: selectedVoiceName,
      stability: 0.5,  // Balanced stability
      similarity_boost: 0.75,  // Good similarity to original voice
      style: 0.0,  // Neutral style
      use_speaker_boost: true  // Enhance clarity
    };
  }

  async synthesizeSpeech(
    text: string,
    voiceSettings: VoiceSettings
  ): Promise<{ audioData: Uint8Array; duration: number }> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voice_id}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: voiceSettings.stability,
              similarity_boost: voiceSettings.similarity_boost,
              style: voiceSettings.style,
              use_speaker_boost: voiceSettings.use_speaker_boost
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      const audioData = new Uint8Array(await response.arrayBuffer());
      
      // Estimate duration (rough calculation based on text length and average speech rate)
      const wordsPerMinute = 150;
      const words = text.split(' ').length;
      const duration = (words / wordsPerMinute) * 60;

      return { audioData, duration };
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error;
    }
  }

  async uploadAudioToStorage(
    audioData: Uint8Array,
    projectId: string,
    sceneNumber: number
  ): Promise<string> {
    const fileName = `${projectId}/audio/scene_${sceneNumber}.mp3`;
    
    const { data, error } = await this.supabaseClient.storage
      .from('project-assets')
      .upload(fileName, audioData, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (error) {
      console.error('Error uploading audio:', error);
      throw new Error(`Failed to upload audio: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = this.supabaseClient.storage
      .from('project-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  async generateAudioForScript(
    scriptData: any,
    topic: string,
    projectId: string
  ): Promise<VoiceSynthesisData> {
    console.log('Starting voice synthesis for project');

    // Get available voices
    const availableVoices = await this.getAvailableVoices();
    
    // Select appropriate voice
    const voiceSettings = this.selectVoiceForContent(
      topic,
      scriptData.tone || 'educational',
      availableVoices
    );

    const audioFiles: AudioFileData[] = [];
    let totalDuration = 0;

    // Process each scene
    for (const scene of scriptData.scenes) {
      try {
        console.log(`Synthesizing audio for scene ${scene.scene_number}`);
        
        // Synthesize speech
        const { audioData, duration } = await this.synthesizeSpeech(
          scene.narration,
          voiceSettings
        );
        
        // Upload to storage
        const audioUrl = await this.uploadAudioToStorage(
          audioData,
          projectId,
          scene.scene_number
        );
        
        audioFiles.push({
          scene_number: scene.scene_number,
          narration_text: scene.narration,
          audio_url: audioUrl,
          duration,
          voice_id: voiceSettings.voice_id,
          format: 'mp3'
        });
        
        totalDuration += duration;
      } catch (error) {
        console.error(`Failed to synthesize scene ${scene.scene_number}:`, error);
        // Add placeholder for failed synthesis
        audioFiles.push({
          scene_number: scene.scene_number,
          narration_text: scene.narration,
          audio_url: '',
          duration: 30, // Default duration
          voice_id: voiceSettings.voice_id,
          format: 'mp3'
        });
        totalDuration += 30;
      }
    }

    // Format total duration
    const minutes = Math.floor(totalDuration / 60);
    const seconds = Math.round(totalDuration % 60);
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return {
      audio_files: audioFiles,
      voice_settings: voiceSettings,
      total_duration: formattedDuration,
      timestamp: new Date().toISOString()
    };
  }

  // Create mock audio data for testing
  createMockAudioData(scriptData: any, projectId: string): VoiceSynthesisData {
    const audioFiles: AudioFileData[] = scriptData.scenes.map((scene: any) => ({
      scene_number: scene.scene_number,
      narration_text: scene.narration,
      audio_url: `https://via.placeholder.com/audio/${projectId}/scene_${scene.scene_number}.mp3`,
      duration: 30,
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      format: 'mp3'
    }));

    const totalSeconds = audioFiles.reduce((sum, file) => sum + file.duration, 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return {
      audio_files: audioFiles,
      voice_settings: {
        voice_id: '21m00Tcm4TlvDq8ikWAM',
        voice_name: 'Rachel (Mock)',
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      },
      total_duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      timestamp: new Date().toISOString()
    };
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
    console.log('Generating voice synthesis for project_id:', project_id);

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

    // Fetch project details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    // Fetch script data
    const { data: scriptStage, error: scriptError } = await supabaseClient
      .from('story_stages')
      .select('*')
      .eq('project_id', project_id)
      .eq('stage_name', 'script')
      .single();

    if (scriptError || !scriptStage || !scriptStage.content) {
      throw new Error('Script data not found. Please complete script generation first.');
    }

    // Initialize voice synthesis service
    const voiceService = new VoiceSynthesisService(supabaseClient);
    
    // Check if we should use mock data
    const useMockData = Deno.env.get('USE_MOCK_AUDIO') === 'true';
    
    let audioData: VoiceSynthesisData;
    
    if (useMockData || !Deno.env.get('ELEVENLABS_API_KEY')) {
      // Create mock audio data
      audioData = voiceService.createMockAudioData(scriptStage.content, project_id);
    } else {
      // Generate actual audio using ElevenLabs
      audioData = await voiceService.generateAudioForScript(
        scriptStage.content,
        project.topic,
        project_id
      );
    }

    // Store audio data
    const { error: stageError } = await supabaseClient
      .from('story_stages')
      .insert({
        project_id,
        stage_name: 'audio',
        status: 'completed',
        content: audioData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (stageError) {
      console.error('Error storing audio data:', stageError);
      throw new Error(`Failed to store audio data: ${stageError.message}`);
    }

    // Update story_progress table
    const { error: progressError } = await supabaseClient
      .from('story_progress')
      .update({ audio: true })
      .eq('project_id', project_id);

    if (progressError) {
      console.error('Error updating story progress:', progressError);
      throw new Error(`Failed to update story progress: ${progressError.message}`);
    }

    // Update project status
    const { error: statusError } = await supabaseClient
      .from('projects')
      .update({ 
        status: 'video',
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id);

    if (statusError) {
      console.error('Error updating project status:', statusError);
    }

    console.log('Voice synthesis completed for project_id:', project_id);

    return new Response(
      JSON.stringify(audioData),
      { 
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
        } 
      },
    );
  } catch (error: any) {
    console.error('Error in ai-voice-synthesis function:', error.message);
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