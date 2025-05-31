import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CharacterDesignData {
  characters: CharacterData[];
  scenes: SceneVisualsData[];
  style_guide: StyleGuide;
  timestamp: string;
}

interface CharacterData {
  name: string;
  description: string;
  image_url: string;
  image_prompt: string;
  role: string;
  appearance_notes: string;
}

interface SceneVisualsData {
  scene_number: number;
  description: string;
  image_url: string;
  image_prompt: string;
  mood: string;
}

interface StyleGuide {
  art_style: string;
  color_palette: string[];
  visual_themes: string[];
  animation_notes: string;
}

class CharacterDesignService {
  private openaiApiKey: string | undefined;

  constructor() {
    this.openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  }

  private generateCharacterPrompt(
    character: any,
    style: string,
    topic: string
  ): string {
    return `Create a character design for an animated YouTube story about ${topic}.

Character: ${character.name || 'Main Character'}
Description: ${character.description || 'Friendly narrator'}
Role: ${character.role || 'Narrator'}

Style Requirements:
- ${style} art style
- Suitable for family-friendly YouTube content
- Clear, expressive features
- Consistent design for animation
- Front-facing view with neutral expression
- Simple background

The character should be appealing, memorable, and appropriate for educational content.`;
  }

  private generateScenePrompt(
    scene: any,
    style: string,
    topic: string
  ): string {
    return `Create a scene illustration for an animated YouTube story about ${topic}.

Scene: ${scene.description}
Mood: ${scene.mood || 'neutral'}
Visual Elements: ${scene.visuals ? scene.visuals.join(', ') : 'General scene'}

Style Requirements:
- ${style} art style
- Wide aspect ratio (16:9) composition
- Clear focal point
- Appropriate mood lighting
- Family-friendly content
- Suitable for animation background

The scene should support the narrative and be visually engaging.`;
  }

  async generateImage(prompt: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`DALL-E API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data[0].url;
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  }

  async generateCharacterDesigns(
    scriptData: any,
    topic: string
  ): Promise<CharacterDesignData> {
    console.log('Starting character design generation');

    // Determine art style based on topic
    const artStyle = this.determineArtStyle(topic, scriptData);
    
    // Extract characters from script
    const characters = this.extractCharacters(scriptData);
    
    // Generate character images
    const characterPromises = characters.map(async (char) => {
      const prompt = this.generateCharacterPrompt(char, artStyle.art_style, topic);
      try {
        const imageUrl = await this.generateImage(prompt);
        return {
          name: char.name,
          description: char.description,
          image_url: imageUrl,
          image_prompt: prompt,
          role: char.role,
          appearance_notes: char.appearance_notes || ''
        };
      } catch (error) {
        console.error(`Failed to generate character ${char.name}:`, error);
        // Return placeholder for failed generations
        return {
          name: char.name,
          description: char.description,
          image_url: 'https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=' + encodeURIComponent(char.name),
          image_prompt: prompt,
          role: char.role,
          appearance_notes: 'Generation failed - using placeholder'
        };
      }
    });

    // Generate key scene visuals (limit to 3-5 important scenes)
    const keyScenes = this.selectKeyScenes(scriptData.scenes);
    const scenePromises = keyScenes.map(async (scene) => {
      const prompt = this.generateScenePrompt(scene, artStyle.art_style, topic);
      try {
        const imageUrl = await this.generateImage(prompt);
        return {
          scene_number: scene.scene_number,
          description: scene.description,
          image_url: imageUrl,
          image_prompt: prompt,
          mood: scene.mood
        };
      } catch (error) {
        console.error(`Failed to generate scene ${scene.scene_number}:`, error);
        // Return placeholder for failed generations
        return {
          scene_number: scene.scene_number,
          description: scene.description,
          image_url: 'https://via.placeholder.com/1920x1080/4F46E5/FFFFFF?text=Scene+' + scene.scene_number,
          image_prompt: prompt,
          mood: scene.mood
        };
      }
    });

    // Wait for all generations to complete
    const [generatedCharacters, generatedScenes] = await Promise.all([
      Promise.all(characterPromises),
      Promise.all(scenePromises)
    ]);

    return {
      characters: generatedCharacters,
      scenes: generatedScenes,
      style_guide: artStyle,
      timestamp: new Date().toISOString()
    };
  }

  private determineArtStyle(topic: string, scriptData: any): StyleGuide {
    // Analyze topic and script to determine appropriate art style
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('history') || topicLower.includes('ancient')) {
      return {
        art_style: 'Semi-realistic illustration with historical accuracy',
        color_palette: ['#8B4513', '#D2691E', '#F4A460', '#FFE4B5', '#2F4F4F'],
        visual_themes: ['Historical accuracy', 'Period appropriate', 'Educational'],
        animation_notes: 'Smooth transitions with educational overlays'
      };
    } else if (topicLower.includes('science') || topicLower.includes('space')) {
      return {
        art_style: 'Modern, clean illustration with scientific accuracy',
        color_palette: ['#000080', '#4169E1', '#00CED1', '#E0FFFF', '#FF6347'],
        visual_themes: ['Scientific', 'Futuristic', 'Educational'],
        animation_notes: 'Dynamic animations with data visualizations'
      };
    } else if (topicLower.includes('nature') || topicLower.includes('animal')) {
      return {
        art_style: 'Vibrant, nature-inspired illustration',
        color_palette: ['#228B22', '#32CD32', '#FFD700', '#87CEEB', '#8B4513'],
        visual_themes: ['Natural', 'Organic', 'Wildlife'],
        animation_notes: 'Smooth, nature-inspired movements'
      };
    } else {
      // Default style
      return {
        art_style: 'Friendly, colorful cartoon illustration',
        color_palette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
        visual_themes: ['Friendly', 'Engaging', 'Educational'],
        animation_notes: 'Energetic animations with clear storytelling'
      };
    }
  }

  private extractCharacters(scriptData: any): any[] {
    const characters = [];
    
    // Always include a narrator
    characters.push({
      name: 'Narrator',
      description: 'Friendly and knowledgeable guide',
      role: 'Main narrator',
      appearance_notes: 'Approachable, professional appearance'
    });

    // Extract any mentioned characters from scenes
    if (scriptData.scenes) {
      scriptData.scenes.forEach((scene: any) => {
        if (scene.characters) {
          scene.characters.forEach((char: string) => {
            if (!characters.find(c => c.name === char)) {
              characters.push({
                name: char,
                description: `Character in ${scene.description}`,
                role: 'Supporting character',
                appearance_notes: 'Consistent with scene context'
              });
            }
          });
        }
      });
    }

    // Limit to 5 main characters
    return characters.slice(0, 5);
  }

  private selectKeyScenes(scenes: any[]): any[] {
    if (!scenes || scenes.length === 0) return [];
    
    // Select opening, closing, and 2-3 key middle scenes
    const keyScenes = [];
    
    // Opening scene
    if (scenes[0]) keyScenes.push(scenes[0]);
    
    // Key middle scenes
    if (scenes.length > 4) {
      const middleIndex = Math.floor(scenes.length / 2);
      keyScenes.push(scenes[middleIndex]);
      
      if (scenes.length > 6) {
        const quarterIndex = Math.floor(scenes.length / 4);
        keyScenes.push(scenes[quarterIndex]);
      }
    }
    
    // Closing scene
    if (scenes.length > 1 && scenes[scenes.length - 1]) {
      keyScenes.push(scenes[scenes.length - 1]);
    }
    
    return keyScenes.slice(0, 5); // Maximum 5 scene visuals
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
    console.log('Generating character designs for project_id:', project_id);

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

    // Initialize character design service
    const designService = new CharacterDesignService();
    
    // Check if we should use mock data
    const useMockData = Deno.env.get('USE_MOCK_IMAGES') === 'true';
    
    let characterData: CharacterDesignData;
    
    if (useMockData) {
      // Mock character generation
      characterData = {
        characters: [
          {
            name: 'Narrator',
            description: 'Friendly guide through the story',
            image_url: 'https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=Narrator',
            image_prompt: 'Mock narrator character',
            role: 'Main narrator',
            appearance_notes: 'Professional and approachable'
          },
          {
            name: 'Main Character',
            description: 'Central figure in the story',
            image_url: 'https://via.placeholder.com/1024x1024/10B981/FFFFFF?text=Main+Character',
            image_prompt: 'Mock main character',
            role: 'Protagonist',
            appearance_notes: 'Relatable and engaging'
          }
        ],
        scenes: [
          {
            scene_number: 1,
            description: 'Opening scene',
            image_url: 'https://via.placeholder.com/1920x1080/4F46E5/FFFFFF?text=Scene+1',
            image_prompt: 'Mock opening scene',
            mood: 'inspiring'
          },
          {
            scene_number: scriptStage.content.scenes.length,
            description: 'Closing scene',
            image_url: 'https://via.placeholder.com/1920x1080/10B981/FFFFFF?text=Final+Scene',
            image_prompt: 'Mock closing scene',
            mood: 'uplifting'
          }
        ],
        style_guide: {
          art_style: 'Colorful cartoon illustration',
          color_palette: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
          visual_themes: ['Educational', 'Engaging', 'Family-friendly'],
          animation_notes: 'Smooth transitions with clear storytelling'
        },
        timestamp: new Date().toISOString()
      };
    } else {
      // Generate actual character designs using DALL-E 3
      characterData = await designService.generateCharacterDesigns(
        scriptStage.content,
        project.topic
      );
    }

    // Store character design data
    const { error: stageError } = await supabaseClient
      .from('story_stages')
      .insert({
        project_id,
        stage_name: 'characters',
        status: 'completed',
        content: characterData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (stageError) {
      console.error('Error storing character design data:', stageError);
      throw new Error(`Failed to store character design data: ${stageError.message}`);
    }

    // Update story_progress table
    const { error: progressError } = await supabaseClient
      .from('story_progress')
      .update({ characters: true })
      .eq('project_id', project_id);

    if (progressError) {
      console.error('Error updating story progress:', progressError);
      throw new Error(`Failed to update story progress: ${progressError.message}`);
    }

    // Update project status
    const { error: statusError } = await supabaseClient
      .from('projects')
      .update({ 
        status: 'audio',
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id);

    if (statusError) {
      console.error('Error updating project status:', statusError);
    }

    console.log('Character design completed for project_id:', project_id);

    return new Response(
      JSON.stringify(characterData),
      { 
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
        } 
      },
    );
  } catch (error: any) {
    console.error('Error in ai-character-design function:', error.message);
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