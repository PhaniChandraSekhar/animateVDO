import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ScriptData {
  title: string;
  duration_estimate: string;
  scenes: SceneData[];
  narration_style: string;
  target_audience: string;
  tone: string;
  timestamp: string;
}

interface SceneData {
  scene_number: number;
  duration: string;
  description: string;
  narration: string;
  visuals: string[];
  characters?: string[];
  mood: string;
  camera_notes?: string;
}

interface ResearchData {
  summary: string;
  key_points: string[];
  sources: string[];
}

class ScriptGenerationService {
  private anthropicApiKey: string | undefined;
  private openaiApiKey: string | undefined;

  constructor() {
    this.anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    this.openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  }

  private createScriptPrompt(topic: string, research: ResearchData): string {
    return `Create an engaging YouTube story video script based on the following topic and research.

Topic: ${topic}

Research Summary:
${research.summary}

Key Points to Include:
${research.key_points.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Requirements:
1. Create a compelling narrative structure with clear beginning, middle, and end
2. Target duration: 3-5 minutes
3. Include emotional hooks and storytelling elements
4. Make it educational yet entertaining
5. Use simple, conversational language
6. Include specific visual descriptions for each scene
7. Write narration that's engaging and easy to follow

Output Format:
Provide a detailed script with:
- Title
- Target audience and tone
- Scene-by-scene breakdown with:
  - Scene description
  - Narration text
  - Visual elements needed
  - Duration estimate
  - Mood/atmosphere

Make it suitable for animation with clear visual storytelling opportunities.`;
  }

  async generateScript(topic: string, research: ResearchData): Promise<ScriptData> {
    const prompt = this.createScriptPrompt(topic, research);
    
    // Try Anthropic Claude first
    if (this.anthropicApiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: prompt
            }],
            temperature: 0.8
          })
        });

        if (response.ok) {
          const data = await response.json();
          return this.parseScriptResponse(data.content[0].text, topic);
        }
      } catch (error) {
        console.error('Anthropic API error:', error);
      }
    }

    // Fallback to OpenAI
    if (this.openaiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [{
              role: 'system',
              content: 'You are an expert YouTube video scriptwriter specializing in educational storytelling.'
            }, {
              role: 'user',
              content: prompt
            }],
            max_tokens: 4000,
            temperature: 0.8
          })
        });

        if (response.ok) {
          const data = await response.json();
          return this.parseScriptResponse(data.choices[0].message.content, topic);
        }
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    // If no AI service is available, throw error
    throw new Error('No AI service available for script generation');
  }

  private parseScriptResponse(aiResponse: string, topic: string): ScriptData {
    // Parse the AI response to extract structured script data
    const lines = aiResponse.split('\n');
    const scenes: SceneData[] = [];
    
    let currentScene: Partial<SceneData> | null = null;
    let title = topic;
    let targetAudience = 'General audience';
    let tone = 'Educational and engaging';
    let narrationStyle = 'Conversational';
    
    // Extract title if present
    const titleMatch = aiResponse.match(/Title:\s*(.+)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // Extract audience if present
    const audienceMatch = aiResponse.match(/(?:Target\s+)?Audience:\s*(.+)/i);
    if (audienceMatch) {
      targetAudience = audienceMatch[1].trim();
    }
    
    // Extract tone if present
    const toneMatch = aiResponse.match(/Tone:\s*(.+)/i);
    if (toneMatch) {
      tone = toneMatch[1].trim();
    }
    
    // Parse scenes
    const sceneRegex = /Scene\s+(\d+)[:\s]/i;
    let currentSceneNumber = 0;
    let currentNarration = '';
    let currentDescription = '';
    let currentVisuals: string[] = [];
    
    for (const line of lines) {
      const sceneMatch = line.match(sceneRegex);
      
      if (sceneMatch) {
        // Save previous scene if exists
        if (currentSceneNumber > 0) {
          scenes.push({
            scene_number: currentSceneNumber,
            duration: '30s',
            description: currentDescription.trim(),
            narration: currentNarration.trim(),
            visuals: currentVisuals,
            mood: 'neutral',
          });
        }
        
        // Start new scene
        currentSceneNumber = parseInt(sceneMatch[1]);
        currentNarration = '';
        currentDescription = '';
        currentVisuals = [];
      } else if (line.toLowerCase().includes('narration:')) {
        currentNarration = line.replace(/narration:/i, '').trim();
      } else if (line.toLowerCase().includes('visual:')) {
        currentVisuals.push(line.replace(/visual:/i, '').trim());
      } else if (line.toLowerCase().includes('description:')) {
        currentDescription = line.replace(/description:/i, '').trim();
      } else if (currentSceneNumber > 0 && line.trim()) {
        // Add to current narration if we're in a scene
        if (!line.match(/^(visual|description|scene|narration):/i)) {
          currentNarration += ' ' + line.trim();
        }
      }
    }
    
    // Add the last scene
    if (currentSceneNumber > 0) {
      scenes.push({
        scene_number: currentSceneNumber,
        duration: '30s',
        description: currentDescription.trim(),
        narration: currentNarration.trim(),
        visuals: currentVisuals,
        mood: 'neutral',
      });
    }
    
    // If no scenes were parsed, create a basic structure
    if (scenes.length === 0) {
      // Split content into paragraphs and create scenes
      const paragraphs = aiResponse.split('\n\n').filter(p => p.trim().length > 50);
      paragraphs.forEach((paragraph, index) => {
        scenes.push({
          scene_number: index + 1,
          duration: '30s',
          description: `Scene ${index + 1}`,
          narration: paragraph.trim(),
          visuals: [`Visual representation of: ${paragraph.substring(0, 50)}...`],
          mood: 'neutral'
        });
      });
    }
    
    // Calculate total duration
    const totalSeconds = scenes.length * 30;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const durationEstimate = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    return {
      title,
      duration_estimate: durationEstimate,
      scenes,
      narration_style: narrationStyle,
      target_audience: targetAudience,
      tone,
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
    console.log('Generating script for project_id:', project_id);

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

    // Fetch project details including research data
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    if (!project.research_data) {
      throw new Error('Research data not found. Please complete research first.');
    }

    // Initialize script service
    const scriptService = new ScriptGenerationService();
    
    // Check if we should use mock data
    const useMockData = Deno.env.get('USE_MOCK_SCRIPT') === 'true';
    
    let scriptData: ScriptData;
    
    if (useMockData) {
      // Mock script generation
      scriptData = {
        title: `The Story of ${project.topic}`,
        duration_estimate: '3:30',
        scenes: [
          {
            scene_number: 1,
            duration: '30s',
            description: 'Opening scene with title animation',
            narration: `Welcome to our journey exploring ${project.topic}. Today we'll discover fascinating insights that will change how you think about this subject.`,
            visuals: ['Title card with animated text', 'Background imagery related to topic'],
            mood: 'inspiring',
          },
          {
            scene_number: 2,
            duration: '45s',
            description: 'Introduction to main concepts',
            narration: project.research_data.summary.substring(0, 200) + '...',
            visuals: ['Animated infographics', 'Character explaining concepts'],
            mood: 'educational',
          },
          {
            scene_number: 3,
            duration: '60s',
            description: 'Deep dive into key points',
            narration: project.research_data.key_points.slice(0, 3).join(' '),
            visuals: project.research_data.key_points.map(p => `Visual for: ${p}`),
            mood: 'engaging',
          },
          {
            scene_number: 4,
            duration: '45s',
            description: 'Real-world applications',
            narration: 'Let\'s see how this applies to our everyday lives...',
            visuals: ['Real-world examples', 'Practical demonstrations'],
            mood: 'practical',
          },
          {
            scene_number: 5,
            duration: '30s',
            description: 'Conclusion and call to action',
            narration: 'Thank you for joining us on this journey. Remember to like, subscribe, and share your thoughts in the comments!',
            visuals: ['Summary graphics', 'Subscribe button animation'],
            mood: 'uplifting',
          }
        ],
        narration_style: 'Conversational and engaging',
        target_audience: 'General audience interested in learning',
        tone: 'Educational yet entertaining',
        timestamp: new Date().toISOString()
      };
    } else {
      // Generate actual script using AI
      scriptData = await scriptService.generateScript(project.topic, project.research_data);
    }

    // Store script data in story_stages table
    const { error: stageError } = await supabaseClient
      .from('story_stages')
      .insert({
        project_id,
        stage_name: 'script',
        status: 'completed',
        content: scriptData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (stageError) {
      console.error('Error storing script data:', stageError);
      throw new Error(`Failed to store script data: ${stageError.message}`);
    }

    // Update story_progress table
    const { error: progressError } = await supabaseClient
      .from('story_progress')
      .update({ script: true })
      .eq('project_id', project_id);

    if (progressError) {
      console.error('Error updating story progress:', progressError);
      throw new Error(`Failed to update story progress: ${progressError.message}`);
    }

    // Update project status
    const { error: statusError } = await supabaseClient
      .from('projects')
      .update({ 
        status: 'characters',
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id);

    if (statusError) {
      console.error('Error updating project status:', statusError);
    }

    console.log('Script generation completed for project_id:', project_id);

    return new Response(
      JSON.stringify(scriptData),
      { 
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
        } 
      },
    );
  } catch (error: any) {
    console.error('Error in ai-script function:', error.message);
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