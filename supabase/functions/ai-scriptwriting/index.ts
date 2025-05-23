import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('AI Scriptwriting function booting up')

// --- Interfaces ---
interface ResearchDataInput {
  summary: string;
  key_points?: string[];
  sources?: string[];
  // Add other fields from ai-research output as needed
}

interface ScriptScene {
  scene_number: number;
  setting: string;
  action: string;
  dialogue: Array<{ character: string; line: string }>;
}

interface Script {
  title: string;
  logline: string;
  scenes: ScriptScene[];
}

// --- Mock LLM Call ---
async function mockLlmScriptCall(researchData?: ResearchDataInput): Promise<Script> {
  // const llmApiKey = Deno.env.get("LLM_API_KEY");
  // if (!llmApiKey) {
  //   throw new Error("LLM_API_KEY not configured.");
  // }
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

  if (!researchData || !researchData.summary) {
    return {
      title: 'Generic Placeholder Script',
      logline: 'A story about something interesting, generated with minimal input.',
      scenes: [{
        scene_number: 1,
        setting: 'A generic room.',
        action: 'Something happens.',
        dialogue: [{ character: 'Person A', line: 'Hello.' }, { character: 'Person B', line: 'Hi.' }]
      }]
    };
  }

  if (researchData.summary.toLowerCase().includes("test_error_script")) {
    throw new Error("Simulated LLM error during script generation.");
  }

  if (researchData.summary.toLowerCase().includes("space exploration")) {
    return {
      title: 'Cosmic Odyssey',
      logline: 'Brave astronauts explore the final frontier.',
      scenes: [
        {
          scene_number: 1,
          setting: 'INT. SPACESHIP BRIDGE - NIGHT',
          action: 'ALARMS blare. SPARKS fly from a console. CAPTAIN EVA (40s, resolute) barks orders.',
          dialogue: [
            { character: 'EVA', line: 'Report! What\'s our status?' },
            { character: 'PILOT (O.S)', line: 'Main drive offline, Captain! We\'re drifting!' }
          ]
        },
        {
          scene_number: 2,
          setting: 'EXT. ALIEN PLANET - DAY',
          action: 'EVA and her LANDING PARTY step onto a vibrant, purple landscape. Strange flora glows faintly.',
          dialogue: [
            { character: 'EVA', line: 'Stay alert. We don\'t know what to expect.' },
          ]
        }
      ]
    };
  }

  // Default script if no specific keywords match
  return {
    title: `Script based on: ${researchData.summary.substring(0, 30)}...`,
    logline: `A compelling story derived from the research: ${researchData.summary.substring(0, 50)}...`,
    scenes: [
      {
        scene_number: 1,
        setting: 'A place relevant to the research.',
        action: 'Key actions from research_data.key_points could be integrated here.',
        dialogue: [{ character: 'Character 1', line: 'This is interesting.' }]
      }
    ]
  };
}


// --- Request Handler ---
export async function handleScriptRequest(req: Request, supabaseClient: SupabaseClient): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!supabaseClient) {
      console.error("Supabase client not available. Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.");
      return new Response(JSON.stringify({ error: 'Database client is not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }

  try {
    let { project_id, research_data } = await req.json();
    console.log('Scriptwriting for project_id:', project_id);

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let finalResearchData: ResearchDataInput | undefined | null = research_data;

    if (!finalResearchData || !finalResearchData.summary) {
      console.log(`Research_data not provided or incomplete in request for project_id ${project_id}. Fetching from DB...`);
      const { data: projectData, error: fetchError } = await supabaseClient
        .from('projects')
        .select('research_data')
        .eq('id', project_id)
        .single();

      if (fetchError) {
        console.error('Error fetching research_data:', fetchError);
        throw new Error(`Failed to fetch research data for project ${project_id}: ${fetchError.message}`);
      }
      if (!projectData || !projectData.research_data) {
        console.error(`Research data not found in DB for project_id ${project_id}.`);
        return new Response(JSON.stringify({ error: `Research data not found for project ${project_id}. Cannot generate script.` }), {
          status: 404, // Not Found
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      finalResearchData = projectData.research_data as ResearchDataInput;
      console.log(`Successfully fetched research_data for project_id ${project_id}. Summary: ${finalResearchData?.summary?.substring(0,50)}...`);
    } else {
      console.log(`Received research_data in request for project_id ${project_id}. Summary: ${finalResearchData?.summary?.substring(0,50)}...`);
    }

    const script = await mockLlmScriptCall(finalResearchData);

    // Store script data in projects table
    const { error: scriptUpdateError } = await supabaseClient
      .from('projects')
      .update({ script_data: script })
      .eq('id', project_id);

    if (scriptUpdateError) {
      console.error('Error updating project script_data:', scriptUpdateError);
      throw new Error(`Failed to store script data: ${scriptUpdateError.message}`);
    }
    console.log(`Script data stored for project_id ${project_id}.`);

    // Update story_progress table
    const { error: progressUpdateError } = await supabaseClient
      .from('story_progress')
      .update({ script: true })
      .eq('project_id', project_id);

    if (progressUpdateError) {
      console.error('Error updating story progress for script:', progressUpdateError);
      // Consider compensation logic if this is critical, e.g., roll back script_data?
      throw new Error(`Failed to update script progress: ${progressUpdateError.message}`);
    }
    console.log(`Story progress updated for script stage for project_id ${project_id}.`);

    return new Response(JSON.stringify(script), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in ai-scriptwriting function:', error);
    const errorMessage = error.message || 'An unexpected error occurred.';
    // Determine status code based on error type if possible, otherwise default to 500
    let statusCode = 500;
    if (error.message.includes("not found")) statusCode = 404;
    if (error.message.includes("Failed to fetch") || error.message.includes("Failed to store") || error.message.includes("Failed to update")) {
       // Could be more specific if db errors had codes
    }


    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    console.error('Supabase URL or Anon Key not found in environment variables. Supabase client cannot be initialized.');
    // Early exit if Supabase client is essential for all paths, or handle it in handleScriptRequest
  }
  
  // Ensure supabaseClient is not null when passed. 
  // handleScriptRequest now has a check for null supabaseClient.
  return await handleScriptRequest(req, supabaseClient as SupabaseClient);
});
