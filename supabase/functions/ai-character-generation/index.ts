import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('AI Character Generation function booting up')

// --- Interfaces ---
interface ScriptScene { // Assuming this structure from ai-scriptwriting
  scene_number: number;
  setting: string;
  action: string;
  dialogue: Array<{ character: string; line: string }>;
}

interface ScriptData { // Assuming this structure from ai-scriptwriting
  title: string;
  logline: string;
  scenes: ScriptScene[];
  // Potentially add a characters field here in the future:
  // characters?: Array<{ name: string; description: string; style_hint?: string }>;
}

interface CharacterPromptDetail {
  name: string;
  description_override?: string;
  style_prompt_override?: string;
}

interface CharacterGenPayload {
  project_id: string;
  script_data?: ScriptData; // Optional: if client already has it
  custom_prompts_per_character?: CharacterPromptDetail[];
}

interface CharacterDetail {
  name: string;
  description: string; // The final description used for generation
  image_url: string;
  prompt_used: { // For transparency, record what was actually used
    description: string;
    style_prompt: string;
  };
}

// --- Mock Image Generation API Call ---
async function mockImageGenerationApiCall(
  characterName: string,
  description: string,
  stylePrompt: string,
  supabaseClient: SupabaseClient, // Added
  project_id: string,             // Added
): Promise<{ image_url: string }> {
  // const imageApiKey = Deno.env.get("IMAGE_API_KEY");
  // if (!imageApiKey) {
  //   throw new Error("IMAGE_API_KEY not configured.");
  // }
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay

  if (description.toLowerCase().includes("test_error_image_gen_failure")) { // Specific error for image gen part
    throw new Error(`Simulated image generation API error for ${characterName}.`);
  }

  // 1. Simulate Image Data Generation
  const mockImageData = `mock image data for ${characterName} - style: ${stylePrompt} - desc: ${description.substring(0,30)}`;
  console.log(`Simulated image data generation for ${characterName}.`);

  // 2. Simulate Upload to Supabase Storage
  const sanitizedCharacterName = characterName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const filePath = `public/${project_id}/${sanitizedCharacterName}-${Date.now()}.txt`; // Using .txt for mock string data

  // Actual (but commented for this step) Supabase storage upload call structure
  // const { data: uploadData, error: uploadError } = await supabaseClient.storage
  //   .from('character-images') // Target bucket
  //   .upload(filePath, mockImageData, { // Using mockImageData (string) as Blob/File/Buffer
  //     contentType: 'text/plain', // For mock string data; 'image/png' for actual images
  //     upsert: true,
  //   });
  // if (uploadError) {
  //   console.error(`Storage upload failed for ${characterName}:`, uploadError);
  //   throw new Error(`Storage upload failed for ${characterName}: ${uploadError.message}`);
  // }
  
  // SIMULATE SUCCESSFUL UPLOAD for now:
  console.log(`Simulating upload of ${filePath} to character-images bucket.`);
  const MOCK_UPLOAD_SUCCESS = !description.toLowerCase().includes("test_error_storage_upload"); // Simulate based on desc
  if (!MOCK_UPLOAD_SUCCESS) { // Simulate an upload error
      throw new Error('Mock Storage upload failed for ' + characterName);
  }
  // console.log('Simulated uploadData:', uploadData); // Would be { path: filePath } or similar

  // 3. Simulate Public URL Retrieval
  // Actual (but commented for this step) Supabase public URL retrieval
  // const { data: publicUrlData } = supabaseClient.storage
  //   .from('character-images')
  //   .getPublicUrl(filePath);
  // if (!publicUrlData) { // Should check for error from getPublicUrl if that's possible
  //   console.error(`Failed to get public URL for ${filePath}`);
  //   throw new Error(`Failed to get public URL for ${filePath}`);
  // }
  // const imageUrl = publicUrlData.publicUrl;

  // SIMULATE PUBLIC URL for now:
  const MOCK_SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
  const imageUrl = `${MOCK_SUPABASE_URL}/storage/v1/object/public/character-images/${filePath}`;
  console.log(`Simulated public URL for ${characterName}: ${imageUrl}`);
  
  return {
    image_url: imageUrl,
  };
}

// --- Request Handler ---
export async function handleCharacterRequest(req: Request, supabaseClient: SupabaseClient): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (!supabaseClient) {
    console.error("Supabase client not available for character generation.");
    return new Response(JSON.stringify({ error: 'Database client is not configured.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload: CharacterGenPayload = await req.json();
    const { project_id, custom_prompts_per_character } = payload;
    let script_data_from_payload = payload.script_data;

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let fetchedScriptData: ScriptData | null = null;
    if (!script_data_from_payload) {
      console.log(`Script data not in payload for project ${project_id}, fetching...`);
      const { data: projectData, error: fetchError } = await supabaseClient
        .from('projects')
        .select('script_data')
        .eq('id', project_id)
        .single();

      if (fetchError) throw new Error(`Failed to fetch script data: ${fetchError.message}`);
      if (!projectData || !projectData.script_data) {
         console.warn(`No script data found in DB for project ${project_id}. Using default characters.`);
      } else {
        fetchedScriptData = projectData.script_data as ScriptData;
        console.log(`Fetched script data for project ${project_id}.`);
      }
    } else {
      fetchedScriptData = script_data_from_payload;
      console.log(`Using script data from payload for project ${project_id}.`);
    }
    
    let characterNamesFromScript: string[] = [];
    if (fetchedScriptData && fetchedScriptData.scenes) {
      const names = new Set<string>();
      fetchedScriptData.scenes.forEach(scene => {
        scene.dialogue?.forEach(d => names.add(d.character));
      });
      // Filter out "Narrator" or other generic names if needed
      characterNamesFromScript = Array.from(names).filter(name => name && name.toLowerCase() !== 'narrator');
    }

    if (characterNamesFromScript.length === 0) {
      console.log("No characters extracted from script, using default list.");
      characterNamesFromScript = ["Hero", "Villain", "Sidekick"];
    }
    console.log("Generating for characters:", characterNamesFromScript);

    const generatedCharacters: CharacterDetail[] = [];
    for (const name of characterNamesFromScript) {
      const customPrompt = custom_prompts_per_character?.find(p => p.name.toLowerCase() === name.toLowerCase());
      
      // Simplified description logic for now
      let description = customPrompt?.description_override || `A key character in the story named ${name}.`;
      // In a real scenario, we might try to find a description in fetchedScriptData.characters
      // if (fetchedScriptData?.characters?.find(c => c.name === name)?.description) {
      //   description = fetchedScriptData.characters.find(c => c.name === name)!.description;
      // }
      
      const stylePrompt = customPrompt?.style_prompt_override || "cinematic, detailed, fantasy art";

      try {
        console.log(`Generating image for ${name} with style: ${stylePrompt}`);
        // Pass supabaseClient and project_id to the updated mock function
        const imageResult = await mockImageGenerationApiCall(name, description, stylePrompt, supabaseClient, project_id);
        generatedCharacters.push({
          name,
          description, // The final description passed to the API
          image_url: imageResult.image_url,
          prompt_used: { description, style_prompt: stylePrompt },
        });
      } catch (imgError) {
        console.error(`Failed to generate image for ${name}:`, imgError.message);
        // Add a placeholder error image or skip the character
         generatedCharacters.push({
          name,
          description, // Still record what was attempted
          image_url: `https://placehold.co/512x512.png?text=ERROR-${encodeURIComponent(name)}&reason=${encodeURIComponent(imgError.message.substring(0,30))}`,
          prompt_used: { description, style_prompt: stylePrompt },
        });
      }
    }
    
    // Store generated character data
    const { error: characterUpdateError } = await supabaseClient
      .from('projects')
      .update({ character_data: generatedCharacters })
      .eq('id', project_id);

    if (characterUpdateError) {
      console.error('Error updating project character_data:', characterUpdateError);
      throw new Error(`Failed to store character data: ${characterUpdateError.message}`);
    }
    console.log(`Character data stored for project_id ${project_id}.`);

    // Update story_progress table
    const { error: progressUpdateError } = await supabaseClient
      .from('story_progress')
      .update({ characters: true })
      .eq('project_id', project_id);

    if (progressUpdateError) {
      console.error('Error updating story progress for characters:', progressUpdateError);
      // Consider compensation logic if this is critical
      throw new Error(`Failed to update character generation progress: ${progressUpdateError.message}`);
    }
    console.log(`Story progress updated for characters stage for project_id ${project_id}.`);

    return new Response(JSON.stringify(generatedCharacters), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Error in ai-character-generation function:', error);
    const errorMessage = error.message || 'An unexpected error occurred.';
    // Determine status code based on error type if possible, otherwise default to 500
    let statusCode = 500;
    if (error.message.includes("not found")) statusCode = 404; // e.g. if script_data fetch failed
    // Add more specific status codes if needed for other error types from DB operations
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// --- Main Serve Function ---
serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  let supabaseClient: SupabaseClient | null = null;

  if (supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });
  } else {
    console.error('Supabase URL or Anon Key missing. Supabase client for character gen not initialized.');
    // If client is absolutely essential, could return error early:
    // return new Response(JSON.stringify({ error: 'Server configuration error: Supabase client cannot be initialized.' }), 
    //   { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
  return await handleCharacterRequest(req, supabaseClient as SupabaseClient); // Cast is safe due to check in handler
});
